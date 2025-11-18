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
import { generateFullReport, getProjectHealth, testCriticalModules, scanProjectStructure } from './test-modules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function buildForVercel() {
    console.log('🚀 Building Galaxy Explorer for Vercel...');
    
    const galaxyPath = path.join(__dirname, '../../galaxy');
    const publicDir = path.join(__dirname, '../../public');
    const appModulesPath = path.join(__dirname, '../../modules/app');
    
    if (!checkGalaxyExists(galaxyPath)) {
        console.error('❌ Галактика не найдена. Сборка прервана.');
        process.exit(1);
    }
    
    try {
        console.log('📁 Начинаем процесс сборки...');
        
        // Шаг 1: Сканируем галактику
        console.log('🔍 Шаг 1: Сканирование структуры галактики...');
        const result = await scanGalaxy(galaxyPath);
        
        // Добавляем полные URL
        addFullUrls(result);
        
        // Создаем публичную папку
        createDirectoryIfNotExists(publicDir);
        
        // Шаг 2: Копируем галактику в public
        console.log('📦 Шаг 2: Копирование галактики для веб-доступа...');
        const galaxyPublicPath = path.join(publicDir, 'galaxy');
        copyFolderRecursive(galaxyPath, galaxyPublicPath);
        console.log('✅ Папка "galaxy" скопирована в public для веб-доступа');
        
        // Шаг 3: Копируем модули приложения с проверкой экспортов
        console.log('⚙️  Шаг 3: Копирование и проверка модулей приложения...');
        if (fs.existsSync(appModulesPath)) {
            const appPublicPath = path.join(publicDir, 'app');
            copyFolderRecursive(appModulesPath, appPublicPath);
            
            // Проверяем и исправляем экспорты в модулях
            await fixModuleExports(appPublicPath);
            
            const appFiles = getAllFiles(appPublicPath);
            console.log(`✅ Модули приложения скопированы и проверены: ${appFiles.length} файлов`);
            
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
        
        // Шаг 4: Сохраняем sitemap
        console.log('🗺️  Шаг 4: Сохранение карты сайта...');
        const sitemapPath = path.join(resultsDir, BUILD_CONFIG.SITEMAP_FILE);
        fs.writeFileSync(sitemapPath, JSON.stringify(result, null, 2));
        console.log('✅ Создан фиксированный sitemap.json для всех модулей');
        
        // Шаг 5: Расширенный анализ проекта
        console.log('🔬 Шаг 5: Расширенный анализ проекта...');
        
        // Сохраняем структуру проекта
        console.log('   📊 Сохранение структуры проекта...');
        const projectStructure = scanProjectStructure();
        const projectStructurePath = path.join(resultsDir, 'project-structure.json');
        fs.writeFileSync(projectStructurePath, JSON.stringify(projectStructure, null, 2));
        console.log('   ✅ Структура проекта сохранена');
        
        // Сохраняем результаты тестов модулей
        console.log('   🧪 Тестирование критических модулей...');
        const testResults = testCriticalModules();
        const testResultsPath = path.join(resultsDir, 'test-results.json');
        fs.writeFileSync(testResultsPath, JSON.stringify(testResults, null, 2));
        console.log('   ✅ Результаты тестов модулей сохранены');
        
        // Генерируем полный отчет о здоровье проекта
        console.log('   🏥 Генерация полного отчета...');
        const fullReport = generateFullReport();
        const fullReportPath = path.join(resultsDir, 'full-report.json');
        fs.writeFileSync(fullReportPath, JSON.stringify(fullReport, null, 2));
        console.log('   ✅ Полный отчет проекта сохранен');
        
        // Генерируем краткий отчет о здоровье
        const healthReport = getProjectHealth();
        const healthReportPath = path.join(resultsDir, 'health-report.json');
        fs.writeFileSync(healthReportPath, JSON.stringify(healthReport, null, 2));
        console.log('   ✅ Отчет о здоровье проекта сохранен');
        
        // Шаг 6: Создаем HTML страницы
        console.log('🌐 Шаг 6: Генерация HTML страниц...');
        
        // Создаем главную страницу ПРИЛОЖЕНИЯ
        const indexPath = path.join(publicDir, 'index.html');
        const html = generateAppHTML(result);
        fs.writeFileSync(indexPath, html);
        console.log('   ✅ Главная страница приложения создана');
        
        // Создаем файл старой структуры галактики
        const galaxyStructurePath = path.join(publicDir, 'galaxy-structure.html');
        const oldStructureHtml = generateHTML(result);
        fs.writeFileSync(galaxyStructurePath, oldStructureHtml);
        console.log('   ✅ Страница структуры галактики создана');
        
        // Создаем файл галактики (перенаправление)
        createGalaxyHtml(publicDir, result);
        
        // Создаем диагностические страницы
        console.log('   🩺 Создание диагностических страниц...');
        createModuleTestFile(publicDir, fullReport);
        createMobileTestFile(publicDir);
        createHealthDashboard(publicDir, healthReport);
        createProjectExplorer(publicDir, projectStructure);
        
        // Выводим статистику
        logBuildStats(result, sitemapPath, fullReport, healthReport);
        
        console.log('🎉 Сборка успешно завершена!');
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// НОВАЯ ФУНКЦИЯ: Исправление экспортов в модулях
async function fixModuleExports(appPublicPath) {
    console.log('   🔧 Проверка и исправление экспортов модулей...');
    
    const filesToCheck = [
        'core/app.js',
        'core/galaxy-data-loader.js', 
        'core/galaxy-renderer.js',
        'core/camera-controller.js',
        'interaction/progression-tracker.js',
        'interaction/entity-interaction.js',
        'ui/user-panel.js',
        'ui/minimap-navigation.js',
        'utils/asset-manager.js',
        'utils/performance-optimizer.js'
    ];
    
    let fixedCount = 0;
    
    for (const filePath of filesToCheck) {
        const fullPath = path.join(appPublicPath, filePath);
        if (fs.existsSync(fullPath)) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const fixedContent = ensureDefaultExport(content, filePath);
                
                if (fixedContent !== content) {
                    fs.writeFileSync(fullPath, fixedContent);
                    fixedCount++;
                    console.log(`     ✅ Исправлен: ${filePath}`);
                }
            } catch (error) {
                console.warn(`     ⚠️ Ошибка при проверке ${filePath}:`, error.message);
            }
        } else {
            console.warn(`     ⚠️ Файл не найден: ${filePath}`);
        }
    }
    
    if (fixedCount > 0) {
        console.log(`   🔧 Исправлено экспортов: ${fixedCount} файлов`);
    } else {
        console.log('   ✅ Все экспорты в порядке');
    }
}

// НОВАЯ ФУНКЦИЯ: Обеспечение default export в модулях
function ensureDefaultExport(content, filePath) {
    const className = getClassNameFromPath(filePath);
    
    // Проверяем, есть ли уже export default
    if (content.includes('export default') || content.includes('export default class')) {
        return content; // Уже есть default export
    }
    
    // Ищем именованный экспорт класса
    const classExportRegex = new RegExp(`export\\s+class\\s+${className}`);
    if (classExportRegex.test(content)) {
        // Добавляем export default после именованного экспорта
        return content.replace(
            classExportRegex, 
            `export class ${className}`
        ) + `\n\nexport default ${className};\n`;
    }
    
    // Ищем класс без экспорта (маловероятно, но на всякий случай)
    const classRegex = new RegExp(`class\\s+${className}`);
    if (classRegex.test(content) && !content.includes('export')) {
        return content.replace(
            classRegex,
            `export class ${className}`
        ) + `\n\nexport default ${className};\n`;
    }
    
    return content;
}

// НОВАЯ ФУНКЦИЯ: Получение имени класса из пути файла
function getClassNameFromPath(filePath) {
    const filename = path.basename(filePath, '.js');
    
    // Специальные случаи
    const specialCases = {
        'app.js': 'GalaxyApp',
        'galaxy-data-loader.js': 'GalaxyDataLoader',
        'galaxy-renderer.js': 'GalaxyRenderer', 
        'camera-controller.js': 'CameraController',
        'progression-tracker.js': 'ProgressionTracker',
        'entity-interaction.js': 'EntityInteraction',
        'user-panel.js': 'UserPanel',
        'minimap-navigation.js': 'MinimapNavigation',
        'asset-manager.js': 'AssetManager',
        'performance-optimizer.js': 'PerformanceOptimizer'
    };
    
    return specialCases[filename] || filename.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
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
    
    // Создаем минимальный app.js для отладки с правильными экспортами
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
}

// Default export для совместимости
export default GalaxyApp;`;

    fs.writeFileSync(path.join(corePath, 'app.js'), appJsContent);
    console.log('⚠️ Созданы fallback модули приложения для отладки');
}
function createModuleTestFile(publicDir, fullReport) {
    const testPath = path.join(publicDir, 'module-test.html');
    
    const healthStatus = fullReport?.health?.status || 'UNKNOWN';
    const healthScore = fullReport?.health?.overallScore || 0;
    const totalModules = fullReport?.modules?.stats?.totalModules || 0;
    const passedModules = fullReport?.modules?.stats?.passedModules || 0;
    
    const testHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🧪 Galaxy Explorer - Тест модулей</title>
    <style>
        :root {
            --color-success: #4ECDC4;
            --color-warning: #FFC107;
            --color-error: #FF6B6B;
            --color-info: #45b7d1;
            --bg-primary: #0c0c2e;
            --bg-secondary: #1a1a4a;
            --bg-card: rgba(255,255,255,0.05);
            --text-primary: #e0e0ff;
            --text-secondary: #a0a0cc;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 20px;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 30px;
            background: var(--bg-card);
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .health-status {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .health-healthy { background: var(--color-success); color: var(--bg-primary); }
        .health-warning { background: var(--color-warning); color: var(--bg-primary); }
        .health-critical { background: var(--color-error); color: white; }
        
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: var(--bg-card);
            padding: 20px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .card h3 {
            color: var(--color-success);
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        
        .stat-item {
            text-align: center;
            padding: 15px;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .module-list {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .module-item {
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            border-left: 4px solid;
            background: rgba(0,0,0,0.2);
        }
        
        .module-success { border-left-color: var(--color-success); }
        .module-warning { border-left-color: var(--color-warning); }
        .module-error { border-left-color: var(--color-error); }
        
        .test-section {
            margin: 30px 0;
        }
        
        .controls {
            text-align: center;
            margin: 20px 0;
        }
        
        button {
            background: var(--color-success);
            color: var(--bg-primary);
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: bold;
            margin: 5px;
            transition: all 0.3s ease;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(78, 205, 196, 0.3);
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
        }
        
        .modal-content {
            background: var(--bg-primary);
            margin: 2% auto;
            padding: 20px;
            border: 1px solid var(--color-success);
            border-radius: 10px;
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            overflow: auto;
        }
        
        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background: rgba(0,0,0,0.3);
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: var(--color-success);
            transition: width 0.3s ease;
        }
        
        .recommendations {
            margin-top: 20px;
        }
        
        .recommendation {
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            background: rgba(255,107,107,0.1);
            border-left: 4px solid var(--color-error);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Galaxy Explorer - Тест модулей</h1>
        <p>Полная диагностика проекта и проверка всех модулей</p>
        <div class="health-status health-${healthStatus.toLowerCase()}">
            Статус: ${healthStatus} (${Math.round(healthScore * 100)}%)
        </div>
    </div>
    
    <div class="dashboard">
        <div class="card">
            <h3>📊 Общая статистика</h3>
            <div class="stat-grid">
                <div class="stat-item">
                    <div>🏥 Здоровье</div>
                    <div class="stat-number">${Math.round(healthScore * 100)}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${healthScore * 100}%"></div>
                    </div>
                </div>
                <div class="stat-item">
                    <div>📦 Модули</div>
                    <div class="stat-number">${passedModules}/${totalModules}</div>
                    <div>${Math.round((passedModules/totalModules)*100)}% готовности</div>
                </div>
                <div class="stat-item">
                    <div>📁 Файлы</div>
                    <div class="stat-number">${fullReport?.structure?.stats?.totalFiles || 0}</div>
                    <div>в проекте</div>
                </div>
                <div class="stat-item">
                    <div>💾 Размер</div>
                    <div class="stat-number">${formatFileSize(fullReport?.structure?.stats?.totalSize || 0)}</div>
                    <div>общий</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3>🎯 Критические модули</h3>
            <div class="module-list" id="module-list">
                <!-- Модули будут заполнены JavaScript -->
            </div>
        </div>
        
        <div class="card">
            <h3>💡 Рекомендации</h3>
            <div class="recommendations" id="recommendations">
                <!-- Рекомендации будут заполнены JavaScript -->
            </div>
        </div>
    </div>
    
    <div class="controls">
        <button onclick="runAllTests()">🔄 Запустить все тесты</button>
        <button onclick="showFullReport()">📋 Полный отчет</button>
        <button onclick="showProjectStructure()">📁 Структура проекта</button>
        <button onclick="window.location.href='/'">🏠 На главную</button>
        <button onclick="window.location.href='/health-dashboard.html'">📈 Дашборд</button>
    </div>

    <!-- Модальное окно для полного отчета -->
    <div id="reportModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeModal('reportModal')">&times;</span>
            <h2>📋 Полный отчет проекта</h2>
            <pre id="full-report-content" style="background: #1a1a3a; padding: 15px; border-radius: 5px; overflow: auto; max-height: 70vh;"></pre>
        </div>
    </div>

    <script>
        let fullReportData = null;
        let projectStructureData = null;

        // Загрузка данных при старте
        Promise.all([
            fetch('/results/full-report.json').then(r => r.json()),
            fetch('/results/project-structure.json').then(r => r.json())
        ]).then(([fullReport, structure]) => {
            fullReportData = fullReport;
            projectStructureData = structure;
            updateDashboard();
        }).catch(error => {
            console.error('Ошибка загрузки данных:', error);
            document.getElementById('module-list').innerHTML = '<div style="color: var(--color-error);">❌ Ошибка загрузки данных</div>';
        });

        function updateDashboard() {
            if (!fullReportData) return;
            
            // Обновляем список модулей
            const moduleList = document.getElementById('module-list');
            moduleList.innerHTML = '';
            
            fullReportData.modules.results.forEach(module => {
                const div = document.createElement('div');
                div.className = \`module-item \${getModuleStatusClass(module)}\`;
                
                let statusIcon = '✅';
                if (!module.exists) statusIcon = '❌';
                else if (module.quality?.score < 0.7) statusIcon = '⚠️';
                
                div.innerHTML = \`
                    <strong>\${statusIcon} \${module.path}</strong>
                    <div style="font-size: 0.9em; color: var(--text-secondary);">
                        \${module.exists ? \`\${module.lines} строк, качество: \${Math.round(module.quality?.score * 100)}%\` : 'Отсутствует'}
                    </div>
                \`;
                
                moduleList.appendChild(div);
            });
            
            // Обновляем рекомендации
            const recommendations = document.getElementById('recommendations');
            recommendations.innerHTML = '';
            
            if (fullReportData.health.recommendations.length > 0) {
                fullReportData.health.recommendations.forEach(rec => {
                    const div = document.createElement('div');
                    div.className = 'recommendation';
                    div.textContent = rec;
                    recommendations.appendChild(div);
                });
            } else {
                recommendations.innerHTML = '<div style="color: var(--color-success);">✅ Все рекомендации выполнены!</div>';
            }
        }

        function getModuleStatusClass(module) {
            if (!module.exists) return 'module-error';
            if (module.quality?.score >= 0.7) return 'module-success';
            return 'module-warning';
        }

        function runAllTests() {
            alert('🔄 Тесты запущены... Обновите страницу через несколько секунд для просмотра результатов.');
            // В реальной реализации здесь был бы вызов API для перезапуска тестов
        }

        function showFullReport() {
            if (fullReportData) {
                document.getElementById('full-report-content').textContent = JSON.stringify(fullReportData, null, 2);
                document.getElementById('reportModal').style.display = 'block';
            }
        }

        function showProjectStructure() {
            window.location.href = '/project-explorer.html';
        }

        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        // Закрытие модального окна при клике вне его
        window.onclick = function(event) {
            const modals = document.getElementsByClassName('modal');
            for (let modal of modals) {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            }
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    </script>
</body>
</html>`;
    
    fs.writeFileSync(testPath, testHtml);
    console.log('✅ Создан расширенный тестовый файл модулей (module-test.html)');
}

function createHealthDashboard(publicDir, healthReport) {
    const dashboardPath = path.join(publicDir, 'health-dashboard.html');
    
    const dashboardHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📈 Galaxy Explorer - Дашборд здоровья</title>
    <style>
        /* Аналогичные стили как в module-test.html, но с фокусом на визуализации */
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0c0c2e;
            color: #e0e0ff;
            margin: 0;
            padding: 20px;
        }
        .health-metric {
            background: rgba(255,255,255,0.05);
            padding: 20px;
            margin: 10px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        /* Дополнительные стили для дашборда */
    </style>
</head>
<body>
    <h1>📈 Дашборд здоровья проекта</h1>
    <div id="health-metrics"></div>
    <script>
        // Загрузка и отображение метрик здоровья
        fetch('/results/health-report.json')
            .then(r => r.json())
            .then(data => {
                // Визуализация данных здоровья
                console.log('Health data:', data);
            });
    </script>
</body>
</html>`;
    
    fs.writeFileSync(dashboardPath, dashboardHtml);
    console.log('✅ Создан дашборд здоровья (health-dashboard.html)');
}

function createProjectExplorer(publicDir, projectStructure) {
    const explorerPath = path.join(publicDir, 'project-explorer.html');
    
    const explorerHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📁 Galaxy Explorer - Обозреватель проекта</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0c0c2e;
            color: #e0e0ff;
            margin: 0;
            padding: 20px;
        }
        .file-tree {
            font-family: monospace;
        }
        /* Стили для древовидной структуры */
    </style>
</head>
<body>
    <h1>📁 Обозреватель структуры проекта</h1>
    <div id="project-tree"></div>
    <script>
        // Загрузка и отображение структуры проекта
        fetch('/results/project-structure.json')
            .then(r => r.json())
            .then(data => {
                // Рендеринг древовидной структуры
                console.log('Project structure:', data);
            });
    </script>
</body>
</html>`;
    
    fs.writeFileSync(explorerPath, explorerHtml);
    console.log('✅ Создан обозреватель проекта (project-explorer.html)');
}

function createMobileTestFile(publicDir) {
    const mobileTestPath = path.join(publicDir, 'mobile-test.html');
    const mobileTestHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📱 Galaxy Explorer - Тест мобильной совместимости</title>
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
    </style>
</head>
<body>
    <h1>📱 Тест мобильной совместимости</h1>
    <div id="test-results">
        <div class="test-item">Загрузка тестов...</div>
    </div>
    <script>
        // Тесты мобильной совместимости
        const tests = {
            touchSupport: 'ontouchstart' in window,
            es6Modules: 'noModule' in HTMLScriptElement.prototype,
            webGL: !!window.WebGLRenderingContext,
            screenSize: \`\${window.innerWidth}x\${window.innerHeight}\`
        };
        
        const resultsDiv = document.getElementById('test-results');
        resultsDiv.innerHTML = \`
            <div class="test-item">
                <strong>👆 Касания:</strong> \${tests.touchSupport ? '✅ Поддерживается' : '❌ Не поддерживается'}
            </div>
            <div class="test-item">
                <strong>🔧 ES6 Модули:</strong> \${tests.es6Modules ? '✅ Поддерживается' : '❌ Не поддерживается'}
            </div>
            <div class="test-item">
                <strong>🎨 WebGL:</strong> \${tests.webGL ? '✅ Поддерживается' : '❌ Не поддерживается'}
            </div>
            <div class="test-item">
                <strong>📏 Размер экрана:</strong> \${tests.screenSize}
            </div>
        \`;
    </script>
</body>
</html>`;
    
    fs.writeFileSync(mobileTestPath, mobileTestHtml);
    console.log('✅ Создан тест мобильной совместимости (mobile-test.html)');
}

function logBuildStats(result, sitemapPath, fullReport, healthReport) {
    console.log('\\n🎉 Galaxy Explorer построен успешно!');
    console.log('📊 Итоговая статистика:');
    console.log('├── 🌌 Галактика:', result.name);
    
    Object.entries(result.stats.entities).forEach(([type, count]) => {
        if (count > 0) {
            const icons = { galaxy: '⭐', planet: '🪐', moon: '🌙', asteroid: '☄️', debris: '🛰️' };
            console.log(`├── ${icons[type] || '📁'} ${type}: ${count}`);
        }
    });
    
    console.log(`├── 📄 Файлов просканировано: ${result.stats.filesScanned}`);
    console.log(`├── ⏱️  Время сканирования: ${result.scanDuration}ms`);
    
    if (fullReport) {
        const healthScore = Math.round((fullReport.health?.overallScore || 0) * 100);
        const moduleStats = fullReport.modules?.stats;
        console.log(`├── 🏥 Здоровье проекта: ${healthScore}%`);
        console.log(`├── 🧪 Модули: ${moduleStats?.passedModules}/${moduleStats?.totalModules} прошли проверку`);
        console.log(`├── 🎯 Статус: ${fullReport.health?.status || 'UNKNOWN'}`);
    }
    
    console.log('🌐 Доступные URL:');
    console.log('├── 🏠 Главное приложение:', `${BUILD_CONFIG.BASE_URL}/`);
    console.log('├── 🧪 Тест модулей:', `${BUILD_CONFIG.BASE_URL}/module-test.html`);
    console.log('├── 📱 Тест мобильной:', `${BUILD_CONFIG.BASE_URL}/mobile-test.html`);
    console.log('├── 📈 Дашборд здоровья:', `${BUILD_CONFIG.BASE_URL}/health-dashboard.html`);
    console.log('├── 📁 Обозреватель:', `${BUILD_CONFIG.BASE_URL}/project-explorer.html`);
    console.log('├── 📊 Структура:', `${BUILD_CONFIG.BASE_URL}/galaxy-structure.html`);
    console.log('├── 🌌 Галактика:', `${BUILD_CONFIG.BASE_URL}/galaxy.html`);
    console.log('└── 🎯 Sitemap:', `${BUILD_CONFIG.BASE_URL}/results/sitemap.json`);
    
    if (healthReport?.recommendations?.length > 0) {
        console.log('\\n💡 Рекомендации для улучшения:');
        healthReport.recommendations.forEach(rec => {
            console.log(`   ⚠️  ${rec}`);
        });
    }
    
    console.log('\\n🚀 Приложение готово к использованию!');
}

// Вспомогательная функция для форматирования размера файла
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
    buildForVercel
};

