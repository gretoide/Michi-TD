import { Tower } from '../base/Tower.js';

/**
 * Torre de Piedra - Herencia y Polimorfismo
 * Especialización: No ataca, solo bloquea el paso
 */
export class StoneTower extends Tower {
    constructor(x, y, constructionPhase = 1) {
        const config = {
            damage: 0,
            range: 0,
            fireRate: 0,
            cost: 10,
            color: '#6b7280',
            name: 'Piedra',
            constructionPhase,
            canBeUpgraded: true, // Puede convertirse en torre de ataque
            attackStrategy: null // No ataca
        };
        
        super(x, y, config);
        this.blockingPower = 100; // Poder de bloqueo
    }

    /**
     * Override: Las piedras no atacan
     */
    doUpdate(deltaTime, context) {
        // Las piedras son estáticas, solo bloquean
        // No llamamos a super.doUpdate() porque no queremos atacar
        this.updateTowerSpecific(deltaTime, context);
    }

    /**
     * Override: Lógica específica de piedra
     */
    updateTowerSpecific(deltaTime, context) {
        // Podríamos agregar lógica como degradación con el tiempo
        // o efectos especiales cuando los enemigos pasan cerca
    }

    /**
     * Override: Las piedras no pueden atacar
     */
    canAttack() {
        return false;
    }

    /**
     * Override: Las piedras no disparan
     */
    fireAt(target, projectiles) {
        // No hace nada - las piedras no atacan
    }

    /**
     * Override: Dibujo específico de piedra
     */
    drawTower(ctx, x, y) {
        // Dibujar como cuadrado en lugar de círculo
        ctx.fillStyle = this.color;
        ctx.fillRect(x - 15, y - 15, 30, 30);
        
        // Borde más grueso para la piedra
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 15, y - 15, 30, 30);
        
        // Añadir textura de piedra (líneas)
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 5);
        ctx.lineTo(x + 10, y - 5);
        ctx.moveTo(x - 5, y + 5);
        ctx.lineTo(x + 8, y + 5);
        ctx.stroke();
        
        // Dibujar nivel si es mayor a 1
        if (this.level > 1) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.level.toString(), x, y + 3);
        }
    }

    /**
     * Override: Las piedras no muestran rango de ataque
     */
    drawRange(ctx, x, y) {
        // No dibujar rango ya que no atacan
        // Podrías dibujar un área de influencia o bloqueo si lo deseas
    }

    /**
     * Convertir piedra en torre de ataque
     */
    convertToAttackTower(towerType) {
        if (!this.canBeUpgraded) return null;
        
        // Factory Pattern para crear la nueva torre
        const TowerFactory = require('../EntityFactory.js').TowerFactory;
        const newTower = TowerFactory.createTower(towerType, this.x, this.y, {
            constructionPhase: this.constructionPhase
        });
        
        // Transferir algunas propiedades
        newTower.level = this.level;
        
        return newTower;
    }

    /**
     * Override: Método de mejora específico
     */
    upgrade() {
        // Las piedras pueden mejorar su resistencia
        this.level++;
        this.blockingPower *= 1.2;
        this.onUpgrade();
        return true;
    }

    /**
     * Override: Efectos de mejora de piedra
     */
    onUpgrade() {
        // Efectos visuales o sonoros específicos de piedra
        console.log(`Piedra mejorada a nivel ${this.level}`);
    }

    /**
     * Verificar si bloquea el paso
     */
    blocksPath() {
        return this.active && this.blockingPower > 0;
    }

    /**
     * Override: Estadísticas específicas de piedra
     */
    getStats() {
        return {
            ...super.getStats(),
            blockingPower: this.blockingPower,
            canConvert: this.canBeUpgraded,
            type: 'Stone'
        };
    }
} 