import fs from 'fs';
import path from 'path';

/**
 * Обеспечивает наличие default export в модуле
 */
export function ensureDefaultExport(content, filePath) {
    const className = getClassNameFromPath(filePath);
    
    if (content.includes('export default') || content.includes('export default class')) {
        return content;
    }
    
    const classExportRegex = new RegExp(`export\\s+class\\s+${className}`);
    if (classExportRegex.test(content)) {
        return content.replace(
            classExportRegex, 
            `export class ${className}`
        ) + `\n\nexport default ${className};\n`;
    }
    
    const classRegex = new RegExp(`class\\s+${className}`);
    if (classRegex.test(content) && !content.includes('export')) {
        return content.replace(
            classRegex,
            `export class ${className}`
        ) + `\n\nexport default ${className};\n`;
    }
    
    return content;
}

/**
 * Получает имя класса из пути файла
 */
export function getClassNameFromPath(filePath) {
    const filename = path.basename(filePath, '.js');
    
    const specialCases = {
        'app.js': 'GalaxyApp',
        'galaxy-data-loader.js': 'GalaxyDataLoader',
        'galaxy-renderer.js': 'GalaxyRenderer', 
        'camera-controller.js': 'CameraController',
        'three-scene-manager.js': 'ThreeSceneManager',
        'spatial-partitioner.js': 'SpatialPartitioner',
        'security-validator.js': 'SecurityValidator',
        'memory-manager.js': 'MemoryManager',
        'lod-manager.js': 'LODManager',
        'progression-tracker.js': 'ProgressionTracker',
        'entity-interaction.js': 'EntityInteraction',
        'user-panel.js': 'UserPanel',
        'minimap-navigation.js': 'MinimapNavigation',
        'asset-manager.js': 'AssetManager',
        'performance-optimizer.js': 'PerformanceOptimizer'
    };
    
    return specialCases[filename] || filename.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Рекурсивно получает все файлы в директории
 */
export function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath.replace(dirPath + path.sep, ''));
        }
    });

    return arrayOfFiles;
}

/**
 * Форматирует размер файла в читаемый вид
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Создает директорию если она не существует
 */
export function createDirectoryIfNotExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Копирует содержимое одной директории в другую
 */
export function copyFolderRecursive(source, target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source);

    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);

        if (fs.statSync(sourcePath).isDirectory()) {
            copyFolderRecursive(sourcePath, targetPath);
        } else {
            fs.copyFileSync(sourcePath, targetPath);
        }
    });
}

export default {
    ensureDefaultExport,
    getClassNameFromPath,
    getAllFiles,
    formatFileSize,
    createDirectoryIfNotExists,
    copyFolderRecursive
};