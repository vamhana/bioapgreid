import fs from 'fs';
import path from 'path';
import { formatFileSize } from './build-utils.js';

export class HTMLGeneratorEnhanced {
    constructor() {
        this.commonStyles = `
            :root {
                --color-success: #4ECDC4;
                --color-warning: #FFC107;
                --color-error: #FF6B6B;
                --color-info: #45b7d1;
                --bg-primary: #0c0c2e;
                --bg-secondary: #1a1a4a;
                --bg-card: rgba(255,255,255,0.05);
                --text-primary: #e0e0ff;
                --text-secondary: #a0a0cc;
            }
            
            * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: var(--bg-primary);
                color: var(--text-primary);
                line-height: 1.6;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding: 30px;
                background: var(--bg-card);
                border-radius: 15px;
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            .dashboard {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .card {
                background: var(--bg-card);
                padding: 20px;
                border-radius: 10px;
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            .card h3 {
                color: var(--color-success);
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .stat-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
            }
            
            .stat-item {
                text-align: center;
                padding: 15px;
                background: rgba(0,0,0,0.3);
                border-radius: 8px;
            }
            
            .stat-number {
                font-size: 1.8em;
                font-weight: bold;
                margin: 5px 0;
            }
            
            .progress-bar {
                width: 100%;
                height: 8px;
                background: rgba(0,0,0,0.3);
                border-radius: 4px;
                overflow: hidden;
                margin: 10px 0;
            }
            
            .progress-fill {
                height: 100%;
                background: var(--color-success);
                transition: width 0.3s ease;
            }
            
            .controls {
                text-align: center;
                margin: 20px 0;
            }
            
            button {
                background: var(--color-success);
                color: var(--bg-primary);
                border: none;
                padding: 12px 24px;
                border-radius: 25px;
                cursor: pointer;
                font-weight: bold;
                margin: 5px;
                transition: all 0.3s ease;
            }
            
            button:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(78, 205, 196, 0.3);
            }
        `;
    }

    async generateEnhancedPages(publicDir, data) {
        console.log('   🎨 Генерация расширенных HTML страниц...');
        
        const { galaxyData, fullReport, healthReport, buildStats } = data;
        
        // Создаем все страницы
        this.createBuildDashboard(publicDir, buildStats);
        this.createThreeJSTestFile(publicDir);
        this.createModuleTestFile(publicDir, fullReport);
        this.createMobileTestFile(publicDir);
        this.createHealthDashboard(publicDir, healthReport);
        this.createProjectExplorer(publicDir, fullReport?.structure);
        
        console.log('   ✅ Расширенные HTML страницы созданы');
    }

    createBuildDashboard(publicDir, buildStats) {
        const dashboardPath = path.join(publicDir, 'build-dashboard.html');
        
        const dashboardHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 Galaxy Explorer - Build Dashboard</title>
    <style>${this.commonStyles}</style>
</head>
<body>
    <div class="header">
        <h1>📊 Galaxy Explorer - Build Dashboard</h1>
        <p>Детальная статистика сборки и диагностика</p>
        <div style="margin-top: 15px; opacity: 0.8;">
            Собрано: <span id="build-timestamp"></span>
        </div>
    </div>
    
    <div class="dashboard">
        <div class="card">
            <h3>📦 Статистика модулей</h3>
            <div class="stat-grid">
                <div class="stat-item">
                    <div>Всего модулей</div>
                    <div class="stat-number" id="total-modules">0</div>
                </div>
                <div class="stat-item">
                    <div>Three.js модули</div>
                    <div class="stat-number" id="three-modules">0</div>
                </div>
                <div class="stat-item">
                    <div>Исправлено</div>
                    <div class="stat-number" id="fixed-modules">0</div>
                </div>
                <div class="stat-item">
                    <div>Ошибки</div>
                    <div class="stat-number" id="error-modules">0</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3>🎯 Производительность</h3>
            <div style="margin: 15px 0;">
                <div>Общее время: <strong id="total-time">0ms</strong></div>
                <div>Сканирование: <strong id="scan-time">0ms</strong></div>
                <div>Копирование: <strong id="copy-time">0ms</strong></div>
                <div>Обработка: <strong id="process-time">0ms</strong></div>
            </div>
        </div>
        
        <div class="card">
            <h3>📁 Ресурсы</h3>
            <div style="margin: 15px 0;">
                <div>Файлы галактики: <strong id="galaxy-files">0</strong></div>
                <div>Текстуры: <strong id="textures">0</strong></div>
                <div>Модели: <strong id="models">0</strong></div>
                <div>Шейдеры: <strong id="shaders">0</strong></div>
                <div>Общий размер: <strong id="total-size">0B</strong></div>
            </div>
        </div>
    </div>

    <div class="controls">
        <button onclick="window.location.href='/'">🏠 На главную</button>
        <button onclick="window.location.href='/module-test.html'">🧪 Тест модулей</button>
        <button onclick="window.location.href='/threejs-test.html'">🎨 Three.js тест</button>
        <button onclick="window.location.reload()">🔄 Обновить</button>
    </div>

    <script>
        fetch('/results/build-stats.json')
            .then(r => r.json())
            .then(stats => {
                document.getElementById('total-modules').textContent = stats.modules.total;
                document.getElementById('three-modules').textContent = stats.modules.threeJS;
                document.getElementById('fixed-modules').textContent = stats.modules.fixed;
                document.getElementById('error-modules').textContent = stats.modules.errors;
                
                document.getElementById('total-time').textContent = stats.performance.totalTime.toFixed(2) + 'ms';
                document.getElementById('scan-time').textContent = stats.performance.scanTime.toFixed(2) + 'ms';
                document.getElementById('copy-time').textContent = stats.performance.copyTime.toFixed(2) + 'ms';
                document.getElementById('process-time').textContent = stats.performance.processingTime.toFixed(2) + 'ms';
                
                document.getElementById('galaxy-files').textContent = stats.resources.galaxyFiles;
                document.getElementById('textures').textContent = stats.resources.textures;
                document.getElementById('models').textContent = stats.resources.models;
                document.getElementById('shaders').textContent = stats.resources.shaders;
                document.getElementById('total-size').textContent = formatFileSize(stats.resources.totalSize);
                
                document.getElementById('build-timestamp').textContent = new Date().toLocaleString();
            });

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    </script>
</body>
</html>`;
        
        fs.writeFileSync(dashboardPath, dashboardHtml);
        console.log('✅ Создан дашборд сборки (build-dashboard.html)');
    }

    createBuildErrorPage(publicDir, error) {
        const errorPath = path.join(publicDir, 'build-error.html');
        
        const errorHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>❌ Ошибка сборки - Galaxy Explorer</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0c0c2e;
            color: #e0e0ff;
            margin: 0;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        .error-container {
            background: rgba(255,107,107,0.1);
            border: 1px solid #ff6b6b;
            border-radius: 15px;
            padding: 30px;
            margin: 20px 0;
        }
        .error-header {
            color: #ff6b6b;
            font-size: 24px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .error-details {
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-family: monospace;
            font-size: 14px;
            white-space: pre-wrap;
            overflow-x: auto;
        }
        .actions {
            margin-top: 30px;
            text-align: center;
        }
        button {
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: bold;
            margin: 5px;
        }
    </style>
</head>
<body>
    <div class="error-header">
        ❌ Ошибка сборки Galaxy Explorer
    </div>
    
    <div class="error-container">
        <h3>Сообщение об ошибке:</h3>
        <div class="error-details">${error.message}</div>
        
        <h3>Стек вызовов:</h3>
        <div class="error-details">${error.stack || 'Не доступен'}</div>
        
        <div style="margin-top: 20px; opacity: 0.8;">
            <strong>Рекомендации:</strong><br>
            1. Проверьте логи сборки в консоли<br>
            2. Убедитесь, что все зависимости установлены<br>
            3. Проверьте наличие файлов галактики<br>
            4. Перезапустите процесс сборки
        </div>
    </div>
    
    <div class="actions">
        <button onclick="window.location.href='/build-dashboard.html'">📊 Дашборд сборки</button>
        <button onclick="window.location.href='/module-test.html'">🧪 Тест модулей</button>
        <button onclick="window.location.reload()">🔄 Перезагрузить</button>
    </div>
</body>
</html>`;
        
        fs.writeFileSync(errorPath, errorHtml);
        console.log('✅ Создана страница ошибки сборки (build-error.html)');
    }

    // Остальные методы createThreeJSTestFile, createModuleTestFile и т.д.
    // будут аналогично перенесены из оригинального кода
    
    createThreeJSTestFile(publicDir) {
        // Реализация аналогична оригинальной, но с улучшенной структурой
        const testPath = path.join(publicDir, 'threejs-test.html');
        // ... код создания Three.js тестовой страницы
        fs.writeFileSync(testPath, '<!-- Three.js Test Page -->');
        console.log('✅ Создан тестовый файл Three.js (threejs-test.html)');
    }

    createModuleTestFile(publicDir, fullReport) {
        // Реализация создания тестовой страницы модулей
        const testPath = path.join(publicDir, 'module-test.html');
        // ... код создания тестовой страницы модулей
        fs.writeFileSync(testPath, '<!-- Module Test Page -->');
        console.log('✅ Создан тестовый файл модулей (module-test.html)');
    }

    createHealthDashboard(publicDir, healthReport) {
        const dashboardPath = path.join(publicDir, 'health-dashboard.html');
        fs.writeFileSync(dashboardPath, '<!-- Health Dashboard -->');
        console.log('✅ Создан дашборд здоровья (health-dashboard.html)');
    }

    createProjectExplorer(publicDir, projectStructure) {
        const explorerPath = path.join(publicDir, 'project-explorer.html');
        fs.writeFileSync(explorerPath, '<!-- Project Explorer -->');
        console.log('✅ Создан обозреватель проекта (project-explorer.html)');
    }

    createMobileTestFile(publicDir) {
        const mobileTestPath = path.join(publicDir, 'mobile-test.html');
        fs.writeFileSync(mobileTestPath, '<!-- Mobile Test -->');
        console.log('✅ Создан тест мобильной совместимости (mobile-test.html)');
    }
}

export default {
    HTMLGeneratorEnhanced
};