// modules/app/core/three-scene-manager_2.js
import { ThreeSceneManager } from './three-scene-manager.js';
import * as THREE from './three.module.js';

// Импорты для дополнительного функционала (добавь в проект при необходимости)
// import { OrbitControls } from './OrbitControls.js';
// import { EffectComposer } from './EffectComposer.js';
// import { RenderPass } from './RenderPass.js';
// import { UnrealBloomPass } from './UnrealBloomPass.js';
// import Stats from './stats.js';

export class ThreeSceneManager2 extends ThreeSceneManager {
    constructor(canvasId) {
        super(canvasId);
        
        // Расширенные свойства
        this.animationCallbacks = new Set();
        this.animationId = null;
        this.isAnimating = false;
        this.controls = null;
        this.composer = null;
        this.statsPanel = null;
        this.helpers = new Map();
        this.loadedModels = new Map();
        this.textureLoader = new THREE.TextureLoader();
        this.clock = new THREE.Clock();
        
        console.log('🎮 ThreeSceneManager2 создан с расширенным функционалом');
    }

    // === АНИМАЦИЯ И ЦИКЛ РЕНДЕРИНГА ===
    startAnimation() {
        if (this.isAnimating) {
            console.warn('⚠️ Анимация уже запущена');
            return;
        }

        this.isAnimating = true;
        this.clock.start();

        const animate = () => {
            if (!this.isAnimating) return;
            
            const deltaTime = this.clock.getDelta();
            const elapsedTime = this.clock.getElapsedTime();
            
            // Вызываем все зарегистрированные колбэки анимации
            this.animationCallbacks.forEach(callback => {
                callback(deltaTime, elapsedTime);
            });
            
            // Обновляем контролы камеры
            if (this.controls) {
                this.controls.update();
            }
            
            // Рендерим через композер если включен пост-процессинг
            if (this.composer) {
                this.composer.render();
            } else {
                this.render();
            }
            
            // Обновляем статистику если включена
            if (this.statsPanel) {
                this.statsPanel.update();
            }
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        animate();
        console.log('▶️ Анимация запущена');
    }

    stopAnimation() {
        this.isAnimating = false;
        this.clock.stop();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        console.log('⏸️ Анимация остановлена');
    }

    addAnimationCallback(callback) {
        this.animationCallbacks.add(callback);
        console.log('📝 Добавлен колбэк анимации, всего:', this.animationCallbacks.size);
    }

    removeAnimationCallback(callback) {
        this.animationCallbacks.delete(callback);
        console.log('🗑️ Удален колбэк анимации, осталось:', this.animationCallbacks.size);
    }

    // === УПРАВЛЕНИЕ КАМЕРОЙ И КОНТРОЛЫ ===
    createOrbitControls(enableDamping = true, dampingFactor = 0.05) {
        // Проверяем доступность OrbitControls
        if (typeof OrbitControls === 'undefined') {
            console.warn('❌ OrbitControls не доступен. Добавьте импорт в проект.');
            return null;
        }

        try {
            this.controls = new OrbitControls(this.camera, this.canvas);
            this.controls.enableDamping = enableDamping;
            this.controls.dampingFactor = dampingFactor;
            this.controls.screenSpacePanning = true;
            this.controls.maxPolarAngle = Math.PI;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 10000;
            
            console.log('🎯 OrbitControls создан');
            return this.controls;
        } catch (error) {
            console.error('❌ Ошибка создания OrbitControls:', error);
            return null;
        }
    }

    createFirstPersonControls(moveSpeed = 10, lookSpeed = 0.002) {
        // Базовая реализация FirstPersonControls
        console.log('🎮 FirstPersonControls будет реализован в будущей версии');
        return null;
    }

    setCameraControls(enabled) {
        if (this.controls) {
            this.controls.enabled = enabled;
            console.log('📷 Контролы камеры:', enabled ? 'включены' : 'выключены');
        }
    }

    resetCamera() {
        if (this.camera && this.camera.initialPosition) {
            this.camera.position.copy(this.camera.initialPosition);
            this.camera.lookAt(this.camera.initialTarget);
            
            if (this.controls) {
                this.controls.target.copy(this.camera.initialTarget);
                this.controls.update();
            }
            
            console.log('🔄 Камера сброшена в начальное положение');
        }
    }

    // === СИСТЕМА ЧАСТИЦ ===
    createParticleSystem(count = 1000, options = {}) {
        const {
            position = new THREE.Vector3(0, 0, 0),
            size = 1,
            color = 0xffffff,
            velocityRange = new THREE.Vector3(1, 1, 1),
            sizeRange = [0.1, 2],
            lifetime = 5
        } = options;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const velocities = new Float32Array(count * 3);
        const lifetimes = new Float32Array(count);

        // Инициализация частиц
        for (let i = 0; i < count; i++) {
            positions[i * 3] = position.x + (Math.random() - 0.5) * 10;
            positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 10;
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 10;

            colors[i * 3] = Math.random();
            colors[i * 3 + 1] = Math.random();
            colors[i * 3 + 2] = Math.random();

            sizes[i] = this.lerp(sizeRange[0], sizeRange[1], Math.random());
            
            velocities[i * 3] = (Math.random() - 0.5) * velocityRange.x;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * velocityRange.y;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * velocityRange.z;
            
            lifetimes[i] = Math.random() * lifetime;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

        const material = new THREE.PointsMaterial({
            size: size,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        const particleSystem = new THREE.Points(geometry, material);
        particleSystem.userData = {
            velocities: velocities,
            lifetimes: lifetimes,
            maxLifetime: lifetime,
            originalPositions: positions.slice()
        };

        // Добавляем анимацию для системы частиц
        this.addAnimationCallback((deltaTime) => {
            this.updateParticleSystem(particleSystem, deltaTime);
        });

        this.scene.add(particleSystem);
        console.log('✨ Система частиц создана:', count, 'частиц');

        return particleSystem;
    }

    updateParticleSystem(particleSystem, deltaTime) {
        const positions = particleSystem.geometry.attributes.position.array;
        const velocities = particleSystem.userData.velocities;
        const lifetimes = particleSystem.userData.lifetimes;
        const originalPositions = particleSystem.userData.originalPositions;

        for (let i = 0; i < positions.length / 3; i++) {
            const index = i * 3;
            
            // Обновляем время жизни
            lifetimes[i] -= deltaTime;
            
            if (lifetimes[i] <= 0) {
                // Респавн частицы
                lifetimes[i] = particleSystem.userData.maxLifetime;
                positions[index] = originalPositions[index];
                positions[index + 1] = originalPositions[index + 1];
                positions[index + 2] = originalPositions[index + 2];
            } else {
                // Обновляем позицию
                positions[index] += velocities[index] * deltaTime;
                positions[index + 1] += velocities[index + 1] * deltaTime;
                positions[index + 2] += velocities[index + 2] * deltaTime;
            }
        }

        particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // === ЗАГРУЗКА РЕСУРСОВ ===
    async loadTexture(url, options = {}) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                url,
                (texture) => {
                    if (options.colorSpace) {
                        texture.colorSpace = options.colorSpace;
                    }
                    if (options.wrapS) {
                        texture.wrapS = options.wrapS;
                    }
                    if (options.wrapT) {
                        texture.wrapT = options.wrapT;
                    }
                    
                    console.log('🖼️ Текстура загружена:', url);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.error('❌ Ошибка загрузки текстуры:', url, error);
                    reject(error);
                }
            );
        });
    }

    async loadModel(url, onProgress = null) {
        // Заглушка для загрузки моделей - нужно добавить GLTFLoader
        console.log('📦 Загрузка моделей будет реализована с GLTFLoader');
        return null;
    }

    async preloadTextures(urls, options = {}) {
        console.log('🔄 Предзагрузка текстур:', urls.length);
        
        const promises = urls.map(url => this.loadTexture(url, options));
        const textures = await Promise.all(promises);
        
        console.log('✅ Все текстуры загружены');
        return textures;
    }

    // === ПОСТ-ОБРАБОТКА И ЭФФЕКТЫ ===
    enablePostProcessing() {
        if (typeof EffectComposer === 'undefined') {
            console.warn('❌ EffectComposer не доступен. Добавьте импорт в проект.');
            return null;
        }

        try {
            this.composer = new EffectComposer(this.renderer);
            this.composer.addPass(new RenderPass(this.scene, this.camera));
            
            console.log('🎨 Композер пост-обработки создан');
            return this.composer;
        } catch (error) {
            console.error('❌ Ошибка создания композера:', error);
            return null;
        }
    }

    addBloomPass(strength = 1.5, radius = 0.4, threshold = 0.85) {
        if (!this.composer) {
            console.warn('❌ Сначала создайте композер через enablePostProcessing()');
            return null;
        }

        if (typeof UnrealBloomPass === 'undefined') {
            console.warn('❌ UnrealBloomPass не доступен');
            return null;
        }

        try {
            const bloomPass = new UnrealBloomPass(
                new THREE.Vector2(this.canvas.width, this.canvas.height),
                strength, radius, threshold
            );
            
            this.composer.addPass(bloomPass);
            console.log('💫 Bloom pass добавлен');
            return bloomPass;
        } catch (error) {
            console.error('❌ Ошибка добавления Bloom pass:', error);
            return null;
        }
    }

    // === ИНСТРУМЕНТЫ ОТЛАДКИ ===
    enableStats() {
        if (typeof Stats === 'undefined') {
            console.warn('❌ Stats не доступен. Добавьте импорт в проект.');
            return null;
        }

        try {
            this.statsPanel = new Stats();
            this.statsPanel.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
            document.body.appendChild(this.statsPanel.dom);
            
            // Добавляем обновление статистики в анимацию
            this.addAnimationCallback(() => {
                if (this.statsPanel) {
                    this.statsPanel.update();
                }
            });
            
            console.log('📊 Stats включен');
            return this.statsPanel;
        } catch (error) {
            console.error('❌ Ошибка создания Stats:', error);
            return null;
        }
    }

    enableAxesHelper(size = 1000) {
        const axesHelper = new THREE.AxesHelper(size);
        this.scene.add(axesHelper);
        this.helpers.set('axes', axesHelper);
        
        console.log('🧭 AxesHelper добавлен, размер:', size);
        return axesHelper;
    }

    enableGridHelper(size = 1000, divisions = 100) {
        const gridHelper = new THREE.GridHelper(size, divisions);
        this.scene.add(gridHelper);
        this.helpers.set('grid', gridHelper);
        
        console.log('🔲 GridHelper добавлен', { size, divisions });
        return gridHelper;
    }

    enableCameraHelper() {
        if (this.lights.has('sun')) {
            const light = this.lights.get('sun');
            const helper = new THREE.CameraHelper(light.shadow.camera);
            this.scene.add(helper);
            this.helpers.set('camera', helper);
            
            console.log('📐 CameraHelper для directional light добавлен');
            return helper;
        }
        return null;
    }

    toggleHelper(name, visible) {
        const helper = this.helpers.get(name);
        if (helper) {
            helper.visible = visible;
            console.log('👁️ Помощник', name, visible ? 'показан' : 'скрыт');
        }
    }

    // === РАСШИРЕННЫЕ ФОНЫ И ЭФФЕКТЫ ===
    createNebulaBackground(layers = 3, options = {}) {
        console.log('🌌 Создание туманности будет реализовано в будущей версии');
        // Реализация сложного фона с туманностями и газовыми облаками
        return null;
    }

    createAnimatedStarfield(starCount = 2000, speed = 0.1) {
        const starfield = this.createStarfieldBackground(starCount);
        
        // Добавляем анимацию движения звезд
        this.addAnimationCallback((deltaTime) => {
            if (starfield && starfield.geometry) {
                const positions = starfield.geometry.attributes.position.array;
                
                for (let i = 0; i < positions.length; i += 3) {
                    // Простая анимация движения к центру
                    positions[i] *= 0.999;
                    positions[i + 1] *= 0.999;
                    positions[i + 2] *= 0.999;
                    
                    // Если звезда слишком близко к центру, респавним на краю
                    if (Math.abs(positions[i]) < 10 && Math.abs(positions[i + 1]) < 10 && Math.abs(positions[i + 2]) < 10) {
                        const theta = Math.random() * Math.PI * 2;
                        const phi = Math.acos(2 * Math.random() - 1);
                        const radius = 800 + Math.random() * 200;
                        
                        positions[i] = radius * Math.sin(phi) * Math.cos(theta);
                        positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
                        positions[i + 2] = radius * Math.cos(phi);
                    }
                }
                
                starfield.geometry.attributes.position.needsUpdate = true;
            }
        });
        
        console.log('⭐ Анимированное звездное поле создано');
        return starfield;
    }

    // === РАСШИРЕННОЕ УПРАВЛЕНИЕ СЦЕНОЙ ===
    createLODObject(highDetailMesh, mediumDetailMesh, lowDetailMesh, thresholds = [50, 200]) {
        const lod = new THREE.LOD();
        
        if (highDetailMesh) lod.addLevel(highDetailMesh, 0);
        if (mediumDetailMesh) lod.addLevel(mediumDetailMesh, thresholds[0]);
        if (lowDetailMesh) lod.addLevel(lowDetailMesh, thresholds[1]);
        
        this.scene.add(lod);
        console.log('🎚️ LOD объект создан с уровнями детализации');
        return lod;
    }

    enableEnvironmentMap(images = []) {
        // Создание environment map для реалистичных отражений
        console.log('🪞 Environment mapping будет реализован в будущей версии');
        return null;
    }

    // === РАСШИРЕННАЯ ОЧИСТКА ===
    dispose() {
        // Останавливаем анимацию первым делом
        this.stopAnimation();
        
        // Очищаем расширенные свойства
        this.animationCallbacks.clear();
        
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }
        
        if (this.composer) {
            this.composer.dispose();
            this.composer = null;
        }
        
        if (this.statsPanel && this.statsPanel.dom.parentNode) {
            this.statsPanel.dom.parentNode.removeChild(this.statsPanel.dom);
            this.statsPanel = null;
        }
        
        // Очищаем хелперы
        this.helpers.forEach(helper => {
            this.scene.remove(helper);
        });
        this.helpers.clear();
        
        // Очищаем загруженные модели
        this.loadedModels.clear();
        
        console.log('🧹 ThreeSceneManager2 полностью очищен');
        
        // Вызываем родительский dispose
        super.dispose();
    }

    // === УТИЛИТЫ ===
    screenshot(filename = 'screenshot') {
        this.renderer.render(this.scene, this.camera);
        const dataURL = this.canvas.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = `${filename}-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
        
        console.log('📸 Скриншот сохранен:', link.download);
        return dataURL;
    }

    getPerformanceInfo() {
        const baseStats = super.stats;
        const extendedStats = {
            ...baseStats,
            animationCallbacks: this.animationCallbacks.size,
            helpers: this.helpers.size,
            loadedModels: this.loadedModels.size,
            frameRate: this.statsPanel ? this.statsPanel.fps : 'N/A'
        };
        
        return extendedStats;
    }
}

export default ThreeSceneManager2;
