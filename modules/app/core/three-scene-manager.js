// modules/app/core/three-scene-manager.js
import * as THREE from './three.module.js';

// Конфигурация сцены
const SceneConfig = {
    // Качество рендеринга на основе устройства
    QUALITY_PROFILES: {
        'ultra': {
            shadows: {
                enabled: true,
                type: THREE.PCFSoftShadowMap,
                mapSize: { width: 4096, height: 4096 },
                blur: 3
            },
            antialiasing: { enabled: true, samples: 8 },
            textures: { anisotropy: 16, compression: true },
            postProcessing: { enabled: true, effects: ['ssaa', 'bloom', 'color'] },
            maxLights: 10,
            maxTextureSize: 4096
        },
        'high': {
            shadows: {
                enabled: true,
                type: THREE.PCFShadowMap,
                mapSize: { width: 2048, height: 2048 },
                blur: 2
            },
            antialiasing: { enabled: true, samples: 4 },
            textures: { anisotropy: 8, compression: true },
            postProcessing: { enabled: true, effects: ['fxaa', 'bloom'] },
            maxLights: 8,
            maxTextureSize: 2048
        },
        'medium': {
            shadows: {
                enabled: true,
                type: THREE.BasicShadowMap,
                mapSize: { width: 1024, height: 1024 },
                blur: 1
            },
            antialiasing: { enabled: false, samples: 0 },
            textures: { anisotropy: 4, compression: false },
            postProcessing: { enabled: false, effects: [] },
            maxLights: 6,
            maxTextureSize: 1024
        },
        'low': {
            shadows: { enabled: false, type: THREE.BasicShadowMap, mapSize: { width: 512, height: 512 } },
            antialiasing: { enabled: false, samples: 0 },
            textures: { anisotropy: 0, compression: false },
            postProcessing: { enabled: false, effects: [] },
            maxLights: 4,
            maxTextureSize: 512
        },
        'mobile': {
            shadows: { enabled: false, type: THREE.BasicShadowMap },
            antialiasing: { enabled: false, samples: 0 },
            textures: { anisotropy: 0, compression: true },
            postProcessing: { enabled: false, effects: [] },
            maxLights: 3,
            maxTextureSize: 512,
            powerPreference: 'low-power'
        }
    },
    
    // Настройки сцены по умолчанию
    DEFAULT_SCENE: {
        backgroundColor: 0x0c0c2e,
        fog: {
            color: 0x0c0c2e,
            near: 500,
            far: 3000
        },
        environment: {
            starfield: { enabled: true, count: 5000 },
            nebula: { enabled: true, opacity: 0.3 },
            ambientLight: 0x404040
        }
    },
    
    // Настройки камеры
    CAMERA: {
        fov: 75,
        near: 0.1,
        far: 10000,
        position: { x: 0, y: 0, z: 1000 },
        lookAt: { x: 0, y: 0, z: 0 }
    },
    
    // Система освещения
    LIGHTING: {
        ambient: { color: 0x404040, intensity: 0.6 },
        directional: {
            color: 0xffffff,
            intensity: 1.2,
            position: { x: 100, y: 100, z: 50 },
            castShadow: true,
            shadowCamera: {
                near: 0.5,
                far: 2000,
                left: -500,
                right: 500,
                top: 500,
                bottom: -500
            }
        },
        pointLights: [
            { color: 0x4ECDC4, intensity: 0.5, distance: 1000, position: { x: 0, y: 0, z: 0 } }
        ]
    },
    
    // Оптимизации рендеринга
    RENDERING: {
        autoClear: true,
        sortObjects: true,
        logarithmicDepthBuffer: false,
        precision: 'highp',
        outputEncoding: THREE.sRGBEncoding,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0
    },
    
    // Кэширование ресурсов
    CACHE: {
        textures: { enabled: true, maxSize: 100 },
        geometries: { enabled: true, maxSize: 200 },
        materials: { enabled: true, maxSize: 150 },
        maxMemoryMB: 200
    }
};

// Система событий для сцены
class SceneEventSystem {
    constructor() {
        this.listeners = new Map();
        this.stats = {
            eventsFired: 0,
            listenersCount: 0
        };
    }
    
    on(event, callback, priority = 0) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        this.listeners.get(event).push({ callback, priority });
        // Сортируем по приоритету (высокий приоритет первым)
        this.listeners.get(event).sort((a, b) => b.priority - a.priority);
        
        this.stats.listenersCount++;
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        
        const listeners = this.listeners.get(event);
        const index = listeners.findIndex(l => l.callback === callback);
        if (index !== -1) {
            listeners.splice(index, 1);
            this.stats.listenersCount--;
        }
    }
    
    emit(event, data = null) {
        this.stats.eventsFired++;
        
        if (!this.listeners.has(event)) return;
        
        const listeners = this.listeners.get(event);
        for (const { callback } of listeners) {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Ошибка в обработчике события ${event}:`, error);
            }
        }
    }
    
    clear() {
        this.listeners.clear();
        this.stats.listenersCount = 0;
    }
    
    getStats() {
        return { ...this.stats, events: Array.from(this.listeners.keys()) };
    }
}

// Менеджер ресурсов с кэшированием
class ResourceManager {
    constructor(config = {}) {
        this.config = config;
        
        this.textureCache = new Map();
        this.geometryCache = new Map();
        this.materialCache = new Map();
        
        this.stats = {
            textureHits: 0,
            textureMisses: 0,
            geometryHits: 0,
            geometryMisses: 0,
            materialHits: 0,
            materialMisses: 0,
            memoryUsage: 0
        };
    }
    
    // Текстуры
    getTexture(key, factory) {
        if (this.textureCache.has(key)) {
            this.stats.textureHits++;
            return this.textureCache.get(key);
        }
        
        this.stats.textureMisses++;
        const texture = factory();
        this.textureCache.set(key, texture);
        
        // Автоматическая очистка при превышении лимита
        if (this.textureCache.size > this.config.textures?.maxSize || 100) {
            this.evictOldestTextures();
        }
        
        return texture;
    }
    
    createNebulaTexture(size = 512) {
        const key = `nebula_${size}`;
        return this.getTexture(key, () => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createRadialGradient(
                size/2, size/2, 0,
                size/2, size/2, size/2
            );
            
            gradient.addColorStop(0, 'rgba(78, 205, 196, 0.8)');
            gradient.addColorStop(0.3, 'rgba(255, 107, 107, 0.4)');
            gradient.addColorStop(0.6, 'rgba(45, 52, 126, 0.2)');
            gradient.addColorStop(1, 'rgba(12, 12, 46, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.name = `nebula_${size}`;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            
            return texture;
        });
    }
    
    createGradientTexture(width = 256, height = 256, colors = ['#4ECDC4', '#0c0c2e']) {
        const key = `gradient_${width}x${height}_${colors.join('_')}`;
        return this.getTexture(key, () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            
            colors.forEach((color, index) => {
                gradient.addColorStop(index / (colors.length - 1), color);
            });
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.name = `gradient_${width}x${height}`;
            
            return texture;
        });
    }
    
    evictOldestTextures() {
        const entries = Array.from(this.textureCache.entries());
        // Удаляем 20% самых старых текстур
        const toRemove = Math.ceil(entries.length * 0.2);
        
        entries.sort((a, b) => a[1].uuid.localeCompare(b[1].uuid))
            .slice(0, toRemove)
            .forEach(([key, texture]) => {
                texture.dispose();
                this.textureCache.delete(key);
            });
    }
    
    // Геометрии
    getGeometry(key, factory) {
        if (this.geometryCache.has(key)) {
            this.stats.geometryHits++;
            return this.geometryCache.get(key);
        }
        
        this.stats.geometryMisses++;
        const geometry = factory();
        this.geometryCache.set(key, geometry);
        
        if (this.geometryCache.size > this.config.geometries?.maxSize || 200) {
            this.evictOldestGeometries();
        }
        
        return geometry;
    }
    
    createStarGeometry(count = 1000, radius = 800) {
        const key = `stars_${count}_${radius}`;
        return this.getGeometry(key, () => {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);
            const sizes = new Float32Array(count);
            
            for (let i = 0; i < count; i++) {
                // Сферическое распределение
                const r = radius + Math.random() * 200;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                
                const x = r * Math.sin(phi) * Math.cos(theta);
                const y = r * Math.sin(phi) * Math.sin(theta);
                const z = r * Math.cos(phi);
                
                positions[i * 3] = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = z;
                
                // Цвета с преобладанием белого/голубого
                const variation = Math.random() * 0.4;
                colors[i * 3] = 0.8 + variation;
                colors[i * 3 + 1] = 0.8 + variation;
                colors[i * 3 + 2] = 1.0;
                
                sizes[i] = Math.random() * 2 + 0.5;
            }
            
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            
            return geometry;
        });
    }
    
    evictOldestGeometries() {
        const entries = Array.from(this.geometryCache.entries());
        const toRemove = Math.ceil(entries.length * 0.2);
        
        entries.sort((a, b) => a[1].uuid.localeCompare(b[1].uuid))
            .slice(0, toRemove)
            .forEach(([key, geometry]) => {
                geometry.dispose();
                this.geometryCache.delete(key);
            });
    }
    
    // Материалы
    getMaterial(key, factory) {
        if (this.materialCache.has(key)) {
            this.stats.materialHits++;
            return this.materialCache.get(key);
        }
        
        this.stats.materialMisses++;
        const material = factory();
        this.materialCache.set(key, material);
        
        if (this.materialCache.size > this.config.materials?.maxSize || 150) {
            this.evictOldestMaterials();
        }
        
        return material;
    }
    
    createStarMaterial() {
        const key = 'star_material';
        return this.getMaterial(key, () => {
            return new THREE.PointsMaterial({
                size: 2,
                sizeAttenuation: true,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
        });
    }
    
    createNebulaMaterial(texture, opacity = 0.3) {
        const key = `nebula_material_${opacity}`;
        return this.getMaterial(key, () => {
            return new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.BackSide,
                transparent: true,
                opacity: opacity,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
        });
    }
    
    evictOldestMaterials() {
        const entries = Array.from(this.materialCache.entries());
        const toRemove = Math.ceil(entries.length * 0.2);
        
        entries.sort((a, b) => a[1].uuid.localeCompare(b[1].uuid))
            .slice(0, toRemove)
            .forEach(([key, material]) => {
                material.dispose();
                this.materialCache.delete(key);
            });
    }
    
    // Очистка ресурсов
    clear() {
        // Текстуры
        for (const texture of this.textureCache.values()) {
            texture.dispose();
        }
        this.textureCache.clear();
        
        // Геометрии
        for (const geometry of this.geometryCache.values()) {
            geometry.dispose();
        }
        this.geometryCache.clear();
        
        // Материалы
        for (const material of this.materialCache.values()) {
            material.dispose();
        }
        this.materialCache.clear();
        
        console.log('🧹 ResourceManager очищен');
    }
    
    getStats() {
        const hitRate = (type) => {
            const hits = this.stats[`${type}Hits`];
            const misses = this.stats[`${type}Misses`];
            const total = hits + misses;
            return total > 0 ? (hits / total * 100).toFixed(1) + '%' : '0%';
        };
        
        return {
            cache: {
                textures: this.textureCache.size,
                geometries: this.geometryCache.size,
                materials: this.materialCache.size
            },
            efficiency: {
                textures: hitRate('texture'),
                geometries: hitRate('geometry'),
                materials: hitRate('material')
            },
            stats: { ...this.stats }
        };
    }
}

// Менеджер освещения с динамической настройкой
class LightingManager {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        
        this.lights = new Map();
        this.lightGroups = new Map();
        this.shadowCasters = new Set();
        
        this.stats = {
            totalLights: 0,
            shadowLights: 0,
            lightUpdates: 0
        };
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(
            this.config.ambient.color,
            this.config.ambient.intensity
        );
        ambientLight.name = 'ambient_light';
        this.scene.add(ambientLight);
        this.lights.set('ambient', ambientLight);
        
        // Directional light (солнце)
        const directionalLight = new THREE.DirectionalLight(
            this.config.directional.color,
            this.config.directional.intensity
        );
        directionalLight.position.set(
            this.config.directional.position.x,
            this.config.directional.position.y,
            this.config.directional.position.z
        );
        directionalLight.name = 'sun_light';
        
        // Настройка теней если включены
        if (this.config.directional.castShadow) {
            this.setupShadowLight(directionalLight, this.config.directional.shadowCamera);
        }
        
        this.scene.add(directionalLight);
        this.lights.set('sun', directionalLight);
        
        // Point lights
        this.config.pointLights.forEach((lightConfig, index) => {
            const pointLight = new THREE.PointLight(
                lightConfig.color,
                lightConfig.intensity,
                lightConfig.distance
            );
            pointLight.position.set(
                lightConfig.position.x,
                lightConfig.position.y,
                lightConfig.position.z
            );
            pointLight.name = `point_light_${index}`;
            
            this.scene.add(pointLight);
            this.lights.set(`point_${index}`, pointLight);
        });
        
        this.stats.totalLights = this.lights.size;
        this.stats.shadowLights = this.config.directional.castShadow ? 1 : 0;
        
        console.log('💡 Освещение настроено:', {
            lights: Array.from(this.lights.keys()),
            shadows: this.config.directional.castShadow
        });
    }
    
    setupShadowLight(light, shadowConfig) {
        light.castShadow = true;
        
        // Настройка карты теней
        if (shadowConfig.mapSize) {
            light.shadow.mapSize.width = shadowConfig.mapSize.width;
            light.shadow.mapSize.height = shadowConfig.mapSize.height;
        }
        
        // Настройка камеры теней
        light.shadow.camera.near = shadowConfig.near;
        light.shadow.camera.far = shadowConfig.far;
        light.shadow.camera.left = shadowConfig.left;
        light.shadow.camera.right = shadowConfig.right;
        light.shadow.camera.top = shadowConfig.top;
        light.shadow.camera.bottom = shadowConfig.bottom;
        
        // Настройка качества теней
        light.shadow.bias = -0.001;
        light.shadow.normalBias = 0.02;
        light.shadow.radius = shadowConfig.blur || 1;
        
        this.shadowCasters.add(light);
        this.stats.shadowLights++;
    }
    
    addLight(name, light, group = 'default') {
        light.name = name;
        this.scene.add(light);
        this.lights.set(name, light);
        
        if (!this.lightGroups.has(group)) {
            this.lightGroups.set(group, new Set());
        }
        this.lightGroups.get(group).add(name);
        
        this.stats.totalLights++;
        if (light.castShadow) {
            this.stats.shadowLights++;
        }
        
        return light;
    }
    
    removeLight(name) {
        const light = this.lights.get(name);
        if (light) {
            this.scene.remove(light);
            if (light.dispose) light.dispose();
            
            this.lights.delete(name);
            this.shadowCasters.delete(light);
            
            // Удаляем из групп
            for (const group of this.lightGroups.values()) {
                group.delete(name);
            }
            
            this.stats.totalLights--;
            if (light.castShadow) {
                this.stats.shadowLights--;
            }
        }
    }
    
    updateLight(name, properties) {
        const light = this.lights.get(name);
        if (!light) return false;
        
        Object.keys(properties).forEach(key => {
            if (key === 'position' && properties.position) {
                light.position.set(
                    properties.position.x,
                    properties.position.y,
                    properties.position.z
                );
            } else if (key === 'color' && properties.color) {
                light.color.set(properties.color);
            } else if (key in light) {
                light[key] = properties[key];
            }
        });
        
        light.needsUpdate = true;
        this.stats.lightUpdates++;
        
        return true;
    }
    
    setGroupIntensity(groupName, intensity) {
        const group = this.lightGroups.get(groupName);
        if (!group) return;
        
        group.forEach(lightName => {
            const light = this.lights.get(lightName);
            if (light && light.intensity !== undefined) {
                light.intensity = intensity;
            }
        });
    }
    
    toggleShadows(enabled) {
        for (const light of this.shadowCasters) {
            light.castShadow = enabled;
            light.shadow.needsUpdate = true;
        }
    }
    
    updateLightForCamera(cameraPosition) {
        // Автоматическая настройка освещения на основе позиции камеры
        // Например, затемнение дальних источников света
        
        const sunLight = this.lights.get('sun');
        if (sunLight) {
            // Направляем свет в сторону камеры
            const direction = new THREE.Vector3()
                .subVectors(sunLight.position, cameraPosition)
                .normalize();
            
            sunLight.position.copy(cameraPosition.clone().add(direction.multiplyScalar(100)));
        }
        
        this.stats.lightUpdates++;
    }
    
    getStats() {
        return {
            ...this.stats,
            lights: this.lights.size,
            shadowCasters: this.shadowCasters.size,
            groups: this.lightGroups.size
        };
    }
}

// Менеджер постобработки
class PostProcessingManager {
    constructor(renderer, scene, camera, config) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.config = config;
        
        this.composer = null;
        this.effects = new Map();
        this.enabled = config.enabled;
        
        this.stats = {
            enabledEffects: 0,
            renderTime: 0,
            lastRender: 0
        };
        
        if (this.enabled && this.config.effects.length > 0) {
            this.setupPostProcessing();
        }
    }
    
    setupPostProcessing() {
        try {
            // Динамический импорт для уменьшения начального размера бандла
            import('./post-processing-bundle.js').then(({ EffectComposer, RenderPass, ...effects }) => {
                this.composer = new EffectComposer(this.renderer);
                
                // Базовый проход рендеринга
                const renderPass = new RenderPass(this.scene, this.camera);
                this.composer.addPass(renderPass);
                
                // Добавляем эффекты из конфига
                this.config.effects.forEach(effectName => {
                    const effect = this.createEffect(effectName, effects);
                    if (effect) {
                        this.composer.addPass(effect);
                        this.effects.set(effectName, effect);
                        this.stats.enabledEffects++;
                    }
                });
                
                console.log('🎨 Постобработка настроена:', Array.from(this.effects.keys()));
            }).catch(error => {
                console.warn('⚠️ Постобработка недоступна:', error);
                this.enabled = false;
            });
        } catch (error) {
            console.warn('⚠️ Постобработка недоступна:', error);
            this.enabled = false;
        }
    }
    
    createEffect(name, effectsLibrary) {
        switch (name) {
            case 'fxaa':
                return new effectsLibrary.FXAAPass();
            case 'ssaa':
                return new effectsLibrary.SSAARenderPass(this.scene, this.camera, 0x000000, 0.5);
            case 'bloom':
                const bloomPass = new effectsLibrary.BloomPass(1.5, 25, 4);
                bloomPass.renderToScreen = false;
                return bloomPass;
            case 'color':
                return new effectsLibrary.ColorCorrectionPass({
                    brightness: 0.05,
                    contrast: 0.1,
                    saturation: 0.1
                });
            default:
                console.warn(`⚠️ Эффект постобработки не найден: ${name}`);
                return null;
        }
    }
    
    render() {
        if (!this.enabled || !this.composer) {
            this.renderer.render(this.scene, this.camera);
            return;
        }
        
        const startTime = performance.now();
        this.composer.render();
        this.stats.renderTime = performance.now() - startTime;
        this.stats.lastRender = Date.now();
    }
    
    setEffectEnabled(effectName, enabled) {
        const effect = this.effects.get(effectName);
        if (effect) {
            effect.enabled = enabled;
            return true;
        }
        return false;
    }
    
    setQuality(quality) {
        if (!this.composer) return;
        
        // Настройка качества постобработки
        this.effects.forEach(effect => {
            if (effect.setSize) {
                const width = this.renderer.domElement.width;
                const height = this.renderer.domElement.height;
                effect.setSize(width >> (quality === 'low' ? 1 : 0), 
                              height >> (quality === 'low' ? 1 : 0));
            }
        });
    }
    
    resize(width, height) {
        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }
    
    dispose() {
        if (this.composer) {
            this.composer.passes.forEach(pass => {
                if (pass.dispose) pass.dispose();
            });
            this.composer = null;
        }
        this.effects.clear();
    }
    
    getStats() {
        return {
            ...this.stats,
            enabled: this.enabled,
            effects: Array.from(this.effects.keys()),
            composer: !!this.composer
        };
    }
}

export class ThreeSceneManager {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }
        
        this.config = { ...SceneConfig, ...config };
        
        // Определяем профиль качества на основе устройства
        this.qualityProfile = this.detectQualityProfile();
        this.qualitySettings = this.config.QUALITY_PROFILES[this.qualityProfile] || 
                              this.config.QUALITY_PROFILES.medium;
        
        // Основные объекты Three.js
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Менеджеры
        this.resourceManager = null;
        this.lightingManager = null;
        this.postProcessingManager = null;
        this.eventSystem = new SceneEventSystem();
        
        // Система рендеринга
        this.renderQueue = new Set();
        this.needsRender = true;
        this.isRendering = false;
        this.lastRenderTime = 0;
        this.renderInterval = null;
        
        // Статистика
        this.stats = {
            drawCalls: 0,
            triangles: 0,
            geometries: 0,
            textures: 0,
            frameTime: 0,
            fps: 60,
            memory: {},
            objects: {
                total: 0,
                visible: 0,
                updates: 0
            }
        };
        
        // Флаги состояния
        this.isInitialized = false;
        this.isDisposed = false;
        
        // Привязка методов
        this.handleResize = this.handleResize.bind(this);
        this.renderFrame = this.renderFrame.bind(this);
        
        console.log('🎮 ThreeSceneManager создан с профилем:', this.qualityProfile);
    }
    
    async init(options = {}) {
        if (this.isInitialized) {
            console.warn('⚠️ ThreeSceneManager уже инициализирован');
            return;
        }
        
        try {
            console.log('🚀 Инициализация Three.js сцены...');
            const startTime = performance.now();
            
            // 1. Создаем сцену
            this.createScene();
            
            // 2. Создаем камеру
            this.createCamera();
            
            // 3. Создаем рендерер
            this.createRenderer(options);
            
            // 4. Инициализируем менеджер ресурсов
            this.resourceManager = new ResourceManager(this.config.CACHE);
            
            // 5. Настраиваем освещение
            this.lightingManager = new LightingManager(
                this.scene,
                this.config.LIGHTING
            );
            this.lightingManager.setupLighting();
            
            // 6. Настраиваем окружение
            await this.setupEnvironment();
            
            // 7. Настраиваем постобработку
            this.postProcessingManager = new PostProcessingManager(
                this.renderer,
                this.scene,
                this.camera,
                this.qualitySettings.postProcessing
            );
            
            // 8. Настраиваем обработчики событий
            this.setupEventListeners();
            
            // 9. Запускаем цикл рендеринга
            this.startRenderLoop();
            
            this.isInitialized = true;
            const initTime = performance.now() - startTime;
            
            console.log('✅ Three.js сцена инициализирована за', initTime.toFixed(2) + 'ms', {
                quality: this.qualityProfile,
                shadows: this.qualitySettings.shadows.enabled,
                antialiasing: this.qualitySettings.antialiasing.enabled,
                postProcessing: this.qualitySettings.postProcessing.enabled
            });
            
            // Сигнализируем об успешной инициализации
            this.eventSystem.emit('initialized', {
                scene: this.scene,
                camera: this.camera,
                renderer: this.renderer,
                stats: this.getStats()
            });
            
        } catch (error) {
            console.error('❌ Ошибка инициализации Three.js:', error);
            this.eventSystem.emit('error', error);
            throw error;
        }
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.name = 'GalaxyScene';
        
        // Фон
        this.scene.background = new THREE.Color(this.config.DEFAULT_SCENE.backgroundColor);
        
        // Туман
        if (this.config.DEFAULT_SCENE.fog) {
            const fog = this.config.DEFAULT_SCENE.fog;
            this.scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
        }
        
        // Создаем группы для организации объектов
        this.createObjectGroups();
        
        console.log('🌌 Сцена создана');
    }
    
    createObjectGroups() {
        // Группы для разных типов объектов
        this.objectGroups = {
            stars: new THREE.Group(),
            planets: new THREE.Group(),
            moons: new THREE.Group(),
            asteroids: new THREE.Group(),
            orbits: new THREE.Group(),
            ui: new THREE.Group(),
            debug: new THREE.Group()
        };
        
        Object.values(this.objectGroups).forEach(group => {
            group.name = group.constructor.name;
            this.scene.add(group);
        });
        
        console.log('📦 Группы объектов созданы:', Object.keys(this.objectGroups));
    }
    
    createCamera() {
        const camConfig = this.config.CAMERA;
        
        this.camera = new THREE.PerspectiveCamera(
            camConfig.fov,
            window.innerWidth / window.innerHeight,
            camConfig.near,
            camConfig.far
        );
        
        this.camera.position.set(
            camConfig.position.x,
            camConfig.position.y,
            camConfig.position.z
        );
        this.camera.lookAt(
            camConfig.lookAt.x,
            camConfig.lookAt.y,
            camConfig.lookAt.z
        );
        this.camera.name = 'MainCamera';
        
        // Сохраняем начальную позицию для сброса
        this.camera.initialPosition = this.camera.position.clone();
        this.camera.initialLookAt = camConfig.lookAt;
        
        console.log('🎥 Камера создана');
    }
    
    createRenderer(options) {
        const renderConfig = {
            canvas: this.canvas,
            antialias: this.qualitySettings.antialiasing.enabled,
            alpha: false,
            stencil: false,
            depth: true,
            powerPreference: this.qualitySettings.powerPreference || 'high-performance',
            ...options
        };
        
        // Пытаемся создать WebGL 2.0 рендерер
        try {
            this.renderer = new THREE.WebGLRenderer(renderConfig);
            console.log('✅ WebGL 2.0 рендерер создан');
        } catch (error) {
            console.warn('⚠️ WebGL 2.0 не поддерживается, пробуем WebGL 1.0');
            this.renderer = new THREE.WebGL1Renderer(renderConfig);
        }
        
        this.setupRenderer();
    }
    
    setupRenderer() {
        const { shadows, textures, antialiasing } = this.qualitySettings;
        const { RENDERING } = this.config;
        
        // Базовые настройки
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Настройки рендеринга
        this.renderer.autoClear = RENDERING.autoClear;
        this.renderer.sortObjects = RENDERING.sortObjects;
        this.renderer.outputEncoding = RENDERING.outputEncoding;
        this.renderer.toneMapping = RENDERING.toneMapping;
        this.renderer.toneMappingExposure = RENDERING.toneMappingExposure;
        
        // Тени
        if (shadows.enabled) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = shadows.type;
            this.renderer.shadowMap.autoUpdate = false; // Для оптимизации
        }
        
        // Текстуры
        if (textures.anisotropy > 0) {
            this.renderer.capabilities.getMaxAnisotropy = () => textures.anisotropy;
        }
        
        console.log('🎨 Рендерер настроен:', {
            size: `${window.innerWidth}x${window.innerHeight}`,
            pixelRatio: this.renderer.getPixelRatio(),
            shadows: shadows.enabled,
            antialiasing: antialiasing.enabled
        });
    }
    
    async setupEnvironment() {
        // Звездное поле
        if (this.config.DEFAULT_SCENE.environment.starfield.enabled) {
            await this.createStarfield();
        }
        
        // Туманность
        if (this.config.DEFAULT_SCENE.environment.nebula.enabled) {
            await this.createNebula();
        }
        
        console.log('🌠 Окружение создано');
    }
    
    async createStarfield() {
        return new Promise((resolve) => {
            const count = this.config.DEFAULT_SCENE.environment.starfield.count;
            
            // Используем ресурс-менеджер для кэширования
            const geometry = this.resourceManager.createStarGeometry(count, 800);
            const material = this.resourceManager.createStarMaterial();
            
            const starfield = new THREE.Points(geometry, material);
            starfield.name = 'starfield';
            starfield.renderOrder = -1; // Рендерим первым
            
            this.scene.add(starfield);
            resolve(starfield);
        });
    }
    
    async createNebula() {
        return new Promise((resolve) => {
            const size = 1200;
            const opacity = this.config.DEFAULT_SCENE.environment.nebula.opacity;
            
            // Создаем текстуру через ресурс-менеджер
            const texture = this.resourceManager.createNebulaTexture(512);
            const material = this.resourceManager.createNebulaMaterial(texture, opacity);
            
            const geometry = new THREE.SphereGeometry(size, 32, 32);
            const nebula = new THREE.Mesh(geometry, material);
            nebula.name = 'nebula';
            nebula.renderOrder = -2; // Рендерим до звездного поля
            
            this.scene.add(nebula);
            resolve(nebula);
        });
    }
    
    setupEventListeners() {
        window.addEventListener('resize', this.handleResize);
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // События мыши/касания
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        console.log('🎮 Обработчики событий настроены');
    }
    
    // ===== УПРАВЛЕНИЕ РЕНДЕРИНГОМ =====
    
    startRenderLoop() {
        if (this.isRendering) return;
        
        this.isRendering = true;
        this.renderFrame();
        
        console.log('🎬 Цикл рендеринга запущен');
    }
    
    stopRenderLoop() {
        this.isRendering = false;
        if (this.renderInterval) {
            cancelAnimationFrame(this.renderInterval);
            this.renderInterval = null;
        }
        
        console.log('⏸️ Цикл рендеринга остановлен');
    }
    
    renderFrame() {
        if (!this.isRendering || this.isDisposed) return;
        
        const startTime = performance.now();
        
        // Событие перед рендерингом
        this.eventSystem.emit('beforeRender', {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer,
            time: startTime
        });
        
        // Обновляем освещение на основе позиции камеры
        if (this.lightingManager) {
            this.lightingManager.updateLightForCamera(this.camera.position);
        }
        
        // Рендерим
        if (this.postProcessingManager) {
            this.postProcessingManager.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        
        // Событие после рендеринга
        this.eventSystem.emit('afterRender', {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer,
            frameTime: performance.now() - startTime
        });
        
        // Обновляем статистику
        this.updateStats(startTime);
        
        // Планируем следующий кадр
        this.renderInterval = requestAnimationFrame(this.renderFrame);
    }
    
    updateStats(startTime) {
        if (!this.renderer) return;
        
        const info = this.renderer.info;
        const frameTime = performance.now() - startTime;
        
        // FPS расчет
        if (this.lastRenderTime > 0) {
            const delta = startTime - this.lastRenderTime;
            this.stats.fps = Math.round(1000 / delta);
        }
        
        this.stats.frameTime = frameTime;
        this.stats.drawCalls = info.render.calls;
        this.stats.triangles = info.render.triangles;
        this.stats.geometries = info.memory.geometries;
        this.stats.textures = info.memory.textures;
        this.stats.memory = info.memory;
        
        // Количество объектов
        const visibleObjects = [];
        this.scene.traVisible((obj) => {
            if (obj.visible) visibleObjects.push(obj);
        });
        this.stats.objects.visible = visibleObjects.length;
        this.stats.objects.total = this.scene.children.length;
        
        this.lastRenderTime = startTime;
    }
    
    // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
    
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        if (!this.camera || !this.renderer) return;
        
        // Обновляем камеру
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Обновляем рендерер
        this.renderer.setSize(width, height);
        
        // Обновляем постобработку
        if (this.postProcessingManager) {
            this.postProcessingManager.resize(width, height);
        }
        
        this.markDirty();
        
        this.eventSystem.emit('resize', { width, height });
        console.log('🔄 Размер окна изменен:', `${width}x${height}`);
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            this.stopRenderLoop();
            this.eventSystem.emit('paused');
            console.log('⏸️ Рендеринг приостановлен (страница скрыта)');
        } else {
            this.startRenderLoop();
            this.eventSystem.emit('resumed');
            console.log('▶️ Рендеринг возобновлен');
        }
    }
    
    handleMouseDown(event) {
        this.eventSystem.emit('mousedown', {
            event,
            camera: this.camera,
            canvas: this.canvas
        });
    }
    
    handleWheel(event) {
        this.eventSystem.emit('wheel', {
            event,
            camera: this.camera
        });
    }
    
    // ===== УПРАВЛЕНИЕ СЦЕНОЙ =====
    
    addObject(object, group = null, parent = null) {
        const target = parent || (group && this.objectGroups[group]) || this.scene;
        
        if (target) {
            target.add(object);
            this.markDirty();
            
            this.eventSystem.emit('objectAdded', { object, group, parent: target });
            return object;
        }
        
        return null;
    }
    
    removeObject(object) {
        if (object.parent) {
            object.parent.remove(object);
            this.markDirty();
            
            this.eventSystem.emit('objectRemoved', { object });
            return true;
        }
        return false;
    }
    
    addToGroup(object, groupName) {
        const group = this.objectGroups[groupName];
        if (group) {
            group.add(object);
            this.markDirty();
            return true;
        }
        return false;
    }
    
    removeFromGroup(object, groupName) {
        const group = this.objectGroups[groupName];
        if (group && object.parent === group) {
            group.remove(object);
            this.markDirty();
            return true;
        }
        return false;
    }
    
    getGroup(groupName) {
        return this.objectGroups[groupName] || null;
    }
    
    clearGroup(groupName) {
        const group = this.objectGroups[groupName];
        if (group) {
            while (group.children.length > 0) {
                const child = group.children[0];
                this.disposeObject(child);
                group.remove(child);
            }
            this.markDirty();
            return true;
        }
        return false;
    }
    
    findObjectByName(name, recursive = true) {
        if (recursive) {
            return this.scene.getObjectByName(name);
        } else {
            return this.scene.children.find(child => child.name === name);
        }
    }
    
    findObjectsByType(type, recursive = true) {
        const objects = [];
        
        const traverse = (obj) => {
            if (obj instanceof type) {
                objects.push(obj);
            }
            
            if (recursive && obj.children) {
                obj.children.forEach(traverse);
            }
        };
        
        this.scene.children.forEach(traverse);
        return objects;
    }
    
    // ===== ОПЕРАЦИИ С КАМЕРОЙ =====
    
    setCameraPosition(x, y, z) {
        if (this.camera) {
            this.camera.position.set(x, y, z);
            this.markDirty();
        }
    }
    
    setCameraLookAt(x, y, z) {
        if (this.camera) {
            this.camera.lookAt(x, y, z);
            this.markDirty();
        }
    }
    
    resetCamera() {
        if (this.camera && this.camera.initialPosition) {
            this.camera.position.copy(this.camera.initialPosition);
            this.camera.lookAt(
                this.camera.initialLookAt.x,
                this.camera.initialLookAt.y,
                this.camera.initialLookAt.z
            );
            this.markDirty();
        }
    }
    
    getCameraInfo() {
        if (!this.camera) return null;
        
        return {
            position: this.camera.position.toArray(),
            rotation: this.camera.rotation.toArray(),
            fov: this.camera.fov,
            aspect: this.camera.aspect,
            near: this.camera.near,
            far: this.camera.far
        };
    }
    
    // ===== УПРАВЛЕНИЕ КАЧЕСТВОМ =====
    
    detectQualityProfile() {
        const ua = navigator.userAgent.toLowerCase();
        const gpu = this.getGPUInfo();
        const memory = navigator.deviceMemory || 4;
        const isMobile = /mobi|android|iphone|ipad|ipod/.test(ua);
        
        let score = 0;
        
        // Проверяем WebGL возможности
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (gl) {
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            if (maxTextureSize >= 8192) score += 3;
            else if (maxTextureSize >= 4096) score += 2;
            else if (maxTextureSize >= 2048) score += 1;
            
            // Проверяем расширения
            const extensions = gl.getSupportedExtensions();
            if (extensions.includes('EXT_texture_filter_anisotropic')) score += 1;
            if (extensions.includes('WEBGL_compressed_texture_s3tc')) score += 1;
        }
        
        // Учитываем память
        if (memory >= 16) score += 3;
        else if (memory >= 8) score += 2;
        else if (memory >= 4) score += 1;
        
        // Мобильные устройства получают штраф
        if (isMobile) score = Math.max(0, score - 2);
        
        // Определяем профиль
        if (score >= 6) return 'ultra';
        if (score >= 4) return 'high';
        if (score >= 2) return 'medium';
        return isMobile ? 'mobile' : 'low';
    }
    
    getGPUInfo() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (!gl) return null;
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
        
        return null;
    }
    
    setQualityProfile(profile) {
        if (!this.config.QUALITY_PROFILES[profile]) {
            console.warn(`⚠️ Профиль качества не найден: ${profile}`);
            return false;
        }
        
        this.qualityProfile = profile;
        this.qualitySettings = this.config.QUALITY_PROFILES[profile];
        
        // Применяем настройки
        this.applyQualitySettings();
        
        this.eventSystem.emit('qualityChanged', { profile, settings: this.qualitySettings });
        console.log(`🎚️ Установлен профиль качества: ${profile}`);
        
        return true;
    }
    
    applyQualitySettings() {
        const { shadows, antialiasing, textures } = this.qualitySettings;
        
        // Обновляем рендерер
        if (this.renderer) {
            this.renderer.shadowMap.enabled = shadows.enabled;
            this.renderer.shadowMap.type = shadows.type;
            this.renderer.antialias = antialiasing.enabled;
        }
        
        // Обновляем освещение
        if (this.lightingManager) {
            this.lightingManager.toggleShadows(shadows.enabled);
        }
        
        // Обновляем постобработку
        if (this.postProcessingManager) {
            this.postProcessingManager.setQuality(this.qualityProfile);
        }
        
        this.markDirty();
    }
    
    // ===== УТИЛИТЫ =====
    
    markDirty() {
        this.needsRender = true;
    }
    
    disposeObject(object) {
        if (!object) return;
        
        // Рекурсивно очищаем детей
        if (object.children) {
            for (let i = object.children.length - 1; i >= 0; i--) {
                this.disposeObject(object.children[i]);
            }
        }
        
        // Очищаем геометрию
        if (object.geometry) {
            object.geometry.dispose();
        }
        
        // Очищаем материал(ы)
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
            } else {
                object.material.dispose();
            }
        }
        
        // Очищаем текстуры
        if (object.texture) {
            object.texture.dispose();
        }
        
        // Вызываем dispose если есть
        if (object.dispose && typeof object.dispose === 'function') {
            object.dispose();
        }
    }
    
    clearScene() {
        // Очищаем все группы
        Object.values(this.objectGroups).forEach(group => {
            while (group.children.length > 0) {
                this.disposeObject(group.children[0]);
                group.remove(group.children[0]);
            }
        });
        
        // Очищаем остальные объекты сцены
        const toRemove = [];
        this.scene.traverse(obj => {
            if (!Object.values(this.objectGroups).includes(obj)) {
                toRemove.push(obj);
            }
        });
        
        toRemove.forEach(obj => {
            if (obj.parent) {
                obj.parent.remove(obj);
                this.disposeObject(obj);
            }
        });
        
        this.markDirty();
        console.log('🧹 Сцена очищена');
    }
    
    // ===== СТАТИСТИКА И СОБЫТИЯ =====
    
    getStats() {
        const resourceStats = this.resourceManager ? this.resourceManager.getStats() : {};
        const lightingStats = this.lightingManager ? this.lightingManager.getStats() : {};
        const postProcessingStats = this.postProcessingManager ? 
            this.postProcessingManager.getStats() : {};
        const eventStats = this.eventSystem.getStats();
        
        return {
            ...this.stats,
            quality: {
                profile: this.qualityProfile,
                settings: this.qualitySettings
            },
            resources: resourceStats,
            lighting: lightingStats,
            postProcessing: postProcessingStats,
            events: eventStats,
            performance: {
                fps: this.stats.fps,
                frameTime: this.stats.frameTime.toFixed(2) + 'ms',
                drawCalls: this.stats.drawCalls,
                triangles: this.stats.triangles
            },
            scene: {
                objects: this.stats.objects,
                groups: Object.keys(this.objectGroups).length,
                lights: lightingStats.totalLights || 0
            }
        };
    }
    
    on(event, callback, priority = 0) {
        return this.eventSystem.on(event, callback, priority);
    }
    
    off(event, callback) {
        this.eventSystem.off(event, callback);
    }
    
    // ===== ОЧИСТКА РЕСУРСОВ =====
    
    dispose() {
        if (this.isDisposed) return;
        
        console.log('🧹 Уничтожение ThreeSceneManager...');
        
        // Останавливаем рендеринг
        this.stopRenderLoop();
        
        // Удаляем обработчики событий
        window.removeEventListener('resize', this.handleResize);
        
        // Очищаем сцену
        this.clearScene();
        
        // Очищаем менеджеры
        if (this.resourceManager) {
            this.resourceManager.clear();
            this.resourceManager = null;
        }
        
        if (this.postProcessingManager) {
            this.postProcessingManager.dispose();
            this.postProcessingManager = null;
        }
        
        // Очищаем Three.js объекты
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
            this.renderer = null;
        }
        
        if (this.scene) {
            this.scene = null;
        }
        
        if (this.camera) {
            this.camera = null;
        }
        
        // Очищаем систему событий
        this.eventSystem.clear();
        
        this.isDisposed = true;
        this.isInitialized = false;
        
        console.log('🧹 ThreeSceneManager уничтожен');
    }
}

export default ThreeSceneManager;
