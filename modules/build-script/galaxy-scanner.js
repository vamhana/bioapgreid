// modules/build-script/galaxy-scanner.js
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import GalaxyScanner from '../../scanner/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function scanGalaxy(galaxyPath) {
    try {
        const scanner = new GalaxyScanner(galaxyPath);
        const result = await scanner.scan();
        return result;
    } catch (error) {
        console.error('❌ Ошибка сканирования галактики:', error.message);
        throw error;
    }
}
