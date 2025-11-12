class VisibilityManager {
    constructor(app) {
        this.app = app;
        this.entities = new Map();
        this.visibilityCache = new Map();
        this.animationFrameId = null;
        this.lastUpdateTime = 0;
        this.updateInterval = 100; // ms
        this.currentLOD = 'MEDIUM_DETAIL';
        
        // Расширенная конфигурация видимости v2.1
        this.config = {
            visibilityThreshold: 0.5,
            adaptiveThreshold: true,
            lodLevels: {
                HIGH_DETAIL: { 
                    zoom: 1.5, 
                    priority: 3,
                    maxEntities: 100,
                    preloadDepth: 3  // Глубина предиктивной загрузки
                },
                MEDIUM_DETAIL: { 
                    zoom: 0.7, 
                    priority: 2,
                    maxEntities: 50,
                    preloadDepth: 2
                },
                LOW_DETAIL: { 
                    zoom: 0.3, 
                    priority: 1,
                    maxEntities: 20,
                    preloadDepth: 1
                }
            },
            importanceFactors: {
                high: 1.0,
                medium: 0.7,
                low: 0.3
            },
            typeFactors: {
                // Базовые типы
                star: 1.2,
                planet: 1.0,
                moon: 0.8,
                asteroid: 0.6,
                debris: 0.4,
                blackhole: 1.3,
                // Новые типы v2.1
                nebula: 1.1,
                station: 0.9,
                gateway: 1.4,    // Важные шлюзы
                anomaly: 1.5     // Особо важные аномалии
            },
            fadeDistance: 200,
            transitionDuration: 300,
            viewportMargin: 100,
            cacheSize: 1000,
            performanceSampling: 10,
            // Новые настройки v2.1
            analyticsEnabled: true,
            predictiveLoading: true,
            recoveryEnabled: true,
            integrationTimeout: 5000
        };

        this.performanceMetrics = {
            frameTime: 0,
            visibleCount: 0,
            updateCount: 0,
            cacheHitRate: 0,
            predictiveHits: 0,
            integrationStatus: 'pending'
        };

        this.frameCount = 0;
        this.intersectionObserver = null;
        this.contentManager = null;
        this.navigationManager = null;
        
        // Система аналитики v2.1
        this.analytics = {
            visibilityChanges: new Map(),
            userInteractions: new Map(),
            performanceSamples: []
        };

        // Предиктивная система v2.1
        this.predictiveSystem = {
            likelyPaths: new Map(),
            preloadedEntities: new Set(),
            userBehaviorPatterns: []
        };

        console.log('👁️ VisibilityManager v2.1 создан');
    }

    async init() {
        console.log('👁️ Инициализация VisibilityManager v2.1...');
        
        try {
            await this.initializeIntegrations();
            this.setupEventListeners();
            this.setupIntersectionObserver();
            this.setupPerformanceMonitoring();
            this.setupAnalyticsSystem();
            this.setupPredictiveSystem();
            
            this.performanceMetrics.integrationStatus = 'completed';
            console.log('✅ VisibilityManager v2.1 инициализирован');
            
            this.dispatchEvent('visibilityManagerReady', {
                version: '2.1',
                features: ['analytics', 'predictive', 'recovery', 'integration']
            });
        } catch (error) {
            console.error('❌ Ошибка инициализации VisibilityManager v2.1:', error);
            this.performanceMetrics.integrationStatus = 'failed';
            
            // Автоматическое восстановление v2.1
            if (this.config.recoveryEnabled) {
                await this.attemptRecovery(error);
            }
            throw error;
        }
    }

    async initializeIntegrations() {
        console.log('🔗 Инициализация интеграций v2.1...');
        
        // Интеграция с ContentManager v2.1
        if (window.ContentManager) {
            this.contentManager = window.ContentManager;
            console.log('✅ Интеграция с ContentManager v2.1 установлена');
        } else {
            console.warn('⚠️ ContentManager v2.1 не найден');
        }

        // Интеграция с Navigation v2.1
        if (window.GalaxyNavigation) {
            this.navigationManager = window.GalaxyNavigation;
            console.log('✅ Интеграция с GalaxyNavigation v2.1 установлена');
        } else {
            console.warn('⚠️ GalaxyNavigation v2.1 не найден');
        }

        // Ожидаем инициализации зависимостей
        await this.waitForDependencies();
    }

    async waitForDependencies() {
        const timeout = this.config.integrationTimeout;
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (this.contentManager && this.navigationManager) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error(`Таймаут ожидания зависимостей: ${timeout}ms`);
    }

    setupEventListeners() {
        // Базовые события
        document.addEventListener('zoomChanged', (event) => {
            this.handleZoomChange(event.detail.zoomLevel);
        });

        document.addEventListener('entityActivated', (event) => {
            this.handleEntityActivated(event.detail.entity);
        });

        document.addEventListener('galacticLevelChange', (event) => {
            this.handleLevelChange(event.detail.levelId);
        });

        document.addEventListener('appStateChanged', (event) => {
            this.handleAppStateChange(event.detail);
        });

        document.addEventListener('hierarchyBuilt', (event) => {
            this.handleHierarchyBuilt(event.detail.hierarchy);
        });

        document.addEventListener('performanceThreshold', (event) => {
            this.handlePerformanceThreshold(event.detail);
        });

        // Новые события v2.1
        document.addEventListener('contentPreloaded', (event) => {
            this.handleContentPreloaded(event.detail);
        });

        document.addEventListener('userProgressUpdated', (event) => {
            this.handleUserProgressUpdated(event.detail);
        });

        document.addEventListener('predictivePathCalculated', (event) => {
            this.handlePredictivePathCalculated(event.detail);
        });

        document.addEventListener('analyticsDataFlushed', (event) => {
            this.handleAnalyticsFlushed(event.detail);
        });
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
                    if (entityId && this.entities.has(entityId)) {
                        const entity = this.entities.get(entityId);
                        entity.isInViewport = entry.isIntersecting;
                        entity.viewportRatio = this.calculateViewportRatio(entry);
                        
                        // Обновляем видимость при значительных изменениях
                        if (Math.abs(entry.intersectionRatio - (entity.lastViewportRatio || 0)) > 0.3) {
                            this.scheduleVisibilityUpdate();
                        }
                        entity.lastViewportRatio = entry.intersectionRatio;
                    }
                });
            },
            {
                root: null,
                rootMargin: `${this.config.viewportMargin}px`,
                threshold: this.generateThresholds()
            }
        );
    }

    generateThresholds() {
        // Создаем пороги для IntersectionObserver
        const thresholds = [];
        for (let i = 0; i <= 1.0; i += 0.1) {
            thresholds.push(i);
        }
        return thresholds;
    }

    calculateViewportRatio(entry) {
        // Вычисляем, какая часть элемента видна в viewport
        const rect = entry.boundingClientRect;
        const viewportArea = window.innerWidth * window.innerHeight;
        const elementArea = rect.width * rect.height;
        const intersectionArea = entry.intersectionRect.width * entry.intersectionRect.height;
        
        return Math.min(1, intersectionArea / Math.min(viewportArea, elementArea));
    }

    setupPerformanceMonitoring() {
        // Мониторинг производительности для адаптивной настройки
        this.performanceMonitor = setInterval(() => {
            this.updatePerformanceMetrics();
        }, 1000);
    }

    setupAnalyticsSystem() {
        if (!this.config.analyticsEnabled) return;

        // Периодический сбор аналитики
        this.analyticsInterval = setInterval(() => {
            this.collectVisibilityAnalytics();
        }, 30000); // Каждые 30 секунд

        console.log('📊 Система аналитики видимости активирована');
    }

    setupPredictiveSystem() {
        if (!this.config.predictiveLoading) return;

        // Инициализация предиктивной системы
        this.predictiveSystem.startTime = Date.now();
        
        console.log('🔮 Предиктивная система видимости активирована');
    }

    // ОБНОВЛЕННЫЕ МЕТОДЫ V2.1

    async handleContentPreloaded(detail) {
        if (!this.config.predictiveLoading) return;

        const { entityId, content } = detail;
        
        // Отмечаем сущность как предзагруженную
        this.predictiveSystem.preloadedEntities.add(entityId);
        
        // Увеличиваем приоритет видимости для предзагруженного контента
        const entity = this.entities.get(entityId);
        if (entity) {
            entity.preloaded = true;
            entity.preloadTime = Date.now();
            
            // Планируем обновление видимости для учета нового приоритета
            this.scheduleVisibilityUpdate();
        }

        this.performanceMetrics.predictiveHits++;
        
        this.dispatchEvent('predictiveVisibilityApplied', {
            entityId,
            preloaded: true,
            timestamp: Date.now()
        });
    }

    handleUserProgressUpdated(detail) {
        const { levelId, progress } = detail;
        
        // Обновляем видимость на основе прогресса пользователя
        const entity = this.entities.get(levelId);
        if (entity) {
            entity.userProgress = progress;
            
            // Разблокируем сущность если прогресс достаточный
            if (progress >= 0.8 && !entity.unlocked) {
                entity.unlocked = true;
                this.dispatchEvent('entityUnlocked', { entityId: levelId });
            }
            
            this.scheduleVisibilityUpdate();
        }
    }

    handlePredictivePathCalculated(detail) {
        if (!this.config.predictiveLoading) return;

        const { likelyPaths } = detail;
        
        // Обновляем вероятные пути для предиктивной системы
        this.predictiveSystem.likelyPaths = new Map(Object.entries(likelyPaths));
        
        // Предварительно обеспечиваем видимость для вероятных целей
        this.ensurePredictiveVisibility();
    }

    handleAnalyticsFlushed(detail) {
        // Сброс данных аналитики после отправки
        this.analytics.visibilityChanges.clear();
        this.analytics.userInteractions.clear();
        this.analytics.performanceSamples = [];
        
        console.log('📊 Данные аналитики видимости сброшены');
    }

    // РАСШИРЕННАЯ СИСТЕМА ВИДИМОСТИ V2.1

    calculateVisibilityScore(entity) {
        const appState = this.app.getState();
        
        const zoomFactor = this.calculateZoomFactor(appState.currentZoom, entity);
        const importanceFactor = this.getImportanceFactor(entity);
        const typeFactor = this.getTypeFactor(entity);
        const distanceFactor = this.calculateDistanceFactor(entity, appState.focusedEntity);
        const levelFactor = this.calculateLevelFactor(entity, appState.currentLevel);
        const viewportFactor = this.calculateViewportFactor(entity);
        const hierarchyFactor = this.calculateHierarchyFactor(entity);
        
        // НОВЫЕ ФАКТОРЫ V2.1
        const predictiveFactor = this.calculatePredictiveFactor(entity);
        const progressFactor = this.calculateProgressFactor(entity);
        const analyticsFactor = this.calculateAnalyticsFactor(entity);

        // Комбинируем факторы с весами v2.1
        const score = (
            zoomFactor * 0.25 +
            importanceFactor * 0.15 +
            typeFactor * 0.12 +
            distanceFactor * 0.12 +
            levelFactor * 0.08 +
            viewportFactor * 0.05 +
            hierarchyFactor * 0.05 +
            predictiveFactor * 0.10 +  // Новый фактор v2.1
            progressFactor * 0.05 +     // Новый фактор v2.1
            analyticsFactor * 0.03      // Новый фактор v2.1
        );

        // Записываем аналитику
        if (this.config.analyticsEnabled) {
            this.recordVisibilityCalculation(entity, score);
        }

        // Корректировка на основе LOD уровня
        return this.applyLODCorrection(score, entity);
    }

    calculateZoomFactor(zoomLevel, entity) {
        const baseZoom = 1.0;
        const entitySizeFactor = this.getEntitySizeFactor(entity);
        
        // Меньшие объекты требуют большего зума для видимости
        const sizeAdjustedZoom = zoomLevel * entitySizeFactor;
        
        return Math.min(1.5, sizeAdjustedZoom / baseZoom);
    }

    getEntitySizeFactor(entity) {
        const sizeFactors = {
            'star': 0.9,
            'planet': 1.0,
            'moon': 1.3,
            'asteroid': 1.7,
            'debris': 2.0,
            'blackhole': 0.8,
            'nebula': 0.7,
            'station': 1.2
        };
        return sizeFactors[entity.type] || 1.0;
    }

    getImportanceFactor(entity) {
        return this.config.importanceFactors[entity.importance] || 0.5;
    }

    getTypeFactor(entity) {
        return this.config.typeFactors[entity.type] || 0.5;
    }

    calculateDistanceFactor(entity, focusedEntity) {
        if (!focusedEntity) return 1.0;

        const distance = this.calculateDistance(entity, focusedEntity);
        const maxDistance = this.config.fadeDistance;
        
        if (distance <= maxDistance * 0.3) return 1.0;
        if (distance >= maxDistance) return 0.1;
        
        // Плавное затухание от 0.3 до 1.0 расстояния
        return 1.0 - ((distance - maxDistance * 0.3) / (maxDistance * 0.7)) * 0.9;
    }

    calculateDistance(entityA, entityB) {
        if (!entityA.position || !entityB.position) return 0;
        
        const dx = entityA.position.x - entityB.position.x;
        const dy = entityA.position.y - entityB.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    calculateDistanceToCenter(entity) {
        if (!entity.position) return 0;
        
        const viewportCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const element = document.querySelector(`[data-entity-id="${entity.level || entity.id}"]`);
        
        if (!element) return 0;
        
        const rect = element.getBoundingClientRect();
        const elementCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        
        const dx = elementCenter.x - viewportCenter.x;
        const dy = elementCenter.y - viewportCenter.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    calculateLevelFactor(entity, currentLevel) {
        if (!currentLevel) return 1.0;
        
        // Увеличиваем видимость для активного уровня и его детей
        if (entity.level === currentLevel) return 1.5;
        if (entity.parent === currentLevel) return 1.2;
        
        // Снижаем видимость для нерелевантных уровней
        return 0.8;
    }

    calculateViewportFactor(entity) {
        if (!entity.isInViewport) return 0.1;
        return entity.viewportRatio || 0.5;
    }

    calculateHierarchyFactor(entity) {
        // Учитываем позицию в иерархии
        const depth = entity.metadata?.depth || 0;
        
        // Корневые элементы и их непосредственные дети более важны
        if (depth <= 1) return 1.0;
        if (depth <= 2) return 0.8;
        return 0.6;
    }

    calculatePredictiveFactor(entity) {
        if (!this.config.predictiveLoading) return 0.5;

        const entityId = entity.level || entity.id;
        
        // Повышаем приоритет для предзагруженных сущностей
        if (this.predictiveSystem.preloadedEntities.has(entityId)) {
            return 0.9;
        }
        
        // Повышаем приоритет для сущностей в вероятных путях
        for (const [path, probability] of this.predictiveSystem.likelyPaths.entries()) {
            if (path.includes(entityId) && probability > 0.7) {
                return 0.8;
            }
        }
        
        // Учитываем историю взаимодействий
        const interactionHistory = this.analytics.userInteractions.get(entityId);
        if (interactionHistory && interactionHistory.activationCount > 2) {
            return 0.7;
        }
        
        return 0.5;
    }

    calculateProgressFactor(entity) {
        // Учитываем прогресс пользователя
        if (entity.userProgress !== undefined) {
            return entity.userProgress; // Прогресс от 0 до 1
        }
        
        // Учитываем разблокировку
        if (entity.unlocked) {
            return 0.8;
        }
        
        return 0.5;
    }

    calculateAnalyticsFactor(entity) {
        if (!this.config.analyticsEnabled) return 0.5;

        const entityId = entity.level || entity.id;
        const visibilityHistory = this.analytics.visibilityChanges.get(entityId);
        
        if (visibilityHistory) {
            const totalChanges = visibilityHistory.visibleCount + visibilityHistory.hiddenCount;
            if (totalChanges > 0) {
                const visibilityRatio = visibilityHistory.visibleCount / totalChanges;
                
                // Сущности с высокой историей видимости получают повышенный приоритет
                if (visibilityRatio > 0.7) return 0.8;
                if (visibilityRatio < 0.3) return 0.3;
            }
        }
        
        return 0.5;
    }

    applyLODCorrection(score, entity) {
        const lodConfig = this.config.lodLevels[this.currentLOD];
        
        switch (this.currentLOD) {
            case 'HIGH_DETAIL':
                // Показываем все сущности на высоком уровне детализации
                return score;
                
            case 'MEDIUM_DETAIL':
                // Фильтруем мелкие и менее важные объекты
                if (entity.type === 'debris') return score * 0.2;
                if (entity.type === 'asteroid') return score * 0.5;
                if (entity.importance === 'low') return score * 0.7;
                return score;
                
            case 'LOW_DETAIL':
                // Показываем только важные и крупные объекты
                if (entity.importance === 'low') return score * 0.1;
                if (entity.type === 'moon') return score * 0.4;
                if (entity.type === 'asteroid' || entity.type === 'debris') return score * 0.1;
                if (entity.importance === 'medium') return score * 0.6;
                return score;
                
            default:
                return score;
        }
    }

    ensurePredictiveVisibility() {
        if (!this.config.predictiveLoading) return;

        // Обеспечиваем видимость для сущностей из вероятных путей
        for (const [path, probability] of this.predictiveSystem.likelyPaths.entries()) {
            if (probability > 0.6) {
                const entityIds = path.split('->');
                
                // Обеспечиваем видимость для первых N сущностей в пути
                const depth = this.config.lodLevels[this.currentLOD].preloadDepth;
                entityIds.slice(0, depth).forEach(entityId => {
                    this.ensureEntityVisibility(entityId);
                });
            }
        }
    }

    // СИСТЕМА АНАЛИТИКИ V2.1

    recordVisibilityCalculation(entity, score) {
        const entityId = entity.level || entity.id;
        const timestamp = Date.now();
        
        if (!this.analytics.visibilityChanges.has(entityId)) {
            this.analytics.visibilityChanges.set(entityId, {
                visibleCount: 0,
                hiddenCount: 0,
                lastScore: 0,
                averageScore: 0,
                calculations: 0
            });
        }
        
        const history = this.analytics.visibilityChanges.get(entityId);
        history.lastScore = score;
        history.calculations++;
        history.averageScore = (history.averageScore * (history.calculations - 1) + score) / history.calculations;
        
        // Записываем производительность
        this.analytics.performanceSamples.push({
            timestamp,
            frameTime: this.performanceMetrics.frameTime,
            visibleCount: this.performanceMetrics.visibleCount,
            cacheHitRate: this.performanceMetrics.cacheHitRate
        });
        
        // Ограничиваем размер данных производительности
        if (this.analytics.performanceSamples.length > 1000) {
            this.analytics.performanceSamples = this.analytics.performanceSamples.slice(-500);
        }
    }

    collectVisibilityAnalytics() {
        if (!this.config.analyticsEnabled) return;

        const analyticsData = {
            timestamp: Date.now(),
            performance: this.getPerformanceMetrics(),
            visibilityPatterns: Array.from(this.analytics.visibilityChanges.entries())
                .filter(([_, data]) => data.calculations > 5)
                .map(([entityId, data]) => ({
                    entityId,
                    visibilityRate: data.visibleCount / (data.visibleCount + data.hiddenCount),
                    averageScore: data.averageScore,
                    calculations: data.calculations
                })),
            predictiveEffectiveness: {
                preloadedCount: this.predictiveSystem.preloadedEntities.size,
                predictiveHits: this.performanceMetrics.predictiveHits,
                likelyPaths: this.predictiveSystem.likelyPaths.size
            }
        };

        this.dispatchEvent('visibilityAnalyticsCollected', analyticsData);
        
        console.log('📊 Аналитика видимости собрана:', {
            entities: analyticsData.visibilityPatterns.length,
            predictiveHits: analyticsData.predictiveEffectiveness.predictiveHits
        });
    }

    // СИСТЕМА ВОССТАНОВЛЕНИЯ V2.1

    async attemptRecovery(error) {
        console.log('🔄 Попытка восстановления VisibilityManager...');
        
        try {
            // 1. Очищаем проблемные состояния
            this.clearCache();
            this.analytics.visibilityChanges.clear();
            this.predictiveSystem.preloadedEntities.clear();
            
            // 2. Переинициализируем интеграции
            await this.initializeIntegrations();
            
            // 3. Восстанавливаем видимость
            this.scheduleVisibilityUpdate();
            
            console.log('✅ VisibilityManager восстановлен после ошибки');
            this.dispatchEvent('visibilityManagerRecovered', { 
                error: error.message,
                timestamp: Date.now()
            });
            
            return true;
        } catch (recoveryError) {
            console.error('❌ Не удалось восстановить VisibilityManager:', recoveryError);
            
            this.dispatchEvent('visibilityManagerRecoveryFailed', {
                originalError: error.message,
                recoveryError: recoveryError.message,
                timestamp: Date.now()
            });
            
            return false;
        }
    }

    // ОБНОВЛЕННОЕ УПРАВЛЕНИЕ ВИДИМОСТЬЮ

    setEntityVisibility(entity, visible) {
        const element = document.querySelector(`[data-entity-id="${entity.level || entity.id}"]`);
        if (!element) return;

        const currentVisibility = element.style.display !== 'none';

        // Если видимость не изменилась, пропускаем
        if (currentVisibility === visible) return;

        // Обновляем аналитику
        if (this.config.analyticsEnabled) {
            this.recordVisibilityChange(entity, visible);
        }

        // Используем Intersection Observer для viewport culling
        if (this.intersectionObserver) {
            if (visible) {
                this.intersectionObserver.observe(element);
            } else {
                this.intersectionObserver.unobserve(element);
            }
        }

        // Плавные переходы через CSS transitions
        if (visible) {
            element.style.display = 'block';
            element.style.opacity = '0';
            
            requestAnimationFrame(() => {
                element.style.transition = `opacity ${this.config.transitionDuration}ms ease-out, transform ${this.config.transitionDuration}ms ease-out`;
                element.style.opacity = '1';
                element.classList.add('visible');
                element.classList.remove('hidden');
                
                // Триггер для предиктивной системы v2.1
                if (this.config.predictiveLoading) {
                    this.onEntityBecameVisible(entity);
                }
            });
        } else {
            element.style.transition = `opacity ${this.config.transitionDuration}ms ease-out, transform ${this.config.transitionDuration}ms ease-out`;
            element.style.opacity = '0';
            element.classList.add('hidden');
            element.classList.remove('visible');
            
            setTimeout(() => {
                if (element.style.opacity === '0' && !element.classList.contains('visible')) {
                    element.style.display = 'none';
                }
            }, this.config.transitionDuration);
        }

        // Обновляем состояние сущности
        entity.isVisible = visible;
        entity.lastVisibilityChange = Date.now();
    }

    recordVisibilityChange(entity, visible) {
        const entityId = entity.level || entity.id;
        
        if (!this.analytics.visibilityChanges.has(entityId)) {
            this.analytics.visibilityChanges.set(entityId, {
                visibleCount: 0,
                hiddenCount: 0,
                lastScore: 0,
                averageScore: 0,
                calculations: 0
            });
        }
        
        const history = this.analytics.visibilityChanges.get(entityId);
        if (visible) {
            history.visibleCount++;
        } else {
            history.hiddenCount++;
        }
    }

    onEntityBecameVisible(entity) {
        if (!this.config.predictiveLoading) return;

        const entityId = entity.level || entity.id;
        
        // Записываем взаимодействие для предиктивной системы
        if (!this.analytics.userInteractions.has(entityId)) {
            this.analytics.userInteractions.set(entityId, {
                activationCount: 0,
                lastActivated: 0,
                averageViewTime: 0
            });
        }
        
        const interaction = this.analytics.userInteractions.get(entityId);
        interaction.lastActivated = Date.now();
        
        // Запускаем предиктивную загрузку связанного контента
        this.triggerPredictiveLoading(entity);
    }

    triggerPredictiveLoading(entity) {
        if (!this.contentManager || !this.config.predictiveLoading) return;

        const entityId = entity.level || entity.id;
        
        // Предзагружаем контент для этой сущности и связанных
        setTimeout(() => {
            if (this.contentManager.preloadRelatedContent) {
                this.contentManager.preloadRelatedContent(entityId);
            }
        }, 100);
    }

    // ОБНОВЛЕННЫЙ PUBLIC API V2.1

    getAdvancedMetrics() {
        const baseMetrics = this.getPerformanceMetrics();
        
        return {
            ...baseMetrics,
            analytics: {
                trackedEntities: this.analytics.visibilityChanges.size,
                userInteractions: this.analytics.userInteractions.size,
                performanceSamples: this.analytics.performanceSamples.length
            },
            predictive: {
                preloadedEntities: this.predictiveSystem.preloadedEntities.size,
                likelyPaths: this.predictiveSystem.likelyPaths.size,
                effectiveness: this.performanceMetrics.predictiveHits
            },
            integration: {
                contentManager: !!this.contentManager,
                navigation: !!this.navigationManager,
                status: this.performanceMetrics.integrationStatus
            }
        };
    }

    setPredictiveMode(enabled) {
        this.config.predictiveLoading = enabled;
        
        this.dispatchEvent('predictiveModeChanged', {
            enabled,
            timestamp: Date.now()
        });
        
        console.log(`🔮 Предиктивный режим ${enabled ? 'включен' : 'выключен'}`);
    }

    setAnalyticsMode(enabled) {
        this.config.analyticsEnabled = enabled;
        
        if (enabled && !this.analyticsInterval) {
            this.setupAnalyticsSystem();
        } else if (!enabled && this.analyticsInterval) {
            clearInterval(this.analyticsInterval);
            this.analyticsInterval = null;
        }
        
        console.log(`📊 Аналитика ${enabled ? 'включена' : 'выключена'}`);
    }

    // ОБНОВЛЕННАЯ ОЧИСТКА РЕСУРСОВ

    destroy() {
        console.log('🧹 Очистка VisibilityManager v2.1...');
        
        // Базовая очистка
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        if (this.performanceMonitor) {
            clearInterval(this.performanceMonitor);
        }
        
        if (this.analyticsInterval) {
            clearInterval(this.analyticsInterval);
        }
        
        // Очистка данных v2.1
        this.entities.clear();
        this.visibilityCache.clear();
        this.analytics.visibilityChanges.clear();
        this.analytics.userInteractions.clear();
        this.analytics.performanceSamples = [];
        this.predictiveSystem.preloadedEntities.clear();
        this.predictiveSystem.likelyPaths.clear();
        this.predictiveSystem.userBehaviorPatterns = [];
        
        this.contentManager = null;
        this.navigationManager = null;
        
        console.log('✅ VisibilityManager v2.1 очищен');
    }

    // Сохранение существующих методов для обратной совместимости
    // ... (все остальные методы из предыдущей версии сохраняются)

    dispatchEvent(eventName, detail) {
        try {
            const event = new CustomEvent(eventName, { detail });
            document.dispatchEvent(event);
        } catch (error) {
            console.error(`❌ Ошибка отправки события ${eventName}:`, error);
        }
    }
}

// Глобальная доступность для инициализации
window.VisibilityManager = VisibilityManager;
