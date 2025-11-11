class GenofondApp {
    constructor() {
        this.components = new Map();
        this.appState = {
            isInitialized: false,
            currentZoom: 1.0,
            focusedEntity: null,
            userProgress: {},
            visibilityThreshold: 0.5,
            currentLevel: null,
            isLoading: true
        };
        
        this.eventHandlers = new Map();
        this.initializationQueue = [];
    }

    async init() {
        try {
            console.log('🚀 Начало инициализации галактики GENOФОНД...');
            
            // ФАЗА 1: ПРЕДВАРИТЕЛЬНАЯ НАСТРОЙКА
            await this.showPreloader();
            await this.loadUserData();
            
            // ФАЗА 2: ИНИЦИАЛИЗАЦИЯ КОМПОНЕНТОВ
            await this.initializeComponents();
            
            // ФАЗА 3: НАСТРОЙКА ВЗАИМОДЕЙСТВИЙ
            await this.setupComponentIntegration();
            
            // ФАЗА 4: ЗАПУСК СИСТЕМЫ
            await this.startApplication();
            
            console.log('🎉 Галактика GENOФОНД успешно инициализирована!');
            
        } catch (error) {
            console.error('💥 Критическая ошибка инициализации:', error);
            await this.handleInitializationError(error);
        }
    }

    async showPreloader() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.style.display = 'flex';
            
            // Анимируем прогресс загрузки
            const progressSteps = [
                'Загрузка космического пространства...',
                'Инициализация звездных систем...', 
                'Построение галактики...',
                'Подготовка к запуску...'
            ];
            
            for (let i = 0; i < progressSteps.length; i++) {
                await this.updatePreloaderProgress((i + 1) * 25, progressSteps[i]);
                await this.delay(500);
            }
        }
    }

    async updatePreloaderProgress(percent, text) {
        const progressFill = document.getElementById('preloaderProgress');
        const progressText = document.getElementById('preloaderText');
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        if (progressText) {
            progressText.textContent = text;
        }
    }

    async loadUserData() {
        try {
            // Загрузка прогресса пользователя из localStorage
            const savedProgress = localStorage.getItem('genofond-user-progress');
            if (savedProgress) {
                this.appState.userProgress = JSON.parse(savedProgress);
                console.log('📊 Загружен прогресс пользователя:', this.appState.userProgress);
            }
            
            // Проверка авто-активации уровня из специализированного шлюза
            if (window.autoActivateLevel) {
                this.appState.currentLevel = window.autoActivateLevel;
                console.log(`🎯 Авто-активация уровня: ${window.autoActivateLevel}`);
            }
            
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить данные пользователя:', error);
            this.appState.userProgress = {};
        }
    }

    async initializeComponents() {
        const components = [
            { name: 'metaParser', path: 'js/meta-parser.js' },
            { name: 'galaxyBuilder', path: 'js/galaxy-builder.js' },
            { name: 'visibilityManager', path: 'js/visibility-manager.js' },
            { name: 'contentManager', path: 'js/content-manager.js' },
            { name: 'galaxyInteraction', path: 'js/galaxy-interaction.js' },
            { name: 'galaxyNavigation', path: 'js/galaxy-navigation.js' },
            { name: 'adaptivePositioning', path: 'js/adaptive-positioning.js' }
        ];

        for (const component of components) {
            try {
                await this.initializeComponent(component);
                await this.delay(100); // Небольшая задержка между инициализациями
            } catch (error) {
                console.error(`❌ Ошибка инициализации ${component.name}:`, error);
                // Продолжаем работу даже при ошибках в отдельных компонентах
            }
        }
    }

    async initializeComponent(componentConfig) {
        return new Promise((resolve, reject) => {
            // Динамическая загрузка компонента
            const script = document.createElement('script');
            script.src = componentConfig.path;
            script.onload = () => {
                try {
                    const componentClass = this.getComponentClass(componentConfig.name);
                    if (componentClass) {
                        const componentInstance = new componentClass(this);
                        this.components.set(componentConfig.name, componentInstance);
                        
                        if (typeof componentInstance.init === 'function') {
                            componentInstance.init().then(() => {
                                console.log(`✅ ${componentConfig.name} инициализирован`);
                                resolve(componentInstance);
                            }).catch(reject);
                        } else {
                            console.log(`✅ ${componentConfig.name} загружен`);
                            resolve(componentInstance);
                        }
                    } else {
                        reject(new Error(`Класс для ${componentConfig.name} не найден`));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            script.onerror = () => reject(new Error(`Не удалось загрузить ${componentConfig.path}`));
            document.head.appendChild(script);
        });
    }

    getComponentClass(componentName) {
        const classMap = {
            metaParser: window.GalaxyMetaParser,
            galaxyBuilder: window.GalaxyBuilder,
            visibilityManager: window.VisibilityManager,
            contentManager: window.ContentManager,
            galaxyInteraction: window.GalaxyInteraction,
            galaxyNavigation: window.GalaxyNavigation,
            adaptivePositioning: window.AdaptivePositioning
        };
        
        return classMap[componentName];
    }

    async setupComponentIntegration() {
        // Настройка межкомпонентной коммуникации через Custom Events
        this.setupGlobalEventHandlers();
        
        // Инициализация интеграции между компонентами
        await this.initializeComponentIntegration();
    }

    setupGlobalEventHandlers() {
        const events = [
            'entityActivated',
            'galacticLevelChange', 
            'contentLoaded',
            'zoomChanged',
            'visibilityUpdated',
            'progressUpdated'
        ];

        events.forEach(eventName => {
            document.addEventListener(eventName, (event) => {
                this.handleGlobalEvent(event);
            });
        });
    }

    async initializeComponentIntegration() {
        // Инициализация связей между компонентами
        const metaParser = this.components.get('metaParser');
        const galaxyBuilder = this.components.get('galaxyBuilder');
        const contentManager = this.components.get('contentManager');
        
        if (metaParser && galaxyBuilder) {
            // Парсинг мета-данных и построение галактики
            const entities = await metaParser.parseAllPages();
            await galaxyBuilder.buildGalaxy(entities);
        }
        
        if (contentManager && this.appState.currentLevel) {
            // Авто-загрузка контента для специализированного шлюза
            await contentManager.loadContent(this.appState.currentLevel);
        }
    }

    async startApplication() {
        // Запуск всех активных компонентов
        for (const [name, component] of this.components) {
            if (typeof component.start === 'function') {
                await component.start();
            }
        }
        
        // Обновление состояния приложения
        this.appState.isInitialized = true;
        this.appState.isLoading = false;
        
        // Скрытие прелоадера
        await this.hidePreloader();
        
        // Отправка события успешной инициализации
        this.dispatchEvent('appInitialized', { 
            timestamp: Date.now(),
            components: Array.from(this.components.keys())
        });
        
        // Обновление интерфейса
        this.updateUI();
    }

    async hidePreloader() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            // Анимация исчезновения
            preloader.style.opacity = '0';
            await this.delay(500);
            preloader.style.display = 'none';
        }
    }

    handleGlobalEvent(event) {
        const { type, detail } = event;
        
        switch (type) {
            case 'entityActivated':
                this.appState.focusedEntity = detail.entity;
                this.updateUI();
                break;
                
            case 'galacticLevelChange':
                this.appState.currentLevel = detail.levelId;
                this.saveAppState();
                break;
                
            case 'zoomChanged':
                this.appState.currentZoom = detail.zoomLevel;
                break;
                
            case 'progressUpdated':
                this.appState.userProgress = { ...this.appState.userProgress, ...detail.progress };
                this.saveAppState();
                break;
                
            case 'componentError':
                this.handleComponentError(detail);
                break;
        }
        
        // Логирование событий в development режиме
        if (this.isDevelopment()) {
            console.log(`📢 Глобальное событие: ${type}`, detail);
        }
    }

    handleComponentError(errorDetail) {
        console.error('🚨 Ошибка компонента:', errorDetail);
        
        // Показать уведомление пользователю
        this.showNotification(`Ошибка: ${errorDetail.message}`, 'error');
        
        // Попытка восстановления для некритичных ошибок
        if (!errorDetail.critical) {
            this.attemptComponentRecovery(errorDetail.component);
        }
    }

    attemptComponentRecovery(componentName) {
        console.log(`🔄 Попытка восстановления компонента: ${componentName}`);
        
        const component = this.components.get(componentName);
        if (component && typeof component.recover === 'function') {
            component.recover().then(success => {
                if (success) {
                    this.showNotification(`Компонент ${componentName} восстановлен`, 'success');
                }
            });
        }
    }

    showNotification(message, type = 'info') {
        const notificationCenter = document.getElementById('notifications');
        if (!notificationCenter) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${this.getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        notificationCenter.appendChild(notification);
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || 'ℹ️';
    }

    updateUI() {
        // Обновление статистики
        this.updateStatistics();
        
        // Обновление хлебных крошек
        this.updateBreadcrumbs();
        
        // Обновление уровня зума
        this.updateZoomDisplay();
    }

    updateStatistics() {
        const exploredPlanets = Object.keys(this.appState.userProgress).length;
        const progressLevel = Math.round((exploredPlanets / this.components.get('metaParser')?.getTotalPlanets() || 1) * 100);
        
        document.getElementById('exploredPlanets').textContent = exploredPlanets;
        document.getElementById('progressLevel').textContent = `${progressLevel}%`;
    }

    updateBreadcrumbs() {
        const breadcrumbs = document.getElementById('breadcrumbs');
        if (!breadcrumbs) return;
        
        let breadcrumbHTML = '<span class="breadcrumb-item">Галактика GENOФОНД</span>';
        
        if (this.appState.focusedEntity) {
            breadcrumbHTML += ` <span class="breadcrumb-separator">/</span> <span class="breadcrumb-item">${this.appState.focusedEntity.title}</span>`;
        }
        
        breadcrumbs.innerHTML = breadcrumbHTML;
    }

    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(this.appState.currentZoom * 100)}%`;
        }
    }

    saveAppState() {
        try {
            localStorage.setItem('genofond-app-state', JSON.stringify({
                userProgress: this.appState.userProgress,
                currentLevel: this.appState.currentLevel,
                lastUpdated: Date.now()
            }));
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить состояние приложения:', error);
        }
    }

    async handleInitializationError(error) {
        // Критическая ошибка - показываем сообщение пользователю
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.innerHTML = `
                <div class="preloader-content error">
                    <div class="error-icon">💥</div>
                    <div class="error-title">Ошибка загрузки галактики</div>
                    <div class="error-message">${error.message}</div>
                    <button class="retry-btn" onclick="window.location.reload()">Повторить попытку</button>
                </div>
            `;
        }
        
        // Логирование ошибки для анализа
        console.error('💥 Критическая ошибка инициализации:', error);
    }

    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isDevelopment() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }

    // Public API для внешнего использования
    getComponent(name) {
        return this.components.get(name);
    }

    getState() {
        return { ...this.appState };
    }

    setZoom(zoomLevel) {
        this.appState.currentZoom = Math.max(0.3, Math.min(3.0, zoomLevel));
        this.dispatchEvent('zoomChanged', { zoomLevel: this.appState.currentZoom });
    }

    navigateToLevel(levelId) {
        this.dispatchEvent('galacticLevelChange', { levelId });
    }
}

// Глобальная доступность для инициализации
window.GenofondApp = GenofondApp;

