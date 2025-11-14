// bioapgreid/js/app.js
// СТАТУС: АКТУАЛЬНЫЙ (ОБНОВЛЕННЫЙ ДЛЯ ДЕТАЛЬНОГО ЛОГИРОВАНИЯ)
// ВЕРСИЯ: 2.1.1
// ТИП: JavaScript (Главный координатор/Orchestrator с расширенным логированием)
// НАЗНАЧЕНИЕ ФАЙЛА: Центральный мозг всей галактики BIOAPGREID. Координирует инициализацию всех подсистем, управляет глобальным состоянием приложения, обрабатывает межкомпонентную коммуникацию и обеспечивает синхронизацию данных между всеми модулями. ВЕРСИЯ 2.1.1 включает расширенное логирование для диагностики проблем на bioapgreid.ru
// ОСНОВНЫЕ УЛУЧШЕНИЯ ВЕРСИИ 2.1.1:
//   - Расширенное логирование каждого этапа инициализации с временными метками
//   - Детальная диагностика проблем загрузки компонентов и ресурсов
//   - Интеграция с улучшенной системой прелоадера из index.html
//   - Автоматическая проверка доступности критических файлов
//   - Улучшенная обработка ошибок с конкретными сообщениями для разных доменов
//   - Поддержка детального отладки через глобальную функцию debugGenofond()
//   - Мониторинг производительности с метриками в реальном времени
//   - Расширенная аналитика пользовательских взаимодействий
//   - Интеграция с обновленными компонентами (Navigation 2.1, Interaction 2.1)
//   - Улучшенная система предзагрузки и кэширования
//   - Расширенная обработка ошибок с автоматическим восстановлением
//   - Поддержка стратегий graceful degradation
//   - Улучшенная система уведомлений и обратной связи
// СВЯЗАННЫЕ ФАЙЛЫ:
//   - js/meta-parser.js
//   - js/galaxy-builder.js
//   - js/visibility-manager.js
//   - js/content-manager.js
//   - js/galaxy-interaction.js (v2.1)
//   - js/galaxy-navigation.js (v2.1)
//   - js/adaptive-positioning.js
//   - index.html (обновленный с расширенным прелоадером)
// СТРУКТУРА:
//   - class GenofondApp (главный класс приложения)
//   - class PerformanceMonitor (мониторинг производительности)
//   - class ErrorRecoverySystem (система восстановления)
//   - appState (единое состояние приложения)
//   - components (реестр всех компонентов)
//   - init() (последовательная инициализация с логированием)
//   - initializeComponents() (фаза инициализации компонентов с событиями прогресса)
//   - setupComponentIntegration() (настройка взаимодействий)
//   - startApplication() (запуск рабочего режима)
//   - checkFileAvailability() (проверка доступности файлов)
//   - sendProgressEvent() (отправка событий прогресса)
// ЗАВИСИМОСТИ (ПЕРЕЧИСЛИТЕ ВСЕ ЗАВИСИМОСТИ):
//   ВНЕШНИЕ: НЕТ
//   ВНЕШНИЕ: НЕТ
//   ВНУТРЕННИЕ: Все JS модули системы, index.html
//   СТАНДАРТНЫЕ: Map, CustomEvent, localStorage, sessionStorage, Promise, async/await, PerformanceObserver, fetch
// КОНФИГУРАЦИЯ:
//   - appState: {isInitialized, currentZoom, focusedEntity, userProgress, visibilityThreshold, performanceMetrics, domain, environment}
//   - Порядок инициализации компонентов с приоритетами
//   - Таймауты и интервалы для фоновых процессов
//   - Пороги для системы восстановления
//   - Критические файлы для проверки доступности
// ОСОБЕННОСТИ РЕАЛИЗАЦИИ:
//   - Event-driven архитектура с Custom Events
//   - Последовательная асинхронная инициализация с приоритетами
//   - Единый источник истины для состояния приложения
//   - Graceful degradation при ошибках компонентов
//   - Circuit breaker для зависимых компонентов
//   - Retry механизм с экспоненциальной задержкой
//   - Debounce для частых обновлений состояния
//   - Memory leak protection через очистку ссылок
//   - Atomic state updates для предотвращения race conditions
//   - Система аналитики в реальном времени
//   - Автоматическое восстановление компонентов
//   - Расширенное логирование для диагностики проблем
// НЮАНСЫ РЕАЛИЗАЦИИ:
//   - Модуль требует полной загрузки DOM перед инициализацией
//   - Компоненты инициализируются в строгом порядке приоритета
//   - Все асинхронные операции защищены таймаутами
//   - Состояние приложения атомарно обновляется для избежания частичных состояний
//   - Обработчики событий автоматически очищаются при уничтожении
//   - Circuit breaker предотвращает каскадные отказы при ошибках компонентов
//   - Exponential backoff используется для повторных попыток инициализации
//   - Memory pressure triggers автоматическую оптимизацию ресурсов
//   - Детальное логирование каждого этапа для диагностики проблем на bioapgreid.ru
// 🧩 ЖИЗНЕННЫЙ ЦИКЛ (ВРЕМЕННАЯ ФАЗНОСТЬ):
//   1. [ИНИЦИАЛИЗАЦИЯ] — Создание экземпляров PerformanceMonitor, ErrorRecoverySystem, загрузка пользовательских данных, настройка аналитики, последовательная инициализация компонентов по приоритетам с отправкой событий прогресса
//   2. [РАБОЧИЙ ЦИКЛ] — Запуск компонентов, мониторинг производительности каждые 2с, автосохранение каждые 30с, health check каждые 60с, обработка глобальных событий, обновление UI
//   3. [СОБЫТИЯ] — Обработка entityActivated, galacticLevelChange, zoomChanged, componentError через центральный диспетчер, аналитика событий, автоматическое восстановление
//   4. [ЗАВЕРШЕНИЕ] — Остановка мониторинга, очистка таймаутов, удаление обработчиков событий, остановка компонентов, сохранение аналитики
// ⚡ СОБЫТИЙНЫЙ КОНТРАКТ:
//   - Взаимодействие через CustomEvent систему document.dispatchEvent/document.addEventListener
//   - Генерируемые события: appInitialized, componentError, performanceWarning, healthCheck, appInitializationFailed, componentLoaded, componentProgress, fileCheckResult
//   - Принимаемые события: entityActivated, entityHovered, galacticLevelChange, contentLoaded, zoomChanged, cameraMoved, visibilityUpdated, progressUpdated
//   - Исключения обрабатываются через ErrorRecoverySystem с circuit breaker и автоматическим восстановлением
//   - Приоритет: События UI > Навигация > Данные > Системные события
// 🕒 ТАЙМИНГ И ПРИОРИТЕТЫ:
//   - Мониторинг производительности: каждые 2000мс
//   - Автосохранение: каждые 30000мс
//   - Health check: каждые 60000мс
//   - Порядок исполнения: Критические компоненты > UI компоненты > Фоновые сервисы
//   - В пределах кадра: Обновление UI (100мс debounce), Сохранение состояния (1000мс debounce)
// 🔧 ИСПРАВЛЕНИЯ ДЛЯ УСТРАНЕНИЯ ПОТЕНЦИАЛЬНЫХ ПРОБЛЕМ:
//   - Circuit breaker для предотвращения каскадных отказов
//   - Retry с экспоненциальной задержкой для устойчивости к временным сбоям
//   - Debounce для частых операций обновления состояния
//   - Atomic state updates для consistency
//   - Memory leak protection через явную очистку ссылок
//   - Graceful degradation при ошибках некритичных компонентов
//   - Timeout защиты для всех асинхронных операций
//   - Lazy recovery для автоматического восстановления компонентов
//   - Performance monitoring с автоматической оптимизацией
//   - Детальная проверка доступности файлов перед инициализацией
//   - Расширенное логирование для диагностики проблем на bioapgreid.ru

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
        // Сначала инициализируем config полностью
        this.config = {
            maxRetries: 3,
            retryDelay: 1000,
            circuitBreakerThreshold: 3,
            initialStateTimeout: 5000,
            saveStateDebounce: 1000, // ДОБАВЛЕНО: это свойство было отсутствует
            componentLoadTimeout: 10000,
            enableAnalytics: true,
            enablePerformanceMonitoring: true,
            enableErrorRecovery: true,
            baseUrl: 'https://www.bioapgreid.ru/',
            isGitHubPages: window.location.hostname.includes('github.io'),
            isBioapgreid: window.location.hostname.includes('bioapgreid.ru'),
            // ДОБАВЛЕНО: Критические файлы для проверки
            criticalFiles: [
                'js/app.js',
                'js/meta-parser.js', 
                'js/galaxy-builder.js',
                'sitemap.json',
                'pages/filosofiya.html'
            ]
        };

        // Теперь debouncedSaveState может безопасно использовать this.config.saveStateDebounce
        this.debouncedSaveState = this.debounce(() => {
            this.saveAppState();
        }, this.config.saveStateDebounce);

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
            domain: window.location.hostname,
            environment: this.getEnvironment(),
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
                domain: window.location.hostname
            },
            // ДОБАВЛЕНО: Детальная информация для отладки
            debug: {
                initializationSteps: [],
                fileAvailability: {},
                componentStatus: {},
                errors: []
            }
        };
        
        this.eventHandlers = new Map();
        this.initializationQueue = [];
        this.saveStateTimeout = null;
        
        // Системы
        this.performanceMonitor = new PerformanceMonitor(this);
        this.errorRecovery = new ErrorRecoverySystem(this);
        
        console.log(`🚀 GenofondApp v2.1.1 инициализирован для домена: ${this.appState.domain}`);
        console.log(`📍 Окружение: ${this.appState.environment}`);
        console.log(`📍 Base URL: ${window.genofondConfig?.baseUrl || 'не определен'}`);
        
        // Запись шага инициализации
        this.recordDebugStep('constructor', 'Экземпляр приложения создан');
    }

    /**
     * Определение текущего окружения
     */
    getEnvironment() {
        if (window.location.hostname.includes('bioapgreid.ru')) {
            return 'production';
        } else if (window.location.hostname.includes('github.io')) {
            return 'staging';
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'development';
        } else {
            return 'unknown';
        }
    }

    /**
     * Запись шага отладки
     */
    recordDebugStep(step, message, data = null) {
        const debugStep = {
            step,
            message,
            timestamp: Date.now(),
            data
        };
        
        this.appState.debug.initializationSteps.push(debugStep);
        console.log(`🔧 [${step}] ${message}`, data || '');
    }

    /**
     * Проверка доступности файла
     */
    async checkFileAvailability(url) {
        try {
            const startTime = performance.now();
            const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
            const availability = response.ok;
            const loadTime = performance.now() - startTime;
            
            this.appState.debug.fileAvailability[url] = {
                available: availability,
                status: response.status,
                loadTime: loadTime,
                checkedAt: Date.now()
            };
            
            this.recordDebugStep('fileCheck', `Файл ${url}: ${availability ? '✅ доступен' : '❌ недоступен'}`, {
                status: response.status,
                loadTime: loadTime.toFixed(2) + 'ms'
            });
            
            return availability;
        } catch (error) {
            this.appState.debug.fileAvailability[url] = {
                available: false,
                error: error.message,
                checkedAt: Date.now()
            };
            
            this.recordDebugStep('fileCheck', `Файл ${url}: ❌ ошибка проверки`, error.message);
            return false;
        }
    }

    /**
     * Отправка события прогресса
     */
    sendProgressEvent(type, data) {
        this.dispatchEvent('componentProgress', {
            type,
            timestamp: Date.now(),
            domain: this.appState.domain,
            ...data
        });
    }

    /**
     * Предварительная проверка файлов
     */
    async preFlightCheck() {
        this.recordDebugStep('preFlightCheck', 'Начало проверки критических файлов');
        
        let availableCount = 0;
        const results = [];

        for (const file of this.config.criticalFiles) {
            const isAvailable = await this.checkFileAvailability(file);
            results.push({ file, available: isAvailable });
            if (isAvailable) availableCount++;
            
            // Отправка события прогресса проверки файлов
            this.sendProgressEvent('fileCheck', {
                file,
                available: isAvailable,
                progress: Math.round((availableCount / this.config.criticalFiles.length) * 100),
                checkedFiles: availableCount,
                totalFiles: this.config.criticalFiles.length
            });
            
            // Короткая задержка между проверками
            await this.delay(100);
        }

        this.recordDebugStep('preFlightCheck', `Проверка файлов завершена: ${availableCount}/${this.config.criticalFiles.length} доступно`, results);
        
        // Проверяем наличие критических файлов
        const criticalFilesMissing = results.filter(r => 
            r.file.startsWith('js/') && !r.available
        ).length > 0;

        if (criticalFilesMissing) {
            throw new Error(`Отсутствуют критические JavaScript файлы. Доступно: ${availableCount}/${this.config.criticalFiles.length}`);
        }

        return results;
    }

    async init() {
        const startTime = performance.now();
        
        try {
            console.log(`🚀 ===== НАЧАЛО ИНИЦИАЛИЗАЦИИ ГАЛАКТИКИ BIOAPGREID v2.1.1 =====`);
            console.log(`📍 Домен: ${this.appState.domain}`);
            console.log(`📍 Окружение: ${this.appState.environment}`);
            console.log(`📍 Путь: ${window.location.pathname}`);
            
            this.recordDebugStep('init', 'Начало инициализации приложения');

            // ФАЗА 0: ПРЕДВАРИТЕЛЬНАЯ ПРОВЕРКА
            this.recordDebugStep('init', 'Фаза 0: Предварительная проверка');
            this.sendProgressEvent('phase', { phase: 0, message: 'Предварительная проверка...' });
            
            await this.showPreloader();
            const fileCheckResults = await this.preFlightCheck();

            // ФАЗА 1: ПРЕДВАРИТЕЛЬНАЯ НАСТРОЙКА
            this.recordDebugStep('init', 'Фаза 1: Предварительная настройка');
            this.sendProgressEvent('phase', { phase: 1, message: 'Предварительная настройка...' });
            
            await this.loadUserData();
            await this.setupAnalytics();
            
            // Запуск мониторинга производительности
            if (this.config.enablePerformanceMonitoring) {
                this.performanceMonitor.start();
            }

            // ФАЗА 2: ИНИЦИАЛИЗАЦИЯ КОМПОНЕНТОВ
            this.recordDebugStep('init', 'Фаза 2: Инициализация компонентов');
            this.sendProgressEvent('phase', { phase: 2, message: 'Инициализация компонентов...' });
            
            await this.initializeComponents();

            // ФАЗА 3: НАСТРОЙКА ВЗАИМОДЕЙСТВИЙ
            this.recordDebugStep('init', 'Фаза 3: Настройка взаимодействий');
            this.sendProgressEvent('phase', { phase: 3, message: 'Настройка взаимодействий...' });
            
            await this.setupComponentIntegration();

            // ФАЗА 4: ЗАПУСК СИСТЕМЫ
            this.recordDebugStep('init', 'Фаза 4: Запуск системы');
            this.sendProgressEvent('phase', { phase: 4, message: 'Запуск системы...' });
            
            await this.startApplication();
            
            const initTime = performance.now() - startTime;
            this.appState.performanceMetrics.initTime = initTime;
            
            console.log(`🎉 Галактика BIOAPGREID v2.1.1 успешно инициализирована на ${this.appState.domain} за ${initTime.toFixed(2)}мс!`);
            
            // Аналитика успешной инициализации
            this.recordAnalyticsEvent('app_initialized', { 
                initTime,
                domain: this.appState.domain,
                environment: this.appState.environment,
                components: Array.from(this.components.keys()),
                fileCheckResults
            });
            
            this.recordDebugStep('init', 'Инициализация успешно завершена', {
                initTime: initTime.toFixed(2) + 'ms',
                components: Array.from(this.components.keys()),
                domain: this.appState.domain
            });
            
        } catch (error) {
            const errorTime = performance.now() - startTime;
            console.error(`💥 КРИТИЧЕСКАЯ ОШИБКА ИНИЦИАЛИЗАЦИИ на ${this.appState.domain} через ${errorTime.toFixed(2)}мс:`, error);
            
            this.appState.lastError = {
                message: error.message,
                timestamp: Date.now(),
                phase: 'initialization',
                domain: this.appState.domain,
                stack: error.stack
            };
            
            this.appState.debug.errors.push({
                type: 'initialization',
                message: error.message,
                phase: 'init',
                timestamp: Date.now(),
                domain: this.appState.domain
            });
            
            this.recordAnalyticsEvent('app_initialization_failed', { 
                error: error.message,
                initTime: errorTime,
                domain: this.appState.domain,
                environment: this.appState.environment,
                debug: this.appState.debug
            });
            
            this.recordDebugStep('init', 'Критическая ошибка инициализации', error);
            
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
            { percent: 5, text: 'Загрузка космического пространства...' },
            { percent: 15, text: 'Проверка системных файлов...' },
            { percent: 30, text: 'Инициализация звездных систем...' },
            { percent: 50, text: 'Построение галактики...' },
            { percent: 70, text: 'Настройка навигации...' },
            { percent: 85, text: 'Подготовка к запуску...' },
            { percent: 95, text: 'Завершение инициализации...' }
        ];
        
        for (const step of progressSteps) {
            if (!this.appState.isInitialized) {
                this.sendProgressEvent('preloader', {
                    percent: step.percent,
                    message: step.text
                });
                await this.delay(300);
            }
        }
    }

    async updatePreloaderProgress(percent, text) {
        const progressFill = document.getElementById('preloaderProgress');
        const progressText = document.getElementById('preloaderText');
        const percentEl = document.getElementById('preloaderPercent');
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        if (progressText) {
            progressText.textContent = text;
        }
        if (percentEl) {
            percentEl.textContent = `${percent}%`;
        }
        
        // Обновление title для отображения прогресса
        const domainSuffix = this.config.isBioapgreid ? ' | bioapgreid.ru' : 
                           this.config.isGitHubPages ? ' | GitHub Pages' : '';
        document.title = `BIOAPGREID (${percent}%)${domainSuffix}`;
    }

    async loadUserData() {
        try {
            this.recordDebugStep('loadUserData', 'Загрузка данных пользователя');
            
            // Загрузка прогресса пользователя из localStorage с таймаутом
            const [savedProgress, savedState] = await Promise.all([
                this.loadWithTimeout('genofond-user-progress'),
                this.loadWithTimeout('genofond-app-state')
            ]);
            
            if (savedProgress) {
                this.appState.userProgress = JSON.parse(savedProgress);
                this.recordDebugStep('loadUserData', 'Прогресс пользователя загружен');
            }
            
            if (savedState) {
                const state = JSON.parse(savedState);
                this.appState.currentLevel = state.currentLevel;
                this.recordDebugStep('loadUserData', 'Состояние приложения загружено');
            }
            
            // Проверка авто-активации уровня из специализированного шлюза
            if (window.autoActivateLevel && typeof window.autoActivateLevel === 'string') {
                this.appState.currentLevel = window.autoActivateLevel;
                this.recordDebugStep('loadUserData', `Авто-активация уровня: ${window.autoActivateLevel}`);
            }
            
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить данные пользователя:', error);
            this.appState.userProgress = {};
            this.recordDebugStep('loadUserData', 'Ошибка загрузки данных пользователя', error.message);
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
        
        this.recordDebugStep('setupAnalytics', 'Настройка системы аналитики');
        
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
        
        this.recordDebugStep('setupAnalytics', 'Система аналитики настроена');
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

        let loadedCount = 0;
        const totalComponents = components.length;

        for (const component of components) {
            // Проверка circuit breaker
            if (this.errorRecovery.isCircuitOpen(component.name)) {
                console.warn(`🔌 Circuit breaker открыт для ${component.name}, пропускаем инициализацию`);
                this.appState.debug.componentStatus[component.name] = 'circuit_open';
                continue;
            }

            try {
                this.recordDebugStep('initializeComponents', `Инициализация компонента: ${component.name}`);
                
                const startTime = performance.now();
                await this.initializeComponentWithRetry(component);
                const loadTime = performance.now() - startTime;
                
                this.performanceMonitor.recordComponentLoadTime(component.name, loadTime);
                loadedCount++;
                
                // Отправка события загрузки компонента
                this.dispatchEvent('componentLoaded', {
                    component: component.name,
                    loadTime: loadTime,
                    loadedCount: loadedCount,
                    totalComponents: totalComponents
                });
                
                this.sendProgressEvent('componentLoad', {
                    component: component.name,
                    loadedCount: loadedCount,
                    totalComponents: totalComponents,
                    progress: Math.round((loadedCount / totalComponents) * 100)
                });
                
                console.log(`✅ ${component.name} инициализирован за ${loadTime.toFixed(2)}мс (${loadedCount}/${totalComponents})`);
                
                await this.delay(50); // Короткая задержка между инициализациями
                
            } catch (error) {
                console.error(`❌ Ошибка инициализации ${component.name}:`, error);
                this.errorRecovery.recordError(component.name, error);
                
                this.appState.debug.componentStatus[component.name] = 'error';
                this.appState.debug.errors.push({
                    type: 'component_initialization',
                    component: component.name,
                    message: error.message,
                    timestamp: Date.now()
                });
                
                if (component.critical) {
                    throw new Error(`Критический компонент ${component.name} не удалось инициализировать: ${error.message}`);
                }
            }
        }
        
        this.recordDebugStep('initializeComponents', `Инициализация компонентов завершена: ${loadedCount}/${totalComponents} успешно`);
    }

    async initializeComponentWithRetry(componentConfig, attempt = 0) {
        try {
            return await this.initializeComponent(componentConfig);
        } catch (error) {
            if (attempt < this.config.maxRetries) {
                const delayTime = this.config.retryDelay * Math.pow(2, attempt); // Экспоненциальная задержка
                console.log(`🔄 Повторная попытка ${attempt + 1} для ${componentConfig.name} через ${delayTime}мс...`);
                
                this.recordDebugStep('initializeComponentWithRetry', `Повторная попытка для ${componentConfig.name}`, {
                    attempt: attempt + 1,
                    maxRetries: this.config.maxRetries,
                    delay: delayTime
                });
                
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
                        this.appState.debug.componentStatus[componentConfig.name] = 'loaded';
                        
                        if (typeof componentInstance.init === 'function') {
                            await componentInstance.init();
                        }
                        
                        this.recordDebugStep('initializeComponent', `Компонент ${componentConfig.name} успешно инициализирован`);
                        resolve(componentInstance);
                    } else {
                        const error = new Error(`Класс для ${componentConfig.name} не найден`);
                        this.appState.debug.componentStatus[componentConfig.name] = 'class_not_found';
                        reject(error);
                    }
                } catch (error) {
                    this.appState.debug.componentStatus[componentConfig.name] = 'init_error';
                    reject(error);
                }
            };
            
            script.onerror = () => {
                clearTimeout(timeoutId);
                this.appState.debug.componentStatus[componentConfig.name] = 'load_error';
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
        this.recordDebugStep('setupComponentIntegration', 'Настройка межкомпонентной интеграции');
        
        // Настройка межкомпонентной коммуникации через Custom Events
        this.setupGlobalEventHandlers();
        
        // Инициализация интеграции между компонентами
        await this.initializeComponentIntegration();
        
        this.recordDebugStep('setupComponentIntegration', 'Интеграция компонентов настроена');
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
            'interactionEnded',
            // ДОБАВЛЕНО: События для отладки
            'componentProgress',
            'fileCheckResult'
        ];

        events.forEach(eventName => {
            const handler = (event) => {
                this.handleGlobalEvent(event);
            };
            
            document.addEventListener(eventName, handler);
            this.eventHandlers.set(eventName, handler);
        });

        this.recordDebugStep('setupGlobalEventHandlers', `Установлено ${events.length} глобальных обработчиков событий`);
    }

    async initializeComponentIntegration() {
        try {
            this.recordDebugStep('initializeComponentIntegration', 'Инициализация интеграции компонентов');
            
            const metaParser = this.components.get('metaParser');
            const galaxyBuilder = this.components.get('galaxyBuilder');
            const contentManager = this.components.get('contentManager');
            const navigation = this.components.get('galaxyNavigation');
            
            if (metaParser && galaxyBuilder) {
                // Парсинг мета-данных и построение галактики
                this.recordDebugStep('initializeComponentIntegration', 'Парсинг мета-данных и построение галактики');
                const entities = await metaParser.parseAllPages();
                await galaxyBuilder.buildGalaxy(entities);
            }
            
            if (contentManager && this.appState.currentLevel) {
                // Авто-загрузка контента для специализированного шлюза
                this.recordDebugStep('initializeComponentIntegration', `Авто-загрузка контента для уровня: ${this.appState.currentLevel}`);
                await contentManager.loadContent(this.appState.currentLevel);
            }
            
            if (navigation && this.appState.currentLevel) {
                // Инициализация навигации
                this.recordDebugStep('initializeComponentIntegration', `Инициализация навигации для уровня: ${this.appState.currentLevel}`);
                navigation.switchLevel(this.appState.currentLevel, 'auto_activation');
            }
            
            this.recordDebugStep('initializeComponentIntegration', 'Интеграция компонентов завершена');
        } catch (error) {
            console.error('❌ Ошибка интеграции компонентов:', error);
            this.showNotification('Ошибка инициализации галактики', 'error');
            this.recordDebugStep('initializeComponentIntegration', 'Ошибка интеграции компонентов', error);
        }
    }

    async startApplication() {
        this.recordDebugStep('startApplication', 'Запуск основного приложения');
        
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
            environment: this.appState.environment,
            debug: this.appState.debug
        });
        
        // Обновление интерфейса
        this.updateUI();
        
        this.recordDebugStep('startApplication', 'Приложение запущено и готово к работе');
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
            document.title = `Галактика BIOAPGREID${domainSuffix}`;
        }
    }

    startBackgroundProcesses() {
        this.recordDebugStep('startBackgroundProcesses', 'Запуск фоновых процессов');
        
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
                
            // ДОБАВЛЕНО: Обработка событий прогресса
            case 'componentProgress':
            case 'fileCheckResult':
                // Эти события уже обрабатываются в UI через index.html
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
            errors: Array.from(this.errorRecovery.errorCounts.entries()),
            debug: this.appState.debug
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
        
        let breadcrumbHTML = '<span class="breadcrumb-item">Галактика BIOAPGREID</span>';
        
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
                    domain: this.appState.domain,
                    environment: this.appState.environment,
                    lastUpdated: Date.now(),
                    version: '2.1.1'
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
                    <div class="error-details">
                        <strong>Домен:</strong> ${this.appState.domain}<br>
                        <strong>Окружение:</strong> ${this.appState.environment}<br>
                        <strong>Время:</strong> ${new Date().toLocaleString()}
                    </div>
                    <div class="error-actions">
                        <button class="error-btn primary" onclick="window.location.reload()">Повторить попытку</button>
                        <button class="error-btn secondary" onclick="window.genofondApp.enterSafeMode()">Безопасный режим</button>
                        ${this.isDevelopment() ? '<button class="error-btn tertiary" onclick="this.nextElementSibling.style.display=\'block\'">Подробности</button>' : ''}
                    </div>
                    ${this.isDevelopment() ? `
                    <div class="error-debug" style="display: none; margin-top: 20px; text-align: left;">
                        <strong>Отладочная информация:</strong><br>
                        <pre>${JSON.stringify(this.appState.debug, null, 2)}</pre>
                    </div>` : ''}
                </div>
            `;
        }
        
        // Отправка аналитики ошибки
        this.dispatchEvent('appInitializationFailed', {
            error: error.message,
            timestamp: Date.now(),
            domain: this.appState.domain,
            components: Array.from(this.components.keys()),
            debug: this.appState.debug
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
               window.location.search.includes('debug=true') ||
               this.appState.environment === 'development';
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
     * Глобальная функция отладки
     */
    debug() {
        console.log('=== GENOFOND DEBUG INFO ===');
        console.log('App State:', this.appState);
        console.log('Components:', Array.from(this.components.keys()));
        console.log('Performance:', this.performanceMonitor.getMetrics());
        console.log('Error Recovery:', this.errorRecovery);
        console.log('File Availability:', this.appState.debug.fileAvailability);
        console.log('Initialization Steps:', this.appState.debug.initializationSteps);
        console.log('========================');
        
        return {
            state: this.appState,
            components: Array.from(this.components.keys()),
            performance: this.performanceMonitor.getMetrics(),
            fileAvailability: this.appState.debug.fileAvailability
        };
    }

    /**
     * Очистка ресурсов приложения
     */
    async destroy() {
        console.log('🧹 Очистка ресурсов приложения v2.1.1...');
        
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
        
        console.log('✅ Ресурсы приложения v2.1.1 очищены');
    }
}

// Глобальная доступность для инициализации
window.GenofondApp = GenofondApp;

// Глобальная функция отладки
window.debugGenofond = function() {
    if (window.genofondApp) {
        return window.genofondApp.debug();
    } else {
        console.warn('⚠️ GenofondApp еще не инициализирован');
        return null;
    }
};

// Автоматическая инициализация при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🌐 DOM загружен, запуск GenofondApp...');
        window.app = new GenofondApp();
        window.genofondApp = window.app;
        window.app.init().catch(console.error);
    });
} else {
    console.log('🌐 DOM уже загружен, немедленный запуск GenofondApp...');
    window.app = new GenofondApp();
    window.genofondApp = window.app;
    window.app.init().catch(console.error);
}
