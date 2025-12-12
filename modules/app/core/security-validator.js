// modules/app/core/security-validator.js

export class SecurityValidator {
    static validateGalaxyData(data) {
        if (!data) {
            throw new Error('Galaxy data is null or undefined');
        }

        // Проверка размера данных
        const jsonSize = new Blob([JSON.stringify(data)]).size;
        const maxSize = 10 * 1024 * 1024; // 10MB лимит
        if (jsonSize > maxSize) {
            throw new Error(`Data too large: ${jsonSize} bytes (max: ${maxSize} bytes)`);
        }

        // Проверка структуры
        this.validateStructure(data);
        
        // Санитизация строк
        const sanitizedData = this.sanitizeObject(data);
        
        // Проверка на циклические ссылки
        if (this.hasCyclicReferences(sanitizedData)) {
            throw new Error('Cyclic reference detected in galaxy data');
        }

        return sanitizedData;
    }

    static validateStructure(obj, path = 'root', depth = 0, visited = new WeakSet()) {
        if (depth > 20) {
            throw new Error('Object nesting too deep (max 20 levels)');
        }

        if (typeof obj === 'object' && obj !== null) {
            if (visited.has(obj)) {
                throw new Error('Circular reference detected');
            }
            visited.add(obj);

            for (const [key, value] of Object.entries(obj)) {
                // Проверка ключей
                if (!this.isSafeKey(key)) {
                    throw new Error(`Unsafe key: ${key} at path ${path}`);
                }

                // Проверка типов значений
                const valueType = typeof value;
                if (!['string', 'number', 'boolean', 'object', 'undefined'].includes(valueType)) {
                    throw new Error(`Unsupported type ${valueType} for key ${key} at path ${path}`);
                }

                // Проверка чисел
                if (valueType === 'number' && (!Number.isFinite(value) || Math.abs(value) > 1e12)) {
                    throw new Error(`Invalid number value for key ${key} at path ${path}`);
                }

                // Рекурсивная проверка объектов и массивов
                if (valueType === 'object' && value !== null) {
                    if (Array.isArray(value)) {
                        if (value.length > 10000) {
                            throw new Error(`Array too large for key ${key} at path ${path}`);
                        }
                        for (let i = 0; i < value.length; i++) {
                            this.validateStructure(value[i], `${path}.${key}[${i}]`, depth + 1, visited);
                        }
                    } else {
                        this.validateStructure(value, `${path}.${key}`, depth + 1, visited);
                    }
                }
            }
            
            visited.delete(obj);
        } else if (typeof obj === 'string') {
            if (obj.length > 10000) {
                throw new Error(`String too long (max 10000 chars) at path ${path}`);
            }
        }
    }

    static sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                // Удаляем потенциально опасные символы
                sanitized[key] = value.replace(/[<>"']/g, '').trim();
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    static sanitizeStrings(obj) {
        if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string') {
                    // Безопасная санитизация строк
                    obj[key] = value
                        .replace(/[<>"']/g, '')
                        .replace(/javascript:/gi, '')
                        .replace(/data:/gi, '')
                        .trim();
                } else if (typeof value === 'object') {
                    this.sanitizeStrings(value);
                }
            }
        }
    }

    static isSafeKey(key) {
        // Разрешаем буквы, цифры, подчеркивания, дефисы, точки
        return /^[a-zA-Z0-9_\-\.]+$/.test(key) && key.length < 100;
    }

    static hasCyclicReferences(obj) {
        const seen = new WeakSet();
        
        function detect(current, path = []) {
            if (current && typeof current === 'object') {
                if (seen.has(current)) {
                    console.warn('Cyclic reference detected at path:', path.join('.'));
                    return true;
                }
                seen.add(current);
                
                for (const [key, value] of Object.entries(current)) {
                    if (detect(value, [...path, key])) {
                        return true;
                    }
                }
                
                seen.delete(current);
            }
            return false;
        }
        
        return detect(obj);
    }

    static validateWithMemoryManager(obj, memoryManager) {
        if (!memoryManager) {
            throw new Error('MemoryManager is required for memory validation');
        }
        
        const estimatedSize = this.estimateObjectSize(obj);
        const memoryStats = memoryManager.getMemoryStats();
        
        if (estimatedSize > memoryStats.available * 0.5) {
            throw new Error(`Object too large for available memory: ${estimatedSize} bytes`);
        }
        
        return true;
    }

    static estimateObjectSize(obj) {
        const str = JSON.stringify(obj);
        return new Blob([str]).size;
    }

    static sanitizeHtml(input) {
        if (typeof input !== 'string') return input;
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    static validateUrl(url) {
        if (typeof url !== 'string') return false;
        
        try {
            const parsed = new URL(url);
            // Разрешаем только безопасные протоколы
            const allowedProtocols = ['http:', 'https:', 'data:image/', 'blob:'];
            return allowedProtocols.some(protocol => parsed.protocol.startsWith(protocol));
        } catch {
            return false;
        }
    }

    static validateColor(color) {
        if (typeof color !== 'string') return false;
        
        // Поддерживаемые форматы: hex, rgb, rgba, hsl, hsla
        const colorRegex = /^(#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})|rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)|rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d*(?:\.\d+)?)\)|hsl\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%\)|hsla\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%,\s*(\d*(?:\.\d+)?)\))$/;
        return colorRegex.test(color);
    }

    static validateEntityId(id) {
        if (typeof id !== 'string') return false;
        
        // ID должен быть строкой, содержащей только безопасные символы
        return /^[a-zA-Z0-9_\-\.\/]+$/.test(id) && id.length < 256;
    }

    static validatePosition(position) {
        if (!position || typeof position !== 'object') return false;
        
        const { x, y, z } = position;
        
        return typeof x === 'number' && 
               typeof y === 'number' && 
               typeof z === 'number' &&
               Math.abs(x) < 10000 &&
               Math.abs(y) < 10000 &&
               Math.abs(z) < 10000;
    }

    static createValidationReport(data) {
        const report = {
            isValid: true,
            errors: [],
            warnings: [],
            stats: {
                size: 0,
                depth: 0,
                objectCount: 0,
                stringCount: 0
            }
        };
        
        try {
            this.validateGalaxyData(data);
            report.stats.size = this.estimateObjectSize(data);
        } catch (error) {
            report.isValid = false;
            report.errors.push(error.message);
        }
        
        return report;
    }
}

export default SecurityValidator;
