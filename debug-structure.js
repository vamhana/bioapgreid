// debug-structure.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DirectoryScanner {
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
                .sort((a, b) => {
                    // Directories first, then files, both alphabetically
                    const aPath = path.join(dir, a);
                    const bPath = path.join(dir, b);
                    return a.localeCompare(b);
                });

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
                        console.log(`${prefix}  📄 ${item}${sizeInfo}`);
                        
                        results.items.push({
                            name: item,
                            type: 'file',
                            path: relativePath,
                            size: stat.size,
                            sizeFormatted: this.formatFileSize(stat.size)
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

    shouldInclude(item) {
        // Skip hidden files unless explicitly allowed
        if (!this.options.showHidden && item.startsWith('.')) {
            return false;
        }
        
        // Skip excluded directories
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
        console.log('\n📊 SCAN STATISTICS:');
        console.log('==================');
        console.log(`📁 Directories: ${this.stats.directories}`);
        console.log(`📄 Files: ${this.stats.files}`);
        console.log(`💾 Total Size: ${this.formatFileSize(this.stats.totalSize)}`);
        console.log(`❌ Errors: ${this.stats.errors}`);
    }

    getEnvironmentInfo() {
        return {
            timestamp: new Date().toISOString(),
            cwd: process.cwd(),
            scriptDir: __dirname,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                VERCEL: process.env.VERCEL,
                VERCEL_ENV: process.env.VERCEL_ENV,
                VERCEL_REGION: process.env.VERCEL_REGION,
                VERCEL_GIT_PROVIDER: process.env.VERCEL_GIT_PROVIDER,
                VERCEL_GIT_REPO_SLUG: process.env.VERCEL_GIT_REPO_SLUG
            }
        };
    }
}

// CLI argument parsing
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        maxDepth: 4,
        paths: []
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--max-depth':
                options.maxDepth = parseInt(args[++i], 10);
                break;
            case '--show-hidden':
                options.showHidden = true;
                break;
            case '--no-sizes':
                options.showFileSizes = false;
                break;
            case '--help':
                printHelp();
                process.exit(0);
            default:
                if (!arg.startsWith('--')) {
                    options.paths.push(arg);
                }
                break;
        }
    }

    // Default paths if none provided
    if (options.paths.length === 0) {
        options.paths = [
            process.cwd(),
            './modules',
            './bioapgreid', 
            './galaxy',
            '/vercel/path0',
            '/vercel'
        ];
    }

    return options;
}

function printHelp() {
    console.log(`
🔍 Vercel File Structure Debugger
Usage: node debug-structure.js [options] [paths...]

Options:
  --max-depth <number>  Maximum depth to scan (default: 4)
  --show-hidden         Include hidden files and directories
  --no-sizes            Hide file sizes
  --help                Show this help message

Examples:
  node debug-structure.js
  node debug-structure.js ./src ./public
  node debug-structure.js --max-depth 2 --show-hidden
    `);
}

async function main() {
    const cliOptions = parseArguments();
    
    console.log('🔍 DEBUG: Vercel File Structure');
    console.log('================================\n');

    const scanner = new DirectoryScanner(cliOptions);
    
    // Print environment info
    const envInfo = scanner.getEnvironmentInfo();
    console.log('🖥️  Environment Information:');
    console.log('============================');
    console.log(`⏰ Timestamp: ${envInfo.timestamp}`);
    console.log(`📂 Current Working Directory: ${envInfo.cwd}`);
    console.log(`📜 Script Directory: ${envInfo.scriptDir}`);
    console.log(`⚡ Node.js: ${envInfo.nodeVersion}`);
    console.log(`🖥️  Platform: ${envInfo.platform} (${envInfo.arch})`);
    
    console.log('\n🌐 Vercel Environment:');
    console.log('====================');
    Object.entries(envInfo.environment).forEach(([key, value]) => {
        console.log(`   ${key}: ${value || 'not set'}`);
    });

    // Scan all specified paths
    console.log('\n📁 Directory Structure:');
    console.log('======================');
    
    const scanResults = [];
    for (const scanPath of cliOptions.paths) {
        console.log(`\n📍 Scanning: ${scanPath}`);
        const result = await scanner.scanDirectory(
            scanPath.startsWith('/') ? scanPath : path.resolve(scanPath)
        );
        scanResults.push(result);
    }

    // Print summary statistics
    scanner.printStats();

    // Save results to file for further analysis
    try {
        const outputPath = path.join(__dirname, 'debug-structure-report.json');
        await fs.writeFile(
            outputPath,
            JSON.stringify({
                environment: envInfo,
                scanResults,
                statistics: scanner.stats,
                options: scanner.options
            }, null, 2)
        );
        console.log(`\n💾 Full report saved to: ${outputPath}`);
    } catch (error) {
        console.log('\n⚠️  Could not save report file:', error.message);
    }
}

// Error handling for the main process
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Promise Rejection:', error);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Run only if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

export default DirectoryScanner;
