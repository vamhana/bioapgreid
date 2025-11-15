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
        createDemoStructure(galaxyPath);
    }
    
    try {
        const scanner = new GalaxyScanner(galaxyPath);
        const result = await scanner.scan();
        
        // Создаем публичную папку
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        
        // 🔥 КОПИРУЕМ ПАПКУ ГАЛАКТИКА В PUBLIC ДЛЯ ДОСТУПА ЧЕРЕЗ ИНТЕРНЕТ
        const galaxyPublicPath = path.join(publicDir, 'галактика');
        copyFolderRecursive(galaxyPath, galaxyPublicPath);
        console.log('✅ Папка "галактика" скопирована в public для веб-доступа');
        
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
        console.log(`🌐 HTML файлы доступны по адресу: https://www.bioapgreid.ru/галактика/`);
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

// 🔥 Функция для рекурсивного копирования папки
function copyFolderRecursive(source, target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }
    
    const files = fs.readdirSync(source);
    
    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);
        
        const stat = fs.statSync(sourcePath);
        
        if (stat.isDirectory()) {
            copyFolderRecursive(sourcePath, targetPath);
        } else {
            fs.copyFileSync(sourcePath, targetPath);
        }
    });
}

// 🔥 Функция для создания демо-структуры
function createDemoStructure(galaxyPath) {
    console.log('Создаем демо-структуру галактики...');
    
    // Создаем папки
    const folders = [
        'земля',
        'земля/луна', 
        'марс',
        'марс/фобос',
        'марс/деймос',
        'юпитер'
    ];
    
    folders.forEach(folder => {
        const fullPath = path.join(galaxyPath, folder);
        fs.mkdirSync(fullPath, { recursive: true });
    });
    
    // Создаем HTML файлы
    const galaxyHTML = `<!DOCTYPE html>
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
    <p>Демонстрационная страница галактики</p>
</body>
</html>`;
    
    const earthHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Планета Земля</title>
</head>
<body>
    <h1>Планета Земля</h1>
    <p>Наш дом в космосе</p>
</body>
</html>`;
    
    // Записываем файлы
    fs.writeFileSync(path.join(galaxyPath, 'index.html'), galaxyHTML);
    fs.writeFileSync(path.join(galaxyPath, 'земля', 'index.html'), earthHTML);
    fs.writeFileSync(path.join(galaxyPath, 'земля', 'луна', 'index.html'), '<html><title>Луна</title><body><h1>Луна</h1></body></html>');
    fs.writeFileSync(path.join(galaxyPath, 'марс', 'index.html'), '<html><title>Марс</title><body><h1>Марс</h1></body></html>');
    fs.writeFileSync(path.join(galaxyPath, 'марс', 'фобос', 'index.html'), '<html><title>Фобос</title><body><h1>Фобос</h1></body></html>');
    fs.writeFileSync(path.join(galaxyPath, 'марс', 'деймос', 'index.html'), '<html><title>Деймос</title><body><h1>Деймос</h1></body></html>');
    fs.writeFileSync(path.join(galaxyPath, 'юпитер', 'index.html'), '<html><title>Юпитер</title><body><h1>Юпитер</h1></body></html>');
    
    console.log('✅ Демо-структура создана');
}

// 🔥 Обновляем generateHTML чтобы добавить ссылки на реальные HTML файлы
function generateHTML(scanResult) {
    const treeHTML = renderEntity(scanResult);
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌌 Galaxy Scanner - ${scanResult.name}</title>
    <style>
        /* ... существующие стили ... */
        
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
        
        <div class="web-links">
            <h3>🌐 Прямые ссылки на HTML файлы:</h3>
            <a href="/галактика/index.html" class="web-link" target="_blank">
                📄 Главная страница галактики
            </a>
            <a href="/галактика" class="web-link" target="_blank">
                📁 Просмотреть всю папку галактики
            </a>
        </div>
        
        <!-- ... остальная часть HTML ... -->
        
    </div>
    
    <script>
        // Добавляем ссылки на реальные HTML файлы к каждой сущности
        document.addEventListener('DOMContentLoaded', function() {
            const entities = document.querySelectorAll('.entity');
            entities.forEach(entity => {
                const entityName = entity.querySelector('.entity-name').textContent;
                const entityPath = entity.querySelector('.entity-meta').textContent.split('Путь: ')[1];
                
                if (entityPath) {
                    const link = document.createElement('a');
                    link.href = '/галактика/' + entityPath + '/index.html';
                    link.className = 'entity-link';
                    link.textContent = '🌐 открыть';
                    link.target = '_blank';
                    
                    const header = entity.querySelector('.entity-header');
                    header.appendChild(link);
                }
            });
        });
        
        // ... существующий код сворачивания ...
    </script>
</body>
</html>`;
}

// Функция renderEntity остается без изменений
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
    
    let html = `
        <div class="entity ${classMap[entity.type]}" data-level="${level}">
            <div class="entity-header">
                <span class="entity-icon">${icons[entity.type] || '📁'}</span>
                <span class="entity-name">${entity.config?.title || entity.name}</span>
            </div>
            <div class="entity-meta">
                Тип: ${entity.type} | Путь: ${entity.path}
                ${entity.config?.description ? `<br>Описание: ${entity.config.description}` : ''}
            </div>
    `;
    
    if (entity.children && entity.children.length > 0) {
        entity.children.forEach(child => {
            html += renderEntity(child, level + 1);
        });
    }
    
    html += `</div>`;
    return html;
}

buildForVercel();
