export class DataLoadingError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'DataLoadingError';
        this.code = options.code || 'LOAD_ERROR';
        this.cause = options.cause;
        this.timestamp = new Date().toISOString();
    }
}

export class DataValidationError extends DataLoadingError {
    constructor(message, field = null) {
        super(message, { code: 'VALIDATION_ERROR' });
        this.name = 'DataValidationError';
        this.field = field;
    }
}

export class CacheError extends DataLoadingError {
    constructor(message) {
        super(message, { code: 'CACHE_ERROR' });
        this.name = 'CacheError';
    }
}

export class DataLoaderResult {
    constructor(success, data = null, error = null, warnings = []) {
        this.success = success;
        this.data = data;
        this.error = error;
        this.warnings = warnings;
        this.timestamp = Date.now();
        
        if (error && !(error instanceof DataLoadingError)) {
            this.error = new DataLoadingError(error.message, { cause: error });
        }
    }
    
    static success(data, warnings = []) {
        return new DataLoaderResult(true, data, null, warnings);
    }
    
    static error(error, warnings = []) {
        return new DataLoaderResult(false, null, error, warnings);
    }
    
    get hasWarnings() {
        return this.warnings.length > 0;
    }
    
    get isFallback() {
        return this.warnings.some(w => w.includes('fallback'));
    }
}
