// modules/app/utils/performance-optimizer.js
export class PerformanceOptimizer {
    constructor() {
        this.stats = {
            fps: 0,
            frameTime: 0,
            memory: 0,
            drawCalls: 0,
            lastUpdate: 0
        };
        
        this.thresholds = {
            lowFPS: 30,
            highMemory: 500 * 1024 * 1024, // 500MB
            maxFrameTime: 33 // 30fps
        };
        
        this.isThrottling = false;
        this.throttleLevel = 0;
        
        console.log('⚡ PerformanceOptimizer создан');
    }

    updateStats(newStats) {
        this.stats = { ...this.stats, ...newStats };
        this.stats.lastUpdate = Date.now();
        
        this.analyzePerformance();
    }

    analyzePerformance() {
        const { fps, frameTime, memory } = this.stats;
        
        // Анализ FPS
        if (fps < this.thresholds.lowFPS) {
            console.warn(`⚠️ Низкий FPS: ${fps}`);
            this.throttleLevel = Math.min(this.throttleLevel + 1, 3);
        } else if (fps > 50) {
            this.throttleLevel = Math.max(this.throttleLevel - 1, 0);
        }
        
        // Анализ времени кадра
        if (frameTime > this.thresholds.maxFrameTime) {
            console.warn(`⚠️ Высокое время кадра: ${frameTime}ms`);
        }
        
        // Анализ памяти
        if (memory && memory.allocated > this.thresholds.highMemory) {
            console.warn(`⚠️ Высокое использование памяти: ${memory.formattedAllocated}`);
        }
    }

    shouldThrottle() {
        return this.throttleLevel > 0;
    }

    getThrottleDelay() {
        // Задержка в зависимости от уровня троттлинга
        const delays = [0, 16, 32, 48]; // ms
        return delays[this.throttleLevel] || 0;
    }

    update() {
        // Метод для периодического обновления
        // Можно добавить логику адаптации на основе текущей производительности
    }

    getOptimizationSuggestions() {
        const suggestions = [];
        
        if (this.stats.fps < 30) {
            suggestions.push('Снизить качество графики');
            suggestions.push('Уменьшить количество объектов');
        }
        
        if (this.stats.frameTime > 33) {
            suggestions.push('Оптимизировать рендеринг');
            suggestions.push('Включить LOD');
        }
        
        return suggestions;
    }

    // Методы для управления качеством
    adjustQuality(level) {
        const levels = {
            low: { lodDistance: 0.5, shadows: false, particles: false },
            medium: { lodDistance: 0.8, shadows: true, particles: true },
            high: { lodDistance: 1.2, shadows: true, particles: true }
        };
        
        return levels[level] || levels.medium;
    }

    // Мониторинг производительности в реальном времени
    startMonitoring() {
        this.monitoringInterval = setInterval(() => {
            this.logPerformance();
        }, 5000);
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }

    logPerformance() {
        console.group('📊 Производительность');
        console.log(`🎮 FPS: ${this.stats.fps}`);
        console.log(`⏱️ Время кадра: ${this.stats.frameTime}ms`);
        console.log(`🧠 Память: ${this.stats.memory?.formattedAllocated || 'N/A'}`);
        console.log(`📊 Троттлинг: уровень ${this.throttleLevel}`);
        console.groupEnd();
    }

    getPerformanceReport() {
        return {
            fps: this.stats.fps,
            frameTime: this.stats.frameTime,
            memory: this.stats.memory,
            throttleLevel: this.throttleLevel,
            suggestions: this.getOptimizationSuggestions(),
            timestamp: new Date().toISOString()
        };
    }

    dispose() {
        this.stopMonitoring();
        console.log('🧹 PerformanceOptimizer уничтожен');
    }
}

export default PerformanceOptimizer;
