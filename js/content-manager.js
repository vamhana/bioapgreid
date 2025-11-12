class ContentCache {
    constructor(maxSize = 100, timeout = 300000) { // 5 минут таймаут по умолчанию
        this.maxSize = maxSize;
        this.timeout = timeout;
        this.cache = new Map();
        this.accessOrder = [];
        this.hits = 0;
        this.misses = 0;
    }

    get(levelId) {
        if (!this.cache.has(levelId)) {
            this.misses++;
            return null;
        }

        const item = this.cache.get(levelId);
        
        // Проверка таймаута
        if (Date.now() - item.timestamp > this.timeout) {
            this.delete(levelId);
            this.misses++;
            return null;
        }

        // Обновляем порядок использования (LRU)
        this.updateAccessOrder(levelId);
        this.hits++;
        
        return item.data;
    }

    set(levelId, data) {
        // Если достигли максимального размера, удаляем самый старый элемент
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.accessOrder.shift();
            this.cache.delete(oldestKey);
        }

        this.cache.set(levelId, {
            data,
            timestamp: Date.now()
        });

        this.updateAccessOrder(levelId);
    }

    delete(levelId) {
        this.cache.delete(levelId);
        const index = this.accessOrder.indexOf(levelId);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    updateAccessOrder(levelId) {
        // Удаляем из текущей позиции
        const index = this.accessOrder.indexOf(levelId);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        // Добавляем в конец (самый новый)
        this.accessOrder.push(levelId);
    }

    clear() {
        this.cache.clear();
        this.accessOrder = [];
        this.hits = 0;
        this.misses = 0;
    }

    get size() {
        return this.cache.size;
    }

    get hitRate() {
        const total = this.hits + this.misses;
        return total > 0 ? this.hits / total : 0;
    }
}

class ProgressManager {
    constructor(app) {
        this.app = app;
        this.progress = new Map();
        this.autoSaveInterval = null;
        this.pendingSaves = new Set();
        this.localStorageKey = 'genofond-user-progress-v2';
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem(this.localStorageKey);
            if (saved) {
                const progressData = JSON.parse(saved);
                this.progress = new Map(Object.entries(progressData));
                console.log('📊 Прогресс пользователя загружен');
                return true;
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки прогресса:', error);
            this.recoverProgress();
        }
        return false;
    }

    saveProgress() {
        try {
            const progressObject = Object.fromEntries(this.progress);
            localStorage.setItem(this.localStorageKey, JSON.stringify(progressObject));
            
            // Резервная копия в sessionStorage
            sessionStorage.setItem(this.localStorageKey + '-backup', JSON.stringify(progressObject));
            
            // Отправляем событие обновления прогресса
            this.dispatchEvent('progressUpdated', {
                progress: progressObject,
                timestamp: Date.now()
            });
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения прогресса:', error);
            return false;
        }
    }

    updateProgress(levelId, data) {
        const currentProgress = this.progress.get(levelId) || {};
        const newProgress = { 
            ...currentProgress, 
            ...data, 
            lastUpdated: Date.now(),
            visits: (currentProgress.visits || 0) + (data.incrementVisit ? 1 : 0)
        };
        
        this.progress.set(levelId, newProgress);
        this.pendingSaves.add(levelId);

        // Дебаунс автосохранения
        this.scheduleAutoSave();
    }

    scheduleAutoSave() {
        if (this.autoSaveInterval) {
            clearTimeout(this.autoSaveInterval);
        }

        this.autoSaveInterval = setTimeout(() => {
            if (this.pendingSaves.size > 0) {
                this.saveProgress();
                this.pendingSaves.clear();
            }
        }, 30000); // 30 секунд
    }

    getProgress(levelId) {
        return this.progress.get(levelId) || {
            unlocked: false,
            completed: false,
            score: 0,
            visits: 0,
            timeSpent: 0,
            lastAccessed: null,
            firstAccessed: null
        };
    }

    unlockLevel(levelId) {
        this.updateProgress(levelId, {
            unlocked: true,
            unlockedAt: Date.now(),
            firstAccessed: Date.now(),
            incrementVisit: true
        });

        // Аналитика разблокировки
        this.dispatchEvent('levelUnlocked', { levelId });
    }

    completeLevel(levelId, score = 100) {
        const currentProgress = this.getProgress(levelId);
        this.updateProgress(levelId, {
            completed: true,
            completedAt: Date.now(),
            score: Math.max(score, currentProgress.score),
            incrementVisit: true
        });

        // Аналитика завершения
        this.dispatchEvent('levelCompleted', { levelId, score });
    }

    recordLevelAccess(levelId) {
        this.updateProgress(levelId, {
            lastAccessed: Date.now(),
            incrementVisit: true
        });
    }

    recoverProgress() {
        console.log('🔄 Восстановление прогресса...');
        
        // Попытка восстановить из sessionStorage
        try {
            const backup = sessionStorage.getItem(this.localStorageKey + '-backup');
            if (backup) {
                const progressData = JSON.parse(backup);
                this.progress = new Map(Object.entries(progressData));
                this.saveProgress();
                console.log('✅ Прогресс восстановлен из резервной копии');
                return true;
            }
        } catch (error) {
            console.error('❌ Не удалось восстановить прогресс:', error);
        }

        // Создаем чистый прогресс
        this.progress = new Map();
        this.saveProgress();
        return false;
    }

    startAutoSave() {
        // Автосохранение каждые 2 минуты
        setInterval(() => {
            if (this.pendingSaves.size > 0) {
                this.saveProgress();
                this.pendingSaves.clear();
            }
        }, 120000);
    }

    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    destroy() {
        if (this.autoSaveInterval) {
            clearTimeout(this.autoSaveInterval);
        }
        this.saveProgress(); // Финальное сохранение
    }
}

class ContentManager {
    constructor(app) {
        this.app = app;
        this.isInitialized = false;
        
        // Системы
        this.contentCache = new ContentCache(100, 300000); // 100 элементов, 5 минут
        this.progressManager = new ProgressManager(app);
        
        // Состояние
        this.loadingQueue = new Map();
        this.circuitBreaker = new Map();
        this.analytics = {
            contentLoads: 0,
            cacheHits: 0,
            cacheMisses: 0,
            loadErrors: 0,
            preloads: 0,
            totalLoaded: 0
        };

        // ИСПРАВЛЕНО: Динамическая конфигурация путей
        this.config = {
            timeout: 15000,
            maxRetries: 3,
            circuitBreakerThreshold: 5,
            preloadDepth: 2,
            enableAnalytics: true,
            enablePreloading: true,
            // Динамический baseUrl для всех хостингов
            baseUrl: window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, ''),
            useRelativePaths: true
        };

        console.log('📚 ContentManager v2.1 инициализирован');
        console.log('📍 Base URL:', this.config.baseUrl);
    }

    async init() {
        console.log('📚 Инициализация ContentManager v2.1...');
        
        try {
            // Загрузка прогресса пользователя
            this.progressManager.loadProgress();
            this.progressManager.startAutoSave();

            // Предзагрузка критического контента
            await this.preloadCriticalContent();

            this.isInitialized = true;
            console.log('✅ ContentManager v2.1 готов к работе');
            
            // Аналитика инициализации
            this.recordAnalyticsEvent('content_manager_initialized');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации ContentManager:', error);
            throw error;
        }
    }

    // 🎯 КРИТИЧЕСКИЕ МЕТОДЫ ДЛЯ GALAXY-NAVIGATION v2.1

    /**
     * Получение данных уровня - основной метод для навигации
     */
    async getLevelData(levelId) {
        if (!levelId) {
            console.warn('⚠️ Попытка получить данные уровня без ID');
            return this.getFallbackLevelData(levelId);
        }

        // Записываем доступ к уровню
        this.progressManager.recordLevelAccess(levelId);

        // Проверка кэша
        const cached = this.contentCache.get(levelId);
        if (cached) {
            this.analytics.cacheHits++;
            return cached;
        }

        this.analytics.cacheMisses++;
        this.analytics.contentLoads++;

        // Проверка circuit breaker
        if (this.isCircuitOpen(levelId)) {
            console.warn(`🔌 Circuit breaker открыт для ${levelId}`);
            return this.getFallbackLevelData(levelId);
        }

        return this.loadLevelDataWithRetry(levelId);
    }

    /**
     * Получение дочерних уровней для построения навигации
     */
    getChildLevels(parentLevelId) {
        try {
            const metaParser = this.app.getComponent && this.app.getComponent('metaParser');
            if (!metaParser) {
                console.warn('⚠️ MetaParser недоступен для получения дочерних уровней');
                return [];
            }

            const allEntities = metaParser.getAllEntities && metaParser.getAllEntities();
            if (!allEntities) return [];

            return allEntities
                .filter(entity => entity.parent === parentLevelId)
                .map(entity => ({
                    id: entity.level,
                    title: entity.title,
                    type: entity.type,
                    unlocked: this.isLevelAccessible(entity.level),
                    importance: entity.importance,
                    icon: entity.icon,
                    color: entity.color
                }));

        } catch (error) {
            console.error(`❌ Ошибка получения дочерних уровней для ${parentLevelId}:`, error);
            return [];
        }
    }

    /**
     * Проверка доступности уровня
     */
    isLevelAccessible(levelId) {
        // Корневые уровни всегда доступны
        if (!levelId || levelId === 'level0') return true;

        const progress = this.progressManager.getProgress(levelId);
        
        // Если уровень явно разблокирован
        if (progress.unlocked) return true;

        // Проверяем родительский уровень
        try {
            const metaParser = this.app.getComponent && this.app.getComponent('metaParser');
            if (metaParser) {
                const entity = metaParser.getEntity && metaParser.getEntity(levelId);
                if (entity && entity.parent) {
                    const parentProgress = this.progressManager.getProgress(entity.parent);
                    return parentProgress.completed || parentProgress.unlocked;
                }
            }
        } catch (error) {
            console.warn(`⚠️ Ошибка проверки доступности ${levelId}:`, error);
        }

        return false;
    }

    // 🚀 МЕТОДЫ ДЛЯ GALAXY-INTERACTION v2.1

    /**
     * Предзагрузка уровня для оптимизации UX
     */
    async preloadLevel(levelId) {
        if (!this.config.enablePreloading) return;

        try {
            // Проверяем, не загружается ли уже уровень
            if (this.loadingQueue.has(levelId)) {
                return this.loadingQueue.get(levelId);
            }

            const loadPromise = this.getLevelData(levelId);
            this.loadingQueue.set(levelId, loadPromise);

            await loadPromise;
            this.loadingQueue.delete(levelId);
            
            this.analytics.preloads++;
            console.log(`🔮 Предзагружен уровень: ${levelId}`);

        } catch (error) {
            console.warn(`⚠️ Ошибка предзагрузки ${levelId}:`, error);
            this.loadingQueue.delete(levelId);
        }
    }

    /**
     * Предзагрузка связанного контента
     */
    async preloadRelatedContent(entityId) {
        if (!this.config.enablePreloading) return;

        try {
            const childLevels = this.getChildLevels(entityId);
            const preloadPromises = childLevels
                .slice(0, this.config.preloadDepth)
                .map(child => this.preloadLevel(child.id));

            await Promise.allSettled(preloadPromises);
            
            console.log(`🔮 Предзагружены связанные уровни для: ${entityId}`);

        } catch (error) {
            console.warn(`⚠️ Ошибка предзагрузки связанного контента для ${entityId}:`, error);
        }
    }

    // 📊 МЕТОДЫ ДЛЯ APP v2.1

    /**
     * Получение общего количества планет для статистики
     */
    getTotalPlanets() {
        try {
            const metaParser = this.app.getComponent && this.app.getComponent('metaParser');
            if (metaParser && metaParser.getAllEntities) {
                const entities = metaParser.getAllEntities();
                return entities.filter(entity => 
                    entity.type === 'planet' || entity.type === 'star'
                ).length;
            }
        } catch (error) {
            console.warn('⚠️ Ошибка получения количества планет:', error);
        }
        return 1; // Fallback
    }

    /**
     * Очистка кэша для оптимизации памяти
     */
    clearCache() {
        this.contentCache.clear();
        this.loadingQueue.clear();
        console.log('🧹 Кэш контента очищен');
        
        // Аналитика очистки
        this.recordAnalyticsEvent('cache_cleared');
    }

    // 🔧 ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ

    /**
     * Загрузка данных уровня с повторными попытками
     */
    async loadLevelDataWithRetry(levelId, attempt = 0) {
        try {
            const levelData = await this.fetchLevelData(levelId);
            
            // Сохраняем в кэш
            this.contentCache.set(levelId, levelData);
            
            // Сбрасываем circuit breaker при успехе
            this.circuitBreaker.delete(levelId);
            
            this.analytics.totalLoaded++;
            return levelData;

        } catch (error) {
            console.error(`❌ Ошибка загрузки ${levelId} (попытка ${attempt + 1}):`, error);

            // Записываем ошибку в circuit breaker
            this.recordError(levelId, error);

            if (attempt < this.config.maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // Экспоненциальная задержка
                await this.delay(delay);
                return this.loadLevelDataWithRetry(levelId, attempt + 1);
            }

            // Возвращаем fallback данные при полном сбое
            return this.getFallbackLevelData(levelId);
        }
    }

    /**
     * Загрузка данных уровня из сети
     */
    async fetchLevelData(levelId) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Таймаут загрузки')), this.config.timeout);
        });

        const fetchPromise = (async () => {
            try {
                // Пытаемся получить через metaParser
                const metaParser = this.app.getComponent && this.app.getComponent('metaParser');
                if (metaParser && metaParser.getEntity) {
                    const entity = metaParser.getEntity(levelId);
                    if (entity) {
                        return this.enrichLevelData(entity);
                    }
                }

                // ИСПРАВЛЕНО: Относительные пути для всех хостингов
                const pageUrl = `${this.config.baseUrl}/${levelId}.html`;
                console.log(`📡 Загрузка контента: ${pageUrl}`);

                const response = await fetch(pageUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const htmlContent = await response.text();
                return this.processHTMLContent(levelId, htmlContent);

            } catch (error) {
                throw new Error(`Не удалось загрузить данные уровня ${levelId}: ${error.message}`);
            }
        })();

        return Promise.race([fetchPromise, timeoutPromise]);
    }

    /**
     * Обогащение данных уровня дополнительной информацией
     */
    enrichLevelData(entity) {
        const progress = this.progressManager.getProgress(entity.level);
        
        return {
            id: entity.level,
            title: entity.title,
            description: entity.description,
            type: entity.type,
            color: entity.color,
            icon: entity.icon,
            parent: entity.parent,
            orbitRadius: entity.orbitRadius,
            orbitAngle: entity.orbitAngle,
            importance: entity.importance,
            sizeModifier: entity.sizeModifier,
            unlocked: progress.unlocked,
            completed: progress.completed,
            score: progress.score,
            completionDate: progress.completedAt,
            // ИСПРАВЛЕНО: Относительный URL
            url: `${this.config.baseUrl}/${entity.level}.html`,
            lastAccessed: progress.lastAccessed,
            metadata: {
                depth: entity.depth || 0,
                tags: entity.tags || [],
                created: entity.created || new Date().toISOString().split('T')[0]
            }
        };
    }

    /**
     * Обработка HTML контента страницы
     */
    processHTMLContent(levelId, htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Извлечение мета-тегов
        const metaTags = this.extractMetaTags(doc);
        
        return {
            id: levelId,
            title: metaTags.title || levelId,
            description: metaTags.description || `Контент уровня ${levelId}`,
            type: metaTags.type || 'planet',
            color: metaTags.color || '#4ECDC4',
            icon: metaTags.icon || '🪐',
            parent: metaTags.parent || '',
            orbitRadius: metaTags.orbitRadius || 120,
            orbitAngle: metaTags.orbitAngle || 0,
            importance: metaTags.importance || 'medium',
            sizeModifier: metaTags.sizeModifier || '1.0',
            unlocked: metaTags.unlocked !== 'false',
            completed: false,
            score: 0,
            completionDate: null,
            // ИСПРАВЛЕНО: Относительный URL
            url: `${this.config.baseUrl}/${levelId}.html`,
            lastAccessed: null,
            content: this.extractContent(doc),
            metadata: {
                depth: parseInt(metaTags.depth) || 0,
                tags: metaTags.tags ? metaTags.tags.split(',') : [],
                created: metaTags.created || new Date().toISOString().split('T')[0]
            }
        };
    }

    /**
     * Извлечение мета-тегов из HTML
     */
    extractMetaTags(doc) {
        const metaTags = {};
        const metaElements = doc.querySelectorAll('meta[name^="galaxy:"]');
        
        metaElements.forEach(meta => {
            const name = meta.getAttribute('name').replace('galaxy:', '');
            const content = meta.getAttribute('content');
            metaTags[name] = content;
        });

        // Извлечение title
        const titleElement = doc.querySelector('title');
        if (titleElement && !metaTags.title) {
            metaTags.title = titleElement.textContent.replace(' | GENOФОНД', '').trim();
        }

        return metaTags;
    }

    /**
     * Извлечение основного контента
     */
    extractContent(doc) {
        const contentElement = doc.querySelector('.content, main, [role="main"]');
        return contentElement ? contentElement.innerHTML : '<p>Контент не найден</p>';
    }

    /**
     * Резервные данные уровня при ошибках
     */
    getFallbackLevelData(levelId) {
        return {
            id: levelId,
            title: levelId ? levelId.replace('level', 'Уровень ') : 'Неизвестный уровень',
            description: `Резервные данные для уровня ${levelId || 'неизвестного'}`,
            type: 'planet',
            color: '#FF6B6B',
            icon: '🆘',
            parent: '',
            orbitRadius: 120,
            orbitAngle: 0,
            importance: 'medium',
            sizeModifier: '1.0',
            unlocked: true,
            completed: false,
            score: 0,
            completionDate: null,
            // ИСПРАВЛЕНО: Относительный URL
            url: levelId ? `${this.config.baseUrl}/${levelId}.html` : `${this.config.baseUrl}/`,
            lastAccessed: null,
            isFallback: true,
            metadata: {
                depth: 0,
                tags: ['fallback', 'error'],
                created: new Date().toISOString().split('T')[0]
            }
        };
    }

    // ⚡ CIRCUIT BREAKER СИСТЕМА

    /**
     * Проверка открыт ли circuit breaker для уровня
     */
    isCircuitOpen(levelId) {
        const failures = this.circuitBreaker.get(levelId) || 0;
        return failures >= this.config.circuitBreakerThreshold;
    }

    /**
     * Запись ошибки в circuit breaker
     */
    recordError(levelId, error) {
        const currentFailures = this.circuitBreaker.get(levelId) || 0;
        this.circuitBreaker.set(levelId, currentFailures + 1);
        
        this.analytics.loadErrors++;
        
        // Аналитика ошибок
        this.recordAnalyticsEvent('content_load_error', {
            levelId,
            error: error.message,
            failureCount: currentFailures + 1
        });
    }

    // 📈 АНАЛИТИКА

    /**
     * Запись события аналитики
     */
    recordAnalyticsEvent(eventType, data = {}) {
        if (!this.config.enableAnalytics) return;

        const event = new CustomEvent('contentAnalytics', {
            detail: {
                eventType,
                timestamp: Date.now(),
                data: {
                    ...data,
                    cacheStats: {
                        size: this.contentCache.size,
                        hitRate: this.contentCache.hitRate
                    },
                    loadStats: { ...this.analytics },
                    baseUrl: this.config.baseUrl
                }
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Получение статистики для панели управления
     */
    getAnalytics() {
        return {
            ...this.analytics,
            cacheSize: this.contentCache.size,
            cacheHitRate: this.contentCache.hitRate,
            loadingQueueSize: this.loadingQueue.size,
            circuitBreakerStats: Object.fromEntries(this.circuitBreaker),
            baseUrl: this.config.baseUrl,
            isInitialized: this.isInitialized
        };
    }

    // 🔄 СИСТЕМА ПРОГРЕССА

    /**
     * Обновление прогресса пользователя
     */
    updateUserProgress(levelId, progressData) {
        this.progressManager.updateProgress(levelId, {
            ...progressData,
            incrementVisit: true
        });

        // Инвалидируем кэш для этого уровня
        this.contentCache.delete(levelId);
    }

    /**
     * Разблокировка уровня
     */
    unlockLevel(levelId) {
        this.progressManager.unlockLevel(levelId);
        
        // Инвалидируем кэш
        this.contentCache.delete(levelId);
        
        // Предзагружаем контент разблокированного уровня
        this.preloadLevel(levelId);
    }

    /**
     * Синхронизация прогресса
     */
    async syncProgress() {
        return this.progressManager.saveProgress();
    }

    // 🎯 ПРЕДЗАГРУЗКА КРИТИЧЕСКОГО КОНТЕНТА

    /**
     * Предзагрузка критически важного контента
     */
    async preloadCriticalContent() {
        if (!this.config.enablePreloading) return;

        try {
            const criticalLevels = ['level0', 'level1', 'level2']; // Первые три уровня
            const preloadPromises = criticalLevels.map(level => this.preloadLevel(level));
            
            await Promise.allSettled(preloadPromises);
            console.log('🔮 Критический контент предзагружен');

        } catch (error) {
            console.warn('⚠️ Ошибка предзагрузки критического контента:', error);
        }
    }

    // 🛠️ СЛУЖЕБНЫЕ МЕТОДЫ

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Обновление конфигурации baseUrl
     */
    setBaseUrl(baseUrl) {
        this.config.baseUrl = baseUrl;
        console.log('📍 Base URL обновлен:', this.config.baseUrl);
    }

    /**
     * Получение информации о состоянии
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            config: this.config,
            cache: {
                size: this.contentCache.size,
                hitRate: this.contentCache.hitRate
            },
            progress: {
                total: this.progressManager.progress.size,
                unlocked: Array.from(this.progressManager.progress.values()).filter(p => p.unlocked).length
            },
            analytics: this.getAnalytics()
        };
    }

    /**
     * Уничтожение экземпляра
     */
    async destroy() {
        console.log('🧹 Очистка ContentManager v2.1...');
        
        // Сохраняем прогресс
        this.progressManager.destroy();
        
        // Очищаем кэши
        this.contentCache.clear();
        this.loadingQueue.clear();
        this.circuitBreaker.clear();
        
        // Сохраняем аналитику
        this.recordAnalyticsEvent('content_manager_destroyed');
        
        this.isInitialized = false;
        console.log('✅ ContentManager v2.1 остановлен');
    }

    /**
     * Восстановление после ошибок
     */
    async recover() {
        console.log('🔄 Восстановление ContentManager...');
        
        try {
            // Восстанавливаем прогресс
            this.progressManager.recoverProgress();
            
            // Очищаем circuit breaker
            this.circuitBreaker.clear();
            
            // Перезагружаем критический контент
            await this.preloadCriticalContent();
            
            console.log('✅ ContentManager восстановлен');
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка восстановления ContentManager:', error);
            return false;
        }
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ContentManager, ContentCache, ProgressManager };
} else {
    // Для использования в браузере
    window.ContentManager = ContentManager;
    window.ContentCache = ContentCache;
    window.ProgressManager = ProgressManager;
}
