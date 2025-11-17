// modules/build-script/app-generator.js
import fs from 'fs';
import path from 'path';

export async function createMainApp(publicDir, sitemap) {
    const appHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Galaxy Explorer - BioApGreid</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0c0c2e; 
            color: white;
            overflow: hidden;
        }
        #app-container {
            width: 100vw;
            height: 100vh;
            position: relative;
        }
        #cosmos-scene {
            width: 100%;
            height: 100%;
            display: block;
        }
        #hud-panel {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            padding: 15px 30px;
            border-radius: 25px;
            border: 1px solid #4ECDC4;
            display: flex;
            gap: 20px;
            z-index: 100;
        }
        .hud-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .progress-bar {
            width: 200px;
            height: 8px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4ECDC4, #FFD700);
            transition: width 0.3s ease;
        }
        .loading-screen {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: #0c0c2e;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(78, 205, 196, 0.3);
            border-top: 3px solid #4ECDC4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="app-container">
        <div class="loading-screen" id="loading-screen">
            <div class="loading-spinner"></div>
            <h2>Загрузка космоса...</h2>
            <p>Инициализация Galaxy Explorer</p>
        </div>
        <canvas id="cosmos-scene"></canvas>
        <div id="hud-panel">
            <div class="hud-item">
                <span>Исследовано:</span>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
                </div>
                <span id="progress-text">0%</span>
            </div>
            <div class="hud-item" id="entity-count">
                <span>Объектов:</span>
                <span id="total-entities">0</span>
            </div>
        </div>
    </div>

    <script type="module">
        // Простая тестовая версия 3D сцены
        import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
        
        class SimpleGalaxyViewer {
            constructor(sitemap) {
                this.sitemap = sitemap;
                this.scene = new THREE.Scene();
                this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 10000);
                this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('cosmos-scene'), antialias: true });
                this.entities = new Map();
                
                this.init();
            }
            
            init() {
                console.log('Initializing 3D Galaxy Viewer...');
                
                // Настройка рендерера
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setClearColor(0x0c0c2e);
                
                // Камера
                this.camera.position.z = 500;
                
                // Освещение
                const light = new THREE.PointLight(0xffffff, 1, 1000);
                this.scene.add(light);
                
                // Создаем объекты из sitemap
                this.createEntities();
                
                // Настройка управления
                this.setupControls();
                
                // Запуск анимации
                this.animate();
                
                // Обновляем HUD
                this.updateHUD();
                
                // Скрываем загрузочный экран
                document.getElementById('loading-screen').style.display = 'none';
                
                console.log('3D Galaxy Viewer initialized successfully!');
            }
            
            createEntities() {
                console.log('Creating entities from sitemap...');
                
                // Создаем центральную галактику
                this.createEntity(this.sitemap, null);
                
                // Создаем планеты и их спутники
                if (this.sitemap.children) {
                    this.sitemap.children.forEach((planet, planetIndex) => {
                        this.createEntity(planet, this.sitemap);
                        
                        // Создаем спутники
                        if (planet.children) {
                            planet.children.forEach((moon, moonIndex) => {
                                this.createEntity(moon, planet);
                            });
                        }
                    });
                }
                
                console.log('Created ' + this.entities.size + ' entities');
            }
            
            createEntity(entityData, parent) {
                const sizes = { galaxy: 20, planet: 8, moon: 4, asteroid: 2, debris: 1 };
                const colors = { 
                    galaxy: 0xFFD700, 
                    planet: 0x4ECDC4, 
                    moon: 0xC7F464, 
                    asteroid: 0xFF6B6B, 
                    debris: 0xA8E6CF 
                };
                
                const geometry = new THREE.SphereGeometry(sizes[entityData.type] || 5, 16, 16);
                const material = new THREE.MeshPhongMaterial({ 
                    color: colors[entityData.type] || 0x888888 
                });
                const mesh = new THREE.Mesh(geometry, material);
                
                // Позиционируем объект
                const position = this.calculatePosition(entityData, parent);
                mesh.position.set(position.x, position.y, position.z);
                
                mesh.userData = { 
                    entity: entityData,
                    type: entityData.type
                };
                
                this.scene.add(mesh);
                this.entities.set(entityData.cleanPath, mesh);
                
                return mesh;
            }
            
            calculatePosition(entityData, parent) {
                if (!parent) {
                    return { x: 0, y: 0, z: 0 }; // Центральная галактика
                }
                
                // Простой расчет позиций для теста
                const level = entityData.level;
                const orbitRadii = [0, 150, 60, 30, 15];
                const radius = orbitRadii[level] || 50;
                
                // Находим индекс среди siblings
                const siblings = parent.children || [parent];
                const index = siblings.findIndex(s => s.cleanPath === entityData.cleanPath);
                const angle = (index / Math.max(siblings.length, 1)) * Math.PI * 2;
                
                const parentPos = parent === this.sitemap ? {x:0,y:0,z:0} : 
                                this.entities.get(parent.cleanPath)?.position || {x:0,y:0,z:0};
                
                return {
                    x: parentPos.x + Math.cos(angle) * radius,
                    y: parentPos.y + (Math.random() - 0.5) * 10,
                    z: parentPos.z + Math.sin(angle) * radius
                };
            }
            
            setupControls() {
                let isDragging = false;
                let previousMousePosition = { x: 0, y: 0 };
                
                this.renderer.domElement.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    previousMousePosition = { x: e.clientX, y: e.clientY };
                });
                
                this.renderer.domElement.addEventListener('mousemove', (e) => {
                    if (!isDragging) return;
                    
                    const deltaMove = {
                        x: e.clientX - previousMousePosition.x,
                        y: e.clientY - previousMousePosition.y
                    };
                    
                    this.camera.position.x -= deltaMove.x * 0.5;
                    this.camera.position.y += deltaMove.y * 0.5;
                    this.camera.lookAt(0, 0, 0);
                    
                    previousMousePosition = { x: e.clientX, y: e.clientY };
                });
                
                this.renderer.domElement.addEventListener('mouseup', () => {
                    isDragging = false;
                });
                
                this.renderer.domElement.addEventListener('wheel', (e) => {
                    this.camera.position.z += e.deltaY * 0.1;
                    this.camera.lookAt(0, 0, 0);
                });
                
                // Адаптация к изменению размера окна
                window.addEventListener('resize', () => {
                    this.camera.aspect = window.innerWidth / window.innerHeight;
                    this.camera.updateProjectionMatrix();
                    this.renderer.setSize(window.innerWidth, window.innerHeight);
                });
            }
            
            animate() {
                requestAnimationFrame(() => this.animate());
                
                // Простая анимация вращения
                this.entities.forEach((mesh, path) => {
                    if (mesh.userData.type !== 'galaxy') {
                        mesh.rotation.y += 0.01;
                    }
                });
                
                this.renderer.render(this.scene, this.camera);
            }
            
            updateHUD() {
                const total = this.entities.size;
                document.getElementById('total-entities').textContent = total;
                document.getElementById('progress-fill').style.width = '0%';
                document.getElementById('progress-text').textContent = '0%';
            }
        }
        
        // Загружаем sitemap и запускаем приложение
        async function initApp() {
            try {
                console.log('Loading sitemap...');
                const response = await fetch('/results/sitemap.json');
                const sitemap = await response.json();
                
                console.log('Sitemap loaded, starting viewer...');
                // Запускаем просмотрщик
                new SimpleGalaxyViewer(sitemap);
                
            } catch (error) {
                console.error('Ошибка загрузки приложения:', error);
                document.getElementById('loading-screen').innerHTML = 
                    '<h2>Ошибка загрузки</h2><p>Обновите страницу</p>';
            }
        }
        
        initApp();
    </script>
</body>
</html>`;
    
    const indexPath = path.join(publicDir, 'index.html');
    fs.writeFileSync(indexPath, appHtml);
    console.log('Создано главное приложение с 3D сценой');
}
