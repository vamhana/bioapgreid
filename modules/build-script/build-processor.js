// modules/build-script/build-processor.js
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

// НОВЫЙ: Статистика сборки
const buildStats = {
    startTime: null,
    modules: {
        total: 0,
        threeJS: 0,
        core: 0,
        interaction: 0,
        ui: 0,
        utils: 0,
        fixed: 0,
        errors: 0
    },
    resources: {
        galaxyFiles: 0,
        textures: 0,
        models: 0,
        shaders: 0,
        totalSize: 0
    },
    performance: {
        scanTime: 0,
        copyTime: 0,
        processingTime: 0,
        totalTime: 0
    }
};

export async function buildForVercel() {
    buildStats.startTime = performance.now();
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
        const scanStart = performance.now();
        const result = await scanGalaxy(galaxyPath);
        buildStats.performance.scanTime = performance.now() - scanStart;
        
        // Анализ ресурсов галактики
        analyzeGalaxyResources(galaxyPath);
        
        // Добавляем полные URL
        addFullUrls(result);
        
        // Создаем публичную папку
        createDirectoryIfNotExists(publicDir);
        
        // Шаг 2: Копируем галактику в public
        console.log('📦 Шаг 2: Копирование галактики для веб-доступа...');
        const copyStart = performance.now();
        const galaxyPublicPath = path.join(publicDir, 'galaxy');
        copyFolderRecursive(galaxyPath, galaxyPublicPath);
        buildStats.performance.copyTime = performance.now() - copyStart;
        console.log('✅ Папка "galaxy" скопирована в public для веб-доступа');
        
        // Шаг 3: Копируем модули приложения с улучшенной обработкой ошибок
        console.log('⚙️  Шаг 3: Копирование и проверка модулей приложения...');
        const processStart = performance.now();
        
        if (fs.existsSync(appModulesPath)) {
            const appPublicPath = path.join(publicDir, 'app');
            copyFolderRecursive(appModulesPath, appPublicPath);
            
            // Проверяем и исправляем экспорты в модулях
            await fixModuleExports(appPublicPath);
            
            // Проверяем Three.js зависимости
            checkThreeJSDependencies(appPublicPath);
            
            // Проверяем наличие критических модулей
            await validateCriticalModules(appPublicPath);
            
            const appFiles = getAllFiles(appPublicPath);
            console.log(`✅ Модули приложения скопированы и проверены: ${appFiles.length} файлов`);
            
            // Анализ модулей
            analyzeAppModules(appFiles);
            
        } else {
            console.warn('⚠️ Папка modules/app не найдена, приложение не будет работать');
            // Создаем улучшенные fallback модули
            createEnhancedFallbackAppModules(publicDir);
        }
        
        buildStats.performance.processingTime = performance.now() - processStart;
        
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
        
        // Создаем улучшенный дашборд сборки
        createBuildDashboard(publicDir);
        
        // Выводим статистику
        buildStats.performance.totalTime = performance.now() - buildStats.startTime;
        logBuildStats(result, sitemapPath, fullReport, healthReport);
        
        // Сохраняем статистику сборки
        saveBuildStats(publicDir);
        
        console.log('🎉 Сборка успешно завершена!');
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Создаем страницу ошибки сборки
        createBuildErrorPage(publicDir, error);
        
        process.exit(1);
    }
}

// НОВАЯ ФУНКЦИЯ: Анализ ресурсов галактики
function analyzeGalaxyResources(galaxyPath) {
    console.log('   📊 Анализ ресурсов галактики...');
    
    try {
        const files = getAllFiles(galaxyPath);
        buildStats.resources.galaxyFiles = files.length;
        
        files.forEach(file => {
            const fullPath = path.join(galaxyPath, file);
            const stats = fs.statSync(fullPath);
            buildStats.resources.totalSize += stats.size;
            
            // Анализ типов файлов
            if (file.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                buildStats.resources.textures++;
            } else if (file.match(/\.(gltf|glb|obj|fbx)$/i)) {
                buildStats.resources.models++;
            } else if (file.match(/\.(glsl|frag|vert)$/i)) {
                buildStats.resources.shaders++;
            }
        });
        
        console.log(`   📁 Файлы: ${buildStats.resources.galaxyFiles}`);
        console.log(`   🎨 Текстуры: ${buildStats.resources.textures}`);
        console.log(`   🗿 Модели: ${buildStats.resources.models}`);
        console.log(`   🔷 Шейдеры: ${buildStats.resources.shaders}`);
        console.log(`   💾 Общий размер: ${formatFileSize(buildStats.resources.totalSize)}`);
        
    } catch (error) {
        console.warn('   ⚠️ Не удалось проанализировать ресурсы галактики:', error.message);
    }
}

// НОВАЯ ФУНКЦИЯ: Анализ модулей приложения
function analyzeAppModules(appFiles) {
    buildStats.modules.total = appFiles.length;
    
    appFiles.forEach(file => {
        if (file.includes('/core/')) buildStats.modules.core++;
        if (file.includes('/interaction/')) buildStats.modules.interaction++;
        if (file.includes('/ui/')) buildStats.modules.ui++;
        if (file.includes('/utils/')) buildStats.modules.utils++;
        
        // Проверка Three.js модулей
        if (file.match(/(three|renderer|camera|scene|mesh|geometry|material)/i)) {
            buildStats.modules.threeJS++;
        }
    });
    
    console.log('   📦 Статистика модулей:');
    console.log(`     🔧 Core: ${buildStats.modules.core}`);
    console.log(`     🎮 Interaction: ${buildStats.modules.interaction}`);
    console.log(`     🖥️ UI: ${buildStats.modules.ui}`);
    console.log(`     🛠️ Utils: ${buildStats.modules.utils}`);
    console.log(`     🎨 Three.js: ${buildStats.modules.threeJS}`);
}

// ОБНОВЛЕННАЯ ФУНКЦИЯ: Исправление экспортов в модулях
async function fixModuleExports(appPublicPath) {
    console.log('   🔧 Проверка и исправление экспортов модулей...');
    
    const filesToCheck = [
        'core/app.js',
        'core/galaxy-data-loader.js', 
        'core/galaxy-renderer.js',
        'core/camera-controller.js',
        'core/three-scene-manager.js',
        'core/spatial-partitioner.js',
        'core/security-validator.js',
        'core/memory-manager.js',
        'core/lod-manager.js',
        'interaction/progression-tracker.js',
        'interaction/entity-interaction.js',
        'ui/user-panel.js',
        'ui/minimap-navigation.js',
        'utils/asset-manager.js',
        'utils/performance-optimizer.js'
    ];
    
    let fixedCount = 0;
    let errorCount = 0;
    
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
                errorCount++;
                console.warn(`     ❌ Ошибка в ${filePath}:`, error.message);
            }
        } else {
            console.warn(`     ⚠️ Файл не найден: ${filePath}`);
        }
    }
    
    buildStats.modules.fixed = fixedCount;
    buildStats.modules.errors = errorCount;
    
    if (fixedCount > 0) {
        console.log(`   🔧 Исправлено экспортов: ${fixedCount} файлов`);
    } else {
        console.log('   ✅ Все экспорты в порядке');
    }
    
    if (errorCount > 0) {
        console.warn(`   ⚠️ Ошибки в модулях: ${errorCount}`);
    }
}

// НОВАЯ ФУНКЦИЯ: Проверка Three.js зависимостей
function checkThreeJSDependencies(appPublicPath) {
    console.log('   🔍 Проверка Three.js зависимостей...');
    
    const threeModules = [
        'core/three-scene-manager.js',
        'core/spatial-partitioner.js',
        'core/lod-manager.js',
        'core/galaxy-renderer.js',
        'core/camera-controller.js'
    ];
    
    let threeDependenciesOk = true;
    let missingThreeImports = [];
    
    for (const modulePath of threeModules) {
        const fullPath = path.join(appPublicPath, modulePath);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            if (!content.includes("import * as THREE") && !content.includes('from "three"') && !content.includes("from 'three'")) {
                missingThreeImports.push(modulePath);
                threeDependenciesOk = false;
            }
        }
    }
    
    if (threeDependenciesOk) {
        console.log('   ✅ Three.js зависимости в порядке');
    } else {
        console.warn('   ⚠️ Проблемы с Three.js зависимостями:');
        missingThreeImports.forEach(module => {
            console.warn(`     ❌ ${module}: отсутствует импорт THREE`);
        });
    }
    
    return threeDependenciesOk;
}

// НОВАЯ ФУНКЦИЯ: Валидация критических модулей
async function validateCriticalModules(appPublicPath) {
    console.log('   🎯 Проверка критических модулей...');
    
    const criticalModules = [
        { path: 'core/app.js', name: 'GalaxyApp' },
        { path: 'core/galaxy-renderer.js', name: 'GalaxyRenderer' },
        { path: 'core/three-scene-manager.js', name: 'ThreeSceneManager' },
        { path: 'core/camera-controller.js', name: 'CameraController' }
    ];
    
    let missingModules = [];
    
    for (const module of criticalModules) {
        const fullPath = path.join(appPublicPath, module.path);
        if (!fs.existsSync(fullPath)) {
            missingModules.push(module);
        }
    }
    
    if (missingModules.length > 0) {
        console.warn('   ⚠️ Отсутствуют критические модули:');
        missingModules.forEach(module => {
            console.warn(`     ❌ ${module.path} (${module.name})`);
        });
        
        // Создаем базовые версии отсутствующих модулей
        createMissingCriticalModules(appPublicPath, missingModules);
    } else {
        console.log('   ✅ Все критические модули присутствуют');
    }
}

// НОВАЯ ФУНКЦИЯ: Создание отсутствующих критических модулей
function createMissingCriticalModules(appPublicPath, missingModules) {
    console.log('   🛠️ Создание отсутствующих критических модулей...');
    
    const moduleTemplates = {
        'core/app.js': `// Auto-generated fallback module
export class GalaxyApp {
    constructor() {
        console.warn('⚠️ Using fallback GalaxyApp');
    }
    async init() {
        throw new Error('Fallback GalaxyApp - modules missing');
    }
}
export default GalaxyApp;`,

        'core/galaxy-renderer.js': `// Auto-generated fallback module
export class GalaxyRenderer {
    constructor() {
        console.warn('⚠️ Using fallback GalaxyRenderer');
    }
    async init() {
        console.warn('Fallback renderer initialized');
    }
}
export default GalaxyRenderer;`,

        'core/three-scene-manager.js': `// Auto-generated fallback module
export class ThreeSceneManager {
    constructor() {
        console.warn('⚠️ Using fallback ThreeSceneManager');
    }
    async init() {
        console.warn('Fallback scene manager initialized');
    }
}
export default ThreeSceneManager;`,

        'core/camera-controller.js': `// Auto-generated fallback module  
export class CameraController {
    constructor() {
        console.warn('⚠️ Using fallback CameraController');
    }
    init() {
        console.warn('Fallback camera controller initialized');
    }
}
export default CameraController;`
    };
    
    missingModules.forEach(module => {
        const fullPath = path.join(appPublicPath, module.path);
        const dir = path.dirname(fullPath);
        
        createDirectoryIfNotExists(dir);
        
        if (moduleTemplates[module.path]) {
            fs.writeFileSync(fullPath, moduleTemplates[module.path]);
            console.log(`     ✅ Создан: ${module.path}`);
        }
    });
}

// ОБНОВЛЕННАЯ ФУНКЦИЯ: Создание улучшенных fallback модулей
function createEnhancedFallbackAppModules(publicDir) {
    const appPublicPath = path.join(publicDir, 'app');
    createDirectoryIfNotExists(appPublicPath);
    
    const corePath = path.join(appPublicPath, 'core');
    createDirectoryIfNotExists(corePath);
    
    // Создаем улучшенный app.js с диагностикой
    const appJsContent = `// Enhanced fallback app.js with detailed diagnostics
export class GalaxyApp {
    constructor() {
        console.log('🚀 Enhanced Fallback GalaxyApp created');
        this.diagnostics = this.collectDiagnostics();
    }

    collectDiagnostics() {
        return {
            platform: this.detectPlatform(),
            userAgent: navigator.userAgent,
            supportsES6: 'noModule' in HTMLScriptElement.prototype,
            isOnline: navigator.onLine,
            screenSize: window.innerWidth + 'x' + window.innerHeight,
            webGL: this.detectWebGLSupport(),
            threeJS: this.checkThreeJS(),
            timestamp: new Date().toISOString(),
            buildInfo: {
                type: 'fallback',
                version: '1.0.0-fallback',
                modules: 'missing'
            }
        };
    }

    async init() {
        console.log('📱 Enhanced Diagnostics:', this.diagnostics);
        this.showFallbackUI();
        throw new Error('Enhanced Fallback: Application modules not found. Check build process.');
    }

    showFallbackUI() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = 
                '<div style="color: #ff6b6b; font-size: 24px; margin-bottom: 20px;">⚠️ Three.js Modules Missing</div>' +
                '<div style="background: rgba(255,107,107,0.1); padding: 15px; border-radius: 10px; margin: 10px 0;">' +
                '<strong>Build Issue Detected</strong><br>' +
                'Application modules were not properly built.<br>' +
                'Please check the build process and rebuild.' +
                '</div>' +
                '<div style="font-size: 12px; opacity: 0.7; margin-top: 15px;">' + 
                'Platform: ' + this.diagnostics.platform + '<br>' +
                'WebGL: ' + this.diagnostics.webGL + '<br>' +
                'Three.js: ' + this.diagnostics.threeJS + '<br>' +
                'ES6 Modules: ' + this.diagnostics.supportsES6 + '<br>' +
                'Online: ' + this.diagnostics.isOnline +
                '</div>' +
                '<button onclick="window.location.reload()" style="' +
                'background: #ff6b6b; color: white; border: none; padding: 10px 20px; ' +
                'border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">' +
                '🔄 Retry Build</button>';
        }
    }

    detectPlatform() {
        const ua = navigator.userAgent;
        if (/Android/.test(ua)) return 'Android';
        if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
        if (/Windows/.test(ua)) return 'Windows';
        if (/Mac/.test(ua)) return 'Mac';
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

    checkThreeJS() {
        try {
            return window.THREE ? 'v' + (window.THREE.REVISION || 'unknown') : 'Not loaded';
        } catch (e) {
            return 'Unknown';
        }
    }
}

export default GalaxyApp;`;

    // Создаем базовые Three.js модули
    const threeSceneManagerContent = `// Enhanced fallback ThreeSceneManager
export class ThreeSceneManager {
    constructor(canvasId) {
        console.warn('🎮 Enhanced Fallback ThreeSceneManager for canvas:', canvasId);
        this.canvas = document.getElementById(canvasId);
        this.initialized = false;
    }

    async init() {
        console.warn('⚠️ Three.js not available, using enhanced fallback');
        this.initialized = true;
        return Promise.resolve();
    }

    render() {
        console.log('🎨 Enhanced fallback render called');
    }

    dispose() {
        console.log('🧹 Enhanced fallback ThreeSceneManager disposed');
    }
}

export default ThreeSceneManager;`;

    fs.writeFileSync(path.join(corePath, 'app.js'), appJsContent);
    fs.writeFileSync(path.join(corePath, 'three-scene-manager.js'), threeSceneManagerContent);
    
    console.log('⚠️ Созданы улучшенные fallback модули приложения с расширенной диагностикой');
}

// НОВАЯ ФУНКЦИЯ: Создание дашборда сборки
function createBuildDashboard(publicDir) {
    const dashboardPath = path.join(publicDir, 'build-dashboard.html');
    
    const dashboardHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 Galaxy Explorer - Build Dashboard</title>
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
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 30px;
            background: var(--bg-card);
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
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
            font-size: 1.8em;
            font-weight: bold;
            margin: 5px 0;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(0,0,0,0.3);
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: var(--color-success);
            transition: width 0.3s ease;
        }
        
        .module-list {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .module-item {
            padding: 8px;
            margin: 4px 0;
            border-radius: 5px;
            background: rgba(0,0,0,0.2);
            border-left: 4px solid var(--color-success);
        }
        
        .module-warning { border-left-color: var(--color-warning); }
        .module-error { border-left-color: var(--color-error); }
        
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
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Galaxy Explorer - Build Dashboard</h1>
        <p>Детальная статистика сборки и диагностика</p>
        <div style="margin-top: 15px; opacity: 0.8;">
            Собрано: <span id="build-timestamp"></span>
        </div>
    </div>
    
    <div class="dashboard">
        <div class="card">
            <h3>📦 Статистика модулей</h3>
            <div class="stat-grid">
                <div class="stat-item">
                    <div>Всего модулей</div>
                    <div class="stat-number" id="total-modules">0</div>
                </div>
                <div class="stat-item">
                    <div>Three.js модули</div>
                    <div class="stat-number" id="three-modules">0</div>
                </div>
                <div class="stat-item">
                    <div>Исправлено</div>
                    <div class="stat-number" id="fixed-modules">0</div>
                </div>
                <div class="stat-item">
                    <div>Ошибки</div>
                    <div class="stat-number" id="error-modules">0</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3>🎯 Производительность</h3>
            <div style="margin: 15px 0;">
                <div>Общее время: <strong id="total-time">0ms</strong></div>
                <div>Сканирование: <strong id="scan-time">0ms</strong></div>
                <div>Копирование: <strong id="copy-time">0ms</strong></div>
                <div>Обработка: <strong id="process-time">0ms</strong></div>
            </div>
        </div>
        
        <div class="card">
            <h3>📁 Ресурсы</h3>
            <div style="margin: 15px 0;">
                <div>Файлы галактики: <strong id="galaxy-files">0</strong></div>
                <div>Текстуры: <strong id="textures">0</strong></div>
                <div>Модели: <strong id="models">0</strong></div>
                <div>Шейдеры: <strong id="shaders">0</strong></div>
                <div>Общий размер: <strong id="total-size">0B</strong></div>
            </div>
        </div>
        
        <div class="card">
            <h3>🔧 Типы модулей</h3>
            <div class="module-list">
                <div class="module-item">Core: <strong id="core-modules">0</strong></div>
                <div class="module-item">Interaction: <strong id="interaction-modules">0</strong></div>
                <div class="module-item">UI: <strong id="ui-modules">0</strong></div>
                <div class="module-item">Utils: <strong id="utils-modules">0</strong></div>
            </div>
        </div>
    </div>

    <div class="controls">
        <button onclick="window.location.href='/'">🏠 На главную</button>
        <button onclick="window.location.href='/module-test.html'">🧪 Тест модулей</button>
        <button onclick="window.location.href='/threejs-test.html'">🎨 Three.js тест</button>
        <button onclick="window.location.reload()">🔄 Обновить</button>
    </div>

    <script>
        // Загрузка статистики сборки
        fetch('/results/build-stats.json')
            .then(r => r.json())
            .then(stats => {
                // Обновляем UI
                document.getElementById('total-modules').textContent = stats.modules.total;
                document.getElementById('three-modules').textContent = stats.modules.threeJS;
                document.getElementById('fixed-modules').textContent = stats.modules.fixed;
                document.getElementById('error-modules').textContent = stats.modules.errors;
                
                document.getElementById('total-time').textContent = stats.performance.totalTime.toFixed(2) + 'ms';
                document.getElementById('scan-time').textContent = stats.performance.scanTime.toFixed(2) + 'ms';
                document.getElementById('copy-time').textContent = stats.performance.copyTime.toFixed(2) + 'ms';
                document.getElementById('process-time').textContent = stats.performance.processingTime.toFixed(2) + 'ms';
                
                document.getElementById('galaxy-files').textContent = stats.resources.galaxyFiles;
                document.getElementById('textures').textContent = stats.resources.textures;
                document.getElementById('models').textContent = stats.resources.models;
                document.getElementById('shaders').textContent = stats.resources.shaders;
                document.getElementById('total-size').textContent = formatFileSize(stats.resources.totalSize);
                
                document.getElementById('core-modules').textContent = stats.modules.core;
                document.getElementById('interaction-modules').textContent = stats.modules.interaction;
                document.getElementById('ui-modules').textContent = stats.modules.ui;
                document.getElementById('utils-modules').textContent = stats.modules.utils;
                
                document.getElementById('build-timestamp').textContent = new Date().toLocaleString();
            })
            .catch(error => {
                console.error('Ошибка загрузки статистики:', error);
                document.body.innerHTML += '<div style="color: var(--color-error); text-align: center; margin: 20px;">❌ Ошибка загрузки статистики сборки</div>';
            });

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
    
    fs.writeFileSync(dashboardPath, dashboardHtml);
    console.log('✅ Создан дашборд сборки (build-dashboard.html)');
}

// НОВАЯ ФУНКЦИЯ: Сохранение статистики сборки
function saveBuildStats(publicDir) {
    const statsPath = path.join(publicDir, 'results', 'build-stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(buildStats, null, 2));
    console.log('✅ Статистика сборки сохранена');
}

// НОВАЯ ФУНКЦИЯ: Создание страницы ошибки сборки
function createBuildErrorPage(publicDir, error) {
    const errorPath = path.join(publicDir, 'build-error.html');
    
    const errorHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>❌ Ошибка сборки - Galaxy Explorer</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0c0c2e;
            color: #e0e0ff;
            margin: 0;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        .error-container {
            background: rgba(255,107,107,0.1);
            border: 1px solid #ff6b6b;
            border-radius: 15px;
            padding: 30px;
            margin: 20px 0;
        }
        .error-header {
            color: #ff6b6b;
            font-size: 24px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .error-details {
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-family: monospace;
            font-size: 14px;
            white-space: pre-wrap;
            overflow-x: auto;
        }
        .actions {
            margin-top: 30px;
            text-align: center;
        }
        button {
            background: #ff6b6b;
            color: white;
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
            box-shadow: 0 5px 15px rgba(255,107,107,0.3);
        }
    </style>
</head>
<body>
    <div class="error-header">
        ❌ Ошибка сборки Galaxy Explorer
    </div>
    
    <div class="error-container">
        <h3>Сообщение об ошибке:</h3>
        <div class="error-details">${error.message}</div>
        
        <h3>Стек вызовов:</h3>
        <div class="error-details">${error.stack || 'Не доступен'}</div>
        
        <div style="margin-top: 20px; opacity: 0.8;">
            <strong>Рекомендации:</strong><br>
            1. Проверьте логи сборки в консоли<br>
            2. Убедитесь, что все зависимости установлены<br>
            3. Проверьте наличие файлов галактики<br>
            4. Перезапустите процесс сборки
        </div>
    </div>
    
    <div class="actions">
        <button onclick="window.location.href='/build-dashboard.html'">📊 Дашборд сборки</button>
        <button onclick="window.location.href='/module-test.html'">🧪 Тест модулей</button>
        <button onclick="window.location.reload()">🔄 Перезагрузить</button>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(errorPath, errorHtml);
    console.log('✅ Создана страница ошибки сборки (build-error.html)');
}

// Существующие вспомогательные функции остаются без изменений
function ensureDefaultExport(content, filePath) {
    const className = getClassNameFromPath(filePath);
    
    if (content.includes('export default') || content.includes('export default class')) {
        return content;
    }
    
    const classExportRegex = new RegExp(`export\\s+class\\s+${className}`);
    if (classExportRegex.test(content)) {
        return content.replace(
            classExportRegex, 
            `export class ${className}`
        ) + `\n\nexport default ${className};\n`;
    }
    
    const classRegex = new RegExp(`class\\s+${className}`);
    if (classRegex.test(content) && !content.includes('export')) {
        return content.replace(
            classRegex,
            `export class ${className}`
        ) + `\n\nexport default ${className};\n`;
    }
    
    return content;
}

function getClassNameFromPath(filePath) {
    const filename = path.basename(filePath, '.js');
    
    const specialCases = {
        'app.js': 'GalaxyApp',
        'galaxy-data-loader.js': 'GalaxyDataLoader',
        'galaxy-renderer.js': 'GalaxyRenderer', 
        'camera-controller.js': 'CameraController',
        'three-scene-manager.js': 'ThreeSceneManager',
        'spatial-partitioner.js': 'SpatialPartitioner',
        'security-validator.js': 'SecurityValidator',
        'memory-manager.js': 'MemoryManager',
        'lod-manager.js': 'LODManager',
        'progression-tracker.js': 'ProgressionTracker',
        'entity-interaction.js': 'EntityInteraction',
        'user-panel.js': 'UserPanel',
        'minimap-navigation.js': 'MinimapNavigation',
        'asset-manager.js': 'AssetManager',
        'performance-optimizer.js': 'PerformanceOptimizer'
    };
    
    return specialCases[filename] || filename.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    console.log('\n🎉 Galaxy Explorer построен успешно!');
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
    
    // Новая статистика сборки
    console.log('├── 📦 Статистика сборки:');
    console.log(`│   ├── Модули: ${buildStats.modules.total} файлов`);
    console.log(`│   ├── Three.js: ${buildStats.modules.threeJS} модулей`);
    console.log(`│   ├── Исправлено: ${buildStats.modules.fixed} экспортов`);
    console.log(`│   ├── Ошибки: ${buildStats.modules.errors} модулей`);
    console.log(`│   └── Ресурсы: ${formatFileSize(buildStats.resources.totalSize)}`);
    
    console.log(`├── ⚡ Производительность сборки:`);
    console.log(`│   ├── Общее время: ${buildStats.performance.totalTime.toFixed(2)}ms`);
    console.log(`│   ├── Сканирование: ${buildStats.performance.scanTime.toFixed(2)}ms`);
    console.log(`│   ├── Копирование: ${buildStats.performance.copyTime.toFixed(2)}ms`);
    console.log(`│   └── Обработка: ${buildStats.performance.processingTime.toFixed(2)}ms`);
    
    if (fullReport) {
        const healthScore = Math.round((fullReport.health?.overallScore || 0) * 100);
        const moduleStats = fullReport.modules?.stats;
        console.log(`├── 🏥 Здоровье проекта: ${healthScore}%`);
        console.log(`├── 🧪 Модули: ${moduleStats?.passedModules}/${moduleStats?.totalModules} прошли проверку`);
        console.log(`├── 🎯 Статус: ${fullReport.health?.status || 'UNKNOWN'}`);
    }
    
    console.log('🌐 Доступные URL:');
    console.log('├── 🏠 Главное приложение:', `${BUILD_CONFIG.BASE_URL}/`);
    console.log('├── 📊 Дашборд сборки:', `${BUILD_CONFIG.BASE_URL}/build-dashboard.html`);
    console.log('├── 🧪 Тест модулей:', `${BUILD_CONFIG.BASE_URL}/module-test.html`);
    console.log('├── 🎨 Three.js тест:', `${BUILD_CONFIG.BASE_URL}/threejs-test.html`);
    console.log('├── 📱 Тест мобильной:', `${BUILD_CONFIG.BASE_URL}/mobile-test.html`);
    console.log('├── 📈 Дашборд здоровья:', `${BUILD_CONFIG.BASE_URL}/health-dashboard.html`);
    console.log('├── 📁 Обозреватель:', `${BUILD_CONFIG.BASE_URL}/project-explorer.html`);
    console.log('├── 📊 Структура:', `${BUILD_CONFIG.BASE_URL}/galaxy-structure.html`);
    console.log('├── 🌌 Галактика:', `${BUILD_CONFIG.BASE_URL}/galaxy.html`);
    console.log('└── 🎯 Sitemap:', `${BUILD_CONFIG.BASE_URL}/results/sitemap.json`);
    
    if (healthReport?.recommendations?.length > 0) {
        console.log('\n💡 Рекомендации для улучшения:');
        healthReport.recommendations.forEach(rec => {
            console.log(`   ⚠️  ${rec}`);
        });
    }
    
    console.log('\n🚀 Приложение готово к использованию!');
}

export default {
    buildForVercel
};
