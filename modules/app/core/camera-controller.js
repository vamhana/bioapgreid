// modules/app/core/camera-controller.js
export class CameraController {
    constructor() {
        // Состояние камеры
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 5;
        
        // Параметры инерции и плавности
        this.velocityX = 0;
        this.velocityY = 0;
        this.friction = 0.88;
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        
        // Ограничения движения
        this.bounds = {
            minX: -1000,
            maxX: 1000,
            minY: -1000, 
            maxY: 1000
        };
        
        // Референсы
        this.canvas = null;
        this.animationFrameId = null;
        
        // Для pinch-to-zoom
        this.pinchStartDistance = 0;
        this.pinchStartZoom = 1;
        this.isPinching = false;
        
        // Привязка методов для корректного удаления обработчиков
        this._boundHandlers = {};
        this.bindEventHandlers();
        
        console.log('🎥 CameraController создан');
    }

    bindEventHandlers() {
        // Привязываем методы к экземпляру для корректного удаления обработчиков
        this._boundHandlers = {
            mouseDown: this.handleMouseDown.bind(this),
            mouseMove: this.handleMouseMove.bind(this),
            mouseUp: this.handleMouseUp.bind(this),
            mouseLeave: this.handleMouseUp.bind(this),
            touchStart: this.handleTouchStart.bind(this),
            touchMove: this.handleTouchMove.bind(this),
            touchEnd: this.handleTouchEnd.bind(this),
            wheel: this.handleWheel.bind(this)
        };
    }

    init(canvas) {
        this.canvas = canvas;
        this.setInitialView();
        
        // Настраиваем обработчики событий для canvas
        this.setupEventListeners();
        
        // Запускаем цикл обновления для инерции
        this.startAnimationLoop();
        
        console.log('✅ CameraController инициализирован с canvas:', {
            width: canvas.width,
            height: canvas.height
        });
    }

    setupEventListeners() {
        if (!this.canvas) return;

        // Mouse events
        this.canvas.addEventListener('mousedown', this._boundHandlers.mouseDown);
        this.canvas.addEventListener('mousemove', this._boundHandlers.mouseMove);
        this.canvas.addEventListener('mouseup', this._boundHandlers.mouseUp);
        this.canvas.addEventListener('mouseleave', this._boundHandlers.mouseLeave);
        
        // Touch events
        this.canvas.addEventListener('touchstart', this._boundHandlers.touchStart);
        this.canvas.addEventListener('touchmove', this._boundHandlers.touchMove);
        this.canvas.addEventListener('touchend', this._boundHandlers.touchEnd);
        
        // Wheel event for zoom
        this.canvas.addEventListener('wheel', this._boundHandlers.wheel, { passive: false });

        console.log('🎮 Обработчики событий камеры установлены');
    }

    // ===== MOUSE HANDLERS =====
    handleMouseDown(event) {
        event.preventDefault();
        this.isDragging = true;
        this.lastX = event.clientX;
        this.lastY = event.clientY;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Изменяем курсор
        if (this.canvas) {
            this.canvas.style.cursor = 'grabbing';
        }
    }

    handleMouseMove(event) {
        if (!this.isDragging) return;
        
        const deltaX = event.clientX - this.lastX;
        const deltaY = event.clientY - this.lastY;
        
        this.pan(deltaX, deltaY);
        
        // Сохраняем скорость для инерции
        this.velocityX = deltaX * 0.5;
        this.velocityY = deltaY * 0.5;
        
        this.lastX = event.clientX;
        this.lastY = event.lastY;
    }

    handleMouseUp() {
        this.isDragging = false;
        if (this.canvas) {
            this.canvas.style.cursor = 'grab';
        }
    }

    // ===== TOUCH HANDLERS =====
    handleTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // Одиночное касание - начало панорамирования
            this.isDragging = true;
            this.lastX = event.touches[0].clientX;
            this.lastY = event.touches[0].clientY;
            this.velocityX = 0;
            this.velocityY = 0;
        } else if (event.touches.length === 2) {
            // Мультитач - начало зума
            this.handlePinchStart(event);
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1 && this.isDragging && !this.isPinching) {
            // Панорамирование одним пальцем
            const deltaX = event.touches[0].clientX - this.lastX;
            const deltaY = event.touches[0].clientY - this.lastY;
            
            this.pan(deltaX, deltaY);
            
            this.velocityX = deltaX * 0.3;
            this.velocityY = deltaY * 0.3;
            
            this.lastX = event.touches[0].clientX;
            this.lastY = event.touches[0].clientY;
        } else if (event.touches.length === 2) {
            // Зум двумя пальцами
            this.handlePinchMove(event);
        }
    }

    handleTouchEnd() {
        this.isDragging = false;
        this.isPinching = false;
        this.pinchStartDistance = 0;
    }

    // ===== PINCH-TO-ZOOM =====
    handlePinchStart(event) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        this.pinchStartDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        this.pinchStartZoom = this.zoom;
        this.isPinching = true;
        this.isDragging = false; // Отключаем панорамирование при зуме
    }

    handlePinchMove(event) {
        if (!this.isPinching) return;
        
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        const currentDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        
        if (this.pinchStartDistance > 0) {
            const zoomFactor = currentDistance / this.pinchStartDistance;
            const newZoom = this.pinchStartZoom * zoomFactor;
            
            // Плавный зум с ограничениями
            this.setZoom(newZoom);
        }
    }

    // ===== WHEEL ZOOM =====
    handleWheel(event) {
        event.preventDefault();
        
        const zoomSpeed = 0.001;
        const zoomDelta = -event.deltaY * zoomSpeed;
        
        // Получаем позицию мыши для зума к точке
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        this.zoomAtPoint(zoomDelta, mouseX, mouseY);
    }

    // ===== CORE CAMERA METHODS =====
    pan(deltaX, deltaY) {
        // Инвертируем движение для естественного панорамирования
        this.x -= deltaX / this.zoom;
        this.y -= deltaY / this.zoom;
        
        this.applyBounds();
    }

    zoom(delta, focusX = null, focusY = null) {
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));
        
        if (focusX !== null && focusY !== null) {
            this.zoomAtPoint(newZoom - this.zoom, focusX, focusY);
        } else {
            this.setZoom(newZoom);
        }
    }

    zoomAtPoint(delta, pointX, pointY) {
        if (!this.canvas) return;
        
        const worldX = (pointX - this.canvas.width / 2) / this.zoom - this.x;
        const worldY = (pointY - this.canvas.height / 2) / this.zoom - this.y;
        
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));
        const zoomFactor = newZoom / this.zoom;
        
        this.x = (pointX - this.canvas.width / 2) / newZoom - worldX;
        this.y = (pointY - this.canvas.height / 2) / newZoom - worldY;
        this.zoom = newZoom;
        
        this.applyBounds();
    }

    setZoom(newZoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        this.applyBounds();
    }

    applyBounds() {
        // Применяем ограничения к позиции камеры
        this.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.x));
        this.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.y));
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isDragging = false;
        this.isPinching = false;
        
        console.log('🗺️ Камера сброшена к начальному виду');
    }

    setInitialView() {
        this.reset();
        
        // Дополнительная настройка начального вида если нужно
        if (this.canvas) {
            // Можно добавить логику для центрирования на основе содержимого
        }
    }

    handleResize() {
        // При изменении размера окна можем подкорректировать камеру
        // Например, чтобы сохранить видимость важных элементов
        console.log('🔄 Камера адаптирована к новому размеру окна');
    }

    // ===== ANIMATION AND INERTIA =====
    startAnimationLoop() {
        const update = () => {
            this.applyInertia();
            this.animationFrameId = requestAnimationFrame(update);
        };
        update();
    }

    applyInertia() {
        if (this.isDragging || this.isPinching) return;
        
        // Применяем инерцию только если есть значительная скорость
        if (Math.abs(this.velocityX) > 0.01 || Math.abs(this.velocityY) > 0.01) {
            this.pan(this.velocityX, this.velocityY);
            
            // Затухание скорости
            this.velocityX *= this.friction;
            this.velocityY *= this.friction;
        } else {
            // Останавливаем когда скорость становится очень маленькой
            this.velocityX = 0;
            this.velocityY = 0;
        }
    }

    stopAnimationLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    // ===== UTILITY METHODS =====
    screenToWorld(screenX, screenY) {
        if (!this.canvas) return { x: 0, y: 0 };
        
        return {
            x: (screenX - this.canvas.width / 2) / this.zoom - this.x,
            y: (screenY - this.canvas.height / 2) / this.zoom - this.y
        };
    }

    worldToScreen(worldX, worldY) {
        if (!this.canvas) return { x: 0, y: 0 };
        
        return {
            x: (worldX + this.x) * this.zoom + this.canvas.width / 2,
            y: (worldY + this.y) * this.zoom + this.canvas.height / 2
        };
    }

    getViewportBounds() {
        if (!this.canvas) {
            return { left: 0, right: 0, top: 0, bottom: 0 };
        }
        
        const halfWidth = (this.canvas.width / 2) / this.zoom;
        const halfHeight = (this.canvas.height / 2) / this.zoom;
        
        return {
            left: -this.x - halfWidth,
            right: -this.x + halfWidth,
            top: -this.y - halfHeight,
            bottom: -this.y + halfHeight
        };
    }

    isPointInView(x, y, radius = 0) {
        const viewport = this.getViewportBounds();
        return x + radius >= viewport.left && 
               x - radius <= viewport.right && 
               y + radius >= viewport.top && 
               y - radius <= viewport.bottom;
    }

    // ===== DEBUG AND INFO =====
    getCameraInfo() {
        return {
            position: { x: this.x, y: this.y },
            zoom: this.zoom,
            isDragging: this.isDragging,
            isPinching: this.isPinching,
            velocity: { x: this.velocityX, y: this.velocityY },
            viewport: this.getViewportBounds()
        };
    }

    logCameraState() {
        console.log('🎥 Состояние камеры:', this.getCameraInfo());
    }

    // ===== DESTRUCTOR =====
    destroy() {
        this.stopAnimationLoop();
        
        // Удаляем обработчики событий
        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', this._boundHandlers.mouseDown);
            this.canvas.removeEventListener('mousemove', this._boundHandlers.mouseMove);
            this.canvas.removeEventListener('mouseup', this._boundHandlers.mouseUp);
            this.canvas.removeEventListener('mouseleave', this._boundHandlers.mouseLeave);
            this.canvas.removeEventListener('touchstart', this._boundHandlers.touchStart);
            this.canvas.removeEventListener('touchmove', this._boundHandlers.touchMove);
            this.canvas.removeEventListener('touchend', this._boundHandlers.touchEnd);
            this.canvas.removeEventListener('wheel', this._boundHandlers.wheel);
        }
        
        console.log('🧹 CameraController уничтожен');
    }
}

export default CameraController;
