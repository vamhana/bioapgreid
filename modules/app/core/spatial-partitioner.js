// modules/app/core/spatial-partitioner.js
import * as THREE from './three.module.js';

export class SpatialPartitioner {
    constructor(cellSize = 500) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this.entityToCell = new Map();
        this.stats = {
            totalEntities: 0,
            visibleEntities: 0,
            totalCells: 0,
            checksPerFrame: 0
        };
        
        console.log('🗺️ SpatialPartitioner создан, размер ячейки:', cellSize);
    }

    addEntity(entityId, position, radius, metadata = {}) {
        const cellKey = this.getCellKey(position);
        
        if (!this.cells.has(cellKey)) {
            this.cells.set(cellKey, new Set());
            this.stats.totalCells++;
        }
        
        this.cells.get(cellKey).add(entityId);
        this.entityToCell.set(entityId, {
            cellKey,
            position: position.clone(),
            radius,
            metadata
        });
        
        this.stats.totalEntities++;
    }

    updateEntity(entityId, newPosition, newRadius = null) {
        const entityData = this.entityToCell.get(entityId);
        if (!entityData) return;

        const oldCellKey = entityData.cellKey;
        const newCellKey = this.getCellKey(newPosition);

        // Если ячейка изменилась, перемещаем entity
        if (oldCellKey !== newCellKey) {
            // Удаляем из старой ячейки
            const oldCell = this.cells.get(oldCellKey);
            if (oldCell) {
                oldCell.delete(entityId);
                if (oldCell.size === 0) {
                    this.cells.delete(oldCellKey);
                    this.stats.totalCells--;
                }
            }

            // Добавляем в новую ячейку
            if (!this.cells.has(newCellKey)) {
                this.cells.set(newCellKey, new Set());
                this.stats.totalCells++;
            }
            this.cells.get(newCellKey).add(entityId);
        }

        // Обновляем данные entity
        entityData.position.copy(newPosition);
        if (newRadius !== null) {
            entityData.radius = newRadius;
        }
        entityData.cellKey = newCellKey;
    }

    removeEntity(entityId) {
        const entityData = this.entityToCell.get(entityId);
        if (entityData) {
            const cell = this.cells.get(entityData.cellKey);
            if (cell) {
                cell.delete(entityId);
                if (cell.size === 0) {
                    this.cells.delete(entityData.cellKey);
                    this.stats.totalCells--;
                }
            }
            this.entityToCell.delete(entityId);
            this.stats.totalEntities--;
        }
    }

    getCellKey(position) {
        const x = Math.floor(position.x / this.cellSize);
        const y = Math.floor(position.y / this.cellSize);
        const z = Math.floor(position.z / this.cellSize);
        return `${x},${y},${z}`;
    }

    getVisibleEntities(cameraPosition, zoom, frustum = null) {
        const visibleEntities = new Set();
        const viewDistance = this.calculateViewDistance(zoom);
        
        this.stats.checksPerFrame = 0;
        this.stats.visibleEntities = 0;

        // Получаем ячейки в пределах видимости
        const visibleCells = this.getVisibleCells(cameraPosition, viewDistance);
        
        // Проверяем entities в видимых ячейках
        visibleCells.forEach(cellKey => {
            const cellEntities = this.cells.get(cellKey);
            if (cellEntities) {
                cellEntities.forEach(entityId => {
                    this.stats.checksPerFrame++;
                    const entity = this.entityToCell.get(entityId);
                    if (entity && this.isEntityVisible(entity, cameraPosition, viewDistance, frustum)) {
                        visibleEntities.add(entityId);
                        this.stats.visibleEntities++;
                    }
                });
            }
        });

        return visibleEntities;
    }

    getVisibleCells(cameraPosition, viewDistance) {
        const visibleCells = new Set();
        const radiusInCells = Math.ceil(viewDistance / this.cellSize);
        
        const centerCell = this.getCellKey(cameraPosition);
        const [centerX, centerY, centerZ] = centerCell.split(',').map(Number);
        
        // Проходим по кубу ячеек вокруг камеры
        for (let x = centerX - radiusInCells; x <= centerX + radiusInCells; x++) {
            for (let y = centerY - radiusInCells; y <= centerY + radiusInCells; y++) {
                for (let z = centerZ - radiusInCells; z <= centerZ + radiusInCells; z++) {
                    visibleCells.add(`${x},${y},${z}`);
                }
            }
        }
        
        return visibleCells;
    }

    isEntityVisible(entity, cameraPosition, viewDistance, frustum = null) {
        const distance = entity.position.distanceTo(cameraPosition);
        
        // Проверка расстояния
        if (distance > viewDistance + entity.radius) {
            return false;
        }
        
        // Проверка frustum culling если доступен
        if (frustum) {
            const boundingSphere = new THREE.Sphere(entity.position, entity.radius);
            if (!frustum.intersectsSphere(boundingSphere)) {
                return false;
            }
        }
        
        return true;
    }

    calculateViewDistance(zoom) {
        // Базовое расстояние + адаптация под zoom
        const baseDistance = 1000;
        return baseDistance / Math.max(zoom, 0.1);
    }

    getEntitiesInRadius(center, radius) {
        const entitiesInRadius = new Set();
        const searchRadius = Math.ceil(radius / this.cellSize);
        
        const centerCell = this.getCellKey(center);
        const [centerX, centerY, centerZ] = centerCell.split(',').map(Number);
        
        for (let x = centerX - searchRadius; x <= centerX + searchRadius; x++) {
            for (let y = centerY - searchRadius; y <= centerY + searchRadius; y++) {
                for (let z = centerZ - searchRadius; z <= centerZ + searchRadius; z++) {
                    const cellKey = `${x},${y},${z}`;
                    const cellEntities = this.cells.get(cellKey);
                    if (cellEntities) {
                        cellEntities.forEach(entityId => {
                            const entity = this.entityToCell.get(entityId);
                            if (entity && entity.position.distanceTo(center) <= radius + entity.radius) {
                                entitiesInRadius.add(entityId);
                            }
                        });
                    }
                }
            }
        }
        
        return entitiesInRadius;
    }

    getNearestEntity(position, maxDistance = Infinity) {
        let nearestEntity = null;
        let nearestDistance = maxDistance;
        
        // Начинаем с ячейки позиции и расширяемся
        let searchRadius = 0;
        const maxSearchRadius = Math.ceil(maxDistance / this.cellSize);
        
        const centerCell = this.getCellKey(position);
        const [centerX, centerY, centerZ] = centerCell.split(',').map(Number);
        
        while (searchRadius <= maxSearchRadius && !nearestEntity) {
            for (let x = centerX - searchRadius; x <= centerX + searchRadius; x++) {
                for (let y = centerY - searchRadius; y <= centerY + searchRadius; y++) {
                    for (let z = centerZ - searchRadius; z <= centerZ + searchRadius; z++) {
                        // Проверяем только внешний слой
                        if (Math.max(Math.abs(x - centerX), Math.abs(y - centerY), Math.abs(z - centerZ)) === searchRadius) {
                            const cellKey = `${x},${y},${z}`;
                            const cellEntities = this.cells.get(cellKey);
                            if (cellEntities) {
                                cellEntities.forEach(entityId => {
                                    const entity = this.entityToCell.get(entityId);
                                    const distance = entity.position.distanceTo(position);
                                    if (distance < nearestDistance) {
                                        nearestDistance = distance;
                                        nearestEntity = entityId;
                                    }
                                });
                            }
                        }
                    }
                }
            }
            searchRadius++;
        }
        
        return nearestEntity ? { entityId: nearestEntity, distance: nearestDistance } : null;
    }

    // Методы для отладки и визуализации
    debugDraw(scene, cameraPosition, zoom) {
        this.clearDebugDraw(scene);
        
        const visibleCells = this.getVisibleCells(cameraPosition, this.calculateViewDistance(zoom));
        
        visibleCells.forEach(cellKey => {
            const [x, y, z] = cellKey.split(',').map(Number);
            const center = new THREE.Vector3(
                (x + 0.5) * this.cellSize,
                (y + 0.5) * this.cellSize, 
                (z + 0.5) * this.cellSize
            );
            
            const geometry = new THREE.BoxGeometry(this.cellSize, this.cellSize, this.cellSize);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.1
            });
            
            const cube = new THREE.Mesh(geometry, material);
            cube.position.copy(center);
            cube.userData = { isDebug: true, cellKey };
            
            scene.add(cube);
        });
    }

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

    getStats() {
        return {
            ...this.stats,
            efficiency: this.stats.totalEntities > 0 ? 
                (this.stats.visibleEntities / this.stats.totalEntities * 100).toFixed(1) + '%' : '0%'
        };
    }

    clear() {
        this.cells.clear();
        this.entityToCell.clear();
        this.stats.totalEntities = 0;
        this.stats.totalCells = 0;
        this.stats.visibleEntities = 0;
        this.stats.checksPerFrame = 0;
    }

    dispose() {
        this.clear();
        console.log('🧹 SpatialPartitioner уничтожен');
    }
}

export default SpatialPartitioner;