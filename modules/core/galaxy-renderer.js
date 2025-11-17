export class GalaxyRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.objects = [];
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    render(galaxyData) {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Простая визуализация для теста
        this.renderGalaxy(galaxyData);
    }

    renderGalaxy(galaxy) {
        // Базовая визуализация - круги разных цветов
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        galaxy.children?.forEach((planet, index) => {
            const angle = (index / galaxy.children.length) * Math.PI * 2;
            const distance = 150;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            this.ctx.fillStyle = planet.config?.color || '#4ECDC4';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Подписи для теста
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(planet.name, x - 10, y + 30);
        });
    }
}
