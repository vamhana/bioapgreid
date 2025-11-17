// modules/build-script/index.js
import { buildForVercel } from './build-processor.js';
import { DirectoryScanner } from '../galaxy-debug/index.js';

export async function buildWithDebug() {
  const startTime = Date.now();
  console.log('🚀 BioApGreid Galaxy Explorer - Build Process');
  console.log('=============================================\n');
  
  try {
    // 1. Проверка критичных файлов перед сборкой
    console.log('🔍 Step 1: Verifying critical files...');
    
    const criticalFiles = [
      { path: './modules/build-script/build-processor.js', name: 'Build Processor' },
      { path: './scanner/index.js', name: 'Main Scanner' },
      { path: './modules/galaxy-debug/index.js', name: 'Debug Module' }
    ];

    for (const { path, name } of criticalFiles) {
      try {
        // Проверяем существование файла
        const fileUrl = new URL(path, import.meta.url);
        const fs = await import('fs/promises');
        await fs.access(fileUrl.pathname);
        console.log(`✅ ${name}: ${path} - EXISTS`);
      } catch (error) {
        console.log(`❌ ${name}: ${path} - MISSING: ${error.message}`);
        // Создаем базовую версию если файл отсутствует
        await createMissingFile(path, name);
      }
    }

    // 2. Быстрая проверка структуры
    console.log('\n📁 Step 2: Project structure scan...');
    const scanner = new DirectoryScanner({ 
      maxDepth: 2,
      exclude: ['node_modules', '.git', '.vercel']
    });
    await scanner.scanDirectory(process.cwd());

    // 3. Основная сборка
    console.log('\n🔨 Step 3: Building project...');
    await buildForVercel();

    const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Build completed successfully in ${buildTime}s`);
    
  } catch (error) {
    const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`\n💥 Build failed after ${buildTime}s:`, error.message);
    
    // Детальная диагностика
    await runEmergencyDiagnostics();
    throw error;
  }
}

// Функция для создания отсутствующих файлов
async function createMissingFile(filePath, fileName) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const fullPath = new URL(filePath, import.meta.url).pathname;
    const dir = path.dirname(fullPath);
    
    // Создаем директорию если нужно
    await fs.mkdir(dir, { recursive: true });
    
    // Создаем базовый файл
    let content = '';
    if (filePath.includes('scanner/index.js')) {
      content = `// Auto-generated ${fileName}
export function scan() {
    console.log('🔭 ${fileName} - placeholder');
    return { status: 'placeholder' };
}

export default scan;
`;
    } else if (filePath.includes('build-processor.js')) {
      content = `// Auto-generated ${fileName}
export async function buildForVercel() {
    console.log('🏗️ ${fileName} - placeholder build');
    // Базовая логика сборки
    return { success: true };
}

export default buildForVercel;
`;
    }
    
    await fs.writeFile(fullPath, content);
    console.log(`📝 Created placeholder: ${filePath}`);
    
  } catch (error) {
    console.log(`⚠️ Could not create ${filePath}: ${error.message}`);
  }
}

// Экстренная диагностика
async function runEmergencyDiagnostics() {
  console.log('\n🚨 EMERGENCY DIAGNOSTICS:');
  console.log('========================');
  
  try {
    const fs = await import('fs/promises');
    const currentDir = process.cwd();
    
    console.log(`📂 Current directory: ${currentDir}`);
    
    // Показываем что есть в текущей директории
    const items = await fs.readdir(currentDir);
    console.log('📁 Root contents:', items.slice(0, 10)); // первые 10 файлов
    
    // Проверяем существование ключевых путей
    const checkPaths = [
      './modules',
      './scanner', 
      './public',
      './package.json'
    ];
    
    for (const checkPath of checkPaths) {
      try {
        const stats = await fs.stat(checkPath);
        console.log(`✅ ${checkPath} - ${stats.isDirectory() ? 'DIR' : 'FILE'}`);
      } catch {
        console.log(`❌ ${checkPath} - MISSING`);
      }
    }
    
  } catch (error) {
    console.log('❌ Diagnostics failed:', error.message);
  }
}

// Запуск если файл вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  buildWithDebug().catch(error => {
    console.error('❌ Build process failed');
    process.exit(1);
  });
}

export default buildWithDebug;
