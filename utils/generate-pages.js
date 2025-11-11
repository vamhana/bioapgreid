const fs = require('fs');
const path = require('path');

/**
 * Автоматически обнаруживает все HTML-страницы в папке pages/
 * и создает конфигурацию для генерации шлюзов
 */
async function autoDiscoverPages() {
    const pagesDir = path.join(__dirname, '..', 'pages');
    
    // Проверяем существование папки pages
    if (!fs.existsSync(pagesDir)) {
        console.log('⚠️ Папка pages/ не найдена, создаем...');
        fs.mkdirSync(pagesDir, { recursive: true });
        return [];
    }
    
    const files = fs.readdirSync(pagesDir)
        .filter(file => file.endsWith('.html'))
        .sort(); // Сортируем для предсказуемого порядка

    console.log(`🔍 Обнаружено ${files.length} страниц в папке pages/`);

    const pagesConfig = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(pagesDir, file);
        
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const pageConfig = await generatePageConfig(file, content, i);
            pagesConfig.push(pageConfig);
            console.log(`📄 Обработана: ${file} → ${pageConfig.name}.html`);
        } catch (error) {
            console.error(`❌ Ошибка обработки ${file}:`, error.message);
        }
    }

    return pagesConfig;
}

/**
 * Генерирует конфигурацию страницы на основе HTML-контента
 */
async function generatePageConfig(filename, htmlContent, index) {
    const metaTags = extractMetaTags(htmlContent);
    const name = filename.replace('.html', '');

    return {
        name: name,
        title: metaTags.title || formatTitle(name),
        level: metaTags.level || `level${index}`,
        description: metaTags.description || `Описание раздела ${formatTitle(name)}`,
        color: metaTags.color || generateColor(index),
        orbitRadius: metaTags.orbitRadius || (150 + (index * 20)),
        orbitAngle: metaTags.orbitAngle || (index * 45) % 360,
        importance: metaTags.importance || (index < 3 ? 'high' : 'medium'),
        icon: metaTags.icon || getIconByIndex(index),
        sizeModifier: metaTags.sizeModifier || '1.0',
        unlocked: metaTags.unlocked !== undefined ? metaTags.unlocked : 'true'
    };
}

/**
 * Извлекает мета-теги галактики из HTML-контента
 */
function extractMetaTags(htmlContent) {
    const metaTags = {};
    const metaRegex = /<meta\s+name="galaxy:([^"]+)"\s+content="([^"]*)"/g;
    
    let match;
    while ((match = metaRegex.exec(htmlContent)) !== null) {
        metaTags[match[1]] = match[2];
    }
    
    return metaTags;
}

/**
 * Форматирует имя файла в читаемое название
 */
function formatTitle(filename) {
    return filename.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Генерирует цвет на основе индекса
 */
function generateColor(index) {
    const colors = [
        '#4ECDC4', '#C7F464', '#FF6B6B', '#FFA5A5', 
        '#A8E6CF', '#D4A5FF', '#FFD166', '#06D6A0',
        '#EF476F', '#118AB2', '#073B4C', '#FF9E00'
    ];
    return colors[index % colors.length];
}

/**
 * Выбирает иконку на основе индекса
 */
function getIconByIndex(index) {
    const icons = ['🪐', '🌍', '⭐', '🌀', '❄️', '🧬', '🧠', '🚀', '🔬', '💊', '🧪', '🔭'];
    return icons[index % icons.length];
}

/**
 * Создает HTML-шаблон для специализированного шлюза
 */
function createHTMLTemplate(config) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- ОБЯЗАТЕЛЬНЫЕ МЕТА-ТЕГИ ГАЛАКТИКИ -->
    <meta name="galaxy:level" content="${config.level}">
    <meta name="galaxy:type" content="planet">
    <meta name="galaxy:title" content="${config.title}">
    <meta name="galaxy:parent" content="">
    <meta name="galaxy:orbit-radius" content="${config.orbitRadius}">
    <meta name="galaxy:orbit-angle" content="${config.orbitAngle}">
    <meta name="galaxy:color" content="${config.color}">
    <meta name="galaxy:size-modifier" content="${config.sizeModifier}">
    <meta name="galaxy:importance" content="${config.importance}">
    <meta name="galaxy:description" content="${config.description}">
    <meta name="galaxy:icon" content="${config.icon}">
    <meta name="galaxy:unlocked" content="${config.unlocked}">
    
    <!-- SEO МЕТА-ТЕГИ -->
    <title>${config.title} | GENOФОНД</title>
    <meta name="description" content="${config.description}">
    <meta property="og:title" content="${config.title}">
    <meta property="og:description" content="${config.description}">
    
    <!-- ПОДКЛЮЧЕНИЕ СТИЛЕЙ -->
    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/galaxy-universe.css">
    <link rel="stylesheet" href="styles/galaxy-components.css">
    
    <!-- АВТО-АКТИВАЦИЯ УРОВНЯ -->
    <script>
        window.autoActivateLevel = '${config.level}';
    </script>
</head>
<body>
    <!-- ОСНОВНАЯ СТРУКТУРА ГАЛАКТИКИ -->
    <div class="galaxy-universe">
        <div class="galaxy-background">
            <div class="stars-layer"></div>
            <div class="nebula-layer"></div>
            <div class="particles-layer"></div>
        </div>
        <div class="celestial-bodies" id="celestialBodies">
            <!-- Автогенерация небесных тел через galaxy-builder -->
        </div>
        <div class="info-panels">
            <div class="panel user-stats">📊 Статистика генофонда</div>
            <div class="panel quick-actions">🚀 Быстрые команды</div>
        </div>
        <div class="content-viewport" id="contentViewport">
            <!-- Контент будет загружен из pages/${config.name}.html -->
        </div>
        <div class="notification-center" id="notifications"></div>
        <div class="preloader" id="preloader">⏳ Инициализация ${config.title.toLowerCase()}</div>
    </div>
    
    <!-- ПОДКЛЮЧЕНИЕ СКРИПТОВ -->
    <script src="js/app.js"></script>
    <script src="js/meta-parser.js"></script>
    <script src="js/galaxy-builder.js"></script>
    <script src="js/visibility-manager.js"></script>
    <script src="js/content-manager.js"></script>
    <script src="js/galaxy-interaction.js"></script>
    <script src="js/galaxy-navigation.js"></script>
    <script src="js/adaptive-positioning.js"></script>
</body>
</html>`;
}

/**
 * Основная функция генерации всех страниц
 */
async function generateAllPages() {
    console.log('🚀 Запуск автоматической генерации шлюзов...');
    
    try {
        const pagesConfig = await autoDiscoverPages();
        
        if (pagesConfig.length === 0) {
            console.log('ℹ️ Не найдено страниц для генерации. Добавьте HTML-файлы в папку pages/');
            return;
        }
        
        let generatedCount = 0;
        
        for (const pageConfig of pagesConfig) {
            try {
                await generatePage(pageConfig);
                generatedCount++;
            } catch (error) {
                console.error(`❌ Ошибка генерации ${pageConfig.name}.html:`, error.message);
            }
        }
        
        console.log(`🎉 Генерация завершена! Создано ${generatedCount} из ${pagesConfig.length} шлюзов`);
        
    } catch (error) {
        console.error('💥 Критическая ошибка при генерации:', error.message);
    }
}

/**
 * Генерирует отдельную страницу на основе конфигурации
 */
async function generatePage(pageConfig) {
    // Валидация конфигурации
    if (!validatePageConfig(pageConfig)) {
        throw new Error(`Невалидная конфигурация для ${pageConfig.name}`);
    }
    
    // Создание HTML-содержимого
    const htmlContent = createHTMLTemplate(pageConfig);
    
    // Определение пути для сохранения
    const outputPath = path.join(__dirname, '..', `${pageConfig.name}.html`);
    
    // Запись файла
    await fs.promises.writeFile(outputPath, htmlContent, 'utf-8');
}

/**
 * Валидация конфигурации страницы
 */
function validatePageConfig(config) {
    const requiredFields = ['name', 'title', 'level', 'description', 'color'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
        console.error(`Отсутствуют обязательные поля: ${missingFields.join(', ')}`);
        return false;
    }
    
    // Проверка корректности уровня
    if (!config.level.match(/^level\d+$/)) {
        console.error(`Некорректный формат уровня: ${config.level}`);
        return false;
    }
    
    // Проверка корректности цвета
    if (!config.color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
        console.error(`Некорректный формат цвета: ${config.color}`);
        return false;
    }
    
    return true;
}

// Запуск генерации при прямом вызове
if (require.main === module) {
    generateAllPages().catch(console.error);
}

module.exports = { generateAllPages, autoDiscoverPages, createHTMLTemplate };
