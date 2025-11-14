class SitemapGenerator {
    #metaParser;
    #currentSitemap = null;
    #versionHistory = [];
    #config = {
        sitemapPath: '/data/sitemap.json',
        autoSave: true,
        localStorageKey: 'galaxy_sitemap_backup',
        versioning: {
            enabled: true,
            maxVersions: 10,
            keepBackups: true
        },
        export: {
            formats: ['json', 'csv', 'yaml'],
            includeMetadata: true,
            prettyPrint: true
        },
        universal: {
            autoDetectStructure: true,
            createIfMissing: true,
            adaptiveNaming: true,
            crossDomainSupport: true
        }
    };
    #stats = {
        generations: 0,
        lastGeneration: null,
        totalEntities: 0,
        versionsCount: 0,
        backupSize: 0,
        domainsProcessed: new Set(),
        saveAttempts: 0,
        successfulSaves: 0
    };

    // Vercel интеграция
    #vercelAPIEnabled = false;
    #vercelEndpoints = {
        projectStructure: '/api/project-structure',
        metaParser: '/api/meta-parser', 
        sitemap: '/api/sitemap'
    };

    // Debounce для авто-регенерации
    #debouncedRegenerate = this.#debounce(() => {
        this.regenerateSitemap();
    }, 3000);

    constructor(metaParser) {
        this.#metaParser = metaParser;
        console.log('🗺️ Универсальный SitemapGenerator с Vercel поддержкой инициализирован');
    }

    async init() {
        console.log('🌐 Универсальная инициализация SitemapGenerator с Vercel...');
        
        try {
            await this.#checkVercelAPI();
            await this.#loadExistingSitemap();
            this.#setupUniversalEventListeners();
            this.#setupAutoBackup();
            this.#setupCrossDomainSupport();
            this.#setupAutoSave();
            this.#autoRegenerateOnChanges();
            
            console.log('✅ Универсальный SitemapGenerator с Vercel готов к работе');
        } catch (error) {
            console.error('❌ Ошибка инициализации универсального SitemapGenerator:', error);
            throw error;
        }
    }

    /**
     * Авто-регенерация при изменениях в реальном времени
     */
    async #autoRegenerateOnChanges() {
        // Мониторинг изменений в реальном времени
        if (typeof window !== 'undefined') {
            // Слушаем события навигации
            window.addEventListener('hashchange', this.#debouncedRegenerate);
            window.addEventListener('popstate', this.#debouncedRegenerate);
            
            // Слушаем сообщения от других вкладок
            window.addEventListener('storage', (event) => {
                if (event.key === 'galaxy-sitemap-update') {
                    this.regenerateSitemap();
                }
            });

            console.log('🔄 Авто-регенерация sitemap при изменениях настроена');
        }
    }

    /**
     * Debounce функция для предотвращения частых вызовов
     */
    #debounce(func, wait) {
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

    /**
     * Проверка доступности Vercel API
     */
    async #checkVercelAPI() {
        try {
            const endpoints = Object.values(this.#vercelEndpoints);
            const checks = await Promise.allSettled(
                endpoints.map(endpoint => 
                    new Promise((resolve, reject) => {
                        fetch(endpoint, { method: 'HEAD' })
                            .then(response => resolve(response))
                            .catch(error => reject(error))
                    })
                )
            );

            this.#vercelAPIEnabled = checks.some(check => 
                check.status === 'fulfilled' && check.value.ok
            );

            if (this.#vercelAPIEnabled) {
                console.log('✅ Vercel API endpoints доступны');
            } else {
                console.log('ℹ️ Vercel API недоступен, работаем в стандартном режиме');
            }
        } catch (error) {
            console.log('ℹ️ Vercel API недоступен');
            this.#vercelAPIEnabled = false;
        }
    }

    /**
     * Универсальная загрузка существующего sitemap с Vercel приоритетом
     */
    async #loadExistingSitemap() {
        // Приоритет 1: Vercel API
        if (this.#vercelAPIEnabled) {
            try {
                const response = await fetch(this.#vercelEndpoints.sitemap);
                if (response.ok) {
                    const result = await response.json();
                    if (result && result.success && result.data) {
                        this.#currentSitemap = result.data;
                        console.log('📁 Загружен sitemap через Vercel API (версия ' + (this.#currentSitemap.version || 'unknown') + ')');
                        await this.#checkSitemapFreshness();
                        return;
                    }
                }
            } catch (error) {
                console.warn('⚠️ Не удалось загрузить через Vercel API:', error.message);
            }
        }

        // Приоритет 2: Стандартные пути
        const possiblePaths = [
            this.#config.sitemapPath,
            '/data/sitemap.json',
            '/sitemap.json',
            '/api/sitemap',
            '/' + window.location.hostname + '/sitemap.json',
            '/galaxy/sitemap.json'
        ];

        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    this.#currentSitemap = await response.json();
                    this.#stats.domainsProcessed.add(window.location.hostname);
                    
                    console.log('📁 Загружен sitemap из ' + path + ' (версия ' + (this.#currentSitemap.version || 'unknown') + ')');
                    await this.#checkSitemapFreshness();
                    return;
                }
            } catch (error) {
                continue;
            }
        }

        // Приоритет 3: Создание нового
        console.log('📝 Существующий sitemap не найден, будет создан новый универсальный');
        await this.#createInitialSitemap();
    }

    /**
     * Создание начального sitemap для новой галактики
     */
    async #createInitialSitemap() {
        const domain = window.location.hostname;
        const basePath = this.#detectBasePath();

        this.#currentSitemap = {
            version: "3.0",
            generated: new Date().toISOString(),
            generator: "UniversalGalaxyMetaParser v3.0",
            domain: domain,
            basePath: basePath,
            checksum: this.#generateChecksum({}),

            entities: {},
            hierarchy: {
                roots: [],
                stats: {
                    total: 0,
                    roots: 0,
                    orphans: 0,
                    maxDepth: 0,
                    totalDescendants: 0,
                    byType: {}
                },
                relationshipChains: {}
            },

            statistics: {
                totalEntities: 0,
                byType: {},
                byImportance: { high: 0, medium: 0, low: 0 },
                maxDepth: 0,
                generationTime: 0
            },

            integration: {
                compatibleWith: [
                    "UniversalGalaxyBuilder v3.0", 
                    "ContentManager v3.0", 
                    "AdaptivePositioning v3.0",
                    "CrossDomainNavigator v3.0"
                ],
                requiredFields: ['level', 'type', 'title'],
                entityTypes: this.#getUniversalEntityTypes(),
                supportedDomains: ['*'],
                crossOrigin: true,
                vercelEnabled: this.#vercelAPIEnabled
            }
        };

        console.log('🚀 Создан начальный универсальный sitemap для домена ' + domain);
    }

    /**
     * Автоматическое определение базового пути
     */
    #detectBasePath() {
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') return '';

        const parts = path.split('/').filter(Boolean);
        if (parts.length > 0 && !parts[0].includes('.')) {
            return '/' + parts[0];
        }

        return '';
    }

    #setupUniversalEventListeners() {
        const universalEvents = [
            ['metaParsingCompleted', (event) => this.#generateFromUniversalMetaData(event.detail)],
            ['forceSitemapRegeneration', () => this.#forceUniversalRegeneration()],
            ['exportSitemapRequest', (event) => this.#exportSitemap(event.detail.format, event.detail.options)],
            ['backupSitemapRequest', () => this.#createBackup()],
            ['restoreSitemapRequest', () => this.#restoreFromBackup()],
            ['pagesDirectoryChanged', (event) => this.#handleUniversalPagesUpdate(event.detail)],
            ['domainChanged', (event) => this.#handleDomainChange(event.detail)],
            ['vercelApiStatusChange', (event) => this.#handleVercelStatusChange(event.detail)],
            ['forceSitemapSave', () => this.#saveUniversalSitemap()]
        ];

        universalEvents.forEach(([eventName, handler]) => {
            document.addEventListener(eventName, handler);
        });
    }

    #setupCrossDomainSupport() {
        window.addEventListener('storage', (event) => {
            if (event.key === this.#config.localStorageKey && event.newValue) {
                this.#handleCrossDomainUpdate(event.newValue);
            }
        });
    }

    #setupAutoBackup() {
        setInterval(() => {
            this.#createBackup();
        }, 30 * 60 * 1000); // Каждые 30 минут
    }

    #setupAutoSave() {
        // Автосохранение при завершении парсинга
        document.addEventListener('metaParsingCompleted', () => {
            setTimeout(() => this.#saveUniversalSitemap(), 3000);
        });

        // Автосохранение при обновлении сущностей
        document.addEventListener('entityMetadataUpdated', () => {
            setTimeout(() => this.#saveUniversalSitemap(), 1000);
        });

        console.log('🔧 Автосохранение sitemap настроено');
    }

    async #generateFromUniversalMetaData(metaData) {
        const startTime = performance.now();
        
        try {
            const entities = metaData.entities;
            const hierarchy = metaData.hierarchy;
            const stats = metaData.stats;
            
            console.log('🏗️ Универсальная генерация sitemap из ' + Object.keys(entities).length + ' сущностей...');

            const domain = window.location.hostname;
            this.#stats.domainsProcessed.add(domain);

            const sitemap = {
                version: "3.0",
                generated: new Date().toISOString(),
                generator: "UniversalGalaxyMetaParser v3.0",
                domain: domain,
                basePath: this.#detectBasePath(),
                checksum: this.#generateChecksum(entities),

                entities: this.#transformUniversalEntities(entities),
                
                hierarchy: {
                    roots: hierarchy.roots ? hierarchy.roots.map(root => this.#serializeUniversalNode(root)) : [],
                    stats: hierarchy.stats || {},
                    relationshipChains: hierarchy.relationshipChains || {}
                },

                statistics: {
                    totalEntities: Object.keys(entities).length,
                    byType: this.#calculateUniversalTypeDistribution(entities),
                    byImportance: this.#calculateUniversalImportanceDistribution(entities),
                    maxDepth: hierarchy.stats ? hierarchy.stats.maxDepth : 0,
                    generationTime: 0,
                    domains: Array.from(this.#stats.domainsProcessed)
                },

                integration: {
                    compatibleWith: [
                        "UniversalGalaxyBuilder v3.0", 
                        "ContentManager v3.0", 
                        "AdaptivePositioning v3.0",
                        "CrossDomainNavigator v3.0"
                    ],
                    requiredFields: ['level', 'type', 'title'],
                    entityTypes: this.#getUniversalEntityTypes(),
                    supportedDomains: ['*'],
                    crossOrigin: true,
                    apiVersion: '3.0',
                    vercelEnabled: this.#vercelAPIEnabled
                }
            };

            sitemap.statistics.generationTime = performance.now() - startTime;

            await this.#validateUniversalSitemap(sitemap);

            await this.#saveVersion(sitemap);

            this.#currentSitemap = sitemap;

            if (this.#config.autoSave) {
                setTimeout(() => this.#saveUniversalSitemap(), 1000);
            }

            this.#stats.generations++;
            this.#stats.lastGeneration = new Date().toISOString();
            this.#stats.totalEntities = Object.keys(entities).length;

            console.log('✅ Универсальный sitemap сгенерирован: ' + Object.keys(entities).length + ' сущностей, ' + (hierarchy.stats ? hierarchy.stats.maxDepth : 0) + ' уровней');

            this.#dispatchUniversalEvent('sitemapGenerated', {
                sitemap: sitemap,
                stats: this.#stats,
                generationTime: sitemap.statistics.generationTime,
                domain: domain,
                vercelEnabled: this.#vercelAPIEnabled
            });

            return sitemap;

        } catch (error) {
            console.error('💥 Ошибка универсальной генерации sitemap:', error);
            this.#dispatchUniversalEvent('sitemapGenerationError', {
                error: error.message,
                metaData: metaData,
                domain: window.location.hostname
            });
            throw error;
        }
    }

    /**
     * Универсальное преобразование сущностей
     */
    #transformUniversalEntities(entities) {
        const transformed = {};
        const domain = window.location.hostname;
        
        Object.entries(entities).forEach(([level, entity]) => {
            transformed[level] = {
                level: entity.level,
                type: entity.type,
                title: entity.title,
                
                metadata: {
                    importance: entity.importance || 'medium',
                    unlocked: entity.unlocked !== false,
                    color: entity.color,
                    icon: entity.icon,
                    description: entity.description,
                    tags: entity.tags || [],
                    contentPriority: entity['content-priority'] || 'medium',
                    analyticsCategory: entity['analytics-category'] || 'general',
                    domain: domain,
                    crossDomainId: this.#generateCrossDomainId(entity.level, domain)
                },

                positioning: {
                    orbitRadius: entity['orbit-radius'] || 100,
                    orbitAngle: entity['orbit-angle'] || 0,
                    sizeModifier: entity['size-modifier'] || 1.0,
                    adaptive: true
                },

                hierarchy: {
                    parent: entity.parent || null,
                    depth: entity.metadata && entity.metadata.depth ? entity.metadata.depth : 0,
                    childCount: entity.metadata && entity.metadata.childCount ? entity.metadata.childCount : 0,
                    siblingIndex: entity.metadata && entity.metadata.siblingIndex ? entity.metadata.siblingIndex : 0,
                    isRoot: !entity.parent,
                    crossDomainParent: entity.metadata && entity.metadata.crossDomainParent
                },

                timestamps: {
                    created: entity.created || (entity.metadata && entity.metadata.parsedAt),
                    updated: entity.updated || (entity.metadata && entity.metadata.parsedAt),
                    parsedAt: entity.metadata && entity.metadata.parsedAt,
                    domainAdded: new Date().toISOString()
                },

                analytics: {
                    ...entity.analytics,
                    domain: domain,
                    accessCount: 0,
                    lastAccess: null,
                    crossDomainAccess: []
                },

                compatibility: {
                    version: '3.0',
                    source: entity.metadata && entity.metadata.sourceUrl,
                    domain: domain,
                    universal: true,
                    vercelCompatible: this.#vercelAPIEnabled
                }
            };
        });

        return transformed;
    }

    /**
     * Генерация кросс-доменного ID
     */
    #generateCrossDomainId(level, domain) {
        return domain + '::' + level;
    }

    #serializeUniversalNode(node) {
        if (!node) return null;

        return {
            level: node.level,
            type: node.type,
            title: node.title,
            metadata: {
                depth: node.metadata ? node.metadata.depth : 0,
                isRoot: node.metadata ? node.metadata.isRoot : false,
                childCount: node.metadata ? node.metadata.childCount : 0,
                totalDescendants: node.metadata ? node.metadata.totalDescendants : 0,
                relationshipChain: node.metadata ? node.metadata.relationshipChain : null,
                crossDomainId: node.metadata ? node.metadata.crossDomainId : null
            },
            children: node.children ? node.children.map(child => this.#serializeUniversalNode(child)) : []
        };
    }

    #calculateUniversalTypeDistribution(entities) {
        const distribution = {};
        Object.values(entities).forEach(entity => {
            distribution[entity.type] = (distribution[entity.type] || 0) + 1;
        });
        return distribution;
    }

    #calculateUniversalImportanceDistribution(entities) {
        const distribution = { high: 0, medium: 0, low: 0 };
        Object.values(entities).forEach(entity => {
            const importance = entity.importance || 'medium';
            distribution[importance] = (distribution[importance] || 0) + 1;
        });
        return distribution;
    }

    #getUniversalEntityTypes() {
        return [
            { type: 'galaxy', name: 'Звезда', description: 'Ключевые категории любой галактики', universal: true },
            { type: 'planet', name: 'Планета', description: 'Основные разделы галактики', universal: true },
            { type: 'moon', name: 'Спутник', description: 'Подразделы планет', universal: true },
            { type: 'asteroid', name: 'Астероид', description: 'Второстепенные разделы', universal: true },
            { type: 'debris', name: 'Космический мусор', description: 'Вспомогательные страницы', universal: true },
            { type: 'blackhole', name: 'Черная дыра', description: 'Специальные разделы', universal: true },
            { type: 'nebula', name: 'Туманность', description: 'Группы разделов', universal: true },
            { type: 'station', name: 'Станция', description: 'Интерактивные элементы', universal: true },
            { type: 'gateway', name: 'Шлюз', description: 'Навигационные элементы', universal: true },
            { type: 'anomaly', name: 'Аномалия', description: 'Особые страницы', universal: true }
        ];
    }

    #generateChecksum(entities) {
        const dataString = JSON.stringify(entities);
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    async #validateUniversalSitemap(sitemap) {
        const errors = [];

        if (!sitemap.version) errors.push('Отсутствует версия');
        if (!sitemap.generated) errors.push('Отсутствует timestamp генерации');
        if (!sitemap.entities) errors.push('Отсутствуют entities');
        if (!sitemap.hierarchy) errors.push('Отсутствует hierarchy');
        if (!sitemap.domain) errors.push('Отсутствует информация о домене');

        if (sitemap.entities) {
            Object.entries(sitemap.entities).forEach(([level, entity]) => {
                if (!entity.level) errors.push('Сущность без level: ' + level);
                if (!entity.type) errors.push('Сущность без type: ' + level);
                if (!entity.title) errors.push('Сущность без title: ' + level);
                
                if (!entity.metadata.crossDomainId) {
                    errors.push('Отсутствует crossDomainId для: ' + level);
                }
            });
        }

        const currentChecksum = this.#generateChecksum(sitemap.entities);
        if (sitemap.checksum !== currentChecksum) {
            errors.push('Checksum не совпадает - возможна corruption данных');
        }

        if (errors.length > 0) {
            throw new Error('Ошибки валидации универсального sitemap: ' + errors.join(', '));
        }

        console.log('✅ Универсальный sitemap прошел валидацию');
    }

    /**
     * Сохранение sitemap в файл /data/sitemap.json
     */
    async saveToDataFile() {
        if (!this.#currentSitemap) {
            console.warn('⚠️ Нет данных для сохранения в файл');
            return false;
        }

        this.#stats.saveAttempts++;

        try {
            // Приоритет 1: Сохранение через Vercel API
            if (this.#vercelAPIEnabled) {
                const success = await this.#saveToVercelAPI();
                if (success) {
                    this.#stats.successfulSaves++;
                    return true;
                }
            }

            // Приоритет 2: Прямое сохранение через fetch
            const success = await this.#saveViaFetch();
            if (success) {
                this.#stats.successfulSaves++;
                return true;
            }

            // Приоритет 3: Скачивание файла
            console.warn('⚠️ Прямое сохранение не удалось, предлагаем скачать файл');
            this.#downloadSitemapFile();
            return false;

        } catch (error) {
            console.error('❌ Ошибка сохранения в файл:', error);
            return false;
        }
    }

    /**
     * Сохранение через Vercel API
     */
    async #saveToVercelAPI() {
        try {
            const response = await fetch(this.#vercelEndpoints.sitemap, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.#currentSitemap)
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }

            const result = await response.json();
            
            if (result && result.success) {
                console.log('✅ Sitemap сохранен на Vercel: ' + result.path);
                return true;
            } else {
                throw new Error(result && result.error ? result.error : 'Unknown error');
            }

        } catch (error) {
            console.warn('⚠️ Не удалось сохранить через Vercel API:', error.message);
            return false;
        }
    }

    /**
     * Сохранение через прямой fetch запрос
     */
    async #saveViaFetch() {
        try {
            // Пробуем разные методы сохранения
            const methods = [
                () => fetch(this.#config.sitemapPath, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.#currentSitemap, null, 2)
                }),
                () => fetch('/api/sitemap/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sitemap: this.#currentSitemap,
                        path: this.#config.sitemapPath
                    })
                })
            ];

            for (const method of methods) {
                try {
                    const response = await method();
                    if (response.ok) {
                        console.log('✅ Sitemap сохранен напрямую');
                        return true;
                    }
                } catch (error) {
                    continue;
                }
            }

            throw new Error('Все методы прямого сохранения не удались');

        } catch (error) {
            console.warn('⚠️ Прямое сохранение не удалось:', error.message);
            return false;
        }
    }

    /**
     * Скачивание sitemap файла
     */
    #downloadSitemapFile() {
        try {
            const sitemapData = JSON.stringify(this.#currentSitemap, null, 2);
            const blob = new Blob([sitemapData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = 'sitemap.json';
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            console.log('📥 Sitemap скачан, сохраните в /data/sitemap.json');
            
        } catch (error) {
            console.error('❌ Ошибка скачивания sitemap:', error);
        }
    }

    async #saveUniversalSitemap() {
        if (!this.#currentSitemap) {
            console.warn('⚠️ Нет данных для сохранения универсального sitemap');
            return;
        }

        try {
            // Сохраняем в файл
            const fileSaved = await this.saveToDataFile();

            // Сохраняем в localStorage как backup
            await this.#saveToUniversalStorage();

            if (fileSaved) {
                console.log('💾 Универсальный sitemap сохранен');

                this.#dispatchUniversalEvent('sitemapSaved', {
                    path: this.#config.sitemapPath,
                    size: JSON.stringify(this.#currentSitemap).length,
                    entities: Object.keys(this.#currentSitemap.entities).length,
                    domain: this.#currentSitemap.domain,
                    savedTo: this.#vercelAPIEnabled ? 'vercel' : 'local',
                    fileSaved: fileSaved
                });
            }

        } catch (error) {
            console.error('❌ Ошибка сохранения универсального sitemap:', error);
            this.#dispatchUniversalEvent('sitemapSaveError', { 
                error: error.message,
                domain: this.#currentSitemap ? this.#currentSitemap.domain : 'unknown' 
            });
        }
    }

    async #saveToUniversalStorage() {
        try {
            const domain = this.#currentSitemap.domain;
            const storageKey = this.#config.localStorageKey + '_' + domain;
            
            const data = {
                sitemap: this.#currentSitemap,
                timestamp: Date.now(),
                version: '3.0',
                domain: domain
            };

            localStorage.setItem(storageKey, JSON.stringify(data));
            this.#stats.backupSize = JSON.stringify(data).length;

            console.log('📦 Универсальный sitemap сохранен в localStorage для домена ' + domain);
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить в localStorage:', error.message);
        }
    }

    async #saveVersion(sitemap) {
        if (!this.#config.versioning.enabled) return;

        const version = {
            data: JSON.parse(JSON.stringify(sitemap)),
            timestamp: Date.now(),
            version: sitemap.version,
            checksum: sitemap.checksum,
            domain: sitemap.domain
        };

        this.#versionHistory.unshift(version);

        if (this.#versionHistory.length > this.#config.versioning.maxVersions) {
            this.#versionHistory = this.#versionHistory.slice(0, this.#config.versioning.maxVersions);
        }

        this.#stats.versionsCount = this.#versionHistory.length;

        this.#dispatchUniversalEvent('sitemapVersionCreated', {
            version: version,
            totalVersions: this.#versionHistory.length,
            domain: sitemap.domain
        });

        console.log('🕰️ Сохранена версия универсального sitemap #' + this.#versionHistory.length + ' для ' + sitemap.domain);
    }

    async #restoreFromBackup() {
        try {
            const domain = window.location.hostname;
            const storageKey = this.#config.localStorageKey + '_' + domain;
            const backupData = localStorage.getItem(storageKey);
            
            if (!backupData) {
                console.warn('⚠️ Backup не найден в localStorage для домена ' + domain);
                return false;
            }

            const backup = JSON.parse(backupData);
            
            if (!backup.sitemap || !backup.timestamp) {
                throw new Error('Невалидный backup данные');
            }

            this.#currentSitemap = backup.sitemap;
            console.log('🔙 Универсальный sitemap восстановлен из backup для ' + domain);

            this.#dispatchUniversalEvent('backupRestored', {
                timestamp: backup.timestamp,
                entities: Object.keys(backup.sitemap.entities).length,
                domain: domain
            });

            return true;

        } catch (error) {
            console.error('❌ Ошибка восстановления из backup:', error);
            return false;
        }
    }

    async #createBackup() {
        if (!this.#currentSitemap) return;

        await this.#saveToUniversalStorage();
        console.log('💾 Универсальный backup создан');

        this.#dispatchUniversalEvent('backupCreated', {
            timestamp: Date.now(),
            size: this.#stats.backupSize,
            domain: this.#currentSitemap.domain
        });
    }

    async #exportSitemap(format, options) {
        if (!this.#currentSitemap) {
            throw new Error('Нет данных универсального sitemap для экспорта');
        }

        try {
            let exportedData;

            switch (format.toLowerCase()) {
                case 'json':
                    exportedData = this.#exportAsUniversalJSON(options);
                    break;
                case 'csv':
                    exportedData = this.#exportAsUniversalCSV(options);
                    break;
                case 'yaml':
                    exportedData = this.#exportAsUniversalYAML(options);
                    break;
                case 'xml':
                    exportedData = this.#exportAsUniversalXML(options);
                    break;
                default:
                    throw new Error('Неподдерживаемый формат: ' + format);
            }

            this.#dispatchUniversalEvent('exportReady', {
                format: format,
                data: exportedData,
                size: exportedData.length,
                entities: Object.keys(this.#currentSitemap.entities).length,
                domain: this.#currentSitemap.domain
            });

            return exportedData;

        } catch (error) {
            console.error('❌ Ошибка экспорта в ' + format + ':', error);
            throw error;
        }
    }

    #exportAsUniversalJSON(options) {
        const data = options && options.includeMetadata ? 
            this.#currentSitemap : 
            this.#currentSitemap.entities;

        return JSON.stringify(data, null, (options && options.prettyPrint) ? 2 : 0);
    }

    #exportAsUniversalCSV(options) {
        const entities = this.#currentSitemap.entities;
        const headers = ['level', 'type', 'title', 'importance', 'parent', 'depth', 'domain'];
        const rows = [headers.join(',')];

        Object.values(entities).forEach(entity => {
            const row = headers.map(header => {
                let value = entity[header] || 
                          (entity.metadata && entity.metadata[header]) || 
                          (entity.hierarchy && entity.hierarchy[header]) || 
                          '';
                
                if (header === 'domain') {
                    value = this.#currentSitemap.domain;
                }
                
                if (typeof value === 'string' && value.includes(',')) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                
                return value;
            });
            
            rows.push(row.join(','));
        });

        return rows.join('\n');
    }

    #exportAsUniversalYAML(options) {
        const data = options && options.includeMetadata ? 
            this.#currentSitemap : 
            this.#currentSitemap.entities;

        const jsonString = JSON.stringify(data, null, 2);
        return jsonString
            .replace(/\{/g, '')
            .replace(/\}/g, '')
            .replace(/"/g, '')
            .replace(/:/g, ': ')
            .replace(/,/g, '')
            .split('\n')
            .filter(line => line.trim())
            .map(line => '  ' + line)
            .join('\n');
    }

    #exportAsUniversalXML(options) {
        const entities = this.#currentSitemap.entities;
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        Object.values(entities).forEach(entity => {
            xml += '  <url>\n';
            xml += '    <loc>https://' + this.#currentSitemap.domain + '/pages/' + entity.level + '.html</loc>\n';
            xml += '    <lastmod>' + (entity.timestamps.updated || entity.timestamps.created) + '</lastmod>\n';
            xml += '    <changefreq>weekly</changefreq>\n';
            xml += '    <priority>' + this.#getXMLPriority(entity) + '</priority>\n';
            xml += '  </url>\n';
        });

        xml += '</urlset>';
        return xml;
    }

    #getXMLPriority(entity) {
        const priorityMap = {
            'galaxy': '1.0',
            'planet': '0.8',
            'moon': '0.6',
            'asteroid': '0.4',
            'debris': '0.2'
        };
        return priorityMap[entity.type] || '0.5';
    }

    #handleUniversalPagesUpdate(updateInfo) {
        console.log('🔄 Универсальное обновление: ' + (updateInfo.added ? updateInfo.added.length : 0) + ' добавлено, ' + (updateInfo.removed ? updateInfo.removed.length : 0) + ' удалено');

        if (((updateInfo.added ? updateInfo.added.length : 0) + (updateInfo.removed ? updateInfo.removed.length : 0)) > 0) {
            this.#dispatchUniversalEvent('sitemapUpdateRequired', { 
                reason: 'universal_pages_updated',
                domain: window.location.hostname
            });
        }
    }

    #handleDomainChange(domainInfo) {
        console.log('🌐 Смена домена: ' + domainInfo.from + ' → ' + domainInfo.to);
        
        if (this.#currentSitemap) {
            this.#currentSitemap.domain = domainInfo.to;
            this.#stats.domainsProcessed.add(domainInfo.to);
        }
    }

    #handleVercelStatusChange(statusInfo) {
        console.log('🔄 Vercel статус изменен: ' + (statusInfo.available ? 'доступен' : 'недоступен'));
        this.#vercelAPIEnabled = statusInfo.available;
        
        // Обновляем информацию в sitemap
        if (this.#currentSitemap) {
            this.#currentSitemap.integration.vercelEnabled = this.#vercelAPIEnabled;
        }
    }

    #handleCrossDomainUpdate(backupData) {
        try {
            const backup = JSON.parse(backupData);
            if (backup.domain !== window.location.hostname) {
                console.log('🔄 Кросс-доменное обновление от ' + backup.domain);
                
                this.#dispatchUniversalEvent('crossDomainUpdateReceived', {
                    sourceDomain: backup.domain,
                    targetDomain: window.location.hostname,
                    timestamp: backup.timestamp
                });
            }
        } catch (error) {
            console.warn('⚠️ Ошибка обработки кросс-доменного обновления:', error);
        }
    }

    #forceUniversalRegeneration() {
        if (this.#metaParser) {
            console.log('🔄 Универсальная принудительная регенерация sitemap...');
            this.#metaParser.parseAllPages();
        } else {
            console.warn('⚠️ UniversalMetaParser не доступен для регенерации');
        }
    }

    /**
     * Публичный метод для регенерации sitemap
     */
    regenerateSitemap() {
        this.#forceUniversalRegeneration();
    }

    async #checkSitemapFreshness() {
        if (!this.#currentSitemap) return;

        const currentTime = Date.now();
        const sitemapTime = new Date(this.#currentSitemap.generated).getTime();
        const hoursDiff = (currentTime - sitemapTime) / (1000 * 60 * 60);

        if (hoursDiff > 24) {
            console.warn('🕐 Универсальный sitemap устарел (' + hoursDiff.toFixed(1) + ' часов), рекомендуется обновление');
            this.#dispatchUniversalEvent('sitemapStale', { 
                ageHours: hoursDiff,
                generated: this.#currentSitemap.generated,
                domain: this.#currentSitemap.domain
            });
        }
    }

    #dispatchUniversalEvent(eventName, detail) {
        try {
            const event = new CustomEvent(eventName, { 
                detail: {
                    ...detail,
                    universal: true,
                    timestamp: Date.now()
                }
            });
            document.dispatchEvent(event);
        } catch (error) {
            console.error('❌ Ошибка отправки универсального события ' + eventName + ':', error);
        }
    }

    // Public Universal API
    getCurrentSitemap() {
        return this.#currentSitemap;
    }

    getEntity(level) {
        return this.#currentSitemap && this.#currentSitemap.entities ? 
            this.#currentSitemap.entities[level] : null;
    }

    getHierarchy() {
        return this.#currentSitemap ? this.#currentSitemap.hierarchy : null;
    }

    getStatistics() {
        return {
            sitemap: this.#stats,
            entities: this.#currentSitemap ? this.#currentSitemap.statistics : {},
            domains: Array.from(this.#stats.domainsProcessed),
            vercelEnabled: this.#vercelAPIEnabled,
            saveStats: {
                attempts: this.#stats.saveAttempts,
                successful: this.#stats.successfulSaves,
                successRate: this.#stats.saveAttempts > 0 ? 
                    (this.#stats.successfulSaves / this.#stats.saveAttempts * 100).toFixed(1) + '%' : '0%'
            }
        };
    }

    getVersionHistory() {
        return this.#versionHistory;
    }

    searchEntities(query, field) {
        if (!this.#currentSitemap) return [];

        const searchField = field || 'title';
        const results = [];
        const searchTerm = query.toLowerCase();

        Object.values(this.#currentSitemap.entities).forEach(entity => {
            const value = entity[searchField] || 
                         (entity.metadata && entity.metadata[searchField]) || 
                         '';
            if (value.toString().toLowerCase().includes(searchTerm)) {
                results.push(entity);
            }
        });

        return results;
    }

    getEntitiesByType(type) {
        if (!this.#currentSitemap) return [];
        
        return Object.values(this.#currentSitemap.entities).filter(
            entity => entity.type === type
        );
    }

    getEntitiesByDomain(domain) {
        if (!this.#currentSitemap) return [];
        
        const targetDomain = domain || this.#currentSitemap.domain;
        return Object.values(this.#currentSitemap.entities).filter(
            entity => entity.metadata && entity.metadata.domain === targetDomain
        );
    }

    // Vercel-specific методы
    isVercelEnabled() {
        return this.#vercelAPIEnabled;
    }

    getVercelStatus() {
        return {
            enabled: this.#vercelAPIEnabled,
            endpoints: this.#vercelEndpoints
        };
    }

    // Универсальные методы для работы с несколькими доменами
    mergeSitemaps(sitemaps) {
        const merged = {
            version: "3.0",
            generated: new Date().toISOString(),
            generator: "UniversalGalaxyMetaParser v3.0 (Merged)",
            domains: sitemaps.map(s => s.domain),
            entities: {},
            hierarchy: { roots: [], stats: {} },
            statistics: { totalEntities: 0, domains: [] }
        };

        sitemaps.forEach(sitemap => {
            if (sitemap.entities) {
                Object.assign(merged.entities, sitemap.entities);
            }
            if (sitemap.domain) {
                merged.statistics.domains.push(sitemap.domain);
            }
        });

        merged.statistics.totalEntities = Object.keys(merged.entities).length;
        this.#currentSitemap = merged;

        return merged;
    }

    // Новый метод для принудительного сохранения
    async forceSave() {
        return await this.saveToDataFile();
    }

    // Метод для обновления отдельной сущности
    updateEntity(level, updates) {
        if (!this.#currentSitemap || !this.#currentSitemap.entities[level]) {
            console.warn('⚠️ Сущность не найдена: ' + level);
            return false;
        }

        Object.assign(this.#currentSitemap.entities[level], updates);
        this.#currentSitemap.generated = new Date().toISOString();
        this.#currentSitemap.checksum = this.#generateChecksum(this.#currentSitemap.entities);

        console.log('✏️ Обновлена сущность: ' + level);

        this.#dispatchUniversalEvent('entityUpdated', {
            level: level,
            updates: updates,
            entity: this.#currentSitemap.entities[level]
        });

        return true;
    }
}

// Универсальный Global API для любого домена
window.UniversalSitemapGenerator = SitemapGenerator;

// Universal Public API функции
window.UniversalGalaxySitemap = {
    getSitemap: function() {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.getCurrentSitemap() : null;
    },

    getEntity: function(level) {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.getEntity(level) : null;
    },

    getHierarchy: function() {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.getHierarchy() : null;
    },

    search: function(query, field) {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.searchEntities(query, field) : [];
    },

    getByType: function(type) {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.getEntitiesByType(type) : [];
    },

    getByDomain: function(domain) {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.getEntitiesByDomain(domain) : [];
    },

    export: function(format, options) {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.exportSitemap(format, options) : null;
    },

    regenerate: function() {
        const generator = window.universalSitemapGenerator;
        if (generator) {
            generator.forceUniversalRegeneration();
            return true;
        }
        return false;
    },

    regenerateSitemap: function() {
        const generator = window.universalSitemapGenerator;
        if (generator) {
            generator.regenerateSitemap();
            return true;
        }
        return false;
    },

    getStats: function() {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.getStatistics() : null;
    },

    merge: function(sitemaps) {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.mergeSitemaps(sitemaps) : null;
    },

    getCurrentDomain: function() {
        return window.location.hostname;
    },

    getSupportedDomains: function() {
        const generator = window.universalSitemapGenerator;
        const stats = generator ? generator.getStatistics() : null;
        return stats && stats.domains ? stats.domains : [window.location.hostname];
    },

    // Vercel-specific API
    isVercelEnabled: function() {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.isVercelEnabled() : false;
    },

    getVercelStatus: function() {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.getVercelStatus() : { enabled: false, endpoints: {} };
    },

    // Новые методы для управления sitemap
    forceSave: function() {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.forceSave() : Promise.resolve(false);
    },

    updateEntity: function(level, updates) {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.updateEntity(level, updates) : false;
    },

    createBackup: function() {
        const generator = window.universalSitemapGenerator;
        if (generator) {
            generator.createBackup();
            return true;
        }
        return false;
    },

    restoreBackup: function() {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.restoreFromBackup() : Promise.resolve(false);
    }
};

console.log('✅ Универсальный модуль 3: Генерация sitemap с Vercel интеграцией и авто-регенерацией загружены');

// Автоматическая универсальная инициализация
document.addEventListener('DOMContentLoaded', async function() {
    if (window.GalaxyMetaParser && window.metaParserInstance) {
        window.universalSitemapGenerator = new SitemapGenerator(window.metaParserInstance);
        await window.universalSitemapGenerator.init();
        
        console.log('🌐 Универсальная система sitemap с Vercel поддержкой и авто-регенерацией готова к работе на любом домене');
        
        // Автоматически сохраняем sitemap после инициализации
        setTimeout(() => {
            if (window.universalSitemapGenerator && window.universalSitemapGenerator.saveToDataFile) {
                window.universalSitemapGenerator.saveToDataFile();
            }
        }, 5000);
    }
});
