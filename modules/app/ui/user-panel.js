export class UserPanel {
    constructor() {
        this.progression = null;
        this.panelElement = null;
        this.isVisible = true;
        
        // Элементы UI
        this.progressElement = null;
        this.controlsElement = null;
        this.statsElement = null;
        
        // Состояние
        this.currentSelection = null;
        
        console.log('👤 UserPanel создан');
    }

    init(progression) {
        this.progression = progression;
        this.createPanel();
        this.updateProgress();
        
        console.log('✅ UserPanel инициализирован');
    }

    createPanel() {
        // Создаем основную панель
        this.panelElement = document.createElement('div');
        this.panelElement.id = 'user-panel';
        this.panelElement.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(12, 12, 46, 0.95);
            backdrop-filter: blur(15px);
            border-top: 1px solid rgba(78, 205, 196, 0.3);
            padding: 15px 20px;
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            transition: transform 0.3s ease;
        `;

        // Создаем контейнер для прогресса
        this.progressElement = document.createElement('div');
        this.progressElement.style.cssText = `
            display: flex;
            align-items: center;
            gap: 15px;
            flex: 1;
        `;

        // Создаем контейнер для управления
        this.controlsElement = document.createElement('div');
        this.controlsElement.style.cssText = `
            display: flex;
            gap: 8px;
        `;

        // Создаем контейнер для статистики
        this.statsElement = document.createElement('div');
        this.statsElement.style.cssText = `
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 12px;
            color: #a0a0cc;
        `;

        // Собираем панель
        this.panelElement.appendChild(this.progressElement);
        this.panelElement.appendChild(this.statsElement);
        this.panelElement.appendChild(this.controlsElement);

        document.body.appendChild(this.panelElement);

        // Инициализируем компоненты
        this.createProgressDisplay();
        this.createStatsDisplay();
        this.createControls();
        
        console.log('📊 Панель пользователя создана');
    }

    createProgressDisplay() {
        // Основной прогресс исследования
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        progressContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px; color: #4ECDC4;">🌌</span>
                <div>
                    <div style="font-size: 14px; font-weight: bold;">Исследование</div>
                    <div style="font-size: 12px; color: #a0a0cc;">
                        <span id="progress-count">0</span> из <span id="total-entities">0</span> открыто
                    </div>
                </div>
            </div>
        `;

        // Прогресс-бар
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            width: 150px;
            height: 6px;
            background: rgba(255,255,255,0.1);
            border-radius: 3px;
            overflow: hidden;
            margin-left: 10px;
        `;

        const progressFill = document.createElement('div');
        progressFill.id = 'progress-fill';
        progressFill.style.cssText = `
            height: 100%;
            background: linear-gradient(90deg, #4ECDC4, #C7F464);
            border-radius: 3px;
            width: 0%;
            transition: width 0.5s ease;
        `;

        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);

        this.progressElement.appendChild(progressContainer);
    }

    createStatsDisplay() {
        // Текущий выбор
        const selectionDisplay = document.createElement('div');
        selectionDisplay.id = 'selection-display';
        selectionDisplay.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 200px;
        `;
        selectionDisplay.innerHTML = `
            <span style="color: #4ECDC4;">🎯</span>
            <span id="current-selection-name" style="font-size: 12px;">Ничего не выбрано</span>
        `;

        // Время сессии
        const sessionTime = document.createElement('div');
        sessionTime.id = 'session-time';
        sessionTime.style.cssText = `
            display: flex;
            align-items: center;
            gap: 5px;
        `;
        sessionTime.innerHTML = `
            <span>⏱️</span>
            <span id="time-counter">00:00</span>
        `;

        this.statsElement.appendChild(selectionDisplay);
        this.statsElement.appendChild(sessionTime);

        // Запускаем таймер сессии
        this.startSessionTimer();
    }

    createControls() {
        // Кнопка переключения орбит
        const orbitsButton = this.createControlButton(
            '🔄 Орбиты',
            'Переключить отображение орбит',
            () => {
                if (window.app && window.app.toggleOrbits) {
                    window.app.toggleOrbits();
                }
            }
        );

        // Кнопка сброса камеры
        const resetButton = this.createControlButton(
            '🗺️ Обзор',
            'Сбросить камеру к общему виду',
            () => {
                if (window.app && window.app.resetZoom) {
                    window.app.resetZoom();
                }
            }
        );

        // Кнопка миникарты
        const minimapButton = this.createControlButton(
            '🧭 Миникарта',
            'Показать/скрыть миникарту',
            () => {
                if (window.app && window.app.toggleMinimap) {
                    window.app.toggleMinimap();
                }
            }
        );

        // Кнопка диагностики
        const diagnosticsButton = this.createControlButton(
            '🧪 Диагностика',
            'Открыть страницу диагностики',
            () => {
                window.open('/module-test.html', '_blank');
            }
        );

        // Кнопка скрытия панели
        const toggleButton = this.createControlButton(
            '📁',
            'Скрыть/показать панель',
            () => this.toggleVisibility()
        );

        this.controlsElement.appendChild(orbitsButton);
        this.controlsElement.appendChild(resetButton);
        this.controlsElement.appendChild(minimapButton);
        this.controlsElement.appendChild(diagnosticsButton);
        this.controlsElement.appendChild(toggleButton);
    }

    createControlButton(text, title, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.title = title;
        button.style.cssText = `
            background: rgba(78, 205, 196, 0.15);
            border: 1px solid rgba(78, 205, 196, 0.3);
            color: #4ECDC4;
            padding: 8px 12px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
            font-family: inherit;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.background = '#4ECDC4';
            button.style.color = '#0c0c2e';
            button.style.transform = 'translateY(-1px)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = 'rgba(78, 205, 196, 0.15)';
            button.style.color = '#4ECDC4';
            button.style.transform = 'translateY(0)';
        });

        button.addEventListener('click', onClick);

        return button;
    }

    // ===== PROGRESS MANAGEMENT =====
    updateProgress() {
        if (!this.progression) return;

        const progressCount = document.getElementById('progress-count');
        const progressFill = document.getElementById('progress-fill');
        
        if (progressCount) {
            const discovered = this.progression.getDiscoveredCount();
            const total = this.getTotalEntities();
            progressCount.textContent = discovered;
            
            // Обновляем прогресс-бар
            if (progressFill && total > 0) {
                const percentage = (discovered / total) * 100;
                progressFill.style.width = `${percentage}%`;
            }
        }
    }

    updateSelection(entity) {
        this.currentSelection = entity;
        const selectionElement = document.getElementById('current-selection-name');
        
        if (!selectionElement) return;

        if (entity) {
            const icon = this.getEntityIcon(entity.type);
            selectionElement.innerHTML = `<strong>${icon} ${entity.config?.title || entity.name}</strong>`;
            selectionElement.style.color = '#4ECDC4';
        } else {
            selectionElement.textContent = 'Ничего не выбрано';
            selectionElement.style.color = '#a0a0cc';
        }
    }

    // ===== SESSION MANAGEMENT =====
    startSessionTimer() {
        this.sessionStartTime = Date.now();
        this.updateSessionTime();
        
        this.sessionTimer = setInterval(() => {
            this.updateSessionTime();
        }, 1000);
    }

    updateSessionTime() {
        const timeElement = document.getElementById('time-counter');
        if (!timeElement) return;

        const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // ===== ACHIEVEMENTS AND NOTIFICATIONS =====
    showAchievement(title, description = '', type = 'info') {
        const achievement = document.createElement('div');
        achievement.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: rgba(12, 12, 46, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid ${this.getAchievementColor(type)};
            border-radius: 10px;
            padding: 15px;
            color: white;
            z-index: 1001;
            max-width: 300px;
            animation: slideInRight 0.5s ease, slideOutRight 0.5s ease 3s forwards;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;

        const icon = this.getAchievementIcon(type);
        achievement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <span style="font-size: 20px;">${icon}</span>
                <strong style="color: ${this.getAchievementColor(type)};">${title}</strong>
            </div>
            ${description ? `<div style="font-size: 12px; color: #a0a0cc;">${description}</div>` : ''}
        `;

        document.body.appendChild(achievement);

        // Добавляем стили анимации если их нет
        if (!document.querySelector('#achievement-styles')) {
            const style = document.createElement('style');
            style.id = 'achievement-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        // Удаляем уведомление после анимации
        setTimeout(() => {
            if (achievement.parentNode) {
                achievement.parentNode.removeChild(achievement);
            }
        }, 3500);

        console.log('🏆 Достижение:', title, description);
    }

    getAchievementIcon(type) {
        const icons = {
            info: '💡',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            discovery: '🌟',
            milestone: '🏆'
        };
        return icons[type] || '💡';
    }

    getAchievementColor(type) {
        const colors = {
            info: '#4ECDC4',
            success: '#C7F464',
            warning: '#FFC107',
            error: '#FF6B6B',
            discovery: '#FFD700',
            milestone: '#45b7d1'
        };
        return colors[type] || '#4ECDC4';
    }

    // ===== PANEL CONTROLS =====
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        
        if (this.panelElement) {
            this.panelElement.style.transform = this.isVisible 
                ? 'translateY(0)' 
                : 'translateY(100%)';
        }

        // Показываем уведомление о состоянии
        const message = this.isVisible ? 'Панель показана' : 'Панель скрыта';
        this.showAchievement(message, '', 'info');
    }

    setTotalEntities(count) {
        const totalElement = document.getElementById('total-entities');
        if (totalElement) {
            totalElement.textContent = count;
        }
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

    getTotalEntities() {
        // Это должно приходить из galaxyData
        // Пока возвращаем заглушку
        return this.progression.getTotalEntities 
            ? this.progression.getTotalEntities() 
            : 10; // Временное значение
    }

    // ===== RESPONSIVE HANDLING =====
    handleResize() {
        // Адаптируем панель под разные размеры экрана
        if (window.innerWidth < 768) {
            // Мобильный вид
            this.panelElement.style.padding = '10px 15px';
            this.panelElement.style.flexDirection = 'column';
            this.panelElement.style.gap = '10px';
            
            this.controlsElement.style.gap = '5px';
        } else {
            // Десктопный вид
            this.panelElement.style.padding = '15px 20px';
            this.panelElement.style.flexDirection = 'row';
            this.panelElement.style.gap = '0';
            
            this.controlsElement.style.gap = '8px';
        }
    }

    // ===== DEBUG METHODS =====
    logPanelState() {
        console.log('👤 Состояние панели:', {
            visible: this.isVisible,
            selection: this.currentSelection?.name,
            progress: this.progression?.getDiscoveredCount()
        });
    }

    // ===== DESTRUCTOR =====
    destroy() {
        // Останавливаем таймер
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }
        
        // Удаляем панель
        if (this.panelElement && this.panelElement.parentNode) {
            this.panelElement.parentNode.removeChild(this.panelElement);
        }
        
        console.log('🧹 UserPanel уничтожен');
    }
}

export default UserPanel;
