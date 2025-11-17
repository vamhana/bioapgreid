import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DirectoryScanner {
  constructor(options = {}) {
    this.options = {
      maxDepth: options.maxDepth || 4,
      exclude: options.exclude || ['node_modules', '.git', '.next', '.vercel', '.cache'],
      maxFilesPerDir: options.maxFilesPerDir || 100,
      showFileSizes: options.showFileSizes !== false,
      showHidden: options.showHidden || false,
      ...options
    };
    
    this.stats = {
      directories: 0,
      files: 0,
      errors: 0,
      totalSize: 0
    };
  }

  async scanDirectory(dir, depth = 0, currentPath = '') {
    if (depth > this.options.maxDepth) {
      return { skipped: 'max_depth' };
    }

    const prefix = '  '.repeat(depth);
    const results = {
      path: currentPath || dir,
      exists: false,
      items: [],
      error: null
    };

    try {
      // Check if directory exists
      try {
        await fs.access(dir);
        results.exists = true;
      } catch {
        console.log(`${prefix}❌ ${currentPath || dir} - NOT EXISTS`);
        return { ...results, error: 'NOT_EXISTS' };
      }

      // Read directory
      const items = await fs.readdir(dir);
      console.log(`${prefix}📁 ${currentPath || dir}/`);
      
      // Filter and sort items
      const filteredItems = items
        .filter(item => this.shouldInclude(item))
        .sort((a, b) => a.localeCompare(b));

      let displayedCount = 0;
      let hasMoreFiles = false;

      for (const item of filteredItems) {
        if (displayedCount >= this.options.maxFilesPerDir) {
          hasMoreFiles = true;
          break;
        }

        const itemPath = path.join(dir, item);
        const relativePath = path.join(currentPath, item);

        try {
          const stat = await fs.stat(itemPath);
          
          if (stat.isDirectory()) {
            this.stats.directories++;
            console.log(`${prefix}  📁 ${item}/`);
            
            const subResult = await this.scanDirectory(
              itemPath, 
              depth + 1, 
              relativePath
            );
            results.items.push({
              name: item,
              type: 'directory',
              path: relativePath,
              ...subResult
            });
          } else {
            this.stats.files++;
            this.stats.totalSize += stat.size;
            
            const sizeInfo = this.options.showFileSizes 
              ? ` (${this.formatFileSize(stat.size)})`
              : '';
            
            // Особые иконки для разных типов файлов
            const icon = this.getFileIcon(item);
            console.log(`${prefix}  ${icon} ${item}${sizeInfo}`);
            
            results.items.push({
              name: item,
              type: 'file',
              path: relativePath,
              size: stat.size,
              sizeFormatted: this.formatFileSize(stat.size),
              icon: icon
            });
          }
          
          displayedCount++;
        } catch (error) {
          this.stats.errors++;
          console.log(`${prefix}  ❌ ${item} - ERROR: ${error.message}`);
          results.items.push({
            name: item,
            type: 'error',
            path: relativePath,
            error: error.message
          });
        }
      }

      if (hasMoreFiles) {
        const remaining = filteredItems.length - displayedCount;
        console.log(`${prefix}  ... 📚 and ${remaining} more items`);
      }

      return results;

    } catch (error) {
      this.stats.errors++;
      console.log(`${prefix}❌ ${currentPath || dir} - SCAN ERROR: ${error.message}`);
      return { ...results, error: error.message };
    }
  }

  getFileIcon(filename) {
    const ext = path.extname(filename).toLowerCase();
    const icons = {
      '.js': '📜', '.mjs': '📜', '.cjs': '📜',
      '.json': '📋', '.md': '📖', '.txt': '📄',
      '.html': '🌐', '.css': '🎨', '.scss': '🎨',
      '.png': '🖼️', '.jpg': '🖼️', '.jpeg': '🖼️', '.gif': '🖼️', '.svg': '🖼️',
      '.mp4': '🎥', '.mov': '🎥', '.avi': '🎥',
      '.mp3': '🎵', '.wav': '🎵',
      '.zip': '📦', '.tar': '📦', '.gz': '📦'
    };
    return icons[ext] || '📄';
  }

  shouldInclude(item) {
    if (!this.options.showHidden && item.startsWith('.')) {
      return false;
    }
    
    if (this.options.exclude.includes(item)) {
      return false;
    }
    
    return true;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  printStats() {
    console.log('\n📊 PROJECT SCAN STATISTICS:');
    console.log('==========================');
    console.log(`📁 Directories: ${this.stats.directories}`);
    console.log(`📄 Files: ${this.stats.files}`);
    console.log(`💾 Total Size: ${this.formatFileSize(this.stats.totalSize)}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
  }

  async generateProjectReport() {
    const report = {
      timestamp: new Date().toISOString(),
      project: {
        name: 'bioapgreid-galaxy-explorer',
        version: '1.0.0',
        type: 'module'
      },
      environment: {
        cwd: process.cwd(),
        nodeVersion: process.version,
        platform: process.platform,
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL
      },
      statistics: this.stats
    };

    // Сохраняем отчет в папку reports
    const reportsDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportPath = path.join(reportsDir, 'galaxy-debug-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n💾 Galaxy Debug Report saved to: ${reportPath}`);
    return reportPath;
  }
}

export default DirectoryScanner;
