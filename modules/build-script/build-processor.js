// modules/build-script/build-processor.js
export async function buildForVercel() {
    console.log('🚀 Building Galaxy Scanner for Vercel...');
    const galaxyPath = path.join(__dirname, '../../galaxy');
    const publicDir = path.join(__dirname, '../../public');
    
    if (!checkGalaxyExists(galaxyPath)) {
        process.exit(1);
    }
    
    try {
        const result = await scanGalaxy(galaxyPath);
        // ТОЛЬКО добавляем URL, НЕ позиции!
        addFullUrls(result);
        
        // Создаем публичную папку
        createDirectoryIfNotExists(publicDir);
        
        // Копируем галактику в public
        const galaxyPublicPath = path.join(publicDir, 'galaxy');
        copyFolderRecursive(galaxyPath, galaxyPublicPath);
        console.log('✅ Папка "galaxy" скопирована в public для веб-доступа');
        
        // Сохраняем ЧИСТЫЙ sitemap
        const resultsDir = path.join(publicDir, BUILD_CONFIG.RESULTS_DIR);
        createDirectoryIfNotExists(resultsDir);
        const sitemapPath = path.join(resultsDir, BUILD_CONFIG.SITEMAP_FILE);
        fs.writeFileSync(sitemapPath, JSON.stringify(result, null, 2));
        console.log('✅ Создан чистый sitemap.json для модулей');
        
        // Создаем минимальную главную страницу (будет заменена 3D сценой)
        createMainApp(publicDir, result);
        
        logBuildStats(result, sitemapPath);
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}
