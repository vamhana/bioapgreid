export class EntityInteraction {
    constructor() {
        this.renderer = null;
        this.progression = null;
        this.camera = null;
        this.galaxyData = null;
        
        // Состояние взаимодействий
        this.hoveredEntity = null;
        this.selectedEntity = null;
        
        // Визуальные эффекты
        this.highlightColor = '#FFD700';
        this.highlightGlow = 15;
        
        // Анимации
        this.pulseAnimation = null;
        this.infoPanel = null;
        
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
        // Обработчики теперь устанавливаются в app.js
        // Оставляем только обработку клавиатуры
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        console.log('⌨️ Обработчики клавиатуры установлены');
    }

    // ===== MOUSE INTERACTIONS (вызываются из app.js) =====
    handleMouseOver(entityData) {
        const previousHovered = this.hoveredEntity;
        
        if (entityData && entityData.entityData) {
            this.hoveredEntity = entityData.entityData;
        } else {
            this.hoveredEntity = null;
        }

        // Обновляем курсор
        if (this.hoveredEntity && this.renderer?.canvas) {
            this.renderer.canvas.style.cursor = 'pointer';
        } else if (this.renderer?.canvas) {
            this.renderer.canvas.style.cursor = 'default';
        }

        // Если ховер изменился
        if (previousHovered !== this.hoveredEntity) {
            this.onHoverChange(previousHovered, this.hoveredEntity);
        }
    }

    handleEntityClick(entityData) {
        if (!entityData) return;

        const entity = entityData.entityData || entityData;
        this.selectEntity(entity);
    }

    // ===== TOUCH INTERACTIONS (вызываются из app.js) =====
    handleTouchStart(event) {
        // Базовая реализация - предотвращаем стандартное поведение
        event.preventDefault();
    }

    handleTouchMove(event) {
        event.preventDefault();
    }

    handleTouchEnd(event) {
        event.preventDefault();
    }

    // ===== KEYBOARD INTERACTIONS =====
    handleKeyDown(event) {
        // Игнорируем сочетания с Ctrl/Alt/Meta
        if (event.ctrlKey || event.altKey || event.metaKey) return;

        switch (event.key) {
            case 'Escape':
                this.deselectEntity();
                break;
            case 'Enter':
                if (this.selectedEntity) {
                    this.openEntityPage(this.selectedEntity);
                }
                break;
            case ' ':
                event.preventDefault();
                if (this.selectedEntity) {
                    this.focusOnSelectedEntity();
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
        if (this.progression && this.progression.discoverEntity) {
            const entityId = entity.cleanPath || entity.name || entity.id;
            this.progression.discoverEntity(entityId);
        }
        
        // Показываем информацию о сущности
        this.showEntityInfo(entity);
        
        // Визуальная обратная связь
        this.onSelectionChange(previousSelected, entity);
        
        // Фокусируем камеру на выбранной сущности
        this.focusOnSelectedEntity();
        
        console.log('🔍 Выбрана сущность:', {
            name: entity.name,
            type: entity.type,
            path: entity.cleanPath || entity.name
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

    focusOnSelectedEntity() {
        if (!this.selectedEntity || !this.camera || !this.renderer) return;

        try {
            // Получаем позицию сущности из 3D данных
            const entityId = this.selectedEntity.cleanPath || this.selectedEntity.name;
            let position = null;

            // Ищем позицию в 3D данных
            if (this.galaxyData?.threeData?.positions) {
                const positions = this.galaxyData.threeData.positions;
                if (positions.has(entityId)) {
                    position = positions.get(entityId).absolute;
                }
            }

            // Если позиция не найдена, используем fallback
            if (!position && this.renderer.getEntity3DPosition) {
                position = this.renderer.getEntity3DPosition(entityId);
            }

            if (position) {
                this.camera.focusOnEntity(position, 200);
                console.log('🎥 Камера сфокусирована на сущности:', entityId);
            } else {
                console.warn('⚠️ Не удалось найти позицию для фокусировки:', entityId);
            }
        } catch (error) {
            console.error('❌ Ошибка фокусировки камеры:', error);
        }
    }

    // ===== VISUAL FEEDBACK =====
    onHoverChange(previousEntity, newEntity) {
        // Убираем подсветку с предыдущей сущности
        if (previousEntity) {
            const previousEntityId = previousEntity.cleanPath || previousEntity.name;
            this.renderer.highlightEntity(previousEntityId, false);
        }

        // Добавляем подсветку на новую сущность
        if (newEntity) {
            const newEntityId = newEntity.cleanPath || newEntity.name;
            this.renderer.highlightEntity(newEntityId, true);
        }

        // Запрашиваем перерисовку
        this.requestRender();
    }

    onSelectionChange(previousEntity, newEntity) {
        // Убираем подсветку с предыдущей выбранной сущности
        if (previousEntity) {
            const previousEntityId = previousEntity.cleanPath || previousEntity.name;
            this.renderer.highlightEntity(previousEntityId, false);
            this.stopPulseAnimation();
        }
        
        // Добавляем подсветку на новую выбранную сущность
        if (newEntity) {
            const newEntityId = newEntity.cleanPath || newEntity.name;
            this.renderer.highlightEntity(newEntityId, true);
            this.startPulseAnimation(newEntity);
        }
        
        // Запрашиваем перерисовку
        this.requestRender();
    }

    startPulseAnimation(entity) {
        // Анимация пульсации через систему анимации рендерера
        const entityId = entity.cleanPath || entity.name;
        
        if (this.renderer.animationSystem) {
            // Можно добавить специальную анимацию для выбранной сущности
            console.log('🎬 Запуск анимации пульсации для:', entityId);
        }
        
        // Простая CSS-анимация через интервал (как fallback)
        this.stopPulseAnimation();
        let scale = 1;
        const pulseSpeed = 0.05;
        
        this.pulseAnimation = setInterval(() => {
            scale = 1 + Math.sin(Date.now() * pulseSpeed) * 0.1;
            // Здесь можно обновить визуальное представление
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
            max-width: 350px;
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            animation: slideIn 0.3s ease;
        `;

        const entityIcon = this.getEntityIcon(entity.type);
        const entityId = entity.cleanPath || entity.name;
        const isDiscovered = this.progression && this.progression.isEntityDiscovered ? 
            this.progression.isEntityDiscovered(entityId) : false;

        infoPanel.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                <span style="font-size: 24px;">${entityIcon}</span>
                <div>
                    <h3 style="margin: 0; color: #4ECDC4;">${entity.config?.title || entity.name}</h3>
                    <div style="font-size: 12px; color: #a0a0cc;">
                        ${isDiscovered ? '✅ Исследовано' : '🔍 Не исследовано'}
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="font-size: 14px; color: #a0a0cc; margin-bottom: 5px;">
                    Тип: ${this.getEntityTypeName(entity.type)}
                </div>
                ${entity.config?.description ? `
                    <div style="font-size: 14px; margin-bottom: 10px; line-height: 1.4;">
                        ${entity.config.description}
                    </div>
                ` : ''}
                <div style="font-size: 12px; color: #888; font-family: monospace;">
                    ID: ${entityId}
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="window.galaxyApp?.entityInteraction?.openEntityPage(window.galaxyApp?.entityInteraction?.selectedEntity)" 
                        style="background: #4ECDC4; color: #0c0c2e; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-weight: bold; flex: 1;">
                    🌐 Открыть страницу
                </button>
                <button onclick="window.galaxyApp?.entityInteraction?.focusOnSelectedEntity()" 
                        style="background: rgba(255,215,0,0.2); color: #FFD700; border: 1px solid #FFD700; padding: 8px 16px; border-radius: 20px; cursor: pointer; flex: 1;">
                    🎥 Сфокусировать
                </button>
                <button onclick="window.galaxyApp?.entityInteraction?.deselectEntity()" 
                        style="background: rgba(255,255,255,0.1); color: white; border: 1px solid #666; padding: 8px 16px; border-radius: 20px; cursor: pointer;">
                    ✕ Закрыть
                </button>
            </div>
            
            ${entity.children && entity.children.length > 0 ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 12px; color: #a0a0cc; margin-bottom: 8px;">
                        Содержит: ${entity.children.length} объектов
                    </div>
                </div>
            ` : ''}
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
                #entity-info-panel button:hover {
                    transform: translateY(-1px);
                    transition: transform 0.2s ease;
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
        if (!entity) {
            console.warn('❌ Нет сущности для открытия страницы');
            return;
        }

        // Пытаемся получить URL разными способами
        let url = entity.fullUrl || entity.url || entity.path;
        
        if (!url) {
            // Формируем URL на основе cleanPath
            const entityPath = entity.cleanPath || entity.name;
            if (entityPath) {
                url = `/${entityPath}`;
            }
        }

        if (url) {
            console.log('🌐 Открытие страницы сущности:', url);
            window.open(url, '_blank');
        } else {
            console.warn('❌ Не удалось определить URL для сущности:', entity);
            this.showNotification('URL страницы не найден', 3000);
        }
    }

    // ===== UTILITY METHODS =====
    getEntityIcon(type) {
        const icons = {
            galaxy: '🌌',
            star: '⭐',
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
            star: 'Звезда',
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
        
        // Также можно обновить через app если доступен
        if (window.galaxyApp && typeof window.galaxyApp.updateProgressDisplay === 'function') {
            window.galaxyApp.updateProgressDisplay();
        }
    }

    requestRender() {
        // Запрашиваем перерисовку сцены через рендерер
        if (this.renderer && typeof this.renderer.render === 'function') {
            this.renderer.render();
        }
    }

    showNotification(message, duration = 2000) {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(12, 12, 46, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(78, 205, 196, 0.3);
            border-radius: 10px;
            padding: 15px 20px;
            color: white;
            z-index: 1002;
            animation: slideInRight 0.3s ease, slideOutRight 0.3s ease ${duration}ms forwards;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        // Добавляем стили анимации если их нет
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); }
                    to { transform: translateX(100%); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Удаляем уведомление после анимации
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration + 300);
    }

    // ===== DEBUG METHODS =====
    logInteractionState() {
        console.log('🎯 Состояние взаимодействий:', {
            hovered: this.hoveredEntity?.name,
            selected: this.selectedEntity?.name,
            discoveredCount: this.progression ? this.progression.getDiscoveredCount() : 0
        });
    }

    getInteractionStats() {
        return {
            hoveredEntity: this.hoveredEntity ? {
                name: this.hoveredEntity.name,
                type: this.hoveredEntity.type,
                id: this.hoveredEntity.cleanPath || this.hoveredEntity.name
            } : null,
            selectedEntity: this.selectedEntity ? {
                name: this.selectedEntity.name,
                type: this.selectedEntity.type,
                id: this.selectedEntity.cleanPath || this.selectedEntity.name
            } : null,
            progression: this.progression ? {
                discoveredCount: this.progression.getDiscoveredCount(),
                totalCount: this.progression.getTotalCount()
            } : null
        };
    }

    // ===== DESTRUCTOR =====
    destroy() {
        this.removeInfoPanel();
        this.stopPulseAnimation();
        this.deselectEntity();
        
        // Удаляем обработчики событий
        document.removeEventListener('keydown', this.handleKeyDown);
        
        console.log('🧹 EntityInteraction уничтожен');
    }
}

// Глобальная ссылка для вызовов из HTML
window.entityInteraction = null;

export default EntityInteraction;