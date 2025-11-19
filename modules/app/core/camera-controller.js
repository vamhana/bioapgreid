// modules/app/core/camera-controller.js
import * as THREE from './three.module.js';

export class CameraController {
    constructor(camera, canvas, sceneManager) {
        this.camera = camera;
        this.canvas = canvas;
        this.sceneManager = sceneManager;
        
        this.controls = {
            enabled: true,
            minDistance: 50,
            maxDistance: 5000,
            zoomSpeed: 1.0,
            panSpeed: 1.0,
            rotateSpeed: 1.0
        };
        
        this.state = {
            isDragging: false,
            isPanning: false,
            lastMousePos: { x: 0, y: 0 },
            targetPosition: new THREE.Vector3(0, 0, 0),
            spherical: new THREE.Spherical(1000, Math.PI/2, 0)
        };
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    }
    
    // Координатные преобразования
    screenToWorld(screenX, screenY, distance = 1000) {
        const vector = new THREE.Vector3();
        const rect = this.canvas.getBoundingClientRect();
        
        vector.x = ((screenX - rect.left) / rect.width) * 2 - 1;
        vector.y = -((screenY - rect.top) / rect.height) * 2 + 1;
        vector.z = 0.5;
        
        vector.unproject(this.camera);
        
        const dir = vector.sub(this.camera.position).normalize();
        return this.camera.position.clone().add(dir.multiplyScalar(distance));
    }
    
    worldToScreen(worldPos) {
        const vector = worldPos.clone();
        vector.project(this.camera);
        
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (vector.x * 0.5 + 0.5) * rect.width + rect.left,
            y: (-vector.y * 0.5 + 0.5) * rect.height + rect.top
        };
    }
    
    // Методы управления камерой
    focusOnEntity(entityPosition, distance = 300) {
        this.state.targetPosition.copy(entityPosition);
        
        // Плавное перемещение камеры к цели
        this.animateToPosition(
            entityPosition.x,
            entityPosition.y,
            entityPosition.z + distance,
            1000
        );
    }
    
    animateToPosition(x, y, z, duration = 1000) {
        const startPosition = this.camera.position.clone();
        const targetPosition = new THREE.Vector3(x, y, z);
        const startTime = performance.now();
        
        const animate = () => {
            const currentTime = performance.now();
            const progress = Math.min((currentTime - startTime) / duration, 1);
            
            // Кубическая easing функция для плавности
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            this.camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            this.camera.lookAt(this.state.targetPosition);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    // Обработчики событий
    onMouseDown(event) {
        if (!this.controls.enabled) return;
        
        this.state.isDragging = true;
        this.state.lastMousePos = { x: event.clientX, y: event.clientY };
        
        if (event.button === 2) { // Right click
            this.state.isPanning = true;
        }
    }
    
    onMouseMove(event) {
        if (!this.controls.enabled || !this.state.isDragging) return;
        
        const deltaX = event.clientX - this.state.lastMousePos.x;
        const deltaY = event.clientY - this.state.lastMousePos.y;
        
        if (this.state.isPanning) {
            // Pan camera
            const panVector = new THREE.Vector3(-deltaX, deltaY, 0);
            panVector.multiplyScalar(this.controls.panSpeed * 0.1);
            this.camera.position.add(panVector);
            this.state.targetPosition.add(panVector);
        } else {
            // Rotate camera around target
            this.state.spherical.theta -= deltaX * 0.01 * this.controls.rotateSpeed;
            this.state.spherical.phi -= deltaY * 0.01 * this.controls.rotateSpeed;
            
            // Clamp phi to avoid flipping
            this.state.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.state.spherical.phi));
            
            this.updateCameraPosition();
        }
        
        this.state.lastMousePos = { x: event.clientX, y: event.clientY };
        this.camera.lookAt(this.state.targetPosition);
    }
    
    onMouseUp(event) {
        this.state.isDragging = false;
        this.state.isPanning = false;
    }
    
    onWheel(event) {
        if (!this.controls.enabled) return;
        
        event.preventDefault();
        const zoomAmount = event.deltaY * 0.01 * this.controls.zoomSpeed;
        
        this.state.spherical.radius = Math.max(
            this.controls.minDistance,
            Math.min(this.controls.maxDistance, this.state.spherical.radius + zoomAmount)
        );
        
        this.updateCameraPosition();
    }
    
    // Touch events
    onTouchStart(event) {
        if (event.touches.length === 1) {
            this.state.isDragging = true;
            this.state.lastMousePos = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
        }
    }
    
    onTouchMove(event) {
        if (!this.state.isDragging || event.touches.length !== 1) return;
        
        const deltaX = event.touches[0].clientX - this.state.lastMousePos.x;
        const deltaY = event.touches[0].clientY - this.state.lastMousePos.y;
        
        this.state.spherical.theta -= deltaX * 0.01;
        this.state.spherical.phi -= deltaY * 0.01;
        this.state.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.state.spherical.phi));
        
        this.updateCameraPosition();
        this.state.lastMousePos = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
    }
    
    onTouchEnd(event) {
        this.state.isDragging = false;
    }
    
    updateCameraPosition() {
        const position = new THREE.Vector3();
        position.setFromSpherical(this.state.spherical);
        position.add(this.state.targetPosition);
        
        this.camera.position.copy(position);
        this.camera.lookAt(this.state.targetPosition);
    }
    
    // Утилиты
    getCameraState() {
        return {
            position: this.camera.position.clone(),
            target: this.state.targetPosition.clone(),
            distance: this.state.spherical.radius,
            spherical: {
                radius: this.state.spherical.radius,
                phi: this.state.spherical.phi,
                theta: this.state.spherical.theta
            }
        };
    }
    
    setCameraState(state) {
        this.camera.position.copy(state.position);
        this.state.targetPosition.copy(state.target);
        this.state.spherical.radius = state.distance;
        this.state.spherical.phi = state.spherical.phi;
        this.state.spherical.theta = state.spherical.theta;
        
        this.camera.lookAt(this.state.targetPosition);
    }
    
    dispose() {
        // Clean up event listeners
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.removeEventListener('wheel', this.onWheel);
        this.canvas.removeEventListener('touchstart', this.onTouchStart);
        this.canvas.removeEventListener('touchmove', this.onTouchMove);
        this.canvas.removeEventListener('touchend', this.onTouchEnd);
    }
}
