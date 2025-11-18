// modules/app/core/galaxy-data-loader.js
import { SecurityValidator } from './security-validator.js';
import { MemoryManager } from './memory-manager.js';

export class GalaxyDataLoader {
    constructor() {
        this.data = null;
        this.sitemapUrl = '/results/sitemap.json';
        this.cache = new Map();
        this.securityValidator = new SecurityValidator();
        this.memoryManager = new MemoryManager();
        this.loadingState = {
            isLoading: false,
            progress: 0,
            lastError: null
        };
        
        console.log('📊 GalaxyDataLoader создан с SecurityValidator и MemoryManager');
    }

    async load() {
        if (this.loadingState.isLoading) {
            console.warn('⚠️ Загрузка уже выполняется');
            return this.data;
        }

        this.loadingState.isLoading = true;
        this.loadingState.progress = 0;
        this.loadingState.lastError = null;

        try {
            console.log('📥 Загрузка данных галактики...');
            
            // Проверяем кэш
            if (this.cache.has('galaxyData')) {
                console.log('✅ Данные загружены из кэша');
                this.loadingState.progress = 100;
                this.data = this.cache.get('galaxyData');
                return this.data;
            }
            
            this.loadingState.progress = 10;
            
            const response = await fetch(this.sitemapUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.loadingState.progress = 30;
            
            const rawData = await response.json();
            
            this.loadingState.progress = 60;
            
            // ВАЖНО: Проверяем безопасность данных
            console.log('🔒 Проверка безопасности данных...');
            this.securityValidator.validateGalaxyData(rawData);
            
            this.loadingState.progress = 80;
            
            // Обрабатываем данные
            this.data = this.processGalaxyData(rawData);
            
            // Кэшируем данные с отслеживанием памяти
            const dataSize = new Blob([JSON.stringify(this.data)]).size;
            this.memoryManager.trackAllocation(this.data, 'galaxyData', dataSize, {
                entities: this.data.stats?.total || 0,
                types: Object.keys(this.data.stats?.entities || {})
            });
            
            this.cache.set('galaxyData', this.data);
            
            this.loadingState.progress = 100;
            
            console.log('✅ Данные галактики загружены и проверены:', {
                name: this.data.name,
                entities: this.data.stats?.total,
                childrenCount: this.data.children?.length || 0,
                memoryUsage: this.memoryManager.formatBytes(dataSize)
            });
            
            return this.data;
        } catch (error) {
            this.loadingState.lastError = error;
            console.error('❌ Ошибка загрузки sitemap:', error);
            
            // Fallback для разработки
            return this.getFallbackData();
        } finally {
            this.loadingState.isLoading = false;
        }
    }

    processGalaxyData(rawData) {
        // Дополнительная обработка данных для Three.js
        const processedData = {
            ...rawData,
            // Добавляем 3D позиции для объектов
            threeData: this.generate3DPositions(rawData),
            // Добавляем метаданные для рендеринга
            renderConfig: this.generateRenderConfig(rawData),
            // Временные метки
            loadedAt: new Date().toISOString(),
            version: '1.0.0'
        };

        // Рекурсивно обрабатываем детей
        if (processedData.children) {
            processedData.children = processedData.children.map(child => 
                this.processEntityData(child, 0)
            );
        }

        return processedData;
    }

    processEntityData(entity, depth) {
        const processedEntity = {
            ...entity,
            threeData: {
                position: this.calculateOrbitalPosition(depth, entity.index || 0),
                scale: this.calculateEntityScale(entity.type),
                rotation: this.calculateEntityRotation(entity.type)
            },
            renderConfig: {
                color: entity.config?.color || this.getDefaultColor(entity.type),
                emissive: entity.type === 'star' ? entity.config?.color || '#FFD700' : '#000000',
                emissiveIntensity: entity.type === 'star' ? 0.5 : 0,
                material: this.getMaterialType(entity.type)
            }
        };

        // Обрабатываем детей рекурсивно
        if (processedEntity.children) {
            processedEntity.children = processedEntity.children.map((child, index) => 
                this.processEntityData(child, depth + 1, index)
            );
        }

        return processedEntity;
    }

    generate3DPositions(galaxyData) {
        const positions = {
            center: { x: 0, y: 0, z: 0 },
            orbitalLayers: []
        };

        if (galaxyData.children) {
            galaxyData.children.forEach((planet, planetIndex) => {
                const planetOrbit = {
                    radius: 200 + planetIndex * 150,
                    planets: []
                };

                // Позиция планеты
                const planetAngle = (planetIndex / galaxyData.children.length) * Math.PI * 2;
                planetOrbit.planets.push({
                    entityId: planet.cleanPath,
                    position: {
                        x: Math.cos(planetAngle) * planetOrbit.radius,
                        y: Math.sin(planetAngle) * planetOrbit.radius,
                        z: 0
                    }
                });

                // Позиции лун
                if (planet.children) {
                    planet.children.forEach((moon, moonIndex) => {
                        const moonAngle = (moonIndex / planet.children.length) * Math.PI * 2;
                        planetOrbit.planets.push({
                            entityId: moon.cleanPath,
                            position: {
                                x: Math.cos(planetAngle) * planetOrbit.radius + Math.cos(moonAngle) * 60,
                                y: Math.sin(planetAngle) * planetOrbit.radius + Math.sin(moonAngle) * 60,
                                z: 0
                            }
                        });
                    });
                }

                positions.orbitalLayers.push(planetOrbit);
            });
        }

        return positions;
    }

    generateRenderConfig(galaxyData) {
        return {
            starfield: {
                enabled: true,
                starCount: 5000,
                nebulaEnabled: true
            },
            lighting: {
                ambientIntensity: 0.6,
                directionalIntensity: 1.2,
                enableShadows: true
            },
            postProcessing: {
                antialiasing: true,
                toneMapping: true
            },
            performance: {
                lodEnabled: true,
                frustumCulling: true,
                maxVisibleEntities: 1000
            }
        };
    }

    calculateOrbitalPosition(depth, index, totalAtDepth = 8) {
        const baseRadius = 200;
        const radius = baseRadius + depth * 150;
        const angle = (index / totalAtDepth) * Math.PI * 2;
        
        // Добавляем немного случайности для естественного вида
        const randomOffset = (Math.random() - 0.5) * 20 * depth;
        
        return {
            x: Math.cos(angle) * (radius + randomOffset),
            y: Math.sin(angle) * (radius + randomOffset),
            z: (Math.random() - 0.5) * 50 // Небольшая вариация по Z
        };
    }

    calculateEntityScale(entityType) {
        const scales = {
            galaxy: 3.0,
            star: 2.0,
            planet: 1.0,
            moon: 0.3,
            asteroid: 0.1,
            debris: 0.05
        };
        
        return scales[entityType] || 1.0;
    }

    calculateEntityRotation(entityType) {
        // Случайная начальная ротация
        return {
            x: Math.random() * Math.PI * 2,
            y: Math.random() * Math.PI * 2,
            z: Math.random() * Math.PI * 2
        };
    }

    getDefaultColor(entityType) {
        const colors = {
            galaxy: '#FFD700',
            star: '#FFD700',
            planet: '#4ECDC4',
            moon: '#CCCCCC',
            asteroid: '#888888',
            debris: '#666666'
        };
        
        return colors[entityType] || '#FFFFFF';
    }

    getMaterialType(entityType) {
        const materials = {
            galaxy: 'emissive',
            star: 'emissive',
            planet: 'standard',
            moon: 'standard',
            asteroid: 'basic',
            debris: 'basic'
        };
        
        return materials[entityType] || 'standard';
    }

    getFallbackData() {
        console.warn('⚠️ Используются тестовые данные');
        
        const fallbackData = {
            name: "Test Galaxy",
            type: "galaxy",
            config: { 
                color: "#FFD700", 
                title: "Тестовая Галактика",
                description: "Демонстрационные данные для разработки"
            },
            stats: {
                entities: {
                    galaxy: 1,
                    planet: 3,
                    moon: 2,
                    asteroid: 1,
                    debris: 0
                },
                total: 7
            },
            children: [
                {
                    name: "earth",
                    type: "planet",
                    config: { 
                        color: "#4ECDC4", 
                        title: "Земля",
                        description: "Голубая планета с жизнью"
                    },
                    children: [
                        {
                            name: "moon",
                            type: "moon", 
                            config: { 
                                color: "#CCCCCC", 
                                title: "Луна",
                                description: "Естественный спутник Земли"
                            }
                        }
                    ]
                },
                {
                    name: "mars", 
                    type: "planet",
                    config: { 
                        color: "#FF6B6B", 
                        title: "Марс",
                        description: "Красная планета"
                    },
                    children: [
                        {
                            name: "phobos",
                            type: "moon",
                            config: { 
                                color: "#888888", 
                                title: "Фобос",
                                description: "Большой спутник Марса"
                            }
                        },
                        {
                            name: "deimos", 
                            type: "moon",
                            config: { 
                                color: "#666666", 
                                title: "Деймос",
                                description: "Малый спутник Марса"
                            }
                        }
                    ]
                },
                {
                    name: "jupiter",
                    type: "planet", 
                    config: { 
                        color: "#FFA500", 
                        title: "Юпитер",
                        description: "Газовый гигант"
                    }
                }
            ],
            threeData: this.generate3DPositions(this.getFallbackData()),
            renderConfig: this.generateRenderConfig(this.getFallbackData()),
            loadedAt: new Date().toISOString(),
            version: '1.0.0-fallback'
        };

        // Обрабатываем fallback данные
        const processedFallback = this.processGalaxyData(fallbackData);
        
        // Кэшируем fallback данные
        const dataSize = new Blob([JSON.stringify(processedFallback)]).size;
        this.memoryManager.trackAllocation(processedFallback, 'galaxyData_fallback', dataSize, {
            entities: 7,
            types: ['galaxy', 'planet', 'moon'],
            isFallback: true
        });
        
        this.cache.set('galaxyData', processedFallback);
        this.data = processedFallback;
        
        return processedFallback;
    }

    getEntityByPath(path) {
        if (!this.data) {
            console.warn('⚠️ Данные не загружены');
            return null;
        }

        function search(entity, targetPath) {
            if (entity.cleanPath === targetPath) return entity;
            if (entity.children) {
                for (let child of entity.children) {
                    const result = search(child, targetPath);
                    if (result) return result;
                }
            }
            return null;
        }
        
        const result = search(this.data, path);
        if (!result) {
            console.warn(`⚠️ Объект по пути '${path}' не найден`);
        }
        return result;
    }

    // Новые методы для работы с Three.js данными
    getEntity3DPosition(entityId) {
        if (!this.data?.threeData) {
            return { x: 0, y: 0, z: 0 };
        }

        // Ищем позицию в сгенерированных данных
        for (const orbit of this.data.threeData.orbitalLayers || []) {
            for (const entity of orbit.planets || []) {
                if (entity.entityId === entityId) {
                    return entity.position;
                }
            }
        }

        // Fallback: вычисляем позицию на лету
        return this.calculateFallbackPosition(entityId);
    }

    calculateFallbackPosition(entityId) {
        // Простой алгоритм для вычисления позиции на основе entityId
        const hash = this.hashString(entityId);
        const angle = (hash % 100) / 100 * Math.PI * 2;
        const radius = 200 + ((hash % 1000) / 1000) * 800;
        
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            z: (Math.random() - 0.5) * 100
        };
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    // Методы для работы с прогрессом загрузки
    getLoadingState() {
        return { ...this.loadingState };
    }

    getLoadingProgress() {
        return this.loadingState.progress;
    }

    isLoading() {
        return this.loadingState.isLoading;
    }

    getLastError() {
        return this.loadingState.lastError;
    }

    // Расширенные методы для работы с данными
    getAllEntities() {
        if (!this.data) return [];
        
        const entities = [];
        
        function collectEntities(entity) {
            entities.push(entity);
            if (entity.children) {
                entity.children.forEach(child => collectEntities(child));
            }
        }
        
        collectEntities(this.data);
        return entities;
    }

    getEntitiesByType(type) {
        const allEntities = this.getAllEntities();
        return allEntities.filter(entity => entity.type === type);
    }

    getGalaxyStats() {
        if (!this.data) return null;
        
        const memoryStats = this.memoryManager.getMemoryStats();
        
        return {
            name: this.data.name,
            totalEntities: this.getAllEntities().length,
            byType: this.data.stats?.entities || {},
            memoryUsage: memoryStats.formattedAllocated,
            lastUpdated: new Date().toISOString(),
            version: this.data.version || '1.0.0',
            has3DData: !!this.data.threeData
        };
    }

    // Методы для управления памятью
    getMemoryUsage() {
        return this.memoryManager.getMemoryStats();
    }

    // Очистка кэша с учетом менеджера памяти
    clearCache() {
        // Удаляем из менеджера памяти
        this.cache.forEach((data, key) => {
            this.memoryManager.decrementReference(this.getCacheKey(key));
        });
        
        this.cache.clear();
        console.log('🧹 Кэш данных очищен');
    }

    getCacheKey(key) {
        return `galaxy_data_${key}`;
    }

    // Перезагрузка данных
    async reload() {
        this.clearCache();
        this.loadingState.progress = 0;
        return this.load();
    }

    // Деструктор с очисткой памяти
    destroy() {
        this.clearCache();
        this.data = null;
        this.memoryManager.dispose();
        console.log('🧹 GalaxyDataLoader уничтожен');
    }
}

export default GalaxyDataLoader;