import { StoneTower } from './towers/StoneTower.js';
import { BasicTower } from './towers/BasicTower.js';
import { StrongTower } from './towers/StrongTower.js';
import { FastTower } from './towers/FastTower.js';
import { BasicEnemy } from './enemies/BasicEnemy.js';
import { Projectile } from './Projectile.js';

/**
 * Factory Pattern - Creación de entidades del juego
 * Centraliza la creación y configuración de objetos
 */
export class EntityFactory {
    constructor() {
        // Registros de tipos disponibles
        this.towerTypes = new Map([
            ['stone', StoneTower],
            ['basic', BasicTower],
            ['strong', StrongTower],
            ['fast', FastTower]
        ]);

        this.enemyTypes = new Map([
            ['basic', BasicEnemy]
        ]);

        // Configuraciones por defecto
        this.towerConfigs = new Map([
            ['stone', { cost: 10, damage: 0, range: 0, fireRate: 0, color: '#6b7280', name: 'Piedra' }],
            ['basic', { cost: 50, damage: 20, range: 80, fireRate: 1000, color: '#43e97b', name: 'Básica' }],
            ['strong', { cost: 100, damage: 50, range: 70, fireRate: 1500, color: '#fa709a', name: 'Fuerte' }],
            ['fast', { cost: 75, damage: 15, range: 90, fireRate: 500, color: '#a8edea', name: 'Rápida' }]
        ]);

        this.enemyConfigs = new Map([
            ['basic', { health: 50, speed: 1, reward: 10, color: '#ef4444' }]
        ]);
    }

    /**
     * Crear torre según tipo - Factory Method
     */
    createTower(type, x, y, customConfig = {}) {
        if (!this.towerTypes.has(type)) {
            throw new Error(`Unknown tower type: ${type}`);
        }

        const TowerClass = this.towerTypes.get(type);
        const defaultConfig = this.towerConfigs.get(type);
        const config = { ...defaultConfig, ...customConfig };

        // Polimorfismo - cada torre se construye diferente
        if (type === 'stone') {
            return new TowerClass(x, y, config.constructionPhase);
        } else {
            return new TowerClass(x, y, config);
        }
    }

    /**
     * Crear enemigo según tipo - Factory Method
     */
    createEnemy(type, customConfig = {}) {
        if (!this.enemyTypes.has(type)) {
            throw new Error(`Unknown enemy type: ${type}`);
        }

        const EnemyClass = this.enemyTypes.get(type);
        const defaultConfig = this.enemyConfigs.get(type);
        const config = { ...defaultConfig, ...customConfig };

        return new EnemyClass(config);
    }

    /**
     * Crear proyectil
     */
    createProjectile(x, y, target, damage) {
        return new Projectile(x, y, target, damage);
    }

    /**
     * Registrar nuevo tipo de torre - Extensibilidad
     */
    registerTowerType(name, towerClass, config) {
        this.towerTypes.set(name, towerClass);
        this.towerConfigs.set(name, config);
    }

    /**
     * Registrar nuevo tipo de enemigo - Extensibilidad
     */
    registerEnemyType(name, enemyClass, config) {
        this.enemyTypes.set(name, enemyClass);
        this.enemyConfigs.set(name, config);
    }

    /**
     * Obtener tipos disponibles
     */
    getAvailableTowerTypes() {
        return Array.from(this.towerTypes.keys());
    }

    getAvailableEnemyTypes() {
        return Array.from(this.enemyTypes.keys());
    }

    /**
     * Obtener configuración de un tipo
     */
    getTowerConfig(type) {
        return this.towerConfigs.get(type);
    }

    getEnemyConfig(type) {
        return this.enemyConfigs.get(type);
    }

    /**
     * Crear torres múltiples - Batch creation
     */
    createTowers(towerData) {
        return towerData.map(data => 
            this.createTower(data.type, data.x, data.y, data.config)
        );
    }

    /**
     * Crear oleada de enemigos - Wave creation
     */
    createWave(waveConfig) {
        const enemies = [];
        
        for (let i = 0; i < waveConfig.count; i++) {
            const enemy = this.createEnemy(waveConfig.type, {
                ...waveConfig.config,
                spawnDelay: i * waveConfig.spawnInterval
            });
            enemies.push(enemy);
        }
        
        return enemies;
    }

    /**
     * Validar configuración antes de crear entidad
     */
    validateTowerConfig(type, config) {
        const requiredFields = ['cost', 'damage', 'range', 'fireRate'];
        const defaultConfig = this.towerConfigs.get(type);
        
        if (!defaultConfig) {
            throw new Error(`No default config found for tower type: ${type}`);
        }

        const finalConfig = { ...defaultConfig, ...config };
        
        for (const field of requiredFields) {
            if (finalConfig[field] === undefined || finalConfig[field] < 0) {
                throw new Error(`Invalid ${field} for tower type ${type}`);
            }
        }

        return finalConfig;
    }

    /**
     * Crear torre con validación - Safe creation
     */
    createTowerSafely(type, x, y, customConfig = {}) {
        try {
            const validatedConfig = this.validateTowerConfig(type, customConfig);
            return this.createTower(type, x, y, validatedConfig);
        } catch (error) {
            console.error('Failed to create tower:', error);
            return null;
        }
    }

    /**
     * Clonar entidad existente - Prototype Pattern
     */
    cloneTower(originalTower, newX, newY) {
        const type = originalTower.constructor.name.toLowerCase().replace('tower', '');
        const config = {
            damage: originalTower.damage,
            range: originalTower.range,
            fireRate: originalTower.fireRate,
            cost: originalTower.cost,
            color: originalTower.color,
            level: originalTower.level
        };
        
        return this.createTower(type, newX, newY, config);
    }
} 