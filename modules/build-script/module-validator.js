import fs from 'fs';
import path from 'path';
import { ensureDefaultExport, getAllFiles, createDirectoryIfNotExists } from './build-utils.js';

export class ModuleValidator {
    constructor() {
        this.criticalModules = [
            { path: 'core/app.js', name: 'GalaxyApp' },
            { path: 'core/galaxy-renderer.js', name: 'GalaxyRenderer' },
            { path: 'core/three-scene-manager.js', name: 'ThreeSceneManager' },
            { path: 'core/camera-controller.js', name: 'CameraController' }
        ];
        
        this.moduleTemplates = {
            'core/app.js': `// Auto-generated fallback module
export class GalaxyApp {
    constructor() {
        console.warn('⚠️ Using fallback GalaxyApp');
    }
    async init() {
        throw new Error('Fallback GalaxyApp - modules missing');
    }
}
export default GalaxyApp;`,

            'core/galaxy-renderer.js': `// Auto-generated fallback module
export class GalaxyRenderer {
    constructor() {
        console.warn('⚠️ Using fallback GalaxyRenderer');
    }
    async init() {
        console.warn('Fallback renderer initialized');
    }
}
export default GalaxyRenderer;`,

            'core/three-scene-manager.js': `// Auto-generated fallback module
export class ThreeSceneManager {
    constructor() {
        console.warn('⚠️ Using fallback ThreeSceneManager');
    }
    async init() {
        console.warn('Fallback scene manager initialized');
    }
}
export default ThreeSceneManager;`,

            'core/camera-controller.js': `// Auto-generated fallback module  
export class CameraController {
    constructor() {
        console.warn('⚠️ Using fallback CameraController');
    }
    init() {
        console.warn('Fallback camera controller initialized');
    }
}
export default CameraController;`
        };
    }

    async validateAndFixModules(appPublicPath, statsManager) {
        console.log('   🔧 Проверка и исправление модулей...');
        
        // Исправление экспортов
        const exportResults = await this.fixModuleExports(appPublicPath);
        statsManager.updateModuleStats(exportResults.fixed, exportResults.errors);
        
        // Проверка Three.js зависимостей
        const threeDepsOk = this.checkThreeJSDependencies(appPublicPath);
        
        // Валидация критических модулей
        await this.validateCriticalModules(appPublicPath);
        
        // Анализ модулей для статистики
        const appFiles = getAllFiles(appPublicPath);
        statsManager.analyzeAppModules(appFiles);
        
        return {
            exportsFixed: exportResults.fixed,
            exportsErrors: exportResults.errors,
            threeDepsOk,
            totalModules: appFiles.length
        };
    }

    async fixModuleExports(appPublicPath) {
        console.log('   📦 Проверка экспортов модулей...');
        
        const filesToCheck = [
            'core/app.js',
            'core/galaxy-data-loader.js', 
            'core/galaxy-renderer.js',
            'core/camera-controller.js',
            'core/three-scene-manager.js',
            'core/spatial-partitioner.js',
            'core/security-validator.js',
            'core/memory-manager.js',
            'core/lod-manager.js',
            'interaction/progression-tracker.js',
            'interaction/entity-interaction.js',
            'ui/user-panel.js',
            'ui/minimap-navigation.js',
            'utils/asset-manager.js',
            'utils/performance-optimizer.js'
        ];
        
        let fixedCount = 0;
        let errorCount = 0;
        
        for (const filePath of filesToCheck) {
            const fullPath = path.join(appPublicPath, filePath);
            if (fs.existsSync(fullPath)) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const fixedContent = ensureDefaultExport(content, filePath);
                    
                    if (fixedContent !== content) {
                        fs.writeFileSync(fullPath, fixedContent);
                        fixedCount++;
                        console.log(`     ✅ Исправлен: ${filePath}`);
                    }
                } catch (error) {
                    errorCount++;
                    console.warn(`     ❌ Ошибка в ${filePath}:`, error.message);
                }
            } else {
                console.warn(`     ⚠️ Файл не найден: ${filePath}`);
            }
        }
        
        if (fixedCount > 0) {
            console.log(`   🔧 Исправлено экспортов: ${fixedCount} файлов`);
        } else {
            console.log('   ✅ Все экспорты в порядке');
        }
        
        if (errorCount > 0) {
            console.warn(`   ⚠️ Ошибки в модулях: ${errorCount}`);
        }
        
        return { fixed: fixedCount, errors: errorCount };
    }

    checkThreeJSDependencies(appPublicPath) {
        console.log('   🔍 Проверка Three.js зависимостей...');
        
        const threeModules = [
            'core/three-scene-manager.js',
            'core/spatial-partitioner.js',
            'core/lod-manager.js',
            'core/galaxy-renderer.js',
            'core/camera-controller.js'
        ];
        
        let threeDependenciesOk = true;
        let missingThreeImports = [];
        
        for (const modulePath of threeModules) {
            const fullPath = path.join(appPublicPath, modulePath);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                
                if (!content.includes("import * as THREE") && !content.includes('from "three"') && !content.includes("from 'three'")) {
                    missingThreeImports.push(modulePath);
                    threeDependenciesOk = false;
                }
            }
        }
        
        if (threeDependenciesOk) {
            console.log('   ✅ Three.js зависимости в порядке');
        } else {
            console.warn('   ⚠️ Проблемы с Three.js зависимостями:');
            missingThreeImports.forEach(module => {
                console.warn(`     ❌ ${module}: отсутствует импорт THREE`);
            });
        }
        
        return threeDependenciesOk;
    }

    async validateCriticalModules(appPublicPath) {
        console.log('   🎯 Проверка критических модулей...');
        
        let missingModules = [];
        
        for (const module of this.criticalModules) {
            const fullPath = path.join(appPublicPath, module.path);
            if (!fs.existsSync(fullPath)) {
                missingModules.push(module);
            }
        }
        
        if (missingModules.length > 0) {
            console.warn('   ⚠️ Отсутствуют критические модули:');
            missingModules.forEach(module => {
                console.warn(`     ❌ ${module.path} (${module.name})`);
            });
            
            this.createMissingCriticalModules(appPublicPath, missingModules);
        } else {
            console.log('   ✅ Все критические модули присутствуют');
        }
    }

    createMissingCriticalModules(appPublicPath, missingModules) {
        console.log('   🛠️ Создание отсутствующих критических модулей...');
        
        missingModules.forEach(module => {
            const fullPath = path.join(appPublicPath, module.path);
            const dir = path.dirname(fullPath);
            
            createDirectoryIfNotExists(dir);
            
            if (this.moduleTemplates[module.path]) {
                fs.writeFileSync(fullPath, this.moduleTemplates[module.path]);
                console.log(`     ✅ Создан: ${module.path}`);
            }
        });
    }

    createEnhancedFallbackAppModules(publicDir) {
        const appPublicPath = path.join(publicDir, 'app');
        createDirectoryIfNotExists(appPublicPath);
        
        const corePath = path.join(appPublicPath, 'core');
        createDirectoryIfNotExists(corePath);
        
        // Создаем улучшенный app.js с диагностикой
        const appJsContent = `// Enhanced fallback app.js with detailed diagnostics
export class GalaxyApp {
    constructor() {
        console.log('🚀 Enhanced Fallback GalaxyApp created');
        this.diagnostics = this.collectDiagnostics();
    }

    collectDiagnostics() {
        return {
            platform: this.detectPlatform(),
            userAgent: navigator.userAgent,
            supportsES6: 'noModule' in HTMLScriptElement.prototype,
            isOnline: navigator.onLine,
            screenSize: window.innerWidth + 'x' + window.innerHeight,
            webGL: this.detectWebGLSupport(),
            threeJS: this.checkThreeJS(),
            timestamp: new Date().toISOString(),
            buildInfo: {
                type: 'fallback',
                version: '1.0.0-fallback',
                modules: 'missing'
            }
        };
    }

    async init() {
        console.log('📱 Enhanced Diagnostics:', this.diagnostics);
        this.showFallbackUI();
        throw new Error('Enhanced Fallback: Application modules not found. Check build process.');
    }

    showFallbackUI() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = 
                '<div style="color: #ff6b6b; font-size: 24px; margin-bottom: 20px;">⚠️ Three.js Modules Missing</div>' +
                '<div style="background: rgba(255,107,107,0.1); padding: 15px; border-radius: 10px; margin: 10px 0;">' +
                '<strong>Build Issue Detected</strong><br>' +
                'Application modules were not properly built.<br>' +
                'Please check the build process and rebuild.' +
                '</div>' +
                '<div style="font-size: 12px; opacity: 0.7; margin-top: 15px;">' + 
                'Platform: ' + this.diagnostics.platform + '<br>' +
                'WebGL: ' + this.diagnostics.webGL + '<br>' +
                'Three.js: ' + this.diagnostics.threeJS + '<br>' +
                'ES6 Modules: ' + this.diagnostics.supportsES6 + '<br>' +
                'Online: ' + this.diagnostics.isOnline +
                '</div>' +
                '<button onclick="window.location.reload()" style="' +
                'background: #ff6b6b; color: white; border: none; padding: 10px 20px; ' +
                'border-radius: 20px; cursor: pointer; margin-top: 15px; font-weight: bold;">' +
                '🔄 Retry Build</button>';
        }
    }

    detectPlatform() {
        const ua = navigator.userAgent;
        if (/Android/.test(ua)) return 'Android';
        if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
        if (/Windows/.test(ua)) return 'Windows';
        if (/Mac/.test(ua)) return 'Mac';
        return 'Unknown';
    }

    detectWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    checkThreeJS() {
        try {
            return window.THREE ? 'v' + (window.THREE.REVISION || 'unknown') : 'Not loaded';
        } catch (e) {
            return 'Unknown';
        }
    }
}

export default GalaxyApp;`;

        // Создаем базовые Three.js модули
        const threeSceneManagerContent = `// Enhanced fallback ThreeSceneManager
export class ThreeSceneManager {
    constructor(canvasId) {
        console.warn('🎮 Enhanced Fallback ThreeSceneManager for canvas:', canvasId);
        this.canvas = document.getElementById(canvasId);
        this.initialized = false;
    }

    async init() {
        console.warn('⚠️ Three.js not available, using enhanced fallback');
        this.initialized = true;
        return Promise.resolve();
    }

    render() {
        console.log('🎨 Enhanced fallback render called');
    }

    dispose() {
        console.log('🧹 Enhanced fallback ThreeSceneManager disposed');
    }
}

export default ThreeSceneManager;`;

        fs.writeFileSync(path.join(corePath, 'app.js'), appJsContent);
        fs.writeFileSync(path.join(corePath, 'three-scene-manager.js'), threeSceneManagerContent);
        
        console.log('⚠️ Созданы улучшенные fallback модули приложения с расширенной диагностикой');
    }
}

export default {
    ModuleValidator
};