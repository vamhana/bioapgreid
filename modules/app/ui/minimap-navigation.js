// bioapgreid/modules/app/ui/minimap-navigation.js
import { ENTITY_COLORS, ENTITY_SIZES, ENTITY_ICONS, APP_CONFIG } from '../constants/config.js';

export class MinimapNavigation {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.galaxyData = null;
        this.camera = null;
        
        // Состояние миникарты
        this.isVisible = false;
        this.isDragging = false;
        this.isMinimized = false;
        
        // Настройки отображения
        this.size = 150;
        this.margin = 20;
        this.scale = 0.1;
        this.viewportRect = null;
        
        // Позиция и поведение
        this.position = { x: 0, y: 0 }; // top-right по умолчанию
        this.dragStart = { x: 0, y: 0 };
        
        // Визуальные настройки
        this.styles = {
            background: 'rgba(12, 12, 46, 0.9)',
            border: '2px solid rgba(78, 205, 196, 0.5)',
            viewport: 'rgba(255, 215, 0, 0.3)',
            viewportBorder: '2px solid #FFD700'
        };

        console.log('🗺️ MinimapNavigation создан');
    }

    async init(galaxyData, camera) {
        this.galaxyData = galaxyData;
        this.camera = camera;
        
        this.createCanvas();
        this.setupEventListeners();
        this.calculatePosition();
        
        console.log('✅ MinimapNavigation инициализирован', {
            visible: this.isVisible,
            size: this.size,
            data: !!galaxyData
        });
        
        return Promise.resolve();
    }

    createCanvas() {
        // Создаем canvas элемент
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.canvas.id = 'minimap-canvas';
        
        this.ctx = this.canvas.getContext('2d');
        
        // Стилизация
        this.canvas.style.cssText = `
            position: fixed;
            top: ${this.position.y}px;
            right: ${this.position.x}px;
            width: ${this.size}px;
            height: ${this.size}px;
            background: ${this.styles.background};
            border: ${this.styles.border};
            border-radius: 10px;
            cursor: pointer;
            z-index: 999;
            backdrop-filter: blur(10px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            display: none;
        `;

        document.body.appendChild(this.canvas);
        
        // Добавляем кнопку управления
        this.createControlButton();
    }

    createControlButton() {
        this.controlButton = document.createElement('button');
        this.controlButton.innerHTML = '🗺️';
        this.controlButton.title = 'Показать/скрыть миникарту';
        this.controlButton.style.cssText = `
            position: fixed;
            top: ${this.position.y}px;
            right: ${this.position.x}px;
            width: 40px;
            height: 40px;
            background: rgba(12, 12, 46, 0.8);
            border: 1px solid rgba(78, 205, 196, 0.5);
            border-radius: 50%;
            color: #4ECDC4;
            cursor: pointer;
            z-index: 998;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        `;

        this.controlButton.addEventListener('mouseenter', () => {
            this.controlButton.style.background = '#4ECDC4';
            this.controlButton.style.color = '#0c0c2e';
            this.controlButton.style.transform = 'scale(1.1)';
        });

        this.controlButton.addEventListener('mouseleave', () => {
            this.controlButton.style.background = 'rgba(12, 12, 46, 0.8)';
            this.controlButton.style.color = '#4ECDC4';
            this.controlButton.style.transform = 'scale(1)';
        });

        this.controlButton.addEventListener('click', () => this.toggleVisibility());

        document.body.appendChild(this.controlButton);
    }

    setupEventListeners() {
        if (!this.canvas) return;

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());

        // Window events
        window.addEventListener('resize', () => this.handleResize());

        console.log('🎮 Обработчики миникарты установлены');
    }

    calculatePosition() {
        // Позиционируем в правом верхнем углу с отступом
        this.position = {
            x: this.margin,
            y: this.margin
        };
        
        this.updateElementPositions();
    }

    updateElementPositions() {
        if (this.canvas) {
            this.canvas.style.top = `${this.position.y}px`;
            this.canvas.style.right = `${this.position.x}px`;
        }
        
        if (this.controlButton) {
            this.controlButton.style.top = `${this.position.y}px`;
            this.controlButton.style.right = `${this.position.x}px`;
        }
    }

    // ===== RENDERING =====
    render() {
        if (!this.isVisible || !this.ctx || !this.galaxyData) return;

        this.clearCanvas();
        this.renderGalaxy();
        this.renderViewport();
        this.renderBorder();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.size, this.size);
        
        // Фон с закругленными углами
        this.ctx.fillStyle = this.styles.background;
        this.ctx.beginPath();
        this.ctx.roundRect(0, 0, this.size, this.size, 8);
        this.ctx.fill();
    }

    renderGalaxy() {
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        const baseScale = this.calculateBaseScale();

        // Рендерим центральную галактику
        this.renderEntity(centerX, centerY, 'galaxy', 8);

        // Рендерим дочерние объекты
        if (this.galaxyData.children) {
            this.renderChildren(this.galaxyData.children, centerX, centerY, baseScale);
        }
    }

    renderChildren(entities, parentX, parentY, baseScale) {
        entities.forEach((entity, index) => {
            const angle = (index / entities.length) * Math.PI * 2;
            const distance = this.getOrbitDistance(entity.type) * baseScale;
            
            const entityX = parentX + Math.cos(angle) * distance;
            const entityY = parentY + Math.sin(angle) * distance;
            
            this.renderEntity(entityX, entityY, entity.type, 4);
            
            // Рекурсивно рендерим вложенные объекты
            if (entity.children && entity.children.length > 0) {
                this.renderChildren(entity.children, entityX, entityY, baseScale * 0.6);
            }
        });
    }

    renderEntity(x, y, type, size) {
        const color = ENTITY_COLORS[type] || ENTITY_COLORS.unknown;
        
        // Свечение
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x - size * 1.5, y - size * 1.5, size * 3, size * 3);
        
        // Основная точка
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Обводка для лучшей видимости
        this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    renderViewport() {
        if (!this.camera) return;

        const viewport = this.camera.getViewportBounds();
        const scale = this.calculateBaseScale();
        const centerX = this.size / 2;
        const centerY = this.size / 2;

        // Рассчитываем размер viewport прямоугольника
        const viewportWidth = (this.size * 0.8) / this.camera.zoom;
        const viewportHeight = (this.size * 0.8) / this.camera.zoom;
        
        const viewportX = centerX - (this.camera.x * scale) - (viewportWidth / 2);
        const viewportY = centerY - (this.camera.y * scale) - (viewportHeight / 2);

        // Сохраняем для обработки взаимодействий
        this.viewportRect = {
            x: viewportX,
            y: viewportY,
            width: viewportWidth,
            height: viewportHeight
        };

        // Рисуем viewport
        this.ctx.strokeStyle = this.styles.viewportBorder;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.rect(viewportX, viewportY, viewportWidth, viewportHeight);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
        
        // Заливка viewport
        this.ctx.fillStyle = this.styles.viewport;
        this.ctx.fillRect(viewportX, viewportY, viewportWidth, viewportHeight);
    }

    renderBorder() {
        // Декоративная обводка
        this.ctx.strokeStyle = 'rgba(78, 205, 196, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(1, 1, this.size - 2, this.size - 2, 8);
        this.ctx.stroke();
    }

    // ===== INTERACTION HANDLERS =====
    handleMouseDown(event) {
        event.preventDefault();
        this.isDragging = true;
        
        const rect = this.canvas.getBoundingClientRect();
        this.dragStart = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        this.canvas.style.cursor = 'grabbing';
    }

    handleMouseMove(event) {
        if (!this.isDragging) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentX = event.clientX - rect.left;
        const currentY = event.clientY - rect.top;
        
        const deltaX = currentX - this.dragStart.x;
        const deltaY = currentY - this.dragStart.y;
        
        // Перемещаем миникарту
        this.position.x = Math.max(0, this.position.x - deltaX);
        this.position.y = Math.max(0, this.position.y - deltaY);
        
        this.updateElementPositions();
        
        this.dragStart = { x: currentX, y: currentY };
    }

    handleMouseUp() {
        this.isDragging = false;
        this.canvas.style.cursor = 'pointer';
    }

    handleClick(event) {
        if (this.isDragging) {
            this.isDragging = false;
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        // Если клик внутри viewport, игнорируем
        if (this.isPointInViewport(clickX, clickY)) {
            return;
        }

        // Центрируем камеру на clicked точке
        this.centerCameraOnPoint(clickX, clickY);
    }

    handleTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            
            this.dragStart = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            this.isDragging = true;
        }
    }

    handleTouchMove(event) {
        if (!this.isDragging || event.touches.length !== 1) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const currentX = touch.clientX - rect.left;
        const currentY = touch.clientY - rect.top;
        
        const deltaX = currentX - this.dragStart.x;
        const deltaY = currentY - this.dragStart.y;
        
        this.position.x = Math.max(0, this.position.x - deltaX);
        this.position.y = Math.max(0, this.position.y - deltaY);
        
        this.updateElementPositions();
        this.dragStart = { x: currentX, y: currentY };
    }

    handleTouchEnd() {
        this.isDragging = false;
    }

    // ===== CAMERA CONTROL =====
    centerCameraOnPoint(minimapX, minimapY) {
        if (!this.camera) return;

        const centerX = this.size / 2;
        const centerY = this.size / 2;
        const scale = this.calculateBaseScale();

        // Преобразуем координаты миникарты в мировые координаты
        const worldX = (minimapX - centerX) / scale;
        const worldY = (minimapY - centerY) / scale;

        // Устанавливаем позицию камеры
        this.camera.x = -worldX;
        this.camera.y = -worldY;
        
        console.log('🎯 Камера центрирована через миникарту:', { x: worldX, y: worldY });
    }

    isPointInViewport(x, y) {
        if (!this.viewportRect) return false;
        
        return x >= this.viewportRect.x && 
               x <= this.viewportRect.x + this.viewportRect.width &&
               y >= this.viewportRect.y && 
               y <= this.viewportRect.y + this.viewportRect.height;
    }

    // ===== UTILITY METHODS =====
    calculateBaseScale() {
        // Базовый масштаб для отображения всей галактики
        const maxOrbit = this.getMaxOrbitDistance();
        return (this.size * 0.4) / (maxOrbit || 300);
    }

    getMaxOrbitDistance() {
        let maxDistance = 0;
        
        if (this.galaxyData.children) {
            this.galaxyData.children.forEach(planet => {
                const planetDistance = this.getOrbitDistance(planet.type);
                maxDistance = Math.max(maxDistance, planetDistance);
                
                if (planet.children) {
                    planet.children.forEach(moon => {
                        const moonDistance = planetDistance + this.getOrbitDistance(moon.type);
                        maxDistance = Math.max(maxDistance, moonDistance);
                    });
                }
            });
        }
        
        return maxDistance || 300;
    }

    getOrbitDistance(entityType) {
        const distances = {
            galaxy: 0,
            planet: 150,
            moon: 60,
            asteroid: 40,
            debris: 20
        };
        
        return distances[entityType] || 50;
    }

    // ===== PUBLIC API =====
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        
        if (this.canvas) {
            this.canvas.style.display = this.isVisible ? 'block' : 'none';
        }
        
        if (this.controlButton) {
            this.controlButton.innerHTML = this.isVisible ? '🧭' : '🗺️';
            this.controlButton.title = this.isVisible ? 'Скрыть миникарту' : 'Показать миникарту';
        }
        
        if (this.isVisible) {
            this.render();
        }
        
        console.log('🗺️ Миникарта:', this.isVisible ? 'показана' : 'скрыта');
        
        // Показываем уведомление
        this.showNotification(`Миникарта: ${this.isVisible ? 'включена' : 'выключена'}`);
    }

    showNotification(message, duration = 2000) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: rgba(12, 12, 46, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(78, 205, 196, 0.5);
            border-radius: 20px;
            padding: 8px 16px;
            color: #4ECDC4;
            font-size: 12px;
            z-index: 1000;
            animation: fadeInOut 2s ease;
        `;

        // Добавляем стили анимации если их нет
        if (!document.querySelector('#minimap-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'minimap-notification-styles';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(-10px); }
                    20% { opacity: 1; transform: translateY(0); }
                    80% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }

    updateData(newGalaxyData) {
        this.galaxyData = newGalaxyData;
        
        if (this.isVisible) {
            this.render();
        }
    }

    handleResize() {
        this.calculatePosition();
        
        if (this.isVisible) {
            this.render();
        }
    }

    // ===== DEBUG METHODS =====
    getMinimapInfo() {
        return {
            visible: this.isVisible,
            position: this.position,
            size: this.size,
            viewport: this.viewportRect,
            data: !!this.galaxyData,
            camera: !!this.camera
        };
    }

    logState() {
        console.log('🗺️ Состояние миникарты:', this.getMinimapInfo());
    }

    // ===== DESTRUCTOR =====
    destroy() {
        // Удаляем элементы DOM
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        if (this.controlButton && this.controlButton.parentNode) {
            this.controlButton.parentNode.removeChild(this.controlButton);
        }
        
        // Удаляем обработчики событий
        window.removeEventListener('resize', this.handleResize);
        
        console.log('🧹 MinimapNavigation уничтожен');
    }
}

// Глобальная ссылка для отладки
window.minimap = null;

export default MinimapNavigation;
