// Автономный app.js - все модули в одном файле
class PerformanceOptimizer {
    constructor() {
        this.metrics = { fps: 60, frameTime: 16.67 };
        console.log('⚡ PerformanceOptimizer создан');
    }
    update() { return this.metrics; }
    optimizeEntities(entities) { return entities; }
    getMetrics() { return this.metrics; }
}

class AssetManager {
    constructor() {
        this.cache = new Map();
        console.log('📦 AssetManager создан');
    }
    loadImage(url) { 
        return Promise.resolve();
    }
}

class ProgressionTracker {
    constructor() {
        this.progress = new Set();
        console.log('📊 ProgressionTracker создан');
    }
    markExplored(id) {
        this.progress.add(id);
        localStorage.setItem('galaxyProgress', JSON.stringify([...this.progress]));
    }
    getProgress() {
        return this.progress.size;
    }
}

class EntityInteraction {
    constructor() {
        console.log('🖱️ EntityInteraction создан');
    }
    setupInteractions() {}
}

class UserPanel {
    constructor() {
        console.log('👤 UserPanel создан');
    }
    render() {
        return '<div class="user-panel">Панель пользователя</div>';
    }
}

class MinimapNavigation {
    constructor() {
        console.log('🗺️ MinimapNavigation создан');
    }
    update() {}
}

// Константы
const APP_CONFIG = {
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

const ENTITY_COLORS = APP_CONFIG.colors;
const ENTITY_SIZES = APP_CONFIG.sizes;

// Основные модули (заглушки - замените на реальные реализации)
class GalaxyApp {
    constructor() {
        console.log('🌌 GalaxyApp создан');
    }
    async init() {
        console.log('🚀 GalaxyApp инициализирован');
        return this;
    }
}

class GalaxyDataLoader {
    constructor() {
        console.log('📡 GalaxyDataLoader создан');
    }
    async loadData() {
        return { entities: [] };
    }
}

class GalaxyRenderer {
    constructor() {
        console.log('🎨 GalaxyRenderer создан');
    }
    render() {}
}

class CameraController {
    constructor() {
        console.log('📷 CameraController создан');
    }
}

// Метаданные
const VERSION = '1.0.0';
const BUILD_DATE = '2024-01-01';
const APP_NAME = 'Galaxy Explorer';

// Основная функция инициализации
function initGalaxyExplorer(canvasId = 'galaxy-canvas') {
    console.log('🚀 Инициализация Galaxy Explorer...');
    
    return new Promise(async (resolve, reject) => {
        try {
            // Создаем главное приложение
            const app = new GalaxyApp();
            
            // Сохраняем глобальную ссылку для отладки
            window.galaxyApp = app;
            
            // Инициализируем приложение
            await app.init();
            
            console.log('🌌 Galaxy Explorer успешно запущен!');
            
            // Создаем базовый интерфейс если canvas не существует
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                createFallbackInterface();
            }
            
            resolve(app);
            
        } catch (error) {
            console.error('❌ Ошибка инициализации Galaxy Explorer:', error);
            createErrorInterface(error);
            reject(error);
        }
    });
}

// Создание fallback интерфейса
function createFallbackInterface() {
    const container = document.createElement('div');
    container.innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
            <h1>🌌 Galaxy Explorer</h1>
            <p>Приложение готово к работе!</p>
            <p>Для полноценной работы убедитесь, что:</p>
            <ul style="text-align: left; display: inline-block;">
                <li>Файл sitemap.json доступен</li>
                <li>Все модули загружены</li>
                <li>Браузер поддерживает Canvas</li>
            </ul>
            <button onclick="window.galaxyApp?.init()" style="padding: 10px 20px; margin: 10px;">
                Перезапустить приложение
            </button>
        </div>
    `;
    document.body.appendChild(container);
}

// Создание интерфейса ошибки
function createErrorInterface(error) {
    const container = document.createElement('div');
    container.innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif; color: red;">
            <h1>❌ Ошибка запуска Galaxy Explorer</h1>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="padding: 10px 20px; margin: 10px;">
                Перезагрузить страницу
            </button>
        </div>
    `;
    document.body.appendChild(container);
}

// Проверка доступности модулей
function validateModules() {
    const modules = {
        'GalaxyApp': typeof GalaxyApp !== 'undefined',
        'GalaxyDataLoader': typeof GalaxyDataLoader !== 'undefined',
        'GalaxyRenderer': typeof GalaxyRenderer !== 'undefined', 
        'CameraController': typeof CameraController !== 'undefined',
        'PerformanceOptimizer': typeof PerformanceOptimizer !== 'undefined',
        'AssetManager': typeof AssetManager !== 'undefined'
    };

    const allLoaded = Object.values(modules).every(loaded => loaded);
    const loadedCount = Object.values(modules).filter(loaded => loaded).length;
    const totalCount = Object.keys(modules).length;

    console.log('🔍 Проверка модулей приложения:');
    console.log(`📦 Загружено: ${loadedCount}/${totalCount} модулей`);
    
    Object.entries(modules).forEach(([name, loaded]) => {
        console.log(`   ${loaded ? '✅' : '❌'} ${name}`);
    });

    return { allLoaded, loadedCount, totalCount, modules };
}

// Авто-инициализация при загрузке
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📝 Galaxy Explorer: DOM готов');
        
        // Автоматически запускаем если есть canvas
        if (document.getElementById('galaxy-canvas')) {
            setTimeout(() => {
                console.log('🎯 Автозапуск Galaxy Explorer...');
                initGalaxyExplorer().catch(console.error);
            }, 1000);
        } else {
            console.log('💡 Для запуска вызовите: initGalaxyExplorer()');
        }
    });
}

// Экспорт для использования как модуля
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
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
}

// Глобальный экспорт для браузера
window.GalaxyExplorer = {
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

console.log('✅ Galaxy Explorer загружен! Вызовите initGalaxyExplorer() для запуска.');
