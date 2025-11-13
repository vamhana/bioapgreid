// scripts/clean-build.js
// Очистка временных файлов
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToClean = [
  'styles/main.min.css',
  'backups/temp-*',
  '.cache/'
];

async function cleanBuild() {
  console.log('🧹 Очистка временных файлов...');
  
  for (const filePattern of filesToClean) {
    const filePath = path.join(__dirname, '..', filePattern);
    
    try {
      if (filePattern.includes('*')) {
        // Обработка шаблонов с wildcard
        const dir = path.dirname(filePath);
        const base = path.basename(filePattern).replace('*', '');
        
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          const toDelete = files.filter(f => f.startsWith(base));
          
          toDelete.forEach(f => {
            const fullPath = path.join(dir, f);
            fs.unlinkSync(fullPath);
            console.log(`🗑️ Удален: ${f}`);
          });
        }
      } else if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Удален: ${filePattern}`);
      }
    } catch (error) {
      console.warn(`⚠️ Не удалось удалить ${filePattern}:`, error.message);
    }
  }
  
  console.log('✅ Очистка завершена');
}

cleanBuild().catch(console.error);
