// bioapgreid/js/meta-parser/meta-parser-3.js
/**
 * Универсальный генератор sitemap для любой галактики с Vercel адаптацией
 * @class SitemapGenerator
 */
class SitemapGenerator {
    constructor(metaParser) {
        this._metaParser = metaParser;
        this._currentSitemap = null;
        this._versionHistory = [];
        this._config = {
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
        this._stats = {
            generations: 0,
            lastGeneration: null,
            totalEntities: 0,
            versionsCount: 0,
            backupSize: 0,
            domainsProcessed: new Set()
        };

        // Vercel интеграция
        this._vercelAPIEnabled = false;
        this._vercelEndpoints = {
            projectStructure: '/api/project-structure',
            metaParser: '/api/meta-parser', 
            sitemap: '/api/sitemap'
        };

        console.log('🗺️ Универсальный SitemapGenerator с Vercel поддержкой инициализирован');
    }

    async init() {
        console.log('🌐 Универсальная инициализация SitemapGenerator с Vercel...');
        
        try {
            await this._checkVercelAPI();
            await this._loadExistingSitemap();
            this._setupUniversalEventListeners();
            this._setupAutoBackup();
            this._setupCrossDomainSupport();
            
            console.log('✅ Универсальный SitemapGenerator с Vercel готов к работе');
        } catch (error) {
            console.error('❌ Ошибка инициализации универсального SitemapGenerator:', error);
            throw error;
        }
    }

    /**
     * Проверка доступности Vercel API
     */
    async _checkVercelAPI() {
        try {
            const endpoints = Object.values(this._vercelEndpoints);
            const checks = await Promise.allSettled(
                endpoints.map(endpoint => fetch(endpoint, { method: 'HEAD' }))
            );

            this._vercelAPIEnabled = checks.some(check => 
                check.status === 'fulfilled' && check.value.ok
            );

            if (this._vercelAPIEnabled) {
                console.log('✅ Vercel API endpoints доступны');
            } else {
                console.log('ℹ️ Vercel API недоступен, работаем в стандартном режиме');
            }
        } catch (error) {
            console.log('ℹ️ Vercel API недоступен');
            this._vercelAPIEnabled = false;
        }
    }

    /**
     * Универсальная загрузка существующего sitemap с Vercel приоритетом
     */
    async _loadExistingSitemap() {
        // Приоритет 1: Vercel API
        if (this._vercelAPIEnabled) {
            try {
                const response = await fetch(this._vercelEndpoints.sitemap);
                if (response.ok) {
                    this._currentSitemap = await response.json();
                    console.log(`📁 Загружен sitemap через Vercel API (версия ${this._currentSitemap?.version ?? 'unknown'})`);
                    await this._checkSitemapFreshness();
                    return;
                }
            } catch (error) {
                console.warn('⚠️ Не удалось загрузить через Vercel API:', error.message);
            }
        }

        // Приоритет 2: Стандартные пути
        const possiblePaths = [
            this._config.sitemapPath,
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
                    this._currentSitemap = await response.json();
                    this._stats.domainsProcessed.add(window.location.hostname);
                    
                    console.log(`📁 Загружен sitemap из ${path} (версия ${this._currentSitemap?.version ?? 'unknown'})`);
                    await this._checkSitemapFreshness();
                    return;
                }
            } catch (error) {
                continue;
            }
        }

        // Приоритет 3: Создание нового
        console.log('📝 Существующий sitemap не найден, будет создан новый универсальный');
        await this._createInitialSitemap();
    }

    /**
     * Создание начального sitemap для новой галактики
     */
    async _createInitialSitemap() {
        const domain = window.location.hostname;
        const basePath = this._detectBasePath();

        this._currentSitemap = {
            version: "3.0",
            generated: new Date().toISOString(),
            generator: "UniversalGalaxyMetaParser v3.0",
            domain,
            basePath,
            checksum: this._generateChecksum({}),

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
                entityTypes: this._getUniversalEntityTypes(),
                supportedDomains: ['*'],
                crossOrigin: true,
                vercelEnabled: this._vercelAPIEnabled
            }
        };

        console.log(`🚀 Создан начальный универсальный sitemap для домена ${domain}`);
    }

    /**
     * Автоматическое определение базового пути
     */
    _detectBasePath() {
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') return '';

        const parts = path.split('/').filter(Boolean);
        if (parts.length > 0 && !parts[0].includes('.')) {
            return `/${parts[0]}`;
        }

        return '';
    }

    _setupUniversalEventListeners() {
        const universalEvents = new Map([
            ['metaParsingCompleted', (event) => this._generateFromUniversalMetaData(event.detail)],
            ['forceSitemapRegeneration', () => this._forceUniversalRegeneration()],
            ['exportSitemapRequest', (event) => this._exportSitemap(event.detail.format, event.detail.options)],
            ['backupSitemapRequest', () => this._createBackup()],
            ['restoreSitemapRequest', () => this._restoreFromBackup()],
            ['pagesDirectoryChanged', (event) => this._handleUniversalPagesUpdate(event.detail)],
            ['domainChanged', (event) => this._handleDomainChange(event.detail)],
            ['vercelApiStatusChange', (event) => this._handleVercelStatusChange(event.detail)]
        ]);

        for (const [eventName, handler] of universalEvents) {
            document.addEventListener(eventName, handler);
        }
    }

    _setupCrossDomainSupport() {
        window.addEventListener('storage', (event) => {
            if (event.key === this._config.localStorageKey && event.newValue) {
                this._handleCrossDomainUpdate(event.newValue);
            }
        });
    }

    _setupAutoBackup() {
        setInterval(() => {
            this._createBackup();
        }, 30 * 60 * 1000);
    }

    async _generateFromUniversalMetaData(metaData) {
        const startTime = performance.now();
        
        try {
            const { entities, hierarchy, stats } = metaData;
            
            console.log(`🏗️ Универсальная генерация sitemap из ${Object.keys(entities).length} сущностей...`);

            const domain = window.location.hostname;
            this._stats.domainsProcessed.add(domain);

            const sitemap = {
                version: "3.0",
                generated: new Date().toISOString(),
                generator: "UniversalGalaxyMetaParser v3.0",
                domain,
                basePath: this._detectBasePath(),
                checksum: this._generateChecksum(entities),

                entities: this._transformUniversalEntities(entities),
                
                hierarchy: {
                    roots: hierarchy.roots.map(root => this._serializeUniversalNode(root)),
                    stats: hierarchy.stats,
                    relationshipChains: hierarchy.relationshipChains ?? {}
                },

                statistics: {
                    totalEntities: Object.keys(entities).length,
                    byType: this._calculateUniversalTypeDistribution(entities),
                    byImportance: this._calculateUniversalImportanceDistribution(entities),
                    maxDepth: hierarchy.stats.maxDepth,
                    generationTime: 0,
                    domains: Array.from(this._stats.domainsProcessed)
                },

                integration: {
                    compatibleWith: [
                        "UniversalGalaxyBuilder v3.0", 
                        "ContentManager v3.0", 
                        "AdaptivePositioning v3.0",
                        "CrossDomainNavigator v3.0"
                    ],
                    requiredFields: ['level', 'type', 'title'],
                    entityTypes: this._getUniversalEntityTypes(),
                    supportedDomains: ['*'],
                    crossOrigin: true,
                    apiVersion: '3.0',
                    vercelEnabled: this._vercelAPIEnabled
                }
            };

            sitemap.statistics.generationTime = performance.now() - startTime;

            await this._validateUniversalSitemap(sitemap);

            await this._saveVersion(sitemap);

            this._currentSitemap = sitemap;

            if (this._config.autoSave) {
                setTimeout(() => this._saveUniversalSitemap(), 1000);
            }

            this._stats.generations++;
            this._stats.lastGeneration = new Date().toISOString();
            this._stats.totalEntities = Object.keys(entities).length;

            console.log(`✅ Универсальный sitemap сгенерирован: ${Object.keys(entities).length} сущностей, ${hierarchy.stats.maxDepth} уровней`);

            this._dispatchUniversalEvent('sitemapGenerated', {
                sitemap,
                stats: this._stats,
                generationTime: sitemap.statistics.generationTime,
                domain,
                vercelEnabled: this._vercelAPIEnabled
            });

            return sitemap;

        } catch (error) {
            console.error('💥 Ошибка универсальной генерации sitemap:', error);
            this._dispatchUniversalEvent('sitemapGenerationError', {
                error: error.message,
                metaData,
                domain: window.location.hostname
            });
            throw error;
        }
    }

    /**
     * Универсальное преобразование сущностей
     */
    _transformUniversalEntities(entities) {
        const transformed = {};
        const domain = window.location.hostname;
        
        Object.entries(entities).forEach(([level, entity]) => {
            transformed[level] = {
                level: entity.level,
                type: entity.type,
                title: entity.title,
                
                metadata: {
                    importance: entity.importance ?? 'medium',
                    unlocked: entity.unlocked !== false,
                    color: entity.color,
                    icon: entity.icon,
                    description: entity.description,
                    tags: entity.tags ?? [],
                    contentPriority: entity['content-priority'] ?? 'medium',
                    analyticsCategory: entity['analytics-category'] ?? 'general',
                    domain,
                    crossDomainId: this._generateCrossDomainId(entity.level, domain)
                },

                positioning: {
                    orbitRadius: entity['orbit-radius'] ?? 100,
                    orbitAngle: entity['orbit-angle'] ?? 0,
                    sizeModifier: entity['size-modifier'] ?? 1.0,
                    adaptive: true
                },

                hierarchy: {
                    parent: entity.parent ?? null,
                    depth: entity.metadata?.depth ?? 0,
                    childCount: entity.metadata?.childCount ?? 0,
                    siblingIndex: entity.metadata?.siblingIndex ?? 0,
                    isRoot: !entity.parent,
                    crossDomainParent: entity.metadata?.crossDomainParent
                },

                timestamps: {
                    created: entity.created ?? entity.metadata?.parsedAt,
                    updated: entity.updated ?? entity.metadata?.parsedAt,
                    parsedAt: entity.metadata?.parsedAt,
                    domainAdded: new Date().toISOString()
                },

                analytics: {
                    ...entity.analytics,
                    domain,
                    accessCount: 0,
                    lastAccess: null,
                    crossDomainAccess: []
                },

                compatibility: {
                    version: '3.0',
                    source: entity.metadata?.sourceUrl,
                    domain,
                    universal: true,
                    vercelCompatible: this._vercelAPIEnabled
                }
            };
        });

        return transformed;
    }

    /**
     * Генерация кросс-доменного ID
     */
    _generateCrossDomainId(level, domain) {
        return `${domain}::${level}`;
    }

    _serializeUniversalNode(node) {
        if (!node) return null;

        return {
            level: node.level,
            type: node.type,
            title: node.title,
            metadata: {
                depth: node.metadata.depth,
                isRoot: node.metadata.isRoot,
                childCount: node.metadata.childCount,
                totalDescendants: node.metadata.totalDescendants,
                relationshipChain: node.metadata.relationshipChain,
                crossDomainId: node.metadata.crossDomainId
            },
            children: node.children.map(child => this._serializeUniversalNode(child))
        };
    }

    _calculateUniversalTypeDistribution(entities) {
        const distribution = {};
        Object.values(entities).forEach(entity => {
            distribution[entity.type] = (distribution[entity.type] ?? 0) + 1;
        });
        return distribution;
    }

    _calculateUniversalImportanceDistribution(entities) {
        const distribution = { high: 0, medium: 0, low: 0 };
        Object.values(entities).forEach(entity => {
            const importance = entity.importance ?? 'medium';
            distribution[importance] = (distribution[importance] ?? 0) + 1;
        });
        return distribution;
    }

    _getUniversalEntityTypes() {
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

    _generateChecksum(entities) {
        const dataString = JSON.stringify(entities);
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    async _validateUniversalSitemap(sitemap) {
        const errors = [];

        if (!sitemap.version) errors.push('Отсутствует версия');
        if (!sitemap.generated) errors.push('Отсутствует timestamp генерации');
        if (!sitemap.entities) errors.push('Отсутствуют entities');
        if (!sitemap.hierarchy) errors.push('Отсутствует hierarchy');
        if (!sitemap.domain) errors.push('Отсутствует информация о домене');

        if (sitemap.entities) {
            Object.entries(sitemap.entities).forEach(([level, entity]) => {
                if (!entity.level) errors.push(`Сущность без level: ${level}`);
                if (!entity.type) errors.push(`Сущность без type: ${level}`);
                if (!entity.title) errors.push(`Сущность без title: ${level}`);
                
                if (!entity.metadata.crossDomainId) {
                    errors.push(`Отсутствует crossDomainId для: ${level}`);
                }
            });
        }

        const currentChecksum = this._generateChecksum(sitemap.entities);
        if (sitemap.checksum !== currentChecksum) {
            errors.push('Checksum не совпадает - возможна corruption данных');
        }

        if (errors.length > 0) {
            throw new Error(`Ошибки валидации универсального sitemap: ${errors.join(', ')}`);
        }

        console.log('✅ Универсальный sitemap прошел валидацию');
    }

    async _saveUniversalSitemap() {
        if (!this._currentSitemap) {
            console.warn('⚠️ Нет данных для сохранения универсального sitemap');
            return;
        }

        try {
            // Приоритет 1: Vercel API
            if (this._vercelAPIEnabled) {
                await this._saveToVercelAPI();
            }
            
            // Приоритет 2: Стандартное сохранение
            await this._saveToUniversalStorage();
            await this._downloadAsUniversalFile();
            
            console.log('💾 Универсальный sitemap сохранен');

            this._dispatchUniversalEvent('sitemapSaved', {
                path: this._config.sitemapPath,
                size: JSON.stringify(this._currentSitemap).length,
                entities: Object.keys(this._currentSitemap.entities).length,
                domain: this._currentSitemap.domain,
                savedTo: this._vercelAPIEnabled ? 'vercel' : 'local'
            });

        } catch (error) {
            console.error('❌ Ошибка сохранения универсального sitemap:', error);
            this._dispatchUniversalEvent('sitemapSaveError', { 
                error: error.message,
                domain: this._currentSitemap?.domain 
            });
        }
    }

    /**
     * Сохранение sitemap через Vercel API
     */
    async _saveToVercelAPI() {
        try {
            const response = await fetch(this._vercelEndpoints.sitemap, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this._currentSitemap)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Sitemap сохранен на Vercel: ${result.path}`);
            } else {
                throw new Error(result.error || 'Unknown error');
            }

        } catch (error) {
            console.warn('⚠️ Не удалось сохранить через Vercel API:', error.message);
            throw error;
        }
    }

    async _saveToUniversalStorage() {
        try {
            const domain = this._currentSitemap.domain;
            const storageKey = `${this._config.localStorageKey}_${domain}`;
            
            const data = {
                sitemap: this._currentSitemap,
                timestamp: Date.now(),
                version: '3.0',
                domain
            };

            localStorage.setItem(storageKey, JSON.stringify(data));
            this._stats.backupSize = JSON.stringify(data).length;

            console.log(`📦 Универсальный sitemap сохранен в localStorage для домена ${domain}`);
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить в localStorage:', error.message);
        }
    }

    async _downloadAsUniversalFile() {
        try {
            const domain = this._currentSitemap.domain;
            const dataStr = JSON.stringify(this._currentSitemap, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `sitemap_${domain}_${Date.now()}.json`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(link.href);

            console.log(`📥 Универсальный sitemap готов для скачивания (${domain})`);
        } catch (error) {
            console.warn('⚠️ Не удалось создать файл для скачивания:', error.message);
        }
    }

    async _saveVersion(sitemap) {
        if (!this._config.versioning.enabled) return;

        const version = {
            data: JSON.parse(JSON.stringify(sitemap)),
            timestamp: Date.now(),
            version: sitemap.version,
            checksum: sitemap.checksum,
            domain: sitemap.domain
        };

        this._versionHistory.unshift(version);

        if (this._versionHistory.length > this._config.versioning.maxVersions) {
            this._versionHistory = this._versionHistory.slice(0, this._config.versioning.maxVersions);
        }

        this._stats.versionsCount = this._versionHistory.length;

        this._dispatchUniversalEvent('sitemapVersionCreated', {
            version: version,
            totalVersions: this._versionHistory.length,
            domain: sitemap.domain
        });

        console.log(`🕰️ Сохранена версия универсального sitemap #${this._versionHistory.length} для ${sitemap.domain}`);
    }

    async _restoreFromBackup() {
        try {
            const domain = window.location.hostname;
            const storageKey = `${this._config.localStorageKey}_${domain}`;
            const backupData = localStorage.getItem(storageKey);
            
            if (!backupData) {
                console.warn(`⚠️ Backup не найден в localStorage для домена ${domain}`);
                return false;
            }

            const backup = JSON.parse(backupData);
            
            if (!backup.sitemap || !backup.timestamp) {
                throw new Error('Невалидный backup данные');
            }

            this._currentSitemap = backup.sitemap;
            console.log(`🔙 Универсальный sitemap восстановлен из backup для ${domain}`);

            this._dispatchUniversalEvent('backupRestored', {
                timestamp: backup.timestamp,
                entities: Object.keys(backup.sitemap.entities).length,
                domain
            });

            return true;

        } catch (error) {
            console.error('❌ Ошибка восстановления из backup:', error);
            return false;
        }
    }

    async _createBackup() {
        if (!this._currentSitemap) return;

        await this._saveToUniversalStorage();
        console.log('💾 Универсальный backup создан');

        this._dispatchUniversalEvent('backupCreated', {
            timestamp: Date.now(),
            size: this._stats.backupSize,
            domain: this._currentSitemap.domain
        });
    }

    async _exportSitemap(format = 'json', options = {}) {
        if (!this._currentSitemap) {
            throw new Error('Нет данных универсального sitemap для экспорта');
        }

        try {
            let exportedData;

            switch (format.toLowerCase()) {
                case 'json':
                    exportedData = this._exportAsUniversalJSON(options);
                    break;
                case 'csv':
                    exportedData = this._exportAsUniversalCSV(options);
                    break;
                case 'yaml':
                    exportedData = this._exportAsUniversalYAML(options);
                    break;
                case 'xml':
                    exportedData = this._exportAsUniversalXML(options);
                    break;
                default:
                    throw new Error(`Неподдерживаемый формат: ${format}`);
            }

            this._dispatchUniversalEvent('exportReady', {
                format: format,
                data: exportedData,
                size: exportedData.length,
                entities: Object.keys(this._currentSitemap.entities).length,
                domain: this._currentSitemap.domain
            });

            return exportedData;

        } catch (error) {
            console.error(`❌ Ошибка экспорта в ${format}:`, error);
            throw error;
        }
    }

    _exportAsUniversalJSON(options = {}) {
        const data = options.includeMetadata ? 
            this._currentSitemap : 
            this._currentSitemap.entities;

        return JSON.stringify(data, null, options.prettyPrint ? 2 : 0);
    }

    _exportAsUniversalCSV(options = {}) {
        const entities = this._currentSitemap.entities;
        const headers = ['level', 'type', 'title', 'importance', 'parent', 'depth', 'domain'];
        const rows = [headers.join(',')];

        Object.values(entities).forEach(entity => {
            const row = headers.map(header => {
                let value = entity[header] ?? 
                          entity.metadata?.[header] ?? 
                          entity.hierarchy?.[header] ?? 
                          '';
                
                if (header === 'domain') {
                    value = this._currentSitemap.domain;
                }
                
                if (typeof value === 'string' && value.includes(',')) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                
                return value;
            });
            
            rows.push(row.join(','));
        });

        return rows.join('\n');
    }

    _exportAsUniversalYAML(options = {}) {
        const data = options.includeMetadata ? 
            this._currentSitemap : 
            this._currentSitemap.entities;

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

    _exportAsUniversalXML(options = {}) {
        const entities = this._currentSitemap.entities;
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        Object.values(entities).forEach(entity => {
            xml += '  <url>\n';
            xml += `    <loc>https://${this._currentSitemap.domain}/pages/${entity.level}.html</loc>\n`;
            xml += `    <lastmod>${entity.timestamps.updated ?? entity.timestamps.created}</lastmod>\n`;
            xml += `    <changefreq>weekly</changefreq>\n`;
            xml += `    <priority>${this._getXMLPriority(entity)}</priority>\n`;
            xml += '  </url>\n';
        });

        xml += '</urlset>';
        return xml;
    }

    _getXMLPriority(entity) {
        const priorityMap = {
            'galaxy': '1.0',
            'planet': '0.8',
            'moon': '0.6',
            'asteroid': '0.4',
            'debris': '0.2'
        };
        return priorityMap[entity.type] ?? '0.5';
    }

    _handleUniversalPagesUpdate(updateInfo) {
        console.log(`🔄 Универсальное обновление: ${updateInfo.added?.length ?? 0} добавлено, ${updateInfo.removed?.length ?? 0} удалено`);

        if ((updateInfo.added?.length + updateInfo.removed?.length) > 0) {
            this._dispatchUniversalEvent('sitemapUpdateRequired', { 
                reason: 'universal_pages_updated',
                domain: window.location.hostname
            });
        }
    }

    _handleDomainChange(domainInfo) {
        console.log(`🌐 Смена домена: ${domainInfo.from} → ${domainInfo.to}`);
        
        if (this._currentSitemap) {
            this._currentSitemap.domain = domainInfo.to;
            this._stats.domainsProcessed.add(domainInfo.to);
        }
    }

    _handleVercelStatusChange(statusInfo) {
        console.log(`🔄 Vercel статус изменен: ${statusInfo.available ? 'доступен' : 'недоступен'}`);
        this._vercelAPIEnabled = statusInfo.available;
        
        // Обновляем информацию в sitemap
        if (this._currentSitemap) {
            this._currentSitemap.integration.vercelEnabled = this._vercelAPIEnabled;
        }
    }

    _handleCrossDomainUpdate(backupData) {
        try {
            const backup = JSON.parse(backupData);
            if (backup.domain !== window.location.hostname) {
                console.log(`🔄 Кросс-доменное обновление от ${backup.domain}`);
                
                this._dispatchUniversalEvent('crossDomainUpdateReceived', {
                    sourceDomain: backup.domain,
                    targetDomain: window.location.hostname,
                    timestamp: backup.timestamp
                });
            }
        } catch (error) {
            console.warn('⚠️ Ошибка обработки кросс-доменного обновления:', error);
        }
    }

    _forceUniversalRegeneration() {
        if (this._metaParser) {
            console.log('🔄 Универсальная принудительная регенерация sitemap...');
            this._metaParser.parseAllPages();
        } else {
            console.warn('⚠️ UniversalMetaParser не доступен для регенерации');
        }
    }

    async _checkSitemapFreshness() {
        if (!this._currentSitemap) return;

        const currentTime = Date.now();
        const sitemapTime = new Date(this._currentSitemap.generated).getTime();
        const hoursDiff = (currentTime - sitemapTime) / (1000 * 60 * 60);

        if (hoursDiff > 24) {
            console.warn(`🕐 Универсальный sitemap устарел (${hoursDiff.toFixed(1)} часов), рекомендуется обновление`);
            this._dispatchUniversalEvent('sitemapStale', { 
                ageHours: hoursDiff,
                generated: this._currentSitemap.generated,
                domain: this._currentSitemap.domain
            });
        }
    }

    _dispatchUniversalEvent(eventName, detail) {
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
            console.error(`❌ Ошибка отправки универсального события ${eventName}:`, error);
        }
    }

    // Public Universal API
    getCurrentSitemap() {
        return this._currentSitemap;
    }

    getEntity(level) {
        return this._currentSitemap?.entities?.[level] ?? null;
    }

    getHierarchy() {
        return this._currentSitemap?.hierarchy ?? null;
    }

    getStatistics() {
        return {
            sitemap: this._stats,
            entities: this._currentSitemap?.statistics ?? {},
            domains: Array.from(this._stats.domainsProcessed),
            vercelEnabled: this._vercelAPIEnabled
        };
    }

    getVersionHistory() {
        return this._versionHistory;
    }

    searchEntities(query, field = 'title') {
        if (!this._currentSitemap) return [];

        const results = [];
        const searchTerm = query.toLowerCase();

        Object.values(this._currentSitemap.entities).forEach(entity => {
            const value = entity[field] ?? entity.metadata?.[field] ?? '';
            if (value.toString().toLowerCase().includes(searchTerm)) {
                results.push(entity);
            }
        });

        return results;
    }

    getEntitiesByType(type) {
        if (!this._currentSitemap) return [];
        
        return Object.values(this._currentSitemap.entities).filter(
            entity => entity.type === type
        );
    }

    getEntitiesByDomain(domain = null) {
        if (!this._currentSitemap) return [];
        
        const targetDomain = domain ?? this._currentSitemap.domain;
        return Object.values(this._currentSitemap.entities).filter(
            entity => entity.metadata.domain === targetDomain
        );
    }

    // Vercel-specific методы
    isVercelEnabled() {
        return this._vercelAPIEnabled;
    }

    getVercelStatus() {
        return {
            enabled: this._vercelAPIEnabled,
            endpoints: this._vercelEndpoints
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
            Object.assign(merged.entities, sitemap.entities);
            merged.statistics.domains.push(sitemap.domain);
        });

        merged.statistics.totalEntities = Object.keys(merged.entities).length;
        this._currentSitemap = merged;

        return merged;
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

    search: function(query, field = 'title') {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.searchEntities(query, field) : [];
    },

    getByType: function(type) {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.getEntitiesByType(type) : [];
    },

    getByDomain: function(domain = null) {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.getEntitiesByDomain(domain) : [];
    },

    export: function(format = 'json', options = {}) {
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
        const stats = generator?.getStatistics();
        return stats?.domains ?? [window.location.hostname];
    },

    // Vercel-specific API
    isVercelEnabled: function() {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.isVercelEnabled() : false;
    },

    getVercelStatus: function() {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.getVercelStatus() : { enabled: false, endpoints: {} };
    }
};

console.log('✅ Универсальный модуль 3: Генерация sitemap с Vercel интеграцией загружены');

// Автоматическая универсальная инициализация
document.addEventListener('DOMContentLoaded', async function() {
    if (window.GalaxyMetaParser && window.metaParserInstance) {
        window.universalSitemapGenerator = new SitemapGenerator(window.metaParserInstance);
        await window.universalSitemapGenerator.init();
        
        console.log('🌐 Универсальная система sitemap с Vercel поддержкой готова к работе на любом домене');
    }
});
