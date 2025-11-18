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

// Вспомогательная функция для сканирования галактики (вынесена для устранения циклической зависимости)
async function performGalaxyScan(galaxyPath) {
    try {
        const scanner = new GalaxyScanner(galaxyPath);
        const result = await scanner.scan();
        return result;
    } catch (error) {
        console.error('❌ Ошибка сканирования галактики:', error.message);
        throw error;
    }
}

export async function buildForVercel() {
    console.log('🚀 Building Galaxy Explorer for Vercel...');
    
    const galaxyPath = path.join(__dirname, '../../galaxy');
    const publicDir = path.join(__dirname, '../../public');
    const appModulesPath = path.join(__dirname, '../../modules');
    
    if (!checkGalaxyExists(galaxyPath)) {
        console.error('❌ Galaxy folder not found, creating fallback structure...');
        createFallbackGalaxyStructure(galaxyPath);
    }
    
    try {
        console.log('📁 Начинаем процесс сборки...');
        
        // Шаг 1: Сканируем галактику
        console.log('🔍 Шаг 1: Сканирование структуры галактики...');
        const result = await performGalaxyScan(galaxyPath);
        
        // Добавляем полные URL
        addFullUrls(result);
        
        // Создаем публичную папку
        createDirectoryIfNotExists(publicDir);
        
        // Шаг 2: Копируем галактику в public
        console.log('📦 Шаг 2: Копирование галактики для веб-доступа...');
        const galaxyPublicPath = path.join(publicDir, 'galaxy');
        try {
            copyFolderRecursive(galaxyPath, galaxyPublicPath);
            console.log('✅ Папка "galaxy" скопирована в public для веб-доступа');
        } catch (error) {
            console.error('❌ Ошибка копирования галактики:', error.message);
            throw error;
        }
        
        // Шаг 3: Копируем модули приложения
        console.log('⚙️  Шаг 3: Копирование модулей приложения...');
        if (fs.existsSync(appModulesPath)) {
            const appPublicPath = path.join(publicDir, 'modules');
            try {
                copyFolderRecursive(appModulesPath, appPublicPath);
                
                // Проверяем структуру скопированных модулей
                const appFiles = getAllFiles(appPublicPath);
                console.log(`✅ Модули приложения скопированы: ${appFiles.length} файлов`);
                
                // Логируем основные модули
                const coreModules = appFiles.filter(file => 
                    file.includes('/app/core/') && file.endsWith('.js')
                );
                console.log(`   🎯 Основные модули: ${coreModules.length}`);
                
                // Проверяем наличие критических модулей
                const criticalModules = [
                    'modules/app/core/app.js',
                    'modules/app/core/galaxy-renderer.js',
                    'modules/app/core/camera-controller.js',
                    'modules/app/constants/config.js'
                ];
                
                criticalModules.forEach(modulePath => {
                    const fullPath = path.join(appPublicPath, modulePath);
                    if (fs.existsSync(fullPath)) {
                        console.log(`   ✅ ${modulePath}`);
                    } else {
                        console.warn(`   ⚠️  Отсутствует: ${modulePath}`);
                    }
                });
                
            } catch (error) {
                console.error('❌ Ошибка копирования модулей приложения:', error.message);
                createFallbackAppModules(publicDir);
            }
        } else {
            console.warn('⚠️ Папка modules не найдена, приложение не будет работать');
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

// Вспомогательная функция для создания fallback структуры галактики
function createFallbackGalaxyStructure(galaxyPath) {
    console.log('🛠️ Создание fallback структуры галактики...');
    
    createDirectoryIfNotExists(galaxyPath);
    
    const fallbackHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌌 Fallback Galaxy</title>
    <style>
        body { 
            margin: 0; 
            padding: 40px; 
            background: #0c0c2e; 
            color: white; 
            font-family: Arial, sans-serif; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            text-align: center; 
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌌 Fallback Galaxy</h1>
        <p>Эта галактика была создана автоматически для тестирования.</p>
        <p>Добавьте свою структуру в папку "galaxy".</p>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(galaxyPath, 'index.html'), fallbackHtml);
    console.log('✅ Fallback галактика создана');
}

// Функция для создания fallback модулей приложения (ОБНОВЛЕННАЯ)
function createFallbackAppModules(publicDir) {
    console.log('🛠️ Создание fallback модулей приложения...');
    
    const appPublicPath = path.join(publicDir, 'modules');
    createDirectoryIfNotExists(appPublicPath);
    
    const appPath = path.join(appPublicPath, 'app');
    createDirectoryIfNotExists(appPath);
    
    const corePath = path.join(appPath, 'core');
    createDirectoryIfNotExists(corePath);
    
    const constantsPath = path.join(appPath, 'constants');
    createDirectoryIfNotExists(constantsPath);
    
    // Создаем минимальный app.js для отладки
    const appJsContent = `// Fallback app.js for debugging
export class GalaxyApp {
    constructor() {
        console.log('🚀 Fallback GalaxyApp создан');
        this.isInitialized = false;
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
        this.isInitialized = true;
        return Promise.resolve();
    }

    detectPlatform() {
        const ua = navigator.userAgent;
        if (/Android/.test(ua)) return 'Android';
        if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
        if (/Windows/.test(ua)) return 'Windows';
        if (/Mac/.test(ua)) return 'Mac';
        return 'Unknown';
    }
    
    resetZoom() {
        console.log('🗺️ Сброс зума (fallback)');
    }
    
    toggleOrbits() {
        console.log('🔄 Переключение орбит (fallback)');
    }
    
    toggleMinimap() {
        console.log('🗺️ Переключение миникарты (fallback)');
    }
}`;

    // Создаем fallback renderer
    const rendererJsContent = `// Fallback GalaxyRenderer
export class GalaxyRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas?.getContext('2d');
        this.showOrbits = true;
    }

    async init() {
        console.log('🎨 Fallback renderer инициализирован');
        return Promise.resolve();
    }

    render(galaxyData, camera) {
        if (!this.ctx) return;
        
        // Очистка canvas
        this.ctx.fillStyle = '#0c0c2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Простая визуализация
        this.ctx.fillStyle = '#4ECDC4';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🌌 Galaxy Explorer (Fallback Mode)', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText('Добавьте модули приложения', this.canvas.width / 2, this.canvas.height / 2 + 30);
    }
    
    toggleOrbitDisplay() {
        this.showOrbits = !this.showOrbits;
        console.log('Орбиты:', this.showOrbits ? 'вкл' : 'выкл');
    }
}`;

    // Создаем fallback camera
    const cameraJsContent = `// Fallback CameraController
export class CameraController {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
    }
    
    init(canvas) {
        console.log('🎥 Fallback camera инициализирован');
    }
    
    pan(deltaX, deltaY) {
        this.x -= deltaX / this.zoom;
        this.y -= deltaY / this.zoom;
    }
    
    zoom(delta) {
        this.zoom = Math.max(0.1, Math.min(5, this.zoom + delta));
    }
    
    reset() {
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
    }
}`;

    // Создаем fallback config
    const configJsContent = `// Fallback config
export const APP_CONFIG = {
    DEBUG: { ENABLED: true },
    RENDERING: {
        BACKGROUND: { PRIMARY: '#0c0c2e' }
    }
};

export const ENTITY_COLORS = {
    galaxy: '#FFD700',
    planet: '#4ECDC4',
    moon: '#C7F464'
};

export const ENTITY_SIZES = {
    galaxy: 50,
    planet: 25,
    moon: 15
};`;

    // Записываем файлы
    fs.writeFileSync(path.join(corePath, 'app.js'), appJsContent);
    fs.writeFileSync(path.join(corePath, 'galaxy-renderer.js'), rendererJsContent);
    fs.writeFileSync(path.join(corePath, 'camera-controller.js'), cameraJsContent);
    fs.writeFileSync(path.join(constantsPath, 'config.js'), configJsContent);
    
    console.log('⚠️ Созданы fallback модули приложения для отладки');
    console.log('   📁 Структура: modules/app/core/');
}

// Вспомогательная функция для получения всех файлов
function getAllFiles(dirPath, arrayOfFiles = []) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles;

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

// Функции создания диагностических страниц (без изменений)
function createModuleTestFile(publicDir, fullReport) {
    // ... существующий код ...
}

function createHealthDashboard(publicDir, healthReport) {
    // ... существующий код ...
}

function createProjectExplorer(publicDir, projectStructure) {
    // ... существующий код ...
}

function createMobileTestFile(publicDir) {
    // ... существующий код ...
}

function logBuildStats(result, sitemapPath, fullReport, healthReport) {
    // ... существующий код ...
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

