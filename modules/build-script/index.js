// modules/build-script/index.js
import { buildForVercel } from './build-processor.js';

// Запускаем сборку
buildForVercel().catch(error => {
    console.error('❌ Build process failed:', error);
    process.exit(1);
});
