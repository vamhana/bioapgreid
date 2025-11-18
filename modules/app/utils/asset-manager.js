// modules/app/utils/asset-manager.js
export class AssetManager {
    constructor() {
        this.assets = new Map();
        this.loadingPromises = new Map();
        this.basePath = '/assets/';
        
        // Статистика загрузки
        this.stats = {
            total: 0,
            loaded: 0,
            failed: 0,
            totalSize: 0
        };
        
        console.log('📦 AssetManager создан');
    }

    // Загрузка одного ассета
    async loadAsset(url, type = 'auto', key = null) {
        const assetKey = key || url;
        
        // Если ассет уже загружен, возвращаем его
        if (this.assets.has(assetKey)) {
            return this.assets.get(assetKey);
        }
        
        // Если ассет уже в процессе загрузки, возвращаем промис
        if (this.loadingPromises.has(assetKey)) {
            return this.loadingPromises.get(assetKey);
        }
        
        this.stats.total++;
        
        try {
            const loadPromise = this.loadAssetByType(url, type);
            this.loadingPromises.set(assetKey, loadPromise);
            
            const asset = await loadPromise;
            
            // Сохраняем загруженный ассет
            this.assets.set(assetKey, asset);
            this.loadingPromises.delete(assetKey);
            this.stats.loaded++;
            
            console.log(`✅ Ассет загружен: ${url}`);
            return asset;
            
        } catch (error) {
            this.loadingPromises.delete(assetKey);
            this.stats.failed++;
            console.error(`❌ Ошибка загрузки ассета ${url}:`, error);
            throw error;
        }
    }

    // Загрузка ассета по типу
    async loadAssetByType(url, type) {
        const fullUrl = url.startsWith('http') ? url : this.basePath + url;
        
        switch (type) {
            case 'image':
                return this.loadImage(fullUrl);
                
            case 'json':
                return this.loadJSON(fullUrl);
                
            case 'text':
                return this.loadText(fullUrl);
                
            case 'audio':
                return this.loadAudio(fullUrl);
                
            case 'auto':
            default:
                // Автоматическое определение типа по расширению
                return this.loadAuto(fullUrl);
        }
    }

    // Загрузка изображения
    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.stats.totalSize += this.estimateImageSize(img);
                resolve(img);
            };
            
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    }

    // Загрузка JSON
    async loadJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        this.stats.totalSize += new TextEncoder().encode(JSON.stringify(data)).length;
        return data;
    }

    // Загрузка текстового файла
    async loadText(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        this.stats.totalSize += new TextEncoder().encode(text).length;
        return text;
    }

    // Загрузка аудио
    loadAudio(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            
            audio.addEventListener('canplaythrough', () => {
                resolve(audio);
            });
            
            audio.addEventListener('error', () => {
                reject(new Error(`Failed to load audio: ${url}`));
            });
            
            audio.src = url;
            audio.load();
        });
    }

    // Автоматическое определение типа
    loadAuto(url) {
        const extension = url.split('.').pop().toLowerCase();
        
        const typeMap = {
            'png': 'image',
            'jpg': 'image',
            'jpeg': 'image',
            'gif': 'image',
            'svg': 'image',
            'webp': 'image',
            'json': 'json',
            'txt': 'text',
            'html': 'text',
            'css': 'text',
            'mp3': 'audio',
            'wav': 'audio',
            'ogg': 'audio'
        };
        
        const type = typeMap[extension] || 'text';
        return this.loadAssetByType(url, type);
    }

    // Пакетная загрузка ассетов
    async loadAssets(assets) {
        const loadPromises = assets.map(asset => {
            const { url, type, key } = typeof asset === 'string' 
                ? { url: asset, type: 'auto', key: asset }
                : asset;
                
            return this.loadAsset(url, type, key);
        });
        
        return Promise.all(loadPromises);
    }

    // Предзагрузка основных ассетов приложения
    async preloadAppAssets() {
        const appAssets = [
            // Можно добавить пути к текстурам, иконкам и т.д.
        ];
        
        console.log('📥 Предзагрузка ассетов приложения...');
        await this.loadAssets(appAssets);
        console.log('✅ Все ассеты приложения загружены');
    }

    // Получить ассет по ключу
    getAsset(key) {
        return this.assets.get(key);
    }

    // Проверить наличие ассета
    hasAsset(key) {
        return this.assets.has(key);
    }

    // Освобождение ассета
    releaseAsset(key) {
        const asset = this.assets.get(key);
        if (asset) {
            // Особенная логика освобождения для разных типов
            if (asset instanceof Image) {
                asset.src = ''; // Освобождаем источник изображения
            }
            
            this.assets.delete(key);
            console.log(`🗑️ Ассет освобожден: ${key}`);
        }
    }

    // Очистка всех ассетов
    clear() {
        // Освобождаем все ассеты
        for (const key of this.assets.keys()) {
            this.releaseAsset(key);
        }
        
        this.assets.clear();
        this.loadingPromises.clear();
        
        // Сбрасываем статистику
        this.stats = { total: 0, loaded: 0, failed: 0, totalSize: 0 };
        
        console.log('🧹 Все ассеты очищены');
    }

    // Оценка размера изображения
    estimateImageSize(img) {
        return img.width * img.height * 4; // Примерная оценка: width * height * 4 bytes (RGBA)
    }

    // Получить статистику загрузки
    getStats() {
        return {
            ...this.stats,
            progress: this.stats.total > 0 ? (this.stats.loaded / this.stats.total) * 100 : 0
        };
    }

    // Установка базового пути
    setBasePath(path) {
        this.basePath = path;
    }

    // Деструктор
    destroy() {
        this.clear();
        console.log('🧹 AssetManager уничтожен');
    }
}

export default AssetManager;
