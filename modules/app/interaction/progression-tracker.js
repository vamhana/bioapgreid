export class ProgressionTracker {
    constructor() {
        this.discoveredEntities = new Set();
        this.stats = {
            total: 0,
            discovered: 0
        };
    }

    async init(galaxyData) {
        this.stats.total = this.countTotalEntities(galaxyData);
        this.loadProgress();
        console.log('📊 ProgressionTracker инициализирован:', this.stats);
    }

    countTotalEntities(data) {
        let count = 0;
        
        function countRecursive(entity) {
            count++;
            if (entity.children) {
                entity.children.forEach(child => countRecursive(child));
            }
        }
        
        if (data) {
            countRecursive(data);
        }
        
        return count;
    }

    discoverEntity(entityId) {
        if (!this.discoveredEntities.has(entityId)) {
            this.discoveredEntities.add(entityId);
            this.stats.discovered++;
            this.saveProgress();
            console.log('🔍 Объект исследован:', entityId);
        }
    }

    isDiscovered(entityId) {
        return this.discoveredEntities.has(entityId);
    }

    getDiscoveredCount() {
        return this.stats.discovered;
    }

    getProgressPercentage() {
        return this.stats.total > 0 ? (this.stats.discovered / this.stats.total * 100).toFixed(1) : 0;
    }

    saveProgress() {
        try {
            const progress = {
                discovered: Array.from(this.discoveredEntities),
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('galaxyProgress', JSON.stringify(progress));
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить прогресс:', error);
        }
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('galaxyProgress');
            if (saved) {
                const progress = JSON.parse(saved);
                this.discoveredEntities = new Set(progress.discovered);
                this.stats.discovered = this.discoveredEntities.size;
                console.log('💾 Прогресс загружен:', this.stats.discovered, 'объектов');
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить прогресс:', error);
        }
    }

    resetProgress() {
        this.discoveredEntities.clear();
        this.stats.discovered = 0;
        localStorage.removeItem('galaxyProgress');
        console.log('🔄 Прогресс сброшен');
    }

    updateProgressDisplay() {
        const progressElement = document.getElementById('progress-count');
        if (progressElement) {
            progressElement.textContent = `Исследовано: ${this.getDiscoveredCount()}`;
        }
    }

    destroy() {
        this.saveProgress();
        console.log('🧹 ProgressionTracker уничтожен');
    }
}

export default ProgressionTracker;
