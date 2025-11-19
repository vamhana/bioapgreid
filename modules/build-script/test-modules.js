import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// КОНФИГУРАЦИЯ СИСТЕМЫ АНАЛИЗА
// =============================================================================

/**
 * Расширения файлов, которые можно безопасно анализировать и показывать
 * @constant {string[]}
 */
const READABLE_EXTENSIONS = [
    '.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.htm', '.css', '.scss', 
    '.md', '.txt', '.yml', '.yaml', '.xml', '.env', '.gitignore', '.gitattributes',
    '.editorconfig', '.prettierrc', '.eslintrc', '.babelrc'
];

/**
 * Файлы, которые НЕ нужно анализировать (секреты, бинарники, временные файлы)
 * @constant {string[]}
 */
const EXCLUDED_FILES = [
    '.env.local', '.env.production', '.env.development', '.env.test',
    'package-lock.json', 'yarn.lock', '*.log', '*.min.js', '*.min.css',
    '*.bin', '*.exe', '*.dll', '*.so', '*.dylib', 'Thumbs.db', '.DS_Store'
];

/**
 * Папки, которые нужно исключить из рекурсивного сканирования
 * @constant {string[]}
 */
const EXCLUDED_DIRS = [
    'galaxy', 'node_modules', '.git', 'public', '.vercel', '.next',
    'dist', 'build', 'coverage', '.nyc_output', '.vscode', '.idea',
    '__pycache__', '.pytest_cache', '.cache', 'temp', 'tmp', 'logs'
];

/**
 * Критические модули для проверки работоспособности приложения Galaxy Explorer
 * @constant {string[]}
 */
const CRITICAL_MODULES = [
    // ==================== CORE APPLICATION MODULES ====================
    'modules/app/core/app.js',
    'modules/app/core/galaxy-data-loader.js',
    'modules/app/core/galaxy-renderer.js',
    'modules/app/core/camera-controller.js',
    'modules/app/core/three-scene-manager.js',
    'modules/app/core/spatial-partitioner.js',
    'modules/app/core/lod-manager.js',
    'modules/app/core/memory-manager.js',
    'modules/app/core/security-validator.js',
    'modules/app/core/animation-system.js',
    'modules/app/core/material-pool.js',
    'modules/app/core/galaxy-3d-layout-service.js',
    
    // ==================== INTERACTION MODULES ====================
    'modules/app/interaction/progression-tracker.js',
    'modules/app/interaction/entity-interaction.js',
    
    // ==================== UI MODULES ====================
    'modules/app/ui/user-panel.js',
    'modules/app/ui/minimap-navigation.js',
    
    // ==================== UTILS MODULES ====================
    'modules/app/utils/asset-manager.js',
    'modules/app/utils/performance-optimizer.js',
    
    // ==================== CONSTANTS ====================
    'modules/app/constants/config.js',
    
    // ==================== BUILD SYSTEM MODULES ====================
    'modules/build-script/build-processor.js',
    'modules/build-script/config.js',
    'modules/build-script/file-utils.js',
    'modules/build-script/galaxy-scanner.js',
    'modules/build-script/html-generator-app.js',
    'modules/build-script/html-generator.js',
    'modules/build-script/index.js',
    'modules/build-script/test-modules.js',
    'modules/build-script/url-processor.js',
    
    // ==================== SCANNER MODULES ====================
    'scanner/index.js',
    'scanner/config.js',
    'scanner/logger.js',
    'scanner/main.js',
    'scanner/run.js',
    
    // ==================== ROOT CONFIGURATION FILES ====================
    'package.json',
    'vercel.json',
    'README.md',
    '.gitignore'
];

// =============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================================================

/**
 * Форматирует размер файла в читаемый вид
 * @param {number} bytes - размер в байтах
 * @returns {string} отформатированный размер
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Форматирует timestamp в читаемую дату/время
 * @param {number|string} timestamp - временная метка
 * @returns {string} отформатированное время
 */
function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString('ru-RU');
}

/**
 * Проверяет, нужно ли исключить файл/директорию из сканирования
 * @param {string} filePath - полный путь к файлу/директории
 * @param {boolean} isDirectory - является ли путь директорией
 * @returns {boolean} true если нужно исключить
 */
function shouldExclude(filePath, isDirectory) {
    const name = path.basename(filePath);
    
    if (isDirectory) {
        return EXCLUDED_DIRS.includes(name) || name.startsWith('.');
    }
    
    // Проверяем исключенные файлы по шаблонам
    for (const pattern of EXCLUDED_FILES) {
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            if (regex.test(name)) return true;
        } else if (pattern === name) {
            return true;
        }
    }
    
    return false;
}

// =============================================================================
// ОСНОВНЫЕ ФУНКЦИИ АНАЛИЗА
// =============================================================================

/**
 * Выполняет полное сканирование структуры проекта
 * @returns {Object} детализированная структура проекта со статистикой
 */
export function scanProjectStructure() {
    console.log('🔍 Полное сканирование структуры проекта...\n');
    
    const projectRoot = path.join(__dirname, '../..');
    const fileStructure = {};
    let totalFiles = 0;
    let totalDirs = 0;
    let totalSize = 0;
    
    /**
     * Рекурсивно сканирует директорию и собирает информацию о файлах
     * @param {string} currentPath - текущий путь для сканирования
     * @param {string} relativePath - относительный путь от корня проекта
     * @returns {Array} массив файлов и поддиректорий
     */
    function scanDirectory(currentPath, relativePath = '') {
        const items = fs.readdirSync(currentPath);
        
        items.forEach(item => {
            const fullPath = path.join(currentPath, item);
            const relPath = path.join(relativePath, item);
            
            try {
                const stat = fs.statSync(fullPath);
                
                if (shouldExclude(fullPath, stat.isDirectory())) {
                    return;
                }
                
                if (stat.isDirectory()) {
                    totalDirs++;
                    fileStructure[relPath] = {
                        type: 'directory',
                        path: relPath,
                        size: 0,
                        fileCount: 0,
                        dirCount: 0,
                        files: scanDirectory(fullPath, relPath)
                    };
                    
                    // Подсчитываем статистику для директории
                    const dirStats = calculateDirectoryStats(fileStructure[relPath]);
                    fileStructure[relPath].size = dirStats.size;
                    fileStructure[relPath].fileCount = dirStats.fileCount;
                    fileStructure[relPath].dirCount = dirStats.dirCount;
                    
                } else {
                    totalFiles++;
                    const fileInfo = {
                        name: item,
                        path: relPath,
                        size: stat.size,
                        modified: stat.mtime,
                        created: stat.birthtime,
                        extension: path.extname(item).toLowerCase(),
                        isBinary: false,
                        lines: 0,
                        content: null
                    };
                    
                    totalSize += stat.size;
                    
                    if (!fileStructure[relativePath]) {
                        fileStructure[relativePath] = {
                            type: 'directory',
                            path: relativePath,
                            size: 0,
                            fileCount: 0,
                            dirCount: 0,
                            files: []
                        };
                    }
                    
                    // Читаем содержимое текстовых файлов
                    if (READABLE_EXTENSIONS.includes(fileInfo.extension)) {
                        try {
                            const content = fs.readFileSync(fullPath, 'utf8');
                            fileInfo.content = content;
                            fileInfo.lines = content.split('\n').length;
                            fileInfo.isBinary = false;
                            
                            // Анализ содержимого
                            fileInfo.analysis = analyzeFileContent(content, item);
                            
                        } catch (error) {
                            fileInfo.content = `❌ Ошибка чтения: ${error.message}`;
                            fileInfo.isBinary = true;
                        }
                    } else {
                        fileInfo.content = `📁 Бинарный файл (${fileInfo.extension || 'без расширения'})`;
                        fileInfo.isBinary = true;
                    }
                    
                    fileStructure[relativePath].files.push(fileInfo);
                    fileStructure[relativePath].files.sort((a, b) => a.name.localeCompare(b.name));
                }
            } catch (error) {
                console.warn(`⚠️ Ошибка доступа к ${relPath}: ${error.message}`);
            }
        });
        
        return fileStructure[relativePath]?.files || [];
    }
    
    /**
     * Подсчитывает статистику для директории
     * @param {Object} directory - объект директории
     * @returns {Object} статистика размера и количества файлов
     */
    function calculateDirectoryStats(directory) {
        let totalSize = 0;
        let fileCount = 0;
        let dirCount = 0;
        
        function processDirectory(dir) {
            if (dir.files) {
                dir.files.forEach(item => {
                    if (item.type === 'directory') {
                        dirCount++;
                        processDirectory(item);
                    } else {
                        fileCount++;
                        totalSize += item.size || 0;
                    }
                });
            }
        }
        
        processDirectory(directory);
        return { size: totalSize, fileCount, dirCount };
    }
    
    /**
     * Анализирует содержимое файла и извлекает метрики
     * @param {string} content - содержимое файла
     * @param {string} filename - имя файла
     * @returns {Object} результаты анализа
     */
    function analyzeFileContent(content, filename) {
        const analysis = {
            isEmpty: content.trim().length === 0,
            hasErrors: false,
            hasExports: false,
            hasImports: false,
            hasClasses: false,
            hasFunctions: false,
            lineCount: content.split('\n').length,
            charCount: content.length,
            wordCount: content.split(/\s+/).filter(word => word.length > 0).length
        };
        
        if (filename.endsWith('.js')) {
            analysis.hasExports = /export\s+(default|{)/.test(content);
            analysis.hasImports = /import\s+.*from/.test(content);
            analysis.hasClasses = /class\s+\w+/.test(content);
            analysis.hasFunctions = /function\s+\w+|const\s+\w+\s*=\s*\(|=>/.test(content);
            analysis.hasErrors = /console\.error|throw\s+new\s+Error|\.catch\(/.test(content);
        }
        
        if (filename.endsWith('.json')) {
            try {
                JSON.parse(content);
                analysis.isValidJSON = true;
            } catch (e) {
                analysis.isValidJSON = false;
                analysis.jsonError = e.message;
            }
        }
        
        if (filename.endsWith('.html')) {
            analysis.hasScripts = /<script/.test(content);
            analysis.hasStyles = /<style/.test(content);
            analysis.hasLinks = /<link/.test(content);
        }
        
        return analysis;
    }
    
    // Запускаем сканирование
    scanDirectory(projectRoot);
    
    // Добавляем общую статистику
    fileStructure._stats = {
        totalFiles,
        totalDirs,
        totalSize,
        scanTime: new Date().toISOString(),
        projectRoot
    };
    
    console.log(`📊 Статистика сканирования:`);
    console.log(`   📁 Папок: ${totalDirs}`);
    console.log(`   📄 Файлов: ${totalFiles}`);
    console.log(`   💾 Общий размер: ${formatFileSize(totalSize)}`);
    
    return fileStructure;
}

/**
 * Тестирует критические модули приложения на наличие и качество
 * @returns {Object} результаты тестирования всех критических модулей
 */
export function testCriticalModules() {
    console.log('🧪 Тестирование критических модулей...\n');
    
    const results = [];
    let allPassed = true;
    let totalSize = 0;
    
    CRITICAL_MODULES.forEach(modulePath => {
        const fullPath = path.join(__dirname, '../..', modulePath);
        const exists = fs.existsSync(fullPath);
        
        let fileInfo = {
            exists: false,
            path: modulePath,
            fullPath: fullPath,
            size: 0,
            lines: 0,
            content: null,
            analysis: {},
            error: null
        };
        
        if (exists) {
            try {
                const stats = fs.statSync(fullPath);
                fileInfo.exists = true;
                fileInfo.size = stats.size;
                fileInfo.modified = stats.mtime;
                fileInfo.created = stats.birthtime;
                totalSize += stats.size;
                
                // Читаем содержимое для анализа
                const content = fs.readFileSync(fullPath, 'utf8');
                fileInfo.content = content;
                fileInfo.lines = content.split('\n').length;
                fileInfo.analysis = analyzeModuleContent(content, modulePath);
                
                // Проверяем качество модуля
                fileInfo.quality = assessModuleQuality(fileInfo);
                
            } catch (error) {
                fileInfo.error = error.message;
                allPassed = false;
            }
        } else {
            allPassed = false;
            fileInfo.error = 'Файл не найден';
        }
        
        results.push(fileInfo);
        
        if (exists && !fileInfo.error) {
            const quality = fileInfo.quality;
            const status = quality.score >= 0.7 ? '✅' : quality.score >= 0.5 ? '⚠️' : '❌';
            console.log(`${status} ${modulePath} (${fileInfo.lines} строк, качество: ${Math.round(quality.score * 100)}%)`);
        } else {
            console.log(`❌ ${modulePath} - ${fileInfo.error}`);
        }
    });
    
    console.log(`\n📊 Результаты тестирования:`);
    console.log(`   ✅ Пройдено: ${results.filter(r => r.exists && !r.error).length}/${CRITICAL_MODULES.length}`);
    console.log(`   💾 Общий размер: ${formatFileSize(totalSize)}`);
    console.log(`   🎯 Статус: ${allPassed ? 'ВСЕ МОДУЛИ НА МЕСТЕ' : 'НЕКОТОРЫЕ МОДУЛИ ОТСУТСТВУЮТ'}`);
    
    return {
        allPassed,
        results,
        stats: {
            totalModules: CRITICAL_MODULES.length,
            passedModules: results.filter(r => r.exists && !r.error).length,
            failedModules: results.filter(r => !r.exists || r.error).length,
            totalSize,
            averageQuality: calculateAverageQuality(results)
        }
    };
}

/**
 * Анализирует содержимое модуля и извлекает структурную информацию
 * @param {string} content - содержимое файла
 * @param {string} filePath - путь к файлу
 * @returns {Object} детальный анализ содержимого
 */
function analyzeModuleContent(content, filePath) {
    const analysis = {
        lines: content.split('\n').length,
        characters: content.length,
        isEmpty: content.trim().length === 0,
        hasExports: false,
        hasImports: false,
        hasClasses: false,
        hasFunctions: false,
        hasErrors: false,
        hasComments: false,
        dependencies: [],
        exports: []
    };
    
    if (filePath.endsWith('.js')) {
        // Анализ импортов
        const importMatches = content.matchAll(/import\s+.*from\s+['"]([^'"]+)['"]/g);
        analysis.dependencies = Array.from(importMatches).map(match => match[1]);
        analysis.hasImports = analysis.dependencies.length > 0;
        
        // Анализ экспортов
        analysis.hasExports = /export\s+(default|{)/.test(content);
        const exportMatches = content.match(/export\s+(const|let|var|function|class|async|default)\s+(\w+)/g);
        if (exportMatches) {
            analysis.exports = exportMatches.map(exp => exp.replace('export ', ''));
        }
        
        // Анализ классов и функций
        analysis.hasClasses = /class\s+\w+/.test(content);
        analysis.hasFunctions = /function\s+\w+|const\s+\w+\s*=\s*\(|=>/.test(content);
        
        // Поиск ошибок
        analysis.hasErrors = /console\.error|throw\s+new\s+Error|\.catch\(|try\s*{/.test(content);
        
        // Поиск комментариев
        analysis.hasComments = /\/\/|\/\*/.test(content);
    }
    
    if (filePath.endsWith('.json')) {
        try {
            const json = JSON.parse(content);
            analysis.isValidJSON = true;
            analysis.keys = Object.keys(json);
        } catch (e) {
            analysis.isValidJSON = false;
            analysis.jsonError = e.message;
        }
    }
    
    return analysis;
}

/**
 * Оценивает качество модуля на основе анализа содержимого
 * @param {Object} fileInfo - информация о файле
 * @returns {Object} оценка качества и рекомендации
 */
function assessModuleQuality(fileInfo) {
    const analysis = fileInfo.analysis;
    let score = 0;
    const maxScore = 10;
    const feedback = [];
    
    // Базовые проверки
    if (fileInfo.exists) score += 2;
    if (!fileInfo.error) score += 2;
    if (!analysis.isEmpty) score += 1;
    
    // Для JS файлов - дополнительные проверки
    if (fileInfo.path.endsWith('.js')) {
        if (analysis.hasExports) score += 1;
        if (analysis.hasImports) score += 1;
        if (analysis.hasClasses || analysis.hasFunctions) score += 1;
        if (analysis.hasComments) score += 1;
        if (analysis.lines > 10) score += 1; // Не слишком короткий
        
        if (!analysis.hasExports) feedback.push('Модуль не экспортирует функции/классы');
        if (!analysis.hasImports) feedback.push('Модуль не импортирует зависимости');
        if (analysis.isEmpty) feedback.push('Файл пустой');
    }
    
    // Для JSON файлов
    if (fileInfo.path.endsWith('.json')) {
        if (analysis.isValidJSON) score += 3;
        else feedback.push('Невалидный JSON');
    }
    
    const finalScore = score / maxScore;
    
    return {
        score: finalScore,
        feedback,
        grade: finalScore >= 0.9 ? 'A' : 
               finalScore >= 0.8 ? 'B' : 
               finalScore >= 0.7 ? 'C' : 
               finalScore >= 0.6 ? 'D' : 'F'
    };
}

/**
 * Рассчитывает среднее качество всех модулей
 * @param {Array} results - результаты тестирования модулей
 * @returns {number} средняя оценка качества
 */
function calculateAverageQuality(results) {
    const validResults = results.filter(r => r.exists && r.quality);
    if (validResults.length === 0) return 0;
    
    const totalScore = validResults.reduce((sum, result) => sum + result.quality.score, 0);
    return totalScore / validResults.length;
}

// =============================================================================
// СИСТЕМА ДИАГНОСТИКИ ЗДОРОВЬЯ ПРОЕКТА
// =============================================================================

/**
 * Проверяет наличие критических конфигурационных файлов
 * @returns {Array} список конфигурационных файлов и их статус
 */
function checkConfigFiles() {
    const configFiles = [
        'package.json',
        'vercel.json',
        '.gitignore',
        'README.md',
        '.env.example',
        'tsconfig.json',
        'jsconfig.json'
    ];
    
    return configFiles.map(file => ({
        file,
        exists: fs.existsSync(path.join(__dirname, '../../', file))
    }));
}

/**
 * Выполняет комплексную диагностику здоровья проекта
 * @returns {Object} детальный отчет о состоянии проекта
 */
export function getProjectHealth() {
    const structure = scanProjectStructure();
    const moduleTests = testCriticalModules();
    
    const health = {
        timestamp: new Date().toISOString(),
        overallScore: 0,
        categories: {
            structure: {
                score: 0,
                files: structure._stats.totalFiles,
                directories: structure._stats.totalDirs,
                totalSize: structure._stats.totalSize
            },
            modules: {
                score: moduleTests.stats.averageQuality,
                total: moduleTests.stats.totalModules,
                passed: moduleTests.stats.passedModules,
                failed: moduleTests.stats.failedModules
            },
            dependencies: {
                score: 0,
                hasPackageJson: fs.existsSync(path.join(__dirname, '../../package.json')),
                hasConfigFiles: checkConfigFiles()
            }
        },
        recommendations: []
    };
    
    // Рассчитываем общий счет
    const structureScore = structure._stats.totalFiles > 0 ? 1 : 0;
    const modulesScore = moduleTests.stats.averageQuality;
    const depsScore = health.categories.dependencies.hasPackageJson ? 1 : 0;
    
    health.overallScore = (structureScore + modulesScore + depsScore) / 3;
    health.categories.structure.score = structureScore;
    health.categories.dependencies.score = depsScore;
    
    // Формируем рекомендации
    if (moduleTests.stats.failedModules > 0) {
        health.recommendations.push(`❌ Отсутствуют ${moduleTests.stats.failedModules} критических модулей`);
    }
    
    if (structure._stats.totalFiles === 0) {
        health.recommendations.push('❌ Проект не содержит файлов');
    }
    
    if (!health.categories.dependencies.hasPackageJson) {
        health.recommendations.push('⚠️ Отсутствует package.json');
    }
    
    // Проверяем конфигурационные файлы
    const missingConfigs = health.categories.dependencies.hasConfigFiles
        .filter(config => !config.exists)
        .map(config => config.file);
    
    if (missingConfigs.length > 0) {
        health.recommendations.push(`⚠️ Отсутствуют конфигурационные файлы: ${missingConfigs.join(', ')}`);
    }
    
    // Определяем общий статус здоровья
    if (health.overallScore >= 0.8) {
        health.status = 'HEALTHY';
    } else if (health.overallScore >= 0.6) {
        health.status = 'WARNING';
    } else {
        health.status = 'CRITICAL';
    }
    
    return health;
}

// =============================================================================
// СИСТЕМА ГЕНЕРАЦИИ ОТЧЕТОВ
// =============================================================================

/**
 * Генерирует полный отчет о состоянии проекта
 * @returns {Object} комплексный отчет со всеми метриками и анализами
 */
export function generateFullReport() {
    console.log('📋 Генерация полного отчета проекта...\n');
    
    const startTime = Date.now();
    const structure = scanProjectStructure();
    const moduleTests = testCriticalModules();
    const health = getProjectHealth();
    
    const report = {
        metadata: {
            generatedAt: new Date().toISOString(),
            generationTime: Date.now() - startTime,
            projectName: 'Galaxy Explorer',
            version: '1.0.0',
            scannerVersion: '2.1.0'
        },
        health,
        structure: {
            stats: structure._stats,
            tree: structure
        },
        modules: moduleTests,
        summary: {
            totalFiles: structure._stats.totalFiles,
            totalModules: moduleTests.stats.totalModules,
            healthScore: Math.round(health.overallScore * 100),
            status: health.status,
            recommendations: health.recommendations,
            criticalIssues: moduleTests.stats.failedModules,
            qualityGrade: calculateQualityGrade(moduleTests.stats.averageQuality)
        }
    };
    
    console.log('📊 Итоговый отчет:');
    console.log(`   🏥 Состояние: ${health.status}`);
    console.log(`   📈 Общий счет: ${Math.round(health.overallScore * 100)}%`);
    console.log(`   📁 Файлов: ${structure._stats.totalFiles}`);
    console.log(`   📦 Модулей: ${moduleTests.stats.passedModules}/${moduleTests.stats.totalModules}`);
    console.log(`   🎯 Качество: ${report.summary.qualityGrade}`);
    console.log(`   ⏱️  Время генерации: ${Date.now() - startTime}ms`);
    
    if (health.recommendations.length > 0) {
        console.log('\n💡 Рекомендации:');
        health.recommendations.forEach(rec => console.log(`   ${rec}`));
    }
    
    return report;
}

/**
 * Рассчитывает общую оценку качества на основе среднего балла
 * @param {number} averageScore - средний балл качества
 * @returns {string} буквенная оценка
 */
function calculateQualityGrade(averageScore) {
    if (averageScore >= 0.9) return 'A+';
    if (averageScore >= 0.8) return 'A';
    if (averageScore >= 0.7) return 'B';
    if (averageScore >= 0.6) return 'C';
    if (averageScore >= 0.5) return 'D';
    return 'F';
}

// =============================================================================
// ИНТЕРФЕЙС КОМАНДНОЙ СТРОКИ
// =============================================================================

/**
 * Отображает справку по использованию утилиты
 */
function showHelp() {
    console.log(`
🌌 Galaxy Explorer - Test Modules System
=======================================

Комплексная система тестирования и анализа модулей приложения Galaxy Explorer.

ИСПОЛЬЗОВАНИЕ:
  node test-modules.js [ОПЦИИ]

ОПЦИИ:
  --health, -h      Проверка общего состояния проекта
  --report, -r      Полный детализированный отчет проекта  
  --modules, -m     Тестирование только критических модулей
  --structure, -s   Сканирование только файловой структуры
  --help            Показать эту справку

ПРИМЕРЫ:
  node test-modules.js --health
  node test-modules.js --report
  node test-modules.js --modules
  node test-modules.js --structure

ОПИСАНИЕ:
  Система предоставляет многоуровневый анализ проекта:
  - Сканирование файловой структуры с исключением служебных папок
  - Проверка критических модулей на наличие и качество кода
  - Оценка здоровья проекта на основе комплексных метрик
  - Генерация детализированных отчетов для разработчиков

ВЕРСИЯ: 2.1.0
    `);
}

// =============================================================================
// ТОЧКА ВХОДА ПРИ ПРЯМОМ ВЫЗОВЕ
// =============================================================================

/**
 * Основная точка входа при прямом вызове модуля
 */
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    
    if (args.includes('--health') || args.includes('-h')) {
        const health = getProjectHealth();
        console.log('\n🏥 ДИАГНОСТИКА ПРОЕКТА GALAXY EXPLORER:');
        console.log('====================================');
        console.log(`📊 Статус: ${health.status}`);
        console.log(`🎯 Общий счет: ${Math.round(health.overallScore * 100)}%`);
        console.log(`📁 Файлов: ${health.categories.structure.files}`);
        console.log(`📦 Модулей: ${health.categories.modules.passed}/${health.categories.modules.total}`);
        console.log(`💾 Размер: ${formatFileSize(health.categories.structure.totalSize)}`);
        
        if (health.recommendations.length > 0) {
            console.log('\n💡 Рекомендации по улучшению:');
            health.recommendations.forEach(rec => console.log(`   ${rec}`));
        }
        
    } else if (args.includes('--report') || args.includes('-r')) {
        generateFullReport();
        
    } else if (args.includes('--modules') || args.includes('-m')) {
        testCriticalModules();
        
    } else if (args.includes('--structure') || args.includes('-s')) {
        scanProjectStructure();
        
    } else if (args.includes('--help') || args.length === 0) {
        showHelp();
        
    } else {
        console.log('❌ Неизвестная опция. Используйте --help для справки.');
        process.exit(1);
    }
}

// =============================================================================
// ЭКСПОРТЫ ДЛЯ ИСПОЛЬЗОВАНИЯ В ДРУГИХ МОДУЛЯХ
// =============================================================================

export default {
    scanProjectStructure,
    testCriticalModules,
    getProjectHealth,
    generateFullReport
};