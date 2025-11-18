// Автономный app.js - все зависимости включены в файл
export class GalaxyApp {
    constructor() {
        // Создаем упрощенные версии всех компонентов
        this.dataLoader = new GalaxyDataLoader();
        this.renderer = new GalaxyRenderer('galaxy-canvas');
        this.camera = new CameraController();
        this.progression = new ProgressionTracker();
        this.entityInteraction = new EntityInteraction();
        this.userPanel = new UserPanel();
        this.minimap = new MinimapNavigation();
        this.assetManager = new AssetManager();
        this.performanceOptimizer = new PerformanceOptimizer();
        
        this.isInitialized = false;
        this.galaxyData = null;
        this.animationFrameId = null;
        
        // Диагностические данные
        this.diagnostics = {
            platform: this.detectPlatform(),
            userAgent: navigator.userAgent,
            supportsES6: 'noModule' in HTMLScriptElement.prototype,
            isOnline: navigator.onLine,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            pixelRatio: window.devicePixelRatio,
            touchSupport: 'ontouchstart' in window,
            memory: navigator.deviceMemory || 'unknown',
            webGL: this.detectWebGLSupport(),
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled
        };
        
        console.log('📱 GalaxyApp создан с диагностикой:', this.diagnostics);
    }

    async init() {
        console.log('🚀 Инициализация Galaxy Explorer...');
        
        const loadingElement = document.getElementById('loading');
        
        try {
            // Обновляем статус загрузки
            if (loadingElement) {
                loadingElement.innerHTML = `
                    <div class="loading-spinner"></div>
                    <div>Загрузка галактики...</div>
                    <div style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
                        Платформа: ${this.diagnostics.platform}<br>
                        Экран: ${this.diagnostics.screenSize}<br>
                        WebGL: ${this.diagnostics.webGL ? '✅' : '❌'}
                    </div>
                `;
            }

            // Загружаем данные галактики
            this.updateLoadingStatus('Загрузка данных галактики...');
            this.galaxyData = await this.dataLoader.load();
            
            if (!this.galaxyData) {
                // Создаем тестовые данные если загрузка не удалась
                this.galaxyData = this.createTestData();
                console.warn('⚠️ Используются тестовые данные');
            }

            console.log('✅ Данные галактики загружены');

            // Инициализируем компоненты
            this.updateLoadingStatus('Инициализация графики...');
            await this.renderer.init();
            
            this.camera.init(this.renderer.canvas);
            
            this.updateLoadingStatus('Загрузка прогресса...');
            await this.progression.init(this.galaxyData);
            
            this.updateLoadingStatus('Настройка взаимодействий...');
            this.entityInteraction.init(this.renderer, this.progression, this.camera);
            
            this.updateLoadingStatus('Инициализация интерфейса...');
            this.userPanel.init(this.progression);
            this.minimap.init(this.galaxyData, this.camera);
            
            // Настраиваем обработчики событий
            this.setupEventListeners();
            
            // Запускаем рендеринг
            this.updateLoadingStatus('Запуск визуализации...');
            this.startRendering();
            
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

    // Упрощенные версии методов (остальные методы из вашего файла остаются без изменений)
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
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        if (this.diagnostics.touchSupport) {
            this.setupTouchEvents();
        }

        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });

        if (this.renderer && this.renderer.canvas) {
            this.renderer.canvas.addEventListener('wheel', (event) => {
                this.handleWheel(event);
            }, { passive: false });
        }

        console.log('🎮 Обработчики событий установлены');
    }

    startRendering() {
        if (this.animationFrameId) {
            this.stopRendering();
        }

        const renderLoop = (timestamp) => {
            if (this.isInitialized) {
                this.performanceOptimizer.update();
                this.renderer.render(this.galaxyData, this.camera);
                
                if (!this.performanceOptimizer.shouldThrottle()) {
                    this.animationFrameId = requestAnimationFrame(renderLoop);
                } else {
                    setTimeout(() => {
                        this.animationFrameId = requestAnimationFrame(renderLoop);
                    }, 1000 / 30);
                }
            }
        };
        
        this.animationFrameId = requestAnimationFrame(renderLoop);
        console.log('🎬 Цикл рендеринга запущен');
    }

    stopRendering() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            console.log('⏸️  Цикл рендеринга остановлен');
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

    showError(error) {
        console.error('🚨 Критическая ошибка:', error);
        
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div style="color: #ff6b6b; font-size: 24px; margin-bottom: 15px;">❌ Ошибка загрузки</div>
                <div style="margin: 10px 0; font-size: 16px; background: rgba(255,107,107,0.1); padding: 10px; border-radius: 5px;">
                    ${error.message}
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
            `;
        }
    }

    // Создание тестовых данных
    createTestData() {
        return {
            name: "Тестовая Галактика",
            entities: [
                {
                    id: "sun",
                    name: "Солнце",
                    type: "star",
                    position: { x: 0, y: 0 },
                    size: 50,
                    color: "#ffd700"
                },
                {
                    id: "earth",
                    name: "Земля", 
                    type: "planet",
                    position: { x: 200, y: 0 },
                    size: 20,
                    color: "#4a90e2"
                },
                {
                    id: "moon",
                    name: "Луна",
                    type: "moon", 
                    position: { x: 230, y: 0 },
                    size: 8,
                    color: "#cccccc"
                }
            ]
        };
    }

    // Методы детекции платформы (остаются без изменений)
    detectPlatform() {
        const ua = navigator.userAgent;
        if (/Android/.test(ua)) return 'Android';
        if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
        if (/Windows/.test(ua)) return 'Windows';
        if (/Mac/.test(ua)) return 'Mac';
        if (/Linux/.test(ua)) return 'Linux';
        return 'Unknown';
    }

    detectWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    // Остальные методы (handleResize, handleKeyDown, и т.д.) остаются без изменений
    // ... (вставьте сюда остальные методы из вашего исходного файла)
}

// Упрощенные классы-заглушки для всех зависимостей
class GalaxyDataLoader {
    constructor() {
        console.log('📡 GalaxyDataLoader создан');
    }
    async load() {
        // Пытаемся загрузить данные, если нет - возвращаем null
        try {
            const response = await fetch('/results/sitemap.json');
            return await response.json();
        } catch (error) {
            console.warn('Не удалось загрузить sitemap.json:', error);
            return null;
        }
    }
}

class GalaxyRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas?.getContext('2d');
        console.log('🎨 GalaxyRenderer создан');
    }
    async init() {
        if (this.canvas) {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
        }
    }
    render(data, camera) {
        if (!this.ctx || !data) return;
        
        // Очищаем canvas
        this.ctx.fillStyle = '#0c0c2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем простые круги для теста
        if (data.entities) {
            data.entities.forEach(entity => {
                this.ctx.beginPath();
                this.ctx.arc(
                    this.canvas.width / 2 + entity.position.x,
                    this.canvas.height / 2 + entity.position.y,
                    entity.size,
                    0,
                    2 * Math.PI
                );
                this.ctx.fillStyle = entity.color;
                this.ctx.fill();
                
                // Подпись
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(
                    entity.name,
                    this.canvas.width / 2 + entity.position.x - 20,
                    this.canvas.height / 2 + entity.position.y - entity.size - 5
                );
            });
        }
    }
}

class CameraController {
    constructor() {
        console.log('📷 CameraController создан');
    }
    init(canvas) {
        this.canvas = canvas;
    }
    zoom() {}
    pan() {}
    reset() {}
    handleResize() {}
}

class ProgressionTracker {
    constructor() {
        console.log('📊 ProgressionTracker создан');
    }
    async init() {}
    getDiscoveredCount() { return 0; }
}

class EntityInteraction {
    constructor() {
        console.log('🖱️ EntityInteraction создан');
    }
    init() {}
}

class UserPanel {
    constructor() {
        console.log('👤 UserPanel создан');
    }
    init() {}
}

class MinimapNavigation {
    constructor() {
        console.log('🗺️ MinimapNavigation создан');
    }
    init() {}
}

class AssetManager {
    constructor() {
        console.log('📦 AssetManager создан');
    }
}

class PerformanceOptimizer {
    constructor() {
        this.metrics = { fps: 60 };
        console.log('⚡ PerformanceOptimizer создан');
    }
    update() { return this.metrics; }
    shouldThrottle() { return false; }
}

// Глобальная функция инициализации
window.initGalaxyExplorer = function(canvasId = 'galaxy-canvas') {
    console.log('🚀 Инициализация Galaxy Explorer...');
    
    return new Promise(async (resolve, reject) => {
        try {
            const app = new GalaxyApp();
            window.galaxyApp = app;
            await app.init();
            console.log('🌌 Galaxy Explorer успешно запущен!');
            resolve(app);
        } catch (error) {
            console.error('❌ Ошибка инициализации Galaxy Explorer:', error);
            reject(error);
        }
    });
};

// Авто-инициализация при загрузке
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📝 Galaxy Explorer: DOM готов');
        if (document.getElementById('galaxy-canvas')) {
            setTimeout(() => {
                console.log('🎯 Автозапуск Galaxy Explorer...');
                window.initGalaxyExplorer().catch(console.error);
            }, 1000);
        }
    });
}

console.log('✅ Galaxy Explorer загружен!');
