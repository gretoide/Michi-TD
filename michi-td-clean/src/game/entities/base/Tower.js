import { Entity } from './Entity.js';

/**
 * Estrategias de ataque para torres - Strategy Pattern
 */
export class AttackStrategy {
    attack(tower, enemies, projectiles) {
        throw new Error('attack method must be implemented');
    }
}

export class ClosestEnemyStrategy extends AttackStrategy {
    attack(tower, enemies, projectiles) {
        if (!tower.canAttack()) return;

        let target = null;
        let closestDistance = tower.range;

        enemies.forEach(enemy => {
            if (!enemy.isActive()) return;
            
            const distance = tower.distanceTo(enemy);
            if (distance < closestDistance) {
                target = enemy;
                closestDistance = distance;
            }
        });

        if (target) {
            tower.fireAt(target, projectiles);
        }
    }
}

export class StrongestEnemyStrategy extends AttackStrategy {
    attack(tower, enemies, projectiles) {
        if (!tower.canAttack()) return;

        let target = null;
        let maxHealth = 0;

        enemies.forEach(enemy => {
            if (!enemy.isActive()) return;
            
            const distance = tower.distanceTo(enemy);
            if (distance <= tower.range && enemy.health > maxHealth) {
                target = enemy;
                maxHealth = enemy.health;
            }
        });

        if (target) {
            tower.fireAt(target, projectiles);
        }
    }
}

/**
 * Clase base Tower - Herencia de Entity
 * Implementa Strategy Pattern para diferentes tipos de ataque
 */
export class Tower extends Entity {
    constructor(x, y, config = {}) {
        super(x, y);
        
        // Propiedades básicas con valores por defecto
        this.damage = config.damage || 20;
        this.range = config.range || 80;
        this.fireRate = config.fireRate || 1000; // ms
        this.cost = config.cost || 50;
        this.color = config.color || '#43e97b';
        this.name = config.name || 'Basic Tower';
        
        // Estado de la torre
        this.lastFireTime = 0;
        this.constructionPhase = config.constructionPhase || 1;
        this.canBeUpgraded = config.canBeUpgraded || false;
        this.level = 1;
        
        // Strategy Pattern - Estrategia de ataque
        this.attackStrategy = config.attackStrategy || new ClosestEnemyStrategy();
        
        // Template Method Pattern - datos específicos del tipo
        this.initializeTowerType(config);
    }

    /**
     * Template Method - personalización por subtipo
     */
    initializeTowerType(config) {
        // Override en subclases para inicialización específica
    }

    /**
     * Implementación del método abstracto update
     */
    doUpdate(deltaTime, context) {
        const { enemies, projectiles } = context;
        
        // Usar Strategy Pattern para atacar
        this.attackStrategy.attack(this, enemies, projectiles);
        
        // Hook para lógica específica del tipo de torre
        this.updateTowerSpecific(deltaTime, context);
    }

    /**
     * Hook para lógica específica de cada tipo de torre
     */
    updateTowerSpecific(deltaTime, context) {
        // Override en subclases si es necesario
    }

    /**
     * Verificar si la torre puede atacar
     */
    canAttack() {
        const now = Date.now();
        return now - this.lastFireTime >= this.fireRate;
    }

    /**
     * Disparar a un objetivo
     */
    fireAt(target, projectiles) {
        // Crear proyectil (Factory Pattern se aplicará más tarde)
        const projectile = this.createProjectile(target);
        projectiles.push(projectile);
        this.lastFireTime = Date.now();
        
        // Hook para efectos de disparo
        this.onFire(target);
    }

    /**
     * Factory Method para crear proyectiles
     */
    createProjectile(target) {
        // Importación dinámica para evitar dependencias circulares
        const Projectile = require('../Projectile.js').Projectile;
        return new Projectile(this.x, this.y, target, this.damage);
    }

    /**
     * Hook para efectos cuando la torre dispara
     */
    onFire(target) {
        // Override en subclases para efectos especiales
    }

    /**
     * Cambiar estrategia de ataque - Strategy Pattern
     */
    setAttackStrategy(strategy) {
        this.attackStrategy = strategy;
    }

    /**
     * Mejorar la torre
     */
    upgrade() {
        if (!this.canBeUpgraded) return false;
        
        this.level++;
        this.damage *= 1.2;
        this.range *= 1.1;
        this.fireRate *= 0.9; // Más rápido
        
        this.onUpgrade();
        return true;
    }

    /**
     * Hook para efectos de mejora
     */
    onUpgrade() {
        // Override en subclases
    }

    /**
     * Implementación del método abstracto draw
     */
    doDraw(ctx, camera) {
        // Ajustar por cámara
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        // Dibujar torre usando Template Method
        this.drawTower(ctx, screenX, screenY);
        
        // Dibujar rango si está seleccionada
        if (this.isSelected) {
            this.drawRange(ctx, screenX, screenY);
        }
    }

    /**
     * Template Method para dibujar torre específica
     */
    drawTower(ctx, x, y) {
        // Implementación base - override en subclases
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * Dibujar rango de la torre
     */
    drawRange(ctx, x, y) {
        ctx.strokeStyle = `${this.color}40`; // Transparente
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(x, y, this.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    /**
     * Obtener estadísticas de la torre
     */
    getStats() {
        return {
            ...this.getInfo(),
            damage: this.damage,
            range: this.range,
            fireRate: this.fireRate,
            cost: this.cost,
            level: this.level,
            canBeUpgraded: this.canBeUpgraded
        };
    }

    /**
     * Serializar torre para guardado
     */
    serialize() {
        return {
            type: this.constructor.name,
            x: this.x,
            y: this.y,
            level: this.level,
            constructionPhase: this.constructionPhase
        };
    }
} 