// api/project-structure.js
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

export default async function handler(req, res) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const projectRoot = process.cwd();
    const results = {
      pages: [],
      directories: [],
      staticFiles: [],
      timestamp: new Date().toISOString()
    };

    // Функция рекурсивного сканирования
    function scanDirectory(currentPath, depth = 0) {
      if (depth > 5) return; // Ограничиваем глубину сканирования
      
      try {
        const items = readdirSync(currentPath);
        
        for (const item of items) {
          // Пропускаем системные директории
          if (item.startsWith('.') || 
              item === 'node_modules' || 
              item === '.git' ||
              item === 'api') {
            continue;
          }

          const fullPath = join(currentPath, item);
          const relativePath = relative(projectRoot, fullPath);
          
          try {
            const stats = statSync(fullPath);
            
            if (stats.isDirectory()) {
              results.directories.push({
                name: item,
                path: relativePath,
                depth: depth
              });
              
              // Рекурсивно сканируем вложенные директории
              scanDirectory(fullPath, depth + 1);
              
            } else if (stats.isFile()) {
              const fileInfo = {
                name: item,
                path: relativePath,
                size: stats.size,
                modified: stats.mtime,
                type: getFileType(item)
              };
              
              if (fileInfo.type === 'html') {
                results.pages.push(fileInfo);
              } else {
                results.staticFiles.push(fileInfo);
              }
            }
          } catch (error) {
            console.warn(`Не удалось прочитать: ${fullPath}`, error.message);
          }
        }
      } catch (error) {
        console.error(`Ошибка сканирования ${currentPath}:`, error.message);
      }
    }

    // Вспомогательная функция для определения типа файла
    function getFileType(filename) {
      const ext = filename.split('.').pop().toLowerCase();
      const types = {
        'html': 'html',
        'htm': 'html',
        'js': 'javascript', 
        'css': 'stylesheet',
        'json': 'json',
        'md': 'markdown',
        'txt': 'text',
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image',
        'gif': 'image',
        'svg': 'image'
      };
      return types[ext] || 'other';
    }

    // Начинаем сканирование с корня проекта
    scanDirectory(projectRoot);
    
    // Сортируем результаты
    results.pages.sort((a, b) => a.path.localeCompare(b.path));
    results.directories.sort((a, b) => a.path.localeCompare(b.path));
    
    console.log(`📁 Сканирование завершено: ${results.pages.length} страниц, ${results.directories.length} директорий`);
    
    res.status(200).json({
      success: true,
      data: results,
      scanInfo: {
        projectRoot,
        totalItems: results.pages.length + results.directories.length + results.staticFiles.length,
        scanTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Ошибка сканирования проекта:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
