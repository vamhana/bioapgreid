class VercelAdapter {
    _metaParser;
    _sitemapGenerator;
    _vercelAPIEnabled = false;
    _originalMethods = new Map();
    _apiEndpointsStatus = new Map();

    // ЗАМЕНА: убираем приватное поле, используем обычное статическое свойство
    static _VERCEL_CONFIG = Object.freeze({
        apiEndpoints: {
            projectStructure: '/api/project-structure',
            metaParser: '/api/meta-parser', 
            sitemap: '/api/sitemap',
            pages: '/api/pages'
        },
        batchProcessing: {
            enabled: true,
            threshold: 5,
            timeout: 15000
        },
        fallback: {
            maxWaitTime: 5000,
            retryDelay: 100
        }
    });

    constructor() {
        console.log('🔧 Инициализация Vercel Adapter v4.0...');
    }

    /**
     * Активация Vercel адаптера
     */
    async activate() {
        if (!this._checkDependencies()) {
            console.warn('⚠️ Основные модули не загружены, Vercel Adapter отключен');
            return false;
        }

        await this._checkVercelAPI();
        
        if (this._vercelAPIEnabled) {
            this._applyVercelEnhancements();
            console.log('✅ Vercel Adapter активирован');
            return true;
        } else {
            console.log('ℹ️ Vercel API недоступен, работаем в стандартном режиме');
            return false;
        }
    }

    /**
     * Проверка зависимостей
     */
    _checkDependencies() {
        const dependencies = {
            GalaxyMetaParser: window.GalaxyMetaParser,
            metaParserInstance: window.metaParserInstance,
            SitemapGenerator: window.SitemapGenerator,
            universalSitemapGenerator: window.universalSitemapGenerator
        };

        const missing = Object.entries(dependencies)
            .filter(([key, value]) => !value)
            .map(([key]) => key);

        if (missing.length > 0) {
            console.warn(`⚠️ Отсутствуют зависимости: ${missing.join(', ')}`);
            return false;
        }

        this._metaParser = window.metaParserInstance;
        this._sitemapGenerator = window.universalSitemapGenerator;
        
        return true;
    }

    /**
     * Проверка доступности Vercel API
     */
    async _checkVercelAPI() {
        try {
            // ИСПРАВЛЕНИЕ: используем _VERCEL_CONFIG вместо #VERCEL_CONFIG
            const endpoints = Object.values(VercelAdapter._VERCEL_CONFIG.apiEndpoints);
            const checks = await Promise.all(
                endpoints.map(endpoint => 
                    new Promise((resolve) => {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => {
                            controller.abort();
                            resolve({ 
                                status: 'timeout', 
                                endpoint, 
                                available: false 
                            });
                        }, 3000);

                        fetch(endpoint, { 
                            method: 'HEAD',
                            signal: controller.signal 
                        })
                            .then(response => {
                                clearTimeout(timeoutId);
                                resolve({ 
                                    status: 'fulfilled', 
                                    endpoint, 
                                    available: response.ok,
                                    statusCode: response.status
                                });
                            })
                            .catch(error => {
                                clearTimeout(timeoutId);
                                resolve({ 
                                    status: 'rejected', 
                                    endpoint, 
                                    available: false,
                                    error: error.message
                                });
                            });
                    })
                )
            );

            // Сохраняем статус каждого endpoint
            checks.forEach(check => {
                this._apiEndpointsStatus.set(check.endpoint, check);
            });

            this._vercelAPIEnabled = checks.some(check => check.available);

            if (this._vercelAPIEnabled) {
                const availableEndpoints = checks.filter(check => check.available).length;
                console.log(`✅ Vercel API доступен (${availableEndpoints}/${endpoints.length} endpoints)`);
            } else {
                console.log('ℹ️ Vercel API недоступен');
            }
        } catch (error) {
            console.log('ℹ️ Vercel API проверка не удалась');
            this._vercelAPIEnabled = false;
        }
    }

    /**
     * Применение Vercel улучшений
     */
    _applyVercelEnhancements() {
        this._enhanceMetaParser();
        this._enhanceSitemapGenerator();
        this._setupVercelEvents();
        this._setupAPIErrorHandling();
        
        console.log('🔧 Vercel улучшения применены');
    }

    /**
     * Улучшение GalaxyMetaParser
     */
    _enhanceMetaParser() {
        const parser = this._metaParser;

        // Сохраняем оригинальные методы
        this._originalMethods.set('parseAllPages', parser.parseAllPages.bind(parser));
        this._originalMethods.set('parsePageMeta', parser.parsePageMeta.bind(parser));
        this._originalMethods.set('_discoverPageUrls', parser._discoverPageUrls ? 
            parser._discoverPageUrls.bind(parser) : null);

        // Monkey-patch методов
        parser.parseAllPages = this._createVercelParseAllPages(parser);
        parser.parsePageMeta = this._createVercelParsePageMeta(parser);

        // Добавляем Vercel-специфичные методы
        parser._vercelAPIEnabled = this._vercelAPIEnabled;
        parser._batchParseVercel = this._batchParseVercel.bind(this);
        parser._discoverPageUrlsVercel = this._discoverPageUrlsVercel.bind(this);

        console.log('🔧 GalaxyMetaParser улучшен для Vercel');
    }

    /**
     * Vercel-оптимизированный parseAllPages
     */
    _createVercelParseAllPages(parser) {
        const originalParseAllPages = this._originalMethods.get('parseAllPages');
        const self = this;
        
        return async function(pageUrls) {
            console.log('🚀 Vercel-оптимизированный парсинг всех страниц...');

            let urls = pageUrls;
            
            // Используем Vercel discovery если доступно
            if (!urls && this._vercelAPIEnabled) {
                urls = await this._discoverPageUrlsVercel();
            }
            
            // Если Vercel discovery не дал результатов, используем оригинальный метод
            if (!urls || urls.length === 0) {
                const originalDiscover = self._originalMethods.get('_discoverPageUrls');
                if (originalDiscover) {
                    urls = await originalDiscover.call(this);
                }
            }

            // Используем batch парсинг для больших наборов
            if (this._vercelAPIEnabled && urls && urls.length > 3) {
                console.log(`🔄 Пакетная обработка ${urls.length} страниц...`);
                const result = await this._batchParseVercel(urls);
                if (result) {
                    console.log('✅ Пакетный парсинг завершен через Vercel API');
                    return result;
                }
            }

            // Fallback на оригинальный метод
            console.log('🔄 Использование оригинального метода парсинга...');
            return originalParseAllPages.call(this, urls);
        };
    }

    /**
     * Vercel-оптимизированный parsePageMeta
     */
    _createVercelParsePageMeta(parser) {
        const originalParsePageMeta = this._originalMethods.get('parsePageMeta');
        const self = this;
        
        return async function(pageUrl) {
            // Для тяжелых страниц используем server-side парсинг
            if (this._vercelAPIEnabled && self._shouldUseServerSideParsing(pageUrl)) {
                try {
                    // ИСПРАВЛЕНИЕ: используем _VERCEL_CONFIG вместо #VERCEL_CONFIG
                    const response = await fetch(
                        VercelAdapter._VERCEL_CONFIG.apiEndpoints.metaParser + 
                        '?url=' + encodeURIComponent(pageUrl)
                    );
                    
                    if (response.ok) {
                        const result = await response.json();
                        
                        if (result && result.success) {
                            console.log('✅ Server-side парсинг: ' + pageUrl);
                            
                            // Трансформируем результат в формат системы
                            const entity = this._enrichEntityData ? 
                                this._enrichEntityData(result.meta, pageUrl) :
                                self._createBasicEntity(result.meta, pageUrl);
                            
                            entity.metadata = entity.metadata || {};
                            entity.metadata.serverSideParsed = true;
                            entity.metadata.parsedAt = new Date().toISOString();
                            
                            // Сохраняем в кэш
                            if (this._cache) {
                                this._cache.set(pageUrl, {
                                    data: entity,
                                    timestamp: Date.now()
                                });
                            }
                            
                            return entity;
                        }
                    }
                } catch (error) {
                    console.warn('Server-side парсинг не удался для ' + pageUrl + ': ' + error.message);
                }
            }

            // Fallback на оригинальный метод
            return originalParsePageMeta.call(this, pageUrl);
        };
    }

    /**
     * Пакетный парсинг через Vercel API
     */
    async _batchParseVercel(urls) {
        console.log('🔄 Пакетный парсинг ' + urls.length + ' страниц через Vercel API...');
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            // ИСПРАВЛЕНИЕ: используем _VERCEL_CONFIG вместо #VERCEL_CONFIG
            const response = await fetch(VercelAdapter._VERCEL_CONFIG.apiEndpoints.metaParser, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: urls }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            
            const result = await response.json();
            
            if (result && result.success) {
                const entities = {};
                const batchResults = result.results || [];
                
                batchResults.forEach((item) => {
                    if (item && item.success && item.meta) {
                        try {
                            // Используем метод обогащения сущности из основного парсера
                            const entity = this._metaParser._enrichEntityData ?
                                this._metaParser._enrichEntityData(item.meta, item.url) :
                                this._createBasicEntity(item.meta, item.url);
                            
                            entity.metadata = entity.metadata || {};
                            entity.metadata.serverSideParsed = true;
                            entity.metadata.parsedAt = new Date().toISOString();
                            
                            entities[entity.level] = entity;
                            
                            // Сохраняем в кэши
                            if (this._metaParser._cache) {
                                this._metaParser._cache.set(item.url, {
                                    data: entity,
                                    timestamp: Date.now()
                                });
                            }
                            if (this._metaParser._entityCache) {
                                this._metaParser._entityCache.set(entity.level, entity);
                            }
                        } catch (error) {
                            console.warn('Ошибка обработки сущности ' + item.url + ':', error);
                        }
                    }
                });
                
                console.log('✅ Пакетный парсинг завершен: ' + batchResults.filter(r => r.success).length + ' успешно');
                
                // Строим иерархию
                if (this._metaParser.buildEntityHierarchy) {
                    return this._metaParser.buildEntityHierarchy(entities);
                } else {
                    return { entities: entities, hierarchy: null };
                }
            } else {
                throw new Error(result && result.error ? result.error : 'Unknown API error');
            }
        } catch (error) {
            console.error('Пакетный парсинг не удался:', error);
            return null;
        }
    }

    /**
     * Vercel discovery страниц
     */
    async _discoverPageUrlsVercel() {
        try {
            // Пробуем все доступные API endpoints
            // ИСПРАВЛЕНИЕ: используем _VERCEL_CONFIG вместо #VERCEL_CONFIG
            const endpoints = [
                VercelAdapter._VERCEL_CONFIG.apiEndpoints.projectStructure,
                VercelAdapter._VERCEL_CONFIG.apiEndpoints.pages
            ];

            for (const endpoint of endpoints) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);

                    const response = await fetch(endpoint, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    
                    const result = await response.json();
                    
                    let urls = [];
                    
                    if (endpoint.includes('project-structure') && result.success) {
                        // Обрабатываем project-structure формат
                        urls = result.data.pages.map(page => '/' + page.path);
                    } else if (endpoint.includes('pages') && result.pages) {
                        // Обрабатываем pages формат
                        urls = result.pages;
                    }
                    
                    if (urls.length > 0) {
                        console.log('✅ ' + endpoint + ' обнаружено ' + urls.length + ' страниц');
                        return urls;
                    }
                } catch (error) {
                    console.warn('⚠️ ' + endpoint + ' не доступен:', error.message);
                    continue;
                }
            }
            
            throw new Error('Все API endpoints недоступны');
            
        } catch (error) {
            console.warn('Vercel discovery не удался, используем fallback');
            return this._fallbackPageDiscovery();
        }
    }

    /**
     * Резервное обнаружение страниц
     */
    _fallbackPageDiscovery() {
        console.log('🔄 Использование резервного обнаружения страниц...');
        
        // Используем клиентские методы из meta-parser-2
        const originalDiscover = this._originalMethods.get('_discoverPageUrls');
        if (originalDiscover) {
            return originalDiscover.call(this._metaParser);
        }
        
        // Минимальный набор страниц по умолчанию
        console.log('🔄 Использование минимального набора страниц по умолчанию');
        return [
            '/index.html',
            '/pages/index.html',
            '/pages/welcome.html'
        ];
    }

    /**
     * Создание базовой сущности если метод обогащения недоступен
     */
    _createBasicEntity(metaTags, pageUrl) {
        return {
            level: metaTags.level || this._extractLevelFromUrl(pageUrl),
            type: metaTags.type || 'planet',
            title: metaTags.title || 'Untitled',
            description: metaTags.description || '',
            importance: metaTags.importance || 'medium',
            unlocked: metaTags.unlocked !== 'false',
            color: metaTags.color || '#4ECDC4',
            icon: metaTags.icon || '🪐',
            'orbit-radius': metaTags['orbit-radius'] || 150,
            'orbit-angle': metaTags['orbit-angle'] || 0,
            metadata: {
                sourceUrl: pageUrl,
                parsedAt: new Date().toISOString(),
                serverSideParsed: true
            }
        };
    }

    _extractLevelFromUrl(url) {
        const match = url.match(/\/([^\/]+)\.html$/);
        return match ? match[1] : 'unknown';
    }

    /**
     * Определение необходимости server-side парсинга
     */
    _shouldUseServerSideParsing(pageUrl) {
        return pageUrl.includes('/blog/') || 
               pageUrl.includes('/docs/') ||
               (pageUrl && pageUrl.endsWith('/index.html')) ||
               pageUrl.includes('large') ||
               pageUrl.length > 100;
    }

    /**
     * Улучшение SitemapGenerator
     */
    _enhanceSitemapGenerator() {
        const generator = this._sitemapGenerator;

        // Сохраняем оригинальные методы если они существуют
        if (generator._saveUniversalSitemap) {
            this._originalMethods.set('_saveUniversalSitemap', 
                generator._saveUniversalSitemap.bind(generator));
        }
        if (generator._loadExistingSitemap) {
            this._originalMethods.set('_loadExistingSitemap',
                generator._loadExistingSitemap.bind(generator));
        }

        // Monkey-patch методов если они существуют
        if (generator._saveUniversalSitemap) {
            generator._saveUniversalSitemap = this._createVercelSaveSitemap(generator);
        }
        if (generator._loadExistingSitemap) {
            generator._loadExistingSitemap = this._createVercelLoadSitemap(generator);
        }

        // Добавляем Vercel-специфичные методы
        generator._vercelAPIEnabled = this._vercelAPIEnabled;
        generator._saveToVercelAPI = this._saveToVercelAPI.bind(this);

        console.log('🔧 SitemapGenerator улучшен для Vercel');
    }

    /**
     * Vercel-оптимизированное сохранение sitemap
     */
    _createVercelSaveSitemap(generator) {
        const originalSaveUniversalSitemap = this._originalMethods.get('_saveUniversalSitemap');
        const self = this;
        
        return async function() {
            if (!this._currentSitemap) {
                console.warn('⚠️ Нет данных для сохранения sitemap');
                return;
            }

            try {
                // Приоритет 1: Сохранение через Vercel API
                if (this._vercelAPIEnabled) {
                    await this._saveToVercelAPI();
                    console.log('💾 Sitemap сохранен через Vercel API');
                    return;
                }

                // Приоритет 2: Оригинальная логика
                if (originalSaveUniversalSitemap) {
                    await originalSaveUniversalSitemap.call(this);
                } else {
                    console.warn('⚠️ Оригинальный метод сохранения недоступен');
                }

            } catch (error) {
                console.error('❌ Ошибка сохранения sitemap:', error);
                if (this._dispatchUniversalEvent) {
                    this._dispatchUniversalEvent('sitemapSaveError', { 
                        error: error.message,
                        domain: this._currentSitemap ? this._currentSitemap.domain : 'unknown'
                    });
                }
            }
        };
    }

    /**
     * Vercel-оптимизированная загрузка sitemap
     */
    _createVercelLoadSitemap(generator) {
        const originalLoadExistingSitemap = this._originalMethods.get('_loadExistingSitemap');
        const self = this;
        
        return async function() {
            // Приоритет 1: Загрузка через Vercel API
            if (this._vercelAPIEnabled) {
                try {
                    // ИСПРАВЛЕНИЕ: используем _VERCEL_CONFIG вместо #VERCEL_CONFIG
                    const response = await fetch(VercelAdapter._VERCEL_CONFIG.apiEndpoints.sitemap);
                    if (response.ok) {
                        const result = await response.json();
                        if (result && result.success) {
                            this._currentSitemap = result.data;
                            console.log('📁 Загружен sitemap через Vercel API');
                            if (this._checkSitemapFreshness) {
                                await this._checkSitemapFreshness();
                            }
                            return;
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ Не удалось загрузить через Vercel API:', error.message);
                }
            }

            // Приоритет 2: Оригинальная логика
            if (originalLoadExistingSitemap) {
                await originalLoadExistingSitemap.call(this);
            } else {
                console.warn('⚠️ Оригинальный метод загрузки недоступен');
            }
        };
    }

    /**
     * Сохранение sitemap через Vercel API
     */
    async _saveToVercelAPI() {
        try {
            // ИСПРАВЛЕНИЕ: используем _VERCEL_CONFIG вместо #VERCEL_CONFIG
            const response = await fetch(VercelAdapter._VERCEL_CONFIG.apiEndpoints.sitemap, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this._sitemapGenerator._currentSitemap)
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }

            const result = await response.json();
            
            if (result && result.success) {
                console.log('✅ Sitemap сохранен на Vercel: ' + result.path);
                
                if (this._sitemapGenerator._dispatchUniversalEvent) {
                    this._sitemapGenerator._dispatchUniversalEvent('sitemapSaved', {
                        path: result.path,
                        size: JSON.stringify(this._sitemapGenerator._currentSitemap).length,
                        entities: this._sitemapGenerator._currentSitemap && 
                                 this._sitemapGenerator._currentSitemap.entities ? 
                                 Object.keys(this._sitemapGenerator._currentSitemap.entities).length : 0,
                        domain: this._sitemapGenerator._currentSitemap ? 
                               this._sitemapGenerator._currentSitemap.domain : 'unknown',
                        savedTo: 'vercel'
                    });
                }
            } else {
                throw new Error(result && result.error ? result.error : 'Unknown error');
            }

        } catch (error) {
            console.warn('⚠️ Не удалось сохранить через Vercel API:', error.message);
            throw error;
        }
    }

    /**
     * Настройка Vercel-специфичных событий
     */
    _setupVercelEvents() {
        document.addEventListener('vercelApiStatusChange', (event) => {
            console.log('🔄 Vercel API статус: ' + (event.detail.available ? 'доступен' : 'недоступен'));
            this._vercelAPIEnabled = event.detail.available;
            
            // Обновляем статус в парсере и генераторе
            if (this._metaParser) {
                this._metaParser._vercelAPIEnabled = event.detail.available;
            }
            if (this._sitemapGenerator) {
                this._sitemapGenerator._vercelAPIEnabled = event.detail.available;
            }
        });

        document.addEventListener('forceVercelDiscovery', () => {
            console.log('🔄 Принудительное Vercel обнаружение...');
            if (this._metaParser && this._metaParser.parseAllPages) {
                this._metaParser.parseAllPages();
            }
        });

        // Событие для принудительного сохранения sitemap
        document.addEventListener('forceSitemapSave', () => {
            console.log('🔄 Принудительное сохранение sitemap...');
            if (this._sitemapGenerator && this._sitemapGenerator._saveUniversalSitemap) {
                this._sitemapGenerator._saveUniversalSitemap();
            }
        });

        console.log('🔧 Vercel события настроены');
    }

    /**
     * Обработка ошибок API
     */
    _setupAPIErrorHandling() {
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = async function(...args) {
            try {
                const response = await originalFetch.apply(this, args);
                
                // Логируем неудачные запросы к API
                if (args[0] && typeof args[0] === 'string' && 
                    args[0].includes('/api/') && !response.ok) {
                    console.warn('⚠️ API Error: ' + args[0] + ' - ' + response.status);
                    
                    // Обновляем статус endpoint
                    self._apiEndpointsStatus.set(args[0], {
                        available: false,
                        statusCode: response.status,
                        lastChecked: Date.now()
                    });
                }
                
                return response;
            } catch (error) {
                console.error('💥 Fetch Error: ' + args[0], error);
                
                // Обновляем статус endpoint
                if (args[0] && typeof args[0] === 'string' && args[0].includes('/api/')) {
                    self._apiEndpointsStatus.set(args[0], {
                        available: false,
                        error: error.message,
                        lastChecked: Date.now()
                    });
                }
                
                throw error;
            }
        };

        console.log('🔧 Обработка ошибок API настроена');
    }

    /**
     * Получение статуса адаптера
     */
    getStatus() {
        const endpointsStatus = {};
        for (const [endpoint, status] of this._apiEndpointsStatus) {
            endpointsStatus[endpoint] = status;
        }

        return {
            activated: this._vercelAPIEnabled,
            metaParserEnhanced: !!this._originalMethods.get('parseAllPages'),
            sitemapGeneratorEnhanced: !!this._originalMethods.get('_saveUniversalSitemap'),
            vercelAPI: this._vercelAPIEnabled,
            endpoints: VercelAdapter._VERCEL_CONFIG.apiEndpoints,
            endpointsStatus: endpointsStatus,
            environment: VercelEnvironment.getEnvironmentInfo()
        };
    }

    /**
     * Деактивация адаптера (восстановление оригинальных методов)
     */
    deactivate() {
        // Восстанавливаем оригинальные методы
        for (const [methodName, originalMethod] of this._originalMethods) {
            if (methodName.includes('parse') && this._metaParser) {
                this._metaParser[methodName] = originalMethod;
            } else if (this._sitemapGenerator) {
                this._sitemapGenerator[methodName] = originalMethod;
            }
        }

        this._originalMethods.clear();
        console.log('🔧 Vercel Adapter деактивирован');
    }
}

/**
 * Vercel Environment Detector
 */
class VercelEnvironment {
    static isVercel() {
        return window.location.hostname.includes('vercel.app') ||
               window.location.hostname.includes('.now.sh') ||
               (document.querySelector('meta[name="deployment"]') && 
                document.querySelector('meta[name="deployment"]').content === 'vercel') ||
               this._hasVercelHeaders();
    }

    static isLocalDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname === '';
    }

    static shouldUseVercelAPI() {
        // Всегда пробуем использовать API в любом окружении
        // Graceful degradation при недоступности
        return true;
    }

    static _hasVercelHeaders() {
        // Проверяем наличие Vercel-специфичных заголовков
        return document.querySelector('meta[name="vercel"]') !== null;
    }

    static getEnvironmentInfo() {
        return {
            isVercel: this.isVercel(),
            isLocal: this.isLocalDevelopment(),
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            apiAvailable: this.shouldUseVercelAPI(),
            userAgent: navigator.userAgent
        };
    }
}

// Глобальный Vercel Adapter instance
window.VercelAdapter = VercelAdapter;

// Автоматическая активация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Инициализация Vercel Adapter v4.0...');
    
    // Ждем загрузки основных модулей
    const maxWaitTime = VercelAdapter._VERCEL_CONFIG.fallback.maxWaitTime;
    const startTime = Date.now();
    
    while (!window.metaParserInstance || !window.universalSitemapGenerator) {
        if (Date.now() - startTime > maxWaitTime) {
            console.warn('⏰ Таймаут ожидания основных модулей');
            break;
        }
        await new Promise(resolve => setTimeout(resolve, VercelAdapter._VERCEL_CONFIG.fallback.retryDelay));
    }

    // Создаем и активируем адаптер
    window.vercelAdapter = new VercelAdapter();
    
    // Всегда пробуем активировать (graceful degradation)
    try {
        const activated = await window.vercelAdapter.activate();
        
        const envInfo = VercelEnvironment.getEnvironmentInfo();
        console.log('🌐 Окружение:', envInfo);
        
        if (activated) {
            console.log('✅ Vercel Adapter успешно активирован!');
            
            // Запускаем диагностику API
            setTimeout(async () => {
                const apiStatus = await window.VercelMetaParser.testAPIEndpoints();
                console.log('🔍 Статус API endpoints:', apiStatus);
            }, 2000);
            
        } else {
            console.log('ℹ️ Vercel Adapter работает в fallback режиме');
        }
        
        // Отправляем событие о готовности
        document.dispatchEvent(new CustomEvent('vercelAdapterReady', {
            detail: {
                ...window.vercelAdapter.getStatus(),
                environment: envInfo
            }
        }));
        
    } catch (error) {
        console.error('❌ Ошибка активации Vercel Adapter:', error);
        
        // Все равно отправляем событие готовности (в fallback режиме)
        document.dispatchEvent(new CustomEvent('vercelAdapterReady', {
            detail: {
                activated: false,
                error: error.message,
                environment: VercelEnvironment.getEnvironmentInfo(),
                fallback: true
            }
        }));
    }
});

// Публичное API для ручного управления
window.VercelMetaParser = {
    activate: function() { 
        return window.vercelAdapter ? window.vercelAdapter.activate() : Promise.resolve(false); 
    },
    deactivate: function() { 
        return window.vercelAdapter ? window.vercelAdapter.deactivate() : false; 
    },
    getStatus: function() { 
        return window.vercelAdapter ? window.vercelAdapter.getStatus() : { activated: false }; 
    },
    forceRediscovery: function() { 
        document.dispatchEvent(new CustomEvent('forceVercelDiscovery')); 
    },
    isVercel: VercelEnvironment.isVercel,
    
    // Новые методы для диагностики API
    testAPIEndpoints: async function() {
        // ИСПРАВЛЕНИЕ: используем _VERCEL_CONFIG вместо #VERCEL_CONFIG
        const endpoints = Object.values(VercelAdapter._VERCEL_CONFIG.apiEndpoints);
        const results = {};
        
        for (const endpoint of endpoints) {
            try {
                const start = performance.now();
                const response = await fetch(endpoint);
                const time = performance.now() - start;
                
                results[endpoint] = {
                    status: response.status,
                    ok: response.ok,
                    responseTime: Math.round(time),
                    available: response.ok
                };
            } catch (error) {
                results[endpoint] = {
                    status: 'error',
                    ok: false,
                    responseTime: null,
                    available: false,
                    error: error.message
                };
            }
        }
        
        return results;
    },
    
    getEnvironment: function() { 
        return VercelEnvironment.getEnvironmentInfo(); 
    },
    
    // Метод для принудительного сохранения sitemap
    saveSitemap: async function() {
        if (window.universalSitemapGenerator && window.universalSitemapGenerator._saveUniversalSitemap) {
            return await window.universalSitemapGenerator._saveUniversalSitemap();
        }
        return false;
    },

    // Метод для принудительной перезагрузки sitemap
    reloadSitemap: async function() {
        if (window.universalSitemapGenerator && window.universalSitemapGenerator._loadExistingSitemap) {
            return await window.universalSitemapGenerator._loadExistingSitemap();
        }
        return false;
    },

    // Метод для получения информации о проекте
    getProjectInfo: async function() {
        try {
            // ИСПРАВЛЕНИЕ: используем _VERCEL_CONFIG вместо #VERCEL_CONFIG
            const response = await fetch(VercelAdapter._VERCEL_CONFIG.apiEndpoints.projectStructure);
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения информации о проекте:', error);
            return null;
        }
    }
};

console.log('✅ Модуль 4: Vercel Adapter v4.0 загружен');
