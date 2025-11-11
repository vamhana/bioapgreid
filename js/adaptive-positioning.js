class AdaptivePositioning {
    constructor() {
        this.strategies = new Map();
        this.spaceSize = { width: 1000, height: 800 }; // Размер космического пространства
        this.initializeStrategies();
    }

    /**
     * Инициализация стратегий позиционирования
     */
    initializeStrategies() {
        this.strategies.set('LOW_DENSITY', new SimplePositioning());
        this.strategies.set('MEDIUM_DENSITY', new ClusteredPositioning());
        this.strategies.set('HIGH_DENSITY', new HighDensityPositioning());
    }

    /**
     * Анализирует плотность сущностей в галактике
     */
    analyzeEntityDensity(entities) {
        const totalCount = entities.length;
        
        if (totalCount <= 20) return 'LOW_DENSITY';
        if (totalCount <= 100) return 'MEDIUM_DENSITY';
        return 'HIGH_DENSITY';
    }

    /**
     * Выбирает стратегию позиционирования на основе плотности
     */
    selectPositioningStrategy(density) {
        const strategy = this.strategies.get(density);
        if (!strategy) {
            console.warn(`Стратегия для плотности ${density} не найдена, используется стратегия по умолчанию`);
            return this.strategies.get('LOW_DENSITY');
        }
        return strategy;
    }

    /**
     * Рассчитывает оптимальное распределение сущностей
     */
    calculateOptimalDistribution(entities, strategy) {
        try {
            const density = this.analyzeEntityDensity(entities);
            const selectedStrategy = strategy || this.selectPositioningStrategy(density);
            
            console.log(`🔄 Применение стратегии позиционирования: ${density}`);
            
            const positionedEntities = selectedStrategy.calculatePositions(entities, this.spaceSize);
            
            // Проверяем и разрешаем коллизии
            const collisionFreeEntities = this.resolveCollisions(positionedEntities);
            const balancedEntities = this.balanceDistribution(collisionFreeEntities);
            
            return balancedEntities;
        } catch (error) {
            console.error('❌ Ошибка при расчете распределения:', error);
            return entities; // Возвращаем исходные позиции при ошибке
        }
    }

    /**
     * Обнаружение перекрытий между сущностями
     */
    detectOverlaps(entities) {
        const overlaps = [];
        const minDistance = 15; // Минимальное расстояние между объектами

        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const entityA = entities[i];
                const entityB = entities[j];
                
                const distance = Math.sqrt(
                    Math.pow(entityA.position.x - entityB.position.x, 2) +
                    Math.pow(entityA.position.y - entityB.position.y, 2)
                );

                const minAllowedDistance = this.getEntityRadius(entityA) + this.getEntityRadius(entityB) + minDistance;
                
                if (distance < minAllowedDistance * 0.3) { // Коэффициент перекрытия 0.3
                    overlaps.push({
                        entityA,
                        entityB,
                        overlap: minAllowedDistance - distance,
                        distance
                    });
                }
            }
        }

        return overlaps;
    }

    /**
     * Получает радиус сущности на основе ее типа
     */
    getEntityRadius(entity) {
        const sizeMap = {
            'planet': 60,
            'moon': 30,
            'asteroid': 20,
            'debris': 10,
            'blackhole': 75
        };
        
        return sizeMap[entity.type] || 30;
    }

    /**
     * Разрешение коллизий между сущностями
     */
    resolveCollisions(entities) {
        const overlaps = this.detectOverlaps(entities);
        if (overlaps.length === 0) return entities;

        console.log(`🔍 Обнаружено ${overlaps.length} перекрытий, разрешаем коллизии...`);

        const adjustedEntities = [...entities];
        let iterations = 0;
        const maxIterations = 50;

        while (overlaps.length > 0 && iterations < maxIterations) {
            for (const overlap of overlaps) {
                const { entityA, entityB, overlap: overlapAmount } = overlap;
                
                // Вычисляем направление смещения
                const angle = Math.atan2(
                    entityB.position.y - entityA.position.y,
                    entityB.position.x - entityA.position.x
                );

                // Смещаем сущности в противоположных направлениях
                const shift = overlapAmount * 0.5;
                
                const indexA = adjustedEntities.findIndex(e => e.id === entityA.id);
                const indexB = adjustedEntities.findIndex(e => e.id === entityB.id);

                if (indexA !== -1) {
                    adjustedEntities[indexA].position.x -= Math.cos(angle) * shift;
                    adjustedEntities[indexA].position.y -= Math.sin(angle) * shift;
                }

                if (indexB !== -1) {
                    adjustedEntities[indexB].position.x += Math.cos(angle) * shift;
                    adjustedEntities[indexB].position.y += Math.sin(angle) * shift;
                }
            }

            // Проверяем остались ли перекрытия
            const newOverlaps = this.detectOverlaps(adjustedEntities);
            if (newOverlaps.length === overlaps.length) break; // Если количество не изменилось, выходим
            
            overlaps.length = 0;
            overlaps.push(...newOverlaps);
            iterations++;
        }

        return adjustedEntities;
    }

    /**
     * Балансировка распределения сущностей в пространстве
     */
    balanceDistribution(entities) {
        if (entities.length <= 1) return entities;

        // Вычисляем центр масс
        const centerX = entities.reduce((sum, entity) => sum + entity.position.x, 0) / entities.length;
        const centerY = entities.reduce((sum, entity) => sum + entity.position.y, 0) / entities.length;

        // Желаемый центр - центр пространства
        const desiredCenterX = this.spaceSize.width / 2;
        const desiredCenterY = this.spaceSize.height / 2;

        // Смещение для центрирования
        const offsetX = desiredCenterX - centerX;
        const offsetY = desiredCenterY - centerY;

        // Применяем смещение ко всем сущностям
        return entities.map(entity => ({
            ...entity,
            position: {
                x: Math.max(50, Math.min(this.spaceSize.width - 50, entity.position.x + offsetX)),
                y: Math.max(50, Math.min(this.spaceSize.height - 50, entity.position.y + offsetY))
            }
        }));
    }

    /**
     * Основной метод для перерасчета позиций
     */
    recalculatePositions(entities) {
        const density = this.analyzeEntityDensity(entities);
        const strategy = this.selectPositioningStrategy(density);
        
        return this.calculateOptimalDistribution(entities, strategy);
    }
}

/**
 * Стратегия позиционирования для низкой плотности
 */
class SimplePositioning {
    calculatePositions(entities, spaceSize) {
        console.log('🎯 Применение простой стратегии позиционирования');
        
        // Для низкой плотности используем существующие позиции
        // с небольшой случайной вариацией для естественного вида
        return entities.map(entity => ({
            ...entity,
            position: {
                x: entity.position.x + (Math.random() * 20 - 10),
                y: entity.position.y + (Math.random() * 20 - 10)
            }
        }));
    }
}

/**
 * Стратегия позиционирования для средней плотности
 */
class ClusteredPositioning {
    calculatePositions(entities, spaceSize) {
        console.log('🎯 Применение кластерной стратегии позиционирования');
        
        const clusters = this.createClusters(entities);
        const positionedEntities = [];
        const clusterRadius = 120;

        // Позиционируем кластеры по кругу
        clusters.forEach((cluster, index) => {
            const angle = (index / clusters.length) * Math.PI * 2;
            const clusterCenterX = spaceSize.width / 2 + Math.cos(angle) * clusterRadius;
            const clusterCenterY = spaceSize.height / 2 + Math.sin(angle) * clusterRadius;

            // Позиционируем сущности внутри кластера
            cluster.forEach((entity, entityIndex) => {
                const entityAngle = (entityIndex / cluster.length) * Math.PI * 2;
                const distance = 40 + (entityIndex * 10); // Увеличиваем радиус для каждого элемента

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

    /**
     * Создает кластеры из сущностей
     */
    createClusters(entities) {
        const clusters = [];
        const maxClusterSize = 8;
        
        // Простая группировка по типам
        const entitiesByType = entities.reduce((acc, entity) => {
            if (!acc[entity.type]) acc[entity.type] = [];
            acc[entity.type].push(entity);
            return acc;
        }, {});

        // Создаем кластеры из сгруппированных сущностей
        Object.values(entitiesByType).forEach(typeEntities => {
            for (let i = 0; i < typeEntities.length; i += maxClusterSize) {
                clusters.push(typeEntities.slice(i, i + maxClusterSize));
            }
        });

        return clusters;
    }
}

/**
 * Стратегия позиционирования для высокой плотности
 */
class HighDensityPositioning {
    calculatePositions(entities, spaceSize) {
        console.log('🎯 Применение стратегии для высокой плотности');
        
        // Для высокой плотности используем гексагональную упаковку
        return this.hexagonalPacking(entities, spaceSize);
    }

    /**
     * Гексагональная упаковка для оптимального использования пространства
     */
    hexagonalPacking(entities, spaceSize) {
        const radius = 25; // Базовый радиус для упаковки
        const horizontalSpacing = radius * 2;
        const verticalSpacing = radius * Math.sqrt(3);
        
        const centerX = spaceSize.width / 2;
        const centerY = spaceSize.height / 2;
        
        return entities.map((entity, index) => {
            // Вычисляем позицию в гексагональной сетке
            const row = Math.floor(index / 10);
            const col = index % 10;
            
            const x = centerX + (col - 5) * horizontalSpacing;
            const y = centerY + (row - 5) * verticalSpacing + (col % 2 === 0 ? 0 : verticalSpacing / 2);

            return {
                ...entity,
                position: {
                    x: Math.max(radius, Math.min(spaceSize.width - radius, x)),
                    y: Math.max(radius, Math.min(spaceSize.height - radius, y))
                }
            };
        });
    }
}

// Экспорт класса
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdaptivePositioning, SimplePositioning, ClusteredPositioning, HighDensityPositioning };
}
