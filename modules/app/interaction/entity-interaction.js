// modules/app/interaction/entity-interaction.js
export class EntityInteraction {
    constructor() {
        this.renderer = null;
        this.progression = null;
        this.camera = null;
        this.galaxyData = null;
        
        // Состояние взаимодействий
        this.hoveredEntity = null;
        this.selectedEntity = null;
        this.hoverRadius = 40; // Радиус попадания для hover
        
        // Визуальные эффекты
        this.highlightColor = '#FFD700';
        this.highlightGlow = 15;
        
        console.log('🎯 EntityInteraction создан');
    }

    init(renderer, progression, camera) {
        this.renderer = renderer;
        this.progression = progression;
        this.camera = camera;
        
        this.setupEventListeners();
        console.log('✅ EntityInteraction инициализирован');
    }

    setGalaxyData(galaxyData) {
        this.galaxyData = galaxyData;
    }

    setupEventListeners() {
        if (!this.renderer?.canvas) return;

        const canvas = this.renderer.canvas;

        // Mouse events
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('click', (e) => this.handleClick(e));
        canvas.addEventListener('mouseleave', () => this.handleMouseLeave());

        // Touch events
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        console.log('🖱️ Обработчики взаимодействий установлены');
    }

    // ===== MOUSE INTERACTIONS =====
    handleMouseMove(event) {
        if (!this.galaxyData) return;

        const rect = this.renderer.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const previousHovered = this.hoveredEntity;
        this.hoveredEntity = this.getEntityAtPosition(mouseX, mouseY);

        // Обновляем курсор если нужно
        if (this.hoveredEntity) {
            this.renderer.canvas.style.cursor = 'pointer';
        } else {
            this.renderer.canvas.style.cursor = 'default';
        }

        // Если ховер изменился, перерисовываем
        if (previousHovered !== this.hoveredEntity) {
            this.onHoverChange(previousHovered, this.hoveredEntity);
        }
    }

    handleClick(event) {
        if (!this.hoveredEntity) return;

        event.preventDefault();
        this.selectEntity(this.hoveredEntity);
    }

    handleMouseLeave() {
        if (this.hoveredEntity) {
            this.onHoverChange(this.hoveredEntity, null);
            this.hoveredEntity = null;
        }
        this.renderer.canvas.style.cursor = 'default';
    }

    // ===== TOUCH INTERACTIONS =====
    handleTouchStart(event) {
        if (!this.galaxyData) return;

        event.preventDefault();
        const touch = event.touches[0];
        const rect = this.renderer.canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        this.hoveredEntity = this.getEntityAtPosition(touchX, touchY);
    }

    handleTouchEnd(event) {
        if (!this.hoveredEntity) return;

        event.preventDefault();
        this.selectEntity(this.hoveredEntity);
        
        // Сбрасываем ховер после тапа
        setTimeout(() => {
            this.hoveredEntity = null;
        }, 100);
    }

    // ===== KEYBOARD INTERACTIONS =====
    handleKeyDown(event) {
        switch (event.key) {
            case 'Escape':
                this.deselectEntity();
                break;
            case 'Enter':
                if (this.selectedEntity) {
                    this.openEntityPage(this.selectedEntity);
                }
                break;
        }
    }

    // ===== ENTITY SELECTION =====
    selectEntity(entity) {
        if (this.selectedEntity === entity) return;

        const previousSelected = this.selectedEntity;
        this.selectedEntity = entity;

        // Отмечаем как исследованную
        this.progression.discoverEntity(entity.id || entity.path);
        
        // Показываем информацию о сущности
        this.showEntityInfo(entity);
        
        // Визуальная обратная связь
        this.onSelectionChange(previousSelected, entity);
        
        console.log('🔍 Выбрана сущность:', {
            name: entity.name,
            type: entity.type,
            path: entity.path
        });
    }

    deselectEntity() {
        if (!this.selectedEntity) return;

        const previousSelected = this.selectedEntity;
        this.selectedEntity = null;
        
        this.hideEntityInfo();
        this.onSelectionChange(previousSelected, null);
        
        console.log('❌ Выбор сущности сброшен');
    }

    // ===== ENTITY DETECTION =====
    getEntityAtPosition(screenX, screenY) {
        if (!this.galaxyData?.children) return null;

        const worldPos = this.camera.screenToWorld(screenX, screenY);
        
        // Проверяем планеты
        const planet = this.findEntityAtPosition(
            this.galaxyData.children, 
            worldPos.x, 
            worldPos.y
        );
        
        if (planet) return planet;

        // TODO: В будущем можно добавить проверку спутников и других сущностей
        
        return null;
    }

    findEntityAtPosition(entities, worldX, worldY) {
        for (const entity of entities) {
            const entityPos = this.getEntityPosition(entity);
            if (!entityPos) continue;

            const distance = Math.sqrt(
                Math.pow(worldX - entityPos.x, 2) + 
                Math.pow(worldY - entityPos.y, 2)
            );

            // Радиус попадания зависит от типа сущности
            const hitRadius = this.getEntityHitRadius(entity);
            
            if (distance <= hitRadius) {
                return entity;
            }
        }
        return null;
    }

    getEntityPosition(entity) {
        // Для простоты считаем, что все планеты расположены по кругу
        // В реальном приложении здесь должна быть логика позиционирования из рендерера
        const planets = this.galaxyData?.children || [];
        const index = planets.findIndex(p => p === entity);
        
        if (index === -1) return null;

        const angle = (index / planets.length) * Math.PI * 2;
        const distance = 200; // Должно совпадать с рендерером
        
        return {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance
        };
    }

    getEntityHitRadius(entity) {
        // Разные сущности имеют разные радиусы попадания
        const baseSizes = {
            galaxy: 50,
            planet: 30,
            moon: 20,
            asteroid: 15,
            debris: 10
        };
        
        return (baseSizes[entity.type] || 25) / this.camera.zoom;
    }

    // ===== VISUAL FEEDBACK =====
    onHoverChange(previousEntity, newEntity) {
        // Можно добавить визуальные эффекты при наведении
        // Например, подсветку или анимацию
        
        if (previousEntity) {
            console.log('🚪 Ушли с сущности:', previousEntity.name);
        }
        
        if (newEntity) {
            console.log('🎯 Навели на сущность:', newEntity.name);
        }
        
        // Перерисовываем сцену чтобы показать/скрыть эффекты
        this.requestRender();
    }

    onSelectionChange(previousEntity, newEntity) {
        // Визуальная обратная связь при выборе сущности
        
        if (previousEntity) {
            console.log('📤 Снят выбор с:', previousEntity.name);
        }
        
        if (newEntity) {
            console.log('📥 Выбрана:', newEntity.name);
            this.showSelectionEffect(newEntity);
        } else {
            this.hideSelectionEffect();
        }
        
        this.requestRender();
    }

    showSelectionEffect(entity) {
        // Анимация выбора - пульсация, свечение и т.д.
        this.startPulseAnimation(entity);
    }

    hideSelectionEffect() {
        // Останавливаем анимации выбора
        this.stopPulseAnimation();
    }

    startPulseAnimation(entity) {
        // Простая анимация пульсации выбранной сущности
        let scale = 1;
        const pulseSpeed = 0.05;
        
        this.pulseAnimation = setInterval(() => {
            scale = 1 + Math.sin(Date.now() * pulseSpeed) * 0.1;
            
            // Здесь можно обновить визуальное представление
            // Например, через кастомные свойства в рендерере
            
        }, 50);
    }

    stopPulseAnimation() {
        if (this.pulseAnimation) {
            clearInterval(this.pulseAnimation);
            this.pulseAnimation = null;
        }
    }

    // ===== ENTITY INFORMATION =====
    showEntityInfo(entity) {
        this.createInfoPanel(entity);
        this.updateProgressDisplay();
    }

    hideEntityInfo() {
        this.removeInfoPanel();
    }

    createInfoPanel(entity) {
        // Удаляем существующую панель если есть
        this.removeInfoPanel();

        // Создаем панель информации
        const infoPanel = document.createElement('div');
        infoPanel.id = 'entity-info-panel';
        infoPanel.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(12, 12, 46, 0.95);
            backdrop-filter: blur(10px);
            border: 2px solid #4ECDC4;
            border-radius: 15px;
            padding: 20px;
            color: white;
            max-width: 300px;
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            animation: slideIn 0.3s ease;
        `;

        const entityIcon = this.getEntityIcon(entity.type);
        const isDiscovered = this.progression.isDiscovered(entity.id || entity.path);

        infoPanel.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                <span style="font-size: 24px;">${entityIcon}</span>
                <h3 style="margin: 0; color: #4ECDC4;">${entity.config?.title || entity.name}</h3>
                ${isDiscovered ? '<span style="color: #4ECDC4;">✅</span>' : '<span style="color: #FFD700;">🔍</span>'}
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="font-size: 14px; color: #a0a0cc; margin-bottom: 5px;">Тип: ${this.getEntityTypeName(entity.type)}</div>
                ${entity.config?.description ? `<div style="font-size: 14px; margin-bottom: 10px;">${entity.config.description}</div>` : ''}
                <div style="font-size: 12px; color: #888;">Путь: ${entity.path}</div>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="entityInteraction.openEntityPage(entityInteraction.selectedEntity)" 
                        style="background: #4ECDC4; color: #0c0c2e; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-weight: bold;">
                    🌐 Открыть
                </button>
                <button onclick="entityInteraction.deselectEntity()" 
                        style="background: rgba(255,255,255,0.1); color: white; border: 1px solid #4ECDC4; padding: 8px 16px; border-radius: 20px; cursor: pointer;">
                    ✕ Закрыть
                </button>
            </div>
        `;

        document.body.appendChild(infoPanel);

        // Добавляем стили анимации если их нет
        if (!document.querySelector('#info-panel-styles')) {
            const style = document.createElement('style');
            style.id = 'info-panel-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(-100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        this.infoPanel = infoPanel;
    }

    removeInfoPanel() {
        if (this.infoPanel) {
            this.infoPanel.remove();
            this.infoPanel = null;
        }
    }

    // ===== ENTITY NAVIGATION =====
    openEntityPage(entity) {
        if (!entity.fullUrl) {
            console.warn('❌ Нет URL для сущности:', entity);
            return;
        }

        console.log('🌐 Открытие страницы сущности:', entity.fullUrl);
        window.open(entity.fullUrl, '_blank');
    }

    // ===== UTILITY METHODS =====
    getEntityIcon(type) {
        const icons = {
            galaxy: '⭐',
            planet: '🪐',
            moon: '🌙',
            asteroid: '☄️',
            debris: '🛰️'
        };
        return icons[type] || '📁';
    }

    getEntityTypeName(type) {
        const names = {
            galaxy: 'Галактика',
            planet: 'Планета',
            moon: 'Спутник',
            asteroid: 'Астероид',
            debris: 'Объект'
        };
        return names[type] || type;
    }

    updateProgressDisplay() {
        // Обновляем отображение прогресса через userPanel если доступен
        if (this.progression && typeof this.progression.updateProgressDisplay === 'function') {
            this.progression.updateProgressDisplay();
        }
    }

    requestRender() {
        // Запрашиваем перерисовку сцены
        if (this.renderer && this.galaxyData && this.camera) {
            this.renderer.render(this.galaxyData, this.camera);
        }
    }

    // ===== DEBUG METHODS =====
    logInteractionState() {
        console.log('🎯 Состояние взаимодействий:', {
            hovered: this.hoveredEntity?.name,
            selected: this.selectedEntity?.name,
            discoveredCount: this.progression.getDiscoveredCount()
        });
    }

    // ===== DESTRUCTOR =====
    destroy() {
        this.removeInfoPanel();
        this.stopPulseAnimation();
        
        // Удаляем обработчики событий
        if (this.renderer?.canvas) {
            const canvas = this.renderer.canvas;
            const events = ['mousemove', 'click', 'mouseleave', 'touchstart', 'touchend'];
            
            events.forEach(event => {
                canvas.removeEventListener(event, this[`handle${event.charAt(0).toUpperCase() + event.slice(1)}`]);
            });
        }
        
        document.removeEventListener('keydown', this.handleKeyDown);
        
        console.log('🧹 EntityInteraction уничтожен');
    }
}

// Глобальная ссылка для вызовов из HTML
window.entityInteraction = null;

export default EntityInteraction;
