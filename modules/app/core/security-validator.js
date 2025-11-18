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
        this.sanitizeStrings(data);
        
        return true;
    }

    static validateStructure(obj, path = 'root', depth = 0) {
        if (depth > 20) {
            throw new Error('Object nesting too deep');
        }

        if (typeof obj === 'object' && obj !== null) {
            // Проверка на циклические ссылки
            if (this.hasCyclicReferences(obj)) {
                throw new Error('Cyclic reference detected');
            }

            for (const [key, value] of Object.entries(obj)) {
                // Проверка ключей
                if (!this.isSafeKey(key)) {
                    throw new Error(`Unsafe key: ${key} at path ${path}`);
                }

                // Рекурсивная проверка значений
                this.validateStructure(value, `${path}.${key}`, depth + 1);
            }
        } else if (typeof obj === 'string') {
            if (obj.length > 10000) {
                throw new Error('String too long');
            }
        }
    }

    static sanitizeStrings(obj) {
        if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string') {
                    // Удаляем потенциально опасные символы, но оставляем базовые символы для JSON
                    obj[key] = value.replace(/[<>]/g, '');
                } else if (typeof value === 'object') {
                    this.sanitizeStrings(value);
                }
            }
        }
    }

    static isSafeKey(key) {
        // Разрешаем буквы, цифры, подчеркивания, дефисы
        return /^[a-zA-Z0-9_-]+$/.test(key) && key.length < 100;
    }

    static hasCyclicReferences(obj) {
        const seen = new WeakSet();
        
        function detect(obj) {
            if (obj && typeof obj === 'object') {
                if (seen.has(obj)) {
                    return true;
                }
                seen.add(obj);
                
                for (const value of Object.values(obj)) {
                    if (detect(value)) {
                        return true;
                    }
                }
            }
            return false;
        }
        
        return detect(obj);
    }

    // Дополнительные методы безопасности
    static sanitizeHtml(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    static validateUrl(url) {
        try {
            const parsed = new URL(url);
            return ['http:', 'https:', 'data:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    }

    static validateColor(color) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|^rgb\(|^rgba\(|^hsl\(/.test(color);
    }
}

export default SecurityValidator;