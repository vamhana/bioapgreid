// modules/app/core/galaxy-renderer.js - МИНИМАЛЬНАЯ РАБОЧАЯ ВЕРСИЯ
export class GalaxyRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.showOrbits = true;
        
        console.log('🎨 GalaxyRenderer initialized:', {
            canvasSize: `${this.canvas.width}x${this.canvas.height}`,
            contextType: '2d',
            mobile: 'ontouchstart' in window
        });
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        console.log('✅ Renderer initialized and resize handler attached');
        return Promise.resolve(); // Для совместимости с async/await
    }

    resize() {
        const oldSize = `${this.canvas.width}x${this.canvas.height}`;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        console.log('🔄 Canvas resized:', oldSize, '→', `${this.canvas.width}x${this.canvas.height}`);
    }

    render(galaxyData, camera = { x: 0, y: 0, zoom: 1 }) {
        // Очистка canvas
        this.ctx.fillStyle = '#0c0c2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2 + camera.x;
        const centerY = this.canvas.height / 2 + camera.y;
        const scale = camera.zoom || 1;

        // Рендерим центральную звезду (галактику)
        this.renderSun(centerX, centerY, scale);
        
        // Рендерим планеты
        if (galaxyData.children) {
            this.renderPlanets(galaxyData.children, centerX, centerY, scale);
        }
        
        console.log('🖼️ Frame rendered');
    }

    renderSun(x, y, scale) {
        const sunRadius = 40 * scale;
        
        // Свечение
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, sunRadius * 2);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 165, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x - sunRadius * 2, y - sunRadius * 2, sunRadius * 4, sunRadius * 4);
        
        // Ядро
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(x, y, sunRadius * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
    }

    renderPlanets(planets, centerX, centerY, scale) {
        planets.forEach((planet, index) => {
            const angle = (index / planets.length) * Math.PI * 2;
            const distance = 200 * scale;
            const planetX = centerX + Math.cos(angle) * distance;
            const planetY = centerY + Math.sin(angle) * distance;
            const planetRadius = 25 * scale;
            
            // Орбита
            if (this.showOrbits) {
                this.ctx.strokeStyle = 'rgba(78, 205, 196, 0.3)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, distance, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            // Планета
            const planetColor = planet.config?.color || '#4ECDC4';
            
            // Свечение планеты
            const planetGradient = this.ctx.createRadialGradient(
                planetX, planetY, 0, planetX, planetY, planetRadius * 1.5
            );
            planetGradient.addColorStop(0, planetColor);
            planetGradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = planetGradient;
            this.ctx.fillRect(
                planetX - planetRadius * 1.5, 
                planetY - planetRadius * 1.5, 
                planetRadius * 3, 
                planetRadius * 3
            );
            
            // Ядро планеты
            this.ctx.fillStyle = planetColor;
            this.ctx.beginPath();
            this.ctx.arc(planetX, planetY, planetRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Название планеты
            this.ctx.fillStyle = 'white';
            this.ctx.font = `${12 * scale}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(planet.config?.title || planet.name, planetX, planetY + planetRadius + 20);
        });
    }

    toggleOrbitDisplay() {
        this.showOrbits = !this.showOrbits;
        console.log('🔄 Orbits:', this.showOrbits ? 'ON' : 'OFF');
    }

    animateEntrance() {
        console.log('🎬 Starting entrance animation');
        // Простая анимация появления
        this.ctx.globalAlpha = 0;
        let opacity = 0;
        
        const animate = () => {
            opacity += 0.02;
            this.ctx.globalAlpha = Math.min(opacity, 1);
            
            if (opacity < 1) {
                requestAnimationFrame(animate);
            } else {
                this.ctx.globalAlpha = 1;
            }
        };
        
        animate();
    }

    // Метод для отладки
    getCanvasInfo() {
        return {
            width: this.canvas.width,
            height: this.canvas.height,
            pixelRatio: window.devicePixelRatio,
            context: this.ctx ? 'available' : 'unavailable'
        };
    }
}

export default GalaxyRenderer;
