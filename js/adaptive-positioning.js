class PositioningAnalytics {
    constructor() {
        this.records = new Map();
        this.bufferSize = 1000;
        this.metrics = {
            totalCalculations: 0,
            strategySwitches: 0,
            collisionResolutions: 0,
            performanceMetrics: [],
            userInteractionPatterns: new Map()
        };
    }

    recordCalculation(strategy, entityCount, calculationTime, collisionsResolved = 0) {
        const record = {
            timestamp: Date.now(),
            strategy,
            entityCount,
            calculationTime,
            collisionsResolved,
            performanceScore: this.calculatePerformanceScore(calculationTime, entityCount, collisionsResolved)
        };

        const key = `${strategy}_${entityCount}`;
        if (!this.records.has(key)) {
            this.records.set(key, []);
        }

        this.records.get(key).push(record);
        
        // Ограничиваем размер буфера
        if (this.records.get(key).length > this.bufferSize) {
            this.records.get(key).shift();
        }

        this.metrics.totalCalculations++;
    }

    calculatePerformanceScore(calculationTime, entityCount, collisionsResolved) {
        const baseScore = 1000; // Базовый score
        const timePenalty = calculationTime / 10; // Штраф за время
        const entityBonus = Math.log(entityCount + 1) * 10; // Бонус за обработку множества сущностей
        const collisionBonus = collisionsResolved * 5; // Бонус за разрешенные коллизии
        
        return Math.max(0, baseScore - timePenalty + entityBonus + collisionBonus);
    }

    getOptimalStrategy(entityCount) {
        let bestStrategy = 'LOW_DENSITY';
        let bestScore = 0;

        for (const [key, records] of this.records.entries()) {
            const [strategy, count] = key.split('_');
            const avgScore = records.reduce((sum, record) => sum + record.performanceScore, 0) / records.length;
            
            if (avgScore > bestScore && Math.abs(parseInt(count) - entityCount) <= 10) {
                bestScore = avgScore;
                bestStrategy = strategy;
            }
        }

        return bestStrategy;
    }

    recordUserInteraction(entityId, interactionType, position) {
        if (!this.metrics.userInteractionPatterns.has(entityId)) {
            this.metrics.userInteractionPatterns.set(entityId, []);
        }

        this.metrics.userInteractionPatterns.get(entityId).push({
            type: interactionType,
            position,
            timestamp: Date.now()
        });
    }

    getUserInteractionHotspots() {
        const hotspots = new Map();
        
        for (const [entityId, interactions] of this.metrics.userInteractionPatterns) {
            if (interactions.length > 5) { // Минимальное количество взаимодействий
                const avgX = interactions.reduce((sum, i) => sum + i.position.x, 0) / interactions.length;
                const avgY = interactions.reduce((sum, i) => sum + i.position.y, 0) / interactions.length;
                
                hotspots.set(entityId, {
                    position: { x: avgX, y: avgY },
                    interactionCount: interactions.length,
                    lastInteraction: interactions[interactions.length - 1].timestamp
                });
            }
        }

        return hotspots;
    }

    getStats() {
        return {
            totalRecords: Array.from(this.records.values()).reduce((sum, arr) => sum + arr.length, 0),
            strategyDistribution: this.getStrategyDistribution(),
            averagePerformance: this.getAveragePerformance(),
            userHotspots: this.getUserInteractionHotspots().size
        };
    }

    getStrategyDistribution() {
        const distribution = {};
        for (const [key] of this.records.entries()) {
            const strategy = key.split('_')[0];
            distribution[strategy] = (distribution[strategy] || 0) + 1;
        }
        return distribution;
    }

    getAveragePerformance() {
        let totalScore = 0;
        let totalRecords = 0;

        for (const [, records] of this.records.entries()) {
            totalScore += records.reduce((sum, record) => sum + record.performanceScore, 0);
            totalRecords += records.length;
        }

        return totalRecords > 0 ? totalScore / totalRecords : 0;
    }
}

class PredictivePositioning {
    constructor() {
        this.learningRate = 0.1;
        this.predictionWeights = new Map();
        this.interactionHistory = [];
    }

    analyzeInteractionPattern(interactions) {
        // Анализ паттернов пользовательских взаимодействий для предиктивного позиционирования
        const patterns = {
            linear: this.detectLinearPattern(interactions),
            circular: this.detectCircularPattern(interactions),
            clustered: this.detectClusteredPattern(interactions)
        };

        return patterns;
    }

    detectLinearPattern(interactions) {
        if (interactions.length < 3) return null;

        const positions = interactions.map(i => i.position);
        const angles = [];
        
        for (let i = 1; i < positions.length; i++) {
            const angle = Math.atan2(
                positions[i].y - positions[i-1].y,
                positions[i].x - positions[i-1].x
            );
            angles.push(angle);
        }

        // Проверяем согласованность углов
        const angleVariance = this.calculateVariance(angles);
        return angleVariance < 0.1 ? { type: 'linear', direction: angles[angles.length - 1] } : null;
    }

    detectCircularPattern(interactions) {
        if (interactions.length < 4) return null;

        const positions = interactions.map(i => i.position);
        const center = this.calculateCenter(positions);
        const distances = positions.map(p => this.calculateDistance(p, center));
        
        const distanceVariance = this.calculateVariance(distances);
        return distanceVariance < 50 ? { type: 'circular', center, radius: distances[0] } : null;
    }

    detectClusteredPattern(interactions) {
        const positions = interactions.map(i => i.position);
        const clusters = this.performClustering(positions, 2); // 2 кластера
        
        if (clusters.length > 1) {
            return { 
                type: 'clustered', 
                clusters: clusters.map(cluster => ({
                    center: this.calculateCenter(cluster),
                    size: cluster.length
                }))
            };
        }
        
        return null;
    }

    calculateVariance(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }

    calculateCenter(positions) {
        return {
            x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
            y: positions.reduce((sum, p) => sum + p.y, 0) / positions.length
        };
    }

    calculateDistance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    performClustering(positions, k) {
        // Простой k-means алгоритм для кластеризации
        if (positions.length <= k) return [positions];

        // Инициализация центроидов
        let centroids = positions.slice(0, k);
        let clusters = Array(k).fill().map(() => []);
        let changed = true;
        let iterations = 0;

        while (changed && iterations < 10) {
            clusters = Array(k).fill().map(() => []);
            
            // Распределяем точки по ближайшим центроидам
            positions.forEach(position => {
                let minDistance = Infinity;
                let bestCluster = 0;
                
                centroids.forEach((centroid, index) => {
                    const distance = this.calculateDistance(position, centroid);
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestCluster = index;
                    }
                });
                
                clusters[bestCluster].push(position);
            });

            // Пересчитываем центроиды
            changed = false;
            centroids = centroids.map((centroid, index) => {
                const cluster = clusters[index];
                if (cluster.length === 0) return centroid;
                
                const newCentroid = this.calculateCenter(cluster);
                if (this.calculateDistance(centroid, newCentroid) > 1) {
                    changed = true;
                }
                return newCentroid;
            });

            iterations++;
        }

        return clusters.filter(cluster => cluster.length > 0);
    }

    predictNextPosition(currentPattern, currentPosition) {
        if (!currentPattern) return null;

        switch (currentPattern.type) {
            case 'linear':
                return {
                    x: currentPosition.x + Math.cos(currentPattern.direction) * 50,
                    y: currentPosition.y + Math.sin(currentPattern.direction) * 50
                };
            case 'circular':
                // Предсказание следующей позиции на окружности
                const angle = Math.atan2(currentPosition.y - currentPattern.center.y, currentPosition.x - currentPattern.center.x);
                const newAngle = angle + (Math.PI / 6); // 30 градусов
                return {
                    x: currentPattern.center.x + Math.cos(newAngle) * currentPattern.radius,
                    y: currentPattern.center.y + Math.sin(newAngle) * currentPattern.radius
                };
            case 'clustered':
                // Переход к следующему кластеру
                const currentCluster = currentPattern.clusters.find(c => 
                    this.calculateDistance(currentPosition, c.center) < c.size * 10
                );
                if (currentCluster) {
                    const nextCluster = currentPattern.clusters.find(c => c !== currentCluster);
                    return nextCluster ? nextCluster.center : null;
                }
                return null;
            default:
                return null;
        }
    }
}

class AdaptivePositioning {
    constructor(app = null) {
        this.app = app;
        this.strategies = new Map();
        this.spaceSize = { width: 1000, height: 800 };
        this.analytics = new PositioningAnalytics();
        this.predictiveEngine = new PredictivePositioning();
        this.currentStrategy = null;
        
        // Конфигурационные константы v2.1
        this.DENSITY_THRESHOLDS = {
            LOW: 20,
            MEDIUM: 100
        };
        this.MIN_DISTANCE = 15;
        this.MAX_CLUSTER_SIZE = 8;
        this.OVERLAP_THRESHOLD = 0.3;
        this.MAX_COLLISION_ITERATIONS = 50;
        this.SPATIAL_GRID_SIZE = 100;
        this.PERFORMANCE_THRESHOLD = 800; // Порог для смены стратегии
        
        // v2.1 Расширенные типы сущностей
        this.entityConfig = {
            sizes: {
                'planet': 60,
                'moon': 30,
                'asteroid': 20,
                'debris': 10,
                'blackhole': 75,
                'star': 70,
                'nebula': 80,
                'station': 25,
                'gateway': 45,
                'anomaly': 35
            },
            priorities: {
                'star': 10,
                'blackhole': 9,
                'gateway': 8,
                'planet': 7,
                'nebula': 6,
                'station': 5,
                'anomaly': 4,
                'moon': 3,
                'asteroid': 2,
                'debris': 1
            }
        };

        this.initializeStrategies();
        this.setupEventListeners();
    }

    /**
     * Инициализация стратегий позиционирования v2.1
     */
    initializeStrategies() {
        this.strategies.set('LOW_DENSITY', new SimplePositioning(this));
        this.strategies.set('MEDIUM_DENSITY', new ClusteredPositioning(this));
        this.strategies.set('HIGH_DENSITY', new HighDensityPositioning(this));
        
        console.log('🎯 Инициализированы стратегии позиционирования v2.1');
    }

    /**
     * Настройка обработчиков событий v2.1
     */
    setupEventListeners() {
        // Интеграция с системой аналитики
        document.addEventListener('userInteractionRecorded', (event) => {
            this.analytics.recordUserInteraction(
                event.detail.entityId,
                event.detail.interactionType,
                event.detail.position
            );
        });

        // Интеграция с MetaParser v2.1
        document.addEventListener('metaParsingCompleted', (event) => {
            this.integrateWithMetaParser(event.detail.entities);
        });

        // Обработка запросов на предиктивное позиционирование
        document.addEventListener('predictivePositioningRequest', (event) => {
            this.handlePredictiveRequest(event.detail);
        });
    }

    /**
     * Интеграция с MetaParser v2.1 для получения обогащенных данных
     */
    integrateWithMetaParser(entities) {
        console.log('🔄 Интеграция с GalaxyMetaParser v2.1');
        
        // Обогащаем сущности данными из MetaParser
        entities.forEach(entity => {
            if (entity.metadata && entity.metadata.predictiveScore) {
                entity.predictiveScore = entity.metadata.predictiveScore;
            }
            
            if (entity['content-priority']) {
                entity.priority = this.calculatePriority(entity);
            }
        });
    }

    /**
     * Анализирует плотность сущностей в галактике с улучшенной логикой v2.1
     */
    analyzeEntityDensity(entities) {
        if (!entities || !Array.isArray(entities)) {
            throw new Error('Entities must be an array');
        }
        
        const totalCount = entities.length;
        
        // v2.1: Учитываем не только количество, но и распределение
        const distributionScore = this.calculateDistributionScore(entities);
        const adjustedCount = totalCount * distributionScore;
        
        if (adjustedCount <= this.DENSITY_THRESHOLDS.LOW) return 'LOW_DENSITY';
        if (adjustedCount <= this.DENSITY_THRESHOLDS.MEDIUM) return 'MEDIUM_DENSITY';
        return 'HIGH_DENSITY';
    }

    /**
     * Расчет оценки распределения сущностей v2.1
     */
    calculateDistributionScore(entities) {
        if (entities.length <= 1) return 1;

        const positions = entities.map(e => e.position);
        const center = this.calculateCenter(positions);
        const distances = positions.map(p => this.calculateDistance(p, center));
        
        const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
        
        // Нормализуем variance к 0-1, где 1 - идеальное распределение
        const maxVariance = Math.pow(this.spaceSize.width / 2, 2);
        return Math.max(0.1, 1 - (variance / maxVariance));
    }

    /**
     * Выбор стратегии позиционирования с учетом аналитики v2.1
     */
    selectPositioningStrategy(density, entityCount) {
        // Проверяем аналитику для оптимальной стратегии
        const optimalStrategy = this.analytics.getOptimalStrategy(entityCount);
        
        if (optimalStrategy && optimalStrategy !== density) {
            console.log(`🎯 Аналитика рекомендует стратегию: ${optimalStrategy} вместо ${density}`);
            density = optimalStrategy;
        }

        const strategy = this.strategies.get(density);
        if (!strategy) {
            console.warn(`Стратегия для плотности ${density} не найдена, используется стратегия по умолчанию`);
            return this.strategies.get('LOW_DENSITY');
        }

        this.currentStrategy = strategy;
        return strategy;
    }

    /**
     * Рассчитывает оптимальное распределение сущностей с аналитикой v2.1
     */
    async calculateOptimalDistribution(entities, strategy) {
        const startTime = performance.now();
        
        try {
            if (!entities || !Array.isArray(entities)) {
                throw new Error('Entities must be an array');
            }

            const density = this.analyzeEntityDensity(entities);
            const selectedStrategy = strategy || this.selectPositioningStrategy(density, entities.length);
            
            console.log(`🔄 Применение стратегии позиционирования: ${density}`);
            
            const positionedEntities = selectedStrategy.calculatePositions(entities, this.spaceSize);
            
            // Проверяем и разрешаем коллизии
            const collisionFreeEntities = this.resolveCollisions(positionedEntities);
            const balancedEntities = this.balanceDistribution(collisionFreeEntities);
            
            const calculationTime = performance.now() - startTime;
            
            // Записываем аналитику
            const collisionsResolved = positionedEntities.length - collisionFreeEntities.length;
            this.analytics.recordCalculation(
                density, 
                entities.length, 
                calculationTime, 
                collisionsResolved
            );

            // v2.1: Отправляем аналитику в основное приложение
            this.dispatchEvent('positioningCompleted', {
                strategy: density,
                entityCount: entities.length,
                calculationTime,
                collisionsResolved,
                performanceScore: this.analytics.calculatePerformanceScore(calculationTime, entities.length, collisionsResolved)
            });

            return balancedEntities;
        } catch (error) {
            console.error('❌ Ошибка при расчете распределения:', error);
            
            this.dispatchEvent('positioningError', {
                error: error.message,
                entityCount: entities?.length || 0
            });
            
            return entities; // Возвращаем исходные позиции при ошибке
        }
    }

    /**
     * Оптимизированное обнаружение перекрытий с улучшениями v2.1
     */
    detectOverlaps(entities) {
        if (entities.length <= 1) return [];

        const overlaps = [];
        const spatialGrid = new Map();

        // v2.1: Приоритетная обработка важных сущностей
        const sortedEntities = entities
            .map((entity, index) => ({ entity, index, priority: this.getEntityPriority(entity) }))
            .sort((a, b) => b.priority - a.priority);

        // Создаем пространственное разбиение
        sortedEntities.forEach(({ entity, index }) => {
            const gridX = Math.floor(entity.position.x / this.SPATIAL_GRID_SIZE);
            const gridY = Math.floor(entity.position.y / this.SPATIAL_GRID_SIZE);
            const gridKey = `${gridX},${gridY}`;
            
            if (!spatialGrid.has(gridKey)) {
                spatialGrid.set(gridKey, []);
            }
            spatialGrid.get(gridKey).push({ entity, index });
        });

        // Проверяем коллизии только в соседних ячейках
        for (const [gridKey, cellEntities] of spatialGrid) {
            const [gridX, gridY] = gridKey.split(',').map(Number);
            
            // Проверяем текущую ячейку и соседние 8 ячеек
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const neighborKey = `${gridX + dx},${gridY + dy}`;
                    const neighborEntities = spatialGrid.get(neighborKey);
                    
                    if (neighborEntities) {
                        this.checkCollisionsBetweenCells(cellEntities, neighborEntities, overlaps);
                    }
                }
            }
        }

        return overlaps;
    }

    /**
     * Получает приоритет сущности v2.1
     */
    getEntityPriority(entity) {
        return this.entityConfig.priorities[entity.type] || 1;
    }

    /**
     * Проверяет коллизии между двумя группами сущностей v2.1
     */
    checkCollisionsBetweenCells(groupA, groupB, overlaps) {
        for (const itemA of groupA) {
            for (const itemB of groupB) {
                // Избегаем проверки самой с собой и дублирующих проверок
                if (itemA.index >= itemB.index) continue;
                
                const entityA = itemA.entity;
                const entityB = itemB.entity;
                
                const distance = Math.sqrt(
                    Math.pow(entityA.position.x - entityB.position.x, 2) +
                    Math.pow(entityA.position.y - entityB.position.y, 2)
                );

                const minAllowedDistance = this.getEntityRadius(entityA) + this.getEntityRadius(entityB) + this.MIN_DISTANCE;
                
                if (distance < minAllowedDistance * this.OVERLAP_THRESHOLD) {
                    overlaps.push({
                        entityA,
                        entityB,
                        overlap: minAllowedDistance - distance,
                        distance,
                        priority: Math.max(this.getEntityPriority(entityA), this.getEntityPriority(entityB))
                    });
                }
            }
        }
    }

    /**
     * Получает радиус сущности с поддержкой новых типов v2.1
     */
    getEntityRadius(entity) {
        return this.entityConfig.sizes[entity.type] || 30;
    }

    /**
     * Разрешение коллизий с приоритетами v2.1
     */
    resolveCollisions(entities) {
        let adjustedEntities = [...entities];
        let hasOverlaps = true;
        let iterations = 0;

        while (hasOverlaps && iterations < this.MAX_COLLISION_ITERATIONS) {
            const overlaps = this.detectOverlaps(adjustedEntities);
            hasOverlaps = overlaps.length > 0;
            
            if (hasOverlaps) {
                // v2.1: Сортируем коллизии по приоритету
                overlaps.sort((a, b) => b.priority - a.priority);
                adjustedEntities = this.adjustPositions(adjustedEntities, overlaps);
                console.log(`🔍 Итерация ${iterations + 1}: обнаружено ${overlaps.length} перекрытий`);
            }
            iterations++;
        }

        if (iterations >= this.MAX_COLLISION_ITERATIONS) {
            console.warn('⚠️ Достигнут лимит итераций разрешения коллизий');
        }

        return adjustedEntities;
    }

    /**
     * Корректирует позиции сущностей с учетом приоритетов v2.1
     */
    adjustPositions(entities, overlaps) {
        const adjustedEntities = entities.map(entity => ({ ...entity }));
        
        for (const overlap of overlaps) {
            const { entityA, entityB, overlap: overlapAmount, priority } = overlap;
            
            // Вычисляем направление смещения
            const angle = Math.atan2(
                entityB.position.y - entityA.position.y,
                entityB.position.x - entityA.position.x
            );

            // v2.1: Смещение зависит от приоритета
            const priorityA = this.getEntityPriority(entityA);
            const priorityB = this.getEntityPriority(entityB);
            const totalPriority = priorityA + priorityB;
            
            const shiftA = overlapAmount * (priorityB / totalPriority);
            const shiftB = overlapAmount * (priorityA / totalPriority);
            
            const indexA = adjustedEntities.findIndex(e => e.id === entityA.id);
            const indexB = adjustedEntities.findIndex(e => e.id === entityB.id);

            if (indexA !== -1) {
                adjustedEntities[indexA].position.x -= Math.cos(angle) * shiftA;
                adjustedEntities[indexA].position.y -= Math.sin(angle) * shiftA;
                
                adjustedEntities[indexA].position = this.ensureWithinBounds(
                    adjustedEntities[indexA].position, 
                    this.getEntityRadius(adjustedEntities[indexA])
                );
            }

            if (indexB !== -1) {
                adjustedEntities[indexB].position.x += Math.cos(angle) * shiftB;
                adjustedEntities[indexB].position.y += Math.sin(angle) * shiftB;
                
                adjustedEntities[indexB].position = this.ensureWithinBounds(
                    adjustedEntities[indexB].position,
                    this.getEntityRadius(adjustedEntities[indexB])
                );
            }
        }

        return adjustedEntities;
    }

    /**
     * Обеспечивает нахождение позиции в пределах пространства v2.1
     */
    ensureWithinBounds(position, radius = 30) {
        return {
            x: Math.max(radius, Math.min(this.spaceSize.width - radius, position.x)),
            y: Math.max(radius, Math.min(this.spaceSize.height - radius, position.y))
        };
    }

    /**
     * Балансировка распределения с учетом пользовательских паттернов v2.1
     */
    balanceDistribution(entities) {
        if (entities.length <= 1) return entities;

        // Вычисляем центр масс
        const centerX = entities.reduce((sum, entity) => sum + entity.position.x, 0) / entities.length;
        const centerY = entities.reduce((sum, entity) => sum + entity.position.y, 0) / entities.length;

        // v2.1: Учитываем пользовательские hotspots при балансировке
        const hotspots = this.analytics.getUserInteractionHotspots();
        let desiredCenterX = this.spaceSize.width / 2;
        let desiredCenterY = this.spaceSize.height / 2;

        if (hotspots.size > 0) {
            // Смещаем центр к области с наибольшей активностью
            let totalX = 0, totalY = 0, totalWeight = 0;
            
            for (const [, hotspot] of hotspots) {
                const weight = Math.log(hotspot.interactionCount + 1);
                totalX += hotspot.position.x * weight;
                totalY += hotspot.position.y * weight;
                totalWeight += weight;
            }
            
            if (totalWeight > 0) {
                desiredCenterX = totalX / totalWeight;
                desiredCenterY = totalY / totalWeight;
            }
        }

        // Смещение для центрирования
        const offsetX = desiredCenterX - centerX;
        const offsetY = desiredCenterY - centerY;

        // Применяем смещение ко всем сущностям с проверкой границ
        return entities.map(entity => ({
            ...entity,
            position: this.ensureWithinBounds(
                {
                    x: entity.position.x + offsetX,
                    y: entity.position.y + offsetY
                },
                this.getEntityRadius(entity)
            )
        }));
    }

    /**
     * Предиктивное позиционирование v2.1
     */
    handlePredictiveRequest(detail) {
        const { currentPosition, interactionHistory } = detail;
        const pattern = this.predictiveEngine.analyzeInteractionPattern(interactionHistory);
        const predictedPosition = this.predictiveEngine.predictNextPosition(pattern, currentPosition);
        
        if (predictedPosition) {
            this.dispatchEvent('predictivePositioningCalculated', {
                predictedPosition,
                pattern: pattern.type,
                confidence: 0.8 // Базовая уверенность
            });
        }
    }

    /**
     * Расчет приоритета на основе мета-данных v2.1
     */
    calculatePriority(entity) {
        let priority = this.getEntityPriority(entity);
        
        // Учитываем predictive score из MetaParser
        if (entity.predictiveScore) {
            priority += entity.predictiveScore * 0.1;
        }
        
        // Учитываем content-priority
        if (entity['content-priority']) {
            const contentPriority = entity['content-priority'];
            const priorityMap = { 'critical': 3, 'high': 2, 'medium': 1, 'low': 0 };
            priority += priorityMap[contentPriority] || 0;
        }
        
        return priority;
    }

    calculateCenter(positions) {
        return {
            x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
            y: positions.reduce((sum, p) => sum + p.y, 0) / positions.length
        };
    }

    calculateDistance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    /**
     * Основной метод для перерасчета позиций v2.1
     */
    async recalculatePositions(entities) {
        if (!entities || !Array.isArray(entities)) {
            throw new Error('Entities must be an array');
        }
        
        const density = this.analyzeEntityDensity(entities);
        const strategy = this.selectPositioningStrategy(density, entities.length);
        
        return await this.calculateOptimalDistribution(entities, strategy);
    }

    /**
     * Получение статистики v2.1
     */
    getStats() {
        return {
            ...this.analytics.getStats(),
            currentStrategy: this.currentStrategy?.constructor?.name || 'None',
            spaceSize: this.spaceSize,
            entityConfig: this.entityConfig
        };
    }

    dispatchEvent(eventName, detail) {
        try {
            const event = new CustomEvent(eventName, { detail });
            document.dispatchEvent(event);
        } catch (error) {
            console.error(`❌ Ошибка отправки события ${eventName}:`, error);
        }
    }
}

/**
 * Стратегия позиционирования для низкой плотности v2.1
 */
class SimplePositioning {
    constructor(adaptivePositioning) {
        this.adaptivePositioning = adaptivePositioning;
    }

    calculatePositions(entities, spaceSize) {
        console.log('🎯 Применение простой стратегии позиционирования v2.1');
        
        // Для низкой плотности используем существующие позиции
        // с учетом приоритетов и пользовательских паттернов
        return entities.map(entity => {
            const basePosition = entity.position;
            const variation = 10 + (this.adaptivePositioning.getEntityPriority(entity) * 2);
            
            return {
                ...entity,
                position: {
                    x: basePosition.x + (Math.random() * variation - variation/2),
                    y: basePosition.y + (Math.random() * variation - variation/2)
                }
            };
        });
    }
}

/**
 * Стратегия позиционирования для средней плотности v2.1
 */
class ClusteredPositioning {
    constructor(adaptivePositioning) {
        this.adaptivePositioning = adaptivePositioning;
        this.maxClusterSize = 8;
        this.clusterRadius = 120;
        this.entitySpacing = 40;
    }

    calculatePositions(entities, spaceSize) {
        console.log('🎯 Применение кластерной стратегии позиционирования v2.1');
        
        const clusters = this.createClusters(entities);
        const positionedEntities = [];

        // v2.1: Учитываем пользовательские hotspots при размещении кластеров
        const hotspots = this.adaptivePositioning.analytics.getUserInteractionHotspots();
        const hotspotPositions = Array.from(hotspots.values()).map(h => h.position);

        // Позиционируем кластеры с учетом hotspots
        clusters.forEach((cluster, index) => {
            let clusterCenterX, clusterCenterY;

            if (hotspotPositions.length > 0 && index < hotspotPositions.length) {
                // Размещаем важные кластеры near hotspots
                clusterCenterX = hotspotPositions[index].x;
                clusterCenterY = hotspotPositions[index].y;
            } else {
                // Стандартное круговое размещение
                const angle = (index / clusters.length) * Math.PI * 2;
                clusterCenterX = spaceSize.width / 2 + Math.cos(angle) * this.clusterRadius;
                clusterCenterY = spaceSize.height / 2 + Math.sin(angle) * this.clusterRadius;
            }

            // Позиционируем сущности внутри кластера
            cluster.forEach((entity, entityIndex) => {
                const entityAngle = (entityIndex / cluster.length) * Math.PI * 2;
                const distance = this.entitySpacing + (entityIndex * 10);

                positionedEntities.push({
                    ...entity,
                    position: {
                        x: clusterCenterX + Math.cos(entityAngle) * distance,
                        y: clusterCenterY + Math.sin(entityAngle) * distance
                    }
                });
            });
        });

        return positionedEntities;
    }

    createClusters(entities) {
        const clusters = [];
        
        // v2.1: Улучшенная кластеризация с учетом приоритетов
        const sortedEntities = entities
            .map(entity => ({
                entity,
                priority: this.adaptivePositioning.getEntityPriority(entity)
            }))
            .sort((a, b) => b.priority - a.priority);

        // Создаем смешанные кластеры для разнообразия
        let currentCluster = [];
        sortedEntities.forEach(({ entity }) => {
            currentCluster.push(entity);
            
            if (currentCluster.length >= this.maxClusterSize || 
                Math.random() < 0.3) { // Случайное разделение для естественности
                clusters.push(currentCluster);
                currentCluster = [];
            }
        });

        if (currentCluster.length > 0) {
            clusters.push(currentCluster);
        }

        return clusters;
    }
}

/**
 * Стратегия позиционирования для высокой плотности v2.1
 */
class HighDensityPositioning {
    constructor(adaptivePositioning) {
        this.adaptivePositioning = adaptivePositioning;
        this.radius = 25;
        this.horizontalSpacing = this.radius * 2;
        this.verticalSpacing = this.radius * Math.sqrt(3);
    }

    calculatePositions(entities, spaceSize) {
        console.log('🎯 Применение стратегии для высокой плотности v2.1');
        
        // v2.1: При высокой плотности учитываем приоритеты для лучшего распределения
        const sortedEntities = entities
            .map(entity => ({
                entity,
                priority: this.adaptivePositioning.getEntityPriority(entity)
            }))
            .sort((a, b) => b.priority - a.priority);

        return this.hexagonalPacking(sortedEntities.map(se => se.entity), spaceSize);
    }

    hexagonalPacking(entities, spaceSize) {
        const centerX = spaceSize.width / 2;
        const centerY = spaceSize.height / 2;
        const itemsPerRow = Math.floor(Math.sqrt(entities.length));
        
        return entities.map((entity, index) => {
            // Вычисляем позицию в гексагональной сетке
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            
            // v2.1: Важные сущности размещаем ближе к центру
            const priority = this.adaptivePositioning.getEntityPriority(entity);
            const centerBias = Math.max(0, 1 - (priority / 10)); // 0-1, где 0 - полное смещение к центру
            
            const baseX = centerX + (col - itemsPerRow/2) * this.horizontalSpacing;
            const baseY = centerY + (row - itemsPerRow/2) * this.verticalSpacing + (col % 2 === 0 ? 0 : this.verticalSpacing / 2);
            
            const x = baseX * centerBias + centerX * (1 - centerBias);
            const y = baseY * centerBias + centerY * (1 - centerBias);

            return {
                ...entity,
                position: {
                    x: Math.max(this.radius, Math.min(spaceSize.width - this.radius, x)),
                    y: Math.max(this.radius, Math.min(spaceSize.height - this.radius, y))
                }
            };
        });
    }
}

// Глобальная доступность для инициализации
window.AdaptivePositioning = AdaptivePositioning;
