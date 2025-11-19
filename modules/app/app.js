export { default as GalaxyApp } from './core/app-core.js';
export { AppSystemsManager } from './core/app-systems.js';
export { AppUIManager } from './core/app-ui.js';

// Rendering Modules
export { default as GalaxyDataLoader } from './core/galaxy-data-loader.js';
export { default as GalaxyRenderer } from './core/galaxy-renderer.js';
export { default as CameraController } from './core/camera-controller.js';

// Interaction Modules
export { default as ProgressionTracker } from './interaction/progression-tracker.js';
export { default as EntityInteraction } from './interaction/entity-interaction.js';

// UI Modules
export { default as UserPanel } from './ui/user-panel.js';
export { default as MinimapNavigation } from './ui/minimap-navigation.js';

// Utils Modules
export { default as AssetManager } from './utils/asset-manager.js';
export { default as PerformanceOptimizer } from './utils/performance-optimizer.js';

// Constants (именованные экспорты)
export { APP_CONFIG, ENTITY_COLORS, ENTITY_SIZES } from './constants/config.js';

// Version and metadata
export const VERSION = '1.0.0';
export const BUILD_DATE = '2024-01-01';
export const APP_NAME = 'Galaxy Explorer';

/**
 * Утилита для получения полной структуры экспортов приложения
 * @returns {Object} Объект с метаданными и структурой модулей
 */
export function getAppExports() {
    return {
        version: VERSION,
        buildDate: BUILD_DATE,
        appName: APP_NAME,
        modules: {
            core: ['GalaxyApp', 'AppSystemsManager', 'AppUIManager'],
            rendering: ['GalaxyDataLoader', 'GalaxyRenderer', 'CameraController'],
            interaction: ['ProgressionTracker', 'EntityInteraction'],
            ui: ['UserPanel', 'MinimapNavigation'],
            utils: ['AssetManager', 'PerformanceOptimizer'],
            constants: ['APP_CONFIG', 'ENTITY_COLORS', 'ENTITY_SIZES']
        },
        metadata: {
            totalModules: 14,
            architecture: 'modular-3-layer',
            lastUpdated: BUILD_DATE
        }
    };
}

/**
 * Валидация загрузки всех модулей приложения
 * @returns {Promise<Object>} Результат проверки с детальной информацией
 */
export async function validateModules() {
    const modules = {
        // Core Modules
        'GalaxyApp': typeof GalaxyApp !== 'undefined',
        'AppSystemsManager': typeof AppSystemsManager !== 'undefined',
        'AppUIManager': typeof AppUIManager !== 'undefined',
        
        // Rendering Modules
        'GalaxyDataLoader': typeof GalaxyDataLoader !== 'undefined',
        'GalaxyRenderer': typeof GalaxyRenderer !== 'undefined',
        'CameraController': typeof CameraController !== 'undefined',
        
        // Interaction Modules
        'ProgressionTracker': typeof ProgressionTracker !== 'undefined',
        'EntityInteraction': typeof EntityInteraction !== 'undefined',
        
        // UI Modules
        'UserPanel': typeof UserPanel !== 'undefined',
        'MinimapNavigation': typeof MinimapNavigation !== 'undefined',
        
        // Utils Modules
        'AssetManager': typeof AssetManager !== 'undefined',
        'PerformanceOptimizer': typeof PerformanceOptimizer !== 'undefined',
        
        // Constants
        'APP_CONFIG': typeof APP_CONFIG !== 'undefined',
        'ENTITY_COLORS': typeof ENTITY_COLORS !== 'undefined',
        'ENTITY_SIZES': typeof ENTITY_SIZES !== 'undefined'
    };

    const allLoaded = Object.values(modules).every(loaded => loaded);
    const loadedCount = Object.values(modules).filter(loaded => loaded).length;
    const totalCount = Object.keys(modules).length;

    console.group('🔍 Galaxy Explorer - Проверка модулей приложения');
    console.log(`📦 Архитектура: ${getAppExports().metadata.architecture}`);
    console.log(`📦 Загружено: ${loadedCount}/${totalCount} модулей`);
    console.log(`🎯 Статус: ${allLoaded ? '✅ ПОЛНОСТЬЮ ГОТОВ' : '⚠️ ЧАСТИЧНАЯ ЗАГРУЗКА'}`);
    
    // Группируем вывод по категориям
    const categories = {
        '🎯 Core Systems': ['GalaxyApp', 'AppSystemsManager', 'AppUIManager'],
        '🎨 Rendering': ['GalaxyDataLoader', 'GalaxyRenderer', 'CameraController'],
        '👆 Interaction': ['ProgressionTracker', 'EntityInteraction'],
        '📱 UI Components': ['UserPanel', 'MinimapNavigation'],
        '⚙️ Utilities': ['AssetManager', 'PerformanceOptimizer'],
        '📋 Constants': ['APP_CONFIG', 'ENTITY_COLORS', 'ENTITY_SIZES']
    };

    Object.entries(categories).forEach(([category, moduleNames]) => {
        console.log(`\n${category}:`);
        moduleNames.forEach(name => {
            const status = modules[name] ? '✅' : '❌';
            console.log(`   ${status} ${name}`);
        });
    });

    if (allLoaded) {
        console.log('\n🎉 Все модули приложения успешно загружены!');
        console.log('🚀 Galaxy Explorer готов к инициализации');
    } else {
        console.warn('\n⚠️ Некоторые модули не загружены. Приложение может работать некорректно.');
        console.log('💡 Рекомендации:');
        console.log('   - Проверьте целостность файловой структуры');
        console.log('   - Убедитесь в корректности путей импорта');
        console.log('   - Проверьте консоль браузера на наличие ошибок загрузки');
    }
    
    console.groupEnd();

    return {
        allLoaded,
        loadedCount,
        totalCount,
        modules,
        categories: Object.keys(categories).length,
        architecture: getAppExports().metadata.architecture
    };
}

/**
 * Основная функция инициализации приложения Galaxy Explorer
 * @param {string} canvasId - ID canvas элемента для рендеринга
 * @returns {Promise<GalaxyApp>} Promise с экземпляром приложения
 */
export function initGalaxyExplorer(canvasId = 'galaxy-canvas') {
    console.group('🚀 Galaxy Explorer - Инициализация приложения');
    console.log(`📝 Canvas ID: ${canvasId}`);
    console.log(`📊 Версия: ${VERSION}`);
    console.log(`🏗️ Архитектура: ${getAppExports().metadata.architecture}`);
    
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Проверяем доступность canvas элемента
            const canvasElement = document.getElementById(canvasId);
            if (!canvasElement) {
                throw new Error(`Canvas элемент с ID '${canvasId}' не найден`);
            }

            // 2. Валидируем все модули
            console.log('🔍 Проверка целостности модулей...');
            const validation = await validateModules();
            
            if (!validation.allLoaded) {
                throw new Error(
                    `Не все модули загружены: ${validation.loadedCount}/${validation.totalCount}. ` +
                    `Проверьте консоль для детальной информации.`
                );
            }

            // 3. Создаем экземпляр приложения
            console.log('🏗️ Создание экземпляра приложения...');
            const app = new GalaxyApp();
            
            // 4. Сохраняем глобальную ссылку для отладки
            window.galaxyApp = app;
            console.log('🔧 Глобальная ссылка установлена: window.galaxyApp');

            // 5. Инициализируем приложение
            console.log('🎬 Запуск инициализации...');
            await app.init();
            
            console.log('🌌 Galaxy Explorer успешно запущен!');
            console.groupEnd();
            
            resolve(app);
            
        } catch (error) {
            console.error('❌ Критическая ошибка инициализации:', error);
            console.groupEnd();
            
            // Детализируем ошибку для пользователя
            const enhancedError = new Error(
                `Не удалось инициализировать Galaxy Explorer: ${error.message}\n\n` +
                `Возможные причины:\n` +
                `• Отсутствует canvas элемент с ID '${canvasId}'\n` +
                `• Не все модули приложения загружены\n` +
                `• Браузер не поддерживает необходимые функции (WebGL, ES6 модули)\n` +
                `• Ошибка в конфигурации приложения\n\n` +
                `Проверьте консоль разработчика для детальной диагностики.`
            );
            enhancedError.originalError = error;
            reject(enhancedError);
        }
    });
}

// Автоматическое определение готовности DOM
if (typeof window !== 'undefined' && !window.galaxyApp) {
    const initMessage = () => {
        console.group('📝 Galaxy Explorer - Информация для разработчика');
        console.log('🌌 Galaxy Explorer успешно загружен!');
        console.log('📋 Доступные команды:');
        console.log('   • initGalaxyExplorer() - запуск приложения');
        console.log('   • validateModules() - проверка целостности модулей');
        console.log('   • getAppExports() - структура приложения');
        console.log('   • window.galaxyApp - доступ к приложению (после инициализации)');
        console.log('');
        console.log('🚀 Чтобы запустить приложение, вызовите:');
        console.log('   initGalaxyExplorer("galaxy-canvas")');
        console.groupEnd();
    };

    // Ждем загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMessage);
    } else {
        // DOM уже загружен
        setTimeout(initMessage, 100);
    }
}

// Основной объект экспорта по умолчанию
export default {
    // Core Modules
    GalaxyApp,
    AppSystemsManager,
    AppUIManager,
    
    // Rendering Modules
    GalaxyDataLoader,
    GalaxyRenderer,
    CameraController,
    
    // Interaction Modules
    ProgressionTracker,
    EntityInteraction,
    
    // UI Modules
    UserPanel,
    MinimapNavigation,
    
    // Utils Modules
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