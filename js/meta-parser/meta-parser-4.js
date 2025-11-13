// bioapgreid/js/meta-parser/meta-parser-4.js


/**
 * Vercel Adapter для системы Meta-Parser
 * @class VercelAdapter
 */
class VercelAdapter {
    #metaParser;
    #sitemapGenerator;
    #vercelAPIEnabled = false;
    #originalMethods = new Map();

    static #VERCEL_CONFIG = Object.freeze({
        apiEndpoints: {
            projectStructure: '/api/project-structure',
            metaParser: '/api/meta-parser', 
            sitemap: '/api/sitemap'
        },
        batchProcessing: {
            enabled: true,
            threshold: 10,
            timeout: 30000
        }
    });

    constructor() {
        console.log('🔧 Инициализация Vercel Adapter...');
    }

    /**
     * Активация Vercel адаптера
     */
    async activate() {
        if (!this.#checkDependencies()) {
            console.warn('⚠️ Основные модули не загружены, Vercel Adapter отключен');
            return false;
        }

        await this.#checkVercelAPI();
        
        if (this.#vercelAPIEnabled) {
            this.#applyVercelEnhancements();
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
    #checkDependencies() {
        const dependencies = {
            GalaxyMetaParser: window.GalaxyMetaParser,
            metaParserInstance: window.metaParserInstance,
            SitemapGenerator: window.SitemapGenerator,
            universalSitemapGenerator: window.universalSitemapGenerator
        };

        const missing = Object.entries(dependencies)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missing.length > 0) {
            console.warn(`⚠️ Отсутствуют зависимости: ${missing.join(', ')}`);
            return false;
        }

        this.#metaParser = window.metaParserInstance;
        this.#sitemapGenerator = window.universalSitemapGenerator;
        
        return true;
    }

    /**
     * Проверка доступности Vercel API
     */
    async #checkVercelAPI() {
        try {
            const endpoints = Object.values(VercelAdapter.#VERCEL_CONFIG.apiEndpoints);
            const checks = await Promise.allSettled(
                endpoints.map(endpoint => fetch(endpoint, { method: 'HEAD' }))
            );

            this.#vercelAPIEnabled = checks.some(check => 
                check.status === 'fulfilled' && check.value.ok
            );

            if (this.#vercelAPIEnabled) {
                console.log('✅ Vercel API endpoints доступны');
            }
        } catch (error) {
            console.log('ℹ️ Vercel API недоступен');
        }
    }

    /**
     * Применение Vercel улучшений
     */
    #applyVercelEnhancements() {
        this.#enhanceMetaParser();
        this.#enhanceSitemapGenerator();
        this.#setupVercelEvents();
        
        console.log('🔧 Vercel улучшения применены');
    }

    /**
     * Улучшение GalaxyMetaParser
     */
    #enhanceMetaParser() {
        const parser = this.#metaParser;

        // Сохраняем оригинальные методы
        this.#originalMethods.set('parseAllPages', parser.parseAllPages.bind(parser));
        this.#originalMethods.set('parsePageMeta', parser.parsePageMeta.bind(parser));

        // Monkey-patch методов
        parser.parseAllPages = this.#createVercelParseAllPages(parser);
        parser.parsePageMeta = this.#createVercelParsePageMeta(parser);

        // Добавляем Vercel-специфичные методы
        parser._vercelAPIEnabled = this.#vercelAPIEnabled;
        parser._batchParseVercel = this.#batchParseVercel.bind(this);
        parser._discoverPageUrlsVercel = this.#discoverPageUrlsVercel.bind(this);

        console.log('🔧 GalaxyMetaParser улучшен для Vercel');
    }

    /**
     * Vercel-оптимизированный parseAllPages
     */
    #createVercelParseAllPages(parser) {
        return async function(pageUrls = null) {
            // Используем Vercel discovery если доступно
            const urls = pageUrls || (this._vercelAPIEnabled ? 
                await this._discoverPageUrlsVercel() : 
                await this.#discoverPageUrls() // Оригинальный метод
            );

            // Используем batch парсинг для больших наборов
            if (this._vercelAPIEnabled && urls.length > 10) {
                const result = await this._batchParseVercel(urls);
                if (result) return result;
            }

            // Fallback на оригинальный метод
            return this.#originalMethods.get('parseAllPages')(urls);
        }.bind(parser);
    }

    /**
     * Vercel-оптимизированный parsePageMeta
     */
    #createVercelParsePageMeta(parser) {
        return async function(pageUrl) {
            // Для тяжелых страниц используем server-side парсинг
            if (this._vercelAPIEnabled && this.#shouldUseServerSideParsing(pageUrl)) {
                try {
                    const response = await fetch(
                        `${VercelAdapter.#VERCEL_CONFIG.apiEndpoints.metaParser}?url=${encodeURIComponent(pageUrl)}`
                    );
                    const result = await response.json();
                    
                    if (result.success) {
                        console.log(`✅ Server-side парсинг: ${pageUrl}`);
                        
                        // Трансформируем результат в формат системы
                        const entity = this.#enrichEntityData(result.meta, pageUrl);
                        entity.metadata.serverSideParsed = true;
                        
                        // Сохраняем в кэш
                        this.#cache.set(pageUrl, {
                            data: entity,
                            timestamp: Date.now()
                        });
                        
                        return entity;
                    }
                } catch (error) {
                    console.warn(`Server-side парсинг не удался для ${pageUrl}`);
                }
            }

            // Fallback на оригинальный метод
            return this.#originalMethods.get('parsePageMeta')(pageUrl);
        }.bind(parser);
    }

    /**
     * Пакетный парсинг через Vercel API
     */
    async #batchParseVercel(urls) {
        console.log(`🔄 Пакетный парсинг ${urls.length} страниц через Vercel API...`);
        
        try {
            const response = await fetch(VercelAdapter.#VERCEL_CONFIG.apiEndpoints.metaParser, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const entities = {};
                
                result.results.forEach(item => {
                    if (item.success) {
                        const entity = this.#metaParser.#enrichEntityData(item.meta, item.url);
                        entity.metadata.serverSideParsed = true;
                        entities[entity.level] = entity;
                        
                        // Сохраняем в кэши
                        this.#metaParser.#cache.set(item.url, {
                            data: entity,
                            timestamp: Date.now()
                        });
                        this.#metaParser.#entityCache.set(entity.level, entity);
                    }
                });
                
                console.log(`✅ Пакетный парсинг завершен: ${result.batch.successful} успешно`);
                return this.#metaParser.buildEntityHierarchy(entities);
            }
        } catch (error) {
            console.error('Пакетный парсинг не удался:', error);
        }
        
        return null;
    }

    /**
     * Vercel discovery страниц
     */
    async #discoverPageUrlsVercel() {
        try {
            const response = await fetch(VercelAdapter.#VERCEL_CONFIG.apiEndpoints.projectStructure);
            const { data, success } = await response.json();
            
            if (success && data.pages) {
                const urls = data.pages.map(page => `/${page.path}`);
                console.log(`✅ Vercel обнаружено ${urls.length} страниц`);
                return urls;
            }
        } catch (error) {
            console.warn('Vercel discovery не удался');
        }
        
        return null;
    }

    /**
     * Определение необходимости server-side парсинга
     */
    #shouldUseServerSideParsing(pageUrl) {
        return pageUrl.includes('/blog/') || 
               pageUrl.includes('/docs/') ||
               pageUrl.endsWith('/index.html') ||
               pageUrl.includes('large');
    }

    /**
     * Улучшение SitemapGenerator
     */
    #enhanceSitemapGenerator() {
        const generator = this.#sitemapGenerator;

        // Сохраняем оригинальные методы
        this.#originalMethods.set('saveUniversalSitemap', 
            generator.#saveUniversalSitemap.bind(generator));
        this.#originalMethods.set('loadExistingSitemap',
            generator.#loadExistingSitemap.bind(generator));

        // Monkey-patch методов
        generator.#saveUniversalSitemap = this.#createVercelSaveSitemap(generator);
        generator.#loadExistingSitemap = this.#createVercelLoadSitemap(generator);

        // Добавляем Vercel-специфичные методы
        generator._vercelAPIEnabled = this.#vercelAPIEnabled;
        generator._saveToVercelAPI = this.#saveToVercelAPI.bind(this);

        console.log('🔧 SitemapGenerator улучшен для Vercel');
    }

    /**
     * Vercel-оптимизированное сохранение sitemap
     */
    #createVercelSaveSitemap(generator) {
        return async function() {
            if (!this.#currentSitemap) {
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
                await this.#saveToUniversalStorage();
                await this.#downloadAsUniversalFile();
                
                console.log('💾 Sitemap сохранен в localStorage и скачан');

            } catch (error) {
                console.error('❌ Ошибка сохранения sitemap:', error);
                this.#dispatchUniversalEvent('sitemapSaveError', { 
                    error: error.message,
                    domain: this.#currentSitemap?.domain 
                });
            }
        }.bind(generator);
    }

    /**
     * Vercel-оптимизированная загрузка sitemap
     */
    #createVercelLoadSitemap(generator) {
        return async function() {
            // Приоритет 1: Загрузка через Vercel API
            if (this._vercelAPIEnabled) {
                try {
                    const response = await fetch(VercelAdapter.#VERCEL_CONFIG.apiEndpoints.sitemap);
                    if (response.ok) {
                        this.#currentSitemap = await response.json();
                        console.log(`📁 Загружен sitemap через Vercel API`);
                        await this.#checkSitemapFreshness();
                        return;
                    }
                } catch (error) {
                    console.warn('⚠️ Не удалось загрузить через Vercel API:', error.message);
                }
            }

            // Приоритет 2: Оригинальная логика
            const possiblePaths = [
                this.#config.sitemapPath,
                '/data/sitemap.json',
                '/sitemap.json',
                '/api/sitemap',
                `/${window.location.hostname}/sitemap.json`,
                '/galaxy/sitemap.json'
            ];

            for (const path of possiblePaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        this.#currentSitemap = await response.json();
                        console.log(`📁 Загружен sitemap из ${path}`);
                        await this.#checkSitemapFreshness();
                        return;
                    }
                } catch (error) {
                    continue;
                }
            }

            // Приоритет 3: Создание нового
            console.log('📝 Sitemap не найден, создаем новый');
            await this.#createInitialSitemap();
        }.bind(generator);
    }

    /**
     * Сохранение sitemap через Vercel API
     */
    async #saveToVercelAPI() {
        try {
            const response = await fetch(VercelAdapter.#VERCEL_CONFIG.apiEndpoints.sitemap, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.#sitemapGenerator.#currentSitemap)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Sitemap сохранен на Vercel: ${result.path}`);
                
                this.#sitemapGenerator.#dispatchUniversalEvent('sitemapSaved', {
                    path: result.path,
                    size: JSON.stringify(this.#sitemapGenerator.#currentSitemap).length,
                    entities: Object.keys(this.#sitemapGenerator.#currentSitemap.entities).length,
                    domain: this.#sitemapGenerator.#currentSitemap.domain,
                    savedTo: 'vercel'
                });
            } else {
                throw new Error(result.error || 'Unknown error');
            }

        } catch (error) {
            console.warn('⚠️ Не удалось сохранить через Vercel API:', error.message);
            throw error;
        }
    }

    /**
     * Настройка Vercel-специфичных событий
     */
    #setupVercelEvents() {
        document.addEventListener('vercelApiStatusChange', (event) => {
            console.log(`🔄 Vercel API статус: ${event.detail.available ? 'доступен' : 'недоступен'}`);
            this.#vercelAPIEnabled = event.detail.available;
        });

        document.addEventListener('forceVercelDiscovery', () => {
            console.log('🔄 Принудительное Vercel обнаружение...');
            this.#metaParser.parseAllPages();
        });

        console.log('🔧 Vercel события настроены');
    }

    /**
     * Получение статуса адаптера
     */
    getStatus() {
        return {
            activated: this.#vercelAPIEnabled,
            metaParserEnhanced: !!this.#originalMethods.get('parseAllPages'),
            sitemapGeneratorEnhanced: !!this.#originalMethods.get('saveUniversalSitemap'),
            vercelAPI: this.#vercelAPIEnabled,
            endpoints: VercelAdapter.#VERCEL_CONFIG.apiEndpoints
        };
    }

    /**
     * Деактивация адаптера (восстановление оригинальных методов)
     */
    deactivate() {
        // Восстанавливаем оригинальные методы
        for (const [methodName, originalMethod] of this.#originalMethods) {
            if (methodName.includes('parse')) {
                this.#metaParser[methodName] = originalMethod;
            } else {
                this.#sitemapGenerator[methodName] = originalMethod;
            }
        }

        this.#originalMethods.clear();
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
               document.querySelector('meta[name="deployment"]')?.content === 'vercel';
    }

    static isLocalDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1';
    }

    static shouldUseVercelAPI() {
        return this.isVercel() || this.isLocalDevelopment();
    }
}

// Глобальный Vercel Adapter instance
window.VercelAdapter = VercelAdapter;

// Автоматическая активация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    // Ждем загрузки основных модулей
    if (!window.metaParserInstance || !window.universalSitemapGenerator) {
        console.log('⏳ Ожидание загрузки основных модулей...');
        setTimeout(() => window.vercelAdapter?.activate(), 1000);
        return;
    }

    // Создаем и активируем адаптер
    window.vercelAdapter = new VercelAdapter();
    
    if (VercelEnvironment.shouldUseVercelAPI()) {
        const activated = await window.vercelAdapter.activate();
        
        if (activated) {
            console.log('🚀 Vercel Adapter успешно активирован!');
            
            // Отправляем событие о готовности
            document.dispatchEvent(new CustomEvent('vercelAdapterReady', {
                detail: window.vercelAdapter.getStatus()
            }));
        }
    } else {
        console.log('🌐 Vercel Adapter не активирован (не Vercel окружение)');
    }
});

// Публичное API для ручного управления
window.VercelMetaParser = {
    activate: () => window.vercelAdapter?.activate(),
    deactivate: () => window.vercelAdapter?.deactivate(),
    getStatus: () => window.vercelAdapter?.getStatus(),
    forceRediscovery: () => document.dispatchEvent(new CustomEvent('forceVercelDiscovery')),
    isVercel: VercelEnvironment.isVercel
};

console.log('✅ Модуль 4: Vercel Adapter загружен');
