// api/meta-parser.js
import { readFileSync } from 'fs';
import { join } from 'path';
import { JSDOM } from 'jsdom';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Парсинг конкретной страницы
      const { url } = req.query;
      
      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'Не указан параметр url'
        });
      }

      const projectRoot = process.cwd();
      const filePath = join(projectRoot, url.startsWith('/') ? url.slice(1) : url);
      
      console.log(`🔍 Server-side парсинг: ${filePath}`);

      // Читаем и парсим HTML файл
      const htmlContent = readFileSync(filePath, 'utf-8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Извлекаем meta-теги galaxy
      const metaTags = {};
      const galaxyMetaElements = document.querySelectorAll('meta[name^="galaxy:"]');
      
      galaxyMetaElements.forEach(meta => {
        const name = meta.getAttribute('name').replace('galaxy:', '');
        const content = meta.getAttribute('content');
        if (name && content) {
          metaTags[name] = content.trim();
        }
      });

      // Извлекаем дополнительную информацию
      const title = document.querySelector('title')?.textContent?.trim();
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content');
      
      // Извлекаем структуру контента
      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
        tag: h.tagName,
        text: h.textContent?.trim(),
        id: h.id || null
      }));

      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
        text: a.textContent?.trim(),
        href: a.getAttribute('href'),
        internal: !a.href.startsWith('http') || a.href.includes(req.headers.host)
      }));

      const result = {
        success: true,
        url,
        meta: {
          ...metaTags,
          title: metaTags.title || title,
          description: metaTags.description || description
        },
        structure: {
          headings,
          links: links.filter(link => link.internal), // только внутренние ссылки
          images: Array.from(document.querySelectorAll('img')).length,
          scripts: Array.from(document.querySelectorAll('script[src]')).length
        },
        fileInfo: {
          size: htmlContent.length,
          lines: htmlContent.split('\n').length,
          parsedAt: new Date().toISOString()
        }
      };

      console.log(`✅ Server-side парсинг завершен: ${url} → ${result.meta.title}`);
      
      res.status(200).json(result);

    } else if (req.method === 'POST') {
      // Пакетный парсинг нескольких страниц
      const { urls } = req.body;
      
      if (!urls || !Array.isArray(urls)) {
        return res.status(400).json({
          success: false,
          error: 'Не указан массив urls в теле запроса'
        });
      }

      console.log(`🔄 Пакетный парсинг ${urls.length} страниц...`);

      const results = [];
      const errors = [];

      for (const url of urls) {
        try {
          const projectRoot = process.cwd();
          const filePath = join(projectRoot, url.startsWith('/') ? url.slice(1) : url);
          
          const htmlContent = readFileSync(filePath, 'utf-8');
          const dom = new JSDOM(htmlContent);
          const document = dom.window.document;

          const metaTags = {};
          const galaxyMetaElements = document.querySelectorAll('meta[name^="galaxy:"]');
          
          galaxyMetaElements.forEach(meta => {
            const name = meta.getAttribute('name').replace('galaxy:', '');
            const content = meta.getAttribute('content');
            if (name && content) {
              metaTags[name] = content.trim();
            }
          });

          results.push({
            url,
            meta: metaTags,
            success: true
          });

        } catch (error) {
          errors.push({
            url,
            error: error.message,
            success: false
          });
        }
      }

      res.status(200).json({
        success: true,
        batch: {
          total: urls.length,
          successful: results.length,
          errors: errors.length
        },
        results,
        errors
      });

    } else {
      res.status(405).json({
        success: false,
        error: 'Метод не разрешен'
      });
    }

  } catch (error) {
    console.error('❌ Ошибка server-side парсинга:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
