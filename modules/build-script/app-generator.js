export function generateAppFramework(scanResult) {
    return {
        createBaseHTML: () => `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Galaxy Explorer - ${scanResult.name}</title>
    <style>
        body { margin: 0; overflow: hidden; background: #000; }
        #galaxy-canvas { width: 100vw; height: 100vh; }
        #user-panel { 
            position: fixed; bottom: 0; left: 0; right: 0; 
            background: rgba(0,0,0,0.8); color: white; 
            padding: 10px; z-index: 1000; 
        }
    </style>
</head>
<body>
    <canvas id="galaxy-canvas"></canvas>
    <div id="user-panel">
        <div id="progress">Исследовано: 0/${Object.values(scanResult.stats.entities).reduce((a, b) => a + b, 0)}</div>
    </div>
    <script type="module" src="/modules/app.js"></script>
</body>
</html>`
    };
}
