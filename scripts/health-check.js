// scripts/health-check.js
// Проверка здоровья приложения
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const criticalFiles = [
  'index.html',
  'js/app.js',
  'js/meta-parser.js',
  'js/galaxy-builder.js',
  'styles/main.css',
  'sitemap.json'
];

async function healthCheck() {
  console.log('❤️  Проверка здоровья приложения...');
  
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };
  
  for (const file of criticalFiles) {
    const filePath = path.join(__dirname, '..', file);
    const exists = fs.existsSync(filePath);
    
    const result = {
      file,
      exists,
      size: exists ? fs.statSync(filePath).size : 0
    };
    
    results.details.push(result);
    
    if (exists) {
      results.passed++;
      console.log(`✅ ${file} - ${result.size} bytes`);
    } else {
      results.failed++;
      console.log(`❌ ${file} - ОТСУТСТВУЕТ`);
    }
  }
  
  // Проверка папки pages
  const pagesDir = path.join(__dirname, '..', 'pages');
  const hasPages = fs.existsSync(pagesDir);
  const pageFiles = hasPages ? fs.readdirSync(pagesDir).filter(f => f.endsWith('.html')) : [];
  
  results.details.push({
    file: 'pages/',
    exists: hasPages,
    size: pageFiles.length,
    info: `${pageFiles.length} HTML файлов`
  });
  
  console.log(`\n📊 Результаты проверки:`);
  console.log(`✅ Пройдено: ${results.passed}`);
  console.log(`❌ Провалено: ${results.failed}`);
  console.log(`📁 HTML страниц: ${pageFiles.length}`);
  
  if (results.failed > 0) {
    console.log('\n🚨 КРИТИЧЕСКИЕ ОШИБКИ:');
    results.details.filter(r => !r.exists).forEach(r => {
      console.log(`   - ${r.file}`);
    });
    process.exit(1);
  }
  
  console.log('🎉 Все системы работают нормально!');
}

healthCheck().catch(console.error);
