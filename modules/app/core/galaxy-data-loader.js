// modules/app/core/galaxy-data-loader.js
import { SecurityValidator } from './security-validator.js';
import { MemoryManager } from './memory-manager.js';

// Вспомогательные классы внутри модуля
class DataLoaderResult {
    constructor(success, data = null, error = null, warnings = []) {
        this.success = success;
        this.data = data;
        this.error = error;
        this.warnings = warnings;
        this.timestamp = Date.now();
    }
    
    static success(data, warnings = []) {
        return new DataLoaderResult(true, data, null, warnings);
    }
    
    static error(error, warnings = []) {
        return new DataLoaderResult(false, null, error, warnings);
    }
}

class PositionGenerator {
    constructor(seed = 0x4ECDC4) {
        this.seed = seed;
        this.stats = {
            calculations: 0,
            cacheHits: 0,
            averageTime: 0
        };
    }
    
    generatePosition(entityId, options = {}) {
        const startTime = performance.now();
        
        // Детерминированный алгоритм на основе entityId
        const hash = this.hashEntityId(entityId);
        const random = this.seededRandom(hash);
        
        const baseRadius = options.baseRadius || 200;
        const spread = options.spread || 150;
        
        const position = {
            x: (random() - 0.5) * 1000,
            y: (random() - 0.5) * 1000,
            z: (random() - 0.5) * 500
        };
        
        // Нормализуем для орбитального распределения
        const distance = Math.sqrt(position.x ** 2 + position.y ** 2);
        const targetDistance = baseRadius + (hash % 1000) / 1000 * spread;
        
        if (distance > 0) {
            const scale = targetDistance / distance;
            position.x *= scale;
            position.y *= scale;
        }
        
        const endTime = performance.now();
        this.stats.calculations++;
        this.stats.averageTime = 
            (this.stats.averageTime * (this.stats.calculations - 1) + (endTime - startTime)) / 
            this.stats.calculations;
        
        return position;
    }
    
    hashEntityId(str) {
        // FNV-1a hash
        let hash = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return hash >>> 0;
    }
    
    seededRandom(seed) {
        return () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
    
    getStats() {
        return { ...this.stats };
    }
}

class SmartCache {
    constructor(maxSize = 50 * 1024 * 1024) { // 50MB по умолчанию
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            size: 0
        };
        this.maxSize = maxSize;
    }
    
    async getOrSet(key, factory, options = {}) {
        const cached = this.cache.get(key);
        
        if (cached && !this.isExpired(cached, options.ttl)) {
            this.stats.hits++;
            cached.lastAccessed = Date.now();
            return cached.data;
        }
        
        this.stats.misses++;
        const data = await factory();
        this.set(key, data, options);
        return data;
    }
    
    set(key, data, options = {}) {
        const item = {
            data,
            timestamp: Date.now(),
            lastAccessed: Date.now(),
            ttl: options.ttl,
            size: this.estimateSize(data)
        };
        
        this.cache.set(key, item);
        this.stats.size += item.size;
        
        // Автоматическая очистка при превышении лимита
        if (this.stats.size > this.maxSize) {
            this.autoCleanup(this.maxSize * 0.7); // Очистить до 70% лимита
        }
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (item && !this.isExpired(item, item.ttl)) {
            this.stats.hits++;
            item.lastAccessed = Date.now();
            return item.data;
        }
        this.stats.misses++;
        return null;
    }
    
    delete(key) {
        const item = this.cache.get(key);
        if (item) {
            this.stats.size -= item.size;
            this.cache.delete(key);
        }
    }
    
    clear() {
        this.cache.clear();
        this.stats.size = 0;
        this.stats.hits = 0;
        this.stats.misses = 0;
    }
    
    isExpired(cachedItem, ttl) {
        if (!ttl) return false;
        return Date.now() - cachedItem.timestamp > ttl;
    }
    
    autoCleanup(targetSize) {
        // Сортируем элементы по времени последнего доступа
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        for (const [key, item] of entries) {
            if (this.stats.size <= targetSize) break;
            
            this.delete(key);
        }
    }
    
    estimateSize(data) {
        try {
            return new Blob([JSON.stringify(data)]).size;
        } catch {
            return 1024; // Базовый размер, если не удалось вычислить
        }
    }
    
    getStats() {
        return {
            ...this.stats,
            formattedSize: this.formatBytes(this.stats.size),
            entries: this.cache.size,
            hitRate: this.stats.hits + this.stats.misses > 0 
                ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1) + '%'
                : '0%'
        };
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

export class GalaxyDataLoader {
    constructor(config = {}) {
        // Конфигурация по умолчанию
        this.config = {
            sitemapUrl: '/results/sitemap.json',
            enableCache: true,
            cacheTTL: 5 * 60 * 1000, // 5 минут
            maxCacheSize: 50 * 1024 * 1024, // 50MB
            enableFallback: true,
            maxEntities: 10000,
            maxDepth: 20,
            ...config
        };
        
        this.securityValidator = new SecurityValidator();
        this.memoryManager = new MemoryManager();
        this.positionGenerator = new PositionGenerator(0x4ECDC4);
        
        // Индексы для быстрого поиска
        this.entityIndex = new Map();      // entityId → entity
        this.positionIndex = new Map();    // entityId → position
        this.parentIndex = new Map();      // entityId → parentId
        
        // Кэши
        this.dataCache = new SmartCache(this.config.maxCacheSize);
        this.positionCache = new Map();
        
        // Состояние
        this.state = {
            isInitialized: false,
            isLoading: false,
            lastError: null,
            stats: {
                loadTime: 0,
                entityCount: 0,
                cacheHits: 0,
                lastLoad: null
            }
        };
        
        console.log('📊 GalaxyDataLoader создан');
    }
    
    async load(options = {}) {
        const startTime = performance.now();
        
        try {
            this.state.isLoading = true;
            this.state.lastError = null;
            
            // Пытаемся загрузить из кэша
            if (this.config.enableCache && options.useCache !== false) {
                const cached = await this.tryLoadFromCache();
                if (cached) {
                    console.log('✅ Данные загружены из кэша');
                    return DataLoaderResult.success(cached, ['loaded_from_cache']);
                }
            }
            
            // Загружаем свежие данные
            const result = await this.loadFreshData(options);
            
            // Обновляем статистику
            this.state.stats.loadTime = performance.now() - startTime;
            this.state.stats.entityCount = this.entityIndex.size;
            this.state.stats.lastLoad = new Date().toISOString();
            
            return result;
            
        } catch (error) {
            this.state.lastError = error;
            console.error('❌ Ошибка загрузки:', error);
            
            // Пробуем загрузить fallback данные
            if (this.config.enableFallback && options.fallback !== false) {
                console.warn('⚠️ Используем fallback данные');
                try {
                    const fallbackResult = await this.loadFallbackData();
                    return DataLoaderResult.success(
                        fallbackResult.data, 
                        ['fallback_used', error.message]
                    );
                } catch (fallbackError) {
                    console.error('❌ Ошибка в fallback данных:', fallbackError);
                    return DataLoaderResult.error(
                        new Error(`Failed to load galaxy data: ${error.message}`)
                    );
                }
            }
            
            return DataLoaderResult.error(error);
            
        } finally {
            this.state.isLoading = false;
        }
    }
    
    async loadFreshData(options) {
        const warnings = [];
        
        // 1. Загружаем сырые данные
        console.log('📥 Загрузка данных из:', this.config.sitemapUrl);
        const response = await fetch(this.config.sitemapUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const rawData = await response.json();
        
        // 2. Валидируем безопасность
        try {
            this.securityValidator.validateGalaxyData(rawData);
        } catch (validationError) {
            warnings.push(`Security validation: ${validationError.message}`);
            if (this.config.strictMode) {
                throw validationError;
            }
        }
        
        // 3. Обрабатываем данные
        const processedData = this.processData(rawData, options.progressCallback);
        
        // 4. Строим индексы
        this.buildIndexes(processedData);
        
        // 5. Кэшируем результат
        if (this.config.enableCache) {
            await this.cacheData(processedData);
        }
        
        return DataLoaderResult.success(processedData, warnings);
    }
    
    processData(rawData, progressCallback = null) {
        const processedData = this.deepClone(rawData);
        
        // Добавляем 3D данные
        processedData.threeData = this.generate3DLayout(processedData);
        
        // Обрабатываем всех детей рекурсивно с защитой от циклов
        const visited = new WeakSet();
        const processEntity = (entity, depth = 0, parentId = null) => {
            if (visited.has(entity)) {
                console.warn('⚠️ Циклическая ссылка обнаружена:', entity.name);
                return entity;
            }
            
            if (depth > this.config.maxDepth) {
                console.warn(`⚠️ Превышена глубина ${this.config.maxDepth} для:`, entity.name);
                return entity;
            }
            
            visited.add(entity);
            
            // Добавляем cleanPath если его нет
            if (!entity.cleanPath) {
                entity.cleanPath = entity.name || `entity_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            // Добавляем позицию
            if (processedData.threeData?.entityPositions) {
                const position = processedData.threeData.entityPositions.get(entity.cleanPath);
                if (position) {
                    entity.position3D = position;
                }
            }
            
            // Добавляем родителя
            if (parentId) {
                entity.parentId = parentId;
            }
            
            // Обрабатываем детей
            if (entity.children && Array.isArray(entity.children)) {
                entity.children.forEach((child, index) => {
                    processEntity(child, depth + 1, entity.cleanPath);
                });
            }
            
            visited.delete(entity);
            return entity;
        };
        
        processEntity(processedData);
        
        // Добавляем метаданные
        processedData.metadata = {
            processedAt: new Date().toISOString(),
            version: '2.0.0',
            totalEntities: this.countEntities(processedData),
            maxDepth: this.calculateTreeDepth(processedData)
        };
        
        return processedData;
    }
    
    generate3DLayout(data) {
        const layout = {
            center: { x: 0, y: 0, z: 0 },
            orbitalLayers: [],
            entityPositions: new Map()
        };
        
        if (!data.children || !Array.isArray(data.children)) {
            return layout;
        }
        
        // Генерируем орбитальные слои для планет
        data.children.forEach((planet, planetIndex) => {
            if (!planet.cleanPath) return;
            
            const orbitRadius = 200 + planetIndex * 150;
            const orbit = {
                radius: orbitRadius,
                tilt: (Math.random() - 0.5) * 0.2,
                planets: []
            };
            
            // Позиция планеты
            const planetAngle = (planetIndex / data.children.length) * Math.PI * 2;
            const planetPos = {
                x: Math.cos(planetAngle) * orbitRadius,
                y: Math.sin(planetAngle) * orbitRadius,
                z: (Math.random() - 0.5) * 50
            };
            
            layout.entityPositions.set(planet.cleanPath, planetPos);
            
            // Позиции лун
            if (planet.children && Array.isArray(planet.children)) {
                planet.children.forEach((moon, moonIndex) => {
                    if (!moon.cleanPath) return;
                    
                    const moonAngle = (moonIndex / planet.children.length) * Math.PI * 2;
                    const moonOrbitRadius = 60 + moonIndex * 20;
                    const moonPos = {
                        x: planetPos.x + Math.cos(moonAngle) * moonOrbitRadius,
                        y: planetPos.y + Math.sin(moonAngle) * moonOrbitRadius,
                        z: planetPos.z + (Math.random() - 0.5) * 20
                    };
                    
                    layout.entityPositions.set(moon.cleanPath, moonPos);
                    orbit.planets.push({
                        entityId: moon.cleanPath,
                        position: moonPos,
                        type: 'moon',
                        parentId: planet.cleanPath
                    });
                });
            }
            
            orbit.planets.unshift({
                entityId: planet.cleanPath,
                position: planetPos,
                type: 'planet',
                parentId: data.cleanPath || 'galaxy'
            });
            
            layout.orbitalLayers.push(orbit);
        });
        
        return layout;
    }
    
    buildIndexes(data) {
        this.entityIndex.clear();
        this.positionIndex.clear();
        this.parentIndex.clear();
        
        const visited = new Set();
        const indexEntity = (entity, parentId = null) => {
            const entityId = entity.cleanPath;
            if (!entityId || visited.has(entityId)) {
                return;
            }
            
            visited.add(entityId);
            
            // Индексируем сущность
            this.entityIndex.set(entityId, entity);
            
            // Индексируем позицию
            if (entity.position3D) {
                this.positionIndex.set(entityId, entity.position3D);
            }
            
            // Индексируем родителя
            if (parentId) {
                this.parentIndex.set(entityId, parentId);
            }
            
            // Индексируем детей
            if (entity.children && Array.isArray(entity.children)) {
                entity.children.forEach(child => {
                    indexEntity(child, entityId);
                });
            }
        };
        
        indexEntity(data);
        
        console.log('📊 Индексы построены:', {
            entities: this.entityIndex.size,
            positions: this.positionIndex.size,
            parents: this.parentIndex.size
        });
    }
    
    async tryLoadFromCache() {
        try {
            const cachedData = this.dataCache.get('galaxy_data');
            if (cachedData) {
                // Восстанавливаем индексы из кэшированных данных
                this.buildIndexes(cachedData);
                return cachedData;
            }
        } catch (error) {
            console.warn('⚠️ Ошибка чтения кэша:', error);
        }
        return null;
    }
    
    async cacheData(data) {
        try {
            this.dataCache.set('galaxy_data', data, {
                ttl: this.config.cacheTTL
            });
        } catch (error) {
            console.warn('⚠️ Ошибка кэширования:', error);
        }
    }
    
    async loadFallbackData() {
        // Простые fallback данные для разработки
        const fallbackData = {
            name: "Development Galaxy",
            type: "galaxy",
            cleanPath: "galaxy",
            config: { 
                color: "#FFD700", 
                title: "Тестовая Галактика",
                description: "Демонстрационные данные"
            },
            stats: {
                entities: { galaxy: 1, planet: 3, moon: 3, asteroid: 0, debris: 0 },
                total: 7
            },
            children: [
                {
                    name: "earth",
                    type: "planet",
                    cleanPath: "earth",
                    config: { 
                        color: "#4ECDC4", 
                        title: "Земля",
                        description: "Голубая планета"
                    },
                    children: [
                        {
                            name: "moon",
                            type: "moon",
                            cleanPath: "moon",
                            config: { 
                                color: "#CCCCCC", 
                                title: "Луна",
                                description: "Естественный спутник"
                            }
                        }
                    ]
                },
                {
                    name: "mars", 
                    type: "planet",
                    cleanPath: "mars",
                    config: { 
                        color: "#FF6B6B", 
                        title: "Марс",
                        description: "Красная планета"
                    },
                    children: [
                        {
                            name: "phobos",
                            type: "moon",
                            cleanPath: "phobos",
                            config: { 
                                color: "#888888", 
                                title: "Фобос",
                                description: "Спутник Марса"
                            }
                        }
                    ]
                },
                {
                    name: "jupiter",
                    type: "planet",
                    cleanPath: "jupiter", 
                    config: { 
                        color: "#FFA500", 
                        title: "Юпитер",
                        description: "Газовый гигант"
                    }
                }
            ],
            metadata: {
                processedAt: new Date().toISOString(),
                version: 'fallback',
                isFallback: true
            }
        };
        
        // Генерируем 3D данные
        fallbackData.threeData = this.generate3DLayout(fallbackData);
        
        // Обрабатываем данные
        const processedData = this.processData(fallbackData);
        
        // Строим индексы
        this.buildIndexes(processedData);
        
        return DataLoaderResult.success(processedData, ['fallback_data_used']);
    }
    
    // ==== ПУБЛИЧНЫЕ МЕТОДЫ ====
    
    getEntityByPath(path) {
        const entity = this.entityIndex.get(path);
        if (!entity) {
            console.warn(`⚠️ Объект не найден: ${path}`);
            // Пробуем найти по частичному совпадению
            return this.findEntityByPartialPath(path);
        }
        return entity;
    }
    
    findEntityByPartialPath(partialPath) {
        for (const [id, entity] of this.entityIndex.entries()) {
            if (id.includes(partialPath) || entity.name?.includes(partialPath)) {
                return entity;
            }
        }
        return null;
    }
    
    getEntity3DPosition(entityId) {
        // Сначала проверяем кэш позиций
        if (this.positionCache.has(entityId)) {
            this.state.stats.cacheHits++;
            return this.positionCache.get(entityId);
        }
        
        // Пробуем найти в индексе
        const cachedPos = this.positionIndex.get(entityId);
        if (cachedPos) {
            this.positionCache.set(entityId, cachedPos);
            return cachedPos;
        }
        
        // Генерируем позицию на лету
        const position = this.positionGenerator.generatePosition(entityId);
        this.positionCache.set(entityId, position);
        
        return position;
    }
    
    getEntityChildren(parentId) {
        const children = [];
        for (const [childId, parentIdOfChild] of this.parentIndex.entries()) {
            if (parentIdOfChild === parentId) {
                const child = this.entityIndex.get(childId);
                if (child) children.push(child);
            }
        }
        return children;
    }
    
    getEntityParent(childId) {
        const parentId = this.parentIndex.get(childId);
        return parentId ? this.entityIndex.get(parentId) : null;
    }
    
    getAllEntities() {
        return Array.from(this.entityIndex.values());
    }
    
    getEntitiesByType(type) {
        return this.getAllEntities().filter(entity => entity.type === type);
    }
    
    getGalaxyStats() {
        const memoryStats = this.memoryManager.getMemoryStats();
        
        return {
            name: this.entityIndex.get('galaxy')?.name || 'Unknown',
            totalEntities: this.entityIndex.size,
            byType: this.countEntitiesByType(),
            memory: {
                data: this.dataCache.getStats(),
                positions: this.positionCache.size
            },
            performance: {
                loadTime: this.state.stats.loadTime.toFixed(2) + 'ms',
                cacheHits: this.state.stats.cacheHits
            },
            lastUpdated: this.state.stats.lastLoad || 'Never'
        };
    }
    
    // ==== СЛУЖЕБНЫЕ МЕТОДЫ ====
    
    countEntities(data) {
        let count = 0;
        const countRecursive = (entity) => {
            count++;
            if (entity.children && Array.isArray(entity.children)) {
                entity.children.forEach(countRecursive);
            }
        };
        countRecursive(data);
        return count;
    }
    
    countEntitiesByType() {
        const counts = {};
        for (const entity of this.entityIndex.values()) {
            counts[entity.type] = (counts[entity.type] || 0) + 1;
        }
        return counts;
    }
    
    calculateTreeDepth(data) {
        let maxDepth = 0;
        
        const calculateDepth = (node, currentDepth) => {
            maxDepth = Math.max(maxDepth, currentDepth);
            if (node.children && Array.isArray(node.children)) {
                node.children.forEach(child => {
                    calculateDepth(child, currentDepth + 1);
                });
            }
        };
        
        calculateDepth(data, 0);
        return maxDepth;
    }
    
    deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.error('❌ Ошибка клонирования объекта:', error);
            return { ...obj };
        }
    }
    
    // ==== ОЧИСТКА И УНИЧТОЖЕНИЕ ====
    
    clearCache() {
        this.dataCache.clear();
        this.positionCache.clear();
        console.log('🧹 Кэши данных очищены');
    }
    
    destroy() {
        this.clearCache();
        this.entityIndex.clear();
        this.positionIndex.clear();
        this.parentIndex.clear();
        this.memoryManager.dispose();
        this.state.isInitialized = false;
        
        console.log('🧹 GalaxyDataLoader уничтожен');
    }
    
    // ==== ДИАГНОСТИКА ====
    
    getStats() {
        return {
            state: { ...this.state },
            cache: this.dataCache.getStats(),
            indexes: {
                entities: this.entityIndex.size,
                positions: this.positionIndex.size,
                parents: this.parentIndex.size
            },
            config: { ...this.config }
        };
    }
}

export default GalaxyDataLoader;
