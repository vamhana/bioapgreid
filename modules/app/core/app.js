// bioapgreid/modules/app/core/app.js
import { GalaxyDataLoader } from './galaxy-data-loader.js';
import { GalaxyRenderer } from './galaxy-renderer.js';
import { CameraController } from './camera-controller.js';
import { ProgressionTracker } from '../interaction/progression-tracker.js';
import { EntityInteraction } from '../interaction/entity-interaction.js';
import { UserPanel } from '../../ui/user-panel.js';
import { MinimapNavigation } from '../../ui/minimap-navigation.js';
import { AssetManager } from '../../utils/asset-manager.js';
import { PerformanceOptimizer } from '../../utils/performance-optimizer.js';
import { APP_CONFIG } from '../../constants/config.js';

export class GalaxyApp {
    constructor() {
        // Основные компоненты приложения
        this.dataLoader = new GalaxyDataLoader();
        this.renderer = new GalaxyRenderer('galaxy-canvas');
        this.camera = new CameraController();
        this.progression = new ProgressionTracker();
        this.entityInteraction = new EntityInteraction();
        this.userPanel = new UserPanel();
        this.minimap = new MinimapNavigation();
        this.assetManager = new AssetManager();
        this.performanceOptimizer = new PerformanceOptimizer();
        
        this.isInitialized = false;
        this.isDestroyed = false;
        this.galaxyData = null;
        this.animationFrameId = null;
        
        // Переменные для обработки касаний
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.lastTouchDistance = 0;
        this.isPinching = false;
        
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
        
        // Глобальные ссылки для отладки
        window.galaxyApp = this;
        window.app = this;
        
        console.log('📱 GalaxyApp создан с диагностикой:', this.diagnostics);
    }

    async init() {
        if (this.isDestroyed) {
            throw new Error('App has been destroyed and cannot be reinitialized');
        }

        console.log('🚀 Инициализация Galaxy Explorer...');
        console.log('📱 Платформа:', this.diagnostics.platform);
        console.log('🖥️  Размер экрана:', this.diagnostics.screenSize);
        console.log('🔧 Поддержка ES6:', this.diagnostics.supportsES6);
        console.log('🌐 Онлайн статус:', this.diagnostics.isOnline);
        console.log('🎨 WebGL поддержка:', this.diagnostics.webGL);
        
        const loadingElement = document.getElementById('loading');
        let initializedComponents = [];

        try {
            // Обновляем статус загрузки
            if (loadingElement) {
                loadingElement.innerHTML = `
                    <div class="loading-spinner"></div>
                    <div>Загрузка галактики...</div>
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

            // Проверяем онлайн статус
            if (!this.diagnostics.isOnline) {
                console.warn('⚠️ Приложение запускается в оффлайн режиме');
            }

            // Загружаем данные галактики
            this.updateLoadingStatus('Загрузка данных галактики...');
            this.galaxyData = await this.dataLoader.load();
            initializedComponents.push('dataLoader');
            
            if (!this.galaxyData) {
                throw new Error('Не удалось загрузить данные галактики. Проверьте подключение к интернету.');
            }

            console.log('✅ Данные галактики загружены:', this.galaxyData);

            // Инициализируем рендерер
            this.updateLoadingStatus('Инициализация графики...');
            await this.renderer.init();
            initializedComponents.push('renderer');
            
            // Инициализируем камеру
            this.camera.init(this.renderer.canvas);
            initializedComponents.push('camera');
            
            // Загружаем прогресс пользователя
            this.updateLoadingStatus('Загрузка прогресса...');
            await this.progression.init(this.galaxyData);
            initializedComponents.push('progression');
            
            // Инициализируем взаимодействия
            this.updateLoadingStatus('Настройка взаимодействий...');
            this.entityInteraction.init(this.renderer, this.progression, this.camera);
            this.entityInteraction.setGalaxyData(this.galaxyData);
            initializedComponents.push('entityInteraction');
            
            // Инициализируем UI компоненты
            this.updateLoadingStatus('Инициализация интерфейса...');
            this.userPanel.init(this.progression);
            // Устанавливаем общее количество сущностей для прогресса
            if (this.userPanel.setTotalEntities) {
                const totalEntities = this.calculateTotalEntities();
                this.userPanel.setTotalEntities(totalEntities);
            }
            initializedComponents.push('userPanel');
            
            this.minimap.init(this.galaxyData, this.camera);
            initializedComponents.push('minimap');
            
            // Предзагружаем ассеты
            this.updateLoadingStatus('Предзагрузка ресурсов...');
            await this.assetManager.preloadAssets(this.getRequiredAssets());
            initializedComponents.push('assetManager');
            
            // Настраиваем обработчики событий
            this.updateLoadingStatus('Запуск системы событий...');
            this.setupEventListeners();
            initializedComponents.push('eventListeners');
            
            // Запускаем рендеринг
            this.updateLoadingStatus('Запуск визуализации...');
            this.startRendering();
            
            // Обновляем интерфейс
            this.updateProgressDisplay();
            this.updateUI();

            this.isInitialized = true;
            
            console.log('✅ Galaxy Explorer успешно инициализирован');
            this.hideLoadingScreen();

            // Запускаем анимацию входа
            this.animateEntrance();

        } catch (error) {
            console.error('❌ Ошибка инициализации приложения:', error);
            
            // Очищаем частично инициализированные компоненты
            await this.cleanupFailedInit(initializedComponents);
            this.showError(error);
            throw error;
        }
    }

    // Метод для расчета общего количества сущностей
    calculateTotalEntities() {
        if (!this.galaxyData?.stats?.entities) return 0;
        
        return Object.values(this.galaxyData.stats.entities).reduce((sum, count) => sum + count, 0);
    }

    // Очистка при неудачной инициализации
    async cleanupFailedInit(initializedComponents) {
        console.log('🧹 Очистка частично инициализированных компонентов:', initializedComponents);
        
        // Останавливаем рендеринг если был запущен
        this.stopRendering();
        
        // Уничтожаем компоненты в обратном порядке инициализации
        const cleanupOrder = [
            'eventListeners', 'assetManager', 'minimap', 'userPanel', 
            'entityInteraction', 'progression', 'camera', 'renderer', 'dataLoader'
        ];
        
        for (const component of cleanupOrder) {
            if (initializedComponents.includes(component)) {
                try {
                    switch (component) {
                        case 'renderer':
                            // renderer не имеет метода destroy, пропускаем
                            break;
                        case 'camera':
                            if (this.camera.destroy) this.camera.destroy();
                            break;
                        case 'entityInteraction':
                            if (this.entityInteraction.destroy) this.entityInteraction.destroy();
                            break;
                        case 'minimap':
                            if (this.minimap.destroy) this.minimap.destroy();
                            break;
                        case 'userPanel':
                            if (this.userPanel.destroy) this.userPanel.destroy();
                            break;
                        case 'assetManager':
                            if (this.assetManager.destroy) this.assetManager.destroy();
                            break;
                        case 'eventListeners':
                            this.removeEventListeners();
                            break;
                    }
                    console.log(`✅ Очищен компонент: ${component}`);
                } catch (error) {
                    console.error(`❌ Ошибка очистки компонента ${component}:`, error);
                }
            }
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
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Обработчики видимости страницы
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Обработчики касаний для мобильных устройств
        if (this.diagnostics.touchSupport) {
            this.setupTouchEvents();
        }

        // Обработчики клавиатуры
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });

        // Обработчики колеса мыши для зума
        this.renderer.canvas.addEventListener('wheel', (event) => {
            this.handleWheel(event);
        }, { passive: false });

        console.log('🎮 Обработчики событий установлены');
    }

    removeEventListeners() {
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        document.removeEventListener('keydown', this.handleKeyDown);
        
        if (this.renderer?.canvas) {
            this.renderer.canvas.removeEventListener('wheel', this.handleWheel);
        }
    }

    setupTouchEvents() {
        const canvas = this.renderer.canvas;

        canvas.addEventListener('touchstart', (event) => {
            event.preventDefault();
            const touch = event.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            
            // Обработка мультитач для зума
            if (event.touches.length === 2) {
                this.isPinching = true;
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                this.lastTouchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
            }
        });

        canvas.addEventListener('touchmove', (event) => {
            event.preventDefault();
            
            if (event.touches.length === 1 && !this.isPinching) {
                // Панорамирование
                const touch = event.touches[0];
                const deltaX = touch.clientX - this.touchStartX;
                const deltaY = touch.clientY - this.touchStartY;
                
                // Применяем чувствительность в зависимости от платформы
                const sensitivity = this.diagnostics.platform === 'iOS' ? 0.3 : 0.5;
                this.camera.pan(deltaX * sensitivity, deltaY * sensitivity);
                
                this.touchStartX = touch.clientX;
                this.touchStartY = touch.clientY;
            } else if (event.touches.length === 2) {
                // Зум
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                
                if (this.lastTouchDistance > 0) {
                    const zoomDelta = (currentDistance - this.lastTouchDistance) * 0.01;
                    this.camera.zoom(zoomDelta);
                }
                
                this.lastTouchDistance = currentDistance;
            }
        });

        canvas.addEventListener('touchend', (event) => {
            if (event.touches.length < 2) {
                this.isPinching = false;
                this.lastTouchDistance = 0;
            }
            
            // Обработка тапа
            if (event.touches.length === 0 && !this.isPinching) {
                this.entityInteraction.handleTap(this.touchStartX, this.touchStartY);
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
                this.resetZoom();
                break;
            case 'r':
            case 'к': // Русская Р
                this.resetZoom();
                break;
            case 'o':
            case 'щ': // Русская О
                this.toggleOrbits();
                break;
            case 'm':
            case 'ь': // Русская М
                this.toggleMinimap();
                break;
            case 'Escape':
                this.resetZoom();
                break;
        }
    }

    handleWheel(event) {
        event.preventDefault();
        const zoomDelta = -event.deltaY * 0.001;
        this.camera.zoom(zoomDelta);
    }

    handleResize() {
        this.diagnostics.screenSize = `${window.innerWidth}x${window.innerHeight}`;
        console.log('🔄 Изменение размера экрана:', this.diagnostics.screenSize);
        
        this.renderer.resize();
        this.camera.handleResize();
        
        // Обновляем миникарту при изменении размера
        if (this.minimap.handleResize) {
            this.minimap.handleResize();
        }
        
        // Перерисовываем сцену
        if (this.isInitialized) {
            this.renderer.render(this.galaxyData, this.camera);
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
            // Проверяем, не уничтожено ли приложение
            if (this.isDestroyed || !this.isInitialized) {
                return;
            }

            try {
                // Обновляем оптимизатор производительности
                this.performanceOptimizer.update();
                
                // Рендерим сцену
                this.renderer.render(this.galaxyData, this.camera);
                
                // Обновляем миникарту если нужно
                if (this.minimap.isVisible && this.minimap.render) {
                    this.minimap.render();
                }
                
                // Проверяем необходимость троттлинга
                if (!this.performanceOptimizer.shouldThrottle()) {
                    this.animationFrameId = requestAnimationFrame(renderLoop);
                } else {
                    console.warn('⚠️ Снижение FPS, активирован троттлинг');
                    setTimeout(() => {
                        if (!this.isDestroyed) {
                            this.animationFrameId = requestAnimationFrame(renderLoop);
                        }
                    }, 1000 / 30); // Ограничиваем до 30 FPS
                }
            } catch (error) {
                console.error('❌ Ошибка в цикле рендеринга:', error);
                this.stopRendering();
            }
        };
        
        this.animationFrameId = requestAnimationFrame(renderLoop);
        console.log('🎬 Цикл рендеринга запущен');
    }

    stopRendering() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            console.log('⏸️  Цикл рендеринга остановлен');
        }
    }

    animateEntrance() {
        // Анимация плавного появления
        this.camera.setInitialView();
        
        // Показываем приветственное сообщение
        this.showWelcomeMessage();
        
        // Запускаем начальную анимацию
        if (this.renderer.animateEntrance) {
            this.renderer.animateEntrance();
        }
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
            <h3 style="margin: 0 0 10px 0; color: #4ECDC4;">🌌 Добро пожаловать!</h3>
            <p style="margin: 0; font-size: 14px;">Исследуйте галактику ${this.galaxyData.name}</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.7;">
                ${touchInstructions}<br>
                Нажмите O для переключения орбит
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
                <div style="color: #ff6b6b; font-size: 24px; margin-bottom: 15px;">❌ Ошибка загрузки</div>
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
    resetZoom() {
        if (this.isInitialized) {
            this.camera.reset();
            console.log('🗺️ Камера сброшена к обзору');
        }
    }

    toggleOrbits() {
        if (this.isInitialized) {
            this.renderer.toggleOrbitDisplay();
            const orbitsVisible = this.renderer.showOrbits;
            console.log('🔄 Отображение орбит:', orbitsVisible ? 'вкл' : 'выкл');
            
            // Показываем уведомление
            this.showNotification(`Орбиты: ${orbitsVisible ? 'включены' : 'выключены'}`);
        }
    }

    toggleMinimap() {
        if (this.isInitialized && this.minimap.toggleVisibility) {
            this.minimap.toggleVisibility();
            const minimapVisible = this.minimap.isVisible;
            console.log('🗺️ Миникарта:', minimapVisible ? 'вкл' : 'выкл');
            
            this.showNotification(`Миникарта: ${minimapVisible ? 'включена' : 'выключена'}`);
        }
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
        if (progressCount) {
            progressCount.textContent = this.progression.getDiscoveredCount();
        }
        
        // Обновляем прогресс в UserPanel
        if (this.userPanel.updateProgress) {
            this.userPanel.updateProgress();
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
        platformInfo.textContent = `${this.diagnostics.platform} | ${this.diagnostics.screenSize}`;
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
        return {
            fps: this.performanceOptimizer.fps,
            frameTime: this.performanceOptimizer.getFrameTime(),
            memory: this.diagnostics.memory
        };
    }

    forceRedraw() {
        if (this.isInitialized) {
            this.renderer.render(this.galaxyData, this.camera);
            console.log('🔄 Принудительная перерисовка');
        }
    }

    // Метод для очистки ресурсов
    destroy() {
        console.log('🧹 Начинаем уничтожение GalaxyApp...');
        
        this.isDestroyed = true;
        this.isInitialized = false;
        
        // Останавливаем рендеринг
        this.stopRendering();
        
        // Уничтожаем компоненты в правильном порядке
        try {
            // Сначала UI компоненты
            if (this.minimap.destroy) this.minimap.destroy();
            if (this.userPanel.destroy) this.userPanel.destroy();
            if (this.entityInteraction.destroy) this.entityInteraction.destroy();
            
            // Затем системные компоненты
            if (this.camera.destroy) this.camera.destroy();
            if (this.assetManager.destroy) this.assetManager.destroy();
            if (this.performanceOptimizer.destroy) this.performanceOptimizer.destroy();
            
            // Очищаем обработчики событий
            this.removeEventListeners();
            
            // Очищаем глобальные ссылки
            if (window.galaxyApp === this) {
                window.galaxyApp = null;
            }
            if (window.app === this) {
                window.app = null;
            }
            
            console.log('✅ GalaxyApp полностью уничтожен');
        } catch (error) {
            console.error('❌ Ошибка при уничтожении GalaxyApp:', error);
        }
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

export default GalaxyApp;
