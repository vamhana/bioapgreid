// modules/app/core/lod-manager.js
import * as THREE from 'three';

export class LODManager {
    constructor() {
        this.lodConfigs = new Map();
        this.lodDistances = [50, 200, 500, 1000]; // Расстояния переключения LOD
        this.geometryCache = new Map();
        this.materialCache = new Map();
        this.lodGroups = new Map();
        this.stats = {
            lodSwitches: 0,
            geometryCacheHits: 0,
            geometryCacheMisses: 0,
            currentLODs: new Map() // entityId -> current LOD level
        };

        // Предустановленные конфигурации LOD для разных типов объектов
        this.presetConfigs = {
            planet: {
                geometryLevels: [32, 16, 8, 4], // Сегменты сферы
                materialLevels: ['high', 'medium', 'low', 'minimal']
            },
            moon: {
                geometryLevels: [16, 8, 4, 3],
                materialLevels: ['medium', 'low', 'minimal', 'minimal']
            },
            star: {
                geometryLevels: [32, 16, 8, 4],
                materialLevels: ['high', 'medium', 'low', 'minimal']
            },
            asteroid: {
                geometryLevels: [12, 8, 4, 3],
                materialLevels: ['medium', 'low', 'minimal', 'minimal']
            },
            default: {
                geometryLevels: [16, 8, 4, 3],
                materialLevels: ['medium', 'low', 'minimal', 'minimal']
            }
        };

        console.log('🎯 LODManager создан с предустановками:', Object.keys(this.presetConfigs));
    }

    async preloadLODs() {
        console.log('📦 Предзагрузка LOD геометрий...');
        
        const startTime = performance.now();
        let loadedCount = 0;

        // Предзагрузка сферических геометрий для всех пресетов
        for (const [type, config] of Object.entries(this.presetConfigs)) {
            for (let i = 0; i < config.geometryLevels.length; i++) {
                const segments = config.geometryLevels[i];
                const geometryKey = `${type}_sphere_${segments}`;
                
                if (!this.geometryCache.has(geometryKey)) {
                    const geometry = new THREE.SphereGeometry(1, segments, segments);
                    this.geometryCache.set(geometryKey, geometry);
                    loadedCount++;
                }

                // Предзагрузка материалов
                const materialKey = `${type}_${config.materialLevels[i]}`;
                if (!this.materialCache.has(materialKey)) {
                    const material = this.createMaterial(type, config.materialLevels[i]);
                    this.materialCache.set(materialKey, material);
                    loadedCount++;
                }
            }
        }

        const loadTime = performance.now() - startTime;
        console.log(`✅ LOD геометрии загружены: ${loadedCount} объектов за ${loadTime.toFixed(2)}ms`);
    }

    createMaterial(type, quality) {
        const baseColors = {
            planet: 0x4ECDC4,
            moon: 0xCCCCCC,
            star: 0xFFD700,
            asteroid: 0x888888,
            default: 0xFFFFFF
        };

        const baseColor = baseColors[type] || baseColors.default;

        switch (quality) {
            case 'high':
                return new THREE.MeshPhongMaterial({
                    color: baseColor,
                    shininess: 30,
                    specular: 0x222222,
                    emissive: type === 'star' ? baseColor : 0x000000,
                    emissiveIntensity: type === 'star' ? 0.5 : 0
                });

            case 'medium':
                return new THREE.MeshPhongMaterial({
                    color: baseColor,
                    shininess: 15,
                    specular: 0x111111,
                    emissive: type === 'star' ? baseColor : 0x000000,
                    emissiveIntensity: type === 'star' ? 0.3 : 0
                });

            case 'low':
                return new THREE.MeshLambertMaterial({
                    color: baseColor,
                    emissive: type === 'star' ? baseColor : 0x000000,
                    emissiveIntensity: type === 'star' ? 0.2 : 0
                });

            case 'minimal':
                return new THREE.MeshBasicMaterial({
                    color: baseColor,
                    transparent: type === 'star',
                    opacity: type === 'star' ? 0.8 : 1
                });

            default:
                return new THREE.MeshBasicMaterial({ color: baseColor });
        }
    }

    registerEntity(entityId, entityType, baseSize, customConfig = null) {
        const config = customConfig || this.presetConfigs[entityType] || this.presetConfigs.default;
        this.lodConfigs.set(entityId, {
            type: entityType,
            config: config,
            baseSize: baseSize,
            currentLOD: -1
        });

        // Создаем LOD группу если нужно
        if (!this.lodGroups.has(entityId)) {
            this.lodGroups.set(entityId, new THREE.LOD());
        }
    }

    getLODLevel(entityId, distance, cameraZoom = 1) {
        const entityConfig = this.lodConfigs.get(entityId);
        if (!entityConfig) return 0;

        // Корректируем расстояния на основе zoom камеры
        const adjustedDistances = this.lodDistances.map(d => d / cameraZoom);
        
        // Определяем подходящий уровень LOD
        for (let i = 0; i < adjustedDistances.length; i++) {
            if (distance <= adjustedDistances[i]) {
                return i;
            }
        }
        
        return adjustedDistances.length - 1;
    }

    applyLOD(mesh, entityId, lodLevel, distance) {
        const entityConfig = this.lodConfigs.get(entityId);
        if (!entityConfig || entityConfig.currentLOD === lodLevel) {
            return false; // LOD не изменился
        }

        const previousLOD = entityConfig.currentLOD;
        entityConfig.currentLOD = lodLevel;
        this.stats.currentLODs.set(entityId, lodLevel);

        // Применяем новую геометрию
        const geometrySegments = entityConfig.config.geometryLevels[lodLevel];
        const geometryKey = `${entityConfig.type}_sphere_${geometrySegments}`;
        
        if (this.geometryCache.has(geometryKey)) {
            mesh.geometry = this.geometryCache.get(geometryKey);
            this.stats.geometryCacheHits++;
        } else {
            // Fallback: создаем геометрию на лету
            mesh.geometry = new THREE.SphereGeometry(1, geometrySegments, geometrySegments);
            this.geometryCache.set(geometryKey, mesh.geometry);
            this.stats.geometryCacheMisses++;
        }

        // Применяем новый материал
        const materialQuality = entityConfig.config.materialLevels[lodLevel];
        const materialKey = `${entityConfig.type}_${materialQuality}`;
        
        if (this.materialCache.has(materialKey)) {
            mesh.material = this.materialCache.get(materialKey);
        } else {
            mesh.material = this.createMaterial(entityConfig.type, materialQuality);
            this.materialCache.set(materialKey, mesh.material);
        }

        // Масштабируем mesh в соответствии с базовым размером
        mesh.scale.setScalar(entityConfig.baseSize);

        // Логируем изменение LOD если нужно
        if (previousLOD !== -1) {
            this.stats.lodSwitches++;
            if (Math.abs(previousLOD - lodLevel) > 1) {
                console.log(`🔄 LOD скачок для ${entityId}: ${previousLOD} -> ${lodLevel} (расстояние: ${distance.toFixed(1)})`);
            }
        }

        return true;
    }

    updateLODForAll(meshes, cameraPosition, cameraZoom = 1) {
        let updates = 0;
        
        meshes.forEach(mesh => {
            if (mesh.userData && mesh.userData.entityId) {
                const entityId = mesh.userData.entityId;
                const distance = mesh.position.distanceTo(cameraPosition);
                const lodLevel = this.getLODLevel(entityId, distance, cameraZoom);
                
                if (this.applyLOD(mesh, entityId, lodLevel, distance)) {
                    updates++;
                }
            }
        });

        return updates;
    }

    // Автоматическая настройка LOD на основе производительности
    adjustLODForPerformance(currentFPS, targetFPS = 60) {
        const performanceRatio = currentFPS / targetFPS;
        
        if (performanceRatio < 0.7) {
            // Низкий FPS - увеличиваем расстояния LOD (раньше переключаемся на низкие LOD)
            this.lodDistances = this.lodDistances.map(d => d * 0.8);
            console.warn('⚠️ Снижены требования LOD для повышения FPS');
        } else if (performanceRatio > 0.9 && currentFPS >= targetFPS) {
            // Высокий FPS - уменьшаем расстояния LOD (позже переключаемся на низкие LOD)
            this.lodDistances = this.lodDistances.map(d => Math.min(d * 1.1, 2000));
        }
    }

    // Методы для динамического изменения LOD настроек
    setLODDistances(distances) {
        if (distances.length === this.lodDistances.length) {
            this.lodDistances = distances;
            console.log('📏 LOD расстояния обновлены:', distances);
        } else {
            console.error('❌ Неправильное количество LOD расстояний');
        }
    }

    createCustomLODConfig(type, geometryLevels, materialLevels) {
        this.presetConfigs[type] = {
            geometryLevels,
            materialLevels
        };
        
        // Перезагружаем геометрии для нового конфига
        this.preloadLODsForType(type);
    }

    async preloadLODsForType(type) {
        const config = this.presetConfigs[type];
        if (!config) return;

        for (let i = 0; i < config.geometryLevels.length; i++) {
            const segments = config.geometryLevels[i];
            const geometryKey = `${type}_sphere_${segments}`;
            const materialKey = `${type}_${config.materialLevels[i]}`;

            if (!this.geometryCache.has(geometryKey)) {
                this.geometryCache.set(geometryKey, new THREE.SphereGeometry(1, segments, segments));
            }

            if (!this.materialCache.has(materialKey)) {
                this.materialCache.set(materialKey, this.createMaterial(type, config.materialLevels[i]));
            }
        }
    }

    // Методы для отладки и мониторинга
    getLODStats() {
        const lodDistribution = new Map();
        for (let i = 0; i < this.lodDistances.length; i++) {
            lodDistribution.set(i, 0);
        }

        this.stats.currentLODs.forEach(level => {
            lodDistribution.set(level, (lodDistribution.get(level) || 0) + 1);
        });

        return {
            totalEntities: this.lodConfigs.size,
            lodSwitches: this.stats.lodSwitches,
            cacheEfficiency: this.stats.geometryCacheHits / (this.stats.geometryCacheHits + this.stats.geometryCacheMisses) * 100,
            geometryCache: {
                hits: this.stats.geometryCacheHits,
                misses: this.stats.geometryCacheMisses,
                total: this.geometryCache.size
            },
            materialCache: {
                total: this.materialCache.size
            },
            lodDistribution: Object.fromEntries(lodDistribution),
            currentDistances: this.lodDistances
        };
    }

    debugVisualizeLOD(mesh, lodLevel) {
        // Визуальная индикация уровня LOD (для отладки)
        const colors = [0x00ff00, 0xffff00, 0xff8800, 0xff0000]; // Зеленый -> Красный
        
        if (mesh.material instanceof THREE.Material) {
            mesh.material.wireframe = true;
            mesh.material.wireframeLinewidth = 2;
            mesh.material.color.set(colors[lodLevel] || 0xffffff);
        }
    }

    dispose() {
        // Очищаем кэши геометрий и материалов
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.materialCache.forEach(material => material.dispose());
        
        this.geometryCache.clear();
        this.materialCache.clear();
        this.lodConfigs.clear();
        this.lodGroups.clear();
        this.stats.currentLODs.clear();
        
        console.log('🧹 LODManager уничтожен');
    }
}

export default LODManager;