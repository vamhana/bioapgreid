// Конфигурация уровней и типов сущностей
export const LEVEL_CONFIG = Object.freeze({
    0: {
        type: 'galaxy',
        name: 'Галактика',
        orbitRadius: 0,
        defaultColor: '#FFD700',
        icon: '⭐'
    },
    1: {
        type: 'planet', 
        name: 'Планета',
        orbitRadius: 150,
        defaultColor: '#4ECDC4',
        icon: '🪐'
    },
    2: {
        type: 'moon',
        name: 'Спутник', 
        orbitRadius: 60,
        defaultColor: '#C7F464',
        icon: '🌙'
    },
    3: {
        type: 'asteroid',
        name: 'Астероид',
        orbitRadius: 40, 
        defaultColor: '#FF6B6B',
        icon: '☄️'
    },
    4: {
        type: 'debris',
        name: 'Космический мусор',
        orbitRadius: 20,
        defaultColor: '#A8E6CF',
        icon: '🛰️'
    }
});

export const MAX_DEPTH = 4;

export const SERVER_CONFIG = {
    // Пути можно переопределять через переменные окружения
    SOURCE_PATH: process.env.GALAXY_SOURCE_PATH || '../галактика',
    RESULTS_PATH: process.env.GALAXY_RESULTS_PATH || '../galaxy-scan-results',
    // Использовать латиницу для кроссплатформенности
    USE_LATIN_NAMES: process.env.USE_LATIN_NAMES === 'true'
};