class ContentManager {
    constructor(app) {
        this.app = app;
        this.contentCache = new Map();
        this.userProgress = {};
        this.pendingRequests = new Map();
        this.syncQueue = [];
        this.isSyncing = false;

        // Конфигурация
        this.config = {
            cacheSize: 50,
            requestTimeout: 10000,
            autoSaveInterval: 30000,
            syncInterval: 300000, // 5 минут
            retryAttempts: 3,
            preloadDepth: 2
        };

        // Ключи для localStorage
        this.storageKeys = {
            progress: 'genofond-user-progress',
            cache: 'genofond-content-cache',
            lastSync: 'genofond-last-sync'
        };
    }

    async init() {
        console.log('📚 Инициализация ContentManager...');
        
        try {
            // Загрузка данных пользователя
            await this.loadUserProgress();
            
            // Восстановление кэша из localStorage
            await this.restoreCacheFromStorage();
            
            // Настройка периодических задач
            this.setupPeriodicTasks();
            
            // Настройка обработчиков событий
            this.setupEventListeners();
            
            // Предзагрузка критического контента
            await this.preloadCriticalContent();
            
            console.log('✅ ContentManager инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации ContentManager:', error);
            throw error;
        }
    }

    setupEventListeners() {
        document.addEventListener('entityActivated', (event) => {
            this.handleEntityActivated(event.detail.entity);
        });

        document.addEventListener('levelCompleted', (event) => {
            this.handleLevelCompleted(event.detail.levelId, event.detail.score);
        });

        document.addEventListener('saveProgress', () => {
            this.saveUserProgress();
        });

        document.addEventListener('syncProgress', () => {
            this.syncProgress();
        });

        // Обработка онлайн/офлайн статуса
        window.addEventListener('online', () => {
            this.handleOnlineStatus();
        });

        window.addEventListener('offline', () => {
            this.handleOfflineStatus();
        });

        // Автосохранение при закрытии страницы
        window.addEventListener('beforeunload', () => {
            this.saveUserProgress();
        });

        // Обработка запросов данных уровня от навигации
        document.addEventListener('levelDataRequest', (event) => {
            const { levelId, requestId } = event.detail;
            const levelData = this.getLevelData(levelId);
            
            document.dispatchEvent(new CustomEvent('levelDataResponse', {
                detail: { requestId, data: levelData }
            }));
        });
    }

    setupPeriodicTasks() {
        // Автосохранение прогресса
        this.autoSaveInterval = setInterval(() => {
            this.saveUserProgress();
        }, this.config.autoSaveInterval);

        // Синхронизация прогресса
        this.syncInterval = setInterval(() => {
            this.syncProgress();
        }, this.config.syncInterval);
    }

    async loadUserProgress() {
        try {
            const savedProgress = localStorage.getItem(this.storageKeys.progress);
            if (savedProgress) {
                const progressData = JSON.parse(savedProgress);
                
                // Валидация данных прогресса
                if (this.validateProgressData(progressData)) {
                    this.userProgress = progressData;
                    console.log('📊 Загружен прогресс пользователя:', this.userProgress);
                } else {
                    console.warn('⚠️ Данные прогресса повреждены, используется начальное состояние');
                    this.userProgress = this.getInitialProgress();
                }
            } else {
                this.userProgress = this.getInitialProgress();
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки прогресса:', error);
            this.userProgress = this.getInitialProgress();
        }
    }

    validateProgressData(progressData) {
        try {
            // Проверяем checksum для обнаружения повреждений
            if (progressData._checksum) {
                const dataToCheck = { ...progressData };
                delete dataToCheck._checksum;
                const calculatedChecksum = this.calculateChecksum(JSON.stringify(dataToCheck));
                return progressData._checksum === calculatedChecksum;
            }
            return true; // Если checksum нет, принимаем данные
        } catch {
            return false;
        }
    }

    calculateChecksum(data) {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    getInitialProgress() {
        return {
            completedLevels: {},
            scores: {},
            unlockedLevels: ['level0'], // Начальный уровень всегда разблокирован
            totalStudyTime: 0,
            achievements: [],
            lastActive: new Date().toISOString(),
            _checksum: ''
        };
    }

    async restoreCacheFromStorage() {
        try {
            if (!this.supportsLocalStorage()) {
                console.warn('⚠️ localStorage не поддерживается, кэш не восстановлен');
                return;
            }

            const cachedData = localStorage.getItem(this.storageKeys.cache);
            if (cachedData) {
                const cache = JSON.parse(cachedData);
                
                // Восстанавливаем только актуальные записи (не старше 24 часов)
                const now = Date.now();
                const maxAge = 24 * 60 * 60 * 1000; // 24 часа
                
                for (const [key, entry] of Object.entries(cache)) {
                    if (now - entry.timestamp < maxAge) {
                        this.contentCache.set(key, entry);
                    }
                }
                
                console.log(`🔄 Восстановлен кэш: ${this.contentCache.size} записей`);
            }
        } catch (error) {
            console.warn('⚠️ Ошибка восстановления кэша:', error);
            this.contentCache.clear();
        }
    }

    supportsLocalStorage() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    async preloadCriticalContent() {
        // Предзагрузка начального контента и соседних уровней
        const criticalLevels = ['level0']; // Начальный уровень
        
        try {
            await Promise.allSettled(
                criticalLevels.map(levelId => this.loadContent(levelId, true)) // true = предзагрузка
            );
            console.log('🚀 Критический контент предзагружен');
        } catch (error) {
            console.warn('⚠️ Ошибка предзагрузки критического контента:', error);
        }
    }

    async loadContent(levelId, isPreload = false) {
        // Проверяем кэш в памяти
        if (this.contentCache.has(levelId)) {
            const cached = this.contentCache.get(levelId);
            this.updateCacheAccess(levelId);
            
            if (!isPreload) {
                this.dispatchEvent('contentLoaded', {
                    levelId,
                    content: cached.content,
                    fromCache: true
                });
            }
            return cached.content;
        }

        // Проверяем pending requests чтобы избежать дублирующих запросов
        if (this.pendingRequests.has(levelId)) {
            return this.pendingRequests.get(levelId);
        }

        // Создаем новый запрос
        const requestPromise = this.fetchAndProcessContent(levelId, isPreload);
        this.pendingRequests.set(levelId, requestPromise);

        try {
            const content = await requestPromise;
            
            if (!isPreload) {
                this.dispatchEvent('contentLoaded', {
                    levelId,
                    content: content,
                    fromCache: false
                });
            }
            
            return content;
        } finally {
            this.pendingRequests.delete(levelId);
        }
    }

    async fetchAndProcessContent(levelId, isPreload = false) {
        const pageUrl = this.getPageUrl(levelId);
        
        try {
            const htmlContent = await this.fetchWithRetry(pageUrl);
            const processedHTML = await this.generateStructuredHTML(levelId, htmlContent);
            
            // Сохраняем в кэш
            this.addToCache(levelId, processedHTML);
            
            // Предзагрузка связанного контента
            if (!isPreload) {
                this.preloadRelatedContent(levelId);
            }
            
            return processedHTML;
        } catch (error) {
            console.error(`❌ Ошибка загрузки контента для ${levelId}:`, error);
            
            this.dispatchEvent('contentError', {
                levelId,
                error: error.message,
                url: pageUrl
            });
            
            throw error;
        }
    }

    getPageUrl(levelId) {
        // Преобразуем levelId в имя файла
        const levelToPageMap = {
            'level0': 'filosofiya',
            'level1': 'diagnostika',
            'level2': 'regeneraciya',
            'level3': 'optimizaciya',
            'level4': 'kriokonservaciya',
            'level5': 'gennaya-inzheneriya',
            'level6': 'neyrointerfeys',
            'level7': 'singularnost'
        };
        
        const pageName = levelToPageMap[levelId] || levelId;
        return `pages/${pageName}.html`;
    }

    async fetchWithRetry(url, attempt = 1) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

            const response = await fetch(url, { 
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            return this.sanitizeHTML(html);

        } catch (error) {
            if (attempt < this.config.retryAttempts && error.name !== 'AbortError') {
                console.warn(`🔄 Повторная попытка ${attempt}/${this.config.retryAttempts} для ${url}`);
                await this.delay(Math.pow(2, attempt) * 1000); // Экспоненциальная задержка
                return this.fetchWithRetry(url, attempt + 1);
            }
            throw error;
        }
    }

    sanitizeHTML(html) {
        // Базовая sanitization для предотвращения XSS
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Удаляем потенциально опасные теги и атрибуты
        const dangerousTags = ['script', 'iframe', 'object', 'embed'];
        dangerousTags.forEach(tag => {
            const elements = tempDiv.querySelectorAll(tag);
            elements.forEach(el => el.remove());
        });
        
        // Удаляем опасные атрибуты
        const allElements = tempDiv.querySelectorAll('*');
        allElements.forEach(el => {
            const dangerousAttrs = ['onload', 'onerror', 'onclick', 'onmouseover'];
            dangerousAttrs.forEach(attr => {
                el.removeAttribute(attr);
            });
        });
        
        return tempDiv.innerHTML;
    }

    async generateStructuredHTML(levelId, htmlContent) {
        // Создаем структурированный HTML для отображения в галактике
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Извлекаем основной контент (игнорируем head)
        const bodyContent = doc.body.innerHTML;
        
        // Создаем обертку с классом для стилизации
        const structuredHTML = `
            <div class="content-page" data-level="${levelId}">
                <div class="content-wrapper">
                    ${bodyContent}
                </div>
                ${this.generateProgressControls(levelId)}
            </div>
        `;
        
        return structuredHTML;
    }

    generateProgressControls(levelId) {
        const isCompleted = this.userProgress.completedLevels?.[levelId];
        const score = this.userProgress.scores?.[levelId] || 0;
        
        return `
            <div class="progress-controls">
                <div class="progress-status">
                    <span class="status-indicator ${isCompleted ? 'completed' : 'in-progress'}">
                        ${isCompleted ? '✅ Завершено' : '📖 Изучается'}
                    </span>
                    ${score > 0 ? `<span class="score">Оценка: ${score}%</span>` : ''}
                </div>
                <button class="mark-complete-btn" onclick="contentManager.markLevelCompleted('${levelId}')">
                    ${isCompleted ? '🔄 Пересмотреть' : '✅ Отметить как завершенное'}
                </button>
            </div>
        `;
    }

    addToCache(levelId, content) {
        // Применяем стратегию LRU
        if (this.contentCache.size >= this.config.cacheSize) {
            const leastUsed = this.findLeastUsedCacheEntry();
            if (leastUsed) {
                this.contentCache.delete(leastUsed);
            }
        }
        
        this.contentCache.set(levelId, {
            content: content,
            timestamp: Date.now(),
            accessCount: 1
        });
        
        // Сохраняем в localStorage (асинхронно)
        this.persistCacheToStorage();
    }

    findLeastUsedCacheEntry() {
        let leastUsedKey = null;
        let minAccessCount = Infinity;
        let oldestTimestamp = Infinity;
        
        for (const [key, entry] of this.contentCache) {
            if (entry.accessCount < minAccessCount || 
                (entry.accessCount === minAccessCount && entry.timestamp < oldestTimestamp)) {
                leastUsedKey = key;
                minAccessCount = entry.accessCount;
                oldestTimestamp = entry.timestamp;
            }
        }
        
        return leastUsedKey;
    }

    updateCacheAccess(levelId) {
        const entry = this.contentCache.get(levelId);
        if (entry) {
            entry.accessCount++;
            entry.timestamp = Date.now();
        }
    }

    async preloadRelatedContent(levelId) {
        // Предзагрузка контента связанных уровней
        try {
            const childLevels = this.getChildLevels(levelId);
            const preloadPromises = childLevels
                .slice(0, this.config.preloadDepth)
                .map(child => this.loadContent(child.id, true));
            
            await Promise.allSettled(preloadPromises);
        } catch (error) {
            // Предзагрузка не критична, просто логируем ошибку
            console.debug('⚠️ Ошибка предзагрузки связанного контента:', error);
        }
    }

    async updateUserProgress(levelId, progressData) {
        const previousProgress = { ...this.userProgress };
        
        try {
            // Оптимистичное обновление
            this.userProgress = {
                ...this.userProgress,
                ...progressData,
                lastActive: new Date().toISOString()
            };
            
            // Обновляем checksum
            this.updateProgressChecksum();
            
            this.dispatchEvent('progressUpdated', {
                levelId,
                progress: this.userProgress,
                changes: progressData
            });
            
            // Откладываем сохранение
            this.scheduleSave();
            
        } catch (error) {
            // Откат при ошибке
            this.userProgress = previousProgress;
            console.error('❌ Ошибка обновления прогресса:', error);
            throw error;
        }
    }

    updateProgressChecksum() {
        const dataToHash = { ...this.userProgress };
        delete dataToHash._checksum;
        this.userProgress._checksum = this.calculateChecksum(JSON.stringify(dataToHash));
    }

    scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.saveUserProgress();
        }, 2000); // Сохраняем через 2 секунды бездействия
    }

    async saveUserProgress() {
        try {
            if (!this.supportsLocalStorage()) {
                console.warn('⚠️ localStorage не доступен, прогресс не сохранен');
                return;
            }
            
            localStorage.setItem(this.storageKeys.progress, JSON.stringify(this.userProgress));
            console.log('💾 Прогресс пользователя сохранен');
            
        } catch (error) {
            console.error('❌ Ошибка сохранения прогресса:', error);
            
            // Добавляем в очередь для синхронизации при восстановлении соединения
            this.addToSyncQueue('saveProgress', { progress: this.userProgress });
        }
    }

    async unlockLevel(levelId) {
        if (!this.userProgress.unlockedLevels.includes(levelId)) {
            await this.updateUserProgress(levelId, {
                unlockedLevels: [...this.userProgress.unlockedLevels, levelId]
            });
            
            this.dispatchEvent('levelUnlocked', { levelId });
            console.log(`🔓 Уровень разблокирован: ${levelId}`);
        }
    }

    async markLevelCompleted(levelId, score = 100) {
        await this.updateUserProgress(levelId, {
            completedLevels: {
                ...this.userProgress.completedLevels,
                [levelId]: new Date().toISOString()
            },
            scores: {
                ...this.userProgress.scores,
                [levelId]: score
            }
        });
        
        // Автоматически разблокируем связанные уровни
        await this.unlockRelatedLevels(levelId);
    }

    async unlockRelatedLevels(completedLevelId) {
        try {
            const childLevels = this.getChildLevels(completedLevelId);
            
            for (const child of childLevels) {
                await this.unlockLevel(child.id);
            }
        } catch (error) {
            console.warn('⚠️ Ошибка разблокировки связанных уровней:', error);
        }
    }

    async syncProgress() {
        if (this.isSyncing || !navigator.onLine) {
            console.log('⏸️ Синхронизация отложена');
            return;
        }
        
        this.isSyncing = true;
        
        try {
            // Здесь будет интеграция с сервером для синхронизации
            // Пока просто сохраняем локально и обновляем метку времени
            
            localStorage.setItem(this.storageKeys.lastSync, new Date().toISOString());
            
            // Обрабатываем очередь отложенных операций
            await this.processSyncQueue();
            
            this.dispatchEvent('syncCompleted', {
                success: true,
                timestamp: new Date().toISOString()
            });
            
            console.log('🔄 Прогресс синхронизирован');
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error);
            
            this.dispatchEvent('syncCompleted', {
                success: false,
                error: error.message
            });
        } finally {
            this.isSyncing = false;
        }
    }

    addToSyncQueue(operation, data) {
        this.syncQueue.push({
            operation,
            data,
            timestamp: Date.now(),
            attempts: 0
        });
        
        // Ограничиваем размер очереди
        if (this.syncQueue.length > 100) {
            this.syncQueue = this.syncQueue.slice(-100);
        }
    }

    async processSyncQueue() {
        const failedOperations = [];
        
        for (const operation of this.syncQueue) {
            try {
                await this.executeSyncOperation(operation);
            } catch (error) {
                operation.attempts++;
                if (operation.attempts < 3) {
                    failedOperations.push(operation);
                }
            }
        }
        
        this.syncQueue = failedOperations;
    }

    async executeSyncOperation(operation) {
        // Заглушка для будущей реализации синхронизации с сервером
        switch (operation.operation) {
            case 'saveProgress':
                // Реализация сохранения на сервер
                break;
            case 'unlockLevel':
                // Реализация разблокировки на сервере
                break;
        }
        
        await this.delay(100); // Имитация сетевой задержки
    }

    // ===== ИНТЕГРАЦИЯ С GALAXY NAVIGATION =====

    /**
     * Получение полных данных уровня для навигации
     */
    getLevelData(levelId) {
        try {
            const progress = this.getLevelProgress(levelId);
            const meta = this.getLevelMetaData(levelId);
            
            if (!meta) {
                console.warn(`⚠️ Мета-данные для уровня ${levelId} не найдены`);
                return this.getFallbackLevelData(levelId, progress);
            }

            return {
                id: levelId,
                // Мета-данные из Galaxy
                title: meta.title || levelId.replace('level', 'Уровень '),
                description: meta.description || `Описание уровня ${levelId}`,
                type: meta.type || 'planet',
                color: meta.color || '#4ECDC4',
                icon: meta.icon || '🪐',
                parent: meta.parent || '',
                orbitRadius: meta.orbitRadius || 150,
                orbitAngle: meta.orbitAngle || 0,
                importance: meta.importance || 'medium',
                sizeModifier: meta.sizeModifier || '1.0',
                // Данные прогресса
                unlocked: progress.isUnlocked,
                completed: progress.isCompleted,
                score: progress.score,
                completionDate: progress.completionDate,
                // Дополнительные поля для навигации
                url: this.getPageUrl(levelId),
                lastAccessed: this.userProgress.lastActive
            };
        } catch (error) {
            console.error(`❌ Ошибка получения данных уровня ${levelId}:`, error);
            return this.getFallbackLevelData(levelId);
        }
    }

    /**
     * Получение мета-данных уровня через MetaParser
     */
    getLevelMetaData(levelId) {
        try {
            if (this.app && this.app.metaParser) {
                return this.app.metaParser.getEntityByLevelId(levelId);
            }
            
            // Fallback: пытаемся получить из кэша контента
            const cachedContent = this.contentCache.get(levelId);
            if (cachedContent && cachedContent.meta) {
                return cachedContent.meta;
            }
            
            return null;
        } catch (error) {
            console.warn(`⚠️ Ошибка получения мета-данных для ${levelId}:`, error);
            return null;
        }
    }

    /**
     * Резервные данные уровня при недоступности основных
     */
    getFallbackLevelData(levelId, progress = null) {
        const fallbackProgress = progress || this.getLevelProgress(levelId);
        
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
            unlocked: fallbackProgress.isUnlocked,
            completed: fallbackProgress.isCompleted,
            score: fallbackProgress.score,
            completionDate: fallbackProgress.completionDate,
            url: this.getPageUrl(levelId),
            lastAccessed: new Date().toISOString()
        };
    }

    /**
     * Получение данных всех уровней для построения навигации
     */
    getAllLevelsData() {
        try {
            const levels = {};
            
            // Получаем все известные уровни из маппинга
            const levelIds = Object.keys(this.getLevelToPageMap());
            
            for (const levelId of levelIds) {
                levels[levelId] = this.getLevelData(levelId);
            }
            
            return levels;
        } catch (error) {
            console.error('❌ Ошибка получения данных всех уровней:', error);
            return {};
        }
    }

    /**
     * Карта соответствия levelId -> имя файла
     */
    getLevelToPageMap() {
        return {
            'level0': 'filosofiya',
            'level1': 'diagnostika',
            'level2': 'regeneraciya',
            'level3': 'optimizaciya',
            'level4': 'kriokonservaciya',
            'level5': 'gennaya-inzheneriya',
            'level6': 'neyrointerfeys',
            'level7': 'singularnost'
        };
    }

    /**
     * Получение дочерних уровней для указанного родителя
     */
    getChildLevels(parentLevelId) {
        try {
            const allLevels = this.getAllLevelsData();
            const children = [];
            
            for (const [levelId, levelData] of Object.entries(allLevels)) {
                if (levelData.parent === parentLevelId) {
                    children.push(levelData);
                }
            }
            
            return children.sort((a, b) => a.orbitAngle - b.orbitAngle);
        } catch (error) {
            console.warn(`⚠️ Ошибка получения дочерних уровней для ${parentLevelId}:`, error);
            return [];
        }
    }

    /**
     * Проверка доступности уровня для навигации
     */
    isLevelAccessible(levelId) {
        try {
            const levelData = this.getLevelData(levelId);
            return levelData && levelData.unlocked;
        } catch (error) {
            console.warn(`⚠️ Ошибка проверки доступности уровня ${levelId}:`, error);
            return false;
        }
    }

    /**
     * Получение рекомендуемых уровней для изучения
     */
    getRecommendedLevels(limit = 3) {
        try {
            const allLevels = this.getAllLevelsData();
            const recommendations = [];
            
            for (const [levelId, levelData] of Object.entries(allLevels)) {
                // Предлагаем незавершенные, но разблокированные уровни
                if (levelData.unlocked && !levelData.completed) {
                    recommendations.push(levelData);
                }
            }
            
            // Сортируем по важности и прогрессу
            return recommendations
                .sort((a, b) => {
                    const importanceOrder = { high: 0, medium: 1, low: 2 };
                    return importanceOrder[a.importance] - importanceOrder[b.importance] || 
                           (b.score || 0) - (a.score || 0);
                })
                .slice(0, limit);
        } catch (error) {
            console.warn('⚠️ Ошибка получения рекомендуемых уровней:', error);
            return [];
        }
    }

    // ===== ОСНОВНЫЕ ОБРАБОТЧИКИ =====

    handleEntityActivated(entity) {
        if (entity) {
            this.loadContent(entity.levelId);
        }
    }

    handleLevelCompleted(levelId, score) {
        this.markLevelCompleted(levelId, score);
    }

    handleOnlineStatus() {
        console.log('🌐 Восстановлено соединение, запуск синхронизации...');
        this.syncProgress();
    }

    handleOfflineStatus() {
        console.log('📴 Потеряно соединение, переход в автономный режим');
    }

    // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====

    async persistCacheToStorage() {
        try {
            if (!this.supportsLocalStorage()) return;
            
            const cacheObject = {};
            for (const [key, value] of this.contentCache) {
                cacheObject[key] = value;
            }
            
            localStorage.setItem(this.storageKeys.cache, JSON.stringify(cacheObject));
        } catch (error) {
            console.warn('⚠️ Ошибка сохранения кэша:', error);
        }
    }

    getProgress() {
        return { ...this.userProgress };
    }

    getLevelProgress(levelId) {
        return {
            isCompleted: !!this.userProgress.completedLevels?.[levelId],
            isUnlocked: this.userProgress.unlockedLevels.includes(levelId),
            score: this.userProgress.scores?.[levelId] || 0,
            completionDate: this.userProgress.completedLevels?.[levelId]
        };
    }

    clearCache() {
        this.contentCache.clear();
        this.pendingRequests.clear();
        
        try {
            localStorage.removeItem(this.storageKeys.cache);
            console.log('🧹 Кэш контента очищен');
        } catch (error) {
            console.warn('⚠️ Ошибка очистки кэша:', error);
        }
    }

    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ===== PUBLIC API =====

    async start() {
        console.log('📚 ContentManager запущен');
        return Promise.resolve();
    }

    async recover() {
        this.clearCache();
        await this.loadUserProgress();
        console.log('🔄 ContentManager восстановлен');
        return true;
    }

    // ===== ОЧИСТКА РЕСУРСОВ =====

    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveUserProgress(); // Финальное сохранение
        this.contentCache.clear();
        this.pendingRequests.clear();
    }
}

// Глобальная доступность для инициализации
window.ContentManager = ContentManager;
