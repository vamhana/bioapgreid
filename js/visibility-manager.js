class VisibilityManager {
    constructor(app) {
        this.app = app;
        this.entities = new Map();
        this.visibilityCache = new Map();
        this.animationFrameId = null;
        this.lastUpdateTime = 0;
        this.updateInterval = 100; // ms
        this.currentLOD = 'MEDIUM_DETAIL';
        
        // Конфигурация видимости
        this.config = {
            visibilityThreshold: 0.5,
            lodLevels: {
                HIGH_DETAIL: { zoom: 1.5, priority: 3 },
                MEDIUM_DETAIL: { zoom: 0.7, priority: 2 },
                LOW_DETAIL: { zoom: 0.3, priority: 1 }
            },
            importanceFactors: {
                high: 1.0,
                medium: 0.7,
                low: 0.3
            },
            fadeDistance: 200,
            maxVisibleEntities: 50
        };
    }

    async init() {
        console.log('👁️ Инициализация VisibilityManager...');
        this.setupEventListeners();
        this.setupIntersectionObserver();
        return Promise.resolve();
    }

    setupEventListeners() {
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
    }

    setupIntersectionObserver() {
        // Используем Intersection Observer для viewport culling
        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const entityId = entry.target.dataset.entityId;
                    if (entityId) {
                        this.entities.get(entityId).isInViewport = entry.isIntersecting;
                    }
                });
            },
            {
                root: null,
                rootMargin: '50px', // Запас для плавных переходов
                threshold: [0, 0.1, 0.5, 1]
            }
        );
    }

    handleZoomChange(zoomLevel) {
        const previousLOD = this.currentLOD;
        this.currentLOD = this.calculateLODLevel(zoomLevel);
        
        if (previousLOD !== this.currentLOD) {
            this.dispatchEvent('lodLevelChanged', {
                from: previousLOD,
                to: this.currentLOD,
                zoomLevel: zoomLevel
            });
        }
        
        this.scheduleVisibilityUpdate();
    }

    handleEntityActivated(entity) {
        // При активации сущности гарантируем её видимость
        if (entity) {
            this.ensureEntityVisibility(entity.levelId);
        }
        this.scheduleVisibilityUpdate();
    }

    handleLevelChange(levelId) {
        // При смене уровня пересчитываем видимость для новой иерархии
        this.scheduleVisibilityUpdate();
    }

    handleAppStateChange(state) {
        if (state.visibilityThreshold !== undefined) {
            this.config.visibilityThreshold = state.visibilityThreshold;
            this.scheduleVisibilityUpdate();
        }
    }

    calculateLODLevel(zoomLevel) {
        if (zoomLevel > this.config.lodLevels.HIGH_DETAIL.zoom) {
            return 'HIGH_DETAIL';
        } else if (zoomLevel > this.config.lodLevels.MEDIUM_DETAIL.zoom) {
            return 'MEDIUM_DETAIL';
        } else {
            return 'LOW_DETAIL';
        }
    }

    scheduleVisibilityUpdate() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        this.animationFrameId = requestAnimationFrame(() => {
            this.updateVisibility();
        });
    }

    updateVisibility() {
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        this.lastUpdateTime = now;

        const visibleEntities = [];
        const updatePromises = [];

        // Собираем все сущности для обработки
        const allEntities = Array.from(this.entities.values());
        
        // Сортируем по приоритету для оптимизации
        const sortedEntities = this.sortEntitiesByPriority(allEntities);

        let processedCount = 0;
        const batchSize = 10; // Обрабатываем партиями для предотвращения блокировки

        for (const entity of sortedEntities) {
            if (processedCount >= this.config.maxVisibleEntities) {
                // Достигнут лимит видимых сущностей
                this.setEntityVisibility(entity, false);
                continue;
            }

            const shouldShow = this.shouldShowEntity(entity);
            
            if (shouldShow) {
                visibleEntities.push(entity);
                processedCount++;
            }

            // Используем микротаски для распределения вычислений
            updatePromises.push(
                Promise.resolve().then(() => {
                    this.setEntityVisibility(entity, shouldShow);
                })
            );
        }

        // Применяем все изменения видимости
        Promise.all(updatePromises).then(() => {
            this.dispatchEvent('visibilityUpdated', {
                visibleCount: visibleEntities.length,
                totalCount: allEntities.length,
                lodLevel: this.currentLOD
            });

            if (visibleEntities.length < allEntities.length * 0.3) {
                this.dispatchEvent('performanceOptimized', {
                    hiddenCount: allEntities.length - visibleEntities.length,
                    optimization: 'viewport_culling'
                });
            }
        });
    }

    sortEntitiesByPriority(entities) {
        return entities.sort((a, b) => {
            // Сначала активная сущность и её дети
            const appState = this.app.getState();
            if (appState.focusedEntity) {
                if (a.levelId === appState.focusedEntity.levelId) return -1;
                if (b.levelId === appState.focusedEntity.levelId) return 1;
                
                if (a.parent === appState.focusedEntity.levelId) return -1;
                if (b.parent === appState.focusedEntity.levelId) return 1;
            }

            // Затем по важности
            const importanceA = this.config.importanceFactors[a.importance] || 0.5;
            const importanceB = this.config.importanceFactors[b.importance] || 0.5;
            if (importanceB !== importanceA) {
                return importanceB - importanceA;
            }

            // Затем по расстоянию до центра
            const distanceA = this.calculateDistanceToCenter(a);
            const distanceB = this.calculateDistanceToCenter(b);
            return distanceA - distanceB;
        });
    }

    shouldShowEntity(entity) {
        // Проверяем кэш для одинаковых состояний
        const cacheKey = this.getEntityCacheKey(entity);
        if (this.visibilityCache.has(cacheKey)) {
            return this.visibilityCache.get(cacheKey);
        }

        const visibilityScore = this.calculateVisibilityScore(entity);
        const shouldShow = visibilityScore > this.config.visibilityThreshold;

        // Сохраняем в кэш (с ограничением размера)
        if (this.visibilityCache.size > 1000) {
            const firstKey = this.visibilityCache.keys().next().value;
            this.visibilityCache.delete(firstKey);
        }
        this.visibilityCache.set(cacheKey, shouldShow);

        return shouldShow;
    }

    getEntityCacheKey(entity) {
        const appState = this.app.getState();
        return `${entity.levelId}_${appState.currentZoom}_${appState.focusedEntity?.levelId}_${this.currentLOD}`;
    }

    calculateVisibilityScore(entity) {
        const appState = this.app.getState();
        
        const zoomFactor = this.calculateZoomFactor(appState.currentZoom, entity);
        const importanceFactor = this.getImportanceFactor(entity);
        const distanceFactor = this.calculateDistanceFactor(entity, appState.focusedEntity);
        const levelFactor = this.calculateLevelFactor(entity, appState.currentLevel);
        const viewportFactor = entity.isInViewport ? 1.0 : 0.1;

        const score = zoomFactor * importanceFactor * distanceFactor * levelFactor * viewportFactor;

        // Корректировка на основе LOD уровня
        return this.applyLODCorrection(score, entity);
    }

    calculateZoomFactor(zoomLevel, entity) {
        const baseZoom = 1.0;
        const entitySizeFactor = this.getEntitySizeFactor(entity);
        
        // Меньшие объекты требуют большего зума для видимости
        const sizeAdjustedZoom = zoomLevel * entitySizeFactor;
        
        return Math.min(1, sizeAdjustedZoom / baseZoom);
    }

    getEntitySizeFactor(entity) {
        const sizeFactors = {
            'planet': 1.0,
            'moon': 1.5,
            'asteroid': 2.0,
            'debris': 3.0,
            'blackhole': 0.8
        };
        return sizeFactors[entity.type] || 1.0;
    }

    getImportanceFactor(entity) {
        return this.config.importanceFactors[entity.importance] || 0.5;
    }

    calculateDistanceFactor(entity, focusedEntity) {
        if (!focusedEntity) return 1.0;

        const distance = this.calculateDistance(entity, focusedEntity);
        const maxDistance = this.config.fadeDistance;
        
        if (distance <= maxDistance * 0.5) return 1.0;
        if (distance >= maxDistance) return 0.1;
        
        // Плавное затухание от 0.5 до 1.0 расстояния
        return 1.0 - ((distance - maxDistance * 0.5) / (maxDistance * 0.5)) * 0.9;
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
        const dx = entity.position.x - viewportCenter.x;
        const dy = entity.position.y - viewportCenter.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    calculateLevelFactor(entity, currentLevel) {
        if (!currentLevel) return 1.0;
        
        // Увеличиваем видимость для активного уровня и его детей
        if (entity.levelId === currentLevel) return 1.5;
        if (entity.parent === currentLevel) return 1.2;
        
        // Снижаем видимость для нерелевантных уровней
        return 0.8;
    }

    applyLODCorrection(score, entity) {
        const lodConfig = this.config.lodLevels[this.currentLOD];
        
        switch (this.currentLOD) {
            case 'HIGH_DETAIL':
                // Показываем все сущности на высоком уровне детализации
                return score;
                
            case 'MEDIUM_DETAIL':
                // Фильтруем мелкие объекты на среднем уровне
                if (entity.type === 'debris') return score * 0.3;
                if (entity.type === 'asteroid') return score * 0.7;
                return score;
                
            case 'LOW_DETAIL':
                // Показываем только важные объекты на низком уровне
                if (entity.importance === 'low') return score * 0.2;
                if (entity.importance === 'medium') return score * 0.5;
                return score;
                
            default:
                return score;
        }
    }

    setEntityVisibility(entity, visible) {
        const element = document.querySelector(`[data-entity-id="${entity.levelId}"]`);
        if (!element) return;

        // Используем Intersection Observer для viewport culling
        if (visible) {
            this.intersectionObserver.observe(element);
        } else {
            this.intersectionObserver.unobserve(element);
        }

        // Плавные переходы через CSS transitions
        if (visible && element.style.display === 'none') {
            element.style.display = 'block';
            element.style.opacity = '0';
            
            requestAnimationFrame(() => {
                element.style.transition = `opacity ${this.config.transitionDuration || 300}ms ease-out`;
                element.style.opacity = '1';
            });
        } else if (!visible && element.style.display !== 'none') {
            element.style.transition = `opacity ${this.config.transitionDuration || 300}ms ease-out`;
            element.style.opacity = '0';
            
            setTimeout(() => {
                if (element.style.opacity === '0') {
                    element.style.display = 'none';
                }
            }, this.config.transitionDuration || 300);
        }
    }

    ensureEntityVisibility(entityId) {
        const entity = this.entities.get(entityId);
        if (entity) {
            // Гарантируем видимость самой сущности
            this.setEntityVisibility(entity, true);
            
            // И её непосредственных детей
            const children = Array.from(this.entities.values()).filter(e => e.parent === entityId);
            children.forEach(child => {
                this.setEntityVisibility(child, true);
            });
        }
    }

    registerEntity(entity) {
        this.entities.set(entity.levelId, {
            ...entity,
            isInViewport: false,
            lastVisibilityScore: 0
        });
        
        this.scheduleVisibilityUpdate();
    }

    unregisterEntity(entityId) {
        this.entities.delete(entityId);
        this.visibilityCache.clear(); // Очищаем кэш при изменении сущностей
    }

    updateEntityPosition(entityId, position) {
        const entity = this.entities.get(entityId);
        if (entity) {
            entity.position = position;
            this.scheduleVisibilityUpdate();
        }
    }

    setVisibilityThreshold(threshold) {
        this.config.visibilityThreshold = Math.max(0, Math.min(1, threshold));
        this.scheduleVisibilityUpdate();
    }

    getVisibleEntities() {
        return Array.from(this.entities.values()).filter(entity => {
            const element = document.querySelector(`[data-entity-id="${entity.levelId}"]`);
            return element && element.style.display !== 'none';
        });
    }

    getPerformanceMetrics() {
        const visibleCount = this.getVisibleEntities().length;
        const totalCount = this.entities.size;
        
        return {
            visibleCount,
            totalCount,
            visibilityRatio: visibleCount / totalCount,
            lodLevel: this.currentLOD,
            cacheSize: this.visibilityCache.size
        };
    }

    clearCache() {
        this.visibilityCache.clear();
        console.log('🧹 Кэш видимости очищен');
    }

    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    // Public API для инициализации приложения
    async start() {
        console.log('👁️ VisibilityManager запущен');
        return Promise.resolve();
    }

    async recover() {
        this.clearCache();
        this.scheduleVisibilityUpdate();
        console.log('🔄 VisibilityManager восстановлен');
        return true;
    }

    // Очистка ресурсов
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        this.entities.clear();
        this.visibilityCache.clear();
    }
}

// Глобальная доступность для инициализации
window.VisibilityManager = VisibilityManager;
