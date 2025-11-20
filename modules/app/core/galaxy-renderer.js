[file name]: galaxy-renderer-enhanced.js
[file content begin]
import { ThreeSceneManager2 } from './three-scene-manager_2.js';
import { SpatialPartitioner } from './spatial-partitioner.js';
import { LODManager } from './lod-manager.js';
import { MemoryManager } from './memory-manager.js';
import { AnimationSystem } from './animation-system.js';
import { ObjectPool } from './object-pool.js'; // Новый модуль для пулинга
import * as THREE from './three.module.js';

export class GalaxyRenderer {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = this.resolveCanvas(canvasId);
        
        // Инициализация менеджеров с улучшенной конфигурацией
        this.sceneManager = new ThreeSceneManager2(canvasId);
        this.spatialPartitioner = new SpatialPartitioner({
            gridSize: 500,
            dynamicUpdate: true
        });
        this.lodManager = new LODManager({
            distanceThresholds: [100, 300, 800],
            autoUpdate: true
        });
        this.memoryManager = new MemoryManager({
            maxMemoryMB: 512,
            autoCleanup: true
        });
        this.animationSystem = new AnimationSystem();
        this.objectPool = new ObjectPool(); // Новый пул объектов
        
        // Коллекции объектов с улучшенной структурой
        this.entityMeshes = new Map();
        this.visibleEntities = new Set();
        this.instancedMeshes = new Map(); // Для батчинга
        this.materialCache = new Map(); // Кэш материалов
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.raycasterThrottle = null;
        
        // Расширенная конфигурация рендерера
        this.renderConfig = {
            // Визуальные настройки
            showOrbits: true,
            showLabels: true,
            showGrid: false,
            enableShadows: true,
            enablePostProcessing: true,
            enableAnimations: true,
            
            // Настройки производительности
            useInstancing: true,
            useObjectPooling: true,
            maxFrameTime: 16, // 60 FPS target
            progressiveLoading: true,
            batchSimilarObjects: true,
            
            // Качество графики
            textureQuality: 'medium',
            shadowQuality: 'medium',
            antiAliasing: true
        };

        this.animationState = {
            entranceComplete: false,
            animations: new Map(),
            isAnimating: false
        };

        // Расширенная статистика
        this.stats = {
            totalMeshes: 0,
            renderedMeshes: 0,
            drawCalls: 0,
            frameTime: 0,
            fps: 0,
            memoryUsage: 0,
            instancedCount: 0,
            pooledObjects: 0,
            triangles: 0
        };

        this.performance = {
            lastFrameTime: performance.now(),
            frameTimes: [],
            averageFPS: 0,
            lowFPSWarnings: 0
        };

        this.animationFrameId = null;
        this.isInitialized = false;
        
        console.log('🎨 GalaxyRenderer создан с улучшениями');
    }

    // Улучшенная обработка canvas с поддержкой WebGL2
    resolveCanvas(canvasId) {
        if (typeof canvasId === 'string') {
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.warn('⚠️ Canvas не найден, создаем fallback');
                return this.createFallbackCanvas();
            }
            
            // Проверяем поддержку WebGL2
            if (!this.checkWebGL2Support(canvas)) {
                return this.createWebGLErrorCanvas();
            }
            
            return canvas;
        }
        return canvasId;
    }

    checkWebGL2Support(canvas) {
        try {
            const context = canvas.getContext('webgl2');
            if (!context) {
                console.warn('WebGL2 не поддерживается, используется WebGL1');
                return canvas.getContext('webgl') !== null;
            }
            return true;
        } catch (error) {
            console.error('Ошибка проверки WebGL:', error);
            return false;
        }
    }

    createWebGLErrorCanvas() {
        const container = document.createElement('div');
        container.style.cssText = `
            width: 800px; height: 600px; 
            background: #1a1a2e; color: white;
            display: flex; align-items: center; justify-content: center;
            flex-direction: column; border: 2px solid #ff4444;
            margin: 10px; font-family: Arial, sans-serif;
        `;
        
        container.innerHTML = `
            <h3 style="color: #ff4444; margin-bottom: 10px;">WebGL Не Поддерживается</h3>
            <p style="text-align: center; margin-bottom: 15px;">
                Ваш браузер не поддерживает WebGL, необходимый для 3D рендеринга.<br>
                Пожалуйста, обновите браузер или используйте другое устройство.
            </p>
            <button onclick="location.reload()" style="
                background: #4CAF50; color: white; border: none; 
                padding: 10px 20px; cursor: pointer; border-radius: 4px;
            ">Обновить Страницу</button>
        `;
        
        document.body.appendChild(container);
        return null;
    }

    async init() {
        if (this.isInitialized) {
            console.log('ℹ️ GalaxyRenderer уже инициализирован');
            return;
        }

        try {
            console.log('🚀 Инициализация улучшенного GalaxyRenderer...');
            
            // Инициализация с улучшенными настройками
            this.sceneManager = new ThreeSceneManager2(this.canvas, {
                shadows: this.renderConfig.enableShadows,
                postProcessing: this.renderConfig.enablePostProcessing,
                antialias: this.renderConfig.antiAliasing,
                quality: this.renderConfig.textureQuality
            });
            
            await this.sceneManager.init();
            
            // Инициализация систем с улучшенной конфигурацией
            await Promise.all([
                this.lodManager.preloadLODs(),
                this.animationSystem.init(),
                this.objectPool.init() // Инициализация пула объектов
            ]);
            
            // Предзагрузка общих материалов
            await this.preloadCommonMaterials();
            
            // Создание сцены
            this.setupGalaxyScene();
            
            // Запуск оптимизированного цикла рендеринга
            this.startOptimizedRenderLoop();
            
            this.isInitialized = true;
            console.log('✅ GalaxyRenderer улучшенный инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации GalaxyRenderer:', error);
            this.handleInitError(error);
            throw error;
        }
    }

    // Новая функция: предзагрузка общих материалов
    async preloadCommonMaterials() {
        const materialTypes = [
            { type: 'star', color: '#FFD700', emissive: true },
            { type: 'planet', color: '#4ECDC4', standard: true },
            { type: 'moon', color: '#CCCCCC', standard: true },
            { type: 'asteroid', color: '#888888', basic: true }
        ];

        for (const matConfig of materialTypes) {
            const material = this.createOptimizedMaterial(matConfig);
            this.materialCache.set(matConfig.type, material);
        }
        
        console.log('📦 Предзагружены общие материалы:', this.materialCache.size);
    }

    // Новая функция: создание оптимизированных материалов
    createOptimizedMaterial(config) {
        let material;
        
        if (config.emissive) {
            material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(config.color),
                emissive: new THREE.Color(config.color),
                emissiveIntensity: 0.8
            });
        } else if (config.standard) {
            material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(config.color),
                roughness: 0.7,
                metalness: 0.3
            });
        } else {
            material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(config.color)
            });
        }
        
        // Оптимизация для статических объектов
        material.needsUpdate = false;
        
        return material;
    }

    // Улучшенный цикл рендеринга с приоритизацией
    startOptimizedRenderLoop() {
        const animate = (currentTime) => {
            this.animationFrameId = requestAnimationFrame(animate);
            
            // Рассчитываем deltaTime с защитой от больших значений
            const deltaTime = this.calculateStableDeltaTime(currentTime);
            
            // Приоритетное обновление систем
            this.updateSystems(deltaTime);
            
            // Условный рендеринг (пропускаем кадры при низком FPS)
            if (this.shouldRenderFrame()) {
                this.renderFrame();
            }
        };
        
        animate(performance.now());
    }

    calculateStableDeltaTime(currentTime) {
        const deltaTime = (currentTime - this.performance.lastFrameTime) / 1000;
        this.performance.lastFrameTime = currentTime;
        
        // Защита от скачков времени (пауза, вкладка в фоне)
        return Math.min(deltaTime, 0.1);
    }

    shouldRenderFrame() {
        // Пропускаем рендеринг если FPS слишком низкий
        if (this.stats.fps < 30 && this.performance.lowFPSWarnings < 5) {
            this.performance.lowFPSWarnings++;
            console.warn(`⚠️ Низкий FPS: ${this.stats.fps}, активирована оптимизация`);
            return this.performance.frameTimes.length % 2 === 0; // Пропускаем каждый второй кадр
        }
        return true;
    }

    updateSystems(deltaTime) {
        // Приоритет 1: Ввод и взаимодействие
        this.updateInputSystems();
        
        // Приоритет 2: Анимации
        if (this.renderConfig.enableAnimations) {
            this.animationSystem.update(deltaTime);
        }
        
        // Приоритет 3: LOD и видимость
        this.updateVisibilityAndLOD();
        
        // Приоритет 4: Оптимизации (менее критично)
        this.updatePerformanceOptimizations();
    }

    updateInputSystems() {
        // Обновление Raycaster с throttling
        if (this.raycasterThrottle) return;
        
        this.raycasterThrottle = setTimeout(() => {
            this.raycasterThrottle = null;
        }, 50);
    }

    updateVisibilityAndLOD() {
        if (!this.sceneManager.camera) return;
        
        const cameraPosition = this.sceneManager.camera.position;
        
        this.entityMeshes.forEach((mesh, entityId) => {
            const distance = mesh.position.distanceTo(cameraPosition);
            const shouldBeVisible = this.lodManager.shouldBeVisible(entityId, distance);
            
            if (shouldBeVisible && !this.visibleEntities.has(entityId)) {
                mesh.visible = true;
                this.visibleEntities.add(entityId);
            } else if (!shouldBeVisible && this.visibleEntities.has(entityId)) {
                mesh.visible = false;
                this.visibleEntities.delete(entityId);
            }
        });
    }

    updatePerformanceOptimizations() {
        // Автоматическая очистка памяти при необходимости
        if (this.memoryManager.shouldCleanup()) {
            this.cleanupUnusedResources();
        }
        
        // Динамическая настройка качества
        this.dynamicQualityAdjustment();
    }

    renderFrame() {
        if (!this.sceneManager?.initialized) return;
        
        const renderStart = performance.now();
        
        this.sceneManager.render();
        this.updateEnhancedStats(renderStart);
        
        // Обновление среднего FPS
        this.updateAverageFPS();
    }

    updateEnhancedStats(renderStart) {
        const frameTime = performance.now() - renderStart;
        
        this.stats.frameTime = frameTime;
        this.stats.fps = Math.round(1000 / Math.max(frameTime, 1));
        
        // Сохраняем историю для средних значений
        this.performance.frameTimes.push(frameTime);
        if (this.performance.frameTimes.length > 60) {
            this.performance.frameTimes.shift();
        }
        
        if (this.sceneManager) {
            const sceneStats = this.sceneManager.getStats();
            this.stats.drawCalls = sceneStats.drawCalls;
            this.stats.renderedMeshes = this.visibleEntities.size;
            this.stats.triangles = sceneStats.triangles;
        }
    }

    updateAverageFPS() {
        if (this.performance.frameTimes.length === 0) return;
        
        const avgFrameTime = this.performance.frameTimes.reduce((a, b) => a + b) / this.performance.frameTimes.length;
        this.performance.averageFPS = Math.round(1000 / avgFrameTime);
    }

    // УЛУЧШЕННЫЙ МЕТОД РЕНДЕРИНГА ГАЛАКТИКИ
    async renderGalaxy(galaxyData, options = {}) {
        if (!this.isInitialized) {
            await this.init();
        }

        if (!this.sceneManager || !galaxyData) {
            console.warn('⚠️ Сцена или данные не готовы для рендеринга');
            return;
        }

        console.log('🌌 Улучшенный рендеринг галактики...', {
            entities: galaxyData.stats?.total,
            options: options
        });

        // Очищаем сцену с сохранением фонов
        this.clearScene(true);

        // Прогрессивная загрузка для больших галактик
        if (this.renderConfig.progressiveLoading && galaxyData.stats?.total > 1000) {
            await this.renderGalaxyProgressive(galaxyData, options);
        } else {
            await this.createGalaxyMeshesEnhanced(galaxyData, options);
        }

        // Запускаем анимацию входа
        if (this.renderConfig.enableAnimations) {
            await this.animateGalaxyEntranceEnhanced();
        }

        console.log('✅ Галактика отрендерена с улучшениями', {
            meshes: this.entityMeshes.size,
            instanced: this.stats.instancedCount,
            memory: this.memoryManager.getMemoryStats().formattedAllocated
        });
    }

    // Новая функция: прогрессивный рендеринг для больших сцен
    async renderGalaxyProgressive(galaxyData, options) {
        console.log('⚡ Используем прогрессивный рендеринг...');
        
        const batchSize = 100; // Объектов за кадр
        const entities = this.flattenGalaxyEntities(galaxyData);
        
        for (let i = 0; i < entities.length; i += batchSize) {
            if (i > 0 && !this.shouldRenderFrame()) {
                // Пропускаем батч если низкий FPS
                continue;
            }
            
            const batch = entities.slice(i, i + batchSize);
            await this.createEntityBatch(batch);
            
            // Даем браузеру отрисовать кадр
            await new Promise(resolve => setTimeout(resolve, 0));
            
            if (i % 500 === 0) {
                console.log(`📦 Прогрессивная загрузка: ${i}/${entities.length}`);
            }
        }
    }

    flattenGalaxyEntities(entity, result = []) {
        if (entity.position3D && entity.cleanPath) {
            result.push(entity);
        }
        
        if (entity.children && entity.children.length > 0) {
            entity.children.forEach(child => {
                this.flattenGalaxyEntities(child, result);
            });
        }
        
        return result;
    }

    async createEntityBatch(entities) {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                entities.forEach(entity => {
                    if (entity.position3D && entity.cleanPath) {
                        this.createOptimizedEntityMesh(entity, entity.position3D.absolute);
                    }
                });
                resolve();
            });
        });
    }

    // УЛУЧШЕННОЕ СОЗДАНИЕ МЕШЕЙ
    createOptimizedEntityMesh(entityData, position) {
        const entityId = entityData.cleanPath || entityData.name;
        
        if (this.entityMeshes.has(entityId)) {
            return this.entityMeshes.get(entityId);
        }

        let mesh;
        
        try {
            // Используем инстансинг для одинаковых объектов
            if (this.renderConfig.useInstancing && this.shouldUseInstancing(entityData)) {
                mesh = this.createInstancedMesh(entityData, position, entityId);
            } 
            // Используем пул объектов для переиспользования
            else if (this.renderConfig.useObjectPooling) {
                mesh = this.createMeshFromPool(entityData, position);
            }
            // Стандартное создание
            else {
                mesh = this.createStandardMesh(entityData, position);
            }

            this.setupEnhancedMeshProperties(mesh, entityData, position, entityId);
            this.registerEntityInEnhancedSystems(entityId, mesh, entityData);
            
            this.entityMeshes.set(entityId, mesh);
            this.sceneManager.scene.add(mesh);

            this.trackEnhancedMeshMemory(mesh, entityData.type);

            return mesh;

        } catch (error) {
            console.error(`❌ Ошибка создания улучшенного меша для ${entityId}:`, error);
            return this.createOptimizedFallbackMesh(entityData, position, entityId);
        }
    }

    shouldUseInstancing(entityData) {
        return this.renderConfig.batchSimilarObjects && 
               entityData.type === 'asteroid' && 
               this.entityMeshes.size > 100;
    }

    createInstancedMesh(entityData, position, entityId) {
        const instanceId = `${entityData.type}_${entityData.config?.color || 'default'}`;
        
        if (!this.instancedMeshes.has(instanceId)) {
            const geometry = this.objectPool.getGeometry('sphere', 4, 8, 8);
            const material = this.materialCache.get(entityData.type) || 
                           this.createOptimizedMaterial({ type: entityData.type, color: entityData.config?.color });
            
            const instancedMesh = new THREE.InstancedMesh(geometry, material, 1000);
            instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            instancedMesh.name = `instanced_${instanceId}`;
            
            this.instancedMeshes.set(instanceId, {
                mesh: instancedMesh,
                count: 0,
                matrices: []
            });
            
            this.sceneManager.scene.add(instancedMesh);
            this.stats.instancedCount++;
        }
        
        const instanceGroup = this.instancedMeshes.get(instanceId);
        const matrix = new THREE.Matrix4();
        matrix.setPosition(position.x, position.y, position.z || 0);
        
        instanceGroup.mesh.setMatrixAt(instanceGroup.count, matrix);
        instanceGroup.matrices.push(matrix);
        instanceGroup.count++;
        
        // Создаем proxy объект для управления инстансом
        const proxyMesh = new THREE.Object3D();
        proxyMesh.position.copy(position);
        proxyMesh.userData = {
            entityId: entityId,
            type: entityData.type,
            entityData: entityData,
            isSelectable: true,
            isInstanced: true,
            instanceId: instanceId,
            instanceIndex: instanceGroup.count - 1
        };
        
        instanceGroup.mesh.instanceMatrix.needsUpdate = true;
        return proxyMesh;
    }

    createMeshFromPool(entityData, position) {
        const poolKey = `${entityData.type}_${this.calculateMeshComplexity(entityData)}`;
        
        let mesh = this.objectPool.acquire(poolKey);
        
        if (!mesh) {
            mesh = this.createStandardMesh(entityData, position);
            this.objectPool.register(poolKey, mesh);
        } else {
            // Переиспользуем существующий меш
            mesh.position.copy(position);
            if (mesh.material && entityData.config?.color) {
                mesh.material.color.set(entityData.config.color);
            }
        }
        
        this.stats.pooledObjects++;
        return mesh;
    }

    createStandardMesh(entityData, position) {
        const meshCreators = {
            'star': () => this.createStarMesh(entityData, position),
            'planet': () => this.createPlanetMesh(entityData, position),
            'moon': () => this.createMoonMesh(entityData, position),
            'asteroid': () => this.createAsteroidMesh(entityData, position)
        };
        
        return (meshCreators[entityData.type] || this.createDefaultMesh).call(this, entityData, position);
    }

    calculateMeshComplexity(entityData) {
        const complexities = {
            'star': 'high',
            'planet': 'medium', 
            'moon': 'low',
            'asteroid': 'very_low'
        };
        return complexities[entityData.type] || 'low';
    }

    setupEnhancedMeshProperties(mesh, entityData, position, entityId) {
        if (!mesh.userData.isInstanced) {
            mesh.position.set(position.x, position.y, position.z || 0);
        }
        
        mesh.userData = {
            entityId: entityId,
            type: entityData.type,
            entityData: entityData,
            isSelectable: true,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            complexity: this.calculateMeshComplexity(entityData)
        };

        if (this.renderConfig.enableShadows && !mesh.userData.isInstanced) {
            mesh.castShadow = entityData.type !== 'star';
            mesh.receiveShadow = true;
        }
    }

    // УЛУЧШЕННОЕ УПРАВЛЕНИЕ ПАМЯТЬЮ
    cleanupUnusedResources() {
        const now = Date.now();
        const unusedTimeout = 30000; // 30 секунд
        
        this.entityMeshes.forEach((mesh, entityId) => {
            if (now - mesh.userData.lastUsed > unusedTimeout && 
                !this.visibleEntities.has(entityId)) {
                
                this.disposeEntity(entityId);
            }
        });
        
        // Очистка пула объектов
        this.objectPool.cleanup();
        
        console.log('🧹 Выполнена очистка неиспользуемых ресурсов');
    }

    disposeEntity(entityId) {
        const mesh = this.entityMeshes.get(entityId);
        if (!mesh) return;
        
        if (mesh.userData.isInstanced) {
            // Особый случай для инстансированных мешей
            this.handleInstancedMeshDisposal(mesh);
        } else {
            // Стандартное удаление
            this.sceneManager.removeObject(mesh);
            this.objectPool.release(mesh);
        }
        
        this.entityMeshes.delete(entityId);
        this.visibleEntities.delete(entityId);
        this.spatialPartitioner.removeEntity(entityId);
        this.lodManager.unregisterEntity(entityId);
    }

    handleInstancedMeshDisposal(mesh) {
        const { instanceId, instanceIndex } = mesh.userData;
        const instanceGroup = this.instancedMeshes.get(instanceId);
        
        if (instanceGroup && instanceIndex < instanceGroup.count) {
            // Удаляем инстанс путем сдвига матриц
            for (let i = instanceIndex; i < instanceGroup.count - 1; i++) {
                instanceGroup.mesh.setMatrixAt(i, instanceGroup.matrices[i + 1]);
            }
            
            instanceGroup.count--;
            instanceGroup.matrices.splice(instanceIndex, 1);
            instanceGroup.mesh.instanceMatrix.needsUpdate = true;
            instanceGroup.mesh.count = instanceGroup.count;
        }
    }

    // ДИНАМИЧЕСКАЯ РЕГУЛИРОВКА КАЧЕСТВА
    dynamicQualityAdjustment() {
        const targetFPS = 60;
        const currentFPS = this.stats.fps;
        
        if (currentFPS < targetFPS - 20) {
            // Снижаем качество при низком FPS
            this.reduceQuality();
        } else if (currentFPS > targetFPS + 10) {
            // Повышаем качество при высоком FPS
            this.increaseQuality();
        }
    }

    reduceQuality() {
        if (this.lodManager.currentLevel > 0) {
            this.lodManager.setLODLevel(this.lodManager.currentLevel - 1);
        }
        
        // Отключаем пост-обработку
        if (this.renderConfig.enablePostProcessing) {
            this.renderConfig.enablePostProcessing = false;
            this.sceneManager.setPostProcessing(false);
        }
    }

    increaseQuality() {
        if (this.lodManager.currentLevel < 2) {
            this.lodManager.setLODLevel(this.lodManager.currentLevel + 1);
        }
        
        // Включаем пост-обработку
        if (!this.renderConfig.enablePostProcessing) {
            this.renderConfig.enablePostProcessing = true;
            this.sceneManager.setPostProcessing(true);
        }
    }

    // УЛУЧШЕННАЯ СИСТЕМА АНИМАЦИЙ
    async animateGalaxyEntranceEnhanced() {
        console.log('🎬 Запуск улучшенной анимации входа галактики');
        
        this.animationState.isAnimating = true;
        
        try {
            // Анимация группами для лучшей производительности
            const groups = this.groupEntitiesByDistance();
            
            for (const group of groups) {
                if (!this.shouldRenderFrame()) break;
                
                await this.animateEntityGroup(group);
                await new Promise(resolve => setTimeout(resolve, 50)); // Задержка между группами
            }
            
            this.animationState.entranceComplete = true;
            this.animationState.isAnimating = false;
            
            console.log('✅ Улучшенная анимация входа завершена');
            
        } catch (error) {
            console.error('❌ Ошибка анимации входа:', error);
            this.animationState.isAnimating = false;
        }
    }

    groupEntitiesByDistance() {
        const groups = [[], [], []]; // Ближние, средние, дальние
        
        this.entityMeshes.forEach((mesh, entityId) => {
            const distance = mesh.position.length();
            
            if (distance < 300) groups[0].push(mesh);
            else if (distance < 700) groups[1].push(mesh);
            else groups[2].push(mesh);
        });
        
        return groups;
    }

    async animateEntityGroup(meshes) {
        return new Promise(resolve => {
            const animations = meshes.map(mesh => 
                this.animationSystem.animateEntrance(mesh, {
                    duration: 800 + Math.random() * 400,
                    delay: Math.random() * 300
                })
            );
            
            Promise.all(animations).then(resolve);
        });
    }

    // РАСШИРЕННАЯ ИНФОРМАЦИЯ О РЕНДЕРЕРЕ
    getEnhancedRendererInfo() {
        const baseInfo = this.getRendererInfo();
        
        return {
            ...baseInfo,
            performance: {
                averageFPS: this.performance.averageFPS,
                lowFPSWarnings: this.performance.lowFPSWarnings,
                frameTimeHistory: this.performance.frameTimes
            },
            optimizations: {
                usingInstancing: this.stats.instancedCount > 0,
                usingPooling: this.stats.pooledObjects > 0,
                objectPoolStats: this.objectPool.getStats(),
                dynamicQuality: this.lodManager.currentLevel
            },
            capabilities: {
                webGL2: this.checkWebGL2Support(this.canvas),
                maxTextureSize: this.getMaxTextureSize(),
                supportsInstancing: true // Можно определить через тест
            }
        };
    }

    getMaxTextureSize() {
        const gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        return gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0;
    }

    // УЛУЧШЕННЫЙ ДЕСТРУКТОР
    dispose() {
        console.log('🧹 Уничтожение улучшенного GalaxyRenderer...');
        
        // Останавливаем цикл рендеринга
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Останавливаем все анимации
        this.animationState.isAnimating = false;
        
        // Очищаем все ресурсы
        this.clearScene(false);
        
        // Очищаем кэши
        this.materialCache.forEach(material => material.dispose());
        this.materialCache.clear();
        
        // Очищаем инстансированные меши
        this.instancedMeshes.forEach(group => {
            group.mesh.geometry.dispose();
            group.mesh.material.dispose();
            this.sceneManager.removeObject(group.mesh);
        });
        this.instancedMeshes.clear();
        
        // Уничтожаем системы
        this.objectPool.dispose();
        this.sceneManager.dispose();
        this.lodManager.dispose();
        this.memoryManager.dispose();
        this.spatialPartitioner.dispose();
        this.animationSystem.dispose();
        
        // Очищаем коллекции
        this.entityMeshes.clear();
        this.visibleEntities.clear();
        this.animationState.animations.clear();
        
        this.isInitialized = false;
        
        console.log('✅ Улучшенный GalaxyRenderer уничтожен');
    }
}

export default GalaxyRenderer;
[file content end]
