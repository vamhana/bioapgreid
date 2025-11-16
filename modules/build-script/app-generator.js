// modules/build-script/app-generator.js
export function createMainApp(publicDir, sitemap) {
    const appHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌌 Galaxy Explorer - BioApGreid</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0c0c2e; 
            color: white;
            overflow: hidden;
        }
        #app-container {
            width: 100vw;
            height: 100vh;
            position: relative;
        }
        #cosmos-scene {
            width: 100%;
            height: 100%;
        }
        #hud-panel {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            padding: 15px 30px;
            border-radius: 25px;
            border: 1px solid #4ECDC4;
            display: flex;
            gap: 20px;
            z-index: 100;
        }
        .hud-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .progress-bar {
            width: 200px;
            height: 8px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4ECDC4, #FFD700);
            transition: width 0.3s ease;
        }
        .loading-screen {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: #0c0c2e;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(78, 205, 196, 0.3);
            border-top: 3px solid #4ECDC4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="app-container">
        <div class="loading-screen" id="loading-screen">
            <div class="loading-spinner"></div>
            <h2>Загрузка космоса...</h2>
            <p>Инициализация Galaxy Explorer</p>
        </div>
        <canvas id="cosmos-scene"></canvas>
        <div id="hud-panel">
            <div class="hud-item">
                <span>🌌 Исследовано:</span>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
                </div>
                <span id="progress-text">0%</span>
            </div>
            <div class="hud-item" id="entity-count">
                <span>🪐 Объектов:</span>
                <span id="total-entities">0</span>
            </div>
        </div>
    </div>

    <script type="module">
        import { GalaxyExplorer } from '/modules/cosmos-renderer/main.js';
        
        // Загружаем sitemap и запускаем приложение
        async function initApp() {
            try {
                const response = await fetch('/results/sitemap.json');
                const sitemap = await response.json();
                
                // Скрываем загрузочный экран
                document.getElementById('loading-screen').style.display = 'none';
                
                // Запускаем основное приложение
                const app = new GalaxyExplorer(sitemap);
                await app.init();
                
            } catch (error) {
                console.error('Ошибка загрузки приложения:', error);
                document.getElementById('loading-screen').innerHTML = 
                    '<h2>❌ Ошибка загрузки</h2><p>Обновите страницу</p>';
            }
        }
        
        initApp();
    </script>
</body>
</html>`;
    
    const indexPath = path.join(publicDir, 'index.html');
    fs.writeFileSync(indexPath, appHtml);
    console.log('✅ Создано главное приложение');
}
