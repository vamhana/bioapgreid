// ===== CELL INTERACTION SYSTEM =====

class CellInteraction {
    constructor() {
        this.organelles = new Map();
        this.activeOrganelle = null;
        this.isAnimating = false;
        this.organellesContainer = null;
        this.performanceMode = 'high';
        this.animationCache = new Map();
        this.interactionState = {
            lastInteraction: Date.now(),
            isIdle: false,
            hoveredOrganelle: null
        };
        
        // Привязка методов для корректного удаления событий
        this.boundClickHandler = this.handleOrganelleClick.bind(this);
        this.boundMouseOverHandler = this.handleOrganelleHover.bind(this, true);
        this.boundMouseOutHandler = this.handleOrganelleHover.bind(this, false);
        this.boundKeyHandler = this.handleKeyboard.bind(this);
        this.boundDNAChangeHandler = this.syncWithDNA.bind(this);
        this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
        this.boundIdleHandler = this.handleIdleState.bind(this);
        
        this.init();
    }

    init() {
        try {
            this.detectPerformanceMode();
            this.organellesContainer = document.querySelector('.organelles-container');
            
            if (!this.organellesContainer) {
                throw new Error('Organelles container not found');
            }
            
            this.registerOrganelles();
            this.bindEvents();
            this.createMembraneParticles();
            this.setupIdleDetection();
            this.restoreState();
            
            console.log('✅ CellInteraction initialized');
            
        } catch (error) {
            console.error('CellInteraction initialization failed:', error);
        }
    }

    detectPerformanceMode() {
        const isLowPerf = (
            navigator.hardwareConcurrency < 4 ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );

        this.performanceMode = isLowPerf ? 'low' : 'high';
        console.log(`🎯 Cell Performance Mode: ${this.performanceMode}`);
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

            const organelleData = {
                element: org,
                type: type,
                level: level,
                isActive: false,
                progress: this.getOrganelleProgress(level),
                transformCache: this.getCachedTransform(type, 'default')
            };

            this.organelles.set(type, organelleData);

            // Добавляем ARIA-атрибуты и оптимизированные стили
            this.setupOrganelleAccessibility(org, type, level);
            
            // Предварительно вычисляем трансформации
            this.precomputeTransforms(type);
        });

        console.log(`📊 Registered ${this.organelles.size} organelles`);
    }

    setupOrganelleAccessibility(organelle, type, level) {
        organelle.setAttribute('role', 'button');
        organelle.setAttribute('tabindex', '0');
        organelle.setAttribute('aria-label', `${this.getOrganelleName(type)} органелла, уровень ${level}`);
        organelle.setAttribute('aria-expanded', 'false');
        
        // Оптимизация: добавляем CSS переменные для плавных анимаций
        organelle.style.setProperty('--organelle-type', type);
        organelle.style.setProperty('--organelle-level', level);
    }

    getOrganelleName(type) {
        const names = {
            'nucleus': 'Ядро',
            'mitochondria': 'Митохондрии',
            'ribosome': 'Рибосомы',
            'reticulum': 'Эндоплазматический ретикулум'
        };
        return names[type] || type;
    }

    bindEvents() {
        // Делегирование событий для органелл
        this.organellesContainer.addEventListener('click', this.boundClickHandler);
        this.organellesContainer.addEventListener('mouseover', this.boundMouseOverHandler);
        this.organellesContainer.addEventListener('mouseout', this.boundMouseOutHandler);
        
        // Оптимизация: используем passive события для тач-взаимодействий
        this.organellesContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.organellesContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        
        document.addEventListener('keydown', this.boundKeyHandler);
        document.addEventListener('dnaLevelChange', this.boundDNAChangeHandler);
        document.addEventListener('visibilitychange', this.boundVisibilityHandler);

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

        // Оптимизация: отложенная загрузка тяжелых ресурсов
        this.setupLazyLoading();
    }

    setupLazyLoading() {
        // Ленивая загрузка дополнительных эффектов после основного взаимодействия
        if ('IntersectionObserver' in window) {
            this.lazyObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const organelle = entry.target;
                        this.loadOrganelleEffects(organelle);
                        this.lazyObserver.unobserve(organelle);
                    }
                });
            }, { rootMargin: '50px' });

            // Наблюдаем за всеми органеллами
            this.organelles.forEach(organelle => {
                this.lazyObserver.observe(organelle.element);
            });
        }
    }

    loadOrganelleEffects(organelle) {
        // Загружаем дополнительные эффекты только когда органелла становится видимой
        if (this.performanceMode === 'high') {
            organelle.classList.add('effects-loaded');
        }
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
            this.updateInteractionState();
            
            if (isHovering) {
                this.onOrganelleHover(organelle, true);
                this.interactionState.hoveredOrganelle = organelle;
            } else {
                this.onOrganelleHover(organelle, false);
                if (this.interactionState.hoveredOrganelle === organelle) {
                    this.interactionState.hoveredOrganelle = null;
                }
            }
        }
    }

    handleTouchStart(e) {
        const organelle = e.target.closest('.organelle');
        if (organelle) {
            organelle.classList.add('touch-active');
            this.updateInteractionState();
        }
    }

    handleTouchEnd(e) {
        const organelle = e.target.closest('.organelle');
        if (organelle) {
            organelle.classList.remove('touch-active');
            
            // Активируем органеллу по тапу (с небольшой задержкой для отличия от скролла)
            setTimeout(() => {
                if (organelle.classList.contains('touch-active')) return;
                const type = organelle.getAttribute('data-organelle');
                this.activateOrganelle(type);
            }, 150);
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
            this.updateInteractionState();
            
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

            // Используем кешированные трансформации для плавности
            const activeTransform = this.getCachedTransform(organelle.type, 'active');
            const enteringTransform = this.getCachedTransform(organelle.type, 'entering');

            // Добавляем классы для анимации
            organelle.element.classList.add('active', 'entering');
            organelle.element.style.transform = enteringTransform;
            
            organelle.isActive = true;
            this.activeOrganelle = organelle.type;

            // Обновляем ARIA-атрибуты
            organelle.element.setAttribute('aria-current', 'true');
            organelle.element.setAttribute('aria-expanded', 'true');

            this.saveState();
            this.dispatchOrganelleActivation(organelle.type, organelle.level);

            // Анимация активации с учетом производительности
            const animationDuration = this.performanceMode === 'low' ? 600 : 1000;
            
            setTimeout(() => {
                organelle.element.style.transform = activeTransform;
            }, 50);

            // Завершаем анимацию
            setTimeout(() => {
                organelle.element.classList.remove('entering');
                organelle.element.style.transform = ''; // Убираем inline стили
                this.isAnimating = false;
                this.showOrganelleContent(organelle.level);
            }, animationDuration);

        } catch (error) {
            console.error('Organelle activation animation failed:', error);
            this.isAnimating = false;
        }
    }

    deactivateOrganelle(organelle) {
        if (!organelle) return;

        const defaultTransform = this.getCachedTransform(organelle.type, 'default');
        
        organelle.element.classList.remove('active');
        organelle.element.style.transform = defaultTransform;
        organelle.isActive = false;
        
        // Сбрасываем ARIA-атрибуты
        organelle.element.removeAttribute('aria-current');
        organelle.element.setAttribute('aria-expanded', 'false');

        // Возвращаем к исходному состоянию
        setTimeout(() => {
            if (!organelle.isActive) {
                organelle.element.style.transform = '';
            }
        }, 300);
    }

    onOrganelleHover(organelleElement, isHovering) {
        if (this.isAnimating) return;

        const type = organelleElement.getAttribute('data-organelle');
        const transform = isHovering ? 
            this.getCachedTransform(type, 'hover') : 
            this.getCachedTransform(type, 'default');

        // Используем CSS transitions вместо прямого изменения стилей когда возможно
        if (this.performanceMode === 'high') {
            organelleElement.classList.toggle('organelle-hover', isHovering);
        } else {
            organelleElement.style.transform = transform;
        }
    }

    getCachedTransform(type, state) {
        const cacheKey = `${type}-${state}`;
        
        if (this.animationCache.has(cacheKey)) {
            return this.animationCache.get(cacheKey);
        }
        
        const transform = this.calculateTransform(type, state);
        this.animationCache.set(cacheKey, transform);
        
        return transform;
    }

    precomputeTransforms(type) {
        // Предварительно вычисляем все возможные трансформации для органеллы
        const states = ['default', 'hover', 'active', 'entering'];
        states.forEach(state => {
            this.getCachedTransform(type, state);
        });
    }

    calculateTransform(type, state) {
        const transforms = {
            'nucleus-default': 'scale(1)',
            'nucleus-hover': 'scale(1.2)',
            'nucleus-active': 'scale(20)',
            'nucleus-entering': 'scale(0) rotate(180deg)',
            
            'mitochondria-default': 'scale(1) rotate(45deg)',
            'mitochondria-hover': 'scale(1.3) rotate(45deg)',
            'mitochondria-active': 'scale(15) rotate(45deg)',
            'mitochondria-entering': 'scale(0) rotate(225deg)',
            
            'ribosome-default': 'scale(1)',
            'ribosome-hover': 'scale(1.4)',
            'ribosome-active': 'scale(18)',
            'ribosome-entering': 'scale(0) rotate(-180deg)',
            
            'reticulum-default': 'scale(1)',
            'reticulum-hover': 'scale(1.3)',
            'reticulum-active': 'scale(16)',
            'reticulum-entering': 'scale(0) rotate(90deg)'
        };

        return transforms[`${type}-${state}`] || 'scale(1)';
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

        // Tab навигация между органеллами
        if (e.key === 'Tab' && this.interactionState.hoveredOrganelle) {
            this.updateInteractionState();
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.pauseAnimations();
        } else {
            this.resumeAnimations();
        }
    }

    pauseAnimations() {
        this.organellesContainer.classList.add('animations-paused');
    }

    resumeAnimations() {
        this.organellesContainer.classList.remove('animations-paused');
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
                timestamp: Date.now(),
                performanceMode: this.performanceMode
            }
        });
        document.dispatchEvent(event);
    }

    dispatchOrganelleActivation(organelleType, levelId) {
        const event = new CustomEvent('organelleActivated', {
            detail: {
                organelleType: organelleType,
                levelId: levelId,
                timestamp: Date.now(),
                performanceMode: this.performanceMode
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

        // Меньше частиц для низкопроизводительного режима
        const particleCount = this.performanceMode === 'high' ? 12 : 6;
        membrane.innerHTML = '';

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'membrane-particle';
            particle.style.animationDelay = `${i * 0.5}s`;
            membrane.appendChild(particle);
        }
    }

    setupIdleDetection() {
        // Снижаем качество анимаций при бездействии пользователя
        this.idleTimer = setInterval(() => {
            const timeSinceInteraction = Date.now() - this.interactionState.lastInteraction;
            const isNowIdle = timeSinceInteraction > 30000; // 30 секунд
            
            if (isNowIdle !== this.interactionState.isIdle) {
                this.interactionState.isIdle = isNowIdle;
                this.organellesContainer.classList.toggle('idle-mode', isNowIdle);
                
                if (isNowIdle) {
                    console.log('🔇 Cell interaction: idle mode activated');
                }
            }
        }, 5000);
    }

    updateInteractionState() {
        this.interactionState.lastInteraction = Date.now();
        
        if (this.interactionState.isIdle) {
            this.interactionState.isIdle = false;
            this.organellesContainer.classList.remove('idle-mode');
        }
    }

    handleIdleState() {
        this.updateInteractionState();
    }

    getOrganelleProgress(levelId) {
        const savedProgress = localStorage.getItem(`progress-${levelId}`);
        return savedProgress ? parseInt(savedProgress) : 0;
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
                localStorage.setItem('cellPerformanceMode', this.performanceMode);
            }
        } catch (error) {
            console.warn('Failed to save cell state:', error);
        }
    }

    restoreState() {
        try {
            const savedOrganelle = localStorage.getItem('cellActiveOrganelle');
            const savedPerformance = localStorage.getItem('cellPerformanceMode');
            
            if (savedPerformance) {
                this.performanceMode = savedPerformance;
            }
            
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

    setPerformanceMode(mode) {
        if (['high', 'low'].includes(mode) && mode !== this.performanceMode) {
            this.performanceMode = mode;
            this.createMembraneParticles(); // Пересоздаем частицы
            this.saveState();
        }
    }

    getPerformanceStats() {
        return {
            performanceMode: this.performanceMode,
            activeOrganelle: this.activeOrganelle,
            totalOrganelles: this.organelles.size,
            cacheSize: this.animationCache.size,
            isIdle: this.interactionState.isIdle
        };
    }

    // Деструктор для очистки
    destroy() {
        // Очищаем интервалы
        if (this.idleTimer) {
            clearInterval(this.idleTimer);
        }

        // Отключаем observers
        if (this.lazyObserver) {
            this.lazyObserver.disconnect();
        }

        // Удаляем обработчики событий
        this.organellesContainer?.removeEventListener('click', this.boundClickHandler);
        this.organellesContainer?.removeEventListener('mouseover', this.boundMouseOverHandler);
        this.organellesContainer?.removeEventListener('mouseout', this.boundMouseOutHandler);
        document.removeEventListener('keydown', this.boundKeyHandler);
        document.removeEventListener('dnaLevelChange', this.boundDNAChangeHandler);
        document.removeEventListener('visibilitychange', this.boundVisibilityHandler);

        // Очищаем кеш
        this.animationCache.clear();
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
