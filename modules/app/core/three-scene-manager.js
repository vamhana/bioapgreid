// modules/app/core/three-scene-manager.js
import * as THREE from 'three';

export class ThreeSceneManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.lights = new Map();
        this.postProcessing = null;
        
        this.initialized = false;
        this.stats = {
            drawCalls: 0,
            triangles: 0,
            geometries: 0,
            textures: 0,
            frameTime: 0
        };

        console.log('🎮 ThreeSceneManager создан для canvas:', canvasId);
    }

    async init(enableShadows = true, enableAntialiasing = true) {
        if (this.initialized) {
            console.warn('⚠️ ThreeSceneManager уже инициализирован');
            return;
        }

        try {
            console.log('🚀 Инициализация Three.js сцены...');
            const startTime = performance.now();

            // Создаем сцену
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x0c0c2e);
            this.scene.fog = new THREE.Fog(0x0c0c2e, 500, 3000);

            // Создаем камеру
            this.camera = new THREE.PerspectiveCamera(
                75, 
                window.innerWidth / window.innerHeight, 
                0.1, 
                10000
            );
            this.camera.position.set(0, 0, 1000);
            this.camera.lookAt(0, 0, 0);

            // Создаем рендерер
            this.renderer = new THREE.WebGLRenderer({ 
                canvas: this.canvas,
                antialias: enableAntialiasing,
                powerPreference: "high-performance",
                alpha: false,
                stencil: false,
                depth: true
            });

            this.setupRenderer(enableShadows);
            this.setupLights();
            this.setupEventListeners();

            this.initialized = true;
            const initTime = performance.now() - startTime;
            
            console.log('✅ Three.js сцена инициализирована за', initTime.toFixed(2) + 'ms', {
                shadows: enableShadows,
                antialiasing: enableAntialiasing,
                renderer: this.renderer.info.render
            });

        } catch (error) {
            console.error('❌ Ошибка инициализации Three.js:', error);
            throw error;
        }
    }

    setupRenderer(enableShadows) {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Ограничиваем для производительности
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        if (enableShadows) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.shadowMap.autoUpdate = false; // Оптимизация
        }

        // Оптимизации производительности
        this.renderer.autoClear = true;
        this.renderer.sortObjects = true;
    }

    setupLights() {
        // Ambient light (рассеянное освещение)
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        this.lights.set('ambient', ambientLight);

        // Directional light (солнце)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        
        // Настройки теней
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 2000;
        directionalLight.shadow.camera.left = -500;
        directionalLight.shadow.camera.right = 500;
        directionalLight.shadow.camera.top = 500;
        directionalLight.shadow.camera.bottom = -500;
        
        this.scene.add(directionalLight);
        this.lights.set('sun', directionalLight);

        // Point lights для специальных эффектов
        const pointLight = new THREE.PointLight(0x4ECDC4, 0.5, 1000);
        pointLight.position.set(0, 0, 0);
        this.scene.add(pointLight);
        this.lights.set('centerPoint', pointLight);

        console.log('💡 Освещение настроено:', Array.from(this.lights.keys()));
    }

    setupEventListeners() {
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
    }

    handleResize() {
        if (!this.camera || !this.renderer) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        console.log('🔄 Размер сцены обновлен:', `${width}x${height}`);
    }

    createStarfieldBackground(starCount = 5000) {
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);
        const starSizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            // Сферическое распределение звезд
            const radius = 800 + Math.random() * 200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);

            starPositions[i * 3] = x;
            starPositions[i * 3 + 1] = y;
            starPositions[i * 3 + 2] = z;

            // Случайный цвет с преобладанием белого/голубого
            const colorVariation = Math.random() * 0.4;
            starColors[i * 3] = 0.8 + colorVariation;
            starColors[i * 3 + 1] = 0.8 + colorVariation;
            starColors[i * 3 + 2] = 1.0;

            // Размер звезды
            starSizes[i] = Math.random() * 2 + 0.5;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

        const starMaterial = new THREE.PointsMaterial({
            size: 2,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        const starField = new THREE.Points(starGeometry, starMaterial);
        starField.name = 'starfield';
        this.scene.add(starField);

        return starField;
    }

    createNebulaBackground() {
        // Создаем простую туманность для фона
        const nebulaGeometry = new THREE.SphereGeometry(1200, 32, 32);
        const nebulaTexture = this.createNebulaTexture();
        
        const nebulaMaterial = new THREE.MeshBasicMaterial({
            map: nebulaTexture,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.3
        });

        const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
        nebula.name = 'nebula';
        this.scene.add(nebula);

        return nebula;
    }

    createNebulaTexture() {
        const canvas = document.createElement('canvas');
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        
        gradient.addColorStop(0, 'rgba(78, 205, 196, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 107, 107, 0.4)');
        gradient.addColorStop(0.6, 'rgba(45, 52, 126, 0.2)');
        gradient.addColorStop(1, 'rgba(12, 12, 46, 0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);

        return new THREE.CanvasTexture(canvas);
    }

    render() {
        if (!this.initialized) {
            console.warn('⚠️ ThreeSceneManager не инициализирован');
            return;
        }

        const startTime = performance.now();
        this.renderer.render(this.scene, this.camera);
        this.stats.frameTime = performance.now() - startTime;

        // Обновляем статистику
        this.updateStats();
    }

    updateStats() {
        if (this.renderer) {
            const info = this.renderer.info;
            this.stats.drawCalls = info.render.calls;
            this.stats.triangles = info.render.triangles;
            this.stats.geometries = info.memory.geometries;
            this.stats.textures = info.memory.textures;
        }
    }

    getStats() {
        return {
            ...this.stats,
            memory: this.renderer ? this.renderer.info.memory : {},
            render: this.renderer ? this.renderer.info.render : {}
        };
    }

    // Методы для управления сценой
    addObject(object, parent = null) {
        const target = parent || this.scene;
        target.add(object);
        return object;
    }

    removeObject(object) {
        if (object.parent) {
            object.parent.remove(object);
        }
    }

    findObjectByName(name) {
        return this.scene.getObjectByName(name);
    }

    findObjectsByType(type) {
        const objects = [];
        this.scene.traverse(object => {
            if (object instanceof type) {
                objects.push(object);
            }
        });
        return objects;
    }

    // Методы для управления освещением
    setLightIntensity(lightName, intensity) {
        const light = this.lights.get(lightName);
        if (light) {
            light.intensity = intensity;
        }
    }

    setLightColor(lightName, color) {
        const light = this.lights.get(lightName);
        if (light) {
            light.color.set(color);
        }
    }

    // Методы для камеры
    setCameraPosition(x, y, z) {
        if (this.camera) {
            this.camera.position.set(x, y, z);
        }
    }

    setCameraLookAt(x, y, z) {
        if (this.camera) {
            this.camera.lookAt(x, y, z);
        }
    }

    // Очистка сцены
    clearScene() {
        while (this.scene.children.length > 0) { 
            this.scene.remove(this.scene.children[0]); 
        }
        this.setupLights(); // Восстанавливаем освещение
    }

    // Деструктор
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
        }

        // Очищаем сцену
        this.clearScene();

        // Удаляем обработчики событий
        window.removeEventListener('resize', this.handleResize);

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.lights.clear();

        this.initialized = false;

        console.log('🧹 ThreeSceneManager уничтожен');
    }
}

export default ThreeSceneManager;