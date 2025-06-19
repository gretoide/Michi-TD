/**
 * Base Entity class - Clase base para todas las entidades del juego
 * Aplica principios OOP: Encapsulation, Inheritance base
 */
export class Entity {
    constructor(x, y, id = null) {
        this.x = x;
        this.y = y;
        this.id = id || this.generateId();
        this.active = true;
        this.created = Date.now();
    }

    /**
     * Genera un ID único para la entidad
     */
    generateId() {
        return `${this.constructor.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Método abstracto - debe ser implementado por las subclases
     * Template Method Pattern
     */
    update(deltaTime, context) {
        if (!this.active) return;
        this.doUpdate(deltaTime, context);
    }

    /**
     * Método abstracto para actualización específica
     */
    doUpdate(deltaTime, context) {
        throw new Error('doUpdate must be implemented by subclass');
    }

    /**
     * Método abstracto - debe ser implementado por las subclases
     */
    draw(ctx, camera) {
        if (!this.active) return;
        this.doDraw(ctx, camera);
    }

    /**
     * Método abstracto para renderizado específico
     */
    doDraw(ctx, camera) {
        throw new Error('doDraw must be implemented by subclass');
    }

    /**
     * Calcular distancia a otra entidad
     */
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Verificar si está dentro de un rango de otra entidad
     */
    isInRange(other, range) {
        return this.distanceTo(other) <= range;
    }

    /**
     * Destruir la entidad
     */
    destroy() {
        this.active = false;
        this.onDestroy();
    }

    /**
     * Hook para cleanup personalizado
     */
    onDestroy() {
        // Override en subclases si es necesario
    }

    /**
     * Verificar si la entidad está activa
     */
    isActive() {
        return this.active;
    }

    /**
     * Obtener información básica de la entidad
     */
    getInfo() {
        return {
            id: this.id,
            type: this.constructor.name,
            x: this.x,
            y: this.y,
            active: this.active,
            created: this.created
        };
    }
} 