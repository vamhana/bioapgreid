export function generateAppHTML(scanResult) {
    const totalEntities = Object.values(scanResult.stats.entities).reduce((a, b) => a + b, 0);
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌌 Galaxy Explorer - ${scanResult.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0c0c2e;
            color: #e0e0ff;
            overflow: hidden;
            height: 100vh;
        }
        
        #galaxy-canvas {
            width: 100vw;
            height: 100vh;
            display: block;
            background: 
                radial-gradient(circle at 20% 30%, rgba(78, 205, 196, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(199, 244, 100, 0.1) 0%, transparent 50%),
                linear-gradient(135deg, #0c0c2e 0%, #1a1a4a 100%);
        }
        
        #user-panel {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(12, 12, 46, 0.9);
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(78, 205, 196, 0.3);
            padding: 15px 20px;
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        #progress {
            font-size: 14px;
            color: #4ECDC4;
        }
        
        #controls {
            display: flex;
            gap: 10px;
        }
        
        .control-btn {
            background: rgba(78, 205, 196, 0.2);
            border: 1px solid #4ECDC4;
            color: #4ECDC4;
            padding: 8px 15px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
        }
        
        .control-btn:hover {
            background: #4ECDC4;
            color: #0c0c2e;
        }
        
        .loading {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 2000;
            background: rgba(12, 12, 46, 0.9);
            padding: 30px;
            border-radius: 15px;
            border: 1px solid rgba(78, 205, 196, 0.3);
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(78, 205, 196, 0.3);
            border-top: 3px solid #4ECDC4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error-message {
            color: #ff6b6b;
            text-align: center;
            margin-top: 20px;
        }

        .retry-btn {
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 20px;
            cursor: pointer;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div id="loading" class="loading">
        <div class="loading-spinner"></div>
        <div>Загрузка галактики ${scanResult.name}...</div>
        <div style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
            Сущностей: ${totalEntities} | Время сканирования: ${scanResult.scanDuration}ms
        </div>
    </div>
    
    <canvas id="galaxy-canvas"></canvas>
    
    <div id="user-panel">
        <div id="progress">
            🌌 Исследовано: <span id="progress-count">0</span>/
            <span id="total-entities">${totalEntities}</span>
        </div>
        <div id="controls">
            <button class="control-btn" onclick="app.resetZoom()">🗺️ Обзор</button>
            <button class="control-btn" onclick="app.toggleOrbits()">🔄 Орбиты</button>
            <button class="control-btn" onclick="window.open('/galaxy-structure.html', '_blank')">
                📊 Структура
            </button>
            <button class="control-btn" onclick="window.open('/module-test.html', '_blank')">
                🧪 Тест
            </button>
        </div>
    </div>

    <script type="module">
        import { GalaxyApp } from '/app/core/app.js';
        
        // Глобальная переменная для отладки
        window.app = new GalaxyApp();
        
        document.addEventListener('DOMContentLoaded', async () => {
            const loadingElement = document.getElementById('loading');
            
            try {
                console.log('🚀 Запуск Galaxy Explorer...');
                await window.app.init();
                loadingElement.style.display = 'none';
                console.log('✅ Galaxy Explorer успешно запущен');
            } catch (error) {
                console.error('❌ Ошибка инициализации приложения:', error);
                loadingElement.innerHTML = 
                    '<div style="color: #ff6b6b;">❌ Ошибка загрузки приложения</div>' +
                    '<div class="error-message">' + error.message + '</div>' +
                    '<button class="retry-btn" onclick="window.location.reload()">🔄 Перезагрузить</button>' +
                    '<div style="margin-top: 15px; font-size: 12px; opacity: 0.7;">' +
                    'Попробуйте открыть <a href="/module-test.html" style="color: #4ECDC4;">тестовую страницу</a> для диагностики' +
                    '</div>';
            }
        });

        // Обработчики ошибок для лучшей отладки
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });
    </script>
</body>
</html>`;
}
