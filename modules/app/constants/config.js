// modules/app/constants/config.js
// Конфигурационные константы для всего приложения

export const APP_CONFIG = {
    // Основные настройки приложения
    VERSION: '1.0.0',
    APP_NAME: 'Galaxy Explorer',
    BUILD_DATE: '2024-01-01',
    
    // Режимы отладки
    DEBUG: {
        ENABLED: true,
        SHOW_FPS: true,
        SHOW_PLATFORM_INFO: true,
        LOG_RENDER_STATS: false,
        LOG_INTERACTION_EVENTS: false
    },
    
    // Настройки производительности
    PERFORMANCE: {
        MAX_FPS: 60,
        ENABLE_LOD: true, // Level of Detail
        OBJECT_POOL_SIZE: 100,
        ENABLE_FRAME_THROTTLING: true,
        THROTTLE_FPS: 30, // Максимальный FPS при троттлинге
        DEBOUNCE_RESIZE: 250 // Задержка при resize в ms
    },
    
    // Настройки рендеринга
    RENDERING: {
        BACKGROUND: {
            PRIMARY: '#0c0c2e',
            SECONDARY: '#1a1a4a',
            GRADIENT: 'linear-gradient(135deg, #0c0c2e 0%, #1a1a4a 100%)'
        },
        ORBITS: {
            COLOR: 'rgba(78, 205, 196, 0.3)',
            WIDTH: 1,
            DASH: [5, 5],
            ENABLED: true
        },
        ENTITIES: {
            ENABLE_GLOW: true,
            GLOW_INTENSITY: 0.3,
            ENABLE_PULSE: true,
            PULSE_SPEED: 0.005
        },
        HIGHLIGHTS: {
            HOVER_COLOR: '#FFD700',
            SELECTION_COLOR: '#C7F464',
            HOVER_GLOW: 15,
            SELECTION_GLOW: 20
        }
    },
    
    // Настройки взаимодействия
    INTERACTION: {
        ZOOM: {
            SENSITIVITY: 0.001,
            MIN: 0.1,
            MAX: 5,
            SMOOTH: true,
            SMOOTH_SPEED: 0.1
        },
        PAN: {
            SENSITIVITY: 0.5,
            MOBILE_SENSITIVITY: 0.3,
            INERTIA: true,
            INERTIA_FRICTION: 0.88
        },
        TOUCH: {
            ENABLE_PINCH_ZOOM: true,
            PINCH_SENSITIVITY: 0.01,
            TAP_RADIUS: 10, // px
            LONG_PRESS_DURATION: 500 // ms
        }
    },
    
    // Настройки камеры
    CAMERA: {
        INITIAL_ZOOM: 1,
        INITIAL_POSITION: { x: 0, y: 0 },
        BOUNDS: {
            minX: -2000,
            maxX: 2000,
            minY: -2000,
            maxY: 2000
        },
        TRANSITION: {
            DURATION: 1000,
            EASING: 'easeOutCubic'
        }
    },
    
    // Настройки галактики
    GALAXY: {
        LAYOUT: {
            CENTER_RADIUS: 50,
            PLANET_ORBIT_RADIUS: 200,
            MOON_ORBIT_RADIUS: 60,
            ASTEROID_ORBIT_RADIUS: 40,
            DEBRIS_ORBIT_RADIUS: 20
        },
        ANIMATION: {
            ENABLE_ORBIT_ROTATION: true,
            ORBIT_SPEED: 0.0001,
            ENABLE_PULSE: true,
            PULSE_SPEED: 0.005
        }
    },
    
    // Настройки UI
    UI: {
        COLORS: {
            PRIMARY: '#4ECDC4',
            SECONDARY: '#C7F464',
            ACCENT: '#FF6B6B',
            BACKGROUND: 'rgba(12, 12, 46, 0.95)',
            TEXT: '#e0e0ff',
            TEXT_SECONDARY: '#a0a0cc'
        },
        FONTS: {
            PRIMARY: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            MONOSPACE: 'Monaco, "Courier New", monospace'
        },
        SIZES: {
            USER_PANEL_HEIGHT: 80,
            INFO_PANEL_WIDTH: 300,
            MINIMAP_SIZE: 150
        },
        ANIMATION: {
            DURATION: 300,
            EASING: 'ease-out'
        }
    },
    
    // Настройки прогресса и сохранения
    PROGRESSION: {
        STORAGE_KEY: 'galaxy-explorer-progress',
        AUTO_SAVE: true,
        AUTO_SAVE_INTERVAL: 30000, // 30 секунд
        MILESTONES: [0.25, 0.5, 0.75, 1] // 25%, 50%, 75%, 100%
    },
    
    // Настройки API и данных
    DATA: {
        SITEMAP_URL: '/results/sitemap.json',
        CACHE_DURATION: 300000, // 5 минут
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    }
};

// Цвета для различных типов сущностей
export const ENTITY_COLORS = {
    galaxy: '#FFD700',    // Золотой
    planet: '#4ECDC4',    // Бирюзовый
    moon: '#C7F464',      // Салатовый
    asteroid: '#FF6B6B',  // Красный
    debris: '#A8E6CF',    // Мятный
    unknown: '#45b7d1'    // Голубой
};

// Размеры сущностей (радиусы в пикселях)
export const ENTITY_SIZES = {
    galaxy: 50,
    planet: 25,
    moon: 15,
    asteroid: 8,
    debris: 5,
    unknown: 10
};

// Иконки для типов сущностей
export const ENTITY_ICONS = {
    galaxy: '⭐',
    planet: '🪐',
    moon: '🌙',
    asteroid: '☄️',
    debris: '🛰️',
    unknown: '📁'
};

// Локализованные названия типов сущностей
export const ENTITY_NAMES = {
    galaxy: 'Галактика',
    planet: 'Планета',
    moon: 'Спутник',
    asteroid: 'Астероид',
    debris: 'Объект',
    unknown: 'Неизвестно'
};

// Настройки для различных платформ
export const PLATFORM_CONFIG = {
    DESKTOP: {
        ZOOM_SENSITIVITY: 0.001,
        PAN_SENSITIVITY: 0.5,
        CURSORS: {
            DEFAULT: 'default',
            HOVER: 'pointer',
            DRAGGING: 'grabbing'
        }
    },
    MOBILE: {
        ZOOM_SENSITIVITY: 0.01,
        PAN_SENSITIVITY: 0.3,
        TAP_RADIUS: 15
    },
    TOUCH: {
        PINCH_SENSITIVITY: 0.01,
        LONG_PRESS_DURATION: 500
    }
};

// Настройки анимаций
export const ANIMATION_CONFIG = {
    DURATIONS: {
        ENTITY_SELECT: 300,
        PANEL_SLIDE: 300,
        FADE_IN: 500,
        FADE_OUT: 300,
        PULSE: 2000
    },
    EASING: {
        BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        EASE_OUT: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        EASE_IN_OUT: 'cubic-bezier(0.645, 0.045, 0.355, 1)'
    }
};

// Коды клавиш для управления
export const KEYBOARD_SHORTCUTS = {
    RESET_ZOOM: ['0', 'r', 'к'], // 0, R, Русская Р
    TOGGLE_ORBITS: ['o', 'щ'],   // O, Русская Щ
    TOGGLE_MINIMAP: ['m', 'ь'],  // M, Русская Ь
    DESELECT: ['Escape'],
    OPEN_ENTITY: ['Enter']
};

// Сообщения и тексты UI
export const UI_TEXT = {
    COMMON: {
        LOADING: 'Загрузка...',
        ERROR: 'Ошибка',
        SUCCESS: 'Успех',
        WARNING: 'Предупреждение'
    },
    ACTIONS: {
        RESET_VIEW: 'Сбросить вид',
        TOGGLE_ORBITS: 'Переключить орбиты',
        SHOW_MINIMAP: 'Показать миникарту',
        HIDE_PANEL: 'Скрыть панель',
        SHOW_PANEL: 'Показать панель'
    },
    ENTITY: {
        SELECTED: 'Выбрано',
        DISCOVERED: 'Исследовано',
        UNDISCOVERED: 'Не исследовано'
    },
    PROGRESS: {
        RESEARCH: 'Исследование',
        DISCOVERED: 'открыто',
        OF: 'из',
        ENTITIES: 'объектов'
    }
};

// Утилитарные функции конфигурации
export const ConfigUtils = {
    // Получить конфиг для текущей платформы
    getPlatformConfig() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTouch = 'ontouchstart' in window;
        
        if (isMobile || isTouch) {
            return PLATFORM_CONFIG.MOBILE;
        }
        return PLATFORM_CONFIG.DESKTOP;
    },
    
    // Получить цвет для типа сущности
    getEntityColor(type) {
        return ENTITY_COLORS[type] || ENTITY_COLORS.unknown;
    },
    
    // Получить размер для типа сущности
    getEntitySize(type) {
        return ENTITY_SIZES[type] || ENTITY_SIZES.unknown;
    },
    
    // Получить иконку для типа сущности
    getEntityIcon(type) {
        return ENTITY_ICONS[type] || ENTITY_ICONS.unknown;
    },
    
    // Получить локализованное имя для типа сущности
    getEntityName(type) {
        return ENTITY_NAMES[type] || ENTITY_NAMES.unknown;
    },
    
    // Проверить, включен ли режим отладки
    isDebugEnabled() {
        return APP_CONFIG.DEBUG.ENABLED;
    },
    
    // Получить настройки для текущего устройства
    getDeviceSettings() {
        const platform = this.getPlatformConfig();
        return {
            zoomSensitivity: platform.ZOOM_SENSITIVITY,
            panSensitivity: platform.PAN_SENSITIVITY,
            isMobile: platform === PLATFORM_CONFIG.MOBILE,
            isTouch: 'ontouchstart' in window
        };
    },
    
    // Валидация конфигурации
    validateConfig() {
        const errors = [];
        
        // Проверяем обязательные поля
        if (!APP_CONFIG.APP_NAME) errors.push('APP_NAME is required');
        if (!APP_CONFIG.VERSION) errors.push('VERSION is required');
        
        // Проверяем цвета
        Object.entries(ENTITY_COLORS).forEach(([type, color]) => {
            if (!color || !color.startsWith('#')) {
                errors.push(`Invalid color for entity type: ${type}`);
            }
        });
        
        // Проверяем размеры
        Object.entries(ENTITY_SIZES).forEach(([type, size]) => {
            if (typeof size !== 'number' || size <= 0) {
                errors.push(`Invalid size for entity type: ${type}`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
};

// Экспорт по умолчанию для удобства
export default {
    APP_CONFIG,
    ENTITY_COLORS,
    ENTITY_SIZES,
    ENTITY_ICONS,
    ENTITY_NAMES,
    PLATFORM_CONFIG,
    ANIMATION_CONFIG,
    KEYBOARD_SHORTCUTS,
    UI_TEXT,
    ConfigUtils
};
