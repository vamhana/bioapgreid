// galaxy-genofond/utils/generate-pages.js
// СТАТУС: РАБОЧИЙ ДЛЯ ES MODULES И GITHUB PAGES

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PageGenerator {
    constructor() {
        this.config = {
            pagesDir: path.join(__dirname, '..', 'pages'),
            outputDir: path.join(__dirname, '..'),
            baseUrl: 'https://www.bioapgreid.ru',
            enableIncremental: true
        };

        this.fileHashes = new Map();
        this.isGenerating = false;
        
        this.ensureDirectories();
        this.loadFileHashes();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.config.pagesDir)) {
            fs.mkdirSync(this.config.pagesDir, { recursive: true });
            console.log('📁 Создана папка pages/');
        }
    }

    loadFileHashes() {
        try {
            const hashesPath = path.join(this.config.pagesDir, '.file-hashes.json');
            if (fs.existsSync(hashesPath)) {
                const data = fs.readFileSync(hashesPath, 'utf8');
                this.fileHashes = new Map(Object.entries(JSON.parse(data)));
            }
        } catch (error) {
            // Игнорируем ошибки загрузки хешей
        }
    }

    saveFileHashes() {
        try {
            const hashesPath = path.join(this.config.pagesDir, '.file-hashes.json');
            const data = Object.fromEntries(this.fileHashes);
            fs.writeFileSync(hashesPath, JSON.stringify(data, null, 2));
        } catch (error) {
            // Игнорируем ошибки сохранения хешей
        }
    }

    calculateFileHash(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    hasFileChanged(filename, content) {
        if (!this.config.enableIncremental) return true;
        
        const newHash = this.calculateFileHash(content);
        const oldHash = this.fileHashes.get(filename);
        
        if (oldHash !== newHash) {
            this.fileHashes.set(filename, newHash);
            return true;
        }
        
        return false;
    }

    autoDiscoverPages() {
        console.log('🔍 Сканирование папки pages/...');
        
        if (!fs.existsSync(this.config.pagesDir)) {
            console.log('❌ Папка pages/ не существует');
            return [];
        }

        const files = fs.readdirSync(this.config.pagesDir)
            .filter(file => file.endsWith('.html'))
            .sort();

        console.log(`📄 Найдено ${files.length} HTML-файлов`);

        const pagesConfig = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filePath = path.join(this.config.pagesDir, file);
            
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                
                if (!this.hasFileChanged(file, content)) {
                    console.log(`⏭️  Пропущен (без изменений): ${file}`);
                    continue;
                }
                
                const pageConfig = this.generatePageConfig(file, content, i, files.length);
                pagesConfig.push(pageConfig);
                
                console.log(`✅ Обработан: ${file} → ${pageConfig.name}.html`);
            } catch (error) {
                console.error(`❌ Ошибка обработки ${file}:`, error.message);
            }
        }

        return pagesConfig;
    }

    extractMetaTags(htmlContent) {
        const metaTags = {};
        const metaRegex = /<meta\s+name="galaxy:([^"]+)"\s+content="([^"]*)"\s*\/?>/gi;
        let match;

        while ((match = metaRegex.exec(htmlContent)) !== null) {
            const key = match[1];
            const value = match[2];
            metaTags[key] = value;
        }

        // Извлечение title
        const titleMatch = htmlContent.match(/<title>([^<]*)<\/title>/i);
        if (titleMatch) {
            metaTags.title = titleMatch[1];
        }

        return metaTags;
    }

    generatePageConfig(filename, htmlContent, index, totalPages) {
        const metaTags = this.extractMetaTags(htmlContent);
        const name = path.basename(filename, '.html');
        
        const config = {
            filename: name,
            level: metaTags.level || `level${index}`,
            type: metaTags.type || this.determineTypeByIndex(index),
            title: metaTags.title || this.formatTitle(name),
            parent: metaTags.parent || (index > 0 ? 'level0' : null),
            description: metaTags.description || `Страница ${name}`,
            color: metaTags.color || this.generateColorByIndex(index),
            importance: metaTags.importance || 'medium',
            orbitRadius: metaTags.orbitRadius || this.calculateOrbitRadius(index),
            orbitAngle: metaTags.orbitAngle || this.calculateOrbitAngle(index),
            sizeModifier: metaTags.sizeModifier || '1.0',
            unlocked: metaTags.unlocked !== 'false',
            index: index,
            total: totalPages
        };

        return config;
    }

    determineTypeByIndex(index) {
        const types = ['planet', 'moon', 'asteroid', 'star', 'gateway'];
        return types[index % types.length];
    }

    formatTitle(filename) {
        return filename
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    generateColorByIndex(index) {
        const colors = ['#4a90e2', '#50e3c2', '#b8e986', '#bd10e0', '#9013fe'];
        return colors[index % colors.length];
    }

    calculateOrbitRadius(index) {
        return 120 + (index % 5) * 40;
    }

    calculateOrbitAngle(index) {
        return (index * 137.5) % 360;
    }

    createHTMLTemplate(pageConfig) {
        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageConfig.title} - GENOФОНД Галактика</title>
    <meta name="description" content="${pageConfig.description}">
    
    <!-- Мета-теги для галактики -->
    <meta name="galaxy:gateway" content="true">
    <meta name="galaxy:target-level" content="${pageConfig.level}">
    <meta name="galaxy:entity-type" content="${pageConfig.type}">
    <meta name="galaxy:entity-color" content="${pageConfig.color}">
    <meta name="galaxy:importance" content="${pageConfig.importance}">
    
    <!-- Стили -->
    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/galaxy-universe.css">
    <link rel="stylesheet" href="styles/galaxy-components.css">
    
    <!-- Шрифты -->
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body>
    <div class="galaxy-universe" data-gateway-target="${pageConfig.level}">
        <div class="galaxy-background">
            <div class="stars-layer"></div>
            <div class="nebula-layer"></div>
            <div class="particles-layer"></div>
        </div>
        
        <div class="celestial-bodies">
            <!-- Сущности будут созданы через GalaxyBuilder -->
        </div>
        
        <div class="info-panels">
            <div class="panel user-stats">
                <h3>${pageConfig.title}</h3>
                <p>${pageConfig.description}</p>
                <div class="progress-indicator">
                    <span>Уровень: ${pageConfig.level}</span>
                </div>
            </div>
        </div>
        
        <div class="content-viewport" style="display: none;">
            <div class="content-viewport-header">
                <button class="close-content">×</button>
                <h2>${pageConfig.title}</h2>
            </div>
            <div class="content-wrapper">
                <!-- Контент будет загружен через ContentManager -->
            </div>
        </div>
        
        <div class="notification-center"></div>
        <div class="preloader">
            <div class="preloader-spinner"></div>
            <p>Загрузка галактики ${pageConfig.title}...</p>
        </div>
    </div>

    <!-- Скрипты -->
    <script type="module" src="js/app.js"></script>
    <script type="module">
        // Автоактивация целевого уровня
        window.autoActivateLevel = '${pageConfig.level}';
    </script>
</body>
</html>`;
    }

    generateSiteMap(pagesConfig) {
        const siteMap = {
            baseUrl: this.config.baseUrl,
            generated: new Date().toISOString(),
            pages: pagesConfig.map(config => ({
                level: config.level,
                type: config.type,
                title: config.title,
                filename: config.filename + '.html',
                url: `${this.config.baseUrl}/${config.filename}.html`,
                description: config.description
            }))
        };

        const siteMapPath = path.join(this.config.outputDir, 'sitemap.json');
        fs.writeFileSync(siteMapPath, JSON.stringify(siteMap, null, 2));
        console.log('🗺️ Создана карта сайта: sitemap.json');
        
        return siteMap;
    }

    async generateAllPages() {
        if (this.isGenerating) {
            console.log('⏳ Генерация уже выполняется...');
            return false;
        }
        
        this.isGenerating = true;
        console.log('🚀 Запуск генерации страниц галактики...');
        
        try {
            const pagesConfig = this.autoDiscoverPages();
            
            if (pagesConfig.length === 0) {
                console.log('ℹ️ Нет новых или измененных страниц для генерации');
                return true;
            }

            let generatedCount = 0;
            
            console.log('\n📁 Генерация шлюзов:');
            console.log('─'.repeat(40));
            
            for (const pageConfig of pagesConfig) {
                try {
                    const htmlContent = this.createHTMLTemplate(pageConfig);
                    const outputPath = path.join(this.config.outputDir, `${pageConfig.filename}.html`);
                    
                    fs.writeFileSync(outputPath, htmlContent, 'utf8');
                    generatedCount++;
                    
                    console.log(`✅ ${pageConfig.filename}.html (${pageConfig.type})`);
                } catch (error) {
                    console.error(`❌ ${pageConfig.filename}.html: ${error.message}`);
                }
            }
            
            if (generatedCount > 0) {
                this.generateSiteMap(pagesConfig);
            }
            
            this.saveFileHashes();
            
            console.log('─'.repeat(40));
            console.log(`🎉 Генерация завершена! Создано ${generatedCount} шлюзов`);
            
            return generatedCount > 0;
        } catch (error) {
            console.error('💥 Критическая ошибка:', error);
            return false;
        } finally {
            this.isGenerating = false;
        }
    }
}

// Создаем и запускаем генератор
const generator = new PageGenerator();

// Запуск генерации
generator.generateAllPages().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('💥 Ошибка запуска:', error);
    process.exit(1);
});
