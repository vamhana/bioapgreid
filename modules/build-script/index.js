// modules/build-script/index.js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 BUILD SCRIPT STARTED');
console.log('======================\n');

// Сначала показываем структуру проекта ДО любой сборки
async function showProjectStructure() {
  console.log('🔍 PROJECT STRUCTURE BEFORE BUILD:');
  console.log('==================================\n');
  
  const fs = await import('fs/promises');
  
  // Показываем текущую директорию
  console.log('📂 Current directory:', process.cwd());
  console.log('📜 Build script location:', __dirname);
  console.log('');
  
  // Проверяем критические пути
  const criticalPaths = [
    { path: './scanner', desc: 'Scanner directory' },
    { path: './scanner/index.js', desc: 'Main scanner file' },
    { path: './modules', desc: 'Modules directory' },
    { path: './modules/build-script', desc: 'Build script directory' },
    { path: './modules/build-script/build-processor.js', desc: 'Build processor' },
    { path: './modules/galaxy-debug', desc: 'Galaxy debug module' },
    { path: './package.json', desc: 'Package.json' }
  ];

  console.log('✅ CRITICAL PATH CHECK:');
  for (const { path, desc } of criticalPaths) {
    try {
      const fullPath = join(process.cwd(), path);
      const stats = await fs.stat(fullPath);
      const type = stats.isDirectory() ? 'DIR' : 'FILE';
      console.log(`  ✅ ${type}: ${path} - ${desc}`);
    } catch (error) {
      console.log(`  ❌ MISSING: ${path} - ${desc}`);
    }
  }

  // Показываем содержимое ключевых директорий
  console.log('\n📁 DIRECTORY CONTENTS:');
  await showDirectoryContents('./', 1);
  await showDirectoryContents('./scanner', 2);
  await showDirectoryContents('./modules', 2);
}

async function showDirectoryContents(dirPath, maxDepth = 1, currentDepth = 0) {
  if (currentDepth > maxDepth) return;
  
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const prefix = '  '.repeat(currentDepth);
  
  try {
    const items = await fs.readdir(dirPath);
    console.log(`${prefix}📁 ${dirPath}/`);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      try {
        const stats = await fs.stat(itemPath);
        if (stats.isDirectory()) {
          console.log(`${prefix}  📁 ${item}/`);
          if (currentDepth < maxDepth) {
            await showDirectoryContents(itemPath, maxDepth, currentDepth + 1);
          }
        } else {
          const size = stats.size > 1024 ? 
            ` (${(stats.size / 1024).toFixed(1)} KB)` : 
            ` (${stats.size} bytes)`;
          console.log(`${prefix}  📄 ${item}${size}`);
        }
      } catch (error) {
        console.log(`${prefix}  ❌ ${item} - ERROR: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`${prefix}❌ ${dirPath} - SCAN ERROR: ${error.message}`);
  }
}

// Пытаемся импортировать scanner чтобы понять проблему
async function testScannerImport() {
  console.log('\n🔧 TESTING SCANNER IMPORT:');
  console.log('=========================');
  
  try {
    console.log('1. Trying to import scanner...');
    const scanner = await import('../../scanner/index.js');
    console.log('   ✅ Scanner import SUCCESS');
    console.log('   📦 Scanner exports:', Object.keys(scanner));
    return true;
  } catch (error) {
    console.log('   ❌ Scanner import FAILED:', error.message);
    console.log('   💡 Error details:', {
      code: error.code,
      path: error.url || 'unknown'
    });
    
    // Показываем что на самом деле в scanner директории
    console.log('\n2. Scanner directory actual contents:');
    await showDirectoryContents('./scanner', 1);
    
    return false;
  }
}

// Основная функция сборки
async function buildWithDebug() {
  try {
    // 1. Показываем структуру проекта
    await showProjectStructure();
    
    // 2. Тестируем импорт scanner
    const scannerOk = await testScannerImport();
    
    if (!scannerOk) {
      console.log('\n⚠️ WARNING: Scanner import failed but continuing build...');
    }
    
    // 3. Пытаемся импортировать и запустить build processor
    console.log('\n🔨 ATTEMPTING TO IMPORT BUILD PROCESSOR:');
    console.log('======================================');
    
    try {
      const buildProcessor = await import('./build-processor.js');
      console.log('✅ Build processor import SUCCESS');
      
      if (buildProcessor.buildForVercel) {
        console.log('🚀 Starting buildForVercel()...');
        await buildProcessor.buildForVercel();
        console.log('✅ buildForVercel() completed');
      } else {
        console.log('❌ buildForVercel function not found in build-processor');
        console.log('📦 Available exports:', Object.keys(buildProcessor));
      }
    } catch (error) {
      console.log('❌ Build processor import FAILED:', error.message);
      throw error;
    }
    
    console.log('\n🎉 BUILD COMPLETED SUCCESSFULLY');
    
  } catch (error) {
    console.log('\n💥 BUILD FAILED:', error.message);
    
    // Детальная диагностика при ошибке
    console.log('\n🚨 POST-FAILURE DIAGNOSTICS:');
    console.log('===========================');
    
    const fs = await import('fs/promises');
    try {
      const items = await fs.readdir(process.cwd());
      console.log('Root directory contents:', items);
    } catch (readError) {
      console.log('Cannot read root directory:', readError.message);
    }
    
    throw error;
  }
}

// Запуск если файл вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  buildWithDebug().catch(error => {
    console.error('❌ Build process terminated');
    process.exit(1);
  });
}

export { buildWithDebug };
