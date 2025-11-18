// modules/app/core/memory-manager.js
export class MemoryManager {
    constructor() {
        this.allocatedMemory = 0;
        this.memoryLimit = 500 * 1024 * 1024; // 500MB лимит
        this.assetReferences = new Map();
        this.memoryWarnings = new Set();
        
        // Периодическая сборка мусора
        this.garbageCollectionInterval = setInterval(() => this.collectGarbage(), 30000); // Каждые 30 секунд
        
        // Мониторинг памяти
        this.setupMemoryMonitoring();
        
        console.log('🧠 MemoryManager создан, лимит:', this.formatBytes(this.memoryLimit));
    }

    setupMemoryMonitoring() {
        // Используем Performance API для мониторинга памяти если доступно
        if (performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                const used = memory.usedJSHeapSize;
                const limit = memory.jsHeapSizeLimit;
                
                if (used / limit > 0.8) {
                    console.warn('⚠️ Высокое использование памяти браузером:', this.formatBytes(used));
                    this.forceGarbageCollection();
                }
            }, 10000);
        }
    }

    trackAllocation(asset, type, size, metadata = {}) {
        const id = this.generateId();
        const allocation = {
            asset,
            type,
            size,
            metadata,
            lastUsed: Date.now(),
            referenceCount: 1,
            stackTrace: this.getStackTrace()
        };
        
        this.assetReferences.set(id, allocation);
        this.allocatedMemory += size;
        
        console.log(`📦 Выделено: ${this.formatBytes(size)} для ${type}, всего: ${this.formatBytes(this.allocatedMemory)}`);
        
        this.checkMemoryLimit();
        return id;
    }

    incrementReference(assetId) {
        const asset = this.assetReferences.get(assetId);
        if (asset) {
            asset.referenceCount++;
            asset.lastUsed = Date.now();
        }
    }

    decrementReference(assetId) {
        const asset = this.assetReferences.get(assetId);
        if (asset) {
            asset.referenceCount--;
            asset.lastUsed = Date.now();
            
            if (asset.referenceCount <= 0) {
                this.scheduleForCleanup(assetId);
            }
        }
    }

    scheduleForCleanup(assetId) {
        // Даем 5 секунд перед очисткой, на случай если объект снова понадобится
        setTimeout(() => {
            this.cleanupAsset(assetId);
        }, 5000);
    }

    cleanupAsset(assetId) {
        const asset = this.assetReferences.get(assetId);
        if (asset && asset.referenceCount <= 0) {
            this.disposeThreeAsset(asset.asset);
            this.allocatedMemory -= asset.size;
            this.assetReferences.delete(assetId);
            
            console.log(`🗑️ Очищено: ${this.formatBytes(asset.size)} от ${asset.type}`);
        }
    }

    disposeThreeAsset(asset) {
        try {
            if (asset.isMesh) {
                if (asset.geometry) {
                    asset.geometry.dispose();
                }
                if (asset.material) {
                    if (Array.isArray(asset.material)) {
                        asset.material.forEach(m => m.dispose());
                    } else {
                        asset.material.dispose();
                    }
                }
            } else if (asset.isTexture) {
                asset.dispose();
            } else if (asset.dispose && typeof asset.dispose === 'function') {
                asset.dispose();
            }
        } catch (error) {
            console.warn('⚠️ Ошибка при очистке Three.js ассета:', error);
        }
    }

    collectGarbage() {
        const now = Date.now();
        const maxAge = 60000; // 1 минута
        
        let collected = 0;
        
        for (const [assetId, asset] of this.assetReferences) {
            if (asset.referenceCount <= 0 && (now - asset.lastUsed) > maxAge) {
                this.cleanupAsset(assetId);
                collected++;
            }
        }
        
        if (collected > 0) {
            console.log(`🧹 Собрано мусора: ${collected} объектов`);
        }
    }

    checkMemoryLimit() {
        const usagePercent = (this.allocatedMemory / this.memoryLimit) * 100;
        
        if (usagePercent > 90 && !this.memoryWarnings.has('critical')) {
            console.error('🚨 Критическое использование памяти!', this.getMemoryStats());
            this.memoryWarnings.add('critical');
            this.forceGarbageCollection();
        } else if (usagePercent > 80 && !this.memoryWarnings.has('high')) {
            console.warn('⚠️ Высокое использование памяти', this.getMemoryStats());
            this.memoryWarnings.add('high');
            this.forceGarbageCollection();
        } else if (usagePercent > 70 && !this.memoryWarnings.has('medium')) {
            console.warn('⚠️ Среднее использование памяти', this.getMemoryStats());
            this.memoryWarnings.add('medium');
        }
    }

    forceGarbageCollection() {
        console.log('🔴 Принудительная сборка мусора...');
        
        // Сортируем активы по времени последнего использования (старые сначала)
        const sortedAssets = Array.from(this.assetReferences.entries())
            .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
            
        let freedMemory = 0;
        
        for (const [assetId, asset] of sortedAssets) {
            if (asset.referenceCount <= 0) {
                freedMemory += asset.size;
                this.cleanupAsset(assetId);
                
                // Останавливаемся когда освободили достаточно памяти
                if (this.allocatedMemory <= this.memoryLimit * 0.7) {
                    break;
                }
            }
        }
        
        console.log(`🟢 Освобождено: ${this.formatBytes(freedMemory)}`);
        this.memoryWarnings.clear();
    }

    getMemoryStats() {
        const usagePercent = (this.allocatedMemory / this.memoryLimit) * 100;
        
        return {
            allocated: this.allocatedMemory,
            formattedAllocated: this.formatBytes(this.allocatedMemory),
            limit: this.memoryLimit,
            formattedLimit: this.formatBytes(this.memoryLimit),
            usagePercent: Math.round(usagePercent * 100) / 100,
            trackedAssets: this.assetReferences.size,
            warnings: Array.from(this.memoryWarnings)
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getStackTrace() {
        try {
            throw new Error();
        } catch (error) {
            return error.stack ? error.stack.split('\n').slice(2, 5).join('\n') : 'Stack trace unavailable';
        }
    }

    // Метод для профилирования использования памяти
    profileMemoryUsage() {
        const stats = this.getMemoryStats();
        const profile = {
            timestamp: new Date().toISOString(),
            ...stats,
            assetBreakdown: this.getAssetBreakdown()
        };
        
        console.table(profile.assetBreakdown);
        return profile;
    }

    getAssetBreakdown() {
        const breakdown = {};
        
        for (const asset of this.assetReferences.values()) {
            if (!breakdown[asset.type]) {
                breakdown[asset.type] = { count: 0, totalSize: 0 };
            }
            breakdown[asset.type].count++;
            breakdown[asset.type].totalSize += asset.size;
        }
        
        return breakdown;
    }

    dispose() {
        clearInterval(this.garbageCollectionInterval);
        this.forceGarbageCollection();
        console.log('🧹 MemoryManager уничтожен');
    }
}

export default MemoryManager;