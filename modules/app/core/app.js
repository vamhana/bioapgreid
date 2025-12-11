// modules/app/core/app.js
import GalaxyDataLoader from './galaxy-data-loader.js';
import GalaxyRenderer from './galaxy-renderer.js';
import CameraController from './camera-controller.js';
import ProgressionTracker from '../interaction/progression-tracker.js';
import EntityInteraction from '../interaction/entity-interaction.js';
import UserPanel from '../ui/user-panel.js';
import MinimapNavigation from '../ui/minimap-navigation.js';
import AssetManager from '../utils/asset-manager.js';
import PerformanceOptimizer from '../utils/performance-optimizer.js';

export class GalaxyApp {
    constructor() {
        // Основные компоненты приложения
        this.dataLoader = null;
        this.renderer = null;
        this.camera = null;
        this.progression = null;
        this.entityInteraction = null;
        this.userPanel = null;
        this.minimap = null;
        this.assetManager = null;
        this.performanceOptimizer = null;
        
        this.isInitialized = false;
        this.galaxyData = null;
        this.animationFrameId = null;
        
        // Состояние приложения
        this.appState = {
            is3DMode: true,
            isAnimating: false,
            currentView: 'galaxy',
            selectedEntity: null,
            debugMode: false
        };
        
        // Диагностические данные
        this.diagnostics = {
            platform: this.detectPlatform(),
            userAgent: navigator.userAgent,
            supportsES6: 'noModule' in HTMLScriptElement.prototype,
            isOnline: navigator.onLine,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            pixelRatio: window.devicePixelRatio,
            touchSupport: 'ontouchstart' in window,
            memory: navigator.deviceMemory || 'unknown',
            webGL: this.detectWebGLSupport(),
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled
        };
        
        console.log('📱 GalaxyApp создан с диагностикой:', this.diagnostics);
    }

    async init() {
        console.log('🚀 Инициализация Galaxy Explorer с Three.js...');
        console.log('📱 Платформа:', this.diagnostics.platform);
        console.log('🖥️  Размер экрана:', this.diagnostics.screenSize);
        console.log('🔧 Поддержка ES6:', this.diagnostics.supportsES6);
        console.log('🌐 Онлайн статус:', this.diagnostics.isOnline);
        console.log('🎨 WebGL поддержка:', this.diagnostics.webGL);
        
        const loadingElement = document.getElementById('loading');
        
        try {
            // Обновляем статус загрузки
            if (loadingElement) {
                loadingElement.innerHTML = `
                    <div class="loading-spinner"></div>
                    <div>Загрузка 3D галактики...</div>
                    <div style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
                        Платформа: ${this.diagnostics.platform}<br>
                        Экран: ${this.diagnostics.screenSize}<br>
                        WebGL: ${this.diagnostics.webGL ? '✅' : '❌'}
                    </div>
                `;
            }

            // Проверяем поддержку ES6 модулей
            if (!this.diagnostics.supportsES6) {
                throw new Error('Ваш браузер не поддерживает ES6 модули. Пожалуйста, обновите браузер.');
            }

            // Проверяем WebGL поддержку
            if (!this.diagnostics.webGL) {
                console.warn('⚠️ WebGL не поддерживается, некоторые функции могут быть недоступны');
                // Можно добавить fallback на Canvas 2D
            }

            // Проверяем онлайн статус
            if (!this.diagnostics.isOnline) {
                console.warn('⚠️ Приложение запускается в оффлайн режиме');
            }

            // Инициализируем основные компоненты
            this.updateLoadingStatus('Инициализация системы...');
            
            // 1. Загружаем данные галактики
            this.updateLoadingStatus('Загрузка данных галактики...');
            this.dataLoader = new GalaxyDataLoader();
            const result = await this.dataLoader.load();
            
            if (!result || !result.success) {
                throw new Error('Не удалось загрузить данные галактики. Проверьте подключение к интернету.');
            }
            
            this.galaxyData = result.data;
            
            console.log('✅ Данные галактики загружены:', {
                name: this.galaxyData.name,
                entities: this.dataLoader.getGalaxyStats().totalEntities,
                has3DData: !!this.galaxyData.threeData
            });

            // 2. Инициализируем Three.js рендерер
            this.updateLoadingStatus('Инициализация 3D графики...');
            this.renderer = new GalaxyRenderer('galaxy-canvas');
            await this.renderer.init();
            
            // 3. Инициализируем 3D камеру
            this.updateLoadingStatus('Настройка 3D камеры...');
            this.camera = new CameraController(
                this.renderer.sceneManager.camera,
                this.renderer.sceneManager
            );
            this.camera.init(this.renderer.canvas);
            
            // 4. Создаем 3D объекты галактики
            this.updateLoadingStatus('Создание 3D объектов...');
            this.create3DGalaxyFromData();
            
            // 5. Инициализируем систему прогресса
            this.updateLoadingStatus('Загрузка прогресса...');
            this.progression = new ProgressionTracker();
            await this.progression.init(this.galaxyData);
            
            // 6. Инициализируем взаимодействия
            this.updateLoadingStatus('Настройка взаимодействий...');
            this.entityInteraction = new EntityInteraction();
            this.entityInteraction.init(this.renderer, this.progression, this.camera);
            this.entityInteraction.setGalaxyData(this.galaxyData);
            
            // 7. Инициализируем UI компоненты
            this.updateLoadingStatus('Инициализация интерфейса...');
            this.userPanel = new UserPanel();
            this.userPanel.init(this.progression);
            
            this.minimap = new MinimapNavigation();
            this.minimap.init(this.galaxyData, this.camera);
            
            // 8. Инициализируем менеджер ресурсов
            this.updateLoadingStatus('Предзагрузка ресурсов...');
            this.assetManager = new AssetManager();
            await this.assetManager.preloadAssets(this.getRequiredAssets());
            
            // 9. Инициализируем оптимизатор производительности
            this.performanceOptimizer = new PerformanceOptimizer();
            
            // Настраиваем обработчики событий
            this.updateLoadingStatus('Настройка взаимодействий...');
            this.setupEventListeners();
            
            // Запускаем рендеринг
            this.updateLoadingStatus('Запуск 3D визуализации...');
            this.startRendering();
            
            // Обновляем интерфейс
            this.updateProgressDisplay();
            this.updateUI();

            this.isInitialized = true;
            
            console.log('✅ Galaxy Explorer успешно инициализирован с Three.js');
            this.hideLoadingScreen();

            // Запускаем анимацию входа
            this.animateEntrance();

        } catch (error) {
            console.error('❌ Ошибка инициализации приложения:', error);
            this.showError(error);
        }
    }

    create3DGalaxyFromData() {
        if (!this.galaxyData || !this.renderer) {
            console.error('❌ Нет данных или рендерера для создания 3D галактики');
            return;
        }

        console.log('🌌 Создание 3D галактики из данных...');

        // Создаем центральную звезду (галактику)
        const galaxyPosition = { x: 0, y: 0, z: 0 };
        this.renderer.createEntityMesh(this.galaxyData, galaxyPosition);

        // Создаем планеты и их спутники
        if (this.galaxyData.children) {
            this.galaxyData.children.forEach((planet, planetIndex) => {
                // Используем позиции из threeData если есть, иначе генерируем
                const planetPosition = this.dataLoader.getEntity3DPosition(planet.cleanPath) || 
                                    { x: (planetIndex - 2) * 200, y: 0, z: 0 };
                
                const planetMesh = this.renderer.createEntityMesh(planet, planetPosition);

                // Создаем спутники
                if (planet.children) {
                    planet.children.forEach((moon, moonIndex) => {
                        const moonPosition = this.dataLoader.getEntity3DPosition(moon.cleanPath) || 
                                           { 
                                               x: planetPosition.x + (moonIndex - 1) * 60, 
                                               y: 0, 
                                               z: planetPosition.z + 20 
                                           };
                        
                        this.renderer.createEntityMesh(moon, moonPosition);
                    });
                }
            });
        }

        console.log('✅ 3D галактика создана:', {
            totalMeshes: this.renderer.entityMeshes.size,
            hasStarfield: true,
            hasLighting: true
        });
    }

    updateLoadingStatus(message) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            const statusElement = loadingElement.querySelector('div:nth-child(2)');
            if (statusElement) {
                statusElement.textContent = message;
            }
        }
        console.log('📦 ' + message);
    }

    setupEventListeners() {
        // Обработчики resize
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);

        // Обработчики видимости страницы
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        // Обработчики касаний для мобильных устройств
        if (this.diagnostics.touchSupport) {
            this.setupTouchEvents();
        }

        // Обработчики клавиатуры
        this.handleKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this.handleKeyDown);

        // Обработчики колеса мыши для зума
        this.handleWheel = this.handleWheel.bind(this);
        if (this.renderer && this.renderer.canvas) {
            this.renderer.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
        }

        // Обработчики кликов по 3D объектам
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        if (this.renderer && this.renderer.canvas) {
            this.renderer.canvas.addEventListener('click', this.handleCanvasClick);
        }

        // Обработчики движения мыши для ховера
        this.handleMouseMove = this.handleMouseMove.bind(this);
        if (this.renderer && this.renderer.canvas) {
            this.renderer.canvas.addEventListener('mousemove', this.handleMouseMove);
        }

        // Обработчики контекстного меню (блокировка)
        this.handleContextMenu = this.handleContextMenu.bind(this);
        if (this.renderer && this.renderer.canvas) {
            this.renderer.canvas.addEventListener('contextmenu', this.handleContextMenu);
        }

        console.log('🎮 Обработчики событий Three.js установлены');
    }

    setupTouchEvents() {
        const canvas = this.renderer?.canvas;
        if (!canvas) return;
        
        canvas.addEventListener('touchstart', (event) => {
            event.preventDefault();
            if (this.entityInteraction && this.entityInteraction.handleTouchStart) {
                this.entityInteraction.handleTouchStart(event);
            }
        });

        canvas.addEventListener('touchmove', (event) => {
            event.preventDefault();
            if (this.entityInteraction && this.entityInteraction.handleTouchMove) {
                this.entityInteraction.handleTouchMove(event);
            }
        });

        canvas.addEventListener('touchend', (event) => {
            if (this.entityInteraction && this.entityInteraction.handleTouchEnd) {
                this.entityInteraction.handleTouchEnd(event);
            }
        });

        console.log('👆 Обработчики касаний настроены для мобильных устройств');
    }

    handleKeyDown(event) {
        // Игнорируем сочетания клавиш с Ctrl/Alt/Meta
        if (event.ctrlKey || event.altKey || event.metaKey) return;

        switch (event.key) {
            case '+':
            case '=':
                this.camera?.zoom(0.1);
                break;
            case '-':
                this.camera?.zoom(-0.1);
                break;
            case '0':
                this.resetView();
                break;
            case 'r':
            case 'к': // Русская Р
                this.resetView();
                break;
            case 'o':
            case 'щ': // Русская О
                this.toggleOrbits();
                break;
            case 'm':
            case 'ь': // Русская М
                this.toggleMinimap();
                break;
            case 'l':
            case 'д': // Русская Л
                this.toggleLabels();
                break;
            case 'g':
            case 'п': // Русская Г
                this.toggleGrid();
                break;
            case 'd':
            case 'в': // Русская Д
                this.toggleDebugMode();
                break;
            case 'Escape':
                this.resetView();
                break;
            case ' ':
                event.preventDefault();
                this.toggleAnimation();
                break;
        }
    }

    handleWheel(event) {
        event.preventDefault();
        this.camera?.handleWheel(event);
    }

    handleCanvasClick(event) {
        if (!this.renderer || !this.camera) return;
        
        const rect = this.renderer.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const entityData = this.renderer.getEntityAtScreenPoint(x, y);
        if (entityData && this.entityInteraction && this.entityInteraction.handleEntityClick) {
            this.entityInteraction.handleEntityClick(entityData);
            this.appState.selectedEntity = entityData;
        }
    }

    handleMouseMove(event) {
        if (!this.renderer || !this.camera) return;
        
        const rect = this.renderer.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const entityData = this.renderer.getEntityAtScreenPoint(x, y);
        if (this.entityInteraction && this.entityInteraction.handleMouseOver) {
            this.entityInteraction.handleMouseOver(entityData);
        }
    }

    handleContextMenu(event) {
        event.preventDefault(); // Блокируем контекстное меню
    }

    handleResize() {
        this.diagnostics.screenSize = `${window.innerWidth}x${window.innerHeight}`;
        console.log('🔄 Изменение размера экрана:', this.diagnostics.screenSize);
        
        if (this.renderer && this.renderer.resize) {
            this.renderer.resize();
        }
        
        if (this.camera && this.camera.handleResize) {
            this.camera.handleResize();
        }
        
        // Перерисовываем сцену
        if (this.isInitialized) {
            this.forceRedraw();
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            console.log('⏸️  Страница скрыта, приостанавливаем анимацию');
            this.stopRendering();
        } else {
            console.log('▶️  Страница видима, возобновляем анимацию');
            this.startRendering();
        }
    }

    startRendering() {
        if (this.animationFrameId) {
            this.stopRendering();
        }

        const renderLoop = () => {
            if (!this.isInitialized || !this.isRenderingActive()) return;
            
            // Обновляем оптимизатор производительности
            if (this.performanceOptimizer && this.performanceOptimizer.update) {
                this.performanceOptimizer.update();
            }
            
            // Обновляем анимации если включены
            if (this.appState.isAnimating) {
                this.updateAnimations();
            }
            
            // Обновляем камеру если нужно
            if (this.camera && this.camera.update) {
                this.camera.update();
            }
            
            // Обновляем миникарту если нужно
            if (this.minimap && this.minimap.isVisible && this.minimap.render) {
                this.minimap.render();
            }
            
            // Обновляем статистику производительности
            this.updatePerformanceStats();
            
            // Запускаем следующий кадр
            this.animationFrameId = requestAnimationFrame(renderLoop);
        };
        
        this.animationFrameId = requestAnimationFrame(renderLoop);
        console.log('🎬 Цикл 3D рендеринга запущен');
    }

    stopRendering() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            console.log('⏸️  Цикл рендеринга остановлен');
        }
    }

    isRenderingActive() {
        return this.isInitialized && !document.hidden;
    }

    updateAnimations() {
        // Анимации объектов обновляются внутри GalaxyRenderer
        // Здесь можем добавить общие анимации если нужно
    }

    updatePerformanceStats() {
        if (this.performanceOptimizer && this.performanceOptimizer.updateStats && this.renderer) {
            const rendererStats = this.renderer.getPerformanceInfo();
            this.performanceOptimizer.updateStats({
                fps: rendererStats.fps,
                frameTime: parseFloat(rendererStats.frameTime) || 0,
                memory: this.dataLoader?.getStats?.()?.cache || {}
            });
        }
    }

    animateEntrance() {
        console.log('🎬 Запуск анимации входа Three.js...');
        
        // Анимация плавного появления камеры
        if (this.camera && this.camera.setInitialView) {
            this.camera.setInitialView();
        }
        
        // Запускаем анимацию входа рендерера
        if (this.renderer && this.renderer.animateEntrance) {
            this.renderer.animateEntrance();
        }
        
        // Показываем приветственное сообщение
        this.showWelcomeMessage();
        
        this.appState.isAnimating = true;
        
        console.log('✅ Анимация входа запущена');
    }

    showWelcomeMessage() {
        // Создаем стили если их нет
        if (!document.querySelector('#welcome-styles')) {
            const style = document.createElement('style');
            style.id = 'welcome-styles';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                }
                .welcome-message {
                    position: fixed;
                    top: 20%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(12, 12, 46, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(78, 205, 196, 0.3);
                    border-radius: 15px;
                    padding: 20px;
                    color: white;
                    text-align: center;
                    z-index: 1001;
                    max-width: 300px;
                    animation: fadeInOut 3s ease-in-out;
                }
            `;
            document.head.appendChild(style);
        }
        
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'welcome-message';
        
        const touchInstructions = this.diagnostics.touchSupport ? 
            'Используйте касания для навигации' : 
            'Используйте колесо мыши для зума';
        
        welcomeMessage.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #4ECDC4;">🌌 Добро пожаловать в 3D галактику!</h3>
            <p style="margin: 0; font-size: 14px;">Исследуйте галактику ${this.galaxyData?.name || '3D'}</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.7;">
                ${touchInstructions}<br>
                Нажмите O для переключения орбит<br>
                Нажмите L для переключения меток<br>
                Нажмите G для переключения сетки<br>
                Нажмите D для отладки
            </p>
        `;
        
        document.body.appendChild(welcomeMessage);
        
        // Удаляем сообщение через 3 секунды
        setTimeout(() => {
            if (welcomeMessage.parentNode) {
                welcomeMessage.parentNode.removeChild(welcomeMessage);
            }
        }, 3000);
    }

    hideLoadingScreen() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            loadingElement.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                loadingElement.style.display = 'none';
            }, 500);
        }
    }

    // Методы определения платформы
    detectPlatform() {
        const ua = navigator.userAgent;
        if (/Android/.test(ua)) return 'Android';
        if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
        if (/Windows/.test(ua)) return 'Windows';
        if (/Mac/.test(ua)) return 'Mac';
        if (/Linux/.test(ua)) return 'Linux';
        if (/CrOS/.test(ua)) return 'Chrome OS';
        return 'Unknown';
    }

    detectWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    getRequiredAssets() {
        return [
            // Можно добавить пути к текстурам или другим ресурсам
        ];
    }

    showError(error) {
        console.error('🚨 Критическая ошибка:', error);
        
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div style="color: #ff6b6b; font-size: 24px; margin-bottom: 15px;">❌ Ошибка загрузки 3D</div>
                <div style="margin: 10px 0; font-size: 16px; background: rgba(255,107,107,0.1); padding: 10px; border-radius: 5px;">
                    ${error.message}
                </div>
                <div style="font-size: 12px; opacity: 0.7; margin: 10px 0;">
                    <strong>Диагностика:</strong><br>
                    Платформа: ${this.diagnostics.platform}<br>
                    Онлайн: ${this.diagnostics.isOnline ? '✅' : '❌'}<br>
                    ES6 модули: ${this.diagnostics.supportsES6 ? '✅' : '❌'}<br>
                    WebGL: ${this.diagnostics.webGL ? '✅' : '❌'}<br>
                    Касания: ${this.diagnostics.touchSupport ? '✅' : '❌'}
                </div>
                <button class="retry-btn" onclick="window.location.reload()" style="
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 20px;
                    cursor: pointer;
                    margin-top: 15px;
                    font-weight: bold;
                ">🔄 Перезагрузить</button>
                <div style="margin-top: 15px; font-size: 12px; opacity: 0.7;">
                    Если проблема повторяется, откройте<br>
                    <a href="/module-test.html" style="color: #4ECDC4;">тестовую страницу</a> для диагностики
                </div>
            `;
        }
        
        // Отправляем ошибку в консоль для отладки
        if (window.console && console.error) {
            console.error('GalaxyApp Error:', error);
            console.error('Diagnostics:', this.diagnostics);
        }
    }

    // Public API methods
    resetView() {
        if (this.isInitialized && this.camera && this.camera.reset) {
            this.camera.reset();
            console.log('🗺️ 3D камера сброшена к обзору');
        }
    }

    toggleOrbits() {
        if (this.isInitialized && this.renderer && this.renderer.setOrbitDisplay) {
            this.renderer.setOrbitDisplay(!this.renderer.config.showOrbits);
            const orbitsVisible = this.renderer.config.showOrbits;
            console.log('🔄 Отображение орбит:', orbitsVisible ? 'вкл' : 'выкл');
            
            this.showNotification(`Орбиты: ${orbitsVisible ? 'включены' : 'выключены'}`);
        }
    }

    toggleLabels() {
        if (this.isInitialized && this.renderer && this.renderer.setLabelDisplay) {
            this.renderer.setLabelDisplay(!this.renderer.config.showLabels);
            const labelsVisible = this.renderer.config.showLabels;
            console.log('🏷️ Отображение меток:', labelsVisible ? 'вкл' : 'выкл');
            
            this.showNotification(`Метки: ${labelsVisible ? 'включены' : 'выключены'}`);
        }
    }

    toggleGrid() {
        if (this.isInitialized && this.renderer && this.renderer.setGridDisplay) {
            this.renderer.setGridDisplay(!this.renderer.config.showGrid);
            const gridVisible = this.renderer.config.showGrid;
            console.log('📐 Отображение сетки:', gridVisible ? 'вкл' : 'выкл');
            
            this.showNotification(`Сетка: ${gridVisible ? 'включена' : 'выключена'}`);
        }
    }

    toggleMinimap() {
        if (this.isInitialized && this.minimap && this.minimap.toggleVisibility) {
            this.minimap.toggleVisibility();
            const minimapVisible = this.minimap.isVisible;
            console.log('🗺️ Миникарта:', minimapVisible ? 'вкл' : 'выкл');
            
            this.showNotification(`Миникарта: ${minimapVisible ? 'включена' : 'выключена'}`);
        }
    }

    toggleDebugMode() {
        this.appState.debugMode = !this.appState.debugMode;
        console.log('🐛 Режим отладки:', this.appState.debugMode ? 'вкл' : 'выкл');
        
        if (this.appState.debugMode) {
            this.showDebugInfo();
        }
        
        this.showNotification(`Режим отладки: ${this.appState.debugMode ? 'включен' : 'выключен'}`);
    }

    toggleAnimation() {
        this.appState.isAnimating = !this.appState.isAnimating;
        console.log('🎬 Анимация:', this.appState.isAnimating ? 'вкл' : 'выкл');
        
        this.showNotification(`Анимация: ${this.appState.isAnimating ? 'включена' : 'выключена'}`);
    }

    showDebugInfo() {
        if (!this.renderer || !this.dataLoader) return;
        
        const rendererInfo = this.renderer.getRendererInfo ? this.renderer.getRendererInfo() : {};
        const performanceInfo = this.renderer.getPerformanceInfo ? this.renderer.getPerformanceInfo() : {};
        const dataLoaderStats = this.dataLoader.getStats ? this.dataLoader.getStats() : {};
        
        console.group('🐛 Debug Information');
        console.log('🎨 Renderer:', rendererInfo);
        console.log('⚡ Performance:', performanceInfo);
        console.log('📊 Data Loader:', dataLoaderStats);
        console.log('🎥 Camera:', this.camera ? this.camera.getCameraInfo() : {});
        console.log('🌌 Galaxy Data:', {
            entities: this.dataLoader.getGalaxyStats()?.totalEntities,
            has3DData: !!this.galaxyData?.threeData
        });
        console.groupEnd();
    }

    showNotification(message, duration = 2000) {
        // Создаем стили если их нет
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); }
                    to { transform: translateX(100%); }
                }
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(12, 12, 46, 0.9);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(78, 205, 196, 0.3);
                    border-radius: 10px;
                    padding: 15px 20px;
                    color: white;
                    z-index: 1002;
                    animation: slideIn 0.3s ease, slideOut 0.3s ease ${duration}ms forwards;
                    max-width: 300px;
                }
            `;
            document.head.appendChild(style);
        }
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Удаляем уведомление после анимации
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration + 300);
    }

    updateProgressDisplay() {
        const progressCount = document.getElementById('progress-count');
        if (progressCount && this.progression && this.progression.getDiscoveredCount) {
            progressCount.textContent = this.progression.getDiscoveredCount();
        }
    }

    updateUI() {
        // Обновляем информацию о платформе в UI
        const platformInfo = document.createElement('div');
        platformInfo.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(12, 12, 46, 0.7);
            backdrop-filter: blur(5px);
            border: 1px solid rgba(78, 205, 196, 0.3);
            border-radius: 10px;
            padding: 5px 10px;
            color: #4ECDC4;
            font-size: 10px;
            z-index: 999;
        `;
        platformInfo.textContent = `${this.diagnostics.platform} | ${this.diagnostics.screenSize} | WebGL`;
        platformInfo.title = `User Agent: ${this.diagnostics.userAgent}`;
        
        document.body.appendChild(platformInfo);
    }

    // Методы для отладки
    getDiagnostics() {
        return this.diagnostics;
    }

    getGalaxyData() {
        return this.galaxyData;
    }

    getPerformanceStats() {
        const rendererStats = this.renderer?.getPerformanceInfo ? this.renderer.getPerformanceInfo() : {};
        return {
            fps: rendererStats.fps || 0,
            frameTime: rendererStats.frameTime || '0ms',
            memory: this.diagnostics.memory,
            drawCalls: rendererStats.drawCalls || 0,
            renderedMeshes: rendererStats.renderedMeshes || 0,
            totalMeshes: rendererStats.totalMeshes || 0
        };
    }

    getRendererInfo() {
        return this.renderer?.getRendererInfo ? this.renderer.getRendererInfo() : {};
    }

    getAppState() {
        return { ...this.appState };
    }

    forceRedraw() {
        if (this.isInitialized && this.renderer && this.renderer.render) {
            // В нашем GalaxyRenderer рендеринг происходит в цикле
            // Этот метод может быть использован для принудительной проверки видимости
            console.log('🔄 Запрос на обновление визуализации');
        }
    }

    // Метод для очистки ресурсов
    destroy() {
        this.stopRendering();
        this.isInitialized = false;
        
        // Очищаем обработчики событий
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        document.removeEventListener('keydown', this.handleKeyDown);
        
        if (this.renderer && this.renderer.canvas) {
            this.renderer.canvas.removeEventListener('wheel', this.handleWheel);
            this.renderer.canvas.removeEventListener('click', this.handleCanvasClick);
            this.renderer.canvas.removeEventListener('mousemove', this.handleMouseMove);
            this.renderer.canvas.removeEventListener('contextmenu', this.handleContextMenu);
        }

        // Уничтожаем компоненты
        if (this.renderer && this.renderer.dispose) this.renderer.dispose();
        if (this.camera && this.camera.destroy) this.camera.destroy();
        if (this.dataLoader && this.dataLoader.destroy) this.dataLoader.destroy();
        if (this.entityInteraction && this.entityInteraction.destroy) this.entityInteraction.destroy();
        if (this.userPanel && this.userPanel.destroy) this.userPanel.destroy();
        if (this.minimap && this.minimap.destroy) this.minimap.destroy();
        if (this.assetManager && this.assetManager.destroy) this.assetManager.destroy();
        if (this.performanceOptimizer && this.performanceOptimizer.dispose) this.performanceOptimizer.dispose();
        
        console.log('🧹 GalaxyApp уничтожен, все ресурсы освобождены');
    }
}

// Глобальные обработчики ошибок для лучшей отладки
window.addEventListener('error', (event) => {
    console.error('🚨 Global Error:', event.error);
    console.error('Error details:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
});

// Экспортируем класс для использования в других модулях
export default GalaxyApp;
