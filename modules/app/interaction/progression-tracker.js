export class ProgressionTracker {
    constructor() {
        this.discoveredEntities = new Set();
        this.storageKey = 'galaxy-explorer-progress';
    }

    async init(galaxyData) {
        await this.loadProgress();
        console.log('✅ Трекер прогресса инициализирован');
    }

    async loadProgress() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const progress = JSON.parse(saved);
                this.discoveredEntities = new Set(progress.discoveredEntities || []);
                console.log('📖 Прогресс загружен:', this.discoveredEntities.size, 'объектов');
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить прогресс:', error);
        }
    }

    async saveProgress() {
        try {
            const progress = {
                discoveredEntities: Array.from(this.discoveredEntities),
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(progress));
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить прогресс:', error);
        }
    }

    discoverEntity(entityId) {
        this.discoveredEntities.add(entityId);
        this.saveProgress();
    }

    getDiscoveredCount() {
        return this.discoveredEntities.size;
    }

    isDiscovered(entityId) {
        return this.discoveredEntities.has(entityId);
    }
}
