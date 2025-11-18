// modules/app/core/galaxy-renderer.js
export class GalaxyRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.showOrbits = true;
        this.animationState = {
            entranceComplete: false,
            currentOpacity: 0
        };
        
        console.log('🎨 GalaxyRenderer создан:', {
            canvasSize: `${this.canvas.width}x${this.canvas.height}`,
            contextType: '2d',
            mobile: 'ontouchstart' in window
        });
    }

    async init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        console.log('✅ Renderer инициализирован и обработчик resize установлен');
        return Promise.resolve();
    }

    resize() {
        const oldSize = `${this.canvas.width}x${this.canvas.height}`;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        console.log('🔄 Canvas изменен:', oldSize, '→', `${this.canvas.width}x${this.canvas.height}`);
    }

    render(galaxyData, camera = { x: 0, y: 0, zoom: 1 }) {
        if (!galaxyData) {
            console.warn('⚠️ Нет данных для рендеринга');
            return;
        }

        // Сохраняем контекст
        this.ctx.save();
        
        // Очистка canvas
        this.ctx.fillStyle = '#0c0c2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Применяем прозрачность для анимации входа
        if (!this.animationState.entranceComplete) {
            this.ctx.globalAlpha = this.animationState.currentOpacity;
        }

        const centerX = this.canvas.width / 2 + (camera.x || 0);
        const centerY = this.canvas.height / 2 + (camera.y || 0);
        const scale = camera.zoom || 1;

        // Рендерим центральную звезду (галактику)
        this.renderSun(centerX, centerY, scale);
        
        // Рендерим планеты и их спутники
        if (galaxyData.children) {
            this.renderPlanets(galaxyData.children, centerX, centerY, scale);
        }
        
        // Восстанавливаем контекст
        this.ctx.restore();
        
        // console.log('🖼️ Кадр отрендерен'); // Закомментировано для производительности
    }

    renderSun(x, y, scale) {
        const sunRadius = 40 * scale;
        
        // Внешнее свечение
        const outerGradient = this.ctx.createRadialGradient(x, y, 0, x, y, sunRadius * 2.5);
        outerGradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
        outerGradient.addColorStop(0.7, 'rgba(255, 165, 0, 0.3)');
        outerGradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
        
        this.ctx.fillStyle = outerGradient;
        this.ctx.fillRect(x - sunRadius * 2.5, y - sunRadius * 2.5, sunRadius * 5, sunRadius * 5);
        
        // Внутреннее свечение
        const innerGradient = this.ctx.createRadialGradient(x, y, 0, x, y, sunRadius * 1.5);
        innerGradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
        innerGradient.addColorStop(0.8, 'rgba(255, 215, 0, 0.7)');
        innerGradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
        
        this.ctx.fillStyle = innerGradient;
        this.ctx.fillRect(x - sunRadius * 1.5, y - sunRadius * 1.5, sunRadius * 3, sunRadius * 3);
        
        // Ядро
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(x, y, sunRadius * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Эффект грануляции
        this.ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * sunRadius * 0.4;
            const spotX = x + Math.cos(angle) * distance;
            const spotY = y + Math.sin(angle) * distance;
            const spotSize = Math.random() * sunRadius * 0.2 + 2;
            
            this.ctx.beginPath();
            this.ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
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
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, distance, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            // Планета
            const planetColor = planet.config?.color || '#4ECDC4';
            
            // Свечение планеты
            const planetGradient = this.ctx.createRadialGradient(
                planetX, planetY, 0, planetX, planetY, planetRadius * 1.5
            );
            planetGradient.addColorStop(0, planetColor);
            planetGradient.addColorStop(0.8, planetColor + '80'); // 50% прозрачности
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
            
            // Обводка планеты
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(planetX, planetY, planetRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Название планеты
            this.ctx.fillStyle = 'white';
            this.ctx.font = `${Math.max(10, 12 * scale)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(
                planet.config?.title || planet.name, 
                planetX, 
                planetY + planetRadius + 10
            );
            
            // Рендерим спутники
            if (planet.children && planet.children.length > 0) {
                this.renderMoons(planet.children, planetX, planetY, scale);
            }
        });
    }

    renderMoons(moons, planetX, planetY, scale) {
        moons.forEach((moon, index) => {
            const angle = (index / moons.length) * Math.PI * 2;
            const distance = 60 * scale;
            const moonX = planetX + Math.cos(angle) * distance;
            const moonY = planetY + Math.sin(angle) * distance;
            const moonRadius = 8 * scale;
            
            // Орбита луны
            if (this.showOrbits) {
                this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
                this.ctx.lineWidth = 0.5;
                this.ctx.setLineDash([2, 2]);
                this.ctx.beginPath();
                this.ctx.arc(planetX, planetY, distance, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            // Луна
            const moonColor = moon.config?.color || '#CCCCCC';
            
            this.ctx.fillStyle = moonColor;
            this.ctx.beginPath();
            this.ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Обводка луны
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        });
    }

    toggleOrbitDisplay() {
        this.showOrbits = !this.showOrbits;
        console.log('🔄 Орбиты:', this.showOrbits ? 'ВКЛ' : 'ВЫКЛ');
        return this.showOrbits;
    }

    setOrbitDisplay(visible) {
        this.showOrbits = visible;
        console.log('🔄 Орбиты установлены:', visible ? 'ВКЛ' : 'ВЫКЛ');
    }

    animateEntrance() {
        console.log('🎬 Запуск анимации входа');
        this.animationState.entranceComplete = false;
        this.animationState.currentOpacity = 0;
        
        const animate = () => {
            this.animationState.currentOpacity += 0.02;
            
            if (this.animationState.currentOpacity < 1) {
                requestAnimationFrame(animate);
            } else {
                this.animationState.currentOpacity = 1;
                this.animationState.entranceComplete = true;
                console.log('✅ Анимация входа завершена');
            }
        };
        
        animate();
    }

    // Методы для отладки и информации
    getCanvasInfo() {
        return {
            width: this.canvas.width,
            height: this.canvas.height,
            pixelRatio: window.devicePixelRatio,
            context: this.ctx ? 'доступен' : 'недоступен',
            orbitsVisible: this.showOrbits,
            animationState: this.animationState
        };
    }

    getPerformanceInfo() {
        return {
            canvasSize: `${this.canvas.width}x${this.canvas.height}`,
            memory: (this.canvas.width * this.canvas.height * 4) / (1024 * 1024) + ' MB',
            features: {
                filters: !!this.ctx.filter,
                globalAlpha: !!this.ctx.globalAlpha,
                gradients: !!this.ctx.createLinearGradient
            }
        };
    }

    // Очистка ресурсов
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        console.log('🧹 Canvas очищен');
    }

    // Деструктор
    destroy() {
        this.clear();
        // Удаляем обработчики событий
        window.removeEventListener('resize', () => this.resize());
        console.log('🧹 GalaxyRenderer уничтожен');
    }
}

export default GalaxyRenderer;
