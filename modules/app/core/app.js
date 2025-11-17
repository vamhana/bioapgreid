
import { GalaxyDataLoader } from './galaxy-data-loader.js';
import { GalaxyRenderer } from './galaxy-renderer.js';
import { ProgressionTracker } from '../interaction/progression-tracker.js';

export class GalaxyApp {
    constructor() {
        this.dataLoader = new GalaxyDataLoader();
        this.renderer = new GalaxyRenderer('galaxy-canvas');
        this.progression = new ProgressionTracker();
        this.isInitialized = false;
    }

    async init() {
        console.log('🚀 Инициализация Galaxy Explorer...');
        
        try {
            // Загружаем данные галактики
            const galaxyData = await this.dataLoader.load();
            if (!galaxyData) {
                throw new Error('Не удалось загрузить данные галактики');
            }

            // Инициализируем рендерер
            this.renderer.init();
            this.renderer.render(galaxyData);

            // Загружаем прогресс пользователя
            await this.progression.init(galaxyData);
            this.updateProgressDisplay();

            this.isInitialized = true;
            console.log('✅ Galaxy Explorer успешно инициализирован');

        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            throw error;
        }
    }

    resetZoom() {
        if (this.isInitialized) {
            this.renderer.resetCamera();
        }
    }

    toggleOrbits() {
        if (this.isInitialized) {
            this.renderer.toggleOrbitDisplay();
        }
    }

    updateProgressDisplay() {
        const progressCount = document.getElementById('progress-count');
        if (progressCount) {
            progressCount.textContent = this.progression.getDiscoveredCount();
        }
    }
}
