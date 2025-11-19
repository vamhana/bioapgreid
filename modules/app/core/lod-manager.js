// modules/app/core/lod-manager.js
// СТАТУС: АКТУАЛЬНЫЙ (ОБНОВЛЕННЫЙ)
// ТИП: JavaScript (Менеджер уровней детализации для 3D-сцены)
// МОДУЛЬНАЯ СИСТЕМА: ES6 Modules
// НАЗНАЧЕНИЕ ФАЙЛА:
//   Управление уровнями детализации (LOD) для 3D-сущностей в реальном времени
//   с автоматическим переключением геометрий на основе расстояния и важности объектов
// СТРУКТУРА:
//   ИМПОРТИРУЕТ:
//     - ./three.module.js - для работы с 3D-графикой и геометриями
//   ЭКСПОРТЫ (ПУБЛИЧНЫЙ ИНТЕРФЕЙС):
//     - export default LODManager - основной класс для управления LOD системой
//     - export { LODManager } - именованный экспорт для расширенного использования
//   ВНУТРЕННЯЯ СТРУКТУРА:
//     [!] КЛЮЧЕВЫЕ ЭЛЕМЕНТЫ:
//     - КЛАССЫ: LODManager - центральный координатор системы уровней детализации
//     - ФУНКЦИИ: createIrregularSphereGeometry - создание геометрии астероидов
//     - СОСТОЯНИЕ: entityLODs, geometryCache, preloadQueue - кэши и реестры
// ЗАВИСИМОСТИ (ТОЛЬКО ВАЖНЫЕ):
//   ВНЕШНИЕ: THREE.js (three.module.js) - для 3D геометрий и материалов
//   ВНУТРЕННИЕ: НЕТ ДАННЫХ
//   СТАНДАРТНЫЕ: Map, Set, Promise для кэширования и асинхронных операций
// КОНФИГУРАЦИЯ:
//   [!] НАСТРАИВАЕМЫЕ ПАРАМЕТРЫ:
//   - enabled: true/false - глобальное включение/выключение системы
//   - quality: 'low'|'medium'|'high'|'ultra' - множитель дистанций LOD
//   - autoUpdate: true/false - автоматическое обновление LOD
//   - updateFrequency: 100ms - частота обновлений
//   - debug: true/false - визуализация уровней детализации
// 🚧 СТАТУС РАЗРАБОТКИ:
//   [+] ОПТИМИЗАЦИИ: Кэширование геометрий - снижение нагрузки на GC
//   [+] ОПТИМИЗАЦИИ: Пакетное обновление LOD - минимизация вычислений за кадр
//   [+] ОПТИМИЗАЦИИ: Отложенное освобождение памяти
// ОСОБЕННОСТИ РЕАЛИЗАЦИИ:
//   [!] ГЛАВНЫЕ РЕШЕНИЯ:
//   - Иерархия уровней: ultra→high→medium→low→billboard с приоритетами
//   - Учет важности сущности (importance) и масштаба (zoomLevel)
//   - Защита от частых переключений через updateThreshold
// НЮАНСЫ РЕАЛИЗАЦИИ:
//   [-] ЧТО МОЖЕТ СЛОМАТЬСЯ:
//   - Отсутствие entityId в userData меша ломает привязку LOD
//   - Слишком частые вызовы updateLODsForEntities (>60fps) могут вызвать просадки
// 🧩 ЖИЗНЕННЫЙ ЦИКЛ:
//   [>] ФАЗА 1: Инициализация - настройка уровней LOD, кэшей, предзагрузка геометрий
//   [>] ФАЗА 2: Работа - регистрация сущностей, автоматическое обновление LOD, кэширование
//   [>] ФАЗА 3: Завершение - очистка геометрий, удаление отладочных материалов
// ⚡ СОБЫТИЙНЫЙ КОНТРАКТ:
//   [+] ГЕНЕРИРУЕТ: console.log/warn/error - логирование работы системы
//   [-] ОБРАБАТЫВАЕТ: Изменение позиции камеры → пересчет LOD для всех сущностей
//   [>] ВЗАИМОДЕЙСТВИЕ: С трехмерными мешами через замену geometry и material
// 🕒 ТАЙМИНГ И ПРИОРИТЕТЫ:
//   [!] ПЕРИОДИЧНОСТЬ: Обновление по требованию или каждые 100ms (autoUpdate)
//   [-] БЛОКИРУЮЩИЕ ОПЕРАЦИИ: Создание геометрий может блокировать основной поток
// 🔧 ЗАЩИТЫ И ОПТИМИЗАЦИИ:
//   [+] ЗАЩИТЫ: Проверки на существование entityLOD, fallback геометрии
//   [+] ОПТИМИЗАЦИИ: Единый кэш геометрий, отложенное освобождение памяти
//   [+] ОБРАБОТКА ОШИБОК: Try-catch вокруг создания геометрий, graceful degradation
//   [+] ОПТИМИЗАЦИИ: Батчинг обновлений, приоритизация близких объектов

import * as THREE from './three.module.js';

/**
 * Менеджер уровней детализации для 3D-сцены
 * Управляет автоматическим переключением геометрий на основе расстояния до камеры
 */
export class LODManager {
    /**
     * Создает экземпляр LODManager
     * @param {Object} options - Настройки менеджера
     * @param {boolean} [options.enabled=true] - Включение/выключение системы
     * @param {boolean} [options.autoUpdate=true] - Автоматическое обновление LOD
     * @param {number} [options.updateFrequency=100] - Частота обновлений в мс
     * @param {boolean} [options.debug=false] - Режим отладки
     * @param {string} [options.quality='medium'] - Уровень качества ('low', 'medium', 'high', 'ultra')
     */
    constructor(options = {}) {
        this.options = {
            enabled: options.enabled !== false,
            autoUpdate: options.autoUpdate !== false,
            updateFrequency: options.updateFrequency || 100,
            debug: options.debug || false,
            quality: options.quality || 'medium',
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
            memoryUsage: 0,
            frameTime: 0
        };

        // Система предзагрузки
        this.preloadQueue = new Set();
        this.isPreloading = false;

        // Для отладки
        this.debugMaterials = new Map();
        this.debugEnabled = this.options.debug;

        // Таймер для автообновления
        this.autoUpdateInterval = null;
        this.setupAutoUpdate();

        console.log('🎯 LODManager создан', { 
            quality: this.options.quality,
            enabled: this.options.enabled,
            autoUpdate: this.options.autoUpdate
        });
    }

    /**
     * Настраивает автоматическое обновление
     * @private
     */
    setupAutoUpdate() {
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
        }

        if (this.options.autoUpdate && this.options.enabled) {
            this.autoUpdateInterval = setInterval(() => {
                this.cleanup();
            }, this.options.updateFrequency);
        }
    }

    /**
     * Инициализация уровней LOD с настройками расстояний
     * @returns {Object} Конфигурация уровней LOD
     * @private
     */
    initializeLODLevels() {
        const baseLevels = {
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

        // Множители дистанций на основе качества
        const qualityMultipliers = {
            'low': 0.5,
            'medium': 0.8,
            'high': 1.0,
            'ultra': 1.5
        };

        const multiplier = qualityMultipliers[this.options.quality] || 1.0;
        const adjustedLevels = {};

        // Создаем копию с примененными множителями
        Object.keys(baseLevels).forEach(level => {
            adjustedLevels[level] = {
                ...baseLevels[level],
                maxDistance: baseLevels[level].maxDistance * multiplier
            };
        });

        return adjustedLevels;
    }

    /**
     * Инициализация настроек для различных типов сущностей
     * @returns {Object} Настройки сущностей
     * @private
     */
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
                importance: 1.0
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

    /**
     * Предзагрузка LOD геометрий для указанных типов сущностей
     * @param {string[]} entityTypes - Типы сущностей для предзагрузки
     * @returns {Promise<void>}
     */
    async preloadLODs(entityTypes = ['star', 'planet', 'moon', 'asteroid']) {
        if (this.isPreloading) {
            console.warn('⚠️ Предзагрузка уже выполняется');
            return;
        }

        this.isPreloading = true;
        console.log('📦 Предзагрузка LOD геометрий...', entityTypes);

        const startTime = performance.now();
        let loadedCount = 0;
        const totalToLoad = entityTypes.reduce((total, type) => {
            const settings = this.entitySettings[type] || this.entitySettings.default;
            return total + Object.keys(settings.lodLevels).length;
        }, 0);

        try {
            for (const entityType of entityTypes) {
                const settings = this.entitySettings[entityType] || this.entitySettings.default;
                
                for (const [levelName, levelConfig] of Object.entries(settings.lodLevels)) {
                    const cacheKey = this.createGeometryCacheKey(entityType, levelName);
                    
                    if (!this.geometryCache.has(cacheKey)) {
                        const geometry = this.createGeometryForLOD(entityType, levelName, levelConfig);
                        this.geometryCache.set(cacheKey, geometry);
                        this.trackGeometryMemory(geometry, cacheKey);
                    }
                    
                    loadedCount++;
                    
                    // Периодически даем браузеру передышку
                    if (loadedCount % 3 === 0) {
                        await this.delay(0);
                    }

                    // Прогресс загрузки
                    if (loadedCount % 10 === 0) {
                        const progress = ((loadedCount / totalToLoad) * 100).toFixed(1);
                        console.log(`📦 Прогресс предзагрузки: ${progress}%`);
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

    /**
     * Создает задержку для асинхронных операций
     * @param {number} ms - Время задержки в миллисекундах
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Регистрация сущности в LOD системе
     * @param {string} entityId - Уникальный идентификатор сущности
     * @param {string} entityType - Тип сущности ('star', 'planet', и т.д.)
     * @param {number} [radius] - Радиус сущности (опционально)
     * @returns {Object|null} Зарегистрированные данные LOD или null если система отключена
     */
    registerEntity(entityId, entityType, radius) {
        if (!this.options.enabled) return null;

        // Проверяем, не зарегистрирована ли уже сущность
        if (this.entityLODs.has(entityId)) {
            console.warn(`⚠️ Сущность ${entityId} уже зарегистрирована в LOD системе`);
            return this.entityLODs.get(entityId);
        }

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
            lastUpdate: 0,
            position: null
        };

        this.entityLODs.set(entityId, entityLOD);
        this.stats.totalEntities++;

        // Предзагружаем геометрии для этого типа сущности
        this.ensureEntityTypePreloaded(entityType);

        console.log(`✅ Зарегистрирована сущность: ${entityId} (${entityType})`);
        return entityLOD;
    }

    /**
     * Предзагружает все LOD уровни для типа сущности
     * @param {string} entityType - Тип сущности
     * @private
     */
    ensureEntityTypePreloaded(entityType) {
        const settings = this.entitySettings[entityType] || this.entitySettings.default;
        
        Object.keys(settings.lodLevels).forEach(lodLevel => {
            this.ensureGeometryPreloaded(entityType, lodLevel);
        });
    }

    /**
     * Удаление сущности из LOD системы
     * @param {string} entityId - Идентификатор сущности
     */
    unregisterEntity(entityId) {
        const entityLOD = this.entityLODs.get(entityId);
        if (!entityLOD) return;

        this.entityLODs.delete(entityId);
        this.stats.totalEntities--;

        if (this.debugEnabled) {
            this.removeDebugVisualization(entityId);
        }

        console.log(`🗑️ Удалена сущность из LOD системы: ${entityId}`);
    }

    /**
     * Определяет подходящий уровень LOD для сущности на основе расстояния
     * @param {string} entityId - Идентификатор сущности
     * @param {number} distance - Расстояние до камеры
     * @param {number} [zoomLevel=1] - Уровень масштабирования
     * @returns {string} Название уровня LOD
     */
    getLODLevel(entityId, distance, zoomLevel = 1) {
        if (!this.options.enabled) return 'medium';

        const entityLOD = this.entityLODs.get(entityId);
        if (!entityLOD) return 'medium';

        // Учитываем важность сущности и масштаб
        const effectiveDistance = distance / (entityLOD.importance * Math.max(zoomLevel, 0.1));
        
        // Находим подходящий уровень LOD (от высшего к низшему)
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

    /**
     * Применяет LOD к мешу сущности
     * @param {THREE.Mesh} mesh - Трехмерный меш
     * @param {string} lodLevel - Уровень LOD для применения
     * @param {number} distance - Расстояние до камеры
     */
    applyLOD(mesh, lodLevel, distance) {
        if (!this.options.enabled || !mesh) return;

        const entityId = mesh.userData?.entityId;
        if (!entityId) {
            console.warn('⚠️ Меш не имеет entityId в userData');
            return;
        }

        const entityLOD = this.entityLODs.get(entityId);
        if (!entityLOD) {
            console.warn(`⚠️ LOD данные не найдены для сущности: ${entityId}`);
            return;
        }

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
            // Применяем fallback геометрию в случае ошибки
            this.applyFallbackGeometry(mesh);
        }
    }

    /**
     * Применяет резервную геометрию в случае ошибки
     * @param {THREE.Mesh} mesh - Меш для применения резервной геометрии
     * @private
     */
    applyFallbackGeometry(mesh) {
        try {
            const fallbackGeometry = new THREE.SphereGeometry(1, 8, 4);
            if (mesh.geometry !== fallbackGeometry) {
                const oldGeometry = mesh.geometry;
                mesh.geometry = fallbackGeometry;
                if (oldGeometry) {
                    this.scheduleGeometryDisposal(oldGeometry);
                }
            }
        } catch (error) {
            console.error('❌ Критическая ошибка применения fallback геометрии:', error);
        }
    }

    /**
     * Получает или создает геометрию для LOD уровня
     * @param {string} entityType - Тип сущности
     * @param {string} lodLevel - Уровень LOD
     * @param {Object} levelConfig - Конфигурация уровня
     * @returns {THREE.BufferGeometry} Геометрия
     * @private
     */
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

    /**
     * Создает геометрию для конкретного LOD уровня
     * @param {string} entityType - Тип сущности
     * @param {string} lodLevel - Уровень LOD
     * @param {Object} levelConfig - Конфигурация уровня
     * @returns {THREE.BufferGeometry} Созданная геометрия
     * @private
     */
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

    /**
     * Создает искаженную сферу для астероидов
     * @param {number} segments - Количество сегментов
     * @returns {THREE.BufferGeometry} Искаженная сфера
     * @private
     */
    createIrregularSphereGeometry(segments) {
        const geometry = new THREE.SphereGeometry(1, segments, Math.floor(segments / 2));
        const position = geometry.attributes.position;
        
        // Добавляем случайные искажения для естественного вида астероидов
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

    /**
     * Применяет специфические настройки для LOD уровня
     * @param {THREE.Mesh} mesh - Меш для настройки
     * @param {string} lodLevel - Уровень LOD
     * @param {Object} levelConfig - Конфигурация уровня
     * @param {number} distance - Расстояние до камеры
     * @private
     */
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
            mesh.material.side = THREE.DoubleSide;
        }
    }

    /**
     * Создает ключ для кэша геометрий
     * @param {string} entityType - Тип сущности
     * @param {string} lodLevel - Уровень LOD
     * @returns {string} Ключ кэша
     * @private
     */
    createGeometryCacheKey(entityType, lodLevel) {
        return `${entityType}_${lodLevel}_${this.options.quality}`;
    }

    /**
     * Обеспечивает предзагрузку геометрии
     * @param {string} entityType - Тип сущности
     * @param {string} lodLevel - Уровень LOD
     * @private
     */
    /**
     * Обеспечивает предзагрузку геометрии
     * @param {string} entityType - Тип сущности
     * @param {string} lodLevel - Уровень LOD
     * @private
     */
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

    /**
     * Обрабатывает очередь предзагрузки
     * @returns {Promise<void>}
     * @private
     */
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

    /**
     * Отслеживает использование памяти геометрией
     * @param {THREE.BufferGeometry} geometry - Геометрия для трекинга
     * @param {string} cacheKey - Ключ кэша
     * @private
     */
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

    /**
     * Форматирует байты в читаемый вид
     * @param {number} bytes - Количество байт
     * @returns {string} Отформатированная строка
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Планирует освобождение геометрии
     * @param {THREE.BufferGeometry} geometry - Геометрия для освобождения
     * @private
     */
    scheduleGeometryDisposal(geometry) {
        // Отложенное освобождение для избежания скачков производительности
        setTimeout(() => {
            if (geometry && !this.isGeometryInUse(geometry)) {
                geometry.dispose();
            }
        }, 1000);
    }

    /**
     * Проверяет используется ли геометрия
     * @param {THREE.BufferGeometry} geometry - Геометрия для проверки
     * @returns {boolean} Результат проверки
     * @private
     */
    isGeometryInUse(geometry) {
        for (const entityLOD of this.entityLODs.values()) {
            if (entityLOD.mesh && entityLOD.mesh.geometry === geometry) {
                return true;
            }
        }
        return false;
    }

    /**
     * Пакетное обновление LOD для группы сущностей
     * @param {Array} entitiesData - Данные сущностей
     * @param {THREE.Vector3} cameraPosition - Позиция камеры
     * @param {number} [zoomLevel=1] - Уровень масштабирования
     */
    updateLODsForEntities(entitiesData, cameraPosition, zoomLevel = 1) {
        if (!this.options.enabled || !this.options.autoUpdate) return;

        const startTime = performance.now();
        let updatedCount = 0;

        // Сортируем сущности по расстоянию для приоритизации ближайших
        const sortedEntities = entitiesData
            .filter(entity => entity.position)
            .map(entity => ({
                ...entity,
                distance: cameraPosition.distanceTo(entity.position)
            }))
            .sort((a, b) => a.distance - b.distance);

        for (const entityData of sortedEntities) {
            const { entityId, distance } = entityData;
            
            const lodLevel = this.getLODLevel(entityId, distance, zoomLevel);
            
            const entityLOD = this.entityLODs.get(entityId);
            if (entityLOD && entityLOD.mesh) {
                this.applyLOD(entityLOD.mesh, lodLevel, distance);
                updatedCount++;
            }

            // Ограничиваем количество обновлений за кадр для производительности
            if (updatedCount >= 50 && performance.now() - startTime > 8) {
                break;
            }
        }

        const updateTime = performance.now() - startTime;
        this.stats.lastUpdate = Date.now();
        this.stats.frameTime = updateTime;
        
        this.updateUPSStatistics(updateTime, updatedCount);

        if (this.debugEnabled && updateTime > 16) {
            console.warn(`⚠️ LOD update занял ${updateTime.toFixed(2)}ms для ${updatedCount} сущностей`);
        }
    }

    /**
     * Обновляет статистику обновлений в секунду
     * @param {number} updateTime - Время обновления
     * @param {number} updatedCount - Количество обновленных сущностей
     * @private
     */
    updateUPSStatistics(updateTime, updatedCount) {
        const now = Date.now();
        const timeDelta = now - (this.stats.lastUpdate || now);
        
        if (timeDelta > 0) {
            this.stats.updatesPerSecond = Math.round((updatedCount / timeDelta) * 1000);
        }
    }

    // ==================== МЕТОДЫ ДЛЯ ОТЛАДКИ ====================

    /**
     * Включает/выключает режим отладки
     * @param {boolean} enabled - Состояние режима отладки
     */
    setDebugEnabled(enabled) {
        this.debugEnabled = enabled;
        
        if (enabled) {
            this.createDebugMaterials();
        } else {
            this.removeAllDebugVisualizations();
        }
        
        console.log(`🔧 LOD debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * Создает материалы для отладки
     * @private
     */
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

    /**
     * Обновляет визуализацию отладки для сущности
     * @param {Object} entityLOD - Данные LOD сущности
     * @private
     */
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

    /**
     * Удаляет визуализацию отладки для сущности
     * @param {string} entityId - Идентификатор сущности
     * @private
     */
    removeDebugVisualization(entityId) {
        const entityLOD = this.entityLODs.get(entityId);
        if (entityLOD && entityLOD.mesh && entityLOD.mesh.userData.originalMaterial) {
            entityLOD.mesh.material = entityLOD.mesh.userData.originalMaterial;
            entityLOD.mesh.userData.originalMaterial = null;
        }
    }

    /**
     * Удаляет все визуализации отладки
     * @private
     */
    removeAllDebugVisualizations() {
        this.entityLODs.forEach(entityLOD => {
            this.removeDebugVisualization(entityLOD.entityId);
        });
    }

    // ==================== ИНФОРМАЦИОННЫЕ МЕТОДЫ ====================

    /**
     * Получает информацию о LOD для сущности
     * @param {string} entityId - Идентификатор сущности
     * @returns {Object|null} Информация о LOD
     */
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

    /**
     * Получает статистику LOD системы
     * @returns {Object} Статистика системы
     */
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

        const totalCacheAccess = this.stats.geometryCacheHits + this.stats.geometryCacheMisses;
        const cacheHitRate = totalCacheAccess > 0 ?
            (this.stats.geometryCacheHits / totalCacheAccess * 100) : 0;

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
                autoUpdate: this.options.autoUpdate,
                debug: this.debugEnabled
            }
        };
    }

    // ==================== УПРАВЛЕНИЕ СИСТЕМОЙ ====================

    /**
     * Изменяет качество в реальном времени
     * @param {string} quality - Новый уровень качества
     */
    setQuality(quality) {
        if (this.options.quality === quality) return;

        const oldQuality = this.options.quality;
        this.options.quality = quality;
        this.lodLevels = this.initializeLODLevels();
        
        // Инвалидируем кэш геометрий т.к. настройки изменились
        this.geometryCache.clear();
        this.stats.memoryUsage = 0;
        
        // Перезагружаем LOD для всех сущностей
        this.entityLODs.forEach(entityLOD => {
            entityLOD.currentLevel = null;
        });

        console.log(`🎚️ Качество LOD изменено: ${oldQuality} → ${quality}`);
    }

    /**
     * Включает/выключает систему
     * @param {boolean} enabled - Состояние системы
     */
    setEnabled(enabled) {
        this.options.enabled = enabled;
        this.setupAutoUpdate();
        console.log(`🔧 LOD система: ${enabled ? 'ВКЛЮЧЕНА' : 'ВЫКЛЮЧЕНА'}`);
    }

    /**
     * Очистка и оптимизация памяти
     */
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

        if (disposedCount > 0 && this.debugEnabled) {
            console.log(`🧹 Очищено ${disposedCount} неиспользуемых геометрий`);
        }

        // Обновляем статистику памяти
        this.stats.memoryUsage = this.calculateCurrentMemoryUsage();
    }

    /**
     * Расчет текущего использования памяти
     * @returns {number} Использование памяти в байтах
     * @private
     */
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

    /**
     * Полная очистка системы
     */
    clear() {
        // Останавливаем автообновление
        if (this.autoUpdateInterval) {
            clearInterval(this.autoUpdateInterval);
            this.autoUpdateInterval = null;
        }

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
        this.stats.frameTime = 0;

        this.isPreloading = false;

        console.log('🧹 LODManager полностью очищен');
    }

    /**
     * Деструктор - освобождение ресурсов
     */
    dispose() {
        this.clear();
        console.log('✅ LODManager уничтожен');
    }
}

export default LODManager;


