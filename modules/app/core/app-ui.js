import UserPanel from '../ui/user-panel.js';
import MinimapNavigation from '../ui/minimap-navigation.js';
import AssetManager from '../utils/asset-manager.js';

export class AppUIManager {
    constructor(app) {
        this.app = app;
        
        // UI компоненты
        this.userPanel = null;
        this.minimap = null;
        this.assetManager = null;
        
        // Диагностические данные
        this.diagnostics = {
            platform: 'Unknown',
            userAgent: navigator.userAgent,
            supportsES6: false,
            isOnline: navigator.onLine,
            screenSize: '0x0',
            pixelRatio: 1,
            touchSupport: false,
            memory: 'unknown',
            webGL: false,
            webGL2: false,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            threeJSVersion: 'Unknown',
            maxTextureSize: 'unknown'
        };
        
        // Состояние UI
        this.uiState = {
            loadingVisible: true,
            welcomeShown: false,
            notifications: [],
            platformInfoVisible: true
        };
        
        console.log('🎨 Менеджер UI инициализирован');
    }

    async initDiagnostics() {
        console.log('🔍 Инициализация диагностики...');
        
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
            webGL2: this.detectWebGL2Support(),
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            threeJSVersion: this.getThreeJSVersion(),
            maxTextureSize: this.getMaxTextureSize()
        };
        
        console.log('📱 Диагностика завершена:', this.diagnostics);
        return this.diagnostics;
    }

    async init(galaxyData, renderer, camera) {
        console.log('🎨 Инициализация пользовательского интерфейса...');
        
        try {
            // Проверяем поддержку ES6 модулей
            if (!this.diagnostics.supportsES6) {
                throw new Error('Ваш браузер не поддерживает ES6 модули. Пожалуйста, обновите браузер.');
            }

            // 1. Инициализируем UI компоненты
            this.userPanel = new UserPanel();
            this.userPanel.init(this.app.systemsManager.progression);
            
            this.minimap = new MinimapNavigation();
            this.minimap.init(galaxyData, camera);
            
            // 2. Инициализируем менеджер ресурсов
            this.assetManager = new AssetManager();
            await this.assetManager.preloadAssets(this.getRequiredAssets());
            
            // 3. Настраиваем обработчики событий
            this.setupEventListeners();
            
            // 4. Обновляем UI
            this.updateProgressDisplay();
            this.updatePlatformInfo();
            
            console.log('✅ Пользовательский интерфейс инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации UI:', error);
            throw error;
        }
    }

    // УПРАВЛЕНИЕ СОБЫТИЯМИ ===============================================

    setupEventListeners() {
        // Обработчики resize
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);

        // Обработчики видимости страницы
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        // Обработчики клавиатуры
        this.handleKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this.handleKeyDown);

        // Обработчики для canvas
        if (this.app.renderer?.canvas) {
            this.setupCanvasEvents();
        }

        // Обработчики касаний для мобильных устройств
        if (this.diagnostics.touchSupport) {
            this.setupTouchEvents();
        }

        console.log('🎮 Обработчики событий установлены');
    }

    setupCanvasEvents() {
        const canvas = this.app.renderer.canvas;
        
        canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    }

    setupTouchEvents() {
        const canvas = this.app.renderer.canvas;
        
        canvas.addEventListener('touchstart', (event) => {
            event.preventDefault();
            this.app.systemsManager.entityInteraction?.handleTouchStart?.(event);
        });

        canvas.addEventListener('touchmove', (event) => {
            event.preventDefault();
            this.app.systemsManager.entityInteraction?.handleTouchMove?.(event);
        });

        canvas.addEventListener('touchend', (event) => {
            this.app.systemsManager.entityInteraction?.handleTouchEnd?.(event);
        });

        console.log('👆 Обработчики касаний настроены');
    }

    // ОБРАБОТЧИКИ СОБЫТИЙ ================================================

    handleResize() {
        this.diagnostics.screenSize = `${window.innerWidth}x${window.innerHeight}`;
        console.log('🔄 Изменение размера экрана:', this.diagnostics.screenSize);
        
        this.app.renderer?.sceneManager?.resize();
        this.app.camera?.handleResize();
        
        if (this.app.isInitialized) {
            this.app.forceRedraw();
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            console.log('⏸️ Страница скрыта, приостанавливаем анимацию');
            this.app.stopRendering();
        } else {
            console.log('▶️ Страница видима, возобновляем анимацию');
            this.app.startRendering();
        }
    }

    handleKeyDown(event) {
        if (event.ctrlKey || event.altKey || event.metaKey) return;

        switch (event.key) {
            case '+': case '=': this.app.camera?.zoom(0.1); break;
            case '-': this.app.camera?.zoom(-0.1); break;
            case '0': case 'r': case 'к': this.app.resetView(); break;
            case 'o': case 'щ': this.toggleOrbits(); break;
            case 'm': case 'ь': this.toggleMinimap(); break;
            case 'l': case 'д': this.toggleLabels(); break;
            case 'g': case 'п': this.toggleGrid(); break;
            case 'd': case 'в': this.toggleDebugMode(); break;
            case 'p': case 'з': this.app.cyclePerformanceMode(); break;
            case 'Escape': this.app.resetView(); break;
            case ' ': event.preventDefault(); this.app.toggleAnimation(); break;
        }
    }

    handleWheel(event) {
        event.preventDefault();
        this.app.camera?.handleWheel(event);
    }

    handleCanvasClick(event) {
        const rect = this.app.renderer.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const entityData = this.app.renderer.getEntityAtScreenPoint(x, y, this.app.camera);
        if (entityData) {
            this.app.systemsManager.entityInteraction?.handleEntityClick?.(entityData);
            this.app.appState.selectedEntity = entityData;
        }
    }

    handleMouseMove(event) {
        const rect = this.app.renderer.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const entityData = this.app.renderer.getEntityAtScreenPoint(x, y, this.app.camera);
        this.app.systemsManager.entityInteraction?.handleMouseOver?.(entityData);
    }

    handleContextMenu(event) {
        event.preventDefault();
    }

    // УПРАВЛЕНИЕ UI КОМПОНЕНТАМИ =========================================

    toggleOrbits() {
        if (this.app.renderer?.setOrbitDisplay) {
            this.app.renderer.setOrbitDisplay(!this.app.renderer.renderConfig.showOrbits);
            const visible = this.app.renderer.renderConfig.showOrbits;
            this.showNotification(`Орбиты: ${visible ? 'включены' : 'выключены'}`);
            return visible;
        }
        return false;
    }

    toggleLabels() {
        if (this.app.renderer?.setLabelDisplay) {
            this.app.renderer.setLabelDisplay(!this.app.renderer.renderConfig.showLabels);
            const visible = this.app.renderer.renderConfig.showLabels;
            this.showNotification(`Метки: ${visible ? 'включены' : 'выключены'}`);
            return visible;
        }
        return false;
    }

    toggleGrid() {
        if (this.app.renderer?.setGridDisplay) {
            this.app.renderer.setGridDisplay(!this.app.renderer.renderConfig.showGrid);
            const visible = this.app.renderer.renderConfig.showGrid;
            this.showNotification(`Сетка: ${visible ? 'включена' : 'выключена'}`);
            return visible;
        }
        return false;
    }

    toggleMinimap() {
        if (this.minimap?.toggleVisibility) {
            this.minimap.toggleVisibility();
            const visible = this.minimap.isVisible;
            this.showNotification(`Миникарта: ${visible ? 'включена' : 'выключена'}`);
            return visible;
        }
        return false;
    }

    toggleDebugMode() {
        this.app.appState.debugMode = !this.app.appState.debugMode;
        this.showNotification(`Режим отладки: ${this.app.appState.debugMode ? 'включен' : 'выключен'}`);
        
        if (this.app.appState.debugMode) {
            this.showDebugInfo();
        }
        
        return this.app.appState.debugMode;
    }

    // УВЕДОМЛЕНИЯ И СООБЩЕНИЯ ============================================

    showWelcomeMessage(galaxyName = '3D') {
        if (this.uiState.welcomeShown) return;
        
        this.createNotificationStyles();
        
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'welcome-message';
        
        const touchInstructions = this.diagnostics.touchSupport ? 
            'Используйте касания для навигации' : 
            'Используйте колесо мыши для зума';
        
        welcomeMessage.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #4ECDC4;">🌌 Добро пожаловать в 3D галактику!</h3>
            <p style="margin: 0; font-size: 14px;">Исследуйте галактику ${galaxyName}</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.7;">
                ${touchInstructions}<br>
                Нажмите O для переключения орбит<br>
                Нажмите L для переключения меток<br>
                Нажмите G для переключения сетки<br>
                Нажмите P для смены режима производительности<br>
                Нажмите D для отладки
            </p>
        `;
        
        document.body.appendChild(welcomeMessage);
        
        setTimeout(() => {
            if (welcomeMessage.parentNode) {
                welcomeMessage.parentNode.removeChild(welcomeMessage);
            }
        }, 3000);
        
        this.uiState.welcomeShown = true;
    }

    showNotification(message, duration = 2000) {
        this.createNotificationStyles();
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        this.uiState.notifications.push(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
                this.uiState.notifications = this.uiState.notifications.filter(n => n !== notification);
            }
        }, duration + 300);
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
            `;
        }
    }

    showDebugInfo() {
        if (!this.app.renderer || !this.app.dataLoader) return;
        
        const rendererInfo = this.app.renderer.getRendererInfo?.() || {};
        const performanceInfo = this.app.renderer.getPerformanceInfo?.() || {};
        const memoryInfo = this.app.dataLoader.getMemoryUsage?.() || {};
        
        console.group('🐛 Debug Information');
        console.log('🎨 Renderer:', rendererInfo);
        console.log('⚡ Performance:', performanceInfo);
        console.log('🧠 Memory:', memoryInfo);
        console.log('🎥 Camera:', this.app.camera?.getCameraInfo?.() || {});
        console.log('🌌 Galaxy Data:', {
            entities: this.app.galaxyData?.stats?.total,
            has3DData: !!this.app.galaxyData?.threeData
        });
        console.log('🔧 App State:', this.app.appState);
        console.log('📊 Diagnostics:', this.diagnostics);
        console.groupEnd();
    }

    // УТИЛИТЫ UI =========================================================

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

    updateProgressDisplay() {
        const progressCount = document.getElementById('progress-count');
        if (progressCount && this.app.systemsManager.progression?.getDiscoveredCount) {
            progressCount.textContent = this.app.systemsManager.progression.getDiscoveredCount();
        }
    }

    updatePlatformInfo() {
        if (!this.uiState.platformInfoVisible) return;
        
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
        platformInfo.textContent = `${this.diagnostics.platform} | ${this.diagnostics.screenSize} | ${this.app.appState.performanceMode} | WebGL+Three.js`;
        platformInfo.title = `User Agent: ${this.diagnostics.userAgent}`;
        
        document.body.appendChild(platformInfo);
    }

    update() {
        // Обновляем миникарту если нужно
        if (this.minimap && this.minimap.isVisible) {
            this.minimap.render();
        }
        
        // Обновляем прогресс
        this.updateProgressDisplay();
    }

    // ДИАГНОСТИЧЕСКИЕ УТИЛИТЫ ============================================

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

    detectWebGL2Support() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
        } catch (e) {
            return false;
        }
    }

    getMaxTextureSize() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 'unknown';
        } catch (e) {
            return 'unknown';
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
        return [];
    }

    createNotificationStyles() {
        if (document.querySelector('#notification-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            }
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
            @keyframes slideOut {
                from { transform: translateX(0); }
                to { transform: translateX(100%); }
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
                animation: slideIn 0.3s ease, slideOut 0.3s ease 2000ms forwards;
                max-width: 300px;
            }
        `;
        document.head.appendChild(style);
    }

    // ГЕТТЕРЫ ============================================================

    getDiagnostics() {
        return this.diagnostics;
    }

    getUIState() {
        return { ...this.uiState };
    }

    // ОЧИСТКА РЕСУРСОВ ===================================================

    destroy() {
        // Удаляем обработчики событий
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        document.removeEventListener('keydown', this.handleKeyDown);
        
        if (this.app.renderer?.canvas) {
            this.app.renderer.canvas.removeEventListener('wheel', this.handleWheel);
            this.app.renderer.canvas.removeEventListener('click', this.handleCanvasClick);
            this.app.renderer.canvas.removeEventListener('mousemove', this.handleMouseMove);
            this.app.renderer.canvas.removeEventListener('contextmenu', this.handleContextMenu);
        }

        // Уничтожаем UI компоненты
        if (this.userPanel?.destroy) this.userPanel.destroy();
        if (this.minimap?.destroy) this.minimap.destroy();
        if (this.assetManager?.destroy) this.assetManager.destroy();
        
        // Очищаем уведомления
        this.uiState.notifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        
        console.log('🧹 Менеджер UI уничтожен');
    }
}