// ===== DNA HELIX NAVIGATION SYSTEM =====

class DNAHelix {
    constructor() {
        this.levels = [
            { id: 'level0', label: 'Философия', number: 0 },
            { id: 'level1', label: 'Диагностика', number: 1 },
            { id: 'level2', label: 'Фундамент', number: 2 },
            { id: 'level3', label: 'Оптимизация', number: 3 },
            { id: 'level4', label: 'Регенерация', number: 4 },
            { id: 'level5', label: 'Крионика', number: 5 },
            { id: 'level6', label: 'Цифровое сознание', number: 6 },
            { id: 'level7', label: 'Сингулярность', number: 7 },
            { id: 'level8', label: 'Бессмертие', number: 8 },
            { id: 'knowledge', label: 'База знаний', number: '∞' }
        ];

        this.currentLevel = null;
        this.isAnimating = false;
        this.helixElement = null;
        this.particles = [];
        
        this.init();
    }

    init() {
        this.createDNAStructure();
        this.bindEvents();
        this.createParticles();
        this.animateHelix();
        
        // Восстанавливаем активный уровень из localStorage
        this.restoreState();
    }

    createDNAStructure() {
        this.helixElement = document.getElementById('dnaNav');
        
        // Очищаем существующую структуру
        this.helixElement.innerHTML = '';

        // Создаем цепи ДНК
        const strand1 = this.createStrand('strand-1');
        const strand2 = this.createStrand('strand-2');
        const connectors = document.createElement('div');
        connectors.className = 'helix-connectors';

        // Создаем базовые пары (уровни)
        this.levels.forEach((level, index) => {
            const basePair = this.createBasePair(level, index);
            connectors.appendChild(basePair);
        });

        // Создаем частицы
        const particlesContainer = this.createParticlesContainer();

        this.helixElement.appendChild(strand1);
        this.helixElement.appendChild(strand2);
        this.helixElement.appendChild(connectors);
        this.helixElement.appendChild(particlesContainer);

        // Добавляем класс для анимации появления
        setTimeout(() => {
            this.helixElement.classList.add('animate-in');
        }, 100);
    }

    createStrand(className) {
        const strand = document.createElement('div');
        strand.className = `dna-strand ${className}`;
        return strand;
    }

    createBasePair(level, index) {
        const basePair = document.createElement('div');
        basePair.className = 'base-pair';
        basePair.setAttribute('data-level', level.id);
        basePair.setAttribute('data-index', index);
        
        // Создаем метку уровня
        const label = document.createElement('div');
        label.className = 'level-label';
        label.textContent = `${level.number}. ${level.label}`;
        
        // Создаем индикатор активности
        const indicator = document.createElement('div');
        indicator.className = 'level-indicator';
        
        basePair.appendChild(label);
        basePair.appendChild(indicator);

        return basePair;
    }

    createParticlesContainer() {
        const container = document.createElement('div');
        container.className = 'dna-particles';
        
        // Создаем 9 частиц (магическое число для ДНК)
        for (let i = 0; i < 9; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            container.appendChild(particle);
        }
        
        return container;
    }

    bindEvents() {
        // Делегирование событий для базовых пар
        this.helixElement.addEventListener('click', (e) => {
            const basePair = e.target.closest('.base-pair');
            if (basePair && !this.isAnimating) {
                const levelId = basePair.getAttribute('data-level');
                this.switchLevel(levelId);
            }
        });

        // Обработчики для hover эффектов
        this.helixElement.addEventListener('mouseover', (e) => {
            const basePair = e.target.closest('.base-pair');
            if (basePair) {
                this.onBasePairHover(basePair, true);
            }
        });

        this.helixElement.addEventListener('mouseout', (e) => {
            const basePair = e.target.closest('.base-pair');
            if (basePair) {
                this.onBasePairHover(basePair, false);
            }
        });

        // Обработка клавиатуры
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
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
        }

        // Подсвечиваем всю ДНК
        this.helixElement.classList.add('level-active');

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
            
            // Убираем подсветку ДНК
            setTimeout(() => {
                this.helixElement.classList.remove('level-active');
                this.isAnimating = false;
            }, 1000);
            
        }, 300);
    }

    onBasePairHover(basePair, isHovering) {
        if (isHovering) {
            basePair.style.transform = 'scale(1.5) rotateZ(5deg)';
            basePair.style.background = 'var(--color-mitochondria)';
        } else {
            const isActive = basePair.classList.contains('active');
            basePair.style.transform = isActive ? 'scale(1.3)' : 'scale(1)';
            basePair.style.background = isActive ? 'var(--color-nucleus)' : 'var(--color-dna-primary)';
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

    animateHelix() {
        // Плавное вращение ДНК
        let rotation = 0;
        const animate = () => {
            if (!this.isAnimating) {
                rotation += 0.2;
                this.helixElement.style.transform = 
                    `translate(-50%, -50%) rotateX(60deg) rotateY(${rotation}deg)`;
            }
            requestAnimationFrame(animate);
        };
        animate();
    }

    createParticles() {
        // Дополнительная логика для управления частицами
        this.particles = Array.from(document.querySelectorAll('.particle'));
    }

    dispatchLevelChange(levelId) {
        const event = new CustomEvent('dnaLevelChange', {
            detail: {
                levelId: levelId,
                levelData: this.levels.find(level => level.id === levelId)
            }
        });
        document.dispatchEvent(event);
    }

    saveState() {
        if (this.currentLevel) {
            localStorage.setItem('dnaCurrentLevel', this.currentLevel);
        }
    }

    restoreState() {
        const savedLevel = localStorage.getItem('dnaCurrentLevel');
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
            basePair.style.animation = 'base-pair-glow 2s ease-in-out 3';
            setTimeout(() => {
                basePair.style.animation = '';
            }, 6000);
        }
    }

    pulseDNA() {
        this.helixElement.classList.add('level-active');
        setTimeout(() => {
            this.helixElement.classList.remove('level-active');
        }, 1000);
    }

    // Деструктор для очистки
    destroy() {
        this.helixElement.removeEventListener('click', this.boundClickHandler);
        document.removeEventListener('keydown', this.boundKeyHandler);
    }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

// Функция для проверки поддержки WebGL (для будущих 3D улучшений)
DNAHelix.checkWebGLSupport = function() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
                 (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
};

// Функция для расчета позиций в 3D пространстве
DNAHelix.calculate3DPosition = function(index, total, radius = 20) {
    const angle = (index / total) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = (index / total) * 100 - 50; // -50 to 50
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
    // Миграция данных со старой системы
    DNAHelix.migrateFromOldSystem();
    
    // Инициализация ДНК навигации
    window.dnaNavigation = new DNAHelix();
    
    // Глобальный обработчик ошибок для ДНК системы
    window.addEventListener('error', function(e) {
        console.error('DNA Navigation Error:', e.error);
    });
});

// Экспорт для использования в модульных системах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DNAHelix;
}
