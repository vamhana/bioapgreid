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
        
        // Конфигурация позиционирования
        this.config = {
            baseOrbitRadii: {
                planet: 120,
                moon: 60,
                asteroid: 40,
                debris: 20,
                blackhole: 150
            },
            minDistance: 20,
            center: { x: 50, y: 50 }, // в процентах
            maxRecursionDepth: 10,
            clusterThreshold: 50,
            animationDuration: 400
        };

        // Стратегии позиционирования
        this.positioningStrategies = {
            LOW_DENSITY: this.simplePositioning.bind(this),
            MEDIUM_DENSITY: this.clusteredPositioning.bind(this),
            HIGH_DENSITY: this.highDensityPositioning.bind(this)
        };
    }

    async init() {
        console.log('🏗️ Инициализация GalaxyBuilder...');
        
        try {
            this.celestialContainer = document.getElementById('celestialBodies');
            if (!this.celestialContainer) {
                throw new Error('Контейнер celestialBodies не найден');
            }

            this.setupEventListeners();
            this.setupResizeObserver();
            
            console.log('✅ GalaxyBuilder инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации GalaxyBuilder:', error);
            throw error;
        }
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

        // Обработка изменения размера окна через resize observer
    }

    setupResizeObserver() {
        this.resizeObserver = new ResizeObserver((entries) => {
            this.handleViewportResize(entries[0].contentRect);
        });

        if (this.celestialContainer) {
            this.resizeObserver.observe(this.celestialContainer);
        }
    }

    async buildGalaxy(entityHierarchy) {
        console.log('🌌 Начало построения галактики...');
        
        try {
            // Анализ плотности сущностей
            const density = this.analyzeEntityDensity(entityHierarchy);
            console.log(`📊 Плотность сущностей: ${density}`);
            
            // Выбор стратегии позиционирования
            const strategy = this.selectPositioningStrategy(density);
            
            // Расчет всех позиций
            const positionedEntities = await this.calculateAllPositions(entityHierarchy, strategy);
            
            // Создание DOM-элементов
            await this.createCelestialElements(positionedEntities);
            
            // Запуск анимаций появления
            await this.animateGalaxyEntrance();
            
            this.dispatchEvent('galaxyBuilt', {
                entityCount: positionedEntities.length,
                density: density,
                strategy: density
            });
            
            console.log(`🎉 Галактика построена: ${positionedEntities.length} сущностей`);
            
        } catch (error) {
            console.error('💥 Ошибка построения галактики:', error);
            this.dispatchEvent('galaxyBuildError', { error: error.message });
        }
    }

    analyzeEntityDensity(entityHierarchy) {
        const totalEntities = this.countEntities(entityHierarchy);
        
        if (totalEntities <= 20) return 'LOW_DENSITY';
        if (totalEntities <= 100) return 'MEDIUM_DENSITY';
        return 'HIGH_DENSITY';
    }

    countEntities(entityHierarchy) {
        let count = 0;
        
        const countRecursive = (nodes) => {
            nodes.forEach(node => {
                count++;
                if (node.children && node.children.length > 0) {
                    countRecursive(node.children);
                }
            });
        };
        
        countRecursive(entityHierarchy);
        return count;
    }

    selectPositioningStrategy(density) {
        return this.positioningStrategies[density] || this.positioningStrategies.MEDIUM_DENSITY;
    }

    async calculateAllPositions(entityTree, strategy) {
        const allEntities = this.flattenEntityTree(entityTree);
        const positionedEntities = [];
        
        // Кэшируем расчеты для идентичных состояний
        const cacheKey = this.generatePositionCacheKey(allEntities);
        if (this.positionCache.has(cacheKey)) {
            console.log('🔄 Использование кэшированных позиций');
            return this.positionCache.get(cacheKey);
        }
        
        // Расчет позиций с выбранной стратегией
        for (const entity of allEntities) {
            const positionedEntity = await this.calculateEntityPosition(entity, strategy);
            positionedEntities.push(positionedEntity);
            
            // Сохраняем в кэш сущностей
            this.entities.set(entity.level, positionedEntity);
        }
        
        // Разрешение коллизий
        const collisionFreeEntities = this.resolveCollisions(positionedEntities);
        
        // Сохраняем в кэш
        if (this.positionCache.size > 50) {
            const firstKey = this.positionCache.keys().next().value;
            this.positionCache.delete(firstKey);
        }
        this.positionCache.set(cacheKey, collisionFreeEntities);
        
        return collisionFreeEntities;
    }

    flattenEntityTree(entityTree) {
        const flattened = [];
        
        const flattenRecursive = (nodes, depth = 0) => {
            if (depth > this.config.maxRecursionDepth) {
                console.warn('⚠️ Достигнута максимальная глубина рекурсии');
                return;
            }
            
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

    generatePositionCacheKey(entities) {
        // Создаем ключ кэша на основе состояний сущностей
        const entityData = entities.map(e => 
            `${e.level}-${e.type}-${e.parent}-${e['orbit-radius']}-${e['orbit-angle']}`
        ).join('|');
        
        const viewportData = `${window.innerWidth}x${window.innerHeight}`;
        return `${entityData}|${viewportData}`;
    }

    async calculateEntityPosition(entity, strategy) {
        // Если позиция уже рассчитана, используем её
        if (entity.position) {
            return entity;
        }
        
        return strategy(entity);
    }

    simplePositioning(entity) {
        // Простая стратегия для малого количества сущностей
        if (!entity.parent) {
            // Корневой элемент - равномерное распределение по кругу
            return this.calculateRootPosition(entity);
        } else {
            // Дочерний элемент - орбита вокруг родителя
            return this.calculateOrbitalPosition(entity);
        }
    }

    clusteredPositioning(entity) {
        // Стратегия с кластеризацией для среднего количества сущностей
        if (!entity.parent) {
            return this.calculateRootPosition(entity);
        }
        
        // Для дочерних элементов группируем по кластерам
        const parent = this.entities.get(entity.parent);
        if (!parent) {
            return this.calculateRootPosition(entity);
        }
        
        const siblings = this.getSiblings(entity);
        const clusterIndex = this.assignToCluster(entity, siblings);
        
        return this.calculateClusteredOrbitalPosition(entity, parent, clusterIndex, siblings.length);
    }

    highDensityPositioning(entity) {
        // Стратегия для большого количества сущностей
        if (!entity.parent) {
            return this.calculateRootPosition(entity);
        }
        
        // Используем пространственное индексирование для оптимизации
        return this.calculateOptimizedOrbitalPosition(entity);
    }

    calculateRootPosition(entity) {
        const rootEntities = Array.from(this.entities.values()).filter(e => !e.parent);
        const index = rootEntities.findIndex(e => e.level === entity.level);
        const totalRoots = rootEntities.length;
        
        // Равномерное распределение по кругу
        const angle = (360 / Math.max(1, totalRoots)) * index;
        const radius = this.getDefaultRadius(entity.type) * 2; // Увеличиваем радиус для корневых
        
        return {
            ...entity,
            position: {
                x: this.config.center.x + radius * Math.cos(this.degToRad(angle)),
                y: this.config.center.y + radius * Math.sin(this.degToRad(angle))
            },
            orbitalData: {
                angle: angle,
                radius: radius,
                isRoot: true
            }
        };
    }

    calculateOrbitalPosition(entity) {
        const parent = this.entities.get(entity.parent);
        if (!parent) {
            return this.calculateRootPosition(entity);
        }
        
        const radius = entity['orbit-radius'] || this.getDefaultRadius(entity.type);
        const angle = entity['orbit-angle'] || this.calculateAutoAngle(entity);
        
        return {
            ...entity,
            position: {
                x: parent.position.x + radius * Math.cos(this.degToRad(angle)),
                y: parent.position.y + radius * Math.sin(this.degToRad(angle))
            },
            orbitalData: {
                angle: angle,
                radius: radius,
                parent: parent.level,
                isRoot: false
            }
        };
    }

    getDefaultRadius(entityType) {
        return this.config.baseOrbitRadii[entityType] || 50;
    }

    calculateAutoAngle(entity) {
        const siblings = this.getSiblings(entity);
        const siblingCount = siblings.length;
        
        // Равномерное распределение вокруг родителя
        const baseAngle = 360 / Math.max(1, siblingCount);
        const index = siblings.findIndex(e => e.level === entity.level);
        
        return baseAngle * index;
    }

    getSiblings(entity) {
        return Array.from(this.entities.values()).filter(e => 
            e.parent === entity.parent && e.level !== entity.level
        );
    }

    assignToCluster(entity, siblings) {
        // Простая кластеризация по типу сущности
        const typePriority = {
            planet: 0,
            moon: 1,
            asteroid: 2,
            debris: 3,
            blackhole: 0
        };
        
        return typePriority[entity.type] || 0;
    }

    calculateClusteredOrbitalPosition(entity, parent, clusterIndex, siblingCount) {
        const baseRadius = entity['orbit-radius'] || this.getDefaultRadius(entity.type);
        const radius = baseRadius * (1 + clusterIndex * 0.3); // Смещаем радиус для кластера
        
        const clusterSiblings = this.getSiblings(entity).filter(e => 
            this.assignToCluster(e, []) === clusterIndex
        );
        
        const clusterIndexInGroup = clusterSiblings.findIndex(e => e.level === entity.level);
        const angle = (360 / Math.max(1, clusterSiblings.length)) * clusterIndexInGroup;
        
        return {
            ...entity,
            position: {
                x: parent.position.x + radius * Math.cos(this.degToRad(angle)),
                y: parent.position.y + radius * Math.sin(this.degToRad(angle))
            },
            orbitalData: {
                angle: angle,
                radius: radius,
                parent: parent.level,
                cluster: clusterIndex,
                isRoot: false
            }
        };
    }

    calculateOptimizedOrbitalPosition(entity) {
        // Оптимизированная версия для большого количества сущностей
        const parent = this.entities.get(entity.parent);
        if (!parent) {
            return this.calculateRootPosition(entity);
        }
        
        // Используем пространственное хеширование для распределения
        const spatialHash = this.calculateSpatialHash(entity, parent);
        const radius = entity['orbit-radius'] || this.getDefaultRadius(entity.type);
        const angle = spatialHash % 360; // Используем хеш для угла
        
        return {
            ...entity,
            position: {
                x: parent.position.x + radius * Math.cos(this.degToRad(angle)),
                y: parent.position.y + radius * Math.sin(this.degToRad(angle))
            },
            orbitalData: {
                angle: angle,
                radius: radius,
                parent: parent.level,
                spatialHash: spatialHash,
                isRoot: false
            }
        };
    }

    calculateSpatialHash(entity, parent) {
        // Пространственный хеш для равномерного распределения
        let hash = 0;
        const str = entity.level + parent.level;
        
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return Math.abs(hash) % 360;
    }

    resolveCollisions(entities) {
        const collisionFreeEntities = [...entities];
        let hasCollisions = true;
        let iterations = 0;
        const maxIterations = 100;
        
        while (hasCollisions && iterations < maxIterations) {
            hasCollisions = false;
            
            for (let i = 0; i < collisionFreeEntities.length; i++) {
                for (let j = i + 1; j < collisionFreeEntities.length; j++) {
                    const entityA = collisionFreeEntities[i];
                    const entityB = collisionFreeEntities[j];
                    
                    if (this.checkCollision(entityA, entityB)) {
                        this.resolveEntityCollision(entityA, entityB, collisionFreeEntities);
                        hasCollisions = true;
                    }
                }
            }
            
            iterations++;
        }
        
        if (iterations >= maxIterations) {
            console.warn('⚠️ Достигнуто максимальное количество итераций разрешения коллизий');
        }
        
        return collisionFreeEntities;
    }

    checkCollision(entityA, entityB) {
        if (!entityA.position || !entityB.position) return false;
        
        const dx = entityA.position.x - entityB.position.x;
        const dy = entityA.position.y - entityB.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const minDistance = this.config.minDistance;
        return distance < minDistance;
    }

    resolveEntityCollision(entityA, entityB, entities) {
        // Смещаем менее важную сущность
        const importanceOrder = { high: 3, medium: 2, low: 1 };
        const importanceA = importanceOrder[entityA.importance] || 1;
        const importanceB = importanceOrder[entityB.importance] || 1;
        
        let entityToMove, otherEntity;
        
        if (importanceA < importanceB) {
            entityToMove = entityA;
            otherEntity = entityB;
        } else {
            entityToMove = entityB;
            otherEntity = entityA;
        }
        
        // Смещаем сущность в случайном направлении
        const angle = Math.random() * 2 * Math.PI;
        const distance = this.config.minDistance * 1.5;
        
        entityToMove.position.x = otherEntity.position.x + distance * Math.cos(angle);
        entityToMove.position.y = otherEntity.position.y + distance * Math.sin(angle);
        
        // Обновляем орбитальные данные если есть родитель
        if (entityToMove.orbitalData && !entityToMove.orbitalData.isRoot) {
            const parent = this.entities.get(entityToMove.orbitalData.parent);
            if (parent) {
                const dx = entityToMove.position.x - parent.position.x;
                const dy = entityToMove.position.y - parent.position.y;
                
                entityToMove.orbitalData.radius = Math.sqrt(dx * dx + dy * dy);
                entityToMove.orbitalData.angle = this.radToDeg(Math.atan2(dy, dx));
            }
        }
    }

    async createCelestialElements(positionedEntities) {
        // Используем DocumentFragment для оптимизации массового добавления
        const fragment = document.createDocumentFragment();
        const creationPromises = [];
        
        for (const entity of positionedEntities) {
            const element = this.createCelestialElement(entity);
            if (element) {
                fragment.appendChild(element);
                this.domElements.set(entity.level, element);
                creationPromises.push(this.setupElementInteractions(element, entity));
            }
        }
        
        // Массовое добавление в DOM
        this.celestialContainer.appendChild(fragment);
        
        // Настройка взаимодействий
        await Promise.all(creationPromises);
        
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
        
        // Добавляем иконку или содержимое
        const content = this.createEntityContent(entity);
        if (content) {
            element.appendChild(content);
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
    }

    calculateEntitySize(entity) {
        const baseSizes = {
            planet: 80,
            moon: 40,
            asteroid: 25,
            debris: 15,
            blackhole: 100
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
        
        return Math.max(10, baseSize);
    }

    calculateZIndex(entity) {
        // Z-index на основе типа и важности
        const typeLayers = {
            blackhole: 100,
            planet: 80,
            moon: 60,
            asteroid: 40,
            debris: 20
        };
        
        const importanceLayers = {
            high: 5,
            medium: 3,
            low: 1
        };
        
        const baseLayer = typeLayers[entity.type] || 10;
        const importanceBonus = importanceLayers[entity.importance] || 1;
        
        return baseLayer + importanceBonus;
    }

    createEntityContent(entity) {
        const content = document.createElement('div');
        content.className = 'celestial-body__content';
        
        // Иконка сущности
        if (entity.icon) {
            const icon = document.createElement('span');
            icon.className = 'celestial-body__icon';
            icon.textContent = entity.icon;
            content.appendChild(icon);
        }
        
        // Название (только для планет и важных объектов)
        if (entity.type === 'planet' || entity.importance === 'high') {
            const title = document.createElement('span');
            title.className = 'celestial-body__title';
            title.textContent = entity.title;
            content.appendChild(title);
        }
        
        return content;
    }

    async setupElementInteractions(element, entity) {
        // Обработчики взаимодействий
        element.addEventListener('click', () => {
            this.handleEntityClick(entity);
        });
        
        element.addEventListener('mouseenter', () => {
            this.handleEntityHover(entity, true);
        });
        
        element.addEventListener('mouseleave', () => {
            this.handleEntityHover(entity, false);
        });
        
        // Добавляем в Intersection Observer если доступен
        if (this.app.getComponent('visibilityManager')) {
            const visibilityManager = this.app.getComponent('visibilityManager');
            visibilityManager.registerEntity(entity);
        }
    }

    handleEntityClick(entity) {
        this.dispatchEvent('entityActivated', { entity });
    }

    handleEntityHover(entity, isHovering) {
        const element = this.domElements.get(entity.level);
        if (element) {
            element.classList.toggle('celestial-body--hover', isHovering);
        }
    }

    async animateGalaxyEntrance() {
        const elements = Array.from(this.domElements.values());
        const animationPromises = [];
        
        elements.forEach((element, index) => {
            const promise = new Promise(resolve => {
                // Задержка для создания волнового эффекта
                setTimeout(() => {
                    element.classList.add('celestial-body--entering');
                    
                    element.addEventListener('animationend', () => {
                        element.classList.remove('celestial-body--entering');
                        element.classList.add('celestial-body--active');
                        resolve();
                    }, { once: true });
                    
                }, index * 50); // Постепенное появление
            });
            
            animationPromises.push(promise);
        });
        
        await Promise.all(animationPromises);
    }

    handleVisibilityUpdate(detail) {
        // Обновляем видимость на основе данных от VisibilityManager
        this.domElements.forEach((element, levelId) => {
            const shouldBeVisible = detail.visibleEntities?.some(e => e.level === levelId);
            
            if (shouldBeVisible && element.style.display === 'none') {
                element.style.display = 'block';
            } else if (!shouldBeVisible && element.style.display !== 'none') {
                element.style.display = 'none';
            }
        });
    }

    handleEntitiesChange(detail) {
        // Перестраиваем галактику при изменении сущностей
        this.scheduleGalaxyRebuild();
    }

    handleViewportResize(contentRect) {
        // Пересчитываем позиции при изменении размера viewport
        this.schedulePositionRecalculation();
    }

    scheduleGalaxyRebuild() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        this.animationFrameId = requestAnimationFrame(() => {
            // Перезапрашиваем иерархию и перестраиваем
            const metaParser = this.app.getComponent('metaParser');
            if (metaParser) {
                const hierarchy = metaParser.getCurrentHierarchy();
                this.buildGalaxy(hierarchy);
            }
        });
    }

    schedulePositionRecalculation() {
        // Помечаем все сущности как требующие перерасчета
        this.entities.forEach((entity, levelId) => {
            this.dirtyEntities.add(levelId);
        });
        
        this.processRecalculationQueue();
    }

    processRecalculationQueue() {
        if (this.recalculationQueue.length === 0) return;
        
        const entityId = this.recalculationQueue.shift();
        const entity = this.entities.get(entityId);
        const element = this.domElements.get(entityId);
        
        if (entity && element) {
            this.updateElementPosition(element, entity);
        }
        
        if (this.recalculationQueue.length > 0) {
            requestAnimationFrame(() => this.processRecalculationQueue());
        }
    }

    updateElementPosition(element, entity) {
        if (!entity.position) return;
        
        // Плавное обновление позиции
        element.style.transition = `transform ${this.config.animationDuration}ms ease-out`;
        element.style.transform = `translate(${entity.position.x}%, ${entity.position.y}%)`;
        
        element.addEventListener('transitionend', () => {
            element.style.transition = '';
        }, { once: true });
    }

    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    radToDeg(radians) {
        return radians * (180 / Math.PI);
    }

    getAllEntities() {
        return Array.from(this.entities.values());
    }

    getEntity(levelId) {
        return this.entities.get(levelId);
    }

    getEntityElement(levelId) {
        return this.domElements.get(levelId);
    }

    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    // Public API для инициализации приложения
    async start() {
        console.log('🏗️ GalaxyBuilder запущен');
        return Promise.resolve();
    }

    async recover() {
        this.positionCache.clear();
        this.dirtyEntities.clear();
        this.recalculationQueue = [];
        console.log('🔄 GalaxyBuilder восстановлен');
        return true;
    }

    // Очистка ресурсов
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // Очищаем DOM
        if (this.celestialContainer) {
            this.celestialContainer.innerHTML = '';
        }
        
        this.entities.clear();
        this.positionCache.clear();
        this.domElements.clear();
        this.dirtyEntities.clear();
        this.recalculationQueue = [];
    }
}

// Глобальная доступность для инициализации
window.GalaxyBuilder = GalaxyBuilder;
