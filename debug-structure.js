// debug-structure.js
import fs from 'fs';
import path from 'path';

function scanDirectory(dir, depth = 0, maxDepth = 3) {
    if (depth > maxDepth) return;
    
    const prefix = '  '.repeat(depth);
    
    try {
        if (!fs.existsSync(dir)) {
            console.log(`${prefix}❌ ${dir} - NOT EXISTS`);
            return;
        }
        
        const items = fs.readdirSync(dir);
        console.log(`${prefix}📁 ${dir}/`);
        
        items.forEach(item => {
            const itemPath = path.join(dir, item);
            try {
                const stat = fs.statSync(itemPath);
                if (stat.isDirectory()) {
                    scanDirectory(itemPath, depth + 1, maxDepth);
                } else {
                    console.log(`${prefix}  📄 ${item} (${stat.size} bytes)`);
                }
            } catch (error) {
                console.log(`${prefix}  ❌ ${item} - ERROR: ${error.message}`);
            }
        });
    } catch (error) {
        console.log(`${prefix}❌ ${dir} - SCAN ERROR: ${error.message}`);
    }
}

console.log('🔍 DEBUG: Vercel File Structure');
console.log('================================');

// Проверяем основные пути
const pathsToCheck = [
    '/vercel',
    '/vercel/path0', 
    '/vercel/path0/modules',
    '/vercel/path0/bioapgreid',
    process.cwd(),
    './modules',
    './bioapgreid',
    './galaxy'
];

pathsToCheck.forEach(checkPath => {
    console.log(`\n📍 Checking: ${checkPath}`);
    scanDirectory(checkPath, 1, 2);
});

// Также покажем переменные окружения
console.log('\n🔧 Environment Variables:');
console.log('CWD:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL:', process.env.VERCEL);
console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
