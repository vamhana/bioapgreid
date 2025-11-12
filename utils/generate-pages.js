import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎯 Генератор страниц запущен');

const pagesDir = path.join(__dirname, '..', 'pages');
const outputDir = path.join(__dirname, '..');

console.log(`📁 Проверяем папку pages: ${pagesDir}`);

try {
  // Проверяем существование папки pages
  if (!fs.existsSync(pagesDir)) {
    console.log('❌ Папка pages не найдена');
    process.exit(1);
  }

  // Получаем список HTML файлов
  const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.html'));
  
  console.log(`📄 Найдено ${files.length} HTML-файлов`);

  let generatedCount = 0;

  files.forEach(file => {
    console.log(`🔨 Обрабатываем ${file}...`);
    
    const filePath = path.join(pagesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Создаем простой шлюз для каждой страницы
    const gatewayContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GENOФОНД - ${file.replace('.html', '')}</title>
    <script>
        // Автоматический редирект на основную страницу
        setTimeout(() => {
            window.location.href = '/';
        }, 100);
    </script>
</head>
<body>
    <noscript>
        <h1>GENOФОНД</h1>
        <p>Пожалуйста, включите JavaScript для доступа к контенту.</p>
        <p><a href="/">Перейти на главную страницу</a></p>
    </noscript>
</body>
</html>`;

    // Сохраняем шлюз
    const outputPath = path.join(outputDir, file);
    fs.writeFileSync(outputPath, gatewayContent, 'utf8');
    
    console.log(`✅ Сгенерирован шлюз для ${file}`);
    generatedCount++;
  });

  console.log(`🎉 Генерация завершена. Успешно сгенерировано: ${generatedCount} файлов`);
  
} catch (error) {
  console.error('❌ Ошибка при генерации:', error);
  process.exit(1);
}
