async function main() {
    // Приоритет: аргументы -> переменные окружения -> значение по умолчанию
    const galaxyPath = process.argv[2] || 
                      process.env.GALAXY_SOURCE_PATH || 
                      '../галактика';
    
    try {
        const scanner = new GalaxyScanner(galaxyPath);
        const result = await scanner.scan();
        await scanner.saveScanResult(result);
        
    } catch (error) {
        logger.error('Сканирование завершилось с ошибкой', error.message);
        process.exit(1);
    }
}