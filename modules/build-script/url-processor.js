import { BUILD_CONFIG, ENTITY_CONFIG } from './config.js';

export function addFullUrls(entity, baseUrl = BUILD_CONFIG.BASE_URL) {
    if (entity.path) {
        entity.fullUrl = `${baseUrl}/galaxy/${entity.path}/index.html`;
    } else {
        entity.fullUrl = `${baseUrl}/galaxy/index.html`;
    }
    
    entity.cleanPath = entity.path || '';
    
    if (entity.children && entity.children.length > 0) {
        entity.children.forEach(child => addFullUrls(child, baseUrl));
    }
    
    return entity;
}

export function generateEntityLinks(entity, level = 0) {
    const { classMap, icons } = ENTITY_CONFIG;
    
    let html = `
        <div class="entity ${classMap[entity.type]}" data-level="${level}" data-path="${entity.cleanPath}">
            <div class="entity-header">
                <span class="entity-icon">${icons[entity.type] || '📁'}</span>
                <span class="entity-name">${entity.config?.title || entity.name}</span>
            </div>
            <div class="entity-meta">
                Тип: ${entity.type} | Путь: ${entity.cleanPath}
                ${entity.config?.description ? `<br>Описание: ${entity.config.description}` : ''}
                ${entity.fullUrl ? `<br>URL: <a href="${entity.fullUrl}" target="_blank">${entity.fullUrl}</a>` : ''}
            </div>
    `;
    
    if (entity.children && entity.children.length > 0) {
        entity.children.forEach(child => {
            html += generateEntityLinks(child, level + 1);
        });
    }
    
    html += `</div>`;
    return html;
}
