class GestureRecognizer {
    constructor() {
        this.gestures = new Map();
        this.activeGestures = new Set();
        this.setupGestureDefinitions();
    }

    setupGestureDefinitions() {
        // Определение жестов
        this.gestures.set('tap', {
            minTouches: 1,
            maxTouches: 1,
            maxDuration: 300,
            maxMovement: 10
        });

        this.gestures.set('double-tap', {
            minTouches: 1,
            maxTouches: 1,
            maxDuration: 300,
            maxMovement: 10,
            maxInterval: 500
        });

        this.gestures.set('pinch', {
            minTouches: 2,
            maxTouches: 2,
            minDuration: 50,
            requireOpposite: true
        });

        this.gestures.set('swipe', {
            minTouches: 1,
            maxTouches: 3,
            minDuration: 50,
            maxDuration: 800,
            minDistance: 30
        });

        this.gestures.set('long-press', {
            minTouches: 1,
            maxTouches: 1,
            minDuration: 800,
            maxMovement: 10
        });

        this.gestures.set('rotate', {
            minTouches: 2,
            maxTouches: 2,
            minDuration: 100,
            minAngle: 15
        });
    }

    recognize(touchEvents) {
        const recognized = [];
        
        for (const [gestureName, config] of this.gestures) {
            if (this.matchesGesture(touchEvents, config)) {
                recognized.push({
                    name: gestureName,
                    confidence: this.calculateConfidence(touchEvents, config),
                    data: this.extractGestureData(touchEvents, config)
                });
            }
        }

        return recognized.sort((a, b) => b.confidence - a.confidence);
    }

    matchesGesture(events, config) {
        // Проверка соответствия жесту
        if (events.length < config.minTouches) return false;
        if (events.length > config.maxTouches) return false;

        const duration = events[events.length - 1].timestamp - events[0].timestamp;
        if (config.maxDuration && duration > config.maxDuration) return false;
        if (config.minDuration && duration < config.minDuration) return false;

        // Дополнительные проверки для конкретных жестов
        switch (config.requireOpposite) {
            case true:
                return this.hasOppositeMovement(events);
            default:
                return true;
        }
    }

    calculateConfidence(events, config) {
        let confidence = 1.0;

        // Уменьшение уверенности на основе отклонений
        const duration = events[events.length - 1].timestamp - events[0].timestamp;
        if (config.maxDuration) {
            const durationRatio = duration / config.maxDuration;
            confidence *= Math.max(0, 1 - durationRatio);
        }

        return Math.min(1, Math.max(0, confidence));
    }

    extractGestureData(events, config) {
        const data = {
            startTime: events[0].timestamp,
            endTime: events[events.length - 1].timestamp,
            duration: events[events.length - 1].timestamp - events[0].timestamp,
            startPosition: { x: events[0].clientX, y: events[0].clientY },
            endPosition: { x: events[events.length - 1].clientX, y: events[events.length - 1].clientY }
        };

        // Дополнительные данные для специфических жестов
        if (config.minTouches === 2) {
            data.pinchScale = this.calculatePinchScale(events);
            data.rotation = this.calculateRotation(events);
        }

        return data;
    }

    calculatePinchScale(events) {
        const startDistance = this.calculateTouchDistance(events[0], events[1]);
        const endDistance = this.calculateTouchDistance(
            events[events.length - 2], 
            events[events.length - 1]
        );
        return endDistance / startDistance;
    }

    calculateRotation(events) {
        const startVector = {
            x: events[1].clientX - events[0].clientX,
            y: events[1].clientY - events[0].clientY
        };
        const endVector = {
            x: events[events.length - 1].clientX - events[events.length - 2].clientX,
            y: events[events.length - 1].clientY - events[events.length - 2].clientY
        };

        const startAngle = Math.atan2(startVector.y, startVector.x);
        const endAngle = Math.atan2(endVector.y, endVector.x);
        return (endAngle - startAngle) * (180 / Math.PI);
    }

    calculateTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    hasOppositeMovement(events) {
        // Проверка противоположного движения для pinch жеста
        if (events.length < 4) return false;

        const firstHalf = events.slice(0, Math.floor(events.length / 2));
        const secondHalf = events.slice(Math.floor(events.length / 2));

        const firstMovement = this.calculateAverageMovement(firstHalf);
        const secondMovement = this.calculateAverageMovement(secondHalf);

        return (firstMovement.x * secondMovement.x < 0) || 
               (firstMovement.y * secondMovement.y < 0);
    }

    calculateAverageMovement(events) {
        if (events.length < 2) return { x: 0, y: 0 };

        let totalX = 0, totalY = 0;
        for (let i = 1; i < events.length; i++) {
            totalX += events[i].clientX - events[i-1].clientX;
            totalY += events[i].clientY - events[i-1].clientY;
        }

        return {
            x: totalX / (events.length - 1),
            y: totalY / (events.length - 1)
        };
    }
}

class InteractionAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.interactions = [];
        this.metrics = {
            clicks: 0,
            hovers: 0,
            gestures: 0,
            zooms: 0,
            pans: 0,
            errors: 0
        };
        this.performance = {
            averageResponseTime: 0,
            frameRate: 0,
            memoryUsage: 0
        };
    }

    trackInteraction(type, data) {
        const interaction = {
            type,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            data,
            performance: this.getCurrentPerformance()
        };

        this.interactions.push(interaction);
        this.metrics[type] = (this.metrics[type] || 0) + 1;

        // Автосохранение каждые 50 взаимодействий
        if (this.interactions.length % 50 === 0) {
            this.saveToStorage();
        }
    }

    getCurrentPerformance() {
        return {
            responseTime: performance.now(),
            frameRate: this.calculateFrameRate(),
            memory: performance.memory ? performance.memory.usedJSHeapSize : 0
        };
    }

    calculateFrameRate() {
        // Упрощенный расчет FPS
        return Math.round(1000 / 16); // Примерное значение
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    saveToStorage() {
        try {
            const data = {
                sessionId: this.sessionId,
                interactions: this.interactions,
                metrics: this.metrics,
                timestamp: Date.now()
            };
            localStorage.setItem('genofond-interaction-analytics', JSON.stringify(data));
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить аналитику:', error);
        }
    }

    getHeatmapData() {
        const clicks = this.interactions.filter(i => i.type === 'click');
        const heatmap = {};

        clicks.forEach(click => {
            const pos = `${Math.round(click.data.x/10)*10},${Math.round(click.data.y/10)*10}`;
            heatmap[pos] = (heatmap[pos] || 0) + 1;
        });

        return heatmap;
    }

    getUserBehaviorPatterns() {
        const patterns = {
            frequentActions: this.findFrequentActions(),
            commonSequences: this.findCommonSequences(),
            preferredZoomLevels: this.findPreferredZoomLevels(),
            interactionIntensity: this.calculateInteractionIntensity()
        };

        return patterns;
    }

    findFrequentActions() {
        const actionCounts = {};
        this.interactions.forEach(interaction => {
            actionCounts[interaction.type] = (actionCounts[interaction.type] || 0) + 1;
        });

        return Object.entries(actionCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
    }

    findCommonSequences() {
        // Поиск общих последовательностей действий
        const sequences = {};
        for (let i = 0; i < this.interactions.length - 1; i++) {
            const sequence = `${this.interactions[i].type}->${this.interactions[i+1].type}`;
            sequences[sequence] = (sequences[sequence] || 0) + 1;
        }

        return Object.entries(sequences)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);
    }

    findPreferredZoomLevels() {
        const zooms = this.interactions
            .filter(i => i.type === 'zoom')
            .map(i => i.data.zoomLevel);

        return {
            average: zooms.reduce((a, b) => a + b, 0) / zooms.length,
            min: Math.min(...zooms),
            max: Math.max(...zooms),
            mostFrequent: this.findMode(zooms)
        };
    }

    calculateInteractionIntensity() {
        const sessionDuration = Date.now() - this.sessionStart;
        return this.interactions.length / (sessionDuration / 1000 / 60); // взаимодействий в минуту
    }

    findMode(array) {
        return array.sort((a,b) =>
            array.filter(v => v === a).length - array.filter(v => v === b).length
        ).pop();
    }
}

class GalaxyInteraction {
    constructor(app) {
        this.app = app;
        this.isInteracting = false;
        this.lastInteractionTime = 0;
        this.lastClickTime = 0;
        this.currentGesture = null;
        this.cursorPosition = { x: 0, y: 0 };
        
        // Улучшенная система камеры
        this.cameraState = {
            zoom: 1.0,
            position: { x: 0, y: 0 },
            target: null,
            isAnimating: false,
            velocity: { x: 0, y: 0 },
            bounds: { minX: -1000, maxX: 1000, minY: -800, maxY: 800 },
            history: [],
            maxHistorySize: 10
        };

        // Расширенная конфигурация
        this.config = {
            zoomSensitivity: 0.1,
            minZoom: 0.3,
            maxZoom: 3.0,
            zoomAnimationDuration: 800,
            hoverDelay: 150,
            doubleClickThreshold: 300,
            panSensitivity: 1.0,
            gestureThreshold: 10,
            enableInertia: true,
            inertiaDeceleration: 0.95,
            zoomSteps: [0.3, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0],
            enableSmoothZoom: true,
            smoothZoomFactor: 0.05,
            enablePredictiveLoading: true,
            predictiveLoadingDelay: 500,
            maxTouchPoints: 5,
            enableAccessibility: true,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };

        // Улучшенная система жестов
        this.gestureState = {
            isPinching: false,
            initialPinchDistance: 0,
            initialZoom: 1.0,
            lastTouchTime: 0,
            touchStartPositions: new Map(),
            swipeStart: null,
            activeTouches: 0,
            gestureRecognizer: new GestureRecognizer(),
            touchBuffer: []
        };

        // Система аналитики
        this.analytics = new InteractionAnalytics();

        // Оптимизации и кэши
        this.pendingOperations = new Map();
        this.animationFrameId = null;
        this.activeHoverTimeout = null;
        this.entityCache = new Map();
        this.inertiaAnimationId = null;
        this.predictiveLoadingTimeout = null;
        
        // Состояние доступности
        this.accessibility = {
            currentFocus: null,
            focusableEntities: new Set(),
            isKeyboardNavigating: false,
            screenReaderActive: false
        };

        console.log('🎮 GalaxyInteraction v2.1 инициализирован');
    }

    async init() {
        console.log('🎮 Инициализация GalaxyInteraction v2.1...');
        
        try {
            this.setupEventListeners();
            this.setupGestureRecognition();
            this.initializeCameraState();
            this.calculateCameraBounds();
            this.setupAccessibility();
            
            console.log('✅ GalaxyInteraction v2.1 инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации GalaxyInteraction:', error);
            throw error;
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        const container = this.getGalaxyContainer();
        if (!container) {
            console.error('❌ Контейнер галактики не найден');
            return;
        }

        // Мышиные события
        container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        container.addEventListener('mousemove', this.handleMouseMove.bind(this));
        container.addEventListener('mouseup', this.handleMouseUp.bind(this));
        container.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        container.addEventListener('contextmenu', this.handleContextMenu.bind(this));

        // Touch события
        container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        container.addEventListener('touchend', this.handleTouchEnd.bind(this));
        container.addEventListener('touchcancel', this.handleTouchCancel.bind(this));

        // Клавиатурные события
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // События видимости
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // События изменения размера
        window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 250));

        // Системные события
        document.addEventListener('galacticLevelChange', this.handleLevelChange.bind(this));
        document.addEventListener('contentLoaded', this.handleContentLoaded.bind(this));
        document.addEventListener('visibilityUpdated', this.handleVisibilityUpdated.bind(this));

        console.log('🎮 Обработчики событий установлены');
    }

    /**
     * Настройка распознавания жестов
     */
    setupGestureRecognition() {
        this.gestureState.gestureRecognizer = new GestureRecognizer();
        console.log('👆 Распознавание жестов настроено');
    }

    /**
     * Инициализация состояния камеры
     */
    initializeCameraState() {
        const galaxyBuilder = this.app.getComponent('galaxyBuilder');
        let bounds = { minX: -1000, maxX: 1000, minY: -800, maxY: 800 };
        
        if (galaxyBuilder) {
            // Получаем реальные границы галактики
            const entities = galaxyBuilder.getAllEntities();
            if (entities && entities.length > 0) {
                const positions = entities.map(e => e.position).filter(p => p);
                if (positions.length > 0) {
                    const xs = positions.map(p => p.x);
                    const ys = positions.map(p => p.y);
                    
                    bounds = {
                        minX: Math.min(...xs) - 20,
                        maxX: Math.max(...xs) + 20,
                        minY: Math.min(...ys) - 20,
                        maxY: Math.max(...ys) + 20
                    };
                }
            }
        }
        
        this.cameraState = {
            zoom: 1.0,
            position: { x: 0, y: 0 },
            target: null,
            isAnimating: false,
            velocity: { x: 0, y: 0 },
            bounds: bounds,
            history: [],
            maxHistorySize: 10
        };

        // Сохранение начального состояния в историю
        this.saveCameraState();
    }

    /**
     * Получение контейнера галактики
     */
    getGalaxyContainer() {
        return document.querySelector('.galaxy-universe') || document.body;
    }

    /**
     * Получение позиции события
     */
    getEventPosition(event) {
        if (event.type.includes('touch')) {
            const touch = event.touches[0] || event.changedTouches[0];
            return { x: touch.clientX, y: touch.clientY };
        }
        return { x: event.clientX, y: event.clientY };
    }

    /**
     * Обновление позиции курсора
     */
    updateCursorPosition(event) {
        const pos = this.getEventPosition(event);
        this.cursorPosition = pos;
    }

    /**
     * Получение сущности из события
     */
    getEntityFromEvent(event) {
        // Интеграция с GalaxyBuilder для получения сущности по позиции
        const element = event.target.closest('[data-entity-id]');
        if (element && this.app.getComponent) {
            const galaxyBuilder = this.app.getComponent('galaxyBuilder');
            if (galaxyBuilder && galaxyBuilder.getEntity) {
                const entityId = element.dataset.entityId;
                return galaxyBuilder.getEntity(entityId);
            }
        }
        return null;
    }

    /**
     * Получение сущности по позиции
     */
    getEntityAtPosition(x, y, tolerance = 50) {
        if (this.app.getComponent) {
            const galaxyBuilder = this.app.getComponent('galaxyBuilder');
            if (galaxyBuilder && galaxyBuilder.getEntityAtPosition) {
                // Конвертируем координаты в проценты относительно контейнера
                const container = this.getGalaxyContainer();
                if (container) {
                    const rect = container.getBoundingClientRect();
                    const percentX = ((x - rect.left) / rect.width) * 100;
                    const percentY = ((y - rect.top) / rect.height) * 100;
                    
                    return galaxyBuilder.getEntityAtPosition(percentX, percentY, tolerance);
                }
            }
        }
        return null;
    }

    /**
     * Обработка клика по сущности
     */
    handleEntityClick(entity) {
        if (!entity) return;

        const currentTime = Date.now();
        const timeSinceLastClick = currentTime - this.lastClickTime;

        // Защита от двойных кликов
        if (timeSinceLastClick < this.config.doubleClickThreshold) {
            console.log('🛡️ Защита от двойного клика');
            return;
        }

        this.lastClickTime = currentTime;

        // Отправка события активации сущности
        this.dispatchEvent('entityActivated', {
            entity,
            position: this.cursorPosition,
            timestamp: currentTime
        });

        // Аналитика
        this.analytics.trackInteraction('click', {
            entityId: entity.id,
            entityType: entity.type,
            position: this.cursorPosition
        });

        console.log(`🎯 Клик по сущности: ${entity.title}`);
    }

    /**
     * Обработка наведения на сущности
     */
    handleEntityHover(entity) {
        if (!entity) return;

        // Отправка события наведения
        this.dispatchEvent('entityHovered', {
            entity,
            position: this.cursorPosition,
            timestamp: Date.now()
        });

        // Предзагрузка контента при наведении
        if (this.config.enablePredictiveLoading) {
            this.schedulePredictiveLoading(entity);
        }

        // Аналитика
        this.analytics.trackInteraction('hover', {
            entityId: entity.id,
            entityType: entity.type,
            position: this.cursorPosition
        });
    }

    /**
     * Управление масштабированием
     */
    handleZoom(zoomLevel) {
        const clampedZoom = Math.max(this.config.minZoom, 
            Math.min(this.config.maxZoom, zoomLevel));

        if (clampedZoom === this.cameraState.zoom) return;

        this.cameraState.zoom = clampedZoom;
        this.constrainCameraPosition();

        this.dispatchEvent('zoomChanged', {
            zoomLevel: clampedZoom,
            isAnimating: false
        });

        this.updateZoomDisplay();
        this.updateCameraTransform();

        // Аналитика
        this.analytics.trackInteraction('zoom', {
            zoomLevel: clampedZoom,
            previousZoom: this.cameraState.zoom
        });
    }

    /**
     * Приближение камеры к сущности
     */
    cameraZoomToEntity(entity) {
        if (!entity || this.cameraState.isAnimating) return;

        const targetZoom = this.calculateOptimalZoom(entity);
        const targetPosition = this.calculateTargetPosition(entity);

        this.cameraState.target = entity;

        this.animateCameraTransition(targetPosition, targetZoom, () => {
            console.log(`🎯 Камера приближена к: ${entity.title}`);
            this.cameraState.target = null;
        });

        // Аналитика
        this.analytics.trackInteraction('zoomToEntity', {
            entityId: entity.id,
            targetZoom: targetZoom
        });
    }

    /**
     * Сброс камеры
     */
    cameraReset() {
        this.animateCameraTransition(
            { x: 0, y: 0 },
            1.0,
            () => console.log('🔄 Камера сброшена')
        );
    }

    /**
     * Обновление отображения зума
     */
    updateZoomDisplay() {
        const zoomDisplay = document.querySelector('.zoom-display');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(this.cameraState.zoom * 100)}%`;
        }
    }

    /**
     * Обновление трансформации камеры
     */
    updateCameraTransform() {
        const container = this.getGalaxyContainer();
        if (!container) return;

        const transform = `translate(${this.cameraState.position.x}px, ${this.cameraState.position.y}px) scale(${this.cameraState.zoom})`;
        
        container.style.transform = transform;
        container.style.transformOrigin = 'center center';

        // Оптимизация для производительности
        container.style.willChange = 'transform';
    }

    /**
     * Сброс состояния жестов
     */
    resetGestureState() {
        this.gestureState = {
            isPinching: false,
            initialPinchDistance: 0,
            initialZoom: 1.0,
            lastTouchTime: 0,
            touchStartPositions: new Map(),
            swipeStart: null,
            activeTouches: 0,
            gestureRecognizer: this.gestureState.gestureRecognizer,
            touchBuffer: []
        };
    }

    // ОБРАБОТЧИКИ СОБЫТИЙ

    handleMouseDown(event) {
        event.preventDefault();
        this.updateCursorPosition(event);
        this.isInteracting = true;

        const entity = this.getEntityFromEvent(event);
        if (entity) {
            if (event.button === 0) { // Левая кнопка
                this.handleEntityClick(entity);
            } else if (event.button === 1) { // Средняя кнопка
                this.handleMiddleMouseDown(event);
            }
        }

        this.dispatchEvent('interactionStarted', { type: 'mouse', event });
    }

    handleMouseMove(event) {
        this.updateCursorPosition(event);
        
        const entity = this.getEntityFromEvent(event);
        if (entity && this.isInteracting) {
            this.handleEntityHover(entity);
        }

        // Панорамирование при зажатой средней кнопке
        if (event.buttons === 4) {
            this.handlePan(event.movementX, event.movementY);
        }
    }

    handleMouseUp(event) {
        this.isInteracting = false;
        this.dispatchEvent('interactionEnded', { type: 'mouse', event });
    }

    handleTouchStart(event) {
        event.preventDefault();
        this.updateCursorPosition(event);

        const touches = Array.from(event.touches);
        this.gestureState.activeTouches = touches.length;

        // Сохранение начальных позиций
        touches.forEach((touch, index) => {
            this.gestureState.touchStartPositions.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY,
                timestamp: Date.now()
            });
        });

        // Буферизация жестов
        this.gestureState.touchBuffer.push(...touches.map(touch => ({
            clientX: touch.clientX,
            clientY: touch.clientY,
            timestamp: Date.now(),
            identifier: touch.identifier
        })));

        this.dispatchEvent('interactionStarted', { type: 'touch', event });
    }

    handleTouchMove(event) {
        event.preventDefault();
        this.updateCursorPosition(event);

        const touches = Array.from(event.touches);
        
        // Обработка multi-touch жестов
        if (touches.length === 2) {
            this.handlePinchGesture(touches);
        } else if (touches.length === 1) {
            this.handleSwipeGesture(touches[0]);
        }

        // Обновление буфера жестов
        this.gestureState.touchBuffer.push(...touches.map(touch => ({
            clientX: touch.clientX,
            clientY: touch.clientY,
            timestamp: Date.now(),
            identifier: touch.identifier
        })));

        // Ограничение размера буфера
        if (this.gestureState.touchBuffer.length > 20) {
            this.gestureState.touchBuffer = this.gestureState.touchBuffer.slice(-20);
        }
    }

    handleTouchEnd(event) {
        const endedTouches = Array.from(event.changedTouches);
        
        // Распознавание жестов
        const recognizedGestures = this.gestureState.gestureRecognizer.recognize(
            this.gestureState.touchBuffer
        );

        if (recognizedGestures.length > 0) {
            this.handleRecognizedGesture(recognizedGestures[0]);
        }

        // Очистка завершенных касаний
        endedTouches.forEach(touch => {
            this.gestureState.touchStartPositions.delete(touch.identifier);
        });

        this.gestureState.activeTouches = event.touches.length;
        this.gestureState.touchBuffer = [];

        this.dispatchEvent('interactionEnded', { type: 'touch', event });
    }

    handleTouchCancel(event) {
        this.handleTouchEnd(event);
    }

    handleWheel(event) {
        event.preventDefault();
        
        const delta = -Math.sign(event.deltaY);
        const zoomFactor = 1 + delta * this.config.zoomSensitivity;
        const newZoom = this.cameraState.zoom * zoomFactor;
        
        this.handleZoom(newZoom);
    }

    handleContextMenu(event) {
        event.preventDefault();
        
        const entity = this.getEntityFromEvent(event);
        if (entity) {
            this.dispatchEvent('entityContextMenu', {
                entity,
                position: this.getEventPosition(event)
            });
        }
    }

    handleKeyDown(event) {
        this.accessibility.isKeyboardNavigating = true;

        switch (event.key) {
            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                event.preventDefault();
                this.handleArrowKeys(event);
                break;
            case '+':
            case '=':
                event.preventDefault();
                this.handleStepZoom(1);
                break;
            case '-':
                event.preventDefault();
                this.handleStepZoom(-1);
                break;
            case '0':
                event.preventDefault();
                this.cameraReset();
                break;
            case 'Escape':
                this.handleEscapeKey();
                break;
            case 'Tab':
                this.handleTabKey(event);
                break;
        }

        this.analytics.trackInteraction('keyboard', { key: event.key, code: event.code });
    }

    handleKeyUp(event) {
        if (!event.shiftKey && !event.ctrlKey && !event.altKey) {
            this.accessibility.isKeyboardNavigating = false;
        }
    }

    handleArrowKeys(event) {
        const panAmount = 50 / this.cameraState.zoom;
        
        switch (event.key) {
            case 'ArrowUp':
                this.handlePan(0, panAmount);
                break;
            case 'ArrowDown':
                this.handlePan(0, -panAmount);
                break;
            case 'ArrowLeft':
                this.handlePan(panAmount, 0);
                break;
            case 'ArrowRight':
                this.handlePan(-panAmount, 0);
                break;
        }
    }

    handleEscapeKey() {
        this.dispatchEvent('escapePressed');
    }

    handleTabKey(event) {
        this.handleKeyboardNavigation(event);
    }

    handleResize() {
        this.calculateCameraBounds();
        this.constrainCameraPosition();
        this.updateCameraTransform();
    }

    handleLevelChange(event) {
        const { levelId } = event.detail;
        console.log('Level changed to:', levelId);
        
        // Обновляем состояние на основе нового уровня
        this.dispatchEvent('interactionLevelChanged', { levelId });
    }

    handleContentLoaded(event) {
        const { entityId, content } = event.detail;
        console.log('Content loaded for:', entityId);
        
        // Обновляем кэш сущностей
        this.clearEntityCache();
    }

    handleVisibilityUpdated(event) {
        const { visibleEntities } = event.detail;
        
        // Оптимизируем взаимодействия на основе видимости
        this.optimizeForVisibleEntities(visibleEntities);
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Приостанавливаем анимации при скрытии вкладки
            if (this.inertiaAnimationId) {
                cancelAnimationFrame(this.inertiaAnimationId);
                this.inertiaAnimationId = null;
            }
        }
    }

    // ОБРАБОТЧИКИ ЖЕСТОВ

    handlePinchGesture(touches) {
        if (touches.length !== 2) return;
        
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        const currentDistance = this.calculateTouchDistance(touch1, touch2);
        
        if (!this.gestureState.isPinching) {
            this.gestureState.isPinching = true;
            this.gestureState.initialPinchDistance = currentDistance;
            this.gestureState.initialZoom = this.cameraState.zoom;
        } else {
            const scale = currentDistance / this.gestureState.initialPinchDistance;
            const newZoom = this.gestureState.initialZoom * scale;
            this.handleZoom(newZoom);
        }
    }

    handleSwipeGesture(touch) {
        // Базовая реализация свайпа
        if (!this.gestureState.swipeStart) {
            this.gestureState.swipeStart = {
                x: touch.clientX,
                y: touch.clientY,
                timestamp: Date.now()
            };
            return;
        }
        
        const deltaX = touch.clientX - this.gestureState.swipeStart.x;
        const deltaY = touch.clientY - this.gestureState.swipeStart.y;
        
        // Панорамирование при свайпе
        this.handlePan(-deltaX * 0.5, -deltaY * 0.5);
        
        // Обновляем начальную позицию для плавного движения
        this.gestureState.swipeStart = {
            x: touch.clientX,
            y: touch.clientY,
            timestamp: Date.now()
        };
    }

    handleRecognizedGesture(gesture) {
        console.log('Gesture recognized:', gesture);
        
        switch (gesture.name) {
            case 'tap':
                this.handleGestureTap(gesture);
                break;
            case 'double-tap':
                this.handleGestureDoubleTap(gesture);
                break;
            case 'pinch':
                this.handleGesturePinch(gesture);
                break;
            case 'swipe':
                this.handleGestureSwipe(gesture);
                break;
            case 'long-press':
                this.handleGestureLongPress(gesture);
                break;
            case 'rotate':
                this.handleGestureRotate(gesture);
                break;
        }
    }

    handleGestureTap(gesture) {
        const entity = this.getEntityAtPosition(
            gesture.data.endPosition.x, 
            gesture.data.endPosition.y
        );
        if (entity) {
            this.handleEntityClick(entity);
        }
    }

    handleGestureDoubleTap(gesture) {
        const entity = this.getEntityAtPosition(
            gesture.data.endPosition.x, 
            gesture.data.endPosition.y
        );
        if (entity) {
            this.cameraZoomToEntity(entity);
        } else {
            // Сброс камеры при двойном тапе на пустом месте
            this.cameraReset();
        }
    }

    handleGesturePinch(gesture) {
        if (gesture.data.pinchScale) {
            const newZoom = this.cameraState.zoom * gesture.data.pinchScale;
            this.handleZoom(newZoom);
        }
    }

    handleGestureSwipe(gesture) {
        const deltaX = gesture.data.endPosition.x - gesture.data.startPosition.x;
        const deltaY = gesture.data.endPosition.y - gesture.data.startPosition.y;
        
        this.handlePan(-deltaX * 0.1, -deltaY * 0.1);
    }

    handleGestureLongPress(gesture) {
        const entity = this.getEntityAtPosition(
            gesture.data.endPosition.x, 
            gesture.data.endPosition.y
        );
        if (entity) {
            this.dispatchEvent('entityLongPress', {
                entity,
                position: gesture.data.endPosition,
                duration: gesture.data.duration
            });
        }
    }

    handleGestureRotate(gesture) {
        if (gesture.data.rotation) {
            this.dispatchEvent('viewRotated', {
                rotation: gesture.data.rotation,
                center: gesture.data.endPosition
            });
        }
    }

    // СИСТЕМА ДОСТУПНОСТИ

    /**
     * Настройка доступности
     */
    setupAccessibility() {
        if (!this.config.enableAccessibility) return;

        // Обнаружение screen reader
        this.accessibility.screenReaderActive = this.detectScreenReader();

        // Настройка ARIA атрибутов
        this.setupAriaAttributes();

        // Обработчик для reduced motion
        if (this.config.reducedMotion) {
            this.config.zoomAnimationDuration = 0;
            this.config.enableInertia = false;
        }

        console.log('♿ Система доступности настроена');
    }

    detectScreenReader() {
        // Упрощенное обнаружение screen reader
        return !!(window.getComputedStyle(document.body).getPropertyValue('speak') ||
                 window.getComputedStyle(document.body).getPropertyValue('aria-hidden') === 'false');
    }

    setupAriaAttributes() {
        const container = this.getGalaxyContainer();
        if (!container) return;

        container.setAttribute('role', 'application');
        container.setAttribute('aria-label', 'Интерактивная галактика знаний BIOAPGREID');
        container.setAttribute('aria-describedby', 'galaxy-description');

        // Создание описания для screen readers
        if (!document.getElementById('galaxy-description')) {
            const description = document.createElement('div');
            description.id = 'galaxy-description';
            description.className = 'sr-only';
            description.textContent = 'Используйте мышь для навигации по галактике, колесо мыши для масштабирования, клавиши стрелок для перемещения.';
            document.body.appendChild(description);
        }
    }

    handleKeyboardNavigation(event) {
        const entities = Array.from(this.accessibility.focusableEntities);
        const currentIndex = entities.indexOf(this.accessibility.currentFocus);

        if (event.shiftKey) {
            // Обратная навигация
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : entities.length - 1;
            this.setFocus(entities[prevIndex]);
        } else {
            // Прямая навигация
            const nextIndex = currentIndex < entities.length - 1 ? currentIndex + 1 : 0;
            this.setFocus(entities[nextIndex]);
        }

        event.preventDefault();
    }

    setFocus(entity) {
        if (this.accessibility.currentFocus) {
            this.accessibility.currentFocus.element.setAttribute('tabindex', '-1');
        }

        this.accessibility.currentFocus = entity;
        entity.element.setAttribute('tabindex', '0');
        entity.element.focus();

        // Прокрутка к сфокусированному элементу
        entity.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // МЕТОДЫ УПРАВЛЕНИЯ КАМЕРОЙ

    /**
     * Панорамирование
     */
    handlePan(deltaX, deltaY) {
        if (this.cameraState.isAnimating) return;
        
        const sensitivity = this.config.panSensitivity / this.cameraState.zoom;
        this.cameraState.position.x += deltaX * sensitivity;
        this.cameraState.position.y += deltaY * sensitivity;
        
        this.constrainCameraPosition();
        this.updateCameraTransform();
        
        // Сохраняем состояние для инерции
        if (this.config.enableInertia) {
            this.cameraState.velocity = {
                x: deltaX * sensitivity * 0.1,
                y: deltaY * sensitivity * 0.1
            };
        }
    }

    /**
     * Пошаговое масштабирование
     */
    handleStepZoom(direction) {
        const currentZoom = this.cameraState.zoom;
        let newZoom;
        
        if (direction > 0) {
            // Увеличение
            newZoom = currentZoom * (1 + this.config.zoomSensitivity);
        } else {
            // Уменьшение
            newZoom = currentZoom * (1 - this.config.zoomSensitivity);
        }
        
        this.handleZoom(newZoom);
    }

    /**
     * Расчет оптимального зума для сущности
     */
    calculateOptimalZoom(entity) {
        const baseZoom = 1.0;
        const entitySizeFactor = this.getEntitySizeFactor(entity);
        const importanceFactor = this.getEntityImportanceFactor(entity);
        
        return Math.min(
            this.config.maxZoom,
            baseZoom * entitySizeFactor * importanceFactor
        );
    }

    /**
     * Фактор размера сущности
     */
    getEntitySizeFactor(entity) {
        const sizeFactors = {
            'galaxy': 0.4,
            'planet': 1.2,
            'moon': 1.5,
            'asteroid': 2.0,
            'debris': 2.5,
            'blackhole': 0.8,
            'nebula': 0.6,
            'station': 1.3,
            'gateway': 1.1,
            'anomaly': 1.4
        };
        return sizeFactors[entity.type] || 1.0;
    }

    /**
     * Фактор важности сущности
     */
    getEntityImportanceFactor(entity) {
        const importanceFactors = {
            'high': 1.5,
            'medium': 1.0,
            'low': 0.7
        };
        return importanceFactors[entity.importance] || 1.0;
    }

    /**
     * Расчет целевой позиции для сущности
     */
    calculateTargetPosition(entity) {
        if (!entity.position) return { x: 0, y: 0 };
        
        // Конвертируем процентные координаты в пиксельные относительно центра
        const container = this.getGalaxyContainer();
        if (!container) return entity.position;
        
        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Вычисляем смещение для центрирования сущности
        const targetX = centerX - (entity.position.x * rect.width / 100);
        const targetY = centerY - (entity.position.y * rect.height / 100);
        
        return {
            x: targetX / this.cameraState.zoom,
            y: targetY / this.cameraState.zoom
        };
    }

    /**
     * Анимация перехода камеры
     */
    animateCameraTransition(targetPosition, targetZoom, onComplete) {
        if (this.cameraState.isAnimating) return;
        
        this.cameraState.isAnimating = true;
        this.cameraState.target = targetPosition;
        
        const startPosition = { ...this.cameraState.position };
        const startZoom = this.cameraState.zoom;
        const startTime = performance.now();
        const duration = this.config.zoomAnimationDuration;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Применяем easing функцию
            const easeProgress = this.easeOutCubic(progress);
            
            // Интерполируем позицию и зум
            this.cameraState.position.x = startPosition.x + (targetPosition.x - startPosition.x) * easeProgress;
            this.cameraState.position.y = startPosition.y + (targetPosition.y - startPosition.y) * easeProgress;
            this.cameraState.zoom = startZoom + (targetZoom - startZoom) * easeProgress;
            
            this.constrainCameraPosition();
            this.updateCameraTransform();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.cameraState.isAnimating = false;
                if (onComplete) onComplete();
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Ограничение позиции камеры
     */
    constrainCameraPosition() {
        const zoom = this.cameraState.zoom;
        const bounds = this.cameraState.bounds;
        
        // Вычисляем эффективные границы с учетом зума
        const effectiveBounds = {
            minX: bounds.minX * zoom,
            maxX: bounds.maxX * zoom,
            minY: bounds.minY * zoom,
            maxY: bounds.maxY * zoom
        };
        
        this.cameraState.position.x = Math.max(
            effectiveBounds.minX, 
            Math.min(effectiveBounds.maxX, this.cameraState.position.x)
        );
        this.cameraState.position.y = Math.max(
            effectiveBounds.minY, 
            Math.min(effectiveBounds.maxY, this.cameraState.position.y)
        );
    }

    /**
     * Расчет границ камеры
     */
    calculateCameraBounds() {
        const container = this.getGalaxyContainer();
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        
        // Границы рассчитываются относительно размера контейнера
        this.cameraState.bounds = {
            minX: -rect.width * 0.5,
            maxX: rect.width * 0.5,
            minY: -rect.height * 0.5,
            maxY: rect.height * 0.5
        };
    }

    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ

    /**
     * Обработка средней кнопки мыши
     */
    handleMiddleMouseDown(event) {
        // Активируем режим панорамирования
        this.isPanning = true;
        this.panStartPosition = this.getEventPosition(event);
        
        // Изменяем курсор
        const container = this.getGalaxyContainer();
        if (container) {
            container.style.cursor = 'grabbing';
        }
        
        event.preventDefault();
    }

    /**
     * Расчет расстояния между касаниями
     */
    calculateTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Планирование предиктивной загрузки
     */
    schedulePredictiveLoading(entity) {
        if (this.predictiveLoadingTimeout) {
            clearTimeout(this.predictiveLoadingTimeout);
        }

        this.predictiveLoadingTimeout = setTimeout(() => {
            this.preloadRelatedContent(entity);
        }, this.config.predictiveLoadingDelay);
    }

    /**
     * Предзагрузка связанного контента
     */
    preloadRelatedContent(entity) {
        // Предзагрузка связанного контента через ContentManager
        if (this.app.contentManager) {
            this.app.contentManager.preloadRelatedContent(entity.id)
                .then(() => console.log(`🔮 Предзагружен контент для: ${entity.title}`))
                .catch(error => console.warn('⚠️ Ошибка предзагрузки:', error));
        }
    }

    /**
     * Оптимизация для видимых сущностей
     */
    optimizeForVisibleEntities(visibleEntities) {
        // Очищаем кэш для невидимых сущностей
        this.entityCache.forEach((cachedEntity, entityId) => {
            if (!visibleEntities.some(ve => ve.level === entityId)) {
                this.entityCache.delete(entityId);
            }
        });
    }

    /**
     * Очистка кэша сущностей
     */
    clearEntityCache() {
        this.entityCache.clear();
    }

    /**
     * Сохранение состояния камеры
     */
    saveCameraState() {
        this.cameraState.history.push({
            position: { ...this.cameraState.position },
            zoom: this.cameraState.zoom,
            timestamp: Date.now()
        });

        // Ограничение размера истории
        if (this.cameraState.history.length > this.cameraState.maxHistorySize) {
            this.cameraState.history.shift();
        }
    }

    /**
     * Восстановление состояния камеры
     */
    restoreCameraState() {
        if (this.cameraState.history.length === 0) return;

        const previousState = this.cameraState.history.pop();
        this.animateCameraTransition(
            previousState.position,
            previousState.zoom,
            () => console.log('📷 Состояние камеры восстановлено')
        );
    }

    /**
     * Easing функция
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Дебаунс функция
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Троттлинг функция
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // ПУБЛИЧНОЕ API

    setZoom(zoomLevel) {
        this.handleZoom(zoomLevel);
    }

    getZoom() {
        return this.cameraState.zoom;
    }

    getCameraState() {
        return { ...this.cameraState };
    }

    focusOnEntity(entityId) {
        const galaxyBuilder = this.app.getComponent('galaxyBuilder');
        if (galaxyBuilder) {
            const entity = galaxyBuilder.getEntity(entityId);
            if (entity) {
                this.cameraZoomToEntity(entity);
            }
        }
    }

    enableInteractions() {
        this.isInteracting = true;
    }

    disableInteractions() {
        this.isInteracting = false;
    }

    getAnalytics() {
        return {
            metrics: this.analytics.metrics,
            heatmap: this.analytics.getHeatmapData(),
            patterns: this.analytics.getUserBehaviorPatterns()
        };
    }

    dispatchEvent(eventName, detail) {
        try {
            const event = new CustomEvent(eventName, { detail });
            document.dispatchEvent(event);
        } catch (error) {
            console.error(`❌ Ошибка отправки события ${eventName}:`, error);
        }
    }

    // УНИЧТОЖЕНИЕ ЭКЗЕМПЛЯРА

    destroy() {
        console.log('🧹 Уничтожение GalaxyInteraction v2.1...');
        
        // Остановка всех анимаций
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        if (this.inertiaAnimationId) {
            cancelAnimationFrame(this.inertiaAnimationId);
        }
        
        if (this.activeHoverTimeout) {
            clearTimeout(this.activeHoverTimeout);
        }

        if (this.predictiveLoadingTimeout) {
            clearTimeout(this.predictiveLoadingTimeout);
        }
        
        // Очистка кэшей
        this.clearEntityCache();
        this.pendingOperations.clear();
        
        // Сброс состояний
        this.resetGestureState();
        this.initializeCameraState();
        
        // Удаление обработчиков событий
        const container = this.getGalaxyContainer();
        if (container) {
            const newContainer = container.cloneNode(true);
            container.parentNode.replaceChild(newContainer, container);
        }
        
        // Сохранение аналитики
        this.analytics.saveToStorage();
        
        console.log('✅ GalaxyInteraction v2.1 уничтожен');
    }
}

// Глобальная доступность для инициализации
window.GalaxyInteraction = GalaxyInteraction;
