export class GalaxyDataLoader {
    constructor() {
        this.data = null;
        this.sitemapUrl = '/results/sitemap.json';
    }

    async load() {
        try {
            const response = await fetch(this.sitemapUrl);
            this.data = await response.json();
            return this.data;
        } catch (error) {
            console.error('Ошибка загрузки sitemap:', error);
            return null;
        }
    }

    getEntityByPath(path) {
        // Рекурсивный поиск по пути
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
