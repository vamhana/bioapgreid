class MetaCache {
    constructor(maxSize = 200) {
        this._maxSize = maxSize;
        this._cache = new Map();
        this._accessOrder = [];
    }

    /**
     * Получение значения по ключу с обновлением порядка доступа
     * @param {string} key - Ключ для поиска
     * @returns {*} Значение или null если не найдено
     */
    get(key) {
        if (this._cache.has(key)) {
            const index = this._accessOrder.indexOf(key);
            if (index > -1) {
                this._accessOrder.splice(index, 1);
            }
            this._accessOrder.push(key);
            return this._cache.get(key);
        }
        return null;
    }

    /**
     * Установка значения по ключу
     * @param {string} key - Ключ
     * @param {*} value - Значение
     */
    set(key, value) {
        if (this._cache.size >= this._maxSize) {
            const oldestKey = this._accessOrder.shift();
            this._cache.delete(oldestKey);
        }
        
        this._cache.set(key, value);
        this._accessOrder.push(key);
    }

    /**
     * Удаление значения по ключу
     * @param {string} key - Ключ для удаления
     */
    delete(key) {
        this._cache.delete(key);
        const index = this._accessOrder.indexOf(key);
        if (index > -1) {
            this._accessOrder.splice(index, 1);
        }
    }

    /**
     * Полная очистка кэша
     */
    clear() {
        this._cache.clear();
        this._accessOrder = [];
    }

    /**
     * Текущий размер кэша
     * @returns {number} Количество элементов
     */
    get size() {
        return this._cache.size;
    }

    /**
     * Получение всех элементов кэша как объекта
     * @returns {Object} Объект со всеми ключ-значение парами
     */
    getAll() {
        return Object.fromEntries(this._cache.entries());
    }

    /**
     * Итератор для использования в for...of циклах
     */
    *[Symbol.iterator]() {
        for (const [key, value] of this._cache) {
            yield [key, value];
        }
    }

    /**
     * Проверка существования ключа
     * @param {string} key - Ключ для проверки
     * @returns {boolean} Существует ли ключ
     */
    has(key) {
        return this._cache.has(key);
    }

    /**
     * Получение ключей в порядке использования
     * @returns {string[]} Массив ключей
     */
    getKeys() {
        return [...this._accessOrder];
    }

    /**
     * Получение значений в порядке использования
     * @returns {*[]} Массив значений
     */
    getValues() {
        return this._accessOrder.map(key => this._cache.get(key));
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
    constructor(maxDepth = 15) {
        this._maxDepth = maxDepth;
        this._chainCache = new Map();
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

        console.log('🌌 Начало построения иерархии из ' + Object.keys(entities).length + ' сущностей...');

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
                    relationshipChain: this._calculateRelationshipChain(entity, entities),
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
                    
                    entityNode.metadata.depth = parentNode.metadata.depth + 1;
                    
                    if (entityNode.metadata.depth > this._maxDepth) {
                        console.warn('⚠️ Превышена максимальная глубина иерархии: ' + entity.level + ' (глубина ' + entityNode.metadata.depth + ')');
                    }
                } else {
                    orphanedNodes.push(entityNode);
                    console.warn('⚠️ Сиротская сущность: ' + entity.level + ' (родитель ' + entity.parent + ' не найден)');
                }
            } else {
                rootNodes.push(entityNode);
            }
        });

        // Фаза 3: Обработка сиротских узлов
        orphanedNodes.forEach(orphan => {
            const suggestedParent = this._findSuggestedParent(orphan, entityMap);
            if (suggestedParent) {
                suggestedParent.children.push(orphan);
                suggestedParent.metadata.childCount++;
                orphan.metadata.depth = suggestedParent.metadata.depth + 1;
                console.log('🔗 Автоматически привязан сирота ' + orphan.level + ' к ' + suggestedParent.level);
            } else {
                rootNodes.push(orphan);
                orphan.metadata.isRoot = true;
            }
        });

        // Фаза 4: Вычисление дополнительных мета-данных
        this._calculateHierarchyMetadata(rootNodes);

        // Фаза 5: Сортировка по важности и типу
        this._sortHierarchy(rootNodes);

        const stats = {
            total: entityMap.size,
            roots: rootNodes.length,
            orphans: orphanedNodes.length,
            maxDepth: Math.max(...Array.from(entityMap.values()).map(e => e.metadata.depth)),
            totalDescendants: rootNodes.reduce((sum, root) => sum + root.metadata.totalDescendants, 0),
            byType: this._calculateTypeDistribution(entityMap)
        };

        console.log('🌳 Иерархия сущностей построена:', stats);

        return {
            roots: rootNodes,
            entities: entityMap,
            stats: stats,
            relationshipChains: this._buildAllChains(entityMap)
        };
    }

    /**
     * Вычисляет полную цепочку отношений для сущности
     * @param {Object} entity - Сущность
     * @param {Object} allEntities - Все сущности
     * @param {Array} chain - Текущая цепочка
     * @returns {Array} Цепочка отношений
     */
    _calculateRelationshipChain(entity, allEntities, chain) {
        const currentChain = chain || [];
        const cacheKey = entity.level + '_chain';
        if (this._chainCache.has(cacheKey)) {
            return this._chainCache.get(cacheKey);
        }

        currentChain.unshift(entity.level);

        if (entity.parent) {
            const parentEntity = allEntities[entity.parent];
            if (parentEntity && !currentChain.includes(entity.parent)) {
                return this._calculateRelationshipChain(parentEntity, allEntities, currentChain);
            }
        }

        this._chainCache.set(cacheKey, [...currentChain]);
        return currentChain;
    }

    /**
     * Строит все цепочки отношений для sitemap.json
     * @param {Map} entityMap - Карта сущностей
     * @returns {Object} Все цепочки отношений
     */
    _buildAllChains(entityMap) {
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
    _findSuggestedParent(orphan, entityMap) {
        if (orphan.metadata.relationshipChain && orphan.metadata.relationshipChain.length > 1) {
            const potentialParentLevel = orphan.metadata.relationshipChain[1];
            const parent = entityMap.get(potentialParentLevel);
            if (parent) return parent;
        }

        const typeHierarchy = new Map([
            ['debris', 'asteroid'],
            ['asteroid', 'moon'],
            ['moon', 'planet'],
            ['planet', 'galaxy']
        ]);

        const targetType = typeHierarchy.get(orphan.type);
        if (targetType) {
            for (const [level, entity] of entityMap) {
                if (entity.type === targetType && entity.metadata.depth < this._maxDepth - 1) {
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
    _calculateTypeDistribution(entityMap) {
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
    _calculateHierarchyMetadata(nodes) {
        nodes.forEach((node, index) => {
            node.metadata.siblingIndex = index;
            
            node.metadata.totalDescendants = node.children.reduce((total, child) => {
                return total + 1 + this._calculateHierarchyMetadata([child])[0].metadata.totalDescendants;
            }, 0);
        });

        return nodes;
    }

    /**
     * Сортирует иерархию по важности и типу
     * @param {Array} nodes - Узлы для сортировки
     */
    _sortHierarchy(nodes) {
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

        nodes.forEach(node => {
            if (node.children.length > 0) {
                this._sortHierarchy(node.children);
            }
        });
    }

    /**
     * Очистка кэша цепочек
     */
    clearChainCache() {
        this._chainCache.clear();
    }

    /**
     * Геттер для максимальной глубины
     * @returns {number} Максимальная глубина
     */
    get maxDepth() {
        return this._maxDepth;
    }

    /**
     * Сеттер для максимальной глубины с валидацией
     * @param {number} value - Новая максимальная глубина
     */
    set maxDepth(value) {
        if (value > 0 && value <= 50) {
            this._maxDepth = value;
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
            size: this._chainCache.size,
            hits: 0,
            maxDepth: this._maxDepth
        };
    }
}

/**
 * Универсальная конфигурация системы парсинга v3.1
 */
const PARSER_CONFIG = Object.freeze({
    maxRetries: 3,
    cacheTTL: 5 * 60 * 1000,
    requestTimeout: 10000,
    maxHierarchyDepth: 15,
    
    supportedEntityTypes: Object.freeze([
        'debris', 'asteroid', 'moon', 'planet', 'galaxy',
        'blackhole', 'nebula', 'station', 'gateway', 'anomaly'
    ]),

    circuitBreaker: Object.freeze({
        failureThreshold: 5,
        resetTimeout: 30000,
        halfOpenTimeout: 15000
    }),

    predictiveLoading: Object.freeze({
        enabled: true,
        depth: 2,
        batchSize: 50,
        preloadDelay: 100
    }),

    pageDiscovery: Object.freeze({
        apiEndpoints: Object.freeze([
            '/api/pages',
            '/api/sitemap',
            '/data/pages.json',
            '/manifest.json',
            '/sitemap.xml',
            '/api/galaxy/pages'
        ]),
        
        scanDirectories: Object.freeze([
            'pages', 'content', 'docs', 'articles', 'galaxy'
        ]),
        
        fallbackPages: Object.freeze([]),
        
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
        
        checkTimeouts: Object.freeze({
            head: 2000,
            get: 3000,
            options: 1000
        })
    }),

    sitemap: Object.freeze({
        outputPath: '/data/sitemap.json',
        autoGenerate: true,
        includeChains: true,
        includeStats: true,
        versioning: true
    }),

    universal: Object.freeze({
        autoDetectStructure: true,
        createIfMissing: true,
        adaptiveNaming: true,
        crossDomainSupport: true,
        domainAgnostic: true
    }),

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
    }),

    // Новые настройки для Vercel интеграции
    vercel: Object.freeze({
        enabled: true,
        apiEndpoints: Object.freeze({
            projectStructure: '/api/project-structure',
            metaParser: '/api/meta-parser',
            sitemap: '/api/sitemap',
            pages: '/api/pages'
        }),
        timeout: 10000,
        fallbackEnabled: true
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

        // Проверка Vercel настроек
        if (config.vercel && config.vercel.enabled) {
            if (!config.vercel.apiEndpoints || Object.keys(config.vercel.apiEndpoints).length === 0) {
                warnings.push('Vercel включен но не настроены API endpoints');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    },

    /**
     * Создание конфигурации для конкретного домена
     * @param {string} domain - Домен для настройки
     * @returns {Object} Адаптированная конфигурация
     */
    createDomainConfig(domain) {
        const domainSafe = domain.replace(/[^a-z0-9]/gi, '_');
        return {
            ...PARSER_CONFIG,
            domain: domain,
            sitemap: {
                ...PARSER_CONFIG.sitemap,
                outputPath: '/data/sitemap_' + domainSafe + '.json'
            }
        };
    },

    /**
     * Получение Vercel endpoints
     * @returns {Object} Vercel endpoints
     */
    getVercelEndpoints() {
        return PARSER_CONFIG.vercel.apiEndpoints;
    },

    /**
     * Проверка доступности Vercel
     * @returns {boolean} Доступен ли Vercel
     */
    isVercelEnabled() {
        return PARSER_CONFIG.vercel.enabled;
    },

    /**
     * Получение таймаутов для различных операций
     * @returns {Object} Таймауты
     */
    getTimeouts() {
        return {
            request: PARSER_CONFIG.requestTimeout,
            cache: PARSER_CONFIG.cacheTTL,
            vercel: PARSER_CONFIG.vercel.timeout,
            discovery: PARSER_CONFIG.pageDiscovery.checkTimeouts
        };
    }
};

// Совместимость с legacy системой
if (typeof window !== 'undefined') {
    window.MetaCache = MetaCache;
    window.HierarchyBuilder = HierarchyBuilder;
    window.PARSER_CONFIG = PARSER_CONFIG;
    window.ConfigUtils = ConfigUtils;
}

console.log('✅ Модуль 1: Базовые классы ES6+ и универсальная конфигурация загружены');

// Автоматическая проверка конфигурации при загрузке
(function() {
    const validation = ConfigUtils.validateConfig(PARSER_CONFIG);
    if (!validation.isValid) {
        console.error('❌ Ошибки в конфигурации:', validation.errors);
    }
    if (validation.warnings.length > 0) {
        console.warn('⚠️ Предупреждения конфигурации:', validation.warnings);
    }
})();

// Глобальные вспомогательные функции
window.GalaxyParserUtils = {
    /**
     * Создание экземпляра MetaCache
     * @param {number} size - Размер кэша
     * @returns {MetaCache} Экземпляр MetaCache
     */
    createCache: function(size) {
        return new MetaCache(size);
    },

    /**
     * Создание экземпляра HierarchyBuilder
     * @param {number} depth - Максимальная глубина
     * @returns {HierarchyBuilder} Экземпляр HierarchyBuilder
     */
    createHierarchyBuilder: function(depth) {
        return new HierarchyBuilder(depth);
    },

    /**
     * Быстрая проверка типа сущности
     * @param {string} type - Тип для проверки
     * @returns {boolean} Поддерживается ли тип
     */
    isValidEntityType: function(type) {
        return ConfigUtils.isEntityTypeSupported(type);
    },

    /**
     * Получение конфигурации по умолчанию
     * @returns {Object} Конфигурация
     */
    getDefaultConfig: function() {
        return PARSER_CONFIG;
    },

    /**
     * Валидация объекта сущности
     * @param {Object} entity - Сущность для валидации
     * @returns {Object} Результат валидации
     */
    validateEntity: function(entity) {
        const errors = [];
        const warnings = [];

        if (!entity.level) {
            errors.push('Отсутствует level');
        }

        if (!entity.type) {
            errors.push('Отсутствует type');
        } else if (!ConfigUtils.isEntityTypeSupported(entity.type)) {
            errors.push('Неподдерживаемый тип: ' + entity.type);
        }

        if (!entity.title) {
            warnings.push('Отсутствует title');
        }

        if (entity['orbit-radius'] && (entity['orbit-radius'] < 0 || entity['orbit-radius'] > 1000)) {
            warnings.push('Некорректный радиус орбиты: ' + entity['orbit-radius']);
        }

        if (entity['orbit-angle'] && (entity['orbit-angle'] < 0 || entity['orbit-angle'] >= 360)) {
            warnings.push('Некорректный угол орбиты: ' + entity['orbit-angle']);
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    },

    /**
     * Генерация случайного цвета для сущности
     * @param {string} type - Тип сущности
     * @returns {string} Цвет в формате HSL
     */
    generateRandomColor: function(type) {
        const typeHues = {
            galaxy: 60,
            planet: 180,
            moon: 90,
            asteroid: 0,
            debris: 120,
            blackhole: 240,
            nebula: 270,
            station: 45,
            gateway: 300,
            anomaly: 200
        };

        const hue = typeHues[type] || Math.floor(Math.random() * 360);
        return 'hsl(' + hue + ', 70%, 60%)';
    },

    /**
     * Расчет важности на основе типа
     * @param {string} type - Тип сущности
     * @returns {string} Важность
     */
    calculateImportance: function(type) {
        if (type === 'galaxy' || type === 'blackhole') return 'high';
        if (type === 'planet' || type === 'nebula' || type === 'gateway') return 'medium';
        return 'low';
    },

    /**
     * Создание базовой сущности с минимальными данными
     * @param {string} level - Уровень
     * @param {string} type - Тип
     * @param {string} title - Заголовок
     * @returns {Object} Базовая сущность
     */
    createBasicEntity: function(level, type, title) {
        const defaults = ConfigUtils.getDefaultsForType(type);
        return {
            level: level,
            type: type,
            title: title,
            importance: defaults.importance,
            'orbit-radius': defaults.orbitRadius,
            'orbit-angle': Math.floor(Math.random() * 360),
            color: this.generateRandomColor(type),
            unlocked: true,
            metadata: {
                created: new Date().toISOString(),
                basic: true
            }
        };
    }
};
