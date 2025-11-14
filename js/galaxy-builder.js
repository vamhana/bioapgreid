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
        
        // SITEMAP CONFIG - основной источник
        this.sitemapConfig = {
            sitemapUrl: '/sitemap.json',
            autoReload: true,
            reloadInterval: 30000, // 30 секунд
            cacheDuration: 60000, // 1 минута
            fallbackUrl: '/api/sitemap' // резервный источник
        };

        // Конфигурация позиционирования v2.1
        this.config = {
            baseOrbitRadii: {
                star: 200,       // ⭐ звезды больше
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
            zoomSensitivity: 0.1
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
            userBehaviorPatterns: new Map()
        };

        // Интеграции
        this.integration = {
            navigation: null,
            interaction: null,
            contentManager: null,
            performanceMonitor: null
        };
    }

    async init() {
        console.log('🏗️ Инициализация GalaxyBuilder v2.1 Unified (Sitemap-driven)...');
        
        try {
            this.celestialContainer = document.getElementById('celestialBodies');
            if (!this.celestialContainer) {
                throw new Error('Контейнер celestialBodies не найден');
            }

            // Инициализация AdaptivePositioning
            this.adaptivePositioning = this.app.getComponent('adaptivePositioning');
            
            // Инициализация интеграций
            await this.initializeV21Integrations();
            
            this.setupEventListeners();
            this.setupResizeObserver();
            this.setupIntersectionObserver();
            this.setupPredictiveLoading();
            this.setupAnalyticsCollection();
            this.setupSitemapAutoReload();
            
            // Автоматическая загрузка sitemap при инициализации
            await this.loadSitemap();
            
            console.log('✅ GalaxyBuilder v2.1 Unified инициализирован (Sitemap-driven)');
        } catch (error) {
            console.error('❌ Ошибка инициализации GalaxyBuilder:', error);
            throw error;
        }
    }

    // ========== SITEMAP-CENTRIC METHODS ==========

    async loadSitemap(sitemapUrl = this.sitemapConfig.sitemapUrl) {
        console.log('📡 Загрузка sitemap как источника истины...');
        
        try {
            const response = await fetch(sitemapUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const sitemap = await response.json();
            console.log('✅ Sitemap загружен:', {
                version: sitemap.version,
                pages: sitemap.pages?.length || 0,
                generated: sitemap.generated
            });

            // Валидация sitemap
            if (!this.validateSitemap(sitemap)) {
                throw new Error('Sitemap validation failed');
            }

            // Сохраняем в кэш
            this.cache.sitemap = sitemap;
            this.cache.lastLoaded = Date.now();

            // Преобразуем в иерархию и строим галактику
            const hierarchy = this.convertSitemapToHierarchy(sitemap);
            await this.buildGalaxy(hierarchy);

            // Отправляем событие о успешной загрузке
            this.dispatchEvent('sitemapLoaded', {
                sitemap: sitemap,
                hierarchy: hierarchy,
                timestamp: Date.now()
            });

            return sitemap;

        } catch (error) {
            console.error('❌ Ошибка загрузки sitemap:', error);
            
            // Попытка использовать fallback
            if (sitemapUrl !== this.sitemapConfig.fallbackUrl) {
                console.log('🔄 Попытка использовать fallback источник...');
                return await this.loadSitemap(this.sitemapConfig.fallbackUrl);
            }
            
            this.dispatchEvent('sitemapLoadError', {
                error: error.message,
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

        // Проверяем обязательные поля для каждой страницы
        const validPages = sitemap.pages.every(page => {
            if (!page.level) {
                console.error('❌ Page missing level field:', page);
                return false;
            }
            if (!page.type) {
                console.warn('⚠️ Page missing type, using default:', page.level);
                page.type = 'planet'; // default
            }
            return true;
        });

        if (!validPages) {
            console.error('❌ Sitemap contains invalid pages');
            return false;
        }

        console.log('✅ Sitemap validation passed');
        return true;
    }

    convertSitemapToHierarchy(sitemap) {
        const pages = sitemap.pages || [];
        console.log(`🔄 Преобразование ${pages.length} страниц в иерархию...`);

        // Создаем карту всех страниц для быстрого доступа
        const pagesMap = new Map();
        
        pages.forEach(page => {
            // Обогащаем данными для визуализации
            const enrichedPage = this.enrichPageWithVisualData(page);
            pagesMap.set(page.level, enrichedPage);
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
            console.warn(`⚠️ Не все страницы добавлены в иерархию: ${usedLevels.size}/${pages.length}`);
        }

        console.log(`🌳 Построена иерархия: ${hierarchy.length} корневых элементов, всего ${usedLevels.size} сущностей`);
        return hierarchy;
    }

    enrichPageWithVisualData(page) {
        // Берем данные из sitemap и обогащаем для визуализации
        return {
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
                unlocked: page.metadata?.unlocked || false,
                completed: page.metadata?.completed || false,
                progress: page.metadata?.progress || 0,
                
                // Визуальные метаданные
                visual: {
                    glow: page.metadata?.visual?.glow || (page.importance === 'high'),
                    pulse: page.metadata?.visual?.pulse || false,
                    rotation: page.metadata?.visual?.rotation || 0
                }
            }
        };
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
                console.log('🔄 Авто-обновление sitemap...');
                await this.loadSitemap();
            } catch (error) {
                console.warn('⚠️ Ошибка авто-обновления sitemap:', error);
            }
        }, this.sitemapConfig.reloadInterval);

        console.log('🔃 Авто-обновление sitemap настроено');
    }

    // ========== ОБНОВЛЕННЫЕ ОБРАБОТЧИКИ СОБЫТИЙ ==========

    setupEventListeners() {
        // Основное событие для перестроения из sitemap
        document.addEventListener('sitemapUpdated', (event) => {
            console.log('🔄 Событие sitemapUpdated получено');
            this.loadSitemap();
        });

        // События видимости и взаимодействий (остаются)
        document.addEventListener('visibilityUpdated', (event) => {
            this.handleVisibilityUpdate(event.detail);
        });

        document.addEventListener('entityActivated', (event) => {
            this.handleEntityActivation(event.detail);
        });

        // События для интеграций
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
    }

    handleEntityActivation(detail) {
        const { entity } = detail;
        console.log(`🎯 Активация сущности из sitemap: ${entity.level}`);

        // Записываем в аналитику
        this.analyticsCollector.recordInteraction('click', entity);

        // Навигация по URL из sitemap
        if (entity.metadata?.url) {
            this.navigateToPage(entity.metadata.url, entity);
        }

        // Активируем предиктивную систему
        if (this.predictiveLoader.enabled) {
            this.predictiveLoader.predictNextActions(entity);
        }
    }

    navigateToPage(url, entity) {
        console.log(`🧭 Навигация к: ${url}`);
        
        // Можно использовать History API или обычную навигацию
        if (this.integration.navigation) {
            this.integration.navigation.navigateTo(url, entity);
        } else {
            // Fallback на обычную навигацию
            window.location.href = url;
        }
    }

    // ========== ОБНОВЛЕННЫЕ PUBLIC METHODS ==========

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
            cacheAge: Date.now() - this.cache.lastLoaded
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

    // ========== ОБНОВЛЕННЫЙ МЕТОД УНИЧТОЖЕНИЯ ==========

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
        
        console.log('✅ GalaxyBuilder (Sitemap-driven) очищен');
    }
}

// Глобальная доступность
window.GalaxyBuilder = GalaxyBuilder;
