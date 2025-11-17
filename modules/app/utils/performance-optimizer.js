// modules/app/utils/performance-optimizer.js
export class PerformanceOptimizer {
    constructor() {
        // Метрики производительности
        this.metrics = {
            fps: 0,
            frameTime: 0,
            memory: {
                used: 0,
                total: 0,
                ratio: 0
            },
            entities: {
                total: 0,
                rendered: 0,
                culled: 0
            }
        };
        
        // Счетчики кадров
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.lastFpsUpdate = this.lastTime;
        
        // Настройки оптимизации
        this.settings = {
            targetFps: 60,
            lowFpsThreshold: 30,
            enableLod: true,
            enableCulling: true,
            enableThrottling: true,
            maxEntitiesPerFrame: 1000
        };
        
        // Состояние
        this.isThrottling = false;
        this.throttleFactor = 1;
        
        // Коллбэки
        this.onLowPerformance = null;
        this.onPerformanceRecover = null;
        
        console.log('⚡ PerformanceOptimizer создан');
    }

    // Обновление метрик каждый кадр
    update() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        
        this.frameCount++;
        this.lastTime = currentTime;
        
        // Обновляем FPS каждую секунду
        if (currentTime >= this.lastFpsUpdate + 1000) {
            this.metrics.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            this.metrics.frameTime = 1000 / this.metrics.fps;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            
            this.updateMemoryMetrics();
            this.checkPerformance();
        }
        
        return this.metrics;
    }

    // Обновление метрик памяти
    updateMemoryMetrics() {
        if (performance.memory) {
            this.metrics.memory = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                ratio: performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize
            };
        }
    }

    // Проверка производительности и применение оптимизаций
    checkPerformance() {
        const wasThrottling = this.isThrottling;
        this.isThrottling = this.metrics.fps < this.settings.lowFpsThreshold;
        
        // Адаптивный throttle factor
        if (this.isThrottling) {
            this.throttleFactor = Math.max(0.1, this.metrics.fps / this.settings.targetFps);
            
            if (!wasThrottling && this.onLowPerformance) {
                this.onLowPerformance(this.metrics);
            }
            
            console.warn(`⚠️ Низкий FPS: ${this.metrics.fps}, применяется троттлинг: ${this.throttleFactor.toFixed(2)}`);
        } else {
            this.throttleFactor = 1;
            
            if (wasThrottling && this.onPerformanceRecover) {
                this.onPerformanceRecover(this.metrics);
            }
        }
    }

    // Оптимизация списка сущностей для рендеринга
    optimizeEntities(entities, camera) {
        if (!this.settings.enableCulling) {
            this.metrics.entities.rendered = entities.length;
            this.metrics.entities.culled = 0;
            return entities;
        }
        
        const optimized = [];
        let rendered = 0;
        let culled = 0;
        
        for (const entity of entities) {
            if (this.shouldRenderEntity(entity, camera)) {
                optimized.push(entity);
                rendered++;
            } else {
                culled++;
            }
            
            // Ограничение количества сущностей на кадр при троттлинге
            if (this.isThrottling && rendered >= this.settings.maxEntitiesPerFrame * this.throttleFactor) {
                break;
            }
        }
        
        this.metrics.entities.rendered = rendered;
        this.metrics.entities.culled = culled;
        this.metrics.entities.total = entities.length;
        
        return optimized;
    }

    // Определение, нужно ли рендерить сущность
    shouldRenderEntity(entity, camera) {
        if (!this.settings.enableCulling) return true;
        
        // Пространственное отсечение (frustum culling)
        if (!this.isEntityInViewport(entity, camera)) {
            return false;
        }
        
        // Level of Detail
        if (this.settings.enableLod) {
            const lodLevel = this.calculateLodLevel(entity, camera);
            if (lodLevel === 'low' && this.isThrottling) {
                return false; // Пропускаем мелкие объекты при низком FPS
            }
        }
        
        return true;
    }

    // Проверка видимости сущности в viewport'е камеры
    isEntityInViewport(entity, camera) {
        // Здесь должна быть логика проверки попадания сущности в поле зрения камеры
        // Для простоты возвращаем true - нужно реализовать на основе позиций и размеров
        return true;
    }

    // Вычисление уровня детализации (LOD)
    calculateLodLevel(entity, camera) {
        const distance = this.calculateDistanceToCamera(entity, camera);
        const screenSize = this.calculateScreenSize(entity, camera);
        
        if (screenSize < 10 || distance > 1000) return 'low';
        if (screenSize < 25 || distance > 500) return 'medium';
        return 'high';
    }

    // Вычисление расстояния до камеры
    calculateDistanceToCamera(entity, camera) {
        // Здесь должна быть логика расчета расстояния
        // Для простоты возвращаем 0
        return 0;
    }

    // Вычисление размера на экране
    calculateScreenSize(entity, camera) {
        // Здесь должна быть логика расчета размера сущности на экране
        // Для простоты возвращаем базовый размер
        return 50;
    }

    // Следует ли пропустить кадр (для троттлинга)
    shouldThrottle() {
        return this.settings.enableThrottling && this.isThrottling;
    }

    // Получить задержку для троттлинга
    getThrottleDelay() {
        if (!this.shouldThrottle()) return 0;
        
        const targetFrameTime = 1000 / this.settings.targetFps;
        const currentFrameTime = this.metrics.frameTime;
        
        return Math.max(0, targetFrameTime - currentFrameTime);
    }

    // Оптимизация качества рендеринга
    getRenderQuality() {
        if (this.isThrottling) {
            return {
                antialias: false,
                shadows: false,
                reflections: false,
                particles: false
            };
        }
        
        return {
            antialias: true,
            shadows: true,
            reflections: true,
            particles: true
        };
    }

    // Настройки оптимизации
    setSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        console.log('⚙️ Настройки производительности обновлены:', this.settings);
    }

    // Коллбэки для событий производительности
    on(event, callback) {
        if (event === 'lowPerformance') {
            this.onLowPerformance = callback;
        } else if (event === 'performanceRecover') {
            this.onPerformanceRecover = callback;
        }
    }

    // Получить текущие метрики
    getMetrics() {
        return { ...this.metrics };
    }

    // Сброс метрик
    resetMetrics() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.lastFpsUpdate = this.lastTime;
        
        this.metrics = {
            fps: 0,
            frameTime: 0,
            memory: { used: 0, total: 0, ratio: 0 },
            entities: { total: 0, rendered: 0, culled: 0 }
        };
    }

    // Создание отчета о производительности
    generateReport() {
        return {
            timestamp: new Date().toISOString(),
            metrics: this.getMetrics(),
            settings: this.settings,
            recommendations: this.getOptimizationRecommendations()
        };
    }

    // Рекомендации по оптимизации
    getOptimizationRecommendations() {
        const recommendations = [];
        
        if (this.metrics.fps < this.settings.lowFpsThreshold) {
            recommendations.push('Снизить качество графики');
            recommendations.push('Уменьшить количество отображаемых объектов');
            recommendations.push('Включить агрессивное отсечение');
        }
        
        if (this.metrics.memory.ratio > 0.8) {
            recommendations.push('Очистить кэш ассетов');
            recommendations.push('Уменьшить разрешение текстур');
        }
        
        return recommendations;
    }

    // Деструктор
    destroy() {
        this.onLowPerformance = null;
        this.onPerformanceRecover = null;
        console.log('🧹 PerformanceOptimizer уничтожен');
    }
}

export default PerformanceOptimizer;
