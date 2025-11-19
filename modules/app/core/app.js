// modules/app/app.js

// Импорт всех необходимых модулей с явными расширениями .js
import { GalaxyDataLoader } from './core/galaxy-data-loader.js';
import { GalaxyRenderer } from './core/galaxy-renderer.js';
import { CameraController } from './core/camera-controller.js';
import { ThreeSceneManager } from './core/three-scene-manager.js';
import { LODManager } from './core/lod-manager.js';
import { SpatialPartitioner } from './core/spatial-partitioner.js';
import { MemoryManager } from './core/memory-manager.js';
import { SecurityValidator } from './core/security-validator.js';

// Импорт Three.js
import * as THREE from './core/three.module.js';

// Импорт конфигурации
import { APP_CONFIG, ENTITY_COLORS, ENTITY_SIZES } from './constants/config.js';

// Импорт модулей взаимодействия
import { EntityInteraction } from './interaction/entity-interaction.js';
import { ProgressionTracker } from './interaction/progression-tracker.js';

// Импорт UI компонентов
import { UserPanel } from './ui/user-panel.js';
import { MinimapNavigation } from './ui/minimap-navigation.js';

// Импорт утилит
import { AssetManager } from './utils/asset-manager.js';
import { PerformanceOptimizer } from './utils/performance-optimizer.js';

// Метаданные приложения
export const VERSION = '3.0.0';
export const BUILD_DATE = '2024-01-01';
export const APP_NAME = 'Galaxy Explorer 3D';

// Главный класс приложения
class GalaxyApp {
    constructor(containerId = 'app-container') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with id '${containerId}' not found.`);
        }

        this.components = {};
        this.state = {
            isInitialized: false,
            is3DMode: true,
            currentQuality: 'medium',
            debugMode: false,
            sessionStart: Date.now()
        };

        // Базовый URL для динамических импортов (если понадобится)
        this.baseURL = window.location.origin;

        // Глобальная ссылка для отладки
        if (typeof window !== 'undefined') {
            window.galaxyApp = this;
        }
    }

    async init() {
        try {
            console.log('🚀 Initializing Galaxy Explorer 3D...');

            // 1. Проверка платформы
            await this.checkPlatform();

            // 2. Инициализация основных компонентов
            await this.initializeCoreComponents();

            // 3. Настройка взаимодействий
            this.setupComponentInteractions();

            // 4. Запуск основного цикла
            this.startMainLoop();

            this.state.isInitialized = true;
            console.log('✅ Galaxy Explorer 3D initialized successfully.');

            // Скрываем экран загрузки, если есть
            this.hideLoadingScreen();

        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showErrorScreen(error);
        }
    }

    async checkPlatform() {
        // Проверка поддержки WebGL
        if (!this.isWebGLAvailable()) {
            throw new Error('WebGL is not supported in your browser.');
        }

        // Проверка поддержки ES6 модулей
        if (!this.isES6Supported()) {
            throw new Error('ES6 modules are not supported in your browser.');
        }

        console.log('✅ Platform checks passed.');
    }

    isWebGLAvailable() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext &&
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    isES6Supported() {
        return 'noModule' in HTMLScriptElement.prototype;
    }

    async initializeCoreComponents() {
        // 1. Менеджер памяти (должен быть первым)
        this.components.memoryManager = new MemoryManager();

        // 2. Загрузчик данных
        this.components.dataLoader = new GalaxyDataLoader();
        const galaxyData = await this.components.dataLoader.load();

        // 3. Менеджер Three.js сцены
        this.components.sceneManager = new ThreeSceneManager(this.container);
        await this.components.sceneManager.init();

        // 4. Системы оптимизации
        this.components.lodManager = new LODManager();
        this.components.spatialPartitioner = new SpatialPartitioner();

        // 5. Рендерер
        this.components.renderer = new GalaxyRenderer(
            this.container,
            galaxyData,
            this.components.sceneManager,
            this.components.lodManager,
            this.components.spatialPartitioner
        );
        await this.components.renderer.init();

        // 6. Контроллер камеры
        this.components.cameraController = new CameraController(
            this.components.sceneManager.camera,
            this.components.sceneManager.renderer.domElement
        );

        // 7. Трекер прогресса
        this.components.progressionTracker = new ProgressionTracker(galaxyData);

        // 8. Взаимодействия
        this.components.interaction = new EntityInteraction(
            this.components.sceneManager.scene,
            this.components.sceneManager.camera,
            this.components.sceneManager.renderer,
            this.components.progressionTracker
        );

        // 9. Пользовательский интерфейс
        this.components.userPanel = new UserPanel(this, this.components.progressionTracker);
        this.components.minimap = new MinimapNavigation(
            galaxyData,
            this.components.cameraController,
            this.container
        );

        // 10. Оптимизатор производительности
        this.components.performanceOptimizer = new PerformanceOptimizer();

        console.log('✅ All components initialized.');
    }

    setupComponentInteractions() {
        // Камера -> Рендерер
        this.components.cameraController.onCameraUpdate = () => {
            this.components.renderer.requestRender();
        };

        // Взаимодействие -> Прогресс
        this.components.interaction.onEntitySelect = (entity) => {
            this.components.progressionTracker.discoverEntity(entity.id);
            this.components.userPanel.showEntitySelection(entity);
        };

        // Рендерер -> Оптимизатор
        this.components.renderer.onStatsUpdate = (stats) => {
            this.components.performanceOptimizer.updateStats(stats);
            this.components.userPanel.updateFPS(stats.fps);
        };

        // Оптимизатор -> LOD менеджер
        this.components.performanceOptimizer.onQualityAdjustment = (qualityLevel) => {
            this.components.lodManager.adaptLODBasedOnPerformance(qualityLevel);
            this.state.currentQuality = qualityLevel;
        };

        // Пользовательский интерфейс -> Основные компоненты
        this.components.userPanel.onQualityChange = (quality) => {
            this.setRenderQuality(quality);
        };

        this.components.userPanel.onViewChange = (viewType) => {
            this.components.cameraController.setView(viewType);
        };

        console.log('✅ Component interactions setup.');
    }

    startMainLoop() {
        const mainLoop = () => {
            if (!this.state.isInitialized) return;

            // 1. Обновление камеры (инерция, анимации)
            this.components.cameraController.update();

            // 2. Обновление видимых объектов
            const cameraPosition = this.components.sceneManager.camera.position;
            const frustum = this.components.sceneManager.camera.frustum;
            const visibleEntities = this.components.spatialPartitioner.getVisibleEntities(
                cameraPosition,
                frustum
            );

            // 3. Применение LOD к видимым объектам
            visibleEntities.forEach(entityId => {
                const entity = this.components.dataLoader.getEntityByPath(entityId);
                const mesh = this.components.renderer.findEntityMesh(entity);
                if (mesh) {
                    this.components.lodManager.updateLODForEntity(entity, mesh, cameraPosition);
                }
            });

            // 4. Рендеринг сцены
            this.components.renderer.render();

            // 5. Обновление UI
            this.components.minimap.render();

            // 6. Мониторинг производительности
            this.components.performanceOptimizer.monitorFrame();

            // 7. Управление памятью (периодически)
            if (this.frameCount % 300 === 0) {
                this.components.memoryManager.collectGarbage();
            }

            this.frameCount++;
            requestAnimationFrame(mainLoop);
        };

        this.frameCount = 0;
        mainLoop();
        console.log('✅ Main loop started.');
    }

    setRenderQuality(quality) {
        const qualityConfigs = {
            'low': {
                shadows: false,
                antialiasing: false,
                textureQuality: 'low',
                lodAggressiveness: 'high'
            },
            'medium': {
                shadows: true,
                antialiasing: false,
                textureQuality: 'medium',
                lodAggressiveness: 'medium'
            },
            'high': {
                shadows: true,
                antialiasing: true,
                textureQuality: 'high',
                lodAggressiveness: 'low'
            },
            'ultra': {
                shadows: true,
                antialiasing: true,
                textureQuality: 'ultra',
                lodAggressiveness: 'none'
            }
        };

        const config = qualityConfigs[quality];
        if (config) {
            this.components.renderer.setQualitySettings(config);
            this.components.lodManager.setAggressiveness(config.lodAggressiveness);
            this.state.currentQuality = quality;
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    showErrorScreen(error) {
        const errorHTML = `
            <div class="error-screen">
                <div class="error-content">
                    <h2>🚨 Ошибка загрузки</h2>
                    <p>${error.message}</p>
                    <div class="error-details">
                        <p><strong>Путь:</strong> ${window.location.href}</p>
                        <p><strong>Браузер:</strong> ${navigator.userAgent}</p>
                    </div>
                    <div class="error-actions">
                        <button onclick="location.reload()">🔄 Перезагрузить</button>
                        <button onclick="switchTo2DMode()">📱 2D Режим</button>
                    </div>
                </div>
            </div>
        `;

        // Если контейнер приложения существует, показываем ошибку в нем
        if (this.container) {
            this.container.innerHTML = errorHTML;
        } else {
            // Иначе в body
            document.body.innerHTML = errorHTML;
        }
    }

    destroy() {
        // Корректное освобождение ресурсов
        this.state.isInitialized = false;

        // Останавливаем все компоненты в правильном порядке
        if (this.components.performanceOptimizer) {
            this.components.performanceOptimizer.destroy();
        }

        if (this.components.interaction) {
            this.components.interaction.destroy();
        }

        if (this.components.renderer) {
            this.components.renderer.dispose();
        }

        if (this.components.sceneManager) {
            this.components.sceneManager.destroy();
        }

        if (this.components.memoryManager) {
            this.components.memoryManager.forceCleanup();
        }

        if (this.components.userPanel) {
            this.components.userPanel.destroy();
        }

        console.log('✅ GalaxyApp destroyed.');
    }
}

// Вспомогательные функции
export function getAppExports() {
    return {
        GalaxyApp,
        VERSION,
        BUILD_DATE,
        APP_NAME
    };
}

export function validateModules() {
    const requiredModules = [
        GalaxyDataLoader, GalaxyRenderer, CameraController, ThreeSceneManager,
        LODManager, SpatialPartitioner, MemoryManager, SecurityValidator,
        EntityInteraction, ProgressionTracker, UserPanel, MinimapNavigation,
        AssetManager, PerformanceOptimizer
    ];

    const missingModules = requiredModules.filter(module => !module);
    if (missingModules.length > 0) {
        console.warn('Missing modules:', missingModules);
        return false;
    }

    return true;
}

export async function initGalaxyExplorer(containerId = 'app-container') {
    try {
        const app = new GalaxyApp(containerId);
        await app.init();
        return app;
    } catch (error) {
        console.error('Failed to initialize Galaxy Explorer:', error);
        throw error;
    }
}

// Автоматическая инициализация при загрузке DOM
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, checking for auto-init...');
        // Автоматическая инициализация, если есть контейнер с id 'app-container'
        if (document.getElementById('app-container')) {
            initGalaxyExplorer().catch(console.error);
        }
    });
}

export default GalaxyApp;
