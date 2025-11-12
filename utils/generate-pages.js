import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UnifiedPageGenerator {
    constructor() {
        this.config = {
            // Основные пути
            pagesDir: path.join(__dirname, '..', 'pages'),
            outputDir: path.join(__dirname, '..'),
            backupDir: path.join(__dirname, '..', 'backups'),
            
            // Режимы работы
            mode: 'auto', // 'auto', 'gateway', 'full'
            enableIncremental: true,
            enableBackups: true,
            maxBackupCount: 5,
            
            // Настройки редиректа (для gateway mode)
            redirectDelay: 100,
            redirectUrl: '/',
            
            // Аналитика
            enableAnalytics: false,
            analyticsProvider: 'yandex',
            yandexCounterId: '12345678',
            gaTrackingId: 'G-XXXXXXXXXX',
            
            // Цветовые схемы
            colorSchemes: {
                star: ['#FFD700', '#FFA500', '#FFFF00', '#FF6347'],
                planet: ['#4ECDC4', '#45B7AF', '#3DA199', '#368B84'],
                moon: ['#C7F464', '#B4DC5A', '#A1C350', '#8EAA46'],
                asteroid: ['#FF6B6B', '#E56060', '#CC5555', '#B24A4A'],
                default: ['#6C5CE7', '#A29BFE', '#FD79A8', '#E84393']
            }
        };

        this.fileHashes = new Map();
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
     * Основная функция генерации
     */
    async generateAllPages() {
        console.log('🚀 Запуск унифицированного генератора страниц');
        console.log(`📂 Режим работы: ${this.config.mode}`);
        
        // Проверяем существование папки pages
        if (!fs.existsSync(this.config.pagesDir)) {
            console.log('❌ Папка pages не найдена');
            this.createExamplePage();
            return;
        }

        // Получаем список HTML файлов
        const files = fs.readdirSync(this.config.pagesDir)
            .filter(file => file.endsWith('.html'))
            .sort();

        console.log(`📄 Найдено ${files.length} HTML-файлов`);

        if (files.length === 0) {
            console.log('ℹ️ HTML-файлы не найдены, создаем пример...');
            this.createExamplePage();
            return;
        }

        let generatedCount = 0;
        let errorCount = 0;

        // Создаем бэкап конфигурации
        if (this.config.enableBackups) {
            this.createBackup(files);
        }

        for (const file of files) {
            try {
                const filePath = path.join(this.config.pagesDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Проверка изменений для инкрементальной генерации
                if (this.config.enableIncremental && !this.hasFileChanged(file, content)) {
                    console.log(`⏭️  Пропущена (без изменений): ${file}`);
                    continue;
                }

                // Выбор режима генерации
                let htmlContent;
                if (this.config.mode === 'gateway') {
                    htmlContent = this.createGatewayTemplate(file);
                } else if (this.config.mode === 'full') {
                    const pageConfig = await this.generatePageConfig(file, content);
                    htmlContent = this.createFullTemplate(pageConfig);
                } else {
                    // Автоматический режим: проверяем наличие мета-тегов
                    if (this.hasGalaxyMetaTags(content)) {
                        const pageConfig = await this.generatePageConfig(file, content);
                        htmlContent = this.createFullTemplate(pageConfig);
                    } else {
                        htmlContent = this.createGatewayTemplate(file);
                    }
                }

                // Сохраняем файл
                const outputPath = path.join(this.config.outputDir, file);
                fs.writeFileSync(outputPath, htmlContent, 'utf8');
                
                console.log(`✅ Сгенерирован: ${file}`);
                generatedCount++;
                
            } catch (error) {
                console.error(`❌ Ошибка обработки ${file}:`, error.message);
                errorCount++;
            }
        }

        // Сохраняем хеши файлов
        this.saveFileHashes();

        console.log('─'.repeat(50));
        console.log(`🎉 Генерация завершена!`);
        console.log(`📊 Успешно: ${generatedCount}, Ошибки: ${errorCount}`);
        
        // Генерируем карту сайта
        if (generatedCount > 0) {
            this.generateSiteMap(files);
        }
    }

    /**
     * Создает простой шлюз с редиректом (как в рабочем.txt)
     */
    createGatewayTemplate(filename) {
        const pageName = filename.replace('.html', '');
        
        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GENOФОНД - ${pageName}</title>
    <script>
        // Автоматический редирект на основную страницу
        setTimeout(() => {
            window.location.href = '${this.config.redirectUrl}';
        }, ${this.config.redirectDelay});
    </script>
</head>
<body>
    <noscript>
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; text-align: center; padding: 20px;">
            <h1>GENOФОНД</h1>
            <p>Пожалуйста, включите JavaScript для доступа к контенту.</p>
            <p><a href="${this.config.redirectUrl}" style="color: #4ECDC4; text-decoration: none; font-weight: bold;">
                Перейти на главную страницу
            </a></p>
        </div>
    </noscript>
</body>
</html>`;
    }

    /**
     * Создает полноценную страницу с мета-тегами (как в generate-pages.js)
     */
    createFullTemplate(pageConfig) {
        const analyticsScript = this.generateAnalyticsScript();

        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- МЕТА-ТЕГИ ГАЛАКТИКИ -->
    <meta name="galaxy:level" content="${pageConfig.level}">
    <meta name="galaxy:type" content="${pageConfig.type}">
    <meta name="galaxy:title" content="${pageConfig.title}">
    <meta name="galaxy:description" content="${pageConfig.description}">
    <meta name="galaxy:color" content="${pageConfig.color}">
    <meta name="galaxy:icon" content="${pageConfig.icon}">
    <meta name="galaxy:importance" content="${pageConfig.importance}">
    <meta name="galaxy:parent" content="${pageConfig.parent}">
    <meta name="galaxy:orbit-radius" content="${pageConfig.orbitRadius}">
    <meta name="galaxy:orbit-angle" content="${pageConfig.orbitAngle}">
    <meta name="galaxy:size-modifier" content="${pageConfig.sizeModifier}">
    <meta name="galaxy:unlocked" content="${pageConfig.unlocked}">
    <meta name="galaxy:tags" content="${pageConfig.tags.join(',')}">
    
    <!-- SEO МЕТА-ТЕГИ -->
    <title>${pageConfig.title} | GENOФОНД</title>
    <meta name="description" content="${pageConfig.description}">
    
    ${analyticsScript}
    
    <script>
        window.pageConfig = ${JSON.stringify(pageConfig, null, 2)};
        window.autoActivateLevel = '${pageConfig.level}';
    </script>
</head>
<body>
    <div class="galaxy-universe">
        <div class="galaxy-background">
            <div class="stars-layer"></div>
            <div class="nebula-layer"></div>
        </div>
        
        <nav class="galaxy-navigation">
            <div class="nav-brand">GENOФОНД</div>
            <div class="nav-stats">
                <span>Исследование ${pageConfig.title}</span>
            </div>
        </nav>
        
        <div class="content-viewport">
            <div class="content-loader">
                <div class="loader-spinner"></div>
                <p>Загрузка контента ${pageConfig.title}...</p>
            </div>
        </div>
        
        <div class="preloader">
            <div class="preloader-content">
                <div class="preloader-spinner"></div>
                <div class="preloader-text">Инициализация галактики...</div>
            </div>
        </div>
    </div>
    
    <!-- ПОДКЛЮЧЕНИЕ СКРИПТОВ -->
    <script src="js/app.js"></script>
    <script src="js/galaxy-builder.js"></script>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Страница ${pageConfig.title} загружена');
            // Автоматическая активация уровня в галактике
            if (window.galaxyApp && window.autoActivateLevel) {
                setTimeout(() => {
                    window.galaxyApp.activateLevel(window.autoActivateLevel);
                }, 500);
            }
        });
    </script>
</body>
</html>`;
    }

    /**
     * Генерирует конфигурацию страницы
     */
    async generatePageConfig(filename, htmlContent) {
        const metaTags = this.extractMetaTags(htmlContent);
        const name = filename.replace('.html', '');
        const index = this.fileHashes.size;

        return {
            name: name,
            title: metaTags.title || this.formatTitle(name),
            level: metaTags.level || `level${index}`,
            type: metaTags.type || this.determineEntityType(index),
            description: metaTags.description || `Раздел ${this.formatTitle(name)} проекта GENOФОНД`,
            color: metaTags.color || this.generateColor(index),
            icon: metaTags.icon || this.getEntityIcon(metaTags.type || this.determineEntityType(index)),
            importance: metaTags.importance || this.calculateImportance(index),
            parent: metaTags.parent || '',
            orbitRadius: metaTags.orbitRadius || this.calculateOrbitRadius(index),
            orbitAngle: metaTags.orbitAngle || (index * 45) % 360,
            sizeModifier: metaTags.sizeModifier || '1.0',
            unlocked: metaTags.unlocked !== undefined ? metaTags.unlocked : 'true',
            tags: metaTags.tags ? metaTags.tags.split(',').map(tag => tag.trim()) : [],
            metadata: {
                filename: filename,
                contentHash: this.calculateFileHash(htmlContent),
                generated: new Date().toISOString()
            }
        };
    }

    /**
     * Извлекает мета-теги из HTML
     */
    extractMetaTags(htmlContent) {
        const metaTags = {};
        const metaRegex = /<meta\s+name="galaxy:([^"]+)"\s+content="([^"]*)"/g;
        const titleRegex = /<title>([^<]*)<\/title>/i;
        
        let match;
        while ((match = metaRegex.exec(htmlContent)) !== null) {
            metaTags[match[1]] = match[2];
        }
        
        const titleMatch = htmlContent.match(titleRegex);
        if (titleMatch && !metaTags.title) {
            metaTags.title = titleMatch[1].replace(' | GENOФОНД', '').trim();
        }
        
        return metaTags;
    }

    /**
     * Проверяет наличие мета-тегов галактики
     */
    hasGalaxyMetaTags(htmlContent) {
        return /<meta\s+name="galaxy:/.test(htmlContent);
    }

    /**
     * Вспомогательные методы (из generate-pages.js)
     */
    formatTitle(filename) {
        return filename
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    determineEntityType(index) {
        if (index === 0) return 'star';
        if (index < 3) return 'planet';
        if (index < 8) return 'moon';
        const types = ['asteroid', 'debris', 'station', 'nebula'];
        return types[Math.floor(Math.random() * types.length)];
    }

    generateColor(index) {
        const schemes = Object.values(this.config.colorSchemes);
        const scheme = schemes[index % schemes.length];
        return scheme[index % scheme.length];
    }

    getEntityIcon(type) {
        const icons = {
            star: '⭐',
            planet: '🪐',
            moon: '🌙',
            asteroid: '☄️',
            debris: '🛰️',
            blackhole: '🌀',
            nebula: '🌌',
            station: '🚀'
        };
        return icons[type] || '🔮';
    }

    calculateImportance(index) {
        if (index === 0) return 'high';
        if (index < 5) return 'medium';
        return 'low';
    }

    calculateOrbitRadius(index) {
        return 100 + (index * 20);
    }

    /**
     * Инкрементальная генерация
     */
    calculateFileHash(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    hasFileChanged(filename, content) {
        const newHash = this.calculateFileHash(content);
        const oldHash = this.fileHashes.get(filename);
        
        if (oldHash !== newHash) {
            this.fileHashes.set(filename, newHash);
            return true;
        }
        return false;
    }

    loadFileHashes() {
        const hashesPath = path.join(this.config.backupDir, 'file-hashes.json');
        if (fs.existsSync(hashesPath)) {
            try {
                const hashesData = fs.readFileSync(hashesPath, 'utf-8');
                this.fileHashes = new Map(Object.entries(JSON.parse(hashesData)));
            } catch (error) {
                console.warn('⚠️ Не удалось загрузить хеши файлов');
            }
        }
    }

    saveFileHashes() {
        if (!this.config.enableIncremental) return;
        
        const hashesPath = path.join(this.config.backupDir, 'file-hashes.json');
        try {
            const hashesObject = Object.fromEntries(this.fileHashes);
            fs.writeFileSync(hashesPath, JSON.stringify(hashesObject, null, 2), 'utf-8');
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить хеши файлов');
        }
    }

    /**
     * Бэкапы
     */
    createBackup(files) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.config.backupDir, `backup-${timestamp}.json`);
        
        const backupData = {
            timestamp: new Date().toISOString(),
            files: files,
            fileHashes: Object.fromEntries(this.fileHashes),
            config: this.config
        };
        
        try {
            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
            this.cleanupOldBackups();
            console.log(`💾 Создана резервная копия`);
        } catch (error) {
            console.warn('⚠️ Не удалось создать резервную копию');
        }
    }

    cleanupOldBackups() {
        try {
            const files = fs.readdirSync(this.config.backupDir)
                .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(this.config.backupDir, file),
                    time: fs.statSync(path.join(this.config.backupDir, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);

            if (files.length > this.config.maxBackupCount) {
                const toDelete = files.slice(this.config.maxBackupCount);
                toDelete.forEach(file => fs.unlinkSync(file.path));
            }
        } catch (error) {
            console.warn('⚠️ Не удалось очистить старые резервные копии');
        }
    }

    /**
     * Аналитика
     */
    generateAnalyticsScript() {
        if (!this.config.enableAnalytics) return '';

        switch (this.config.analyticsProvider) {
            case 'yandex':
                return `<!-- Yandex.Metrika -->
<script type="text/javascript" >
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
   ym(${this.config.yandexCounterId}, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true});
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/${this.config.yandexCounterId}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>`;

            case 'google':
                return `<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${this.config.gaTrackingId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${this.config.gaTrackingId}');
</script>`;

            default:
                return '';
        }
    }

    /**
     * Карта сайта
     */
    generateSiteMap(files) {
        const siteMap = {
            generated: new Date().toISOString(),
            totalPages: files.length,
            pages: files.map(file => ({
                file: file,
                url: `/${file}`,
                generated: new Date().toISOString()
            }))
        };
        
        const siteMapPath = path.join(this.config.outputDir, 'sitemap.json');
        try {
            fs.writeFileSync(siteMapPath, JSON.stringify(siteMap, null, 2), 'utf-8');
            console.log('🗺️ Создана карта сайта');
        } catch (error) {
            console.warn('⚠️ Не удалось создать карту сайта');
        }
    }

    /**
     * Пример страницы
     */
    createExamplePage() {
        const exampleContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Пример страницы | GENOФОНД</title>
</head>
<body>
    <h1>Пример страницы</h1>
    <p>Добавьте свои HTML-файлы в папку pages/</p>
</body>
</html>`;

        const examplePath = path.join(this.config.pagesDir, 'example.html');
        try {
            fs.writeFileSync(examplePath, exampleContent, 'utf-8');
            console.log('📝 Создан пример страницы');
        } catch (error) {
            console.warn('⚠️ Не удалось создать пример страницы');
        }
    }
}

// Создаем и экспортируем генератор
const pageGenerator = new UnifiedPageGenerator();

// Запуск при прямом вызове
if (import.meta.url === `file://${process.argv[1]}`) {
    pageGenerator.generateAllPages().catch(error => {
        console.error('❌ Генерация завершена с ошибками:', error);
        process.exit(1);
    });
}

export { UnifiedPageGenerator, pageGenerator };
export default UnifiedPageGenerator;
