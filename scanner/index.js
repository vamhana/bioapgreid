import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from './logger.js';
import { LEVEL_CONFIG, MAX_DEPTH, SERVER_CONFIG } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class GalaxyScanner {
    constructor(rootPath) {
        // Используем конфигурируемый путь или переданный аргумент
        this.rootPath = path.resolve(rootPath || SERVER_CONFIG.SOURCE_PATH);
        
        // Конвертируем имя для сервера
        this.galaxyName = this.sanitizeName(path.basename(this.rootPath));
        
        this.stats = {
            startTime: Date.now(),
            entities: {
                galaxy: 0,
                planet: 0,
                moon: 0,
                asteroid: 0,
                debris: 0
            },
            filesScanned: 0,
            errors: 0
        };
        
        this.resultsDir = this.getResultsDirectory();
    }

    // Санкционирование имен для сервера
    sanitizeName(name) {
        if (SERVER_CONFIG.USE_LATIN_NAMES) {
            const translitMap = {
                'галактика': 'galaxy',
                'земля': 'earth', 
                'луна': 'moon',
                'марс': 'mars',
                'юпитер': 'jupiter',
                'сатурн': 'saturn',
                'фобос': 'phobos',
                'астероид': 'asteroid',
                'мусор': 'debris'
            };
            
            // Транслитерируем всю строку
            let result = '';
            for (let i = 0; i < name.length; i++) {
                const char = name[i];
                const lowerChar = char.toLowerCase();
                if (translitMap[lowerChar]) {
                    result += translitMap[lowerChar];
                } else {
                    // Заменяем не-ASCII символы и пробелы
                    result += char.replace(/[^a-zA-Z0-9_-]/g, '_');
                }
            }
            
            // Убираем множественные подчеркивания
            result = result.replace(/_+/g, '_').replace(/^_|_$/g, '');
            return result || 'unknown';
        }
        return name;
    }

    getResultsDirectory() {
        // Используем конфигурируемый путь результатов
        const resultsDir = path.resolve(SERVER_CONFIG.RESULTS_PATH);
        
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
            logger.info(`Создана папка для результатов: ${resultsDir}`);
        }
        
        return resultsDir;
    }

    async scan() {
        logger.startScan(this.galaxyName);
        console.log(`📁 Результаты будут сохранены в: ${this.resultsDir}`);
        
        try {
            if (!fs.existsSync(this.rootPath)) {
                throw new Error(`Папка галактики не найдена: ${this.rootPath}`);
            }

            const galaxyStructure = await this.scanLevel(this.rootPath, 0);
            
            const result = {
                version: "2.0",
                name: this.galaxyName,
                scannedAt: new Date().toISOString(),
                scanDuration: Date.now() - this.stats.startTime,
                sourcePath: this.rootPath,
                resultsPath: this.resultsDir,
                stats: this.stats,
                ...galaxyStructure
            };

            logger.scanComplete(this.stats);
            return result;

        } catch (error) {
            logger.error('Критическая ошибка сканирования', error.message);
            throw error;
        }
    }

    async scanLevel(currentPath, currentLevel) {
        if (currentLevel > MAX_DEPTH) {
            logger.warning(`Превышена максимальная глубина ${MAX_DEPTH}`, { путь: currentPath });
            return null;
        }

        const levelConfig = LEVEL_CONFIG[currentLevel];
        const currentName = path.basename(currentPath);
        
        logger.entityFound(currentLevel, currentName, currentPath);

        const entity = {
            name: this.sanitizeName(currentName),
            type: levelConfig.type,
            level: currentLevel,
            path: path.relative(this.rootPath, currentPath).replace(/\\/g, '/'), // Универсальные разделители
            config: await this.extractConfig(currentPath, currentName),
            children: []
        };

        this.stats.entities[levelConfig.type]++;

        if (currentLevel < MAX_DEPTH) {
            await this.scanChildren(currentPath, currentLevel + 1, entity);
        }

        return entity;
    }

    async scanChildren(parentPath, childLevel, parentEntity) {
        try {
            const items = fs.readdirSync(parentPath);
            let childCount = 0;

            for (const item of items) {
                const itemPath = path.join(parentPath, item);
                
                if (item.startsWith('.') || item === `${path.basename(parentPath)}.htm`) {
                    continue;
                }

                const stats = fs.statSync(itemPath);
                if (stats.isDirectory()) {
                    const childEntity = await this.scanLevel(itemPath, childLevel);
                    if (childEntity) {
                        parentEntity.children.push(childEntity);
                        childCount++;
                    }
                }
            }

            logger.levelComplete(childLevel - 1, childCount);

        } catch (error) {
            logger.error(`Ошибка сканирования папки ${parentPath}`, error.message);
            this.stats.errors++;
        }
    }

    async extractConfig(entityPath, entityName) {
        const possibleFiles = [
            `${entityName}.html`,
            `${entityName}.htm`, 
            'index.html',
            'index.htm'
        ];

        for (const fileName of possibleFiles) {
            const filePath = path.join(entityPath, fileName);
            
            if (fs.existsSync(filePath)) {
                this.stats.filesScanned++;
                return await this.parseConfigFromFile(filePath, entityName);
            }
        }

        logger.warning(`HTML файл не найден для сущности`, { 
            сущность: entityName, 
            путь: entityPath 
        });

        return this.createDefaultConfig(entityName, entityPath);
    }

    async parseConfigFromFile(filePath, entityName) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            const scriptMatch = content.match(
                /<script\s+type="application\/galaxy\+json">([\s\S]*?)<\/script>/i
            );

            if (scriptMatch && scriptMatch[1]) {
                const config = JSON.parse(scriptMatch[1].trim());
                logger.debug(`Конфиг найден для ${entityName}`, config);
                return config;
            }

            const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : entityName;

            return {
                title: title,
                description: `Автоматически сгенерировано для ${entityName}`
            };

        } catch (error) {
            logger.error(`Ошибка парсинга файла ${filePath}`, error.message);
            return this.createDefaultConfig(entityName, filePath);
        }
    }

    createDefaultConfig(name, entityPath) {
        return {
            title: this.sanitizeName(name),
            description: `Сущность ${this.sanitizeName(name)} в галактике ${this.galaxyName}`,
            autoGenerated: true
        };
    }

    async saveScanResult(result, customFileName = null) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = customFileName || `scan-${this.galaxyName}-${timestamp}.json`;
            const outputPath = path.join(this.resultsDir, fileName);

            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
            
            await this.createSummaryReport(result, fileName);
            
            logger.success(`Результаты сканирования сохранены в ${outputPath}`);
            return outputPath;
            
        } catch (error) {
            logger.error('Ошибка сохранения результатов', error.message);
            throw error;
        }
    }

    async createSummaryReport(result, jsonFileName) {
        try {
            const reportPath = path.join(this.resultsDir, jsonFileName.replace('.json', '-summary.txt'));
            
            let report = `🌌 ОТЧЕТ СКАНИРОВАНИЯ ГАЛАКТИКИ\n`;
            report += `================================\n\n`;
            report += `📛 Имя галактики: ${result.name}\n`;
            report += `📅 Время сканирования: ${result.scannedAt}\n`;
            report += `⏱️  Длительность: ${result.scanDuration}ms\n`;
            report += `📁 Источник: ${result.sourcePath}\n\n`;
            
            report += `📊 СТАТИСТИКА:\n`;
            report += `-------------\n`;
            Object.entries(result.stats.entities).forEach(([type, count]) => {
                if (count > 0) {
                    const config = Object.values(LEVEL_CONFIG).find(c => c.type === type);
                    const icon = config ? config.icon : '📁';
                    report += `${icon} ${type}: ${count} сущностей\n`;
                }
            });
            report += `\n`;
            report += `📄 Файлов просканировано: ${result.stats.filesScanned}\n`;
            report += `❌ Ошибок: ${result.stats.errors}\n\n`;
            report += `💾 Полные данные: ${jsonFileName}\n`;

            fs.writeFileSync(reportPath, report);
            logger.success(`Краткий отчет создан: ${reportPath}`);
            
        } catch (error) {
            logger.warning('Не удалось создать краткий отчет', error.message);
        }
    }

    listPreviousScans() {
        try {
            if (!fs.existsSync(this.resultsDir)) {
                return [];
            }

            const files = fs.readdirSync(this.resultsDir)
                .filter(file => file.endsWith('.json'))
                .map(file => {
                    const filePath = path.join(this.resultsDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        path: filePath,
                        size: stats.size,
                        modified: stats.mtime
                    };
                })
                .sort((a, b) => b.modified - a.modified);

            return files;
        } catch (error) {
            logger.error('Ошибка чтения истории сканирований', error.message);
            return [];
        }
    }
}

// Основная функция
async function main() {
    // Приоритет: аргументы -> переменные окружения -> значение по умолчанию
    const galaxyPath = process.argv[2] || SERVER_CONFIG.SOURCE_PATH;
    
    // Проверяем аргументы командной строки
    if (process.argv.includes('--history') || process.argv.includes('-h')) {
        const scanner = new GalaxyScanner(SERVER_CONFIG.SOURCE_PATH);
        const previousScans = scanner.listPreviousScans();
        
        console.log('\n📜 ИСТОРИЯ СКАНИРОВАНИЙ:');
        console.log('======================');
        if (previousScans.length === 0) {
            console.log('📭 Нет предыдущих сканирований');
        } else {
            previousScans.forEach((scan, index) => {
                console.log(`${index + 1}. ${scan.name} (${Math.round(scan.size/1024)} KB) - ${scan.modified.toLocaleString()}`);
            });
        }
        return;
    }

    // Помощь
    if (process.argv.includes('--help')) {
        console.log(`
🌌 Galaxy Scanner - Помощь
=========================

Использование:
  node index.js [путь_к_галактике] [опции]

Опции:
  --history, -h    Показать историю сканирований
  --help           Показать эту справку
  --latin          Использовать латинские имена

Переменные окружения:
  GALAXY_SOURCE_PATH    Путь к сканируемой галактике
  GALAXY_RESULTS_PATH   Путь для сохранения результатов  
  USE_LATIN_NAMES       Использовать латинские имена (true/false)

Примеры:
  node index.js                                 # Сканировать стандартную галактику
  node index.js /path/to/galaxy                 # Сканировать указанную галактику
  node index.js --history                       # Показать историю сканирований
  node index.js --latin                         # Использовать латинские имена
  USE_LATIN_NAMES=true node index.js           # Через переменную окружения
        `);
        return;
    }

    // Проверяем флаг --latin
    if (process.argv.includes('--latin')) {
        process.env.USE_LATIN_NAMES = 'true';
    }
    
    try {
        const scanner = new GalaxyScanner(galaxyPath);
        const result = await scanner.scan();
        
        const savedPath = await scanner.saveScanResult(result);
        
        console.log('\n📊 КРАТКАЯ СТАТИСТИКА:');
        console.log('====================');
        Object.entries(result.stats.entities).forEach(([type, count]) => {
            if (count > 0) {
                const config = Object.values(LEVEL_CONFIG).find(c => c.type === type);
                const icon = config ? config.icon : '📁';
                console.log(`${icon} ${type}: ${count} сущностей`);
            }
        });
        console.log(`⏱️  Время сканирования: ${result.scanDuration}ms`);
        console.log(`📄 Файлов просканировано: ${result.stats.filesScanned}`);
        console.log(`❌ Ошибок: ${result.stats.errors}`);
        console.log(`💾 Результаты сохранены в: ${path.dirname(savedPath)}`);
        
    } catch (error) {
        logger.error('Сканирование завершилось с ошибкой', error.message);
        process.exit(1);
    }
}

// Запуск с использованием import.meta.main
if (import.meta.main) {
    main();
}


export default GalaxyScanner;
