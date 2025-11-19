import GalaxyDataLoader from './galaxy-data-loader.js';
import GalaxyRenderer from './galaxy-renderer.js';
import { CameraController } from './camera-controller.js';
import { AppSystemsManager } from './app-systems.js';
import { AppUIManager } from './app-ui.js';
import { APP_CONFIG } from '../constants/config.js';

export class GalaxyApp {
    constructor() {
        // Основные компоненты приложения
        this.dataLoader = null;
        this.renderer = null;
        this.camera = null;
        this.systemsManager = null;
        this.uiManager = null;
        
        this.isInitialized = false;
        this.galaxyData = null;
        this.animationFrameId = null;
        
        // Инициализируем менеджеры
        this.systemsManager = new AppSystemsManager(this);
        this.uiManager = new AppUIManager(this);
        
        // Состояние приложения
        this.appState = {
            is3DMode: true,
            isAnimating: false,
            currentView: 'galaxy',
            selectedEntity: null,
            debugMode: false,
            performanceMode: 'balanced'
        };
        
        console.log('📱 GalaxyApp создан с менеджерами систем');
    }

    async init() {
        console.log('🚀 Инициализация Galaxy Explorer...');
        
        try {
            // 1. Инициализируем диагностику через UI менеджер
            await this.uiManager.initDiagnostics();
            
            // 2. Загружаем данные галактики
            this.updateLoadingStatus('Загрузка данных галактики...');
            this.dataLoader = new GalaxyDataLoader();
            this.galaxyData = await this.dataLoader.loadWith3DLayout();
            
            if (!this.galaxyData) {
                throw new Error('Не удалось загрузить данные галактики');
            }

            // 3. Инициализируем 3D системы
            this.updateLoadingStatus('Инициализация 3D графики...');
            this.renderer = new GalaxyRenderer('galaxy-canvas');
            await this.renderer.init();
            
            this.camera = new CameraController(
                this.renderer.sceneManager.camera,
                this.renderer.sceneManager
            );
            this.camera.init(this.renderer.canvas);
            
            // 4. Создаем 3D объекты
            this.updateLoadingStatus('Создание 3D объектов...');
            this.create3DGalaxyFromData();
            
            // 5. Инициализируем системы ядра
            await this.systemsManager.init(this.galaxyData);
            
            // 6. Инициализируем UI системы
            await this.uiManager.init(this.galaxyData, this.renderer, this.camera);
            
            // 7. Запускаем рендеринг
            this.updateLoadingStatus('Запуск 3D визуализации...');
            this.startRendering();
            
            this.isInitialized = true;
            console.log('✅ Galaxy Explorer успешно инициализирован');
            
            this.uiManager.hideLoadingScreen();
            this.animateEntrance();

        } catch (error) {
            console.error('❌ Ошибка инициализации приложения:', error);
            this.uiManager.showError(error);
        }
    }

    create3DGalaxyFromData() {
        if (!this.galaxyData || !this.renderer) return;

        console.log('🌌 Создание 3D галактики из данных...');

        // Создаем центральную звезду (галактику)
        const galaxyPosition = { x: 0, y: 0, z: 0 };
        this.renderer.createEntityMesh(this.galaxyData, galaxyPosition);

        // Создаем планеты и их спутники
        if (this.galaxyData.children) {
            this.galaxyData.children.forEach((planet, planetIndex) => {
                const planetPosition = this.galaxyData.threeData?.orbitalLayers?.[planetIndex]?.planets?.[0]?.position || 
                                    this.dataLoader.getEntity3DPosition(planet.cleanPath);
                
                this.renderer.createEntityMesh(planet, planetPosition);

                // Создаем спутники
                if (planet.children) {
                    planet.children.forEach((moon, moonIndex) => {
                        const moonPosition = this.galaxyData.threeData?.orbitalLayers?.[planetIndex]?.planets?.[moonIndex + 1]?.position || 
                                           this.dataLoader.getEntity3DPosition(moon.cleanPath);
                        this.renderer.createEntityMesh(moon, moonPosition);
                    });
                }
            });
        }

        console.log('✅ 3D галактика создана');
    }

    // УПРАВЛЕНИЕ ЖИЗНЕННЫМ ЦИКЛОМ ========================================

    startRendering() {
        if (this.animationFrameId) this.stopRendering();

        const renderLoop = (timestamp) => {
            if (this.isInitialized) {
                // Обновляем системы
                this.systemsManager.update();
                
                // Рендерим сцену
                this.renderer.render(this.galaxyData, this.camera);
                
                // Обновляем UI
                this.uiManager.update();
                
                // Проверяем необходимость троттлинга
                if (!this.systemsManager.shouldThrottle()) {
                    this.animationFrameId = requestAnimationFrame(renderLoop);
                } else {
                    const delay = this.systemsManager.getThrottleDelay();
                    setTimeout(() => {
                        this.animationFrameId = requestAnimationFrame(renderLoop);
                    }, delay);
                }
            }
        };
        
        this.animationFrameId = requestAnimationFrame(renderLoop);
        console.log('🎬 Цикл рендеринга запущен');
    }

    stopRendering() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            console.log('⏸️ Цикл рендеринга остановлен');
        }
    }

    animateEntrance() {
        console.log('🎬 Запуск анимации входа...');
        
        if (this.camera?.setInitialView) {
            this.camera.setInitialView();
        }
        
        if (this.renderer?.animateEntrance) {
            this.renderer.animateEntrance();
        }
        
        this.uiManager.showWelcomeMessage(this.galaxyData?.name);
        this.appState.isAnimating = true;
    }

    updateLoadingStatus(message) {
        this.uiManager.updateLoadingStatus(message);
    }

    // PUBLIC API - Делегирование к менеджерам ============================

    resetView() {
        if (this.isInitialized && this.camera?.reset) {
            this.camera.reset();
            console.log('🗺️ Камера сброшена к обзору');
        }
    }

    toggleOrbits() {
        return this.uiManager.toggleOrbits();
    }

    toggleLabels() {
        return this.uiManager.toggleLabels();
    }

    toggleGrid() {
        return this.uiManager.toggleGrid();
    }

    toggleMinimap() {
        return this.uiManager.toggleMinimap();
    }

    toggleDebugMode() {
        return this.uiManager.toggleDebugMode();
    }

    toggleAnimation() {
        this.appState.isAnimating = !this.appState.isAnimating;
        this.uiManager.showNotification(`Анимация: ${this.appState.isAnimating ? 'включена' : 'выключена'}`);
        return this.appState.isAnimating;
    }

    setPerformanceMode(mode) {
        return this.systemsManager.setPerformanceMode(mode);
    }

    cyclePerformanceMode() {
        return this.systemsManager.cyclePerformanceMode();
    }

    setLODQuality(quality) {
        return this.systemsManager.setLODQuality(quality);
    }

    forceGarbageCollection() {
        return this.systemsManager.forceGarbageCollection();
    }

    toggleSpatialPartitioning(enabled) {
        return this.systemsManager.toggleSpatialPartitioning(enabled);
    }

    // ДИАГНОСТИКА И ИНФОРМАЦИЯ ===========================================

    getDiagnostics() {
        return this.uiManager.getDiagnostics();
    }

    getPerformanceStats() {
        return this.systemsManager.getPerformanceStats();
    }

    getAppState() {
        return { ...this.appState };
    }

    getGalaxyData() {
        return this.galaxyData;
    }

    forceRedraw() {
        if (this.isInitialized && this.renderer?.render) {
            this.renderer.render(this.galaxyData, this.camera);
            console.log('🔄 Принудительная перерисовка сцены');
        }
    }

    // ОЧИСТКА РЕСУРСОВ ===================================================

    destroy() {
        this.stopRendering();
        this.isInitialized = false;
        
        // Очищаем менеджеры
        this.systemsManager.destroy();
        this.uiManager.destroy();

        // Очищаем основные компоненты
        if (this.renderer?.dispose) this.renderer.dispose();
        if (this.camera?.destroy) this.camera.destroy();
        if (this.dataLoader?.destroy) this.dataLoader.destroy();
        
        console.log('🧹 GalaxyApp уничтожен, все ресурсы освобождены');
    }
}


export default GalaxyApp;
