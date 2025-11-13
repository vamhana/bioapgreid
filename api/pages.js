// api/pages.js
import { readdirSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
    try {
        // Сканируем структуру проекта
        const pages = scanDirectory(process.cwd(), '');
        res.json({ pages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

function scanDirectory(basePath, relativePath) {
    const results = [];
    const fullPath = join(basePath, relativePath);
    
    const items = readdirSync(fullPath, { withFileTypes: true });
    
    for (const item of items) {
        const itemPath = join(relativePath, item.name);
        
        if (item.isDirectory()) {
            results.push(...scanDirectory(basePath, itemPath));
        } else if (item.name.endsWith('.html')) {
            results.push(`/${itemPath}`);
        }
    }
    
    return results;
}
