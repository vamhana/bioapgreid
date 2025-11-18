// modules/app/core/camera-controller.js
import * as THREE from './three.module.js';

export class CameraController {
    constructor(threeCamera, threeSceneManager) {
        this.threeCamera = threeCamera;
        this.sceneManager = threeSceneManager;
        
        // 3D состояние камеры
        this.position = new THREE.Vector3(0, 0, 1000);
        this.target = new THREE.Vector3(0, 0, 0);
        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 5;
        
        // Параметры инерции и плавности
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.friction = 0.88;
        this.isDragging = false;
        this.lastMouse = new THREE.Vector2();
        
        // Ограничения движения
        this.bounds = {
            minX: -2000, maxX: 2000,
            minY: -2000, maxY: 2000,
            minZ: 100, maxZ: 5000
        };
        
        // Референсы
        this.canvas = null;
        this.animationFrameId = null;
        
        // Для pinch-to-zoom
        this.pinchStartDistance = 0;
        this.pinchStartZoom = 1;
        this.isPinching = false;
        
        // Орбитальные контролы
        this.orbitControls = null;
        this.enableOrbit = true;
        
        // Привязка методов
        this._boundHandlers = {};
        this.bindEventHandlers();
        
        console.log('🎥 3D CameraController создан');
    }

    bindEventHandlers() {
        this._boundHandlers = {
            mouseDown: this.handleMouseDown.bind(this),
            mouseMove: this.handleMouseMove.bind(this),
            mouseUp: this.handleMouseUp.bind(this),
            mouseLeave: this.handleMouseUp.bind(this),
            touchStart: this.handleTouchStart.bind(this),
            touchMove: this.handleTouchMove.bind(this),
            touchEnd: this.handleTouchEnd.bind(this),
            wheel: this.handleWheel.bind(this),
            contextMenu: this.handleContextMenu.bind(this)
        };
    }

    init(canvas) {
        this.canvas = canvas;
        this.setInitialView();
        this.setupEventListeners();
        this.startAnimationLoop();
        
        console.log('✅ 3D CameraController инициализирован');
    }

    setupEventListeners() {
        if (!this.canvas) return;

        // Mouse events
        this.canvas.addEventListener('mousedown', this._boundHandlers.mouseDown);
        this.canvas.addEventListener('mousemove', this._boundHandlers.mouseMove);
        this.canvas.addEventListener('mouseup', this._boundHandlers.mouseUp);
        this.canvas.addEventListener('mouseleave', this._boundHandlers.mouseLeave);
        this.canvas.addEventListener('contextmenu', this._boundHandlers.contextMenu);
        
        // Touch events
        this.canvas.addEventListener('touchstart', this._boundHandlers.touchStart);
        this.canvas.addEventListener('touchmove', this._boundHandlers.touchMove);
        this.canvas.addEventListener('touchend', this._boundHandlers.touchEnd);
        
        // Wheel event for zoom
        this.canvas.addEventListener('wheel', this._boundHandlers.wheel, { passive: false });
    }

    // ===== MOUSE HANDLERS (3D адаптированные) =====
    handleMouseDown(event) {
        event.preventDefault();
        
        if (event.button === 2) { // Right click for orbit
            this.enableOrbit = true;
            return;
        }
        
        this.isDragging = true;
        this.lastMouse.set(event.clientX, event.clientY);
        this.velocity.set(0, 0, 0);
        
        if (this.canvas) {
            this.canvas.style.cursor = 'grabbing';
        }
    }

    handleMouseMove(event) {
        if (!this.isDragging) return;
        
        const currentMouse = new THREE.Vector2(event.clientX, event.clientY);
        const delta = new THREE.Vector2().subVectors(currentMouse, this.lastMouse);
        
        // 3D панорамирование с учетом направления камеры
        this.pan(delta.x, delta.y);
        
        // Сохраняем скорость для инерции
        this.velocity.set(delta.x * 0.5, delta.y * 0.5, 0);
        
        this.lastMouse.copy(currentMouse);
    }

    handleMouseUp() {
        this.isDragging = false;
        this.enableOrbit = false;
        
        if (this.canvas) {
            this.canvas.style.cursor = 'grab';
        }
    }

    handleContextMenu(event) {
        event.preventDefault(); // Блокируем контекстное меню для правого клика
    }

    // ===== TOUCH HANDLERS (3D адаптированные) =====
    handleTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            this.isDragging = true;
            this.lastMouse.set(event.touches[0].clientX, event.touches[0].clientY);
            this.velocity.set(0, 0, 0);
        } else if (event.touches.length === 2) {
            this.handlePinchStart(event);
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1 && this.isDragging && !this.isPinching) {
            const currentMouse = new THREE.Vector2(
                event.touches[0].clientX, 
                event.touches[0].clientY
            );
            const delta = new THREE.Vector2().subVectors(currentMouse, this.lastMouse);
            
            this.pan(delta.x * 0.3, delta.y * 0.3);
            
            this.velocity.set(delta.x * 0.2, delta.y * 0.2, 0);
            this.lastMouse.copy(currentMouse);
        } else if (event.touches.length === 2) {
            this.handlePinchMove(event);
        }
    }

    handleTouchEnd() {
        this.isDragging = false;
        this.isPinching = false;
        this.pinchStartDistance = 0;
    }

    // ===== PINCH-TO-ZOOM (3D адаптированный) =====
    handlePinchStart(event) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        this.pinchStartDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        this.pinchStartZoom = this.zoom;
        this.isPinching = true;
        this.isDragging = false;
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
            
            this.setZoom(newZoom);
        }
    }

    // ===== WHEEL ZOOM (3D адаптированный) =====
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

    // ===== CORE 3D CAMERA METHODS =====
    pan(deltaX, deltaY) {
        if (this.enableOrbit) {
            // Орбитальное вращение
            this.orbitPan(deltaX, deltaY);
        } else {
            // Плоское панорамирование
            const panVector = new THREE.Vector3(-deltaX, deltaY, 0);
            panVector.multiplyScalar(2 / this.zoom);
            
            this.position.add(panVector);
            this.target.add(panVector);
            this.updateThreeCamera();
        }
        
        this.applyBounds();
    }

    orbitPan(deltaX, deltaY) {
        // Вращение камеры вокруг цели
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(
            this.position.clone().sub(this.target)
        );
        
        spherical.theta -= deltaX * 0.01;
        spherical.phi -= deltaY * 0.01;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        
        const newPosition = new THREE.Vector3().setFromSpherical(spherical).add(this.target);
        this.position.copy(newPosition);
        this.updateThreeCamera();
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
        
        // В 3D зум реализуется через изменение положения камеры
        const zoomFactor = 1 + delta * 2;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));
        
        // Двигаем камеру ближе/дальше от цели
        const direction = new THREE.Vector3().subVectors(this.position, this.target).normalize();
        const distanceChange = (newZoom - this.zoom) * 100;
        
        this.position.add(direction.multiplyScalar(distanceChange));
        this.zoom = newZoom;
        
        this.updateThreeCamera();
        this.applyBounds();
    }

    setZoom(newZoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        
        // Обновляем позицию камеры на основе zoom
        const direction = new THREE.Vector3().subVectors(this.position, this.target).normalize();
        const baseDistance = 1000;
        const newDistance = baseDistance / this.zoom;
        
        this.position.copy(this.target).add(direction.multiplyScalar(newDistance));
        this.updateThreeCamera();
        this.applyBounds();
    }

    updateThreeCamera() {
        if (this.threeCamera) {
            this.threeCamera.position.copy(this.position);
            this.threeCamera.lookAt(this.target);
            
            // Обновляем zoom камеры Three.js если нужно
            if (this.threeCamera.isPerspectiveCamera) {
                this.threeCamera.zoom = this.zoom;
                this.threeCamera.updateProjectionMatrix();
            }
        }
    }

    applyBounds() {
        // Ограничиваем позицию камеры в 3D пространстве
        this.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.position.x));
        this.position.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.position.y));
        this.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.position.z));
        
        // Также ограничиваем цель
        this.target.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.target.x));
        this.target.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.target.y));
        
        this.updateThreeCamera();
    }

    reset() {
        this.position.set(0, 0, 1000);
        this.target.set(0, 0, 0);
        this.zoom = 1;
        this.velocity.set(0, 0, 0);
        this.isDragging = false;
        this.isPinching = false;
        this.enableOrbit = false;
        
        this.updateThreeCamera();
        console.log('🗺️ 3D Камера сброшена к начальному виду');
    }

    setInitialView() {
        this.reset();
        
        // Дополнительная настройка начального 3D вида
        if (this.threeCamera) {
            this.threeCamera.fov = 75;
            this.threeCamera.updateProjectionMatrix();
        }
    }

    handleResize() {
        // При изменении размера обновляем камеру Three.js
        if (this.threeCamera && this.threeCamera.isPerspectiveCamera) {
            this.threeCamera.aspect = this.canvas.width / this.canvas.height;
            this.threeCamera.updateProjectionMatrix();
        }
    }

    // ===== ANIMATION AND INERTIA (3D адаптированные) =====
    startAnimationLoop() {
        const update = () => {
            this.applyInertia();
            this.animationFrameId = requestAnimationFrame(update);
        };
        update();
    }

    applyInertia() {
        if (this.isDragging || this.isPinching) return;
        
        // Применяем инерцию в 3D пространстве
        if (this.velocity.length() > 0.01) {
            const inertiaVector = new THREE.Vector3(
                this.velocity.x,
                -this.velocity.y, // Инвертируем Y для естественного движения
                0
            ).multiplyScalar(0.5);
            
            this.position.add(inertiaVector);
            this.target.add(inertiaVector);
            this.updateThreeCamera();
            
            // Затухание скорости
            this.velocity.multiplyScalar(this.friction);
        } else {
            this.velocity.set(0, 0, 0);
        }
    }

    stopAnimationLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    // ===== 3D UTILITY METHODS =====
    screenToWorld(screenX, screenY) {
        if (!this.canvas || !this.threeCamera) return new THREE.Vector3(0, 0, 0);
        
        const vector = new THREE.Vector3();
        const rect = this.canvas.getBoundingClientRect();
        
        vector.x = ((screenX - rect.left) / rect.width) * 2 - 1;
        vector.y = -((screenY - rect.top) / rect.height) * 2 + 1;
        vector.z = 0.5;
        
        vector.unproject(this.threeCamera);
        
        const direction = vector.sub(this.threeCamera.position).normalize();
        const distance = -this.threeCamera.position.z / direction.z;
        const worldPosition = this.threeCamera.position.clone().add(direction.multiplyScalar(distance));
        
        return worldPosition;
    }

    worldToScreen(worldX, worldY, worldZ = 0) {
        if (!this.canvas || !this.threeCamera) return { x: 0, y: 0 };
        
        const vector = new THREE.Vector3(worldX, worldY, worldZ);
        const rect = this.canvas.getBoundingClientRect();
        
        vector.project(this.threeCamera);
        
        return {
            x: (vector.x * 0.5 + 0.5) * rect.width + rect.left,
            y: (-vector.y * 0.5 + 0.5) * rect.height + rect.top
        };
    }

    getViewportBounds() {
        if (!this.canvas || !this.threeCamera) {
            return { left: 0, right: 0, top: 0, bottom: 0, near: 0, far: 0 };
        }
        
        // Вычисляем границы видимой области в мировых координатах
        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4().multiplyMatrices(
            this.threeCamera.projectionMatrix, 
            this.threeCamera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(matrix);
        
        return {
            left: -this.target.x - (this.canvas.width / 2) / this.zoom,
            right: -this.target.x + (this.canvas.width / 2) / this.zoom,
            top: -this.target.y - (this.canvas.height / 2) / this.zoom,
            bottom: -this.target.y + (this.canvas.height / 2) / this.zoom,
            near: this.threeCamera.near,
            far: this.threeCamera.far
        };
    }

    isPointInView(x, y, z = 0, radius = 0) {
        const viewport = this.getViewportBounds();
        const point = new THREE.Vector3(x, y, z);
        
        // Простая проверка по границам (можно улучшить с помощью frustum culling)
        return x + radius >= viewport.left && 
               x - radius <= viewport.right && 
               y + radius >= viewport.top && 
               y - radius <= viewport.bottom;
    }

    // ===== DEBUG AND INFO =====
    getCameraInfo() {
        return {
            position: { x: this.position.x, y: this.position.y, z: this.position.z },
            target: { x: this.target.x, y: this.target.y, z: this.target.z },
            zoom: this.zoom,
            isDragging: this.isDragging,
            isPinching: this.isPinching,
            velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z },
            viewport: this.getViewportBounds(),
            enableOrbit: this.enableOrbit
        };
    }

    logCameraState() {
        console.log('🎥 Состояние 3D камеры:', this.getCameraInfo());
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
            this.canvas.removeEventListener('contextmenu', this._boundHandlers.contextMenu);
            this.canvas.removeEventListener('touchstart', this._boundHandlers.touchStart);
            this.canvas.removeEventListener('touchmove', this._boundHandlers.touchMove);
            this.canvas.removeEventListener('touchend', this._boundHandlers.touchEnd);
            this.canvas.removeEventListener('wheel', this._boundHandlers.wheel);
        }
        
        console.log('🧹 3D CameraController уничтожен');
    }
}

export default CameraController;