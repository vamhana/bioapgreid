// modules/app/core/lod-manager.js
import * as THREE from './three.module.js';

// Конфигурация LOD системы
const LODConfig = {
    // Базовые расстояния для переключения LOD (в единицах радиуса объекта)
    BASE_DISTANCES: [2, 5, 10, 20], // × радиус объекта
    
    // Качество в зависимости от платформы
    QUALITY_PROFILES: {
        'high-end': { // Десктопы с мощной GPU
            geometryLevels: { high: 32, medium: 16, low: 8, minimal: 4 },
            textureSizes: { high: 1024, medium: 512, low: 256, minimal: 128 },
            enableShadows: true,
            enablePostProcessing: true
        },
        'mid-range': { // Ноутбуки, современные мобильные
            geometryLevels: { high: 16, medium: 8, low: 6, minimal: 3 },
            textureSizes: { high: 512, medium: 256, low: 128, minimal: 64 },
            enableShadows: false,
            enablePostProcessing: false
        },
        'low-end': { // Старые устройства, мобильные
            geometryLevels: { high: 12, medium: 6, low: 4, minimal: 2 },
            textureSizes: { high: 256, medium: 128, low: 64, minimal: 32 },
            enableShadows: false,
            enablePostProcessing: false
        },
        'vr': { // VR режим - нужен высокий FPS
            geometryLevels: { high: 24, medium: 12, low: 6, minimal: 3 },
            textureSizes: { high: 512, medium: 256, low: 128, minimal: 64 },
            enableShadows: false, // Тени дорогие в VR
            enablePostProcessing: false
        }
    },
    
    // Пресеты для разных типов объектов
    TYPE_PRESETS: {
        star: {
            baseRadius: 40,
            geometryType: 'sphere',
            materialType: 'emissive',
            lodPriorities: ['emissive', 'color', 'size'],
            importance: 1.0 // Множитель важности (влияет на качество)
        },
        planet: {
            baseRadius: 25,
            geometryType: 'sphere',
            materialType: 'phong',
            lodPriorities: ['texture', 'specular', 'normal', 'color'],
            importance: 0.8
        },
        moon: {
            baseRadius: 8,
            geometryType: 'sphere',
            materialType: 'lambert',
            lodPriorities: ['color', 'bump'],
            importance: 0.6
        },
        asteroid: {
            baseRadius: 4,
            geometryType: 'dodecahedron',
            materialType: 'basic',
            lodPriorities: ['color'],
            importance: 0.4
        },
        nebula: {
            baseRadius: 1200,
            geometryType: 'sphere',
            materialType: 'transparent',
            lodPriorities: ['transparency', 'color'],
            importance: 0.3
        },
        orbit: {
            baseRadius: 1,
            geometryType: 'ring',
            materialType: 'line',
            lodPriorities: ['visibility'],
            importance: 0.2
        }
    },
    
    // Настройки кэша
    CACHE: {
        maxGeometryCache: 50, // Макс количество геометрий в кэше
        maxMaterialCache: 30, // Макс количество материалов в кэше
        cacheStrategy: 'lru', // lru, lfu, fifo
        enablePreload: true,
        preloadDistance: 15 // Предзагружать LOD для объектов в 15×радиусах
    },
    
    // Настройки адаптации
    ADAPTATION: {
        targetFPS: 60,
        minFPS: 45,
        maxFPS: 90,
        adaptationSpeed: 0.1, // Скорость адаптации (0-1)
        checkInterval: 1000 // Проверять FPS каждую секунду
    }
};

export class LODManager {
    constructor(config = {}) {
        this.config = { ...LODConfig, ...config };
        
        // Определяем профиль качества на основе устройства
        this.qualityProfile = this.detectQualityProfile();
        
        // Кэши
        this.geometryCache = new GeometryCache(this.config.CACHE.maxGeometryCache);
        this.materialCache = new MaterialCache(this.config.CACHE.maxMaterialCache);
        
        // Регистр объектов LOD
        this.lodObjects = new Map(); // entityId -> LODObject
        this.lodGroups = new Map(); // entityId -> THREE.LOD
        
        // Фабрики геометрий и материалов
        this.geometryFactories = this.registerGeometryFactories();
        this.materialFactories = this.registerMaterialFactories();
        
        // Статистика и мониторинг
        this.stats = {
            totalObjects: 0,
            visibleObjects: 0,
            lodSwitches: 0,
            cacheHits: 0,
            cacheMisses: 0,
            currentLODs: new Map(), // entityId -> current LOD level
            performance: {
                frameTimes: [],
                currentFPS: 60,
                adaptationLevel: 0,
                lastAdaptation: 0
            }
        };
        
        // Состояние
        this.state = {
            isInitialized: false,
            isAdapting: true,
            currentDistances: [...this.config.BASE_DISTANCES],
            debugMode: false
        };
        
        // Инициализация
        this.init();
        
        console.log('🎯 LODManager создан с профилем:', this.qualityProfile, {
            quality: this.config.QUALITY_PROFILES[this.qualityProfile]
        });
    }
    
    init() {
        // Предзагрузка только базовых геометрий
        this.preloadEssentialGeometries();
        
        // Настройка адаптации
        this.setupAdaptation();
        
        this.state.isInitialized = true;
        
        console.log('✅ LODManager инициализирован');
    }
    
    // ===== ОСНОВНЫЕ МЕТОДЫ =====
    
    /**
     * Регистрация объекта для управления LOD
     */
    registerEntity(entityId, entityType, baseSize, customConfig = null) {
        const preset = customConfig || this.config.TYPE_PRESETS[entityType] || this.config.TYPE_PRESETS.planet;
        const config = {
            ...preset,
            baseSize,
            entityId,
            entityType,
            lodLevels: this.generateLODLevels(entityType, baseSize),
            currentLOD: -1,
            lastSeen: Date.now(),
            importance: preset.importance || 0.5
        };
        
        this.lodObjects.set(entityId, config);
        this.stats.totalObjects++;
        
        // Создаём LOD группу Three.js
        if (!this.lodGroups.has(entityId)) {
            const lodGroup = new THREE.LOD();
            lodGroup.name = `lod_${entityId}`;
            this.lodGroups.set(entityId, lodGroup);
        }
        
        // Предзагрузка ближайших LOD уровней если включено
        if (this.config.CACHE.enablePreload) {
            this.preloadLODLevels(entityId, 0); // Предзагрузить ближайший LOD
        }
        
        return config;
    }
    
    /**
     * Получение уровня LOD для объекта
     */
    getLODLevel(entityId, distance, cameraZoom = 1, screenSize = null) {
        const entityConfig = this.lodObjects.get(entityId);
        if (!entityConfig) return 0;
        
        // Корректируем расстояние на основе zoom
        const adjustedDistance = distance / cameraZoom;
        
        // Если передан размер на экране, используем его
        let lodLevel = 0;
        if (screenSize !== null) {
            // На основе размера на экране (в пикселях)
            lodLevel = this.getLODByScreenSize(screenSize, entityConfig.importance);
        } else {
            // На основе расстояния (относительно размера объекта)
            const relativeDistance = adjustedDistance / entityConfig.baseSize;
            lodLevel = this.getLODByDistance(relativeDistance, entityConfig.importance);
        }
        
        // Ограничиваем максимальный уровень LOD для этого типа
        const maxLevel = entityConfig.lodLevels.length - 1;
        lodLevel = Math.min(lodLevel, maxLevel);
        
        // Адаптация под производительность
        lodLevel = this.adaptLODForPerformance(lodLevel, entityConfig.importance);
        
        return lodLevel;
    }
    
    /**
     * Применение LOD к мешу
     */
    async applyLOD(mesh, entityId, lodLevel, distance) {
        const entityConfig = this.lodObjects.get(entityId);
        if (!entityConfig || entityConfig.currentLOD === lodLevel) {
            return false; // LOD не изменился
        }
        
        const previousLOD = entityConfig.currentLOD;
        entityConfig.currentLOD = lodLevel;
        entityConfig.lastSeen = Date.now();
        
        this.stats.currentLODs.set(entityId, lodLevel);
        
        try {
            // Получаем или создаём геометрию для нужного уровня
            const geometry = await this.getOrCreateGeometry(entityId, lodLevel);
            
            // Получаем или создаём материал для нужного уровня
            const material = await this.getOrCreateMaterial(entityId, lodLevel, distance);
            
            // Применяем к мешу
            if (mesh.geometry !== geometry) {
                if (mesh.geometry && mesh.geometry !== geometry) {
                    // Помечаем старую геометрию для возможного удаления
                    this.geometryCache.markForDisposal(mesh.geometry);
                }
                mesh.geometry = geometry;
            }
            
            if (mesh.material !== material) {
                if (mesh.material && mesh.material !== material) {
                    // Помечаем старый материал для возможного удаления
                    this.materialCache.markForDisposal(mesh.material);
                }
                mesh.material = material;
            }
            
            // Масштабируем mesh в соответствии с базовым размером
            mesh.scale.setScalar(entityConfig.baseSize);
            
            // Обновляем статистику
            if (previousLOD !== -1) {
                this.stats.lodSwitches++;
                
                // Логируем большие скачки
                if (Math.abs(previousLOD - lodLevel) > 1) {
                    console.log(`🔄 LOD скачок для ${entityId}: ${previousLOD} → ${lodLevel} (расстояние: ${distance.toFixed(1)})`);
                }
            }
            
            // Отладка: визуализация LOD
            if (this.state.debugMode) {
                this.debugVisualizeLOD(mesh, lodLevel);
            }
            
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка применения LOD для ${entityId}:`, error);
            
            // Fallback: используем базовый уровень
            if (lodLevel > 0) {
                return this.applyLOD(mesh, entityId, 0, distance);
            }
            
            return false;
        }
    }
    
    /**
     * Обновление LOD для всех видимых объектов
     */
    async updateLODForAll(meshes, cameraPosition, cameraZoom = 1, screenSizeCalculator = null) {
        if (!this.state.isInitialized) return { updated: 0, errors: 0 };
        
        this.stats.visibleObjects = meshes.length;
        let updates = 0;
        let errors = 0;
        
        // Используем Promise.all для параллельной обработки
        const updatePromises = meshes.map(async (mesh) => {
            if (mesh.userData && mesh.userData.entityId) {
                const entityId = mesh.userData.entityId;
                const distance = mesh.position.distanceTo(cameraPosition);
                
                // Вычисляем размер на экране если есть калькулятор
                let screenSize = null;
                if (screenSizeCalculator) {
                    screenSize = screenSizeCalculator(mesh, cameraPosition, cameraZoom);
                }
                
                // Определяем уровень LOD
                const lodLevel = this.getLODLevel(entityId, distance, cameraZoom, screenSize);
                
                // Применяем LOD
                try {
                    const updated = await this.applyLOD(mesh, entityId, lodLevel, distance);
                    if (updated) updates++;
                } catch (error) {
                    console.warn(`⚠️ Ошибка обновления LOD для ${entityId}:`, error);
                    errors++;
                }
            }
        });
        
        await Promise.allSettled(updatePromises);
        
        // Предзагрузка LOD для объектов, которые могут понадобиться
        this.preloadNearbyLODs(cameraPosition, cameraZoom);
        
        return { updated: updates, errors };
    }
    
    // ===== ГЕНЕРАЦИЯ И КЭШИРОВАНИЕ =====
    
    /**
     * Генерация уровней LOD для типа объекта
     */
    generateLODLevels(entityType, baseSize) {
        const preset = this.config.TYPE_PRESETS[entityType] || this.config.TYPE_PRESETS.planet;
        const quality = this.config.QUALITY_PROFILES[this.qualityProfile];
        
        const levels = [];
        
        // Для каждого уровня качества создаём конфиг
        Object.keys(quality.geometryLevels).forEach((levelName, index) => {
            const geometryDetail = quality.geometryLevels[levelName];
            const textureSize = quality.textureSizes[levelName];
            
            levels.push({
                level: index,
                name: levelName,
                geometryDetail,
                textureSize,
                distance: this.state.currentDistances[index] * baseSize,
                priority: preset.lodPriorities || ['color']
            });
        });
        
        return levels;
    }
    
    /**
     * Получение или создание геометрии
     */
    async getOrCreateGeometry(entityId, lodLevel) {
        const entityConfig = this.lodObjects.get(entityId);
        if (!entityConfig) {
            throw new Error(`Entity ${entityId} not registered`);
        }
        
        const cacheKey = `${entityConfig.entityType}_${lodLevel}_${entityConfig.baseSize}`;
        
        // Пробуем получить из кэша
        let geometry = this.geometryCache.get(cacheKey);
        
        if (!geometry) {
            // Создаём новую геометрию
            const levelConfig = entityConfig.lodLevels[lodLevel];
            geometry = this.createGeometry(entityConfig, levelConfig);
            
            // Кэшируем
            this.geometryCache.set(cacheKey, geometry);
            this.stats.cacheMisses++;
            
            console.log(`📐 Создана геометрия: ${entityConfig.entityType} LOD${lodLevel}`);
        } else {
            this.stats.cacheHits++;
        }
        
        return geometry;
    }
    
    /**
     * Получение или создание материала
     */
    async getOrCreateMaterial(entityId, lodLevel, distance = 0) {
        const entityConfig = this.lodObjects.get(entityId);
        if (!entityConfig) {
            throw new Error(`Entity ${entityId} not registered`);
        }
        
        const cacheKey = `${entityConfig.entityType}_${lodLevel}_${entityConfig.baseSize}`;
        
        // Пробуем получить из кэша
        let material = this.materialCache.get(cacheKey);
        
        if (!material) {
            // Создаём новый материал
            const levelConfig = entityConfig.lodLevels[lodLevel];
            material = this.createMaterial(entityConfig, levelConfig, distance);
            
            // Кэшируем
            this.materialCache.set(cacheKey, material);
            
            console.log(`🎨 Создан материал: ${entityConfig.entityType} LOD${lodLevel}`);
        }
        
        return material;
    }
    
    /**
     * Создание геометрии на основе типа
     */
    createGeometry(entityConfig, levelConfig) {
        const factory = this.geometryFactories[entityConfig.geometryType];
        if (!factory) {
            console.warn(`⚠️ Фабрика геометрии для типа ${entityConfig.geometryType} не найдена, используем сферу`);
            return this.geometryFactories.sphere(entityConfig.baseSize, levelConfig.geometryDetail);
        }
        
        return factory(entityConfig.baseSize, levelConfig.geometryDetail);
    }
    
    /**
     * Создание материала на основе типа
     */
    createMaterial(entityConfig, levelConfig, distance) {
        const factory = this.materialFactories[entityConfig.materialType];
        if (!factory) {
            console.warn(`⚠️ Фабрика материала для типа ${entityConfig.materialType} не найдена, используем basic`);
            return this.materialFactories.basic(entityConfig, levelConfig, distance);
        }
        
        return factory(entityConfig, levelConfig, distance);
    }
    
    // ===== ФАБРИКИ ГЕОМЕТРИЙ =====
    
    registerGeometryFactories() {
        return {
            // Сфера
            sphere: (radius, detail) => {
                return new THREE.SphereGeometry(radius, detail, detail);
            },
            
            // Додекаэдр (для астероидов)
            dodecahedron: (radius, detail) => {
                return new THREE.DodecahedronGeometry(radius, detail);
            },
            
            // Кольцо (для орбит)
            ring: (radius, detail) => {
                return new THREE.RingGeometry(radius * 0.9, radius * 1.1, detail * 4, 1);
            },
            
            // Бокс (для зданий/структур)
            box: (size, detail) => {
                return new THREE.BoxGeometry(size, size, size, detail, detail, detail);
            },
            
            // Цилиндр (для космических станций)
            cylinder: (radius, detail) => {
                return new THREE.CylinderGeometry(radius, radius, radius * 2, detail * 4, 1);
            }
        };
    }
    
    /**
     * Регистрация кастомной фабрики геометрий
     */
    registerGeometryFactory(type, factory) {
        this.geometryFactories[type] = factory;
        console.log(`✅ Зарегистрирована фабрика геометрии: ${type}`);
    }
    
    // ===== ФАБРИКИ МАТЕРИАЛОВ =====
    
    registerMaterialFactories() {
        return {
            // Эмиссивный материал (для звёзд)
            emissive: (entityConfig, levelConfig, distance) => {
                const color = new THREE.Color(entityConfig.config?.color || '#FFD700');
                
                switch (levelConfig.name) {
                    case 'high':
                        return new THREE.MeshStandardMaterial({
                            color: color,
                            emissive: color,
                            emissiveIntensity: 0.8,
                            roughness: 0.1,
                            metalness: 0.9
                        });
                        
                    case 'medium':
                        return new THREE.MeshPhongMaterial({
                            color: color,
                            emissive: color,
                            emissiveIntensity: 0.6,
                            shininess: 50
                        });
                        
                    case 'low':
                        return new THREE.MeshLambertMaterial({
                            color: color,
                            emissive: color,
                            emissiveIntensity: 0.4
                        });
                        
                    case 'minimal':
                    default:
                        return new THREE.MeshBasicMaterial({
                            color: color,
                            emissive: color,
                            emissiveIntensity: 0.2
                        });
                }
            },
            
            // Phong материал (для планет)
            phong: (entityConfig, levelConfig, distance) => {
                const color = new THREE.Color(entityConfig.config?.color || '#4ECDC4');
                
                switch (levelConfig.name) {
                    case 'high':
                        return new THREE.MeshStandardMaterial({
                            color: color,
                            roughness: 0.8,
                            metalness: 0.2,
                            envMapIntensity: 0.5
                        });
                        
                    case 'medium':
                        return new THREE.MeshPhongMaterial({
                            color: color,
                            shininess: 30,
                            specular: 0x222222
                        });
                        
                    case 'low':
                        return new THREE.MeshLambertMaterial({
                            color: color
                        });
                        
                    case 'minimal':
                    default:
                        return new THREE.MeshBasicMaterial({
                            color: color
                        });
                }
            },
            
            // Lambert материал (для лун)
            lambert: (entityConfig, levelConfig, distance) => {
                const color = new THREE.Color(entityConfig.config?.color || '#CCCCCC');
                
                switch (levelConfig.name) {
                    case 'high':
                    case 'medium':
                        return new THREE.MeshLambertMaterial({
                            color: color
                        });
                        
                    case 'low':
                    case 'minimal':
                    default:
                        return new THREE.MeshBasicMaterial({
                            color: color
                        });
                }
            },
            
            // Базовый материал (для астероидов)
            basic: (entityConfig, levelConfig, distance) => {
                const color = new THREE.Color(entityConfig.config?.color || '#888888');
                return new THREE.MeshBasicMaterial({ color });
            },
            
            // Прозрачный материал (для туманностей)
            transparent: (entityConfig, levelConfig, distance) => {
                const color = new THREE.Color(entityConfig.config?.color || '#4ECDC4');
                
                return new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.3 - (distance * 0.0001), // Уменьшаем прозрачность с расстоянием
                    side: THREE.DoubleSide
                });
            },
            
            // Линейный материал (для орбит)
            line: (entityConfig, levelConfig, distance) => {
                const color = new THREE.Color(entityConfig.config?.color || '#444444');
                
                return new THREE.LineBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.5,
                    linewidth: 1
                });
            }
        };
    }
    
    /**
     * Регистрация кастомной фабрики материалов
     */
    registerMaterialFactory(type, factory) {
        this.materialFactories[type] = factory;
        console.log(`✅ Зарегистрирована фабрика материала: ${type}`);
    }
    
    // ===== АДАПТАЦИЯ ПРОИЗВОДИТЕЛЬНОСТИ =====
    
    setupAdaptation() {
        if (!this.state.isAdapting) return;
        
        // Мониторинг FPS
        let lastTime = performance.now();
        let frameCount = 0;
        
        const checkPerformance = () => {
            const currentTime = performance.now();
            frameCount++;
            
            if (currentTime >= lastTime + this.config.ADAPTATION.checkInterval) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                this.stats.performance.currentFPS = fps;
                
                // Адаптируем LOD если нужно
                this.adaptToPerformance(fps);
                
                // Сбрасываем счётчики
                lastTime = currentTime;
                frameCount = 0;
            }
            
            if (this.state.isAdapting) {
                requestAnimationFrame(checkPerformance);
            }
        };
        
        checkPerformance();
    }
    
    adaptToPerformance(currentFPS) {
        const { targetFPS, minFPS, maxFPS, adaptationSpeed } = this.config.ADAPTATION;
        
        // Вычисляем отклонение от целевого FPS
        let deviation = 0;
        if (currentFPS < minFPS) {
            deviation = (minFPS - currentFPS) / minFPS; // 0-1
        } else if (currentFPS > maxFPS) {
            deviation = (currentFPS - maxFPS) / maxFPS * -1; // -0-0
        }
        
        // Адаптируем расстояния LOD
        if (Math.abs(deviation) > 0.05) { // Если отклонение > 5%
            const adaptation = 1 + (deviation * adaptationSpeed);
            
            // Корректируем расстояния
            this.state.currentDistances = this.state.currentDistances.map(d => 
                Math.max(1, Math.min(100, d * adaptation))
            );
            
            this.stats.performance.adaptationLevel = deviation;
            this.stats.performance.lastAdaptation = Date.now();
            
            console.log(`⚡ Адаптация LOD: FPS=${currentFPS}, deviation=${deviation.toFixed(2)}`);
        }
    }
    
    adaptLODForPerformance(lodLevel, importance) {
        const { currentFPS, adaptationLevel } = this.stats.performance;
        
        // Если FPS низкий, увеличиваем уровень LOD (уменьшаем детализацию)
        if (currentFPS < this.config.ADAPTATION.minFPS && adaptationLevel > 0) {
            const adjustment = Math.ceil(adaptationLevel * (1 - importance));
            return Math.min(lodLevel + adjustment, 3); // Макс 3 уровень
        }
        
        // Если FPS высокий, уменьшаем уровень LOD (увеличиваем детализацию)
        if (currentFPS > this.config.ADAPTATION.maxFPS && adaptationLevel < 0) {
            const adjustment = Math.ceil(Math.abs(adaptationLevel) * importance);
            return Math.max(lodLevel - adjustment, 0); // Мин 0 уровень
        }
        
        return lodLevel;
    }
    
    // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
    
    detectQualityProfile() {
        const ua = navigator.userAgent;
        const gpuInfo = this.getGPUInfo();
        const memory = navigator.deviceMemory || 4;
        
        // Проверяем WebGL возможности
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || 
                   canvas.getContext('experimental-webgl');
        
        let score = 0;
        
        // Оцениваем GPU
        if (gl) {
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            const maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
            
            if (maxTextureSize >= 8192) score += 3;
            else if (maxTextureSize >= 4096) score += 2;
            else if (maxTextureSize >= 2048) score += 1;
            
            if (gpuInfo && gpuInfo.includes('NVIDIA')) score += 2;
            if (gpuInfo && gpuInfo.includes('AMD')) score += 1;
        }
        
        // Оцениваем память
        if (memory >= 8) score += 2;
        else if (memory >= 4) score += 1;
        
        // Оцениваем платформу
        if (!/Mobi|Android|iPhone|iPad|iPod/.test(ua)) {
            score += 2; // Десктоп
        }
        
        // Определяем профиль
        if (score >= 6) return 'high-end';
        if (score >= 3) return 'mid-range';
        return 'low-end';
    }
    
    getGPUInfo() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || 
                   canvas.getContext('experimental-webgl');
        
        if (!gl) return null;
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
        
        return null;
    }
    
    getLODByDistance(relativeDistance, importance) {
        // Корректируем расстояния на основе важности объекта
        const adjustedDistances = this.state.currentDistances.map(d => 
            d * (1 + (1 - importance) * 0.5) // Менее важные объекты раньше переключаются на низкий LOD
        );
        
        // Определяем уровень LOD
        for (let i = 0; i < adjustedDistances.length; i++) {
            if (relativeDistance <= adjustedDistances[i]) {
                return i;
            }
        }
        
        return adjustedDistances.length - 1;
    }
    
    getLODByScreenSize(screenSizeInPixels, importance) {
        // Определяем уровень LOD на основе размера на экране
        const thresholds = [100, 50, 25, 10]; // Пороги в пикселях
        
        // Корректируем пороги на основе важности
        const adjustedThresholds = thresholds.map(t => 
            t * (1 + (1 - importance) * 0.5)
        );
        
        for (let i = 0; i < adjustedThresholds.length; i++) {
            if (screenSizeInPixels >= adjustedThresholds[i]) {
                return i;
            }
        }
        
        return adjustedThresholds.length - 1;
    }
    
    // ===== ПРЕДЗАГРУЗКА =====
    
    preloadEssentialGeometries() {
        // Предзагружаем только самые базовые геометрии
        const essentialTypes = ['star', 'planet', 'moon'];
        
        essentialTypes.forEach(type => {
            const preset = this.config.TYPE_PRESETS[type];
            if (preset) {
                // Предзагружаем только минимальный уровень LOD
                const cacheKey = `${type}_0_${preset.baseRadius}`;
                
                if (!this.geometryCache.has(cacheKey)) {
                    const geometry = this.createGeometry(
                        { ...preset, baseSize: preset.baseRadius },
                        { geometryDetail: 4, name: 'minimal' }
                    );
                    this.geometryCache.set(cacheKey, geometry);
                }
            }
        });
        
        console.log('📦 Предзагружены базовые геометрии:', essentialTypes);
    }
    
    preloadLODLevels(entityId, targetLevel) {
        const entityConfig = this.lodObjects.get(entityId);
        if (!entityConfig) return;
        
        // Предзагружаем целевой уровень и соседние
        const levelsToPreload = [
            targetLevel,
            Math.max(0, targetLevel - 1),
            Math.min(entityConfig.lodLevels.length - 1, targetLevel + 1)
        ];
        
        levelsToPreload.forEach(level => {
            if (level >= 0 && level < entityConfig.lodLevels.length) {
                const cacheKey = `${entityConfig.entityType}_${level}_${entityConfig.baseSize}`;
                
                if (!this.geometryCache.has(cacheKey)) {
                    // Создаём геометрию в фоне
                    setTimeout(() => {
                        const geometry = this.createGeometry(entityConfig, entityConfig.lodLevels[level]);
                        this.geometryCache.set(cacheKey, geometry);
                    }, 0);
                }
            }
        });
    }
    
    preloadNearbyLODs(cameraPosition, cameraZoom) {
        if (!this.config.CACHE.enablePreload) return;
        
        // Предзагружаем LOD для объектов в определённом радиусе
        const preloadRadius = this.config.CACHE.preloadDistance;
        
        for (const [entityId, entityConfig] of this.lodObjects) {
            // Здесь нужен доступ к позициям объектов
            // В реальном приложении нужно получить позицию из spatial partitioner
            // Для примера используем заглушку
            
            // В реальности:
            // const position = this.getEntityPosition(entityId);
            // const distance = position.distanceTo(cameraPosition);
            
            // if (distance <= preloadRadius * entityConfig.baseSize) {
            //     const lodLevel = this.getLODLevel(entityId, distance, cameraZoom);
            //     this.preloadLODLevels(entityId, lodLevel);
            // }
        }
    }
    
    // ===== ОТЛАДКА И ВИЗУАЛИЗАЦИЯ =====
    
    debugVisualizeLOD(mesh, lodLevel) {
        const colors = [0x00ff00, 0xffff00, 0xff8800, 0xff0000]; // Зелёный -> Красный
        
        if (mesh.material) {
            // Клонируем материал для отладки
            const debugMaterial = mesh.material.clone();
            debugMaterial.wireframe = true;
            debugMaterial.wireframeLinewidth = 2;
            debugMaterial.color.set(colors[lodLevel] || 0xffffff);
            debugMaterial.transparent = true;
            debugMaterial.opacity = 0.5;
            
            // Временно заменяем материал
            mesh.userData.originalMaterial = mesh.material;
            mesh.material = debugMaterial;
            
            // Через 2 секунды возвращаем оригинальный материал
            setTimeout(() => {
                if (mesh.userData.originalMaterial) {
                    mesh.material = mesh.userData.originalMaterial;
                    mesh.userData.originalMaterial = null;
                }
            }, 2000);
        }
    }
    
    // ===== СТАТИСТИКА И МОНИТОРИНГ =====
    
    getLODStats() {
        const lodDistribution = { 0: 0, 1: 0, 2: 0, 3: 0 };
        
        for (const level of this.stats.currentLODs.values()) {
            lodDistribution[level] = (lodDistribution[level] || 0) + 1;
        }
        
        const cacheEfficiency = this.stats.cacheHits + this.stats.cacheMisses > 0 ?
            (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(1) + '%' :
            '0%';
        
        return {
            totalObjects: this.stats.totalObjects,
            visibleObjects: this.stats.visibleObjects,
            lodSwitches: this.stats.lodSwitches,
            cache: {
                geometry: this.geometryCache.getStats(),
                material: this.materialCache.getStats(),
                efficiency: cacheEfficiency
            },
            lodDistribution,
            distances: [...this.state.currentDistances],
            performance: {
                ...this.stats.performance,
                qualityProfile: this.qualityProfile
            },
            state: {
                isAdapting: this.state.isAdapting,
                debugMode: this.state.debugMode
            }
        };
    }
    
    // ===== УПРАВЛЕНИЕ =====
    
    setQualityProfile(profile) {
        if (this.config.QUALITY_PROFILES[profile]) {
            this.qualityProfile = profile;
            console.log(`🎚️ Установлен профиль качества: ${profile}`);
            
            // Пересоздаём LOD уровни для всех объектов
            for (const [entityId, entityConfig] of this.lodObjects) {
                entityConfig.lodLevels = this.generateLODLevels(entityConfig.entityType, entityConfig.baseSize);
                entityConfig.currentLOD = -1; // Сбросить текущий LOD
            }
            
            // Очистить кэши
            this.geometryCache.clear();
            this.materialCache.clear();
            
            // Предзагрузить заново
            this.preloadEssentialGeometries();
            
            return true;
        }
        
        console.warn(`⚠️ Профиль качества не найден: ${profile}`);
        return false;
    }
    
    toggleAdaptation(enabled) {
        this.state.isAdapting = enabled;
        console.log(`⚡ Адаптация производительности: ${enabled ? 'включена' : 'выключена'}`);
    }
    
    toggleDebugMode(enabled) {
        this.state.debugMode = enabled;
        console.log(`🐛 Режим отладки LOD: ${enabled ? 'включен' : 'выключен'}`);
    }
    
    setLODDistances(distances) {
        if (distances.length === this.state.currentDistances.length) {
            this.state.currentDistances = distances;
            console.log('📏 LOD расстояния обновлены:', distances);
            return true;
        }
        console.error('❌ Неправильное количество LOD расстояний');
        return false;
    }
    
    // ===== ОЧИСТКА РЕСУРСОВ =====
    
    dispose() {
        // Останавливаем адаптацию
        this.state.isAdapting = false;
        
        // Очищаем кэши
        this.geometryCache.dispose();
        this.materialCache.dispose();
        
        // Очищаем LOD группы Three.js
        for (const lodGroup of this.lodGroups.values()) {
            if (lodGroup.dispose) lodGroup.dispose();
        }
        
        // Очищаем структуры данных
        this.lodObjects.clear();
        this.lodGroups.clear();
        this.stats.currentLODs.clear();
        
        this.state.isInitialized = false;
        
        console.log('🧹 LODManager уничтожен');
    }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ КЛАССЫ =====

/**
 * Кэш геометрий с LRU стратегией
 */
class GeometryCache {
    constructor(maxSize = 50) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.accessOrder = [];
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }
    
    has(key) {
        return this.cache.has(key);
    }
    
    get(key) {
        if (this.cache.has(key)) {
            // Обновляем порядок доступа
            this.updateAccessOrder(key);
            this.stats.hits++;
            return this.cache.get(key);
        }
        this.stats.misses++;
        return null;
    }
    
    set(key, geometry) {
        // Если кэш переполнен, удаляем самый старый
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        
        this.cache.set(key, geometry);
        this.accessOrder.push(key);
    }
    
    updateAccessOrder(key) {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        this.accessOrder.push(key);
    }
    
    evictOldest() {
        if (this.accessOrder.length > 0) {
            const oldestKey = this.accessOrder.shift();
            const geometry = this.cache.get(oldestKey);
            
            if (geometry && geometry.dispose) {
                geometry.dispose();
            }
            
            this.cache.delete(oldestKey);
            this.stats.evictions++;
            
            console.log(`🗑️ Вытеснена геометрия из кэша: ${oldestKey}`);
        }
    }
    
    markForDisposal(geometry) {
        // Помечаем геометрию для возможного удаления
        // В реальной системе можно добавить в очередь на удаление
    }
    
    clear() {
        for (const geometry of this.cache.values()) {
            if (geometry && geometry.dispose) {
                geometry.dispose();
            }
        }
        
        this.cache.clear();
        this.accessOrder = [];
        this.stats.hits = 0;
        this.stats.misses = 0;
        this.stats.evictions = 0;
    }
    
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.stats.hits,
            misses: this.stats.misses,
            evictions: this.stats.evictions,
            hitRate: this.stats.hits + this.stats.misses > 0 ?
                (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1) + '%' :
                '0%'
        };
    }
    
    dispose() {
        this.clear();
    }
}

/**
 * Кэш материалов с LFU стратегией
 */
class MaterialCache {
    constructor(maxSize = 30) {
        this.cache = new Map(); // key -> { material, frequency }
        this.maxSize = maxSize;
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }
    
    has(key) {
        return this.cache.has(key);
    }
    
    get(key) {
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);
            entry.frequency++;
            this.stats.hits++;
            return entry.material;
        }
        this.stats.misses++;
        return null;
    }
    
    set(key, material) {
        // Если кэш переполнен, удаляем наименее используемый
        if (this.cache.size >= this.maxSize) {
            this.evictLeastFrequent();
        }
        
        this.cache.set(key, {
            material,
            frequency: 1,
            lastUsed: Date.now()
        });
    }
    
    evictLeastFrequent() {
        let minFrequency = Infinity;
        let leastFrequentKey = null;
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.frequency < minFrequency) {
                minFrequency = entry.frequency;
                leastFrequentKey = key;
            }
        }
        
        if (leastFrequentKey) {
            const entry = this.cache.get(leastFrequentKey);
            if (entry.material && entry.material.dispose) {
                entry.material.dispose();
            }
            
            this.cache.delete(leastFrequentKey);
            this.stats.evictions++;
            
            console.log(`🗑️ Вытеснен материал из кэша: ${leastFrequentKey} (частота: ${minFrequency})`);
        }
    }
    
    markForDisposal(material) {
        // Помечаем материал для возможного удаления
    }
    
    clear() {
        for (const entry of this.cache.values()) {
            if (entry.material && entry.material.dispose) {
                entry.material.dispose();
            }
        }
        
        this.cache.clear();
        this.stats.hits = 0;
        this.stats.misses = 0;
        this.stats.evictions = 0;
    }
    
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.stats.hits,
            misses: this.stats.misses,
            evictions: this.stats.evictions,
            hitRate: this.stats.hits + this.stats.misses > 0 ?
                (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1) + '%' :
                '0%'
        };
    }
    
    dispose() {
        this.clear();
    }
}

export default LODManager;
