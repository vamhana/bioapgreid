if (typeof window.GalaxyMetaParser !== 'undefined') {
    console.warn('⚠️ GalaxyMetaParser уже загружен, пропускаем повторную загрузку');
} else {

class GalaxyMetaParser {
    constructor(app) {
class GalaxyMetaParser {
    constructor(app) {
        if (!window.MetaCache || !window.HierarchyBuilder) {
            throw new Error('Модуль 1 (meta-parser-1.js) должен быть загружен перед этим модулем');
        }

        this._app = app;
        this._cache = new window.MetaCache(100);
        this._entityCache = new window.MetaCache(100);
        this._hierarchyCache = null;
        this._pageManifest = null;
        this._eventListeners = new Map();
        this._vercelAPIEnabled = false;
        
        this.config = window.PARSER_CONFIG;
        
        this.stats = {
            totalParsed: 0,
            cacheHits: 0,
            errors: 0,
            lastParseTime: 0,
            circuitBreakerState: 'CLOSED',
            predictiveHits: 0,
            domainsProcessed: new Set(),
            serverSideParsed: 0
        };

        this._circuitBreaker = {
            failures: 0,
            lastFailure: 0,
            state: 'CLOSED'
        };

        this._hierarchyBuilder = new window.HierarchyBuilder(this.config.maxHierarchyDepth);
        
        console.log('🔍 GalaxyMetaParser v3.1 создан');
    }

    /**
     * Инициализация парсера
     * @returns {Promise<void>}
     */
    async init() {
        console.log('🔍 Инициализация GalaxyMetaParser v3.1...');
        
        try {
            await this._loadPageManifest();
            this._setupEventListeners();
            this._setupCacheCleanup();
            this._setupPredictiveLoading();
            this._integrateWithContentManager();
            this._checkVercelIntegration();
            
            console.log('✅ GalaxyMetaParser v3.1 инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации GalaxyMetaParser:', error);
            this._handleCircuitBreakerError();
            throw error;
        }
    }

    /**
     * Проверка интеграции с Vercel
     * @private
     */
    _checkVercelIntegration() {
        // Проверяем доступность Vercel API
        if (typeof window !== 'undefined' && window.VercelMetaParser) {
            this._vercelAPIEnabled = true;
            console.log('🔗 Vercel интеграция доступна');
        } else {
            console.log('ℹ️ Vercel интеграция недоступна');
        }
    }

    /**
     * Загрузка манифеста страниц
     * @private
     */
    async _loadPageManifest() {
        if (this._circuitBreaker.state === 'OPEN') {
            console.warn('⚠️ Circuit breaker открыт, пропускаем загрузку манифеста');
            return;
        }

        try {
            const response = await fetch('/sitemap.json');
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        this._pageManifest = await response.json();
                        console.log('📋 Загружен манифест с ' + (this._pageManifest.pages ? this._pageManifest.pages.length : 0) + ' страницами');
                    } catch (parseError) {
                        console.warn('⚠️ Не удалось распарсить JSON манифеста:', parseError.message);
                        this._pageManifest = null;
                    }
                } else {
                    console.warn('⚠️ Неверный content-type манифеста:', contentType);
                    this._pageManifest = null;
                }
            } else {
                console.warn('⚠️ Не удалось загрузить манифест страниц: HTTP ' + response.status);
                this._pageManifest = null;
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить манифест страниц:', error.message);
            this._pageManifest = null;
            this._handleCircuitBreakerError();
        }
    }
    /**
     * Настройка обработчиков событий
     * @private
     */
    _setupEventListeners() {
        const eventHandlers = new Map([
            ['parseMetaData', (event) => this.parseAllPages(event.detail.pageUrls)],
            ['rebuildHierarchy', (event) => this.rebuildHierarchy(event.detail.entities)],
            ['updateEntityMetadata', (event) => this.updateEntityMetadata(event.detail.levelId, event.detail.updates)],
            ['clearMetaCache', () => this.clearCache()],
            ['predictiveLoadRequest', (event) => this._handlePredictiveLoad(event.detail)],
            ['contentManagerReady', () => this._integrateWithContentManager()],
            ['navigationChanged', (event) => this._schedulePredictiveLoading(event.detail.currentLevel)],
            ['vercelAdapterReady', (event) => this._handleVercelReady(event.detail)]
        ]);

        for (const [eventName, handler] of eventHandlers) {
            const boundHandler = handler.bind(this);
            this._eventListeners.set(eventName, boundHandler);
            document.addEventListener(eventName, boundHandler);
        }
    }

    /**
     * Обработчик готовности Vercel адаптера
     * @private
     */
    _handleVercelReady(detail) {
        this._vercelAPIEnabled = detail.activated;
        console.log('🔗 Vercel адаптер ' + (this._vercelAPIEnabled ? 'активирован' : 'в fallback режиме'));
        
        if (this._vercelAPIEnabled && detail.environment) {
            this.stats.domainsProcessed.add(detail.environment.hostname);
        }
    }

    /**
     * Настройка периодической очистки кэша
     * @private
     */
    _setupCacheCleanup() {
        setInterval(() => {
            this._cleanupExpiredCache();
        }, this.config.cacheTTL);
    }

    /**
     * Настройка системы предиктивной загрузки
     * @private
     */
    _setupPredictiveLoading() {
        if (!this.config.predictiveLoading.enabled) return;
        console.log('🎯 Предиктивная загрузка активирована');
    }

    /**
     * Интеграция с ContentManager
     * @private
     */
    _integrateWithContentManager() {
        if (window.ContentManager) {
            console.log('🔄 Интеграция с ContentManager v3.0');
            
            document.addEventListener('metaParsingCompleted', (event) => {
                if (window.ContentManager && window.ContentManager.analyzeContentStructure) {
                    window.ContentManager.analyzeContentStructure(event.detail.entities);
                }
            });
        }
    }

    /**
     * Очистка устаревшего кэша
     * @private
     */
    _cleanupExpiredCache() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [url, cached] of this._cache.getAll().entries()) {
            if (now - cached.timestamp > this.config.cacheTTL) {
                this._cache.delete(url);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log('🧹 Очищено ' + cleanedCount + ' устаревших записей кэша');
        }
    }

    /**
     * Обработка ошибок Circuit Breaker
     * @private
     */
    _handleCircuitBreakerError() {
        this._circuitBreaker.failures++;
        this._circuitBreaker.lastFailure = Date.now();

        if (this._circuitBreaker.failures >= this.config.circuitBreaker.failureThreshold) {
            this._circuitBreaker.state = 'OPEN';
            this.stats.circuitBreakerState = 'OPEN';
            console.warn('🚨 Circuit breaker открыт из-за множественных ошибок');
            
            setTimeout(() => {
                this._circuitBreaker.state = 'HALF_OPEN';
                this._circuitBreaker.failures = 0;
                this.stats.circuitBreakerState = 'HALF_OPEN';
                console.log('🔄 Circuit breaker переходит в HALF_OPEN состояние');
            }, this.config.circuitBreaker.resetTimeout);
        }
    }

    /**
     * Обработка успешных операций Circuit Breaker
     * @private
     */
    _handleCircuitBreakerSuccess() {
        if (this._circuitBreaker.state === 'HALF_OPEN') {
            this._circuitBreaker.state = 'CLOSED';
            this.stats.circuitBreakerState = 'CLOSED';
            console.log('✅ Circuit breaker закрыт - операции восстановлены');
        }
        this._circuitBreaker.failures = 0;
    }

    /**
     * Парсинг всех страниц
     * @param {string[]} pageUrls - Список URL для парсинга
     * @returns {Promise<Object>} Построенная иерархия
     */
    async parseAllPages(pageUrls) {
        if (this._circuitBreaker.state === 'OPEN') {
            console.warn('⚠️ Circuit breaker открыт, пропускаем парсинг');
            return this._hierarchyCache || this._getFallbackHierarchy();
        }

        const startTime = performance.now();
        
        try {
            this._dispatchEvent('metaParsingStarted', { 
                timestamp: Date.now(),
                pageCount: pageUrls ? pageUrls.length : 'auto',
                circuitBreakerState: this._circuitBreaker.state,
                vercelEnabled: this._vercelAPIEnabled
            });

            const urls = pageUrls || await this._discoverPageUrls();
            
            if (urls.length === 0) {
                throw new Error('Не найдено страниц для парсинга');
            }

            console.log('📄 Найдено ' + urls.length + ' страниц для парсинга');

            const results = {};
            const parsingPromises = urls.map(url => this.parsePageMeta(url));
            const parsedPages = await Promise.allSettled(parsingPromises);

            const stats = parsedPages.reduce((acc, result, index) => {
                if (result.status === 'fulfilled') {
                    results[result.value.level] = result.value;
                    acc.successCount++;
                    
                    // Считаем server-side парсинг
                    if (result.value.metadata && result.value.metadata.serverSideParsed) {
                        this.stats.serverSideParsed++;
                    }
                } else {
                    console.error('❌ Ошибка парсинга ' + urls[index] + ':', result.reason);
                    acc.errorCount++;
                    this._dispatchEvent('metaParsingError', {
                        url: urls[index],
                        error: result.reason.message,
                        critical: false
                    });
                }
                return acc;
            }, { successCount: 0, errorCount: 0 });

            const hierarchy = this.buildEntityHierarchy(results);
            this._hierarchyCache = hierarchy;
            
            const parseTime = performance.now() - startTime;

            this.stats.totalParsed += stats.successCount;
            this.stats.errors += stats.errorCount;
            this.stats.lastParseTime = parseTime;

            this._handleCircuitBreakerSuccess();

            this._dispatchEvent('metaParsingCompleted', {
                entities: results,
                hierarchy: hierarchy,
                stats: {
                    total: urls.length,
                    successful: stats.successCount,
                    errors: stats.errorCount,
                    parseTime: parseTime,
                    cacheEfficiency: this.stats.cacheHits / (this.stats.cacheHits + stats.successCount),
                    serverSideParsed: this.stats.serverSideParsed
                }
            });

            this._dispatchEvent('hierarchyBuilt', { 
                hierarchy: hierarchy,
                entityCount: Object.keys(results).length
            });

            this._collectAnalytics('parse_completed', {
                entityCount: Object.keys(results).length,
                parseTime: parseTime,
                vercelEnabled: this._vercelAPIEnabled
            });

            console.log('✅ Парсинг завершен: ' + stats.successCount + ' успешно, ' + stats.errorCount + ' ошибок за ' + parseTime.toFixed(2) + 'мс');

            return hierarchy;

        } catch (error) {
            const errorTime = performance.now() - startTime;
            console.error('💥 Ошибка при парсинге всех страниц:', error);
            
            this._handleCircuitBreakerError();
            
            this._dispatchEvent('metaParsingError', { 
                error: error.message,
                critical: true,
                parseTime: errorTime
            });
            
            return this._hierarchyCache || this._getFallbackHierarchy();
        }
    }

    /**
     * Резервная иерархия при ошибках
     * @private
     * @returns {Object} Fallback иерархия
     */
    _getFallbackHierarchy() {
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
    async _discoverPageUrls() {
        console.log('🔍 Универсальное обнаружение страниц...');

        // Если доступен Vercel API, пробуем использовать его
        if (this._vercelAPIEnabled && window.VercelMetaParser) {
            try {
                const projectInfo = await window.VercelMetaParser.getProjectInfo();
                if (projectInfo && projectInfo.data && projectInfo.data.pages) {
                    const urls = projectInfo.data.pages.map(page => '/' + page.path);
                    console.log('✅ Vercel обнаружение: ' + urls.length + ' страниц');
                    return urls;
                }
            } catch (error) {
                console.warn('⚠️ Vercel обнаружение не удалось:', error.message);
            }
        }

        try {
            const apiUrls = await this._discoverPagesViaUniversalAPI();
            if (apiUrls.length > 0) {
                console.log('🌐 API обнаружение: ' + apiUrls.length + ' страниц');
                return apiUrls;
            }
        } catch (error) {
            console.warn('⚠️ API обнаружение не удалось:', error.message);
        }

        try {
            const scannedUrls = await this._universalDirectoryScan();
            if (scannedUrls.length > 0) {
                console.log('📁 Авто-сканирование: ' + scannedUrls.length + ' страниц');
                return scannedUrls;
            }
        } catch (error) {
            console.warn('⚠️ Авто-сканирование не удалось:', error.message);
        }

        try {
            const linkUrls = await this._discoverViaSiteLinks();
            if (linkUrls.length > 0) {
                console.log('🔗 Анализ ссылок: ' + linkUrls.length + ' страниц');
                return linkUrls;
            }
        } catch (error) {
            console.warn('⚠️ Анализ ссылок не удался:', error.message);
        }

        const initialUrls = await this._createInitialStructure();
        console.log('🚀 Создана начальная структура: ' + initialUrls.length + ' страниц');
        return initialUrls;
    }

    /**
     * Универсальное API обнаружение для любого домена
     * @private
     * @returns {Promise<string[]>} Массив URL
     */
    async _discoverPagesViaUniversalAPI() {
        const basePath = this._detectBasePath();
        
        const apiEndpoints = [
            basePath + '/api/pages',
            basePath + '/api/sitemap',
            basePath + '/data/pages.json',
            basePath + '/manifest.json',
            basePath + '/sitemap.xml',
            basePath + '/api/galaxy/pages',
            basePath + '/data/galaxy.json',
            basePath + '/meta/pages',
            '/api/pages',
            '/sitemap.json',
            '/pages.json'
        ];

        const uniqueEndpoints = [...new Set(apiEndpoints)];

        for (const endpoint of uniqueEndpoints) {
            try {
                console.log('🔍 Проверка endpoint: ' + endpoint);
                const response = await fetch(endpoint, { 
                    method: 'GET',
                    headers: { 'Accept': 'application/json,application/xml,*/*' }
                });
                
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    let data;
                    
                    if (contentType && contentType.includes('application/json')) {
                        data = await response.json();
                    } else if ((contentType && contentType.includes('application/xml')) || endpoint.endsWith('.xml')) {
                        data = await this._parseSitemapXML(await response.text());
                    } else {
                        data = await response.text();
                        data = this._tryParseAsJSON(data);
                    }
                    
                    const urls = this._extractUrlsFromUniversalResponse(data, endpoint);
                    if (urls.length > 0) {
                        console.log('✅ Найдено ' + urls.length + ' URLs через ' + endpoint);
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
    _detectBasePath() {
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split('/').filter(Boolean);
        
        if (pathParts.length > 1 && pathParts[0] !== 'pages') {
            return '/' + pathParts[0];
        }
        
        return '';
    }

    /**
     * Универсальное сканирование директорий
     * @private
     * @returns {Promise<string[]>} Массив URL
     */
    async _universalDirectoryScan() {
        const discoveredUrls = [];
        
        const rootDirectories = ['pages', 'content', 'docs', 'articles', 'posts', 'galaxy'];
        
        for (const directory of rootDirectories) {
            const urls = await this._scanDirectory(directory);
            discoveredUrls.push(...urls);
        }
        
        const rootFiles = await this._scanRootHTMLFiles();
        discoveredUrls.push(...rootFiles);
        
        return [...new Set(discoveredUrls)];
    }

    /**
     * Сканирование конкретной директории
     * @private
     * @param {string} directoryName - Имя директории
     * @returns {Promise<string[]>} Массив URL
     */
    async _scanDirectory(directoryName) {
        const commonPageNames = [
            'index', 'home', 'main', 'start', 'welcome',
            'about', 'contact', 'help', 'docs', 'api',
            'galaxy', 'universe', 'world', 'space',
            'planets', 'stars', 'systems', 'navigation'
        ];

        const discoveredUrls = [];
        const checkPromises = commonPageNames.map(async (pageName) => {
            const possibleUrls = [
                '/' + directoryName + '/' + pageName + '.html',
                '/' + directoryName + '/' + pageName + '/index.html',
                '/' + directoryName + '/' + pageName + '.php',
                '/' + directoryName + '/' + pageName + '.htm'
            ];

            for (const url of possibleUrls) {
                if (await this._checkPageExists(url)) {
                    discoveredUrls.push(url);
                    console.log('📄 Обнаружена страница: ' + url);
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
    async _scanRootHTMLFiles() {
        const rootFiles = [
            'index.html', 'index.php', 'index.htm',
            'home.html', 'main.html', 'default.html',
            'galaxy.html', 'universe.html', 'start.html'
        ];

        const discoveredUrls = [];
        const checkPromises = rootFiles.map(async (fileName) => {
            if (await this._checkPageExists('/' + fileName)) {
                discoveredUrls.push('/' + fileName);
                console.log('📄 Обнаружена корневая страница: /' + fileName);
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
    async _discoverViaSiteLinks() {
        try {
            const response = await fetch('/');
            if (!response.ok) return [];
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
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
                    if (!href.startsWith('/')) return '/' + href;
                    if (!href.includes('.') && !href.endsWith('/')) return href + '.html';
                    return href;
                })
                .filter((url, index, self) => self.indexOf(url) === index);
            
            console.log('🔗 Найдено ' + internalUrls.length + ' внутренних ссылок');
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
    async _createInitialStructure() {
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

        const existingUrls = [];
        for (const page of initialPages) {
            if (!await this._checkPageExists(page.url)) {
                console.log('📝 Создана начальная страница: ' + page.url);
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
    async _parseSitemapXML(xmlContent) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
            
            const urls = Array.from(xmlDoc.getElementsByTagName('loc'))
                .map(loc => loc.textContent)
                .filter(url => url && url.includes(window.location.hostname));
                
            return { urls: urls };
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
    _tryParseAsJSON(text) {
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
    _extractUrlsFromUniversalResponse(data, endpoint) {
        if (!data) return [];
        
        const extractionStrategies = [
            function() { return Array.isArray(data) ? data.filter(url => typeof url === 'string') : null; },
            function() { return data.urls ? data.urls.map(function(url) { return typeof url === 'string' ? url : url.loc; }) : null; },
            function() { return data.urlset && data.urlset.url ? data.urlset.url.map(function(url) { return url.loc; }) : null; },
            function() { return data.pages ? data.pages.map(function(page) { return page.url || page.path; }) : null; },
            function() { return Object.keys(data).map(function(key) { return '/pages/' + key + '.html'; }); },
            function() { return Object.keys(data).filter(function(key) { return key.startsWith('/'); }); },
            function() {
                if (typeof data === 'string') {
                    const urlRegex = /["'](\/pages\/[^"']+\.html)["']/g;
                    const matches = [...data.matchAll(urlRegex)];
                    return matches.map(function(match) { return match[1]; });
                }
                return null;
            }
        ];

        for (const strategy of extractionStrategies) {
            try {
                const urls = strategy();
                if (urls && urls.length > 0) {
                    return urls
                        .map(url => this._normalizePageUrl(url))
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
    async _checkPageExists(url) {
        const methods = [
            () => this._checkWithHEAD(url),
            () => this._checkWithGET(url),
            () => this._checkWithFetch(url, { method: 'OPTIONS' })
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

    async _checkWithHEAD(url) {
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

    async _checkWithGET(url) {
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

    async _checkWithFetch(url, options) {
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
    _normalizePageUrl(url) {
        const cleanUrl = url.replace(/^\//, '');
        
        if (url.startsWith('http') || url.startsWith('/pages/')) {
            return url;
        }
        
        return '/pages/' + cleanUrl;
    }

    /**
     * Парсинг мета-данных страницы
     * @param {string} pageUrl - URL страницы
     * @returns {Promise<Object>} Мета-данные сущности
     */
    async parsePageMeta(pageUrl) {
        const cached = this._cache.get(pageUrl);
        if (cached && cached.data && (Date.now() - cached.timestamp < this.config.cacheTTL)) {
            this.stats.cacheHits++;
            return cached.data;
        }

        try {
            const response = await this._fetchWithRetry(pageUrl);
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }

            const html = await response.text();
            const metaTags = this._extractMetaTags(html, pageUrl);
            
            this._validateMetaTags(metaTags, pageUrl);
            
            const completeEntity = this._generateMissingData(metaTags, pageUrl);
            
            this._validateEntityStructure(completeEntity);

            const enrichedEntity = this._enrichEntityData(completeEntity, pageUrl);

            this._cache.set(pageUrl, {
                data: enrichedEntity,
                timestamp: Date.now()
            });
            
            this._entityCache.set(enrichedEntity.level, enrichedEntity);

            console.log('✅ Успешно распаршена: ' + pageUrl + ' → ' + enrichedEntity.title + ' (' + enrichedEntity.type + ')');
            return enrichedEntity;

        } catch (error) {
            console.error('❌ Ошибка парсинга ' + pageUrl + ':', error);
            
            this._cache.set(pageUrl, {
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
    async _fetchWithRetry(url, maxRetries) {
        const retries = maxRetries || this.config.maxRetries;
        
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

                const response = await fetch(url, { 
                    signal: controller.signal 
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) return response;
                
                if (attempt === retries) {
                    throw new Error('Не удалось загрузить ' + url + ' после ' + retries + ' попыток (' + response.status + ')');
                }
                
                await this._delay(Math.pow(2, attempt) * 1000);
            } catch (error) {
                if (attempt === retries) throw error;
                await this._delay(Math.pow(2, attempt) * 1000);
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
    _extractMetaTags(html, pageUrl) {
        const metaTags = {};
        const parser = new DOMParser();
        
        try {
            const doc = parser.parseFromString(html, 'text/html');

            const metaElements = doc.querySelectorAll('meta[name^="galaxy:"]');
            
            metaElements.forEach(meta => {
                const name = meta.getAttribute('name') ? meta.getAttribute('name').replace('galaxy:', '') : null;
                const content = meta.getAttribute('content');
                
                if (name && content !== null) {
                    metaTags[name] = content.trim();
                }
            });

            if (!metaTags.title) {
                const titleElement = doc.querySelector('title');
                metaTags.title = titleElement ? titleElement.textContent.trim() : null;
            }

            if (!metaTags.description) {
                const descElement = doc.querySelector('meta[name="description"]');
                metaTags.description = descElement ? descElement.getAttribute('content') : null;
            }

        } catch (error) {
            console.warn('⚠️ Ошибка парсинга HTML для ' + pageUrl + ':', error.message);
        }

        return metaTags;
    }

    /**
     * Валидация мета-тегов
     * @private
     * @param {Object} metaTags - Мета-теги для валидации
     * @param {string} pageUrl - URL страницы
     */
    _validateMetaTags(metaTags, pageUrl) {
        const requiredMetaTags = ['level', 'type', 'title'];
        const missingRequired = requiredMetaTags.filter(tag => !metaTags[tag]);
        
        if (missingRequired.length > 0) {
            throw new Error(
                'Отсутствуют обязательные мета-теги: ' + missingRequired.join(', ') + ' в ' + pageUrl
            );
        }

        if (metaTags.type && !this.config.supportedEntityTypes.includes(metaTags.type)) {
            throw new Error('Неподдерживаемый тип сущности: ' + metaTags.type + ' в ' + pageUrl);
        }

        if (metaTags.level && !this._isValidLevelFormat(metaTags.level)) {
            throw new Error('Некорректный формат уровня: ' + metaTags.level + ' в ' + pageUrl);
        }

        if (metaTags['orbit-radius'] && isNaN(parseFloat(metaTags['orbit-radius']))) {
            throw new Error('Некорректный радиус орбиты: ' + metaTags['orbit-radius'] + ' в ' + pageUrl);
        }

        if (metaTags['orbit-angle'] && isNaN(parseFloat(metaTags['orbit-angle']))) {
            throw new Error('Некорректный угол орбиты: ' + metaTags['orbit-angle'] + ' в ' + pageUrl);
        }

        if (metaTags.color && !this._isValidColor(metaTags.color)) {
            throw new Error('Некорректный формат цвета: ' + metaTags.color + ' в ' + pageUrl);
        }
    }

    /**
     * Проверка валидности формата уровня
     * @private
     * @param {string} level - Уровень для проверки
     * @returns {boolean} Валиден ли формат
     */
    _isValidLevelFormat(level) {
        return typeof level === 'string' && level.length > 0 && /^[a-zA-Z0-9_-]+$/.test(level);
    }

    /**
     * Проверка валидности цвета
     * @private
     * @param {string} color - Цвет для проверки
     * @returns {boolean} Валиден ли цвет
     */
    _isValidColor(color) {
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
    _generateMissingData(metaTags, pageUrl) {
        const entity = { ...metaTags };
        
        const typeConfig = {
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
        };

        entity['orbit-radius'] = entity['orbit-radius'] || typeConfig.orbitRadii.get(entity.type) || 100;
        entity['orbit-angle'] = entity['orbit-angle'] || this._calculateAutoAngle(entity);
        entity.color = entity.color || typeConfig.colors.get(entity.type) || this._generateRandomColor();
        entity.importance = entity.importance || this._calculateImportance(entity);
        entity.description = entity.description || 'Раздел "' + entity.title + '" во вселенной BIOAPGREID';
        entity.icon = entity.icon || typeConfig.icons.get(entity.type) || '🔮';
        entity['content-priority'] = entity['content-priority'] || this._calculateContentPriority(entity);
        entity['analytics-category'] = entity['analytics-category'] || typeConfig.analyticsCategories.get(entity.type) || 'general';

        const numericFields = ['orbit-radius', 'orbit-angle', 'size-modifier'];
        numericFields.forEach(field => {
            if (entity[field]) {
                entity[field] = parseFloat(entity[field]);
            }
        });

        entity.unlocked = entity.unlocked !== 'false';

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
    _enrichEntityData(entity, pageUrl) {
        return {
            ...entity,
            metadata: {
                sourceUrl: pageUrl,
                parsedAt: new Date().toISOString(),
                version: '3.1',
                cacheKey: this._generateCacheKey(entity.level),
                predictiveScore: 0,
                ...entity.metadata
            },
            position: entity.position || { x: 0, y: 0 },
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
    _generateCacheKey(level) {
        return 'meta_v3.1_' + level + '_' + Date.now().toString(36);
    }

    /**
     * Расчет автоматического угла орбиты
     * @private
     * @param {Object} entity - Сущность
     * @returns {number} Угол орбиты
     */
    _calculateAutoAngle(entity) {
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
    _generateRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        return 'hsl(' + hue + ', 70%, 60%)';
    }

    /**
     * Расчет важности сущности
     * @private
     * @param {Object} entity - Сущность
     * @returns {string} Важность
     */
    _calculateImportance(entity) {
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
    _calculateContentPriority(entity) {
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
    _validateEntityStructure(entity) {
        this._checkCircularDependencies(entity);

        if (entity['orbit-radius'] < 0) {
            throw new Error('Отрицательный радиус орбиты: ' + entity['orbit-radius'] + ' для ' + entity.title);
        }

        if (entity['orbit-radius'] > 1000) {
            console.warn('⚠️ Слишком большой радиус орбиты: ' + entity['orbit-radius'] + ' для ' + entity.title);
        }

        if (entity['orbit-angle'] < 0 || entity['orbit-angle'] >= 360) {
            console.warn('⚠️ Угол орбиты вне диапазона 0-360: ' + entity['orbit-angle'] + ' для ' + entity.title);
        }
    }

    /**
     * Проверка циклических зависимостей
     * @private
     * @param {Object} entity - Сущность для проверки
     */
    _checkCircularDependencies(entity) {
        if (!entity.parent) return;

        const visited = new Set([entity.level]);
        let current = entity;
        
        while (current && current.parent) {
            if (visited.has(current.parent)) {
                throw new Error('Обнаружена циклическая зависимость: ' + current.level + ' -> ' + current.parent);
            }
            
            visited.add(current.parent);
            const parentEntity = this._entityCache.get(current.parent);
            
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
        return this._hierarchyBuilder.build(entities);
    }

    /**
     * Перестроение иерархии
     * @param {Object} entities - Сущности для перестроения
     * @returns {Object} Новая иерархия
     */
    rebuildHierarchy(entities) {
        console.log('🔄 Перестроение иерархии сущностей...');
        
        this._hierarchyCache = null;
        return this.buildEntityHierarchy(entities);
    }

    /**
     * Обновление мета-данных сущности
     * @param {string} levelId - ID уровня
     * @param {Object} updates - Обновления
     * @returns {Object} Обновленная сущность
     */
    updateEntityMetadata(levelId, updates) {
        const entity = this._entityCache.get(levelId);
        if (!entity) {
            throw new Error('Сущность с level ' + levelId + ' не найдена');
        }

        Object.assign(entity, updates);
        this._hierarchyCache = null;
        
        console.log('✏️ Обновлены мета-данные для ' + levelId);

        this._dispatchEvent('entityMetadataUpdated', {
            levelId: levelId,
            updates: updates,
            entity: entity
        });

        return entity;
    }

    // Predictive Loading v3.1
    _schedulePredictiveLoading(currentLevel) {
        if (!this.config.predictiveLoading.enabled) return;

        setTimeout(() => {
            this._performPredictiveLoading(currentLevel);
        }, this.config.predictiveLoading.preloadDelay);
    }

    _performPredictiveLoading(currentLevel) {
        const currentEntity = this._entityCache.get(currentLevel);
        if (!currentEntity) return;

        const toPreload = this._findEntitiesToPreload(currentEntity);
        
        if (toPreload.length > 0) {
            console.log('🎯 Предиктивная загрузка: ' + toPreload.length + ' сущностей');
            
            this._dispatchEvent('predictiveLoadScheduled', {
                source: currentLevel,
                targets: toPreload,
                depth: this.config.predictiveLoading.depth
            });

            toPreload.forEach(entityId => {
                this._preloadEntity(entityId);
            });

            this.stats.predictiveHits++;
        }
    }

    _findEntitiesToPreload(entity, depth) {
        const currentDepth = depth || 0;
        if (currentDepth >= this.config.predictiveLoading.depth) return [];

        const toPreload = [];
        
        if (entity.children) {
            for (const child of entity.children) {
                toPreload.push(child.level);
                toPreload.push(...this._findEntitiesToPreload(child, currentDepth + 1));
            }
        }

        if (entity.parent) {
            const parent = this._entityCache.get(entity.parent);
            if (parent && parent.children) {
                for (const sibling of parent.children) {
                    if (sibling.level !== entity.level) {
                        toPreload.push(sibling.level);
                    }
                }
            }
        }

        return [...new Set(toPreload)];
    }

    _preloadEntity(entityId) {
        const entity = this._entityCache.get(entityId);
        if (!entity) return;

        entity.metadata.predictiveScore = (entity.metadata.predictiveScore || 0) + 1;

        this._dispatchEvent('entityPreloadInitiated', {
            entityId: entityId,
            predictiveScore: entity.metadata.predictiveScore
        });
    }

    _handlePredictiveLoad(request) {
        const entityId = request.entityId;
        const priority = request.priority;
        this._preloadEntity(entityId);
    }

    // Analytics v3.1
    _collectAnalytics(eventType, data) {
        const analyticsData = {
            eventType: eventType,
            timestamp: Date.now(),
            parserVersion: '3.1',
            circuitBreakerState: this._circuitBreaker.state,
            cacheStats: {
                size: this._cache.size,
                entitySize: this._entityCache.size
            },
            ...data
        };

        this._dispatchEvent('metaAnalyticsCollected', analyticsData);

        if (this._app && this._app.recordAnalytics) {
            this._app.recordAnalytics('meta_parser', analyticsData);
        }
    }

    // Public API v3.1
    getEntity(levelId) {
        return this._entityCache.get(levelId);
    }

    getAllEntities() {
        return Object.values(this._entityCache.getAll());
    }

    getCurrentHierarchy() {
        return this._hierarchyCache;
    }

    getTotalPlanets() {
        return this.getAllEntities().filter(entity => 
            entity.type === 'planet'
        ).length;
    }

    getPredictiveCandidates() {
        return this.getAllEntities()
            .filter(entity => (entity.metadata.predictiveScore || 0) > 0)
            .sort((a, b) => (b.metadata.predictiveScore || 0) - (a.metadata.predictiveScore || 0));
    }

    getStats() {
        return {
            ...this.stats,
            cacheSize: this._cache.size,
            entityCacheSize: this._entityCache.size,
            hierarchyCache: !!this._hierarchyCache,
            predictiveCandidates: this.getPredictiveCandidates().length,
            domains: Array.from(this.stats.domainsProcessed),
            vercelEnabled: this._vercelAPIEnabled
        };
    }

    clearCache() {
        this._cache.clear();
        this._entityCache.clear();
        this._hierarchyCache = null;
        this.stats.cacheHits = 0;
        
        console.log('🧹 Кэш мета-парсера полностью очищен');
        
        this._dispatchEvent('metaCacheCleared', {
            timestamp: Date.now()
        });
    }

    _dispatchEvent(eventName, detail) {
        try {
            const event = new CustomEvent(eventName, { detail: detail });
            document.dispatchEvent(event);
        } catch (error) {
            console.error('❌ Ошибка отправки события ' + eventName + ':', error);
        }
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Статический метод для создания экземпляра
    static async create(app) {
        const parser = new GalaxyMetaParser(app);
        await parser.init();
        return parser;
    }

    // Методы жизненного цикла v3.1
    async start() {
        console.log('🔍 GalaxyMetaParser v3.1 запущен');
        return Promise.resolve();
    }

    async recover() {
        console.log('🔄 Восстановление GalaxyMetaParser v3.1...');
        
        const savedStats = { ...this.stats };
        this.clearCache();
        this.stats = savedStats;
        this._circuitBreaker.state = 'HALF_OPEN';
        
        console.log('✅ GalaxyMetaParser v3.1 восстановлен');
        return true;
    }

    destroy() {
        console.log('🧹 Очистка GalaxyMetaParser v3.1...');
        
        for (const [eventName, handler] of this._eventListeners) {
            document.removeEventListener(eventName, handler);
        }
        this._eventListeners.clear();
        
        this.clearCache();
        this._pageManifest = null;
        this._circuitBreaker.state = 'CLOSED';
        
        console.log('✅ GalaxyMetaParser v3.1 очищен');
    }

    // Новые методы для интеграции с Vercel
    isVercelEnabled() {
        return this._vercelAPIEnabled;
    }

    getVercelStatus() {
        return {
            enabled: this._vercelAPIEnabled,
            adapter: window.vercelAdapter ? window.vercelAdapter.getStatus() : null
        };
    }

    /**
     * Сохранение текущей иерархии в sitemap.json
     * @returns {Promise<boolean>} Успешно ли сохранение
     */
    async saveSitemap() {
        try {
            if (!this._hierarchyCache) {
                console.warn('⚠️ Нет данных иерархии для сохранения');
                return false;
            }
            
            // Получаем все сущности
            const entities = this.getAllEntities().reduce((acc, entity) => {
                acc[entity.level] = entity;
                return acc;
            }, {});
            
            // Сохраняем через SitemapGenerator если доступен
            if (window.universalSitemapGenerator && window.universalSitemapGenerator.saveToDataFile) {
                return await window.universalSitemapGenerator.saveToDataFile();
            }
            
            console.warn('⚠️ SitemapGenerator не доступен для сохранения');
            return false;
            
        } catch (error) {
            console.error('❌ Ошибка сохранения sitemap:', error);
            return false;
        }
    }
}

// Совместимость с legacy системой
if (typeof window !== 'undefined') {
    window.GalaxyMetaParser = GalaxyMetaParser;
}

console.log('✅ Модуль 2: Основной класс GalaxyMetaParser ES6+ загружен');

// ИСПРАВЛЕННАЯ АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', async function() {
    if (window.GalaxyMetaParser && !window.metaParserInstance) {
        try {
            window.metaParserInstance = await GalaxyMetaParser.create(window.app);
            console.log('🚀 GalaxyMetaParser автоматически инициализирован');
        } catch (error) {
            console.error('❌ Ошибка автоматической инициализации GalaxyMetaParser:', error);
        }
    } else if (window.metaParserInstance) {
        console.log('ℹ️ GalaxyMetaParser уже инициализирован');
    }
});

// ЗАКРЫВАЮЩАЯ СКОБКА ДЛЯ ПРОВЕРКИ СУЩЕСТВОВАНИЯ
}
