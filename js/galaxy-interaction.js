class GalaxyInteraction {
    constructor(app) {
        this.app = app;
        this.isInteracting = false;
        this.lastInteractionTime = 0;
        this.lastClickTime = 0;
        this.currentGesture = null;
        this.cursorPosition = { x: 0, y: 0 };
        this.cameraState = {
            zoom: 1.0,
            position: { x: 0, y: 0 },
            target: null,
            isAnimating: false,
            velocity: { x: 0, y: 0 },
            bounds: { minX: -1000, maxX: 1000, minY: -800, maxY: 800 } // 🆕 Границы камеры
        };

        // Конфигурация взаимодействий
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
            zoomSteps: [0.3, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0], // 🆕 Дискретные шаги зума
            enableSmoothZoom: true, // 🆕 Плавный зум
            smoothZoomFactor: 0.05 // 🆕 Фактор плавного зума
        };

        // Состояния жестов
        this.gestureState = {
            isPinching: false,
            initialPinchDistance: 0,
            initialZoom: 1.0,
            lastTouchTime: 0,
            touchStartPositions: new Map(),
            swipeStart: null,
            activeTouches: 0 // 🆕 Количество активных касаний
        };

        // Оптимизации
        this.pendingOperations = new Map();
        this.animationFrameId = null;
        this.activeHoverTimeout = null;
        this.entityCache = new Map(); // 🆕 Кэш элементов сущностей
        this.inertiaAnimationId = null; // 🆕 ID анимации инерции
    }

    async init() {
        console.log('🎮 Инициализация GalaxyInteraction...');
        
        try {
            this.setupEventListeners();
            this.setupGestureRecognition();
            this.initializeCameraState();
            this.calculateCameraBounds(); // 🆕 Расчет границ камеры
            
            console.log('✅ GalaxyInteraction инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации GalaxyInteraction:', error);
            throw error;
        }
    }

    // 🆕 РЕАЛИЗАЦИЯ ЗАГЛУШЕК И УЛУЧШЕНИЯ

    getCursorPosition() {
        // 🆕 Реальная реализация получения позиции курсора
        return {
            x: this.cursorPosition.x,
            y: this.cursorPosition.y,
            relative: this.getRelativeCursorPosition(),
            world: this.screenToWorldCoordinates(this.cursorPosition.x, this.cursorPosition.y)
        };
    }

    getRelativeCursorPosition() {
        // 🆕 Позиция курсора относительно галактики
        const container = this.getGalaxyContainer();
        if (!container) return { x: 0, y: 0 };
        
        const rect = container.getBoundingClientRect();
        return {
            x: this.cursorPosition.x - rect.left,
            y: this.cursorPosition.y - rect.top
        };
    }

    screenToWorldCoordinates(screenX, screenY) {
        // 🆕 Преобразование экранных координат в мировые
        return {
            x: (screenX - this.cameraState.position.x) / this.cameraState.zoom,
            y: (screenY - this.cameraState.position.y) / this.cameraState.zoom
        };
    }

    worldToScreenCoordinates(worldX, worldY) {
        // 🆕 Преобразование мировых координат в экранные
        return {
            x: (worldX * this.cameraState.zoom) + this.cameraState.position.x,
            y: (worldY * this.cameraState.zoom) + this.cameraState.position.y
        };
    }

    updateCursorPosition(event) {
        // 🆕 Обновление позиции курсора
        const pos = this.getEventPosition(event);
        this.cursorPosition.x = pos.x;
        this.cursorPosition.y = pos.y;
        
        // Отправка события обновления позиции курсора
        this.dispatchEvent('cursorMoved', {
            position: this.getCursorPosition(),
            entity: this.getEntityFromEvent(event)
        });
    }

    calculateCameraBounds() {
        // 🆕 Расчет границ камеры на основе размера галактики
        const container = this.getGalaxyContainer();
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const padding = 200; // Отступ от краев
        
        this.cameraState.bounds = {
            minX: -rect.width + padding,
            maxX: rect.width - padding,
            minY: -rect.height + padding,
            maxY: rect.height - padding
        };
    }

    constrainCameraPosition() {
        // 🆕 Ограничение позиции камеры в пределах границ
        const bounds = this.cameraState.bounds;
        
        this.cameraState.position.x = Math.max(bounds.minX, 
            Math.min(bounds.maxX, this.cameraState.position.x));
        this.cameraState.position.y = Math.max(bounds.minY, 
            Math.min(bounds.maxY, this.cameraState.position.y));
    }

    calculateOptimalZoom(entity) {
        // 🆕 Улучшенный расчет оптимального зума
        const baseZooms = {
            planet: 1.5,
            moon: 2.0,
            asteroid: 2.5,
            debris: 3.0,
            blackhole: 1.2
        };
        
        let optimalZoom = baseZooms[entity.type] || 1.5;
        
        // Учет размера сущности
        if (entity.sizeModifier) {
            optimalZoom *= parseFloat(entity.sizeModifier);
        }
        
        // Учет важности
        if (entity.importance === 'high') {
            optimalZoom *= 0.8; // Ближе для важных сущностей
        }
        
        return Math.max(this.config.minZoom, 
            Math.min(this.config.maxZoom, optimalZoom));
    }

    calculateTargetPosition(entity) {
        // 🆕 Улучшенный расчет целевой позиции с учетом текущего зума
        if (!entity.position) return { x: 0, y: 0 };
        
        const viewportCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };
        
        // Текущая позиция сущности на экране
        const currentScreenPos = this.worldToScreenCoordinates(
            entity.position.x, 
            entity.position.y
        );
        
        // Смещение для центрирования
        const offsetX = viewportCenter.x - currentScreenPos.x;
        const offsetY = viewportCenter.y - currentScreenPos.y;
        
        return {
            x: this.cameraState.position.x + offsetX,
            y: this.cameraState.position.y + offsetY
        };
    }

    getEntityFromEvent(event) {
        // 🆕 Улучшенный поиск сущности с кэшированием
        const element = event.target.closest('.celestial-body');
        if (!element || !element.dataset.entityId) return null;

        const entityId = element.dataset.entityId;
        
        // Проверка кэша
        if (this.entityCache.has(entityId)) {
            return this.entityCache.get(entityId);
        }

        // Поиск через GalaxyBuilder
        const galaxyBuilder = this.app.getComponent('galaxyBuilder');
        const entity = galaxyBuilder ? galaxyBuilder.getEntity(entityId) : null;
        
        if (entity) {
            this.entityCache.set(entityId, entity);
        }
        
        return entity;
    }

    // 🆕 НОВЫЕ МЕТОДЫ ДЛЯ УЛУЧШЕННОГО ВЗАИМОДЕЙСТВИЯ

    handleSmoothZoom(delta, focalPoint = null) {
        // 🆕 Плавный зум с фокальной точкой
        if (!this.config.enableSmoothZoom) {
            this.handleZoom(this.cameraState.zoom + delta);
            return;
        }

        const zoomFactor = 1 + (delta * this.config.smoothZoomFactor);
        const newZoom = this.cameraState.zoom * zoomFactor;
        const clampedZoom = Math.max(this.config.minZoom, 
            Math.min(this.config.maxZoom, newZoom));

        if (focalPoint && clampedZoom !== this.cameraState.zoom) {
            // Зум относительно точки фокуса
            const zoomRatio = clampedZoom / this.cameraState.zoom;
            const worldPos = this.screenToWorldCoordinates(focalPoint.x, focalPoint.y);
            
            this.cameraState.position.x = focalPoint.x - worldPos.x * zoomRatio;
            this.cameraState.position.y = focalPoint.y - worldPos.y * zoomRatio;
        }

        this.cameraState.zoom = clampedZoom;
        this.constrainCameraPosition();
        
        this.dispatchEvent('zoomChanged', { 
            zoomLevel: clampedZoom,
            isAnimating: false,
            focalPoint: focalPoint
        });

        this.updateZoomDisplay();
        this.updateCameraTransform();
    }

    handleStepZoom(direction) {
        // 🆕 Пошаговый зум
        const currentZoom = this.cameraState.zoom;
        const steps = this.config.zoomSteps;
        let targetZoom = currentZoom;
        
        if (direction > 0) {
            // Увеличение
            for (let zoom of steps) {
                if (zoom > currentZoom) {
                    targetZoom = zoom;
                    break;
                }
            }
        } else {
            // Уменьшение
            for (let i = steps.length - 1; i >= 0; i--) {
                if (steps[i] < currentZoom) {
                    targetZoom = steps[i];
                    break;
                }
            }
        }
        
        this.handleZoom(targetZoom);
    }

    handleWheel(event) {
        event.preventDefault();

        const delta = event.deltaMode === 0 ? event.deltaY * 0.01 : event.deltaY;
        const focalPoint = this.getEventPosition(event);
        
        if (event.ctrlKey || event.metaKey) {
            // Плавный зум с фокальной точкой
            this.handleSmoothZoom(-delta, focalPoint);
        } else {
            // Стандартный зум
            const zoomDelta = delta > 0 ? -this.config.zoomSensitivity : this.config.zoomSensitivity;
            this.handleZoom(this.cameraState.zoom + zoomDelta);
        }
    }

    handlePan(deltaX, deltaY) {
        if (this.cameraState.isAnimating) return;

        // 🆕 Остановка инерции при новом взаимодействии
        if (this.inertiaAnimationId) {
            cancelAnimationFrame(this.inertiaAnimationId);
            this.inertiaAnimationId = null;
            this.cameraState.velocity = { x: 0, y: 0 };
        }

        const adjustedDeltaX = deltaX * this.config.panSensitivity / this.cameraState.zoom;
        const adjustedDeltaY = deltaY * this.config.panSensitivity / this.cameraState.zoom;

        this.cameraState.position.x += adjustedDeltaX;
        this.cameraState.position.y += adjustedDeltaY;
        
        // 🆕 Ограничение позиции камеры
        this.constrainCameraPosition();

        if (this.config.enableInertia) {
            this.cameraState.velocity.x = adjustedDeltaX;
            this.cameraState.velocity.y = adjustedDeltaY;
        }

        this.dispatchEvent('cameraMoved', {
            position: this.cameraState.position,
            delta: { x: adjustedDeltaX, y: adjustedDeltaY },
            velocity: this.cameraState.velocity
        });

        this.updateCameraTransform();
    }

    applyInertia() {
        // 🆕 Улучшенная инерция с проверкой границ
        if (this.inertiaAnimationId) {
            cancelAnimationFrame(this.inertiaAnimationId);
        }

        const applyInertiaFrame = () => {
            // Проверка на необходимость остановки
            if (Math.abs(this.cameraState.velocity.x) < 0.1 && 
                Math.abs(this.cameraState.velocity.y) < 0.1) {
                this.cameraState.velocity = { x: 0, y: 0 };
                this.inertiaAnimationId = null;
                return;
            }

            this.cameraState.velocity.x *= this.config.inertiaDeceleration;
            this.cameraState.velocity.y *= this.config.inertiaDeceleration;
            
            this.cameraState.position.x += this.cameraState.velocity.x;
            this.cameraState.position.y += this.cameraState.velocity.y;
            
            // 🆕 Ограничение при инерции
            this.constrainCameraPosition();
            
            this.updateCameraTransform();
            
            this.inertiaAnimationId = requestAnimationFrame(applyInertiaFrame);
        };
        
        this.inertiaAnimationId = requestAnimationFrame(applyInertiaFrame);
    }

    // 🆕 УЛУЧШЕННЫЕ МЕТОДЫ АНИМАЦИИ

    animateCameraTransition(targetPosition, targetZoom, onComplete) {
        // 🆕 Улучшенная анимация с возможностью прерывания
        if (this.cameraState.isAnimating) {
            // Прерываем текущую анимацию
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
        }

        this.cameraState.isAnimating = true;
        this.cameraState.velocity = { x: 0, y: 0 }; // Сброс инерции

        const startPosition = { ...this.cameraState.position };
        const startZoom = this.cameraState.zoom;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / this.config.zoomAnimationDuration, 1);
            
            // 🆕 Динамическая easing-функция
            const easeProgress = this.easeOutCubic(progress);

            // Интерполяция с ограничением
            this.cameraState.position.x = startPosition.x + (targetPosition.x - startPosition.x) * easeProgress;
            this.cameraState.position.y = startPosition.y + (targetPosition.y - startPosition.y) * easeProgress;
            this.cameraState.zoom = startZoom + (targetZoom - startZoom) * easeProgress;
            
            this.constrainCameraPosition();

            this.updateCameraTransform();
            this.dispatchEvent('zoomChanged', { 
                zoomLevel: this.cameraState.zoom,
                isAnimating: true
            });

            if (progress < 1) {
                this.animationFrameId = requestAnimationFrame(animate);
            } else {
                this.cameraState.position = targetPosition;
                this.cameraState.zoom = targetZoom;
                this.cameraState.isAnimating = false;
                this.animationFrameId = null;
                onComplete();
            }
        };

        this.animationFrameId = requestAnimationFrame(animate);
    }

    // 🆕 ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ВЗАИМОДЕЙСТВИЯ

    handleEntityDrag(entity, startEvent) {
        // 🆕 Перетаскивание сущностей
        console.log(`🎯 Начато перетаскивание: ${entity.title}`);
        
        const startPos = this.getEventPosition(startEvent);
        const entityStartPos = { ...entity.position };
        let isDragging = true;

        const handleDragMove = (moveEvent) => {
            if (!isDragging) return;
            
            const currentPos = this.getEventPosition(moveEvent);
            const deltaX = currentPos.x - startPos.x;
            const deltaY = currentPos.y - startPos.y;
            
            // Обновление позиции сущности
            const newPos = {
                x: entityStartPos.x + deltaX / this.cameraState.zoom,
                y: entityStartPos.y + deltaY / this.cameraState.zoom
            };
            
            this.updateEntityPosition(entity, newPos);
        };

        const handleDragEnd = () => {
            isDragging = false;
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchmove', handleDragMove);
            document.removeEventListener('touchend', handleDragEnd);
            
            this.dispatchEvent('entityDragEnd', { entity });
        };

        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('touchend', handleDragEnd);

        this.dispatchEvent('entityDragStart', { entity, startPosition: entityStartPos });
    }

    updateEntityPosition(entity, newPosition) {
        // 🆕 Обновление позиции сущности
        const galaxyBuilder = this.app.getComponent('galaxyBuilder');
        if (galaxyBuilder) {
            galaxyBuilder.updateEntityPosition(entity.id, newPosition);
        }
        
        this.dispatchEvent('entityPositionUpdated', { entity, position: newPosition });
    }

    handleContextMenu(event) {
        // 🆕 Контекстное меню для сущностей
        event.preventDefault();
        
        const entity = this.getEntityFromEvent(event);
        if (entity) {
            this.showEntityContextMenu(entity, event);
        } else {
            this.showGlobalContextMenu(event);
        }
    }

    showEntityContextMenu(entity, event) {
        // 🆕 Контекстное меню сущности
        this.dispatchEvent('entityContextMenu', { 
            entity, 
            position: this.getEventPosition(event),
            options: this.getEntityContextOptions(entity)
        });
    }

    showGlobalContextMenu(event) {
        // 🆕 Глобальное контекстное меню
        this.dispatchEvent('globalContextMenu', {
            position: this.getEventPosition(event),
            options: this.getGlobalContextOptions()
        });
    }

    getEntityContextOptions(entity) {
        // 🆕 Опции контекстного меню сущности
        return [
            { 
                label: '📖 Открыть', 
                action: () => this.handleEntityClick(entity),
                shortcut: 'Enter'
            },
            { 
                label: '🎯 Центрировать', 
                action: () => this.cameraZoomToEntity(entity),
                shortcut: 'C'
            },
            { 
                label: '📊 Информация', 
                action: () => this.showEntityInfo(entity),
                shortcut: 'I'
            },
            { 
                label: '🔗 Поделиться', 
                action: () => this.shareEntity(entity),
                shortcut: 'S'
            }
        ];
    }

    getGlobalContextOptions() {
        // 🆕 Опции глобального контекстного меню
        return [
            { 
                label: '🔄 Сброс камеры', 
                action: () => this.cameraReset(),
                shortcut: '0'
            },
            { 
                label: '🎯 Показать все', 
                action: () => this.showAllEntities(),
                shortcut: 'A'
            },
            { 
                label: '⚙️ Настройки', 
                action: () => this.openSettings(),
                shortcut: ','
            }
        ];
    }

    // 🆕 ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ

    showEntityInfo(entity) {
        // 🆕 Показ подробной информации о сущности
        this.dispatchEvent('showEntityInfo', { entity });
    }

    shareEntity(entity) {
        // 🆕 Поделиться сущностью
        const url = `${window.location.origin}/${entity.level}.html`;
        if (navigator.share) {
            navigator.share({
                title: entity.title,
                text: entity.description,
                url: url
            });
        } else {
            // Fallback для копирования в буфер обмена
            navigator.clipboard.writeText(url);
            this.dispatchEvent('notification', {
                type: 'success',
                message: 'Ссылка скопирована в буфер обмена'
            });
        }
    }

    showAllEntities() {
        // 🆕 Показать все сущности
        this.cameraReset();
        this.dispatchEvent('showAllEntities');
    }

    openSettings() {
        // 🆕 Открыть настройки
        this.dispatchEvent('openSettings');
    }

    // 🆕 УЛУЧШЕННЫЕ ОБРАБОТЧИКИ СОБЫТИЙ

    setupMouseEvents() {
        const container = this.getGalaxyContainer();
        
        // 🆕 Добавляем контекстное меню
        container.addEventListener('contextmenu', (event) => {
            this.handleContextMenu(event);
        });

        // 🆕 Обработка средней кнопки мыши для панорамирования
        container.addEventListener('mousedown', (event) => {
            if (event.button === 1) { // Средняя кнопка мыши
                event.preventDefault();
                this.handleMiddleMouseDown(event);
            }
        });

        // Остальные обработчики остаются без изменений...
        // [остальной код из оригинального setupMouseEvents]
    }

    handleMiddleMouseDown(event) {
        // 🆕 Панорамирование средней кнопкой мыши
        let isPanning = true;
        let lastPos = { x: event.clientX, y: event.clientY };

        const handlePanMove = (moveEvent) => {
            if (!isPanning) return;
            
            const deltaX = moveEvent.clientX - lastPos.x;
            const deltaY = moveEvent.clientY - lastPos.y;
            lastPos = { x: moveEvent.clientX, y: moveEvent.clientY };
            
            this.handlePan(deltaX, deltaY);
        };

        const handlePanEnd = () => {
            isPanning = false;
            document.removeEventListener('mousemove', handlePanMove);
            document.removeEventListener('mouseup', handlePanEnd);
        };

        document.addEventListener('mousemove', handlePanMove);
        document.addEventListener('mouseup', handlePanEnd);
    }

    // 🆕 УЛУЧШЕННЫЕ МЕТОДЫ ОПТИМИЗАЦИИ

    throttle(func, limit) {
        // 🆕 Улучшенный throttle с использованием requestAnimationFrame
        let lastFunc;
        let lastRan;
        return function(...args) {
            if (!lastRan) {
                func.apply(this, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    debounce(func, wait, immediate = false) {
        // 🆕 Улучшенный debounce с immediate опцией
        let timeout;
        return function(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }

    // 🆕 ДОПОЛНИТЕЛЬНЫЕ EASING-ФУНКЦИИ

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    easeOutElastic(t) {
        return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
    }

    easeInOutBack(t) {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        return t < 0.5
            ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    }

    // 🆕 МЕТОДЫ ДЛЯ РАБОТЫ С КЭШЕМ

    clearEntityCache() {
        this.entityCache.clear();
    }

    updateEntityCache(entityId, entity) {
        this.entityCache.set(entityId, entity);
    }

    // 🆕 ОБНОВЛЕННЫЙ DESTROY

    destroy() {
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
        
        console.log('🧹 GalaxyInteraction уничтожен');
    }

    // Public API для инициализации приложения
    async start() {
        console.log('🎮 GalaxyInteraction запущен');
        return Promise.resolve();
    }

    async recover() {
        this.resetGestureState();
        this.initializeCameraState();
        this.calculateCameraBounds();
        this.clearEntityCache();
        console.log('🔄 GalaxyInteraction восстановлен');
        return true;
    }

    // 🆕 ДОПОЛНИТЕЛЬНЫЕ PUBLIC МЕТОДЫ

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
}

// Глобальная доступность для инициализации
window.GalaxyInteraction = GalaxyInteraction;
