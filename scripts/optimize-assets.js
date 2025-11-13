// scripts/optimize-assets.js
// Оптимизация изображений и ресурсов
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsDir = path.join(__dirname, '..', 'assets');

async function optimizeAssets() {
  console.log('🖼️  Оптимизация ресурсов...');
  
  // Проверяем существование директории assets
  if (!fs.existsSync(assetsDir)) {
    console.log('📁 Создаем директорию assets...');
    fs.mkdirSync(assetsDir, { recursive: true });
    
    // Создаем базовые favicon
    const faviconSvg = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#0f1a2f"/>
      <circle cx="16" cy="16" r="8" fill="#4ECDC4"/>
      <circle cx="12" cy="12" r="2" fill="#FFD700"/>
    </svg>`;
    
    fs.writeFileSync(path.join(assetsDir, 'favicon.svg'), faviconSvg);
    console.log('✅ Создан favicon.svg');
  }
  
  console.log('✅ Оптимизация ресурсов завершена');
}

optimizeAssets().catch(console.error);
