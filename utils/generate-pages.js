// galaxy-genofond/utils/generate-pages.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎯 ===== ГЕНЕРАТОР СТРАНИЦ ЗАПУЩЕН =====');

// Глобальный обработчик ошибок
process.on('uncaughtException', (error) => {
    console.error('💥 НЕОБРАБОТАННАЯ ОШИБКА:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 НЕОБРАБОТАННЫЙ PROMISE:', reason);
    process.exit(1);
});

try {
    // Базовые пути
    const pagesDir = path.join(__dirname, '..', 'pages');
    const outputDir = path.join(__dirname, '..');
    
    console.log('📁 Текущая директория:', __dirname);
    console.log('📁 Папка pages:', pagesDir);
    console.log('📁 Выходная директория:', outputDir);

    // Проверяем существование папки pages
    if (!fs.existsSync(pagesDir)) {
        console.log('❌ Папка pages/ не существует. Создаю...');
        fs.mkdirSync(pagesDir, { recursive: true });
        
        // Создаем пример файла
        const exampleContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="galaxy:level" content="example-level">
    <meta name="galaxy:type" content="planet">
    <meta name="galaxy:title" content="Пример страницы">
    <title>Пример</title>
</head>
<body>
    <h1>Пример страницы</h1>
    <p>Добавьте свои HTML файлы в папку pages/</p>
</body>
</html>`;
        
        fs.writeFileSync(path.join(pagesDir, 'example.html'), exampleContent);
        console.log('📝 Создан пример: pages/example.html');
    }

    // Сканируем папку pages
    console.log('🔍 Сканирую папку pages/...');
    const files = fs.readdirSync(pagesDir)
        .filter(file => file.endsWith('.html'))
        .sort();

    console.log(`📄 Найдено HTML файлов: ${files.length}`);

    if (files.length === 0) {
        console.log('ℹ️ В папке pages/ нет HTML файлов. Добавьте файлы и перезапустите.');
        process.exit(0);
    }

    // Выводим список файлов
    console.log('📋 Список файлов:');
    files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
    });

    let generatedCount = 0;

    // Обрабатываем каждый файл
    for (const file of files) {
        try {
            console.log(`\n🔄 Обрабатываю: ${file}`);
            
            const filePath = path.join(pagesDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            
            // Простой парсинг meta тегов
            const metaTags = {};
            const metaRegex = /<meta\s+name="galaxy:([^"]+)"\s+content="([^"]*)"/g;
            let match;
            
            while ((match = metaRegex.exec(content)) !== null) {
                metaTags[match[1]] = match[2];
            }

            console.log(`   📍 Мета-теги:`, Object.keys(metaTags).length > 0 ? metaTags : 'не найдены');

            // Извлекаем title
            const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
            const title = titleMatch ? titleMatch[1] : file.replace('.html', '');

            // Создаем HTML шлюз
            const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - GENOФОНД</title>
    <meta name="description" content="${metaTags.description || 'Страница галактики GENOФОНД'}">
    
    <!-- Мета-теги галактики -->
    <meta name="galaxy:gateway" content="true">
    <meta name="galaxy:target-level" content="${metaTags.level || file.replace('.html', '')}">
    <meta name="galaxy:entity-type" content="${metaTags.type || 'planet'}">
    <meta name="galaxy:entity-color" content="${metaTags.color || '#4a90e2'}">
    <meta name="galaxy:importance" content="${metaTags.importance || 'medium'}">
    
    <!-- Стили -->
    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/galaxy-universe.css">
    <link rel="stylesheet" href="styles/galaxy-components.css">
    
    <!-- Шрифты -->
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body>
    <div class="galaxy-universe" data-gateway-target="${metaTags.level || file.replace('.html', '')}">
        <div class="galaxy-background">
            <div class="stars-layer"></div>
            <div class="nebula-layer"></div>
            <div class="particles-layer"></div>
        </div>
        
        <div class="celestial-bodies" id="celestialBodies">
            <!-- Автогенерация через GalaxyBuilder -->
        </div>
        
        <div class="info-panels">
            <div class="panel user-stats">
                <h3>${metaTags.title || title}</h3>
                <p>${metaTags.description || 'Исследуйте знания в галактике GENOФОНД'}</p>
                <div class="progress-indicator">
                    <span>Уровень: ${metaTags.level || 'base'}</span>
                </div>
            </div>
        </div>
        
        <div class="content-viewport" style="display: none;">
            <div class="content-viewport-header">
                <button class="close-content">×</button>
                <h2>${metaTags.title || title}</h2>
            </div>
            <div class="content-wrapper">
                <!-- Контент будет загружен через ContentManager -->
            </div>
        </div>
        
        <div class="notification-center"></div>
        <div class="preloader">
            <div class="preloader-spinner"></div>
            <p>Загрузка галактики ${metaTags.title || title}...</p>
        </div>
    </div>

    <!-- Скрипты -->
    <script type="module" src="js/app.js"></script>
    <script type="module">
        // Автоактивация целевого уровня
        window.autoActivateLevel = '${metaTags.level || file.replace('.html', '')}';
        console.log('🚀 Галактика GENOФОНД запускается...');
    </script>
</body>
</html>`;

            const outputPath = path.join(outputDir, file);
            fs.writeFileSync(outputPath, htmlContent, 'utf8');
            generatedCount++;
            
            console.log(`✅ Успешно создан: ${file}`);

        } catch (error) {
            console.error(`❌ Ошибка при обработке ${file}:`, error.message);
        }
    }

    // Создаем карту сайта
    try {
        const siteMap = {
            baseUrl: 'https://www.bioapgreid.ru',
            generated: new Date().toISOString(),
            pages: files.map(file => ({
                filename: file,
                url: `/${file}`,
                title: file.replace('.html', '')
            }))
        };

        const siteMapPath = path.join(outputDir, 'sitemap.json');
        fs.writeFileSync(siteMapPath, JSON.stringify(siteMap, null, 2));
        console.log('🗺️ Создана карта сайта: sitemap.json');
    } catch (error) {
        console.error('❌ Ошибка создания карты сайта:', error.message);
    }

    console.log('\n🎊 ===== ГЕНЕРАЦИЯ ЗАВЕРШЕНА =====');
    console.log(`📊 Итог: ${generatedCount}/${files.length} файлов обработано`);
    
    if (generatedCount === files.length) {
        console.log('✅ Все файлы успешно сгенерированы!');
        process.exit(0);
    } else {
        console.log('⚠️ Некоторые файлы не были обработаны');
        process.exit(1);
    }

} catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
}
