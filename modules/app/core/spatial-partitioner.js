import * as THREE from './three.module.js';

export class SpatialPartitioner {
    constructor(options = {}) {
        this.options = {
            gridSize: options.gridSize || 500,
            dynamicUpdate: options.dynamicUpdate !== false, // по умолчанию включено
            debug: options.debug || false,
            maxEntitiesPerCell: options.maxEntitiesPerCell || 50,
            ...options
        };

        // Основная структура данных: иерархическая сетка
        this.grid = new Map();
        this.entityMap = new Map(); // для быстрого доступа к данным сущности по ID
        
        // Кэш для оптимизации запросов
        this.queryCache = new Map();
        this.cacheValidityTime = 100; // мс

        // Статистика
        this.stats = {
            totalEntities: 0,
            gridCells: 0,
            queries: 0,
            cacheHits: 0,
            collisions: 0,
            updates: 0,
            averageEntitiesPerCell: 0,
            lastCleanup: Date.now()
        };

        // Для отладки визуализация
        this.debugObjects = new Set();
        this.debugEnabled = this.options.debug;

        console.log('🗺️ SpatialPartitioner создан', this.options);
    }

    // Добавление сущности в партиционер
    addEntity(entityId, position, radius, metadata = {}) {
        // Валидация входных данных
        if (!entityId || !position || radius === undefined) {
            console.error('❌ Неверные параметры для addEntity:', { entityId, position, radius });
            return null;
        }

        const gridKey = this.positionToGridKey(position);

        if (!this.grid.has(gridKey)) {
            this.grid.set(gridKey, new Map());
            this.stats.gridCells = this.grid.size;
        }

        const cell = this.grid.get(gridKey);
        
        // Проверка на переполнение ячейки
        if (cell.size >= this.options.maxEntitiesPerCell) {
            console.warn(`⚠️ Ячейка ${gridKey} переполнена: ${cell.size} entities`);
        }

        const entityData = {
            entityId,
            position: position.clone(),
            radius: Math.max(0.1, radius), // Минимальный радиус для избежания ошибок
            metadata,
            gridKey,
            lastUpdated: Date.now(),
            boundingSphere: new THREE.Sphere(position.clone(), radius)
        };

        cell.set(entityId, entityData);
        this.entityMap.set(entityId, entityData);
        this.stats.totalEntities++;

        // Инвалидируем кэш запросов для этой области
        this.invalidateCacheNearPosition(position);

        this.updateStats();

        if (this.debugEnabled) {
            this.createDebugVisualization(entityData);
        }

        return entityData;
    }

    // Удаление сущности
    removeEntity(entityId) {
        const entityData = this.entityMap.get(entityId);
        if (!entityData) {
            console.warn(`⚠️ Сущность ${entityId} не найдена для удаления`);
            return;
        }

        const gridKey = entityData.gridKey;
        const cell = this.grid.get(gridKey);
        if (cell) {
            cell.delete(entityId);
            if (cell.size === 0) {
                this.grid.delete(gridKey);
                this.stats.gridCells = this.grid.size;
            }
        }

        this.entityMap.delete(entityId);
        this.stats.totalEntities--;

        // Инвалидируем кэш
        this.invalidateCacheNearPosition(entityData.position);

        if (this.debugEnabled) {
            this.removeDebugVisualization(entityId);
        }

        this.updateStats();
    }

    // Обновление позиции сущности
    updateEntity(entityId, newPosition, newRadius) {
        const entityData = this.entityMap.get(entityId);
        if (!entityData) {
            console.warn(`⚠️ Сущность ${entityId} не найдена для обновления`);
            return;
        }

        const oldGridKey = entityData.gridKey;
        const newGridKey = this.positionToGridKey(newPosition);

        // Если изменилась ячейка, перемещаем entity
        if (oldGridKey !== newGridKey) {
            const metadata = entityData.metadata;
            this.removeEntity(entityId);
            this.addEntity(entityId, newPosition, newRadius, metadata);
        } else {
            // Обновляем позицию и радиус в той же ячейке
            entityData.position.copy(newPosition);
            entityData.radius = Math.max(0.1, newRadius);
            entityData.boundingSphere.set(newPosition, newRadius);
            entityData.lastUpdated = Date.now();
        }

        this.stats.updates++;

        if (this.debugEnabled) {
            this.updateDebugVisualization(entityData);
        }
    }

    // Пакетное обновление сущностей
    updateEntitiesBatch(updates) {
        const startTime = performance.now();
        
        updates.forEach(({ entityId, position, radius }) => {
            this.updateEntity(entityId, position, radius);
        });
        
        const batchTime = performance.now() - startTime;
        
        if (batchTime > 16) { // Если занимает больше кадра
            console.warn(`⚠️ Пакетное обновление заняло ${batchTime.toFixed(2)}ms для ${updates.length} сущностей`);
        }
    }

    // Получение видимых сущностей (для камеры) с оптимизацией кэширования
    getVisibleEntities(cameraPosition, zoomLevel, frustum) {
        this.stats.queries++;

        // Проверяем кэш
        const cacheKey = this.createCacheKey(cameraPosition, zoomLevel);
        const cached = this.queryCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheValidityTime) {
            this.stats.cacheHits++;
            return new Set(cached.entities);
        }

        const visibleEntities = new Set();
        const searchRadius = this.calculateSearchRadius(zoomLevel);

        // Получаем ячейки в радиусе поиска
        const nearbyCells = this.getNearbyGridKeys(cameraPosition, searchRadius);

        // Используем frustum culling если доступен
        const useFrustum = frustum && this.isFrustumValid(frustum);

        for (const gridKey of nearbyCells) {
            const cell = this.grid.get(gridKey);
            if (!cell) continue;

            for (const [entityId, entityData] of cell) {
                if (this.isEntityVisible(entityData, cameraPosition, useFrustum ? frustum : null)) {
                    visibleEntities.add(entityId);
                }
            }
        }

        // Сохраняем в кэш
        this.queryCache.set(cacheKey, {
            entities: Array.from(visibleEntities),
            timestamp: Date.now()
        });

        // Очищаем старый кэш
        this.cleanupOldCache();

        return visibleEntities;
    }

    // Создание ключа для кэша запросов
    createCacheKey(cameraPosition, zoomLevel) {
        const gridX = Math.floor(cameraPosition.x / (this.options.gridSize * 2));
        const gridY = Math.floor(cameraPosition.y / (this.options.gridSize * 2));
        const gridZ = Math.floor(cameraPosition.z / (this.options.gridSize * 2));
        return `query_${gridX}_${gridY}_${gridZ}_${Math.round(zoomLevel * 10)}`;
    }

    // Очистка устаревшего кэша
    cleanupOldCache() {
        const now = Date.now();
        let cleaned = 0;

        this.queryCache.forEach((value, key) => {
            if (now - value.timestamp > this.cacheValidityTime * 5) { // 5x validity time
                this.queryCache.delete(key);
                cleaned++;
            }
        });

        if (cleaned > 0 && this.debugEnabled) {
            console.log(`🧹 Очищено ${cleaned} устаревших кэш-запросов`);
        }
    }

    // Инвалидация кэша вокруг позиции
    invalidateCacheNearPosition(position) {
        const gridX = Math.floor(position.x / (this.options.gridSize * 2));
        const gridY = Math.floor(position.y / (this.options.gridSize * 2));
        const gridZ = Math.floor(position.z / (this.options.gridSize * 2));
        
        const patterns = [
            `${gridX}_${gridY}_${gridZ}`,
            `${gridX-1}_${gridY}_${gridZ}`, `${gridX+1}_${gridY}_${gridZ}`,
            `${gridX}_${gridY-1}_${gridZ}`, `${gridX}_${gridY+1}_${gridZ}`,
            `${gridX}_${gridY}_${gridZ-1}`, `${gridX}_${gridY}_${gridZ+1}`
        ];

        let invalidated = 0;
        this.queryCache.forEach((value, key) => {
            if (patterns.some(pattern => key.includes(pattern))) {
                this.queryCache.delete(key);
                invalidated++;
            }
        });

        if (invalidated > 0 && this.debugEnabled) {
            console.log(`🔄 Инвалидировано ${invalidated} кэш-запросов вокруг позиции`);
        }
    }

    // Получение сущностей в радиусе с улучшенной оптимизацией
    getEntitiesInRadius(center, radius, entityTypes = []) {
        const entities = [];
        const searchCells = this.getNearbyGridKeys(center, radius);

        // Используем квадрат радиуса для избежания вычисления квадратного корня
        const radiusSquared = radius * radius;

        for (const gridKey of searchCells) {
            const cell = this.grid.get(gridKey);
            if (!cell) continue;

            for (const [entityId, entityData] of cell) {
                // Быстрая проверка по bounding sphere
                const distanceSquared = center.distanceToSquared(entityData.position);
                const combinedRadius = radius + entityData.radius;
                
                if (distanceSquared <= combinedRadius * combinedRadius) {
                    if (entityTypes.length === 0 || 
                        entityTypes.includes(entityData.metadata.type)) {
                        entities.push({
                            entityId,
                            distance: Math.sqrt(distanceSquared),
                            ...entityData
                        });
                    }
                }
            }
        }

        // Сортируем по расстоянию
        entities.sort((a, b) => a.distance - b.distance);
        return entities;
    }

    // Получение ближайших сущностей к точке
    getNearestEntities(center, maxCount = 10, maxDistance = Infinity, entityTypes = []) {
        const entities = this.getEntitiesInRadius(center, maxDistance, entityTypes);
        return entities.slice(0, maxCount);
    }

    // Проверка коллизий для конкретной сущности
    checkCollisions(entityId, radiusMultiplier = 1.0) {
        const entityData = this.entityMap.get(entityId);
        if (!entityData) return [];

        const collisions = [];
        const searchRadius = entityData.radius * radiusMultiplier;
        const nearbyEntities = this.getEntitiesInRadius(entityData.position, searchRadius);

        for (const otherEntity of nearbyEntities) {
            if (otherEntity.entityId === entityId) continue;

            const distance = entityData.position.distanceTo(otherEntity.position);
            const minDistance = entityData.radius + otherEntity.radius;

            if (distance < minDistance) {
                collisions.push({
                    entityId: otherEntity.entityId,
                    distance,
                    penetration: minDistance - distance,
                    otherEntity: otherEntity
                });
            }
        }

        this.stats.collisions += collisions.length;
        return collisions;
    }

    // Вспомогательные методы

    positionToGridKey(position) {
        const x = Math.floor(position.x / this.options.gridSize);
        const y = Math.floor(position.y / this.options.gridSize);
        const z = Math.floor(position.z / this.options.gridSize);
        return `${x},${y},${z}`;
    }

    getNearbyGridKeys(center, radius) {
        const keys = new Set();
        const minX = Math.floor((center.x - radius) / this.options.gridSize);
        const maxX = Math.floor((center.x + radius) / this.options.gridSize);
        const minY = Math.floor((center.y - radius) / this.options.gridSize);
        const maxY = Math.floor((center.y + radius) / this.options.gridSize);
        const minZ = Math.floor((center.z - radius) / this.options.gridSize);
        const maxZ = Math.floor((center.z + radius) / this.options.gridSize);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    keys.add(`${x},${y},${z}`);
                }
            }
        }

        return Array.from(keys);
    }

    isEntityVisible(entityData, cameraPosition, frustum) {
        // Быстрая проверка расстояния для оптимизации
        const distance = entityData.position.distanceTo(cameraPosition);
        if (distance > 2000) return false; // Максимальная дистанция видимости

        // Проверка frustum culling если доступен
        if (frustum) {
            return frustum.intersectsSphere(entityData.boundingSphere);
        }

        return true;
    }

    // Проверка валидности frustum
    isFrustumValid(frustum) {
        // Простая проверка что frustum не нулевой и имеет planes
        return frustum && Array.isArray(frustum.planes) && frustum.planes.length === 6;
    }

    calculateSearchRadius(zoomLevel) {
        // Увеличиваем радиус поиска при уменьшении масштаба
        return Math.max(this.options.gridSize, 2000 / Math.max(zoomLevel, 0.1));
    }

    // Обновление статистики
    updateStats() {
        let totalEntitiesInCells = 0;
        let maxEntitiesInCell = 0;

        this.grid.forEach(cell => {
            totalEntitiesInCells += cell.size;
            maxEntitiesInCell = Math.max(maxEntitiesInCell, cell.size);
        });

        this.stats.averageEntitiesPerCell = this.grid.size > 0 
            ? totalEntitiesInCells / this.grid.size 
            : 0;

        // Периодическая очистка если нужно
        const now = Date.now();
        if (now - this.stats.lastCleanup > 30000) { // Каждые 30 секунд
            this.cleanup();
            this.stats.lastCleanup = now;
        }

        // Предупреждение о переполнении
        if (maxEntitiesInCell > this.options.maxEntitiesPerCell * 0.8) {
            console.warn(`⚠️ Обнаружена переполненная ячейка: ${maxEntitiesInCell} entities`);
        }
    }

    // Очистка и оптимизация
    cleanup() {
        let removed = 0;
        const now = Date.now();

        // Удаляем сущности которые не обновлялись долгое время
        this.entityMap.forEach((entityData, entityId) => {
            if (now - entityData.lastUpdated > 300000) { // 5 минут
                this.removeEntity(entityId);
                removed++;
            }
        });

        if (removed > 0 && this.debugEnabled) {
            console.log(`🧹 Очищено ${removed} устаревших сущностей`);
        }

        // Очищаем пустые ячейки
        let emptyCellsRemoved = 0;
        this.grid.forEach((cell, gridKey) => {
            if (cell.size === 0) {
                this.grid.delete(gridKey);
                emptyCellsRemoved++;
            }
        });

        this.stats.gridCells = this.grid.size;

        if (emptyCellsRemoved > 0 && this.debugEnabled) {
            console.log(`🧹 Удалено ${emptyCellsRemoved} пустых ячеек`);
        }
    }

    // Методы для отладки и визуализации

    createDebugVisualization(entityData) {
        try {
            const geometry = new THREE.SphereGeometry(entityData.radius, 8, 6);
            const material = new THREE.MeshBasicMaterial({
                color: this.getDebugColor(entityData.metadata.type),
                wireframe: true,
                transparent: true,
                opacity: 0.3
            });
            const debugMesh = new THREE.Mesh(geometry, material);
            debugMesh.position.copy(entityData.position);
            debugMesh.name = `debug_${entityData.entityId}`;

            this.debugObjects.add(debugMesh);
            return debugMesh;
        } catch (error) {
            console.error('❌ Ошибка создания отладочной визуализации:', error);
            return null;
        }
    }

    getDebugColor(entityType) {
        const colors = {
            'star': 0xffd700,
            'planet': 0x4ecdc4,
            'moon': 0xcccccc,
            'asteroid': 0x888888,
            'default': 0x00ff00
        };
        return colors[entityType] || colors.default;
    }

    removeDebugVisualization(entityId) {
        for (const debugMesh of this.debugObjects) {
            if (debugMesh.name === `debug_${entityId}`) {
                debugMesh.geometry.dispose();
                debugMesh.material.dispose();
                this.debugObjects.delete(debugMesh);
                break;
            }
        }
    }

    updateDebugVisualization(entityData) {
        for (const debugMesh of this.debugObjects) {
            if (debugMesh.name === `debug_${entityData.entityId}`) {
                debugMesh.position.copy(entityData.position);
                break;
            }
        }
    }

    setDebugEnabled(enabled) {
        this.debugEnabled = enabled;
        
        if (!enabled) {
            // Удаляем все отладочные объекты
            this.debugObjects.forEach(debugMesh => {
                debugMesh.geometry.dispose();
                debugMesh.material.dispose();
            });
            this.debugObjects.clear();
        }
        
        console.log(`🔧 Режим отладки: ${enabled ? 'ВКЛ' : 'ВЫКЛ'}`);
    }

    getDebugObjects() {
        return Array.from(this.debugObjects);
    }

    // Получение информации о партиционере
    getPartitionInfo() {
        const cellDistribution = {};
        this.grid.forEach((cell, key) => {
            cellDistribution[key] = cell.size;
        });

        return {
            gridSize: this.options.gridSize,
            totalCells: this.grid.size,
            cellDistribution,
            cacheInfo: {
                totalCached: this.queryCache.size,
                cacheHitRate: this.stats.queries > 0 ? 
                    (this.stats.cacheHits / this.stats.queries * 100).toFixed(1) + '%' : '0%'
            }
        };
    }

    // Получение статистики
    getStats() {
        const cacheHitRate = this.stats.queries > 0 ? 
            (this.stats.cacheHits / this.stats.queries * 100) : 0;

        return {
            ...this.stats,
            cacheHitRate: Math.round(cacheHitRate * 100) / 100,
            cacheSize: this.queryCache.size,
            debugEnabled: this.debugEnabled,
            gridSize: this.options.gridSize,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    // Оценка использования памяти
    estimateMemoryUsage() {
        let memory = 0;
        
        // EntityMap и Grid
        memory += this.entityMap.size * 200; // ~200 байт на сущность
        memory += this.grid.size * 100; // ~100 байт на ячейку
        
        // Кэш запросов
        memory += this.queryCache.size * 50; // ~50 байт на кэш-запрос
        
        // Отладочные объекты
        memory += this.debugObjects.size * 1000; // ~1KB на отладочный объект
        
        return memory;
    }

    // Экспорт данных для отладки
    exportData() {
        return {
            options: this.options,
            stats: this.stats,
            entities: Array.from(this.entityMap.entries()).map(([id, data]) => ({
                id,
                position: data.position.toArray(),
                radius: data.radius,
                type: data.metadata.type,
                gridKey: data.gridKey
            })),
            grid: Array.from(this.grid.entries()).map(([key, cell]) => ({
                key,
                size: cell.size
            }))
        };
    }

    // Очистка
    clear() {
        this.grid.clear();
        this.entityMap.clear();
        this.queryCache.clear();

        // Очищаем отладочные объекты
        this.debugObjects.forEach(debugMesh => {
            debugMesh.geometry.dispose();
            debugMesh.material.dispose();
        });
        this.debugObjects.clear();

        // Сброс статистики
        this.stats.totalEntities = 0;
        this.stats.gridCells = 0;
        this.stats.queries = 0;
        this.stats.cacheHits = 0;
        this.stats.collisions = 0;
        this.stats.updates = 0;
        this.stats.averageEntitiesPerCell = 0;
        this.stats.lastCleanup = Date.now();

        console.log('🧹 SpatialPartitioner очищен');
    }

    // Деструктор
    dispose() {
        this.clear();
        console.log('✅ SpatialPartitioner уничтожен');
    }
}

export default SpatialPartitioner;