import GalaxyScanner from './index.js';

async function run() {
    const galaxyPath = process.argv[2] || '../галактика';
    
    try {
        const scanner = new GalaxyScanner(galaxyPath);
        const result = await scanner.scan();
        
        await scanner.saveScanResult(result);
        
        console.log('\n📊 КРАТКАЯ СТАТИСТИКА:');
        console.log('====================');
        Object.entries(result.stats.entities).forEach(([type, count]) => {
            if (count > 0) {
                console.log(`📁 ${type}: ${count} сущностей`);
            }
        });
        console.log(`⏱️  Время сканирования: ${result.scanDuration}ms`);
        console.log(`📄 Файлов просканировано: ${result.stats.filesScanned}`);
        console.log(`❌ Ошибок: ${result.stats.errors}`);
        
    } catch (error) {
        console.error('❌ Сканирование завершилось с ошибкой:', error.message);
        process.exit(1);
    }
}

run();