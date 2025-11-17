// bioapgreid/modules/build-script/build-processor.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { BUILD_CONFIG } from './config.js';
import { copyFolderRecursive, createDirectoryIfNotExists, checkGalaxyExists } from './file-utils.js';
import { addFullUrls } from './url-processor.js';
import { scanGalaxy } from './galaxy-scanner.js';
import { createMainApp } from './app-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function buildForVercel() {
    console.log('🚀 Building Galaxy Scanner for Vercel...');
    
    // Пути относительно корня проекта
    const projectRoot = process.cwd();
    const galaxyPath = path.join(projectRoot, 'galaxy');
    const publicDir = path.join(projectRoot, 'public');
    
    console.log('📁 Project root:', projectRoot);
    console.log('📁 Galaxy path:', galaxyPath);
    console.log('📁 Public path:', publicDir);
    
    if (!checkGalaxyExists(galaxyPath)) {
        process.exit(1);
    }
    
    try {
        const result = await scanGalaxy(galaxyPath);
        
        // Добавляем полные URL
        addFullUrls(result);
        
        // ОЧИЩАЕМ публичную папку перед сборкой
        if (fs.existsSync(publicDir)) {
            fs.rmSync(publicDir, { recursive: true });
        }
        
        // Создаем публичную папку
        createDirectoryIfNotExists(publicDir);
        
        // Копируем ТОЛЬКО galaxy в public (это нужно для прямых ссылок на сущности)
        const galaxyPublicPath = path.join(publicDir, 'galaxy');
        copyFolderRecursive(galaxyPath, galaxyPublicPath);
        console.log('✅ Папка "galaxy" скопирована в public для веб-доступа');
        
        // Создаем папку для результатов
        const resultsDir = path.join(publicDir, BUILD_CONFIG.RESULTS_DIR);
        createDirectoryIfNotExists(resultsDir);
        
        // Сохраняем sitemap
        const sitemapPath = path.join(resultsDir, BUILD_CONFIG.SITEMAP_FILE);
        fs.writeFileSync(sitemapPath, JSON.stringify(result, null, 2));
        console.log('✅ Создан чистый sitemap.json для модулей');
        
        // Создаем главное приложение
        await createMainApp(publicDir, result);
        
        // Выводим статистику
        logBuildStats(result, sitemapPath);
        
        // Показываем что попало в public
        console.log('📁 Содержимое public после сборки:');
        listPublicContents(publicDir);
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

function listPublicContents(publicDir, indent = '') {
    const items = fs.readdirSync(publicDir);
    items.forEach(item => {
        const itemPath = path.join(publicDir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
            console.log(`${indent}📁 ${item}/`);
            listPublicContents(itemPath, indent + '  ');
        } else {
            console.log(`${indent}📄 ${item}`);
        }
    });
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
}
