export const DataLoaderConfig = {
    DEFAULT: {
        name: 'GalaxyDataLoader',
        version: '2.0.0',
        sitemapUrl: '/results/sitemap.json',
        seed: 0x4ECDC4,
        
        security: {
            strictMode: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['galaxy', 'star', 'planet', 'moon', 'asteroid', 'debris']
        },
        
        validation: {
            maxDepth: 20,
            maxEntities: 10000,
            maxStringLength: 10000
        },
        
        cache: {
            enabled: true,
            ttl: 5 * 60 * 1000, // 5 минут
            maxSize: 50 * 1024 * 1024 // 50MB
        },
        
        memory: {
            warnAt: 0.8, // 80% использования
            criticalAt: 0.9 // 90% использования
        },
        
        fallback: {
            enabled: true,
            generateIfEmpty: true,
            entityCount: 12
        },
        
        performance: {
            batchSize: 100,
            debounceTime: 100
        }
    },
    
    DEVELOPMENT: {
        // Конфиг для разработки
        cache: {
            enabled: false,
            ttl: 0
        },
        fallback: {
            enabled: true
        }
    },
    
    PRODUCTION: {
        // Конфиг для продакшена
        cache: {
            enabled: true,
            ttl: 15 * 60 * 1000 // 15 минут
        },
        security: {
            strictMode: true
        }
    }
};
