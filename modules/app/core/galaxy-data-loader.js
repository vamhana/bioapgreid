// modules/app/core/galaxy-data-loader.js
import { SecurityValidator } from './security-validator.js';
import { MemoryManager } from './memory-manager.js';
import { DataLoaderConfig } from './config/data-loader-config.js';
import { PositionGenerator } from './utils/position-generator.js';
import { DataLoaderResult, DataLoadingError } from './errors/data-loader-errors.js';

export class GalaxyDataLoader {
    constructor(config = {}) {
        this.config = { ...DataLoaderConfig.DEFAULT, ...config };
        this.securityValidator = new SecurityValidator(this.config.security);
        this.memoryManager = new MemoryManager(this.config.memory);
        this.positionGenerator = new PositionGenerator(this.config.seed);
        
        // Индексы для быстрого поиска
        this.entityIndex = new Map();      // id → entity
        this.positionIndex = new Map();    // id → position
        this.parentIndex = new Map();      // id → parentId
        
        // Кэши
        this.dataCache = new SmartCache(this.config.cache);
        this.positionCache = new Map();
        
        // Состояние
        this.state = {
            isInitialized: false,
            isLoading: false,
            lastError: null,
            stats: {
                loadTime: 0,
                entityCount: 0,
                cacheHits: 0
            }
        };
        
        console.log('📊 GalaxyDataLoader создан с конфигом:', this.config.name);
    }
    
    async load(options = {}) {
        const startTime = performance.now();
        
        try {
            this.state.isLoading = true;
            this.state.lastError = null;
            
            // Пытаемся загрузить из кэша
            if (options.useCache !== false) {
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
            
            return result;
            
        } catch (error) {
            this.state.lastError = error;
            
            // Пробуем загрузить fallback данные
            if (options.fallback !== false) {
                console.warn('⚠️ Используем fallback данные');
                const fallbackResult = await this.loadFallbackData();
                return DataLoaderResult.success(
                    fallbackResult.data, 
                    ['fallback_used', error.message]
                );
            }
            
            return DataLoaderResult.error(
                new DataLoadingError('Failed to load galaxy data', { cause: error })
            );
            
        } finally {
            this.state.isLoading = false;
        }
    }
    
    async loadFreshData(options) {
        const warnings = [];
        
        // 1. Загружаем сырые данные
        const rawData = await this.fetchData(this.config.sitemapUrl);
        
        // 2. Валидируем безопасность
        try {
            this.securityValidator.validateGalaxyData(rawData);
        } catch (validationError) {
            warnings.push(`Security validation: ${validationError.message}`);
            // Решаем, продолжать или нет в зависимости от конфига
            if (this.config.security.strictMode) {
                throw validationError;
            }
        }
        
        // 3. Обрабатываем данные
        const processedData = await this.processData(rawData, options.progressCallback);
        
        // 4. Строим индексы
        this.buildIndexes(processedData);
        
        // 5. Кэшируем результат
        await this.cacheData(processedData);
        
        return DataLoaderResult.success(processedData, warnings);
    }
    
    async processData(rawData, progressCallback = null) {
        const processor = new GalaxyDataProcessor(this.config);
        
        // Разбиваем обработку на этапы
        const stages = [
            { name: 'parsing', weight: 0.1 },
            { name: 'validation', weight: 0.2 },
            { name: '3d_generation', weight: 0.5 },
            { name: 'indexing', weight: 0.2 }
        ];
        
        let progress = 0;
        
        for (const stage of stages) {
            if (progressCallback) {
                progressCallback({ stage: stage.name, progress });
            }
            
            switch (stage.name) {
                case 'parsing':
                    rawData = processor.parseStructure(rawData);
                    break;
                case 'validation':
                    processor.validateData(rawData);
                    break;
                case '3d_generation':
                    rawData.threeData = this.generateComplete3DLayout(rawData);
                    break;
                case 'indexing':
                    this.indexData(rawData);
                    break;
            }
            
            progress += stage.weight;
        }
        
        // Добавляем метаданные
        rawData.metadata = {
            processedAt: new Date().toISOString(),
            version: this.config.version,
            processor: 'GalaxyDataLoader',
            stats: {
                totalEntities: this.entityIndex.size,
                depth: this.calculateTreeDepth(rawData),
                memoryEstimate: this.estimateMemoryUsage(rawData)
            }
        };
        
        return rawData;
    }
    
    generateComplete3DLayout(data) {
        const layout = {
            center: { x: 0, y: 0, z: 0 },
            orbitalLayers: [],
            entityPositions: new Map()
        };
        
        if (!data.children) {
            return layout;
        }
        
        // Генерируем орбитальные слои
        data.children.forEach((planet, planetIndex) => {
            const orbitRadius = 200 + planetIndex * 150;
            const orbit = {
                radius: orbitRadius,
                tilt: (Math.random() - 0.5) * 0.2, // Наклон орбиты
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
            if (planet.children) {
                planet.children.forEach((moon, moonIndex) => {
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
        
        const indexEntity = (entity, parentId = null) => {
            if (!entity || !entity.cleanPath) {
                console.warn('⚠️ Entity without cleanPath found:', entity);
                return;
            }
            
            const entityId = entity.cleanPath;
            
            // Добавляем в индексы
            this.entityIndex.set(entityId, entity);
            
            if (parentId) {
                this.parentIndex.set(entityId, parentId);
            }
            
            // Добавляем позицию если есть
            if (data.threeData?.entityPositions) {
                const position = data.threeData.entityPositions.get(entityId);
                if (position) {
                    this.positionIndex.set(entityId, position);
                }
            }
            
            // Рекурсивно индексируем детей с защитой от циклов
            if (entity.children) {
                const visited = new Set();
                entity.children.forEach(child => {
                    if (visited.has(child.cleanPath)) {
                        console.warn('⚠️ Duplicate child found:', child.cleanPath);
                        return;
                    }
                    visited.add(child.cleanPath);
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
    
    // Улучшенные методы поиска
    getEntityByPath(path) {
        const entity = this.entityIndex.get(path);
        if (!entity) {
            console.warn(`⚠️ Entity not found: ${path}`);
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
    
    // Новые полезные методы
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
    
    getEntityDepth(entityId) {
        let depth = 0;
        let currentId = entityId;
        
        while (this.parentIndex.has(currentId)) {
            depth++;
            currentId = this.parentIndex.get(currentId);
            if (depth > 100) { // Защита от бесконечного цикла
                console.warn('⚠️ Possible circular reference detected');
                break;
            }
        }
        
        return depth;
    }
    
    // Методы для работы с памятью
    estimateMemoryUsage(data) {
        const jsonString = JSON.stringify(data);
        const bytes = new Blob([jsonString]).size;
        
        return {
            bytes,
            formatted: this.formatBytes(bytes),
            entities: this.entityIndex.size,
            positions: this.positionIndex.size
        };
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Очистка памяти
    clearCache() {
        this.dataCache.clear();
        this.positionCache.clear();
        console.log('🧹 Кэши данных очищены');
    }
    
    dispose() {
        this.clearCache();
        this.entityIndex.clear();
        this.positionIndex.clear();
        this.parentIndex.clear();
        this.memoryManager.dispose();
        this.state.isInitialized = false;
        
        console.log('🧹 GalaxyDataLoader уничтожен');
    }
    
    // Статистика и отладка
    getStats() {
        return {
            ...this.state.stats,
            cache: {
                entityIndexSize: this.entityIndex.size,
                positionIndexSize: this.positionIndex.size,
                parentIndexSize: this.parentIndex.size,
                positionCacheSize: this.positionCache.size
            },
            performance: {
                avgPositionCalculation: this.positionGenerator.getStats()
            }
        };
    }
    
    // Вспомогательные методы
    async tryLoadFromCache() {
        if (!this.config.cache.enabled) return null;
        
        try {
            const cached = await this.dataCache.getOrSet(
                'galaxy_data',
                () => Promise.reject(new Error('Cache miss')),
                { ttl: this.config.cache.ttl }
            );
            
            // Восстанавливаем индексы из кэшированных данных
            if (cached) {
                this.buildIndexes(cached);
                return cached;
            }
        } catch (error) {
            // Кэш не найден или просрочен
        }
        
        return null;
    }
    
    async cacheData(data) {
        if (!this.config.cache.enabled) return;
        
        await this.dataCache.set('galaxy_data', data, {
            ttl: this.config.cache.ttl,
            size: this.estimateMemoryUsage(data).bytes
        });
    }
    
    calculateTreeDepth(data) {
        let maxDepth = 0;
        
        const calculateDepth = (node, currentDepth) => {
            maxDepth = Math.max(maxDepth, currentDepth);
            
            if (node.children) {
                node.children.forEach(child => {
                    calculateDepth(child, currentDepth + 1);
                });
            }
        };
        
        calculateDepth(data, 0);
        return maxDepth;
    }
}

// Вспомогательные классы
class GalaxyDataProcessor {
    constructor(config) {
        this.config = config;
    }
    
    parseStructure(rawData) {
        // Нормализуем структуру данных
        const normalized = {
            ...rawData,
            children: rawData.children || [],
            config: rawData.config || {},
            stats: rawData.stats || this.calculateStats(rawData)
        };
        
        // Обеспечиваем наличие cleanPath
        this.ensureCleanPaths(normalized);
        
        return normalized;
    }
    
    ensureCleanPaths(node, parentPath = '') {
        if (!node.cleanPath) {
            node.cleanPath = parentPath ? `${parentPath}/${node.name}` : node.name;
        }
        
        if (node.children) {
            node.children.forEach(child => {
                this.ensureCleanPaths(child, node.cleanPath);
            });
        }
    }
    
    calculateStats(data) {
        const stats = {
            entities: {},
            total: 0
        };
        
        const countEntities = (node) => {
            stats.total++;
            stats.entities[node.type] = (stats.entities[node.type] || 0) + 1;
            
            if (node.children) {
                node.children.forEach(countEntities);
            }
        };
        
        countEntities(data);
        return stats;
    }
    
    validateData(data) {
        // Проверка максимальной глубины
        const depth = this.calculateDepth(data);
        if (depth > this.config.validation.maxDepth) {
            throw new Error(`Tree depth ${depth} exceeds maximum ${this.config.validation.maxDepth}`);
        }
        
        // Проверка количества сущностей
        if (data.stats?.total > this.config.validation.maxEntities) {
            throw new Error(`Too many entities: ${data.stats.total}`);
        }
        
        // Проверка обязательных полей
        this.validateRequiredFields(data);
    }
    
    calculateDepth(node, currentDepth = 0) {
        if (!node.children || node.children.length === 0) {
            return currentDepth;
        }
        
        let maxChildDepth = currentDepth;
        for (const child of node.children) {
            const childDepth = this.calculateDepth(child, currentDepth + 1);
            maxChildDepth = Math.max(maxChildDepth, childDepth);
        }
        
        return maxChildDepth;
    }
    
    validateRequiredFields(node, path = '') {
        const currentPath = path ? `${path}/${node.name}` : node.name;
        
        if (!node.name) {
            throw new Error(`Entity missing name at path: ${currentPath}`);
        }
        
        if (!node.type) {
            console.warn(`⚠️ Entity missing type: ${currentPath}`);
            node.type = 'unknown';
        }
        
        if (node.children) {
            node.children.forEach(child => {
                this.validateRequiredFields(child, currentPath);
            });
        }
    }
}

export default GalaxyDataLoader;
