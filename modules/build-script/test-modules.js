import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function testModules() {
    console.log('🧪 Тестирование модулей приложения...\n');
    
    const modulesToTest = [
        'modules/app/core/app.js',
        'modules/app/core/galaxy-data-loader.js', 
        'modules/app/core/galaxy-renderer.js',
        'modules/app/interaction/progression-tracker.js',
        'modules/build-script/build-processor.js',
        'scanner/index.js'
    ];
    
    let allPassed = true;
    
    modulesToTest.forEach(modulePath => {
        const fullPath = path.join(__dirname, '../..', modulePath);
        if (fs.existsSync(fullPath)) {
            console.log(`✅ ${modulePath} - найден`);
        } else {
            console.log(`❌ ${modulePath} - не найден`);
            allPassed = false;
        }
    });
    
    console.log('\n📊 Результаты:');
    console.log(allPassed ? '✅ Все модули на месте!' : '❌ Некоторые модули отсутствуют');
    
    return allPassed;
}

testModules();
