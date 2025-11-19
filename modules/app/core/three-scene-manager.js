// modules/app/core/three-scene-manager.js
import * as THREE from './three.module.js';

export class ThreeSceneManager {
    constructor(canvasId) {
        this.canvas = this.resolveCanvas(canvasId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.lights = new Map();
        this.backgrounds = new Map();
        this.materialPool = new Map();
        
        this.initialized = false;
        this.stats = {
            drawCalls: 0,
            triangles: 0,
            geometries: 0,
            textures: 0,
            frameTime: 0,
            memory: 0
        };

        console.log('🎮 ThreeSceneManager создан для canvas:', canvasId);
    }

    // === БАЗОВЫЕ МЕТОДЫ ИНИЦИАЛИЗАЦИИ ===
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
        canvas.style.margin = '10px';
        canvas.title = 'Fallback Canvas - элемент не найден';
        document.body.appendChild(canvas);
        return canvas;
    }

    async init(enableShadows = true, enableAntialiasing = true) {
        if (this.initialized) {
            console.warn('⚠️ ThreeSceneManager уже инициализирован');
            return;
        }

        try {
            console.log('🚀 Инициализация Three.js сцены...');
            const startTime = performance.now();

            if (!this.checkWebGLSupport()) {
                throw new Error('WebGL не поддерживается в этом браузере');
            }

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x0c0c2e);
            this.scene.fog = new THREE.Fog(0x0c0c2e, 500, 3000);

            this.camera = this.createCamera();
            this.renderer = this.createRenderer(enableAntialiasing, enableShadows);
            
            this.setupLights();
            this.setupEventListeners();
            this.setupMaterialPool();

            this.initialized = true;
            const initTime = performance.now() - startTime;
            
            console.log('✅ Three.js сцена инициализирована за', initTime.toFixed(2) + 'ms');

        } catch (error) {
            console.error('❌ Ошибка инициализации Three.js:', error);
            this.handleInitError(error);
            throw error;
        }
    }

    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }

    createCamera() {
        const camera = new THREE.PerspectiveCamera(
            75, 
            this.canvas.width / this.canvas.height, 
            0.1, 
            10000
        );
        camera.position.set(0, 0, 1000);
        camera.lookAt(0, 0, 0);
        
        camera.initialPosition = camera.position.clone();
        camera.initialTarget = new THREE.Vector3(0, 0, 0);
        
        return camera;
    }

    createRenderer(enableAntialiasing, enableShadows) {
        const renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: enableAntialiasing,
            powerPreference: "high-performance",
            alpha: false,
            stencil: false,
            depth: true,
            preserveDrawingBuffer: false
        });

        this.setupRenderer(renderer, enableShadows);
        return renderer;
    }

    setupRenderer(renderer, enableShadows) {
        renderer.setSize(this.canvas.width, this.canvas.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        
        if (enableShadows) {
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.shadowMap.autoUpdate = false;
        }

        renderer.autoClear = true;
        renderer.sortObjects = true;
        renderer.info.autoReset = false;
    }

    // === БАЗОВОЕ ОСВЕЩЕНИЕ И МАТЕРИАЛЫ ===
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        this.lights.set('ambient', ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        
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

        const pointLight = new THREE.PointLight(0x4ECDC4, 0.5, 1000);
        pointLight.position.set(0, 0, 0);
        this.scene.add(pointLight);
        this.lights.set('centerPoint', pointLight);

        console.log('💡 Освещение настроено:', Array.from(this.lights.keys()));
    }

    setupMaterialPool() {
        const basicMaterial = new THREE.MeshBasicMaterial();
        const standardMaterial = new THREE.MeshStandardMaterial();
        const phongMaterial = new THREE.MeshPhongMaterial();
        
        this.materialPool.set('basic', basicMaterial);
        this.materialPool.set('standard', standardMaterial);
        this.materialPool.set('phong', phongMaterial);
    }

    // === УПРАВЛЕНИЕ ОБЪЕКТАМИ ===
    addObject(object, parent = null) {
        const target = parent || this.scene;
        target.add(object);
        return object;
    }

    removeObject(object) {
        if (object.parent) {
            object.parent.remove(object);
        }
        
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(m => m.dispose());
            } else {
                object.material.dispose();
            }
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

    // === УПРАВЛЕНИЕ ОСВЕЩЕНИЕМ ===
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

    // === УПРАВЛЕНИЕ КАМЕРОЙ ===
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

    // === РЕНДЕРИНГ И СТАТИСТИКА ===
    render() {
        if (!this.initialized) {
            console.warn('⚠️ ThreeSceneManager не инициализирован');
            return;
        }

        const startTime = performance.now();
        this.renderer.info.reset();
        this.renderer.render(this.scene, this.camera);
        this.stats.frameTime = performance.now() - startTime;

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

    // === ФОНЫ И АТМОСФЕРА ===
    createStarfieldBackground(starCount = 5000, options = {}) {
        const {
            radius = 1000,
            sizeRange = [0.5, 2.5],
            colorRange = [[0.8, 0.8, 1.0], [1.0, 0.9, 0.8]]
        } = options;

        if (this.backgrounds.has('starfield')) {
            console.log('⭐ Используем существующее звездное поле');
            return this.backgrounds.get('starfield');
        }

        const starGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            const r = radius * (0.8 + Math.random() * 0.4);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            const colorMix = Math.random();
            colors[i * 3] = this.lerp(colorRange[0][0], colorRange[1][0], colorMix);
            colors[i * 3 + 1] = this.lerp(colorRange[0][1], colorRange[1][1], colorMix);
            colors[i * 3 + 2] = this.lerp(colorRange[0][2], colorRange[1][2], colorMix);

            sizes[i] = this.lerp(sizeRange[0], sizeRange[1], Math.random());
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const starMaterial = new THREE.PointsMaterial({
            size: 2,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            depthWrite: false
        });

        const starField = new THREE.Points(starGeometry, starMaterial);
        starField.name = 'starfield';
        starField.frustumCulled = false;
        
        this.scene.add(starField);
        this.backgrounds.set('starfield', starField);

        this.trackMemoryUsage('starfield', starGeometry, starMaterial);
        return starField;
    }

    setBackground(colorOrTexture) {
        if (colorOrTexture instanceof THREE.Texture) {
            this.scene.background = colorOrTexture;
        } else {
            this.scene.background = new THREE.Color(colorOrTexture);
        }
    }

    setFog(color, near, far) {
        this.scene.fog = new THREE.Fog(color, near, far);
    }

    // === УТИЛИТЫ И СЛУЖЕБНЫЕ МЕТОДЫ ===
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    trackMemoryUsage(name, geometry, material) {
        let memoryUsage = 0;
        
        if (geometry) {
            if (geometry.attributes.position) {
                memoryUsage += geometry.attributes.position.array.byteLength;
            }
            if (geometry.attributes.color) {
                memoryUsage += geometry.attributes.color.array.byteLength;
            }
            if (geometry.index) {
                memoryUsage += geometry.index.array.byteLength;
            }
        }
        
        if (material) {
            memoryUsage += 5000;
        }
        
        this.stats.memory += memoryUsage;
        console.log(`📊 Память для ${name}: ${this.formatBytes(memoryUsage)}`);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getMaterial(type, color, options = {}) {
        const key = `${type}_${color}_${JSON.stringify(options)}`;
        
        if (!this.materialPool.has(key)) {
            const material = this.createMaterial(type, color, options);
            this.materialPool.set(key, material);
        }
        
        return this.materialPool.get(key).clone();
    }

    createMaterial(type, color, options) {
        const baseOptions = {
            color: new THREE.Color(color),
            ...options
        };

        switch (type) {
            case 'basic':
                return new THREE.MeshBasicMaterial(baseOptions);
            case 'standard':
                return new THREE.MeshStandardMaterial(baseOptions);
            case 'phong':
                return new THREE.MeshPhongMaterial(baseOptions);
            default:
                return new THREE.MeshBasicMaterial(baseOptions);
        }
    }

    // === ОБРАБОТКА СОБЫТИЙ ===
    setupEventListeners() {
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    handleVisibilityChange() {
        if (document.hidden) {
            console.log('⏸️ Страница не видна, можно приостановить тяжелые вычисления');
        } else {
            console.log('▶️ Страница снова активна');
        }
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

    // === ОЧИСТКА И УПРАВЛЕНИЕ ПАМЯТЬЮ ===
    clearScene(preserveBackgrounds = true) {
        const objectsToRemove = [];
        
        this.scene.traverse(object => {
            if (object !== this.scene && 
                (!preserveBackgrounds || !this.backgrounds.has(object.name))) {
                objectsToRemove.push(object);
            }
        });

        objectsToRemove.forEach(object => {
            this.removeObject(object);
        });

        if (!preserveBackgrounds) {
            this.backgrounds.clear();
        }

        console.log('🧹 Сцена очищена', { 
            removed: objectsToRemove.length,
            backgroundsPreserved: preserveBackgrounds 
        });
    }

    enableShadows(enable) {
        if (this.renderer) {
            this.renderer.shadowMap.enabled = enable;
        }
    }

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

    dispose() {
        this.stopAnimationLoop?.();
        this.clearScene(false);
        
        this.materialPool.forEach(material => {
            material.dispose();
        });
        this.materialPool.clear();

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
        }

        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.lights.clear();
        this.backgrounds.clear();

        this.initialized = false;
        console.log('🧹 ThreeSceneManager уничтожен');
    }
}

export default ThreeSceneManager;
