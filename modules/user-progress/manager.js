// modules/user-progress/manager.js
export class UserProgress {
    constructor() {
        this.storageKey = 'galaxyExplorerProgress';
        this.progress = this.loadProgress();
    }
    
    loadProgress() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || {
                explored: [],
                achievements: [],
                lastVisit: new Date().toISOString()
            };
        } catch {
            return { explored: [], achievements: [], lastVisit: new Date().toISOString() };
        }
    }
    
    saveProgress() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.progress));
    }
    
    markExplored(entityPath) {
        if (!this.progress.explored.includes(entityPath)) {
            this.progress.explored.push(entityPath);
            this.saveProgress();
            this.checkAchievements();
            return true;
        }
        return false;
    }
    
    getExploredCount() {
        return this.progress.explored.length;
    }
    
    checkAchievements() {
        const explored = this.progress.explored.length;
        const achievements = [];
        
        if (explored >= 1 && !this.progress.achievements.includes('first_contact')) {
            achievements.push('first_contact');
        }
        if (explored >= 5 && !this.progress.achievements.includes('explorer_novice')) {
            achievements.push('explorer_novice');
        }
        
        achievements.forEach(achievement => {
            this.progress.achievements.push(achievement);
            this.showAchievement(achievement);
        });
        
        if (achievements.length > 0) {
            this.saveProgress();
        }
    }
    
    showAchievement(achievement) {
        const achievementsMap = {
            'first_contact': { name: 'Первый контакт', icon: '👋' },
            'explorer_novice': { name: 'Новичок-исследователь', icon: '🪐' }
        };
        
        const achievementData = achievementsMap[achievement];
        if (achievementData) {
            // TODO: Показать уведомление о достижении
            console.log(`🎉 Достижение получено: ${achievementData.icon} ${achievementData.name}`);
        }
    }
}
