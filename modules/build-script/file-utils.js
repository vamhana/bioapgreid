// modules/build-script/file-utils.js
import fs from 'fs';
import path from 'path';

export function copyFolderRecursive(source, target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }
    
    const files = fs.readdirSync(source);
    
    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);
        
        const stat = fs.statSync(sourcePath);
        
        if (stat.isDirectory()) {
            copyFolderRecursive(sourcePath, targetPath);
        } else {
            fs.copyFileSync(sourcePath, targetPath);
        }
    });
}

export function createDirectoryIfNotExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        return true;
    }
    return false;
}

export function checkGalaxyExists(galaxyPath) {
    if (!fs.existsSync(galaxyPath)) {
        console.error('❌ Папка "galaxy" не найдена!');
        console.log('📁 Создайте папку "galaxy" в корне проекта с HTML структурой:');
        console.log(`
galaxy/
├── index.html
├── level1/
│   ├── index.html
│   └── sputnik1/
│       └── index.html
└── level2/
    └── index.html
        `);
        return false;
    }
    return true;
}
