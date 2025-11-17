export class GalaxyRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.objects = [];
        this.showOrbits = true;
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        console.log('✅ Рендерер инициализирован');
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        console.log('🔄 Размер канваса обновлен:', this.canvas.width, 'x', this.canvas.height);
    }

    render(galaxyData) {
        // Очистка канваса
        this.ctx.fillStyle = '#0c0c2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Рендерим галактику
        this.renderGalaxy(galaxyData);
    }

    renderGalaxy(galaxy) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Рендерим планеты
        galaxy.children?.forEach((planet, index) => {
            const angle = (index / galaxy.children.length) * Math.PI * 2;
            const distance = 200;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            // Орбита
            if (this.showOrbits) {
                this.ctx.strokeStyle = 'rgba(78, 205, 196, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, distance, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            // Планета
            this.ctx.fillStyle = planet.config?.color || '#4ECDC4';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 25, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Свечение
            const gradient = this.ctx.createRadialGradient(x, y, 25, x, y, 40);
            gradient.addColorStop(0, planet.config?.color || '#4ECDC4');
            gradient.addColorStop(1, 'transparent');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x - 40, y - 40, 80, 80);
            
            // Название
            this.ctx.fillStyle = 'white';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(planet.config?.title || planet.name, x, y + 45);
        });
        
        // Центральная звезда (галактика)
        const sunGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50);
        sunGradient.addColorStop(0, '#FFD700');
        sunGradient.addColorStop(1, 'transparent');
        this.ctx.fillStyle = sunGradient;
        this.ctx.fillRect(centerX - 50, centerY - 50, 100, 100);
    }

    resetCamera() {
        console.log('🗺️ Сброс камеры к обзору');
        // Будущая реализация
    }

    toggleOrbitDisplay() {
        this.showOrbits = !this.showOrbits;
        console.log('🔄 Отображение орбит:', this.showOrbits ? 'вкл' : 'выкл');
    }
}
