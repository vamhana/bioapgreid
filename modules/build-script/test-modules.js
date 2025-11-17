// modules/build-script/test-modules.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Расширения файлов, которые можно безопасно показывать
const READABLE_EXTENSIONS = ['.js', '.json', '.html', '.css', '.md', '.txt', '.yml', '.yaml', '.xml', '.env'];
// Файлы, которые НЕ нужно показывать (секреты)
const EXCLUDED_FILES = ['.env.local', '.env.production', 'package-lock.json'];

export function scanProjectStructure() {
    console.log('🔍 Сканирование структуры проекта...\n');
    
    const projectRoot = path.join(__dirname, '../..');
    const excludeDirs = ['galaxy', 'node_modules', '.git', 'public', '.vercel'];
    const fileStructure = {};
    
    function scanDirectory(currentPath, relativePath = '') {
        const items = fs.readdirSync(currentPath);
        
        items.forEach(item => {
            // Пропускаем исключенные папки
            if (excludeDirs.includes(item)) return;
            
            const fullPath = path.join(currentPath, item);
            const relPath = path.join(relativePath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                fileStructure[relPath] = {
                    type: 'directory',
                    files: scanDirectory(fullPath, relPath)
                };
            } else {
                if (!fileStructure[relativePath]) {
                    fileStructure[relativePath] = { type: 'directory', files: [] };
                }
                
                const fileInfo = {
                    name: item,
                    size: stat.size,
                    modified: stat.mtime,
                    path: relPath
                };
                
                // Читаем содержимое файла если это текстовый файл и не исключен
                const ext = path.extname(item).toLowerCase();
                if (READABLE_EXTENSIONS.includes(ext) && !EXCLUDED_FILES.includes(item)) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        fileInfo.content = content;
                        fileInfo.lines = content.split('\n').length;
                    } catch (error) {
                        fileInfo.content = `❌ Ошибка чтения файла: ${error.message}`;
                    }
                } else if (EXCLUDED_FILES.includes(item)) {
                    fileInfo.content = '🔒 Содержимое скрыто для безопасности';
                } else {
                    fileInfo.content = `📁 Бинарный файл (${ext || 'без расширения'})`;
                }
                
                fileStructure[relativePath].files.push(fileInfo);
            }
        });
        
        return fileStructure[relativePath]?.files || [];
    }
    
    scanDirectory(projectRoot);
    return fileStructure;
}

export function testCriticalModules() {
    console.log('🧪 Тестирование критических модулей...\n');
    
    const criticalModules = [
        'modules/app/core/app.js',
        'modules/app/core/galaxy-data-loader.js',
        'modules/app/core/galaxy-renderer.js',
        'modules/app/interaction/progression-tracker.js',
        'modules/build-script/build-processor.js',
        'scanner/index.js',
        'scanner/config.js',
        'scanner/logger.js'
    ];
    
    const results = [];
    let allPassed = true;
    
    criticalModules.forEach(modulePath => {
        const fullPath = path.join(__dirname, '../..', modulePath);
        const exists = fs.existsSync(fullPath);
        
        let content = null;
        let lines = 0;
        
        if (exists) {
            try {
                content = fs.readFileSync(fullPath, 'utf8');
                lines = content.split('\n').length;
            } catch (error) {
                content = `Ошибка чтения: ${error.message}`;
            }
        }
        
        results.push({
            module: modulePath,
            exists: exists,
            path: fullPath,
            content: content,
            lines: lines
        });
        
        if (exists) {
            console.log(`✅ ${modulePath} (${lines} строк)`);
        } else {
            console.log(`❌ ${modulePath}`);
            allPassed = false;
        }
    });
    
    console.log(`\n📊 Результаты: ${allPassed ? '✅ Все критически модули на месте!' : '❌ Некоторые модули отсутствуют'}`);
    
    return {
        allPassed,
        results,
        projectStructure: scanProjectStructure()
    };
}

// Запуск при прямом вызове
if (import.meta.url === `file://${process.argv[1]}`) {
    testCriticalModules();
}
