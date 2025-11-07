// ===== CELL INTERACTION SYSTEM =====

class CellInteraction {
    constructor() {
        this.organelles = new Map();
        this.activeOrganelle = null;
        this.isAnimating = false;
        this.organellesContainer = null;
        
        // Привязка методов для корректного удаления событий
        this.boundClickHandler = this.handleOrganelleClick.bind(this);
        this.boundMouseOverHandler = this.handleOrganelleHover.bind(this, true);
        this.boundMouseOutHandler = this.handleOrganelleHover.bind(this, false);
        this.boundKeyHandler = this.handleKeyboard.bind(this);
        this.boundDNAChangeHandler = this.syncWithDNA.bind(this);
        
        this.init();
    }

    init() {
        try {
            this.organellesContainer = document.querySelector('.organelles-container');
            if (!this.organellesContainer) {
                throw new Error('Organelles container not found');
            }
            
            this.registerOrganelles();
            this.bindEvents();
            this.createMembraneParticles();
            this.restoreState();
            
        } catch (error) {
            console.error('CellInteraction initialization failed:', error);
        }
    }

    registerOrganelles() {
        const organelleElements = this.organellesContainer.querySelectorAll('.organelle');
        
        if (organelleElements.length === 0) {
            console.warn('No organelles found in container');
            return;
        }

        organelleElements.forEach(org => {
            const type = org.getAttribute('data-organelle');
            const level = org.getAttribute('data-level');
            
            if (!type || !level) {
                console.warn('Organelle missing data attributes:', org);
                return;
            }

            this.organelles.set(type, {
                element: org,
                type: type,
                level: level,
                isActive: false
            });

            // Добавляем ARIA-атрибуты
            org.setAttribute('role', 'button');
            org.setAttribute('tabindex', '0');
            org.setAttribute('aria-label', `${type} органелла, уровень ${level}`);
        });
    }

    bindEvents() {
        // Делегирование событий для органелл
        this.organellesContainer.addEventListener('click', this.boundClickHandler);
        this.organellesContainer.addEventListener('mouseover', this.boundMouseOverHandler);
        this.organellesContainer.addEventListener('mouseout', this.boundMouseOutHandler);
        document.addEventListener('keydown', this.boundKeyHandler);
        document.addEventListener('dnaLevelChange', this.boundDNAChangeHandler);

        // Обработка клавиши Enter для доступности
        this.organellesContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const organelle = e.target.closest('.organelle');
                if (organelle) {
                    e.preventDefault();
                    const type = organelle.getAttribute('data-organelle');
                    this.activateOrganelle(type);
                }
            }
        });
    }

    handleOrganelleClick(e) {
        const organelle = e.target.closest('.organelle');
        if (organelle && !this.isAnimating) {
            const type = organelle.getAttribute('data-organelle');
            this.activateOrganelle(type);
        }
    }

    handleOrganelleHover(isHovering, e) {
        const organelle = e.target.closest('.organelle');
        if (organelle) {
            this.onOrganelleHover(organelle, isHovering);
        }
    }

    validateOrganelleType(organelleType) {
        if (!this.organelles.has(organelleType)) {
            throw new Error(`Invalid organelle type: ${organelleType}. Available: ${Array.from(this.organelles.keys())}`);
        }
        return true;
    }

    activateOrganelle(organelleType) {
        try {
            if (this.isAnimating) {
                console.warn('Animation in progress, please wait');
                return;
            }

            if (this.activeOrganelle === organelleType) {
                return; // Уже активна
            }

            this.validateOrganelleType(organelleType);
            
            this.isAnimating = true;
            const organelle = this.organelles.get(organelleType);
            
            this.animateOrganelleActivation(organelle);
            
        } catch (error) {
            console.error('Failed to activate organelle:', error);
            this.isAnimating = false;
            this.showErrorNotification(`Ошибка активации: ${error.message}`);
        }
    }

    animateOrganelleActivation(organelle) {
        try {
            // Деактивируем текущую активную органеллу
            if (this.activeOrganelle) {
                const current = this.organelles.get(this.activeOrganelle);
                this.deactivateOrganelle(current);
            }

            // Добавляем классы для анимации
            organelle.element.classList.add('active', 'entering');
            organelle.isActive = true;
            this.activeOrganelle = organelle.type;

            // Обновляем ARIA-атрибуты
            organelle.element.setAttribute('aria-current', 'true');
            organelle.element.setAttribute('aria-expanded', 'true');

            this.saveState();
            this.dispatchOrganelleActivation(organelle.type, organelle.level);

            // Завершаем анимацию
            setTimeout(() => {
                organelle.element.classList.remove('entering');
                this.isAnimating = false;
                this.showOrganelleContent(organelle.level);
            }, 1000);

        } catch (error) {
            console.error('Organelle activation animation failed:', error);
            this.isAnimating = false;
        }
    }

    deactivateOrganelle(organelle) {
        if (!organelle) return;

        organelle.element.classList.remove('active');
        organelle.isActive = false;
        
        // Сбрасываем ARIA-атрибуты
        organelle.element.removeAttribute('aria-current');
        organelle.element.setAttribute('aria-expanded', 'false');
    }

    onOrganelleHover(organelleElement, isHovering) {
        // Используем CSS классы вместо прямого стиля
        if (isHovering) {
            organelleElement.classList.add('organelle-hover');
        } else {
            organelleElement.classList.remove('organelle-hover');
        }
    }

    handleKeyboard(e) {
        if (this.isAnimating) return;

        // Цифровые клавиши для быстрой активации органелл
        if (e.key >= '1' && e.key <= '9') {
            const index = parseInt(e.key) - 1;
            const organelleTypes = Array.from(this.organelles.keys());
            
            if (index < organelleTypes.length) {
                e.preventDefault();
                this.activateOrganelle(organelleTypes[index]);
            }
        }

        // Escape для деактивации
        if (e.key === 'Escape' && this.activeOrganelle) {
            e.preventDefault();
            this.deactivateOrganelle(this.organelles.get(this.activeOrganelle));
            this.activeOrganelle = null;
            this.saveState();
        }
    }

    syncWithDNA(e) {
        const levelId = e.detail?.levelId;
        if (!levelId) return;

        const organelle = this.findOrganelleByLevel(levelId);
        if (organelle && this.activeOrganelle !== organelle.type) {
            this.activateOrganelle(organelle.type);
        }
    }

    findOrganelleByLevel(levelId) {
        for (let [type, organelle] of this.organelles) {
            if (organelle.level === levelId) {
                return organelle;
            }
        }
        return null;
    }

    showOrganelleContent(levelId) {
        const event = new CustomEvent('organelleContentRequest', {
            detail: {
                levelId: levelId,
                source: 'organelle',
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    dispatchOrganelleActivation(organelleType, levelId) {
        const event = new CustomEvent('organelleActivated', {
            detail: {
                organelleType: organelleType,
                levelId: levelId,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    createMembraneParticles() {
        const membrane = document.querySelector('.membrane-particles');
        if (!membrane) {
            console.warn('Membrane particles container not found');
            return;
        }

        const particleCount = 12;
        membrane.innerHTML = ''; // Очищаем существующие частицы

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'membrane-particle';
            particle.style.animationDelay = `${i * 0.5}s`;
            membrane.appendChild(particle);
        }
    }

    showErrorNotification(message) {
        const event = new CustomEvent('showNotification', {
            detail: {
                message: message,
                type: 'error',
                duration: 5000
            }
        });
        document.dispatchEvent(event);
    }

    saveState() {
        try {
            if (this.activeOrganelle) {
                localStorage.setItem('cellActiveOrganelle', this.activeOrganelle);
            }
        } catch (error) {
            console.warn('Failed to save cell state:', error);
        }
    }

    restoreState() {
        try {
            const savedOrganelle = localStorage.getItem('cellActiveOrganelle');
            if (savedOrganelle && this.organelles.has(savedOrganelle)) {
                setTimeout(() => {
                    this.activateOrganelle(savedOrganelle);
                }, 1000);
            }
        } catch (error) {
            console.warn('Failed to restore cell state:', error);
        }
    }

    // Публичные методы
    getActiveOrganelle() {
        return this.activeOrganelle;
    }

    getOrganelleData(type) {
        return this.organelles.get(type);
    }

    getAllOrganelles() {
        return Array.from(this.organelles.values());
    }

    pulseOrganelle(type) {
        const organelle = this.organelles.get(type);
        if (organelle) {
            organelle.element.classList.add('organelle-pulse');
            setTimeout(() => {
                organelle.element.classList.remove('organelle-pulse');
            }, 2000);
        }
    }

    highlightOrganellesForLevel(levelId) {
        const organelle = this.findOrganelleByLevel(levelId);
        if (organelle) {
            this.pulseOrganelle(organelle.type);
        }
    }

    // Деструктор для очистки
    destroy() {
        this.organellesContainer?.removeEventListener('click', this.boundClickHandler);
        this.organellesContainer?.removeEventListener('mouseover', this.boundMouseOverHandler);
        this.organellesContainer?.removeEventListener('mouseout', this.boundMouseOutHandler);
        document.removeEventListener('keydown', this.boundKeyHandler);
        document.removeEventListener('dnaLevelChange', this.boundDNAChangeHandler);
    }
}

// Вспомогательные функции
CellInteraction.createOrganelle = function(type, level, position) {
    const organelle = document.createElement('div');
    organelle.className = `organelle ${type}`;
    organelle.setAttribute('data-organelle', type);
    organelle.setAttribute('data-level', level);
    organelle.setAttribute('role', 'button');
    organelle.setAttribute('tabindex', '0');
    
    if (position) {
        organelle.style.left = position.x;
        organelle.style.top = position.y;
    }
    
    const glow = document.createElement('div');
    glow.className = 'organelle-glow';
    
    const label = document.createElement('div');
    label.className = 'organelle-label';
    label.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    
    organelle.appendChild(glow);
    organelle.appendChild(label);
    
    return organelle;
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    try {
        window.cellInteraction = new CellInteraction();
        
        // Глобальный обработчик ошибок
        window.addEventListener('error', function(e) {
            console.error('Cell Interaction Error:', e.error);
        });
    } catch (error) {
        console.error('Failed to initialize CellInteraction:', error);
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CellInteraction;
}
