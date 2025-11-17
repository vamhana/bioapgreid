// modules/build-script/test-modules.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
                fileStructure[relativePath].files.push({
                    name: item,
                    size: stat.size,
                    modified: stat.mtime
                });
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
        
        results.push({
            module: modulePath,
            exists: exists,
            path: fullPath
        });
        
        if (exists) {
            console.log(`✅ ${modulePath}`);
        } else {
            console.log(`❌ ${modulePath}`);
            allPassed = false;
        }
    });
    
    console.log(`\n📊 Результаты: ${allPassed ? '✅ Все критически модули на месте!' : '❌ Некоторые модули отсутствуют'}`);
    
    return {
        allPassed,
        results,
        projectStructure: allPassed ? scanProjectStructure() : null
    };
}

// Запуск при прямом вызове
if (import.meta.url === `file://${process.argv[1]}`) {
    testCriticalModules();
}
