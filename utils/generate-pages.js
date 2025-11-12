// galaxy-genofond/utils/generate-pages.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎯 Генератор страниц запущен');

try {
    const pagesDir = path.join(__dirname, '..', 'pages');
    const outputDir = path.join(__dirname, '..');

    console.log('📁 Проверяем папку pages:', pagesDir);

    if (!fs.existsSync(pagesDir)) {
        console.log('❌ Папка pages не найдена. Создаем...');
        fs.mkdirSync(pagesDir, { recursive: true });
        console.log('✅ Папка pages создана');
    }

    const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.html'));
    console.log(`📄 Найдено ${files.length} HTML-файлов`);

    if (files.length === 0) {
        console.log('ℹ️ В папке pages нет HTML-файлов. Создаем пример...');
        const exampleContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="galaxy:level" content="example">
    <meta name="galaxy:type" content="planet">
    <meta name="galaxy:title" content="Пример">
    <title>Пример</title>
</head>
<body>
    <h1>Пример страницы</h1>
</body>
</html>`;
        fs.writeFileSync(path.join(pagesDir, 'example.html'), exampleContent);
        console.log('✅ Пример страницы создан: example.html');
        files.push('example.html');
    }

    let generatedCount = 0;
    for (const file of files) {
        try {
            console.log(`🔨 Обрабатываем ${file}...`);
            const filePath = path.join(pagesDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            // Извлекаем meta-теги
            const metaTags = {};
            const metaRegex = /<meta\s+name="galaxy:([^"]+)"\s+content="([^"]*)"/g;
            let match;
            while ((match = metaRegex.exec(content)) !== null) {
                metaTags[match[1]] = match[2];
            }

            // Извлекаем title
            const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
            const title = titleMatch ? titleMatch[1] : file.replace('.html', '');

            // Генерируем HTML-шлюз
            const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - GENOФОНД</title>
    <meta name="description" content="${metaTags.description || 'Страница галактики GENOФОНД'}">
    <meta name="galaxy:gateway" content="true">
    <meta name="galaxy:target-level" content="${metaTags.level || file.replace('.html', '')}">
    <meta name="galaxy:entity-type" content="${metaTags.type || 'planet'}">
    <meta name="galaxy:entity-color" content="${metaTags.color || '#4a90e2'}">
    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/galaxy-universe.css">
    <link rel="stylesheet" href="styles/galaxy-components.css">
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body>
    <div class="galaxy-universe" data-gateway-target="${metaTags.level || file.replace('.html', '')}">
        <div class="galaxy-background">
            <div class="stars-layer"></div>
            <div class="nebula-layer"></div>
            <div class="particles-layer"></div>
        </div>
        <div class="celestial-bodies" id="celestialBodies"></div>
        <div class="info-panels">
            <div class="panel user-stats">
                <h3>${metaTags.title || title}</h3>
                <p>${metaTags.description || 'Исследуйте знания'}</p>
            </div>
        </div>
        <div class="content-viewport" style="display: none;">
            <div class="content-loader">Загрузка...</div>
        </div>
        <div class="preloader">Загрузка галактики...</div>
    </div>
    <script type="module" src="js/app.js"></script>
    <script type="module">
        window.autoActivateLevel = '${metaTags.level || file.replace('.html', '')}';
    </script>
</body>
</html>`;

            const outputPath = path.join(outputDir, file);
            fs.writeFileSync(outputPath, htmlContent, 'utf8');
            generatedCount++;
            console.log(`✅ Сгенерирован шлюз для ${file}`);
        } catch (error) {
            console.error(`❌ Ошибка при обработке ${file}:`, error.message);
        }
    }

    console.log(`🎉 Генерация завершена. Успешно сгенерировано: ${generatedCount} файлов`);
} catch (error) {
    console.error('💥 Критическая ошибка в генераторе:', error);
    process.exit(1);
}
