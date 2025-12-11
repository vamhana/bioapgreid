
// modules/app/core/galaxy-renderer.js
import { ThreeSceneManager } from './three-scene-manager.js';
import { SpatialPartitioner } from './spatial-partitioner.js';
import { LODManager } from './lod-manager.js';
import { MemoryManager } from './memory-manager.js';
import * as THREE from './three.module.js';

export class GalaxyRenderer {
    constructor(canvasId, config = {}) {
        this.canvasId = canvasId;
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }

        // Конфигурация
        this.config = {
            showOrbits: true,
            showLabels: false,
            showGrid: false,
            enableShadows: true,
            enablePostProcessing: true,
            ...config
        };
        
        // Менеджеры
        this.sceneManager = null;
        this.spatialPartitioner = new SpatialPartitioner();
        this.lodManager = new LODManager();
        this.memoryManager = new MemoryManager();
        
        // Коллекции объектов
        this.entityMeshes = new Map();
        this.visibleEntities = new Set();
        
        // Состояние анимаций
        this.animationState = {
            entranceComplete: false,
            currentOpacity: 0,
            animations: new Map()
        };
        
        // Статистика
        this.stats = {
            totalMeshes: 0,
            renderedMeshes: 0,
            drawCalls: 0,
            frameTime: 0,
            fps: 60,
            lastFrameTime: performance.now()
        };

        // Состояние рендеринга
        this.renderLoopId = null;
        this.isRendering = false;
        
        console.log('🎨 GalaxyRenderer создан');
    }

    async init() {
        try {
            console.log('🚀 Инициализация GalaxyRenderer...');
            
            // Инициализируем менеджер сцены
            this.sceneManager = new ThreeSceneManager(this.canvasId);
            await this.sceneManager.init({
                enableShadows: this.config.enableShadows,
                enablePostProcessing: this.config.enablePostProcessing
            });
            
            // Создаем базовые элементы сцены
            await this.setupGalaxyScene();
            
            // Запускаем мониторинг памяти
            this.memoryManager.startMonitoring();
            
            console.log('✅ GalaxyRenderer инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации GalaxyRenderer:', error);
            throw error;
        }
    }

    async setupGalaxyScene() {
        // Ждем создания звездного поля через ThreeSceneManager
        // Он создает его автоматически при инициализации
        
        // Создаем контейнер для орбит если нужно
        if (this.config.showOrbits) {
            this.createOrbitLines();
        }
        
        // Создаем координатную сетку если нужно
        if (this.config.showGrid) {
            this.createCoordinateGrid();
        }
        
        console.log('🌌 Сцена Galaxy настроена');
    }

    createOrbitLines() {
        // Создаем контейнер для орбит
        this.orbitContainer = new THREE.Group();
        this.orbitContainer.name = 'orbits';
        this.sceneManager.scene.add(this.orbitContainer);
        
        this.memoryManager.trackAllocation(this.orbitContainer, 'orbit_container', 1024, {
            type: 'Group',
            childCount: 0
        });
    }

    createCoordinateGrid() {
        const gridHelper = new THREE.GridHelper(2000, 20, 0x444444, 0x222222);
        gridHelper.position.y = -500;
        this.sceneManager.scene.add(gridHelper);
        
        this.memoryManager.trackAllocation(gridHelper, 'coordinate_grid', 50000, {
            type: 'GridHelper',
            size: 2000,
            divisions: 20
        });
    }

    // Метод для вызова из основного цикла приложения
    render(galaxyData, camera) {
        if (!this.sceneManager || !galaxyData) {
            return;
        }

        const frameStartTime = performance.now();
        
        // Обновляем анимации
        this.updateAnimations(frameStartTime);
        
        // Обновляем видимые объекты если камера существует
        if (this.sceneManager?.camera) {
            this.updateVisibleEntities();
            this.updateLODs();
        }
        
        // Обновляем статистику
        this.updateStats(frameStartTime);
    }

    startRendering() {
        if (this.isRendering) return;
        
        this.isRendering = true;
        const renderLoop = () => {
            if (!this.isRendering) return;
            
            const frameStartTime = performance.now();
            
            // Обновляем анимации
            this.updateAnimations(frameStartTime);
            
            // Обновляем видимые объекты если камера существует
            if (this.sceneManager?.camera) {
                this.updateVisibleEntities();
                this.updateLODs();
            }
            
            // Обновляем статистику
            this.updateStats(frameStartTime);
            
            // Запускаем следующий кадр
            this.renderLoopId = requestAnimationFrame(renderLoop);
        };
        
        renderLoop();
        console.log('🎬 Рендеринг запущен');
    }

    stopRendering() {
        this.isRendering = false;
        if (this.renderLoopId) {
            cancelAnimationFrame(this.renderLoopId);
            this.renderLoopId = null;
        }
        console.log('⏸️ Рендеринг остановлен');
    }

    updateVisibleEntities() {
        if (!this.sceneManager?.camera) return;
        
        const cameraPosition = this.sceneManager.camera.position;
        const zoom = 1; // Базовое значение
        
        // Получаем видимые объекты через spatial partitioner
        const visibleObjects = this.spatialPartitioner.getVisibleEntities(
            cameraPosition, 
            zoom,
            this.getCameraFrustum()
        );
        
        this.visibleEntities.clear();
        visibleObjects.forEach((obj, entityId) => {
            this.visibleEntities.add(entityId);
        });
        
        this.stats.renderedMeshes = this.visibleEntities.size;
    }

    getCameraFrustum() {
        if (!this.sceneManager?.camera) return null;
        
        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4().multiplyMatrices(
            this.sceneManager.camera.projectionMatrix,
            this.sceneManager.camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(matrix);
        
        return frustum;
    }

    updateLODs() {
        if (!this.sceneManager?.camera) return;
        
        const cameraPosition = this.sceneManager.camera.position;
        
        this.visibleEntities.forEach(entityId => {
            const mesh = this.entityMeshes.get(entityId);
            if (mesh) {
                const distance = mesh.position.distanceTo(cameraPosition);
                // Используем базовое значение zoom
                const lodLevel = this.lodManager.getLODLevel(entityId, distance, 1);
                this.lodManager.applyLOD(mesh, lodLevel, distance);
            }
        });
    }

    updateAnimations(frameStartTime) {
        const deltaTime = (frameStartTime - this.stats.lastFrameTime) / 1000;
        this.stats.lastFrameTime = frameStartTime;

        this.animationState.animations.forEach((animation, entityId) => {
            const mesh = this.entityMeshes.get(entityId);
            if (mesh) {
                this.applyAnimation(mesh, animation, deltaTime);
            }
        });
    }

    applyAnimation(mesh, animation, deltaTime) {
        if (!animation || !mesh) return;
        
        switch (animation.type) {
            case 'rotation':
                if (animation.speedX) mesh.rotation.x += animation.speedX * deltaTime;
                if (animation.speedY) mesh.rotation.y += animation.speedY * deltaTime;
                if (animation.speedZ) mesh.rotation.z += animation.speedZ * deltaTime;
                break;
                
            case 'pulse':
                const scale = 1 + Math.sin(animation.phase) * (animation.amplitude || 0.1);
                mesh.scale.setScalar(scale);
                animation.phase += (animation.speed || 2) * deltaTime;
                break;
                
            case 'orbit':
                if (animation.radius && animation.phase !== undefined) {
                    mesh.position.x = Math.cos(animation.phase) * animation.radius;
                    mesh.position.y = Math.sin(animation.phase) * animation.radius;
                    animation.phase += (animation.speed || 0.5) * deltaTime;
                }
                break;
        }
    }

    updateStats(frameStartTime) {
        const currentTime = performance.now();
        this.stats.frameTime = currentTime - frameStartTime;
        
        // Расчет FPS
        if (this.stats.frameTime > 0) {
            this.stats.fps = Math.round(1000 / this.stats.frameTime);
        }
        
        // Обновляем статистику сцены если доступна
        if (this.sceneManager) {
            const sceneStats = this.sceneManager.getStats();
            this.stats.drawCalls = sceneStats.performance?.drawCalls || 0;
            this.stats.totalMeshes = this.entityMeshes.size;
        }
    }

    // Методы для создания мешей объектов
    createEntityMesh(entityData, position) {
        const entityId = entityData.cleanPath || entityData.name;
        
        // Проверяем, не существует ли уже меш для этой entity
        if (this.entityMeshes.has(entityId)) {
            return this.entityMeshes.get(entityId);
        }

        let mesh;
        
        switch (entityData.type) {
            case 'star':
                mesh = this.createStarMesh(entityData, position);
                break;
            case 'planet':
                mesh = this.createPlanetMesh(entityData, position);
                break;
            case 'moon':
                mesh = this.createMoonMesh(entityData, position);
                break;
            case 'asteroid':
                mesh = this.createAsteroidMesh(entityData, position);
                break;
            default:
                mesh = this.createDefaultMesh(entityData, position);
        }

        // Настраиваем общие свойства
        mesh.position.set(position.x, position.y, position.z || 0);
        mesh.userData = {
            entityId: entityId,
            type: entityData.type,
            entityData: entityData,
            isSelectable: true
        };

        // Добавляем в spatial partitioner
        const radius = this.calculateMeshRadius(mesh);
        this.spatialPartitioner.addEntity(entityId, mesh.position, radius, {
            type: entityData.type,
            mesh: mesh,
            objectType: entityData.type === 'star' ? 'static' : 'dynamic'
        });

        // Регистрируем в LOD менеджере
        if (this.lodManager.registerEntity) {
            this.lodManager.registerEntity(entityId, entityData.type, radius);
        }

        // Добавляем анимацию
        this.addEntityAnimation(entityId, entityData.type);

        // Сохраняем меш
        this.entityMeshes.set(entityId, mesh);
        
        // Добавляем в сцену через scene manager
        this.sceneManager.addObject(mesh, entityData.type + 's');

        // Трекаем использование памяти
        this.trackMeshMemory(mesh, entityData.type);

        return mesh;
    }

    createStarMesh(entityData, position) {
        const radius = 40;
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(entityData.config?.color || '#FFD700'),
            emissive: new THREE.Color(entityData.config?.color || '#FFD700'),
            emissiveIntensity: 0.8
        });

        const mesh = new THREE.Mesh(geometry, material);
        
        // Добавляем свечение
        this.addStarGlow(mesh, radius);
        
        return mesh;
    }

    createPlanetMesh(entityData, position) {
        const radius = 25;
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(entityData.config?.color || '#4ECDC4'),
            shininess: 30,
            specular: new THREE.Color(0x222222)
        });

        const mesh = new THREE.Mesh(geometry, material);
        
        // Добавляем атмосферу если есть
        if (entityData.config?.hasAtmosphere) {
            this.addAtmosphere(mesh, radius);
        }
        
        return mesh;
    }

    createMoonMesh(entityData, position) {
        const radius = 8;
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        
        const material = new THREE.MeshLambertMaterial({
            color: new THREE.Color(entityData.config?.color || '#CCCCCC')
        });

        return new THREE.Mesh(geometry, material);
    }

    createAsteroidMesh(entityData, position) {
        const radius = 4;
        
        // Используем случайную форму для астероидов
        const geometry = new THREE.DodecahedronGeometry(radius, 0);
        
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(entityData.config?.color || '#888888'),
            wireframe: false
        });

        return new THREE.Mesh(geometry, material);
    }

    createDefaultMesh(entityData, position) {
        const radius = 10;
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(entityData.config?.color || '#FFFFFF')
        });

        return new THREE.Mesh(geometry, material);
    }

    addStarGlow(starMesh, radius) {
        const glowGeometry = new THREE.SphereGeometry(radius * 1.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(starMesh.material.emissive),
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        starMesh.add(glowMesh);
        
        this.memoryManager.trackAllocation(glowMesh, 'star_glow', 5000, {
            type: 'Mesh',
            parentType: 'star'
        });
    }

    addAtmosphere(planetMesh, radius) {
        const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.1, 32, 32);
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x87CEEB),
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        
        const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        planetMesh.add(atmosphereMesh);
        
        this.memoryManager.trackAllocation(atmosphereMesh, 'planet_atmosphere', 10000, {
            type: 'Mesh',
            parentType: 'planet'
        });
    }

    calculateMeshRadius(mesh) {
        // Вычисляем ограничивающую сферу меша
        const box = new THREE.Box3().setFromObject(mesh);
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        
        return sphere.radius;
    }

    addEntityAnimation(entityId, entityType) {
        const animationConfig = {
            star: { type: 'pulse', amplitude: 0.1, speed: 2, phase: Math.random() * Math.PI * 2 },
            planet: { type: 'rotation', speedX: 0, speedY: 0.5, speedZ: 0 },
            moon: { type: 'rotation', speedX: 0, speedY: 1, speedZ: 0 },
            asteroid: { type: 'rotation', speedX: 0.3, speedY: 0.7, speedZ: 0.2 },
            default: { type: 'rotation', speedX: 0, speedY: 0.2, speedZ: 0 }
        };

        const config = animationConfig[entityType] || animationConfig.default;
        this.animationState.animations.set(entityId, config);
    }

    trackMeshMemory(mesh, entityType) {
        try {
            // Расчет размера геометрии
            let geometrySize = 1024; // Минимальный размер
            
            if (mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.position) {
                const vertexCount = mesh.geometry.attributes.position.count;
                geometrySize = vertexCount * 12; // Примерный расчет (3 floats * 4 bytes)
            }
            
            // Расчет размера материала
            const materialSize = 5000; // Примерный размер материала
            
            const totalSize = geometrySize + materialSize;
            
            this.memoryManager.trackAllocation(mesh, `mesh_${entityType}`, totalSize, {
                type: entityType,
                vertices: mesh.geometry?.attributes?.position?.count || 0,
                hasMaterial: !!mesh.material
            });
        } catch (error) {
            console.warn('⚠️ Ошибка трекинга памяти меша:', error);
            // Минимальное трекинг на случай ошибки
            this.memoryManager.trackAllocation(mesh, `mesh_${entityType}`, 1024, {
                type: entityType,
                error: error.message
            });
        }
    }

    // Методы управления рендерингом
    setOrbitDisplay(visible) {
        this.config.showOrbits = visible;
        
        if (this.orbitContainer) {
            this.orbitContainer.visible = visible;
        } else if (visible) {
            this.createOrbitLines();
        }
        
        console.log('🔄 Орбиты:', visible ? 'ВКЛ' : 'ВЫКЛ');
    }

    setLabelDisplay(visible) {
        this.config.showLabels = visible;
        console.log('🏷️ Метки:', visible ? 'ВКЛ' : 'ВЫКЛ');
        // TODO: Реализовать отображение/скрытие меток
    }

    setGridDisplay(visible) {
        this.config.showGrid = visible;
        console.log('📐 Сетка:', visible ? 'ВКЛ' : 'ВЫКЛ');
        // TODO: Реализовать отображение/скрытие сетки
    }

    // Анимация входа
    animateEntrance() {
        console.log('🎬 Запуск анимации входа');
        this.animationState.entranceComplete = false;
        this.animationState.currentOpacity = 0;

        // Анимация появления объектов
        this.entityMeshes.forEach((mesh, entityId) => {
            const originalScale = mesh.scale.clone();
            mesh.scale.set(0, 0, 0);
            this.animateMeshEntrance(mesh, originalScale, Math.random() * 1000);
        });

        this.animationState.entranceComplete = true;
        console.log('✅ Анимация входа завершена');
    }

    animateMeshEntrance(mesh, targetScale, delay) {
        setTimeout(() => {
            const startTime = performance.now();
            const duration = 1000;
            const startScale = mesh.scale.clone();
            
            const animate = () => {
                const currentTime = performance.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Плавная анимация с easing
                const easedProgress = this.easeOutCubic(progress);
                mesh.scale.lerpVectors(startScale, targetScale, easedProgress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            animate();
        }, delay);
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // Методы для отладки и информации
    getRendererInfo() {
        return {
            canvas: {
                width: this.canvas?.width || 0,
                height: this.canvas?.height || 0,
                pixelRatio: this.sceneManager?.renderer?.getPixelRatio() || 1
            },
            scene: {
                objects: this.sceneManager?.scene?.children.length || 0,
                hasOrbits: !!this.orbitContainer
            },
            entities: {
                total: this.entityMeshes.size,
                visible: this.visibleEntities.size
            },
            config: this.config,
            stats: this.stats,
            memory: this.memoryManager ? this.memoryManager.getMemoryStats() : null
        };
    }

    getPerformanceInfo() {
        return {
            fps: this.stats.fps,
            frameTime: this.stats.frameTime.toFixed(2) + 'ms',
            drawCalls: this.stats.drawCalls,
            renderedMeshes: this.stats.renderedMeshes,
            totalMeshes: this.stats.totalMeshes,
            spatialPartitioning: this.spatialPartitioner.getStats(),
            lod: this.lodManager ? this.lodManager.getLODStats() : null,
            memory: this.memoryManager ? this.memoryManager.getMemoryStats() : null
        };
    }

    // Методы для взаимодействия
    getEntityAtScreenPoint(screenX, screenY) {
        if (!this.sceneManager?.camera || !this.canvas) return null;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        const rect = this.canvas.getBoundingClientRect();
        mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, this.sceneManager.camera);
        
        const intersectableObjects = Array.from(this.entityMeshes.values())
            .filter(mesh => mesh.userData.isSelectable);
        
        const intersects = raycaster.intersectObjects(intersectableObjects, true);
        
        return intersects.length > 0 ? intersects[0].object.userData : null;
    }

    highlightEntity(entityId, highlight = true) {
        const mesh = this.entityMeshes.get(entityId);
        if (mesh) {
            if (highlight) {
                // Сохраняем оригинальный материал
                if (!mesh.userData.originalMaterial) {
                    mesh.userData.originalMaterial = mesh.material;
                }
                
                // Создаем подсвеченный материал
                const highlightMaterial = mesh.material.clone();
                highlightMaterial.emissive = new THREE.Color(0xffff00);
                highlightMaterial.emissiveIntensity = 0.5;
                
                mesh.material = highlightMaterial;
            } else {
                // Восстанавливаем оригинальный материал
                if (mesh.userData.originalMaterial) {
                    mesh.material = mesh.userData.originalMaterial;
                    mesh.userData.originalMaterial = null;
                }
            }
        }
    }

    updateEntityPosition(entityId, newPosition) {
        const mesh = this.entityMeshes.get(entityId);
        if (mesh) {
            mesh.position.set(newPosition.x, newPosition.y, newPosition.z || 0);
            
            // Обновляем в spatial partitioner
            const radius = this.calculateMeshRadius(mesh);
            this.spatialPartitioner.updateEntity(entityId, mesh.position, radius);
            
            return true;
        }
        return false;
    }

    resize() {
        // ThreeSceneManager сам обрабатывает resize
        if (this.sceneManager && this.sceneManager.handleResize) {
            this.sceneManager.handleResize();
        }
        console.log('🔄 Размер GalaxyRenderer обновлен');
    }

    // Очистка ресурсов
    clearScene() {
        // Удаляем все меши из spatial partitioner
        this.entityMeshes.forEach((mesh, entityId) => {
            this.spatialPartitioner.removeEntity(entityId);
        });
        
        // Очищаем группы объектов через scene manager
        if (this.sceneManager) {
            if (this.sceneManager.clearGroup) {
                this.sceneManager.clearGroup('planets');
                this.sceneManager.clearGroup('moons');
                this.sceneManager.clearGroup('asteroids');
                this.sceneManager.clearGroup('stars');
            }
        }
        
        // Освобождаем ресурсы мешей
        this.entityMeshes.forEach((mesh) => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        
        this.entityMeshes.clear();
        this.visibleEntities.clear();
        this.animationState.animations.clear();
        
        console.log('🧹 Сцена GalaxyRenderer очищена');
    }

    // Деструктор
    dispose() {
        this.stopRendering();
        this.clearScene();
        
        if (this.sceneManager) {
            this.sceneManager.dispose();
            this.sceneManager = null;
        }
        
        if (this.lodManager && this.lodManager.dispose) {
            this.lodManager.dispose();
        }
        
        if (this.memoryManager) {
            this.memoryManager.dispose();
        }
        
        if (this.spatialPartitioner) {
            this.spatialPartitioner.dispose();
        }
        
        console.log('🧹 GalaxyRenderer уничтожен');
    }
}

export default GalaxyRenderer;
