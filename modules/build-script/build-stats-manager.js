import fs from 'fs';
import path from 'path';
import { getAllFiles, formatFileSize } from './build-utils.js';

export class BuildStatsManager {
    constructor() {
        this.stats = {
            startTime: null,
            modules: {
                total: 0,
                threeJS: 0,
                core: 0,
                interaction: 0,
                ui: 0,
                utils: 0,
                fixed: 0,
                errors: 0
            },
            resources: {
                galaxyFiles: 0,
                textures: 0,
                models: 0,
                shaders: 0,
                totalSize: 0
            },
            performance: {
                scanTime: 0,
                copyTime: 0,
                processingTime: 0,
                totalTime: 0
            }
        };
    }

    startBuild() {
        this.stats.startTime = performance.now();
        console.log('📊 Менеджер статистики инициализирован');
    }

    finalizeBuild() {
        this.stats.performance.totalTime = performance.now() - this.stats.startTime;
    }

    recordScanTime(time) {
        this.stats.performance.scanTime = time;
    }

    recordCopyTime(time) {
        this.stats.performance.copyTime = time;
    }

    recordProcessingTime(time) {
        this.stats.performance.processingTime = time;
    }

    analyzeGalaxyResources(galaxyPath) {
        console.log('   📊 Анализ ресурсов галактики...');
        
        try {
            const files = getAllFiles(galaxyPath);
            this.stats.resources.galaxyFiles = files.length;
            
            files.forEach(file => {
                const fullPath = path.join(galaxyPath, file);
                const stats = fs.statSync(fullPath);
                this.stats.resources.totalSize += stats.size;
                
                // Анализ типов файлов
                if (file.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                    this.stats.resources.textures++;
                } else if (file.match(/\.(gltf|glb|obj|fbx)$/i)) {
                    this.stats.resources.models++;
                } else if (file.match(/\.(glsl|frag|vert)$/i)) {
                    this.stats.resources.shaders++;
                }
            });
            
            console.log(`   📁 Файлы: ${this.stats.resources.galaxyFiles}`);
            console.log(`   🎨 Текстуры: ${this.stats.resources.textures}`);
            console.log(`   🗿 Модели: ${this.stats.resources.models}`);
            console.log(`   🔷 Шейдеры: ${this.stats.resources.shaders}`);
            console.log(`   💾 Общий размер: ${formatFileSize(this.stats.resources.totalSize)}`);
            
        } catch (error) {
            console.warn('   ⚠️ Не удалось проанализировать ресурсы галактики:', error.message);
        }
    }

    analyzeAppModules(appFiles) {
        this.stats.modules.total = appFiles.length;
        
        appFiles.forEach(file => {
            if (file.includes('/core/')) this.stats.modules.core++;
            if (file.includes('/interaction/')) this.stats.modules.interaction++;
            if (file.includes('/ui/')) this.stats.modules.ui++;
            if (file.includes('/utils/')) this.stats.modules.utils++;
            
            // Проверка Three.js модулей
            if (file.match(/(three|renderer|camera|scene|mesh|geometry|material)/i)) {
                this.stats.modules.threeJS++;
            }
        });
        
        console.log('   📦 Статистика модулей:');
        console.log(`     🔧 Core: ${this.stats.modules.core}`);
        console.log(`     🎮 Interaction: ${this.stats.modules.interaction}`);
        console.log(`     🖥️ UI: ${this.stats.modules.ui}`);
        console.log(`     🛠️ Utils: ${this.stats.modules.utils}`);
        console.log(`     🎨 Three.js: ${this.stats.modules.threeJS}`);
    }

    updateModuleStats(fixedCount, errorCount) {
        this.stats.modules.fixed = fixedCount;
        this.stats.modules.errors = errorCount;
    }

    getStats() {
        return this.stats;
    }

    saveStats(publicDir) {
        const statsPath = path.join(publicDir, 'results', 'build-stats.json');
        fs.writeFileSync(statsPath, JSON.stringify(this.stats, null, 2));
        console.log('✅ Статистика сборки сохранена');
    }
}

export default {
    BuildStatsManager
};