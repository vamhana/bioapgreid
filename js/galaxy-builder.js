if (typeof window.GalaxyBuilder !== 'undefined') {
    console.warn('⚠️ GalaxyBuilder уже загружен, пропускаем повторную загрузку');
} else {

class GalaxyBuilder {
    constructor(app) {
        this.app = app;
        this.entities = new Map();
        this.positionCache = new Map();
        this.domElements = new Map();
        this.celestialContainer = null;
        this.animationFrameId = null;
        this.dirtyEntities = new Set();
        this.recalculationQueue = [];
        this.adaptivePositioning = null;
        this.spatialIndex = new Map();
        this.interactionAnalytics = new Map();
        this.predictiveLoadingQueue = new Set();
        
        // SITEMAP CONFIG - основной источник истины
        this.sitemapConfig = {
            sitemapUrl: '/sitemap.json',
            autoReload: true,
            reloadInterval: 30000, // 30 секунд
            cacheDuration: 60000, // 1 минута
            fallbackUrl: '/api/sitemap', // резервный источник
            retryAttempts: 3,
            retryDelay: 1000
        };

        // Конфигурация позиционирования v2.1 с расширенными типами
        this.config = {
            baseOrbitRadii: {
                star: 200,
                planet: 120,
                moon: 60,
                asteroid: 40,
                debris: 20,
                blackhole: 150,
                galaxy: 140,
                nebula: 180,
                station: 80,
                gateway: 100,
                anomaly: 70
            },
            minDistance: 20,
            center: { x: 50, y: 50 },
            maxRecursionDepth: 10,
            clusterThreshold: 50,
            animationDuration: 400,
            spatialGridSize: 100,
            maxCollisionIterations: 100,
            performanceThreshold: 500,
            lruCacheSize: 100,
            predictiveLoadingDepth: 3,
            analyticsInterval: 30000,
            zoomSensitivity: 0.1,
            sitemapDriven: true // флаг что используем sitemap как источник
        };

        // Кэш для sitemap данных
        this.cache = {
            sitemap: null,
            lastLoaded: 0,
            entityCount: 0,
            lastRebuildTime: 0,
            spatialIndexVersion: 0,
            lruCache: new Map(),
            predictivePaths: new Set(),
            userBehaviorPatterns: new Map(),
            sitemapHash: null,
            retryCount: 0
        };

        // Интеграции v2.1
        this.integration = {
            navigation: null,
            interaction: null,
            contentManager: null,
            performanceMonitor: null
        };

        // Состояние системы
        this.state = {
            initialized: false,
            building: false,
            sitemapLoaded: false,
            error: null,
            lastBuildDuration: 0
        };
    }

    async init(options = {}) {
        console.log('🏗️ Инициализация GalaxyBuilder v2.1 Unified (Sitemap-driven)...');
        
        try {
            this.celestialContainer = document.getElementById('celestialBodies');
            if (!this.celestialContainer) {
                throw new Error('Контейнер celestialBodies не найден');
            }

            // Обновляем конфиг из options
            if (options.sitemapConfig) {
                Object.assign(this.sitemapConfig, options.sitemapConfig);
            }

            // Инициализация AdaptivePositioning
            this.adaptivePositioning = this.app.getComponent('adaptivePositioning');
            if (!this.adaptivePositioning) {
                console.warn('⚠️ AdaptivePositioning не доступен, используется встроенная логика');
            }

            // Инициализация интеграций с системами v2.1
            await this.initializeV21Integrations();
            
            this.setupEventListeners();
            this.setupResizeObserver();
            this.setupIntersectionObserver();
            this.setupPredictiveLoading();
            this.setupAnalyticsCollection();
            this.setupSitemapAutoReload();
            
            // Автоматическая загрузка sitemap при инициализации
            if (options.autoLoadSitemap !== false) {
                await this.loadSitemap();
            }
            
            this.state.initialized = true;
            console.log('✅ GalaxyBuilder v2.1 Unified инициализирован (Sitemap-driven)');
        } catch (error) {
            console.error('❌ Ошибка инициализации GalaxyBuilder:', error);
            this.state.error = error;
            throw error;
        }
    }

    async initializeV21Integrations() {
        // Интеграция с Galaxy-Navigation v2.1
        this.integration.navigation = this.app.getComponent('galaxyNavigation');
        if (this.integration.navigation) {
            console.log('🔄 Интеграция с Galaxy-Navigation v2.1 установлена');
        }

        // Интеграция с Galaxy-Interaction v2.1
        this.integration.interaction = this.app.getComponent('galaxyInteraction');
        if (this.integration.interaction) {
            console.log('🔄 Интеграция с Galaxy-Interaction v2.1 установлена');
        }

        // Интеграция с Content-Manager v2.1
        this.integration.contentManager = this.app.getComponent('contentManager');
        if (this.integration.contentManager) {
            console.log('🔄 Интеграция с Content-Manager v2.1 установлена');
        }

        // Интеграция с Performance Monitor
        this.integration.performanceMonitor = this.app.getComponent('performanceMonitor');
    }

    // ========== SITEMAP-CENTRIC CORE METHODS ==========

    async loadSitemap(sitemapUrl = this.sitemapConfig.sitemapUrl) {
        if (this.state.building) {
            console.warn('⚠️ Построение уже выполняется, пропускаем загрузку');
            return;
        }

        console.log('📡 Загрузка sitemap как источника истины...', sitemapUrl);
        
        try {
            const startTime = performance.now();
            const response = await fetch(sitemapUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const sitemap = await response.json();
            const loadTime = performance.now() - startTime;

            console.log('✅ Sitemap загружен:', {
                version: sitemap.version,
                pages: sitemap.pages?.length || 0,
                generated: sitemap.generated,
                loadTime: `${loadTime.toFixed(2)}ms`
            });

            // Валидация sitemap
            if (!this.validateSitemap(sitemap)) {
                throw new Error('Sitemap validation failed');
            }

            // Проверяем изменился ли sitemap
            const newHash = this.generateSitemapHash(sitemap);
            if (newHash === this.cache.sitemapHash && this.state.sitemapLoaded) {
                console.log('🔄 Sitemap не изменился, пропускаем перестроение');
                return sitemap;
            }

            // Сохраняем в кэш
            this.cache.sitemap = sitemap;
            this.cache.lastLoaded = Date.now();
            this.cache.sitemapHash = newHash;
            this.cache.retryCount = 0;

            // Преобразуем в иерархию и строим галактику
            const hierarchy = this.convertSitemapToHierarchy(sitemap);
            await this.buildGalaxy(hierarchy);

            this.state.sitemapLoaded = true;

            // Отправляем событие о успешной загрузке
            this.dispatchEvent('sitemapLoaded', {
                sitemap: sitemap,
                hierarchy: hierarchy,
                loadTime: loadTime,
                entityCount: hierarchy.length,
                timestamp: Date.now()
            });

            return sitemap;

        } catch (error) {
            console.error('❌ Ошибка загрузки sitemap:', error);
            
            // Попытка повторной загрузки или использование fallback
            if (this.cache.retryCount < this.sitemapConfig.retryAttempts) {
                this.cache.retryCount++;
                console.log(`🔄 Попытка повторной загрузки ${this.cache.retryCount}/${this.sitemapConfig.retryAttempts}...`);
                
                await new Promise(resolve => setTimeout(resolve, this.sitemapConfig.retryDelay));
                return await this.loadSitemap(sitemapUrl);
            }
            
            // Используем fallback источник
            if (sitemapUrl !== this.sitemapConfig.fallbackUrl && this.sitemapConfig.fallbackUrl) {
                console.log('🔄 Использование fallback источника...');
                this.cache.retryCount = 0;
                return await this.loadSitemap(this.sitemapConfig.fallbackUrl);
            }
            
            this.state.error = error;
            this.dispatchEvent('sitemapLoadError', {
                error: error.message,
                retryCount: this.cache.retryCount,
                timestamp: Date.now()
            });
            
            throw error;
        }
    }

    validateSitemap(sitemap) {
        if (!sitemap) {
            console.error('❌ Sitemap is null or undefined');
            return false;
        }

        if (!sitemap.pages || !Array.isArray(sitemap.pages)) {
            console.error('❌ Sitemap pages is not an array');
            return false;
        }

        if (sitemap.pages.length === 0) {
            console.warn('⚠️ Sitemap pages array is empty');
            return true; // Пустой sitemap считается валидным
        }

        // Проверяем обязательные поля для каждой страницы
        let validPages = true;
        sitemap.pages.forEach((page, index) => {
            if (!page.level) {
                console.error(`❌ Page at index ${index} missing level field:`, page);
                validPages = false;
            }
            if (!page.type) {
                console.warn(`⚠️ Page ${page.level} missing type, using default`);
                page.type = 'planet'; // default
            }
            if (!page.title) {
                console.warn(`⚠️ Page ${page.level} missing title, using level as title`);
                page.title = page.level;
            }
        });

        if (!validPages) {
            console.error('❌ Sitemap содержит невалидные страницы');
            return false;
        }

        console.log(`✅ Sitemap validation passed: ${sitemap.pages.length} pages`);
        return true;
    }

    generateSitemapHash(sitemap) {
        // Простой хэш для определения изменений в sitemap
        const content = JSON.stringify({
            pages: sitemap.pages?.map(p => ({
                level: p.level,
                type: p.type,
                parent: p.parent,
                metadata: p.metadata
            })),
            version: sitemap.version,
            generated: sitemap.generated
        });
        
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    convertSitemapToHierarchy(sitemap) {
        const pages = sitemap.pages || [];
        console.log(`🔄 Преобразование ${pages.length} страниц в иерархию...`);

        // Создаем карту всех страниц для быстрого доступа
        const pagesMap = new Map();
        const enrichedPages = [];
        
        pages.forEach(page => {
            // Обогащаем данными для визуализации
            const enrichedPage = this.enrichPageWithVisualData(page);
            pagesMap.set(page.level, enrichedPage);
            enrichedPages.push(enrichedPage);
        });

        // Строим иерархию (родитель-дети)
        const hierarchy = [];
        const usedLevels = new Set();

        // Первый проход: находим корневые элементы
        pagesMap.forEach((page, levelId) => {
            if (!page.parent || !pagesMap.has(page.parent)) {
                hierarchy.push(page);
                usedLevels.add(levelId);
            }
        });

        // Второй проход: добавляем детей к родителям
        pagesMap.forEach((page, levelId) => {
            if (usedLevels.has(levelId)) return; // уже добавлен

            const parent = pagesMap.get(page.parent);
            if (parent) {
                if (!parent.children) parent.children = [];
                parent.children.push(page);
                usedLevels.add(levelId);
            } else {
                // Родитель не найден - делаем корневым
                console.warn(`⚠️ Родитель ${page.parent} не найден для ${levelId}, делаем корневым`);
                hierarchy.push(page);
                usedLevels.add(levelId);
            }
        });

        // Проверяем что все страницы добавлены
        if (usedLevels.size !== pages.length) {
            const missing = pages.filter(p => !usedLevels.has(p.level));
            console.warn(`⚠️ Не все страницы добавлены в иерархию: ${usedLevels.size}/${pages.length}`, missing);
        }

        console.log(`🌳 Построена иерархия: ${hierarchy.length} корневых элементов, всего ${usedLevels.size} сущностей`);
        return hierarchy;
    }

    enrichPageWithVisualData(page) {
        // Берем данные из sitemap и обогащаем для визуализации
        const enriched = {
            // Основные поля из sitemap
            level: page.level,
            type: page.type,
            title: page.title,
            importance: page.importance || 'medium',
            parent: page.parent || null,
            children: [],
            
            // Визуальные свойства
            color: page.color || this.getColorByType(page.type),
            icon: page.icon || this.getIconByType(page.type),
            'size-modifier': page['size-modifier'] || this.getSizeModifier(page),
            'orbit-radius': page['orbit-radius'] || null,
            'orbit-angle': page['orbit-angle'] || null,
            
            // Метаданные
            metadata: {
                ...page.metadata,
                url: page.url,
                tags: page.metadata?.tags || [],
                created: page.metadata?.created,
                lastModified: page.metadata?.lastModified,
                contentHash: page.metadata?.contentHash,
                previewImage: page.metadata?.previewImage,
                
                // Флаги состояния
                unlocked: page.metadata?.unlocked !== undefined ? page.metadata.unlocked : true,
                completed: page.metadata?.completed || false,
                progress: page.metadata?.progress || 0,
                
                // Визуальные метаданные
                visual: {
                    glow: page.metadata?.visual?.glow !== undefined ? page.metadata.visual.glow : (page.importance === 'high'),
                    pulse: page.metadata?.visual?.pulse || false,
                    rotation: page.metadata?.visual?.rotation || 0,
                    shimmer: page.metadata?.visual?.shimmer || (page.type === 'star')
                }
            }
        };

        return enriched;
    }

    getColorByType(type) {
        const colors = {
            star: '#ffeb3b',
            planet: '#4fc3f7', 
            moon: '#b0bec5',
            asteroid: '#795548',
            debris: '#9e9e9e',
            blackhole: '#000000',
            galaxy: '#7b1fa2',
            nebula: '#e91e63',
            station: '#4caf50',
            gateway: '#ff9800',
            anomaly: '#00bcd4'
        };
        return colors[type] || '#607d8b';
    }

    getIconByType(type) {
        const icons = {
            star: '⭐',
            planet: '🪐',
            moon: '🌙',
            asteroid: '☄️',
            debris: '🧩',
            blackhole: '⚫',
            galaxy: '🌌',
            nebula: '🌠',
            station: '🛰️',
            gateway: '🚪',
            anomaly: '💫'
        };
        return icons[type] || '🔘';
    }

    getSizeModifier(page) {
        // Размер на основе типа и важности
        let modifier = 1.0;
        
        // Модификатор по типу
        const typeModifiers = {
            star: 1.5,
            planet: 1.0,
            moon: 0.6,
            asteroid: 0.4,
            debris: 0.3,
            blackhole: 1.8,
            galaxy: 1.7,
            nebula: 2.0,
            station: 0.8,
            gateway: 1.1,
            anomaly: 0.9
        };
        modifier *= typeModifiers[page.type] || 1.0;

        // Модификатор по важности
        const importanceModifiers = {
            high: 1.3,
            medium: 1.0,
            low: 0.7
        };
        modifier *= importanceModifiers[page.importance] || 1.0;

        return Math.round(modifier * 100) / 100; // Округляем до 2 знаков
    }

    setupSitemapAutoReload() {
        if (!this.sitemapConfig.autoReload) return;

        this.sitemapReloadInterval = setInterval(async () => {
            try {
                if (this.state.building) {
                    console.log('⚠️ Пропускаем авто-обновление: идет построение');
                    return;
                }

                const cacheAge = Date.now() - this.cache.lastLoaded;
                if (cacheAge < this.sitemapConfig.cacheDuration) {
                    return; // Кэш еще свежий
                }

                console.log('🔄 Авто-обновление sitemap...');
                await this.loadSitemap();
            } catch (error) {
                console.warn('⚠️ Ошибка авто-обновления sitemap:', error);
            }
        }, this.sitemapConfig.reloadInterval);

        console.log('🔃 Авто-обновление sitemap настроено');
    }

    // ========== GALAXY BUILDING CORE ==========

    async buildGalaxy(entityHierarchy) {
        if (this.state.building) {
            console.warn('⚠️ Построение уже выполняется, пропускаем');
            return;
        }

        console.log('🌌 Начало построения галактики из sitemap...');
        const startTime = performance.now();
        this.state.building = true;
        
        try {
            // Очистка предыдущего состояния
            this.clearPreviousBuild();

            // Анализ плотности и выбор стратегии
            const entityCount = this.countEntities(entityHierarchy);
            console.log(`📊 Количество сущностей из sitemap: ${entityCount}`);
            
            // Интеграция с системой прогресса
            await this.integrateWithProgressSystem();
            
            // Расчет всех позиций
            const positionedEntities = await this.calculateAllPositions(entityHierarchy);
            
            // Создание DOM-элементов
            await this.createCelestialElements(positionedEntities);
            
            // Построение пространственного индекса
            this.buildSpatialIndex(positionedEntities);
            
            // Запуск анимаций появления
            await this.animateGalaxyEntrance();
            
            // Инициализация предиктивной системы
            this.initializePredictiveSystem(positionedEntities);
            
            const buildTime = performance.now() - startTime;
            this.state.lastBuildDuration = buildTime;
            
            // Отправка метрик производительности
            this.reportPerformanceMetrics({
                entityCount: positionedEntities.length,
                buildTime: buildTime,
                performance: this.getPerformanceMetrics(),
                sitemapVersion: this.cache.sitemap?.version,
                source: 'sitemap'
            });
            
            this.dispatchEvent('galaxyBuilt', {
                entityCount: positionedEntities.length,
                buildTime: buildTime,
                performance: this.getPerformanceMetrics(),
                version: '2.1 Sitemap-Driven',
                sitemapInfo: this.getSitemapInfo()
            });
            
            console.log(`🎯 Галактика построена из sitemap: ${positionedEntities.length} сущностей за ${buildTime.toFixed(2)}мс`);
            
        } catch (error) {
            console.error('💥 Ошибка построения галактики:', error);
            this.state.error = error;
            
            this.dispatchEvent('galaxyBuildError', { 
                error: error.message,
                timestamp: Date.now(),
                version: '2.1 Sitemap-Driven',
                sitemapInfo: this.getSitemapInfo()
            });
            
            // Попытка восстановления с улучшенной логикой v2.1
            await this.attemptEnhancedRecovery(error);
        } finally {
            this.state.building = false;
        }
    }

    clearPreviousBuild() {
        // Очистка DOM элементов
        if (this.celestialContainer) {
            this.celestialContainer.innerHTML = '';
        }
        
        // Очистка кэшей
        this.domElements.clear();
        this.entities.clear();
        this.spatialIndex.clear();
        this.dirtyEntities.clear();
        this.recalculationQueue = [];
        
        // Сброс наблюдателей
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
    }

    async integrateWithProgressSystem() {
        if (!this.integration.contentManager) return;
        
        try {
            const userProgress = await this.integration.contentManager.getUserProgress();
            const unlockedLevels = userProgress.unlockedLevels || new Set();
            const completedLevels = userProgress.completedLevels || new Set();
            
            // Обновляем состояние разблокировки сущностей
            this.entities.forEach(entity => {
                entity.unlocked = unlockedLevels.has(entity.level);
                entity.completed = completedLevels.has(entity.level);
                entity.progress = userProgress.progress?.[entity.level] || 0;
                
                const element = this.domElements.get(entity.level);
                if (element) {
                    element.classList.toggle('celestial-body--unlocked', entity.unlocked);
                    element.classList.toggle('celestial-body--completed', entity.completed);
                    this.updateProgressIndicator(element, entity.progress);
                }
            });
            
            console.log('🔓 Интеграция с системой прогресса завершена');
        } catch (error) {
            console.warn('⚠️ Ошибка интеграции с системой прогресса:', error);
        }
    }

    initializePredictiveSystem(entities) {
        if (!this.predictiveLoader.enabled) return;
        
        // Анализ наиболее вероятных путей на основе иерархии sitemap
        const rootEntities = entities.filter(e => !e.parent);
        rootEntities.forEach(root => {
            const paths = this.calculatePathsFromRoot(root, entities);
            paths.forEach(path => {
                this.cache.predictivePaths.add(path);
            });
        });
        
        console.log(`🔮 Предиктивная система инициализирована: ${this.cache.predictivePaths.size} путей из sitemap`);
    }

    // ========== POSITIONING AND COORDINATES ==========

    async calculateAllPositions(entityTree) {
        const allEntities = this.flattenEntityTree(entityTree);
        this.cache.entityCount = allEntities.length;
        
        // Используем AdaptivePositioning если доступен и для большого количества сущностей
        if (this.adaptivePositioning && allEntities.length > this.config.performanceThreshold) {
            console.log('🔄 Использование AdaptivePositioning для расчета позиций');
            return await this.calculatePositionsWithAdaptive(allEntities);
        } else {
            console.log('🔄 Использование встроенной логики позиционирования');
            return await this.calculatePositionsWithBuiltIn(allEntities);
        }
    }

    async calculatePositionsWithAdaptive(entities) {
        try {
            // Подготавливаем сущности для AdaptivePositioning
            const preparedEntities = entities.map(entity => ({
                id: entity.level,
                type: entity.type,
                position: entity.position || { x: 0, y: 0 },
                metadata: {
                    parent: entity.parent,
                    depth: entity.metadata?.depth || 0,
                    importance: entity.importance || 'medium',
                    unlocked: entity.unlocked || false
                }
            }));

            // Используем AdaptivePositioning для расчета
            const positionedEntities = this.adaptivePositioning.recalculatePositions(preparedEntities);
            
            // Сопоставляем результаты с исходными сущностями
            return entities.map(entity => {
                const positionedEntity = positionedEntities.find(e => e.id === entity.level);
                if (positionedEntity) {
                    return {
                        ...entity,
                        position: positionedEntity.position,
                        orbitalData: {
                            ...entity.orbitalData,
                            optimized: true,
                            strategy: positionedEntity.strategy
                        }
                    };
                }
                return entity;
            });
        } catch (error) {
            console.warn('⚠️ AdaptivePositioning не сработал, используется fallback:', error);
            return this.calculatePositionsWithBuiltIn(entities);
        }
    }

    async calculatePositionsWithBuiltIn(entities) {
        const positionedEntities = [];
        const rootEntities = entities.filter(e => !e.parent);
        
        // Сначала позиционируем корневые элементы
        for (const entity of rootEntities) {
            const positionedEntity = await this.calculateRootPosition(entity, rootEntities);
            positionedEntities.push(positionedEntity);
            this.entities.set(entity.level, positionedEntity);
        }
        
        // Затем дочерние элементы (рекурсивно)
        for (const entity of entities) {
            if (entity.parent && !this.entities.has(entity.level)) {
                const positionedEntity = await this.calculateOrbitalPosition(entity);
                positionedEntities.push(positionedEntity);
                this.entities.set(entity.level, positionedEntity);
            }
        }
        
        // Разрешение коллизий
        const collisionFreeEntities = this.resolveCollisions(positionedEntities);
        
        return collisionFreeEntities;
    }

    async calculateRootPosition(entity, rootEntities) {
        const index = rootEntities.findIndex(e => e.level === entity.level);
        const totalRoots = rootEntities.length;
        
        // Используем разные стратегии в зависимости от количества корневых элементов
        let position;
        
        if (totalRoots <= 8) {
            // Равномерное распределение по кругу для малого количества
            const angle = (360 / totalRoots) * index;
            const radius = this.getDefaultRadius(entity.type) * 2;
            
            position = {
                x: this.config.center.x + radius * Math.cos(this.degToRad(angle)),
                y: this.config.center.y + radius * Math.sin(this.degToRad(angle))
            };
        } else {
            // Спиральное распределение для большого количества
            const spiralFactor = 0.8;
            const angle = 137.5 * index; // Золотой угол
            const radius = spiralFactor * Math.sqrt(index) * this.getDefaultRadius(entity.type);
            
            position = {
                x: this.config.center.x + radius * Math.cos(this.degToRad(angle)),
                y: this.config.center.y + radius * Math.sin(this.degToRad(angle))
            };
        }
        
        return {
            ...entity,
            position: this.normalizePosition(position),
            orbitalData: {
                angle: this.calculateAutoAngle(entity),
                radius: this.getDefaultRadius(entity.type),
                isRoot: true
            }
        };
    }

    async calculateOrbitalPosition(entity) {
        const parent = this.entities.get(entity.parent);
        if (!parent) {
            console.warn(`⚠️ Родитель не найден для сущности ${entity.level}, используется корневое позиционирование`);
            return this.calculateRootPosition(entity, [entity]);
        }
        
        const radius = entity['orbit-radius'] || this.getDefaultRadius(entity.type);
        const angle = entity['orbit-angle'] || this.calculateAutoAngle(entity);
        
        const position = {
            x: parent.position.x + radius * Math.cos(this.degToRad(angle)),
            y: parent.position.y + radius * Math.sin(this.degToRad(angle))
        };
        
        return {
            ...entity,
            position: this.normalizePosition(position),
            orbitalData: {
                angle: angle,
                radius: radius,
                parent: parent.level,
                isRoot: false
            }
        };
    }

    normalizePosition(position) {
        // Обеспечиваем, чтобы позиция оставалась в пределах viewport
        return {
            x: Math.max(5, Math.min(95, position.x)),
            y: Math.max(5, Math.min(95, position.y))
        };
    }

    resolveCollisions(entities) {
        if (entities.length <= 1) return entities;

        const collisionFreeEntities = [...entities];
        let hasCollisions = true;
        let iterations = 0;
        
        while (hasCollisions && iterations < this.config.maxCollisionIterations) {
            hasCollisions = false;
            let collisionCount = 0;
            
            for (let i = 0; i < collisionFreeEntities.length; i++) {
                for (let j = i + 1; j < collisionFreeEntities.length; j++) {
                    const entityA = collisionFreeEntities[i];
                    const entityB = collisionFreeEntities[j];
                    
                    if (this.checkCollision(entityA, entityB)) {
                        this.resolveEntityCollision(entityA, entityB, collisionFreeEntities);
                        hasCollisions = true;
                        collisionCount++;
                    }
                }
            }
            
            if (collisionCount > 0) {
                console.log(`🔧 Разрешено ${collisionCount} коллизий на итерации ${iterations + 1}`);
            }
            
            iterations++;
        }
        
        if (iterations >= this.config.maxCollisionIterations) {
            console.warn('⚠️ Достигнуто максимальное количество итераций разрешения коллизий');
        }
        
        return collisionFreeEntities;
    }

    checkCollision(entityA, entityB) {
        if (!entityA.position || !entityB.position) return false;
        
        // Используем пространственный индекс для оптимизации проверки
        if (this.spatialIndex.size > 0) {
            const gridKeyA = this.getSpatialGridKey(entityA.position);
            const gridKeyB = this.getSpatialGridKey(entityB.position);
            
            // Проверяем только сущности в соседних ячейках
            if (!this.areGridCellsAdjacent(gridKeyA, gridKeyB)) {
                return false;
            }
        }
        
        const dx = entityA.position.x - entityB.position.x;
        const dy = entityA.position.y - entityB.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const sizeA = this.calculateEntitySize(entityA) / 2;
        const sizeB = this.calculateEntitySize(entityB) / 2;
        const minDistance = this.config.minDistance + sizeA + sizeB;
        
        return distance < minDistance;
    }

    resolveEntityCollision(entityA, entityB, entities) {
        // Простой алгоритм разрешения коллизий - отталкивание
        const dx = entityA.position.x - entityB.position.x;
        const dy = entityA.position.y - entityB.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        const minDistance = this.config.minDistance + 
                           this.calculateEntitySize(entityA)/2 + 
                           this.calculateEntitySize(entityB)/2;
        
        const overlap = minDistance - distance;
        const shiftX = (dx / distance) * overlap * 0.5;
        const shiftY = (dy / distance) * overlap * 0.5;
        
        // Сдвигаем обе сущности
        entityA.position.x += shiftX;
        entityA.position.y += shiftY;
        entityB.position.x -= shiftX;
        entityB.position.y -= shiftY;
        
        // Нормализуем позиции
        entityA.position = this.normalizePosition(entityA.position);
        entityB.position = this.normalizePosition(entityB.position);
    }

    getSpatialGridKey(position) {
        const gridX = Math.floor(position.x / this.config.spatialGridSize);
        const gridY = Math.floor(position.y / this.config.spatialGridSize);
        return `${gridX},${gridY}`;
    }

    areGridCellsAdjacent(keyA, keyB) {
        const [x1, y1] = keyA.split(',').map(Number);
        const [x2, y2] = keyB.split(',').map(Number);
        
        return Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1;
    }

    buildSpatialIndex(entities) {
        this.spatialIndex.clear();
        
        entities.forEach(entity => {
            if (entity.position) {
                const gridKey = this.getSpatialGridKey(entity.position);
                if (!this.spatialIndex.has(gridKey)) {
                    this.spatialIndex.set(gridKey, []);
                }
                this.spatialIndex.get(gridKey).push(entity);
            }
        });
        
        this.cache.spatialIndexVersion++;
    }

    // ========== DOM ELEMENTS MANAGEMENT ==========

    async createCelestialElements(positionedEntities) {
        const fragment = document.createDocumentFragment();
        const creationPromises = [];
        
        // Сортируем сущности по z-index для правильного порядка отрисовки
        const sortedEntities = [...positionedEntities].sort((a, b) => 
            this.calculateZIndex(a) - this.calculateZIndex(b)
        );
        
        for (const entity of sortedEntities) {
            try {
                const element = this.createCelestialElement(entity);
                if (element) {
                    fragment.appendChild(element);
                    this.domElements.set(entity.level, element);
                    
                    // Регистрируем в IntersectionObserver
                    if (this.intersectionObserver) {
                        this.intersectionObserver.observe(element);
                    }
                    
                    creationPromises.push(this.setupElementInteractions(element, entity));
                }
            } catch (error) {
                console.error(`❌ Ошибка создания элемента для ${entity.level}:`, error);
            }
        }
        
        // Массовое добавление в DOM
        this.celestialContainer.appendChild(fragment);
        
        // Настройка взаимодействий
        await Promise.allSettled(creationPromises);
        
        this.dispatchEvent('entityPositioned', {
            count: positionedEntities.length,
            timestamp: Date.now(),
            source: 'sitemap'
        });
    }

    createCelestialElement(entity) {
        const element = document.createElement('div');
        element.className = `celestial-body celestial-body--${entity.type}`;
        element.dataset.entityId = entity.level;
        element.dataset.entityType = entity.type;
        
        // Устанавливаем базовые стили
        this.updateElementStyles(element, entity);
        
        // Добавляем содержимое
        const content = this.createEntityContent(entity);
        if (content) {
            element.appendChild(content);
        }
        
        // Добавляем индикатор прогресса если нужно
        if (entity.progress !== undefined) {
            this.updateProgressIndicator(element, entity.progress);
        }
        
        // Добавляем индикаторы для отладки
        if (this.app.isDevelopment && this.app.isDevelopment()) {
            this.addDebugIndicators(element, entity);
        }
        
        return element;
    }

    updateElementStyles(element, entity) {
        if (!entity.position) return;
        
        const size = this.calculateEntitySize(entity);
        const zIndex = this.calculateZIndex(entity);
        
        // Используем transform для лучшей производительности
        element.style.transform = `translate(${entity.position.x}%, ${entity.position.y}%)`;
        element.style.width = `${size}px`;
        element.style.height = `${size}px`;
        element.style.zIndex = zIndex;
        
        // Устанавливаем цвет если указан
        if (entity.color) {
            element.style.backgroundColor = entity.color;
            element.style.boxShadow = `0 0 20px ${entity.color}40`;
        }
        
        // Добавляем класс важности
        if (entity.importance) {
            element.classList.add(`importance--${entity.importance}`);
        }
        
        // Добавляем класс разблокировки
        if (entity.unlocked) {
            element.classList.add('celestial-body--unlocked');
        }
        
        // Добавляем класс завершения
        if (entity.completed) {
            element.classList.add('celestial-body--completed');
        }
        
        // Добавляем данные для анимации
        element.style.setProperty('--entity-size', `${size}px`);
        element.style.setProperty('--animation-duration', `${this.config.animationDuration}ms`);
        
        // Добавляем кастомные CSS переменные из метаданных
        if (entity.metadata?.visual) {
            Object.entries(entity.metadata.visual).forEach(([key, value]) => {
                element.style.setProperty(`--visual-${key}`, value);
            });
        }
    }

    calculateEntitySize(entity) {
        const baseSizes = {
            star: 100,
            planet: 80,
            moon: 40,
            asteroid: 25,
            debris: 15,
            blackhole: 100,
            galaxy: 90,
            nebula: 120,
            station: 35,
            gateway: 45,
            anomaly: 30
        };
        
        let baseSize = baseSizes[entity.type] || 30;
        
        // Применяем модификатор размера
        if (entity['size-modifier']) {
            baseSize *= parseFloat(entity['size-modifier']);
        }
        
        // Корректировка для мобильных устройств
        if (window.innerWidth < 768) {
            baseSize *= 0.7;
        }
        
        return Math.max(10, Math.min(200, baseSize)); // Ограничиваем размер
    }

    calculateZIndex(entity) {
        const typeLayers = {
            blackhole: 1000,
            galaxy: 900,
            nebula: 800,
            star: 750,
            planet: 700,
            moon: 600,
            asteroid: 500,
            debris: 400,
            station: 300,
            gateway: 350,
            anomaly: 450
        };
        
        const importanceLayers = {
            high: 100,
            medium: 50,
            low: 10
        };
        
        const depthLayers = (entity.metadata?.depth || 0) * 5;
        
        const baseLayer = typeLayers[entity.type] || 200;
        const importanceBonus = importanceLayers[entity.importance] || 25;
        
        return baseLayer + importanceBonus + depthLayers;
    }

    createEntityContent(entity) {
        const content = document.createElement('div');
        content.className = 'celestial-body__content';
        
        // Иконка сущности
        if (entity.icon) {
            const icon = document.createElement('span');
            icon.className = 'celestial-body__icon';
            icon.textContent = entity.icon;
            icon.setAttribute('aria-label', entity.title || entity.type);
            content.appendChild(icon);
        }
        
        // Название (только для важных объектов)
        if ((entity.type === 'star' || entity.importance === 'high') && entity.title) {
            const title = document.createElement('span');
            title.className = 'celestial-body__title';
            title.textContent = entity.title;
            title.setAttribute('aria-hidden', 'true');
            content.appendChild(title);
        }
        
        return content;
    }

    updateProgressIndicator(element, progress) {
        let indicator = element.querySelector('.progress-indicator');
        
        if (!indicator && progress > 0) {
            indicator = document.createElement('div');
            indicator.className = 'progress-indicator';
            element.appendChild(indicator);
        }
        
        if (indicator) {
            indicator.style.setProperty('--progress', `${progress}%`);
            indicator.classList.toggle('completed', progress >= 100);
        }
    }

    addDebugIndicators(element, entity) {
        const debug = document.createElement('div');
        debug.className = 'debug-info';
        debug.innerHTML = `
            <div class="debug-id">${entity.level}</div>
            <div class="debug-position">${Math.round(entity.position.x)}%, ${Math.round(entity.position.y)}%</div>
            <div class="debug-type">${entity.type}</div>
            <div class="debug-title">${entity.title}</div>
            ${entity.unlocked ? '<div class="debug-unlocked">🔓</div>' : ''}
            ${entity.completed ? '<div class="debug-completed">✅</div>' : ''}
        `;
        debug.style.display = 'none';
        element.appendChild(debug);
        
        // Показываем debug информацию при наведении с Shift
        element.addEventListener('mouseenter', (e) => {
            if (e.shiftKey) {
                debug.style.display = 'block';
            }
        });
        
        element.addEventListener('mouseleave', () => {
            debug.style.display = 'none';
        });
    }

    async setupElementInteractions(element, entity) {
        // Обработчики взаимодействий
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleEntityClick(entity);
        });
        
        element.addEventListener('mouseenter', (e) => {
            e.stopPropagation();
            this.handleEntityHover(entity, true);
        });
        
        element.addEventListener('mouseleave', (e) => {
            e.stopPropagation();
            this.handleEntityHover(entity, false);
        });
        
        // Добавляем поддержку клавиатуры
        element.setAttribute('tabindex', '0');
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleEntityClick(entity);
            }
        });
        
        // Регистрируем в менеджере видимости
        const visibilityManager = this.app.getComponent('visibilityManager');
        if (visibilityManager) {
            visibilityManager.registerEntity(entity);
        }

        // Записываем взаимодействие в аналитику
        this.analyticsCollector.recordInteraction('element_created', entity);
    }

    handleEntityClick(entity) {
        console.log(`🎯 Активация сущности из sitemap: ${entity.level} - ${entity.title}`);
        
        // Записываем в аналитику
        this.analyticsCollector.recordInteraction('click', entity, {
            title: entity.title,
            type: entity.type
        });
        
        // Навигация по URL из sitemap
        if (entity.metadata?.url) {
            this.navigateToPage(entity.metadata.url, entity);
        }

        this.dispatchEvent('entityActivated', { 
            entity,
            timestamp: Date.now(),
            source: 'sitemap'
        });

        // Активируем предиктивную систему
        if (this.predictiveLoader.enabled) {
            this.predictiveLoader.predictNextActions(entity);
        }
    }

    navigateToPage(url, entity) {
        console.log(`🧭 Навигация к странице из sitemap: ${entity.title} -> ${url}`);
        
        // Можно использовать History API или обычную навигацию
        if (this.integration.navigation) {
            this.integration.navigation.navigateTo(url, entity);
        } else {
            // Fallback на обычную навигацию
            window.location.href = url;
        }
    }

    handleEntityHover(entity, isHovering) {
        const element = this.domElements.get(entity.level);
        if (element) {
            element.classList.toggle('celestial-body--hover', isHovering);
            
            if (isHovering) {
                this.analyticsCollector.recordInteraction('hover_start', entity, {
                    title: entity.title
                });
                this.dispatchEvent('entityHoverStart', { entity });
            } else {
                this.analyticsCollector.recordInteraction('hover_end', entity, {
                    title: entity.title,
                    duration: Date.now() - (this.analyticsCollector.lastHoverStart || Date.now())
                });
                this.dispatchEvent('entityHoverEnd', { entity });
            }
        }
    }

    async animateGalaxyEntrance() {
        const elements = Array.from(this.domElements.values());
        if (elements.length === 0) return;
        
        const animationPromises = [];
        const staggerDelay = Math.min(100, 2000 / elements.length); // Адаптивная задержка
        
        elements.forEach((element, index) => {
            const promise = new Promise(resolve => {
                setTimeout(() => {
                    element.classList.add('celestial-body--entering');
                    
                    const onAnimationEnd = () => {
                        element.classList.remove('celestial-body--entering');
                        element.classList.add('celestial-body--active');
                        resolve();
                    };
                    
                    // Используем как CSS анимации, так и fallback
                    if (element.getAnimations) {
                        const animations = element.getAnimations();
                        if (animations.length > 0) {
                            animations[0].finished.then(onAnimationEnd);
                        } else {
                            element.addEventListener('animationend', onAnimationEnd, { once: true });
                        }
                    } else {
                        element.addEventListener('animationend', onAnimationEnd, { once: true });
                    }
                    
                }, index * staggerDelay);
            });
            
            animationPromises.push(promise);
        });
        
        await Promise.allSettled(animationPromises);
        console.log('✨ Анимация появления галактики из sitemap завершена');
    }

    // ========== EVENT HANDLERS ==========

    setupEventListeners() {
        // Основное событие для перестроения из sitemap
        document.addEventListener('sitemapUpdated', (event) => {
            console.log('🔄 Событие sitemapUpdated получено');
            this.loadSitemap();
        });

        // События видимости и взаимодействий
        document.addEventListener('visibilityUpdated', (event) => {
            this.handleVisibilityUpdate(event.detail);
        });

        document.addEventListener('entitiesChanged', (event) => {
            this.handleEntitiesChange(event.detail);
        });

        document.addEventListener('adaptiveRepositioning', (event) => {
            this.handleAdaptiveRepositioning(event.detail);
        });

        // События v2.1
        document.addEventListener('predictivePathCalculated', (event) => {
            this.handlePredictivePath(event.detail);
        });

        document.addEventListener('userProgressUpdated', (event) => {
            this.handleUserProgressUpdate(event.detail);
        });

        document.addEventListener('contentPreloaded', (event) => {
            this.handleContentPreloaded(event.detail);
        });

        // Событие для принудительного обновления
        document.addEventListener('forceGalaxyRebuild', () => {
            this.loadSitemap();
        });

        // События навигации
        document.addEventListener('navigateToLevel', (event) => {
            this.handleNavigateToLevel(event.detail);
        });
    }

    handleVisibilityUpdate(detail) {
        this.domElements.forEach((element, levelId) => {
            const shouldBeVisible = detail.visibleEntities?.some(e => e.level === levelId);
            const isCurrentlyVisible = element.style.display !== 'none';
            
            if (shouldBeVisible && !isCurrentlyVisible) {
                element.style.display = 'block';
                element.classList.add('celestial-body--visible');
            } else if (!shouldBeVisible && isCurrentlyVisible) {
                element.style.display = 'none';
                element.classList.remove('celestial-body--visible');
            }
        });
    }

    handleElementVisibilityChange(entityId, isVisible) {
        const element = this.domElements.get(entityId);
        if (element) {
            element.classList.toggle('celestial-body--in-viewport', isVisible);
        }
    }

    handleEntitiesChange(detail) {
        this.scheduleGalaxyRebuild();
    }

    handleAdaptiveRepositioning(detail) {
        console.log('🔄 Адаптивное перепозиционирование');
        this.schedulePositionRecalculation();
    }

    handleViewportResize(contentRect) {
        if (contentRect) {
            console.log(`📐 Изменение размера viewport: ${contentRect.width}x${contentRect.height}`);
        }
        this.schedulePositionRecalculation();
    }

    handlePredictivePath(detail) {
        if (!this.predictiveLoader.enabled) return;
        
        const { entityId, probability, reason } = detail;
        this.predictiveLoader.predictNextActions(this.entities.get(entityId));
        
        // Записываем в аналитику поведения
        this.recordUserBehavior('predictive_navigation', {
            entity: entityId,
            probability,
            reason,
            timestamp: Date.now()
        });
    }

    handleUserProgressUpdate(detail) {
        const { levelId, progress, unlocked, completed } = detail;
        
        // Обновляем визуальное состояние сущности
        const element = this.domElements.get(levelId);
        const entity = this.entities.get(levelId);
        
        if (element && entity) {
            entity.unlocked = unlocked !== undefined ? unlocked : entity.unlocked;
            entity.completed = completed !== undefined ? completed : entity.completed;
            entity.progress = progress !== undefined ? progress : entity.progress;
            
            element.classList.toggle('celestial-body--unlocked', entity.unlocked);
            element.classList.toggle('celestial-body--completed', entity.completed);
            element.classList.toggle('celestial-body--locked', !entity.unlocked);
            
            // Обновляем индикатор прогресса
            this.updateProgressIndicator(element, entity.progress);
        }
    }

    handleContentPreloaded(detail) {
        const { levelId, success, loadTime } = detail;
        
        // Обновляем состояние предиктивной загрузки
        this.predictiveLoader.preloadQueue.delete(levelId);
        
        if (success) {
            console.log(`✅ Контент предзагружен: ${levelId} за ${loadTime}мс`);
        }
    }

    handleNavigateToLevel(detail) {
        const { levelId } = detail;
        const entity = this.entities.get(levelId);
        
        if (entity && entity.metadata?.url) {
            this.navigateToPage(entity.metadata.url, entity);
        } else {
            console.warn(`⚠️ Навигация к ${levelId} невозможна: сущность или URL не найдены`);
        }
    }

    // ========== QUEUE AND RECALCULATION SYSTEM ==========

    scheduleGalaxyRebuild() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        this.animationFrameId = requestAnimationFrame(() => {
            this.loadSitemap();
        });
    }

    schedulePositionRecalculation() {
        this.dirtyEntities.clear();
        this.entities.forEach((entity, levelId) => {
            this.dirtyEntities.add(levelId);
        });
        
        this.processRecalculationQueue();
    }

    processRecalculationQueue() {
        if (this.recalculationQueue.length === 0 && this.dirtyEntities.size > 0) {
            this.recalculationQueue = Array.from(this.dirtyEntities);
        }
        
        if (this.recalculationQueue.length === 0) return;
        
        const batchSize = Math.min(10, this.recalculationQueue.length);
        const batch = this.recalculationQueue.splice(0, batchSize);
        
        batch.forEach(entityId => {
            const entity = this.entities.get(entityId);
            const element = this.domElements.get(entityId);
            
            if (entity && element) {
                this.updateElementPosition(element, entity);
                this.dirtyEntities.delete(entityId);
            }
        });
        
        if (this.recalculationQueue.length > 0) {
            requestAnimationFrame(() => this.processRecalculationQueue());
        }
    }

    updateElementPosition(element, entity) {
        if (!entity.position) return;
        
        // Плавное обновление позиции
        element.style.transition = `transform ${this.config.animationDuration}ms ease-out`;
        element.style.transform = `translate(${entity.position.x}%, ${entity.position.y}%)`;
        
        const onTransitionEnd = () => {
            element.style.transition = '';
        };
        
        element.addEventListener('transitionend', onTransitionEnd, { once: true });
        
        // Fallback на случай если transitionend не сработает
        setTimeout(onTransitionEnd, this.config.animationDuration + 100);
    }

    // ========== HELPER METHODS ==========

    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    radToDeg(radians) {
        return radians * (180 / Math.PI);
    }

    getDefaultRadius(entityType) {
        return this.config.baseOrbitRadii[entityType] || 50;
    }

    calculateAutoAngle(entity) {
        const siblings = this.getSiblings(entity);
        const siblingCount = siblings.length;
        const index = siblings.findIndex(e => e.level === entity.level);
        
        return (360 / Math.max(1, siblingCount)) * index;
    }

    getSiblings(entity) {
        return Array.from(this.entities.values()).filter(e => 
            e.parent === entity.parent && e.level !== entity.level
        );
    }

    countEntities(entityHierarchy) {
        let count = 0;
        const countRecursive = (nodes, depth = 0) => {
            if (depth > this.config.maxRecursionDepth) {
                console.warn('⚠️ Достигнута максимальная глубина рекурсии');
                return;
            }
            
            nodes.forEach(node => {
                count++;
                if (node.children && node.children.length > 0) {
                    countRecursive(node.children, depth + 1);
                }
            });
        };
        
        countRecursive(entityHierarchy);
        return count;
    }

    flattenEntityTree(entityTree) {
        const flattened = [];
        const flattenRecursive = (nodes, depth = 0) => {
            if (depth > this.config.maxRecursionDepth) return;
            
            nodes.forEach(node => {
                flattened.push({
                    ...node,
                    metadata: {
                        ...node.metadata,
                        depth: depth
                    }
                });
                
                if (node.children && node.children.length > 0) {
                    flattenRecursive(node.children, depth + 1);
                }
            });
        };
        
        flattenRecursive(entityTree);
        return flattened;
    }

    getPerformanceMetrics() {
        return {
            entityCount: this.cache.entityCount,
            domElements: this.domElements.size,
            spatialIndexSize: this.spatialIndex.size,
            cacheHits: this.positionCache.size,
            lastRebuildTime: this.cache.lastRebuildTime,
            predictivePaths: this.cache.predictivePaths.size,
            userPatterns: this.cache.userBehaviorPatterns.size,
            sitemapAge: Date.now() - this.cache.lastLoaded
        };
    }

    calculatePathsFromRoot(root, allEntities, currentPath = [], depth = 0) {
        if (depth >= this.config.predictiveLoadingDepth) return [currentPath];
        
        const paths = [];
        const children = allEntities.filter(e => e.parent === root.level);
        
        if (children.length === 0) return [currentPath];
        
        children.forEach(child => {
            const newPath = [...currentPath, child.level];
            paths.push(newPath);
            
            // Рекурсивно вычисляем пути для детей
            const childPaths = this.calculatePathsFromRoot(child, allEntities, newPath, depth + 1);
            paths.push(...childPaths);
        });
        
        return paths;
    }

    calculateProbablePaths(currentEntity) {
        // Упрощенная логика расчета вероятных путей
        const paths = [];
        const children = Array.from(this.entities.values()).filter(e => e.parent === currentEntity.level);
        
        children.forEach(child => {
            paths.push(child.level);
        });
        
        return paths;
    }

    calculatePreloadPriority(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity) return 0;
        
        let priority = 0;
        
        // Приоритет на основе важности
        const importanceWeights = { high: 3, medium: 2, low: 1 };
        priority += importanceWeights[entity.importance] || 1;
        
        // Приоритет на основе глубины в иерархии
        priority += (entity.metadata?.depth || 0) * 0.5;
        
        // Приоритет на основе пользовательских паттернов
        const userInteractions = this.analyticsCollector.interactions.get(entityId) || [];
        priority += Math.min(userInteractions.length * 0.1, 2);
        
        return priority;
    }

    calculateAverageInteractionTime() {
        let totalTime = 0;
        let count = 0;
        
        this.analyticsCollector.interactions.forEach(interactions => {
            interactions.forEach(interaction => {
                if (interaction.duration) {
                    totalTime += interaction.duration;
                    count++;
                }
            });
        });
        
        return count > 0 ? totalTime / count : 0;
    }

    recordUserBehavior(type, data) {
        if (!this.cache.userBehaviorPatterns.has(type)) {
            this.cache.userBehaviorPatterns.set(type, []);
        }
        
        this.cache.userBehaviorPatterns.get(type).push({
            ...data,
            recordedAt: Date.now()
        });
        
        // Ограничиваем размер данных для каждой категории
        const maxRecords = 100;
        if (this.cache.userBehaviorPatterns.get(type).length > maxRecords) {
            this.cache.userBehaviorPatterns.set(
                type, 
                this.cache.userBehaviorPatterns.get(type).slice(-maxRecords)
            );
        }
    }

    flushAnalyticsData() {
        const metrics = this.analyticsCollector.getSessionMetrics();
        const behaviorPatterns = Object.fromEntries(this.cache.userBehaviorPatterns);
        
        this.dispatchEvent('analyticsDataFlushed', {
            metrics,
            behaviorPatterns,
            timestamp: Date.now(),
            sitemapInfo: this.getSitemapInfo()
        });
        
        // Очищаем собранные данные
        this.analyticsCollector.interactions.clear();
    }

    reportPerformanceMetrics(metrics) {
        if (this.integration.performanceMonitor) {
            this.integration.performanceMonitor.recordMetric('galaxyBuild', metrics);
        }
        
        // Локальное хранение метрик для оптимизации
        this.cache.lastBuildMetrics = metrics;
    }

    debounce(func, wait) {
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

    setupResizeObserver() {
        if (typeof ResizeObserver === 'undefined') {
            console.warn('⚠️ ResizeObserver не поддерживается, используется fallback');
            window.addEventListener('resize', this.debounce(() => {
                this.handleViewportResize();
            }, 250));
            return;
        }

        this.resizeObserver = new ResizeObserver((entries) => {
            this.handleViewportResize(entries[0].contentRect);
        });

        if (this.celestialContainer) {
            this.resizeObserver.observe(this.celestialContainer);
        }
    }

    setupIntersectionObserver() {
        if (typeof IntersectionObserver === 'undefined') {
            console.warn('⚠️ IntersectionObserver не поддерживается');
            return;
        }

        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const entityId = entry.target.dataset.entityId;
                    if (entityId) {
                        this.handleElementVisibilityChange(entityId, entry.isIntersecting);
                    }
                });
            },
            {
                root: this.celestialContainer,
                threshold: 0.1,
                rootMargin: '50px'
            }
        );
    }

    setupPredictiveLoading() {
        // Настройка предиктивной системы загрузки
        this.predictiveLoader = {
            enabled: true,
            lastUserAction: Date.now(),
            predictedPaths: new Set(),
            preloadQueue: new Map(),
            
            predictNextActions: (currentEntity) => {
                if (!this.predictiveLoader.enabled) return;
                
                const paths = this.calculateProbablePaths(currentEntity);
                paths.forEach(path => {
                    this.predictiveLoader.predictedPaths.add(path);
                    this.schedulePreload(path);
                });
            },
            
            schedulePreload: (entityId) => {
                if (!this.predictiveLoader.preloadQueue.has(entityId)) {
                    this.predictiveLoader.preloadQueue.set(entityId, {
                        scheduledAt: Date.now(),
                        priority: this.calculatePreloadPriority(entityId)
                    });
                    
                    this.dispatchEvent('predictivePreloadScheduled', { entityId });
                }
            }
        };
    }

    setupAnalyticsCollection() {
        // Сбор аналитики взаимодействий
        this.analyticsCollector = {
            interactions: new Map(),
            sessionStart: Date.now(),
            lastHoverStart: null,
            
            recordInteraction: (type, entity, metadata = {}) => {
                const interaction = {
                    type,
                    entity: entity.level,
                    title: entity.title,
                    entityType: entity.type,
                    timestamp: Date.now(),
                    duration: metadata.duration || 0,
                    success: metadata.success !== false,
                    ...metadata
                };
                
                if (type === 'hover_start') {
                    this.analyticsCollector.lastHoverStart = Date.now();
                } else if (type === 'hover_end' && this.analyticsCollector.lastHoverStart) {
                    interaction.duration = Date.now() - this.analyticsCollector.lastHoverStart;
                }
                
                if (!this.analyticsCollector.interactions.has(entity.level)) {
                    this.analyticsCollector.interactions.set(entity.level, []);
                }
                
                this.analyticsCollector.interactions.get(entity.level).push(interaction);
                
                // Отправка аналитики в основную систему
                this.dispatchEvent('interactionAnalyticsRecorded', {
                    entity: entity.level,
                    interactionType: type,
                    data: interaction
                });
            },
            
            getSessionMetrics: () => {
                const allInteractions = Array.from(this.analyticsCollector.interactions.values())
                    .reduce((acc, interactions) => acc.concat(interactions), []);
                
                return {
                    sessionDuration: Date.now() - this.analyticsCollector.sessionStart,
                    totalInteractions: allInteractions.length,
                    entitiesInteracted: this.analyticsCollector.interactions.size,
                    averageInteractionTime: this.calculateAverageInteractionTime(),
                    interactionTypes: allInteractions.reduce((acc, interaction) => {
                        acc[interaction.type] = (acc[interaction.type] || 0) + 1;
                        return acc;
                    }, {})
                };
            }
        };

        // Периодическая отправка аналитики
        setInterval(() => {
            this.flushAnalyticsData();
        }, this.config.analyticsInterval);
    }

    // ========== PUBLIC API ==========

    getAllEntities() {
        return Array.from(this.entities.values());
    }

    getEntity(levelId) {
        return this.entities.get(levelId);
    }

    getEntityElement(levelId) {
        return this.domElements.get(levelId);
    }

    getEntityAtPosition(x, y, tolerance = 20) {
        // Поиск сущности по позиции с учетом tolerance
        for (const [levelId, entity] of this.entities) {
            if (entity.position && 
                Math.abs(entity.position.x - x) <= tolerance && 
                Math.abs(entity.position.y - y) <= tolerance) {
                return entity;
            }
        }
        return null;
    }

    getPredictivePaths() {
        return Array.from(this.cache.predictivePaths);
    }

    getUserBehaviorAnalytics() {
        return {
            interactions: Object.fromEntries(this.analyticsCollector.interactions),
            patterns: Object.fromEntries(this.cache.userBehaviorPatterns),
            sessionMetrics: this.analyticsCollector.getSessionMetrics()
        };
    }

    setPredictiveLoading(enabled) {
        this.predictiveLoader.enabled = enabled;
        console.log(`🔮 Предиктивная загрузка: ${enabled ? 'включена' : 'выключена'}`);
    }

    // ========== SITEMAP PUBLIC API ==========

    async reloadSitemap() {
        console.log('🔄 Принудительная перезагрузка sitemap');
        return await this.loadSitemap();
    }

    getSitemapInfo() {
        if (!this.cache.sitemap) return null;
        
        return {
            version: this.cache.sitemap.version,
            generated: this.cache.sitemap.generated,
            baseUrl: this.cache.sitemap.baseUrl,
            pageCount: this.cache.sitemap.pages?.length || 0,
            lastLoaded: new Date(this.cache.lastLoaded).toISOString(),
            cacheAge: Date.now() - this.cache.lastLoaded,
            state: {
                initialized: this.state.initialized,
                sitemapLoaded: this.state.sitemapLoaded,
                building: this.state.building,
                error: this.state.error
            }
        };
    }

    findPageByLevel(level) {
        if (!this.cache.sitemap?.pages) return null;
        return this.cache.sitemap.pages.find(page => page.level === level);
    }

    findPagesByTag(tag) {
        if (!this.cache.sitemap?.pages) return [];
        return this.cache.sitemap.pages.filter(page => 
            page.metadata?.tags?.includes(tag)
        );
    }

    findPagesByType(type) {
        if (!this.cache.sitemap?.pages) return [];
        return this.cache.sitemap.pages.filter(page => page.type === type);
    }

    getPageHierarchy(level) {
        const page = this.findPageByLevel(level);
        if (!page) return null;

        const hierarchy = {
            ...page,
            ancestors: this.getAncestors(level),
            descendants: this.getDescendants(level)
        };

        return hierarchy;
    }

    getAncestors(level) {
        const ancestors = [];
        let currentLevel = level;
        
        while (currentLevel) {
            const page = this.findPageByLevel(currentLevel);
            if (!page || !page.parent) break;
            
            const parent = this.findPageByLevel(page.parent);
            if (parent) {
                ancestors.unshift(parent);
                currentLevel = parent.level;
            } else {
                break;
            }
        }
        
        return ancestors;
    }

    getDescendants(level) {
        const descendants = [];
        const collectChildren = (parentLevel) => {
            const children = this.cache.sitemap.pages.filter(page => page.parent === parentLevel);
            children.forEach(child => {
                descendants.push(child);
                collectChildren(child.level);
            });
        };
        
        collectChildren(level);
        return descendants;
    }

    getSitemapStats() {
        if (!this.cache.sitemap?.pages) return null;
        
        const pages = this.cache.sitemap.pages;
        const stats = {
            total: pages.length,
            byType: {},
            byImportance: {},
            withParent: pages.filter(p => p.parent).length,
            rootPages: pages.filter(p => !p.parent).length,
            taggedPages: pages.filter(p => p.metadata?.tags?.length > 0).length,
            unlockedPages: pages.filter(p => p.metadata?.unlocked).length,
            completedPages: pages.filter(p => p.metadata?.completed).length
        };
        
        // Статистика по типам
        pages.forEach(page => {
            stats.byType[page.type] = (stats.byType[page.type] || 0) + 1;
            stats.byImportance[page.importance || 'medium'] = (stats.byImportance[page.importance || 'medium'] || 0) + 1;
        });
        
        return stats;
    }

    dispatchEvent(eventName, detail) {
        try {
            const event = new CustomEvent(eventName, { detail });
            document.dispatchEvent(event);
        } catch (error) {
            console.error(`❌ Ошибка отправки события ${eventName}:`, error);
        }
    }

    // ========== LIFECYCLE METHODS ==========

    async start() {
        console.log('🏗️ GalaxyBuilder запущен (Sitemap-driven)');
        return Promise.resolve();
    }

    async recover() {
        console.log('🔄 Восстановление GalaxyBuilder...');
        
        this.positionCache.clear();
        this.dirtyEntities.clear();
        this.recalculationQueue = [];
        
        // Перестраиваем пространственный индекс
        const entities = this.getAllEntities();
        this.buildSpatialIndex(entities);
        
        console.log('✅ GalaxyBuilder восстановлен');
        return true;
    }

    async attemptEnhancedRecovery(error) {
        console.log('🔄 Попытка расширенного восстановления v2.1...');
        
        try {
            // Сохраняем состояние перед восстановлением
            const recoveryState = {
                entities: this.getAllEntities(),
                domElementsCount: this.domElements.size,
                error: error.message,
                sitemapInfo: this.getSitemapInfo()
            };
            
            // Очищаем проблемное состояние
            this.clearPreviousBuild();
            
            // Пытаемся перестроить с упрощенной стратегией
            if (this.cache.sitemap) {
                // Используем максимально упрощенную стратегию
                this.config.performanceThreshold = Infinity;
                this.predictiveLoader.enabled = false;
                
                const hierarchy = this.convertSitemapToHierarchy(this.cache.sitemap);
                await this.buildGalaxy(hierarchy);
                
                // Восстанавливаем предиктивную систему после успешного восстановления
                setTimeout(() => {
                    this.predictiveLoader.enabled = true;
                }, 5000);
                
                this.dispatchEvent('recoveryCompleted', {
                    success: true,
                    recoveryState,
                    timestamp: Date.now()
                });
                
                return true;
            }
        } catch (recoveryError) {
            console.error('💥 Расширенное восстановление не удалось:', recoveryError);
            
            this.dispatchEvent('recoveryFailed', {
                error: recoveryError.message,
                timestamp: Date.now()
            });
        }
        
        return false;
    }

    destroy() {
        console.log('🧹 Очистка GalaxyBuilder (Sitemap-driven)...');
        
        // Очищаем интервал авто-обновления
        if (this.sitemapReloadInterval) {
            clearInterval(this.sitemapReloadInterval);
        }
        
        // Стандартная очистка
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        // Очищаем DOM
        if (this.celestialContainer) {
            this.celestialContainer.innerHTML = '';
        }
        
        // Очищаем все коллекции
        this.entities.clear();
        this.positionCache.clear();
        this.domElements.clear();
        this.spatialIndex.clear();
        this.dirtyEntities.clear();
        this.recalculationQueue = [];
        this.interactionAnalytics.clear();
        this.predictiveLoadingQueue.clear();
        this.cache.lruCache.clear();
        this.cache.predictivePaths.clear();
        this.cache.userBehaviorPatterns.clear();
        this.cache.sitemap = null;
        this.cache.sitemapHash = null;
        
        // Сбрасываем состояние
        this.state = {
            initialized: false,
            building: false,
            sitemapLoaded: false,
            error: null,
            lastBuildDuration: 0
        };
        
        console.log('✅ GalaxyBuilder (Sitemap-driven) очищен');
    }
}

// Глобальная доступность для инициализации
window.GalaxyBuilder = GalaxyBuilder;

}
