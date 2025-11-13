// bioapgreid/js/meta-parser/meta-parser-1.js

/**
 * LRU кэш с максимальным размером 200 элементов
 * @class MetaCache
 */
class MetaCache {
    #maxSize;
    #cache;
    #accessOrder;

    constructor(maxSize = 200) {
        this.#maxSize = maxSize;
        this.#cache = new Map();
        this.#accessOrder = [];
    }

    /**
     * Получение значения по ключу с обновлением порядка доступа
     * @param {string} key - Ключ для поиска
     * @returns {*} Значение или null если не найдено
     */
    get(key) {
        if (this.#cache.has(key)) {
            // Обновляем порядок доступа для LRU
            const index = this.#accessOrder.indexOf(key);
            if (index > -1) {
                this.#accessOrder.splice(index, 1);
            }
            this.#accessOrder.push(key);
            return this.#cache.get(key);
        }
        return null;
    }

    /**
     * Установка значения по ключу
     * @param {string} key - Ключ
     * @param {*} value - Значение
     */
    set(key, value) {
        if (this.#cache.size >= this.#maxSize) {
            // Удаляем наименее используемый элемент
            const oldestKey = this.#accessOrder.shift();
            this.#cache.delete(oldestKey);
        }
        
        this.#cache.set(key, value);
        this.#accessOrder.push(key);
    }

    /**
     * Удаление значения по ключу
     * @param {string} key - Ключ для удаления
     */
    delete(key) {
        this.#cache.delete(key);
        const index = this.#accessOrder.indexOf(key);
        if (index > -1) {
            this.#accessOrder.splice(index, 1);
        }
    }

    /**
     * Полная очистка кэша
     */
    clear() {
        this.#cache.clear();
        this.#accessOrder = [];
    }

    /**
     * Текущий размер кэша
     * @returns {number} Количество элементов
     */
    get size() {
        return this.#cache.size;
    }

    /**
     * Получение всех элементов кэша как объекта
     * @returns {Object} Объект со всеми ключ-значение парами
     */
    getAll() {
        return Object.fromEntries(this.#cache.entries());
    }

    /**
     * Итератор для использования в for...of циклах
     */
    *[Symbol.iterator]() {
        yield* this.#cache.entries();
    }

    /**
     * Проверка существования ключа
     * @param {string} key - Ключ для проверки
     * @returns {boolean} Существует ли ключ
     */
    has(key) {
        return this.#cache.has(key);
    }

    /**
     * Получение ключей в порядке использования
     * @returns {string[]} Массив ключей
     */
    getKeys() {
        return [...this.#accessOrder];
    }

    /**
     * Получение значений в порядке использования
     * @returns {*[]} Массив значений
     */
    getValues() {
        return this.#accessOrder.map(key => this.#cache.get(key));
    }

    /**
     * Статический метод создания из объекта
     * @param {Object} obj - Исходный объект
     * @param {number} maxSize - Максимальный размер
     * @returns {MetaCache} Новый экземпляр MetaCache
     */
    static fromObject(obj, maxSize = 200) {
        const cache = new MetaCache(maxSize);
        Object.entries(obj).forEach(([key, value]) => {
            cache.set(key, value);
        });
        return cache;
    }

    /**
     * Преобразование в обычный объект
     * @returns {Object} Объект с данными кэша
     */
    toObject() {
        return this.getAll();
    }
}

/**
 * Построитель иерархии с цепочками отношений
 * @class HierarchyBuilder
 */
class HierarchyBuilder {
    #maxDepth;
    #chainCache;

    constructor(maxDepth = 15) {
        this.#maxDepth = maxDepth;
        this.#chainCache = new Map(); // Кэш для цепочек отношений
    }

    /**
     * Строит полную иерархию из сущностей
     * @param {Object} entities - Объект сущностей
     * @returns {Object} Структура иерархии
     */
    build(entities) {
        const entityMap = new Map();
        const rootNodes = [];
        const orphanedNodes = [];

        console.log(`🌌 Начало построения иерархии из ${Object.keys(entities).length} сущностей...`);

        // Фаза 1: Создание карты сущностей и вычисление цепочек
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
                    relationshipChain: this.#calculateRelationshipChain(entity, entities),
                    analytics: {
                        accessCount: 0,
                        lastAccessed: null,
                        averageParseTime: 0
                    }
                }
            };
            entityMap.set(entity.level, entityNode);
        });

        // Фаза 2: Построение дерева и вычисление глубины
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
                    if (entityNode.metadata.depth > this.#maxDepth) {
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

        // Фаза 3: Обработка сиротских узлов
        orphanedNodes.forEach(orphan => {
            const suggestedParent = this.#findSuggestedParent(orphan, entityMap);
            if (suggestedParent) {
                suggestedParent.children.push(orphan);
                suggestedParent.metadata.childCount++;
                orphan.metadata.depth = suggestedParent.metadata.depth + 1;
                console.log(`🔗 Автоматически привязан сирота ${orphan.level} к ${suggestedParent.level}`);
            } else {
                // Добавляем как корневую
                rootNodes.push(orphan);
                orphan.metadata.isRoot = true;
            }
        });

        // Фаза 4: Вычисление дополнительных мета-данных
        this.#calculateHierarchyMetadata(rootNodes);

        // Фаза 5: Сортировка по важности и типу
        this.#sortHierarchy(rootNodes);

        const stats = {
            total: entityMap.size,
            roots: rootNodes.length,
            orphans: orphanedNodes.length,
            maxDepth: Math.max(...Array.from(entityMap.values()).map(e => e.metadata.depth)),
            totalDescendants: rootNodes.reduce((sum, root) => sum + root.metadata.totalDescendants, 0),
            byType: this.#calculateTypeDistribution(entityMap)
        };

        console.log('🌳 Иерархия сущностей построена:', stats);

        return {
            roots: rootNodes,
            entities: entityMap,
            stats,
            relationshipChains: this.#buildAllChains(entityMap)
        };
    }

    /**
     * Вычисляет полную цепочку отношений для сущности
     * @param {Object} entity - Сущность
     * @param {Object} allEntities - Все сущности
     * @param {Array} chain - Текущая цепочка
     * @returns {Array} Цепочка отношений
     */
    #calculateRelationshipChain(entity, allEntities, chain = []) {
        const cacheKey = `${entity.level}_chain`;
        if (this.#chainCache.has(cacheKey)) {
            return this.#chainCache.get(cacheKey);
        }

        chain.unshift(entity.level);

        if (entity.parent) {
            const parentEntity = allEntities[entity.parent];
            if (parentEntity && !chain.includes(entity.parent)) {
                return this.#calculateRelationshipChain(parentEntity, allEntities, chain);
            }
        }

        // Сохраняем в кэш
        this.#chainCache.set(cacheKey, [...chain]);
        return chain;
    }

    /**
     * Строит все цепочки отношений для sitemap.json
     * @param {Map} entityMap - Карта сущностей
     * @returns {Object} Все цепочки отношений
     */
    #buildAllChains(entityMap) {
        const chains = {};
        entityMap.forEach((entity, level) => {
            chains[level] = entity.metadata.relationshipChain || [level];
        });
        return chains;
    }

    /**
     * Находит подходящего родителя для сиротской сущности
     * @param {Object} orphan - Сиротская сущность
     * @param {Map} entityMap - Карта сущностей
     * @returns {Object|null} Подходящий родитель или null
     */
    #findSuggestedParent(orphan, entityMap) {
        // Стратегия 1: Ищем по цепочке отношений
        if (orphan.metadata.relationshipChain?.length > 1) {
            const potentialParentLevel = orphan.metadata.relationshipChain[1];
            const parent = entityMap.get(potentialParentLevel);
            if (parent) return parent;
        }

        // Стратегия 2: Ищем по типу
        const typeHierarchy = new Map([
            ['debris', 'asteroid'],
            ['asteroid', 'moon'],
            ['moon', 'planet'],
            ['planet', 'galaxy']
        ]);

        const targetType = typeHierarchy.get(orphan.type);
        if (targetType) {
            for (const [level, entity] of entityMap) {
                if (entity.type === targetType && entity.metadata.depth < this.#maxDepth - 1) {
                    return entity;
                }
            }
        }

        return null;
    }

    /**
     * Вычисляет распределение сущностей по типам
     * @param {Map} entityMap - Карта сущностей
     * @returns {Object} Распределение по типам
     */
    #calculateTypeDistribution(entityMap) {
        const distribution = {};
        entityMap.forEach(entity => {
            distribution[entity.type] = (distribution[entity.type] || 0) + 1;
        });
        return distribution;
    }

    /**
     * Вычисляет мета-данные иерархии
     * @param {Array} nodes - Узлы для обработки
     * @returns {Array} Обработанные узлы
     */
    #calculateHierarchyMetadata(nodes) {
        nodes.forEach((node, index) => {
            node.metadata.siblingIndex = index;
            
            // Рекурсивно вычисляем общее количество потомков
            node.metadata.totalDescendants = node.children.reduce((total, child) => {
                return total + 1 + this.#calculateHierarchyMetadata([child])[0];
            }, 0);
        });

        return nodes;
    }

    /**
     * Сортирует иерархию по важности и типу
     * @param {Array} nodes - Узлы для сортировки
     */
    #sortHierarchy(nodes) {
        // Сортируем по важности (high > medium > low), затем по типу, затем по уровню
        const importanceOrder = new Map([['high', 3], ['medium', 2], ['low', 1]]);
        const typeOrder = new Map([
            ['galaxy', 5], ['planet', 4], ['moon', 3], 
            ['asteroid', 2], ['debris', 1],
            ['blackhole', 6], ['nebula', 5], ['station', 4],
            ['gateway', 3], ['anomaly', 2]
        ]);

        nodes.sort((a, b) => {
            const aImportance = importanceOrder.get(a.importance) || 1;
            const bImportance = importanceOrder.get(b.importance) || 1;
            
            if (bImportance !== aImportance) {
                return bImportance - aImportance;
            }
            
            const aType = typeOrder.get(a.type) || 0;
            const bType = typeOrder.get(b.type) || 0;
            
            if (bType !== aType) {
                return bType - aType;
            }
            
            return a.level.localeCompare(b.level);
        });

        // Рекурсивно сортируем детей
        nodes.forEach(node => {
            if (node.children.length > 0) {
                this.#sortHierarchy(node.children);
            }
        });
    }

    /**
     * Очистка кэша цепочек
     */
    clearChainCache() {
        this.#chainCache.clear();
    }

    /**
     * Геттер для максимальной глубины
     * @returns {number} Максимальная глубина
     */
    get maxDepth() {
        return this.#maxDepth;
    }

    /**
     * Сеттер для максимальной глубины с валидацией
     * @param {number} value - Новая максимальная глубина
     */
    set maxDepth(value) {
        if (value > 0 && value <= 50) {
            this.#maxDepth = value;
        } else {
            throw new Error('Максимальная глубина должна быть между 1 и 50');
        }
    }

    /**
     * Получение статистики кэша цепочек
     * @returns {Object} Статистика кэша
     */
    getChainCacheStats() {
        return {
            size: this.#chainCache.size,
            hits: 0, // Можно добавить подсчет хитов при необходимости
            maxDepth: this.#maxDepth
        };
    }
}

/**
 * Универсальная конфигурация системы парсинга v3.0
 * Оптимизирована для работы с любой галактикой на любом домене
 */
const PARSER_CONFIG = Object.freeze({
    // Основные настройки
    maxRetries: 3,
    cacheTTL: 5 * 60 * 1000, // 5 минут
    requestTimeout: 10000,
    maxHierarchyDepth: 15,
    
    // Поддерживаемые типы сущностей (универсальные для любой галактики)
    supportedEntityTypes: Object.freeze([
        'debris',      // Космический мусор (реклама, вспомогательные страницы)
        'asteroid',    // Метеориты (второстепенные разделы)  
        'moon',        // Спутники (подразделы)
        'planet',      // Планеты (основные разделы)
        'galaxy',      // Звезды (ключевые категории)
        'blackhole',   // Специальные разделы
        'nebula',      // Группы разделов
        'station',     // Интерактивные элементы
        'gateway',     // Навигационные шлюзы
        'anomaly'      // Особые страницы
    ]),

    // Настройки устойчивости
    circuitBreaker: Object.freeze({
        failureThreshold: 5,
        resetTimeout: 30000,
        halfOpenTimeout: 15000
    }),

    // Предиктивная загрузка для больших объемов
    predictiveLoading: Object.freeze({
        enabled: true,
        depth: 2,
        batchSize: 50,
        preloadDelay: 100
    }),

    // Универсальные настройки обнаружения страниц
    pageDiscovery: Object.freeze({
        // API endpoints для любого домена
        apiEndpoints: Object.freeze([
            '/api/pages',
            '/api/sitemap',
            '/data/pages.json',
            '/manifest.json',
            '/sitemap.xml',
            '/api/galaxy/pages'
        ]),
        
        // Базовые директории для сканирования
        scanDirectories: Object.freeze([
            'pages', 'content', 'docs', 'articles', 'galaxy'
        ]),
        
        // Нет fallback страниц - полностью универсально
        fallbackPages: Object.freeze([]),
        
        // Начальная структура для новых галактик
        initialStructure: Object.freeze({
            createIfEmpty: true,
            defaultPages: [
                {
                    level: 'index',
                    type: 'galaxy',
                    title: 'Главная',
                    description: 'Центральная страница галактики'
                }
            ]
        }),
        
        // Таймауты для проверки страниц (ms)
        checkTimeouts: Object.freeze({
            head: 2000,
            get: 3000,
            options: 1000
        })
    }),

    // Настройки для sitemap.json
    sitemap: Object.freeze({
        outputPath: '/data/sitemap.json',
        autoGenerate: true,
        includeChains: true,
        includeStats: true,
        versioning: true
    }),

    // Универсальные настройки для любого домена
    universal: Object.freeze({
        autoDetectStructure: true,
        createIfMissing: true,
        adaptiveNaming: true,
        crossDomainSupport: true,
        domainAgnostic: true
    }),

    // Настройки производительности
    performance: Object.freeze({
        cacheSizes: Object.freeze({
            metaCache: 100,
            entityCache: 100,
            hierarchyCache: 1
        }),
        batchProcessing: Object.freeze({
            pageBatchSize: 50,
            parseConcurrency: 3,
            retryBackoff: 'exponential'
        })
    })
});

// Вспомогательные функции для работы с конфигурацией
const ConfigUtils = {
    /**
     * Проверка поддержки типа сущности
     * @param {string} type - Тип для проверки
     * @returns {boolean} Поддерживается ли тип
     */
    isEntityTypeSupported(type) {
        return PARSER_CONFIG.supportedEntityTypes.includes(type);
    },

    /**
     * Получение дефолтных значений для типа сущности
     * @param {string} type - Тип сущности
     * @returns {Object} Дефолтные значения
     */
    getDefaultsForType(type) {
        const defaults = {
            debris: { orbitRadius: 20, importance: 'low' },
            asteroid: { orbitRadius: 40, importance: 'low' },
            moon: { orbitRadius: 60, importance: 'medium' },
            planet: { orbitRadius: 150, importance: 'medium' },
            galaxy: { orbitRadius: 0, importance: 'high' },
            blackhole: { orbitRadius: 200, importance: 'high' },
            nebula: { orbitRadius: 250, importance: 'medium' },
            station: { orbitRadius: 80, importance: 'medium' },
            gateway: { orbitRadius: 120, importance: 'high' },
            anomaly: { orbitRadius: 180, importance: 'medium' }
        };
        
        return defaults[type] || { orbitRadius: 100, importance: 'medium' };
    },

    /**
     * Валидация конфигурации
     * @param {Object} config - Конфигурация для валидации
     * @returns {Object} Результат валидации
     */
    validateConfig(config) {
        const errors = [];
        const warnings = [];

        if (config.maxRetries < 0) {
            errors.push('maxRetries не может быть отрицательным');
        }

        if (config.maxHierarchyDepth > 50) {
            warnings.push('Максимальная глубина иерархии больше 50 может повлиять на производительность');
        }

        if (config.requestTimeout > 30000) {
            warnings.push('Таймаут запроса больше 30 секунд может блокировать интерфейс');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    },

    /**
     * Создание конфигурации для конкретного домена
     * @param {string} domain - Домен для настройки
     * @returns {Object} Адаптированная конфигурация
     */
    createDomainConfig(domain) {
        return {
            ...PARSER_CONFIG,
            domain,
            sitemap: {
                ...PARSER_CONFIG.sitemap,
                outputPath: `/data/sitemap_${domain.replace(/[^a-z0-9]/gi, '_')}.json`
            }
        };
    }
};

// Named exports для современных модульных систем
export { MetaCache, HierarchyBuilder, PARSER_CONFIG, ConfigUtils };

// Совместимость с legacy системой
if (typeof window !== 'undefined') {
    window.MetaCache = MetaCache;
    window.HierarchyBuilder = HierarchyBuilder;
    window.PARSER_CONFIG = PARSER_CONFIG;
    window.ConfigUtils = ConfigUtils;
}

console.log('✅ Модуль 1: Базовые классы ES6+ и универсальная конфигурация загружены');

// Автоматическая проверка конфигурации при загрузке
(() => {
    const validation = ConfigUtils.validateConfig(PARSER_CONFIG);
    if (!validation.isValid) {
        console.error('❌ Ошибки в конфигурации:', validation.errors);
    }
    if (validation.warnings.length > 0) {
        console.warn('⚠️ Предупреждения конфигурации:', validation.warnings);
    }
})();
