// ===== CONTENT MANAGEMENT SYSTEM =====

class ContentManager {
    constructor() {
        this.contentViewport = null;
        this.currentContent = null;
        this.contentCache = new Map();
        this.contentStructure = {
            level0: {
                title: "Уровень 0: Философия проекта",
                description: "Основные принципы и мировоззрение проекта GENOФОНД",
                sections: [
                    "Введение в концепцию бессмертия",
                    "Этическая основа проекта", 
                    "Научная парадигма",
                    "Исторический контекст"
                ],
                progress: 0
            },
            level1: {
                title: "Уровень 1: Диагностика",
                description: "Комплексная оценка текущего состояния организма",
                sections: [
                    "Генетический анализ",
                    "Биомаркеры старения",
                    "Функциональная диагностика",
                    "Психологический профиль"
                ],
                progress: 0
            },
            level2: {
                title: "Уровень 2: Фундамент", 
                description: "Базовые практики и привычки для долголетия",
                sections: [
                    "Нутрициология и диетология",
                    "Физическая активность",
                    "Сон и циркадные ритмы",
                    "Управление стрессом"
                ],
                progress: 0
            },
            level3: {
                title: "Уровень 3: Оптимизация",
                description: "Продвинутые методы оптимизации организма",
                sections: [
                    "Биохакинг и ноотропы",
                    "Гормональная оптимизация", 
                    "Метаболическая гибкость",
                    "Детокс и очищение"
                ],
                progress: 0
            },
            level4: {
                title: "Уровень 4: Регенерация",
                description: "Стимуляция естественных процессов восстановления",
                sections: [
                    "Клеточная регенерация",
                    "Тканевая инженерия",
                    "Стволовые клетки",
                    "Генная терапия"
                ],
                progress: 0
            },
            level5: {
                title: "Уровень 5: Крионика",
                description: "Технологии сохранения организма для будущего",
                sections: [
                    "Принципы крионической сохранности",
                    "Протоколы витрификации", 
                    "Юридические аспекты",
                    "Перспективы реанимации"
                ],
                progress: 0
            },
            level6: {
                title: "Уровень 6: Цифровое сознание",
                description: "Создание цифровой копии личности",
                sections: [
                    "Картирование сознания",
                    "Нейроинтерфейсы",
                    "Искусственный интеллект",
                    "Этика цифрового бессмертия"
                ],
                progress: 0
            },
            level7: {
                title: "Уровень 7: Сингулярность", 
                description: "Слияние биологического и технологического",
                sections: [
                    "Трансгуманистические концепции",
                    "Нанотехнологии в медицине",
                    "Квантовые вычисления",
                    "Постчеловеческая эволюция"
                ],
                progress: 0
            },
            level8: {
                title: "Уровень 8: Бессмертие",
                description: "Достижение состояния неограниченной жизни",
                sections: [
                    "Теоретические основы",
                    "Практические реализации", 
                    "Социальные последствия",
                    "Космическая перспектива"
                ],
                progress: 0
            },
            knowledge: {
                title: "База знаний",
                description: "Полная библиотека исследований и материалов",
                sections: [
                    "Научные публикации",
                    "Истории успеха",
                    "Инструменты и калькуляторы",
                    "Сообщество экспертов"
                ],
                progress: 0
            }
        };

        this.init();
    }

    init() {
        this.contentViewport = document.getElementById('contentViewport');
        this.contentTitle = document.getElementById('contentTitle');
        this.contentBody = document.getElementById('contentBody');
        this.closeContent = document.getElementById('closeContent');
        this.progressFill = document.querySelector('.progress-fill');

        this.bindEvents();
        this.preloadCriticalContent();
        this.setupServiceWorker();
    }

    bindEvents() {
        // Закрытие контента
        this.closeContent.addEventListener('click', () => {
            this.hideContent();
        });

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.contentViewport.classList.contains('active')) {
                this.hideContent();
            }
        });

        // Закрытие по клику вне контента
        this.contentViewport.addEventListener('click', (e) => {
            if (e.target === this.contentViewport) {
                this.hideContent();
            }
        });

        // Обработка событий навигации
        document.addEventListener('dnaLevelChange', (e) => {
            this.showContent(e.detail.levelId);
        });

        document.addEventListener('organelleContentRequest', (e) => {
            this.showContent(e.detail.levelId);
        });
    }

    async showContent(levelId) {
        if (this.currentContent === levelId) return;

        try {
            this.showLoadingState();
            
            // Загружаем контент
            const content = await this.loadContent(levelId);
            
            // Обновляем интерфейс
            this.updateContentViewport(content);
            this.updateProgress(levelId);
            
            // Показываем контент с анимацией
            this.animateContentAppearance();
            
            this.currentContent = levelId;
            this.trackContentViewed(levelId);
            
        } catch (error) {
            console.error('Error loading content:', error);
            this.showErrorState(levelId, error);
        }
    }

    async loadContent(levelId) {
        // Проверяем кэш
        if (this.contentCache.has(levelId)) {
            return this.contentCache.get(levelId);
        }

        // Загружаем контент (пока заглушки, потом можно заменить на API)
        const content = await this.fetchContentData(levelId);
        
        // Кэшируем результат
        this.contentCache.set(levelId, content);
        
        return content;
    }

    async fetchContentData(levelId) {
        // Имитация загрузки с сервера
        return new Promise((resolve) => {
            setTimeout(() => {
                const levelData = this.contentStructure[levelId];
                
                // Генерируем демо-контент на основе структуры
                const content = {
                    id: levelId,
                    title: levelData.title,
                    description: levelData.description,
                    sections: levelData.sections,
                    html: this.generateContentHTML(levelId, levelData),
                    lastUpdated: new Date().toISOString(),
                    estimatedReadTime: this.calculateReadTime(levelData.sections)
                };
                
                resolve(content);
            }, 500 + Math.random() * 1000); // Случайная задержка для реализма
        });
    }

    generateContentHTML(levelId, levelData) {
        return `
            <div class="content-page" data-level="${levelId}">
                <div class="content-hero">
                    <h1>${levelData.title}</h1>
                    <p class="content-description">${levelData.description}</p>
                    <div class="content-meta">
                        <span class="read-time">⏱️ ${this.calculateReadTime(levelData.sections)} мин</span>
                        <span class="last-updated">📅 Обновлено: ${new Date().toLocaleDateString()}</span>
                    </div>
                </div>

                <div class="content-navigation">
                    <h3>Содержание:</h3>
                    <ul class="section-links">
                        ${levelData.sections.map((section, index) => `
                            <li>
                                <a href="#section-${index}" class="section-link">
                                    ${section}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div class="content-sections">
                    ${levelData.sections.map((section, index) => `
                        <section id="section-${index}" class="content-section">
                            <h2>${section}</h2>
                            <div class="section-content">
                                ${this.generateSectionContent(levelId, section, index)}
                            </div>
                            <div class="section-progress">
                                <label class="progress-checkbox">
                                    <input type="checkbox" data-section="${levelId}-${index}">
                                    <span>Отметить как пройденное</span>
                                </label>
                            </div>
                        </section>
                    `).join('')}
                </div>

                <div class="content-actions">
                    <button class="btn btn-primary complete-level" data-level="${levelId}">
                        Завершить уровень
                    </button>
                    <button class="btn btn-secondary save-progress">
                        Сохранить прогресс
                    </button>
                </div>

                <div class="content-footer">
                    <div class="next-prev-nav">
                        ${this.generateNavigationLinks(levelId)}
                    </div>
                </div>
            </div>
        `;
    }

    generateSectionContent(levelId, section, index) {
        // Генерируем демо-контент для секций
        const templates = {
            level0: [
                "Философия бессмертия уходит корнями в древние времена...",
                "Современные исследования показывают, что старение - это болезнь...",
                "Этическая дискуссия вокруг продления жизни требует...",
                "Исторический контекст развития идеи бессмертия..."
            ],
            level1: [
                "Генетический анализ позволяет выявить предрасположенности...",
                "Биомаркеры старения - ключевые показатели биологического возраста...",
                "Функциональная диагностика оценивает текущее состояние органов...",
                "Психологический профиль влияет на процессы старения..."
            ],
            // ... аналогично для других уровней
        };

        const defaultContent = `
            <p>Это раздел "${section}" уровня ${levelId}.</p>
            <p>Здесь будет размещен подробный контент, включая текст, изображения, 
               интерактивные элементы и мультимедийные материалы.</p>
            <div class="content-placeholder">
                <div class="placeholder-image"></div>
                <div class="placeholder-text">
                    <p>Контент находится в разработке и будет доступен в ближайшее время.</p>
                </div>
            </div>
        `;

        return templates[levelId] ? `<p>${templates[levelId][index] || templates[levelId][0]}</p>` : defaultContent;
    }

    generateNavigationLinks(levelId) {
        const levels = Object.keys(this.contentStructure);
        const currentIndex = levels.indexOf(levelId);
        
        let links = '';
        
        if (currentIndex > 0) {
            const prevLevel = levels[currentIndex - 1];
            links += `
                <a href="#" class="nav-link prev-link" data-level="${prevLevel}">
                    ← ${this.contentStructure[prevLevel].title}
                </a>
            `;
        }
        
        if (currentIndex < levels.length - 1) {
            const nextLevel = levels[currentIndex + 1];
            links += `
                <a href="#" class="nav-link next-link" data-level="${nextLevel}">
                    ${this.contentStructure[nextLevel].title} →
                </a>
            `;
        }
        
        return links;
    }

    updateContentViewport(content) {
        this.contentTitle.textContent = content.title;
        this.contentBody.innerHTML = content.html;
        
        // Добавляем обработчики для динамического контента
        this.bindContentEvents();
    }

    bindContentEvents() {
        // Навигация по секциям
        this.contentBody.addEventListener('click', (e) => {
            const sectionLink = e.target.closest('.section-link');
            if (sectionLink) {
                e.preventDefault();
                this.scrollToSection(sectionLink.getAttribute('href'));
            }

            const navLink = e.target.closest('.nav-link');
            if (navLink) {
                e.preventDefault();
                const levelId = navLink.getAttribute('data-level');
                this.showContent(levelId);
            }

            const completeBtn = e.target.closest('.complete-level');
            if (completeBtn) {
                this.completeLevel(completeBtn.getAttribute('data-level'));
            }

            const saveBtn = e.target.closest('.save-progress');
            if (saveBtn) {
                this.saveCurrentProgress();
            }
        });

        // Отслеживание прогресса по секциям
        const checkboxes = this.contentBody.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.updateSectionProgress(e.target);
            });
        });

        // Перехват внутренних ссылок
        this.contentBody.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('#')) {
                e.preventDefault();
                this.scrollToSection(e.target.getAttribute('href'));
            }
        });
    }

    scrollToSection(sectionId) {
        const section = this.contentBody.querySelector(sectionId);
        if (section) {
            section.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
            
            // Подсветка секции
            section.classList.add('highlighted');
            setTimeout(() => section.classList.remove('highlighted'), 2000);
        }
    }

    animateContentAppearance() {
        this.contentViewport.classList.add('active');
        
        // Анимация появления контента
        const sections = this.contentBody.querySelectorAll('.content-section');
        sections.forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                section.style.transition = 'all 0.5s ease';
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, 100 + index * 100);
        });
    }

    hideContent() {
        this.contentViewport.classList.remove('active');
        this.currentContent = null;
        
        // Генерируем событие скрытия контента
        document.dispatchEvent(new CustomEvent('contentHidden'));
    }

    updateProgress(levelId) {
        const progress = this.getLevelProgress(levelId);
        this.progressFill.style.width = `${progress}%`;
        
        // Обновляем прогресс в структуре
        this.contentStructure[levelId].progress = progress;
    }

    getLevelProgress(levelId) {
        const savedProgress = localStorage.getItem(`progress-${levelId}`);
        return savedProgress ? parseInt(savedProgress) : 0;
    }

    updateSectionProgress(checkbox) {
        const sectionId = checkbox.getAttribute('data-section');
        const isCompleted = checkbox.checked;
        
        // Сохраняем прогресс
        localStorage.setItem(`section-${sectionId}`, isCompleted ? 'completed' : 'incomplete');
        
        // Пересчитываем общий прогресс уровня
        this.calculateAndSaveLevelProgress(sectionId.split('-')[0]);
    }

    calculateAndSaveLevelProgress(levelId) {
        const totalSections = this.contentStructure[levelId].sections.length;
        let completedSections = 0;
        
        for (let i = 0; i < totalSections; i++) {
            if (localStorage.getItem(`section-${levelId}-${i}`) === 'completed') {
                completedSections++;
            }
        }
        
        const progress = Math.round((completedSections / totalSections) * 100);
        localStorage.setItem(`progress-${levelId}`, progress.toString());
        
        // Обновляем отображение
        this.updateProgress(levelId);
        
        return progress;
    }

    completeLevel(levelId) {
        const progress = this.calculateAndSaveLevelProgress(levelId);
        
        if (progress >= 80) { // 80% для завершения уровня
            this.showCompletionMessage(levelId);
            this.unlockNextLevel(levelId);
        } else {
            this.showIncompleteMessage();
        }
    }

    showCompletionMessage(levelId) {
        this.showNotification(`Уровень "${this.contentStructure[levelId].title}" завершен!`, 'success');
    }

    showIncompleteMessage() {
        this.showNotification('Завершите все разделы уровня для продолжения', 'warning');
    }

    unlockNextLevel(levelId) {
        const levels = Object.keys(this.contentStructure);
        const currentIndex = levels.indexOf(levelId);
        
        if (currentIndex < levels.length - 1) {
            const nextLevel = levels[currentIndex + 1];
            localStorage.setItem(`unlocked-${nextLevel}`, 'true');
            this.showNotification(`Доступен новый уровень: ${this.contentStructure[nextLevel].title}`, 'info');
        }
    }

    saveCurrentProgress() {
        if (this.currentContent) {
            const progress = this.getLevelProgress(this.currentContent);
            this.showNotification(`Прогресс сохранен: ${progress}%`, 'success');
        }
    }

    calculateReadTime(sections) {
        const wordsPerMinute = 200;
        const totalWords = sections.length * 150; // Примерная оценка
        return Math.ceil(totalWords / wordsPerMinute);
    }

    showLoadingState() {
        this.contentBody.innerHTML = `
            <div class="loading-state">
                <div class="dna-loader">
                    <div class="base-pair"></div>
                    <div class="base-pair"></div>
                    <div class="base-pair"></div>
                </div>
                <p>Загрузка контента...</p>
            </div>
        `;
    }

    showErrorState(levelId, error) {
        this.contentBody.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Ошибка загрузки контента</h3>
                <p>Не удалось загрузить контент для уровня "${this.contentStructure[levelId]?.title || levelId}"</p>
                <button class="btn btn-primary retry-loading" data-level="${levelId}">
                    Попробовать снова
                </button>
                <details class="error-details">
                    <summary>Техническая информация</summary>
                    <pre>${error.message}</pre>
                </details>
            </div>
        `;

        // Обработчик повторной попытки
        this.contentBody.querySelector('.retry-loading').addEventListener('click', () => {
            this.showContent(levelId);
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        const container = document.getElementById('notifications');
        container.appendChild(notification);

        // Автоудаление через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Закрытие по клику
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    trackContentViewed(levelId) {
        // Статистика просмотров
        const views = JSON.parse(localStorage.getItem('contentViews') || '{}');
        views[levelId] = (views[levelId] || 0) + 1;
        localStorage.setItem('contentViews', JSON.stringify(views));
    }

    preloadCriticalContent() {
        // Предзагрузка первых двух уровней
        this.loadContent('level0');
        this.loadContent('level1');
    }

    setupServiceWorker() {
        // Зарегистрируем Service Worker для кэширования контента
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker зарегистрирован:', registration);
                })
                .catch(error => {
                    console.log('Ошибка регистрации Service Worker:', error);
                });
        }
    }

    // Публичные методы
    getCurrentContent() {
        return this.currentContent;
    }

    getContentStructure() {
        return { ...this.contentStructure };
    }

    clearCache() {
        this.contentCache.clear();
        this.showNotification('Кэш контента очищен', 'info');
    }

    exportProgress() {
        const progress = {};
        Object.keys(this.contentStructure).forEach(levelId => {
            progress[levelId] = this.getLevelProgress(levelId);
        });
        
        return JSON.stringify(progress, null, 2);
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

document.addEventListener('DOMContentLoaded', function() {
    window.contentManager = new ContentManager();
    
    // Глобальные обработчики ошибок
    window.addEventListener('error', function(e) {
        console.error('Content Manager Error:', e.error);
    });
});

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentManager;
}
