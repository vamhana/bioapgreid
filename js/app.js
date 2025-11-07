// ===== GENOФОНД - MAIN APPLICATION ORCHESTRATOR =====

class GenofondApp {
    constructor() {
        this.components = new Map();
        this.backgroundIntervals = {};
        this.appState = {
            isInitialized: false,
            isOnline: navigator.onLine,
            currentView: null,
            userProgress: {},
            settings: {},
            performance: {
                tier: 'high', // 'high', 'medium', 'low'
                animationsEnabled: true,
                cacheEnabled: true
            }
        };
        
        // Привязка методов для корректного удаления событий
        this.boundOnlineHandler = this.handleOnline.bind(this);
        this.boundOfflineHandler = this.handleOffline.bind(this);
        this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
        this.boundErrorHandler = this.handleGlobalError.bind(this);
        this.boundRejectionHandler = this.handleRejection.bind(this);
        
        this.init();
    }

    async init() {
        try {
            this.showPreloader();
            
            // Определяем уровень производительности устройства
            this.detectPerformanceTier();
            
            // Настраиваем Service Worker для кеширования
            await this.setupServiceWorker();
            
            // Загружаем настройки и данные пользователя
            await this.loadUserData();
            
            // Инициализируем все компоненты
            await this.initializeComponents();
            
            // Настраиваем межкомпонентное взаимодействие
            this.setupComponentIntegration();
            
            // Настраиваем оптимизации производительности
            this.setupPerformanceOptimizations();
            
            // Запускаем приложение
            await this.startApplication();
            
        } catch (error) {
            this.handleFatalError(error);
        }
    }

    detectPerformanceTier() {
        // Определяем возможности устройства для оптимизации
        const isLowPerf = (
            navigator.hardwareConcurrency < 4 ||
            (navigator.deviceMemory && navigator.deviceMemory < 4) ||
            !this.checkWebGLSupport() ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );

        const isMediumPerf = (
            navigator.hardwareConcurrency < 6 ||
            (navigator.deviceMemory && navigator.deviceMemory < 6)
        );

        if (isLowPerf) {
            this.appState.performance.tier = 'low';
            this.appState.performance.animationsEnabled = false;
            document.body.classList.add('performance-low');
        } else if (isMediumPerf) {
            this.appState.performance.tier = 'medium';
            document.body.classList.add('performance-medium');
        } else {
            document.body.classList.add('performance-high');
        }

        console.log(`🎯 Уровень производительности: ${this.appState.performance.tier}`);
    }

    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                     (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    async setupServiceWorker() {
        if ('serviceWorker' in navigator && this.appState.performance.cacheEnabled) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 Обновление Service Worker обнаружено');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showNotification(
                                'Доступно обновление приложения. Перезагрузите страницу.',
                                'info',
                                8000
                            );
                        }
                    });
                });

                console.log('✅ Service Worker зарегистрирован');
            } catch (error) {
                console.warn('❌ Ошибка регистрации Service Worker:', error);
                this.appState.performance.cacheEnabled = false;
            }
        }
    }

    checkBrowserSupport() {
        const features = {
            'ES6 Modules': () => typeof Symbol !== 'undefined',
            'CSS Variables': () => window.CSS && CSS.supports('color', 'var(--test)'),
            'Flexbox': () => window.CSS && CSS.supports('display', 'flex'),
            'LocalStorage': () => !!window.localStorage,
            'Promise': () => !!window.Promise,
            'Custom Elements': () => !!window.customElements,
            'Map': () => !!window.Map
        };

        const unsupported = Object.entries(features)
            .filter(([name, test]) => !test())
            .map(([name]) => name);

        if (unsupported.length > 0) {
            console.warn('Неподдерживаемые функции:', unsupported);
            return false;
        }

        return true;
    }

    async initializeComponents() {
        console.log('🚀 Инициализация компонентов GENOФОНД...');
        
        // Проверяем поддержку браузером необходимых функций
        if (!this.checkBrowserSupport()) {
            throw new Error('Ваш браузер не поддерживает необходимые функции. Пожалуйста, обновите браузер.');
        }

        // Инициализируем компоненты в правильном порядке с учетом производительности
        const initializationOrder = [
            { name: 'contentManager', component: ContentManager },
            { name: 'dnaNavigation', component: DNAHelix },
            { name: 'cellInteraction', component: CellInteraction }
        ];

        // Последовательная инициализация для снижения пиковой нагрузки
        for (const { name, component } of initializationOrder) {
            try {
                console.log(`🔄 Инициализация ${name}...`);
                
                if (typeof component !== 'function') {
                    throw new Error(`Component ${name} is not available`);
                }
                
                // Добавляем задержку между инициализациями для плавности
                if (this.appState.performance.tier === 'low') {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                const instance = new component();
                this.components.set(name, instance);
                
                console.log(`✅ ${name} успешно инициализирован`);
                
            } catch (error) {
                console.error(`❌ Ошибка инициализации ${name}:`, error);
                throw new Error(`Не удалось инициализировать ${name}: ${error.message}`);
            }
        }
    }

    setupPerformanceOptimizations() {
        // Оптимизация для слабых устройств
        if (this.appState.performance.tier === 'low') {
            this.enableLowPerformanceMode();
        }

        // Пауза анимаций при бездействии
        this.setupInactivityHandler();

        // Мониторинг производительности
        this.setupPerformanceMonitoring();
    }

    enableLowPerformanceMode() {
        console.log('🔧 Включен режим низкой производительности');
        
        // Отключаем тяжелые анимации
        document.body.classList.add('reduced-motion');
        
        // Уменьшаем частоту обновления статистики
        if (this.backgroundIntervals.stats) {
            clearInterval(this.backgroundIntervals.stats);
            this.backgroundIntervals.stats = setInterval(() => {
                this.updateUserStats();
            }, 120000); // 2 минуты вместо 1
        }
    }

    setupInactivityHandler() {
        let inactivityTimer;
        const pauseAnimations = () => {
            document.body.classList.add('animations-paused');
        };
        const resumeAnimations = () => {
            document.body.classList.remove('animations-paused');
        };

        const resetTimer = () => {
            resumeAnimations();
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(pauseAnimations, 10000); // 10 секунд бездействия
        };

        // События пользовательской активности
        ['mousemove', 'keypress', 'click', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimer, { passive: true });
        });

        resetTimer(); // Запускаем таймер
    }

    setupPerformanceMonitoring() {
        // Мониторинг FPS
        let frameCount = 0;
        let lastTime = performance.now();
        
        const checkFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                frameCount = 0;
                lastTime = currentTime;
                
                // Автоматическое снижение качества при низком FPS
                if (fps < 30 && this.appState.performance.tier !== 'low') {
                    console.warn(`⚠️ Низкий FPS: ${fps}, включаем оптимизации`);
                    this.enableLowPerformanceMode();
                    this.appState.performance.tier = 'low';
                }
            }
            requestAnimationFrame(checkFPS);
        };
        
        checkFPS();
    }

    setupComponentIntegration() {
        console.log('🔗 Настройка взаимодействия компонентов...');
        
        // Синхронизация ДНК навигации и органелл
        this.setupDNACellSync();
        
        // Обработка запросов контента
        this.setupContentManagement();
        
        // Система уведомлений
        this.setupNotificationSystem();
        
        // Обработка глобальных событий
        this.setupGlobalEventHandlers();
        
        // Управление кешем
        this.setupCacheManagement();
    }

    setupDNACellSync() {
        // Синхронизация между ДНК навигацией и органеллами
        document.addEventListener('dnaLevelChange', (e) => {
            const { levelId } = e.detail;
            
            // Подсвечиваем соответствующую органеллу
            this.components.get('cellInteraction')?.highlightOrganellesForLevel(levelId);
            
            // Обновляем статистику
            this.updateUserStats();
        });

        document.addEventListener('organelleActivated', (e) => {
            const { levelId } = e.detail;
            
            // Подсвечиваем соответствующий уровень ДНК
            this.components.get('dnaNavigation')?.highlightLevel(levelId);
            
            // Обновляем статистику
            this.updateUserStats();
        });
    }

    setupContentManagement() {
        // Обработка запросов на показ контента
        document.addEventListener('organelleContentRequest', (e) => {
            const { levelId } = e.detail;
            this.components.get('contentManager')?.showContent(levelId);
        });

        // Обработка скрытия контента
        document.addEventListener('contentHidden', () => {
            this.appState.currentView = null;
            this.updateUserStats();
        });
    }

    setupNotificationSystem() {
        // Глобальная система уведомлений
        document.addEventListener('showNotification', (e) => {
            this.showNotification(e.detail.message, e.detail.type, e.detail.duration);
        });
    }

    setupCacheManagement() {
        // Обработчик для кнопки управления кешем
        document.addEventListener('click', (e) => {
            if (e.target.id === 'cacheManager') {
                this.showCacheManagementDialog();
            }
        });
    }

    showCacheManagementDialog() {
        const cacheStats = this.getCacheStatistics();
        const message = `
            💾 Управление кешем\n
            • Уровень производительности: ${this.appState.performance.tier}
            • Анимации: ${this.appState.performance.animationsEnabled ? 'вкл' : 'выкл'}
            • Кеш: ${this.appState.performance.cacheEnabled ? 'вкл' : 'выкл'}
            • Использовано памяти: ${cacheStats.memoryUsage ? cacheStats.memoryUsage.used + 'MB' : 'N/A'}
        `;

        if (confirm(`${message}\n\nОчистить все кеши?`)) {
            this.clearAllCaches();
        }
    }

    setupGlobalEventHandlers() {
        // Обработка онлайн/оффлайн статуса
        window.addEventListener('online', this.boundOnlineHandler);
        window.addEventListener('offline', this.boundOfflineHandler);

        // Обработка видимости страницы
        document.addEventListener('visibilitychange', this.boundVisibilityHandler);

        // Обработка закрытия страницы
        window.addEventListener('beforeunload', () => {
            this.saveAppState();
        });

        // Глобальный обработчик ошибок
        window.addEventListener('error', this.boundErrorHandler);
        window.addEventListener('unhandledrejection', this.boundRejectionHandler);
    }

    handleOnline() {
        this.appState.isOnline = true;
        this.showNotification('Соединение восстановлено', 'success', 3000);
        this.syncOfflineData();
    }

    handleOffline() {
        this.appState.isOnline = false;
        this.showNotification('Работаем в оффлайн-режиме', 'warning', 5000);
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.saveAppState();
            // Приостанавливаем тяжелые операции когда страница не видна
            document.body.classList.add('background-tab');
        } else {
            document.body.classList.remove('background-tab');
            this.updateUserStats();
        }
    }

    handleRejection(event) {
        this.handleGlobalError(event.reason);
    }

    async startApplication() {
        console.log('🎬 Запуск приложения...');
        
        // Скрываем прелоадер
        this.hidePreloader();
        
        // Показываем приветственное сообщение
        if (!localStorage.getItem('genofond_welcomed')) {
            setTimeout(() => {
                this.showWelcomeMessage();
                localStorage.setItem('genofond_welcomed', 'true');
            }, 1000);
        }
        
        // Обновляем статистику пользователя
        this.updateUserStats();
        
        // Запускаем фоновые процессы
        this.startBackgroundProcesses();
        
        this.appState.isInitialized = true;
        
        console.log('✅ GENOФОНД успешно запущен');
        
        // Отправляем аналитику
        this.trackAppLaunch();
    }

    showWelcomeMessage() {
        this.showNotification(
            'Добро пожаловать в GENOФОНД! Исследуйте клеточную вселенную для поиска путей к бессмертию.',
            'info',
            8000
        );
    }

    updateUserStats() {
        const statsPanel = document.querySelector('.user-stats');
        if (!statsPanel) return;

        try {
            const contentManager = this.components.get('contentManager');
            const dnaNavigation = this.components.get('dnaNavigation');
            
            if (!contentManager || !dnaNavigation) return;

            const currentLevel = dnaNavigation.getCurrentLevel();
            const levelData = dnaNavigation.getLevelData(currentLevel);
            const progress = contentManager.getLevelProgress(currentLevel);
            
            // Обновляем отображение статистики
            const biologicalAge = this.calculateBiologicalAge();
            const overallProgress = this.calculateOverallProgress();
            
            const levelElement = statsPanel.querySelector('.progress-level .value');
            const ageElement = statsPanel.querySelector('.biological-age .value');
            const progressElement = statsPanel.querySelector('.overall-progress .value');
            
            if (levelElement) {
                levelElement.textContent = levelData?.number ?? '0';
            }
            
            if (ageElement) {
                ageElement.textContent = biologicalAge;
            }

            if (progressElement) {
                progressElement.textContent = `${overallProgress}%`;
            }
            
            // Сохраняем в состоянии
            this.appState.userProgress.currentLevel = currentLevel;
            this.appState.userProgress.biologicalAge = biologicalAge;
            this.appState.userProgress.overallProgress = overallProgress;
            
        } catch (error) {
            console.warn('Failed to update user stats:', error);
        }
    }

    calculateBiologicalAge() {
        // Упрощенный расчет биологического возраста на основе прогресса
        const contentManager = this.components.get('contentManager');
        if (!contentManager) return '--';
        
        const progress = this.calculateOverallProgress();
        const baseAge = 30; // Базовый возраст
        const ageReduction = Math.floor(progress / 10); // Каждые 10% прогресса уменьшают возраст на 1 год
        
        return Math.max(20, baseAge - ageReduction); // Минимальный возраст 20 лет
    }

    calculateOverallProgress() {
        const contentManager = this.components.get('contentManager');
        if (!contentManager) return 0;
        
        const structure = contentManager.getContentStructure();
        const levels = Object.keys(structure);
        let totalProgress = 0;
        let completedLevels = 0;
        
        levels.forEach(levelId => {
            const progress = contentManager.getLevelProgress(levelId);
            totalProgress += progress;
            if (progress >= 80) completedLevels++;
        });
        
        return Math.round(totalProgress / levels.length);
    }

    showNotification(message, type = 'info', duration = 5000) {
        // Оптимизация: не показывать уведомления когда страница не видна
        if (document.hidden && type !== 'error') return null;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" aria-label="Закрыть уведомление">&times;</button>
            </div>
        `;

        const container = document.getElementById('notifications') || this.createNotificationContainer();
        container.appendChild(notification);

        // Анимация появления
        setTimeout(() => notification.classList.add('notification-show'), 10);

        // Автоудаление
        const removeNotification = () => {
            notification.classList.remove('notification-show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        };

        // Таймер автоудаления
        if (duration > 0) {
            setTimeout(removeNotification, duration);
        }

        // Закрытие по клику
        notification.querySelector('.notification-close').addEventListener('click', removeNotification);
        
        return notification;
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notifications';
        container.className = 'notification-center';
        document.querySelector('.cell-universe')?.appendChild(container);
        return container;
    }

    showPreloader() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.style.display = 'flex';
            preloader.style.opacity = '1';
        }
    }

    hidePreloader() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }
    }

    async loadUserData() {
        try {
            // Загрузка данных пользователя из localStorage
            const savedProgress = localStorage.getItem('genofond_user_progress');
            const savedSettings = localStorage.getItem('genofond_user_settings');
            
            if (savedProgress) {
                this.appState.userProgress = JSON.parse(savedProgress);
            }
            
            if (savedSettings) {
                this.appState.settings = JSON.parse(savedSettings);
            }
            
            console.log('📊 Данные пользователя загружены');
            
        } catch (error) {
            console.warn('Ошибка загрузки данных пользователя:', error);
            // Используем настройки по умолчанию
            this.appState.settings = {
                theme: 'dark',
                animations: true,
                sound: false,
                reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            };
        }
    }

    saveAppState() {
        try {
            localStorage.setItem('genofond_user_progress', JSON.stringify(this.appState.userProgress));
            localStorage.setItem('genofond_user_settings', JSON.stringify(this.appState.settings));
        } catch (error) {
            console.warn('Не удалось сохранить состояние приложения:', error);
        }
    }

    async syncOfflineData() {
        // Синхронизация данных, накопленных в оффлайн-режиме
        console.log('🔄 Синхронизация оффлайн-данных...');
        // Здесь может быть интеграция с бэкендом
    }

    startBackgroundProcesses() {
        // Периодическое сохранение состояния
        this.backgroundIntervals.save = setInterval(() => {
            this.saveAppState();
        }, 30000); // Каждые 30 секунд

        // Обновление статистики (частота зависит от производительности)
        this.backgroundIntervals.stats = setInterval(() => {
            this.updateUserStats();
        }, this.appState.performance.tier === 'low' ? 120000 : 60000); // 1 или 2 минуты

        // Сборка мусора для кеша
        this.backgroundIntervals.cacheCleanup = setInterval(() => {
            this.components.get('contentManager')?.cleanupExpiredCache?.();
        }, 300000); // 5 минут
    }

    handleGlobalError(error) {
        console.error('Глобальная ошибка приложения:', error);
        
        // Не показываем уведомления для мелких ошибок
        if (error.message?.includes('ResizeObserver') || 
            error.message?.includes('CLS')) {
            return;
        }
        
        this.showNotification(
            'Произошла непредвиденная ошибка. Приложение продолжает работать.',
            'error',
            5000
        );
        
        // Отправка ошибки в аналитику (если подключена)
        this.trackError(error);
    }

    handleFatalError(error) {
        console.error('Фатальная ошибка инициализации:', error);
        
        this.hidePreloader();
        
        // Показываем экран ошибки
        const errorHTML = `
            <div class="fatal-error">
                <div class="error-icon">⚠️</div>
                <h2>Ошибка запуска приложения</h2>
                <p>Не удалось инициализировать GENOФОНД. Пожалуйста, обновите страницу.</p>
                <p class="error-detail">${error.message}</p>
                <button class="btn btn-primary" onclick="window.location.reload()">
                    Обновить страницу
                </button>
                <div class="error-actions">
                    <button class="btn btn-secondary" onclick="genofondApp.showSupport()">
                        Справка
                    </button>
                    <button class="btn btn-secondary" onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload()">
                        Сбросить данные
                    </button>
                </div>
            </div>
        `;
        
        document.body.innerHTML = errorHTML;
    }

    trackAppLaunch() {
        // Отслеживание запуска приложения
        console.log('📈 App launched:', {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            online: this.appState.isOnline,
            performanceTier: this.appState.performance.tier
        });
    }

    trackError(error) {
        // Отслеживание ошибок
        console.error('📉 App error:', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            performanceTier: this.appState.performance.tier
        });
    }

    showSupport() {
        this.showNotification(
            'Для получения помощи обратитесь в службу поддержки.',
            'info',
            5000
        );
    }

    // Методы управления кешем
    clearAllCaches() {
        // Очистка Service Worker кеша
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                    caches.delete(cacheName);
                });
            });
        }
        
        // Очистка localStorage (кроме пользовательских данных)
        const keysToKeep = ['genofond_user_progress', 'genofond_user_settings', 'genofond_welcomed'];
        Object.keys(localStorage).forEach(key => {
            if (!keysToKeep.includes(key) && !key.startsWith('section-') && !key.startsWith('progress-')) {
                localStorage.removeItem(key);
            }
        });
        
        // Очистка memory cache компонентов
        this.components.forEach(component => {
            if (typeof component.clearCache === 'function') {
                component.clearCache();
            }
        });
        
        this.showNotification('Кеши успешно очищены', 'success', 3000);
    }

    getCacheStatistics() {
        const contentManager = this.components.get('contentManager');
        const cacheStats = contentManager?.getCacheStats?.() || {};
        
        return {
            contentCache: cacheStats,
            serviceWorker: this.getSWCacheStatus(),
            memoryUsage: this.getMemoryUsage(),
            performanceTier: this.appState.performance.tier
        };
    }

    getSWCacheStatus() {
        if (!('serviceWorker' in navigator)) return 'not_supported';
        return navigator.serviceWorker.controller ? 'active' : 'inactive';
    }

    getMemoryUsage() {
        if (performance.memory) {
            const memory = performance.memory;
            return {
                used: Math.round(memory.usedJSHeapSize / 1048576),
                total: Math.round(memory.totalJSHeapSize / 1048576),
                limit: Math.round(memory.jsHeapSizeLimit / 1048576)
            };
        }
        return null;
    }

    // Публичные методы API
    getAppState() {
        return { ...this.appState };
    }

    getComponent(name) {
        return this.components.get(name);
    }

    restartApp() {
        if (confirm('Перезапустить приложение? Текущий прогресс будет сохранен.')) {
            this.saveAppState();
            window.location.reload();
        }
    }

    exportData() {
        const data = {
            appState: this.appState,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `genofond-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Данные успешно экспортированы', 'success');
    }

    // Деструктор для очистки
    destroy() {
        // Очистка интервалов
        if (this.backgroundIntervals) {
            Object.values(this.backgroundIntervals).forEach(interval => {
                clearInterval(interval);
            });
        }

        // Уничтожение компонентов
        this.components.forEach(component => {
            if (typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        
        this.components.clear();
        
        // Удаляем глобальные обработчики
        window.removeEventListener('online', this.boundOnlineHandler);
        window.removeEventListener('offline', this.boundOfflineHandler);
        document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
        window.removeEventListener('error', this.boundErrorHandler);
        window.removeEventListener('unhandledrejection', this.boundRejectionHandler);
    }
}

// ===== ГЛОБАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ =====

let genofondApp = null;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Проверяем, не запущено ли уже приложение
        if (window.genofondApp) {
            console.warn('Приложение уже запущено');
            return;
        }

        console.log('🧬 Запуск GENOФОНД...');
        
        // Добавляем класс загрузки
        document.body.classList.add('app-loading');
        
        // Создаем экземпляр приложения
        genofondApp = new GenofondApp();
        window.genofondApp = genofondApp;
        
        // Убираем класс загрузки когда приложение готово
        setTimeout(() => {
            document.body.classList.remove('app-loading');
            document.body.classList.add('app-ready');
        }, 1000);

    } catch (error) {
        console.error('Критическая ошибка при запуске:', error);
        document.body.classList.add('app-error');
        
        // Показываем сообщение об ошибке
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.innerHTML = `
                <div class="fatal-error">
                    <div class="error-icon">⚠️</div>
                    <h2>Критическая ошибка</h2>
                    <p>Не удалось запустить приложение. Пожалуйста, обновите страницу.</p>
                    <p class="error-detail">${error.message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Обновить страницу</button>
                    <div class="error-actions">
                        <button class="btn btn-secondary" onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload()">
                            Сбросить данные
                        </button>
                    </div>
                </div>
            `;
        }
    }
});

// Обработчик для кнопок быстрого доступа
document.addEventListener('DOMContentLoaded', function() {
    const quickTestBtn = document.getElementById('quickTest');
    if (quickTestBtn) {
        quickTestBtn.addEventListener('click', function() {
            if (window.genofondApp) {
                window.genofondApp.showNotification(
                    'Функция быстрого теста в разработке. Скоро будет доступна!',
                    'info',
                    4000
                );
            }
        });
    }

    const personalPathBtn = document.getElementById('personalPath');
    if (personalPathBtn) {
        personalPathBtn.addEventListener('click', function() {
            if (window.genofondApp) {
                window.genofondApp.showNotification(
                    'Персональный путь будет рассчитан на основе ваших данных.',
                    'info',
                    4000
                );
            }
        });
    }

    const exportDataBtn = document.getElementById('exportData');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', function() {
            if (window.genofondApp) {
                window.genofondApp.exportData();
            }
        });
    }
});

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GenofondApp;
}
