// modules/app/core/memory-manager.js

// Конфигурация памяти
const MemoryConfig = {
    // Лимиты памяти
    LIMITS: {
        TOTAL: 500 * 1024 * 1024, // 500MB
        GEOMETRY: 200 * 1024 * 1024, // 200MB
        TEXTURE: 150 * 1024 * 1024, // 150MB
        MATERIAL: 50 * 1024 * 1024, // 50MB
        OTHER: 100 * 1024 * 1024, // 100MB
    },
    
    // Приоритеты ассетов (1-10, где 10 - высший)
    PRIORITIES: {
        ESSENTIAL: 10, // Фоновые объекты, камера
        HIGH: 7,       // Основные планеты, звезда
        MEDIUM: 5,     // Спутники, орбиты
        LOW: 3,        // Астероиды, декорации
        CACHE: 1,      // Кэшированные, неиспользуемые
    },
    
    // Стратегии очистки
    CLEANUP_STRATEGIES: {
        AGGRESSIVE: { // При нехватке памяти
            maxAge: 10000, // 10 секунд
            priorityThreshold: 5,
            forceDispose: true
        },
        BALANCED: { // По умолчанию
            maxAge: 30000, // 30 секунд
            priorityThreshold: 3,
            forceDispose: false
        },
        CONSERVATIVE: { // Когда памяти много
            maxAge: 60000, // 60 секунд
            priorityThreshold: 1,
            forceDispose: false
        }
    },
    
    // Настройки мониторинга
    MONITORING: {
        INTERVAL: 5000, // Проверка каждые 5 секунд
        SAMPLE_SIZE: 60, // Хранить статистику за 60 сэмплов
        WARNING_THRESHOLDS: {
            USAGE: 0.7, // 70% - предупреждение
            CRITICAL: 0.85, // 85% - критично
            PANIC: 0.95 // 95% - паника
        }
    }
};

export class MemoryManager {
    constructor(config = {}) {
        this.config = { ...MemoryConfig, ...config };
        
        // Основные структуры данных
        this.assetRegistry = new Map(); // id -> asset info
        this.assetReferences = new Map(); // asset -> reference count
        this.assetPriorities = new Map(); // asset -> priority
        this.assetLastUsed = new Map(); // asset -> timestamp
        
        // Индексы по типам
        this.typeIndex = {
            geometry: new Set(),
            texture: new Set(),
            material: new Set(),
            mesh: new Set(),
            other: new Set()
        };
        
        // Слабые ссылки для временных объектов
        this.weakAssets = new WeakMap();
        this.gcCandidates = new WeakSet();
        
        // Статистика и мониторинг
        this.stats = {
            allocations: 0,
            deallocations: 0,
            currentUsage: 0,
            peakUsage: 0,
            gcCycles: 0,
            warnings: [],
            history: [] // История использования памяти
        };
        
        // Производительность
        this.performance = {
            lastGCTime: 0,
            avgGCTime: 0,
            frameCount: 0
        };
        
        // Состояние
        this.state = {
            isMonitoring: false,
            currentStrategy: 'BALANCED',
            lastCleanup: 0,
            isCritical: false
        };
        
        // Инициализация
        this.setupMonitoring();
        this.setupPerformanceObserver();
        
        console.log('🧠 MemoryManager создан с конфигом:', {
            limits: this.formatLimits(),
            strategy: this.state.currentStrategy
        });
    }
    
    // ===== ОСНОВНЫЕ МЕТОДЫ =====
    
    /**
     * Трекинг выделения памяти
     * @param {any} asset - Объект (Three.js или другой)
     * @param {string} type - Тип ('geometry', 'texture', 'material', 'mesh', 'other')
     * @param {number|object} sizeInfo - Размер в байтах или объект с информацией
     * @param {object} metadata - Дополнительные метаданные
     * @returns {string} assetId
     */
    trackAllocation(asset, type, sizeInfo, metadata = {}) {
        if (!asset) {
            console.warn('⚠️ Попытка трекинга пустого ассета');
            return null;
        }
        
        const assetId = this.generateAssetId(asset, type);
        
        // Если уже отслеживается, обновляем
        if (this.assetRegistry.has(assetId)) {
            return this.updateAllocation(assetId, sizeInfo, metadata);
        }
        
        // Рассчитываем размер
        const size = this.calculateSize(asset, type, sizeInfo);
        
        // Создаем запись об ассете
        const allocation = {
            asset,
            assetId,
            type,
            size,
            estimatedSize: size, // Для Three.js может быть оценка
            metadata: {
                ...metadata,
                allocatedAt: Date.now(),
                stackTrace: this.getStackTrace(2) // Берем 2 уровня стека
            },
            references: 1,
            lastUsed: Date.now(),
            priority: this.determinePriority(asset, type, metadata),
            lifecycle: 'active'
        };
        
        // Сохраняем
        this.assetRegistry.set(assetId, allocation);
        this.assetReferences.set(asset, 1);
        this.assetPriorities.set(asset, allocation.priority);
        this.assetLastUsed.set(asset, Date.now());
        
        // Добавляем в индекс по типу
        this.typeIndex[type]?.add(asset);
        
        // Обновляем статистику
        this.stats.allocations++;
        this.stats.currentUsage += size;
        this.stats.peakUsage = Math.max(this.stats.peakUsage, this.stats.currentUsage);
        
        // Добавляем в историю
        this.recordHistory();
        
        console.log(`📦 Выделено: ${this.formatBytes(size)} для ${type} [${allocation.priority}]`);
        
        // Проверяем лимиты
        this.checkMemoryLimits();
        
        return assetId;
    }
    
    /**
     * Увеличение счётчика ссылок
     */
    incrementReference(assetOrId) {
        const asset = this.resolveAsset(assetOrId);
        if (!asset) return;
        
        const current = this.assetReferences.get(asset) || 0;
        this.assetReferences.set(asset, current + 1);
        this.assetLastUsed.set(asset, Date.now());
        
        // Обновляем приоритет при частом использовании
        this.updatePriority(asset, 'increment');
    }
    
    /**
     * Уменьшение счётчика ссылок
     */
    decrementReference(assetOrId) {
        const asset = this.resolveAsset(assetOrId);
        if (!asset) return;
        
        const current = this.assetReferences.get(asset) || 0;
        if (current <= 1) {
            // Помечаем для очистки
            this.scheduleForCleanup(asset);
        } else {
            this.assetReferences.set(asset, current - 1);
        }
        
        this.assetLastUsed.set(asset, Date.now());
    }
    
    /**
     * Очистка ассета
     */
    cleanupAsset(assetOrId, force = false) {
        const asset = this.resolveAsset(assetOrId);
        if (!asset) return false;
        
        const assetId = this.getAssetId(asset);
        const allocation = this.assetRegistry.get(assetId);
        
        if (!allocation) return false;
        
        // Проверяем ссылки
        const refCount = this.assetReferences.get(asset) || 0;
        if (refCount > 0 && !force) {
            console.log(`⏳ Ассет ${assetId} ещё используется (ссылок: ${refCount})`);
            return false;
        }
        
        // Освобождаем ресурсы Three.js
        const freed = this.disposeThreeAsset(asset, allocation.type);
        
        // Обновляем статистику
        if (freed) {
            this.stats.deallocations++;
            this.stats.currentUsage -= allocation.size;
            
            // Удаляем из всех индексов
            this.assetRegistry.delete(assetId);
            this.assetReferences.delete(asset);
            this.assetPriorities.delete(asset);
            this.assetLastUsed.delete(asset);
            this.typeIndex[allocation.type]?.delete(asset);
            
            console.log(`🗑️ Очищено: ${this.formatBytes(allocation.size)} от ${allocation.type}`);
            
            // Записываем в историю
            this.recordHistory();
            
            return true;
        }
        
        return false;
    }
    
    // ===== УПРАВЛЕНИЕ ПАМЯТЬЮ =====
    
    /**
     * Проверка лимитов памяти и запуск GC при необходимости
     */
    checkMemoryLimits() {
        const usage = this.getCurrentUsage();
        const totalLimit = this.config.LIMITS.TOTAL;
        const usagePercent = usage.total / totalLimit;
        
        // Определяем стратегию очистки
        let strategy = 'BALANCED';
        let immediate = false;
        
        if (usagePercent > this.config.MONITORING.WARNING_THRESHOLDS.PANIC) {
            console.error('🚨 ПАНИКА: Критическое использование памяти!');
            strategy = 'AGGRESSIVE';
            immediate = true;
            this.state.isCritical = true;
        } else if (usagePercent > this.config.MONITORING.WARNING_THRESHOLDS.CRITICAL) {
            console.warn('⚠️ КРИТИЧЕСКОЕ использование памяти');
            strategy = 'AGGRESSIVE';
            immediate = true;
            this.state.isCritical = true;
        } else if (usagePercent > this.config.MONITORING.WARNING_THRESHOLDS.USAGE) {
            console.warn('⚠️ ВЫСОКОЕ использование памяти');
            strategy = 'BALANCED';
            this.state.isCritical = false;
        } else {
            strategy = 'CONSERVATIVE';
            this.state.isCritical = false;
        }
        
        // Применяем стратегию
        if (strategy !== this.state.currentStrategy) {
            console.log(`🔄 Смена стратегии: ${this.state.currentStrategy} -> ${strategy}`);
            this.state.currentStrategy = strategy;
        }
        
        // Запускаем очистку если нужно
        if (immediate) {
            this.forceGarbageCollection();
        } else if (usagePercent > 0.6) {
            // Запланировать очистку в следующий idle период
            this.scheduleGarbageCollection();
        }
    }
    
    /**
     * Принудительная сборка мусора
     */
    forceGarbageCollection() {
        console.log('🔴 Принудительная сборка мусора...');
        const startTime = performance.now();
        
        const strategy = this.config.CLEANUP_STRATEGIES[this.state.currentStrategy];
        const now = Date.now();
        
        let freed = 0;
        let freedMemory = 0;
        
        // Собираем кандидатов для очистки
        const candidates = this.collectCleanupCandidates(strategy);
        
        // Сортируем по приоритету (сначала низкие) и времени последнего использования
        candidates.sort((a, b) => {
            const priorityDiff = a.priority - b.priority;
            if (priorityDiff !== 0) return priorityDiff;
            return a.lastUsed - b.lastUsed;
        });
        
        // Очищаем кандидатов
        for (const candidate of candidates) {
            if (this.stats.currentUsage <= this.config.LIMITS.TOTAL * 0.6) {
                break; // Остановиться если освободили достаточно
            }
            
            const success = this.cleanupAsset(candidate.assetId, strategy.forceDispose);
            if (success) {
                freed++;
                freedMemory += candidate.size;
            }
        }
        
        // Обновляем производительность
        const gcTime = performance.now() - startTime;
        this.performance.lastGCTime = gcTime;
        this.performance.avgGCTime = 
            (this.performance.avgGCTime * this.stats.gcCycles + gcTime) / (this.stats.gcCycles + 1);
        this.stats.gcCycles++;
        
        console.log(`🟢 Собрано: ${freed} объектов, ${this.formatBytes(freedMemory)} за ${gcTime.toFixed(2)}ms`);
        this.state.lastCleanup = now;
        
        return { freed, freedMemory, time: gcTime };
    }
    
    /**
     * Фоновая сборка мусора
     */
    collectGarbage() {
        const now = Date.now();
        
        // Не собирать слишком часто
        if (now - this.state.lastCleanup < 10000) { // Минимум 10 секунд
            return;
        }
        
        const strategy = this.config.CLEANUP_STRATEGIES[this.state.currentStrategy];
        const candidates = this.collectCleanupCandidates(strategy);
        
        if (candidates.length === 0) return;
        
        let cleaned = 0;
        
        candidates.forEach(candidate => {
            // Очищаем только очень старые объекты с низким приоритетом
            if (now - candidate.lastUsed > strategy.maxAge && 
                candidate.priority <= strategy.priorityThreshold) {
                this.cleanupAsset(candidate.assetId);
                cleaned++;
            }
        });
        
        if (cleaned > 0) {
            console.log(`🧹 Фоновая очистка: ${cleaned} объектов`);
        }
        
        this.state.lastCleanup = now;
    }
    
    // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
    
    /**
     * Вычисление размера объекта
     */
    calculateSize(asset, type, sizeInfo) {
        // Если передан точный размер
        if (typeof sizeInfo === 'number') {
            return sizeInfo;
        }
        
        // Для Three.js объектов
        if (typeof sizeInfo === 'object' && sizeInfo.estimatedSize) {
            return sizeInfo.estimatedSize;
        }
        
        // Автоматическая оценка для Three.js
        return this.estimateThreeJSSize(asset, type);
    }
    
    /**
     * Оценка размера Three.js объектов
     */
    estimateThreeJSSize(asset, type) {
        let size = 1024; // Минимальный размер
        
        try {
            switch (type) {
                case 'geometry':
                    if (asset.isBufferGeometry) {
                        // Оценка на основе атрибутов
                        let total = 0;
                        for (const name in asset.attributes) {
                            const attr = asset.attributes[name];
                            if (attr && attr.array) {
                                total += attr.array.byteLength;
                            }
                        }
                        if (asset.index) {
                            total += asset.index.array.byteLength;
                        }
                        size = total || 1024;
                    }
                    break;
                    
                case 'texture':
                    if (asset.isTexture) {
                        // Оценка на основе размера текстуры
                        const width = asset.image?.width || 256;
                        const height = asset.image?.height || 256;
                        const channels = 4; // RGBA
                        const mipmaps = Math.floor(Math.log2(Math.max(width, height))) + 1;
                        const mipmapFactor = 1.33; // Примерный коэффициент для мипмапов
                        
                        size = width * height * channels * mipmapFactor;
                    }
                    break;
                    
                case 'material':
                    if (asset.isMaterial) {
                        // Материалы относительно легкие
                        size = 5 * 1024; // ~5KB
                    }
                    break;
                    
                case 'mesh':
                    if (asset.isMesh) {
                        // Меш = геометрия + материал
                        const geomSize = asset.geometry ? 
                            this.estimateThreeJSSize(asset.geometry, 'geometry') : 1024;
                        const matSize = asset.material ? 
                            this.estimateThreeJSSize(Array.isArray(asset.material) ? 
                                asset.material[0] : asset.material, 'material') : 1024;
                        size = geomSize + matSize;
                    }
                    break;
            }
        } catch (error) {
            console.warn('⚠️ Ошибка оценки размера Three.js объекта:', error);
        }
        
        return Math.max(size, 1024); // Минимум 1KB
    }
    
    /**
     * Освобождение Three.js ресурсов
     */
    disposeThreeAsset(asset, type) {
        try {
            if (!asset) return false;
            
            switch (type) {
                case 'geometry':
                    if (asset.dispose && typeof asset.dispose === 'function') {
                        asset.dispose();
                    }
                    break;
                    
                case 'texture':
                    if (asset.dispose && typeof asset.dispose === 'function') {
                        asset.dispose();
                    }
                    break;
                    
                case 'material':
                    if (asset.dispose && typeof asset.dispose === 'function') {
                        asset.dispose();
                    }
                    break;
                    
                case 'mesh':
                    // Рекурсивно очищаем геометрию и материалы
                    if (asset.geometry && asset.geometry.dispose) {
                        asset.geometry.dispose();
                    }
                    if (asset.material) {
                        if (Array.isArray(asset.material)) {
                            asset.material.forEach(mat => mat.dispose && mat.dispose());
                        } else if (asset.material.dispose) {
                            asset.material.dispose();
                        }
                    }
                    break;
                    
                default:
                    if (asset.dispose && typeof asset.dispose === 'function') {
                        asset.dispose();
                    }
            }
            
            return true;
        } catch (error) {
            console.warn('⚠️ Ошибка при очистке Three.js ассета:', error);
            return false;
        }
    }
    
    /**
     * Определение приоритета ассета
     */
    determinePriority(asset, type, metadata) {
        // Из метаданных
        if (metadata.priority) {
            return Math.min(Math.max(metadata.priority, 1), 10);
        }
        
        // По типу
        switch (type) {
            case 'texture':
                if (metadata.isBackground) return this.config.PRIORITIES.ESSENTIAL;
                return this.config.PRIORITIES.HIGH;
                
            case 'geometry':
                if (metadata.isEssential) return this.config.PRIORITIES.HIGH;
                return this.config.PRIORITIES.MEDIUM;
                
            case 'material':
                return this.config.PRIORITIES.MEDIUM;
                
            case 'mesh':
                if (metadata.isStar) return this.config.PRIORITIES.ESSENTIAL;
                if (metadata.isPlanet) return this.config.PRIORITIES.HIGH;
                if (metadata.isMoon) return this.config.PRIORITIES.MEDIUM;
                return this.config.PRIORITIES.LOW;
                
            default:
                return this.config.PRIORITIES.CACHE;
        }
    }
    
    /**
     * Обновление приоритета при использовании
     */
    updatePriority(asset, reason) {
        const current = this.assetPriorities.get(asset) || 1;
        let newPriority = current;
        
        switch (reason) {
            case 'increment':
                // Часто используемые объекты повышаем в приоритете
                newPriority = Math.min(current + 1, 10);
                break;
            case 'decrement':
                // Реже используемые - понижаем
                newPriority = Math.max(current - 1, 1);
                break;
            case 'active':
                // Активное использование
                newPriority = Math.min(current + 2, 10);
                break;
        }
        
        if (newPriority !== current) {
            this.assetPriorities.set(asset, newPriority);
            
            // Обновляем в реестре
            const assetId = this.getAssetId(asset);
            const allocation = this.assetRegistry.get(assetId);
            if (allocation) {
                allocation.priority = newPriority;
            }
        }
    }
    
    // ===== МОНИТОРИНГ И НАБЛЮДЕНИЕ =====
    
    setupMonitoring() {
        // Используем requestAnimationFrame вместо setInterval
        const monitor = () => {
            if (this.state.isMonitoring && document.visibilityState === 'visible') {
                // Проверяем память
                this.checkMemoryLimits();
                
                // Записываем статистику
                this.recordHistory();
                
                // Фоновая очистка если нужно
                this.collectGarbage();
            }
            
            // Продолжаем мониторинг
            if (this.state.isMonitoring) {
                requestAnimationFrame(monitor);
            }
        };
        
        // Старт мониторинга
        this.startMonitoring();
        
        // Запускаем цикл
        requestAnimationFrame(monitor);
        
        // Обработчик видимости страницы
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseMonitoring();
            } else {
                this.resumeMonitoring();
            }
        });
    }
    
    setupPerformanceObserver() {
        // Используем PerformanceObserver для отслеживания памяти (если доступно)
        if ('PerformanceObserver' in window) {
            try {
                this.performanceObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.name === 'memory') {
                            this.updateBrowserMemoryStats(entry);
                        }
                    });
                });
                
                this.performanceObserver.observe({ entryTypes: ['memory'] });
            } catch (error) {
                console.warn('⚠️ PerformanceObserver не поддерживается:', error);
            }
        }
        
        // Мониторинг использования памяти браузера
        if (performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                this.updateBrowserMemoryStats(memory);
            }, 10000);
        }
    }
    
    updateBrowserMemoryStats(memoryInfo) {
        // Обновляем статистику использования памяти браузером
        const used = memoryInfo.usedJSHeapSize || 0;
        const total = memoryInfo.totalJSHeapSize || 0;
        const limit = memoryInfo.jsHeapSizeLimit || 0;
        
        if (used > 0 && total > 0) {
            const usagePercent = used / limit;
            
            if (usagePercent > 0.8) {
                console.warn('⚠️ Браузер использует более 80% памяти:', {
                    used: this.formatBytes(used),
                    total: this.formatBytes(total),
                    percent: Math.round(usagePercent * 100) + '%'
                });
                
                // Активируем агрессивную очистку
                this.state.currentStrategy = 'AGGRESSIVE';
                this.forceGarbageCollection();
            }
        }
    }
    
    // ===== УТИЛИТЫ =====
    
    generateAssetId(asset, type) {
        // Генерация уникального ID на основе типа и объекта
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        
        if (asset && asset.uuid) {
            return `${type}_${asset.uuid}_${timestamp}`;
        }
        
        return `${type}_${random}_${timestamp}`;
    }
    
    resolveAsset(assetOrId) {
        if (typeof assetOrId === 'string') {
            // Ищем по ID
            const allocation = this.assetRegistry.get(assetOrId);
            return allocation ? allocation.asset : null;
        }
        return assetOrId;
    }
    
    getAssetId(asset) {
        // Ищем ID по объекту (медленно, но используется редко)
        for (const [id, allocation] of this.assetRegistry.entries()) {
            if (allocation.asset === asset) {
                return id;
            }
        }
        return null;
    }
    
    getStackTrace(depth = 2) {
        try {
            const error = new Error();
            const stack = error.stack ? error.stack.split('\n') : [];
            return stack.slice(2, 2 + depth).join('\n');
        } catch {
            return 'Stack trace unavailable';
        }
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    formatLimits() {
        const limits = {};
        for (const [key, value] of Object.entries(this.config.LIMITS)) {
            limits[key] = this.formatBytes(value);
        }
        return limits;
    }
    
    // ===== СБОР КАНДИДАТОВ НА ОЧИСТКУ =====
    
    collectCleanupCandidates(strategy) {
        const candidates = [];
        const now = Date.now();
        
        for (const [assetId, allocation] of this.assetRegistry.entries()) {
            const refCount = this.assetReferences.get(allocation.asset) || 0;
            const lastUsed = this.assetLastUsed.get(allocation.asset) || allocation.metadata.allocatedAt;
            const age = now - lastUsed;
            const priority = allocation.priority;
            
            // Критерии для кандидатов
            const isUnused = refCount === 0;
            const isOld = age > strategy.maxAge;
            const isLowPriority = priority <= strategy.priorityThreshold;
            const isDisposable = allocation.lifecycle !== 'permanent';
            
            if ((isUnused || isOld) && isLowPriority && isDisposable) {
                candidates.push({
                    assetId,
                    asset: allocation.asset,
                    type: allocation.type,
                    size: allocation.size,
                    lastUsed,
                    priority,
                    age
                });
            }
        }
        
        return candidates;
    }
    
    scheduleForCleanup(asset) {
        // Используем WeakSet для отслеживания кандидатов
        this.gcCandidates.add(asset);
        
        // Запланировать очистку через 5 секунд
        setTimeout(() => {
            if (this.gcCandidates.has(asset)) {
                const refCount = this.assetReferences.get(asset) || 0;
                if (refCount === 0) {
                    this.cleanupAsset(asset);
                }
                this.gcCandidates.delete(asset);
            }
        }, 5000);
    }
    
    scheduleGarbageCollection() {
        // Используем requestIdleCallback для фоновой сборки
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.collectGarbage();
            }, { timeout: 1000 });
        } else {
            // Fallback для браузеров без requestIdleCallback
            setTimeout(() => {
                this.collectGarbage();
            }, 1000);
        }
    }
    
    // ===== СТАТИСТИКА И ОТЧЁТЫ =====
    
    recordHistory() {
        const now = Date.now();
        const entry = {
            timestamp: now,
            usage: this.stats.currentUsage,
            formatted: this.formatBytes(this.stats.currentUsage),
            allocations: this.stats.allocations,
            assets: this.assetRegistry.size
        };
        
        this.stats.history.push(entry);
        
        // Ограничиваем размер истории
        if (this.stats.history.length > this.config.MONITORING.SAMPLE_SIZE) {
            this.stats.history.shift();
        }
    }
    
    getMemoryStats() {
        const usage = this.getCurrentUsage();
        const history = this.stats.history;
        const trend = this.calculateTrend();
        
        return {
            current: {
                total: usage.total,
                formatted: this.formatBytes(usage.total),
                percent: (usage.total / this.config.LIMITS.TOTAL * 100).toFixed(1) + '%',
                byType: usage.byType
            },
            limits: this.formatLimits(),
            assets: {
                total: this.assetRegistry.size,
                byType: this.getAssetsByType(),
                references: this.getReferenceStats()
            },
            performance: {
                gcTime: this.performance.lastGCTime.toFixed(2) + 'ms',
                avgGCTime: this.performance.avgGCTime.toFixed(2) + 'ms',
                gcCycles: this.stats.gcCycles
            },
            state: {
                strategy: this.state.currentStrategy,
                isCritical: this.state.isCritical,
                isMonitoring: this.state.isMonitoring
            },
            history: {
                samples: history.length,
                trend: trend,
                peak: this.formatBytes(this.stats.peakUsage)
            },
            warnings: this.stats.warnings.slice(-5) // Последние 5 предупреждений
        };
    }
    
    getCurrentUsage() {
        const byType = {};
        let total = 0;
        
        for (const [type, assets] of Object.entries(this.typeIndex)) {
            let typeTotal = 0;
            for (const asset of assets) {
                const assetId = this.getAssetId(asset);
                const allocation = this.assetRegistry.get(assetId);
                if (allocation) {
                    typeTotal += allocation.size;
                }
            }
            byType[type] = {
                size: typeTotal,
                formatted: this.formatBytes(typeTotal),
                count: assets.size
            };
            total += typeTotal;
        }
        
        return { total, byType };
    }
    
    getAssetsByType() {
        const result = {};
        for (const [type, assets] of Object.entries(this.typeIndex)) {
            result[type] = assets.size;
        }
        return result;
    }
    
    getReferenceStats() {
        const stats = {
            zero: 0,
            one: 0,
        };
        
        for (const count of this.assetReferences.values()) {
            if (count === 0) stats.zero++;
            else if (count === 1) stats.one++;
        }
        
        return stats;
    }
    
    calculateTrend() {
        const history = this.stats.history;
        if (history.length < 2) return 'stable';
        
        const recent = history.slice(-3);
        const avgRecent = recent.reduce((sum, entry) => sum + entry.usage, 0) / recent.length;
        const avgAll = history.reduce((sum, entry) => sum + entry.usage, 0) / history.length;
        
        if (avgRecent > avgAll * 1.2) return 'increasing';
        if (avgRecent < avgAll * 0.8) return 'decreasing';
        return 'stable';
    }
    
    profileMemoryUsage() {
        const stats = this.getMemoryStats();
        const profile = {
            timestamp: new Date().toISOString(),
            ...stats,
            breakdown: this.getAssetBreakdown()
        };
        
        console.table(profile.breakdown);
        return profile;
    }
    
    getAssetBreakdown() {
        const breakdown = {};
        
        for (const allocation of this.assetRegistry.values()) {
            if (!breakdown[allocation.type]) {
                breakdown[allocation.type] = {
                    count: 0,
                    totalSize: 0,
                    avgPriority: 0,
                    avgAge: 0
                };
            }
            
            const typeData = breakdown[allocation.type];
            typeData.count++;
            typeData.totalSize += allocation.size;
            typeData.avgPriority += allocation.priority;
            typeData.avgAge += (Date.now() - allocation.metadata.allocatedAt);
        }
        
        // Вычисляем средние значения
        for (const typeData of Object.values(breakdown)) {
            if (typeData.count > 0) {
                typeData.avgPriority /= typeData.count;
                typeData.avgAge /= typeData.count;
                typeData.formattedSize = this.formatBytes(typeData.totalSize);
                typeData.avgAge = Math.round(typeData.avgAge / 1000) + 's';
            }
        }
        
        return breakdown;
    }
    
    // ===== УПРАВЛЕНИЕ СОСТОЯНИЕМ =====
    
    startMonitoring() {
        this.state.isMonitoring = true;
        console.log('📊 Мониторинг памяти запущен');
    }
    
    pauseMonitoring() {
        this.state.isMonitoring = false;
        console.log('⏸️ Мониторинг памяти приостановлен');
    }
    
    resumeMonitoring() {
        this.state.isMonitoring = true;
        console.log('▶️ Мониторинг памяти возобновлён');
    }
    
    updateAllocation(assetId, sizeInfo, metadata) {
        const allocation = this.assetRegistry.get(assetId);
        if (!allocation) return assetId;
        
        const oldSize = allocation.size;
        const newSize = this.calculateSize(allocation.asset, allocation.type, sizeInfo);
        const sizeDiff = newSize - oldSize;
        
        allocation.size = newSize;
        allocation.estimatedSize = newSize;
        allocation.metadata = { ...allocation.metadata, ...metadata };
        allocation.lastUsed = Date.now();
        
        // Обновляем статистику
        this.stats.currentUsage += sizeDiff;
        this.stats.peakUsage = Math.max(this.stats.peakUsage, this.stats.currentUsage);
        
        return assetId;
    }
    
    // ===== ОЧИСТКА РЕСУРСОВ =====
    
    dispose() {
        // Останавливаем мониторинг
        this.pauseMonitoring();
        
        // Закрываем PerformanceObserver
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        // Очищаем все ассеты
        const allAssets = Array.from(this.assetRegistry.keys());
        let cleaned = 0;
        
        allAssets.forEach(assetId => {
            if (this.cleanupAsset(assetId, true)) {
                cleaned++;
            }
        });
        
        // Очищаем структуры данных
        this.assetRegistry.clear();
        this.assetReferences.clear();
        this.assetPriorities.clear();
        this.assetLastUsed.clear();
        
        for (const type in this.typeIndex) {
            this.typeIndex[type].clear();
        }
        
        this.weakAssets = new WeakMap();
        this.gcCandidates = new WeakSet();
        
        console.log(`🧹 MemoryManager уничтожен, очищено ${cleaned} ассетов`);
    }
}

export default MemoryManager;
