import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VercelBuild {
    constructor() {
        this.rootDir = path.join(__dirname, '..');
        this.config = {
            outputDir: this.rootDir,
            pagesDir: path.join(this.rootDir, 'pages'),
            assetsDir: path.join(this.rootDir, 'assets')
        };
    }

    async run() {
        console.log('🚀 Starting Vercel build adaptation...');
        
        try {
            // Ensure required directories exist
            this.ensureDirectories();
            
            // Generate vercel.json if it doesn't exist
            await this.generateVercelConfig();
            
            // Validate build structure
            await this.validateBuild();
            
            console.log('✅ Vercel build adaptation completed successfully');
        } catch (error) {
            console.error('❌ Vercel build adaptation failed:', error.message);
            process.exit(1);
        }
    }

    ensureDirectories() {
        const dirs = [
            this.config.pagesDir,
            this.config.assetsDir,
            path.join(this.config.assetsDir, 'previews')
        ];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Created directory: ${path.relative(this.rootDir, dir)}`);
            }
        }
    }

    async generateVercelConfig() {
        const vercelConfig = {
            version: 2,
            builds: [
                {
                    src: "package.json",
                    use: "@vercel/static"
                }
            ],
            routes: [
                {
                    src: "/(.*)",
                    dest: "/$1"
                }
            ],
            outputDirectory: ".",
            cleanUrls: true,
            trailingSlash: false,
            rewrites: [
                {
                    source: "/(.*).html",
                    destination: "/$1.html"
                },
                {
                    source: "/",
                    destination: "/index.html"
                }
            ]
        };

        const vercelConfigPath = path.join(this.rootDir, 'vercel.json');
        
        if (!fs.existsSync(vercelConfigPath)) {
            fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2));
            console.log('📝 Created vercel.json configuration');
        }
    }

    async validateBuild() {
        const requiredFiles = [
            'index.html',
            'styles/main.css',
            'js/app.js'
        ];

        const missingFiles = requiredFiles.filter(file => 
            !fs.existsSync(path.join(this.rootDir, file))
        );

        if (missingFiles.length > 0) {
            console.warn('⚠️ Missing required files:', missingFiles);
        } else {
            console.log('✅ All required files are present');
        }

        // Check if pages were generated
        const htmlFiles = fs.readdirSync(this.rootDir)
            .filter(file => file.endsWith('.html') && file !== 'index.html');

        if (htmlFiles.length === 0) {
            console.warn('⚠️ No generated HTML pages found. Running page generator...');
            await this.runPageGenerator();
        } else {
            console.log(`✅ Found ${htmlFiles.length} generated pages`);
        }
    }

    async runPageGenerator() {
        try {
            const { generateAllPages } = await import('./generate-pages.js');
            await generateAllPages();
        } catch (error) {
            console.error('❌ Failed to generate pages:', error.message);
            // Create a basic index as fallback
            this.createFallbackIndex();
        }
    }

    createFallbackIndex() {
        const fallbackHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GENOФОНД - Образовательная платформа</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #0f0f23;
            color: #fff;
            text-align: center;
        }
        .container { 
            max-width: 800px; 
            margin: 100px auto; 
        }
        h1 { 
            color: #4ECDC4; 
            font-size: 2.5em; 
            margin-bottom: 20px;
        }
        .status {
            background: #1a1a2e;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌌 GENOФОНД Галактика</h1>
        <div class="status">
            <p>Платформа находится в процессе развертывания...</p>
            <p>Пожалуйста, обновите страницу через несколько минут.</p>
        </div>
        <p>Интерактивная образовательная платформа для исследования знаний</p>
    </div>
</body>
</html>`;

        fs.writeFileSync(path.join(this.rootDir, 'index.html'), fallbackHtml);
        console.log('📝 Created fallback index.html');
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const builder = new VercelBuild();
    builder.run().catch(console.error);
}

export default VercelBuild;
