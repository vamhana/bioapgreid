// modules/app/core/camera-controller.js
import * as THREE from './three.module.js';

export class CameraController {
    constructor(threeCamera, canvasElement) {
        // Валидация входных параметров
        if (!threeCamera || !(threeCamera instanceof THREE.Camera)) {
            throw new Error('CameraController requires a valid THREE.Camera instance');
        }
        
        if (!canvasElement || !(canvasElement instanceof HTMLElement)) {
            throw new Error('CameraController requires a valid HTML canvas element');
        }
        
        this.threeCamera = threeCamera;
        this.canvas = canvasElement;
        
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
        this.animationFrameId = null;
        
        // Для pinch-to-zoom
        this.pinchStartDistance = 0;
        this.pinchStartZoom = 1;
        this.isPinching = false;
        
        // Орбитальные контролы
        this.enableOrbit = false;
        
        // Статистика использования
        this.stats = {
            panCount: 0,
            zoomCount: 0,
            orbitCount: 0,
            lastInteraction: Date.now()
        };
        
        // Привязка методов
        this._boundHandlers = {};
        this.bindEventHandlers();
        
        console.log('🎥 CameraController создан');
    }

    bindEventHandlers() {
        this._boundHandlers = {
            mouseDown: this.handleMouseDown.bind(this),
            mouseMove: this.handleMouseMove.bind(this),
            mouseUp: this.handleMouseUp.bind(this),
            mouseLeave: this.handleMouseLeave.bind(this),
            touchStart: this.handleTouchStart.bind(this),
            touchMove: this.handleTouchMove.bind(this),
            touchEnd: this.handleTouchEnd.bind(this),
            wheel: this.handleWheel.bind(this),
            contextMenu: this.handleContextMenu.bind(this)
        };
    }

    init() {
        if (!this.threeCamera) {
            throw new Error('CameraController: Three.js camera not available');
        }
        
        if (!this.canvas) {
            throw new Error('CameraController: Canvas element not available');
        }
        
        this.setInitialView();
        this.setupEventListeners();
        this.startAnimationLoop();
        
        console.log('✅ CameraController инициализирован');
        return this;
    }

    setupEventListeners() {
        if (!this.canvas) {
            console.warn('CameraController: Canvas not available for event listeners');
            return;
        }

        // Mouse events
        this.canvas.addEventListener('mousedown', this._boundHandlers.mouseDown);
        this.canvas.addEventListener('mousemove', this._boundHandlers.mouseMove);
        this.canvas.addEventListener('mouseup', this._boundHandlers.mouseUp);
        this.canvas.addEventListener('mouseleave', this._boundHandlers.mouseLeave);
        this.canvas.addEventListener('contextmenu', this._boundHandlers.contextMenu);
        
        // Touch events
        this.canvas.addEventListener('touchstart', this._boundHandlers.touchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this._boundHandlers.touchMove, { passive: false });
        this.canvas.addEventListener('touchend', this._boundHandlers.touchEnd);
        this.canvas.addEventListener('touchcancel', this._boundHandlers.touchEnd);
        
        // Wheel event for zoom
        this.canvas.addEventListener('wheel', this._boundHandlers.wheel, { passive: false });
    }

    // ===== MOUSE HANDLERS =====
    handleMouseDown(event) {
        event.preventDefault();
        
        if (event.button === 2) { // Right click for orbit
            this.enableOrbit = true;
            this.stats.orbitCount++;
            return;
        }
        
        if (event.button !== 0) return; // Only left button
        
        this.isDragging = true;
        this.lastMouse.set(event.clientX, event.clientY);
        this.velocity.set(0, 0, 0);
        
        if (this.canvas) {
            this.canvas.style.cursor = 'grabbing';
        }
        
        this.stats.lastInteraction = Date.now();
        this.stats.panCount++;
    }

    handleMouseMove(event) {
        if (!this.isDragging || !this.threeCamera) return;
        
        const currentMouse = new THREE.Vector2(event.clientX, event.clientY);
        const delta = new THREE.Vector2().subVectors(currentMouse, this.lastMouse);
        
        if (Math.abs(delta.x) > 0 || Math.abs(delta.y) > 0) {
            this.pan(delta.x, delta.y);
            
            // Сохраняем скорость для инерции
            this.velocity.set(delta.x * 0.5, delta.y * 0.5, 0);
            this.lastMouse.copy(currentMouse);
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        this.enableOrbit = false;
        
        if (this.canvas) {
            this.canvas.style.cursor = 'grab';
        }
    }

    handleMouseLeave() {
        this.handleMouseUp();
    }

    handleContextMenu(event) {
        event.preventDefault();
    }

    // ===== TOUCH HANDLERS =====
    handleTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            this.isDragging = true;
            this.lastMouse.set(event.touches[0].clientX, event.touches[0].clientY);
            this.velocity.set(0, 0, 0);
            this.stats.panCount++;
        } else if (event.touches.length === 2) {
            this.handlePinchStart(event);
            this.stats.zoomCount++;
        }
        
        this.stats.lastInteraction = Date.now();
    }

    handleTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1 && this.isDragging && !this.isPinching) {
            const currentMouse = new THREE.Vector2(
                event.touches[0].clientX, 
                event.touches[0].clientY
            );
            const delta = new THREE.Vector2().subVectors(currentMouse, this.lastMouse);
            
            if (Math.abs(delta.x) > 1 || Math.abs(delta.y) > 1) {
                this.pan(delta.x * 0.3, delta.y * 0.3);
                this.velocity.set(delta.x * 0.2, delta.y * 0.2, 0);
                this.lastMouse.copy(currentMouse);
            }
        } else if (event.touches.length === 2) {
            this.handlePinchMove(event);
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
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
        this.isDragging = false;
    }

    handlePinchMove(event) {
        if (!this.isPinching || event.touches.length < 2) return;
        
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

    // ===== WHEEL ZOOM =====
    handleWheel(event) {
        event.preventDefault();
        
        if (!this.threeCamera) return;
        
        const zoomSpeed = 0.001;
        const zoomDelta = -event.deltaY * zoomSpeed;
        
        // Получаем позицию мыши для зума к точке
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        this.zoomAtPoint(zoomDelta, mouseX, mouseY);
        this.stats.zoomCount++;
        this.stats.lastInteraction = Date.now();
    }

    // ===== CORE 3D CAMERA METHODS =====
    pan(deltaX, deltaY) {
        if (!this.threeCamera) return;
        
        if (this.enableOrbit) {
            this.orbitPan(deltaX, deltaY);
        } else {
            const panVector = new THREE.Vector3(-deltaX, deltaY, 0);
            panVector.multiplyScalar(2 / this.zoom);
            
            this.position.add(panVector);
            this.target.add(panVector);
            this.updateThreeCamera();
        }
        
        this.applyBounds();
    }

    orbitPan(deltaX, deltaY) {
        if (!this.threeCamera) return;
        
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

    zoomAtPoint(delta, pointX, pointY) {
        if (!this.canvas || !this.threeCamera) return;
        
        const zoomFactor = 1 + delta * 2;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));
        
        if (newZoom === this.zoom) return;
        
        const direction = new THREE.Vector3().subVectors(this.position, this.target).normalize();
        const distanceChange = (newZoom - this.zoom) * 100;
        
        this.position.add(direction.multiplyScalar(distanceChange));
        this.zoom = newZoom;
        
        this.updateThreeCamera();
        this.applyBounds();
    }

    setZoom(newZoom) {
        if (!this.threeCamera) return;
        
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        
        if (this.zoom === newZoom) return;
        
        const direction = new THREE.Vector3().subVectors(this.position, this.target).normalize();
        const baseDistance = 1000;
        const newDistance = baseDistance / this.zoom;
        
        this.position.copy(this.target).add(direction.multiplyScalar(newDistance));
        this.updateThreeCamera();
        this.applyBounds();
    }

    updateThreeCamera() {
        if (!this.threeCamera) return;
        
        this.threeCamera.position.copy(this.position);
        this.threeCamera.lookAt(this.target);
        
        if (this.threeCamera.isPerspectiveCamera) {
            this.threeCamera.zoom = this.zoom;
            this.threeCamera.updateProjectionMatrix();
        }
    }

    applyBounds() {
        if (!this.threeCamera) return;
        
        this.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.position.x));
        this.position.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.position.y));
        this.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.position.z));
        
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
        
        console.log('🗺️ Камера сброшена к начальному виду');
        return this;
    }

    setInitialView() {
        this.reset();
        
        if (this.threeCamera && this.threeCamera.isPerspectiveCamera) {
            this.threeCamera.fov = 75;
            this.threeCamera.updateProjectionMatrix();
        }
        
        return this;
    }

    handleResize() {
        if (!this.threeCamera || !this.canvas) return;
        
        if (this.threeCamera.isPerspectiveCamera) {
            this.threeCamera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
            this.threeCamera.updateProjectionMatrix();
        }
        
        return this;
    }

    // ===== ANIMATION AND INERTIA =====
    startAnimationLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        const update = () => {
            this.applyInertia();
            this.animationFrameId = requestAnimationFrame(update);
        };
        update();
    }

    applyInertia() {
        if (this.isDragging || this.isPinching || !this.threeCamera) return;
        
        if (this.velocity.length() > 0.01) {
            const inertiaVector = new THREE.Vector3(
                this.velocity.x,
                -this.velocity.y,
                0
            ).multiplyScalar(0.5);
            
            this.position.add(inertiaVector);
            this.target.add(inertiaVector);
            this.updateThreeCamera();
            
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
        
        const rect = this.canvas.getBoundingClientRect();
        const x = ((screenX - rect.left) / rect.width) * 2 - 1;
        const y = -((screenY - rect.top) / rect.height) * 2 + 1;
        
        const vector = new THREE.Vector3(x, y, 0.5);
        vector.unproject(this.threeCamera);
        
        const direction = vector.sub(this.threeCamera.position).normalize();
        const distance = -this.threeCamera.position.z / direction.z;
        
        return this.threeCamera.position.clone().add(direction.multiplyScalar(distance));
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
            return { left: 0, right: 0, top: 0, bottom: 0 };
        }
        
        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4().multiplyMatrices(
            this.threeCamera.projectionMatrix, 
            this.threeCamera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(matrix);
        
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        return {
            left: -this.target.x - (width / 2) / this.zoom,
            right: -this.target.x + (width / 2) / this.zoom,
            top: -this.target.y - (height / 2) / this.zoom,
            bottom: -this.target.y + (height / 2) / this.zoom
        };
    }

    isPointInView(x, y, z = 0, radius = 0) {
        const viewport = this.getViewportBounds();
        return x + radius >= viewport.left && 
               x - radius <= viewport.right && 
               y + radius >= viewport.top && 
               y - radius <= viewport.bottom;
    }

    // ===== DEBUG AND INFO =====
    getCameraInfo() {
        return {
            position: { 
                x: Math.round(this.position.x * 100) / 100, 
                y: Math.round(this.position.y * 100) / 100, 
                z: Math.round(this.position.z * 100) / 100 
            },
            target: { 
                x: Math.round(this.target.x * 100) / 100, 
                y: Math.round(this.target.y * 100) / 100, 
                z: Math.round(this.target.z * 100) / 100 
            },
            zoom: Math.round(this.zoom * 100) / 100,
            isDragging: this.isDragging,
            isPinching: this.isPinching,
            enableOrbit: this.enableOrbit,
            stats: { ...this.stats }
        };
    }

    logCameraState() {
        console.log('🎥 Состояние камеры:', this.getCameraInfo());
    }

    // ===== DESTRUCTOR =====
    destroy() {
        this.stopAnimationLoop();
        
        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', this._boundHandlers.mouseDown);
            this.canvas.removeEventListener('mousemove', this._boundHandlers.mouseMove);
            this.canvas.removeEventListener('mouseup', this._boundHandlers.mouseUp);
            this.canvas.removeEventListener('mouseleave', this._boundHandlers.mouseLeave);
            this.canvas.removeEventListener('contextmenu', this._boundHandlers.contextMenu);
            this.canvas.removeEventListener('touchstart', this._boundHandlers.touchStart);
            this.canvas.removeEventListener('touchmove', this._boundHandlers.touchMove);
            this.canvas.removeEventListener('touchend', this._boundHandlers.touchEnd);
            this.canvas.removeEventListener('touchcancel', this._boundHandlers.touchEnd);
            this.canvas.removeEventListener('wheel', this._boundHandlers.wheel);
            
            this.canvas.style.cursor = '';
        }
        
        this.threeCamera = null;
        this.canvas = null;
        
        console.log('🧹 CameraController уничтожен');
    }
}

export default CameraController;
