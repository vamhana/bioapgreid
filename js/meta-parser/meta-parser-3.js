// bioapgreid/js/meta-parser/meta-parser-3.js

/**
 * Универсальный генератор sitemap для любой галактики
 * @class SitemapGenerator
 */
class SitemapGenerator {
    #metaParser;
    #currentSitemap;
    #versionHistory;
    #config;
    #stats;
    
    // Статические константы
    static #DEFAULT_CONFIG = Object.freeze({
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
        // Универсальные настройки для любого домена
        universal: {
            autoDetectStructure: true,
            createIfMissing: true,
            adaptiveNaming: true,
            crossDomainSupport: true
        }
    });

    constructor(metaParser) {
        this.#metaParser = metaParser;
        this.#currentSitemap = null;
        this.#versionHistory = [];
        this.#config = { ...SitemapGenerator.#DEFAULT_CONFIG };
        this.#stats = {
            generations: 0,
            lastGeneration: null,
            totalEntities: 0,
            versionsCount: 0,
            backupSize: 0,
            domainsProcessed: new Set()
        };

        console.log('🗺️ Универсальный SitemapGenerator инициализирован');
    }

    async init() {
        console.log('🌐 Универсальная инициализация SitemapGenerator...');
        
        try {
            await this.#loadExistingSitemap();
            this.#setupUniversalEventListeners();
            this.#setupAutoBackup();
            this.#setupCrossDomainSupport();
            
            console.log('✅ Универсальный SitemapGenerator готов к работе');
        } catch (error) {
            console.error('❌ Ошибка инициализации универсального SitemapGenerator:', error);
            throw error;
        }
    }

    /**
     * Универсальная загрузка существующего sitemap
     */
    async #loadExistingSitemap() {
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
                    this.#stats.domainsProcessed.add(window.location.hostname);
                    
                    console.log(`📁 Загружен sitemap из ${path} (версия ${this.#currentSitemap?.version ?? 'unknown'})`);
                    await this.#checkSitemapFreshness();
                    return;
                }
            } catch (error) {
                // Продолжаем пробовать следующие пути
                continue;
            }
        }

        // Если sitemap не найден, создаем новый
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
            // Мета-информация
            version: "3.0",
            generated: new Date().toISOString(),
            generator: "UniversalGalaxyMetaParser v3.0",
            domain,
            basePath,
            checksum: this.#generateChecksum({}),

            // Универсальная структура
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

            // Статистика
            statistics: {
                totalEntities: 0,
                byType: {},
                byImportance: { high: 0, medium: 0, low: 0 },
                maxDepth: 0,
                generationTime: 0
            },

            // Универсальная интеграция
            integration: {
                compatibleWith: [
                    "UniversalGalaxyBuilder v3.0", 
                    "ContentManager v3.0", 
                    "AdaptivePositioning v3.0",
                    "CrossDomainNavigator v3.0"
                ],
                requiredFields: ['level', 'type', 'title'],
                entityTypes: this.#getUniversalEntityTypes(),
                supportedDomains: ['*'], // Поддержка всех доменов
                crossOrigin: true
            }
        };

        console.log(`🚀 Создан начальный универсальный sitemap для домена ${domain}`);
    }

    /**
     * Автоматическое определение базового пути
     */
    #detectBasePath() {
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') return '';

        const parts = path.split('/').filter(Boolean);
        if (parts.length > 0 && !parts[0].includes('.')) {
            return `/${parts[0]}`;
        }

        return '';
    }

    #setupUniversalEventListeners() {
        const universalEvents = new Map([
            ['metaParsingCompleted', (event) => this.#generateFromUniversalMetaData(event.detail)],
            ['forceSitemapRegeneration', () => this.#forceUniversalRegeneration()],
            ['exportSitemapRequest', (event) => this.#exportSitemap(event.detail.format, event.detail.options)],
            ['backupSitemapRequest', () => this.#createBackup()],
            ['restoreSitemapRequest', () => this.#restoreFromBackup()],
            ['pagesDirectoryChanged', (event) => this.#handleUniversalPagesUpdate(event.detail)],
            ['domainChanged', (event) => this.#handleDomainChange(event.detail)]
        ]);

        for (const [eventName, handler] of universalEvents) {
            document.addEventListener(eventName, handler);
        }
    }

    #setupCrossDomainSupport() {
        // Поддержка работы с несколькими доменами
        window.addEventListener('storage', (event) => {
            if (event.key === this.#config.localStorageKey && event.newValue) {
                this.#handleCrossDomainUpdate(event.newValue);
            }
        });
    }

    #setupAutoBackup() {
        // Универсальное резервное копирование
        setInterval(() => {
            this.#createBackup();
        }, 30 * 60 * 1000);
    }

    async #generateFromUniversalMetaData(metaData) {
        const startTime = performance.now();
        
        try {
            const { entities, hierarchy, stats } = metaData;
            
            console.log(`🏗️ Универсальная генерация sitemap из ${Object.keys(entities).length} сущностей...`);

            const domain = window.location.hostname;
            this.#stats.domainsProcessed.add(domain);

            const sitemap = {
                // Мета-информация с универсальными полями
                version: "3.0",
                generated: new Date().toISOString(),
                generator: "UniversalGalaxyMetaParser v3.0",
                domain,
                basePath: this.#detectBasePath(),
                checksum: this.#generateChecksum(entities),

                // Универсальные данные сущностей
                entities: this.#transformUniversalEntities(entities),
                
                // Адаптивная иерархия
                hierarchy: {
                    roots: hierarchy.roots.map(root => this.#serializeUniversalNode(root)),
                    stats: hierarchy.stats,
                    relationshipChains: hierarchy.relationshipChains ?? {}
                },

                // Кросс-доменная статистика
                statistics: {
                    totalEntities: Object.keys(entities).length,
                    byType: this.#calculateUniversalTypeDistribution(entities),
                    byImportance: this.#calculateUniversalImportanceDistribution(entities),
                    maxDepth: hierarchy.stats.maxDepth,
                    generationTime: 0,
                    domains: Array.from(this.#stats.domainsProcessed)
                },

                // Универсальная интеграция
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
                    apiVersion: '3.0'
                }
            };

            sitemap.statistics.generationTime = performance.now() - startTime;

            // Универсальная валидация
            await this.#validateUniversalSitemap(sitemap);

            // Сохраняем версию
            await this.#saveVersion(sitemap);

            this.#currentSitemap = sitemap;

            // Универсальное автосохранение
            if (this.#config.autoSave) {
                setTimeout(() => this.#saveUniversalSitemap(), 1000);
            }

            this.#stats.generations++;
            this.#stats.lastGeneration = new Date().toISOString();
            this.#stats.totalEntities = Object.keys(entities).length;

            console.log(`✅ Универсальный sitemap сгенерирован: ${Object.keys(entities).length} сущностей, ${hierarchy.stats.maxDepth} уровней`);

            this.#dispatchUniversalEvent('sitemapGenerated', {
                sitemap,
                stats: this.#stats,
                generationTime: sitemap.statistics.generationTime,
                domain
            });

            return sitemap;

        } catch (error) {
            console.error('💥 Ошибка универсальной генерации sitemap:', error);
            this.#dispatchUniversalEvent('sitemapGenerationError', {
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
    #transformUniversalEntities(entities) {
        const transformed = {};
        const domain = window.location.hostname;
        
        Object.entries(entities).forEach(([level, entity]) => {
            transformed[level] = {
                // Основные поля
                level: entity.level,
                type: entity.type,
                title: entity.title,
                
                // Универсальные мета-данные
                metadata: {
                    importance: entity.importance ?? 'medium',
                    unlocked: entity.unlocked !== false,
                    color: entity.color,
                    icon: entity.icon,
                    description: entity.description,
                    tags: entity.tags ?? [],
                    contentPriority: entity['content-priority'] ?? 'medium',
                    analyticsCategory: entity['analytics-category'] ?? 'general',
                    domain, // Добавляем информацию о домене
                    crossDomainId: this.#generateCrossDomainId(entity.level, domain)
                },

                // Адаптивное позиционирование
                positioning: {
                    orbitRadius: entity['orbit-radius'] ?? 100,
                    orbitAngle: entity['orbit-angle'] ?? 0,
                    sizeModifier: entity['size-modifier'] ?? 1.0,
                    adaptive: true // Флаг адаптивности
                },

                // Универсальная иерархия
                hierarchy: {
                    parent: entity.parent ?? null,
                    depth: entity.metadata?.depth ?? 0,
                    childCount: entity.metadata?.childCount ?? 0,
                    siblingIndex: entity.metadata?.siblingIndex ?? 0,
                    isRoot: !entity.parent,
                    crossDomainParent: entity.metadata?.crossDomainParent
                },

                // Временные метки
                timestamps: {
                    created: entity.created ?? entity.metadata?.parsedAt,
                    updated: entity.updated ?? entity.metadata?.parsedAt,
                    parsedAt: entity.metadata?.parsedAt,
                    domainAdded: new Date().toISOString()
                },

                // Кросс-доменная аналитика
                analytics: {
                    ...entity.analytics,
                    domain,
                    accessCount: 0,
                    lastAccess: null,
                    crossDomainAccess: []
                },

                // Универсальная совместимость
                compatibility: {
                    version: '3.0',
                    source: entity.metadata?.sourceUrl,
                    domain,
                    universal: true
                }
            };
        });

        return transformed;
    }

    /**
     * Генерация кросс-доменного ID
     */
    #generateCrossDomainId(level, domain) {
        return `${domain}::${level}`;
    }

    #serializeUniversalNode(node) {
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
            children: node.children.map(child => this.#serializeUniversalNode(child))
        };
    }

    #calculateUniversalTypeDistribution(entities) {
        const distribution = {};
        Object.values(entities).forEach(entity => {
            distribution[entity.type] = (distribution[entity.type] ?? 0) + 1;
        });
        return distribution;
    }

    #calculateUniversalImportanceDistribution(entities) {
        const distribution = { high: 0, medium: 0, low: 0 };
        Object.values(entities).forEach(entity => {
            const importance = entity.importance ?? 'medium';
            distribution[importance] = (distribution[importance] ?? 0) + 1;
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

        // Универсальная валидация обязательных полей
        if (!sitemap.version) errors.push('Отсутствует версия');
        if (!sitemap.generated) errors.push('Отсутствует timestamp генерации');
        if (!sitemap.entities) errors.push('Отсутствуют entities');
        if (!sitemap.hierarchy) errors.push('Отсутствует hierarchy');
        if (!sitemap.domain) errors.push('Отсутствует информация о домене');

        // Универсальная проверка целостности entities
        if (sitemap.entities) {
            Object.entries(sitemap.entities).forEach(([level, entity]) => {
                if (!entity.level) errors.push(`Сущность без level: ${level}`);
                if (!entity.type) errors.push(`Сущность без type: ${level}`);
                if (!entity.title) errors.push(`Сущность без title: ${level}`);
                
                // Проверка кросс-доменного ID
                if (!entity.metadata.crossDomainId) {
                    errors.push(`Отсутствует crossDomainId для: ${level}`);
                }
            });
        }

        // Универсальная проверка checksum
        const currentChecksum = this.#generateChecksum(sitemap.entities);
        if (sitemap.checksum !== currentChecksum) {
            errors.push('Checksum не совпадает - возможна corruption данных');
        }

        if (errors.length > 0) {
            throw new Error(`Ошибки валидации универсального sitemap: ${errors.join(', ')}`);
        }

        console.log('✅ Универсальный sitemap прошел валидацию');
    }

    async #saveUniversalSitemap() {
        if (!this.#currentSitemap) {
            console.warn('⚠️ Нет данных для сохранения универсального sitemap');
            return;
        }

        try {
            // Универсальное сохранение
            await this.#saveToUniversalStorage();
            await this.#downloadAsUniversalFile();
            
            console.log('💾 Универсальный sitemap сохранен');

            this.#dispatchUniversalEvent('sitemapSaved', {
                path: this.#config.sitemapPath,
                size: JSON.stringify(this.#currentSitemap).length,
                entities: Object.keys(this.#currentSitemap.entities).length,
                domain: this.#currentSitemap.domain
            });

        } catch (error) {
            console.error('❌ Ошибка сохранения универсального sitemap:', error);
            this.#dispatchUniversalEvent('sitemapSaveError', { 
                error: error.message,
                domain: this.#currentSitemap?.domain 
            });
        }
    }

    async #saveToUniversalStorage() {
        try {
            const domain = this.#currentSitemap.domain;
            const storageKey = `${this.#config.localStorageKey}_${domain}`;
            
            const data = {
                sitemap: this.#currentSitemap,
                timestamp: Date.now(),
                version: '3.0',
                domain
            };

            localStorage.setItem(storageKey, JSON.stringify(data));
            this.#stats.backupSize = JSON.stringify(data).length;

            console.log(`📦 Универсальный sitemap сохранен в localStorage для домена ${domain}`);
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить в localStorage:', error.message);
        }
    }

    async #downloadAsUniversalFile() {
        try {
            const domain = this.#currentSitemap.domain;
            const dataStr = JSON.stringify(this.#currentSitemap, null, 2);
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

        // Ограничиваем количество хранимых версий
        if (this.#versionHistory.length > this.#config.versioning.maxVersions) {
            this.#versionHistory = this.#versionHistory.slice(0, this.#config.versioning.maxVersions);
        }

        this.#stats.versionsCount = this.#versionHistory.length;

        this.#dispatchUniversalEvent('sitemapVersionCreated', {
            version: version,
            totalVersions: this.#versionHistory.length,
            domain: sitemap.domain
        });

        console.log(`🕰️ Сохранена версия универсального sitemap #${this.#versionHistory.length} для ${sitemap.domain}`);
    }

    async #restoreFromBackup() {
        try {
            const domain = window.location.hostname;
            const storageKey = `${this.#config.localStorageKey}_${domain}`;
            const backupData = localStorage.getItem(storageKey);
            
            if (!backupData) {
                console.warn(`⚠️ Backup не найден в localStorage для домена ${domain}`);
                return false;
            }

            const backup = JSON.parse(backupData);
            
            if (!backup.sitemap || !backup.timestamp) {
                throw new Error('Невалидный backup данные');
            }

            this.#currentSitemap = backup.sitemap;
            console.log(`🔙 Универсальный sitemap восстановлен из backup для ${domain}`);

            this.#dispatchUniversalEvent('backupRestored', {
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

    async #exportSitemap(format = 'json', options = {}) {
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
                    throw new Error(`Неподдерживаемый формат: ${format}`);
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
            console.error(`❌ Ошибка экспорта в ${format}:`, error);
            throw error;
        }
    }

    #exportAsUniversalJSON(options = {}) {
        const data = options.includeMetadata ? 
            this.#currentSitemap : 
            this.#currentSitemap.entities;

        return JSON.stringify(data, null, options.prettyPrint ? 2 : 0);
    }

    #exportAsUniversalCSV(options = {}) {
        const entities = this.#currentSitemap.entities;
        const headers = ['level', 'type', 'title', 'importance', 'parent', 'depth', 'domain'];
        const rows = [headers.join(',')];

        Object.values(entities).forEach(entity => {
            const row = headers.map(header => {
                let value = entity[header] ?? 
                          entity.metadata?.[header] ?? 
                          entity.hierarchy?.[header] ?? 
                          '';
                
                if (header === 'domain') {
                    value = this.#currentSitemap.domain;
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

    #exportAsUniversalYAML(options = {}) {
        const data = options.includeMetadata ? 
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

    #exportAsUniversalXML(options = {}) {
        const entities = this.#currentSitemap.entities;
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        Object.values(entities).forEach(entity => {
            xml += '  <url>\n';
            xml += `    <loc>https://${this.#currentSitemap.domain}/pages/${entity.level}.html</loc>\n`;
            xml += `    <lastmod>${entity.timestamps.updated ?? entity.timestamps.created}</lastmod>\n`;
            xml += `    <changefreq>weekly</changefreq>\n`;
            xml += `    <priority>${this.#getXMLPriority(entity)}</priority>\n`;
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
        return priorityMap[entity.type] ?? '0.5';
    }

    #handleUniversalPagesUpdate(updateInfo) {
        console.log(`🔄 Универсальное обновление: ${updateInfo.added?.length ?? 0} добавлено, ${updateInfo.removed?.length ?? 0} удалено`);

        if ((updateInfo.added?.length + updateInfo.removed?.length) > 0) {
            this.#dispatchUniversalEvent('sitemapUpdateRequired', { 
                reason: 'universal_pages_updated',
                domain: window.location.hostname
            });
        }
    }

    #handleDomainChange(domainInfo) {
        console.log(`🌐 Смена домена: ${domainInfo.from} → ${domainInfo.to}`);
        
        // Адаптация sitemap к новому домену
        if (this.#currentSitemap) {
            this.#currentSitemap.domain = domainInfo.to;
            this.#stats.domainsProcessed.add(domainInfo.to);
        }
    }

    #handleCrossDomainUpdate(backupData) {
        try {
            const backup = JSON.parse(backupData);
            if (backup.domain !== window.location.hostname) {
                console.log(`🔄 Кросс-доменное обновление от ${backup.domain}`);
                
                // Можно реализовать синхронизацию между доменами
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

    async #checkSitemapFreshness() {
        if (!this.#currentSitemap) return;

        const currentTime = Date.now();
        const sitemapTime = new Date(this.#currentSitemap.generated).getTime();
        const hoursDiff = (currentTime - sitemapTime) / (1000 * 60 * 60);

        if (hoursDiff > 24) {
            console.warn(`🕐 Универсальный sitemap устарел (${hoursDiff.toFixed(1)} часов), рекомендуется обновление`);
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
            console.error(`❌ Ошибка отправки универсального события ${eventName}:`, error);
        }
    }

    // Public Universal API
    getCurrentSitemap() {
        return this.#currentSitemap;
    }

    getEntity(level) {
        return this.#currentSitemap?.entities?.[level] ?? null;
    }

    getHierarchy() {
        return this.#currentSitemap?.hierarchy ?? null;
    }

    getStatistics() {
        return {
            sitemap: this.#stats,
            entities: this.#currentSitemap?.statistics ?? {},
            domains: Array.from(this.#stats.domainsProcessed)
        };
    }

    getVersionHistory() {
        return this.#versionHistory;
    }

    searchEntities(query, field = 'title') {
        if (!this.#currentSitemap) return [];

        const results = [];
        const searchTerm = query.toLowerCase();

        Object.values(this.#currentSitemap.entities).forEach(entity => {
            const value = entity[field] ?? entity.metadata?.[field] ?? '';
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

    getEntitiesByDomain(domain = null) {
        if (!this.#currentSitemap) return [];
        
        const targetDomain = domain ?? this.#currentSitemap.domain;
        return Object.values(this.#currentSitemap.entities).filter(
            entity => entity.metadata.domain === targetDomain
        );
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
        this.#currentSitemap = merged;

        return merged;
    }
}

// Универсальный Global API для любого домена
window.UniversalSitemapGenerator = SitemapGenerator;

// Universal Public API функции
window.UniversalGalaxySitemap = {
    // Получение данных
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

    // Универсальный поиск
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

    // Универсальный экспорт
    export: function(format = 'json', options = {}) {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.exportSitemap(format, options) : null;
    },

    // Универсальное управление
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

    // Кросс-доменные операции
    merge: function(sitemaps) {
        const generator = window.universalSitemapGenerator;
        return generator ? generator.mergeSitemaps(sitemaps) : null;
    },

    // Информация о домене
    getCurrentDomain: function() {
        return window.location.hostname;
    },

    getSupportedDomains: function() {
        const generator = window.universalSitemapGenerator;
        const stats = generator?.getStatistics();
        return stats?.domains ?? [window.location.hostname];
    }
};

console.log('✅ Универсальный модуль 3: Генерация sitemap и API загружены');

// Автоматическая универсальная инициализация
document.addEventListener('DOMContentLoaded', async function() {
    if (window.GalaxyMetaParser && window.metaParserInstance) {
        window.universalSitemapGenerator = new SitemapGenerator(window.metaParserInstance);
        await window.universalSitemapGenerator.init();
        
        console.log('🌐 Универсальная система sitemap готова к работе на любом домене');
    }
});
