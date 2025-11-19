// modules/app/app.js
export { default as GalaxyApp } from './core/app.js';
export { default as GalaxyDataLoader } from './core/galaxy-data-loader.js';
export { default as GalaxyRenderer } from './core/galaxy-renderer.js';
export { default as CameraController } from './core/camera-controller.js';

// Новые сервисы из рефакторинга
export { default as Galaxy3DLayoutService } from './core/galaxy-3d-layout-service.js';
export { default as AnimationSystem } from './core/animation-system.js';
export { default as MaterialPool } from './core/material-pool.js';
export { default as SpatialPartitioner } from './core/spatial-partitioner.js';
export { default as LODManager } from './core/lod-manager.js';

// Существующие модули
export { default as ProgressionTracker } from './interaction/progression-tracker.js';
export { default as EntityInteraction } from './interaction/entity-interaction.js';
export { default as UserPanel } from './ui/user-panel.js';
export { default as MinimapNavigation } from './ui/minimap-navigation.js';
export { default as AssetManager } from './utils/asset-manager.js';
export { default as PerformanceOptimizer } from './utils/performance-optimizer.js';

// Константы
export { APP_CONFIG, ENTITY_COLORS, ENTITY_SIZES } from './constants/config.js';

// Версия и метаданные
export const VERSION = '2.0.0';
export const BUILD_DATE = '2024-01-15';
export const APP_NAME = 'Galaxy Explorer 3D';

// Обновить утилиту получения экспортов
export function getAppExports() {
    return {
        version: VERSION,
        buildDate: BUILD_DATE,
        appName: APP_NAME,
        modules: {
            core: [
                'GalaxyApp', 'GalaxyDataLoader', 'GalaxyRenderer', 'CameraController',
                'Galaxy3DLayoutService', 'AnimationSystem', 'MaterialPool',
                'SpatialPartitioner', 'LODManager'
            ],
            interaction: ['ProgressionTracker', 'EntityInteraction'],
            ui: ['UserPanel', 'MinimapNavigation'],
            utils: ['AssetManager', 'PerformanceOptimizer'],
            constants: ['APP_CONFIG', 'ENTITY_COLORS', 'ENTITY_SIZES']
        }
    };
}

// Обновить валидацию модулей
export async function validateModules() {
    const modules = {
        // Основные модули
        'GalaxyApp': typeof GalaxyApp !== 'undefined',
        'GalaxyDataLoader': typeof GalaxyDataLoader !== 'undefined', 
        'GalaxyRenderer': typeof GalaxyRenderer !== 'undefined',
        'CameraController': typeof CameraController !== 'undefined',
        
        // Новые сервисы
        'Galaxy3DLayoutService': typeof Galaxy3DLayoutService !== 'undefined',
        'AnimationSystem': typeof AnimationSystem !== 'undefined',
        'MaterialPool': typeof MaterialPool !== 'undefined',
        'SpatialPartitioner': typeof SpatialPartitioner !== 'undefined',
        'LODManager': typeof LODManager !== 'undefined',
        
        // Существующие модули
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

    console.log('🔍 Проверка модулей приложения (v2.0.0):');
    console.log(`📦 Загружено: ${loadedCount}/${totalCount} модулей`);
    
    Object.entries(modules).forEach(([name, loaded]) => {
        console.log(`   ${loaded ? '✅' : '❌'} ${name}`);
    });

    if (allLoaded) {
        console.log('🎉 Все модули приложения успешно загружены!');
        console.log('🚀 Новая архитектура 3D готова к работе');
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
export function initGalaxyExplorer(canvasId = 'galaxy-canvas') {
    console.log('🚀 Инициализация Galaxy Explorer 3D...');
    
    return new Promise(async (resolve, reject) => {
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
            
            console.log('🌌 Galaxy Explorer 3D успешно запущен!');
            console.log('✨ Новая 3D архитектура активирована:');
            console.log('   • Galaxy3DLayoutService - 3D компоновка');
            console.log('   • AnimationSystem - система анимаций');
            console.log('   • MaterialPool - оптимизация материалов');
            console.log('   • SpatialPartitioner - пространственное разделение');
            console.log('   • LODManager - управление уровнем детализации');
            
            resolve(app);
            
        } catch (error) {
            console.error('❌ Ошибка инициализации Galaxy Explorer 3D:', error);
            reject(error);
        }
    });
}

// Auto-initialize if script is loaded directly
if (typeof window !== 'undefined' && !window.galaxyApp) {
    // Ждем загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📝 Galaxy Explorer 3D: DOM готов, можно запускать initGalaxyExplorer()');
        });
    } else {
        console.log('📝 Galaxy Explorer 3D: DOM уже загружен, можно запускать initGalaxyExplorer()');
    }
}

// Безопасная глобальная регистрация для отладки
if (typeof window !== 'undefined' && !window.GALAXY_EXPLORER) {
    window.GALAXY_EXPLORER = {
        version: VERSION,
        init: initGalaxyExplorer,
        validate: validateModules,
        getExports: getAppExports
    };
}

export default {
    // Core modules
    GalaxyApp,
    GalaxyDataLoader,
    GalaxyRenderer,
    CameraController,
    
    // New 3D services
    Galaxy3DLayoutService,
    AnimationSystem,
    MaterialPool,
    SpatialPartitioner,
    LODManager,
    
    // Interaction modules
    ProgressionTracker,
    EntityInteraction,
    
    // UI modules
    UserPanel,
    MinimapNavigation,
    
    // Utils modules
    AssetManager,
    PerformanceOptimizer,
    
    // Constants
    APP_CONFIG,
    ENTITY_COLORS,
    ENTITY_SIZES,
    
    // Metadata
    VERSION,
    BUILD_DATE,
    APP_NAME,
    
    // Utilities
    getAppExports,
    validateModules,
    initGalaxyExplorer
};
