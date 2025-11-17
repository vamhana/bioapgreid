// bioapgreid/modules/build-script/build-processor.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { BUILD_CONFIG } from './config.js';
import { copyFolderRecursive, createDirectoryIfNotExists, checkGalaxyExists } from './file-utils.js';
import { generateHTML, createGalaxyHtml, createGalaxyRedirect } from './html-generator.js';
import { generateAppHTML } from './html-generator-app.js';
import { addFullUrls } from './url-processor.js';
import { scanGalaxy } from './galaxy-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function buildForVercel() {
    console.log('🚀 Building Galaxy Scanner for Vercel...');
    
    const galaxyPath = path.join(__dirname, '../../galaxy');
    const publicDir = path.join(__dirname, '../../public');
    const appModulesPath = path.join(__dirname, '../../modules/app');
    
    if (!checkGalaxyExists(galaxyPath)) {
        process.exit(1);
    }
    
    try {
        const result = await scanGalaxy(galaxyPath);
        
        // Добавляем полные URL
        addFullUrls(result);
        
        // Создаем публичную папку
        createDirectoryIfNotExists(publicDir);
        
        // Копируем галактику в public
        const galaxyPublicPath = path.join(publicDir, 'galaxy');
        copyFolderRecursive(galaxyPath, galaxyPublicPath);
        console.log('✅ Папка "galaxy" скопирована в public для веб-доступа');
        
        // Копируем модули приложения в public/app (если они существуют)
        if (fs.existsSync(appModulesPath)) {
            const appPublicPath = path.join(publicDir, 'app');
            copyFolderRecursive(appModulesPath, appPublicPath);
            console.log('✅ Модули приложения скопированы в public/app');
            
            // Проверяем структуру скопированных модулей
            const appFiles = fs.readdirSync(appPublicPath, { recursive: true });
            console.log(`📁 Структура модулей приложения: ${appFiles.length} файлов`);
        } else {
            console.warn('⚠️ Папка modules/app не найдена, приложение не будет работать');
        }
        
        // Создаем HTML файлы
        createGalaxyRedirect(galaxyPublicPath);
        
        // Создаем папку для результатов
        const resultsDir = path.join(publicDir, BUILD_CONFIG.RESULTS_DIR);
        createDirectoryIfNotExists(resultsDir);
        
        // Сохраняем sitemap
        const sitemapPath = path.join(resultsDir, BUILD_CONFIG.SITEMAP_FILE);
        fs.writeFileSync(sitemapPath, JSON.stringify(result, null, 2));
        console.log('✅ Создан фиксированный sitemap.json для всех модулей');
        
        // Создаем главную страницу ПРИЛОЖЕНИЯ
        const indexPath = path.join(publicDir, 'index.html');
        const html = generateAppHTML(result);
        fs.writeFileSync(indexPath, html);
        console.log('✅ Создана главная страница приложения (index.html)');
        
        // Создаем файл старой структуры галактики (для обратной совместимости)
        const galaxyStructurePath = path.join(publicDir, 'galaxy-structure.html');
        const oldStructureHtml = generateHTML(result);
        fs.writeFileSync(galaxyStructurePath, oldStructureHtml);
        console.log('✅ Создана страница структуры галактики (galaxy-structure.html)');
        
        // Создаем файл галактики (перенаправление)
        createGalaxyHtml(publicDir, result);
        
        // Создаем файл проверки доступности модулей
        createModuleTestFile(publicDir);
        
        // Выводим статистику
        logBuildStats(result, sitemapPath);
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

function createModuleTestFile(publicDir) {
    const testPath = path.join(publicDir, 'module-test.html');
    const testHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🧪 Тест модулей приложения</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: #0c0c2e; 
            color: white; 
        }
        .test-result { 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 5px; 
        }
        .success { background: #4ECDC4; color: #0c0c2e; }
        .error { background: #FF6B6B; color: white; }
        button { 
            background: #4ECDC4; 
            color: #0c0c2e; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer; 
            margin: 5px; 
        }
    </style>
</head>
<body>
    <h1>🧪 Тест модулей приложения</h1>
    
    <div id="test-results">
        <div class="test-result" id="sitemap-test">🔍 Проверка sitemap.json...</div>
        <div class="test-result" id="app-modules-test">🔍 Проверка модулей приложения...</div>
        <div class="test-result" id="galaxy-test">🔍 Проверка галактики...</div>
    </div>
    
    <div style="margin-top: 20px;">
        <button onclick="runTests()">🔄 Запустить тесты</button>
        <button onclick="window.location.href='/'">🏠 На главную</button>
        <button onclick="window.location.href='/galaxy-structure.html'">📊 Старая структура</button>
    </div>

    <script>
        async function runTests() {
            // Тест sitemap.json
            try {
                const sitemapTest = document.getElementById('sitemap-test');
                const response = await fetch('/results/sitemap.json');
                if (response.ok) {
                    const data = await response.json();
                    sitemapTest.innerHTML = '✅ sitemap.json доступен: ' + data.name;
                    sitemapTest.className = 'test-result success';
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                document.getElementById('sitemap-test').innerHTML = '❌ Ошибка загрузки sitemap.json: ' + error.message;
                document.getElementById('sitemap-test').className = 'test-result error';
            }

            // Тест модулей приложения
            try {
                const modulesTest = document.getElementById('app-modules-test');
                const response = await fetch('/app/core/app.js');
                if (response.ok) {
                    modulesTest.innerHTML = '✅ Модули приложения доступны';
                    modulesTest.className = 'test-result success';
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                document.getElementById('app-modules-test').innerHTML = '❌ Ошибка загрузки модулей: ' + error.message;
                document.getElementById('app-modules-test').className = 'test-result error';
            }

            // Тест галактики
            try {
                const galaxyTest = document.getElementById('galaxy-test');
                const response = await fetch('/galaxy/index.html');
                if (response.ok) {
                    galaxyTest.innerHTML = '✅ Галактика доступна';
                    galaxyTest.className = 'test-result success';
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                document.getElementById('galaxy-test').innerHTML = '❌ Ошибка загрузки галактики: ' + error.message;
                document.getElementById('galaxy-test').className = 'test-result error';
            }
        }

        // Автозапуск тестов при загрузке
        document.addEventListener('DOMContentLoaded', runTests);
    </script>
</body>
</html>`;
    
    fs.writeFileSync(testPath, testHtml);
    console.log('✅ Создан тестовый файл модулей (module-test.html)');
}

function logBuildStats(result, sitemapPath) {
    console.log('✅ Galaxy map built successfully!');
    console.log(`📊 Статистика:`);
    Object.entries(result.stats.entities).forEach(([type, count]) => {
        if (count > 0) {
            const icons = { galaxy: '⭐', planet: '🪐', moon: '🌙', asteroid: '☄️', debris: '🛰️' };
            console.log(`   ${icons[type] || '📁'} ${type}: ${count}`);
        }
    });
    console.log(`🎯 Основной файл для модулей: ${sitemapPath}`);
    console.log(`🌐 Доступные URL:`);
    console.log(`   ${BUILD_CONFIG.BASE_URL}/`);
    console.log(`   ${BUILD_CONFIG.BASE_URL}/galaxy.html`);
    console.log(`   ${BUILD_CONFIG.BASE_URL}/galaxy-structure.html`);
    console.log(`   ${BUILD_CONFIG.BASE_URL}/module-test.html`);
    console.log(`   ${BUILD_CONFIG.BASE_URL}/results/sitemap.json`);
}
