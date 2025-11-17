import { DirectoryScanner } from '../modules/galaxy-debug/index.js';

const scanner = new DirectoryScanner({
  maxDepth: 4,
  exclude: ['node_modules', '.git', '.next', '.vercel', '.cache', 'reports'],
  showFileSizes: true,
  showHidden: false
});

console.log('🚀 BioApGreid Galaxy Explorer - Structure Debug');
console.log('===============================================\n');

// Специфичные для проекта пути
const projectPaths = [
  process.cwd(),
  './modules',
  './scanner', 
  './public',
  './scripts',
  '/vercel/path0',
  '/vercel'
];

const scanResults = [];
for (const scanPath of projectPaths) {
  console.log(`\n📍 Scanning: ${scanPath}`);
  const result = await scanner.scanDirectory(
    scanPath.startsWith('/') ? scanPath : new URL(scanPath, import.meta.url).pathname
  );
  scanResults.push(result);
}

scanner.printStats();

// Специфичный для проекта отчет
console.log('\n🔭 PROJECT SPECIFIC CHECKS:');
console.log('===========================');

// Проверяем критичные для проекта пути
const criticalPaths = [
  { path: './modules/build-script/index.js', desc: 'Build Script' },
  { path: './scanner/index.js', desc: 'Main Scanner' },
  { path: './public/', desc: 'Public Assets' },
  { path: './modules/galaxy-debug/index.js', desc: 'Galaxy Debug Module' }
];

for (const { path, desc } of criticalPaths) {
  try {
    const fullPath = new URL(path, import.meta.url).pathname;
    await import(path);
    console.log(`✅ ${desc}: ${path} - LOADED`);
  } catch (error) {
    console.log(`❌ ${desc}: ${path} - ERROR: ${error.message}`);
  }
}
