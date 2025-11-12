class PerformanceMonitor {
    constructor(app) {
        this.app = app;
        this.metrics = {
            initTime: 0,
            componentLoadTimes: {},
            memoryUsage: 0,
            frameRate: 0,
            interactionLatency: 0,
            resourceLoadTimes: {}
        };
        
        this.observers = [];
        this.monitoringInterval = null;
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
    }

    start() {
        console.log('📊 Запуск мониторинга производительности...');
        
        // Мониторинг использования памяти
        this.monitoringInterval = setInterval(() => {
            this.updateMemoryUsage();
            this.updateFrameRate();
            this.detectPerformanceIssues();
        }, 2000);

        // Мониторинг загрузки ресурсов
        this.setupResourceTiming();
        
        // Мониторинг взаимодействий
        this.setupInteractionMonitoring();
    }

    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }

    updateMemoryUsage() {
        if (performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1048576; // MB
            
            // Предупреждение при высоком использовании памяти
            if (this.metrics.memoryUsage > 100) {
                console.warn(`⚠️ Высокое использование памяти: ${this.metrics.memoryUsage.toFixed(2)}MB`);
                this.app.dispatchEvent('performanceWarning', {
                    type: 'highMemoryUsage',
                    value: this.metrics.memoryUsage,
                    threshold: 100
                });
            }
        }
    }

    updateFrameRate() {
        const currentTime = performance.now();
        this.frameCount++;
        
        if (currentTime - this.lastFrameTime >= 1000) {
            this.metrics.frameRate = Math.round((this.frameCount * 1000) / (currentTime - this.lastFrameTime));
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
            
            // Предупреждение при низком FPS
            if (this.metrics.frameRate < 30) {
                this.app.dispatchEvent('performanceWarning', {
                    type: 'lowFPS',
                    value: this.metrics.frameRate,
                    threshold: 30
                });
            }
        }
    }

    setupResourceTiming() {
        if ('performance' in window && 'getEntriesByType' in performance) {
            const resources = performance.getEntriesByType('resource');
            resources.forEach(resource => {
                this.metrics.resourceLoadTimes[resource.name] = resource.duration;
            });
        }
    }

    setupInteractionMonitoring() {
        // Мониторинг задержки взаимодействий
        document.addEventListener('click', (event) => {
            const startTime = performance.now();
            setTimeout(() => {
                const latency = performance.now() - startTime;
                this.metrics.interactionLatency = latency;
                
                if (latency > 100) {
                    console.warn(`⚠️ Высокая задержка взаимодействия: ${latency.toFixed(2)}ms`);
                }
            }, 0);
        }, { passive: true });
    }

    detectPerformanceIssues() {
        const issues = [];
        
        if (this.metrics.memoryUsage > 150) issues.push('high_memory');
        if (this.metrics.frameRate < 25) issues.push('low_fps');
        if (this.metrics.interactionLatency > 200) issues.push('high_latency');
        
        if (issues.length > 0) {
            this.app.dispatchEvent('performanceIssuesDetected', {
                issues,
                metrics: { ...this.metrics }
            });
        }
    }

    getMetrics() {
        return { ...this.metrics };
    }

    recordComponentLoadTime(componentName, loadTime) {
        this.metrics.componentLoadTimes[componentName] = loadTime;
    }
}

class ErrorRecoverySystem {
    constructor(app) {
        this.app = app;
        this.errorCounts = new Map();
        this.recoveryAttempts = new Map();
        this.circuitStates = new Map();
        
        this.config = {
            maxErrorsPerComponent: 5,
            recoveryCooldown: 30000, // 30 секунд
            circuitOpenTime: 60000, // 1 минута
            maxRecoveryAttempts: 3
        };
    }

    recordError(componentName, error) {
        const count = this.errorCounts.get(componentName) || 0;
        this.errorCounts.set(componentName, count + 1);
        
        // Проверка необходимости открытия circuit breaker
        if (count + 1 >= this.config.maxErrorsPerComponent) {
            this.openCircuit(componentName);
        }
        
        // Логирование ошибки
        console.error(`🚨 Ошибка в ${componentName}:`, error);
        
        // Отправка события ошибки
        this.app.dispatchEvent('componentError', {
            component: componentName,
            error: error.message,
            errorCount: count + 1,
            timestamp: Date.now()
        });
    }

    openCircuit(componentName) {
        this.circuitStates.set(componentName, {
            state: 'OPEN',
            openedAt: Date.now()
        });
        
        console.warn(`🔌 Circuit breaker открыт для ${componentName}`);
        
        // Автоматическое закрытие через указанное время
        setTimeout(() => {
            this.halfOpenCircuit(componentName);
        }, this.config.circuitOpenTime);
    }

    halfOpenCircuit(componentName) {
        this.circuitStates.set(componentName, {
            state: 'HALF_OPEN',
            openedAt: Date.now()
        });
        
        console.log(`🟡 Circuit breaker в полуоткрытом состоянии для ${componentName}`);
    }

    closeCircuit(componentName) {
        this.circuitStates.set(componentName, {
            state: 'CLOSED',
            openedAt: null
        });
        
        this.errorCounts.set(componentName, 0);
        this.recoveryAttempts.set(componentName, 0);
        
        console.log(`🟢 Circuit breaker закрыт для ${componentName}`);
    }

    isCircuitOpen(componentName) {
        const circuit = this.circuitStates.get(componentName);
        if (!circuit) return false;
        
        return circuit.state === 'OPEN' || 
               (circuit.state === 'HALF_OPEN' && 
                Date.now() - circuit.openedAt < this.config.circuitOpenTime);
    }

    async attemptRecovery(componentName) {
        const attempts = this.recoveryAttempts.get(componentName) || 0;
        
        if (attempts >= this.config.maxRecoveryAttempts) {
            console.error(`❌ Превышено максимальное количество попыток восстановления для ${componentName}`);
            return false;
        }
        
        this.recoveryAttempts.set(componentName, attempts + 1);
        
        try {
            const component = this.app.getComponent(componentName);
            if (component && typeof component.recover === 'function') {
                console.log(`🔄 Попытка восстановления ${componentName} (${attempts + 1}/${this.config.maxRecoveryAttempts})...`);
                
                const success = await component.recover();
                if (success) {
                    this.closeCircuit(componentName);
                    console.log(`✅ ${componentName} успешно восстановлен`);
                    return true;
                }
            }
        } catch (error) {
            console.error(`❌ Ошибка восстановления ${componentName}:`, error);
        }
        
        return false;
    }

    getRecoveryStatus(componentName) {
        return {
            errorCount: this.errorCounts.get(componentName) || 0,
            recoveryAttempts: this.recoveryAttempts.get(componentName) || 0,
            circuitState: this.circuitStates.get(componentName)?.state || 'CLOSED'
        };
    }
}

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
            isLoading: true,
            lastError: null,
            domain: window.location.hostname, // ДОБАВЛЕНО: информация о домене
            environment: this.getEnvironment(), // ДОБАВЛЕНО: определение окружения
            performanceMetrics: {
                initTime: 0,
                componentLoadTimes: {},
                memoryUsage: 0,
                frameRate: 0,
                interactionLatency: 0
            },
            analytics: {
                sessionStart: Date.now(),
                interactions: 0,
                navigationEvents: 0,
                errors: 0,
                domain: window.location.hostname // ДОБАВЛЕНО: домен в аналитику
            }
        };
        
        this.eventHandlers = new Map();
        this.initializationQueue = [];
        this.saveStateTimeout = null;
        
        // Системы
        this.performanceMonitor = new PerformanceMonitor(this);
        this.errorRecovery = new ErrorRecoverySystem(this);
        
        // Конфигурация для GitHub Pages и bioapgreid.ru
        this.config = {
            maxRetries: 3,
            retryDelay: 1000,
            circuitBreakerThreshold: 3,
            initialStateTimeout: 5000,
            saveStateDebounce: 1000,
            componentLoadTimeout: 10000,
            enableAnalytics: true,
            enablePerformanceMonitoring: true,
            enableErrorRecovery: true,
            baseUrl: 'https://www.bioapgreid.ru/',
            isGitHubPages: window.location.hostname.includes('github.io'),
            isBioapgreid: window.location.hostname.includes('bioapgreid.ru')
        };
        
        console.log(`🚀 GenofondApp v2.1 инициализирован для домена: ${this.appState.domain}`);
    }

    /**
     * Определение текущего окружения
     */
    getEnvironment() {
        if (window.location.hostname.includes('bioapgreid.ru')) {
            return 'production';
        } else if (window.location.hostname.includes('github.io')) {
            return 'staging';
        } else {
            return 'development';
        }
    }

    async init() {
        const startTime = performance.now();
        
        try {
            console.log(`🚀 Начало инициализации галактики GENOФОНД v2.1 на домене: ${this.appState.domain}...`);
            
            // Запуск мониторинга производительности
            if (this.config.enablePerformanceMonitoring) {
                this.performanceMonitor.start();
            }
            
            // ФАЗА 1: ПРЕДВАРИТЕЛЬНАЯ НАСТРОЙКА
            await this.showPreloader();
            await this.loadUserData();
            await this.setupAnalytics();
            
            // ФАЗА 2: ИНИЦИАЛИЗАЦИЯ КОМПОНЕНТОВ
            await this.initializeComponents();
            
            // ФАЗА 3: НАСТРОЙКА ВЗАИМОДЕЙСТВИЙ
            await this.setupComponentIntegration();
            
            // ФАЗА 4: ЗАПУСК СИСТЕМЫ
            await this.startApplication();
            
            const initTime = performance.now() - startTime;
            this.appState.performanceMetrics.initTime = initTime;
            
            console.log(`🎉 Галактика GENOФОНД v2.1 успешно инициализирована на ${this.appState.domain} за ${initTime.toFixed(2)}мс!`);
            
            // Аналитика успешной инициализации
            this.recordAnalyticsEvent('app_initialized', { 
                initTime,
                domain: this.appState.domain,
                environment: this.appState.environment
            });
            
        } catch (error) {
            const errorTime = performance.now() - startTime;
            console.error(`💥 Критическая ошибка инициализации на ${this.appState.domain} через ${errorTime.toFixed(2)}мс:`, error);
            
            this.appState.lastError = {
                message: error.message,
                timestamp: Date.now(),
                phase: 'initialization',
                domain: this.appState.domain
            };
            
            this.recordAnalyticsEvent('app_initialization_failed', { 
                error: error.message,
                initTime: errorTime,
                domain: this.appState.domain
            });
            
            await this.handleInitializationError(error);
        }
    }

    async showPreloader() {
        const preloader = document.getElementById('preloader');
        if (!preloader) {
            console.warn('⚠️ Элемент прелоадера не найден');
            return;
        }
        
        preloader.style.display = 'flex';
        
        const progressSteps = [
            { percent: 10, text: 'Загрузка космического пространства...' },
            { percent: 30, text: 'Инициализация звездных систем...' },
            { percent: 50, text: 'Построение галактики...' },
            { percent: 70, text: 'Настройка навигации...' },
            { percent: 85, text: 'Подготовка к запуску...' },
            { percent: 95, text: 'Завершение инициализации...' }
        ];
        
        for (const step of progressSteps) {
            if (!this.appState.isInitialized) {
                await this.updatePreloaderProgress(step.percent, step.text);
                await this.delay(400);
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
        
        // Обновление title для отображения прогресса
        const domainSuffix = this.config.isBioapgreid ? ' | bioapgreid.ru' : 
                           this.config.isGitHubPages ? ' | GitHub Pages' : '';
        document.title = `GENOФОНД (${percent}%)${domainSuffix}`;
    }

    async loadUserData() {
        try {
            // Загрузка прогресса пользователя из localStorage с таймаутом
            const [savedProgress, savedState] = await Promise.all([
                this.loadWithTimeout('genofond-user-progress'),
                this.loadWithTimeout('genofond-app-state')
            ]);
            
            if (savedProgress) {
                this.appState.userProgress = JSON.parse(savedProgress);
                console.log('📊 Загружен прогресс пользователя');
            }
            
            if (savedState) {
                const state = JSON.parse(savedState);
                this.appState.currentLevel = state.currentLevel;
                console.log('💾 Загружено состояние приложения');
            }
            
            // Проверка авто-активации уровня из специализированного шлюза
            if (window.autoActivateLevel && typeof window.autoActivateLevel === 'string') {
                this.appState.currentLevel = window.autoActivateLevel;
                console.log(`🎯 Авто-активация уровня: ${window.autoActivateLevel}`);
            }
            
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить данные пользователя:', error);
            this.appState.userProgress = {};
        }
    }

    async loadWithTimeout(key) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Таймаут загрузки ${key}`));
            }, this.config.initialStateTimeout);

            try {
                const data = localStorage.getItem(key);
                clearTimeout(timeoutId);
                resolve(data);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    async setupAnalytics() {
        if (!this.config.enableAnalytics) return;
        
        // Загрузка предыдущей аналитики
        try {
            const savedAnalytics = sessionStorage.getItem('genofond-analytics');
            if (savedAnalytics) {
                const analytics = JSON.parse(savedAnalytics);
                this.appState.analytics = { ...this.appState.analytics, ...analytics };
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить аналитику:', error);
        }
        
        console.log('📈 Система аналитики настроена');
    }

    async initializeComponents() {
        const components = [
            { name: 'metaParser', path: 'js/meta-parser.js', critical: true, priority: 1 },
            { name: 'galaxyBuilder', path: 'js/galaxy-builder.js', critical: true, priority: 1 },
            { name: 'contentManager', path: 'js/content-manager.js', critical: false, priority: 2 },
            { name: 'galaxyNavigation', path: 'js/galaxy-navigation.js', critical: false, priority: 2 },
            { name: 'galaxyInteraction', path: 'js/galaxy-interaction.js', critical: false, priority: 3 },
            { name: 'visibilityManager', path: 'js/visibility-manager.js', critical: false, priority: 3 },
            { name: 'adaptivePositioning', path: 'js/adaptive-positioning.js', critical: false, priority: 4 }
        ];

        // Сортировка по приоритету
        components.sort((a, b) => a.priority - b.priority);

        for (const component of components) {
            // Проверка circuit breaker
            if (this.errorRecovery.isCircuitOpen(component.name)) {
                console.warn(`🔌 Circuit breaker открыт для ${component.name}, пропускаем инициализацию`);
                continue;
            }

            try {
                const startTime = performance.now();
                await this.initializeComponentWithRetry(component);
                const loadTime = performance.now() - startTime;
                
                this.performanceMonitor.recordComponentLoadTime(component.name, loadTime);
                console.log(`✅ ${component.name} инициализирован за ${loadTime.toFixed(2)}мс`);
                
                await this.delay(50); // Короткая задержка между инициализациями
                
            } catch (error) {
                console.error(`❌ Ошибка инициализации ${component.name}:`, error);
                this.errorRecovery.recordError(component.name, error);
                
                if (component.critical) {
                    throw new Error(`Критический компонент ${component.name} не удалось инициализировать: ${error.message}`);
                }
            }
        }
    }

    async initializeComponentWithRetry(componentConfig, attempt = 0) {
        try {
            return await this.initializeComponent(componentConfig);
        } catch (error) {
            if (attempt < this.config.maxRetries) {
                const delayTime = this.config.retryDelay * Math.pow(2, attempt); // Экспоненциальная задержка
                console.log(`🔄 Повторная попытка ${attempt + 1} для ${componentConfig.name} через ${delayTime}мс...`);
                
                await this.delay(delayTime);
                return this.initializeComponentWithRetry(componentConfig, attempt + 1);
            }
            throw error;
        }
    }

    async initializeComponent(componentConfig) {
        return new Promise((resolve, reject) => {
            // Проверка, не загружен ли уже компонент
            if (this.components.has(componentConfig.name)) {
                resolve(this.components.get(componentConfig.name));
                return;
            }

            const timeoutId = setTimeout(() => {
                reject(new Error(`Таймаут загрузки компонента ${componentConfig.name}`));
            }, this.config.componentLoadTimeout);

            const script = document.createElement('script');
            script.src = componentConfig.path;
            
            script.onload = async () => {
                clearTimeout(timeoutId);
                try {
                    const componentClass = this.getComponentClass(componentConfig.name);
                    if (componentClass) {
                        const componentInstance = new componentClass(this);
                        this.components.set(componentConfig.name, componentInstance);
                        
                        if (typeof componentInstance.init === 'function') {
                            await componentInstance.init();
                        }
                        
                        resolve(componentInstance);
                    } else {
                        reject(new Error(`Класс для ${componentConfig.name} не найден`));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            script.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error(`Не удалось загрузить ${componentConfig.path}`));
            };
            
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
        
        console.log('🔗 Интеграция компонентов настроена');
    }

    setupGlobalEventHandlers() {
        const events = [
            'entityActivated',
            'entityHovered',
            'galacticLevelChange', 
            'contentLoaded',
            'zoomChanged',
            'cameraMoved',
            'visibilityUpdated',
            'progressUpdated',
            'componentError',
            'performanceWarning',
            'interactionStarted',
            'interactionEnded'
        ];

        events.forEach(eventName => {
            const handler = (event) => {
                this.handleGlobalEvent(event);
            };
            
            document.addEventListener(eventName, handler);
            this.eventHandlers.set(eventName, handler);
        });

        console.log('📢 Глобальные обработчики событий установлены');
    }

    async initializeComponentIntegration() {
        try {
            const metaParser = this.components.get('metaParser');
            const galaxyBuilder = this.components.get('galaxyBuilder');
            const contentManager = this.components.get('contentManager');
            const navigation = this.components.get('galaxyNavigation');
            
            if (metaParser && galaxyBuilder) {
                // Парсинг мета-данных и построение галактики
                console.log('🔍 Парсинг мета-данных и построение галактики...');
                const entities = await metaParser.parseAllPages();
                await galaxyBuilder.buildGalaxy(entities);
            }
            
            if (contentManager && this.appState.currentLevel) {
                // Авто-загрузка контента для специализированного шлюза
                console.log(`📚 Авто-загрузка контента для уровня: ${this.appState.currentLevel}`);
                await contentManager.loadContent(this.appState.currentLevel);
            }
            
            if (navigation && this.appState.currentLevel) {
                // Инициализация навигации
                navigation.switchLevel(this.appState.currentLevel, 'auto_activation');
            }
        } catch (error) {
            console.error('❌ Ошибка интеграции компонентов:', error);
            this.showNotification('Ошибка инициализации галактики', 'error');
        }
    }

    async startApplication() {
        // Запуск всех активных компонентов
        const startPromises = [];
        
        for (const [name, component] of this.components) {
            if (typeof component.start === 'function') {
                startPromises.push(
                    component.start().catch(error => {
                        console.error(`❌ Ошибка запуска ${name}:`, error);
                        this.errorRecovery.recordError(name, error);
                        return null;
                    })
                );
            }
        }
        
        await Promise.allSettled(startPromises);
        
        // Обновление состояния приложения
        this.appState.isInitialized = true;
        this.appState.isLoading = false;
        
        // Скрытие прелоадера
        await this.hidePreloader();
        
        // Запуск фоновых процессов
        this.startBackgroundProcesses();
        
        // Отправка события успешной инициализации
        this.dispatchEvent('appInitialized', { 
            timestamp: Date.now(),
            components: Array.from(this.components.keys()),
            performance: this.appState.performanceMetrics,
            domain: this.appState.domain,
            environment: this.appState.environment
        });
        
        // Обновление интерфейса
        this.updateUI();
        
        console.log('🎯 Приложение запущено и готово к работе на', this.appState.domain);
    }

    async hidePreloader() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            // Анимация исчезновения
            preloader.style.opacity = '0';
            preloader.style.transition = 'opacity 0.5s ease';
            
            await this.delay(500);
            preloader.style.display = 'none';
            
            // Восстановление оригинального title с учетом домена
            const domainSuffix = this.config.isBioapgreid ? ' | bioapgreid.ru' : 
                               this.config.isGitHubPages ? ' | GitHub Pages' : '';
            document.title = `Галактика GENOФОНД${domainSuffix}`;
        }
    }

    startBackgroundProcesses() {
        // Авто-сохранение каждые 30 секунд
        setInterval(() => {
            this.saveAppState();
        }, 30000);
        
        // Периодическая проверка состояния компонентов
        setInterval(() => {
            this.healthCheck();
        }, 60000);
        
        // Сохранение аналитики каждую минуту
        setInterval(() => {
            this.saveAnalytics();
        }, 60000);
        
        console.log('🔄 Фоновые процессы запущены');
    }

    handleGlobalEvent(event) {
        const { type, detail } = event;
        
        // Запись аналитики
        this.recordAnalyticsEvent(type, detail);
        
        switch (type) {
            case 'entityActivated':
                this.appState.focusedEntity = detail.entity;
                this.appState.analytics.interactions++;
                this.debouncedUpdateUI();
                break;
                
            case 'entityHovered':
                this.appState.analytics.interactions++;
                break;
                
            case 'galacticLevelChange':
                this.appState.currentLevel = detail.levelId;
                this.appState.analytics.navigationEvents++;
                this.debouncedSaveState();
                break;
                
            case 'zoomChanged':
                this.appState.currentZoom = detail.zoomLevel;
                this.debouncedUpdateUI();
                break;
                
            case 'progressUpdated':
                this.appState.userProgress = { ...this.appState.userProgress, ...detail.progress };
                this.debouncedSaveState();
                break;
                
            case 'componentError':
                this.appState.analytics.errors++;
                this.handleComponentError(detail);
                break;
                
            case 'performanceWarning':
                this.handlePerformanceWarning(detail);
                break;
        }
        
        // Логирование событий в development режиме
        if (this.isDevelopment()) {
            console.log(`📢 Глобальное событие: ${type}`, detail);
        }
    }

    recordAnalyticsEvent(eventType, data) {
        if (!this.config.enableAnalytics) return;
        
        this.appState.analytics[eventType] = (this.appState.analytics[eventType] || 0) + 1;
        
        // Добавление информации о домене в аналитику
        const analyticsData = {
            ...data,
            domain: this.appState.domain,
            environment: this.appState.environment,
            timestamp: Date.now()
        };
        
        // Дополнительная логика для специфических событий
        switch (eventType) {
            case 'app_initialized':
                console.log('📊 Аналитика: Приложение инициализировано', analyticsData);
                break;
            case 'componentError':
                console.warn('📊 Аналитика: Ошибка компонента', analyticsData);
                break;
        }
    }

    saveAnalytics() {
        if (!this.config.enableAnalytics) return;
        
        try {
            sessionStorage.setItem('genofond-analytics', JSON.stringify(this.appState.analytics));
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить аналитику:', error);
        }
    }

    handleComponentError(errorDetail) {
        console.error('🚨 Ошибка компонента:', errorDetail);
        
        // Показать уведомление пользователю
        this.showNotification(`Ошибка: ${errorDetail.error}`, 'error');
        
        // Автоматическое восстановление для некритичных ошибок
        if (this.config.enableErrorRecovery && !errorDetail.critical) {
            setTimeout(() => {
                this.errorRecovery.attemptRecovery(errorDetail.component);
            }, 2000);
        }
    }

    handlePerformanceWarning(warningDetail) {
        console.warn(`⚠️ Предупреждение производительности: ${warningDetail.type}`, warningDetail);
        
        // Автоматическая оптимизация при серьезных проблемах
        if (warningDetail.type === 'highMemoryUsage' && warningDetail.value > 200) {
            this.triggerMemoryOptimization();
        }
    }

    triggerMemoryOptimization() {
        console.log('🧹 Оптимизация использования памяти...');
        
        // Очистка кэшей компонентов
        for (const [name, component] of this.components) {
            if (component && typeof component.clearCache === 'function') {
                try {
                    component.clearCache();
                    console.log(`✅ Кэш ${name} очищен`);
                } catch (error) {
                    console.warn(`⚠️ Не удалось очистить кэш ${name}:`, error);
                }
            }
        }
        
        // Принудительный сбор мусора (если доступен)
        if (window.gc) {
            window.gc();
        }
        
        this.showNotification('Оптимизация памяти выполнена', 'info');
    }

    healthCheck() {
        console.log('❤️ Проверка состояния приложения...');
        
        const healthStatus = {
            timestamp: Date.now(),
            domain: this.appState.domain,
            environment: this.appState.environment,
            components: {},
            performance: this.performanceMonitor.getMetrics(),
            errors: Array.from(this.errorRecovery.errorCounts.entries())
        };
        
        // Проверка состояния каждого компонента
        for (const [name, component] of this.components) {
            healthStatus.components[name] = {
                loaded: !!component,
                hasError: this.errorRecovery.errorCounts.get(name) > 0,
                recoveryStatus: this.errorRecovery.getRecoveryStatus(name)
            };
        }
        
        this.dispatchEvent('healthCheck', healthStatus);
        
        // Автоматическое восстановление проблемных компонентов
        for (const [name, status] of Object.entries(healthStatus.components)) {
            if (status.hasError && !status.recoveryStatus.circuitState === 'OPEN') {
                this.errorRecovery.attemptRecovery(name);
            }
        }
    }

    showNotification(message, type = 'info') {
        const notificationCenter = document.getElementById('notifications');
        if (!notificationCenter) return;
        
        // Ограничение количества уведомлений
        if (notificationCenter.children.length > 5) {
            notificationCenter.removeChild(notificationCenter.firstChild);
        }
        
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
        
        // Обновление индикаторов производительности
        if (this.isDevelopment()) {
            this.updatePerformanceIndicators();
        }
    }

    updateStatistics() {
        const exploredPlanets = Object.keys(this.appState.userProgress).length;
        const metaParser = this.components.get('metaParser');
        const totalPlanets = metaParser?.getTotalPlanets?.() || 1;
        const progressLevel = Math.round((exploredPlanets / totalPlanets) * 100);
        
        const exploredElement = document.getElementById('exploredPlanets');
        const progressElement = document.getElementById('progressLevel');
        
        if (exploredElement) exploredElement.textContent = exploredPlanets;
        if (progressElement) progressElement.textContent = `${progressLevel}%`;
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

    updatePerformanceIndicators() {
        const memoryElement = document.getElementById('memoryUsage');
        const fpsElement = document.getElementById('fpsCounter');
        
        if (memoryElement && this.appState.performanceMetrics.memoryUsage > 0) {
            memoryElement.textContent = `${this.appState.performanceMetrics.memoryUsage.toFixed(1)}MB`;
        }
        
        if (fpsElement && this.appState.performanceMetrics.frameRate > 0) {
            fpsElement.textContent = `${this.appState.performanceMetrics.frameRate}FPS`;
        }
    }

    saveAppState() {
        if (this.saveStateTimeout) {
            clearTimeout(this.saveStateTimeout);
        }
        
        this.saveStateTimeout = setTimeout(() => {
            try {
                const stateToSave = {
                    userProgress: this.appState.userProgress,
                    currentLevel: this.appState.currentLevel,
                    domain: this.appState.domain, // ДОБАВЛЕНО: сохранение домена
                    environment: this.appState.environment, // ДОБАВЛЕНО: сохранение окружения
                    lastUpdated: Date.now(),
                    version: '2.1'
                };
                
                localStorage.setItem('genofond-app-state', JSON.stringify(stateToSave));
                localStorage.setItem('genofond-user-progress', JSON.stringify(this.appState.userProgress));
                
                console.log('💾 Состояние приложения сохранено');
            } catch (error) {
                console.warn('⚠️ Не удалось сохранить состояние приложения:', error);
            }
        }, 100);
    }

    debouncedUpdateUI = this.debounce(() => {
        this.updateUI();
    }, 100);

    debouncedSaveState = this.debounce(() => {
        this.saveAppState();
    }, this.config.saveStateDebounce);

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
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
                    <div class="error-details" style="display: none;">
                        <pre>${error.stack}</pre>
                    </div>
                    <div class="error-actions">
                        <button class="retry-btn" onclick="window.location.reload()">Повторить попытку</button>
                        <button class="safe-mode-btn" onclick="app.enterSafeMode()">Безопасный режим</button>
                        ${this.isDevelopment() ? '<button class="details-btn" onclick="this.parentElement.previousElementSibling.style.display=\'block\'">Подробности</button>' : ''}
                    </div>
                </div>
            `;
        }
        
        // Отправка аналитики ошибки
        this.dispatchEvent('appInitializationFailed', {
            error: error.message,
            timestamp: Date.now(),
            domain: this.appState.domain,
            components: Array.from(this.components.keys())
        });
    }

    async enterSafeMode() {
        console.log('🛡️ Вход в безопасный режим...');
        
        this.showNotification('Запуск в безопасном режиме', 'warning');
        
        // Остановка всех компонентов
        for (const [name, component] of this.components) {
            if (typeof component.destroy === 'function') {
                try {
                    await component.destroy();
                } catch (error) {
                    console.warn(`⚠️ Ошибка остановки ${name}:`, error);
                }
            }
        }
        
        this.components.clear();
        
        // Перезагрузка только критически важных компонентов
        setTimeout(() => {
            this.config.enableAnalytics = false;
            this.config.enablePerformanceMonitoring = false;
            window.location.reload();
        }, 1000);
    }

    dispatchEvent(eventName, detail) {
        try {
            const event = new CustomEvent(eventName, { detail });
            document.dispatchEvent(event);
        } catch (error) {
            console.error(`❌ Ошибка отправки события ${eventName}:`, error);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.search.includes('debug=true');
    }

    // Public API для внешнего использования
    getComponent(name) {
        return this.components.get(name);
    }

    getState() {
        return { ...this.appState };
    }

    getPerformanceMetrics() {
        return this.performanceMonitor.getMetrics();
    }

    setZoom(zoomLevel) {
        this.appState.currentZoom = Math.max(0.3, Math.min(3.0, zoomLevel));
        this.dispatchEvent('zoomChanged', { zoomLevel: this.appState.currentZoom });
    }

    navigateToLevel(levelId) {
        this.dispatchEvent('galacticLevelChange', { levelId });
    }

    /**
     * Очистка ресурсов приложения
     */
    async destroy() {
        console.log('🧹 Очистка ресурсов приложения v2.1...');
        
        // Остановка мониторинга
        this.performanceMonitor.stop();
        
        // Очистка таймаутов
        if (this.saveStateTimeout) {
            clearTimeout(this.saveStateTimeout);
        }
        
        // Сохранение аналитики
        this.saveAnalytics();
        
        // Удаление обработчиков событий
        for (const [eventName, handler] of this.eventHandlers) {
            document.removeEventListener(eventName, handler);
        }
        this.eventHandlers.clear();
        
        // Остановка компонентов
        const destroyPromises = [];
        for (const [name, component] of this.components) {
            if (typeof component.destroy === 'function') {
                destroyPromises.push(
                    component.destroy().catch(error => {
                        console.warn(`⚠️ Ошибка уничтожения ${name}:`, error);
                    })
                );
            }
        }
        
        await Promise.allSettled(destroyPromises);
        this.components.clear();
        
        console.log('✅ Ресурсы приложения v2.1 очищены');
    }
}

// Глобальная доступность для инициализации
window.GenofondApp = GenofondApp;

// Автоматическая инициализация при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new GenofondApp();
        window.app.init().catch(console.error);
    });
} else {
    window.app = new GenofondApp();
    window.app.init().catch(console.error);
}
