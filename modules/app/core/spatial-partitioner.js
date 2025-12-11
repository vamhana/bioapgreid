// modules/app/core/spatial-partitioner.js
import * as THREE from './three.module.js';

// Конфигурация пространственного разбиения
const SpatialConfig = {
    // Настройки Octree
    OCTREE: {
        MAX_OBJECTS_PER_NODE: 10,    // Макс объектов в узле перед разделением
        MIN_NODE_SIZE: 50,           // Минимальный размер узла
        MAX_DEPTH: 8,                // Максимальная глубина дерева
        LOOSE_FACTOR: 1.2            // Коэффициент "свободного" дерева (loose octree)
    },
    
    // Стратегии обновления для динамических объектов
    UPDATE_STRATEGIES: {
        IMMEDIATE: 'immediate',     // Немедленное обновление позиции
        DEFERRED: 'deferred',       // Отложенное обновление (батчинг)
        LAZY: 'lazy'                // Ленивое обновление (при запросе)
    },
    
    // Оптимизации для разных типов объектов
    OBJECT_TYPES: {
        STATIC: 'static',      // Никогда не двигаются (звезды, планеты)
        DYNAMIC: 'dynamic',    // Двигаются иногда (спутники)
        FREQUENT: 'frequent',  // Часто двигаются (игрок, камера)
        MASSIVE: 'massive'     // Большие объекты (галактика, туманности)
    },
    
    // Настройки производительности
    PERFORMANCE: {
        BATCH_SIZE: 100,           // Размер батча для групповых операций
        CACHE_SIZE: 1000,          // Размер кэша запросов
        UPDATE_THROTTLE: 16        // Задержка обновления в мс (60 FPS)
    }
};

// Структура для хранения информации об объекте
class SpatialObject {
    constructor(entityId, position, radius, metadata = {}) {
        this.entityId = entityId;
        this.position = position.clone();
        this.radius = radius;
        this.boundingSphere = new THREE.Sphere(position.clone(), radius);
        this.metadata = {
            type: metadata.type || 'unknown',
            mesh: metadata.mesh,
            objectType: metadata.objectType || SpatialConfig.OBJECT_TYPES.STATIC,
            priority: metadata.priority || 1,
            lastUpdated: Date.now(),
            ...metadata
        };
        
        // Для отслеживания изменений
        this._dirty = false;
        this._node = null; // Ссылка на узел Octree
    }
    
    updatePosition(newPosition, newRadius = null) {
        const positionChanged = !this.position.equals(newPosition);
        const radiusChanged = newRadius !== null && newRadius !== this.radius;
        
        if (positionChanged) {
            this.position.copy(newPosition);
            this.boundingSphere.center.copy(newPosition);
        }
        
        if (radiusChanged) {
            this.radius = newRadius;
            this.boundingSphere.radius = newRadius;
        }
        
        this._dirty = positionChanged || radiusChanged;
        this.metadata.lastUpdated = Date.now();
        
        return this._dirty;
    }
    
    getBoundingBox() {
        const min = this.position.clone().subScalar(this.radius);
        const max = this.position.clone().addScalar(this.radius);
        return new THREE.Box3(min, max);
    }
    
    intersects(other) {
        return this.boundingSphere.intersectsSphere(other.boundingSphere);
    }
    
    distanceTo(point) {
        return this.position.distanceTo(point);
    }
    
    dispose() {
        this.position = null;
        this.boundingSphere = null;
        this.metadata = null;
        this._node = null;
    }
}

// Узел Octree (октальное дерево)
class OctreeNode {
    constructor(bounds, depth = 0, parent = null) {
        this.bounds = bounds.clone();
        this.depth = depth;
        this.parent = parent;
        
        // Дочерние узлы (8 для 3D)
        this.children = [];
        
        // Объекты в этом узле
        this.objects = new Map(); // entityId -> SpatialObject
        this.objectCount = 0;
        
        // Статистика
        this.stats = {
            insertions: 0,
            deletions: 0,
            queries: 0,
            splits: 0
        };
        
        // Флаги состояния
        this.isLeaf = true;
        this.isDirty = false;
        this.needsRebalance = false;
    }
    
    // Разделение узла на 8 дочерних
    split() {
        if (!this.isLeaf || this.children.length > 0) return;
        
        const center = this.bounds.getCenter(new THREE.Vector3());
        const size = this.bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
        
        // Создаём 8 дочерних узлов (октантов)
        for (let x = 0; x < 2; x++) {
            for (let y = 0; y < 2; y++) {
                for (let z = 0; z < 2; z++) {
                    const min = new THREE.Vector3(
                        x === 0 ? this.bounds.min.x : center.x,
                        y === 0 ? this.bounds.min.y : center.y,
                        z === 0 ? this.bounds.min.z : center.z
                    );
                    
                    const max = new THREE.Vector3(
                        x === 0 ? center.x : this.bounds.max.x,
                        y === 0 ? center.y : this.bounds.max.y,
                        z === 0 ? center.z : this.bounds.max.z
                    );
                    
                    const childBounds = new THREE.Box3(min, max);
                    const child = new OctreeNode(childBounds, this.depth + 1, this);
                    this.children.push(child);
                }
            }
        }
        
        this.isLeaf = false;
        this.stats.splits++;
        
        // Перераспределяем объекты текущего узла по дочерним
        this.redistributeObjects();
    }
    
    // Перераспределение объектов по дочерним узлам
    redistributeObjects() {
        const objectsToRedistribute = Array.from(this.objects.values());
        this.objects.clear();
        this.objectCount = 0;
        
        for (const obj of objectsToRedistribute) {
            this.insertObject(obj, false);
        }
    }
    
    // Вставка объекта в узел
    insertObject(obj, checkCapacity = true) {
        // Если узел - лист и превышен лимит объектов, разделяем его
        if (this.isLeaf && checkCapacity && 
            this.objectCount >= SpatialConfig.OCTREE.MAX_OBJECTS_PER_NODE &&
            this.depth < SpatialConfig.OCTREE.MAX_DEPTH &&
            this.bounds.getSize(new THREE.Vector3()).x > SpatialConfig.OCTREE.MIN_NODE_SIZE * 2) {
            
            this.split();
        }
        
        // Если узел не лист, пытаемся вставить в дочерний узел
        if (!this.isLeaf) {
            for (const child of this.children) {
                if (child.bounds.containsPoint(obj.position)) {
                    return child.insertObject(obj, checkCapacity);
                }
            }
        }
        
        // Вставляем в текущий узел
        this.objects.set(obj.entityId, obj);
        this.objectCount++;
        obj._node = this;
        this.stats.insertions++;
        this.isDirty = true;
        
        return true;
    }
    
    // Удаление объекта из узла
    removeObject(entityId) {
        if (this.objects.has(entityId)) {
            const obj = this.objects.get(entityId);
            obj._node = null;
            this.objects.delete(entityId);
            this.objectCount--;
            this.stats.deletions++;
            this.isDirty = true;
            
            // Если узел пустой и не лист, пытаемся объединить с братьями
            if (!this.isLeaf && this.objectCount === 0) {
                this.tryMerge();
            }
            
            return obj;
        }
        
        // Если объект не найден в этом узле, ищем в дочерних
        if (!this.isLeaf) {
            for (const child of this.children) {
                const removed = child.removeObject(entityId);
                if (removed) return removed;
            }
        }
        
        return null;
    }
    
    // Попытка объединения пустых дочерних узлов
    tryMerge() {
        if (this.isLeaf) return false;
        
        let totalObjects = this.objectCount;
        for (const child of this.children) {
            totalObjects += child.objectCount;
            if (!child.isLeaf) {
                child.tryMerge();
                totalObjects += child.objectCount;
            }
        }
        
        // Если все дочерние узлы пустые или почти пустые, объединяем их
        if (totalObjects <= SpatialConfig.OCTREE.MAX_OBJECTS_PER_NODE / 2) {
            // Собираем все объекты из дочерних узлов
            const allObjects = [];
            for (const child of this.children) {
                allObjects.push(...child.objects.values());
                child.dispose();
            }
            
            // Удаляем дочерние узлы
            this.children = [];
            this.isLeaf = true;
            
            // Вставляем объекты обратно в текущий узел
            for (const obj of allObjects) {
                this.insertObject(obj, false);
            }
            
            return true;
        }
        
        return false;
    }
    
    // Поиск объектов в пределах bounding sphere
    querySphere(center, radius, results = new Map(), visitedNodes = new Set()) {
        if (visitedNodes.has(this)) return results;
        visitedNodes.add(this);
        
        this.stats.queries++;
        
        // Проверяем пересечение сферы запроса с bounding box узла
        const sphere = new THREE.Sphere(center, radius);
        if (!sphere.intersectsBox(this.bounds)) {
            return results;
        }
        
        // Добавляем объекты текущего узла
        for (const obj of this.objects.values()) {
            if (obj.distanceTo(center) <= radius + obj.radius) {
                results.set(obj.entityId, obj);
            }
        }
        
        // Рекурсивно проверяем дочерние узлы
        if (!this.isLeaf) {
            for (const child of this.children) {
                child.querySphere(center, radius, results, visitedNodes);
            }
        }
        
        return results;
    }
    
    // Поиск объектов в пределах frustum (для frustum culling)
    queryFrustum(frustum, results = new Map(), visitedNodes = new Set()) {
        if (visitedNodes.has(this)) return results;
        visitedNodes.add(this);
        
        // Проверяем пересечение frustum с bounding box узла
        if (!frustum.intersectsBox(this.bounds)) {
            return results;
        }
        
        // Добавляем объекты текущего узла
        for (const obj of this.objects.values()) {
            if (frustum.intersectsSphere(obj.boundingSphere)) {
                results.set(obj.entityId, obj);
            }
        }
        
        // Рекурсивно проверяем дочерние узлы
        if (!this.isLeaf) {
            for (const child of this.children) {
                child.queryFrustum(frustum, results, visitedNodes);
            }
        }
        
        return results;
    }
    
    // Поиск ближайшего объекта к точке
    findNearest(position, maxDistance = Infinity, best = { distance: Infinity, object: null }) {
        // Сначала проверяем, может ли этот узел содержать более близкие объекты
        const distanceToNode = this.bounds.distanceToPoint(position);
        if (distanceToNode >= best.distance) {
            return best;
        }
        
        // Проверяем объекты в этом узле
        for (const obj of this.objects.values()) {
            const distance = obj.distanceTo(position);
            if (distance < best.distance && distance <= maxDistance) {
                best.distance = distance;
                best.object = obj;
            }
        }
        
        // Рекурсивно проверяем дочерние узлы в порядке близости
        if (!this.isLeaf) {
            // Сортируем дочерние узлы по расстоянию до точки
            const sortedChildren = this.children
                .map(child => ({ child, distance: child.bounds.distanceToPoint(position) }))
                .sort((a, b) => a.distance - b.distance);
            
            for (const { child, distance } of sortedChildren) {
                if (distance >= best.distance) break;
                child.findNearest(position, maxDistance, best);
            }
        }
        
        return best;
    }
    
    // Получение статистики узла
    getStats() {
        const stats = { ...this.stats };
        
        if (!this.isLeaf) {
            stats.children = this.children.map(child => child.getStats());
        }
        
        return {
            depth: this.depth,
            bounds: {
                min: this.bounds.min.toArray(),
                max: this.bounds.max.toArray(),
                size: this.bounds.getSize(new THREE.Vector3()).toArray()
            },
            objects: this.objectCount,
            isLeaf: this.isLeaf,
            ...stats
        };
    }
    
    // Очистка ресурсов узла
    dispose() {
        for (const obj of this.objects.values()) {
            obj.dispose();
        }
        
        this.objects.clear();
        
        for (const child of this.children) {
            child.dispose();
        }
        
        this.children = [];
        this.parent = null;
    }
}

// Класс для управления динамическими объектами
class DynamicObjectManager {
    constructor(spatialPartitioner) {
        this.spatialPartitioner = spatialPartitioner;
        this.dynamicObjects = new Map(); // entityId -> {object, updateStrategy, lastUpdate}
        this.updateQueue = new Map();    // entityId -> newPosition
        this.isUpdating = false;
        
        // Статистика
        this.stats = {
            totalUpdates: 0,
            batchedUpdates: 0,
            immediateUpdates: 0,
            deferredUpdates: 0,
            lazyUpdates: 0,
            updateTime: 0
        };
    }
    
    // Добавление динамического объекта
    addDynamicObject(entityId, object, updateStrategy = SpatialConfig.UPDATE_STRATEGIES.DEFERRED) {
        this.dynamicObjects.set(entityId, {
            object,
            updateStrategy,
            lastUpdate: Date.now(),
            updateCount: 0
        });
    }
    
    // Обновление позиции динамического объекта
    updatePosition(entityId, newPosition, newRadius = null, forceImmediate = false) {
        const record = this.dynamicObjects.get(entityId);
        if (!record) return false;
        
        const { object, updateStrategy } = record;
        
        // Проверяем, действительно ли позиция изменилась
        const needsUpdate = object.updatePosition(newPosition, newRadius);
        if (!needsUpdate) return false;
        
        // В зависимости от стратегии обновления
        switch (updateStrategy) {
            case SpatialConfig.UPDATE_STRATEGIES.IMMEDIATE:
            case forceImmediate:
                this.updateImmediately(entityId, object);
                this.stats.immediateUpdates++;
                break;
                
            case SpatialConfig.UPDATE_STRATEGIES.DEFERRED:
                this.updateQueue.set(entityId, { position: newPosition.clone(), radius: newRadius });
                this.stats.deferredUpdates++;
                break;
                
            case SpatialConfig.UPDATE_STRATEGIES.LAZY:
                // Просто помечаем как dirty, обновим при следующем запросе
                object._dirty = true;
                this.stats.lazyUpdates++;
                break;
        }
        
        record.lastUpdate = Date.now();
        record.updateCount++;
        
        return true;
    }
    
    // Немедленное обновление позиции
    updateImmediately(entityId, object) {
        if (!object._dirty) return;
        
        // Удаляем из текущего узла и вставляем заново
        this.spatialPartitioner.removeEntity(entityId);
        this.spatialPartitioner.addEntity(
            entityId,
            object.position,
            object.radius,
            object.metadata
        );
        
        object._dirty = false;
        this.stats.totalUpdates++;
    }
    
    // Пакетное обновление отложенных объектов
    processUpdateQueue(batchSize = SpatialConfig.PERFORMANCE.BATCH_SIZE) {
        if (this.updateQueue.size === 0 || this.isUpdating) return 0;
        
        this.isUpdating = true;
        const startTime = performance.now();
        let processed = 0;
        
        // Обрабатываем батч объектов
        const entries = Array.from(this.updateQueue.entries());
        const batch = entries.slice(0, Math.min(batchSize, entries.length));
        
        for (const [entityId, { position, radius }] of batch) {
            const record = this.dynamicObjects.get(entityId);
            if (record) {
                this.updateImmediately(entityId, record.object);
                this.updateQueue.delete(entityId);
                processed++;
            }
        }
        
        this.stats.batchedUpdates += processed;
        this.stats.updateTime += performance.now() - startTime;
        this.isUpdating = false;
        
        return processed;
    }
    
    // Обновление ленивых объектов при запросе
    updateLazyObjects(entityIds) {
        let updated = 0;
        
        for (const entityId of entityIds) {
            const record = this.dynamicObjects.get(entityId);
            if (record && record.object._dirty) {
                this.updateImmediately(entityId, record.object);
                updated++;
            }
        }
        
        return updated;
    }
    
    // Получение статистики
    getStats() {
        return {
            ...this.stats,
            dynamicObjects: this.dynamicObjects.size,
            queuedUpdates: this.updateQueue.size,
            avgUpdateTime: this.stats.totalUpdates > 0 
                ? this.stats.updateTime / this.stats.totalUpdates 
                : 0
        };
    }
}

// Кэш для запросов (пространственный запрос мемоизация)
class QueryCache {
    constructor(maxSize = SpatialConfig.PERFORMANCE.CACHE_SIZE) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }
    
    // Генерация ключа для запроса
    generateKey(type, params) {
        switch (type) {
            case 'sphere':
                return `sphere_${params.center.x}_${params.center.y}_${params.center.z}_${params.radius}`;
            case 'frustum':
                return `frustum_${Date.now() % 1000}`; // Упрощённый ключ для frustum
            case 'nearest':
                return `nearest_${params.position.x}_${params.position.y}_${params.position.z}_${params.maxDistance}`;
            default:
                return `${type}_${JSON.stringify(params)}`;
        }
    }
    
    // Получение результата из кэша
    get(type, params) {
        const key = this.generateKey(type, params);
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);
            
            // Проверяем актуальность кэша (TTL)
            if (Date.now() - entry.timestamp < 100) { // 100ms TTL
                this.stats.hits++;
                
                // Обновляем порядок использования (LRU)
                this.cache.delete(key);
                this.cache.set(key, entry);
                
                return entry.result;
            }
            
            // Удаляем просроченный кэш
            this.cache.delete(key);
        }
        
        this.stats.misses++;
        return null;
    }
    
    // Сохранение результата в кэш
    set(type, params, result) {
        const key = this.generateKey(type, params);
        
        // Если кэш переполнен, удаляем самый старый
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
            this.stats.evictions++;
        }
        
        this.cache.set(key, {
            result,
            timestamp: Date.now(),
            type,
            params
        });
    }
    
    // Очистка кэша
    clear() {
        this.cache.clear();
        this.stats.hits = 0;
        this.stats.misses = 0;
        this.stats.evictions = 0;
    }
    
    // Получение статистики
    getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: this.stats.hits + this.stats.misses > 0
                ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1) + '%'
                : '0%'
        };
    }
}

export class SpatialPartitioner {
    constructor(config = {}) {
        this.config = { ...SpatialConfig, ...config };
        
        // Octree корневой узел (вся сцена)
        const sceneBounds = new THREE.Box3(
            new THREE.Vector3(-5000, -5000, -5000),
            new THREE.Vector3(5000, 5000, 5000)
        );
        
        this.octree = new OctreeNode(sceneBounds);
        
        // Индексы для быстрого доступа
        this.objectIndex = new Map(); // entityId -> SpatialObject
        
        // Менеджер динамических объектов
        this.dynamicManager = new DynamicObjectManager(this);
        
        // Кэш запросов
        this.queryCache = new QueryCache(this.config.PERFORMANCE.CACHE_SIZE);
        
        // Статистика
        this.stats = {
            totalObjects: 0,
            visibleObjects: 0,
            checksPerFrame: 0,
            frames: 0,
            queryTypes: {
                sphere: 0,
                frustum: 0,
                nearest: 0,
                raycast: 0
            },
            performance: {
                averageQueryTime: 0,
                lastQueryTime: 0,
                cacheEfficiency: 0
            }
        };
        
        // Оптимизации
        this.optimizations = {
            useCache: true,
            batchUpdates: true,
            throttleUpdates: true,
            lastUpdateTime: 0
        };
        
        console.log('🗺️ SpatialPartitioner создан с Octree', {
            bounds: sceneBounds,
            config: this.config.OCTREE
        });
    }
    
    // ===== ОСНОВНЫЕ МЕТОДЫ =====
    
    /**
     * Добавление объекта в пространственный индекс
     */
    addEntity(entityId, position, radius, metadata = {}) {
        // Проверяем, не существует ли уже объект
        if (this.objectIndex.has(entityId)) {
            this.removeEntity(entityId);
        }
        
        // Создаём SpatialObject
        const object = new SpatialObject(entityId, position, radius, metadata);
        
        // Добавляем в Octree
        this.octree.insertObject(object);
        
        // Добавляем в индекс
        this.objectIndex.set(entityId, object);
        this.stats.totalObjects++;
        
        // Если объект динамический, регистрируем в менеджере
        const objectType = metadata.objectType || SpatialConfig.OBJECT_TYPES.STATIC;
        if (objectType !== SpatialConfig.OBJECT_TYPES.STATIC) {
            const updateStrategy = this.getUpdateStrategy(objectType);
            this.dynamicManager.addDynamicObject(entityId, object, updateStrategy);
        }
        
        return object;
    }
    
    /**
     * Обновление позиции объекта
     */
    updateEntity(entityId, newPosition, newRadius = null, immediate = false) {
        const object = this.objectIndex.get(entityId);
        if (!object) return false;
        
        const objectType = object.metadata.objectType || SpatialConfig.OBJECT_TYPES.STATIC;
        
        if (objectType === SpatialConfig.OBJECT_TYPES.STATIC) {
            // Статические объекты не обновляются
            console.warn(`⚠️ Попытка обновить статический объект: ${entityId}`);
            return false;
        }
        
        // Обновляем через менеджер динамических объектов
        return this.dynamicManager.updatePosition(entityId, newPosition, newRadius, immediate);
    }
    
    /**
     * Удаление объекта
     */
    removeEntity(entityId) {
        const object = this.objectIndex.get(entityId);
        if (!object) return null;
        
        // Удаляем из Octree
        const removed = this.octree.removeObject(entityId);
        
        // Удаляем из индекса
        this.objectIndex.delete(entityId);
        this.stats.totalObjects--;
        
        // Удаляем из менеджера динамических объектов
        this.dynamicManager.dynamicObjects.delete(entityId);
        this.dynamicManager.updateQueue.delete(entityId);
        
        // Очищаем кэш запросов
        this.queryCache.clear();
        
        return removed;
    }
    
    /**
     * Получение видимых объектов (с использованием frustum culling)
     */
    getVisibleEntities(cameraPosition, zoom, frustum = null) {
        const startTime = performance.now();
        
        let visibleEntities;
        
        if (frustum) {
            // Frustum culling
            this.stats.queryTypes.frustum++;
            visibleEntities = this.queryFrustum(frustum);
        } else {
            // Простая проверка по сфере
            this.stats.queryTypes.sphere++;
            const viewDistance = this.calculateViewDistance(zoom);
            visibleEntities = this.querySphere(cameraPosition, viewDistance);
        }
        
        // Обновляем ленивые объекты если нужно
        this.dynamicManager.updateLazyObjects(visibleEntities.keys());
        
        // Обновляем статистику
        const queryTime = performance.now() - startTime;
        this.updateQueryStats(queryTime, visibleEntities.size);
        
        return visibleEntities;
    }
    
    /**
     * Запрос объектов в сфере
     */
    querySphere(center, radius, useCache = true) {
        if (useCache && this.optimizations.useCache) {
            const cached = this.queryCache.get('sphere', { center, radius });
            if (cached) {
                return cached;
            }
        }
        
        const startTime = performance.now();
        const results = this.octree.querySphere(center, radius);
        const queryTime = performance.now() - startTime;
        
        // Кэшируем результат
        if (useCache && this.optimizations.useCache) {
            this.queryCache.set('sphere', { center, radius }, results);
        }
        
        this.stats.lastQueryTime = queryTime;
        this.stats.checksPerFrame += results.size;
        
        return results;
    }
    
    /**
     * Запрос объектов во frustum
     */
    queryFrustum(frustum, useCache = false) { // Frustum редко кэшируется из-за постоянного изменения
        const startTime = performance.now();
        const results = this.octree.queryFrustum(frustum);
        const queryTime = performance.now() - startTime;
        
        this.stats.lastQueryTime = queryTime;
        this.stats.checksPerFrame += results.size;
        
        return results;
    }
    
    /**
     * Поиск ближайшего объекта
     */
    findNearest(position, maxDistance = Infinity) {
        const startTime = performance.now();
        
        if (this.optimizations.useCache) {
            const cached = this.queryCache.get('nearest', { position, maxDistance });
            if (cached) {
                return cached;
            }
        }
        
        const result = this.octree.findNearest(position, maxDistance);
        const queryTime = performance.now() - startTime;
        
        this.stats.lastQueryTime = queryTime;
        this.stats.queryTypes.nearest++;
        
        // Кэшируем результат
        if (this.optimizations.useCache) {
            this.queryCache.set('nearest', { position, maxDistance }, result);
        }
        
        return result.object ? {
            entityId: result.object.entityId,
            distance: result.distance,
            object: result.object
        } : null;
    }
    
    /**
     * Raycast для проверки пересечений
     */
    raycast(ray, maxDistance = 1000, recursive = true) {
        const startTime = performance.now();
        
        const intersects = [];
        const raySphere = new THREE.Sphere(ray.origin, maxDistance);
        
        // Сначала находим все объекты в сфере вдоль луча
        const candidates = this.querySphere(ray.origin, maxDistance, false);
        
        // Проверяем пересечение каждого кандидата с лучом
        for (const object of candidates.values()) {
            const intersection = ray.intersectSphere(object.boundingSphere, new THREE.Vector3());
            if (intersection) {
                const distance = intersection.distanceTo(ray.origin);
                if (distance <= maxDistance) {
                    intersects.push({
                        entityId: object.entityId,
                        object: object,
                        distance: distance,
                        point: intersection
                    });
                }
            }
        }
        
        // Сортируем по расстоянию
        intersects.sort((a, b) => a.distance - b.distance);
        
        const queryTime = performance.now() - startTime;
        this.stats.lastQueryTime = queryTime;
        this.stats.queryTypes.raycast++;
        
        return intersects;
    }
    
    // ===== ОПТИМИЗАЦИИ И УПРАВЛЕНИЕ =====
    
    /**
     * Пакетная обработка обновлений
     */
    processBatchUpdates() {
        if (!this.optimizations.batchUpdates) return 0;
        
        const now = Date.now();
        
        // Троттлинг обновлений
        if (this.optimizations.throttleUpdates && 
            now - this.optimizations.lastUpdateTime < this.config.PERFORMANCE.UPDATE_THROTTLE) {
            return 0;
        }
        
        const processed = this.dynamicManager.processUpdateQueue(this.config.PERFORMANCE.BATCH_SIZE);
        
        this.optimizations.lastUpdateTime = now;
        return processed;
    }
    
    /**
     * Перебалансировка Octree
     */
    rebalance() {
        console.log('⚖️ Перебалансировка Octree...');
        const startTime = performance.now();
        
        // Собираем все объекты
        const allObjects = Array.from(this.objectIndex.values());
        
        // Очищаем Octree
        this.octree.dispose();
        
        // Пересоздаём Octree с теми же границами
        const bounds = this.octree.bounds;
        this.octree = new OctreeNode(bounds);
        
        // Вставляем объекты заново
        for (const object of allObjects) {
            this.octree.insertObject(object);
        }
        
        const rebalanceTime = performance.now() - startTime;
        console.log(`✅ Octree перебалансирован за ${rebalanceTime.toFixed(2)}ms`);
        
        return rebalanceTime;
    }
    
    /**
     * Определение стратегии обновления на основе типа объекта
     */
    getUpdateStrategy(objectType) {
        switch (objectType) {
            case SpatialConfig.OBJECT_TYPES.FREQUENT:
                return SpatialConfig.UPDATE_STRATEGIES.IMMEDIATE;
            case SpatialConfig.OBJECT_TYPES.DYNAMIC:
                return SpatialConfig.UPDATE_STRATEGIES.DEFERRED;
            case SpatialConfig.OBJECT_TYPES.MASSIVE:
                return SpatialConfig.UPDATE_STRATEGIES.LAZY;
            default:
                return SpatialConfig.UPDATE_STRATEGIES.DEFERRED;
        }
    }
    
    /**
     * Расчёт дистанции видимости на основе zoom
     */
    calculateViewDistance(zoom) {
        const baseDistance = 1000;
        return baseDistance / Math.max(zoom, 0.1);
    }
    
    /**
     * Обновление статистики запросов
     */
    updateQueryStats(queryTime, resultsCount) {
        this.stats.frames++;
        this.stats.visibleObjects = resultsCount;
        
        // Обновляем среднее время запроса
        this.stats.performance.averageQueryTime = 
            (this.stats.performance.averageQueryTime * (this.stats.frames - 1) + queryTime) / 
            this.stats.frames;
        
        // Обновляем эффективность кэша
        const cacheStats = this.queryCache.getStats();
        this.stats.performance.cacheEfficiency = parseFloat(cacheStats.hitRate);
    }
    
    // ===== ВИЗУАЛИЗАЦИЯ И ОТЛАДКА =====
    
    /**
     * Визуализация Octree для отладки
     */
    debugDraw(scene, showBounds = true, showObjects = false, maxDepth = Infinity) {
        this.clearDebugDraw(scene);
        
        const drawNode = (node, depth) => {
            if (depth > maxDepth) return;
            
            // Рисуем границы узла
            if (showBounds) {
                const boxGeometry = new THREE.BoxGeometry(
                    node.bounds.max.x - node.bounds.min.x,
                    node.bounds.max.y - node.bounds.min.y,
                    node.bounds.max.z - node.bounds.min.z
                );
                
                const material = new THREE.MeshBasicMaterial({
                    color: this.getDepthColor(depth),
                    wireframe: true,
                    transparent: true,
                    opacity: 0.2 + (0.8 / (depth + 1))
                });
                
                const cube = new THREE.Mesh(boxGeometry, material);
                cube.position.copy(node.bounds.getCenter(new THREE.Vector3()));
                cube.userData = { isDebug: true, nodeDepth: depth, type: 'octree_bounds' };
                
                scene.add(cube);
            }
            
            // Рисуем объекты в узле
            if (showObjects && node.objects.size > 0) {
                for (const object of node.objects.values()) {
                    const sphereGeometry = new THREE.SphereGeometry(object.radius, 8, 8);
                    const material = new THREE.MeshBasicMaterial({
                        color: object.metadata.type === 'star' ? 0xffff00 :
                               object.metadata.type === 'planet' ? 0x00ff00 :
                               object.metadata.type === 'moon' ? 0x0000ff : 0xff0000,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.5
                    });
                    
                    const sphere = new THREE.Mesh(sphereGeometry, material);
                    sphere.position.copy(object.position);
                    sphere.userData = { isDebug: true, entityId: object.entityId, type: 'object_bounds' };
                    
                    scene.add(sphere);
                }
            }
            
            // Рекурсивно рисуем дочерние узлы
            if (!node.isLeaf) {
                for (const child of node.children) {
                    drawNode(child, depth + 1);
                }
            }
        };
        
        drawNode(this.octree, 0);
        console.log('🎨 Отладочная визуализация Octree создана');
    }
    
    /**
     * Цвет для узлов разной глубины
     */
    getDepthColor(depth) {
        const colors = [
            0xff0000, // Красный (корень)
            0xff8800, // Оранжевый
            0xffff00, // Жёлтый
            0x00ff00, // Зелёный
            0x00ffff, // Голубой
            0x0000ff, // Синий
            0xff00ff, // Фиолетовый
            0xffffff  // Белый
        ];
        
        return colors[Math.min(depth, colors.length - 1)];
    }
    
    /**
     * Очистка отладочной визуализации
     */
    clearDebugDraw(scene) {
        const debugObjects = [];
        scene.traverse(object => {
            if (object.userData && object.userData.isDebug) {
                debugObjects.push(object);
            }
        });
        
        debugObjects.forEach(object => {
            scene.remove(object);
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        });
    }
    
    // ===== СТАТИСТИКА И МОНИТОРИНГ =====
    
    /**
     * Получение статистики
     */
    getStats() {
        const octreeStats = this.octree.getStats();
        const dynamicStats = this.dynamicManager.getStats();
        const cacheStats = this.queryCache.getStats();
        
        return {
            objects: {
                total: this.stats.totalObjects,
                static: this.stats.totalObjects - dynamicStats.dynamicObjects,
                dynamic: dynamicStats.dynamicObjects,
                visible: this.stats.visibleObjects
            },
            octree: {
                depth: octreeStats.depth,
                nodes: this.countNodes(this.octree),
                objectsPerNode: this.calculateObjectsPerNode(),
                balance: this.calculateBalanceFactor()
            },
            performance: {
                ...this.stats.performance,
                checksPerFrame: this.stats.checksPerFrame,
                queryTypes: this.stats.queryTypes,
                lastQueryTime: this.stats.lastQueryTime.toFixed(2) + 'ms'
            },
            dynamic: dynamicStats,
            cache: cacheStats,
            optimizations: {
                ...this.optimizations,
                batchSize: this.config.PERFORMANCE.BATCH_SIZE,
                cacheSize: this.config.PERFORMANCE.CACHE_SIZE
            }
        };
    }
    
    /**
     * Подсчёт узлов в Octree
     */
    countNodes(node) {
        let count = 1; // Текущий узел
        
        if (!node.isLeaf) {
            for (const child of node.children) {
                count += this.countNodes(child);
            }
        }
        
        return count;
    }
    
    /**
     * Расчёт среднего количества объектов на узел
     */
    calculateObjectsPerNode() {
        const totalNodes = this.countNodes(this.octree);
        return totalNodes > 0 ? (this.stats.totalObjects / totalNodes).toFixed(2) : 0;
    }
    
    /**
     * Расчёт фактора балансировки дерева
     */
    calculateBalanceFactor() {
        const depths = [];
        const collectDepths = (node, depth) => {
            if (node.isLeaf) {
                depths.push(depth);
            } else {
                for (const child of node.children) {
                    collectDepths(child, depth + 1);
                }
            }
        };
        
        collectDepths(this.octree, 0);
        
        if (depths.length === 0) return 0;
        
        const avgDepth = depths.reduce((sum, d) => sum + d, 0) / depths.length;
        const variance = depths.reduce((sum, d) => sum + Math.pow(d - avgDepth, 2), 0) / depths.length;
        
        return (1 / (1 + Math.sqrt(variance))).toFixed(3); // 0-1, где 1 - идеально сбалансировано
    }
    
    /**
     * Экспорт структуры Octree для анализа
     */
    exportStructure() {
        const structure = {
            bounds: {
                min: this.octree.bounds.min.toArray(),
                max: this.octree.bounds.max.toArray()
            },
            config: this.config.OCTREE,
            stats: this.getStats(),
            tree: this.serializeNode(this.octree)
        };
        
        return structure;
    }
    
    /**
     * Сериализация узла для экспорта
     */
    serializeNode(node) {
        const serialized = {
            depth: node.depth,
            bounds: {
                min: node.bounds.min.toArray(),
                max: node.bounds.max.toArray()
            },
            isLeaf: node.isLeaf,
            objectCount: node.objectCount,
            objects: Array.from(node.objects.keys())
        };
        
        if (!node.isLeaf) {
            serialized.children = node.children.map(child => this.serializeNode(child));
        }
        
        return serialized;
    }
    
    // ===== ОЧИСТКА РЕСУРСОВ =====
    
    /**
     * Очистка всех ресурсов
     */
    clear() {
        // Очищаем Octree
        this.octree.dispose();
        
        // Очищаем индексы
        this.objectIndex.clear();
        
        // Очищаем менеджер динамических объектов
        this.dynamicManager.dynamicObjects.clear();
        this.dynamicManager.updateQueue.clear();
        
        // Очищаем кэш
        this.queryCache.clear();
        
        // Сбрасываем статистику
        this.stats.totalObjects = 0;
        this.stats.visibleObjects = 0;
        this.stats.checksPerFrame = 0;
        this.stats.frames = 0;
        this.stats.queryTypes = {
            sphere: 0,
            frustum: 0,
            nearest: 0,
            raycast: 0
        };
        
        console.log('🧹 SpatialPartitioner очищен');
    }
    
    /**
     * Уничтожение партишнера
     */
    dispose() {
        this.clear();
        console.log('🧹 SpatialPartitioner уничтожен');
    }
}

export default SpatialPartitioner;
