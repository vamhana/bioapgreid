// scripts/vercel-debug.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 VERCEL DEBUG - Project Structure');
console.log('===================================\n');

// Показываем текущую директорию
console.log('📂 Current directory:', process.cwd());
console.log('📜 Script directory:', __dirname);
console.log('');

// Функция для проверки существования файла/директории
async function checkPath(itemPath, description) {
  try {
    const stats = await fs.stat(itemPath);
    const type = stats.isDirectory() ? '📁 DIRECTORY' : '📄 FILE';
    const size = stats.isFile() ? ` (${stats.size} bytes)` : '';
    console.log(`✅ ${type}: ${itemPath}${size} - ${description}`);
    return true;
  } catch (error) {
    console.log(`❌ MISSING: ${itemPath} - ${description}`);
    return false;
  }
}

// Функция для показа содержимого директории
async function listDirectory(dirPath, maxDepth = 2, currentDepth = 0) {
  if (currentDepth > maxDepth) return;
  
  const prefix = '  '.repeat(currentDepth);
  
  try {
    const items = await fs.readdir(dirPath);
    console.log(`${prefix}📁 ${dirPath}/`);
    
    for (const item of items.slice(0, 50)) { // ограничиваем вывод
      const itemPath = path.join(dirPath, item);
      try {
        const stats = await fs.stat(itemPath);
        if (stats.isDirectory()) {
          console.log(`${prefix}  📁 ${item}/`);
          await listDirectory(itemPath, maxDepth, currentDepth + 1);
        } else {
          const size = ` (${stats.size} bytes)`;
          console.log(`${prefix}  📄 ${item}${size}`);
        }
      } catch (error) {
        console.log(`${prefix}  ❌ ${item} - ERROR: ${error.message}`);
      }
    }
    
    if (items.length > 50) {
      console.log(`${prefix}  ... and ${items.length - 50} more items`);
    }
  } catch (error) {
    console.log(`${prefix}❌ ${dirPath} - SCAN ERROR: ${error.message}`);
  }
}

// Проверяем критические пути
async function runDiagnostics() {
  console.log('🔍 CHECKING CRITICAL PATHS:');
  console.log('============================');
  
  const criticalPaths = [
    { path: './scanner', desc: 'Scanner directory' },
    { path: './scanner/index.js', desc: 'Main scanner file' },
    { path: './modules', desc: 'Modules directory' },
    { path: './modules/build-script', desc: 'Build script directory' },
    { path: './modules/build-script/index.js', desc: 'Main build script' },
    { path: './modules/build-script/build-processor.js', desc: 'Build processor' },
    { path: './modules/galaxy-debug', desc: 'Galaxy debug module' },
    { path: './package.json', desc: 'Package.json' }
  ];

  for (const { path, desc } of criticalPaths) {
    await checkPath(path, desc);
  }

  console.log('\n📁 FULL PROJECT STRUCTURE:');
  console.log('=========================');
  
  // Показываем структуру проекта
  await listDirectory(process.cwd(), 3);
  
  console.log('\n🔧 ENVIRONMENT INFO:');
  console.log('===================');
  console.log('Node.js:', process.version);
  console.log('Platform:', process.platform, process.arch);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('VERCEL:', process.env.VERCEL);
  console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
}

// Запускаем диагностику
runDiagnostics().catch(error => {
  console.error('💥 Diagnostic failed:', error);
  process.exit(1);
});
