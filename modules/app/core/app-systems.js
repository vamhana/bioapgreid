import ProgressionTracker from '../interaction/progression-tracker.js';
import EntityInteraction from '../interaction/entity-interaction.js';
import PerformanceOptimizer from '../utils/performance-optimizer.js';

export class AppSystemsManager {
    constructor(app) {
        this.app = app;
        
        // Системы ядра
        this.progression = null;
        this.entityInteraction = null;
        this.performanceOptimizer = null;
        this.assetManager = null;
        
        // Состояние систем
        this.systemsState = {
            lodQuality: 'medium',
            memoryUsage: 0,
            securityValid: true,
            spatialPartitioning: true,
            lastGarbageCollection: Date.now()
        };
        
        console.log('⚙️ Менеджер систем инициализирован');
    }

    async init(galaxyData) {
        console.log('🔧 Инициализация систем ядра...');
        
        try {
            // 1. Система прогресса
            this.progression = new ProgressionTracker();
            await this.progression.init(galaxyData);
            
            // 2. Система взаимодействий
            this.entityInteraction = new EntityInteraction();
            this.entityInteraction.init(
                this.app.renderer, 
                this.progression, 
                this.app.camera
            );
            this.entityInteraction.setGalaxyData(galaxyData);
            
            // 3. Оптимизатор производительности
            this.performanceOptimizer = new PerformanceOptimizer();
            this.performanceOptimizer.init(this.app.uiManager.getDiagnostics());
            
            // 4. Начальная настройка систем
            this.setPerformanceMode(this.app.appState.performanceMode);
            this.toggleSpatialPartitioning(true);
            
            console.log('✅ Системы ядра инициализированы');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации систем:', error);
            throw error;
        }
    }

    // УПРАВЛЕНИЕ СИСТЕМАМИ ===============================================

    setPerformanceMode(mode) {
        const validModes = ['performance', 'balanced', 'quality'];
        if (!validModes.includes(mode)) {
            console.warn('⚠️ Неверный режим производительности:', mode);
            return false;
        }

        this.app.appState.performanceMode = mode;
        
        // Применяем настройки в зависимости от режима
        switch (mode) {
            case 'performance':
                this.setLODQuality('low');
                this.app.renderer?.setPostProcessing?.(false);
                this.toggleSpatialPartitioning(true);
                break;
            case 'balanced':
                this.setLODQuality('medium');
                this.app.renderer?.setPostProcessing?.(true);
                this.toggleSpatialPartitioning(true);
                break;
            case 'quality':
                this.setLODQuality('high');
                this.app.renderer?.setPostProcessing?.(true);
                this.toggleSpatialPartitioning(false);
                break;
        }

        console.log('⚡ Режим производительности установлен:', mode);
        return true;
    }

    cyclePerformanceMode() {
        const modes = ['performance', 'balanced', 'quality'];
        const currentIndex = modes.indexOf(this.app.appState.performanceMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        return this.setPerformanceMode(modes[nextIndex]);
    }

    setLODQuality(quality) {
        if (this.app.renderer?.lodManager) {
            this.app.renderer.lodManager.setQuality(quality);
            this.systemsState.lodQuality = quality;
            console.log('🎯 Качество LOD установлено:', quality);
            return true;
        }
        return false;
    }

    toggleSpatialPartitioning(enabled) {
        if (this.app.renderer?.spatialPartitioner) {
            this.app.renderer.spatialPartitioner.setEnabled(enabled);
            this.systemsState.spatialPartitioning = enabled;
            console.log('📦 Пространственное разбиение:', enabled ? 'вкл' : 'выкл');
            return true;
        }
        return false;
    }

    forceGarbageCollection() {
        if (this.app.dataLoader?.memoryManager) {
            const freed = this.app.dataLoader.memoryManager.forceGarbageCollection();
            this.systemsState.lastGarbageCollection = Date.now();
            console.log('🧹 Принудительная сборка мусора, освобождено:', freed);
            return freed;
        }
        return 0;
    }

    validateDataSecurity(data) {
        if (this.app.dataLoader?.securityValidator) {
            const result = this.app.dataLoader.securityValidator.validateGalaxyData(data);
            this.systemsState.securityValid = result.valid;
            return result;
        }
        return { valid: true, errors: [] };
    }

    getMaterialStats() {
        if (this.app.renderer?.sceneManager?.materialPool) {
            return this.app.renderer.sceneManager.materialPool.getStats();
        }
        return null;
    }

    // ОБНОВЛЕНИЕ И МОНИТОРИНГ ============================================

    update() {
        if (!this.app.isInitialized) return;

        // Обновляем оптимизатор производительности
        if (this.performanceOptimizer?.update) {
            this.performanceOptimizer.update();
        }
        
        // Обновляем статистику производительности
        this.updatePerformanceStats();
        
        // Автоматическая сборка мусора каждые 30 секунд
        const now = Date.now();
        if (now - this.systemsState.lastGarbageCollection > 30000) {
            this.forceGarbageCollection();
        }
    }

    updatePerformanceStats() {
        if (this.performanceOptimizer?.updateStats && this.app.renderer) {
            const rendererStats = this.app.renderer.getPerformanceInfo();
            this.performanceOptimizer.updateStats({
                fps: rendererStats.fps,
                frameTime: parseFloat(rendererStats.frameTime) || 0,
                memory: this.app.dataLoader?.getMemoryUsage?.() || {},
                drawCalls: rendererStats.drawCalls || 0,
                triangles: rendererStats.triangles || 0
            });
        }
    }

    shouldThrottle() {
        return this.performanceOptimizer?.shouldThrottle?.() || false;
    }

    getThrottleDelay() {
        return this.performanceOptimizer?.getThrottleDelay?.() || 33;
    }

    // ДИАГНОСТИКА СИСТЕМ =================================================

    getPerformanceStats() {
        const rendererStats = this.app.renderer?.getPerformanceInfo?.() || {};
        return {
            fps: rendererStats.fps || 0,
            frameTime: rendererStats.frameTime || '0ms',
            memory: this.app.dataLoader?.getMemoryUsage?.() || {},
            drawCalls: rendererStats.drawCalls || 0,
            triangles: rendererStats.triangles || 0,
            performanceMode: this.app.appState.performanceMode,
            systemsState: { ...this.systemsState }
        };
    }

    getSystemInfo() {
        return {
            systemsState: this.systemsState,
            progression: this.progression?.getStats?.(),
            interaction: this.entityInteraction?.getStats?.(),
            performance: this.performanceOptimizer?.getStats?.()
        };
    }

    // ОЧИСТКА РЕСУРСОВ ===================================================

    destroy() {
        if (this.progression?.destroy) this.progression.destroy();
        if (this.entityInteraction?.destroy) this.entityInteraction.destroy();
        if (this.performanceOptimizer?.dispose) this.performanceOptimizer.dispose();
        if (this.assetManager?.destroy) this.assetManager.destroy();
        
        console.log('🧹 Менеджер систем уничтожен');
    }
}