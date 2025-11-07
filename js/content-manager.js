// ===== CONTENT MANAGEMENT SYSTEM =====

class ContentManager {
    constructor() {
        this.contentViewport = null;
        this.currentContent = null;
        this.contentCache = new Map();
        this.cacheHits = new Map();
        this.cacheLimit = 50; // Максимум элементов в кеше
        this.isLoading = false;
        
        // Структура контента с улучшенной организацией
        this.contentStructure = {
            level0: {
                id: 'level0',
                title: "Уровень 0: Философия проекта",
                description: "Основные принципы и мировоззрение проекта GENOФОНД",
                icon: '🧠',
                color: 'var(--color-nucleus)',
                difficulty: 'beginner',
                sections: [
                    { id: 'intro', title: "Введение в концепцию бессмертия", duration: 5 },
                    { id: 'ethics', title: "Этическая основа проекта", duration: 7 },
                    { id: 'science', title: "Научная парадигма", duration: 6 },
                    { id: 'history', title: "Исторический контекст", duration: 8 }
                ],
                progress: 0,
                unlocked: true
            },
            level1: {
                id: 'level1',
                title: "Уровень 1: Диагностика",
                description: "Комплексная оценка текущего состояния организма",
                icon: '🔍',
                color: 'var(--color-mitochondria)',
                difficulty: 'beginner',
                sections: [
                    { id: 'genetics', title: "Генетический анализ", duration: 10 },
                    { id: 'biomarkers', title: "Биомаркеры старения", duration: 8 },
                    { id: 'functional', title: "Функциональная диагностика", duration: 12 },
                    { id: 'psychological', title: "Психологический профиль", duration: 9 }
                ],
                progress: 0,
                unlocked: true
            },
            level2: {
                id: 'level2',
                title: "Уровень 2: Фундамент", 
                description: "Базовые практики и привычки для долголетия",
                icon: '🏗️',
                color: 'var(--color-ribosome)',
                difficulty: 'intermediate',
                sections: [
                    { id: 'nutrition', title: "Нутрициология и диетология", duration: 15 },
                    { id: 'activity', title: "Физическая активность", duration: 12 },
                    { id: 'sleep', title: "Сон и циркадные ритмы", duration: 10 },
                    { id: 'stress', title: "Управление стрессом", duration: 8 }
                ],
                progress: 0,
                unlocked: false
            },
            // ... остальные уровни с аналогичной структурой
            knowledge: {
                id: 'knowledge',
                title: "База знаний",
                description: "Полная библиотека исследований и материалов",
                icon: '📚',
                color: 'var(--color-dna-primary)',
                difficulty: 'all',
                sections: [
                    { id: 'publications', title: "Научные публикации", duration: 0 },
                    { id: 'success', title: "Истории успеха", duration: 0 },
                    { id: 'tools', title: "Инструменты и калькуляторы", duration: 0 },
                    { id: 'community', title: "Сообщество экспертов", duration: 0 }
                ],
                progress: 0,
                unlocked: true
            }
        };

        this.init();
    }

    async init() {
        try {
            this.contentViewport = document.getElementById('contentViewport');
            this.contentTitle = document.getElementById('contentTitle');
            this.contentBody = document.getElementById('contentBody');
            this.closeContent = document.getElementById('closeContent');
            this.progressFill = document.querySelector('.progress-fill');

            if (!this.contentViewport || !this.contentBody) {
                throw new Error('Required DOM elements not found');
            }

            this.bindEvents();
            this.restoreCacheFromStorage();
            this.setupCacheCleanup();
            this.preloadCriticalContent();
            
            console.log('✅ ContentManager initialized');
        } catch (error) {
            console.error('❌ ContentManager init failed:', error);
            throw error;
        }
    }

    bindEvents() {
        // Закрытие контента
        this.closeContent?.addEventListener('click', () => {
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
            if (!this.isLoading) {
                this.showContent(e.detail.levelId);
            }
        });

        document.addEventListener('organelleContentRequest', (e) => {
            if (!this.isLoading) {
                this.showContent(e.detail.levelId);
            }
        });

        // Оптимизация: отложенная загрузка невидимого контента
        this.setupIntersectionObserver();
    }

    setupIntersectionObserver() {
        // Ленивая загрузка контента при приближении к элементам
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const levelId = entry.target.getAttribute('data-level');
                        if (levelId && !this.contentCache.has(levelId)) {
                            this.preloadContent(levelId);
                        }
                    }
                });
            }, { rootMargin: '100px' });
        }
    }

    async showContent(levelId) {
        if (this.currentContent === levelId || this.isLoading) return;

        try {
            this.isLoading = true;
            this.showLoadingState();
            
            // Загружаем контент с приоритетом
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
        } finally {
            this.isLoading = false;
        }
    }

    async loadContent(levelId, priority = 'high') {
        // Проверяем кэш в памяти
        if (this.contentCache.has(levelId)) {
            this.cacheHits.set(levelId, (this.cacheHits.get(levelId) || 0) + 1);
            const cached = this.contentCache.get(levelId);
            cached.accessCount = (cached.accessCount || 0) + 1;
            cached.lastAccessed = Date.now();
            return cached.data;
        }

        // Проверяем localStorage
        const fromStorage = this.restoreFromLocalStorage(levelId);
        if (fromStorage) {
            this.cacheContent(levelId, fromStorage);
            return fromStorage;
        }

        // Загружаем с сервера (или генерируем)
        const content = await this.fetchContentData(levelId, priority);
        
        // Кэшируем результат
        this.cacheContent(levelId, content);
        
        return content;
    }

    cacheContent(levelId, content) {
        // Очищаем кеш если достигли лимита
        if (this.contentCache.size >= this.cacheLimit) {
            this.removeLeastUsed();
        }
        
        const cacheEntry = {
            data: content,
            timestamp: Date.now(),
            size: this.calculateContentSize(content),
            accessCount: 1,
            lastAccessed: Date.now()
        };
        
        this.contentCache.set(levelId, cacheEntry);
        
        // Сохраняем в localStorage для persistence (только для небольших данных)
        if (cacheEntry.size < 50000) { // 50KB limit
            this.persistToLocalStorage(levelId, content);
        }
    }

    removeLeastUsed() {
        let leastUsed = null;
        let minScore = Infinity;
        
        for (let [key, value] of this.contentCache) {
            // Score based on access count and age
            const age = Date.now() - value.lastAccessed;
            const score = value.accessCount / (age / 1000); // accesses per second
            
            if (score < minScore) {
                minScore = score;
                leastUsed = key;
            }
        }
        
        if (leastUsed) {
            this.contentCache.delete(leastUsed);
            console.log('🗑️ Удален из кеша:', leastUsed);
        }
    }

    async fetchContentData(levelId, priority = 'high') {
        // Имитация загрузки с сервера с разным приоритетом
        const delay = priority === 'high' ? 300 : 1000 + Math.random() * 2000;
        
        return new Promise((resolve) => {
            setTimeout(() => {
                const levelData = this.contentStructure[levelId];
                
                if (!levelData) {
                    throw new Error(`Content not found for level: ${levelId}`);
                }
                
                // Генерируем демо-контент на основе структуры
                const content = {
                    id: levelId,
                    title: levelData.title,
                    description: levelData.description,
                    icon: levelData.icon,
                    color: levelData.color,
                    difficulty: levelData.difficulty,
                    sections: levelData.sections,
                    html: this.generateContentHTML(levelId, levelData),
                    lastUpdated: new Date().toISOString(),
                    estimatedReadTime: this.calculateReadTime(levelData.sections),
                    version: '1.0'
                };
                
                resolve(content);
            }, delay);
        });
    }

    generateContentHTML(levelId, levelData) {
        const progress = this.getLevelProgress(levelId);
        const isCompleted = progress >= 80;
        
        return `
            <div class="content-page" data-level="${levelId}">
                <div class="content-hero" style="--accent-color: ${levelData.color}">
                    <div class="content-header-meta">
                        <span class="content-icon">${levelData.icon}</span>
                        <span class="content-difficulty ${levelData.difficulty}">${this.getDifficultyText(levelData.difficulty)}</span>
                        ${isCompleted ? '<span class="completion-badge">✅ Пройдено</span>' : ''}
                    </div>
                    <h1>${levelData.title}</h1>
                    <p class="content-description">${levelData.description}</p>
                    <div class="content-meta">
                        <span class="read-time">⏱️ ${this.calculateReadTime(levelData.sections)} мин</span>
                        <span class="last-updated">📅 ${new Date().toLocaleDateString('ru-RU')}</span>
                        <span class="progress-indicator">${progress}% завершено</span>
                    </div>
                </div>

                <div class="content-navigation">
                    <h3>Содержание:</h3>
                    <div class="section-links">
                        ${levelData.sections.map((section, index) => `
                            <a href="#section-${section.id}" class="section-link ${this.isSectionCompleted(levelId, index) ? 'completed' : ''}">
                                <span class="section-number">${index + 1}</span>
                                <span class="section-info">
                                    <span class="section-title">${section.title}</span>
                                    <span class="section-duration">${section.duration} мин</span>
                                </span>
                                ${this.isSectionCompleted(levelId, index) ? '✅' : '◯'}
                            </a>
                        `).join('')}
                    </div>
                </div>

                <div class="content-sections">
                    ${levelData.sections.map((section, index) => `
                        <section id="section-${section.id}" class="content-section">
                            <div class="section-header">
                                <h2>${section.title}</h2>
                                <span class="section-duration">${section.duration} мин</span>
                            </div>
                            <div class="section-content">
                                ${this.generateSectionContent(levelId, section, index)}
                            </div>
                            <div class="section-progress">
                                <label class="progress-checkbox">
                                    <input type="checkbox" 
                                           data-section="${levelId}-${index}" 
                                           ${this.isSectionCompleted(levelId, index) ? 'checked' : ''}
                                           aria-label="Отметить раздел '${section.title}' как пройденный">
                                    <span class="checkmark"></span>
                                    <span>Отметить как пройденное</span>
                                </label>
                            </div>
                        </section>
                    `).join('')}
                </div>

                <div class="content-actions">
                    <button class="btn btn-primary complete-level" data-level="${levelId}">
                        ${isCompleted ? '🎉 Уровень завершен' : 'Завершить уровень'}
                    </button>
                    <button class="btn btn-secondary save-progress">
                        💾 Сохранить прогресс
                    </button>
                    <button class="btn btn-bio cache-control" data-action="clear-cache">
                        🗑️ Очистить кеш
                    </button>
                </div>

                <div class="content-footer">
                    <div class="next-prev-nav">
                        ${this.generateNavigationLinks(levelId)}
                    </div>
                    <div class="content-stats">
                        <small>Загружено из кеша: ${this.cacheHits.get(levelId) || 0} раз</small>
                    </div>
                </div>
            </div>
        `;
    }

    generateSectionContent(levelId, section, index) {
        const templates = {
            level0: {
                intro: `<p>Концепция бессмертия всегда волновала человечество. Современная наука позволяет нам приблизиться к этой мечте через понимание биологических процессов старения.</p>`,
                ethics: `<p>Этические вопросы продления жизни требуют тщательного рассмотрения. Мы должны балансировать между научным прогрессом и моральными принципами.</p>`,
                science: `<p>Научный подход к бессмертию основан на исследованиях теломер, клеточного старения и регенеративных технологий.</p>`,
                history: `<p>От алхимиков до современных крионических компаний - поиск бессмертия имеет богатую историю.</p>`
            },
            level1: {
                genetics: `<p>Генетический анализ выявляет ваши уникальные особенности и предрасположенности к различным заболеваниям.</p>`,
                biomarkers: `<p>Биомаркеры старения помогают определить ваш биологический возраст и темпы старения.</p>`,
                functional: `<p>Функциональная диагностика оценивает текущее состояние органов и систем организма.</p>`,
                psychological: `<p>Психологическое состояние напрямую влияет на процессы старения и общее здоровье.</p>`
            }
        };

        const defaultContent = `
            <div class="content-placeholder">
                <div class="placeholder-icon">📝</div>
                <h3>Раздел в разработке</h3>
                <p>Контент для раздела "${section.title}" находится в разработке и будет доступен в ближайшее время.</p>
                <p>Здесь будут размещены подробные материалы, интерактивные элементы и практические задания.</p>
            </div>
        `;

        return templates[levelId]?.[section.id] || defaultContent;
    }

    generateNavigationLinks(levelId) {
        const levels = Object.keys(this.contentStructure);
        const currentIndex = levels.indexOf(levelId);
        
        let links = '';
        
        if (currentIndex > 0) {
            const prevLevel = levels[currentIndex - 1];
            const prevData = this.contentStructure[prevLevel];
            if (prevData.unlocked) {
                links += `
                    <a href="#" class="nav-link prev-link" data-level="${prevLevel}">
                        ← ${prevData.icon} ${prevData.title}
                    </a>
                `;
            }
        }
        
        if (currentIndex < levels.length - 1) {
            const nextLevel = levels[currentIndex + 1];
            const nextData = this.contentStructure[nextLevel];
            if (nextData.unlocked) {
                links += `
                    <a href="#" class="nav-link next-link" data-level="${nextLevel}">
                        ${nextData.icon} ${nextData.title} →
                    </a>
                `;
            }
        }
        
        return links;
    }

    updateContentViewport(content) {
        if (!this.contentTitle || !this.contentBody) return;

        this.contentTitle.textContent = content.title;
        this.contentBody.innerHTML = content.html;
        
        // Обновляем ARIA атрибуты
        this.contentViewport.setAttribute('aria-label', `Контент: ${content.title}`);
        this.contentViewport.setAttribute('aria-hidden', 'false');
        
        // Добавляем обработчики для динамического контента
        this.bindContentEvents();
        
        // Предзагружаем связанный контент
        this.preloadRelatedContent(content.id);
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

            const cacheBtn = e.target.closest('.cache-control');
            if (cacheBtn) {
                this.handleCacheAction(cacheBtn.getAttribute('data-action'));
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

    handleCacheAction(action) {
        switch (action) {
            case 'clear-cache':
                this.clearCache();
                break;
            case 'preload-all':
                this.preloadAllContent();
                break;
        }
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
        
        // Анимация появления контента с оптимизацией для слабых устройств
        const sections = this.contentBody.querySelectorAll('.content-section');
        const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 100;
        
        sections.forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                section.style.transition = 'all 0.5s ease';
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, delay + index * 50);
        });
    }

    hideContent() {
        this.contentViewport.classList.remove('active');
        this.contentViewport.setAttribute('aria-hidden', 'true');
        this.currentContent = null;
        
        // Генерируем событие скрытия контента
        document.dispatchEvent(new CustomEvent('contentHidden'));
    }

    // Система прогресса и кеширования
    updateProgress(levelId) {
        const progress = this.getLevelProgress(levelId);
        if (this.progressFill) {
            this.progressFill.style.width = `${progress}%`;
            this.progressFill.setAttribute('aria-valuenow', progress);
        }
        
        // Обновляем прогресс в структуре
        this.contentStructure[levelId].progress = progress;
    }

    getLevelProgress(levelId) {
        const savedProgress = localStorage.getItem(`progress-${levelId}`);
        return savedProgress ? parseInt(savedProgress) : 0;
    }

    isSectionCompleted(levelId, sectionIndex) {
        return localStorage.getItem(`section-${levelId}-${sectionIndex}`) === 'completed';
    }

    updateSectionProgress(checkbox) {
        const sectionId = checkbox.getAttribute('data-section');
        const isCompleted = checkbox.checked;
        
        // Сохраняем прогресс
        localStorage.setItem(`section-${sectionId}`, isCompleted ? 'completed' : 'incomplete');
        
        // Обновляем UI
        const sectionLink = this.contentBody.querySelector(`[href="#section-${sectionId.split('-')[1]}"]`);
        if (sectionLink) {
            sectionLink.classList.toggle('completed', isCompleted);
        }
        
        // Пересчитываем общий прогресс уровня
        this.calculateAndSaveLevelProgress(sectionId.split('-')[0]);
    }

    calculateAndSaveLevelProgress(levelId) {
        const levelData = this.contentStructure[levelId];
        if (!levelData) return 0;

        const totalSections = levelData.sections.length;
        let completedSections = 0;
        
        for (let i = 0; i < totalSections; i++) {
            if (this.isSectionCompleted(levelId, i)) {
                completedSections++;
            }
        }
        
        const progress = Math.round((completedSections / totalSections) * 100);
        localStorage.setItem(`progress-${levelId}`, progress.toString());
        
        // Обновляем отображение
        this.updateProgress(levelId);
        
        // Разблокируем следующий уровень при достижении 80%
        if (progress >= 80) {
            this.unlockNextLevel(levelId);
        }
        
        return progress;
    }

    completeLevel(levelId) {
        const progress = this.calculateAndSaveLevelProgress(levelId);
        
        if (progress >= 80) {
            this.showCompletionMessage(levelId);
        } else {
            this.showIncompleteMessage(levelId, progress);
        }
    }

    showCompletionMessage(levelId) {
        const levelData = this.contentStructure[levelId];
        this.showNotification(
            `🎉 Уровень "${levelData.title}" завершен! Доступ открыт к следующему этапу.`,
            'success',
            5000
        );
    }

    showIncompleteMessage(levelId, progress) {
        const remaining = 80 - progress;
        this.showNotification(
            `Завершите еще ${remaining}% уровня для продолжения`,
            'warning',
            4000
        );
    }

    unlockNextLevel(levelId) {
        const levels = Object.keys(this.contentStructure);
        const currentIndex = levels.indexOf(levelId);
        
        if (currentIndex < levels.length - 1) {
            const nextLevel = levels[currentIndex + 1];
            this.contentStructure[nextLevel].unlocked = true;
            localStorage.setItem(`unlocked-${nextLevel}`, 'true');
            
            this.showNotification(
                `🔓 Доступен новый уровень: ${this.contentStructure[nextLevel].title}`,
                'info',
                6000
            );
        }
    }

    // Система кеширования
    persistToLocalStorage(levelId, content) {
        try {
            const cacheKey = `content-cache-${levelId}`;
            const cacheData = {
                data: content,
                timestamp: Date.now(),
                version: '1.0',
                size: this.calculateContentSize(content)
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Не удалось сохранить в localStorage:', error);
            // Если localStorage переполнен, очищаем старые записи
            this.cleanupLocalStorage();
        }
    }

    restoreFromLocalStorage(levelId) {
        try {
            const cacheKey = `content-cache-${levelId}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                const cacheData = JSON.parse(cached);
                
                // Проверяем актуальность (1 день) и версию
                const isFresh = Date.now() - cacheData.timestamp < 24 * 60 * 60 * 1000;
                const isCurrentVersion = cacheData.version === '1.0';
                
                if (isFresh && isCurrentVersion) {
                    console.log('📂 Загружено из localStorage:', levelId);
                    return cacheData.data;
                } else {
                    localStorage.removeItem(cacheKey);
                }
            }
        } catch (error) {
            console.warn('Ошибка восстановления из localStorage:', error);
        }
        return null;
    }

    restoreCacheFromStorage() {
        // Восстанавливаем популярный контент из localStorage
        Object.keys(this.contentStructure).forEach(levelId => {
            if (this.restoreFromLocalStorage(levelId)) {
                console.log('🔄 Восстановлен кеш для:', levelId);
            }
        });
    }

    setupCacheCleanup() {
        // Очистка устаревшего кеша каждые 30 минут
        setInterval(() => {
            this.cleanupExpiredCache();
        }, 30 * 60 * 1000);
    }

    cleanupExpiredCache() {
        const now = Date.now();
        const expirationTime = 2 * 60 * 60 * 1000; // 2 часа
        
        for (let [key, value] of this.contentCache) {
            if (now - value.timestamp > expirationTime) {
                this.contentCache.delete(key);
            }
        }
        
        this.cleanupLocalStorage();
    }

    cleanupLocalStorage() {
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 1 неделя
        
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('content-cache-')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (now - data.timestamp > maxAge) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                }
            }
        });
    }

    // Предзагрузка контента
    preloadCriticalContent() {
        // Предзагрузка первых двух уровней
        this.preloadContent('level0', 'low');
        this.preloadContent('level1', 'low');
    }

    async preloadContent(levelId, priority = 'low') {
        if (this.contentCache.has(levelId) || this.isLoading) return;
        
        try {
            const content = await this.fetchContentData(levelId, priority);
            this.cacheContent(levelId, content);
        } catch (error) {
            console.warn('Preload failed for:', levelId, error);
        }
    }

    preloadRelatedContent(currentLevelId) {
        const levels = Object.keys(this.contentStructure);
        const currentIndex = levels.indexOf(currentLevelId);
        
        // Предзагружаем соседние уровни
        if (currentIndex > 0) {
            this.preloadContent(levels[currentIndex - 1], 'low');
        }
        if (currentIndex < levels.length - 1) {
            this.preloadContent(levels[currentIndex + 1], 'low');
        }
    }

    async preloadAllContent() {
        console.log('🔄 Предзагрузка всего контента...');
        const levels = Object.keys(this.contentStructure);
        
        for (const levelId of levels) {
            if (!this.contentCache.has(levelId)) {
                await this.preloadContent(levelId, 'low');
                // Задержка для предотвращения блокировки UI
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        this.showNotification('Весь контент предзагружен в кеш', 'success');
    }

    // Вспомогательные методы
    calculateReadTime(sections) {
        const totalMinutes = sections.reduce((sum, section) => sum + (section.duration || 5), 0);
        return Math.max(1, Math.ceil(totalMinutes));
    }

    calculateContentSize(content) {
        return new Blob([JSON.stringify(content)]).size;
    }

    getDifficultyText(difficulty) {
        const texts = {
            'beginner': 'Начальный',
            'intermediate': 'Средний',
            'advanced': 'Продвинутый',
            'all': 'Все уровни'
        };
        return texts[difficulty] || difficulty;
    }

    // UI состояния
    showLoadingState() {
        this.contentBody.innerHTML = `
            <div class="loading-state">
                <div class="dna-loader">
                    <div class="base-pair"></div>
                    <div class="base-pair"></div>
                    <div class="base-pair"></div>
                </div>
                <p>Загрузка контента...</p>
                <small>Используется кеш: ${this.contentCache.size} элементов</small>
            </div>
        `;
    }

    showErrorState(levelId, error) {
        this.contentBody.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Ошибка загрузки контента</h3>
                <p>Не удалось загрузить контент для уровня "${this.contentStructure[levelId]?.title || levelId}"</p>
                <div class="error-actions">
                    <button class="btn btn-primary retry-loading" data-level="${levelId}">
                        Попробовать снова
                    </button>
                    <button class="btn btn-secondary use-offline" data-level="${levelId}">
                        Использовать оффлайн-версию
                    </button>
                </div>
                <details class="error-details">
                    <summary>Техническая информация</summary>
                    <pre>${error.message}</pre>
                </details>
            </div>
        `;

        // Обработчики для кнопок ошибки
        this.contentBody.querySelector('.retry-loading')?.addEventListener('click', () => {
            this.showContent(levelId);
        });

        this.contentBody.querySelector('.use-offline')?.addEventListener('click', () => {
            const cached = this.restoreFromLocalStorage(levelId);
            if (cached) {
                this.updateContentViewport(cached);
            } else {
                this.showNotification('Оффлайн-версия не найдена', 'error');
            }
        });
    }

    showNotification(message, type = 'info', duration = 5000) {
        const event = new CustomEvent('showNotification', {
            detail: { message, type, duration }
        });
        document.dispatchEvent(event);
    }

    trackContentViewed(levelId) {
        // Статистика просмотров
        const views = JSON.parse(localStorage.getItem('contentViews') || '{}');
        views[levelId] = (views[levelId] || 0) + 1;
        localStorage.setItem('contentViews', JSON.stringify(views));
    }

    // Публичные методы
    getCurrentContent() {
        return this.currentContent;
    }

    getContentStructure() {
        return { ...this.contentStructure };
    }

    getCacheStats() {
        const totalSize = Array.from(this.contentCache.values())
            .reduce((sum, item) => sum + item.size, 0);
            
        const hits = Array.from(this.cacheHits.values()).reduce((a, b) => a + b, 0);
        const hitRate = this.contentCache.size > 0 ? (hits / (hits + this.contentCache.size)) : 0;
        
        return {
            totalItems: this.contentCache.size,
            totalSize: Math.round(totalSize / 1024), // KB
            hitRate: Math.round(hitRate * 100),
            mostAccessed: Array.from(this.cacheHits.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
        };
    }

    clearCache() {
        this.contentCache.clear();
        this.cacheHits.clear();
        
        // Очищаем localStorage кеш
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('content-cache-')) {
                localStorage.removeItem(key);
            }
        });
        
        this.showNotification('Кеш контента очищен', 'info');
        
        // Перезагружаем текущий контент если он открыт
        if (this.currentContent) {
            this.showContent(this.currentContent);
        }
    }

    saveCurrentProgress() {
        if (this.currentContent) {
            const progress = this.getLevelProgress(this.currentContent);
            this.showNotification(`Прогресс сохранен: ${progress}%`, 'success');
        }
    }

    // Деструктор
    destroy() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        // Очищаем интервалы
        if (this.cacheCleanupInterval) {
            clearInterval(this.cacheCleanupInterval);
        }
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

document.addEventListener('DOMContentLoaded', function() {
    try {
        window.contentManager = new ContentManager();
        
        // Глобальные обработчики ошибок
        window.addEventListener('error', function(e) {
            console.error('Content Manager Error:', e.error);
        });
    } catch (error) {
        console.error('Failed to initialize ContentManager:', error);
    }
});

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentManager;
}
