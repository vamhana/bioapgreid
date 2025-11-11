class GalaxyNavigation {
    constructor(app) {
        this.app = app;
        this.currentLevel = null;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistoryDepth = 50;
        this.autoSaveInterval = null;
        this.levelDataCache = new Map();
        this.cacheTimeout = 30000; // 30 секунд
        
        // Инициализация
        this.setupEventListeners();
        this.loadState();
        this.setupAutoSave();
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
                this.switchLevel(entity.level);
            }
        });

        // Обработка команд навигации
        document.addEventListener('goBack', () => this.goBack());
        document.addEventListener('goForward', () => this.goForward());
        document.addEventListener('switchLevel', (event) => {
            this.switchLevel(event.detail.levelId);
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

        console.log('🎯 Навигационная система: обработчики событий установлены');
    }

    /**
     * Переключение на указанный уровень
     */
    async switchLevel(levelId) {
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

        // Добавляем данные уровня в историю
        this.addToHistory(levelId, previousLevel, levelData);

        // Обновление URL в браузере
        this.updateBrowserURL(levelId, levelData);

        // Отправка события с полными данными
        this.dispatchLevelChange(levelId, previousLevel, levelData);

        // Автосохранение
        this.saveState();

        console.log(`🎯 Переключение на уровень: ${levelData.title} (${levelId})`);
        return true;
    }

    /**
     * Получение данных уровня с кэшированием
     */
    getLevelData(levelId) {
        // Проверяем кэш
        const cached = this.levelDataCache.get(levelId);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        
        // Получаем свежие данные
        const levelData = this.fetchLevelData(levelId);
        
        // Сохраняем в кэш
        this.levelDataCache.set(levelId, {
            data: levelData,
            timestamp: Date.now()
        });
        
        return levelData;
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
            url: `pages/${levelId}.html`,
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
            levelData, // Сохраняем данные уровня
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
     * Генерация URL для уровня
     */
    generateLevelURL(levelId, levelData) {
        // Для специализированных шлюзов используем прямой URL
        if (levelData.type === 'planet') {
            return `${window.location.origin}/${levelId}.html`;
        }
        // Для остальных - hash-based навигация
        return `${window.location.origin}/#${levelId}`;
    }

    /**
     * Возврат к предыдущему уровню
     */
    goBack() {
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

        console.log(`↩️ Возврат к уровню: ${targetEntry.levelData.title}`);
        return true;
    }

    /**
     * Переход к следующему уровню в истории
     */
    goForward() {
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

        console.log(`↪️ Переход вперед к уровню: ${targetEntry.levelData.title}`);
        return true;
    }

    /**
     * Обновление URL браузера для deep linking
     */
    updateBrowserURL(levelId, levelData) {
        try {
            let newUrl;
            
            if (levelData.type === 'planet') {
                // Для планет используем прямой URL к специализированному шлюзу
                newUrl = `${window.location.origin}/${levelId}.html`;
            } else {
                // Для остальных - hash-based навигация на главной странице
                newUrl = `${window.location.origin}/#${levelId}`;
            }

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
     * Обработка навигации браузера (кнопки назад/вперед)
     */
    handleBrowserNavigation(event) {
        try {
            // Обрабатываем hash-based навигацию
            const hash = window.location.hash.replace('#', '');
            if (hash && hash !== this.currentLevel) {
                this.switchLevel(hash);
            }
            
            // Обрабатываем прямой доступ к специализированным шлюзам
            const currentPath = window.location.pathname;
            if (currentPath.endsWith('.html') && currentPath !== '/index.html') {
                const levelId = currentPath.split('/').pop().replace('.html', '');
                if (levelId && levelId !== this.currentLevel) {
                    this.switchLevel(levelId);
                }
            }
        } catch (error) {
            console.error('❌ Ошибка обработки навигации браузера:', error);
        }
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
                timestamp: Date.now()
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
     * Сохранение состояния навигации
     */
    saveState() {
        try {
            const state = {
                currentLevel: this.currentLevel,
                history: this.history,
                historyIndex: this.historyIndex,
                timestamp: Date.now()
            };

            localStorage.setItem('genofond-navigation-state', JSON.stringify(state));
            
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
            const saved = localStorage.getItem('genofond-navigation-state');
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
        if (!state || typeof state !== 'object') return false;
        if (state.currentLevel && !this.validateLevel(state.currentLevel)) return false;
        if (state.history && !Array.isArray(state.history)) return false;
        
        return true;
    }

    /**
     * Очистка поврежденного состояния
     */
    clearCorruptedState() {
        try {
            localStorage.removeItem('genofond-navigation-state');
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
            history: this.history.map(entry => ({
                levelId: entry.levelId,
                title: entry.levelData?.title || entry.levelId,
                timestamp: new Date(entry.timestamp).toLocaleTimeString()
            }))
        };
    }

    /**
     * Очистка истории навигации
     */
    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
        this.levelDataCache.clear();
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
        
        // Сохраняем состояние перед уничтожением
        this.saveState();
        
        // Очищаем кэш
        this.levelDataCache.clear();
        
        console.log('🧹 Навигационная система остановлена');
    }
}

// Экспорт класса
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GalaxyNavigation;
}
