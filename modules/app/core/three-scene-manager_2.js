// modules/app/core/three-scene-manager_2.js
// Импорты для дополнительного функционала (добавь в проект при необходимости)
// import { OrbitControls } from './OrbitControls.js';
// import { EffectComposer } from './EffectComposer.js';
// import { RenderPass } from './RenderPass.js';
// import { UnrealBloomPass } from './UnrealBloomPass.js';
// import Stats from './stats.js';

import { ThreeSceneManager } from './three-scene-manager.js';
import * as THREE from './three.module.js';

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
            
            this.animationCallbacks.forEach(callback => {
                callback(deltaTime, elapsedTime);
            });
            
            if (this.controls) {
                this.controls.update();
            }
            
            if (this.composer) {
                this.composer.render();
            } else {
                this.render();
            }
            
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

    // === РАСШИРЕННЫЕ ФОНЫ И ЭФФЕКТЫ ===
    createNebulaBackground(options = {}) {
        const {
            layers = 5,
            radius = 2000,
            colors = [0x4a148c, 0x311b92, 0x1a237e, 0x0d47a1, 0x01579b],
            opacity = 0.3,
            noiseScale = 100
        } = options;

        console.log('🌌 Создание туманности с параметрами:', { layers, radius });

        const nebulaGroup = new THREE.Group();
        nebulaGroup.name = 'nebula';

        for (let i = 0; i < layers; i++) {
            const layerRadius = radius * (0.7 + i * 0.1);
            const segments = 32 + i * 16;
            
            const geometry = new THREE.SphereGeometry(layerRadius, segments, segments);
            const material = new THREE.MeshBasicMaterial({
                color: colors[i % colors.length],
                transparent: true,
                opacity: opacity * (0.5 + Math.random() * 0.5),
                side: THREE.BackSide,
                wireframe: false
            });

            const nebulaLayer = new THREE.Mesh(geometry, material);
            
            nebulaLayer.rotation.x = Math.random() * Math.PI;
            nebulaLayer.rotation.y = Math.random() * Math.PI;
            nebulaLayer.position.set(
                (Math.random() - 0.5) * noiseScale,
                (Math.random() - 0.5) * noiseScale,
                (Math.random() - 0.5) * noiseScale
            );

            nebulaGroup.add(nebulaLayer);
        }

        this.addAnimationCallback((deltaTime) => {
            nebulaGroup.rotation.y += deltaTime * 0.01;
            nebulaGroup.rotation.x += deltaTime * 0.005;
        });

        this.scene.add(nebulaGroup);
        this.backgrounds.set('nebula', nebulaGroup);

        console.log('✅ Туманность создана с', layers, 'слоями');
        return nebulaGroup;
    }

    createGalaxyBackground(starCount = 10000, options = {}) {
        const {
            arms = 4,
            radius = 1000,
            armWidth = 200,
            coreRadius = 100,
            coreDensity = 0.8,
            spiralTightness = 2,
            starSizeRange = [0.1, 3.0],
            colors = [0xffffff, 0xfff8e1, 0xd1c4e9, 0xb3e5fc]
        } = options;

        console.log('🌠 Создание галактики с', arms, 'рукавами');

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colorsArray = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        let starIndex = 0;

        // Ядро галактики
        const coreStars = Math.floor(starCount * coreDensity);
        for (let i = 0; i < coreStars; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * coreRadius;
            
            positions[starIndex * 3] = Math.cos(angle) * distance;
            positions[starIndex * 3 + 1] = (Math.random() - 0.5) * coreRadius * 0.2;
            positions[starIndex * 3 + 2] = Math.sin(angle) * distance;
            
            const color = colors[0];
            colorsArray[starIndex * 3] = ((color >> 16) & 0xff) / 255;
            colorsArray[starIndex * 3 + 1] = ((color >> 8) & 0xff) / 255;
            colorsArray[starIndex * 3 + 2] = (color & 0xff) / 255;
            
            sizes[starIndex] = this.lerp(starSizeRange[0], starSizeRange[1], Math.random());
            starIndex++;
        }

        // Спиральные рукава
        for (let arm = 0; arm < arms; arm++) {
            const armAngle = (arm / arms) * Math.PI * 2;
            const armStars = Math.floor((starCount - coreStars) / arms);
            
            for (let i = 0; i < armStars; i++) {
                if (starIndex >= starCount) break;
                
                const t = Math.random();
                const distance = coreRadius + t * (radius - coreRadius);
                const angle = armAngle + t * spiralTightness * Math.PI * 2;
                const armOffset = (Math.random() - 0.5) * armWidth;
                
                positions[starIndex * 3] = Math.cos(angle) * distance + Math.cos(angle + Math.PI/2) * armOffset;
                positions[starIndex * 3 + 1] = (Math.random() - 0.5) * radius * 0.1;
                positions[starIndex * 3 + 2] = Math.sin(angle) * distance + Math.sin(angle + Math.PI/2) * armOffset;
                
                const colorIndex = Math.floor(t * (colors.length - 1)) + 1;
                const color = colors[colorIndex] || colors[colors.length - 1];
                colorsArray[starIndex * 3] = ((color >> 16) & 0xff) / 255;
                colorsArray[starIndex * 3 + 1] = ((color >> 8) & 0xff) / 255;
                colorsArray[starIndex * 3 + 2] = (color & 0xff) / 255;
                
                sizes[starIndex] = this.lerp(starSizeRange[0], starSizeRange[1], Math.random());
                starIndex++;
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 2,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
        });

        const galaxy = new THREE.Points(geometry, material);
        galaxy.name = 'galaxy';
        galaxy.frustumCulled = false;

        this.addAnimationCallback((deltaTime) => {
            galaxy.rotation.y += deltaTime * 0.02;
        });

        this.scene.add(galaxy);
        this.backgrounds.set('galaxy', galaxy);

        console.log('✅ Галактика создана с', starCount, 'звездами');
        return galaxy;
    }

    createAnimatedStarfield(starCount = 2000, speed = 0.1) {
        const starfield = this.createStarfieldBackground(starCount);
        
        this.addAnimationCallback((deltaTime) => {
            if (starfield && starfield.geometry) {
                const positions = starfield.geometry.attributes.position.array;
                
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] *= 0.999;
                    positions[i + 1] *= 0.999;
                    positions[i + 2] *= 0.999;
                    
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

    // === УПРАВЛЕНИЕ КАМЕРОЙ И КОНТРОЛЫ ===
    createOrbitControls(enableDamping = true, dampingFactor = 0.05) {
        // Для совместимости - если OrbitControls не загружен, используем заглушку
        if (typeof OrbitControls === 'undefined') {
            console.warn('⚠️ OrbitControls не доступен. Используется базовая камера.');
            return this.createBasicCameraControls();
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
            return this.createBasicCameraControls();
        }
    }

    createBasicCameraControls() {
        // Базовая реализация управления камерой
        console.log('🎮 Созданы базовые контролы камеры');
        return {
            update: () => {},
            dispose: () => {},
            enabled: true
        };
    }

    resetCamera() {
        if (this.camera && this.camera.initialPosition) {
            this.camera.position.copy(this.camera.initialPosition);
            this.camera.lookAt(this.camera.initialTarget);
            
            if (this.controls && this.controls.target) {
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
            
            lifetimes[i] -= deltaTime;
            
            if (lifetimes[i] <= 0) {
                lifetimes[i] = particleSystem.userData.maxLifetime;
                positions[index] = originalPositions[index];
                positions[index + 1] = originalPositions[index + 1];
                positions[index + 2] = originalPositions[index + 2];
            } else {
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

    // === ИНСТРУМЕНТЫ ОТЛАДКИ ===
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

    toggleHelper(name, visible) {
        const helper = this.helpers.get(name);
        if (helper) {
            helper.visible = visible;
            console.log('👁️ Помощник', name, visible ? 'показан' : 'скрыт');
        }
    }

    // === РАСШИРЕННАЯ ОЧИСТКА ===
    dispose() {
        this.stopAnimation();
        this.animationCallbacks.clear();
        
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }
        
        if (this.composer) {
            this.composer.dispose();
            this.composer = null;
        }
        
        if (this.statsPanel && this.statsPanel.dom && this.statsPanel.dom.parentNode) {
            this.statsPanel.dom.parentNode.removeChild(this.statsPanel.dom);
            this.statsPanel = null;
        }
        
        this.helpers.forEach(helper => {
            this.scene.remove(helper);
        });
        this.helpers.clear();
        
        this.loadedModels.clear();
        
        console.log('🧹 ThreeSceneManager2 полностью очищен');
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
        const baseStats = this.stats;
        return {
            ...baseStats,
            animationCallbacks: this.animationCallbacks.size,
            helpers: this.helpers.size,
            loadedModels: this.loadedModels.size,
            isAnimating: this.isAnimating
        };
    }

    // Вспомогательная функция для интерполяции
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    // Обработчик ошибок инициализации
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
        `;
        errorDiv.innerHTML = `
            <h3>Ошибка инициализации 3D</h3>
            <p>${error.message}</p>
            <p>Проверьте поддержку WebGL в вашем браузере</p>
        `;
        document.body.appendChild(errorDiv);
    }
}

export default ThreeSceneManager2;
