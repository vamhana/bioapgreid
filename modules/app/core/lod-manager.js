// modules/app/core/lod-manager.js
import * as THREE from './three.module.js';

export class LODManager {
    constructor(options = {}) {
        this.options = {
            enabled: options.enabled !== false,
            autoUpdate: options.autoUpdate !== false,
            updateFrequency: options.updateFrequency || 100, // ms
            debug: options.debug || false,
            quality: options.quality || 'medium', // 'low', 'medium', 'high', 'ultra'
            ...options
        };

        // Реестр LOD для сущностей
        this.entityLODs = new Map();
        
        // Кэш геометрий для переиспользования
        this.geometryCache = new Map();
        
        // Система уровней детализации
        this.lodLevels = this.initializeLODLevels();
        
        // Настройки для разных типов сущностей
        this.entitySettings = this.initializeEntitySettings();
        
        // Статистика
        this.stats = {
            totalEntities: 0,
            lodChanges: 0,
            geometryCacheHits: 0,
            geometryCacheMisses: 0,
            lastUpdate: 0,
            updatesPerSecond: 0,
            memoryUsage: 0
        };

        // Система предзагрузки
        this.preloadQueue = new Set();
        this.isPreloading = false;

        // Для отладки
        this.debugMaterials = new Map();
        this.debugEnabled = this.options.debug;

        console.log('🎯 LODManager создан', { 
            quality: this.options.quality,
            enabled: this.options.enabled 
        });
    }

    // Инициализация уровней LOD
    initializeLODLevels() {
        const levels = {
            'ultra': { 
                priority: 0, 
                maxDistance: 100,
                updateThreshold: 5 
            },
            'high': { 
                priority: 1, 
                maxDistance: 300,
                updateThreshold: 10 
            },
            'medium': { 
                priority: 2, 
                maxDistance: 600,
                updateThreshold: 20 
            },
            'low': { 
                priority: 3, 
                maxDistance: 1200,
                updateThreshold: 30 
            },
            'billboard': { 
                priority: 4, 
                maxDistance: Infinity,
                updateThreshold: 50 
            }
        };

        // Настройки на основе качества
        const qualityMultipliers = {
            'low': 0.5,
            'medium': 0.8,
            'high': 1.0,
            'ultra': 1.5
        };

        const multiplier = qualityMultipliers[this.options.quality] || 1.0;

        Object.values(levels).forEach(level => {
            level.maxDistance *= multiplier;
        });

        return levels;
    }

    // Настройки для разных типов сущностей
    initializeEntitySettings() {
        return {
            'star': {
                lodLevels: {
                    'ultra': { segments: 64, details: true, glow: true },
                    'high': { segments: 32, details: true, glow: true },
                    'medium': { segments: 16, details: false, glow: true },
                    'low': { segments: 8, details: false, glow: false },
                    'billboard': { segments: 4, details: false, glow: false }
                },
                baseRadius: 40,
                importance: 1.0 // Множитель для дистанций LOD
            },
            'planet': {
                lodLevels: {
                    'ultra': { segments: 48, details: true, atmosphere: true },
                    'high': { segments: 32, details: true, atmosphere: true },
                    'medium': { segments: 24, details: false, atmosphere: false },
                    'low': { segments: 12, details: false, atmosphere: false },
                    'billboard': { segments: 6, details: false, atmosphere: false }
                },
                baseRadius: 25,
                importance: 0.8
            },
            'moon': {
                lodLevels: {
                    'ultra': { segments: 32, details: true },
                    'high': { segments: 24, details: true },
                    'medium': { segments: 16, details: false },
                    'low': { segments: 8, details: false },
                    'billboard': { segments: 4, details: false }
                },
                baseRadius: 8,
                importance: 0.6
            },
            'asteroid': {
                lodLevels: {
                    'ultra': { segments: 16, details: true, irregular: true },
                    'high': { segments: 12, details: true, irregular: true },
                    'medium': { segments: 8, details: false, irregular: false },
                    'low': { segments: 6, details: false, irregular: false },
                    'billboard': { segments: 3, details: false, irregular: false }
                },
                baseRadius: 4,
                importance: 0.4
            },
            'default': {
                lodLevels: {
                    'ultra': { segments: 24, details: true },
                    'high': { segments: 16, details: true },
                    'medium': { segments: 12, details: false },
                    'low': { segments: 8, details: false },
                    'billboard': { segments: 4, details: false }
                },
                baseRadius: 10,
                importance: 0.5
            }
        };
    }

    // Предзагрузка LOD геометрий
    async preloadLODs(entityTypes = ['star', 'planet', 'moon', 'asteroid']) {
        if (this.isPreloading) {
            console.warn('⚠️ Предзагрузка уже выполняется');
            return;
        }

        this.isPreloading = true;
        console.log('📦 Предзагрузка LOD геометрий...');

        const startTime = performance.now();
        let loadedCount = 0;

        try {
            for (const entityType of entityTypes) {
                const settings = this.entitySettings[entityType] || this.entitySettings.default;
                
                for (const [levelName, levelConfig] of Object.entries(settings.lodLevels)) {
                    const geometry = this.createGeometryForLOD(entityType, levelName, levelConfig);
                    const cacheKey = this.createGeometryCacheKey(entityType, levelName);
                    
                    this.geometryCache.set(cacheKey, geometry);
                    loadedCount++;
                    
                    // Даем браузеру передышку для обработки других задач
                    if (loadedCount % 5 === 0) {
                        await this.delay(0);
                    }
                }
            }

            const loadTime = performance.now() - startTime;
            console.log(`✅ Предзагружено ${loadedCount} LOD геометрий за ${loadTime.toFixed(2)}ms`);

        } catch (error) {
            console.error('❌ Ошибка предзагрузки LOD:', error);
        } finally {
            this.isPreloading = false;
        }
    }

    // Задержка для асинхронных операций
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Регистрация сущности в LOD системе
    registerEntity(entityId, entityType, radius) {
        if (!this.options.enabled) return null;

        const settings = this.entitySettings[entityType] || this.entitySettings.default;
        const scaledRadius = radius || settings.baseRadius;

        const entityLOD = {
            entityId,
            entityType,
            radius: scaledRadius,
            currentLevel: null,
            lastLevelChange: 0,
            settings: settings,
            mesh: null,
            importance: settings.importance,
            lastUpdate: 0
        };

        this.entityLODs.set(entityId, entityLOD);
        this.stats.totalEntities++;

        // Сразу создаем геометрию для текущего уровня (billboard по умолчанию)
        this.ensureGeometryPreloaded(entityType, 'billboard');

        return entityLOD;
    }

    // Удаление сущности из LOD системы
    unregisterEntity(entityId) {
        const entityLOD = this.entityLODs.get(entityId);
        if (!entityLOD) return;

        this.entityLODs.delete(entityId);
        this.stats.totalEntities--;

        if (this.debugEnabled) {
            this.removeDebugVisualization(entityId);
        }
    }

    // Получение подходящего уровня LOD для сущности
    getLODLevel(entityId, distance, zoomLevel = 1) {
        if (!this.options.enabled) return 'medium';

        const entityLOD = this.entityLODs.get(entityId);
        if (!entityLOD) return 'medium';

        // Учитываем важность сущности и масштаб
        const effectiveDistance = distance / (entityLOD.importance * Math.max(zoomLevel, 0.1));
        
        // Находим подходящий уровень LOD
        let targetLevel = 'billboard';
        
        for (const [levelName, levelConfig] of Object.entries(this.lodLevels)) {
            if (effectiveDistance <= levelConfig.maxDistance) {
                targetLevel = levelName;
                break;
            }
        }

        // Проверяем, нужно ли обновлять уровень
        const now = Date.now();
        const timeSinceLastChange = now - entityLOD.lastLevelChange;
        const currentLevel = entityLOD.currentLevel;

        // Защита от частых переключений
        if (currentLevel && targetLevel !== currentLevel) {
            const threshold = this.lodLevels[currentLevel].updateThreshold;
            if (timeSinceLastChange < threshold) {
                // Слишком рано для переключения, используем текущий уровень
                return currentLevel;
            }
        }

        // Обновляем уровень если он изменился
        if (targetLevel !== currentLevel) {
            entityLOD.currentLevel = targetLevel;
            entityLOD.lastLevelChange = now;
            this.stats.lodChanges++;

            if (this.debugEnabled) {
                this.updateDebugVisualization(entityLOD);
            }
        }

        entityLOD.lastUpdate = now;
        return targetLevel;
    }

    // Применение LOD к мешу сущности
    applyLOD(mesh, lodLevel, distance) {
        if (!this.options.enabled || !mesh) return;

        const entityId = mesh.userData?.entityId;
        if (!entityId) return;

        const entityLOD = this.entityLODs.get(entityId);
        if (!entityLOD) return;

        const entityType = entityLOD.entityType;
        const settings = entityLOD.settings;
        const levelConfig = settings.lodLevels[lodLevel];

        if (!levelConfig) {
            console.warn(`⚠️ Конфигурация LOD не найдена: ${entityType}.${lodLevel}`);
            return;
        }

        try {
            // Получаем или создаем геометрию для этого LOD уровня
            const geometry = this.getOrCreateGeometry(entityType, lodLevel, levelConfig);
            
            if (geometry && mesh.geometry !== geometry) {
                // Сохраняем предыдущую геометрию для корректного dispose
                const oldGeometry = mesh.geometry;
                mesh.geometry = geometry;
                
                // Освобождаем память от старой геометрии если она больше не используется
                if (oldGeometry && oldGeometry !== geometry) {
                    this.scheduleGeometryDisposal(oldGeometry);
                }
            }

            // Применяем дополнительные настройки в зависимости от уровня
            this.applyLODSpecificSettings(mesh, lodLevel, levelConfig, distance);

            entityLOD.mesh = mesh;

        } catch (error) {
            console.error(`❌ Ошибка применения LOD для ${entityId}:`, error);
        }
    }

    // Получение или создание геометрии для LOD
    getOrCreateGeometry(entityType, lodLevel, levelConfig) {
        const cacheKey = this.createGeometryCacheKey(entityType, lodLevel);
        
        // Пробуем получить из кэша
        if (this.geometryCache.has(cacheKey)) {
            this.stats.geometryCacheHits++;
            return this.geometryCache.get(cacheKey);
        }

        this.stats.geometryCacheMisses++;
        
        // Создаем новую геометрию
        const geometry = this.createGeometryForLOD(entityType, lodLevel, levelConfig);
        this.geometryCache.set(cacheKey, geometry);
        
        // Трекинг использования памяти
        this.trackGeometryMemory(geometry, cacheKey);
        
        return geometry;
    }

    // Создание геометрии для конкретного LOD уровня
    createGeometryForLOD(entityType, lodLevel, levelConfig) {
        const segments = levelConfig.segments || 8;
        
        try {
            switch (entityType) {
                case 'star':
                case 'planet':
                case 'moon':
                    return new THREE.SphereGeometry(1, segments, Math.floor(segments / 2));
                
                case 'asteroid':
                    if (levelConfig.irregular && lodLevel !== 'billboard') {
                        // Немного искаженная сфера для астероидов
                        return this.createIrregularSphereGeometry(segments);
                    } else {
                        return new THREE.SphereGeometry(1, segments, Math.floor(segments / 2));
                    }
                
                default:
                    return new THREE.SphereGeometry(1, segments, Math.floor(segments / 2));
            }
        } catch (error) {
            console.error(`❌ Ошибка создания геометрии для ${entityType}.${lodLevel}:`, error);
            // Fallback геометрия
            return new THREE.SphereGeometry(1, 8, 4);
        }
    }

    // Создание искаженной сферы для астероидов
    createIrregularSphereGeometry(segments) {
        const geometry = new THREE.SphereGeometry(1, segments, Math.floor(segments / 2));
        const position = geometry.attributes.position;
        
        // Добавляем случайные искажения для более естественного вида астероидов
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);
            
            // Случайное искажение (5-15%)
            const distortion = 0.05 + Math.random() * 0.1;
            const scale = 1 + (Math.random() - 0.5) * 2 * distortion;
            
            position.setX(i, x * scale);
            position.setY(i, y * scale);
            position.setZ(i, z * scale);
        }
        
        position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        return geometry;
    }

    // Применение специфических настроек для LOD уровня
    applyLODSpecificSettings(mesh, lodLevel, levelConfig, distance) {
        // Настройки материала в зависимости от расстояния
        if (mesh.material) {
            // Уменьшаем качество материалов на больших расстояниях
            if (lodLevel === 'billboard' || lodLevel === 'low') {
                if (mesh.material instanceof THREE.MeshStandardMaterial) {
                    mesh.material.roughness = 1.0;
                    mesh.material.metalness = 0.0;
                }
            }

            // Включаем/выключаем свечение для звезд
            if (mesh.userData?.type === 'star') {
                mesh.material.emissiveIntensity = levelConfig.glow ? 0.8 : 0.3;
            }
        }

        // Настройки отбрасывания теней
        if (mesh.castShadow !== undefined) {
            mesh.castShadow = (lodLevel === 'ultra' || lodLevel === 'high');
            mesh.receiveShadow = (lodLevel === 'ultra' || lodLevel === 'high');
        }

        // Для billboard уровня можно добавить всегда-лицевую текстуру
        if (lodLevel === 'billboard' && mesh.material) {
            // Упрощаем материал для billboard
            mesh.material.side = THREE.DoubleSide;
        }
    }

    // Создание ключа для кэша геометрий
    createGeometryCacheKey(entityType, lodLevel) {
        return `${entityType}_${lodLevel}_${this.options.quality}`;
    }

    // Обеспечение предзагрузки геометрии
    ensureGeometryPreloaded(entityType, lodLevel) {
        const cacheKey = this.createGeometryCacheKey(entityType, lodLevel);
        
        if (!this.geometryCache.has(cacheKey) {
            const settings = this.entitySettings[entityType] || this.entitySettings.default;
            const levelConfig = settings.lodLevels[lodLevel];
            
            if (levelConfig) {
                this.preloadQueue.add(cacheKey);
                this.processPreloadQueue();
            }
        }
    }

    // Обработка очереди предзагрузки
    async processPreloadQueue() {
        if (this.isPreloading || this.preloadQueue.size === 0) return;

        this.isPreloading = true;

        try {
            for (const cacheKey of this.preloadQueue) {
                const [entityType, lodLevel] = cacheKey.split('_');
                const settings = this.entitySettings[entityType] || this.entitySettings.default;
                const levelConfig = settings.lodLevels[lodLevel];
                
                if (levelConfig) {
                    const geometry = this.createGeometryForLOD(entityType, lodLevel, levelConfig);
                    this.geometryCache.set(cacheKey, geometry);
                    this.trackGeometryMemory(geometry, cacheKey);
                }
                
                this.preloadQueue.delete(cacheKey);
                
                // Даем браузеру передышку
                if (this.preloadQueue.size > 0) {
                    await this.delay(0);
                }
            }
        } catch (error) {
            console.error('❌ Ошибка обработки очереди предзагрузки:', error);
        } finally {
            this.isPreloading = false;
        }
    }

    // Трекинг использования памяти геометрией
    trackGeometryMemory(geometry, cacheKey) {
        let size = 0;
        
        if (geometry.attributes.position) {
            size += geometry.attributes.position.array.byteLength;
        }
        if (geometry.attributes.normal) {
            size += geometry.attributes.normal.array.byteLength;
        }
        if (geometry.attributes.uv) {
            size += geometry.attributes.uv.array.byteLength;
        }
        if (geometry.index) {
            size += geometry.index.array.byteLength;
        }
        
        this.stats.memoryUsage += size;
        
        if (this.debugEnabled) {
            console.log(`📊 Геометрия создана: ${cacheKey} (~${this.formatBytes(size)})`);
        }
    }

    // Форматирование байтов
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Планирование освобождения геометрии
    scheduleGeometryDisposal(geometry) {
        // Отложенное освобождение для избежания скачков производительности
        setTimeout(() => {
            if (geometry && !this.isGeometryInUse(geometry)) {
                geometry.dispose();
            }
        }, 1000); // 1 секунда задержки
    }

    // Проверка используется ли геометрия
    isGeometryInUse(geometry) {
        for (const entityLOD of this.entityLODs.values()) {
            if (entityLOD.mesh && entityLOD.mesh.geometry === geometry) {
                return true;
            }
        }
        return false;
    }

    // Пакетное обновление LOD для группы сущностей
    updateLODsForEntities(entitiesData, cameraPosition, zoomLevel = 1) {
        if (!this.options.enabled || !this.options.autoUpdate) return;

        const startTime = performance.now();
        let updatedCount = 0;

        for (const entityData of entitiesData) {
            const { entityId, position } = entityData;
            
            if (!position) continue;

            const distance = cameraPosition.distanceTo(position);
            const lodLevel = this.getLODLevel(entityId, distance, zoomLevel);
            
            const entityLOD = this.entityLODs.get(entityId);
            if (entityLOD && entityLOD.mesh) {
                this.applyLOD(entityLOD.mesh, lodLevel, distance);
                updatedCount++;
            }
        }

        const updateTime = performance.now() - startTime;
        this.stats.lastUpdate = Date.now();
        
        // Обновляем статистику UPS (updates per second)
        this.updateUPSStatistics(updateTime, updatedCount);

        if (this.debugEnabled && updateTime > 16) {
            console.warn(`⚠️ LOD update занял ${updateTime.toFixed(2)}ms для ${updatedCount} сущностей`);
        }
    }

    // Обновление статистики UPS
    updateUPSStatistics(updateTime, updatedCount) {
        const now = Date.now();
        const timeDelta = now - (this.stats.lastUpdate || now);
        
        if (timeDelta > 0) {
            this.stats.updatesPerSecond = Math.round((updatedCount / timeDelta) * 1000);
        }
    }

    // Методы для отладки

    setDebugEnabled(enabled) {
        this.debugEnabled = enabled;
        
        if (enabled) {
            this.createDebugMaterials();
        } else {
            this.removeAllDebugVisualizations();
        }
        
        console.log(`🔧 LOD debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }

    createDebugMaterials() {
        const colors = {
            'ultra': 0x00ff00, // зеленый
            'high': 0xffff00,  // желтый
            'medium': 0xff8800, // оранжевый
            'low': 0xff0000,   // красный
            'billboard': 0x888888 // серый
        };

        for (const [level, color] of Object.entries(colors)) {
            const material = new THREE.MeshBasicMaterial({
                color: color,
                wireframe: true,
                transparent: true,
                opacity: 0.7
            });
            this.debugMaterials.set(level, material);
        }
    }

    updateDebugVisualization(entityLOD) {
        if (!this.debugEnabled || !entityLOD.mesh) return;

        const debugMaterial = this.debugMaterials.get(entityLOD.currentLevel);
        if (debugMaterial) {
            // Сохраняем оригинальный материал
            if (!entityLOD.mesh.userData.originalMaterial) {
                entityLOD.mesh.userData.originalMaterial = entityLOD.mesh.material;
            }
            
            entityLOD.mesh.material = debugMaterial;
        }
    }

    removeDebugVisualization(entityId) {
        const entityLOD = this.entityLODs.get(entityId);
        if (entityLOD && entityLOD.mesh && entityLOD.mesh.userData.originalMaterial) {
            entityLOD.mesh.material = entityLOD.mesh.userData.originalMaterial;
            entityLOD.mesh.userData.originalMaterial = null;
        }
    }

    removeAllDebugVisualizations() {
        this.entityLODs.forEach(entityLOD => {
            this.removeDebugVisualization(entityLOD.entityId);
        });
    }

    // Получение информации о LOD для сущности
    getEntityLODInfo(entityId) {
        const entityLOD = this.entityLODs.get(entityId);
        if (!entityLOD) return null;

        return {
            entityId: entityLOD.entityId,
            entityType: entityLOD.entityType,
            currentLevel: entityLOD.currentLevel,
            radius: entityLOD.radius,
            importance: entityLOD.importance,
            lastUpdate: entityLOD.lastUpdate,
            lastLevelChange: entityLOD.lastLevelChange
        };
    }

    // Получение статистики LOD системы
    getLODStats() {
        const levelDistribution = {};
        Object.keys(this.lodLevels).forEach(level => {
            levelDistribution[level] = 0;
        });

        this.entityLODs.forEach(entityLOD => {
            if (entityLOD.currentLevel) {
                levelDistribution[entityLOD.currentLevel]++;
            }
        });

        const cacheHitRate = (this.stats.geometryCacheHits + this.stats.geometryCacheMisses) > 0 ?
            (this.stats.geometryCacheHits / (this.stats.geometryCacheHits + this.stats.geometryCacheMisses) * 100) : 0;

        return {
            ...this.stats,
            levelDistribution,
            cacheHitRate: Math.round(cacheHitRate * 100) / 100,
            geometryCacheSize: this.geometryCache.size,
            preloadQueueSize: this.preloadQueue.size,
            isPreloading: this.isPreloading,
            memoryFormatted: this.formatBytes(this.stats.memoryUsage),
            settings: {
                quality: this.options.quality,
                enabled: this.options.enabled,
                autoUpdate: this.options.autoUpdate
            }
        };
    }

    // Изменение качества в реальном времени
    setQuality(quality) {
        if (this.options.quality === quality) return;

        this.options.quality = quality;
        this.lodLevels = this.initializeLODLevels();
        
        // Инвалидируем кэш геометрий т.к. настройки изменились
        this.geometryCache.clear();
        this.stats.memoryUsage = 0;
        
        // Перезагружаем LOD для всех сущностей
        this.entityLODs.forEach(entityLOD => {
            entityLOD.currentLevel = null;
        });

        console.log(`🎚️ Качество LOD изменено на: ${quality}`);
    }

    // Очистка и оптимизация
    cleanup() {
        // Освобождаем неиспользуемые геометрии
        let disposedCount = 0;
        this.geometryCache.forEach((geometry, key) => {
            if (!this.isGeometryInUse(geometry)) {
                geometry.dispose();
                this.geometryCache.delete(key);
                disposedCount++;
            }
        });

        if (disposedCount > 0) {
            console.log(`🧹 Очищено ${disposedCount} неиспользуемых геометрий`);
        }

        // Обновляем статистику памяти
        this.stats.memoryUsage = this.calculateCurrentMemoryUsage();
    }

    // Расчет текущего использования памяти
    calculateCurrentMemoryUsage() {
        let totalMemory = 0;
        
        this.geometryCache.forEach(geometry => {
            if (geometry.attributes.position) {
                totalMemory += geometry.attributes.position.array.byteLength;
            }
            if (geometry.attributes.normal) {
                totalMemory += geometry.attributes.normal.array.byteLength;
            }
            if (geometry.index) {
                totalMemory += geometry.index.array.byteLength;
            }
        });

        return totalMemory;
    }

    // Полная очистка
    clear() {
        this.entityLODs.clear();
        
        this.geometryCache.forEach(geometry => {
            geometry.dispose();
        });
        this.geometryCache.clear();
        
        this.preloadQueue.clear();
        this.debugMaterials.clear();
        
        // Сброс статистики
        this.stats.totalEntities = 0;
        this.stats.lodChanges = 0;
        this.stats.geometryCacheHits = 0;
        this.stats.geometryCacheMisses = 0;
        this.stats.memoryUsage = 0;
        this.stats.updatesPerSecond = 0;

        console.log('🧹 LODManager очищен');
    }

    // Деструктор
    dispose() {
        this.clear();
        console.log('✅ LODManager уничтожен');
    }
}

export default LODManager;
