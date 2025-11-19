// modules/app/core/galaxy-3d-layout-service.js
import * as THREE from './three.module.js';

export class Galaxy3DLayoutService {
    constructor() {
        this.maxDepth = 10; // Защита от бесконечной рекурсии
        this.orbitConfigs = this.initializeOrbitConfigs();
        console.log('🎯 3D Layout Service создан');
    }

    initializeOrbitConfigs() {
        return {
            'galaxy': { radius: 0, spread: 0, inclination: 0 },
            'star': { radius: 800, spread: 100, inclination: 0.1 },
            'planet': { radius: 300, spread: 50, inclination: 0.3 },
            'moon': { radius: 80, spread: 15, inclination: 0.5 },
            'asteroid': { radius: 150, spread: 80, inclination: 0.8 },
            'debris': { radius: 100, spread: 40, inclination: 0.6 }
        };
    }

    generate3DLayout(galaxyData) {
        console.log('🔄 Генерация 3D layout...');
        
        const processedData = this.generateHierarchicalPositions(galaxyData);
        const bounds = this.calculateGalaxyBounds(processedData);
        const renderConfig = this.generateRenderConfig(processedData);

        return {
            ...processedData,
            threeData: {
                positions: this.extractPositionData(processedData),
                bounds: bounds,
                orbitalLayers: this.generateOrbitalLayers(processedData)
            },
            renderConfig: renderConfig,
            layoutVersion: '3.0.0',
            processedAt: new Date().toISOString()
        };
    }

    generateHierarchicalPositions(entity, depth = 0, parentPosition = { x: 0, y: 0, z: 0 }) {
        // Защита от бесконечной рекурсии
        if (depth > this.maxDepth) {
            console.warn(`⚠️ Достигнута максимальная глубина ${this.maxDepth}`);
            return entity;
        }

        const orbitConfig = this.getOrbitConfig(entity.type, depth);
        const position = this.calculateOrbitalPosition(depth, entity.index || 0, orbitConfig);
        
        // Сохраняем абсолютные и относительные позиции
        entity.position3D = {
            absolute: {
                x: parentPosition.x + position.x,
                y: parentPosition.y + position.y,
                z: parentPosition.z + position.z
            },
            relative: position,
            depth: depth,
            orbitRadius: orbitConfig.radius
        };

        // Добавляем вращение
        entity.rotation3D = this.calculateEntityRotation(entity.type);
        
        // Вычисляем bounding sphere для оптимизации
        entity.boundingSphere = this.calculateBoundingSphere(entity);

        // Рекурсивно обрабатываем детей с защитой глубины
        if (entity.children && depth < this.maxDepth) {
            entity.children.forEach((child, index) => {
                child.index = index;
                this.generateHierarchicalPositions(
                    child, 
                    depth + 1, 
                    entity.position3D.absolute
                );
            });
        }

        return entity;
    }

    getOrbitConfig(entityType, depth) {
        const baseConfig = this.orbitConfigs[entityType] || this.orbitConfigs.planet;
        
        // Модифицируем на основе глубины для разнообразия
        return {
            radius: baseConfig.radius * (1 + depth * 0.2),
            spread: baseConfig.spread * (1 + depth * 0.1),
            inclination: baseConfig.inclination
        };
    }

    calculateOrbitalPosition(depth, index, orbitConfig) {
        const baseRadius = orbitConfig.radius;
        const radius = baseRadius + depth * 150;
        const angle = (index / Math.max(1, 8)) * Math.PI * 2;
        
        // Добавляем случайность для естественного вида
        const randomOffset = (Math.random() - 0.5) * orbitConfig.spread;
        const inclination = orbitConfig.inclination * Math.PI;
        
        return {
            x: Math.cos(angle) * (radius + randomOffset),
            y: Math.sin(angle) * (radius + randomOffset) * Math.cos(inclination),
            z: Math.sin(inclination) * radius + (Math.random() - 0.5) * 50
        };
    }

    calculateEntityRotation(entityType) {
        // Случайная начальная ротация с предсказуемыми паттернами
        const baseRotation = {
            x: Math.random() * Math.PI * 2,
            y: Math.random() * Math.PI * 2,
            z: Math.random() * Math.PI * 2
        };

        // Для планет добавляем наклон оси
        if (entityType === 'planet') {
            baseRotation.x = Math.random() * 0.5; // Наклон оси
        }

        return baseRotation;
    }

    calculateBoundingSphere(entity) {
        const sizes = {
            'galaxy': 200,
            'star': 60,
            'planet': 30,
            'moon': 10,
            'asteroid': 5,
            'debris': 2
        };

        const radius = sizes[entity.type] || 15;
        const position = entity.position3D?.absolute || { x: 0, y: 0, z: 0 };

        return {
            center: position,
            radius: radius,
            type: entity.type
        };
    }

    calculateGalaxyBounds(galaxyData) {
        let min = { x: Infinity, y: Infinity, z: Infinity };
        let max = { x: -Infinity, y: -Infinity, z: -Infinity };

        const updateBounds = (position) => {
            if (!position) return;
            
            min.x = Math.min(min.x, position.x);
            min.y = Math.min(min.y, position.y);
            min.z = Math.min(min.z, position.z);
            max.x = Math.max(max.x, position.x);
            max.y = Math.max(max.y, position.y);
            max.z = Math.max(max.z, position.z);
        };

        const traverse = (entity) => {
            if (entity.position3D?.absolute) {
                updateBounds(entity.position3D.absolute);
            }
            if (entity.children && entity.children.length > 0) {
                entity.children.forEach(traverse);
            }
        };

        traverse(galaxyData);

        // Если нет данных, устанавливаем разумные границы по умолчанию
        if (min.x === Infinity) {
            min = { x: -1000, y: -1000, z: -500 };
            max = { x: 1000, y: 1000, z: 500 };
        }

        return {
            min,
            max,
            center: {
                x: (min.x + max.x) / 2,
                y: (min.y + max.y) / 2,
                z: (min.z + max.z) / 2
            },
            size: {
                x: max.x - min.x,
                y: max.y - min.y,
                z: max.z - min.z
            },
            radius: Math.max(max.x - min.x, max.y - min.y, max.z - min.z) / 2
        };
    }

    extractPositionData(galaxyData) {
        const positions = new Map();
        
        const extract = (entity) => {
            if (entity.position3D) {
                positions.set(entity.cleanPath || entity.name, {
                    absolute: entity.position3D.absolute,
                    relative: entity.position3D.relative,
                    rotation: entity.rotation3D,
                    boundingSphere: entity.boundingSphere
                });
            }
            
            if (entity.children) {
                entity.children.forEach(extract);
            }
        };

        extract(galaxyData);
        return positions;
    }

    generateOrbitalLayers(galaxyData) {
        const layers = [];
        
        if (!galaxyData.children) return layers;

        galaxyData.children.forEach((planet, planetIndex) => {
            const planetOrbit = {
                radius: 200 + planetIndex * 150,
                planets: []
            };

            // Позиция планеты
            if (planet.position3D?.absolute) {
                planetOrbit.planets.push({
                    entityId: planet.cleanPath || planet.name,
                    position: planet.position3D.absolute,
                    type: planet.type
                });
            }

            // Позиции лун
            if (planet.children) {
                planet.children.forEach((moon) => {
                    if (moon.position3D?.absolute) {
                        planetOrbit.planets.push({
                            entityId: moon.cleanPath || moon.name,
                            position: moon.position3D.absolute,
                            type: moon.type
                        });
                    }
                });
            }

            layers.push(planetOrbit);
        });

        return layers;
    }

    generateRenderConfig(galaxyData) {
        const entityCount = this.countEntities(galaxyData);
        
        return {
            starfield: {
                enabled: true,
                starCount: Math.min(5000, entityCount.total * 100),
                nebulaEnabled: true
            },
            lighting: {
                ambientIntensity: 0.6,
                directionalIntensity: 1.2,
                enableShadows: entityCount.total < 1000,
                pointLights: Math.min(10, entityCount.stars || 1)
            },
            postProcessing: {
                antialiasing: true,
                toneMapping: true,
                bloom: entityCount.total < 500
            },
            performance: {
                lodEnabled: entityCount.total > 100,
                frustumCulling: true,
                maxVisibleEntities: Math.min(2000, entityCount.total * 2)
            },
            camera: {
                initialPosition: { x: 0, y: 0, z: 1000 },
                bounds: this.calculateGalaxyBounds(galaxyData)
            }
        };
    }

    countEntities(galaxyData) {
        const counts = {
            total: 0,
            galaxies: 0,
            stars: 0,
            planets: 0,
            moons: 0,
            asteroids: 0,
            debris: 0
        };

        const count = (entity) => {
            counts.total++;
            counts[entity.type + 's'] = (counts[entity.type + 's'] || 0) + 1;
            
            if (entity.children) {
                entity.children.forEach(count);
            }
        };

        count(galaxyData);
        return counts;
    }

    // Вспомогательные методы для работы с позициями
    getEntityPosition(entity, entityId) {
        if (entity.cleanPath === entityId || entity.name === entityId) {
            return entity.position3D?.absolute || { x: 0, y: 0, z: 0 };
        }

        if (entity.children) {
            for (let child of entity.children) {
                const position = this.getEntityPosition(child, entityId);
                if (position) return position;
            }
        }

        return null;
    }

    calculateDistance(pos1, pos2) {
        return Math.sqrt(
            Math.pow(pos2.x - pos1.x, 2) + 
            Math.pow(pos2.y - pos1.y, 2) + 
            Math.pow(pos2.z - pos1.z, 2)
        );
    }

    // Метод для обновления layout при изменении данных
    updateLayout(existingLayout, newData) {
        console.log('🔄 Обновление 3D layout...');
        return this.generate3DLayout(newData);
    }

    // Очистка ресурсов
    dispose() {
        this.orbitConfigs = null;
        console.log('🧹 3D Layout Service очищен');
    }
}

export default Galaxy3DLayoutService;
