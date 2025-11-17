import fs from 'fs';
import path from 'path';
import { generateEntityLinks } from './url-processor.js';
import { ENTITY_CONFIG } from './config.js';

export function generateHTML(scanResult) {
    const treeHTML = generateEntityLinks(scanResult);
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌌 Galaxy Scanner - ${scanResult.name}</title>
    <style>${getStyles()}</style>
</head>
<body>
    ${generateHeader(scanResult)}
    ${generateWebLinks()}
    ${generateStats(scanResult)}
    ${generateDownloadSection()}
    ${generateGalaxyTree(treeHTML)}
    <script>${getScripts()}</script>
</body>
</html>`;
}

export function createGalaxyHtml(publicDir, scanResult) {
    const galaxyHtmlPath = path.join(publicDir, 'galaxy.html');
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌌 galaxy - Прямой доступ</title>
    <meta http-equiv="refresh" content="0; url=/galaxy/index.html">
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #0c0c2e;
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
        }
        a {
            color: #4ECDC4;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌌 Перенаправление на Галактику...</h1>
        <p>Если перенаправление не сработало, <a href="/galaxy/index.html">нажмите сюда</a></p>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(galaxyHtmlPath, html);
    console.log('✅ Создан файл galaxy.html в корне');
}

export function createGalaxyRedirect(galaxyPublicPath) {
    const redirectHtml = `<!DOCTYPE html>
<html>
<head>
    <title>galaxy - Список файлов</title>
    <meta http-equiv="refresh" content="0; url=index.html">
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #0c0c2e;
            color: white;
        }
        a {
            color: #4ECDC4;
            text-decoration: none;
            display: block;
            margin: 10px 0;
            padding: 10px;
            background: rgba(255,255,255,0.1);
            border-radius: 5px;
        }
        a:hover {
            background: rgba(255,255,255,0.2);
        }
    </style>
</head>
<body>
    <h1>📁 Содержимое папки "galaxy"</h1>
    <p>Автоматическое перенаправление на главную страницу...</p>
    <p>Или выберите файл вручную:</p>
    <div id="file-list"></div>
    
    <script>
        const files = [
            {name: 'index.html', path: 'index.html', title: 'Главная страница галактики'}
        ];
        
        const fileList = document.getElementById('file-list');
        files.forEach(file => {
            const link = document.createElement('a');
            link.href = file.path;
            link.textContent = file.title + ' → ' + file.name;
            fileList.appendChild(link);
        });
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    </script>
</body>
</html>`;
    
    const listPath = path.join(galaxyPublicPath, 'list.html');
    fs.writeFileSync(listPath, redirectHtml);
}

function getStyles() {
    return `
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
        
        .web-links {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: rgba(78, 205, 196, 0.1);
            border-radius: 15px;
        }
        
        .web-link {
            display: inline-block;
            margin: 10px;
            padding: 12px 25px;
            background: rgba(255, 255, 255, 0.1);
            color: #4ECDC4;
            text-decoration: none;
            border-radius: 25px;
            border: 1px solid #4ECDC4;
            transition: all 0.3s ease;
        }
        
        .web-link:hover {
            background: #4ECDC4;
            color: #0c0c2e;
            transform: translateY(-2px);
        }
        
        .url-examples {
            background: rgba(255,215,0,0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        
        .url-examples code {
            display: block;
            background: rgba(0,0,0,0.3);
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            font-family: monospace;
        }
        
        .toggle-btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: #4ECDC4;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
            margin-left: 10px;
            font-size: 0.8em;
        }
        
        .collapsed .entity-children {
            display: none;
        }
        
        .entity-link {
            color: #4ECDC4;
            text-decoration: none;
            margin-left: 10px;
            font-size: 0.9em;
            opacity: 0.7;
            transition: opacity 0.3s ease;
        }
        
        .entity-link:hover {
            opacity: 1;
            text-decoration: underline;
        }
        
        @media (max-width: 768px) {
            .header h1 { font-size: 2em; }
            .stats-grid { grid-template-columns: 1fr; }
            .entity { margin-left: 10px !important; }
        }
    `;
}

function getScripts() {
    return `
        document.addEventListener('DOMContentLoaded', function() {
            // Добавляем ссылки к сущностям
            const entities = document.querySelectorAll('.entity');
            entities.forEach(entity => {
                const entityPath = entity.dataset.path;
                if (entityPath !== undefined) {
                    const link = document.createElement('a');
                    link.href = entityPath === '' ? '/galaxy/index.html' : '/galaxy/' + entityPath + '/index.html';
                    link.className = 'entity-link';
                    link.textContent = '🌐 открыть';
                    link.target = '_blank';
                    const header = entity.querySelector('.entity-header');
                    if (header) {
                        header.appendChild(link);
                    }
                }
            });
            
            // Добавляем функциональность сворачивания
            initializeCollapseFunctionality();
        });
        
        function initializeCollapseFunctionality() {
            const entities = document.querySelectorAll('.entity');
            const rootEntities = document.querySelectorAll('.galaxy-tree > .entity');
            
            entities.forEach(entity => {
                const childrenContainer = entity.querySelector('.entity-children');
                if (!childrenContainer) {
                    // Создаем контейнер для детей, если его нет
                    const children = entity.querySelectorAll(':scope > .entity');
                    if (children.length > 0) {
                        const newContainer = document.createElement('div');
                        newContainer.className = 'entity-children';
                        
                        children.forEach(child => {
                            newContainer.appendChild(child.cloneNode(true));
                            child.remove();
                        });
                        
                        entity.appendChild(newContainer);
                        
                        // Добавляем кнопку toggle
                        const header = entity.querySelector('.entity-header');
                        if (header) {
                            const toggleBtn = document.createElement('button');
                            toggleBtn.className = 'toggle-btn';
                            toggleBtn.textContent = '−';
                            toggleBtn.onclick = function(e) {
                                e.stopPropagation();
                                entity.classList.toggle('collapsed');
                                toggleBtn.textContent = entity.classList.contains('collapsed') ? '+' : '−';
                            };
                            header.appendChild(toggleBtn);
                        }
                    }
                } else {
                    // Если контейнер уже есть, добавляем кнопку
                    const header = entity.querySelector('.entity-header');
                    if (header) {
                        const toggleBtn = document.createElement('button');
                        toggleBtn.className = 'toggle-btn';
                        toggleBtn.textContent = '−';
                        toggleBtn.onclick = function(e) {
                            e.stopPropagation();
                            entity.classList.toggle('collapsed');
                            toggleBtn.textContent = entity.classList.contains('collapsed') ? '+' : '−';
                        };
                        header.appendChild(toggleBtn);
                    }
                }
            });
        }
    `;
}

function generateHeader(scanResult) {
    return `
    <div class="header">
        <h1>🌌 Galaxy Scanner</h1>
        <p>Автоматическое сканирование структуры папки "galaxy"</p>
        <div class="timestamp">
            Обновлено: ${new Date(scanResult.scannedAt).toLocaleString('ru-RU')}
        </div>
    </div>`;
}

function generateWebLinks() {
    return `
    <div class="web-links">
        <h3>🌐 Правильные URL для доступа:</h3>
        <div class="url-examples">
            <strong>🎯 Основной файл данных для модулей:</strong>
            <code>https://www.bioapgreid.ru/results/sitemap.json</code>
            
            <strong>🌌 Корневая galaxy:</strong>
            <code>https://www.bioapgreid.ru/galaxy.html</code>
            <code>https://www.bioapgreid.ru/galaxy/</code>
            <code>https://www.bioapgreid.ru/galaxy/index.html</code>
        </div>
        
        <a href="/galaxy.html" class="web-link" target="_blank">
            🌌 Открыть галактику (короткая ссылка)
        </a>
        <a href="/galaxy/index.html" class="web-link" target="_blank">
            📄 Открыть галактику (прямая ссылка)
        </a>
        <a href="/results/sitemap.json" class="web-link" target="_blank">
            🎯 Открыть sitemap.json
        </a>
    </div>`;
}

function generateStats(scanResult) {
    const statsHTML = Object.entries(scanResult.stats.entities)
        .filter(([type, count]) => count > 0)
        .map(([type, count]) => `
            <div class="stat-card">
                <div class="stat-icon">${ENTITY_CONFIG.icons[type] || '📁'}</div>
                <div class="stat-number">${count}</div>
                <div class="stat-name">${ENTITY_CONFIG.names[type] || type}</div>
            </div>
        `).join('');
    
    return `
    <div class="stats-grid">
        ${statsHTML}
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
    </div>`;
}

function generateDownloadSection() {
    return `
    <div class="download-section">
        <a href="/results/sitemap.json" class="download-btn" download="sitemap.json">
            🎯 Скачать sitemap.json
        </a>
    </div>`;
}

function generateGalaxyTree(treeHTML) {
    return `
    <div class="galaxy-tree">
        <h2 style="margin-bottom: 20px; text-align: center;">🌌 Древовидная структура</h2>
        <div id="tree-container">${treeHTML}</div>
    </div>`;
}
