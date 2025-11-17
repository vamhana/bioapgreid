class GalaxyLogger {
    constructor() {
        this.colors = {
            info: '\x1b[36m',    // Голубой
            success: '\x1b[32m', // Зеленый
            warning: '\x1b[33m', // Желтый
            error: '\x1b[31m',   // Красный
            debug: '\x1b[35m',   // Фиолетовый
            reset: '\x1b[0m'     // Сброс
        };
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const color = this.colors[level] || this.colors.info;
        
        console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${this.colors.reset}`);
        
        if (data) {
            console.log(`${color}↳ Данные:`, data, this.colors.reset);
        }
    }

    info(message, data) {
        this.log('info', message, data);
    }

    success(message, data) {
        this.log('success', message, data);
    }

    warning(message, data) {
        this.log('warning', message, data);
    }

    error(message, data) {
        this.log('error', message, data);
    }

    debug(message, data) {
        this.log('debug', message, data);
    }

    // Специальные методы для сканера
    startScan(galaxyName) {
        console.log('\n');
        console.log('🚀 '.repeat(10));
        this.success(`НАЧАЛО СКАНИРОВАНИЯ ГАЛАКТИКИ: ${galaxyName}`);
        console.log('🚀 '.repeat(10));
        console.log('\n');
    }

    entityFound(level, name, path) {
        const config = this.getLevelConfig(level);
        this.info(`Обнаружена ${config.name}: ${name}`, { путь: path, тип: config.type });
    }

    levelComplete(level, count) {
        const config = this.getLevelConfig(level);
        this.success(`Уровень ${level} (${config.name}) завершен: ${count} сущностей`);
    }

    scanComplete(stats) {
        console.log('\n');
        console.log('✅ '.repeat(10));
        this.success('СКАНИРОВАНИЕ ЗАВЕРШЕНО!', stats);
        console.log('✅ '.repeat(10));
        console.log('\n');
    }

    getLevelConfig(level) {
        const configs = {
            0: { name: 'galaxy', type: 'galaxy' },
            1: { name: 'Планета', type: 'planet' },
            2: { name: 'Спутник', type: 'moon' },
            3: { name: 'Астероид', type: 'asteroid' },
            4: { name: 'Мусор', type: 'debris' }
        };
        return configs[level] || { name: 'Неизвестно', type: 'unknown' };
    }
}

export const logger = new GalaxyLogger();