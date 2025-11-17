// modules/app/core/app.js
import { GalaxyDataLoader } from './galaxy-data-loader.js';
import { GalaxyRenderer } from './galaxy-renderer.js';
import { ProgressionTracker } from '../interaction/progression-tracker.js';
import { CameraController } from './camera-controller.js';

export class GalaxyApp {
    constructor() {
        this.dataLoader = new GalaxyDataLoader();
        this.renderer = new GalaxyRenderer('galaxy-canvas');
        this.camera = new CameraController();
        this.progression = new ProgressionTracker();
        this.isInitialized = false;
        this.galaxyData = null;
        
        // Диагностические данные
        this.diagnostics = {
            platform: this.detectPlatform(),
            userAgent: navigator.userAgent,
            supportsES6: 'noModule' in HTMLScriptElement.prototype,
            isOnline: navigator.onLine,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            pixelRatio: window.devicePixelRatio,
            touchSupport: 'ontouchstart' in window,
            memory: navigator.deviceMemory || 'unknown'
        };
        
        console.log('📱 GalaxyApp создан с диагностикой:', this.diagnostics);
    }

    async init() {
        console.log('🚀 Инициализация Galaxy Explorer...');
        console.log('📱 Платформа:', this.diagnostics.platform);
        console.log('🖥️  Размер экрана:', this.diagnostics.screenSize);
        console.log('🔧 Поддержка ES6:', this.diagnostics.supportsES6);
        console.log('🌐 Онлайн статус:', this.diagnostics.isOnline);
        
        const loadingElement = document.getElementById('loading');
        
        try {
            // Обновляем статус загрузки
            if (loadingElement) {
                loadingElement.innerHTML = `
                    <div class="loading-spinner"></div>
                    <div>Загрузка галактики...</div>
                    <div style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
                        Платформа: ${this.diagnostics.platform}<br>
                        Экран: ${this.diagnostics.screenSize}
                    </div>
                `;
            }

            // Проверяем поддержку ES6 модулей
            if (!this.diagnostics.supportsES6) {
                throw new Error('Ваш браузер не поддерживает ES6 модули. Пожалуйста, обновите браузер.');
            }

            // Проверяем онлайн статус
            if (!this.diagnostics.isOnline) {
                console.warn('⚠️ Приложение запускается в оффлайн режиме');
            }

            // Загружаем данные галактики
            this.updateLoadingStatus('Загрузка данных галактики...');
            this.galaxyData = await this.dataLoader.load();
            
            if (!this.galaxyData) {
                throw new Error('Не удалось загрузить данные галактики. Проверьте подключение к интернету.');
            }

            console.log('✅ Данные галактики загружены:', this.galaxyData);

            // Инициализируем рендерер
            this.updateLoadingStatus('Инициализация графики...');
            await this.renderer.init();
            
            // Инициализируем камеру
            this.camera.init(this.renderer.canvas);
            
            // Загружаем прогресс пользователя
            this.updateLoadingStatus('Загрузка прогресса...');
            await this.progression.init(this.galaxyData);
            
            // Настраиваем взаимодействия
            this.setupEventListeners();
            
            // Запускаем рендеринг
            this.updateLoadingStatus('Запуск визуализации...');
            this.startRendering();
            
            // Обновляем интерфейс
            this.updateProgressDisplay();
            this.updateUI();

            this.isInitialized = true;
            
            console.log('✅ Galaxy Explorer успешно инициализирован');
            this.hideLoadingScreen();

            // Запускаем анимацию входа
            this.animateEntrance();

        } catch (error) {
            console.error('❌ Ошибка инициализации приложения:', error);
            this.showError(error);
        }
    }

    updateLoadingStatus(message) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            const statusElement = loadingElement.querySelector('div:nth-child(2)');
            if (statusElement) {
                statusElement.textContent = message;
            }
        }
        console.log('📦 ' + message);
    }

    setupEventListeners() {
        // Обработчики resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Обработчики касаний для мобильных устройств
        if (this.diagnostics.touchSupport) {
            this.setupTouchEvents();
        }

        // Обработчики клавиатуры
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });

        console.log('🎮 Обработчики событий установлены');
    }

    setupTouchEvents() {
        const canvas = this.renderer.canvas;
        let touchStartX = 0;
        let touchStartY = 0;
        let lastTouchDistance = 0;

        canvas.addEventListener('touchstart', (event) => {
            event.preventDefault();
            const touch = event.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            
            // Обработка мультитач для зума
            if (event.touches.length === 2) {
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                lastTouchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
            }
        });

        canvas.addEventListener('touchmove', (event) => {
            event.preventDefault();
            
            if (event.touches.length === 1) {
                // Панорамирование
                const touch = event.touches[0];
                const deltaX = touch.clientX - touchStartX;
                const deltaY = touch.clientY - touchStartY;
                
                this.camera.pan(deltaX * 0.5, deltaY * 0.5);
                
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
            } else if (event.touches.length === 2) {
                // Зум
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                
                const zoomDelta = (currentDistance - lastTouchDistance) * 0.01;
                this.camera.zoom(zoomDelta);
                
                lastTouchDistance = currentDistance;
            }
        });

        canvas.addEventListener('touchend', (event) => {
            // Обработка тапа
            if (event.touches.length === 0) {
                // Можно добавить обработку клика по объектам
            }
        });

        console.log('👆 Обработчики касаний настроены для мобильных устройств');
    }

    handleKeyDown(event) {
        switch (event.key) {
            case '+':
            case '=':
                this.camera.zoom(0.1);
                break;
            case '-':
                this.camera.zoom(-0.1);
                break;
            case '0':
                this.resetZoom();
                break;
            case 'r':
            case 'к': // Русская Р
                this.resetZoom();
                break;
            case 'o':
            case 'щ': // Русская О
                this.toggleOrbits();
                break;
        }
    }

    handleResize() {
        this.diagnostics.screenSize = `${window.innerWidth}x${window.innerHeight}`;
        console.log('🔄 Изменение размера экрана:', this.diagnostics.screenSize);
        
        this.renderer.resize();
        this.camera.handleResize();
        
        // Перерисовываем сцену
        if (this.isInitialized) {
            this.renderer.render(this.galaxyData, this.camera);
        }
    }

    startRendering() {
        const renderLoop = () => {
            if (this.isInitialized) {
                this.renderer.render(this.galaxyData, this.camera);
            }
            requestAnimationFrame(renderLoop);
        };
        
        renderLoop();
        console.log('🎬 Цикл рендеринга запущен');
    }

    animateEntrance() {
        // Анимация плавного появления
        this.camera.setInitialView();
        
        // Показываем приветственное сообщение
        this.showWelcomeMessage();
    }

    showWelcomeMessage() {
        const welcomeMessage = document.createElement('div');
        welcomeMessage.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(12, 12, 46, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(78, 205, 196, 0.3);
            border-radius: 15px;
            padding: 20px;
            color: white;
            text-align: center;
            z-index: 1001;
            max-width: 300px;
            animation: fadeInOut 3s ease-in-out;
        `;
        
        welcomeMessage.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #4ECDC4;">🌌 Добро пожаловать!</h3>
            <p style="margin: 0; font-size: 14px;">Исследуйте галактику ${this.galaxyData.name}</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.7;">
                Используйте колесо мыши для зума<br>
                ${this.diagnostics.touchSupport ? 'Или касания для навигации' : 'Или клавиши +/-'}
            </p>
        `;
        
        document.body.appendChild(welcomeMessage);
        
        // Удаляем сообщение через 3 секунды
        setTimeout(() => {
            if (welcomeMessage.parentNode) {
                welcomeMessage.parentNode.removeChild(welcomeMessage);
            }
        }, 3000);
        
        // Добавляем стили для анимации
        if (!document.querySelector('#welcome-styles')) {
            const style = document.createElement('style');
            style.id = 'welcome-styles';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    hideLoadingScreen() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            loadingElement.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                loadingElement.style.display = 'none';
            }, 500);
        }
    }

    detectPlatform() {
        const ua = navigator.userAgent;
        if (/Android/.test(ua)) return 'Android';
        if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
        if (/Windows/.test(ua)) return 'Windows';
        if (/Mac/.test(ua)) return 'Mac';
        if (/Linux/.test(ua)) return 'Linux';
        if (/CrOS/.test(ua)) return 'Chrome OS';
        return 'Unknown';
    }

    showError(error) {
        console.error('🚨 Критическая ошибка:', error);
        
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div style="color: #ff6b6b; font-size: 24px; margin-bottom: 15px;">❌ Ошибка загрузки</div>
                <div style="margin: 10px 0; font-size: 16px; background: rgba(255,107,107,0.1); padding: 10px; border-radius: 5px;">
                    ${error.message}
                </div>
                <div style="font-size: 12px; opacity: 0.7; margin: 10px 0;">
                    <strong>Диагностика:</strong><br>
                    Платформа: ${this.diagnostics.platform}<br>
                    Онлайн: ${this.diagnostics.isOnline ? '✅' : '❌'}<br>
                    ES6 модули: ${this.diagnostics.supportsES6 ? '✅' : '❌'}<br>
                    Касания: ${this.diagnostics.touchSupport ? '✅' : '❌'}
                </div>
                <button class="retry-btn" onclick="window.location.reload()" style="
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 20px;
                    cursor: pointer;
                    margin-top: 15px;
                    font-weight: bold;
                ">🔄 Перезагрузить</button>
                <div style="margin-top: 15px; font-size: 12px; opacity: 0.7;">
                    Если проблема повторяется, откройте<br>
                    <a href="/module-test.html" style="color: #4ECDC4;">тестовую страницу</a> для диагностики
                </div>
            `;
        }
        
        // Отправляем ошибку в консоль для отладки
        if (window.console && console.error) {
            console.error('GalaxyApp Error:', error);
            console.error('Diagnostics:', this.diagnostics);
        }
    }

    // Public API methods
    resetZoom() {
        if (this.isInitialized) {
            this.camera.reset();
            console.log('🗺️ Камера сброшена к обзору');
        }
    }

    toggleOrbits() {
        if (this.isInitialized) {
            this.renderer.toggleOrbitDisplay();
            console.log('🔄 Отображение орбит переключено');
        }
    }

    updateProgressDisplay() {
        const progressCount = document.getElementById('progress-count');
        if (progressCount) {
            progressCount.textContent = this.progression.getDiscoveredCount();
        }
    }

    updateUI() {
        // Обновляем информацию о платформе в UI
        const platformInfo = document.createElement('div');
        platformInfo.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(12, 12, 46, 0.7);
            backdrop-filter: blur(5px);
            border: 1px solid rgba(78, 205, 196, 0.3);
            border-radius: 10px;
            padding: 5px 10px;
            color: #4ECDC4;
            font-size: 10px;
            z-index: 999;
        `;
        platformInfo.textContent = `${this.diagnostics.platform} | ${this.diagnostics.screenSize}`;
        platformInfo.title = `User Agent: ${this.diagnostics.userAgent}`;
        
        document.body.appendChild(platformInfo);
    }

    // Методы для отладки
    getDiagnostics() {
        return this.diagnostics;
    }

    getGalaxyData() {
        return this.galaxyData;
    }

    forceRedraw() {
        if (this.isInitialized) {
            this.renderer.render(this.galaxyData, this.camera);
            console.log('🔄 Принудительная перерисовка');
        }
    }
}

// Глобальные обработчики ошибок для лучшей отладки
window.addEventListener('error', (event) => {
    console.error('🚨 Global Error:', event.error);
    console.error('Error details:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
});

// Экспортируем класс для использования в других модулях
export default GalaxyApp;
