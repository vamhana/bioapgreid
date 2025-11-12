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
        
        // Конфигурация позиционирования v2.1 с расширенными типами
        this.config = {
            baseOrbitRadii: {
                planet: 120,
                moon: 60,
                asteroid: 40,
                debris: 20,
                blackhole: 150,
                star: 140,
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

        // Кэш для оптимизации v2.1
        this.cache = {
            entityCount: 0,
            lastRebuildTime: 0,
            spatialIndexVersion: 0,
            lruCache: new Map(),
            predictivePaths: new Set(),
            userBehaviorPatterns: new Map()
        };

        // Интеграция с системами v2.1
        this.integration = {
            navigation: null,
            interaction: null,
            contentManager: null,
            performanceMonitor: null
        };
    }

    async init() {
        console.log('🏗️ Инициализация GalaxyBuilder v2.1 Unified...');
        
        try {
            this.celestialContainer = document.getElementById('celestialBodies');
            if (!this.celestialContainer) {
                throw new Error('Контейнер celestialBodies не найден');
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
            
            console.log('✅ GalaxyBuilder v2.1 Unified инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации GalaxyBuilder:', error);
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

    setupEventListeners() {
        document.addEventListener('hierarchyBuilt', (event) => {
            this.buildGalaxy(event.detail.hierarchy);
        });

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
            
            recordInteraction: (type, entity, metadata = {}) => {
                const interaction = {
                    type,
                    entity: entity.level,
                    timestamp: Date.now(),
                    duration: metadata.duration || 0,
                    success: metadata.success !== false,
                    ...metadata
                };
                
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
                return {
                    sessionDuration: Date.now() - this.analyticsCollector.sessionStart,
                    totalInteractions: Array.from(this.analyticsCollector.interactions.values())
                        .reduce((sum, interactions) => sum + interactions.length, 0),
                    entitiesInteracted: this.analyticsCollector.interactions.size,
                    averageInteractionTime: this.calculateAverageInteractionTime()
                };
            }
        };

        // Периодическая отправка аналитики
        setInterval(() => {
            this.flushAnalyticsData();
        }, this.config.analyticsInterval);
    }

    async buildGalaxy(entityHierarchy) {
        console.log('🌌 Начало построения галактики v2.1 Unified...');
        const startTime = performance.now();
        
        try {
            // Очистка предыдущего состояния
            this.clearPreviousBuild();

            // Анализ плотности и выбор стратегии
            const entityCount = this.countEntities(entityHierarchy);
            console.log(`📊 Количество сущностей: ${entityCount}`);
            
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
            
            // Отправка метрик производительности
            this.reportPerformanceMetrics({
                entityCount: positionedEntities.length,
                buildTime: buildTime,
                performance: this.getPerformanceMetrics()
            });
            
            this.dispatchEvent('galaxyBuilt', {
                entityCount: positionedEntities.length,
                buildTime: buildTime,
                performance: this.getPerformanceMetrics(),
                version: '2.1 Unified'
            });
            
            console.log(`🎉 Галактика v2.1 Unified построена: ${positionedEntities.length} сущностей за ${buildTime.toFixed(2)}мс`);
            
        } catch (error) {
            console.error('💥 Ошибка построения галактики:', error);
            this.dispatchEvent('galaxyBuildError', { 
                error: error.message,
                timestamp: Date.now(),
                version: '2.1 Unified'
            });
            
            // Попытка восстановления с улучшенной логикой v2.1
            await this.attemptEnhancedRecovery(error);
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
            
            // Обновляем состояние разблокировки сущностей
            this.entities.forEach(entity => {
                entity.unlocked = unlockedLevels.has(entity.level);
                if (entity.unlocked) {
                    this.domElements.get(entity.level)?.classList.add('celestial-body--unlocked');
                }
            });
            
            console.log('🔓 Интеграция с системой прогресса завершена');
        } catch (error) {
            console.warn('⚠️ Ошибка интеграции с системой прогресса:', error);
        }
    }

    initializePredictiveSystem(entities) {
        if (!this.predictiveLoader.enabled) return;
        
        // Анализ наиболее вероятных путей на основе иерархии
        const rootEntities = entities.filter(e => !e.parent);
        rootEntities.forEach(root => {
            const paths = this.calculatePathsFromRoot(root, entities);
            paths.forEach(path => {
                this.cache.predictivePaths.add(path);
            });
        });
        
        console.log(`🔮 Предиктивная система инициализирована: ${this.cache.predictivePaths.size} путей`);
    }

    // ========== ПОЗИЦИОНИРОВАНИЕ И РАСЧЕТ КООРДИНАТ ==========

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

    // ========== СОЗДАНИЕ И УПРАВЛЕНИЕ DOM-ЭЛЕМЕНТАМИ ==========

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
            timestamp: Date.now()
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
        
        // Добавляем данные для анимации
        element.style.setProperty('--entity-size', `${size}px`);
        element.style.setProperty('--animation-duration', `${this.config.animationDuration}ms`);
    }

    calculateEntitySize(entity) {
        const baseSizes = {
            planet: 80,
            moon: 40,
            asteroid: 25,
            debris: 15,
            blackhole: 100,
            star: 90,
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
            star: 900,
            nebula: 800,
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
        
        // Название (только для планет и важных объектов)
        if ((entity.type === 'planet' || entity.importance === 'high') && entity.title) {
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
            ${entity.unlocked ? '<div class="debug-unlocked">🔓</div>' : ''}
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
        console.log(`🎯 Активация сущности: ${entity.level}`);
        
        // Записываем в аналитику
        this.analyticsCollector.recordInteraction('click', entity);
        
        this.dispatchEvent('entityActivated', { 
            entity,
            timestamp: Date.now()
        });

        // Активируем предиктивную систему
        if (this.predictiveLoader.enabled) {
            this.predictiveLoader.predictNextActions(entity);
        }
    }

    handleEntityHover(entity, isHovering) {
        const element = this.domElements.get(entity.level);
        if (element) {
            element.classList.toggle('celestial-body--hover', isHovering);
            
            if (isHovering) {
                this.analyticsCollector.recordInteraction('hover_start', entity);
                this.dispatchEvent('entityHoverStart', { entity });
            } else {
                this.analyticsCollector.recordInteraction('hover_end', entity, {
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
        console.log('✨ Анимация появления галактики завершена');
    }

    // ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

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
        const { levelId, progress, unlocked } = detail;
        
        // Обновляем визуальное состояние сущности
        const element = this.domElements.get(levelId);
        const entity = this.entities.get(levelId);
        
        if (element && entity) {
            entity.unlocked = unlocked;
            entity.progress = progress;
            
            element.classList.toggle('celestial-body--unlocked', unlocked);
            element.classList.toggle('celestial-body--locked', !unlocked);
            
            // Обновляем индикатор прогресса
            this.updateProgressIndicator(element, progress);
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

    // ========== СИСТЕМА ОЧЕРЕДЕЙ И ПЕРЕСЧЕТОВ ==========

    scheduleGalaxyRebuild() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        this.animationFrameId = requestAnimationFrame(() => {
            const metaParser = this.app.getComponent('metaParser');
            if (metaParser) {
                const hierarchy = metaParser.getCurrentHierarchy();
                if (hierarchy) {
                    this.buildGalaxy(hierarchy);
                }
            }
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

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

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
            userPatterns: this.cache.userBehaviorPatterns.size
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
            timestamp: Date.now()
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

    dispatchEvent(eventName, detail) {
        try {
            const event = new CustomEvent(eventName, { detail });
            document.dispatchEvent(event);
        } catch (error) {
            console.error(`❌ Ошибка отправки события ${eventName}:`, error);
        }
    }

    // ========== МЕТОДЫ ЖИЗНЕННОГО ЦИКЛА ==========

    async start() {
        console.log('🏗️ GalaxyBuilder запущен');
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
                error: error.message
            };
            
            // Очищаем проблемное состояние
            this.clearPreviousBuild();
            
            // Пытаемся перестроить с упрощенной стратегией
            const metaParser = this.app.getComponent('metaParser');
            if (metaParser) {
                const hierarchy = metaParser.getCurrentHierarchy();
                if (hierarchy) {
                    // Используем максимально упрощенную стратегию
                    this.config.performanceThreshold = Infinity;
                    this.predictiveLoader.enabled = false;
                    
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
        console.log('🧹 Очистка GalaxyBuilder...');
        
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
        
        console.log('✅ GalaxyBuilder очищен');
    }
}

// Глобальная доступность для инициализации
window.GalaxyBuilder = GalaxyBuilder;
