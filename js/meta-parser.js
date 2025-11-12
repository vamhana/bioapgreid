class MetaCache {
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.accessOrder = [];
    }

    get(key) {
        if (this.cache.has(key)) {
            // Обновляем порядок доступа
            const index = this.accessOrder.indexOf(key);
            if (index > -1) {
                this.accessOrder.splice(index, 1);
            }
            this.accessOrder.push(key);
            return this.cache.get(key);
        }
        return null;
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            // Удаляем наименее используемый элемент
            const oldestKey = this.accessOrder.shift();
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(key, value);
        this.accessOrder.push(key);
    }

    delete(key) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    size() {
        return this.cache.size;
    }
}

class HierarchyBuilder {
    constructor(maxDepth = 10) {
        this.maxDepth = maxDepth;
    }

    build(entities) {
        const entityMap = new Map();
        const rootNodes = [];
        const orphanedNodes = [];

        // Создаем карту всех сущностей
        Object.values(entities).forEach(entity => {
            const entityNode = {
                ...entity,
                children: [],
                metadata: {
                    depth: 0,
                    isRoot: !entity.parent,
                    childCount: 0,
                    siblingIndex: 0,
                    totalDescendants: 0,
                    analytics: {
                        accessCount: 0,
                        lastAccessed: null,
                        averageParseTime: 0
                    }
                }
            };
            entityMap.set(entity.level, entityNode);
        });

        // Строим иерархию и вычисляем глубину
        Object.values(entities).forEach(entity => {
            const entityNode = entityMap.get(entity.level);
            
            if (entity.parent) {
                const parentNode = entityMap.get(entity.parent);
                
                if (parentNode) {
                    parentNode.children.push(entityNode);
                    parentNode.metadata.childCount++;
                    
                    // Обновляем глубину дочернего элемента
                    entityNode.metadata.depth = parentNode.metadata.depth + 1;
                    
                    // Проверяем максимальную глубину
                    if (entityNode.metadata.depth > this.maxDepth) {
                        console.warn(`⚠️ Превышена максимальная глубина иерархии: ${entity.level} (глубина ${entityNode.metadata.depth})`);
                    }
                } else {
                    // Родитель не найден - помечаем как orphaned
                    orphanedNodes.push(entityNode);
                    console.warn(`⚠️ Сиротская сущность: ${entity.level} (родитель ${entity.parent} не найден)`);
                }
            } else {
                // Корневая сущность
                rootNodes.push(entityNode);
            }
        });

        // Обрабатываем сиротские узлы - добавляем их как корневые
        orphanedNodes.forEach(orphan => {
            rootNodes.push(orphan);
            orphan.metadata.isRoot = true;
        });

        // Вычисляем дополнительные мета-данные
        this.calculateHierarchyMetadata(rootNodes);

        // Сортируем иерархию
        this.sortHierarchy(rootNodes);

        const stats = {
            total: entityMap.size,
            roots: rootNodes.length,
            orphans: orphanedNodes.length,
            maxDepth: Math.max(...Array.from(entityMap.values()).map(e => e.metadata.depth)),
            totalDescendants: rootNodes.reduce((sum, root) => sum + root.metadata.totalDescendants, 0)
        };

        console.log('🌳 Построена иерархия сущностей:', stats);

        return {
            roots: rootNodes,
            entities: entityMap,
            stats: stats
        };
    }

    calculateHierarchyMetadata(nodes) {
        nodes.forEach((node, index) => {
            node.metadata.siblingIndex = index;
            
            // Рекурсивно вычисляем общее количество потомков
            node.metadata.totalDescendants = node.children.reduce((total, child) => {
                return total + 1 + this.calculateHierarchyMetadata([child])[0];
            }, 0);
        });

        return nodes;
    }

    sortHierarchy(nodes) {
        // Сортируем по важности (high > medium > low), затем по уровню
        nodes.sort((a, b) => {
            const importanceOrder = { high: 3, medium: 2, low: 1 };
            const aImportance = importanceOrder[a.importance] || 1;
            const bImportance = importanceOrder[b.importance] || 1;
            
            if (bImportance !== aImportance) {
                return bImportance - aImportance;
            }
            
            return a.level.localeCompare(b.level);
        });

        // Рекурсивно сортируем детей
        nodes.forEach(node => {
            if (node.children.length > 0) {
                this.sortHierarchy(node.children);
            }
        });
    }
}

class GalaxyMetaParser {
    constructor(app) {
        this.app = app;
        this.cache = new MetaCache(100);
        this.entityCache = new MetaCache(100);
        this.hierarchyCache = null;
        this.pageManifest = null;
        
        // Конфигурация v2.1
        this.config = {
            maxRetries: 3,
            cacheTTL: 5 * 60 * 1000, // 5 минут
            requestTimeout: 10000,
            maxHierarchyDepth: 10,
            supportedEntityTypes: ['planet', 'moon', 'asteroid', 'debris', 'blackhole', 'star', 'nebula', 'station', 'gateway', 'anomaly'],
            circuitBreaker: {
                failureThreshold: 5,
                resetTimeout: 30000
            },
            predictiveLoading: {
                enabled: true,
                depth: 2
            }
        };

        this.requiredMetaTags = ['level', 'type', 'title'];
        this.optionalMetaTags = [
            'parent', 'orbit-radius', 'orbit-angle', 'color', 
            'size-modifier', 'importance', 'description', 'icon', 'unlocked',
            'tags', 'depth', 'created', 'updated', 'content-priority', 'analytics-category'
        ];

        // Статистика v2.1
        this.stats = {
            totalParsed: 0,
            cacheHits: 0,
            errors: 0,
            lastParseTime: 0,
            circuitBreakerState: 'CLOSED',
            predictiveHits: 0
        };

        this.circuitBreaker = {
            failures: 0,
            lastFailure: 0,
            state: 'CLOSED'
        };

        this.hierarchyBuilder = new HierarchyBuilder(this.config.maxHierarchyDepth);
    }

    async init() {
        console.log('🔍 Инициализация GalaxyMetaParser v2.1...');
        
        try {
            // Загрузка манифеста страниц если доступен
            await this.loadPageManifest();
            
            this.setupEventListeners();
            this.setupCacheCleanup();
            this.setupPredictiveLoading();
            this.integrateWithContentManager();
            
            console.log('✅ GalaxyMetaParser v2.1 инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации GalaxyMetaParser:', error);
            this.handleCircuitBreakerError();
            throw error;
        }
    }

    async loadPageManifest() {
        if (this.circuitBreaker.state === 'OPEN') {
            console.warn('⚠️ Circuit breaker открыт, пропускаем загрузку манифеста');
            return;
        }

        try {
            const response = await fetch('/sitemap.json');
            if (response.ok) {
                this.pageManifest = await response.json();
                console.log(`📋 Загружен манифест с ${this.pageManifest.pages?.length || 0} страницами`);
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить манифест страниц:', error.message);
            this.handleCircuitBreakerError();
        }
    }

    setupEventListeners() {
        document.addEventListener('parseMetaData', (event) => {
            this.parseAllPages(event.detail.pageUrls);
        });

        document.addEventListener('rebuildHierarchy', (event) => {
            this.rebuildHierarchy(event.detail.entities);
        });

        document.addEventListener('updateEntityMetadata', (event) => {
            this.updateEntityMetadata(event.detail.levelId, event.detail.updates);
        });

        document.addEventListener('clearMetaCache', () => {
            this.clearCache();
        });

        // События v2.1
        document.addEventListener('predictiveLoadRequest', (event) => {
            this.handlePredictiveLoad(event.detail);
        });

        document.addEventListener('contentManagerReady', () => {
            this.integrateWithContentManager();
        });
    }

    setupCacheCleanup() {
        // Периодическая очистка устаревшего кэша
        setInterval(() => {
            this.cleanupExpiredCache();
        }, this.config.cacheTTL);
    }

    setupPredictiveLoading() {
        if (!this.config.predictiveLoading.enabled) return;

        // Слушаем события навигации для предиктивной загрузки
        document.addEventListener('navigationChanged', (event) => {
            this.schedulePredictiveLoading(event.detail.currentLevel);
        });
    }

    integrateWithContentManager() {
        // Интеграция с ContentManager v2.1
        if (window.ContentManager) {
            console.log('🔄 Интеграция с ContentManager v2.1');
            
            // Передаем данные о контенте в ContentManager
            document.addEventListener('metaParsingCompleted', (event) => {
                if (window.ContentManager && window.ContentManager.analyzeContentStructure) {
                    window.ContentManager.analyzeContentStructure(event.detail.entities);
                }
            });
        }
    }

    cleanupExpiredCache() {
        const now = Date.now();
        let cleanedCount = 0;

        // Очищаем только entity cache, MetaCache сам управляет размером
        for (const [url, cached] of this.cache.cache.entries()) {
            if (now - cached.timestamp > this.config.cacheTTL) {
                this.cache.delete(url);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Очищено ${cleanedCount} устаревших записей кэша`);
        }
    }

    handleCircuitBreakerError() {
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = Date.now();

        if (this.circuitBreaker.failures >= this.config.circuitBreaker.failureThreshold) {
            this.circuitBreaker.state = 'OPEN';
            this.stats.circuitBreakerState = 'OPEN';
            console.warn('🚨 Circuit breaker открыт из-за множественных ошибок');
            
            // Автоматическое восстановление через resetTimeout
            setTimeout(() => {
                this.circuitBreaker.state = 'HALF_OPEN';
                this.circuitBreaker.failures = 0;
                this.stats.circuitBreakerState = 'HALF_OPEN';
                console.log('🔄 Circuit breaker переходит в HALF_OPEN состояние');
            }, this.config.circuitBreaker.resetTimeout);
        }
    }

    handleCircuitBreakerSuccess() {
        if (this.circuitBreaker.state === 'HALF_OPEN') {
            this.circuitBreaker.state = 'CLOSED';
            this.stats.circuitBreakerState = 'CLOSED';
            console.log('✅ Circuit breaker закрыт - операции восстановлены');
        }
        this.circuitBreaker.failures = 0;
    }

    async parseAllPages(pageUrls = null) {
        if (this.circuitBreaker.state === 'OPEN') {
            console.warn('⚠️ Circuit breaker открыт, пропускаем парсинг');
            return this.hierarchyCache || this.getFallbackHierarchy();
        }

        const startTime = performance.now();
        
        try {
            this.dispatchEvent('metaParsingStarted', { 
                timestamp: Date.now(),
                pageCount: pageUrls?.length || 'auto',
                circuitBreakerState: this.circuitBreaker.state
            });

            // Если URLs не предоставлены, автоматически обнаруживаем страницы
            const urls = pageUrls || await this.discoverPageUrls();
            
            if (urls.length === 0) {
                throw new Error('Не найдено страниц для парсинга');
            }

            console.log(`📄 Найдено ${urls.length} страниц для парсинга`);

            const results = {};
            const parsingPromises = urls.map(url => this.parsePageMeta(url));
            const parsedPages = await Promise.allSettled(parsingPromises);

            // Обрабатываем результаты
            let successCount = 0;
            let errorCount = 0;

            parsedPages.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const meta = result.value;
                    results[meta.level] = meta;
                    successCount++;
                } else {
                    console.error(`❌ Ошибка парсинга ${urls[index]}:`, result.reason);
                    errorCount++;
                    this.dispatchEvent('metaParsingError', {
                        url: urls[index],
                        error: result.reason.message,
                        critical: false
                    });
                }
            });

            // Строим иерархию
            const hierarchy = this.buildEntityHierarchy(results);
            this.hierarchyCache = hierarchy;
            
            const parseTime = performance.now() - startTime;

            this.stats.totalParsed += successCount;
            this.stats.errors += errorCount;
            this.stats.lastParseTime = parseTime;

            // Успешная операция - сбрасываем circuit breaker
            this.handleCircuitBreakerSuccess();

            this.dispatchEvent('metaParsingCompleted', {
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

            this.dispatchEvent('hierarchyBuilt', { 
                hierarchy,
                entityCount: Object.keys(results).length
            });

            // Сбор аналитики v2.1
            this.collectAnalytics('parse_completed', {
                entityCount: Object.keys(results).length,
                parseTime: parseTime
            });

            console.log(`✅ Парсинг завершен: ${successCount} успешно, ${errorCount} ошибок за ${parseTime.toFixed(2)}мс`);

            return hierarchy;

        } catch (error) {
            const errorTime = performance.now() - startTime;
            console.error('💥 Ошибка при парсинге всех страниц:', error);
            
            this.handleCircuitBreakerError();
            
            this.dispatchEvent('metaParsingError', { 
                error: error.message,
                critical: true,
                parseTime: errorTime
            });
            
            // Попытка использовать кэшированную иерархию как fallback
            if (this.hierarchyCache) {
                console.warn('🔄 Использование кэшированной иерархии как fallback');
                return this.hierarchyCache;
            }
            
            return this.getFallbackHierarchy();
        }
    }

    getFallbackHierarchy() {
        console.warn('🔄 Использование fallback иерархии');
        const fallbackEntities = {
            'filosofiya': {
                level: 'filosofiya',
                type: 'star',
                title: 'Философия',
                importance: 'high',
                unlocked: true,
                color: '#FFD700'
            }
        };
        return this.buildEntityHierarchy(fallbackEntities);
    }

    async discoverPageUrls() {
        // Приоритет 1: Используем манифест если доступен
        if (this.pageManifest?.pages) {
            const urls = this.pageManifest.pages.map(page => 
                `/pages/${page.level}.html` // Предполагаемая структура URL
            );
            console.log(`📋 Использование ${urls.length} URL из манифеста`);
            return urls;
        }

        // Приоритет 2: Автоматическое обнаружение через API или статический список
        const knownPages = [
            'pages/filosofiya.html',
            'pages/diagnostika.html',
            'pages/regeneraciya.html',
            'pages/optimizaciya.html',
            'pages/kriokonservaciya.html',
            'pages/gennaya-inzheneriya.html',
            'pages/neyrointerfeys.html',
            'pages/singularnost.html'
        ];

        // Фильтруем только существующие страницы
        const existingPages = [];
        const checkPromises = knownPages.map(async (pageUrl) => {
            if (await this.checkPageExists(pageUrl)) {
                existingPages.push(pageUrl);
            }
        });

        await Promise.all(checkPromises);

        console.log(`🔍 Авто-обнаружение: ${existingPages.length} из ${knownPages.length} страниц существуют`);
        return existingPages;
    }

    async checkPageExists(url) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

            const response = await fetch(url, { 
                method: 'HEAD',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok;
        } catch {
            return false;
        }
    }

    async parsePageMeta(pageUrl) {
        // Проверяем кэш
        const cached = this.cache.get(pageUrl);
        if (cached && (Date.now() - cached.timestamp < this.config.cacheTTL)) {
            this.stats.cacheHits++;
            return cached.data;
        }

        try {
            const response = await this.fetchWithRetry(pageUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            const metaTags = this.extractMetaTags(html, pageUrl);
            
            // Валидация обязательных полей
            this.validateMetaTags(metaTags, pageUrl);
            
            // Автозаполнение недостающих данных
            const completeEntity = this.generateMissingData(metaTags, pageUrl);
            
            // Дополнительная валидация структуры
            this.validateEntityStructure(completeEntity);

            // Обогащаем entity дополнительными мета-данными v2.1
            const enrichedEntity = this.enrichEntityData(completeEntity, pageUrl);

            // Сохраняем в кэш
            this.cache.set(pageUrl, {
                data: enrichedEntity,
                timestamp: Date.now()
            });
            
            this.entityCache.set(enrichedEntity.level, enrichedEntity);

            console.log(`✅ Успешно распаршена: ${pageUrl} → ${enrichedEntity.title} (${enrichedEntity.type})`);
            return enrichedEntity;

        } catch (error) {
            console.error(`❌ Ошибка парсинга ${pageUrl}:`, error);
            
            // Сохраняем информацию об ошибке в кэш чтобы избежать повторных попыток
            this.cache.set(pageUrl, {
                data: null,
                timestamp: Date.now(),
                error: error.message
            });
            
            throw error;
        }
    }

    async fetchWithRetry(url, maxRetries = this.config.maxRetries) {
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
                
                await this.delay(Math.pow(2, attempt) * 1000); // Экспоненциальная задержка
            } catch (error) {
                if (attempt === maxRetries) throw error;
                await this.delay(Math.pow(2, attempt) * 1000);
            }
        }
    }

    extractMetaTags(html, pageUrl) {
        const metaTags = {};
        const parser = new DOMParser();
        
        try {
            const doc = parser.parseFromString(html, 'text/html');

            // Извлекаем все meta-теги с name начинающимся на "galaxy:"
            const metaElements = doc.querySelectorAll('meta[name^="galaxy:"]');
            
            metaElements.forEach(meta => {
                const name = meta.getAttribute('name').replace('galaxy:', '');
                const content = meta.getAttribute('content');
                
                if (name && content !== null) {
                    metaTags[name] = content.trim();
                }
            });

            // Также извлекаем title страницы как fallback
            if (!metaTags.title) {
                const titleElement = doc.querySelector('title');
                if (titleElement) {
                    metaTags.title = titleElement.textContent.trim();
                }
            }

            // Извлекаем описание из meta description
            if (!metaTags.description) {
                const descriptionMeta = doc.querySelector('meta[name="description"]');
                if (descriptionMeta) {
                    metaTags.description = descriptionMeta.getAttribute('content');
                }
            }

        } catch (error) {
            console.warn(`⚠️ Ошибка парсинга HTML для ${pageUrl}:`, error.message);
        }

        return metaTags;
    }

    validateMetaTags(metaTags, pageUrl) {
        const missingRequired = this.requiredMetaTags.filter(tag => !metaTags[tag]);
        
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
        if (metaTags.level && !this.isValidLevelFormat(metaTags.level)) {
            throw new Error(`Некорректный формат уровня: ${metaTags.level} в ${pageUrl}`);
        }

        if (metaTags['orbit-radius'] && isNaN(parseFloat(metaTags['orbit-radius']))) {
            throw new Error(`Некорректный радиус орбиты: ${metaTags['orbit-radius']} в ${pageUrl}`);
        }

        if (metaTags['orbit-angle'] && isNaN(parseFloat(metaTags['orbit-angle']))) {
            throw new Error(`Некорректный угол орбиты: ${metaTags['orbit-angle']} в ${pageUrl}`);
        }

        if (metaTags.color && !this.isValidColor(metaTags.color)) {
            throw new Error(`Некорректный формат цвета: ${metaTags.color} в ${pageUrl}`);
        }
    }

    isValidLevelFormat(level) {
        return typeof level === 'string' && level.length > 0 && level.match(/^[a-zA-Z0-9_-]+$/);
    }

    isValidColor(color) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color) || 
               /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(color) ||
               /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i.test(color);
    }

    generateMissingData(metaTags, pageUrl) {
        const entity = { ...metaTags };
        
        // Автозаполнение orbit-radius на основе типа
        if (!entity['orbit-radius']) {
            entity['orbit-radius'] = this.getDefaultOrbitRadius(entity.type);
        }

        // Автозаполнение orbit-angle если не указан
        if (!entity['orbit-angle']) {
            entity['orbit-angle'] = this.calculateAutoAngle(entity);
        }

        // Автозаполнение цвета если не указан
        if (!entity.color) {
            entity.color = this.generateColorByType(entity.type);
        }

        // Автозаполнение importance если не указан
        if (!entity.importance) {
            entity.importance = this.calculateImportance(entity);
        }

        // Автозаполнение description если не указан
        if (!entity.description) {
            entity.description = `Раздел "${entity.title}" в галактике GENOФОНД`;
        }

        // Автозаполнение icon если не указан
        if (!entity.icon) {
            entity.icon = this.getIconByType(entity.type);
        }

        // Автозаполнение content-priority если не указан (v2.1)
        if (!entity['content-priority']) {
            entity['content-priority'] = this.calculateContentPriority(entity);
        }

        // Автозаполнение analytics-category если не указан (v2.1)
        if (!entity['analytics-category']) {
            entity['analytics-category'] = this.getAnalyticsCategory(entity.type);
        }

        // Конвертация числовых значений
        if (entity['orbit-radius']) {
            entity['orbit-radius'] = parseFloat(entity['orbit-radius']);
        }
        if (entity['orbit-angle']) {
            entity['orbit-angle'] = parseFloat(entity['orbit-angle']);
        }
        if (entity['size-modifier']) {
            entity['size-modifier'] = parseFloat(entity['size-modifier']);
        }

        // Преобразование unlocked в boolean
        if (entity.unlocked !== undefined) {
            entity.unlocked = entity.unlocked === 'true';
        } else {
            entity.unlocked = true; // По умолчанию разблокировано
        }

        // Обработка тегов
        if (entity.tags && typeof entity.tags === 'string') {
            entity.tags = entity.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        } else {
            entity.tags = [];
        }

        return entity;
    }

    enrichEntityData(entity, pageUrl) {
        return {
            ...entity,
            metadata: {
                sourceUrl: pageUrl,
                parsedAt: new Date().toISOString(),
                version: '2.1',
                cacheKey: this.generateCacheKey(entity.level),
                predictiveScore: 0,
                ...entity.metadata
            },
            // Добавляем совместимость с AdaptivePositioning и системами v2.1
            position: entity.position || { x: 0, y: 0 },
            id: entity.level,
            // v2.1 расширения
            analytics: {
                parseCount: 0,
                lastAccess: null,
                averageLoadTime: 0
            }
        };
    }

    generateCacheKey(level) {
        return `meta_v2.1_${level}_${Date.now().toString(36)}`;
    }

    getDefaultOrbitRadius(type) {
        const defaultRadii = {
            'star': 0,
            'planet': 150,
            'moon': 60,
            'asteroid': 40,
            'debris': 20,
            'blackhole': 200,
            'nebula': 250,
            'station': 80,
            'gateway': 120,
            'anomaly': 180
        };
        return defaultRadii[type] || 100;
    }

    getIconByType(type) {
        const icons = {
            'star': '⭐',
            'planet': '🪐',
            'moon': '🌙',
            'asteroid': '☄️',
            'debris': '🛰️',
            'blackhole': '🌀',
            'nebula': '🌌',
            'station': '🚀',
            'gateway': '🌐',
            'anomaly': '💫'
        };
        return icons[type] || '🔮';
    }

    calculateAutoAngle(entity) {
        // Базовый угол на основе хеша уровня для детерминированности
        let hash = 0;
        for (let i = 0; i < entity.level.length; i++) {
            hash = ((hash << 5) - hash) + entity.level.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash) % 360;
    }

    generateColorByType(type) {
        const colorMap = {
            'star': '#FFD700',
            'planet': '#4ECDC4',
            'moon': '#C7F464',
            'asteroid': '#FF6B6B',
            'debris': '#A8E6CF',
            'blackhole': '#2C3E50',
            'nebula': '#D4A5FF',
            'station': '#FFD166',
            'gateway': '#9B5DE5',
            'anomaly': '#00BBF9'
        };
        return colorMap[type] || this.generateRandomColor();
    }

    generateRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 60%)`;
    }

    calculateImportance(entity) {
        // Эвристика для определения важности
        if (entity.type === 'star' || entity.type === 'blackhole') return 'high';
        if (entity.type === 'planet' || entity.type === 'nebula' || entity.type === 'gateway') return 'medium';
        return 'low';
    }

    calculateContentPriority(entity) {
        // Эвристика для приоритета контента (v2.1)
        if (entity.type === 'star') return 'critical';
        if (entity.importance === 'high') return 'high';
        if (entity.importance === 'medium') return 'medium';
        return 'low';
    }

    getAnalyticsCategory(type) {
        // Категории для аналитики (v2.1)
        const categories = {
            'star': 'core',
            'planet': 'primary',
            'moon': 'secondary',
            'asteroid': 'supplementary',
            'debris': 'supplementary',
            'blackhole': 'special',
            'nebula': 'special',
            'station': 'interactive',
            'gateway': 'navigation',
            'anomaly': 'special'
        };
        return categories[type] || 'general';
    }

    validateEntityStructure(entity) {
        // Проверка на циклические зависимости
        this.checkCircularDependencies(entity);

        // Проверка корректности орбитальных параметров
        if (entity['orbit-radius'] < 0) {
            throw new Error(`Отрицательный радиус орбиты: ${entity['orbit-radius']} для ${entity.title}`);
        }

        if (entity['orbit-radius'] > 1000) {
            console.warn(`⚠️ Слишком большой радиус орбиты: ${entity['orbit-radius']} для ${entity.title}`);
        }

        // Проверка допустимых значений угла
        if (entity['orbit-angle'] < 0 || entity['orbit-angle'] >= 360) {
            console.warn(`⚠️ Угол орбиты вне диапазона 0-360: ${entity['orbit-angle']} для ${entity.title}`);
        }
    }

    checkCircularDependencies(entity) {
        if (!entity.parent) return;

        const visited = new Set([entity.level]);
        let current = entity;
        
        while (current && current.parent) {
            if (visited.has(current.parent)) {
                throw new Error(`Обнаружена циклическая зависимость: ${current.level} -> ${current.parent}`);
            }
            
            visited.add(current.parent);
            const parentEntity = this.entityCache.get(current.parent);
            
            if (!parentEntity) break; // Родитель еще не загружен
            current = parentEntity;
        }
    }

    buildEntityHierarchy(entities) {
        return this.hierarchyBuilder.build(entities);
    }

    rebuildHierarchy(entities) {
        console.log('🔄 Перестроение иерархии сущностей...');
        
        // Очищаем кэш иерархии, но сохраняем кэш сущностей
        this.hierarchyCache = null;
        
        return this.buildEntityHierarchy(entities);
    }

    updateEntityMetadata(levelId, updates) {
        const entity = this.entityCache.get(levelId);
        if (!entity) {
            throw new Error(`Сущность с level ${levelId} не найдена`);
        }

        // Применяем обновления
        Object.assign(entity, updates);
        
        // Помечаем кэш как невалидный
        this.hierarchyCache = null;
        
        console.log(`✏️ Обновлены мета-данные для ${levelId}`);

        this.dispatchEvent('entityMetadataUpdated', {
            levelId,
            updates,
            entity
        });

        return entity;
    }

    // Predictive Loading v2.1
    schedulePredictiveLoading(currentLevel) {
        if (!this.config.predictiveLoading.enabled) return;

        setTimeout(() => {
            this.performPredictiveLoading(currentLevel);
        }, 100); // Небольшая задержка для приоритизации текущего контента
    }

    performPredictiveLoading(currentLevel) {
        const currentEntity = this.entityCache.get(currentLevel);
        if (!currentEntity) return;

        const toPreload = this.findEntitiesToPreload(currentEntity);
        
        if (toPreload.length > 0) {
            console.log(`🎯 Предиктивная загрузка: ${toPreload.length} сущностей`);
            
            this.dispatchEvent('predictiveLoadScheduled', {
                source: currentLevel,
                targets: toPreload,
                depth: this.config.predictiveLoading.depth
            });

            toPreload.forEach(entityId => {
                this.preloadEntity(entityId);
            });

            this.stats.predictiveHits++;
        }
    }

    findEntitiesToPreload(entity, depth = 0) {
        if (depth >= this.config.predictiveLoading.depth) return [];

        const toPreload = [];
        
        // Предзагружаем детей текущей сущности
        if (entity.children) {
            entity.children.forEach(child => {
                toPreload.push(child.level);
                toPreload.push(...this.findEntitiesToPreload(child, depth + 1));
            });
        }

        // Предзагружаем соседей
        if (entity.parent) {
            const parent = this.entityCache.get(entity.parent);
            if (parent && parent.children) {
                parent.children.forEach(sibling => {
                    if (sibling.level !== entity.level) {
                        toPreload.push(sibling.level);
                    }
                });
            }
        }

        return [...new Set(toPreload)]; // Уникальные значения
    }

    preloadEntity(entityId) {
        const entity = this.entityCache.get(entityId);
        if (!entity) return;

        // Обновляем predictive score
        if (!entity.metadata.predictiveScore) {
            entity.metadata.predictiveScore = 0;
        }
        entity.metadata.predictiveScore++;

        this.dispatchEvent('entityPreloadInitiated', {
            entityId: entityId,
            predictiveScore: entity.metadata.predictiveScore
        });
    }

    handlePredictiveLoad(request) {
        const { entityId, priority } = request;
        this.preloadEntity(entityId);
    }

    // Analytics v2.1
    collectAnalytics(eventType, data) {
        const analyticsData = {
            eventType,
            timestamp: Date.now(),
            parserVersion: '2.1',
            circuitBreakerState: this.circuitBreaker.state,
            cacheStats: {
                size: this.cache.size(),
                entitySize: this.entityCache.size()
            },
            ...data
        };

        this.dispatchEvent('metaAnalyticsCollected', analyticsData);

        // Интеграция с системой аналитики App v2.1
        if (this.app && this.app.recordAnalytics) {
            this.app.recordAnalytics('meta_parser', analyticsData);
        }
    }

    // Public API v2.1
    getEntity(levelId) {
        return this.entityCache.get(levelId);
    }

    getAllEntities() {
        return Array.from(this.entityCache.cache.values()).map(item => item.data);
    }

    getCurrentHierarchy() {
        return this.hierarchyCache;
    }

    getTotalPlanets() {
        return this.getAllEntities().filter(entity => 
            entity.type === 'planet'
        ).length;
    }

    getPredictiveCandidates() {
        return this.getAllEntities()
            .filter(entity => entity.metadata.predictiveScore > 0)
            .sort((a, b) => b.metadata.predictiveScore - a.metadata.predictiveScore);
    }

    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size(),
            entityCacheSize: this.entityCache.size(),
            hierarchyCache: !!this.hierarchyCache,
            predictiveCandidates: this.getPredictiveCandidates().length
        };
    }

    clearCache() {
        this.cache.clear();
        this.entityCache.clear();
        this.hierarchyCache = null;
        this.stats.cacheHits = 0;
        
        console.log('🧹 Кэш мета-парсера полностью очищен');
        
        this.dispatchEvent('metaCacheCleared', {
            timestamp: Date.now()
        });
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

    // Методы жизненного цикла v2.1
    async start() {
        console.log('🔍 GalaxyMetaParser v2.1 запущен');
        return Promise.resolve();
    }

    async recover() {
        console.log('🔄 Восстановление GalaxyMetaParser v2.1...');
        
        // Сохраняем статистику, но очищаем проблемный кэш
        const savedStats = { ...this.stats };
        this.clearCache();
        this.stats = savedStats;
        this.circuitBreaker.state = 'HALF_OPEN';
        
        console.log('✅ GalaxyMetaParser v2.1 восстановлен');
        return true;
    }

    destroy() {
        console.log('🧹 Очистка GalaxyMetaParser v2.1...');
        
        this.clearCache();
        this.pageManifest = null;
        this.circuitBreaker.state = 'CLOSED';
        
        console.log('✅ GalaxyMetaParser v2.1 очищен');
    }
}

// Глобальная доступность для инициализации
window.GalaxyMetaParser = GalaxyMetaParser;
