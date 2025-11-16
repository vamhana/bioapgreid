// modules/cosmos-renderer/main.js
export class GalaxyExplorer {
    constructor(sitemap) {
        this.sitemap = sitemap;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.entities = new Map();
        this.userProgress = new UserProgress();
    }
    
    async init() {
        await this.initThreeJS();
        this.createGalaxyFromSitemap();
        this.setupControls();
        this.animate();
        this.updateHUD();
    }
    
    async initThreeJS() {
        // Динамический импорт Three.js для оптимизации
        const { Scene, PerspectiveCamera, WebGLRenderer, 
                SphereGeometry, MeshPhongMaterial, Mesh, 
                PointLight, Color } = await import('https://cdn.skypack.dev/three');
        
        this.scene = new Scene();
        this.scene.background = new Color(0x0c0c2e);
        
        this.camera = new PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 10000);
        this.camera.position.z = 500;
        
        this.renderer = new WebGLRenderer({ canvas: document.getElementById('cosmos-scene'), antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Освещение
        const light = new PointLight(0xffffff, 1, 1000);
        light.position.set(0, 0, 0);
        this.scene.add(light);
    }
    
    createGalaxyFromSitemap() {
        this.processEntity(this.sitemap, null);
    }
    
    processEntity(entityData, parent) {
        // Расчет позиции на основе структуры (орбиты вокруг родителя)
        const position = this.calculateOrbitalPosition(entityData, parent);
        
        // Создание 3D объекта
        const mesh = this.createEntityMesh(entityData, position);
        this.scene.add(mesh);
        
        // Сохраняем ссылку
        this.entities.set(entityData.cleanPath, {
            mesh,
            data: entityData,
            revealed: false
        });
        
        // Рекурсивно обрабатываем детей
        if (entityData.children) {
            entityData.children.forEach(child => 
                this.processEntity(child, entityData)
            );
        }
    }
    
    calculateOrbitalPosition(entityData, parent) {
        if (!parent) {
            return { x: 0, y: 0, z: 0 }; // Центральная галактика
        }
        
        // Простой расчет орбитальных позиций на основе индекса и уровня
        const level = entityData.level;
        const parentPosition = this.entities.get(parent.cleanPath)?.mesh.position || { x: 0, y: 0, z: 0 };
        
        // Базовые радиусы орбит по уровням
        const orbitRadii = [0, 200, 80, 30, 15]; // galaxy, planet, moon, asteroid, debris
        
        // Находим индекс среди siblings
        const siblings = parent.children || [];
        const index = siblings.findIndex(s => s.cleanPath === entityData.cleanPath);
        const angle = (index / siblings.length) * Math.PI * 2;
        
        const radius = orbitRadii[level] || 50;
        
        return {
            x: parentPosition.x + Math.cos(angle) * radius,
            y: parentPosition.y + (Math.random() - 0.5) * 20, // Небольшая случайность по Y
            z: parentPosition.z + Math.sin(angle) * radius
        };
    }
    
    createEntityMesh(entityData, position) {
        // Размеры по типам
        const sizes = { galaxy: 20, planet: 8, moon: 4, asteroid: 2, debris: 1 };
        const colors = { 
            galaxy: 0xFFD700, 
            planet: 0x4ECDC4, 
            moon: 0xC7F464, 
            asteroid: 0xFF6B6B, 
            debris: 0xA8E6CF 
        };
        
        const geometry = new SphereGeometry(sizes[entityData.type] || 5, 16, 16);
        const material = new MeshPhongMaterial({ 
            color: colors[entityData.type] || 0x888888 
        });
        const mesh = new Mesh(geometry, material);
        
        mesh.position.set(position.x, position.y, position.z);
        mesh.userData = { entityPath: entityData.cleanPath };
        
        return mesh;
    }
    
    setupControls() {
        // Простые контролы для теста
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
            
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        
        this.renderer.domElement.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        this.renderer.domElement.addEventListener('wheel', (e) => {
            this.camera.position.z += e.deltaY * 0.1;
        });
        
        this.renderer.domElement.addEventListener('click', (e) => {
            // Обработка кликов по объектам
            const rect = this.renderer.domElement.getBoundingClientRect();
            const mouse = {
                x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
                y: -((e.clientY - rect.top) / rect.height) * 2 + 1
            };
            
            // TODO: Raycasting для выбора объектов
            console.log('Click at:', mouse);
        });
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Простая анимация вращения
        this.entities.forEach((entity, path) => {
            if (entity.data.level > 0) { // Все кроме галактики вращаются
                const parent = this.getParentEntity(entity.data);
                if (parent) {
                    const time = Date.now() * 0.001;
                    const radius = this.calculateOrbitRadius(entity.data);
                    const speed = 0.2 / (entity.data.level || 1);
                    
                    entity.mesh.position.x = parent.mesh.position.x + Math.cos(time * speed) * radius;
                    entity.mesh.position.z = parent.mesh.position.z + Math.sin(time * speed) * radius;
                }
            }
        });
        
        this.renderer.render(this.scene, this.camera);
    }
    
    updateHUD() {
        const total = this.entities.size;
        const explored = this.userProgress.getExploredCount();
        const percentage = total > 0 ? (explored / total * 100) : 0;
        
        document.getElementById('progress-fill').style.width = `${percentage}%`;
        document.getElementById('progress-text').textContent = `${percentage.toFixed(1)}%`;
        document.getElementById('total-entities').textContent = total;
    }
    
    calculateOrbitRadius(entityData) {
        const baseRadii = [0, 200, 80, 30, 15];
        return baseRadii[entityData.level] || 50;
    }
    
    getParentEntity(entityData) {
        if (!entityData.cleanPath) return null;
        const pathParts = entityData.cleanPath.split('/');
        pathParts.pop(); // Убираем текущую сущность
        const parentPath = pathParts.join('/');
        return this.entities.get(parentPath);
    }
}
