// ===== GENOФОНД - MAIN APPLICATION ORCHESTRATOR =====

class GenofondApp {
    constructor() {
        this.components = new Map();
        this.appState = {
            isInitialized: false,
            isOnline: navigator.onLine,
            currentView: null,
            userProgress: {},
            settings: {}
        };
        
        this.init();
    }

    async init() {
        try {
            this.showPreloader();
            
            // Загружаем настройки и данные пользователя
            await this.loadUserData();
            
            // Инициализируем все компоненты
            await this.initializeComponents();
            
            // Настраиваем межкомпонентное взаимодействие
            this.setupComponentIntegration();
            
            // Запускаем приложение
            await this.startApplication();
            
        } catch (error) {
            this.handleFatalError(error);
        }
    }

    async initializeComponents() {
        console.log('🚀 Инициализация компонентов GENOФОНД...');
        
        // Проверяем поддержку браузером необходимых функций
        if (!this.checkBrowserSupport()) {
            throw new Error('Ваш браузер не поддерживает необходимые функции. Пожалуйста, обновите браузер.');
        }

        // Инициализируем компоненты в правильном порядке
        const initializationOrder = [
            { name: 'contentManager', component: ContentManager },
            { name: 'dnaNavigation', component: DNAHelix },
            { name: 'cellInteraction', component: CellInteraction }
        ];

        for (const { name, component } of initializationOrder) {
            try {
                console.log(`🔄 Инициализация ${name}...`);
                
                if (typeof component !== 'function') {
                    throw new Error(`Component ${name} is not available`);
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

    setupGlobalEventHandlers() {
        // Обработка онлайн/оффлайн статуса
        window.addEventListener('online', () => {
            this.appState.isOnline = true;
            this.showNotification('Соединение восстановлено', 'success', 3000);
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.appState.isOnline = false;
            this.showNotification('Работаем в оффлайн-режиме', 'warning', 5000);
        });

        // Обработка видимости страницы
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveAppState();
            } else {
                this.updateUserStats();
            }
        });

        // Обработка закрытия страницы
        window.addEventListener('beforeunload', () => {
            this.saveAppState();
        });

        // Глобальный обработчик ошибок
        window.addEventListener('error', (e) => {
            this.handleGlobalError(e.error);
        });

        window.addEventListener('unhandledrejection', (e) => {
            this.handleGlobalError(e.reason);
        });
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
            const levelElement = statsPanel.querySelector('.progress-level .value');
            const ageElement = statsPanel.querySelector('.biological-age .value');
            
            if (levelElement) {
                levelElement.textContent = levelData?.number ?? '0';
            }
            
            if (ageElement) {
                ageElement.textContent = biologicalAge;
            }
            
            // Сохраняем в состоянии
            this.appState.userProgress.currentLevel = currentLevel;
            this.appState.userProgress.biologicalAge = biologicalAge;
            this.appState.userProgress.overallProgress = this.calculateOverallProgress();
            
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
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
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
        setInterval(() => {
            this.saveAppState();
        }, 30000); // Каждые 30 секунд

        // Обновление статистики каждую минуту
        setInterval(() => {
            this.updateUserStats();
        }, 60000);
    }

    checkBrowserSupport() {
        const features = {
            'ES6 Modules': () => typeof Symbol !== 'undefined',
            'CSS Variables': () => window.CSS && CSS.supports('color', 'var(--test)'),
            'Flexbox': () => window.CSS && CSS.supports('display', 'flex'),
            'LocalStorage': () => !!window.localStorage,
            'Promise': () => !!window.Promise,
            'Custom Elements': () => !!window.customElements
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
            online: this.appState.isOnline
        });
    }

    trackError(error) {
        // Отслеживание ошибок
        console.error('📉 App error:', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }

    showSupport() {
        this.showNotification(
            'Для получения помощи обратитесь в службу поддержки.',
            'info',
            5000
        );
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
    }
}

// ===== ГЛОБАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ =====

// Создаем глобальный экземпляр приложения
let genofondApp = null;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Проверяем, не запущено ли уже приложение
        if (window.genofondApp) {
            console.warn('Приложение уже запущено');
            return;
        }

        console.log('🧬 Запуск GENOФОНД...');
        
        // Создаем экземпляр приложения
        genofondApp = new GenofondApp();
        window.genofondApp = genofondApp;
        
        // Делаем доступным для консоли отладки
        if (typeof window !== 'undefined') {
            window.genofondApp = genofondApp;
        }

    } catch (error) {
        console.error('Критическая ошибка при запуске:', error);
        
        // Показываем сообщение об ошибке
        document.body.innerHTML = `
            <div class="fatal-error">
                <h2>Критическая ошибка</h2>
                <p>Не удалось запустить приложение. Пожалуйста, обновите страницу.</p>
                <button onclick="window.location.reload()">Обновить</button>
            </div>
        `;
    }
});

// Обработчик для кнопки быстрого теста
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
});

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GenofondApp;
}
