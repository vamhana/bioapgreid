// modules/app/core/galaxy-data-loader.js
export class GalaxyDataLoader {
    constructor() {
        this.data = null;
        this.sitemapUrl = '/results/sitemap.json';
        this.cache = new Map();
        
        console.log('📊 GalaxyDataLoader создан');
    }

    async load() {
        try {
            console.log('📥 Загрузка данных галактики...');
            
            // Проверяем кэш
            if (this.cache.has('galaxyData')) {
                console.log('✅ Данные загружены из кэша');
                this.data = this.cache.get('galaxyData');
                return this.data;
            }
            
            const response = await fetch(this.sitemapUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.data = await response.json();
            
            // Кэшируем данные
            this.cache.set('galaxyData', this.data);
            
            console.log('✅ Данные галактики загружены:', {
                name: this.data.name,
                entities: this.data.stats?.entities,
                childrenCount: this.data.children?.length || 0
            });
            
            return this.data;
        } catch (error) {
            console.error('❌ Ошибка загрузки sitemap:', error);
            
            // Fallback для разработки
            return this.getFallbackData();
        }
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
            ]
        };
        
        // Кэшируем fallback данные
        this.cache.set('galaxyData', fallbackData);
        this.data = fallbackData;
        
        return fallbackData;
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

    // Новые методы для работы с данными
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
        
        return {
            name: this.data.name,
            totalEntities: this.getAllEntities().length,
            byType: this.data.stats?.entities || {},
            lastUpdated: new Date().toISOString()
        };
    }

    // Очистка кэша
    clearCache() {
        this.cache.clear();
        console.log('🧹 Кэш данных очищен');
    }

    // Перезагрузка данных
    async reload() {
        this.clearCache();
        return this.load();
    }

    // Деструктор
    destroy() {
        this.clearCache();
        this.data = null;
        console.log('🧹 GalaxyDataLoader уничтожен');
    }
}

export default GalaxyDataLoader;
