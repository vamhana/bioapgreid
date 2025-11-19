import * as THREE from './three.module.js';

export class AnimationSystem {
    constructor() {
        this.mixer = new THREE.AnimationMixer();
        this.animations = new Map();
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.animationLoopId = null;
        
        // Кэш для анимационных клипов
        this.clipCache = new Map();
        
        // Статистика
        this.stats = {
            totalAnimations: 0,
            activeAnimations: 0,
            frameTime: 0,
            clipsCached: 0
        };
        
        console.log('🎬 AnimationSystem создан');
    }

    async init() {
        try {
            // Предзагрузка базовых анимационных клипов
            await this.preloadBaseClips();
            
            this.isRunning = true;
            this.startAnimationLoop();
            
            console.log('✅ AnimationSystem инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации AnimationSystem:', error);
            throw error;
        }
    }

    // Предзагрузка базовых анимационных клипов
    async preloadBaseClips() {
        const baseClips = [
            this.createEntranceClip(),
            this.createRotationClip('slow', 4.0),
            this.createRotationClip('medium', 2.0),
            this.createRotationClip('fast', 1.0),
            this.createPulseClip('gentle', 0.1, 2.0),
            this.createPulseClip('strong', 0.3, 1.5)
        ];

        baseClips.forEach((clip, index) => {
            this.clipCache.set(clip.name, clip);
        });

        this.stats.clipsCached = baseClips.length;
        console.log(`📦 Загружено ${baseClips.length} базовых анимационных клипов`);
    }

    // Создание анимации входа для галактики
    animateGalaxyEntrance(entityMeshes, options = {}) {
        const {
            duration = 1.5,
            staggerDelay = 0.05,
            easing = 'cubic'
        } = options;

        console.log('🎬 Запуск анимации входа галактики...');

        let delay = 0;
        entityMeshes.forEach((mesh, entityId) => {
            this.animateMeshEntrance(mesh, delay, duration, easing);
            delay += staggerDelay;
        });

        this.stats.totalAnimations += entityMeshes.size;
        console.log(`✅ Анимация входа запущена для ${entityMeshes.size} объектов`);
    }

    // Анимация входа для отдельного меша
    animateMeshEntrance(mesh, delay = 0, duration = 1.0, easing = 'cubic') {
        const clipName = `entrance_${duration}_${easing}`;
        
        // Используем кэшированный клип или создаем новый
        let clip = this.clipCache.get(clipName);
        if (!clip) {
            clip = this.createEntranceClip(duration, easing);
            this.clipCache.set(clipName, clip);
        }

        // Сохраняем исходный масштаб и устанавливаем начальный
        mesh.userData.originalScale = mesh.scale.clone();
        mesh.scale.set(0, 0, 0);

        // Создаем действие анимации
        const action = this.mixer.clipAction(clip, mesh);
        
        // Настраиваем анимацию
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.startAt(delay);
        action.play();

        // Сохраняем для управления
        const animationId = `${mesh.uuid}_entrance`;
        this.animations.set(animationId, {
            action: action,
            mesh: mesh,
            type: 'entrance',
            startTime: this.mixer.time + delay
        });

        return animationId;
    }

    // Создание клипа анимации входа
    createEntranceClip(duration = 1.0, easing = 'cubic') {
        const times = [0, duration * 0.3, duration * 0.6, duration];
        
        // Разные easing функции
        const getEasingValue = (progress, type) => {
            switch (type) {
                case 'cubic':
                    return 1 - Math.pow(1 - progress, 3);
                case 'elastic':
                    return 1 - Math.pow(2, -10 * progress) * Math.sin((progress - 0.075) * (2 * Math.PI) / 0.3);
                case 'bounce':
                    if (progress < 1 / 2.75) {
                        return 7.5625 * progress * progress;
                    } else if (progress < 2 / 2.75) {
                        return 7.5625 * (progress -= 1.5 / 2.75) * progress + 0.75;
                    } else if (progress < 2.5 / 2.75) {
                        return 7.5625 * (progress -= 2.25 / 2.75) * progress + 0.9375;
                    } else {
                        return 7.5625 * (progress -= 2.625 / 2.75) * progress + 0.984375;
                    }
                default:
                    return progress;
            }
        };

        const scaleValues = [];
        for (let i = 0; i < times.length; i++) {
            const progress = times[i] / duration;
            const easedProgress = getEasingValue(progress, easing);
            scaleValues.push(
                0, 0, 0,                           // Начальный масштаб
                easedProgress, easedProgress, easedProgress, // Промежуточный
                easedProgress, easedProgress, easedProgress, // Промежуточный  
                1, 1, 1                            // Конечный масштаб
            );
        }

        const scaleTrack = new THREE.VectorKeyframeTrack(
            '.scale',
            times,
            scaleValues
        );

        return new THREE.AnimationClip('entrance', duration, [scaleTrack]);
    }

    // Добавление анимации для сущности
    addEntityAnimation(entityId, mesh, entityType) {
        const animationConfig = this.getAnimationConfig(entityType);
        
        switch (animationConfig.type) {
            case 'rotation':
                return this.addRotationAnimation(mesh, animationConfig);
            case 'pulse':
                return this.addPulseAnimation(mesh, animationConfig);
            case 'orbit':
                return this.addOrbitAnimation(mesh, animationConfig);
            default:
                return this.addRotationAnimation(mesh, animationConfig);
        }
    }

    // Конфигурация анимаций по типам сущностей
    getAnimationConfig(entityType) {
        const configs = {
            'star': { 
                type: 'pulse', 
                amplitude: 0.15, 
                speed: 1.5,
                name: 'star_pulse'
            },
            'planet': { 
                type: 'rotation', 
                axis: 'y',
                speed: 0.5,
                name: 'planet_rotation'
            },
            'moon': { 
                type: 'rotation', 
                axis: 'y',
                speed: 1.0,
                name: 'moon_rotation'
            },
            'asteroid': { 
                type: 'rotation', 
                axis: 'xyz',
                speed: 0.7,
                name: 'asteroid_rotation'
            },
            'default': { 
                type: 'rotation', 
                axis: 'y',
                speed: 0.3,
                name: 'default_rotation'
            }
        };

        return configs[entityType] || configs.default;
    }

    // Анимация вращения
    addRotationAnimation(mesh, config) {
        const clipName = `rotation_${config.axis}_${config.speed}`;
        
        let clip = this.clipCache.get(clipName);
        if (!clip) {
            clip = this.createRotationClip(config.axis, config.speed);
            this.clipCache.set(clipName, clip);
        }

        const action = this.mixer.clipAction(clip, mesh);
        action.setLoop(THREE.LoopRepeat);
        action.play();

        const animationId = `${mesh.uuid}_rotation`;
        this.animations.set(animationId, {
            action: action,
            mesh: mesh,
            type: 'rotation',
            config: config
        });

        return animationId;
    }

    // Создание клипа вращения
    createRotationClip(axis = 'y', duration = 2.0) {
        const tracks = [];
        const times = [0, duration];
        
        if (axis.includes('x')) {
            const track = new THREE.NumberKeyframeTrack(
                '.rotation[x]',
                times,
                [0, Math.PI * 2]
            );
            tracks.push(track);
        }
        
        if (axis.includes('y')) {
            const track = new THREE.NumberKeyframeTrack(
                '.rotation[y]',
                times,
                [0, Math.PI * 2]
            );
            tracks.push(track);
        }
        
        if (axis.includes('z')) {
            const track = new THREE.NumberKeyframeTrack(
                '.rotation[z]',
                times,
                [0, Math.PI * 2]
            );
            tracks.push(track);
        }

        return new THREE.AnimationClip(`rotation_${axis}`, duration, tracks);
    }

    // Анимация пульсации
    addPulseAnimation(mesh, config) {
        const clipName = `pulse_${config.amplitude}_${config.speed}`;
        
        let clip = this.clipCache.get(clipName);
        if (!clip) {
            clip = this.createPulseClip(config.amplitude, config.speed);
            this.clipCache.set(clipName, clip);
        }

        const action = this.mixer.clipAction(clip, mesh);
        action.setLoop(THREE.LoopRepeat);
        action.play();

        const animationId = `${mesh.uuid}_pulse`;
        this.animations.set(animationId, {
            action: action,
            mesh: mesh,
            type: 'pulse',
            config: config
        });

        return animationId;
    }

    // Создание клипа пульсации
    createPulseClip(amplitude = 0.1, duration = 2.0) {
        const times = [0, duration * 0.25, duration * 0.5, duration * 0.75, duration];
        const scales = [
            1, 1, 1,
            1 + amplitude, 1 + amplitude, 1 + amplitude,
            1, 1, 1,
            1 - amplitude * 0.5, 1 - amplitude * 0.5, 1 - amplitude * 0.5,
            1, 1, 1
        ];

        const scaleTrack = new THREE.VectorKeyframeTrack(
            '.scale',
            times,
            scales
        );

        return new THREE.AnimationClip('pulse', duration, [scaleTrack]);
    }

    // Анимация орбиты (более сложная)
    addOrbitAnimation(mesh, config) {
        // Для орбитальной анимации используем кастомное обновление
        // так как она требует изменения позиции, а не только трансформаций
        const animationId = `${mesh.uuid}_orbit`;
        
        this.animations.set(animationId, {
            mesh: mesh,
            type: 'orbit',
            config: config,
            time: 0,
            update: (delta, animation) => {
                animation.time += delta * animation.config.speed;
                const radius = animation.config.radius || 100;
                const center = animation.config.center || { x: 0, y: 0, z: 0 };
                
                mesh.position.x = center.x + Math.cos(animation.time) * radius;
                mesh.position.y = center.y + Math.sin(animation.time) * radius;
                mesh.position.z = center.z || 0;
            }
        });

        return animationId;
    }

    // Пульсация для эффектов (например, свечение звезд)
    addPulseAnimation(entityId, targetMesh, config) {
        const animationId = `${entityId}_glow_pulse`;
        
        this.animations.set(animationId, {
            mesh: targetMesh,
            type: 'glow_pulse',
            config: {
                minScale: config.minScale || 1.0,
                maxScale: config.maxScale || 1.3,
                speed: config.speed || 2.0
            },
            time: 0,
            update: (delta, animation) => {
                animation.time += delta * animation.config.speed;
                const scale = animation.config.minScale + 
                    (animation.config.maxScale - animation.config.minScale) * 
                    (Math.sin(animation.time) + 1) / 2;
                
                targetMesh.scale.setScalar(scale);
            }
        });

        return animationId;
    }

    // Запуск цикла анимации
    startAnimationLoop() {
        const animate = () => {
            if (!this.isRunning) return;
            
            const delta = this.clock.getDelta();
            this.updateAnimations(delta);
            
            this.animationLoopId = requestAnimationFrame(animate);
        };
        
        animate();
    }

    // Обновление всех анимаций
    updateAnimations(delta) {
        const startTime = performance.now();
        
        // Обновляем анимации через Three.js AnimationMixer
        this.mixer.update(delta);
        
        // Обновляем кастомные анимации
        this.updateCustomAnimations(delta);
        
        // Обновляем статистику
        this.stats.frameTime = performance.now() - startTime;
        this.stats.activeAnimations = this.animations.size;
    }

    // Обновление кастомных анимаций (не через AnimationMixer)
    updateCustomAnimations(delta) {
        this.animations.forEach((animation, id) => {
            if (animation.update && animation.type !== 'rotation' && animation.type !== 'pulse') {
                animation.update(delta, animation);
            }
        });
    }

    // Управление анимациями
    stopAnimation(animationId) {
        const animation = this.animations.get(animationId);
        if (animation) {
            if (animation.action) {
                animation.action.stop();
            }
            this.animations.delete(animationId);
        }
    }

    stopAllAnimations() {
        this.animations.forEach((animation, id) => {
            if (animation.action) {
                animation.action.stop();
            }
        });
        this.animations.clear();
        this.mixer.stopAllAction();
    }

    pauseAnimation(animationId) {
        const animation = this.animations.get(animationId);
        if (animation && animation.action) {
            animation.action.paused = true;
        }
    }

    resumeAnimation(animationId) {
        const animation = this.animations.get(animationId);
        if (animation && animation.action) {
            animation.action.paused = false;
        }
    }

    setAnimationSpeed(animationId, speed) {
        const animation = this.animations.get(animationId);
        if (animation && animation.action) {
            animation.action.timeScale = speed;
        }
    }

    // Получение информации об анимации
    getAnimationInfo(animationId) {
        const animation = this.animations.get(animationId);
        if (!animation) return null;
        
        return {
            id: animationId,
            type: animation.type,
            isPlaying: animation.action ? !animation.action.paused : true,
            time: animation.action ? animation.action.time : animation.time,
            config: animation.config
        };
    }

    // Получение статистики системы
    getStats() {
        return {
            ...this.stats,
            mixer: {
                time: this.mixer.time,
                timeScale: this.mixer.timeScale
            }
        };
    }

    // Очистка ресурсов
    dispose() {
        console.log('🧹 Очистка AnimationSystem...');
        
        this.isRunning = false;
        
        if (this.animationLoopId) {
            cancelAnimationFrame(this.animationLoopId);
            this.animationLoopId = null;
        }
        
        this.stopAllAnimations();
        this.mixer.stopAllAction();
        this.mixer.uncacheRoot(this.mixer.getRoot());
        
        // Очищаем кэш клипов
        this.clipCache.clear();
        this.animations.clear();
        
        console.log('✅ AnimationSystem уничтожен');
    }
}

export default AnimationSystem;