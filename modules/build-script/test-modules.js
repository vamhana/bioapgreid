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
import { testCriticalModules, scanProjectStructure } from './test-modules.js';

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
            const appFiles = getAllFiles(appPublicPath);
            console.log(`📁 Структура модулей приложения: ${appFiles.length} файлов`);
            
            // Логируем основные модули
            const coreModules = appFiles.filter(file => 
                file.includes('/core/') && file.endsWith('.js')
            );
            console.log(`   🎯 Основные модули: ${coreModules.length}`);
        } else {
            console.warn('⚠️ Папка modules/app не найдена, приложение не будет работать');
            // Создаем базовую структуру для отладки
            createFallbackAppModules(publicDir);
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
        
        // 🔴 НОВОЕ: Сохраняем структуру проекта и результаты тестов
        console.log('🔍 Сканирование структуры проекта...');
        const projectStructure = scanProjectStructure();
        const projectStructurePath = path.join(resultsDir, 'project-structure.json');
        fs.writeFileSync(projectStructurePath, JSON.stringify(projectStructure, null, 2));
        console.log('✅ Сохранена структура проекта в project-structure.json');
        
        console.log('🧪 Тестирование критических модулей...');
        const testResults = testCriticalModules();
        const testResultsPath = path.join(resultsDir, 'test-results.json');
        fs.writeFileSync(testResultsPath, JSON.stringify(testResults, null, 2));
        console.log('✅ Сохранены результаты тестов модулей в test-results.json');
        
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
        
        // Создаем файл диагностики для мобильных устройств
        createMobileTestFile(publicDir);
        
        // Выводим статистику
        logBuildStats(result, sitemapPath, testResults);
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Вспомогательная функция для получения всех файлов
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath.replace(dirPath + path.sep, ''));
        }
    });

    return arrayOfFiles;
}

// Функция для создания fallback модулей приложения
function createFallbackAppModules(publicDir) {
    const appPublicPath = path.join(publicDir, 'app');
    createDirectoryIfNotExists(appPublicPath);
    
    const corePath = path.join(appPublicPath, 'core');
    createDirectoryIfNotExists(corePath);
    
    // Создаем минимальный app.js для отладки
    const appJsContent = `// Fallback app.js for debugging
export class GalaxyApp {
    constructor() {
        console.log('🚀 Fallback GalaxyApp создан');
        this.diagnostics = {
            platform: this.detectPlatform(),
            userAgent: navigator.userAgent,
            supportsES6: 'noModule' in HTMLScriptElement.prototype,
            isOnline: navigator.onLine,
            screenSize: window.innerWidth + 'x' + window.innerHeight
        };
    }

    async init() {
        console.log('📱 Диагностика:', this.diagnostics);
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = 
                '<div style="color: #ff6b6b;">⚠️ Модули приложения не найдены</div>' +
                '<div style="margin: 10px 0;">Запущен fallback режим</div>' +
                '<div style="font-size: 12px; opacity: 0.7;">' + 
                'Платформа: ' + this.diagnostics.platform + '<br>' +
                'ES6 модули: ' + this.diagnostics.supportsES6 + '<br>' +
                'Онлайн: ' + this.diagnostics.isOnline +
                '</div>';
        }
        throw new Error('Модули приложения не найдены. Проверьте сборку.');
    }

    detectPlatform() {
        const ua = navigator.userAgent;
        if (/Android/.test(ua)) return 'Android';
        if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
        if (/Windows/.test(ua)) return 'Windows';
        if (/Mac/.test(ua)) return 'Mac';
        return 'Unknown';
    }
}`;

    fs.writeFileSync(path.join(corePath, 'app.js'), appJsContent);
    console.log('⚠️ Созданы fallback модули приложения для отладки');
}

function createModuleTestFile(publicDir) {
    const testPath = path.join(publicDir, 'module-test.html');
    const testHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🧪 Тест модулей и структуры проекта</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: #0c0c2e; 
            color: white; 
            max-width: 1200px;
            margin: 0 auto;
        }
        .test-result { 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 8px; 
            border-left: 4px solid;
        }
        .success { 
            background: rgba(78, 205, 196, 0.1); 
            border-left-color: #4ECDC4; 
        }
        .error { 
            background: rgba(255, 107, 107, 0.1); 
            border-left-color: #FF6B6B; 
        }
        .warning { 
            background: rgba(255, 193, 7, 0.1); 
            border-left-color: #FFC107; 
        }
        button { 
            background: #4ECDC4; 
            color: #0c0c2e; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer; 
            margin: 5px; 
            font-weight: bold;
        }
        button:hover { background: #45b8b0; }
        .file-tree { 
            margin: 15px 0; 
            font-family: monospace; 
            font-size: 14px;
        }
        .directory { color: #4ECDC4; cursor: pointer; }
        .file { color: #e0e0ff; margin-left: 20px; }
        .file-size { color: #888; font-size: 12px; margin-left: 10px; }
        .collapsed .children { display: none; }
        .test-section { margin: 30px 0; }
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px; 
            margin: 20px 0; 
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.05);
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-number { 
            font-size: 2em; 
            font-weight: bold; 
            color: #4ECDC4; 
            margin: 10px 0; 
        }
        .module-status { margin: 5px 0; padding: 5px; border-radius: 3px; }
        .module-ok { background: rgba(78, 205, 196, 0.2); }
        .module-missing { background: rgba(255, 107, 107, 0.2); }
        code { 
            background: rgba(0,0,0,0.3); 
            padding: 2px 5px; 
            border-radius: 3px; 
            font-family: monospace;
        }
    </style>
</head>
<body>
    <h1>🧪 Тест модулей и структуры проекта</h1>
    
    <div class="stats" id="stats-container">
        <!-- Статистика будет заполнена JavaScript -->
    </div>
    
    <div class="test-section">
        <h2>🔍 Основные тесты</h2>
        <div id="test-results">
            <div class="test-result" id="sitemap-test">🔍 Проверка sitemap.json...</div>
            <div class="test-result" id="app-modules-test">🔍 Проверка модулей приложения...</div>
            <div class="test-result" id="galaxy-test">🔍 Проверка галактики...</div>
            <div class="test-result" id="project-structure-test">🔍 Загрузка структуры проекта...</div>
            <div class="test-result" id="module-tests-test">🔍 Проверка тестов модулей...</div>
        </div>
    </div>

    <div class="test-section" id="module-details-section" style="display: none;">
        <h2>📦 Детали модулей</h2>
        <div id="module-details-container">
            <!-- Детали модулей будут заполнены JavaScript -->
        </div>
    </div>

    <div class="test-section">
        <h2>📁 Структура проекта</h2>
        <div id="project-structure-container">
            <div class="test-result warning" id="structure-placeholder">
                Нажмите "Запустить тесты" для загрузки структуры проекта...
            </div>
        </div>
    </div>
    
    <div style="margin-top: 30px; text-align: center;">
        <button onclick="runAllTests()">🚀 Запустить все тесты</button>
        <button onclick="loadProjectStructure()">📁 Только структура проекта</button>
        <button onclick="testMobileCompatibility()">📱 Тест мобильной совместимости</button>
        <button onclick="window.location.href='/'">🏠 На главную</button>
        <button onclick="window.location.href='/galaxy-structure.html'">📊 Старая структура</button>
    </div>

    <script>
        let projectStructure = null;
        let testResults = null;

        async function runAllTests() {
            console.log('🚀 Запуск всех тестов...');
            await testSitemap();
            await testAppModules();
            await testGalaxy();
            await testModuleTests();
            await loadProjectStructure();
            await loadTestResults();
            updateStats();
            showModuleDetails();
        }

        async function testSitemap() {
            try {
                const testElement = document.getElementById('sitemap-test');
                const response = await fetch('/results/sitemap.json');
                if (response.ok) {
                    const data = await response.json();
                    testElement.innerHTML = \`✅ sitemap.json доступен: <strong>\${data.name}</strong><br>
                                            <small>Сущности: \${Object.values(data.stats.entities).reduce((a, b) => a + b, 0)} | 
                                            Файлов: \${data.stats.filesScanned} | Ошибок: \${data.stats.errors}</small>\`;
                    testElement.className = 'test-result success';
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                document.getElementById('sitemap-test').innerHTML = '❌ Ошибка загрузки sitemap.json: ' + error.message;
                document.getElementById('sitemap-test').className = 'test-result error';
            }
        }

        async function testAppModules() {
            try {
                const testElement = document.getElementById('app-modules-test');
                const response = await fetch('/app/core/app.js');
                if (response.ok) {
                    const text = await response.text();
                    const hasClass = text.includes('class GalaxyApp');
                    testElement.innerHTML = hasClass ? 
                        '✅ Модули приложения доступны и валидны' : 
                        '⚠️ Модули приложения доступны, но структура нестандартная';
                    testElement.className = hasClass ? 'test-result success' : 'test-result warning';
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                document.getElementById('app-modules-test').innerHTML = '❌ Ошибка загрузки модулей: ' + error.message;
                document.getElementById('app-modules-test').className = 'test-result error';
            }
        }

        async function testGalaxy() {
            try {
                const testElement = document.getElementById('galaxy-test');
                const response = await fetch('/galaxy/index.html');
                if (response.ok) {
                    testElement.innerHTML = '✅ Галактика доступна';
                    testElement.className = 'test-result success';
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                document.getElementById('galaxy-test').innerHTML = '❌ Ошибка загрузки галактики: ' + error.message;
                document.getElementById('galaxy-test').className = 'test-result error';
            }
        }

        async function testModuleTests() {
            try {
                const testElement = document.getElementById('module-tests-test');
                const response = await fetch('/results/test-results.json');
                if (response.ok) {
                    testResults = await response.json();
                    const passed = testResults.allPassed;
                    testElement.innerHTML = passed ? 
                        '✅ Все модули прошли проверку' : 
                        \`❌ \${testResults.results.filter(r => !r.exists).length} модулей не прошли проверку\`;
                    testElement.className = passed ? 'test-result success' : 'test-result error';
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                document.getElementById('module-tests-test').innerHTML = '❌ Ошибка загрузки тестов: ' + error.message;
                document.getElementById('module-tests-test').className = 'test-result error';
            }
        }

        async function loadProjectStructure() {
            try {
                const response = await fetch('/results/project-structure.json');
                if (response.ok) {
                    projectStructure = await response.json();
                    displayProjectStructure();
                    document.getElementById('project-structure-test').innerHTML = '✅ Структура проекта загружена';
                    document.getElementById('project-structure-test').className = 'test-result success';
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                document.getElementById('project-structure-test').innerHTML = '❌ Ошибка загрузки структуры: ' + error.message;
                document.getElementById('project-structure-test').className = 'test-result error';
            }
        }

        async function loadTestResults() {
            // Уже загружено в testModuleTests()
        }

        function showModuleDetails() {
            if (!testResults) return;
            
            const section = document.getElementById('module-details-section');
            const container = document.getElementById('module-details-container');
            
            section.style.display = 'block';
            container.innerHTML = '<h3>📋 Статус критических модулей:</h3>';
            
            testResults.results.forEach(module => {
                const div = document.createElement('div');
                div.className = module.exists ? 'module-status module-ok' : 'module-status module-missing';
                div.innerHTML = \`\${module.exists ? '✅' : '❌'} <code>\${module.module}</code> - \${module.exists ? 'Найден' : 'Отсутствует'}\`;
                container.appendChild(div);
            });
        }

        function displayProjectStructure() {
            const container = document.getElementById('project-structure-container');
            container.innerHTML = '<h3>🌳 Дерево файлов проекта (исключены: galaxy, node_modules, .git, public, .vercel)</h3>';
            
            const treeContainer = document.createElement('div');
            treeContainer.className = 'file-tree';
            
            function createTreeItem(key, value, level = 0) {
                const item = document.createElement('div');
                item.style.marginLeft = (level * 20) + 'px';
                
                if (value.type === 'directory') {
                    item.innerHTML = \`<span class="directory" onclick="toggleDirectory(this)">
                                        \${level === 0 ? '🌐' : '📁'} \${key || 'Корень проекта'}
                                      </span>\`;
                    item.className = 'directory-item';
                    
                    const children = document.createElement('div');
                    children.className = 'children';
                    
                    if (value.files && value.files.length > 0) {
                        value.files.forEach(file => {
                            if (typeof file === 'object' && file.name) {
                                const fileItem = document.createElement('div');
                                fileItem.className = 'file';
                                fileItem.innerHTML = \`📄 \${file.name} 
                                    <span class="file-size">\${formatFileSize(file.size)}</span>\`;
                                children.appendChild(fileItem);
                            }
                        });
                    }
                    
                    // Рекурсивно добавляем поддиректории
                    Object.keys(value).forEach(subKey => {
                        if (subKey !== 'type' && subKey !== 'files' && value[subKey] && value[subKey].type === 'directory') {
                            children.appendChild(createTreeItem(subKey, value[subKey], level + 1));
                        }
                    });
                    
                    item.appendChild(children);
                }
                
                return item;
            }
            
            Object.keys(projectStructure).forEach(key => {
                treeContainer.appendChild(createTreeItem(key, projectStructure[key]));
            });
            
            container.appendChild(treeContainer);
        }

        function toggleDirectory(element) {
            const directoryItem = element.parentElement;
            directoryItem.classList.toggle('collapsed');
            const isCollapsed = directoryItem.classList.contains('collapsed');
            const currentText = element.textContent.trim();
            
            if (currentText.includes('🌐')) {
                element.textContent = isCollapsed ? '🌐 Корень проекта' : '🌐 Корень проекта';
            } else {
                element.textContent = isCollapsed ? 
                    '📁 ' + currentText.replace('📂 ', '') : 
                    '📂 ' + currentText.replace('📁 ', '');
            }
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        function updateStats() {
            if (!projectStructure || !testResults) return;
            
            const statsContainer = document.getElementById('stats-container');
            let totalFiles = 0;
            let totalDirs = 0;

            function countItems(structure) {
                Object.keys(structure).forEach(key => {
                    const item = structure[key];
                    if (item.type === 'directory') {
                        totalDirs++;
                        if (item.files) totalFiles += item.files.length;
                        countItems(item);
                    }
                });
            }

            countItems(projectStructure);

            const passedModules = testResults.results.filter(r => r.exists).length;
            const totalModules = testResults.results.length;

            statsContainer.innerHTML = \`
                <div class="stat-card">
                    <div>📁 Папок</div>
                    <div class="stat-number">\${totalDirs}</div>
                </div>
                <div class="stat-card">
                    <div>📄 Файлов</div>
                    <div class="stat-number">\${totalFiles}</div>
                </div>
                <div class="stat-card">
                    <div>✅ Модулей</div>
                    <div class="stat-number">\${passedModules}/\${totalModules}</div>
                </div>
                <div class="stat-card">
                    <div>🎯 Статус</div>
                    <div class="stat-number">\${testResults.allPassed ? '✅' : '❌'}</div>
                </div>
            \`;
        }

        function testMobileCompatibility() {
            const tests = {
                touchSupport: 'ontouchstart' in window,
                es6Modules: 'noModule' in HTMLScriptElement.prototype,
                serviceWorker: 'serviceWorker' in navigator,
                webGL: (function() {
                    try {
                        const canvas = document.createElement('canvas');
                        return !!(window.WebGLRenderingContext && 
                            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
                    } catch (e) {
                        return false;
                    }
                })(),
                screenSize: \`\${window.innerWidth}x\${window.innerHeight}\`,
                userAgent: navigator.userAgent
            };

            alert(\`📱 Тест мобильной совместимости:\\n\\n\` +
                  \`Касания: \${tests.touchSupport ? '✅' : '❌'}\\n\` +
                  \`ES6 модули: \${tests.es6Modules ? '✅' : '❌'}\\n\` +
                  \`WebGL: \${tests.webGL ? '✅' : '❌'}\\n\` +
                  \`Размер экрана: \${tests.screenSize}\\n\\n\` +
                  \`Подробности в консоли (F12)\`);
            
            console.log('📱 Mobile Compatibility Test:', tests);
        }

        // Автозапуск тестов при загрузке
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runAllTests, 500);
        });
    </script>
</body>
</html>`;
    
    fs.writeFileSync(testPath, testHtml);
    console.log('✅ Создан тестовый файл модулей (module-test.html)');
}

function createMobileTestFile(publicDir) {
    const mobileTestPath = path.join(publicDir, 'mobile-test.html');
    const mobileTestHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📱 Тест мобильной совместимости</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #0c0c2e;
            color: white;
            max-width: 600px;
            margin: 0 auto;
        }
        .test-item {
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            background: rgba(255,255,255,0.05);
        }
        .success { border-left: 4px solid #4ECDC4; }
        .warning { border-left: 4px solid #FFC107; }
        .error { border-left: 4px solid #FF6B6B; }
        .touch-area {
            width: 100%;
            height: 100px;
            background: rgba(78, 205, 196, 0.2);
            border: 2px dashed #4ECDC4;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 10px 0;
            cursor: pointer;
        }
        .touch-feedback {
            background: rgba(78, 205, 196, 0.4);
            transition: background 0.3s;
        }
    </style>
</head>
<body>
    <h1>📱 Тест мобильной совместимости</h1>
    
    <div class="test-item" id="platform-test">
        <strong>🌐 Платформа:</strong> <span id="platform-result">Определение...</span>
    </div>
    
    <div class="test-item" id="touch-test">
        <strong>👆 Поддержка касаний:</strong> <span id="touch-result">Тестирование...</span>
        <div class="touch-area" id="touch-area">
            Коснитесь этой области для теста
        </div>
    </div>
    
    <div class="test-item" id="es6-test">
        <strong>🔧 ES6 модули:</strong> <span id="es6-result">Тестирование...</span>
    </div>
    
    <div class="test-item" id="webgl-test">
        <strong>🎨 WebGL:</strong> <span id="webgl-result">Тестирование...</span>
    </div>
    
    <div class="test-item" id="screen-test">
        <strong>📏 Размер экрана:</strong> <span id="screen-result">Измерение...</span>
    </div>
    
    <div style="margin-top: 30px; text-align: center;">
        <button onclick="runTests()" style="
            background: #4ECDC4;
            color: #0c0c2e;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: bold;
            margin: 5px;
        ">🔄 Запустить тесты</button>
        <button onclick="window.location.href='/'" style="
            background: rgba(255,255,255,0.1);
            color: white;
            border: 1px solid #4ECDC4;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            margin: 5px;
        ">🏠 На главную</button>
    </div>

    <script>
        function detectPlatform() {
            const ua = navigator.userAgent;
            if (/Android/.test(ua)) return 'Android';
            if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
            if (/Windows/.test(ua)) return 'Windows';
            if (/Mac/.test(ua)) return 'Mac';
            if (/Linux/.test(ua)) return 'Linux';
            return 'Unknown';
        }

        function testTouchSupport() {
            const touchArea = document.getElementById('touch-area');
            const touchResult = document.getElementById('touch-result');
            
            const hasTouch = 'ontouchstart' in window;
            
            if (hasTouch) {
                touchResult.innerHTML = '✅ Поддерживается';
                touchResult.parentElement.className = 'test-item success';
                
                let touchCount = 0;
                touchArea.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    touchCount++;
                    this.classList.add('touch-feedback');
                    this.innerHTML = \`Касание #\${touchCount} зарегистрировано!\`;
                    
                    setTimeout(() => {
                        this.classList.remove('touch-feedback');
                        this.innerHTML = 'Коснитесь снова для теста';
                    }, 500);
                });
            } else {
                touchResult.innerHTML = '❌ Не поддерживается';
                touchResult.parentElement.className = 'test-item error';
                touchArea.innerHTML = 'Ваше устройство не поддерживает касания';
                touchArea.style.background = 'rgba(255,107,107,0.2)';
            }
        }

        function testES6Modules() {
            const es6Result = document.getElementById('es6-result');
            const hasES6 = 'noModule' in HTMLScriptElement.prototype;
            
            if (hasES6) {
                es6Result.innerHTML = '✅ Поддерживается';
                es6Result.parentElement.className = 'test-item success';
            } else {
                es6Result.innerHTML = '❌ Не поддерживается';
                es6Result.parentElement.className = 'test-item error';
            }
        }

        function testWebGL() {
            const webglResult = document.getElementById('webgl-result');
            
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                const hasWebGL = !!(window.WebGLRenderingContext && gl);
                
                if (hasWebGL) {
                    webglResult.innerHTML = '✅ Поддерживается';
                    webglResult.parentElement.className = 'test-item success';
                } else {
                    webglResult.innerHTML = '❌ Не поддерживается';
                    webglResult.parentElement.className = 'test-item error';
                }
            } catch (e) {
                webglResult.innerHTML = '❌ Ошибка тестирования';
                webglResult.parentElement.className = 'test-item error';
            }
        }

        function testScreenSize() {
            const screenResult = document.getElementById('screen-result');
            const width = window.innerWidth;
            const height = window.innerHeight;
            const pixelRatio = window.devicePixelRatio;
            
            screenResult.innerHTML = \`\${width} × \${height} (Pixel ratio: \${pixelRatio})\`;
            screenResult.parentElement.className = 'test-item success';
        }

        function runTests() {
            // Платформа
            const platform = detectPlatform();
            document.getElementById('platform-result').textContent = platform;
            document.getElementById('platform-test').className = 'test-item success';
            
            // Запускаем остальные тесты
            testTouchSupport();
            testES6Modules();
            testWebGL();
            testScreenSize();
            
            console.log('📱 Mobile Test Results:', {
                platform,
                touchSupport: 'ontouchstart' in window,
                es6Modules: 'noModule' in HTMLScriptElement.prototype,
                webGL: !!(window.WebGLRenderingContext),
                screenSize: \`\${window.innerWidth}x\${window.innerHeight}\`,
                pixelRatio: window.devicePixelRatio,
                userAgent: navigator.userAgent
            });
        }

        // Автозапуск при загрузке
        document.addEventListener('DOMContentLoaded', runTests);
    </script>
</body>
</html>`;
    
    fs.writeFileSync(mobileTestPath, mobileTestHtml);
    console.log('✅ Создан тест мобильной совместимости (mobile-test.html)');
}

function logBuildStats(result, sitemapPath, testResults) {
    console.log('\\n🎉 Galaxy Explorer built successfully!');
    console.log('📊 Статистика сборки:');
    console.log('├── 🌌 Галактика:', result.name);
    
    Object.entries(result.stats.entities).forEach(([type, count]) => {
        if (count > 0) {
            const icons = { galaxy: '⭐', planet: '🪐', moon: '🌙', asteroid: '☄️', debris: '🛰️' };
            console.log(`├── ${icons[type] || '📁'} ${type}: ${count}`);
        }
    });
    
    console.log(`├── 📄 Файлов просканировано: ${result.stats.filesScanned}`);
    console.log(`├── ⏱️  Время сканирования: ${result.scanDuration}ms`);
    
    if (testResults) {
        const passed = testResults.results.filter(r => r.exists).length;
        const total = testResults.results.length;
        console.log(`├── 🧪 Модули: ${passed}/${total} прошли проверку`);
        console.log(`├── 🎯 Статус: ${testResults.allPassed ? '✅ Все модули на месте' : '❌ Некоторые модули отсутствуют'}`);
    }
    
    console.log('🌐 Доступные URL:');
    console.log('├── 🏠 Главное приложение:', `${BUILD_CONFIG.BASE_URL}/`);
    console.log('├── 🧪 Тест модулей:', `${BUILD_CONFIG.BASE_URL}/module-test.html`);
    console.log('├── 📱 Тест мобильной:', `${BUILD_CONFIG.BASE_URL}/mobile-test.html`);
    console.log('├── 📊 Структура:', `${BUILD_CONFIG.BASE_URL}/galaxy-structure.html`);
    console.log('├── 🌌 Галактика:', `${BUILD_CONFIG.BASE_URL}/galaxy.html`);
    console.log('└── 🎯 Sitemap:', `${BUILD_CONFIG.BASE_URL}/results/sitemap.json`);
    
    console.log('\\n🚀 Сборка завершена! Приложение готово к использованию.');
}
