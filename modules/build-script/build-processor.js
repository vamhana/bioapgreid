import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { BUILD_CONFIG } from './config.js';
import { copyFolderRecursive, createDirectoryIfNotExists, checkGalaxyExists } from './file-utils.js';
import { generateHTML, createGalaxyHtml, createGalaxyRedirect } from './html-generator.js';
import { addFullUrls } from './url-processor.js';
import { scanGalaxy } from './galaxy-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function buildForVercel() {
    console.log('🚀 Building Galaxy Scanner for Vercel...');
    
    const galaxyPath = path.join(__dirname, '../../галактика');
    const publicDir = path.join(__dirname, '../../public');
    
    if (!checkGalaxyExists(galaxyPath)) {
        process.exit(1);
    }
    
    try {
        const result = await scanGalaxy(galaxyPath);
        
        // Добавляем полные URL
        addFullUrls(result);
        
        // Создаем публичную папку
        createDirectoryIfNotExists(publicDir);
        
        // Копируем галактику в public
        const galaxyPublicPath = path.join(publicDir, 'галактика');
        copyFolderRecursive(galaxyPath, galaxyPublicPath);
        console.log('✅ Папка "галактика" скопирована в public для веб-доступа');
        
        // Создаем HTML файлы
        createGalaxyRedirect(galaxyPublicPath);
        
        // Создаем папку для результатов
        const resultsDir = path.join(publicDir, BUILD_CONFIG.RESULTS_DIR);
        createDirectoryIfNotExists(resultsDir);
        
        // Сохраняем sitemap
        const sitemapPath = path.join(resultsDir, BUILD_CONFIG.SITEMAP_FILE);
        fs.writeFileSync(sitemapPath, JSON.stringify(result, null, 2));
        console.log('✅ Создан фиксированный sitemap.json для всех модулей');
        
        // Создаем главную страницу
        const indexPath = path.join(publicDir, 'index.html');
        const html = generateHTML(result);
        fs.writeFileSync(indexPath, html);
        
        // Создаем файл галактики
        createGalaxyHtml(publicDir, result);
        
        // Выводим статистику
        logBuildStats(result, sitemapPath);
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

function logBuildStats(result, sitemapPath) {
    console.log('✅ Galaxy map built successfully!');
    console.log(`📊 Статистика:`);
    Object.entries(result.stats.entities).forEach(([type, count]) => {
        if (count > 0) {
            const icons = { galaxy: '⭐', planet: '🪐', moon: '🌙', asteroid: '☄️', debris: '🛰️' };
            console.log(`   ${icons[type] || '📁'} ${type}: ${count}`);
        }
    });
    console.log(`🎯 Основной файл для модулей: ${sitemapPath}`);
    console.log(`🌐 Доступные URL:`);
    console.log(`   ${BUILD_CONFIG.BASE_URL}/`);
    console.log(`   ${BUILD_CONFIG.BASE_URL}/галактика.html`);
    console.log(`   ${BUILD_CONFIG.BASE_URL}/results/sitemap.json`);
}
