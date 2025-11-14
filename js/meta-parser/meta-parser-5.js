class GalaxyMetaOrchestrator {
    #modules = new Map();
    #moduleStates = new Map();
    #eventBus = new EventBus();
    #healthMonitor = new HealthMonitor();
    #pluginSystem = new PluginSystem();
    #config = {
        autoInitialize: true,
        healthCheckInterval: 30000,
        maxRestartAttempts: 3,
        dependencyTimeout: 10000
    };
    #systemState = 'UNINITIALIZED';

    constructor(config = {}) {
        this.#config = { ...this.#config, ...config };
        console.log('🎼 GalaxyMetaOrchestrator создан');
    }

    /**
     * Инициализация всей системы
     */
    async initialize() {
        if (this.#systemState !== 'UNINITIALIZED') {
            console.warn('⚠️ Система уже инициализирована');
            return;
        }

        this.#systemState = 'INITIALIZING';
        console.log('🚀 Инициализация Galaxy Meta Parser System...');

        try {
            // 1. Проверка зависимостей
            await this.#checkDependencies();
            
            // 2. Инициализация модулей в правильном порядке
            await this.#initializeModules();
            
            // 3. Настройка мониторинга
            await this.#setupMonitoring();
            
            // 4. Загрузка плагинов
            await this.#loadPlugins();
            
            // 5. Запуск системы
            await this.#startSystem();

            this.#systemState = 'RUNNING';
            console.log('✅ Galaxy Meta Parser System успешно запущена');

            this.#eventBus.emit('system:initialized', {
                timestamp: Date.now(),
                modules: Array.from(this.#modules.keys()),
                state: this.#systemState
            });

        } catch (error) {
            this.#systemState = 'ERROR';
            console.error('💥 Ошибка инициализации системы:', error);
            
            this.#eventBus.emit('system:error', {
                error: error.message,
                phase: 'initialization',
                state: this.#systemState
            });
            
            throw error;
        }
    }

    /**
     * Проверка зависимостей системы
     */
    async #checkDependencies() {
        const dependencies = {
            'MetaCache': window.MetaCache,
            'HierarchyBuilder': window.HierarchyBuilder,
            'GalaxyMetaParser': window.GalaxyMetaParser,
            'SitemapGenerator': window.SitemapGenerator
        };

        const missing = Object.entries(dependencies)
            .filter(([name, module]) => !module)
            .map(([name]) => name);

        if (missing.length > 0) {
            throw new Error(`Отсутствуют обязательные модули: ${missing.join(', ')}`);
        }

        console.log('✅ Все зависимости загружены');
    }

    /**
     * Инициализация модулей в правильном порядке
     */
    async #initializeModules() {
        const initializationOrder = [
            {
                name: 'metaParser',
                factory: () => window.GalaxyMetaParser.create(window.app),
                dependencies: ['MetaCache', 'HierarchyBuilder']
            },
            {
                name: 'sitemapGenerator', 
                factory: (modules) => new window.SitemapGenerator(modules.get('metaParser')),
                dependencies: ['metaParser']
            },
            {
                name: 'vercelAdapter',
                factory: (modules) => new window.VercelAdapter(),
                dependencies: ['metaParser', 'sitemapGenerator']
            }
        ];

        for (const moduleConfig of initializationOrder) {
            console.log(`🔧 Инициализация модуля: ${moduleConfig.name}`);
            
            try {
                const module = await moduleConfig.factory(this.#modules);
                this.#modules.set(moduleConfig.name, module);
                this.#moduleStates.set(moduleConfig.name, 'INITIALIZED');
                
                console.log(`✅ Модуль ${moduleConfig.name} инициализирован`);
                
            } catch (error) {
                console.error(`❌ Ошибка инициализации модуля ${moduleConfig.name}:`, error);
                throw error;
            }
        }
    }

    /**
     * Настройка мониторинга системы
     */
    async #setupMonitoring() {
        // Настройка периодических проверок здоровья
        setInterval(() => {
            this.#healthMonitor.checkSystemHealth(this.#modules);
        }, this.#config.healthCheckInterval);

        // Подписка на события системы
        this.#eventBus.on('module:error', (event) => {
            this.#healthMonitor.recordError(event.module, event.error);
        });

        this.#eventBus.on('module:warning', (event) => {
            this.#healthMonitor.recordWarning(event.module, event.message);
        });

        console.log('🔍 Система мониторинга настроена');
    }

    /**
     * Загрузка и инициализация плагинов
     */
    async #loadPlugins() {
        // Автоматическая загрузка плагинов из конфигурации
        const pluginConfigs = this.#config.plugins || [];
        
        for (const pluginConfig of pluginConfigs) {
            try {
                await this.#pluginSystem.loadPlugin(pluginConfig);
            } catch (error) {
                console.warn(`⚠️ Не удалось загрузить плагин ${pluginConfig.name}:`, error);
            }
        }

        console.log(`🔌 Загружено ${this.#pluginSystem.getPluginCount()} плагинов`);
    }

    /**
     * Запуск системы
     */
    async #startSystem() {
        // Активация Vercel адаптера если доступен
        const vercelAdapter = this.#modules.get('vercelAdapter');
        if (vercelAdapter && vercelAdapter.activate) {
            try {
                await vercelAdapter.activate();
                console.log('🔗 Vercel адаптер активирован');
            } catch (error) {
                console.warn('⚠️ Vercel адаптер не активирован:', error.message);
            }
        }

        // Запуск начального парсинга
        const metaParser = this.#modules.get('metaParser');
        if (metaParser && this.#config.autoParseOnStart) {
            setTimeout(() => {
                console.log('🔍 Запуск начального парсинга...');
                metaParser.parseAllPages();
            }, 2000);
        }

        console.log('🎯 Система готова к работе');
    }

    /**
     * Получение модуля по имени
     */
    getModule(moduleName) {
        return this.#modules.get(moduleName);
    }

    /**
     * Получение состояния системы
     */
    getSystemState() {
        return {
            state: this.#systemState,
            modules: Object.fromEntries(this.#moduleStates),
            health: this.#healthMonitor.getHealthReport(),
            plugins: this.#pluginSystem.getPluginInfo(),
            stats: this.#getSystemStats()
        };
    }

    /**
     * Статистика системы
     */
    #getSystemStats() {
        const metaParser = this.#modules.get('metaParser');
        const sitemapGenerator = this.#modules.get('sitemapGenerator');
        
        return {
            entities: metaParser ? metaParser.getAllEntities().length : 0,
            cacheSize: metaParser ? metaParser.getStats().cacheSize : 0,
            sitemapVersions: sitemapGenerator ? sitemapGenerator.getVersionHistory().length : 0,
            uptime: Date.now() - (this.#healthMonitor.startTime || Date.now()),
            eventsProcessed: this.#eventBus.getEventCount()
        };
    }

    /**
     * Перезапуск системы
     */
    async restart() {
        console.log('🔄 Перезапуск системы...');
        
        this.#systemState = 'RESTARTING';
        this.#eventBus.emit('system:restarting');
        
        // Остановка системы
        await this.shutdown();
        
        // Повторная инициализация
        await this.initialize();
    }

    /**
     * Остановка системы
     */
    async shutdown() {
        console.log('🛑 Остановка системы...');
        
        this.#systemState = 'SHUTTING_DOWN';
        
        // Остановка всех модулей в обратном порядке
        const shutdownOrder = ['vercelAdapter', 'sitemapGenerator', 'metaParser'];
        
        for (const moduleName of shutdownOrder) {
            const module = this.#modules.get(moduleName);
            if (module && module.destroy) {
                try {
                    await module.destroy();
                    console.log(`✅ Модуль ${moduleName} остановлен`);
                } catch (error) {
                    console.error(`❌ Ошибка остановки модуля ${moduleName}:`, error);
                }
            }
        }
        
        // Очистка
        this.#modules.clear();
        this.#moduleStates.clear();
        this.#systemState = 'SHUTDOWN';
        
        this.#eventBus.emit('system:shutdown');
        console.log('✅ Система остановлена');
    }

    /**
     * Регистрация кастомного модуля
     */
    registerModule(name, moduleFactory, dependencies = []) {
        if (this.#modules.has(name)) {
            throw new Error(`Модуль с именем ${name} уже зарегистрирован`);
        }

        this.#pluginSystem.registerModule(name, moduleFactory, dependencies);
        console.log(`🔧 Модуль ${name} зарегистрирован`);
    }

    /**
     * Выполнение системной команды
     */
    async executeCommand(command, params = {}) {
        const commands = {
            'parse:all': () => this.getModule('metaParser')?.parseAllPages(),
            'sitemap:generate': () => this.getModule('sitemapGenerator')?._generateFromUniversalMetaData(params),
            'sitemap:save': () => this.getModule('sitemapGenerator')?.saveToDataFile(),
            'cache:clear': () => this.getModule('metaParser')?.clearCache(),
            'health:report': () => this.#healthMonitor.generateReport(),
            'diagnostics:run': () => this.#runDiagnostics()
        };

        if (!commands[command]) {
            throw new Error(`Неизвестная команда: ${command}`);
        }

        console.log(`⚡ Выполнение команды: ${command}`);
        return await commands[command]();
    }

    /**
     * Запуск диагностики системы
     */
    async #runDiagnostics() {
        const diagnostics = {
            modules: this.#checkModuleHealth(),
            api: await this.#checkAPIEndpoints(),
            performance: this.#checkPerformance(),
            storage: this.#checkStorage()
        };

        this.#eventBus.emit('system:diagnostics', diagnostics);
        return diagnostics;
    }

    #checkModuleHealth() {
        const health = {};
        for (const [name, module] of this.#modules) {
            health[name] = {
                exists: !!module,
                state: this.#moduleStates.get(name),
                methods: this.#getModuleMethods(module)
            };
        }
        return health;
    }

    #getModuleMethods(module) {
        if (!module) return [];
        return Object.getOwnPropertyNames(Object.getPrototypeOf(module))
            .filter(prop => typeof module[prop] === 'function' && prop !== 'constructor');
    }

    async #checkAPIEndpoints() {
        const endpoints = [
            '/api/project-structure',
            '/api/meta-parser',
            '/api/sitemap',
            '/api/pages'
        ];

        const results = {};
        for (const endpoint of endpoints) {
            try {
                const start = performance.now();
                const response = await fetch(endpoint, { method: 'HEAD' });
                const time = performance.now() - start;
                
                results[endpoint] = {
                    status: response.status,
                    ok: response.ok,
                    responseTime: Math.round(time)
                };
            } catch (error) {
                results[endpoint] = {
                    status: 'error',
                    ok: false,
                    error: error.message
                };
            }
        }
        return results;
    }

    #checkPerformance() {
        return {
            memory: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null,
            navigation: performance.getEntriesByType('navigation')[0] || null,
            timing: performance.timing || null
        };
    }

    #checkStorage() {
        try {
            return {
                localStorage: {
                    enabled: !!window.localStorage,
                    size: JSON.stringify(localStorage).length
                },
                sessionStorage: {
                    enabled: !!window.sessionStorage
                },
                indexedDB: {
                    enabled: !!window.indexedDB
                }
            };
        } catch (error) {
            return { error: error.message };
        }
    }
}

/**
 * Система мониторинга здоровья
 */
class HealthMonitor {
    #metrics = new Map();
    #alerts = new Set();
    #startTime = Date.now();

    constructor() {
        console.log('❤️ HealthMonitor инициализирован');
    }

    /**
     * Проверка здоровья системы
     */
    checkSystemHealth(modules) {
        const healthReport = {
            timestamp: Date.now(),
            modules: {},
            system: this.#checkSystemHealth(),
            performance: this.#checkPerformanceMetrics()
        };

        // Проверка каждого модуля
        for (const [name, module] of modules) {
            healthReport.modules[name] = this.#checkModuleHealth(name, module);
        }

        // Проверка на критические ошибки
        const criticalErrors = this.#checkForCriticalErrors(healthReport);
        if (criticalErrors.length > 0) {
            this.#triggerAlerts(criticalErrors);
        }

        this.#metrics.set('lastHealthCheck', healthReport);
        return healthReport;
    }

    #checkSystemHealth() {
        return {
            uptime: Date.now() - this.#startTime,
            memory: this.#getMemoryUsage(),
            load: this.#getSystemLoad(),
            errors: this.#getErrorCount()
        };
    }

    #checkPerformanceMetrics() {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
            pageLoad: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
            domReady: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
            firstPaint: this.#getFirstPaint(),
            largestContentfulPaint: this.#getLCP()
        };
    }

    #getMemoryUsage() {
        return performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1048576),
            total: Math.round(performance.memory.totalJSHeapSize / 1048576),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
        } : null;
    }

    #getSystemLoad() {
        // Упрощенная проверка загрузки системы
        const entries = performance.getEntriesByType('resource');
        return {
            resourceCount: entries.length,
            totalSize: entries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)
        };
    }

    #getErrorCount() {
        return Array.from(this.#metrics.values())
            .filter(metric => metric.type === 'error').length;
    }

    #getFirstPaint() {
        const entry = performance.getEntriesByName('first-paint')[0];
        return entry ? entry.startTime : 0;
    }

    #getLCP() {
        const entry = performance.getEntriesByName('largest-contentful-paint')[0];
        return entry ? entry.startTime : 0;
    }

    #checkModuleHealth(name, module) {
        if (!module) {
            return { status: 'MISSING', error: 'Module not found' };
        }

        try {
            // Базовые проверки для известных модулей
            if (name === 'metaParser' && module.getStats) {
                const stats = module.getStats();
                return {
                    status: 'HEALTHY',
                    stats: {
                        entities: stats.totalParsed,
                        cacheHits: stats.cacheHits,
                        errors: stats.errors
                    }
                };
            }

            if (name === 'sitemapGenerator' && module.getStatistics) {
                const stats = module.getStatistics();
                return {
                    status: 'HEALTHY',
                    stats: {
                        generations: stats.sitemap.generations,
                        entities: stats.entities.totalEntities
                    }
                };
            }

            return { status: 'UNKNOWN', message: 'No specific health checks defined' };

        } catch (error) {
            return { status: 'ERROR', error: error.message };
        }
    }

    #checkForCriticalErrors(healthReport) {
        const errors = [];
        
        // Проверка отсутствующих модулей
        Object.entries(healthReport.modules).forEach(([name, health]) => {
            if (health.status === 'MISSING') {
                errors.push(`Модуль ${name} отсутствует`);
            }
            if (health.status === 'ERROR') {
                errors.push(`Модуль ${name} в состоянии ошибки: ${health.error}`);
            }
        });

        // Проверка использования памяти
        const memory = healthReport.system.memory;
        if (memory && memory.used / memory.total > 0.9) {
            errors.push('Критическое использование памяти');
        }

        return errors;
    }

    #triggerAlerts(errors) {
        errors.forEach(error => {
            this.#alerts.add({
                type: 'CRITICAL',
                message: error,
                timestamp: Date.now()
            });
            
            console.error('🚨 Критическая ошибка:', error);
        });
    }

    recordError(module, error) {
        this.#metrics.set(`error:${module}:${Date.now()}`, {
            type: 'error',
            module: module,
            error: error,
            timestamp: Date.now()
        });
    }

    recordWarning(module, message) {
        this.#metrics.set(`warning:${module}:${Date.now()}`, {
            type: 'warning',
            module: module,
            message: message,
            timestamp: Date.now()
        });
    }

    getHealthReport() {
        return {
            overall: this.#calculateOverallHealth(),
            metrics: Array.from(this.#metrics.values()),
            alerts: Array.from(this.#alerts),
            uptime: Date.now() - this.#startTime
        };
    }

    #calculateOverallHealth() {
        const errors = Array.from(this.#metrics.values())
            .filter(m => m.type === 'error').length;
        
        if (errors > 5) return 'CRITICAL';
        if (errors > 2) return 'WARNING';
        return 'HEALTHY';
    }

    generateReport() {
        const health = this.getHealthReport();
        return {
            summary: {
                status: health.overall,
                uptime: Math.round(health.uptime / 1000 / 60) + ' minutes',
                totalErrors: health.metrics.filter(m => m.type === 'error').length,
                totalWarnings: health.metrics.filter(m => m.type === 'warning').length
            },
            details: health
        };
    }
}

/**
 * Система плагинов
 */
class PluginSystem {
    #plugins = new Map();
    #hooks = new Map();
    #modules = new Map();

    constructor() {
        console.log('🔌 PluginSystem инициализирован');
        this.#setupDefaultHooks();
    }

    #setupDefaultHooks() {
        // Стандартные хуки системы
        const defaultHooks = [
            'beforeParse', 'afterParse', 'beforeSaveSitemap', 'afterSaveSitemap',
            'onEntityCreate', 'onEntityUpdate', 'onError', 'onModuleInit'
        ];

        defaultHooks.forEach(hook => {
            this.#hooks.set(hook, new Set());
        });
    }

    /**
     * Загрузка плагина
     */
    async loadPlugin(pluginConfig) {
        const { name, url, config = {} } = pluginConfig;
        
        try {
            // Динамическая загрузка плагина
            const module = await import(url);
            const plugin = module.default || module;
            
            // Инициализация плагина
            const pluginInstance = typeof plugin === 'function' 
                ? new plugin(config)
                : plugin;
            
            // Регистрация хуков
            this.#registerPluginHooks(name, pluginInstance);
            
            this.#plugins.set(name, {
                instance: pluginInstance,
                config: config,
                loadedAt: Date.now()
            });

            console.log(`✅ Плагин ${name} загружен`);
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки плагина ${name}:`, error);
            throw error;
        }
    }

    /**
     * Регистрация хуков плагина
     */
    #registerPluginHooks(pluginName, pluginInstance) {
        const hookNames = Object.keys(pluginInstance).filter(key => 
            key.startsWith('on') || this.#hooks.has(key)
        );

        hookNames.forEach(hookName => {
            if (!this.#hooks.has(hookName)) {
                this.#hooks.set(hookName, new Set());
            }
            
            this.#hooks.get(hookName).add({
                plugin: pluginName,
                handler: pluginInstance[hookName].bind(pluginInstance)
            });
            
            console.log(`🔗 Плагин ${pluginName} зарегистрирован на хук: ${hookName}`);
        });
    }

    /**
     * Вызов хука
     */
    async callHook(hookName, data) {
        const handlers = this.#hooks.get(hookName);
        if (!handlers) return data;

        let result = data;
        
        for (const { plugin, handler } of handlers) {
            try {
                result = await handler(result) || result;
            } catch (error) {
                console.error(`❌ Ошибка в плагине ${plugin} на хуке ${hookName}:`, error);
            }
        }
        
        return result;
    }

    /**
     * Регистрация кастомного модуля
     */
    registerModule(name, factory, dependencies = []) {
        this.#modules.set(name, { factory, dependencies });
    }

    /**
     * Создание экземпляра модуля
     */
    async createModule(name, context) {
        const moduleConfig = this.#modules.get(name);
        if (!moduleConfig) {
            throw new Error(`Модуль ${name} не зарегистрирован`);
        }

        // Проверка зависимостей
        for (const dep of moduleConfig.dependencies) {
            if (!context.has(dep)) {
                throw new Error(`Зависимость ${dep} не удовлетворена для модуля ${name}`);
            }
        }

        return await moduleConfig.factory(context);
    }

    getPluginCount() {
        return this.#plugins.size;
    }

    getPluginInfo() {
        return Array.from(this.#plugins.entries()).map(([name, plugin]) => ({
            name: name,
            loadedAt: plugin.loadedAt,
            hooks: Object.keys(plugin.instance).filter(key => 
                key.startsWith('on') || this.#hooks.has(key)
            )
        }));
    }
}

/**
 * Центральная шина событий
 */
class EventBus {
    #listeners = new Map();
    #eventHistory = [];
    #maxHistory = 1000;

    constructor() {
        console.log('📡 EventBus инициализирован');
    }

    /**
     * Подписка на событие
     */
    on(eventName, handler) {
        if (!this.#listeners.has(eventName)) {
            this.#listeners.set(eventName, new Set());
        }
        
        this.#listeners.get(eventName).add(handler);
    }

    /**
     * Отписка от события
     */
    off(eventName, handler) {
        const handlers = this.#listeners.get(eventName);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    /**
     * Отправка события
     */
    emit(eventName, data) {
        // Сохранение в историю
        this.#eventHistory.push({
            event: eventName,
            data: data,
            timestamp: Date.now()
        });

        // Ограничение размера истории
        if (this.#eventHistory.length > this.#maxHistory) {
            this.#eventHistory = this.#eventHistory.slice(-this.#maxHistory);
        }

        // Вызов обработчиков
        const handlers = this.#listeners.get(eventName);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`❌ Ошибка в обработчике события ${eventName}:`, error);
                }
            });
        }
    }

    /**
     * Получение истории событий
     */
    getEventHistory(filter = null) {
        if (filter) {
            return this.#eventHistory.filter(event => 
                event.event === filter || (typeof filter === 'function' && filter(event))
            );
        }
        return [...this.#eventHistory];
    }

    /**
     * Количество обработанных событий
     */
    getEventCount() {
        return this.#eventHistory.length;
    }

    /**
     * Очистка истории событий
     */
    clearHistory() {
        this.#eventHistory = [];
    }
}

// Глобальный экспорт
window.GalaxyMetaOrchestrator = GalaxyMetaOrchestrator;
window.HealthMonitor = HealthMonitor;
window.PluginSystem = PluginSystem;
window.EventBus = EventBus;

// Глобальный API для управления системой
window.GalaxyMetaSystem = {
    createOrchestrator: (config) => new GalaxyMetaOrchestrator(config),
    getHealthMonitor: () => new HealthMonitor(),
    getPluginSystem: () => new PluginSystem(),
    getEventBus: () => new EventBus(),

    // Быстрые команды
    quickStart: async (config = {}) => {
        const orchestrator = new GalaxyMetaOrchestrator(config);
        await orchestrator.initialize();
        return orchestrator;
    },

    // Диагностика системы
    runDiagnostics: async () => {
        const orchestrator = new GalaxyMetaOrchestrator();
        return await orchestrator.executeCommand('diagnostics:run');
    }
};

console.log('✅ Модуль 5: GalaxyMetaOrchestrator загружен');

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    if (window.GalaxyMetaOrchestrator && window.GalaxyMetaSystem) {
        console.log('🎼 Galaxy Meta Parser System готова к инициализации');
        
        // Автоматический запуск если указано в конфигурации
        const autoStart = window.PARSER_CONFIG?.orchestrator?.autoStart;
        if (autoStart) {
            setTimeout(async () => {
                try {
                    window.galaxyOrchestrator = await window.GalaxyMetaSystem.quickStart();
                    console.log('🚀 Galaxy Meta Parser System автоматически запущена');
                } catch (error) {
                    console.error('❌ Автоматический запуск системы не удался:', error);
                }
            }, 1000);
        }
    }
});
