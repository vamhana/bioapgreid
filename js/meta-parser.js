class GalaxyMetaParser {
    constructor(app) {
        this.app = app;
        this.cache = new Map();
        this.entityCache = new Map();
        this.requiredMetaTags = ['level', 'type', 'title'];
        this.optionalMetaTags = [
            'parent', 'orbit-radius', 'orbit-angle', 'color', 
            'size-modifier', 'importance', 'description', 'icon', 'unlocked'
        ];
    }

    async init() {
        console.log('🔍 Инициализация GalaxyMetaParser...');
        this.setupEventListeners();
        return Promise.resolve();
    }

    setupEventListeners() {
        document.addEventListener('parseMetaData', (event) => {
            this.parseAllPages(event.detail.pageUrls);
        });

        document.addEventListener('rebuildHierarchy', (event) => {
            this.rebuildHierarchy(event.detail.entities);
        });
    }

    async parseAllPages(pageUrls = null) {
        try {
            this.dispatchEvent('metaParsingStarted', { timestamp: Date.now() });

            // Если URLs не предоставлены, автоматически обнаруживаем страницы
            const urls = pageUrls || await this.discoverPageUrls();
            console.log(`📄 Найдено ${urls.length} страниц для парсинга`);

            const results = {};
            const parsingPromises = urls.map(url => this.parsePageMeta(url));
            const parsedPages = await Promise.allSettled(parsingPromises);

            // Обрабатываем успешные парсинги
            parsedPages.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const meta = result.value;
                    results[meta.level] = meta;
                } else {
                    console.error(`❌ Ошибка парсинга ${urls[index]}:`, result.reason);
                    this.dispatchEvent('metaParsingError', {
                        url: urls[index],
                        error: result.reason.message
                    });
                }
            });

            // Строим иерархию
            const hierarchy = this.buildEntityHierarchy(results);
            
            this.dispatchEvent('metaParsingCompleted', {
                entities: results,
                hierarchy: hierarchy,
                totalPages: urls.length,
                successfulParses: Object.keys(results).length
            });

            this.dispatchEvent('hierarchyBuilt', { hierarchy });

            return hierarchy;

        } catch (error) {
            console.error('💥 Ошибка при парсинге всех страниц:', error);
            this.dispatchEvent('metaParsingError', { 
                error: error.message,
                critical: true 
            });
            throw error;
        }
    }

    async discoverPageUrls() {
        // Автоматическое обнаружение страниц в папке pages/
        // В реальной реализации это может быть AJAX запрос к серверу
        // или чтение из предварительно сгенерированного manifest файла
        
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
        for (const pageUrl of knownPages) {
            if (await this.checkPageExists(pageUrl)) {
                existingPages.push(pageUrl);
            }
        }

        return existingPages;
    }

    async checkPageExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    }

    async parsePageMeta(pageUrl) {
        // Проверяем кэш
        if (this.cache.has(pageUrl)) {
            return this.cache.get(pageUrl);
        }

        try {
            const response = await this.fetchWithRetry(pageUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            const metaTags = this.extractMetaTags(html);
            
            // Валидация обязательных полей
            this.validateMetaTags(metaTags, pageUrl);
            
            // Автозаполнение недостающих данных
            const completeEntity = this.generateMissingData(metaTags);
            
            // Дополнительная валидация структуры
            this.validateEntityStructure(completeEntity);

            // Сохраняем в кэш
            this.cache.set(pageUrl, completeEntity);
            this.entityCache.set(completeEntity.level, completeEntity);

            console.log(`✅ Успешно распаршена: ${pageUrl} → ${completeEntity.title}`);
            return completeEntity;

        } catch (error) {
            console.error(`❌ Ошибка парсинга ${pageUrl}:`, error);
            throw error;
        }
    }

    async fetchWithRetry(url, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url);
                if (response.ok) return response;
                
                if (attempt === maxRetries) {
                    throw new Error(`Не удалось загрузить ${url} после ${maxRetries} попыток`);
                }
                
                await this.delay(Math.pow(2, attempt) * 1000); // Экспоненциальная задержка
            } catch (error) {
                if (attempt === maxRetries) throw error;
                await this.delay(Math.pow(2, attempt) * 1000);
            }
        }
    }

    extractMetaTags(html) {
        const metaTags = {};
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Извлекаем все meta-теги с name начинающимся на "galaxy:"
        const metaElements = doc.querySelectorAll('meta[name^="galaxy:"]');
        
        metaElements.forEach(meta => {
            const name = meta.getAttribute('name').replace('galaxy:', '');
            const content = meta.getAttribute('content');
            metaTags[name] = content;
        });

        // Также извлекаем title страницы как fallback
        if (!metaTags.title) {
            const titleElement = doc.querySelector('title');
            if (titleElement) {
                metaTags.title = titleElement.textContent;
            }
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

        // Валидация форматов
        if (metaTags.level && !metaTags.level.match(/^level\d+$/)) {
            throw new Error(`Некорректный формат уровня: ${metaTags.level} в ${pageUrl}`);
        }

        if (metaTags['orbit-radius'] && isNaN(parseFloat(metaTags['orbit-radius']))) {
            throw new Error(`Некорректный радиус орбиты: ${metaTags['orbit-radius']} в ${pageUrl}`);
        }

        if (metaTags['orbit-angle'] && isNaN(parseFloat(metaTags['orbit-angle']))) {
            throw new Error(`Некорректный угол орбиты: ${metaTags['orbit-angle']} в ${pageUrl}`);
        }
    }

    generateMissingData(metaTags) {
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
            entity.color = this.generateColorByLevel(entity.level);
        }

        // Автозаполнение importance если не указан
        if (!entity.importance) {
            entity.importance = 'medium';
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
        }

        return entity;
    }

    getDefaultOrbitRadius(type) {
        const defaultRadii = {
            'planet': 150,
            'moon': 60,
            'asteroid': 40,
            'debris': 20,
            'blackhole': 200
        };
        return defaultRadii[type] || 100;
    }

    calculateAutoAngle(entity) {
        // Простая эвристика для автоматического расчета угла
        if (entity.parent) {
            // Для дочерних элементов - равномерное распределение вокруг родителя
            const siblings = this.getSiblingCount(entity.parent);
            return (360 / Math.max(1, siblings)) * siblings;
        } else {
            // Для корневых элементов - равномерное распределение по кругу
            const rootEntities = this.getRootEntitiesCount();
            return (360 / Math.max(1, rootEntities)) * rootEntities;
        }
    }

    getSiblingCount(parentLevel) {
        // В реальной реализации нужно посчитать количество сущностей с тем же parent
        // Пока возвращаем фиктивное значение
        return 3;
    }

    getRootEntitiesCount() {
        // В реальной реализации нужно посчитать корневые сущности
        // Пока возвращаем фиктивное значение
        return 8;
    }

    generateColorByLevel(level) {
        const colorMap = {
            'level0': '#4ECDC4',
            'level1': '#C7F464', 
            'level2': '#FF6B6B',
            'level3': '#FFA5A5',
            'level4': '#A8E6CF',
            'level5': '#D4A5FF',
            'level6': '#FFD166',
            'level7': '#06D6A0'
        };
        return colorMap[level] || this.generateRandomColor();
    }

    generateRandomColor() {
        return '#' + Math.floor(Math.random()*16777215).toString(16);
    }

    validateEntityStructure(entity) {
        // Проверка на циклические зависимости
        this.checkCircularDependencies(entity);

        // Проверка корректности орбитальных параметров
        if (entity['orbit-radius'] < 10) {
            console.warn(`⚠️ Слишком маленький радиус орбиты: ${entity['orbit-radius']} для ${entity.title}`);
        }

        if (entity['orbit-radius'] > 500) {
            console.warn(`⚠️ Слишком большой радиус орбиты: ${entity['orbit-radius']} для ${entity.title}`);
        }
    }

    checkCircularDependencies(entity) {
        if (!entity.parent) return;

        const visited = new Set();
        let current = entity;
        
        while (current && current.parent) {
            if (visited.has(current.level)) {
                throw new Error(`Обнаружена циклическая зависимость: ${current.level}`);
            }
            visited.add(current.level);
            
            const parentEntity = this.entityCache.get(current.parent);
            if (!parentEntity) break;
            
            current = parentEntity;
        }
    }

    buildEntityHierarchy(entities) {
        const entityMap = new Map();
        const tree = [];

        // Создаем карту всех сущностей
        Object.values(entities).forEach(entity => {
            entityMap.set(entity.level, { 
                ...entity, 
                children: [],
                metadata: {
                    depth: 0,
                    isRoot: !entity.parent,
                    childCount: 0
                }
            });
        });

        // Строим иерархию
        Object.values(entities).forEach(entity => {
            const entityNode = entityMap.get(entity.level);
            
            if (entity.parent && entityMap.has(entity.parent)) {
                const parentNode = entityMap.get(entity.parent);
                parentNode.children.push(entityNode);
                parentNode.metadata.childCount++;
                
                // Обновляем глубину дочернего элемента
                entityNode.metadata.depth = parentNode.metadata.depth + 1;
            } else if (!entity.parent) {
                tree.push(entityNode);
            } else {
                console.warn(`⚠️ Родительская сущность не найдена: ${entity.parent} для ${entity.level}`);
                tree.push(entityNode); // Добавляем как корневую, если родитель не найден
            }
        });

        // Сортируем дерево по важности и уровню
        this.sortHierarchy(tree);

        console.log('🌳 Построена иерархия сущностей:', {
            total: entityMap.size,
            roots: tree.length,
            maxDepth: Math.max(...Array.from(entityMap.values()).map(e => e.metadata.depth))
        });

        return tree;
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

    rebuildHierarchy(entities) {
        console.log('🔄 Перестроение иерархии сущностей...');
        this.cache.clear();
        this.entityCache.clear();
        return this.buildEntityHierarchy(entities);
    }

    getEntity(levelId) {
        return this.entityCache.get(levelId);
    }

    getAllEntities() {
        return Array.from(this.entityCache.values());
    }

    getTotalPlanets() {
        return Array.from(this.entityCache.values()).filter(entity => 
            entity.type === 'planet'
        ).length;
    }

    clearCache() {
        this.cache.clear();
        this.entityCache.clear();
        console.log('🧹 Кэш мета-парсера очищен');
    }

    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API
    async start() {
        return Promise.resolve();
    }

    async recover() {
        this.clearCache();
        console.log('🔄 GalaxyMetaParser восстановлен');
        return true;
    }
}

// Глобальная доступность для инициализации
window.GalaxyMetaParser = GalaxyMetaParser;
