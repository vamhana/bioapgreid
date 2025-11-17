// modules/build-script/index.js
import { buildForVercel } from './build-processor.js';
import { DirectoryScanner } from '../galaxy-debug/index.js';

export async function buildWithDebug() {
  console.log('🔨 Building BioApGreid Galaxy Explorer...');
  
  try {
    // Быстрая проверка структуры перед сборкой
    const scanner = new DirectoryScanner({ maxDepth: 2 });
    await scanner.scanDirectory(process.cwd());
    
    // Основная логика сборки
    await buildForVercel();
    
    console.log('✅ Build completed with structure verification');
  } catch (error) {
    console.error('❌ Build process failed:', error);
    process.exit(1);
  }
}

// Запуск если файл вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  buildWithDebug();
}
