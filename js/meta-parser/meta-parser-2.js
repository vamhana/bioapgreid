// bioapgreid/js/meta-parser/meta-parser-2.js

/**
 * Основной класс GalaxyMetaParser - центральный процессор системы парсинга
 * @class GalaxyMetaParser
 */
class GalaxyMetaParser {
    #app;
    #cache;
    #entityCache;
    #hierarchyCache;
    #pageManifest;
    #circuitBreaker;
    #hierarchyBuilder;
    #eventListeners;
    
    // Статические константы
    static #DEFAULT_RETRIES = 3;
    static #CIRCUIT_BREAKER_STATES = Object.freeze({
        CLOSED: 'CLOSED',
        OPEN: 'OPEN', 
        HALF_OPEN: 'HALF_OPEN'
    });

    // Приватные константы
    #requiredMetaTags = Object.freeze(['level', 'type', 'title']);
    #optionalMetaTags = Object.freeze([
        'parent', 'orbit-radius', 'orbit-angle', 'color', 
        'size-modifier', 'importance', 'description', 'icon', 'unlocked',
        'tags', 'depth', 'created', 'updated', 'content-priority', 'analytics-category'
    ]);

    #typeConfig = Object.freeze({
        orbitRadii: new Map([
            ['galaxy', 0], ['planet', 150], ['moon', 60], ['asteroid', 40],
            ['debris', 20], ['blackhole', 200], ['nebula', 250], ['station', 80],
            ['gateway', 120], ['anomaly', 180]
        ]),
        icons: new Map([
            ['galaxy', '⭐'], ['planet', '🪐'], ['moon', '🌙'], ['asteroid', '☄️'],
            ['debris', '🛰️'], ['blackhole', '🌀'], ['nebula', '🌌'], ['station', '🚀'],
            ['gateway', '🌐'], ['anomaly', '💫']
        ]),
        colors: new Map([
            ['galaxy', '#FFD700'], ['planet', '#4ECDC4'], ['moon', '#C7F464'],
            ['asteroid', '#FF6B6B'], ['debris', '#A8E6CF'], ['blackhole', '#2C3E50'],
            ['nebula', '#D4A5FF'], ['station', '#FFD166'], ['gateway', '#9B5DE5'],
            ['anomaly', '#00BBF9']
        ]),
        analyticsCategories: new Map([
            ['galaxy', 'core'], ['planet', 'primary'], ['moon', 'secondary'],
            ['asteroid', 'supplementary'], ['debris', 'supplementary'],
            ['blackhole', 'special'], ['nebula', 'special'], ['station', 'interactive'],
            ['gateway', 'navigation'], ['anomaly', 'special']
        ])
    });

    constructor(app) {
        if (!window.MetaCache || !window.HierarchyBuilder) {
            throw new Error('Модуль 1 (meta-parser-1.js) должен быть загружен перед этим модулем');
        }

        this.#app = app;
        this.#cache = new window.MetaCache(100);
        this.#entityCache = new window.MetaCache(100);
        this.#hierarchyCache = null;
        this.#pageManifest = null;
        this.#eventListeners = new Map();
        
        // Конфигурация из модуля 1
        this.config = window.PARSER_CONFIG;
        
        // Статистика v3.0
        this.stats = {
            totalParsed: 0,
            cacheHits: 0,
            errors: 0,
            lastParseTime: 0,
            circuitBreakerState: GalaxyMetaParser.#CIRCUIT_BREAKER_STATES.CLOSED,
            predictiveHits: 0,
            domainsProcessed: new Set()
        };

        this.#circuitBreaker = {
            failures: 0,
            lastFailure: 0,
            state: GalaxyMetaParser.#CIRCUIT_BREAKER_STATES.CLOSED
        };

        this.#hierarchyBuilder = new window.HierarchyBuilder(this.config.maxHierarchyDepth);
        
        console.log('🔍 GalaxyMetaParser v3.0 создан');
    }

    /**
     * Инициализация парсера
     * @returns {Promise<void>}
     */
    async init() {
        console.log('🔍 Инициализация GalaxyMetaParser v3.0...');
        
        try {
            await this.#loadPageManifest();
            this.#setupEventListeners();
            this.#setupCacheCleanup();
            this.#setupPredictiveLoading();
            this.#integrateWithContentManager();
            
            console.log('✅ GalaxyMetaParser v3.0 инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации GalaxyMetaParser:', error);
            this.#handleCircuitBreakerError();
            throw error;
        }
    }

    /**
     * Загрузка манифеста страниц
     * @private
     */
    async #loadPageManifest() {
        if (this.#circuitBreaker.state === GalaxyMetaParser.#CIRCUIT_BREAKER_STATES.OPEN) {
            console.warn('⚠️ Circuit breaker открыт, пропускаем загрузку манифеста');
            return;
        }

        try {
            const response = await fetch('/sitemap.json');
            if (response.ok) {
                this.#pageManifest = await response.json();
                console.log(`📋 Загружен манифест с ${this.#pageManifest.pages?.length ?? 0} страницами`);
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить манифест страниц:', error.message);
            this.#handleCircuitBreakerError();
        }
    }

    /**
     * Настройка обработчиков событий
     * @private
     */
    #setupEventListeners() {
        const eventHandlers = new Map([
            ['parseMetaData', (event) => this.parseAllPages(event.detail.pageUrls)],
            ['rebuildHierarchy', (event) => this.rebuildHierarchy(event.detail.entities)],
            ['updateEntityMetadata', (event) => this.updateEntityMetadata(event.detail.levelId, event.detail.updates)],
            ['clearMetaCache', () => this.clearCache()],
            ['predictiveLoadRequest', (event) => this.#handlePredictiveLoad(event.detail)],
            ['contentManagerReady', () => this.#integrateWithContentManager()],
            ['navigationChanged', (event) => this.#schedulePredictiveLoading(event.detail.currentLevel)]
        ]);

        // Сохраняем ссылки на обработчики для последующей очистки
        for (const [eventName, handler] of eventHandlers) {
            const boundHandler = handler.bind(this);
            this.#eventListeners.set(eventName, boundHandler);
            document.addEventListener(eventName, boundHandler);
        }
    }

    /**
     * Настройка периодической очистки кэша
     * @private
     */
    #setupCacheCleanup() {
        // Периодическая очистка устаревшего кэша
        setInterval(() => {
            this.#cleanupExpiredCache();
        }, this.config.cacheTTL);
    }

    /**
     * Настройка системы предиктивной загрузки
     * @private
     */
    #setupPredictiveLoading() {
        if (!this.config.predictiveLoading.enabled) return;

        console.log('🎯 Предиктивная загрузка активирована');
    }

    /**
     * Интеграция с ContentManager
     * @private
     */
    #integrateWithContentManager() {
        if (window.ContentManager) {
            console.log('🔄 Интеграция с ContentManager v3.0');
            
            document.addEventListener('metaParsingCompleted', (event) => {
                window.ContentManager?.analyzeContentStructure?.(event.detail.entities);
            });
        }
    }

    /**
     * Очистка устаревшего кэша
     * @private
     */
    #cleanupExpiredCache() {
        const now = Date.now();
        let cleanedCount = 0;

        // Очищаем только entity cache, MetaCache сам управляет размером
        for (const [url, cached] of this.#cache.cache.entries()) {
            if (now - cached.timestamp > this.config.cacheTTL) {
                this.#cache.delete(url);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Очищено ${cleanedCount} устаревших записей кэша`);
        }
    }

    /**
     * Обработка ошибок Circuit Breaker
     * @private
     */
    #handleCircuitBreakerError() {
        this.#circuitBreaker.failures++;
        this.#circuitBreaker.lastFailure = Date.now();

        if (this.#circuitBreaker.failures >= this.config.circuitBreaker.failureThreshold) {
            this.#circuitBreaker.state = GalaxyMetaParser.#CIRCUIT_BREAKER_STATES.OPEN;
            this.stats.circuitBreakerState = GalaxyMetaParser.#CIRCUIT_BREAKER_STATES.OPEN;
            console.warn('🚨 Circuit breaker открыт из-за множественных ошибок');
            
            // Автоматическое восстановление через resetTimeout
            setTimeout(() => {
                this.#circuitBreaker.state = GalaxyMetaParser.#CIRCUIT_BREAKER_STATES.HALF_OPEN;
                this.#circuitBreaker.failures = 0;
                this.stats.circuitBreakerState = GalaxyMetaParser.#CIRCUIT_BREAKER_STATES.HALF_OPEN;
                console.log('🔄 Circuit breaker переходит в HALF_OPEN состояние');
            }, this.config.circuitBreaker.resetTimeout);
        }
    }

    /**
     * Обработка успешных операций Circuit Breaker
     * @private
     */
    #handleCircuitBreakerSuccess() {
        if (this.#circuitBreaker.state === GalaxyMetaParser.#CIRCUIT_BREAKER_STATES.HALF_OPEN) {
            this.#circuitBreaker.state = GalaxyMetaParser.#CIRCUIT_BREAKER_STATES.CLOSED;
            this.stats.circuitBreakerState = GalaxyMetaParser.#CIRCUIT_BREAKER_STATES.CLOSED;
            console.log('✅ Circuit breaker закрыт - операции восстановлены');
        }
        this.#circuitBreaker.failures = 0;
    }

    /**
     * Парсинг всех страниц
     * @param {string[]} pageUrls - Список URL для парсинга
     * @returns {Promise<Object>} Построенная иерархия
     */
    async parseAllPages(pageUrls = null) {
        if (this.#circuitBreaker.state === GalaxyMetaParser.#CIRCUIT_BREAKER_STATES.OPEN) {
            console.warn('⚠️ Circuit breaker открыт, пропускаем парсинг');
            return this.#hierarchyCache ?? this.#getFallbackHierarchy();
        }

        const startTime = performance.now();
        
        try {
            this.#dispatchEvent('metaParsingStarted', { 
                timestamp: Date.now(),
                pageCount: pageUrls?.length ?? 'auto',
                circuitBreakerState: this.#circuitBreaker.state
            });

            // Если URLs не предоставлены, автоматически обнаруживаем страницы
            const urls = pageUrls ?? await this.#discoverPageUrls();
            
            if (urls.length === 0) {
                throw new Error('Не найдено страниц для парсинга');
            }

            console.log(`📄 Найдено ${urls.length} страниц для парсинга`);

            const results = {};
            const parsingPromises = urls.map(url => this.parsePageMeta(url));
            const parsedPages = await Promise.allSettled(parsingPromises);

            // Обрабатываем результаты с использованием современных методов
            const { successCount, errorCount } = parsedPages.reduce((acc, result, index) => {
                if (result.status === 'fulfilled') {
                    results[result.value.level] = result.value;
                    acc.successCount++;
                } else {
                    console.error(`❌ Ошибка парсинга ${urls[index]}:`, result.reason);
                    acc.errorCount++;
                    this.#dispatchEvent('metaParsingError', {
                        url: urls[index],
                        error: result.reason.message,
                        critical: false
                    });
                }
                return acc;
            }, { successCount: 0, errorCount: 0 });

            // Строим иерархию
            const hierarchy = this.buildEntityHierarchy(results);
            this.#hierarchyCache = hierarchy;
            
            const parseTime = performance.now() - startTime;

            this.stats.totalParsed += successCount;
            this.stats.errors += errorCount;
            this.stats.lastParseTime = parseTime;

            // Успешная операция - сбрасываем circuit breaker
            this.#handleCircuitBreakerSuccess();

            this.#dispatchEvent('metaParsingCompleted', {
                entities: results,
                hierarchy: hierarchy,
                stats: {
                    total: urls.length,
                    successful: successCount,
                    errors: errorCount,
                    parseTime: parseTime,
                    cacheEfficiency: this.stats.cacheHits / (this.stats.cacheHits + successCount)
                }
            });

            this.#dispatchEvent('hierarchyBuilt', { 
                hierarchy,
                entityCount: Object.keys(results).length
            });

            // Сбор аналитики v3.0
            this.#collectAnalytics('parse_completed', {
                entityCount: Object.keys(results).length,
                parseTime: parseTime
            });

            console.log(`✅ Парсинг завершен: ${successCount} успешно, ${errorCount} ошибок за ${parseTime.toFixed(2)}мс`);

            return hierarchy;

        } catch (error) {
            const errorTime = performance.now() - startTime;
            console.error('💥 Ошибка при парсинге всех страниц:', error);
            
            this.#handleCircuitBreakerError();
            
            this.#dispatchEvent('metaParsingError', { 
                error: error.message,
                critical: true,
                parseTime: errorTime
            });
            
            return this.#hierarchyCache ?? this.#getFallbackHierarchy();
        }
    }

    /**
     * Резервная иерархия при ошибках
     * @private
     * @returns {Object} Fallback иерархия
     */
    #getFallbackHierarchy() {
        console.warn('🔄 Использование fallback иерархии');
        const fallbackEntities = {
            'index': {
                level: 'index',
                type: 'galaxy',
                title: 'Главная',
                importance: 'high',
                unlocked: true,
                color: '#FFD700',
                description: 'Центральная страница галактики'
            }
        };
        return this.buildEntityHierarchy(fallbackEntities);
    }

    /**
     * Универсальное обнаружение страниц
     * @private
     * @returns {Promise<string[]>} Массив URL страниц
     */
    async #discoverPageUrls() {
        console.log('🔍 Универсальное обнаружение страниц...');

        // Приоритет 1: Динамическое API обнаружение
        try {
            const apiUrls = await this.#discoverPagesViaUniversalAPI();
            if (apiUrls.length > 0) {
                console.log(`🌐 API обнаружение: ${apiUrls.length} страниц`);
                return apiUrls;
            }
        } catch (error) {
            console.warn('⚠️ API обнаружение не удалось:', error.message);
        }

        // Приоритет 2: Автоматическое сканирование структуры
        try {
            const scannedUrls = await this.#universalDirectoryScan();
            if (scannedUrls.length > 0) {
                console.log(`📁 Авто-сканирование: ${scannedUrls.length} страниц`);
                return scannedUrls;
            }
        } catch (error) {
            console.warn('⚠️ Авто-сканирование не удалось:', error.message);
        }

        // Приоритет 3: Анализ существующих ссылок на сайте
        try {
            const linkUrls = await this.#discoverViaSiteLinks();
            if (linkUrls.length > 0) {
                console.log(`🔗 Анализ ссылок: ${linkUrls.length} страниц`);
                return linkUrls;
            }
        } catch (error) {
            console.warn('⚠️ Анализ ссылок не удался:', error.message);
        }

        // Приоритет 4: Создание минимальной начальной структуры
        const initialUrls = await this.#createInitialStructure();
        console.log(`🚀 Создана начальная структура: ${initialUrls.length} страниц`);
        return initialUrls;
    }

    /**
     * Универсальное API обнаружение для любого домена
     * @private
     * @returns {Promise<string[]>} Массив URL
     */
    async #discoverPagesViaUniversalAPI() {
        const basePath = this.#detectBasePath();
        
        const apiEndpoints = [
            // Стандартные endpoints
            `${basePath}/api/pages`,
            `${basePath}/api/sitemap`,
            `${basePath}/data/pages.json`,
            `${basePath}/manifest.json`,
            `${basePath}/sitemap.xml`,
            
            // Galaxy-specific endpoints
            `${basePath}/api/galaxy/pages`,
            `${basePath}/data/galaxy.json`,
            `${basePath}/meta/pages`,
            
            // Корневые endpoints
            '/api/pages',
            '/sitemap.json',
            '/pages.json'
        ];

        const uniqueEndpoints = [...new Set(apiEndpoints)];

        for (const endpoint of uniqueEndpoints) {
            try {
                console.log(`🔍 Проверка endpoint: ${endpoint}`);
                const response = await fetch(endpoint, { 
                    method: 'GET',
                    headers: { 'Accept': 'application/json,application/xml,*/*' }
                });
                
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    let data;
                    
                    if (contentType?.includes('application/json')) {
                        data = await response.json();
                    } else if (contentType?.includes('application/xml') || endpoint.endsWith('.xml')) {
                        data = await this.#parseSitemapXML(await response.text());
                    } else {
                        data = await response.text();
                        data = this.#tryParseAsJSON(data);
                    }
                    
                    const urls = this.#extractUrlsFromUniversalResponse(data, endpoint);
                    if (urls.length > 0) {
                        console.log(`✅ Найдено ${urls.length} URLs через ${endpoint}`);
                        return urls;
                    }
                }
            } catch (error) {
                continue;
            }
        }
        
        return [];
    }

    /**
     * Автоматическое определение базового пути
     * @private
     * @returns {string} Базовый путь
     */
    #detectBasePath() {
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split('/').filter(Boolean);
        
        if (pathParts.length > 1 && pathParts[0] !== 'pages') {
            return `/${pathParts[0]}`;
        }
        
        return '';
    }

    /**
     * Универсальное сканирование директорий
     * @private
     * @returns {Promise<string[]>} Массив URL
     */
    async #universalDirectoryScan() {
        const discoveredUrls = [];
        
        // Сканируем возможные корневые директории
        const rootDirectories = ['pages', 'content', 'docs', 'articles', 'posts', 'galaxy'];
        
        for (const directory of rootDirectories) {
            const urls = await this.#scanDirectory(directory);
            discoveredUrls.push(...urls);
        }
        
        // Ищем HTML файлы в корне
        const rootFiles = await this.#scanRootHTMLFiles();
        discoveredUrls.push(...rootFiles);
        
        return [...new Set(discoveredUrls)];
    }

    /**
     * Сканирование конкретной директории
     * @private
     * @param {string} directoryName - Имя директории
     * @returns {Promise<string[]>} Массив URL
     */
    async #scanDirectory(directoryName) {
        const commonPageNames = [
            // Универсальные имена страниц
            'index', 'home', 'main', 'start', 'welcome',
            'about', 'contact', 'help', 'docs', 'api',
            
            // Galaxy-ориентированные имена
            'galaxy', 'universe', 'world', 'space',
            'planets', 'stars', 'systems', 'navigation'
        ];

        const discoveredUrls = [];
        const checkPromises = commonPageNames.map(async (pageName) => {
            const possibleUrls = [
                `/${directoryName}/${pageName}.html`,
                `/${directoryName}/${pageName}/index.html`,
                `/${directoryName}/${pageName}.php`,
                `/${directoryName}/${pageName}.htm`
            ];

            for (const url of possibleUrls) {
                if (await this.#checkPageExists(url)) {
                    discoveredUrls.push(url);
                    console.log(`📄 Обнаружена страница: ${url}`);
                    break;
                }
            }
        });

        await Promise.all(checkPromises);
        return discoveredUrls;
    }

    /**
     * Поиск HTML файлов в корневой директории
     * @private
     * @returns {Promise<string[]>} Массив URL
     */
    async #scanRootHTMLFiles() {
        const rootFiles = [
            'index.html', 'index.php', 'index.htm',
            'home.html', 'main.html', 'default.html',
            'galaxy.html', 'universe.html', 'start.html'
        ];

        const discoveredUrls = [];
        const checkPromises = rootFiles.map(async (fileName) => {
            if (await this.#checkPageExists(`/${fileName}`)) {
                discoveredUrls.push(`/${fileName}`);
                console.log(`📄 Обнаружена корневая страница: /${fileName}`);
            }
        });

        await Promise.all(checkPromises);
        return discoveredUrls;
    }

    /**
     * Обнаружение страниц через анализ существующих ссылок на сайте
     * @private
     * @returns {Promise<string[]>} Массив URL
     */
    async #discoverViaSiteLinks() {
        try {
            // Загружаем главную страницу и анализируем все ссылки
            const response = await fetch('/');
            if (!response.ok) return [];
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Собираем все внутренние ссылки
            const links = Array.from(doc.querySelectorAll('a[href]'));
            const internalUrls = links
                .map(link => link.getAttribute('href'))
                .filter(href => {
                    if (!href) return false;
                    if (href.startsWith('http')) return false;
                    if (href.startsWith('#')) return false;
                    if (href.startsWith('mailto:')) return false;
                    if (href.startsWith('tel:')) return false;
                    
                    return href.endsWith('.html') || 
                           href.endsWith('.php') || 
                           href.endsWith('.htm') ||
                           !href.includes('.') ||
                           href === '/' ||
                           href.startsWith('/pages/');
                })
                .map(href => {
                    if (href === '/') return '/index.html';
                    if (!href.startsWith('/')) return `/${href}`;
                    if (!href.includes('.') && !href.endsWith('/')) return `${href}.html`;
                    return href;
                })
                .filter((url, index, self) => self.indexOf(url) === index);
            
            console.log(`🔗 Найдено ${internalUrls.length} внутренних ссылок`);
            return internalUrls;
            
        } catch (error) {
            console.warn('⚠️ Не удалось проанализировать ссылки сайта:', error.message);
            return [];
        }
    }

    /**
     * Создание минимальной начальной структуры для новой галактики
     * @private
     * @returns {Promise<string[]>} Массив URL
     */
    async #createInitialStructure() {
        console.log('🚀 Создание начальной структуры для новой галактики...');
        
        const initialPages = [
            {
                url: '/pages/index.html',
                level: 'index',
                type: 'galaxy',
                title: 'Главная',
                description: 'Центральная страница вашей галактики'
            },
            {
                url: '/pages/welcome.html', 
                level: 'welcome',
                type: 'planet',
                title: 'Добро пожаловать',
                description: 'Начальная точка вашего путешествия'
            }
        ];

        // Проверяем, есть ли уже эти страницы
        const existingUrls = [];
        for (const page of initialPages) {
            if (!await this.#checkPageExists(page.url)) {
                console.log(`📝 Создана начальная страница: ${page.url}`);
            } else {
                existingUrls.push(page.url);
            }
        }

        return existingUrls.length > 0 ? existingUrls : initialPages.map(page => page.url);
    }

    /**
     * Универсальный парсинг sitemap.xml
     * @private
     * @param {string} xmlContent - XML содержимое
     * @returns {Object} Распарсенные данные
     */
    async #parseSitemapXML(xmlContent) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
            
            const urls = Array.from(xmlDoc.getElementsByTagName('loc'))
                .map(loc => loc.textContent)
                .filter(url => url && url.includes(window.location.hostname));
                
            return { urls };
        } catch (error) {
            console.warn('⚠️ Ошибка парсинга sitemap.xml:', error.message);
            return { urls: [] };
        }
    }

    /**
     * Попытка парсинга строки как JSON
     * @private
     * @param {string} text - Текст для парсинга
     * @returns {*} Распарсенные данные или исходный текст
     */
    #tryParseAsJSON(text) {
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    /**
     * Универсальное извлечение URLs из ответа API
     * @private
     * @param {*} data - Данные ответа
     * @param {string} endpoint - Endpoint
     * @returns {string[]} Массив URL
     */
    #extractUrlsFromUniversalResponse(data, endpoint) {
        if (!data) return [];
        
        const extractionStrategies = [
            () => Array.isArray(data) ? data.filter(url => typeof url === 'string') : null,
            () => data.urls?.map?.(url => typeof url === 'string' ? url : url.loc),
            () => data.urlset?.url?.map?.(url => url.loc),
            () => data.pages?.map?.(page => page.url || page.path),
            () => Object.keys(data).map(key => `/pages/${key}.html`),
            () => Object.keys(data).filter(key => key.startsWith('/')),
            () => {
                if (typeof data === 'string') {
                    const urlRegex = /["'](\/pages\/[^"']+\.html)["']/g;
                    const matches = [...data.matchAll(urlRegex)];
                    return matches.map(match => match[1]);
                }
                return null;
            }
        ];

        for (const strategy of extractionStrategies) {
            try {
                const urls = strategy();
                if (urls && urls.length > 0) {
                    return urls
                        .map(url => this.#normalizePageUrl(url))
                        .filter(url => url && typeof url === 'string')
                        .filter((url, index, self) => self.indexOf(url) === index);
                }
            } catch (error) {
                continue;
            }
        }
        
        return [];
    }

    /**
     * Проверка существования страницы
     * @private
     * @param {string} url - URL для проверки
     * @returns {Promise<boolean>} Существует ли страница
     */
    async #checkPageExists(url) {
        const methods = [
            () => this.#checkWithHEAD(url),
            () => this.#checkWithGET(url),
            () => this.#checkWithFetch(url, { method: 'OPTIONS' })
        ];

        for (const method of methods) {
            try {
                if (await method()) {
                    return true;
                }
            } catch {
                continue;
            }
        }
        
        return false;
    }

    async #checkWithHEAD(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        try {
            const response = await fetch(url, { 
                method: 'HEAD',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response.ok;
        } catch {
            clearTimeout(timeoutId);
            return false;
        }
    }

    async #checkWithGET(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
            const response = await fetch(url, { 
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response.ok;
        } catch {
            clearTimeout(timeoutId);
            return false;
        }
    }

    async #checkWithFetch(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);

        try {
            const response = await fetch(url, { 
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response.ok;
        } catch {
            clearTimeout(timeoutId);
            return false;
        }
    }

    /**
     * Нормализация URL страницы
     * @private
     * @param {string} url - URL для нормализации
     * @returns {string} Нормализованный URL
     */
    #normalizePageUrl(url) {
        const cleanUrl = url.replace(/^\//, '');
        
        if (url.startsWith('http') || url.startsWith('/pages/')) {
            return url;
        }
        
        return `/pages/${cleanUrl}`;
    }

    /**
     * Парсинг мета-данных страницы
     * @param {string} pageUrl - URL страницы
     * @returns {Promise<Object>} Мета-данные сущности
     */
    async parsePageMeta(pageUrl) {
        // Проверяем кэш
        const cached = this.#cache.get(pageUrl);
        if (cached?.data && (Date.now() - cached.timestamp < this.config.cacheTTL)) {
            this.stats.cacheHits++;
            return cached.data;
        }

        try {
            const response = await this.#fetchWithRetry(pageUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            const metaTags = this.#extractMetaTags(html, pageUrl);
            
            // Валидация обязательных полей
            this.#validateMetaTags(metaTags, pageUrl);
            
            // Автозаполнение недостающих данных
            const completeEntity = this.#generateMissingData(metaTags, pageUrl);
            
            // Дополнительная валидация структуры
            this.#validateEntityStructure(completeEntity);

            // Обогащаем entity дополнительными мета-данными v3.0
            const enrichedEntity = this.#enrichEntityData(completeEntity, pageUrl);

            // Сохраняем в кэш
            this.#cache.set(pageUrl, {
                data: enrichedEntity,
                timestamp: Date.now()
            });
            
            this.#entityCache.set(enrichedEntity.level, enrichedEntity);

            console.log(`✅ Успешно распаршена: ${pageUrl} → ${enrichedEntity.title} (${enrichedEntity.type})`);
            return enrichedEntity;

        } catch (error) {
            console.error(`❌ Ошибка парсинга ${pageUrl}:`, error);
            
            // Сохраняем информацию об ошибке в кэш
            this.#cache.set(pageUrl, {
                data: null,
                timestamp: Date.now(),
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * Повторная попытка запроса с экспоненциальной задержкой
     * @private
     * @param {string} url - URL для запроса
     * @param {number} maxRetries - Максимальное количество попыток
     * @returns {Promise<Response>} Ответ
     */
    async #fetchWithRetry(url, maxRetries = this.config.maxRetries) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

                const response = await fetch(url, { 
                    signal: controller.signal 
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) return response;
                
                if (attempt === maxRetries) {
                    throw new Error(`Не удалось загрузить ${url} после ${maxRetries} попыток (${response.status})`);
                }
                
                await this.#delay(2 ** attempt * 1000);
            } catch (error) {
                if (attempt === maxRetries) throw error;
                await this.#delay(2 ** attempt * 1000);
            }
        }
    }

    /**
     * Извлечение мета-тегов из HTML
     * @private
     * @param {string} html - HTML содержимое
     * @param {string} pageUrl - URL страницы
     * @returns {Object} Извлеченные мета-теги
     */
    #extractMetaTags(html, pageUrl) {
        const metaTags = {};
        const parser = new DOMParser();
        
        try {
            const doc = parser.parseFromString(html, 'text/html');

            // Извлекаем все meta-теги с name начинающимся на "galaxy:"
            const metaElements = doc.querySelectorAll('meta[name^="galaxy:"]');
            
            metaElements.forEach(meta => {
                const name = meta.getAttribute('name')?.replace('galaxy:', '');
                const content = meta.getAttribute('content');
                
                if (name && content !== null) {
                    metaTags[name] = content.trim();
                }
            });

            // Также извлекаем title страницы как fallback
            metaTags.title ??= doc.querySelector('title')?.textContent?.trim();

            // Извлекаем описание из meta description
            metaTags.description ??= doc.querySelector('meta[name="description"]')?.getAttribute('content');

        } catch (error) {
            console.warn(`⚠️ Ошибка парсинга HTML для ${pageUrl}:`, error.message);
        }

        return metaTags;
    }

    /**
     * Валидация мета-тегов
     * @private
     * @param {Object} metaTags - Мета-теги для валидации
     * @param {string} pageUrl - URL страницы
     */
    #validateMetaTags(metaTags, pageUrl) {
        const missingRequired = this.#requiredMetaTags.filter(tag => !metaTags[tag]);
        
        if (missingRequired.length > 0) {
            throw new Error(
                `Отсутствуют обязательные мета-теги: ${missingRequired.join(', ')} в ${pageUrl}`
            );
        }

        // Валидация типа сущности
        if (metaTags.type && !this.config.supportedEntityTypes.includes(metaTags.type)) {
            throw new Error(`Неподдерживаемый тип сущности: ${metaTags.type} в ${pageUrl}`);
        }

        // Валидация форматов
        if (metaTags.level && !this.#isValidLevelFormat(metaTags.level)) {
            throw new Error(`Некорректный формат уровня: ${metaTags.level} в ${pageUrl}`);
        }

        if (metaTags['orbit-radius'] && isNaN(parseFloat(metaTags['orbit-radius']))) {
            throw new Error(`Некорректный радиус орбиты: ${metaTags['orbit-radius']} в ${pageUrl}`);
        }

        if (metaTags['orbit-angle'] && isNaN(parseFloat(metaTags['orbit-angle']))) {
            throw new Error(`Некорректный угол орбиты: ${metaTags['orbit-angle']} в ${pageUrl}`);
        }

        if (metaTags.color && !this.#isValidColor(metaTags.color)) {
            throw new Error(`Некорректный формат цвета: ${metaTags.color} в ${pageUrl}`);
        }
    }

    /**
     * Проверка валидности формата уровня
     * @private
     * @param {string} level - Уровень для проверки
     * @returns {boolean} Валиден ли формат
     */
    #isValidLevelFormat(level) {
        return typeof level === 'string' && level.length > 0 && /^[a-zA-Z0-9_-]+$/.test(level);
    }

    /**
     * Проверка валидности цвета
     * @private
     * @param {string} color - Цвет для проверки
     * @returns {boolean} Валиден ли цвет
     */
    #isValidColor(color) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color) || 
               /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(color) ||
               /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i.test(color);
    }

    /**
     * Генерация недостающих данных
     * @private
     * @param {Object} metaTags - Исходные мета-теги
     * @param {string} pageUrl - URL страницы
     * @returns {Object} Полная сущность
     */
    #generateMissingData(metaTags, pageUrl) {
        const entity = { ...metaTags };
        
        // Автозаполнение на основе типа
        entity['orbit-radius'] ??= this.#typeConfig.orbitRadii.get(entity.type) ?? 100;
        entity['orbit-angle'] ??= this.#calculateAutoAngle(entity);
        entity.color ??= this.#typeConfig.colors.get(entity.type) ?? this.#generateRandomColor();
        entity.importance ??= this.#calculateImportance(entity);
        entity.description ??= `Раздел "${entity.title}" во вселенной BIOAPGREID`;
        entity.icon ??= this.#typeConfig.icons.get(entity.type) ?? '🔮';
        entity['content-priority'] ??= this.#calculateContentPriority(entity);
        entity['analytics-category'] ??= this.#typeConfig.analyticsCategories.get(entity.type) ?? 'general';

        // Конвертация числовых значений
        const numericFields = ['orbit-radius', 'orbit-angle', 'size-modifier'];
        numericFields.forEach(field => {
            if (entity[field]) {
                entity[field] = parseFloat(entity[field]);
            }
        });

        // Преобразование unlocked в boolean
        entity.unlocked = entity.unlocked !== 'false';

        // Обработка тегов
        if (entity.tags && typeof entity.tags === 'string') {
            entity.tags = entity.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        } else {
            entity.tags = [];
        }

        return entity;
    }

    /**
     * Обогащение данных сущности
     * @private
     * @param {Object} entity - Базовая сущность
     * @param {string} pageUrl - URL страницы
     * @returns {Object} Обогащенная сущность
     */
    #enrichEntityData(entity, pageUrl) {
        return {
            ...entity,
            metadata: {
                sourceUrl: pageUrl,
                parsedAt: new Date().toISOString(),
                version: '3.0',
                cacheKey: this.#generateCacheKey(entity.level),
                predictiveScore: 0,
                ...entity.metadata
            },
            position: entity.position ?? { x: 0, y: 0 },
            id: entity.level,
            analytics: {
                parseCount: 0,
                lastAccess: null,
                averageLoadTime: 0,
                ...entity.analytics
            }
        };
    }

    /**
     * Генерация ключа кэша
     * @private
     * @param {string} level - Уровень сущности
     * @returns {string} Ключ кэша
     */
    #generateCacheKey(level) {
        return `meta_v3.0_${level}_${Date.now().toString(36)}`;
    }

    /**
     * Расчет автоматического угла орбиты
     * @private
     * @param {Object} entity - Сущность
     * @returns {number} Угол орбиты
     */
    #calculateAutoAngle(entity) {
        let hash = 0;
        for (let i = 0; i < entity.level.length; i++) {
            hash = ((hash << 5) - hash) + entity.level.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash) % 360;
    }

    /**
     * Генерация случайного цвета
     * @private
     * @returns {string} Случайный цвет
     */
    #generateRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 60%)`;
    }

    /**
     * Расчет важности сущности
     * @private
     * @param {Object} entity - Сущность
     * @returns {string} Важность
     */
    #calculateImportance(entity) {
        if (entity.type === 'galaxy' || entity.type === 'blackhole') return 'high';
        if (entity.type === 'planet' || entity.type === 'nebula' || entity.type === 'gateway') return 'medium';
        return 'low';
    }

    /**
     * Расчет приоритета контента
     * @private
     * @param {Object} entity - Сущность
     * @returns {string} Приоритет контента
     */
    #calculateContentPriority(entity) {
        if (entity.type === 'galaxy') return 'critical';
        if (entity.importance === 'high') return 'high';
        if (entity.importance === 'medium') return 'medium';
        return 'low';
    }

    /**
     * Валидация структуры сущности
     * @private
     * @param {Object} entity - Сущность для валидации
     */
    #validateEntityStructure(entity) {
        this.#checkCircularDependencies(entity);

        if (entity['orbit-radius'] < 0) {
            throw new Error(`Отрицательный радиус орбиты: ${entity['orbit-radius']} для ${entity.title}`);
        }

        if (entity['orbit-radius'] > 1000) {
            console.warn(`⚠️ Слишком большой радиус орбиты: ${entity['orbit-radius']} для ${entity.title}`);
        }

        if (entity['orbit-angle'] < 0 || entity['orbit-angle'] >= 360) {
            console.warn(`⚠️ Угол орбиты вне диапазона 0-360: ${entity['orbit-angle']} для ${entity.title}`);
        }
    }

    /**
     * Проверка циклических зависимостей
     * @private
     * @param {Object} entity - Сущность для проверки
     */
    #checkCircularDependencies(entity) {
        if (!entity.parent) return;

        const visited = new Set([entity.level]);
        let current = entity;
        
        while (current?.parent) {
            if (visited.has(current.parent)) {
                throw new Error(`Обнаружена циклическая зависимость: ${current.level} -> ${current.parent}`);
            }
            
            visited.add(current.parent);
            const parentEntity = this.#entityCache.get(current.parent);
            
            if (!parentEntity) break;
            current = parentEntity;
        }
    }

    /**
     * Построение иерархии сущностей
     * @param {Object} entities - Сущности для построения
     * @returns {Object} Построенная иерархия
     */
    buildEntityHierarchy(entities) {
        return this.#hierarchyBuilder.build(entities);
    }

    /**
     * Перестроение иерархии
     * @param {Object} entities - Сущности для перестроения
     * @returns {Object} Новая иерархия
     */
    rebuildHierarchy(entities) {
        console.log('🔄 Перестроение иерархии сущностей...');
        
        this.#hierarchyCache = null;
        return this.buildEntityHierarchy(entities);
    }

    /**
     * Обновление мета-данных сущности
     * @param {string} levelId - ID уровня
     * @param {Object} updates - Обновления
     * @returns {Object} Обновленная сущность
     */
    updateEntityMetadata(levelId, updates) {
        const entity = this.#entityCache.get(levelId);
        if (!entity) {
            throw new Error(`Сущность с level ${levelId} не найдена`);
        }

        Object.assign(entity, updates);
        this.#hierarchyCache = null;
        
        console.log(`✏️ Обновлены мета-данные для ${levelId}`);

        this.#dispatchEvent('entityMetadataUpdated', {
            levelId,
            updates,
            entity
        });

        return entity;
    }

    // Predictive Loading v3.0
    #schedulePredictiveLoading(currentLevel) {
        if (!this.config.predictiveLoading.enabled) return;

        setTimeout(() => {
            this.#performPredictiveLoading(currentLevel);
        }, this.config.predictiveLoading.preloadDelay);
    }

    #performPredictiveLoading(currentLevel) {
        const currentEntity = this.#entityCache.get(currentLevel);
        if (!currentEntity) return;

        const toPreload = this.#findEntitiesToPreload(currentEntity);
        
        if (toPreload.length > 0) {
            console.log(`🎯 Предиктивная загрузка: ${toPreload.length} сущностей`);
            
            this.#dispatchEvent('predictiveLoadScheduled', {
                source: currentLevel,
                targets: toPreload,
                depth: this.config.predictiveLoading.depth
            });

            toPreload.forEach(entityId => {
                this.#preloadEntity(entityId);
            });

            this.stats.predictiveHits++;
        }
    }

    #findEntitiesToPreload(entity, depth = 0) {
        if (depth >= this.config.predictiveLoading.depth) return [];

        const toPreload = [];
        
        // Предзагружаем детей текущей сущности
        if (entity.children) {
            for (const child of entity.children) {
                toPreload.push(child.level);
                toPreload.push(...this.#findEntitiesToPreload(child, depth + 1));
            }
        }

        // Предзагружаем соседей
        if (entity.parent) {
            const parent = this.#entityCache.get(entity.parent);
            if (parent?.children) {
                for (const sibling of parent.children) {
                    if (sibling.level !== entity.level) {
                        toPreload.push(sibling.level);
                    }
                }
            }
        }

        return [...new Set(toPreload)];
    }

    #preloadEntity(entityId) {
        const entity = this.#entityCache.get(entityId);
        if (!entity) return;

        entity.metadata.predictiveScore = (entity.metadata.predictiveScore ?? 0) + 1;

        this.#dispatchEvent('entityPreloadInitiated', {
            entityId,
            predictiveScore: entity.metadata.predictiveScore
        });
    }

    #handlePredictiveLoad(request) {
        const { entityId, priority } = request;
        this.#preloadEntity(entityId);
    }

    // Analytics v3.0
    #collectAnalytics(eventType, data) {
        const analyticsData = {
            eventType,
            timestamp: Date.now(),
            parserVersion: '3.0',
            circuitBreakerState: this.#circuitBreaker.state,
            cacheStats: {
                size: this.#cache.size,
                entitySize: this.#entityCache.size
            },
            ...data
        };

        this.#dispatchEvent('metaAnalyticsCollected', analyticsData);

        if (this.#app?.recordAnalytics) {
            this.#app.recordAnalytics('meta_parser', analyticsData);
        }
    }

    // Public API v3.0
    getEntity(levelId) {
        return this.#entityCache.get(levelId);
    }

    getAllEntities() {
        return Array.from(this.#entityCache.cache.values()).map(item => item.data);
    }

    getCurrentHierarchy() {
        return this.#hierarchyCache;
    }

    getTotalPlanets() {
        return this.getAllEntities().filter(entity => 
            entity.type === 'planet'
        ).length;
    }

    getPredictiveCandidates() {
        return this.getAllEntities()
            .filter(entity => (entity.metadata.predictiveScore ?? 0) > 0)
            .sort((a, b) => (b.metadata.predictiveScore ?? 0) - (a.metadata.predictiveScore ?? 0));
    }

    getStats() {
        return {
            ...this.stats,
            cacheSize: this.#cache.size,
            entityCacheSize: this.#entityCache.size,
            hierarchyCache: !!this.#hierarchyCache,
            predictiveCandidates: this.getPredictiveCandidates().length,
            domains: Array.from(this.stats.domainsProcessed)
        };
    }

    clearCache() {
        this.#cache.clear();
        this.#entityCache.clear();
        this.#hierarchyCache = null;
        this.stats.cacheHits = 0;
        
        console.log('🧹 Кэш мета-парсера полностью очищен');
        
        this.#dispatchEvent('metaCacheCleared', {
            timestamp: Date.now()
        });
    }

    #dispatchEvent(eventName, detail) {
        try {
            const event = new CustomEvent(eventName, { detail });
            document.dispatchEvent(event);
        } catch (error) {
            console.error(`❌ Ошибка отправки события ${eventName}:`, error);
        }
    }

    #delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Статический метод для создания экземпляра
    static async create(app) {
        const parser = new GalaxyMetaParser(app);
        await parser.init();
        return parser;
    }

    // Методы жизненного цикла v3.0
    async start() {
        console.log('🔍 GalaxyMetaParser v3.0 запущен');
        return Promise.resolve();
    }

    async recover() {
        console.log('🔄 Восстановление GalaxyMetaParser v3.0...');
        
        const savedStats = { ...this.stats };
        this.clearCache();
        this.stats = savedStats;
        this.#circuitBreaker.state = GalaxyMetaParser.#CIRCUIT_BREAKER_STATES.HALF_OPEN;
        
        console.log('✅ GalaxyMetaParser v3.0 восстановлен');
        return true;
    }

    destroy() {
        console.log('🧹 Очистка GalaxyMetaParser v3.0...');
        
        // Удаляем все обработчики событий
        for (const [eventName, handler] of this.#eventListeners) {
            document.removeEventListener(eventName, handler);
        }
        this.#eventListeners.clear();
        
        this.clearCache();
        this.#pageManifest = null;
        this.#circuitBreaker.state = GalaxyMetaParser.#CIRCUIT_BREAKER_STATES.CLOSED;
        
        console.log('✅ GalaxyMetaParser v3.0 очищен');
    }
}

// Named exports для современных модульных систем
export { GalaxyMetaParser };

// Совместимость с legacy системой
if (typeof window !== 'undefined') {
    window.GalaxyMetaParser = GalaxyMetaParser;
}

console.log('✅ Модуль 2: Основной класс GalaxyMetaParser ES6+ загружен');

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', async function() {
    if (window.GalaxyMetaParser) {
        try {
            window.metaParserInstance = await GalaxyMetaParser.create(window.app);
            console.log('🚀 GalaxyMetaParser автоматически инициализирован');
        } catch (error) {
            console.error('❌ Ошибка автоматической инициализации GalaxyMetaParser:', error);
        }
    }
});
