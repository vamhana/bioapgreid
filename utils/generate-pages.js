import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PageGenerator {
    constructor() {
        this.config = {
            // Основные настройки путей
            pagesDir: path.join(__dirname, '..', 'pages'),
            outputDir: path.join(__dirname, '..'),
            backupDir: path.join(__dirname, '..', 'backups'),
            
            // Настройки генерации
            enableIncremental: true,
            enableWatcher: false,
            watcherInterval: 2000,
            maxBackupCount: 10,
            
            // Настройки для GitHub Pages
            baseUrl: 'https://www.bioapgreid.ru',
            
            // Настройки аналитики
            enableAnalytics: false,
            analyticsProvider: 'yandex', // 'yandex', 'google', 'none'
            yandexCounterId: '12345678', // ЗАМЕНИТЬ НА РЕАЛЬНЫЙ ID
            gaTrackingId: 'G-XXXXXXXXXX', // ЗАМЕНИТЬ НА РЕАЛЬНЫЙ ID
            
            // Цветовые схемы и иконки
            colorSchemes: {
                star: ['#FFD700', '#FFA500', '#FFFF00', '#FF6347'],
                planet: ['#4ECDC4', '#45B7AF', '#3DA199', '#368B84'],
                moon: ['#C7F464', '#B4DC5A', '#A1C350', '#8EAA46'],
                asteroid: ['#FF6B6B', '#E56060', '#CC5555', '#B24A4A'],
                debris: ['#A8E6CF', '#97CFBA', '#86B8A5', '#75A190'],
                blackhole: ['#2C3E50', '#34495E', '#2C3E50', '#1A252F'],
                nebula: ['#D4A5FF', '#BF94E6', '#AA83CC', '#9572B3'],
                station: ['#FFD166', '#E6BC5C', '#CCA752', '#B39248']
            },
            entityIcons: {
                star: '⭐',
                planet: '🪐',
                moon: '🌙',
                asteroid: '☄️',
                debris: '🛰️',
                blackhole: '🌀',
                nebula: '🌌',
                station: '🚀'
            },
            entitySizes: {
                star: '1.8',
                planet: '1.2',
                moon: '0.8',
                asteroid: '0.6',
                debris: '0.4',
                blackhole: '2.0',
                nebula: '2.5',
                station: '0.9'
            }
        };

        this.fileHashes = new Map();
        this.watcher = null;
        this.isGenerating = false;
        
        this.ensureDirectories();
        this.loadFileHashes();
    }

    /**
     * Создает необходимые директории
     */
    ensureDirectories() {
        const dirs = [this.config.pagesDir, this.config.backupDir];
        
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Создана директория: ${dir}`);
            }
        }
    }

    /**
     * Загружает хеши файлов для инкрементальной генерации
     */
    loadFileHashes() {
        const hashesPath = path.join(this.config.backupDir, 'file-hashes.json');
        
        if (fs.existsSync(hashesPath)) {
            try {
                const hashesData = fs.readFileSync(hashesPath, 'utf-8');
                this.fileHashes = new Map(Object.entries(JSON.parse(hashesData)));
                console.log(`📊 Загружены хеши ${this.fileHashes.size} файлов`);
            } catch (error) {
                console.warn('⚠️ Не удалось загрузить хеши файлов:', error.message);
            }
        }
    }

    /**
     * Сохраняет хеши файлов
     */
    saveFileHashes() {
        const hashesPath = path.join(this.config.backupDir, 'file-hashes.json');
        const hashesObject = Object.fromEntries(this.fileHashes);
        
        try {
            fs.writeFileSync(hashesPath, JSON.stringify(hashesObject, null, 2), 'utf-8');
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить хеши файлов:', error.message);
        }
    }

    /**
     * Вычисляет хеш содержимого файла
     */
    calculateFileHash(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * Проверяет, изменился ли файл
     */
    hasFileChanged(filename, content) {
        const newHash = this.calculateFileHash(content);
        const oldHash = this.fileHashes.get(filename);
        
        if (oldHash !== newHash) {
            this.fileHashes.set(filename, newHash);
            return true;
        }
        
        return false;
    }

    /**
     * Создает резервную копию конфигурации
     */
    createBackup(pagesConfig) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.config.backupDir, `pages-config-${timestamp}.json`);
        
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '2.1.1',
                pages: pagesConfig,
                statistics: this.generateStatistics(pagesConfig)
            };
            
            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
            
            // Ограничение количества резервных копий
            this.cleanupOldBackups();
            
            console.log(`💾 Создана резервная копия: ${path.basename(backupPath)}`);
        } catch (error) {
            console.warn('⚠️ Не удалось создать резервную копию:', error.message);
        }
    }

    /**
     * Удаляет старые резервные копии
     */
    cleanupOldBackups() {
        try {
            const files = fs.readdirSync(this.config.backupDir)
                .filter(file => file.startsWith('pages-config-') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(this.config.backupDir, file),
                    time: fs.statSync(path.join(this.config.backupDir, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);

            // Удаляем все, кроме первых maxBackupCount
            if (files.length > this.config.maxBackupCount) {
                const toDelete = files.slice(this.config.maxBackupCount);
                toDelete.forEach(file => {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️ Удалена старая резервная копия: ${file.name}`);
                });
            }
        } catch (error) {
            console.warn('⚠️ Не удалось очистить старые резервные копии:', error.message);
        }
    }

    /**
     * Генерирует статистику по страницам
     */
    generateStatistics(pagesConfig) {
        const stats = {
            total: pagesConfig.length,
            byType: {},
            byImportance: {},
            withErrors: 0,
            generated: new Date().toISOString()
        };

        pagesConfig.forEach(page => {
            // Статистика по типам
            stats.byType[page.type] = (stats.byType[page.type] || 0) + 1;
            
            // Статистика по важности
            stats.byImportance[page.importance] = (stats.byImportance[page.importance] || 0) + 1;
            
            // Подсчет ошибок
            if (page.validationErrors && page.validationErrors.length > 0) {
                stats.withErrors++;
            }
        });

        return stats;
    }

    /**
     * Автоматически обнаруживает все HTML-страницы в папке pages/
     */
    async autoDiscoverPages() {
        console.log('🔍 Сканирование папки pages/...');
        
        // Проверяем существование папки pages
        if (!fs.existsSync(this.config.pagesDir)) {
            console.log('⚠️ Папка pages/ не найдена, создаем...');
            this.ensureDirectories();
            this.createExamplePage();
            return [];
        }
        
        const files = fs.readdirSync(this.config.pagesDir)
            .filter(file => file.endsWith('.html'))
            .sort();

        console.log(`📄 Обнаружено ${files.length} страниц в папке pages/`);

        const pagesConfig = [];
        const hierarchyMap = new Map();

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filePath = path.join(this.config.pagesDir, file);
            
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                
                // Проверка изменений для инкрементальной генерации
                if (this.config.enableIncremental && !this.hasFileChanged(file, content)) {
                    console.log(`⏭️  Пропущена (без изменений): ${file}`);
                    continue;
                }
                
                const pageConfig = await this.generatePageConfig(file, content, i, files.length);
                pagesConfig.push(pageConfig);
                
                // Сохраняем для проверки иерархии
                hierarchyMap.set(pageConfig.level, pageConfig);
                
                console.log(`📄 Обработана: ${file} → ${pageConfig.name}.html (${pageConfig.type})`);
            } catch (error) {
                console.error(`❌ Ошибка обработки ${file}:`, error.message);
            }
        }

        // Проверяем иерархические отношения
        this.validateHierarchy(pagesConfig, hierarchyMap);

        return pagesConfig;
    }

    /**
     * Создает пример страницы для демонстрации
     */
    createExamplePage() {
        const exampleContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- МЕТА-ТЕГИ ГАЛАКТИКИ v2.1 -->
    <meta name="galaxy:level" content="level0">
    <meta name="galaxy:type" content="planet">
    <meta name="galaxy:title" content="Пример раздела">
    <meta name="galaxy:description" content="Это пример страницы для демонстрации работы генератора">
    <meta name="galaxy:color" content="#4ECDC4">
    <meta name="galaxy:icon" content="🪐">
    <meta name="galaxy:importance" content="high">
    <meta name="galaxy:parent" content="">
    <meta name="galaxy:orbit-radius" content="120">
    <meta name="galaxy:orbit-angle" content="0">
    <meta name="galaxy:size-modifier" content="1.2">
    <meta name="galaxy:unlocked" content="true">
    <meta name="galaxy:tags" content="пример,демонстрация,начало">
    
    <title>Пример раздела | GENOФОНД</title>
</head>
<body>
    <div class="content">
        <h1>Пример раздела</h1>
        <p>Это пример страницы. Добавьте свои HTML-файлы в папку pages/ и запустите генератор снова.</p>
        
        <h2>Поддерживаемые мета-теги:</h2>
        <ul>
            <li><code>galaxy:level</code> - идентификатор уровня</li>
            <li><code>galaxy:type</code> - тип сущности (planet, moon, star, etc.)</li>
            <li><code>galaxy:title</code> - название сущности</li>
            <li><code>galaxy:description</code> - описание</li>
            <li><code>galaxy:color</code> - цвет в HEX</li>
            <li><code>galaxy:icon</code> - иконка эмодзи</li>
            <li><code>galaxy:importance</code> - важность (high, medium, low)</li>
            <li><code>galaxy:parent</code> - родительский уровень</li>
            <li>И другие...</li>
        </ul>
    </div>
</body>
</html>`;

        const examplePath = path.join(this.config.pagesDir, 'example-page.html');
        fs.writeFileSync(examplePath, exampleContent, 'utf-8');
        console.log('📝 Создан пример страницы: example-page.html');
    }

    /**
     * Генерирует конфигурацию страницы на основе HTML-контента
     */
    async generatePageConfig(filename, htmlContent, index, totalPages) {
        const metaTags = this.extractMetaTags(htmlContent);
        const name = filename.replace('.html', '');

        // Определяем тип сущности на основе содержимого или индекса
        const entityType = this.determineEntityType(metaTags, index, totalPages);

        const config = {
            name: name,
            title: metaTags.title || this.formatTitle(name),
            level: metaTags.level || `level${index}`,
            type: entityType,
            description: metaTags.description || `Описание раздела ${this.formatTitle(name)}`,
            color: metaTags.color || this.generateColor(index, entityType),
            orbitRadius: metaTags.orbitRadius || this.calculateOrbitRadius(index, entityType),
            orbitAngle: metaTags.orbitAngle || (index * (360 / Math.max(1, totalPages))) % 360,
            importance: metaTags.importance || this.calculateImportance(index, totalPages),
            icon: metaTags.icon || this.config.entityIcons[entityType] || '🔮',
            sizeModifier: metaTags.sizeModifier || this.config.entitySizes[entityType] || '1.0',
            unlocked: metaTags.unlocked !== undefined ? metaTags.unlocked : 'true',
            parent: metaTags.parent || '',
            children: [],
            metadata: {
                depth: metaTags.depth || 0,
                tags: metaTags.tags ? metaTags.tags.split(',').map(tag => tag.trim()) : [],
                created: metaTags.created || new Date().toISOString().split('T')[0],
                lastModified: new Date().toISOString(),
                contentHash: this.calculateFileHash(htmlContent),
                previewImage: this.generatePreviewImage(name, entityType)
            },
            validationErrors: []
        };

        // Валидация конфигурации
        config.validationErrors = this.validatePageConfig(config);
        
        return config;
    }

    /**
     * Генерирует путь к превью-изображению
     */
    generatePreviewImage(name, entityType) {
        const previewsDir = path.join(this.config.outputDir, 'assets', 'previews');
        
        // Создаем директорию для превью, если её нет
        if (!fs.existsSync(previewsDir)) {
            fs.mkdirSync(previewsDir, { recursive: true });
        }
        
        const previewFilename = `${name}-preview.png`;
        const previewPath = path.join(previewsDir, previewFilename);
        
        // Здесь может быть логика генерации превью-изображений
        // Пока возвращаем путь к заглушке
        return `/assets/previews/${previewFilename}`;
    }

    /**
     * Определяет тип сущности на основе мета-тегов и контекста
     */
    determineEntityType(metaTags, index, totalPages) {
        // Приоритет отдается явно указанному типу
        if (metaTags.type && this.isValidEntityType(metaTags.type)) {
            return metaTags.type;
        }
        
        // Автоматическое определение на основе позиции и контента
        if (index === 0) return 'star';
        if (index < 3) return 'planet';
        if (index < 8) return 'moon';
        
        // Случайное распределение для остальных
        const types = ['asteroid', 'debris', 'station', 'nebula'];
        return types[Math.floor(Math.random() * types.length)];
    }

    /**
     * Проверяет валидность типа сущности
     */
    isValidEntityType(type) {
        const validTypes = Object.keys(this.config.entityIcons);
        return validTypes.includes(type);
    }

    /**
     * Извлекает мета-теги галактики из HTML-контента
     */
    extractMetaTags(htmlContent) {
        const metaTags = {};
        
        // Регулярные выражения для извлечения мета-тегов
        const metaRegex = /<meta\s+name="galaxy:([^"]+)"\s+content="([^"]*)"/g;
        const titleRegex = /<title>([^<]*)<\/title>/i;
        
        // Извлекаем стандартные мета-теги галактики
        let match;
        while ((match = metaRegex.exec(htmlContent)) !== null) {
            metaTags[match[1]] = match[2];
        }
        
        // Извлекаем title страницы как резервное значение
        const titleMatch = htmlContent.match(titleRegex);
        if (titleMatch && !metaTags.title) {
            metaTags.title = titleMatch[1].replace(' | GENOФОНД', '').trim();
        }
        
        return metaTags;
    }

    /**
     * Форматирует имя файла в читаемое название
     */
    formatTitle(filename) {
        return filename
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
            .replace(/\.html$/, '');
    }

    /**
     * Генерирует цвет на основе индекса и типа сущности
     */
    generateColor(index, entityType) {
        const scheme = this.config.colorSchemes[entityType] || this.config.colorSchemes.planet;
        return scheme[index % scheme.length];
    }

    /**
     * Вычисляет радиус орбиты на основе индекса и типа
     */
    calculateOrbitRadius(index, entityType) {
        const baseRadii = {
            star: 0,
            planet: 120,
            moon: 60,
            asteroid: 40,
            debris: 20,
            blackhole: 150,
            nebula: 180,
            station: 80
        };
        
        const baseRadius = baseRadii[entityType] || 100;
        return baseRadius + (index * 15);
    }

    /**
     * Вычисляет важность на основе позиции и общего количества
     */
    calculateImportance(index, totalPages) {
        if (index === 0) return 'high';
        if (index < Math.ceil(totalPages * 0.2)) return 'high';
        if (index < Math.ceil(totalPages * 0.5)) return 'medium';
        return 'low';
    }

    /**
     * Проверяет иерархические отношения между страницами
     */
    validateHierarchy(pagesConfig, hierarchyMap) {
        let hasOrphans = false;
        let hasCycles = false;
        
        pagesConfig.forEach(page => {
            // Проверка существования родителя
            if (page.parent && !hierarchyMap.has(page.parent)) {
                console.warn(`⚠️ Страница ${page.level} ссылается на несуществующего родителя ${page.parent}`);
                page.parent = '';
                page.validationErrors.push(`Несуществующий родитель: ${page.parent}`);
                hasOrphans = true;
            }
            
            // Находим дочерние элементы
            page.children = pagesConfig.filter(p => p.parent === page.level)
                .map(p => p.level);
        });
        
        // Проверяем циклические зависимости
        if (this.detectCycles(pagesConfig)) {
            hasCycles = true;
        }
        
        if (hasOrphans || hasCycles) {
            console.log('ℹ️ Обнаружены проблемы в иерархии страниц');
        }
    }

    /**
     * Обнаруживает циклические зависимости в иерархии
     */
    detectCycles(pagesConfig) {
        const visited = new Set();
        const recursionStack = new Set();
        let hasCycle = false;
        
        const checkCycle = (level) => {
            if (recursionStack.has(level)) return true;
            if (visited.has(level)) return false;
            
            visited.add(level);
            recursionStack.add(level);
            
            const page = pagesConfig.find(p => p.level === level);
            if (page) {
                for (const childLevel of page.children) {
                    if (checkCycle(childLevel)) return true;
                }
            }
            
            recursionStack.delete(level);
            return false;
        };
        
        pagesConfig.forEach(page => {
            if (!visited.has(page.level) && checkCycle(page.level)) {
                console.warn(`⚠️ Обнаружена циклическая зависимость для страницы ${page.level}`);
                page.parent = '';
                page.validationErrors.push('Обнаружена циклическая зависимость');
                hasCycle = true;
            }
        });
        
        return hasCycle;
    }

    /**
     * Валидация конфигурации страницы
     */
    validatePageConfig(config) {
        const errors = [];
        const requiredFields = ['name', 'title', 'level', 'type', 'description', 'color'];
        
        // Проверка обязательных полей
        requiredFields.forEach(field => {
            if (!config[field]) {
                errors.push(`Отсутствует обязательное поле: ${field}`);
            }
        });
        
        // Проверка корректности уровня
        if (!config.level.match(/^[a-zA-Z0-9_-]+$/)) {
            errors.push(`Некорректный формат уровня: ${config.level}`);
        }
        
        // Проверка корректности типа
        if (!this.isValidEntityType(config.type)) {
            errors.push(`Некорректный тип сущности: ${config.type}`);
        }
        
        // Проверка корректности цвета
        if (!config.color.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
            errors.push(`Некорректный формат цвета: ${config.color}`);
        }
        
        // Проверка числовых значений
        if (isNaN(parseFloat(config.orbitRadius)) || parseFloat(config.orbitRadius) <= 0) {
            errors.push(`Некорректный радиус орбиты: ${config.orbitRadius}`);
        }
        
        if (isNaN(parseFloat(config.orbitAngle))) {
            errors.push(`Некорректный угол орбиты: ${config.orbitAngle}`);
        }
        
        return errors;
    }

    /**
     * Генерирует скрипт аналитики на основе конфигурации
     */
    generateAnalyticsScript() {
        if (!this.config.enableAnalytics) return '';
        
        switch (this.config.analyticsProvider) {
            case 'yandex':
                return `
    <!-- Yandex.Metrika counter -->
    <script type="text/javascript" >
        (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
        
        ym(${this.config.yandexCounterId}, "init", {
            clickmap:true,
            trackLinks:true,
            accurateTrackBounce:true,
            webvisor:true
        });
    </script>
    <noscript><div><img src="https://mc.yandex.ru/watch/${this.config.yandexCounterId}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
    <!-- /Yandex.Metrika counter -->`;
                
            case 'google':
                return `
    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${this.config.gaTrackingId}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${this.config.gaTrackingId}');
    </script>`;
                
            default:
                return `
    <!-- Базовая аналитика -->
    <script>
        window.addEventListener('load', function() {
            const analyticsData = {
                page: window.location.pathname,
                timestamp: new Date().toISOString(),
                referrer: document.referrer,
                userAgent: navigator.userAgent
            };
            
            // Сохраняем в localStorage для последующего анализа
            try {
                const sessionKey = 'ga_session_' + new Date().toDateString();
                let sessionData = JSON.parse(localStorage.getItem(sessionKey) || '{"pageViews": []}');
                sessionData.pageViews.push(analyticsData);
                localStorage.setItem(sessionKey, JSON.stringify(sessionData));
                console.log('📊 Analytics recorded:', analyticsData);
            } catch (e) {
                console.log('📊 Analytics (fallback):', analyticsData);
            }
        });
    </script>`;
        }
    }

    /**
     * Создает HTML-шаблон для специализированного шлюза
     */
    createHTMLTemplate(config) {
        const additionalMetaTags = config.metadata.tags.length > 0 ? 
            `    <meta name="galaxy:tags" content="${config.metadata.tags.join(',')}">\n` : '';
        
        const analyticsScript = this.generateAnalyticsScript();

        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- ОБЯЗАТЕЛЬНЫЕ МЕТА-ТЕГИ ГАЛАКТИКИ v2.1 -->
    <meta name="galaxy:level" content="${config.level}">
    <meta name="galaxy:type" content="${config.type}">
    <meta name="galaxy:title" content="${config.title}">
    <meta name="galaxy:parent" content="${config.parent}">
    <meta name="galaxy:orbit-radius" content="${config.orbitRadius}">
    <meta name="galaxy:orbit-angle" content="${config.orbitAngle}">
    <meta name="galaxy:color" content="${config.color}">
    <meta name="galaxy:size-modifier" content="${config.sizeModifier}">
    <meta name="galaxy:importance" content="${config.importance}">
    <meta name="galaxy:description" content="${config.description}">
    <meta name="galaxy:icon" content="${config.icon}">
    <meta name="galaxy:unlocked" content="${config.unlocked}">
${additionalMetaTags}
    <!-- SEO МЕТА-ТЕГИ -->
    <title>${config.title} | GENOФОНД</title>
    <meta name="description" content="${config.description}">
    <meta property="og:title" content="${config.title}">
    <meta property="og:description" content="${config.description}">
    <meta property="og:type" content="website">
    <meta property="og:image" content="${config.metadata.previewImage}">
    <meta property="og:url" content="/${config.name}.html">
    
    <!-- ПОДКЛЮЧЕНИЕ СТИЛЕЙ -->
    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/galaxy-universe.css">
    <link rel="stylesheet" href="styles/galaxy-components.css">
    
    ${analyticsScript}
    
    <!-- АВТО-АКТИВАЦИЯ УРОВНЯ -->
    <script>
        window.autoActivateLevel = '${config.level}';
        window.pageConfig = ${JSON.stringify(config, null, 2)};
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
        
        <!-- НАВИГАЦИЯ И СТАТУС-ПАНЕЛИ -->
        <nav class="galaxy-navigation">
            <div class="nav-brand">GENOФОНД</div>
            <div class="nav-stats">
                <span id="exploredPlanets">0</span> исследовано • 
                <span id="progressLevel">0%</span> прогресс
            </div>
            <div class="nav-controls">
                <button class="nav-btn" id="zoomOut">🔍−</button>
                <span id="zoomLevel">100%</span>
                <button class="nav-btn" id="zoomIn">🔍+</button>
            </div>
        </nav>
        
        <div class="breadcrumbs" id="breadcrumbs">
            <span class="breadcrumb-item">Галактика GENOФОНД</span>
        </div>
        
        <!-- ОСНОВНОЙ КОНТЕЙНЕР ГАЛАКТИКИ -->
        <div class="celestial-bodies" id="celestialBodies">
            <!-- Автогенерация небесных тел через galaxy-builder -->
        </div>
        
        <!-- ИНФОРМАЦИОННЫЕ ПАНЕЛИ -->
        <div class="info-panels">
            <div class="panel user-stats">
                <h3>📊 Статистика генофонда</h3>
                <div class="stats-grid">
                    <div class="stat-item">Исследовано: <span id="statsExplored">0</span></div>
                    <div class="stat-item">В процессе: <span id="statsInProgress">0</span></div>
                    <div class="stat-item">Заблокировано: <span id="statsLocked">0</span></div>
                </div>
            </div>
            <div class="panel quick-actions">
                <h3>🚀 Быстрые команды</h3>
                <button class="action-btn" id="resetView">Сбросить вид</button>
                <button class="action-btn" id="toggleDebug">Режим отладки</button>
            </div>
        </div>
        
        <!-- ОСНОВНОЙ КОНТЕНТ -->
        <div class="content-viewport" id="contentViewport">
            <div class="content-loader">
                <div class="loader-spinner"></div>
                <p>Загрузка контента ${config.title}...</p>
            </div>
        </div>
        
        <!-- УВЕДОМЛЕНИЯ И ПРЕЛОАДЕР -->
        <div class="notification-center" id="notifications"></div>
        <div class="preloader" id="preloader">
            <div class="preloader-content">
                <div class="preloader-spinner"></div>
                <div class="preloader-text" id="preloaderText">Инициализация галактики...</div>
                <div class="preloader-progress">
                    <div class="preloader-progress-fill" id="preloaderProgress"></div>
                </div>
            </div>
        </div>
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
    
    <!-- ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (window.app) {
                window.app.init().catch(function(error) {
                    console.error('Ошибка инициализации:', error);
                    document.getElementById('preloader').innerHTML = 
                        '<div class="error-message">Ошибка загрузки: ' + error.message + '</div>';
                });
            }
        });
    </script>
</body>
</html>`;
    }

    /**
     * Генерирует карту сайта для навигации
     */
    generateSiteMap(pagesConfig) {
        const siteMap = {
            version: '2.1.1',
            generated: new Date().toISOString(),
            baseUrl: this.config.baseUrl,
            pages: pagesConfig.map(page => ({
                level: page.level,
                title: page.title,
                type: page.type,
                importance: page.importance,
                url: `/${page.name}.html`,
                parent: page.parent || null,
                children: page.children,
                metadata: page.metadata,
                validationErrors: page.validationErrors
            })),
            statistics: this.generateStatistics(pagesConfig)
        };
        
        const siteMapPath = path.join(this.config.outputDir, 'sitemap.json');
        fs.writeFileSync(siteMapPath, JSON.stringify(siteMap, null, 2), 'utf-8');
        console.log('🗺️ Создана карта сайта: sitemap.json');
        
        return siteMap;
    }

    /**
     * Настраивает отслеживание изменений в папке pages
     */
    setupWatcher() {
        if (!this.config.enableWatcher) return;
        
        console.log('👀 Запуск отслеживания изменений в папке pages/...');
        
        this.watcher = setInterval(() => {
            if (this.isGenerating) return;
            
            this.isGenerating = true;
            this.generateAllPages().finally(() => {
                this.isGenerating = false;
            });
        }, this.config.watcherInterval);
    }

    /**
     * Останавливает отслеживание изменений
     */
    stopWatcher() {
        if (this.watcher) {
            clearInterval(this.watcher);
            this.watcher = null;
            console.log('👀 Отслеживание изменений остановлено');
        }
    }

    /**
     * Основная функция генерации всех страниц
     */
    async generateAllPages() {
        if (this.isGenerating) {
            console.log('⏳ Генерация уже выполняется, пропускаем...');
            return;
        }
        
        this.isGenerating = true;
        const startTime = Date.now();
        
        console.log('🚀 Запуск автоматической генерации шлюзов v2.1.1...');
        console.log('═'.repeat(60));
        
        try {
            const pagesConfig = await this.autoDiscoverPages();
            
            if (pagesConfig.length === 0) {
                console.log('ℹ️ Не найдено новых или измененных страниц для генерации.');
                return;
            }
            
            let generatedCount = 0;
            let errorCount = 0;
            
            console.log('\n📁 Генерация шлюзов:');
            console.log('─'.repeat(60));
            
            for (const pageConfig of pagesConfig) {
                try {
                    await this.generatePage(pageConfig);
                    generatedCount++;
                    
                    const statusIcon = pageConfig.validationErrors.length > 0 ? '⚠️' : '✅';
                    console.log(`${statusIcon} ${pageConfig.name}.html (${pageConfig.type} • ${pageConfig.importance})`);
                    
                    if (pageConfig.validationErrors.length > 0) {
                        console.log(`   Предупреждения: ${pageConfig.validationErrors.join(', ')}`);
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`❌ ${pageConfig.name}.html: ${error.message}`);
                }
            }
            
            // Генерируем карту сайта
            this.generateSiteMap(pagesConfig);
            
            // Создаем резервную копию
            this.createBackup(pagesConfig);
            
            // Сохраняем хеши файлов
            this.saveFileHashes();
            
            const endTime = Date.now();
            const generationTime = ((endTime - startTime) / 1000).toFixed(2);
            
            console.log('─'.repeat(60));
            console.log(`🎉 Генерация завершена за ${generationTime}с`);
            console.log(`📊 Результат: ${generatedCount} успешно, ${errorCount} с ошибками`);
            
            // Статистика по типам
            const typeStats = {};
            pagesConfig.forEach(page => {
                typeStats[page.type] = (typeStats[page.type] || 0) + 1;
            });
            
            console.log('\n📈 Статистика по типам:');
            Object.entries(typeStats).forEach(([type, count]) => {
                console.log(`   ${this.config.entityIcons[type] || '🔮'} ${type}: ${count}`);
            });
            
            // Информация об аналитике
            if (this.config.enableAnalytics) {
                console.log(`\n📊 Аналитика: ${this.config.analyticsProvider.toUpperCase()} ${this.config.analyticsProvider === 'yandex' ? '(ID: ' + this.config.yandexCounterId + ')' : ''}`);
            }
            
        } catch (error) {
            console.error('💥 Критическая ошибка при генерации:', error.message);
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Генерирует отдельную страницу на основе конфигурации
     */
    async generatePage(pageConfig) {
        // Валидация конфигурации
        if (pageConfig.validationErrors.length > 0) {
            console.warn(`⚠️ Конфигурация ${pageConfig.name} содержит ошибки:`, pageConfig.validationErrors);
        }
        
        // Создание HTML-содержимого
        const htmlContent = this.createHTMLTemplate(pageConfig);
        
        // Определение пути для сохранения
        const outputPath = path.join(this.config.outputDir, `${pageConfig.name}.html`);
        
        // Запись файла
        await fs.promises.writeFile(outputPath, htmlContent, 'utf-8');
    }
}

// Создаем экземпляр генератора
const pageGenerator = new PageGenerator();

// Запуск генерации при прямом вызове
if (import.meta.url === `file://${process.argv[1]}`) {
    pageGenerator.generateAllPages().catch(console.error);
    
    // Запускаем отслеживание изменений, если включено
    if (pageGenerator.config.enableWatcher) {
        pageGenerator.setupWatcher();
        
        // Обработка graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Остановка генератора...');
            pageGenerator.stopWatcher();
            process.exit(0);
        });
    }
}

export { 
    PageGenerator,
    pageGenerator,
    generateAllPages: () => pageGenerator.generateAllPages(),
    autoDiscoverPages: () => pageGenerator.autoDiscoverPages(),
    createHTMLTemplate: (config) => pageGenerator.createHTMLTemplate(config),
    generateSiteMap: (config) => pageGenerator.generateSiteMap(config)
};

export default PageGenerator;
