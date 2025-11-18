// Упрощенный app.js с основными модулями
export { GalaxyApp } from './core/app.js';
export { GalaxyDataLoader } from './core/galaxy-data-loader.js';
export { GalaxyRenderer } from './core/galaxy-renderer.js';
export { CameraController } from './core/camera-controller.js';

// Базовые константы (встроенные вместо импорта)
export const APP_CONFIG = {
    performance: {
        targetFps: 60,
        enableLod: true,
        maxEntities: 1000
    },
    colors: {
        galaxy: '#4a90e2',
        planet: '#50e3c2',
        moon: '#b8e986',
        asteroid: '#f5a623',
        debris: '#d0021b'
    },
    sizes: {
        galaxy: 100,
        planet: 30,
        moon: 10,
        asteroid: 5,
        debris: 2
    }
};

export const ENTITY_COLORS = APP_CONFIG.colors;
export const ENTITY_SIZES = APP_CONFIG.sizes;

// Упрощенные версии модулей вместо импорта
export class PerformanceOptimizer {
    constructor() {
        console.log('⚡ PerformanceOptimizer (упрощенный) создан');
        this.metrics = { fps: 60, frameTime: 16.67 };
    }
    update() { return this.metrics; }
    optimizeEntities(entities) { return entities; }
    getMetrics() { return this.metrics; }
}

export class AssetManager {
    constructor() {
        console.log('📦 AssetManager (упрощенный) создан');
    }
    loadImage() { return Promise.resolve(); }
}

export class ProgressionTracker {
    constructor() {
        console.log('📊 ProgressionTracker (упрощенный) создан');
    }
    markExplored() {}
    getProgress() { return 0; }
}

export class EntityInteraction {
    constructor() {
        console.log('🖱️ EntityInteraction (упрощенный) создан');
    }
    setupInteractions() {}
}

export class UserPanel {
    constructor() {
        console.log('👤 UserPanel (упрощенный) создан');
    }
    render() {}
}

export class MinimapNavigation {
    constructor() {
        console.log('🗺️ MinimapNavigation (упрощенный) создан');
    }
    update() {}
}

// Метаданные
export const VERSION = '1.0.0';
export const BUILD_DATE = '2024-01-01';
export const APP_NAME = 'Galaxy Explorer';

// Основная функция инициализации
export function initGalaxyExplorer(canvasId = 'galaxy-canvas') {
    console.log('🚀 Инициализация Galaxy Explorer (упрощенная версия)...');
    
    return new Promise(async (resolve, reject) => {
        try {
            // Создаем главное приложение
            const app = new GalaxyApp();
            
            // Сохраняем глобальную ссылку для отладки
            window.galaxyApp = app;
            
            // Инициализируем приложение
            await app.init();
            
            console.log('🌌 Galaxy Explorer успешно запущен!');
            resolve(app);
            
        } catch (error) {
            console.error('❌ Ошибка инициализации Galaxy Explorer:', error);
            reject(error);
        }
    });
}

// Проверка доступности основных модулей
export function validateModules() {
    const coreModules = {
        'GalaxyApp': typeof GalaxyApp !== 'undefined',
        'GalaxyDataLoader': typeof GalaxyDataLoader !== 'undefined', 
        'GalaxyRenderer': typeof GalaxyRenderer !== 'undefined',
        'CameraController': typeof CameraController !== 'undefined'
    };

    const allLoaded = Object.values(coreModules).every(loaded => loaded);
    const loadedCount = Object.values(coreModules).filter(loaded => loaded).length;

    console.log('🔍 Проверка основных модулей:');
    console.log(`📦 Загружено: ${loadedCount}/4 модулей`);
    
    Object.entries(coreModules).forEach(([name, loaded]) => {
        console.log(`   ${loaded ? '✅' : '❌'} ${name}`);
    });

    return { allLoaded, loadedCount, totalCount: 4, modules: coreModules };
}

// Авто-инициализация при загрузке
if (typeof window !== 'undefined' && !window.galaxyApp) {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📝 Galaxy Explorer: DOM готов');
        console.log('💡 Для запуска вызовите: initGalaxyExplorer()');
    });
}

export default {
    GalaxyApp,
    GalaxyDataLoader,
    GalaxyRenderer,
    CameraController,
    PerformanceOptimizer,
    AssetManager,
    ProgressionTracker,
    EntityInteraction,
    UserPanel,
    MinimapNavigation,
    APP_CONFIG,
    ENTITY_COLORS,
    ENTITY_SIZES,
    VERSION,
    BUILD_DATE,
    APP_NAME,
    validateModules,
    initGalaxyExplorer
};
