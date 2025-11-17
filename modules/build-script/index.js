// modules/build-script/index.js
import { buildForVercel } from './build-processor.js';
import { DirectoryScanner } from '../galaxy-debug/index.js';

export async function buildWithDebug(options = {}) {
  const startTime = Date.now();
  console.log('🚀 BioApGreid Galaxy Explorer - Build Process');
  console.log('=============================================\n');
  
  try {
    // 1. Проверка структуры проекта
    if (options.scanStructure !== false) {
      console.log('📁 Step 1: Project Structure Scan...');
      const scanner = new DirectoryScanner({ 
        maxDepth: 2,
        showFileSizes: true 
      });
      await scanner.scanDirectory(process.cwd());
      scanner.printStats();
      console.log('✅ Structure scan completed\n');
    }
    
    // 2. Основная сборка
    console.log('🔨 Step 2: Building project...');
    await buildForVercel();
    
    // 3. Проверка результатов сборки
    if (options.verifyBuild !== false) {
      console.log('🔍 Step 3: Verifying build output...');
      const outputScanner = new DirectoryScanner({ 
        maxDepth: 3,
        showFileSizes: true 
      });
      await outputScanner.scanDirectory('./public');
      console.log('✅ Build verification completed\n');
    }
    
    const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Build completed successfully in ${buildTime}s`);
    
  } catch (error) {
    const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`💥 Build failed after ${buildTime}s:`, error);
    throw error;
  }
}

// CLI поддержка
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    scanStructure: !args.includes('--no-scan'),
    verifyBuild: !args.includes('--no-verify')
  };
  
  buildWithDebug(options).catch(error => {
    console.error('❌ Build process failed');
    process.exit(1);
  });
}

export default buildWithDebug;
