
export class GalaxyDataLoader {
    constructor() {
        this.data = null;
        this.sitemapUrl = '/results/sitemap.json';
    }

    async load() {
        try {
            console.log('📥 Загрузка данных галактики...');
            const response = await fetch(this.sitemapUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.data = await response.json();
            console.log('✅ Данные галактики загружены:', this.data);
            return this.data;
        } catch (error) {
            console.error('❌ Ошибка загрузки sitemap:', error);
            
            // Fallback для разработки
            return this.getFallbackData();
        }
    }

    getFallbackData() {
        console.warn('⚠️ Используются тестовые данные');
        return {
            name: "Test Galaxy",
            stats: {
                entities: {
                    galaxy: 1,
                    planet: 3,
                    moon: 2,
                    asteroid: 1,
                    debris: 0
                }
            },
            children: [
                {
                    name: "earth",
                    type: "planet",
                    config: { color: "#4ECDC4", title: "Земля" }
                },
                {
                    name: "mars", 
                    type: "planet",
                    config: { color: "#FF6B6B", title: "Марс" }
                }
            ]
        };
    }

    getEntityByPath(path) {
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
        return search(this.data, path);
    }
}
