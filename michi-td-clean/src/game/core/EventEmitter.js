/**
 * EventEmitter - Observer Pattern
 * Permite desacoplar componentes mediante eventos
 */
export class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    /**
     * Suscribirse a un evento
     */
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        this.events.get(eventName).push(callback);
        
        // Retornar función para desuscribirse
        return () => this.off(eventName, callback);
    }

    /**
     * Suscribirse a un evento una sola vez
     */
    once(eventName, callback) {
        const onceCallback = (...args) => {
            callback(...args);
            this.off(eventName, onceCallback);
        };
        return this.on(eventName, onceCallback);
    }

    /**
     * Desuscribirse de un evento
     */
    off(eventName, callback) {
        if (!this.events.has(eventName)) return;
        
        const callbacks = this.events.get(eventName);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
        
        // Limpiar array vacío
        if (callbacks.length === 0) {
            this.events.delete(eventName);
        }
    }

    /**
     * Emitir un evento
     */
    emit(eventName, ...args) {
        if (!this.events.has(eventName)) return;
        
        const callbacks = this.events.get(eventName).slice(); // Copia para evitar problemas
        callbacks.forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`Error in event callback for ${eventName}:`, error);
            }
        });
    }

    /**
     * Limpiar todos los eventos
     */
    clear() {
        this.events.clear();
    }

    /**
     * Obtener lista de eventos registrados
     */
    getEventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Verificar si hay listeners para un evento
     */
    hasListeners(eventName) {
        return this.events.has(eventName) && this.events.get(eventName).length > 0;
    }
} 