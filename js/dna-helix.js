// ===== DNA HELIX NAVIGATION SYSTEM =====

class DNAHelix {
    constructor() {
        this.levels = [
            { id: 'level0', label: 'Философия', number: 0, color: 'var(--color-nucleus)' },
            { id: 'level1', label: 'Диагностика', number: 1, color: 'var(--color-mitochondria)' },
            { id: 'level2', label: 'Фундамент', number: 2, color: 'var(--color-ribosome)' },
            { id: 'level3', label: 'Оптимизация', number: 3, color: 'var(--color-dna-primary)' },
            { id: 'level4', label: 'Регенерация', number: 4, color: 'var(--color-dna-secondary)' },
            { id: 'level5', label: 'Крионика', number: 5, color: 'var(--color-nucleus)' },
            { id: 'level6', label: 'Цифровое сознание', number: 6, color: 'var(--color-mitochondria)' },
            { id: 'level7', label: 'Сингулярность', number: 7, color: 'var(--color-ribosome)' },
            { id: 'level8', label: 'Бессмертие', number: 8, color: 'var(--color-dna-primary)' },
            { id: 'knowledge', label: 'База знаний', number: '∞', color: 'var(--color-dna-secondary)' }
        ];

        this.currentLevel = null;
        this.isAnimating = false;
        this.helixElement = null;
        this.animationFrameId = null;
        this.calculationsCache = new Map();
        this.performanceMode = 'high'; // 'high', 'medium', 'low'
        
        // Привязка методов
        this.boundClickHandler = this.handleClick.bind(this);
        this.boundKeyHandler = this.handleKeyboard.bind(this);
        this.boundVisibilityChange = this.handleVisibilityChange.bind(this);
        
        this.init();
    }

    init() {
        try {
            this.detectPerformanceMode();
            this.createDNAStructure();
            this.bindEvents();
            this.setupIntersectionObserver();
            this.restoreState();
            
            // Отложенный запуск анимации для улучшения производительности
            setTimeout(() => {
                this.startAnimations();
            }, 1000);
            
        } catch (error) {
            console.error('DNAHelix initialization failed:', error);
        }
    }

    detectPerformanceMode() {
        // Определяем режим производительности на основе устройства
        const isLowPerf = (
            navigator.hardwareConcurrency < 4 ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );

        this.performanceMode = isLowPerf ? 'low' : 'high';
        console.log(`🎯 DNA Performance Mode: ${this.performanceMode}`);
    }

    createDNAStructure() {
        this.helixElement = document.getElementById('dnaNav');
        
        if (!this.helixElement) {
            throw new Error('DNA navigation element not found');
        }
        
        // Очищаем существующую структуру
        this.helixElement.innerHTML = '';

        // Создаем цепи ДНК
        const strand1 = this.createStrand('strand-1');
        const strand2 = this.createStrand('strand-2');
        const connectors = document.createElement('div');
        connectors.className = 'helix-connectors';

        // Создаем базовые пары (уровни) с кешированием позиций
        this.levels.forEach((level, index) => {
            const basePair = this.createBasePair(level, index);
            connectors.appendChild(basePair);
        });

        // Создаем частицы только для высокопроизводительного режима
        if (this.performanceMode !== 'low') {
            const particlesContainer = this.createParticlesContainer();
            this.helixElement.appendChild(particlesContainer);
        }

        this.helixElement.appendChild(strand1);
        this.helixElement.appendChild(strand2);
        this.helixElement.appendChild(connectors);

        // Добавляем класс для анимации появления
        setTimeout(() => {
            this.helixElement.classList.add('animate-in');
        }, 100);
    }

    createStrand(className) {
        const strand = document.createElement('div');
        strand.className = `dna-strand ${className}`;
        
        // Оптимизация: упрощаем градиенты для слабых устройств
        if (this.performanceMode === 'low') {
            strand.style.background = 'linear-gradient(to bottom, transparent, var(--color-dna-primary), transparent)';
        }
        
        return strand;
    }

    createBasePair(level, index) {
        const basePair = document.createElement('div');
        basePair.className = 'base-pair';
        basePair.setAttribute('data-level', level.id);
        basePair.setAttribute('data-index', index);
        basePair.style.setProperty('--level-color', level.color);
        
        // Используем кешированные позиции
        const position = this.getCachedPosition(index, this.levels.length);
        basePair.style.transform = `translateZ(${position.z}px)`;
        
        // Создаем метку уровня
        const label = document.createElement('div');
        label.className = 'level-label';
        label.innerHTML = `
            <span class="level-number">${level.number}</span>
            <span class="level-name">${level.label}</span>
        `;
        
        // Создаем индикатор активности
        const indicator = document.createElement('div');
        indicator.className = 'level-indicator';
        
        // Добавляем прогресс
        const progress = this.getLevelProgress(level.id);
        if (progress > 0) {
            const progressBar = document.createElement('div');
            progressBar.className = 'level-progress';
            progressBar.style.width = `${progress}%`;
            basePair.appendChild(progressBar);
        }
        
        basePair.appendChild(label);
        basePair.appendChild(indicator);

        return basePair;
    }

    getCachedPosition(index, total) {
        const cacheKey = `pos-${index}-${total}`;
        
        if (this.calculationsCache.has(cacheKey)) {
            return this.calculationsCache.get(cacheKey);
        }
        
        const position = this.calculatePosition(index, total);
        this.calculationsCache.set(cacheKey, position);
        
        return position;
    }

    calculatePosition(index, total) {
        // Оптимизированные вычисления позиций
        const angle = (index / total) * Math.PI * 2;
        const radius = this.performanceMode === 'low' ? 15 : 20 + Math.sin(angle * 3) * 5;
        
        return {
            x: Math.cos(angle) * radius,
            y: (index / total) * 100 - 50,
            z: Math.sin(angle) * radius
        };
    }

    createParticlesContainer() {
        const container = document.createElement('div');
        container.className = 'dna-particles';
        
        // Меньше частиц для среднего режима
        const particleCount = this.performanceMode === 'high' ? 9 : 5;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            container.appendChild(particle);
        }
        
        return container;
    }

    bindEvents() {
        // Делегирование событий для базовых пар
        this.helixElement.addEventListener('click', this.boundClickHandler);

        // Оптимизация: используем passive события для скролла/тача
        this.helixElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.helixElement.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });

        // Обработка клавиатуры
        document.addEventListener('keydown', this.boundKeyHandler);

        // Отслеживание видимости для паузы анимаций
        document.addEventListener('visibilitychange', this.boundVisibilityChange);
    }

    handleClick(e) {
        const basePair = e.target.closest('.base-pair');
        if (basePair && !this.isAnimating) {
            const levelId = basePair.getAttribute('data-level');
            this.switchLevel(levelId);
        }
    }

    handleTouchStart(e) {
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchMove(e) {
        if (!this.touchStartY) return;
        
        const touchY = e.touches[0].clientY;
        const deltaY = this.touchStartY - touchY;
        
        // Свайп для навигации по уровням
        if (Math.abs(deltaY) > 50) {
            const currentIndex = this.levels.findIndex(level => level.id === this.currentLevel);
            const direction = deltaY > 0 ? 1 : -1;
            const newIndex = Math.max(0, Math.min(this.levels.length - 1, currentIndex + direction));
            
            if (newIndex !== currentIndex) {
                this.switchLevel(this.levels[newIndex].id);
            }
            
            this.touchStartY = touchY;
        }
    }

    handleKeyboard(e) {
        if (this.isAnimating) return;

        const currentIndex = this.levels.findIndex(level => level.id === this.currentLevel);
        
        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    this.switchLevel(this.levels[currentIndex - 1].id);
                }
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < this.levels.length - 1) {
                    this.switchLevel(this.levels[currentIndex + 1].id);
                }
                break;
                
            case 'Home':
                e.preventDefault();
                this.switchLevel(this.levels[0].id);
                break;
                
            case 'End':
                e.preventDefault();
                this.switchLevel(this.levels[this.levels.length - 1].id);
                break;
                
            case '1': case '2': case '3': case '4': case '5':
            case '6': case '7': case '8': case '9': case '0':
                e.preventDefault();
                const num = e.key === '0' ? 9 : parseInt(e.key) - 1;
                if (num < this.levels.length) {
                    this.switchLevel(this.levels[num].id);
                }
                break;
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.pauseAnimations();
        } else {
            this.resumeAnimations();
        }
    }

    switchLevel(levelId) {
        if (this.isAnimating || this.currentLevel === levelId) return;
        
        this.isAnimating = true;
        
        // Находим элементы
        const targetBasePair = this.helixElement.querySelector(`[data-level="${levelId}"]`);
        const currentBasePair = this.helixElement.querySelector('.base-pair.active');
        
        if (!targetBasePair) {
            console.warn(`Level ${levelId} not found`);
            this.isAnimating = false;
            return;
        }

        // Анимация перехода
        this.animateLevelTransition(currentBasePair, targetBasePair, levelId);
    }

    animateLevelTransition(currentBasePair, targetBasePair, levelId) {
        // Убираем активный класс с текущего уровня
        if (currentBasePair) {
            currentBasePair.classList.remove('active');
            currentBasePair.style.zIndex = '';
        }

        // Подсвечиваем всю ДНК
        this.helixElement.classList.add('transitioning');

        // Оптимизация: используем CSS анимации вместо JS когда возможно
        targetBasePair.style.zIndex = '10';
        
        // Задержка для визуального эффекта
        setTimeout(() => {
            // Добавляем активный класс к новому уровню
            targetBasePair.classList.add('active');
            
            // Обновляем текущий уровень
            this.currentLevel = levelId;
            
            // Сохраняем состояние
            this.saveState();
            
            // Генерируем событие смены уровня
            this.dispatchLevelChange(levelId);
            
            // Завершаем анимацию
            setTimeout(() => {
                this.helixElement.classList.remove('transitioning');
                targetBasePair.style.zIndex = '';
                this.isAnimating = false;
            }, this.performanceMode === 'low' ? 300 : 500);
            
        }, 150);
    }

    startAnimations() {
        // Используем CSS анимации для высокопроизводительного режима
        if (this.performanceMode === 'high') {
            this.helixElement.style.animation = 'dna-rotate 30s infinite linear';
        } else {
            // Fallback на JS анимацию для лучшего контроля
            this.startJSAnimation();
        }
    }

    startJSAnimation() {
        let rotation = 0;
        const animate = () => {
            if (this.animationFrameId === null) return;
            
            if (!document.hidden) {
                rotation += this.performanceMode === 'low' ? 0.1 : 0.2;
                this.helixElement.style.transform = 
                    `translate(-50%, -50%) rotateX(60deg) rotateY(${rotation}deg)`;
            }
            
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        this.animationFrameId = requestAnimationFrame(animate);
    }

    pauseAnimations() {
        if (this.performanceMode === 'high') {
            this.helixElement.style.animationPlayState = 'paused';
        } else {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    resumeAnimations() {
        if (this.performanceMode === 'high') {
            this.helixElement.style.animationPlayState = 'running';
        } else {
            this.startJSAnimation();
        }
    }

    setupIntersectionObserver() {
        // Оптимизация: приостанавливаем анимации когда ДНК не видна
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.resumeAnimations();
                    } else {
                        this.pauseAnimations();
                    }
                });
            }, { threshold: 0.1 });

            this.intersectionObserver.observe(this.helixElement);
        }
    }

    dispatchLevelChange(levelId) {
        const event = new CustomEvent('dnaLevelChange', {
            detail: {
                levelId: levelId,
                levelData: this.levels.find(level => level.id === levelId),
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    getLevelProgress(levelId) {
        const savedProgress = localStorage.getItem(`progress-${levelId}`);
        return savedProgress ? parseInt(savedProgress) : 0;
    }

    saveState() {
        if (this.currentLevel) {
            localStorage.setItem('dnaCurrentLevel', this.currentLevel);
            localStorage.setItem('dnaPerformanceMode', this.performanceMode);
        }
    }

    restoreState() {
        const savedLevel = localStorage.getItem('dnaCurrentLevel');
        const savedPerformance = localStorage.getItem('dnaPerformanceMode');
        
        if (savedPerformance) {
            this.performanceMode = savedPerformance;
        }
        
        if (savedLevel) {
            // Небольшая задержка для плавного восстановления
            setTimeout(() => {
                this.switchLevel(savedLevel);
            }, 500);
        } else {
            // По умолчанию активируем первый уровень
            this.switchLevel(this.levels[0].id);
        }
    }

    // Публичные методы для внешнего управления
    getCurrentLevel() {
        return this.currentLevel;
    }

    getLevelData(levelId) {
        return this.levels.find(level => level.id === levelId);
    }

    getAllLevels() {
        return [...this.levels];
    }

    // Методы для анимационных эффектов
    highlightLevel(levelId) {
        const basePair = this.helixElement.querySelector(`[data-level="${levelId}"]`);
        if (basePair) {
            basePair.classList.add('pulsing');
            setTimeout(() => {
                basePair.classList.remove('pulsing');
            }, 2000);
        }
    }

    pulseDNA() {
        this.helixElement.classList.add('dna-pulse');
        setTimeout(() => {
            this.helixElement.classList.remove('dna-pulse');
        }, 1000);
    }

    // Оптимизация производительности
    setPerformanceMode(mode) {
        if (['high', 'medium', 'low'].includes(mode) && mode !== this.performanceMode) {
            this.performanceMode = mode;
            this.pauseAnimations();
            this.createDNAStructure(); // Пересоздаем с новой оптимизацией
            this.startAnimations();
            this.saveState();
        }
    }

    // Статистика и отладка
    getPerformanceStats() {
        return {
            performanceMode: this.performanceMode,
            cacheSize: this.calculationsCache.size,
            currentLevel: this.currentLevel,
            isAnimating: this.isAnimating,
            animationType: this.performanceMode === 'high' ? 'CSS' : 'JS'
        };
    }

    // Деструктор для очистки
    destroy() {
        this.pauseAnimations();
        
        // Очищаем обработчики событий
        this.helixElement.removeEventListener('click', this.boundClickHandler);
        document.removeEventListener('keydown', this.boundKeyHandler);
        document.removeEventListener('visibilitychange', this.boundVisibilityChange);
        
        // Отключаем Intersection Observer
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        // Очищаем кеш
        this.calculationsCache.clear();
    }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

// Функция для проверки поддержки WebGL
DNAHelix.checkWebGLSupport = function() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
                 (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
};

// Функция для расчета позиций в 3D пространстве (оптимизированная)
DNAHelix.calculate3DPosition = function(index, total, radius = 20) {
    const angle = (index / total) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = (index / total) * 100 - 50;
    const z = Math.sin(angle) * radius;
    
    return { x, y, z };
};

// ===== АДАПТЕР ДЛЯ СТАРОЙ СИСТЕМЫ =====

DNAHelix.migrateFromOldSystem = function() {
    const oldActivePage = localStorage.getItem('bookActivePage');
    if (oldActivePage) {
        localStorage.setItem('dnaCurrentLevel', oldActivePage);
        localStorage.removeItem('bookActivePage');
    }
};

// ===== ЭКСПОРТ И ИНИЦИАЛИЗАЦИЯ =====

// Автоматическая инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Миграция данных со старой системы
        DNAHelix.migrateFromOldSystem();
        
        // Инициализация ДНК навигации
        window.dnaNavigation = new DNAHelix();
        
        // Глобальный обработчик ошибок для ДНК системы
        window.addEventListener('error', function(e) {
            console.error('DNA Navigation Error:', e.error);
        });

        // Экспортируем для отладки
        if (typeof window !== 'undefined') {
            window.DNAHelix = DNAHelix;
        }
        
    } catch (error) {
        console.error('Failed to initialize DNAHelix:', error);
    }
});

// Экспорт для использования в модульных системах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DNAHelix;
}
