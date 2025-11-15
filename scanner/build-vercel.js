import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import GalaxyScanner from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildForVercel() {
    console.log('🚀 Building Galaxy Scanner for Vercel...');
    
    // Сканируем только папку "галактика"
    const galaxyPath = 'галактика';
    
    // Проверяем существование папки
    if (!fs.existsSync(galaxyPath)) {
        console.log('⚠️ Папка "галактика" не найдена, создаем пустую...');
        fs.mkdirSync(galaxyPath, { recursive: true });
        
        // Создаем пример структуры для демонстрации
        const exampleStructure = `
галактика/
├── земля/
│   ├── луна/
│   │   └── index.html
│   └── index.html
├── марс/
│   └── фобос/
│       └── index.html
└── index.html
        `;
        
        // Создаем демо файлы
        fs.mkdirSync(path.join(galaxyPath, 'земля'), { recursive: true });
        fs.mkdirSync(path.join(galaxyPath, 'земля', 'луна'), { recursive: true });
        fs.mkdirSync(path.join(galaxyPath, 'марс'), { recursive: true });
        fs.mkdirSync(path.join(galaxyPath, 'марс', 'фобос'), { recursive: true });
        
        // Создаем HTML файлы с конфигурацией
        const galaxyHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Галактика Млечный Путь</title>
    <script type="application/galaxy+json">
    {
        "title": "Млечный Путь",
        "description": "Наша домашняя галактика",
        "stars": 100000000000,
        "type": "спиральная"
    }
    </script>
</head>
<body>
    <h1>Галактика Млечный Путь</h1>
</body>
</html>
        `;
        
        fs.writeFileSync(path.join(galaxyPath, 'index.html'), galaxyHTML);
        fs.writeFileSync(path.join(galaxyPath, 'земля', 'index.html'), '<html><title>Планета Земля</title></html>');
        fs.writeFileSync(path.join(galaxyPath, 'земля', 'луна', 'index.html'), '<html><title>Луна</title></html>');
        fs.writeFileSync(path.join(galaxyPath, 'марс', 'index.html'), '<html><title>Планета Марс</title></html>');
        fs.writeFileSync(path.join(galaxyPath, 'марс', 'фобос', 'index.html'), '<html><title>Фобос</title></html>');
        
        console.log('✅ Создана демо-структура галактики');
    }
    
    try {
        const scanner = new GalaxyScanner(galaxyPath);
        const result = await scanner.scan();
        
        // Создаем публичную папку
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        
        // Создаем папку для результатов
        const resultsDir = path.join(publicDir, 'results');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        
        // Сохраняем основной файл
        const outputPath = path.join(resultsDir, `scan-${result.name}-latest.json`);
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        
        // Создаем версию с временной меткой
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const timestampedPath = path.join(resultsDir, `scan-${result.name}-${timestamp}.json`);
        fs.writeFileSync(timestampedPath, JSON.stringify(result, null, 2));
        
        // Создаем индексную страницу
        const indexPath = path.join(publicDir, 'index.html');
        const html = generateHTML(result);
        fs.writeFileSync(indexPath, html);
        
        console.log('✅ Galaxy map built successfully!');
        console.log(`📊 Статистика:`);
        Object.entries(result.stats.entities).forEach(([type, count]) => {
            if (count > 0) {
                const icons = { galaxy: '⭐', planet: '🪐', moon: '🌙', asteroid: '☄️', debris: '🛰️' };
                console.log(`   ${icons[type] || '📁'} ${type}: ${count}`);
            }
        });
        console.log(`📁 Результаты: ${outputPath}`);
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

function generateHTML(scanResult) {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌌 Galaxy Scanner - ${scanResult.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0c0c2e 0%, #1a1a4a 100%);
            color: #e0e0ff;
            line-height: 1.6;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 40px 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .header h1 {
            font-size: 3em;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #FFD700, #4ECDC4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .stat-card {
            background: rgba(255, 255, 255, 0.08);
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: transform 0.3s ease, background 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            background: rgba(255, 255, 255, 0.12);
        }
        
        .stat-icon {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #4ECDC4;
            margin: 10px 0;
        }
        
        .galaxy-tree {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            padding: 30px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .entity {
            margin: 15px 0;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            border-left: 4px solid;
            transition: all 0.3s ease;
        }
        
        .entity:hover {
            background: rgba(255, 255, 255, 0.08);
            transform: translateX(5px);
        }
        
        .galaxy { border-left-color: #FFD700; }
        .planet { border-left-color: #4ECDC4; margin-left: 20px; }
        .moon { border-left-color: #C7F464; margin-left: 40px; }
        .asteroid { border-left-color: #FF6B6B; margin-left: 60px; }
        .debris { border-left-color: #A8E6CF; margin-left: 80px; }
        
        .entity-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }
        
        .entity-icon {
            font-size: 1.5em;
        }
        
        .entity-name {
            font-weight: bold;
            font-size: 1.2em;
        }
        
        .entity-meta {
            font-size: 0.9em;
            color: #a0a0cc;
            margin-left: 35px;
        }
        
        .download-section {
            text-align: center;
            margin: 40px 0;
        }
        
        .download-btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: linear-gradient(45deg, #4ECDC4, #44A08D);
            color: white;
            padding: 15px 30px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border: none;
            cursor: pointer;
            font-size: 1.1em;
        }
        
        .download-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(78, 205, 196, 0.3);
        }
        
        .timestamp {
            text-align: center;
            color: #a0a0cc;
            margin-top: 20px;
            font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
            .header h1 { font-size: 2em; }
            .stats-grid { grid-template-columns: 1fr; }
            .entity { margin-left: 10px !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌌 Galaxy Scanner</h1>
            <p>Автоматическое сканирование структуры папки "галактика"</p>
            <div class="timestamp">
                Обновлено: ${new Date(scanResult.scannedAt).toLocaleString('ru-RU')}
            </div>
        </div>
        
        <div class="stats-grid">
            ${Object.entries(scanResult.stats.entities).map(([type, count]) => {
                if (count === 0) return '';
                const icons = { galaxy: '⭐', planet: '🪐', moon: '🌙', asteroid: '☄️', debris: '🛰️' };
                const names = { galaxy: 'Галактики', planet: 'Планеты', moon: 'Спутники', asteroid: 'Астероиды', debris: 'Объекты' };
                return `
                <div class="stat-card">
                    <div class="stat-icon">${icons[type]}</div>
                    <div class="stat-number">${count}</div>
                    <div class="stat-name">${names[type] || type}</div>
                </div>
                `;
            }).join('')}
            
            <div class="stat-card">
                <div class="stat-icon">⏱️</div>
                <div class="stat-number">${scanResult.scanDuration}ms</div>
                <div class="stat-name">Время сканирования</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">📄</div>
                <div class="stat-number">${scanResult.stats.filesScanned}</div>
                <div class="stat-name">Файлов просканировано</div>
            </div>
        </div>
        
        <div class="download-section">
            <a href="/results/scan-${scanResult.name}-latest.json" class="download-btn" download>
                📥 Скачать JSON с данными
            </a>
        </div>
        
        <div class="galaxy-tree">
            <h2 style="margin-bottom: 20px; text-align: center;">🌌 Древовидная структура</h2>
            <div id="tree-container">
                ${renderEntity(scanResult)}
            </div>
        </div>
    </div>
    
    <script>
        function renderEntity(entity, level = 0) {
            const classMap = {
                galaxy: 'galaxy',
                planet: 'planet', 
                moon: 'moon',
                asteroid: 'asteroid',
                debris: 'debris'
            };
            
            const icons = {
                galaxy: '⭐',
                planet: '🪐',
                moon: '🌙',
                asteroid: '☄️',
                debris: '🛰️'
            };
            
            return \`
                <div class="entity \${classMap[entity.type]}" data-level="\${level}">
                    <div class="entity-header">
                        <span class="entity-icon">\${icons[entity.type] || '📁'}</span>
                        <span class="entity-name">\${entity.config?.title || entity.name}</span>
                    </div>
                    <div class="entity-meta">
                        Тип: \${entity.type} | Путь: \${entity.path}
                        \${entity.config?.description ? \`<br>Описание: \${entity.config.description}\` : ''}
                    </div>
                    \${entity.children ? entity.children.map(child => renderEntity(child, level + 1)).join('') : ''}
                </div>
            \`;
        }
        
        // Добавляем возможность сворачивать/разворачивать элементы
        document.addEventListener('DOMContentLoaded', function() {
            const entities = document.querySelectorAll('.entity');
            entities.forEach(entity => {
                const children = entity.querySelectorAll('.entity').length;
                if (children > 0) {
                    entity.style.cursor = 'pointer';
                    entity.addEventListener('click', function(e) {
                        if (e.target.closest('.entity') === this) {
                            const childEntities = this.querySelectorAll('.entity');
                            childEntities.forEach(child => {
                                child.style.display = child.style.display === 'none' ? 'block' : 'none';
                            });
                        }
                    });
                }
            });
        });
    </script>
</body>
</html>
    `;
}

buildForVercel();
