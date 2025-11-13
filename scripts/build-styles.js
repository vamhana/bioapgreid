// scripts/build-styles.js
// Минификация и оптимизация CSS
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CleanCSS from 'clean-css';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stylesDir = path.join(__dirname, '..', 'styles');
const outputFile = path.join(__dirname, '..', 'styles', 'main.min.css');

const cssFiles = [
  'main.css',
  'galaxy-universe.css', 
  'galaxy-components.css'
];

async function buildStyles() {
  console.log('🎨 Сборка и оптимизация стилей...');
  
  let combinedCSS = '';
  
  for (const file of cssFiles) {
    const filePath = path.join(stylesDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      combinedCSS += `/* ${file} */\n${content}\n`;
      console.log(`✅ Добавлен: ${file}`);
    } else {
      console.warn(`⚠️ Файл не найден: ${file}`);
    }
  }
  
  const minified = new CleanCSS({
    level: 2,
    compatibility: 'ie11'
  }).minify(combinedCSS);
  
  if (minified.errors.length > 0) {
    console.error('❌ Ошибки минификации:', minified.errors);
    return;
  }
  
  fs.writeFileSync(outputFile, minified.styles, 'utf-8');
  console.log(`🎉 Стили оптимизированы: ${(minified.styles.length / 1024).toFixed(2)}KB`);
}

buildStyles().catch(console.error);
