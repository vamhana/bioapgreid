import { ThreeSceneManager2 } from './three-scene-manager_2.js';
import { SpatialPartitioner } from './spatial-partitioner.js';
import { LODManager } from './lod-manager.js';
import { MemoryManager } from './memory-manager.js';
import { AnimationSystem } from './animation-system.js'; // Новая система анимации
import * as THREE from './three.module.js';

export class GalaxyRenderer {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = this.resolveCanvas(canvasId); // Улучшенная обработка
        
        // Инициализация менеджеров
        this.sceneManager = new ThreeSceneManager2(canvasId);
        this.spatialPartitioner = new SpatialPartitioner();
        this.lodManager = new LODManager();
        this.memoryManager = new MemoryManager();
        this.animationSystem = new AnimationSystem(); // Новая система анимации
        
        // Коллекции объектов
        this.entityMeshes = new Map();
        this.visibleEntities = new Set();
        this.raycaster = new THREE.Raycaster(); // Кэшированный!
        this.mouse = new THREE.Vector2();
        
        // Состояние рендерера
        this.renderConfig = {
            showOrbits: true,
            showLabels: true,
            showGrid: false,
            enableShadows: true,
            enablePostProcessing: true,
            enableAnimations: true
        };

        this.animationState = {
            entranceComplete: false,
            animations: new Map()
        };

        this.stats = {
            totalMeshes: 0,
            renderedMeshes: 0,
            drawCalls: 0,
            frameTime: 0,
            fps: 0,
            memoryUsage: 0
        };

        this.lastFrameTime = performance.now();
        this.animationFrameId = null;
        
        console.log('🎨 GalaxyRenderer создан');
    }

    // Улучшенная обработка canvas с fallback
    resolveCanvas(canvasId) {
        if (typeof canvasId === 'string') {
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.warn('⚠️ Canvas не найден, создаем fallback');
                return this.createFallbackCanvas();
            }
            return canvas;
        }
        return canvasId;
    }

    createFallbackCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        canvas.style.border = '2px dashed #ff4444';
        canvas.style.background = '#1a1a2e';
        canvas.style.margin = '10px';
        canvas.title = 'Fallback Canvas - Galaxy Renderer';
        
        // Добавляем сообщение
        const message = document.createElement('div');
        message.textContent = '3D Galaxy Renderer (Fallback Mode)';
        message.style.cssText = `
            color: white;
            text-align: center;
            padding: 10px;
            font-family: Arial, sans-serif;
        `;
        
        const container = document.createElement('div');
        container.appendChild(message);
        container.appendChild(canvas);
        document.body.appendChild(container);
        
        return canvas;
    }

    async init() {
        try {
            console.log('🚀 Инициализация GalaxyRenderer...');
            
            // Инициализируем менеджер сцены с улучшенной обработкой
            this.sceneManager = new ThreeSceneManager(this.canvas);
            await this.sceneManager.init(
                this.renderConfig.enableShadows, 
                this.renderConfig.enablePostProcessing
            );
            
            // Инициализируем системы
            await this.lodManager.preloadLODs();
            await this.animationSystem.init(); // Инициализируем систему анимации
            
            // Создаем сцену галактики
            this.setupGalaxyScene();
            
            // Запускаем цикл рендеринга
            this.startRenderLoop();
            
            console.log('✅ GalaxyRenderer инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации GalaxyRenderer:', error);
            this.handleInitError(error);
            throw error;
        }
    }

    // Новая функция: обработка ошибок инициализации
    handleInitError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4444;
            color: white;
            padding: 20px;
            border-radius: 5px;
            z-index: 10000;
            text-align: center;
            max-width: 400px;
        `;
        errorDiv.innerHTML = `
            <h3>Ошибка 3D Рендерера</h3>
            <p>${error.message}</p>
            <p>Проверьте поддержку WebGL и консоль для деталей</p>
        `;
        document.body.appendChild(errorDiv);
    }

    // Новая функция: запуск цикла рендеринга
    startRenderLoop() {
        const animate = () => {
            this.animationFrameId = requestAnimationFrame(animate);
            
            // Обновляем анимации
            if (this.renderConfig.enableAnimations) {
                const deltaTime = this.calculateDeltaTime();
                this.animationSystem.update(deltaTime);
            }
            
            // Рендерим сцену
            if (this.sceneManager && this.sceneManager.initialized) {
                this.sceneManager.render();
                this.updateStats();
            }
        };
        
        animate();
    }

    calculateDeltaTime() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;
        return Math.min(deltaTime, 0.1); // Ограничиваем для стабильности
    }

    setupGalaxyScene() {
        // Создаем звездное поле с улучшенными настройками
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
        const starfield = this.sceneManager.createStarfieldBackground(5000, {
            radius: 1200,
            sizeRange: [0.3, 3.0],
            colorRange: [[0.7, 0.7, 1.0], [1.0, 0.8, 0.6]]
        });
        
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

    // Улучшенный метод рендеринга галактики
    renderGalaxy(galaxyData) {
        if (!this.sceneManager || !galaxyData) {
            console.warn('⚠️ Сцена или данные не готовы для рендеринга');
            return;
        }

        console.log('🌌 Рендеринг галактики...', {
            entities: galaxyData.stats?.total,
            has3DData: !!galaxyData.threeData
        });

        // Очищаем предыдущую сцену (сохраняя фоны)
        this.clearScene(true);

        // Создаем меши для всех сущностей
        this.createGalaxyMeshes(galaxyData);

        // Запускаем анимацию входа
        if (this.renderConfig.enableAnimations) {
            this.animateGalaxyEntrance();
        }

        console.log('✅ Галактика отрендерена', {
            meshes: this.entityMeshes.size,
            memory: this.memoryManager.getMemoryStats().formattedAllocated
        });
    }

    createGalaxyMeshes(galaxyData) {
        if (!galaxyData.threeData) {
            console.warn('⚠️ Нет 3D данных для рендеринга');
            return;
        }

        // Рекурсивно создаем меши для всей иерархии
        this.createEntityMeshesRecursive(galaxyData);
        
        // Обновляем статистику
        this.stats.totalMeshes = this.entityMeshes.size;
    }

    createEntityMeshesRecursive(entity, depth = 0) {
        // Защита от бесконечной рекурсии
        if (depth > 10) {
            console.warn('⚠️ Превышена глубина создания мешей');
            return;
        }

        // Создаем меш для текущей сущности
        if (entity.position3D && entity.cleanPath) {
            this.createEntityMesh(entity, entity.position3D.absolute);
        }

        // Рекурсивно обрабатываем детей
        if (entity.children && entity.children.length > 0) {
            entity.children.forEach(child => {
                this.createEntityMeshesRecursive(child, depth + 1);
            });
        }
    }

    // Улучшенный метод создания меша сущности
    createEntityMesh(entityData, position) {
        const entityId = entityData.cleanPath || entityData.name;
        
        // Проверяем, не существует ли уже меш для этой entity
        if (this.entityMeshes.has(entityId)) {
            console.log('♻️ Используем существующий меш для:', entityId);
            return this.entityMeshes.get(entityId);
        }

        let mesh;
        
        try {
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
            this.setupMeshProperties(mesh, entityData, position, entityId);

            // Добавляем в системы управления
            this.registerEntityInSystems(entityId, mesh, entityData);

            // Сохраняем меш
            this.entityMeshes.set(entityId, mesh);
            this.sceneManager.scene.add(mesh);

            // Трекаем использование памяти
            this.trackMeshMemory(mesh, entityData.type);

            return mesh;

        } catch (error) {
            console.error(`❌ Ошибка создания меша для ${entityId}:`, error);
            return this.createFallbackMesh(entityData, position, entityId);
        }
    }

    setupMeshProperties(mesh, entityData, position, entityId) {
        mesh.position.set(position.x, position.y, position.z || 0);
        
        // Устанавливаем вращение если есть
        if (entityData.rotation3D) {
            mesh.rotation.set(
                entityData.rotation3D.x,
                entityData.rotation3D.y, 
                entityData.rotation3D.z
            );
        }
        
        mesh.userData = {
            entityId: entityId,
            type: entityData.type,
            entityData: entityData,
            isSelectable: true,
            createdAt: Date.now()
        };

        // Настраиваем тени если включены
        if (this.renderConfig.enableShadows) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
    }

    registerEntityInSystems(entityId, mesh, entityData) {
        // Добавляем в spatial partitioner
        const radius = this.calculateMeshRadius(mesh);
        this.spatialPartitioner.addEntity(entityId, mesh.position, radius, {
            type: entityData.type,
            mesh: mesh
        });

        // Регистрируем в LOD менеджере
        this.lodManager.registerEntity(entityId, entityData.type, radius);

        // Добавляем анимацию через новую систему
        if (this.renderConfig.enableAnimations) {
            this.animationSystem.addEntityAnimation(entityId, mesh, entityData.type);
        }
    }

    // Улучшенное создание мешей с использованием пула материалов
    createStarMesh(entityData, position) {
        const radius = 40;
        
        // Используем пул материалов из sceneManager
        const material = this.sceneManager.getMaterial('basic', 
            entityData.config?.color || '#FFD700', 
            {
                emissive: new THREE.Color(entityData.config?.color || '#FFD700'),
                emissiveIntensity: 0.8
            }
        );

        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const mesh = new THREE.Mesh(geometry, material);
        
        // Добавляем свечение через систему частиц
        this.addStarGlowEffect(mesh, radius);
        
        return mesh;
    }

    createPlanetMesh(entityData, position) {
        const radius = 25;
        const material = this.sceneManager.getMaterial('standard', 
            entityData.config?.color || '#4ECDC4',
            {
                shininess: 30,
                specular: new THREE.Color(0x222222)
            }
        );

        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const mesh = new THREE.Mesh(geometry, material);
        
        // Добавляем атмосферу если есть
        if (entityData.config?.hasAtmosphere) {
            this.addAtmosphereEffect(mesh, radius);
        }
        
        return mesh;
    }

    createMoonMesh(entityData, position) {
        const radius = 8;
        const material = this.sceneManager.getMaterial('standard',
            entityData.config?.color || '#CCCCCC'
        );

        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        return new THREE.Mesh(geometry, material);
    }

    createAsteroidMesh(entityData, position) {
        const radius = 4;
        
        // Используем случайную форму для астероидов
        const geometry = new THREE.DodecahedronGeometry(radius, 0);
        const material = this.sceneManager.getMaterial('basic',
            entityData.config?.color || '#888888'
        );

        return new THREE.Mesh(geometry, material);
    }

    createDefaultMesh(entityData, position) {
        const radius = 10;
        const material = this.sceneManager.getMaterial('basic',
            entityData.config?.color || '#FFFFFF'
        );

        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        return new THREE.Mesh(geometry, material);
    }

    // Fallback меш при ошибках
    createFallbackMesh(entityData, position, entityId) {
        console.warn(`⚠️ Создаем fallback меш для ${entityId}`);
        
        const radius = 5;
        const geometry = new THREE.SphereGeometry(radius, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            wireframe: true 
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, position.z || 0);
        mesh.userData = {
            entityId: entityId,
            type: 'fallback',
            isSelectable: false,
            isFallback: true
        };

        return mesh;
    }

    addStarGlowEffect(starMesh, radius) {
        const glowGeometry = new THREE.SphereGeometry(radius * 1.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(starMesh.material.emissive),
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        starMesh.add(glowMesh);
        
        // Анимация пульсации
        this.animationSystem.addPulseAnimation(starMesh.uuid, glowMesh, {
            minScale: 1.0,
            maxScale: 1.3,
            speed: 2.0
        });
    }

    addAtmosphereEffect(planetMesh, radius) {
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
        const box = new THREE.Box3().setFromObject(mesh);
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        return sphere.radius;
    }

    trackMeshMemory(mesh, entityType) {
        const geometrySize = mesh.geometry.attributes.position.count * 12;
        const materialSize = 5000;
        const totalSize = geometrySize + materialSize;
        
        this.memoryManager.trackAllocation(mesh, `mesh_${entityType}`, totalSize, {
            type: entityType,
            vertices: mesh.geometry.attributes.position.count,
            hasMaterial: !!mesh.material
        });
        
        this.stats.memoryUsage += totalSize;
    }

    // Улучшенная анимация входа через новую систему
    animateGalaxyEntrance() {
        console.log('🎬 Запуск анимации входа галактики');
        
        this.animationState.entranceComplete = false;
        
        // Используем новую систему анимации
        this.animationSystem.animateGalaxyEntrance(this.entityMeshes);
        
        this.animationState.entranceComplete = true;
        console.log('✅ Анимация входа запущена');
    }

    // Улучшенный метод для Raycaster (кэшированный)
    getEntityAtScreenPoint(screenX, screenY) {
        if (!this.sceneManager?.camera) {
            console.warn('⚠️ Камера не готова для Raycaster');
            return null;
        }

        try {
            // Обновляем позицию мыши для кэшированного Raycaster
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;
            
            // Обновляем Raycaster
            this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
            
            // Получаем пересекаемые объекты
            const intersectableObjects = Array.from(this.entityMeshes.values())
                .filter(mesh => mesh.userData.isSelectable);
            
            const intersects = this.raycaster.intersectObjects(intersectableObjects);
            
            return intersects.length > 0 ? intersects[0].object.userData : null;
            
        } catch (error) {
            console.error('❌ Ошибка в Raycaster:', error);
            return null;
        }
    }

    // Улучшенное выделение сущности
    highlightEntity(entityId, highlight = true) {
        const mesh = this.entityMeshes.get(entityId);
        if (!mesh) {
            console.warn(`⚠️ Меш для выделения не найден: ${entityId}`);
            return;
        }

        try {
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
                    // Не удаляем originalMaterial, так как может понадобиться снова
                }
            }
        } catch (error) {
            console.error('❌ Ошибка выделения сущности:', error);
        }
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

    setAnimationEnabled(enabled) {
        this.renderConfig.enableAnimations = enabled;
        console.log('🎬 Анимации:', enabled ? 'ВКЛ' : 'ВЫКЛ');
    }

    // Обновление статистики
    updateStats() {
        const currentTime = performance.now();
        this.stats.frameTime = currentTime - this.lastFrameTime;
        this.stats.fps = Math.round(1000 / Math.max(this.stats.frameTime, 1));
        this.lastFrameTime = currentTime;
        
        if (this.sceneManager) {
            const sceneStats = this.sceneManager.getStats();
            this.stats.drawCalls = sceneStats.drawCalls;
            this.stats.renderedMeshes = this.visibleEntities.size;
        }
    }

    // Информация о рендерере
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
            memory: this.memoryManager.getMemoryStats(),
            animation: this.animationSystem.getStats()
        };
    }

    getPerformanceInfo() {
        return {
            fps: this.stats.fps,
            frameTime: this.stats.frameTime.toFixed(2) + 'ms',
            drawCalls: this.stats.drawCalls,
            renderedMeshes: this.stats.renderedMeshes,
            totalMeshes: this.stats.totalMeshes,
            memory: this.memoryManager.formatBytes(this.stats.memoryUsage),
            spatialPartitioning: this.spatialPartitioner.getStats(),
            lod: this.lodManager.getLODStats()
        };
    }

    // Улучшенная очистка сцены
    clearScene(preserveBackgrounds = true) {
        console.log('🧹 Очистка сцены рендерера...');
        
        // Останавливаем анимации
        this.animationSystem.stopAllAnimations();
        
        // Очищаем все меши
        this.entityMeshes.forEach((mesh, entityId) => {
            this.spatialPartitioner.removeEntity(entityId);
            this.lodManager.unregisterEntity(entityId);
            this.sceneManager.removeObject(mesh);
        });
        
        this.entityMeshes.clear();
        this.visibleEntities.clear();
        
        // Очищаем сцену (сохраняя фоны если нужно)
        this.sceneManager.clearScene(preserveBackgrounds);
        
        console.log('✅ Сцена очищена', { 
            preservedBackgrounds: preserveBackgrounds 
        });
    }

    // Улучшенный деструктор
    dispose() {
        console.log('🧹 Уничтожение GalaxyRenderer...');
        
        // Останавливаем цикл рендеринга
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Очищаем сцену полностью
        this.clearScene(false);
        
        // Уничтожаем системы
        if (this.sceneManager) {
            this.sceneManager.dispose();
        }
        
        this.lodManager.dispose();
        this.memoryManager.dispose();
        this.spatialPartitioner.dispose();
        this.animationSystem.dispose();
        
        // Очищаем коллекции
        this.entityMeshes.clear();
        this.visibleEntities.clear();
        this.animationState.animations.clear();
        
        console.log('✅ GalaxyRenderer уничтожен');
    }
}


export default GalaxyRenderer;
