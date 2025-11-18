// Core Modules - ИСПРАВЛЕННЫЕ ПУТИ
export { GalaxyApp } from '/modules/app/core/app.js';
export { GalaxyDataLoader } from '/modules/app/core/galaxy-data-loader.js';
export { GalaxyRenderer } from '/modules/app/core/galaxy-renderer.js';
export { CameraController } from '/modules/app/core/camera-controller.js';

// Interaction Modules - ИСПРАВЛЕННЫЕ ПУТИ
export { ProgressionTracker } from '/modules/app/interaction/progression-tracker.js';
export { EntityInteraction } from '/modules/app/interaction/entity-interaction.js';

// UI Modules - ИСПРАВЛЕННЫЕ ПУТИ
export { UserPanel } from '/modules/app/ui/user-panel.js';
export { MinimapNavigation } from '/modules/app/ui/minimap-navigation.js';

// Utils Modules - ИСПРАВЛЕННЫЕ ПУТИ
export { AssetManager } from '/modules/app/utils/asset-manager.js';
export { PerformanceOptimizer } from '/modules/app/utils/performance-optimizer.js';

// Constants - ИСПРАВЛЕННЫЕ ПУТИ
export { APP_CONFIG, ENTITY_COLORS, ENTITY_SIZES } from '/modules/app/constants/config.js';

// Version and metadata
export const VERSION = '1.0.0';
export const BUILD_DATE = '2024-01-01';
export const APP_NAME = 'Galaxy Explorer';

// Utility function to get all exports (for debugging)
export function getAppExports() {
    return {
        version: VERSION,
        buildDate: BUILD_DATE,
        appName: APP_NAME,
        modules: {
            core: ['GalaxyApp', 'GalaxyDataLoader', 'GalaxyRenderer', 'CameraController'],
            interaction: ['ProgressionTracker', 'EntityInteraction'],
            ui: ['UserPanel', 'MinimapNavigation'],
            utils: ['AssetManager', 'PerformanceOptimizer'],
            constants: ['APP_CONFIG', 'ENTITY_COLORS', 'ENTITY_SIZES']
        }
    };
}

// Debug function to check if all modules are available
export async function validateModules() {
    const modules = {
        'GalaxyApp': typeof GalaxyApp !== 'undefined',
        'GalaxyDataLoader': typeof GalaxyDataLoader !== 'undefined', 
        'GalaxyRenderer': typeof GalaxyRenderer !== 'undefined',
        'CameraController': typeof CameraController !== 'undefined',
        'ProgressionTracker': typeof ProgressionTracker !== 'undefined',
        'EntityInteraction': typeof EntityInteraction !== 'undefined',
        'UserPanel': typeof UserPanel !== 'undefined',
        'MinimapNavigation': typeof MinimapNavigation !== 'undefined',
        'AssetManager': typeof AssetManager !== 'undefined',
        'PerformanceOptimizer': typeof PerformanceOptimizer !== 'undefined',
        'APP_CONFIG': typeof APP_CONFIG !== 'undefined'
    };

    const allLoaded = Object.values(modules).every(loaded => loaded);
    const loadedCount = Object.values(modules).filter(loaded => loaded).length;
    const totalCount = Object.keys(modules).length;

    console.log('🔍 Проверка модулей приложения:');
    console.log(`📦 Загружено: ${loadedCount}/${totalCount} модулей`);
    
    Object.entries(modules).forEach(([name, loaded]) => {
        console.log(`   ${loaded ? '✅' : '❌'} ${name}`);
    });

    if (allLoaded) {
        console.log('🎉 Все модули приложения успешно загружены!');
    } else {
        console.warn('⚠️ Некоторые модули не загружены. Приложение может работать некорректно.');
    }

    return {
        allLoaded,
        loadedCount,
        totalCount,
        modules
    };
}

// Global initialization helper
export async function initGalaxyExplorer(canvasId = 'galaxy-canvas') {
    console.log('🚀 Инициализация Galaxy Explorer...');
    
    try {
        // Проверяем доступность всех модулей
        const validation = await validateModules();
        if (!validation.allLoaded) {
            throw new Error(`Не все модули загружены: ${validation.loadedCount}/${validation.totalCount}`);
        }

        // Создаем главное приложение
        const app = new GalaxyApp();
        
        // Сохраняем глобальную ссылку для отладки
        window.galaxyApp = app;
        
        // Инициализируем приложение
        await app.init();
        
        console.log('🌌 Galaxy Explorer успешно запущен!');
        return app;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Galaxy Explorer:', error);
        throw error;
    }
}

// Auto-initialize if script is loaded directly
if (typeof window !== 'undefined' && !window.galaxyApp) {
    // Ждем загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📝 Galaxy Explorer: DOM готов, можно запускать initGalaxyExplorer()');
        });
    } else {
        console.log('📝 Galaxy Explorer: DOM уже загружен, можно запускать initGalaxyExplorer()');
    }
}

export default {
    GalaxyApp,
    GalaxyDataLoader,
    GalaxyRenderer,
    CameraController,
    ProgressionTracker,
    EntityInteraction,
    UserPanel,
    MinimapNavigation,
    AssetManager,
    PerformanceOptimizer,
    APP_CONFIG,
    ENTITY_COLORS,
    ENTITY_SIZES,
    VERSION,
    BUILD_DATE,
    APP_NAME,
    getAppExports,
    validateModules,
    initGalaxyExplorer
};
