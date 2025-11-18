// modules/app/core/galaxy-renderer.js
import { ThreeSceneManager } from './three-scene-manager.js';
import { SpatialPartitioner } from './spatial-partitioner.js';
import { LODManager } from './lod-manager.js';
import { MemoryManager } from './memory-manager.js';
import * as THREE from 'three';

export class GalaxyRenderer {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }

        this.sceneManager = null;
        this.spatialPartitioner = new SpatialPartitioner();
        this.lodManager = new LODManager();
        this.memoryManager = new MemoryManager();
        
        this.entityMeshes = new Map();
        this.visibleEntities = new Set();
        this.animationState = {
            entranceComplete: false,
            currentOpacity: 0,
            animations: new Map()
        };
        
        this.renderConfig = {
            showOrbits: true,
            showLabels: true,
            showGrid: false,
            enableShadows: true,
            enablePostProcessing: true
        };

        this.stats = {
            totalMeshes: 0,
            renderedMeshes: 0,
            drawCalls: 0,
            frameTime: 0,
            fps: 0
        };

        this.lastFrameTime = performance.now();
        
        console.log('🎨 Three.js GalaxyRenderer создан');
    }

    async init() {
        try {
            console.log('🚀 Инициализация Three.js GalaxyRenderer...');
            
            // Инициализируем менеджер сцены
            this.sceneManager = new ThreeSceneManager(this.canvasId);
            await this.sceneManager.init(this.renderConfig.enableShadows, this.renderConfig.enablePostProcessing);
            
            // Инициализируем LOD менеджер
            await this.lodManager.preloadLODs();
            
            // Создаем фон и базовые элементы
            this.setupGalaxyScene();
            
            console.log('✅ Three.js GalaxyRenderer инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации Three.js GalaxyRenderer:', error);
            throw error;
        }
    }

    setupGalaxyScene() {
        // Создаем звездное поле
        this.createStarfieldBackground();
        
        // Создаем туманность
        this.createNebulaBackground();
        
        // Создаем орбитальные линии если нужно
        if (this.renderConfig.showOrbits) {
            this.createOrbitLines();
        }
        
        // Создаем координатную сетку если нужно
        if (this.renderConfig.showGrid) {
            this.createCoordinateGrid();
        }
    }

    createStarfieldBackground() {
        const starfield = this.sceneManager.createStarfieldBackground(5000);
        this.memoryManager.trackAllocation(starfield, 'starfield_background', 1024000, {
            type: 'Points',
            starCount: 5000
        });
    }

    createNebulaBackground() {
        const nebula = this.sceneManager.createNebulaBackground();
        this.memoryManager.trackAllocation(nebula, 'nebula_background', 512000, {
            type: 'Mesh',
            material: 'basic'
        });
    }

    createOrbitLines() {
        // Создаем контейнер для орбит
        this.orbitContainer = new THREE.Group();
        this.orbitContainer.name = 'orbits';
        this.sceneManager.scene.add(this.orbitContainer);
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

    render(galaxyData, camera) {
        if (!this.sceneManager || !galaxyData) {
            return;
        }

        const renderStartTime = performance.now();

        // Обновляем видимые объекты через spatial partitioning
        this.updateVisibleEntities(camera);

        // Обновляем LOD для видимых объектов
        this.updateLODs(camera);

        // Обновляем анимации
        this.updateAnimations();

        // Рендерим сцену
        this.sceneManager.render();

        // Обновляем статистику
        this.updateStats(renderStartTime);
    }

    updateVisibleEntities(camera) {
        if (!this.sceneManager?.camera) return;

        const cameraPosition = this.sceneManager.camera.position;
        this.visibleEntities = this.spatialPartitioner.getVisibleEntities(
            cameraPosition, 
            camera.zoom,
            this.getCameraFrustum()
        );

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

    updateLODs(camera) {
        const cameraPosition = this.sceneManager.camera.position;
        
        this.visibleEntities.forEach(entityId => {
            const mesh = this.entityMeshes.get(entityId);
            if (mesh) {
                const distance = mesh.position.distanceTo(cameraPosition);
                const lodLevel = this.lodManager.getLODLevel(entityId, distance, camera.zoom);
                this.lodManager.applyLOD(mesh, lodLevel, distance);
            }
        });
    }

    updateAnimations() {
        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;

        this.animationState.animations.forEach((animation, entityId) => {
            const mesh = this.entityMeshes.get(entityId);
            if (mesh) {
                this.applyAnimation(mesh, animation, deltaTime);
            }
        });
    }

    applyAnimation(mesh, animation, deltaTime) {
        switch (animation.type) {
            case 'rotation':
                mesh.rotation.x += animation.speedX * deltaTime;
                mesh.rotation.y += animation.speedY * deltaTime;
                mesh.rotation.z += animation.speedZ * deltaTime;
                break;
                
            case 'pulse':
                const scale = 1 + Math.sin(animation.phase) * animation.amplitude;
                mesh.scale.setScalar(scale);
                animation.phase += animation.speed * deltaTime;
                break;
                
            case 'orbit':
                // Анимация орбитального движения
                mesh.position.x = Math.cos(animation.phase) * animation.radius;
                mesh.position.y = Math.sin(animation.phase) * animation.radius;
                animation.phase += animation.speed * deltaTime;
                break;
        }
    }

    updateStats(renderStartTime) {
        this.stats.frameTime = performance.now() - renderStartTime;
        this.stats.fps = Math.round(1000 / this.stats.frameTime);
        
        const sceneStats = this.sceneManager.getStats();
        this.stats.drawCalls = sceneStats.drawCalls;
        this.stats.totalMeshes = this.entityMeshes.size;
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
            mesh: mesh
        });

        // Регистрируем в LOD менеджере
        this.lodManager.registerEntity(entityId, entityData.type, radius);

        // Добавляем анимацию
        this.addEntityAnimation(entityId, entityData.type);

        // Сохраняем меш
        this.entityMeshes.set(entityId, mesh);
        this.sceneManager.scene.add(mesh);

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
        const geometrySize = mesh.geometry.attributes.position.count * 12; // Примерный расчет
        const materialSize = 5000; // Примерный размер материала
        
        this.memoryManager.trackAllocation(mesh, `mesh_${entityType}`, geometrySize + materialSize, {
            type: entityType,
            vertices: mesh.geometry.attributes.position.count,
            hasMaterial: !!mesh.material
        });
    }

    // Методы управления рендерингом
    setOrbitDisplay(visible) {
        this.renderConfig.showOrbits = visible;
        
        if (this.orbitContainer) {
            this.orbitContainer.visible = visible;
        }
        
        console.log('🔄 Орбиты:', visible ? 'ВКЛ' : 'ВЫКЛ');
    }

    setLabelDisplay(visible) {
        this.renderConfig.showLabels = visible;
        // TODO: Реализовать отображение/скрытие меток
        console.log('🏷️ Метки:', visible ? 'ВКЛ' : 'ВЫКЛ');
    }

    setGridDisplay(visible) {
        this.renderConfig.showGrid = visible;
        // TODO: Реализовать отображение/скрытие сетки
        console.log('📐 Сетка:', visible ? 'ВКЛ' : 'ВЫКЛ');
    }

    // Анимация входа
    animateEntrance() {
        console.log('🎬 Запуск анимации входа Three.js');
        this.animationState.entranceComplete = false;
        this.animationState.currentOpacity = 0;

        // Анимация появления объектов
        this.entityMeshes.forEach((mesh, entityId) => {
            mesh.scale.set(0, 0, 0);
            this.animateMeshEntrance(mesh, Math.random() * 1000);
        });

        this.animationState.entranceComplete = true;
        console.log('✅ Анимация входа Three.js завершена');
    }

    animateMeshEntrance(mesh, delay) {
        setTimeout(() => {
            // Анимация масштабирования
            const targetScale = mesh.scale.clone();
            mesh.scale.set(0, 0, 0);
            
            // Используем Tween.js или аналогичную библиотеку для плавной анимации
            this.scaleMesh(mesh, targetScale, 1000);
        }, delay);
    }

    scaleMesh(mesh, targetScale, duration) {
        const startScale = mesh.scale.clone();
        const startTime = performance.now();
        
        const animate = () => {
            const currentTime = performance.now();
            const progress = Math.min((currentTime - startTime) / duration, 1);
            
            mesh.scale.lerpVectors(startScale, targetScale, progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    // Методы для отладки и информации
    getRendererInfo() {
        return {
            canvas: {
                width: this.canvas.width,
                height: this.canvas.height,
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
            renderConfig: this.renderConfig,
            stats: this.stats,
            memory: this.memoryManager.getMemoryStats()
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
            lod: this.lodManager.getLODStats()
        };
    }

    // Методы для взаимодействия
    getEntityAtScreenPoint(screenX, screenY, camera) {
        if (!this.sceneManager?.camera) return null;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        const rect = this.canvas.getBoundingClientRect();
        mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, this.sceneManager.camera);
        
        const intersectableObjects = Array.from(this.entityMeshes.values())
            .filter(mesh => mesh.userData.isSelectable);
        
        const intersects = raycaster.intersectObjects(intersectableObjects);
        
        return intersects.length > 0 ? intersects[0].object.userData : null;
    }

    highlightEntity(entityId, highlight = true) {
        const mesh = this.entityMeshes.get(entityId);
        if (mesh) {
            if (highlight) {
                // Сохраняем оригинальный материал
                mesh.userData.originalMaterial = mesh.material.clone();
                
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

    // Очистка ресурсов
    clearScene() {
        // Очищаем все меши
        this.entityMeshes.forEach((mesh, entityId) => {
            this.spatialPartitioner.removeEntity(entityId);
            this.sceneManager.removeObject(mesh);
            
            // Освобождаем геометрию и материалы
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
        
        console.log('🧹 Three.js сцена очищена');
    }

    // Деструктор
    dispose() {
        this.clearScene();
        
        if (this.sceneManager) {
            this.sceneManager.dispose();
        }
        
        this.lodManager.dispose();
        this.memoryManager.dispose();
        this.spatialPartitioner.dispose();
        
        console.log('🧹 Three.js GalaxyRenderer уничтожен');
    }
}

export default GalaxyRenderer;