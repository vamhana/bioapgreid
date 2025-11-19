import * as THREE from './three.module.js';

export class MaterialPool {
    constructor() {
        this.materials = new Map();
        this.highlightMaterials = new Map();
        this.textureCache = new Map();
        this.stats = {
            totalCreated: 0,
            totalCached: 0,
            cacheHits: 0,
            cacheMisses: 0,
            memoryUsage: 0,
            texturesLoaded: 0
        };

        // Предзагрузка базовых материалов
        this.preloadBaseMaterials();
        
        console.log('🎨 MaterialPool создан');
    }

    // Предзагрузка базовых материалов для быстрого доступа
    preloadBaseMaterials() {
        const baseMaterials = [
            // Basic materials
            { type: 'basic', color: '#FFFFFF', options: { name: 'default_basic' } },
            { type: 'basic', color: '#FFD700', options: { name: 'star_basic', emissive: '#FFD700', emissiveIntensity: 0.8 } },
            { type: 'basic', color: '#4ECDC4', options: { name: 'planet_basic' } },
            { type: 'basic', color: '#CCCCCC', options: { name: 'moon_basic' } },
            { type: 'basic', color: '#888888', options: { name: 'asteroid_basic' } },
            
            // Standard materials
            { type: 'standard', color: '#FFFFFF', options: { name: 'default_standard', roughness: 0.7, metalness: 0.1 } },
            { type: 'standard', color: '#FFD700', options: { name: 'star_standard', emissive: '#FFD700', emissiveIntensity: 0.5 } },
            { type: 'standard', color: '#4ECDC4', options: { name: 'planet_standard', roughness: 0.8, metalness: 0.2 } },
            { type: 'standard', color: '#CCCCCC', options: { name: 'moon_standard', roughness: 0.9, metalness: 0.1 } },
            
            // Phong materials
            { type: 'phong', color: '#FFFFFF', options: { name: 'default_phong', shininess: 30 } },
            { type: 'phong', color: '#4ECDC4', options: { name: 'planet_phong', shininess: 50, specular: '#222222' } },
            
            // Lambert materials
            { type: 'lambert', color: '#FFFFFF', options: { name: 'default_lambert' } },
            { type: 'lambert', color: '#CCCCCC', options: { name: 'moon_lambert' } }
        ];

        baseMaterials.forEach(materialConfig => {
            const key = this.createMaterialKey(materialConfig.type, materialConfig.color, materialConfig.options);
            if (!this.materials.has(key)) {
                const material = this.createMaterial(materialConfig.type, materialConfig.color, materialConfig.options);
                this.materials.set(key, material);
                this.stats.totalCreated++;
            }
        });

        this.stats.totalCached = this.materials.size;
        console.log(`📦 Предзагружено ${baseMaterials.length} базовых материалов`);
    }

    // Основной метод получения материала
    getMaterial(type, color, options = {}) {
        const key = this.createMaterialKey(type, color, options);
        
        if (this.materials.has(key)) {
            this.stats.cacheHits++;
            const cachedMaterial = this.materials.get(key);
            return cachedMaterial.clone();
        }
        
        this.stats.cacheMisses++;
        const material = this.createMaterial(type, color, options);
        this.materials.set(key, material);
        this.stats.totalCreated++;
        this.stats.totalCached = this.materials.size;
        
        // Трекинг использования памяти
        this.trackMaterialMemory(material, key);
        
        return material.clone();
    }

    // Создание ключа для кэша материалов
    createMaterialKey(type, color, options) {
        // Нормализуем опции для стабильного ключа
        const normalizedOptions = { ...options };
        
        // Удаляем временные свойства которые не влияют на материал
        delete normalizedOptions.name;
        
        // Сортируем ключи для консистентности
        const sortedOptions = {};
        Object.keys(normalizedOptions).sort().forEach(key => {
            sortedOptions[key] = normalizedOptions[key];
        });
        
        const optionsStr = JSON.stringify(sortedOptions);
        return `${type}_${color}_${optionsStr}`.toLowerCase();
    }

    // Создание материала по типу и параметрам
    createMaterial(type, color, options = {}) {
        const baseOptions = {
            ...this.getDefaultOptions(type),
            ...options
        };

        // Обрабатываем цвет
        if (color) {
            baseOptions.color = new THREE.Color(color);
        }

        // Обрабатываем emissive цвет если указан
        if (baseOptions.emissive && typeof baseOptions.emissive === 'string') {
            baseOptions.emissive = new THREE.Color(baseOptions.emissive);
        }

        // Обрабатываем specular цвет если указан
        if (baseOptions.specular && typeof baseOptions.specular === 'string') {
            baseOptions.specular = new THREE.Color(baseOptions.specular);
        }

        let material;

        try {
            switch (type.toLowerCase()) {
                case 'basic':
                    material = new THREE.MeshBasicMaterial(baseOptions);
                    break;
                case 'standard':
                    material = new THREE.MeshStandardMaterial(baseOptions);
                    break;
                case 'phong':
                    material = new THREE.MeshPhongMaterial(baseOptions);
                    break;
                case 'lambert':
                    material = new THREE.MeshLambertMaterial(baseOptions);
                    break;
                case 'points':
                    material = new THREE.PointsMaterial(baseOptions);
                    break;
                case 'line':
                    material = new THREE.LineBasicMaterial(baseOptions);
                    break;
                case 'line-dashed':
                    material = new THREE.LineDashedMaterial(baseOptions);
                    break;
                default:
                    console.warn(`⚠️ Неизвестный тип материала: ${type}, используем стандартный`);
                    material = new THREE.MeshStandardMaterial(baseOptions);
            }

            // Устанавливаем имя для отладки
            material.name = options.name || `material_${type}_${this.stats.totalCreated}`;
            
            return material;

        } catch (error) {
            console.error(`❌ Ошибка создания материала ${type}:`, error);
            // Fallback материал
            return new THREE.MeshBasicMaterial({ color: 0xff00ff, name: 'fallback_material' });
        }
    }

    // Получение параметров по умолчанию для каждого типа
    getDefaultOptions(type) {
        const defaults = {
            basic: {
                transparent: false,
                opacity: 1.0,
                wireframe: false,
                side: THREE.FrontSide
            },
            standard: {
                roughness: 0.7,
                metalness: 0.1,
                transparent: false,
                opacity: 1.0,
                wireframe: false,
                side: THREE.FrontSide
            },
            phong: {
                shininess: 30,
                specular: new THREE.Color(0x111111),
                transparent: false,
                opacity: 1.0,
                wireframe: false,
                side: THREE.FrontSide
            },
            lambert: {
                transparent: false,
                opacity: 1.0,
                wireframe: false,
                side: THREE.FrontSide
            },
            points: {
                size: 1,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.8
            },
            line: {
                linewidth: 1,
                transparent: false
            },
            'line-dashed': {
                linewidth: 1,
                dashSize: 3,
                gapSize: 1,
                transparent: false
            }
        };

        return defaults[type.toLowerCase()] || defaults.standard;
    }

    // Специальный метод для материалов с текстурами
    async getTexturedMaterial(type, textureConfig, options = {}) {
        const textureKey = this.createTextureKey(textureConfig);
        
        let texture = this.textureCache.get(textureKey);
        if (!texture) {
            texture = await this.loadTexture(textureConfig);
            this.textureCache.set(textureKey, texture);
            this.stats.texturesLoaded++;
        }

        const materialOptions = {
            ...options,
            map: texture
        };

        return this.getMaterial(type, null, materialOptions);
    }

    // Создание ключа для текстуры
    createTextureKey(textureConfig) {
        if (typeof textureConfig === 'string') {
            return textureConfig; // URL текстуры
        }
        return JSON.stringify(textureConfig);
    }

    // Загрузка текстуры
    async loadTexture(textureConfig) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            
            if (typeof textureConfig === 'string') {
                // Загрузка по URL
                loader.load(
                    textureConfig,
                    (texture) => {
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        resolve(texture);
                    },
                    undefined,
                    (error) => {
                        console.error(`❌ Ошибка загрузки текстуры: ${textureConfig}`, error);
                        reject(error);
                    }
                );
            } else {
                // Создание текстуры из конфига
                const canvas = this.createTextureFromConfig(textureConfig);
                const texture = new THREE.CanvasTexture(canvas);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                resolve(texture);
            }
        });
    }

    // Создание текстуры из конфигурации
    createTextureFromConfig(config) {
        const canvas = document.createElement('canvas');
        canvas.width = config.width || 256;
        canvas.height = config.height || 256;
        
        const context = canvas.getContext('2d');
        
        if (config.gradient) {
            this.drawGradientTexture(context, canvas.width, canvas.height, config.gradient);
        } else if (config.noise) {
            this.drawNoiseTexture(context, canvas.width, canvas.height, config.noise);
        } else {
            // Простая цветная текстура
            context.fillStyle = config.color || '#808080';
            context.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        return canvas;
    }

    // Создание градиентной текстуры
    drawGradientTexture(context, width, height, gradientConfig) {
        const gradient = context.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, width / 2
        );
        
        gradientConfig.stops.forEach(stop => {
            gradient.addColorStop(stop.offset, stop.color);
        });
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
    }

    // Создание шумовой текстуры
    drawNoiseTexture(context, width, height, noiseConfig) {
        const intensity = noiseConfig.intensity || 0.5;
        const baseColor = noiseConfig.baseColor || '#808080';
        
        context.fillStyle = baseColor;
        context.fillRect(0, 0, width, height);
        
        const imageData = context.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * intensity * 255;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
        }
        
        context.putImageData(imageData, 0, 0);
    }

    // Получение материала для подсветки
    getHighlightMaterial(baseMaterial, highlightColor = 0xffff00, intensity = 0.5) {
        const key = `highlight_${baseMaterial.uuid}_${highlightColor}_${intensity}`;
        
        if (this.highlightMaterials.has(key)) {
            return this.highlightMaterials.get(key).clone();
        }

        // Создаем материал для подсветки на основе базового
        const highlightMaterial = baseMaterial.clone();
        
        // Настройки подсветки
        highlightMaterial.emissive = new THREE.Color(highlightColor);
        highlightMaterial.emissiveIntensity = intensity;
        
        // Увеличиваем яркость для лучшего эффекта
        if (highlightMaterial.type === 'MeshBasicMaterial') {
            highlightMaterial.color = new THREE.Color(highlightColor);
        }
        
        // Устанавливаем имя для отладки
        highlightMaterial.name = `highlight_${baseMaterial.name}`;
        
        this.highlightMaterials.set(key, highlightMaterial);
        this.trackMaterialMemory(highlightMaterial, key);
        
        return highlightMaterial.clone();
    }

    // Сброс подсветки материала
    resetHighlightMaterial(mesh) {
        if (mesh.userData && mesh.userData.originalMaterial) {
            mesh.material = mesh.userData.originalMaterial;
            // Не удаляем originalMaterial, так как может понадобиться снова
        }
    }

    // Трекинг использования памяти материалом
    trackMaterialMemory(material, key) {
        // Примерный расчет размера материала
        let size = 2000; // Базовый размер для материала
        
        // Учитываем текстуры если есть
        const textureProperties = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap', 'bumpMap'];
        textureProperties.forEach(prop => {
            if (material[prop]) {
                size += this.estimateTextureSize(material[prop]);
            }
        });
        
        this.stats.memoryUsage += size;
        
        console.log(`📊 Материал создан: ${material.name} (~${this.formatBytes(size)})`);
    }

    // Оценка размера текстуры
    estimateTextureSize(texture) {
        if (!texture.image) return 0;
        
        let width = 1024;
        let height = 1024;
        
        if (texture.image.width && texture.image.height) {
            width = texture.image.width;
            height = texture.image.height;
        } else if (texture.image.videoWidth && texture.image.videoHeight) {
            width = texture.image.videoWidth;
            height = texture.image.videoHeight;
        }
        
        const channels = 4; // RGBA
        return width * height * channels;
    }

    // Форматирование байтов в читаемый вид
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Очистка неиспользуемых материалов
    cleanupUnused(force = false) {
        let clearedCount = 0;
        let clearedMemory = 0;

        // Очищаем основные материалы
        this.materials.forEach((material, key) => {
            // Простая эвристика: если материал не использовался недавно
            if (force || (material.lastUsed && Date.now() - material.lastUsed > 60000)) { // 1 минута
                material.dispose();
                this.materials.delete(key);
                clearedCount++;
                clearedMemory += this.estimateMaterialSize(material);
            }
        });

        // Очищаем материалы подсветки
        this.highlightMaterials.forEach((material, key) => {
            if (force || (material.lastUsed && Date.now() - material.lastUsed > 30000)) { // 30 секунд
                material.dispose();
                this.highlightMaterials.delete(key);
                clearedCount++;
                clearedMemory += this.estimateMaterialSize(material);
            }
        });

        // Очищаем текстуры
        this.textureCache.forEach((texture, key) => {
            if (force) {
                texture.dispose();
                this.textureCache.delete(key);
            }
        });

        this.stats.totalCached = this.materials.size + this.highlightMaterials.size;
        this.stats.memoryUsage = Math.max(0, this.stats.memoryUsage - clearedMemory);

        if (clearedCount > 0) {
            console.log(`🧹 Очищено ${clearedCount} материалов, освобождено ${this.formatBytes(clearedMemory)}`);
        }

        return { clearedCount, clearedMemory };
    }

    // Оценка размера материала
    estimateMaterialSize(material) {
        let size = 2000; // Базовый размер
        
        const textures = [
            material.map,
            material.normalMap,
            material.roughnessMap,
            material.metalnessMap,
            material.emissiveMap,
            material.alphaMap,
            material.bumpMap
        ];

        textures.forEach(texture => {
            if (texture) {
                size += this.estimateTextureSize(texture);
            }
        });

        return size;
    }

    // Получение статистики пула
    getStats() {
        const totalRequests = this.stats.cacheHits + this.stats.cacheMisses;
        const cacheHitRate = totalRequests > 0 ? (this.stats.cacheHits / totalRequests) * 100 : 0;
        
        return {
            ...this.stats,
            cacheHitRate: Math.round(cacheHitRate * 100) / 100,
            materialsByType: this.getMaterialsByType(),
            memoryFormatted: this.formatBytes(this.stats.memoryUsage)
        };
    }

    // Получение материалов по типам
    getMaterialsByType() {
        const types = {};
        
        this.materials.forEach((material, key) => {
            const type = key.split('_')[0];
            types[type] = (types[type] || 0) + 1;
        });

        return types;
    }

    // Сброс статистики
    resetStats() {
        this.stats.cacheHits = 0;
        this.stats.cacheMisses = 0;
        console.log('📊 Статистика MaterialPool сброшена');
    }

    // Полная очистка пула
    clear() {
        // Очищаем все материалы
        this.materials.forEach(material => material.dispose());
        this.highlightMaterials.forEach(material => material.dispose());
        this.textureCache.forEach(texture => texture.dispose());
        
        this.materials.clear();
        this.highlightMaterials.clear();
        this.textureCache.clear();
        
        this.stats.totalCached = 0;
        this.stats.memoryUsage = 0;
        this.stats.texturesLoaded = 0;
        
        console.log('🧹 MaterialPool полностью очищен');
    }

    // Обновление времени использования материала
    markMaterialUsed(material) {
        material.lastUsed = Date.now();
    }

    // Деструктор
    dispose() {
        this.clear();
        console.log('✅ MaterialPool уничтожен');
    }
}

export default MaterialPool;