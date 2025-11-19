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

import { BuildStatsManager } from './build-stats-manager.js';
import { ModuleValidator } from './module-validator.js';
import { HTMLGeneratorEnhanced } from './html-generator-enhanced.js';
import { formatFileSize } from './build-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class BuildProcessor {
    constructor() {
        this.statsManager = new BuildStatsManager();
        this.moduleValidator = new ModuleValidator();
        this.htmlGenerator = new HTMLGeneratorEnhanced();
        
        this.galaxyData = null;
        this.fullReport = null;
        this.healthReport = null;
    }

    async buildForVercel() {
        this.statsManager.startBuild();
        console.log('🚀 Building Galaxy Explorer for Vercel...');
        
        const galaxyPath = path.join(__dirname, '../../galaxy');
        const publicDir = path.join(__dirname, '../../public');
        const appModulesPath = path.join(__dirname, '../../modules/app');
        
        if (!checkGalaxyExists(galaxyPath)) {
            console.error('❌ Галактика не найдена. Сборка прервана.');
            process.exit(1);
        }
        
        try {
            await this.executeBuildSteps(galaxyPath, publicDir, appModulesPath);
            console.log('🎉 Сборка успешно завершена!');
            
        } catch (error) {
            await this.handleBuildError(error, publicDir);
        }
    }

    async executeBuildSteps(galaxyPath, publicDir, appModulesPath) {
        // Шаг 1: Сканирование галактики
        await this.stepScanGalaxy(galaxyPath);
        
        // Шаг 2: Копирование ресурсов
        await this.stepCopyResources(galaxyPath, publicDir);
        
        // Шаг 3: Обработка модулей приложения
        await this.stepProcessAppModules(appModulesPath, publicDir);
        
        // Шаг 4: Расширенный анализ проекта
        await this.stepProjectAnalysis(publicDir);
        
        // Шаг 5: Генерация HTML страниц
        await this.stepGenerateHTML(publicDir);
        
        // Шаг 6: Финальная статистика
        await this.stepFinalize(publicDir);
    }

    async stepScanGalaxy(galaxyPath) {
        console.log('🔍 Шаг 1: Сканирование структуры галактики...');
        const scanStart = performance.now();
        
        this.galaxyData = await scanGalaxy(galaxyPath);
        this.statsManager.recordScanTime(performance.now() - scanStart);
        
        // Анализ ресурсов галактики
        this.statsManager.analyzeGalaxyResources(galaxyPath);
        
        // Добавляем полные URL
        addFullUrls(this.galaxyData);
        
        console.log('✅ Структура галактики просканирована');
    }

    async stepCopyResources(galaxyPath, publicDir) {
        console.log('📦 Шаг 2: Копирование ресурсов...');
        const copyStart = performance.now();
        
        // Создаем публичную папку
        createDirectoryIfNotExists(publicDir);
        
        // Копируем галактику в public
        const galaxyPublicPath = path.join(publicDir, 'galaxy');
        copyFolderRecursive(galaxyPath, galaxyPublicPath);
        
        this.statsManager.recordCopyTime(performance.now() - copyStart);
        console.log('✅ Ресурсы скопированы в public');
    }

    async stepProcessAppModules(appModulesPath, publicDir) {
        console.log('⚙️  Шаг 3: Обработка модулей приложения...');
        const processStart = performance.now();
        
        if (fs.existsSync(appModulesPath)) {
            const appPublicPath = path.join(publicDir, 'app');
            copyFolderRecursive(appModulesPath, appPublicPath);
            
            // Валидация и исправление модулей
            await this.moduleValidator.validateAndFixModules(appPublicPath, this.statsManager);
            
        } else {
            console.warn('⚠️ Папка modules/app не найдена, создаем fallback модули');
            this.moduleValidator.createEnhancedFallbackAppModules(publicDir);
        }
        
        this.statsManager.recordProcessingTime(performance.now() - processStart);
        console.log('✅ Модули приложения обработаны');
    }

    async stepProjectAnalysis(publicDir) {
        console.log('🔬 Шаг 4: Расширенный анализ проекта...');
        
        // Создаем папку для результатов
        const resultsDir = path.join(publicDir, BUILD_CONFIG.RESULTS_DIR);
        createDirectoryIfNotExists(resultsDir);
        
        // Сохраняем sitemap
        console.log('   🗺️ Сохранение карты сайта...');
        const sitemapPath = path.join(resultsDir, BUILD_CONFIG.SITEMAP_FILE);
        fs.writeFileSync(sitemapPath, JSON.stringify(this.galaxyData, null, 2));
        
        // Сохраняем структуру проекта
        console.log('   📊 Сохранение структуры проекта...');
        const projectStructure = scanProjectStructure();
        const projectStructurePath = path.join(resultsDir, 'project-structure.json');
        fs.writeFileSync(projectStructurePath, JSON.stringify(projectStructure, null, 2));
        
        // Тестирование модулей
        console.log('   🧪 Тестирование критических модулей...');
        const testResults = testCriticalModules();
        const testResultsPath = path.join(resultsDir, 'test-results.json');
        fs.writeFileSync(testResultsPath, JSON.stringify(testResults, null, 2));
        
        // Генерация отчетов
        console.log('   📈 Генерация отчетов...');
        this.fullReport = generateFullReport();
        this.healthReport = getProjectHealth();
        
        const fullReportPath = path.join(resultsDir, 'full-report.json');
        const healthReportPath = path.join(resultsDir, 'health-report.json');
        
        fs.writeFileSync(fullReportPath, JSON.stringify(this.fullReport, null, 2));
        fs.writeFileSync(healthReportPath, JSON.stringify(this.healthReport, null, 2));
        
        console.log('✅ Анализ проекта завершен');
    }

    async stepGenerateHTML(publicDir) {
        console.log('🌐 Шаг 5: Генерация HTML страниц...');
        
        // Создаем главную страницу приложения
        const indexPath = path.join(publicDir, 'index.html');
        const html = generateAppHTML(this.galaxyData);
        fs.writeFileSync(indexPath, html);
        
        // Создаем страницу структуры галактики
        const galaxyStructurePath = path.join(publicDir, 'galaxy-structure.html');
        const oldStructureHtml = generateHTML(this.galaxyData);
        fs.writeFileSync(galaxyStructurePath, oldStructureHtml);
        
        // Создаем файл галактики (перенаправление)
        createGalaxyHtml(publicDir, this.galaxyData);
        createGalaxyRedirect(path.join(publicDir, 'galaxy'));
        
        // Генерируем расширенные HTML страницы
        await this.htmlGenerator.generateEnhancedPages(publicDir, {
            galaxyData: this.galaxyData,
            fullReport: this.fullReport,
            healthReport: this.healthReport,
            buildStats: this.statsManager.getStats()
        });
        
        console.log('✅ HTML страницы сгенерированы');
    }

    async stepFinalize(publicDir) {
        console.log('📊 Шаг 6: Финальная статистика...');
        
        // Сохраняем статистику сборки
        this.statsManager.finalizeBuild();
        this.statsManager.saveStats(publicDir);
        
        // Выводим итоговую статистику
        this.logBuildStats();
        
        console.log('✅ Сборка завершена');
    }

    async handleBuildError(error, publicDir) {
        console.error('❌ Build failed:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Создаем страницу ошибки сборки
        this.htmlGenerator.createBuildErrorPage(publicDir, error);
        
        process.exit(1);
    }

    logBuildStats() {
        const stats = this.statsManager.getStats();
        const result = this.galaxyData;
        
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
        
        console.log('├── 📦 Статистика сборки:');
        console.log(`│   ├── Модули: ${stats.modules.total} файлов`);
        console.log(`│   ├── Three.js: ${stats.modules.threeJS} модулей`);
        console.log(`│   ├── Исправлено: ${stats.modules.fixed} экспортов`);
        console.log(`│   ├── Ошибки: ${stats.modules.errors} модулей`);
        console.log(`│   └── Ресурсы: ${formatFileSize(stats.resources.totalSize)}`);
        
        console.log(`├── ⚡ Производительность сборки:`);
        console.log(`│   ├── Общее время: ${stats.performance.totalTime.toFixed(2)}ms`);
        console.log(`│   ├── Сканирование: ${stats.performance.scanTime.toFixed(2)}ms`);
        console.log(`│   ├── Копирование: ${stats.performance.copyTime.toFixed(2)}ms`);
        console.log(`│   └── Обработка: ${stats.performance.processingTime.toFixed(2)}ms`);
        
        if (this.fullReport) {
            const healthScore = Math.round((this.fullReport.health?.overallScore || 0) * 100);
            const moduleStats = this.fullReport.modules?.stats;
            console.log(`├── 🏥 Здоровье проекта: ${healthScore}%`);
            console.log(`├── 🧪 Модули: ${moduleStats?.passedModules}/${moduleStats?.totalModules} прошли проверку`);
            console.log(`├── 🎯 Статус: ${this.fullReport.health?.status || 'UNKNOWN'}`);
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
        
        if (this.healthReport?.recommendations?.length > 0) {
            console.log('\n💡 Рекомендации для улучшения:');
            this.healthReport.recommendations.forEach(rec => {
                console.log(`   ⚠️  ${rec}`);
            });
        }
        
        console.log('\n🚀 Приложение готово к использованию!');
    }
}

// Сохранение обратной совместимости
export async function buildForVercel() {
    const processor = new BuildProcessor();
    return await processor.buildForVercel();
}

export default {
    BuildProcessor,
    buildForVercel
};