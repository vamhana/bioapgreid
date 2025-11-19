// modules/app/app.js

// Импорты для GalaxyApp
import GalaxyDataLoader from './core/galaxy-data-loader.js';
import GalaxyRenderer from './core/galaxy-renderer.js';
import CameraController from './core/camera-controller.js';
import ProgressionTracker from './interaction/progression-tracker.js';
import EntityInteraction from './interaction/entity-interaction.js';
import UserPanel from './ui/user-panel.js';
import MinimapNavigation from './ui/minimap-navigation.js';
import AssetManager from './utils/asset-manager.js';
import PerformanceOptimizer from './utils/performance-optimizer.js';
import { APP_CONFIG } from './constants/config.js';

// Новые сервисы из рефакторинга
import Galaxy3DLayoutService from './core/galaxy-3d-layout-service.js';
import AnimationSystem from './core/animation-system.js';
import MaterialPool from './core/material-pool.js';
import SpatialPartitioner from './core/spatial-partitioner.js';
import LODManager from './core/lod-manager.js';

// ==================== КЛАСС GALAXY APP ====================

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
        
        // Новые 3D сервисы
        this.layoutService = null;
        this.animationSystem = null;
        this.materialPool = null;
        this.spatialPartitioner = null;
        this.lodManager = null;
        
        this.isInitialized = false;
        this.galaxyData = null;
        this.animationFrameId = null;
        
        // Состояние приложения
        this.appState = {
            is3DMode: true,
            isAnimating: false,
            currentView: 'galaxy',
            selectedEntity: null,
            debugMode: false,
            version: '2.0.0' // Добавляем версию из новой архитектуры
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
            cookieEnabled: navigator.cookieEnabled,
            threeJSVersion: this.getThreeJSVersion(),
            appVersion: '2.0.0', // Из новой версии
            buildDate: '2024-01-15' // Из новой версии
        };
        
        console.log('📱 GalaxyApp v2.0.0 создан с диагностикой:', this.diagnostics);
    }

    async init() {
        console.log('🚀 Инициализация Galaxy Explorer 3D (v2.0.0)...');
        console.log('📱 Платформа:', this.diagnostics.platform);
        console.log('🖥️  Размер экрана:', this.diagnostics.screenSize);
        console.log('🔧 Поддержка ES6:', this.diagnostics.supportsES6);
        console.log('🌐 Онлайн статус:', this.diagnostics.isOnline);
        console.log('🎨 WebGL поддержка:', this.diagnostics.webGL);
        console.log('🔄 Three.js версия:', this.diagnostics.threeJSVersion);
        console.log('✨ Новая 3D архитектура активирована');
        
        const loadingElement = document.getElementById('loading');
        
        try {
            // Обновляем статус загрузки
            if (loadingElement) {
                loadingElement.innerHTML = `
                    <div class="loading-spinner"></div>
                    <div>Загрузка 3D галактики v2.0.0...</div>
                    <div style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
                        Платформа: ${this.diagnostics.platform}<br>
                        Экран: ${this.diagnostics.screenSize}<br>
                        WebGL: ${this.diagnostics.webGL ? '✅' : '❌'}<br>
                        Three.js: ${this.diagnostics.threeJSVersion}<br>
                        Архитектура: 3D Enhanced
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
            }

            // Проверяем онлайн статус
            if (!this.diagnostics.isOnline) {
                console.warn('⚠️ Приложение запускается в оффлайн режиме');
            }

            // Инициализируем основные компоненты
            this.updateLoadingStatus('Инициализация системы v2.0.0...');
            
            // 1. Инициализируем новые 3D сервисы
            this.updateLoadingStatus('Инициализация 3D сервисов...');
            await this.init3DServices();
            
            // 2. Загружаем данные галактики
            this.updateLoadingStatus('Загрузка данных галактики...');
            this.dataLoader = new GalaxyDataLoader();
            this.galaxyData = await this.dataLoader.load();
            
            if (!this.galaxyData) {
                throw new Error('Не удалось загрузить данные галактики. Проверьте подключение к интернету.');
            }

            console.log('✅ Данные галактики загружены:', {
                name: this.galaxyData.name,
                entities: this.galaxyData.stats?.total,
                has3DData: !!this.galaxyData.threeData
            });

            // 3. Инициализируем Three.js рендерер
            this.updateLoadingStatus('Инициализация 3D графики...');
            this.renderer = new GalaxyRenderer('galaxy-canvas');
            await this.renderer.init();
            
            // 4. Инициализируем 3D камеру
            this.updateLoadingStatus('Настройка 3D камеры...');
            this.camera = new CameraController(
                this.renderer.sceneManager.camera,
                this.renderer.sceneManager
            );
            this.camera.init(this.renderer.canvas);
            
            // 5. Создаем 3D объекты галактики с новой системой компоновки
            this.updateLoadingStatus('Создание 3D объектов...');
            this.create3DGalaxyWithNewLayout();
            
            // 6. Инициализируем систему прогресса
            this.updateLoadingStatus('Загрузка прогресса...');
            this.progression = new ProgressionTracker();
            await this.progression.init(this.galaxyData);
            
            // 7. Инициализируем взаимодействия
            this.updateLoadingStatus('Настройка взаимодействий...');
            this.entityInteraction = new EntityInteraction();
            this.entityInteraction.init(this.renderer, this.progression, this.camera);
            this.entityInteraction.setGalaxyData(this.galaxyData);
            
            // 8. Инициализируем UI компоненты
            this.updateLoadingStatus('Инициализация интерфейса...');
            this.userPanel = new UserPanel();
            this.userPanel.init(this.progression);
            
            this.minimap = new MinimapNavigation();
            this.minimap.init(this.galaxyData, this.camera);
            
            // 9. Инициализируем менеджер ресурсов
            this.updateLoadingStatus('Предзагрузка ресурсов...');
            this.assetManager = new AssetManager();
            await this.assetManager.preloadAssets(this.getRequiredAssets());
            
            // 10. Инициализируем оптимизатор производительности
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
            
            console.log('✅ Galaxy Explorer 3D v2.0.0 успешно инициализирован');
            this.hideLoadingScreen();

            // Запускаем анимацию входа
            this.animateEntrance();

        } catch (error) {
            console.error('❌ Ошибка инициализации приложения v2.0.0:', error);
            this.showError(error);
        }
    }

    async init3DServices() {
        console.log('✨ Инициализация новых 3D сервисов...');
        
        try {
            // 1. Сервис компоновки 3D
            this.layoutService = new Galaxy3DLayoutService();
            await this.layoutService.init();
            console.log('✅ Galaxy3DLayoutService инициализирован');

            // 2. Система анимаций
            this.animationSystem = new AnimationSystem();
            await this.animationSystem.init();
            console.log('✅ AnimationSystem инициализирована');

            // 3. Пул материалов
            this.materialPool = new MaterialPool();
            await this.materialPool.init();
            console.log('✅ MaterialPool инициализирован');

            // 4. Пространственное разделение
            this.spatialPartitioner = new SpatialPartitioner();
            await this.spatialPartitioner.init();
            console.log('✅ SpatialPartitioner инициализирован');

            // 5. Менеджер LOD
            this.lodManager = new LODManager();
            await this.lodManager.init();
            console.log('✅ LODManager инициализирован');

            console.log('🎉 Все 3D сервисы успешно инициализированы');
            
        } catch (error) {
            console.warn('⚠️ Некоторые 3D сервисы не инициализированы:', error);
            // Продолжаем работу даже если некоторые сервисы не загрузились
        }
    }

    create3DGalaxyWithNewLayout() {
        if (!this.galaxyData || !this.renderer) {
            console.error('❌ Нет данных или рендерера для создания 3D галактики');
            return;
        }

        console.log('🌌 Создание 3D галактики с новой системой компоновки...');

        // Используем новую систему компоновки если доступна
        if (this.layoutService && this.layoutService.createGalaxyLayout) {
            const layout = this.layoutService.createGalaxyLayout(this.galaxyData);
            
            // Создаем центральную звезду (галактику)
            const galaxyPosition = layout.galaxyPosition || { x: 0, y: 0, z: 0 };
            this.renderer.createEntityMesh(this.galaxyData, galaxyPosition);

            // Создаем планеты и их спутники используя новую компоновку
            if (layout.planets) {
                layout.planets.forEach((planetLayout, planetIndex) => {
                    const planet = this.galaxyData.children?.[planetIndex];
                    if (planet) {
                        const planetMesh = this.renderer.createEntityMesh(planet, planetLayout.position);

                        // Создаем спутники
                        if (planetLayout.moons && planet.children) {
                            planet.children.forEach((moon, moonIndex) => {
                                const moonPosition = planetLayout.moons[moonIndex]?.position || 
                                                   this.dataLoader.getEntity3DPosition(moon.cleanPath);
                                this.renderer.createEntityMesh(moon, moonPosition);
                            });
                        }
                    }
                });
            }
        } else {
            // Fallback на старую систему
            this.create3DGalaxyFromData();
        }

        console.log('✅ 3D галактика создана с новой архитектурой:', {
            totalMeshes: this.renderer.entityMeshes.size,
            hasStarfield: true,
            hasLighting: true,
            usesNewLayout: !!this.layoutService
        });
    }

    create3DGalaxyFromData() {
        // Реализация из старой версии (как fallback)
        if (!this.galaxyData || !this.renderer) {
            console.error('❌ Нет данных или рендерера для создания 3D галактики');
            return;
        }

        console.log('🌌 Создание 3D галактики из данных (fallback)...');

        const galaxyPosition = { x: 0, y: 0, z: 0 };
        this.renderer.createEntityMesh(this.galaxyData, galaxyPosition);

        if (this.galaxyData.children) {
            this.galaxyData.children.forEach((planet, planetIndex) => {
                const planetPosition = this.galaxyData.threeData?.orbitalLayers?.[planetIndex]?.planets?.[0]?.position || 
                                    this.dataLoader.getEntity3DPosition(planet.cleanPath);
                
                const planetMesh = this.renderer.createEntityMesh(planet, planetPosition);

                if (planet.children) {
                    planet.children.forEach((moon, moonIndex) => {
                        const moonPosition = this.galaxyData.threeData?.orbitalLayers?.[planetIndex]?.planets?.[moonIndex + 1]?.position || 
                                           this.dataLoader.getEntity3DPosition(moon.cleanPath);
                        
                        this.renderer.createEntityMesh(moon, moonPosition);
                    });
                }
            });
        }
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
        this.renderer.canvas.addEventListener('wheel', this.handleWheel, { passive: false });

        // Обработчики кликов по 3D объектам
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.renderer.canvas.addEventListener('click', this.handleCanvasClick);

        // Обработчики движения мыши для ховера
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.renderer.canvas.addEventListener('mousemove', this.handleMouseMove);

        // Обработчики контекстного меню (блокировка)
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.renderer.canvas.addEventListener('contextmenu', this.handleContextMenu);

        console.log('🎮 Обработчики событий Three.js установлены');
    }

    setupTouchEvents() {
        const canvas = this.renderer.canvas;
        
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
                this.camera.zoom(0.1);
                break;
            case '-':
                this.camera.zoom(-0.1);
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
        this.camera.handleWheel(event);
    }

    handleCanvasClick(event) {
        const rect = this.renderer.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const entityData = this.renderer.getEntityAtScreenPoint(x, y, this.camera);
        if (entityData && this.entityInteraction && this.entityInteraction.handleEntityClick) {
            this.entityInteraction.handleEntityClick(entityData);
            this.appState.selectedEntity = entityData;
        }
    }

    handleMouseMove(event) {
        const rect = this.renderer.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const entityData = this.renderer.getEntityAtScreenPoint(x, y, this.camera);
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
        
        if (this.renderer && this.renderer.sceneManager) {
            this.renderer.sceneManager.resize();
        }
        
        if (this.camera) {
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

        const renderLoop = (timestamp) => {
            if (this.isInitialized) {
                // Обновляем оптимизатор производительности
                if (this.performanceOptimizer && this.performanceOptimizer.update) {
                    this.performanceOptimizer.update();
                }
                
                // Рендерим 3D сцену
                this.renderer.render(this.galaxyData, this.camera);
                
                // Обновляем миникарту если нужно
                if (this.minimap && this.minimap.isVisible) {
                    this.minimap.render();
                }
                
                // Обновляем статистику производительности
                this.updatePerformanceStats();
                
                // Проверяем необходимость троттлинга
                const shouldThrottle = this.performanceOptimizer && 
                                     this.performanceOptimizer.shouldThrottle && 
                                     this.performanceOptimizer.shouldThrottle();
                
                if (!shouldThrottle) {
                    this.animationFrameId = requestAnimationFrame(renderLoop);
                } else {
                    console.warn('⚠️ Снижение FPS, активирован троттлинг');
                    const delay = this.performanceOptimizer.getThrottleDelay ? 
                                this.performanceOptimizer.getThrottleDelay() : 33;
                    setTimeout(() => {
                        this.animationFrameId = requestAnimationFrame(renderLoop);
                    }, delay);
                }
            }
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

    updatePerformanceStats() {
        if (this.performanceOptimizer && this.performanceOptimizer.updateStats && this.renderer) {
            const rendererStats = this.renderer.getPerformanceInfo();
            this.performanceOptimizer.updateStats({
                fps: rendererStats.fps,
                frameTime: parseFloat(rendererStats.frameTime) || 0,
                memory: this.dataLoader?.getMemoryUsage?.() || {}
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

    getThreeJSVersion() {
        try {
            return THREE?.REVISION || 'Unknown';
        } catch (e) {
            return 'Not loaded';
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
                    Three.js: ${this.diagnostics.threeJSVersion}<br>
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
            this.renderer.setOrbitDisplay(!this.renderer.renderConfig.showOrbits);
            const orbitsVisible = this.renderer.renderConfig.showOrbits;
            console.log('🔄 Отображение орбит:', orbitsVisible ? 'вкл' : 'выкл');
            
            this.showNotification(`Орбиты: ${orbitsVisible ? 'включены' : 'выключены'}`);
        }
    }

    toggleLabels() {
        if (this.isInitialized && this.renderer && this.renderer.setLabelDisplay) {
            this.renderer.setLabelDisplay(!this.renderer.renderConfig.showLabels);
            const labelsVisible = this.renderer.renderConfig.showLabels;
            console.log('🏷️ Отображение меток:', labelsVisible ? 'вкл' : 'выкл');
            
            this.showNotification(`Метки: ${labelsVisible ? 'включены' : 'выключены'}`);
        }
    }

    toggleGrid() {
        if (this.isInitialized && this.renderer && this.renderer.setGridDisplay) {
            this.renderer.setGridDisplay(!this.renderer.renderConfig.showGrid);
            const gridVisible = this.renderer.renderConfig.showGrid;
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
        const memoryInfo = this.dataLoader.getMemoryUsage ? this.dataLoader.getMemoryUsage() : {};
        
        console.group('🐛 Debug Information');
        console.log('🎨 Renderer:', rendererInfo);
        console.log('⚡ Performance:', performanceInfo);
        console.log('🧠 Memory:', memoryInfo);
        console.log('🎥 Camera:', this.camera ? this.camera.getCameraInfo() : {});
        console.log('🌌 Galaxy Data:', {
            entities: this.galaxyData?.stats?.total,
            has3DData: !!this.galaxyData?.threeData,
            loadedAt: this.galaxyData?.loadedAt
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
        platformInfo.textContent = `${this.diagnostics.platform} | ${this.diagnostics.screenSize} | WebGL+Three.js`;
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
            totalMeshes: rendererStats.totalMeshes || 0,
            threeJSVersion: this.diagnostics.threeJSVersion
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
            this.renderer.render(this.galaxyData, this.camera);
            console.log('🔄 Принудительная перерисовка 3D сцены');
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

// ==================== ЭКСПОРТЫ И ФУНКЦИИ ИЗ НОВОЙ ВЕРСИИ ====================

// Экспорт основных модулей
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

// Global initialization helper из новой версии
export function initGalaxyExplorer(canvasId = 'galaxy-canvas') {
    console.log('🚀 Инициализация Galaxy Explorer 3D v2.0.0...');
    
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
            
            console.log('🌌 Galaxy Explorer 3D v2.0.0 успешно запущен!');
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
            console.log('📝 Galaxy Explorer 3D v2.0.0: DOM готов, можно запускать initGalaxyExplorer()');
        });
    } else {
        console.log('📝 Galaxy Explorer 3D v2.0.0: DOM уже загружен, можно запускать initGalaxyExplorer()');
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

// Глобальные обработчики ошибок из старой версии
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
