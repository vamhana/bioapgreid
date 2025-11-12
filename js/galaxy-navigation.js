class LevelDataCache {
    constructor(maxSize = 50, timeout = 30000) {
        this.maxSize = maxSize;
        this.timeout = timeout;
        this.cache = new Map();
        this.hits = 0;
        this.misses = 0;
    }

    get(levelId) {
        if (!this.cache.has(levelId)) {
            this.misses++;
            return null;
        }
        
        const item = this.cache.get(levelId);
        
        // Проверка таймаута
        if (Date.now() - item.timestamp > this.timeout) {
            this.cache.delete(levelId);
            this.misses++;
            return null;
        }
        
        // Обновляем порядок использования (перемещаем в конец)
        this.cache.delete(levelId);
        this.cache.set(levelId, item);
        this.hits++;
        
        return item.data;
    }

    set(levelId, data) {
        // Если достигли максимального размера, удаляем самый старый элемент
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(levelId, {
            data,
            timestamp: Date.now()
        });
    }

    delete(levelId) {
        this.cache.delete(levelId);
    }

    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    get size() {
        return this.cache.size;
    }

    get hitRate() {
        const total = this.hits + this.misses;
        return total > 0 ? this.hits / total : 0;
    }
}

class NavigationQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.pendingNavigation = null;
    }

    async addNavigation(levelId, priority = 'normal') {
        return new Promise((resolve, reject) => {
            const task = { 
                levelId, 
                priority, 
                resolve, 
                reject,
                timestamp: Date.now()
            };
            
            if (priority === 'high') {
                this.queue.unshift(task);
            } else {
                this.queue.push(task);
            }
            
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        const task = this.queue.shift();
        
        try {
            // Сохраняем текущую навигацию для возможной отмены
            this.pendingNavigation = task.levelId;
            const result = await this.executeNavigation(task.levelId);
            task.resolve(result);
        } catch (error) {
            task.reject(error);
        } finally {
            this.processing = false;
            this.pendingNavigation = null;
            setTimeout(() => this.processQueue(), 0);
        }
    }

    async executeNavigation(levelId) {
        // Имитация асинхронной навигации
        // В реальной реализации здесь будет интеграция с GalaxyNavigation.switchLevel
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ levelId, success: true });
            }, 10);
        });
    }

    cancelPending() {
        if (this.pendingNavigation) {
            this.pendingNavigation = null;
        }
    }

    clear() {
        this.queue = [];
        this.processing = false;
        this.pendingNavigation = null;
    }

    get length() {
        return this.queue.length;
    }
}

class GalaxyNavigation {
    constructor(app) {
        this.app = app;
        this.currentLevel = null;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistoryDepth = 50;
        this.autoSaveInterval = null;
        
        // Новые компоненты
        this.levelDataCache = new LevelDataCache(50, 30000);
        this.navigationQueue = new NavigationQueue();
        this.analyticsData = [];
        this.maxAnalyticsSize = 100;
        this.lastNavigationTime = Date.now();
        this.sessionId = this.generateSessionId();
        this.predictionCache = new Map();
        
        // Конфигурация для GitHub Pages и bioapgreid.ru
        this.config = {
            baseUrl: 'https://www.bioapgreid.ru/',
            isGitHubPages: window.location.hostname.includes('github.io'),
            isBioapgreid: window.location.hostname.includes('bioapgreid.ru'),
            useHashRouting: true, // Используем hash-based routing для GitHub Pages
            localStorageKey: 'genofond-navigation-state'
        };
        
        // Инициализация
        this.setupEventListeners();
        this.loadState();
        this.setupAutoSave();
        this.setupPredictiveNavigation();
        
        console.log('🎯 Навигационная система v2.1 инициализирована для bioapgreid.ru');
    }

    /**
     * Генерация ID сессии для аналитики
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Обработка кнопок браузера "назад/вперед"
        window.addEventListener('popstate', (event) => {
            this.handleBrowserNavigation(event);
        });

        // Обработка внутренних событий навигации
        document.addEventListener('entityActivated', (event) => {
            const { entity } = event.detail;
            if (entity && entity.level) {
                this.switchLevel(entity.level, 'entity_click');
            }
        });

        // Обработка команд навигации
        document.addEventListener('goBack', () => this.goBack());
        document.addEventListener('goForward', () => this.goForward());
        document.addEventListener('switchLevel', (event) => {
            this.switchLevel(event.detail.levelId, 'programmatic');
        });

        // Реагируем на изменения прогресса
        document.addEventListener('progressUpdated', (event) => {
            const { levelId } = event.detail;
            // Инвалидируем кэш для этого уровня
            this.levelDataCache.delete(levelId);
            
            // Если это текущий уровень, обновляем навигацию
            if (levelId === this.currentLevel) {
                this.dispatchLevelChange(levelId, null, this.getLevelData(levelId));
            }
        });

        // Обработка видимости страницы для аналитики
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveAnalyticsData();
            }
        });

        console.log('🎯 Навигационная система: обработчики событий установлены');
    }

    /**
     * Переключение на указанный уровень с улучшенной обработкой
     */
    async switchLevel(levelId, navigationType = 'direct') {
        // Санитизация входных данных
        levelId = this.sanitizeLevelId(levelId);
        if (!levelId) {
            console.error('❌ Неверный ID уровня:', levelId);
            return false;
        }

        // Используем очередь для обработки навигации
        return this.navigationQueue.addNavigation(levelId, 'high')
            .then(async () => {
                // Получаем данные уровня перед переключением
                const levelData = this.getLevelData(levelId);
                
                if (!levelData) {
                    console.error(`❌ Уровень ${levelId} не найден`);
                    return false;
                }
                
                if (!levelData.unlocked) {
                    console.warn(`🔒 Уровень ${levelId} заблокирован`);
                    this.dispatchEvent('levelLocked', { levelId, levelData });
                    return false;
                }

                // Проверка на тот же уровень
                if (this.currentLevel === levelId) {
                    console.log(`ℹ️ Уровень ${levelId} уже активен`);
                    return true;
                }

                const previousLevel = this.currentLevel;
                this.currentLevel = levelId;

                // Сбор аналитики
                this.collectNavigationAnalytics(previousLevel, levelId, navigationType);

                // Добавляем данные уровня в историю
                this.addToHistory(levelId, previousLevel, levelData);

                // Обновление URL в браузере
                this.updateBrowserURL(levelId, levelData);

                // Отправка события с полными данными
                this.dispatchLevelChange(levelId, previousLevel, levelData);

                // Автосохранение
                this.saveState();

                // Предзагрузка связанного контента
                this.preloadRelatedContent(levelId);

                console.log(`🎯 Переключение на уровень: ${levelData.title} (${levelId})`);
                return true;
            })
            .catch(error => {
                console.error('❌ Ошибка навигации:', error);
                return false;
            });
    }

    /**
     * Санитизация ID уровня
     */
    sanitizeLevelId(levelId) {
        if (typeof levelId !== 'string') return null;
        
        // Удаляем потенциально опасные символы
        const sanitized = levelId.replace(/[^a-zA-Z0-9\-_]/g, '');
        
        // Проверяем длину
        if (sanitized.length > 100 || sanitized.length === 0) return null;
        
        return sanitized;
    }

    /**
     * Получение данных уровня с улучшенным кэшированием
     */
    getLevelData(levelId) {
        // Проверяем кэш
        const cached = this.levelDataCache.get(levelId);
        if (cached) {
            return cached;
        }
        
        // Получаем свежие данные
        const levelData = this.fetchLevelData(levelId);
        
        // Санитизируем данные перед кэшированием
        const sanitizedData = this.sanitizeLevelData(levelData);
        
        // Сохраняем в кэш
        this.levelDataCache.set(levelId, sanitizedData);
        
        return sanitizedData;
    }

    /**
     * Санитизация данных уровня
     */
    sanitizeLevelData(levelData) {
        const allowedFields = [
            'id', 'title', 'description', 'type', 'color', 'icon', 
            'parent', 'orbitRadius', 'orbitAngle', 'importance', 
            'sizeModifier', 'unlocked', 'completed', 'score', 'url',
            'completionDate', 'lastAccessed'
        ];
        
        const sanitized = {};
        
        allowedFields.forEach(field => {
            if (levelData[field] !== undefined && levelData[field] !== null) {
                // Базовая санитизация строковых полей
                if (typeof levelData[field] === 'string') {
                    sanitized[field] = levelData[field].replace(/[<>]/g, '');
                } else {
                    sanitized[field] = levelData[field];
                }
            }
        });
        
        return sanitized;
    }

    /**
     * Получение данных уровня через ContentManager
     */
    fetchLevelData(levelId) {
        try {
            // Пытаемся получить данные через ContentManager
            if (this.app && this.app.contentManager) {
                const levelData = this.app.contentManager.getLevelData(levelId);
                if (levelData) {
                    return levelData;
                }
            }
            
            console.warn(`⚠️ Данные уровня ${levelId} не найдены в ContentManager`);
        } catch (error) {
            console.error(`❌ Ошибка получения данных уровня ${levelId}:`, error);
        }
        
        // Ultimate fallback
        return this.getFallbackLevelData(levelId);
    }

    /**
     * Резервные данные уровня
     */
    getFallbackLevelData(levelId) {
        return {
            id: levelId,
            title: levelId.replace('level', 'Уровень '),
            description: `Описание уровня ${levelId}`,
            type: 'planet',
            color: '#4ECDC4',
            icon: '🪐',
            parent: '',
            orbitRadius: 150,
            orbitAngle: 0,
            importance: 'medium',
            sizeModifier: '1.0',
            unlocked: true,
            completed: false,
            score: 0,
            completionDate: null,
            url: `#${levelId}`,
            lastAccessed: new Date().toISOString()
        };
    }

    /**
     * Проверка доступности уровня
     */
    isLevelAccessible(levelId) {
        try {
            if (this.app && this.app.contentManager) {
                return this.app.contentManager.isLevelAccessible(levelId);
            }
            return true; // По умолчанию доступен, если ContentManager недоступен
        } catch (error) {
            console.warn(`⚠️ Ошибка проверки доступности уровня ${levelId}:`, error);
            return false;
        }
    }

    /**
     * Валидация уровня
     */
    validateLevel(levelId) {
        if (!levelId || typeof levelId !== 'string') {
            return false;
        }
        
        // Проверяем существование уровня и его доступность
        return this.isLevelAccessible(levelId);
    }

    /**
     * Добавление записи в историю навигации
     */
    addToHistory(levelId, previousLevel, levelData) {
        const historyEntry = {
            levelId,
            previousLevel,
            levelData,
            timestamp: Date.now(),
            url: this.generateLevelURL(levelId, levelData)
        };

        // Если мы не в конце истории, обрезаем хвост
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Добавляем новую запись
        this.history.push(historyEntry);
        this.historyIndex++;

        // Ограничиваем глубину истории
        if (this.history.length > this.maxHistoryDepth) {
            this.history.shift();
            this.historyIndex--;
        }

        // Отправляем событие об обновлении истории
        this.dispatchHistoryUpdated();
    }

    /**
     * Генерация URL для уровня с параметрами
     */
    generateLevelURL(levelId, levelData, options = {}) {
        // Для GitHub Pages и bioapgreid.ru используем hash-based навигацию
        let baseUrl;
        
        if (this.config.isGitHubPages || this.config.isBioapgreid) {
            // SPA-навигация для хостинга - используем hash routing
            baseUrl = `${window.location.origin}${window.location.pathname}#${levelId}`;
        } else {
            // Локальная разработка
            baseUrl = `${window.location.origin}/#${levelId}`;
        }

        // Добавляем параметры если есть
        if (Object.keys(options).length > 0) {
            const url = new URL(baseUrl);
            Object.keys(options).forEach(key => {
                if (options[key]) {
                    url.searchParams.set(key, options[key]);
                }
            });
            return url.toString();
        }

        return baseUrl;
    }

    /**
     * Возврат к предыдущему уровню
     */
    async goBack() {
        if (this.historyIndex <= 0) {
            console.log('ℹ️ Нет предыдущих уровней в истории');
            return false;
        }

        this.historyIndex--;
        const targetEntry = this.history[this.historyIndex];
        
        // Используем switchLevel, но без добавления в историю
        this.currentLevel = targetEntry.levelId;
        this.updateBrowserURL(targetEntry.levelId, targetEntry.levelData);
        this.dispatchLevelChange(targetEntry.levelId, this.history[this.historyIndex + 1].levelId, targetEntry.levelData);

        // Сбор аналитики
        this.collectNavigationAnalytics(
            this.history[this.historyIndex + 1].levelId, 
            targetEntry.levelId, 
            'back'
        );

        console.log(`↩️ Возврат к уровню: ${targetEntry.levelData.title}`);
        return true;
    }

    /**
     * Переход к следующему уровню в истории
     */
    async goForward() {
        if (this.historyIndex >= this.history.length - 1) {
            console.log('ℹ️ Нет следующих уровней в истории');
            return false;
        }

        this.historyIndex++;
        const targetEntry = this.history[this.historyIndex];
        
        // Используем switchLevel, но без добавления в историю
        this.currentLevel = targetEntry.levelId;
        this.updateBrowserURL(targetEntry.levelId, targetEntry.levelData);
        this.dispatchLevelChange(targetEntry.levelId, this.history[this.historyIndex - 1].levelId, targetEntry.levelData);

        // Сбор аналитики
        this.collectNavigationAnalytics(
            this.history[this.historyIndex - 1].levelId, 
            targetEntry.levelId, 
            'forward'
        );

        console.log(`↪️ Переход вперед к уровню: ${targetEntry.levelData.title}`);
        return true;
    }

    /**
     * Обновление URL браузера для deep linking с параметрами
     */
    updateBrowserURL(levelId, levelData) {
        try {
            const options = this.parseURLParameters();
            const newUrl = this.generateLevelURL(levelId, levelData, options);

            // Используем History API для изменения URL без перезагрузки страницы
            if (window.history && window.history.pushState) {
                window.history.pushState({ levelId, levelData }, '', newUrl);
            } else {
                window.location.hash = levelId;
            }
        } catch (error) {
            console.warn('⚠️ Не удалось обновить URL браузера:', error);
        }
    }

    /**
     * Парсинг параметров URL
     */
    parseURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const params = {};
        
        // Обработка параметров навигации
        if (urlParams.has('focus')) {
            params.focus = this.sanitizeLevelId(urlParams.get('focus'));
        }
        
        if (urlParams.has('view')) {
            const view = urlParams.get('view');
            if (['minimal', 'detailed', 'full'].includes(view)) {
                params.view = view;
            }
        }
        
        if (urlParams.has('preview')) {
            params.preview = 'true';
        }
        
        return params;
    }

    /**
     * Обработка навигации браузера (кнопки назад/вперед)
     */
    handleBrowserNavigation(event) {
        try {
            // Обрабатываем hash-based навигацию для SPA
            const hash = window.location.hash.replace('#', '');
            if (hash && hash !== this.currentLevel) {
                this.switchLevel(hash, 'browser_navigation');
            }
            
            // Для GitHub Pages и bioapgreid.ru - дополнительная обработка
            if (this.config.isGitHubPages || this.config.isBioapgreid) {
                const pathLevel = this.extractLevelFromPath();
                if (pathLevel && pathLevel !== this.currentLevel) {
                    this.switchLevel(pathLevel, 'deep_link');
                }
            }
        } catch (error) {
            console.error('❌ Ошибка обработки навигации браузера:', error);
        }
    }

    /**
     * Извлечение уровня из пути для SPA
     */
    extractLevelFromPath() {
        const path = window.location.pathname;
        
        // Для bioapgreid.ru и GitHub Pages - используем только hash routing
        // Оставляем этот метод для будущего расширения
        if (path === '/' || path === '/index.html') {
            return null; // Главная страница
        }
        
        return null; // По умолчанию не используем path-based routing
    }

    /**
     * Отправка события о смене уровня
     */
    dispatchLevelChange(levelId, previousLevel = null, levelData = null) {
        const levelDataToSend = levelData || this.getLevelData(levelId);
        
        const event = new CustomEvent('galacticLevelChange', {
            detail: {
                levelId,
                previousLevel,
                levelData: levelDataToSend,
                timestamp: Date.now(),
                sessionId: this.sessionId
            }
        });

        document.dispatchEvent(event);
        console.log(`🎯 Событие galacticLevelChange отправлено для уровня: ${levelDataToSend.title}`);
    }

    /**
     * Отправка события об обновлении истории
     */
    dispatchHistoryUpdated() {
        const event = new CustomEvent('navigationHistoryUpdated', {
            detail: {
                history: this.history,
                currentIndex: this.historyIndex,
                canGoBack: this.historyIndex > 0,
                canGoForward: this.historyIndex < this.history.length - 1
            }
        });

        document.dispatchEvent(event);
    }

    /**
     * Сбор аналитики навигации
     */
    collectNavigationAnalytics(fromLevel, toLevel, navigationType) {
        const navigationTime = Date.now() - this.lastNavigationTime;
        
        const analyticsEntry = {
            fromLevel,
            toLevel,
            navigationType,
            timestamp: Date.now(),
            duration: navigationTime,
            historyDepth: this.history.length,
            sessionId: this.sessionId,
            userAgent: navigator.userAgent,
            url: window.location.href,
            domain: this.config.isBioapgreid ? 'bioapgreid.ru' : 
                   this.config.isGitHubPages ? 'github.io' : 'local'
        };

        // Добавляем запись
        this.analyticsData.push(analyticsEntry);
        
        // Ограничиваем размер
        if (this.analyticsData.length > this.maxAnalyticsSize) {
            this.analyticsData.shift();
        }

        // Обновляем время последней навигации
        this.lastNavigationTime = Date.now();

        // Отправка события аналитики
        this.dispatchEvent('navigationAnalytics', analyticsEntry);

        // Автосохранение аналитики каждые 10 записей
        if (this.analyticsData.length % 10 === 0) {
            this.saveAnalyticsData();
        }
    }

    /**
     * Сохранение данных аналитики
     */
    saveAnalyticsData() {
        try {
            const analyticsKey = `genofond-analytics-${this.sessionId}`;
            sessionStorage.setItem(analyticsKey, JSON.stringify(this.analyticsData));
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить аналитику:', error);
        }
    }

    /**
     * Настройка предсказательной навигации
     */
    setupPredictiveNavigation() {
        this.predictionTimeout = null;
        
        // Слушаем события взаимодействия для предсказаний
        document.addEventListener('entityHovered', (event) => {
            const { entity } = event.detail;
            if (entity && entity.level) {
                this.schedulePreload(entity.level);
            }
        });

        document.addEventListener('galacticLevelChange', (event) => {
            const { levelId } = event.detail;
            this.preloadChildLevels(levelId);
        });
    }

    /**
     * Планирование предзагрузки
     */
    schedulePreload(levelId) {
        // Отменяем предыдущий таймаут
        if (this.predictionTimeout) {
            clearTimeout(this.predictionTimeout);
        }

        // Устанавливаем новый таймаут
        this.predictionTimeout = setTimeout(() => {
            this.preloadLevelContent(levelId);
        }, 500); // 500ms задержка
    }

    /**
     * Предзагрузка контента уровня
     */
    preloadLevelContent(levelId) {
        if (this.app && this.app.contentManager) {
            this.app.contentManager.preloadLevel(levelId).catch(error => {
                console.warn(`⚠️ Не удалось предзагрузить уровень ${levelId}:`, error);
            });
        }
    }

    /**
     * Предзагрузка дочерних уровней
     */
    preloadChildLevels(parentLevelId) {
        const children = this.getChildLevels(parentLevelId);
        children.forEach(child => {
            this.preloadLevelContent(child.id);
        });
    }

    /**
     * Предзагрузка связанного контента
     */
    preloadRelatedContent(levelId) {
        // Предзагружаем соседние уровни
        const siblings = this.getSiblingLevels(levelId);
        siblings.forEach(sibling => {
            this.preloadLevelContent(sibling.id);
        });
    }

    /**
     * Получение дочерних уровней для построения навигации
     */
    getChildLevels(parentLevelId) {
        try {
            if (this.app && this.app.contentManager) {
                return this.app.contentManager.getChildLevels(parentLevelId);
            }
            return [];
        } catch (error) {
            console.warn(`⚠️ Ошибка получения дочерних уровней для ${parentLevelId}:`, error);
            return [];
        }
    }

    /**
     * Получение соседних уровней
     */
    getSiblingLevels(levelId) {
        try {
            const levelData = this.getLevelData(levelId);
            if (levelData && levelData.parent) {
                return this.getChildLevels(levelData.parent).filter(child => child.id !== levelId);
            }
            return [];
        } catch (error) {
            console.warn(`⚠️ Ошибка получения соседних уровней для ${levelId}:`, error);
            return [];
        }
    }

    /**
     * Сохранение состояния навигации
     */
    saveState() {
        try {
            const state = {
                currentLevel: this.currentLevel,
                history: this.history,
                historyIndex: this.historyIndex,
                timestamp: Date.now(),
                version: '2.1',
                domain: this.config.isBioapgreid ? 'bioapgreid.ru' : 
                       this.config.isGitHubPages ? 'github.io' : 'local'
            };

            localStorage.setItem(this.config.localStorageKey, JSON.stringify(state));
            
            // Отправка события о сохранении состояния
            document.dispatchEvent(new CustomEvent('navigationStateSaved'));
            
            console.log('💾 Состояние навигации сохранено');
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить состояние навигации:', error);
        }
    }

    /**
     * Загрузка состояния навигации
     */
    loadState() {
        try {
            const saved = localStorage.getItem(this.config.localStorageKey);
            if (!saved) {
                console.log('ℹ️ Сохраненное состояние навигации не найдено');
                return;
            }

            const state = JSON.parse(saved);
            
            // Валидация загруженного состояния
            if (this.validateState(state)) {
                this.currentLevel = state.currentLevel;
                this.history = state.history || [];
                this.historyIndex = state.historyIndex || 0;
                
                console.log('💾 Состояние навигации загружено');
                
                // Если есть текущий уровень, активируем его
                if (this.currentLevel) {
                    setTimeout(() => {
                        this.dispatchLevelChange(this.currentLevel);
                    }, 100);
                }
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить состояние навигации:', error);
            this.clearCorruptedState();
        }
    }

    /**
     * Валидация загруженного состояния
     */
    validateState(state) {
        try {
            if (!state || typeof state !== 'object') return false;
            
            // Проверка обязательных полей
            if (state.currentLevel && !this.validateLevel(state.currentLevel)) return false;
            if (!Array.isArray(state.history)) return false;
            if (typeof state.historyIndex !== 'number') return false;
            if (typeof state.timestamp !== 'number') return false;
            
            // Проверка временной метки (не больше 30 дней)
            const maxAge = 30 * 24 * 60 * 60 * 1000;
            if (Date.now() - state.timestamp > maxAge) return false;
            
            // Проверка корректности индекса истории
            if (state.historyIndex < -1 || state.historyIndex >= state.history.length) return false;
            
            // Проверка версии (опционально)
            if (state.version && state.version !== '2.1') {
                console.warn('⚠️ Версия состояния отличается, требуется миграция');
            }
            
            return true;
        } catch (error) {
            console.warn('❌ Ошибка валидации состояния:', error);
            return false;
        }
    }

    /**
     * Очистка поврежденного состояния
     */
    clearCorruptedState() {
        try {
            localStorage.removeItem(this.config.localStorageKey);
            console.log('🧹 Поврежденное состояние навигации очищено');
        } catch (error) {
            console.error('❌ Не удалось очистить поврежденное состояние:', error);
        }
    }

    /**
     * Настройка автосохранения
     */
    setupAutoSave() {
        // Автосохранение каждые 30 секунд
        this.autoSaveInterval = setInterval(() => {
            if (this.currentLevel) {
                this.saveState();
            }
        }, 30000);
    }

    /**
     * Получение информации о текущем состоянии навигации
     */
    getNavigationInfo() {
        return {
            currentLevel: this.currentLevel,
            currentLevelData: this.currentLevel ? this.getLevelData(this.currentLevel) : null,
            historyDepth: this.history.length,
            currentHistoryIndex: this.historyIndex,
            canGoBack: this.historyIndex > 0,
            canGoForward: this.historyIndex < this.history.length - 1,
            cacheSize: this.levelDataCache.size,
            queueLength: this.navigationQueue.length,
            analyticsEntries: this.analyticsData.length,
            sessionId: this.sessionId,
            config: this.config,
            history: this.history.map(entry => ({
                levelId: entry.levelId,
                title: entry.levelData?.title || entry.levelId,
                timestamp: new Date(entry.timestamp).toLocaleTimeString()
            }))
        };
    }

    /**
     * Получение метрик производительности
     */
    getPerformanceMetrics() {
        const totalNavigations = this.analyticsData.length;
        const successfulNavigations = this.analyticsData.filter(entry => 
            entry.duration < 1000 // навигация быстрее 1 секунды
        ).length;
        
        return {
            totalNavigations,
            successRate: totalNavigations > 0 ? (successfulNavigations / totalNavigations) * 100 : 0,
            averageNavigationTime: totalNavigations > 0 ? 
                this.analyticsData.reduce((sum, entry) => sum + entry.duration, 0) / totalNavigations : 0,
            cacheHitRate: this.levelDataCache.hitRate,
            mostVisitedLevels: this.getMostVisitedLevels(),
            navigationTypes: this.getNavigationTypeDistribution(),
            domain: this.config.isBioapgreid ? 'bioapgreid.ru' : 
                   this.config.isGitHubPages ? 'github.io' : 'local'
        };
    }

    /**
     * Получение самых посещаемых уровней
     */
    getMostVisitedLevels() {
        const levelCounts = {};
        this.analyticsData.forEach(entry => {
            levelCounts[entry.toLevel] = (levelCounts[entry.toLevel] || 0) + 1;
        });
        
        return Object.entries(levelCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([levelId, count]) => ({ levelId, visits: count }));
    }

    /**
     * Распределение по типам навигации
     */
    getNavigationTypeDistribution() {
        const typeCounts = {};
        this.analyticsData.forEach(entry => {
            typeCounts[entry.navigationType] = (typeCounts[entry.navigationType] || 0) + 1;
        });
        
        return typeCounts;
    }

    /**
     * Очистка истории навигации
     */
    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
        this.levelDataCache.clear();
        this.navigationQueue.clear();
        console.log('🧹 История навигации очищена');
        this.dispatchHistoryUpdated();
    }

    /**
     * Отправка кастомного события
     */
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Уничтожение экземпляра (очистка)
     */
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        if (this.predictionTimeout) {
            clearTimeout(this.predictionTimeout);
        }
        
        // Сохраняем состояние перед уничтожением
        this.saveState();
        this.saveAnalyticsData();
        
        // Очищаем кэши
        this.levelDataCache.clear();
        this.navigationQueue.clear();
        this.predictionCache.clear();
        
        console.log('🧹 Навигационная система v2.1 остановлена');
    }
}

// Экспорт класса
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GalaxyNavigation, LevelDataCache, NavigationQueue };
}
