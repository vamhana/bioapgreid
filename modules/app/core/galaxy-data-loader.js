// modules/app/core/galaxy-data-loader.js
import { SecurityValidator } from './security-validator.js';
import { MemoryManager } from './memory-manager.js';
import { Galaxy3DLayoutService } from './galaxy-3d-layout-service.js';

export class GalaxyDataLoader {
    constructor() {
        this.data = null;
        this.sitemapUrl = '/results/sitemap.json';
        this.cache = new Map();
        this.securityValidator = new SecurityValidator();
        this.memoryManager = new MemoryManager();
        this.layoutService = new Galaxy3DLayoutService(); // Новая служба 3D
        
        this.loadingState = {
            isLoading: false,
            progress: 0,
            lastError: null
        };
        
        this.maxProcessingDepth = 10; // Защита от рекурсии
        
        console.log('📊 GalaxyDataLoader создан с 3D Layout Service');
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
            
            // Проверяем безопасность данных
            console.log('🔒 Проверка безопасности данных...');
            if (this.securityValidator && typeof this.securityValidator.validateGalaxyData === 'function') {
                this.securityValidator.validateGalaxyData(rawData);
            } else {
                console.warn('⚠️ SecurityValidator не доступен, пропускаем проверку безопасности');
            }
            
            this.loadingState.progress = 80;
            
            // Обрабатываем данные (БЕЗ 3D логики)
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
            try {
                const fallbackData = this.getFallbackData();
                console.log('✅ Использованы fallback данные');
                return fallbackData;
            } catch (fallbackError) {
                console.error('❌ Ошибка в fallback данных:', fallbackError);
                throw new Error(`Не удалось загрузить данные: ${error.message}`);
            }
        } finally {
            this.loadingState.isLoading = false;
        }
    }

    processGalaxyData(rawData) {
        // Только базовая обработка данных - БЕЗ 3D логики
        const processedData = {
            ...rawData,
            // Убираем 3D позиции - они теперь в layout service
            metadata: {
                processedAt: new Date().toISOString(),
                version: '2.0.0-data-only'
            }
        };

        // Рекурсивно обрабатываем детей с защитой глубины
        if (processedData.children) {
            processedData.children = processedData.children.map(child => 
                this.processEntityData(child, 0)
            );
        }

        return processedData;
    }

    processEntityData(entity, depth) {
        // Защита от бесконечной рекурсии
        if (depth > this.maxProcessingDepth) {
            console.warn(`⚠️ Превышена глубина обработки: ${depth}`);
            return entity;
        }

        const processedEntity = {
            ...entity,
            // Базовые данные без 3D логики
            metadata: {
                processedDepth: depth,
                hasChildren: !!(entity.children && entity.children.length > 0)
            }
        };

        // Обрабатываем детей рекурсивно с контролем глубины
        if (processedEntity.children && depth < this.maxProcessingDepth) {
            processedEntity.children = processedEntity.children.map((child, index) => 
                this.processEntityData(child, depth + 1)
            );
        }

        return processedEntity;
    }

    // Новый метод для получения данных с 3D layout
    async loadWith3DLayout() {
        const basicData = await this.load();
        const dataWithLayout = this.layoutService.generate3DLayout(basicData);
        
        // Обновляем кэш
        this.cache.set('galaxyDataWithLayout', dataWithLayout);
        this.data = dataWithLayout;
        
        return dataWithLayout;
    }

    getFallbackData() {
        console.warn('⚠️ Используются тестовые данные');
        
        // Упрощенные fallback данные без 3D логики
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
                    cleanPath: "earth",
                    config: { 
                        color: "#4ECDC4", 
                        title: "Земля",
                        description: "Голубая планета с жизнью"
                    },
                    children: [
                        {
                            name: "moon",
                            type: "moon",
                            cleanPath: "moon",
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
                                description: "Большой спутник Марса"
                            }
                        },
                        {
                            name: "deimos", 
                            type: "moon",
                            cleanPath: "deimos",
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
                    cleanPath: "jupiter", 
                    config: { 
                        color: "#FFA500", 
                        title: "Юпитер",
                        description: "Газовый гигант"
                    }
                }
            ],
            metadata: {
                isFallback: true,
                processedAt: new Date().toISOString()
            }
        };

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

    // Остальные методы остаются без изменений...
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
        const allEntities = this.getAllEntities();
        
        return {
            name: this.data.name,
            totalEntities: allEntities.length,
            byType: this.data.stats?.entities || {},
            memoryUsage: memoryStats.formattedAllocated,
            lastUpdated: new Date().toISOString(),
            version: this.data.version || '2.0.0',
            has3DData: !!this.data.threeData,
            processingDepth: this.maxProcessingDepth
        };
    }

    getMemoryUsage() {
        return this.memoryManager.getMemoryStats();
    }

    clearCache() {
        this.cache.forEach((data, key) => {
            this.memoryManager.decrementReference(this.getCacheKey(key));
        });
        
        this.cache.clear();
        console.log('🧹 Кэш данных очищен');
    }

    getCacheKey(key) {
        return `galaxy_data_${key}`;
    }

    async reload() {
        this.clearCache();
        this.loadingState.progress = 0;
        return this.load();
    }

    destroy() {
        this.clearCache();
        this.data = null;
        this.layoutService.dispose();
        this.memoryManager.dispose();
        console.log('🧹 GalaxyDataLoader уничтожен');
    }
}

export default GalaxyDataLoader;
