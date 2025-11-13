// api/sitemap.js
import { writeFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            // Сохраняем sitemap в public/data/
            const sitemapPath = join(process.cwd(), 'public', 'data', 'sitemap.json');
            writeFileSync(sitemapPath, JSON.stringify(req.body, null, 2));
            
            res.json({ success: true, path: sitemapPath });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
