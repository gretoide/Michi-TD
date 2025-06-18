// Configuración del juego
export const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    GRID_SIZE: 40,
    FPS: 60
};

// Estados del juego
export const GAME_STATES = {
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    WAITING: 'waiting'
};

export class Tower {
    constructor(x, y, type, data) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.damage = data.damage;
        this.range = data.range;
        this.fireRate = data.fireRate;
        this.color = data.color;
        this.lastFireTime = 0;
    }
    
    update(enemies, projectiles) {
        const now = Date.now();
        if (now - this.lastFireTime < this.fireRate) return;
        
        let target = null;
        let closestDistance = this.range;
        
        enemies.forEach(enemy => {
            const distance = Math.sqrt(
                Math.pow(enemy.x - this.x, 2) + Math.pow(enemy.y - this.y, 2)
            );
            
            if (distance < closestDistance) {
                target = enemy;
                closestDistance = distance;
            }
        });
        
        if (target) {
            projectiles.push(new Projectile(this.x, this.y, target, this.damage));
            this.lastFireTime = now;
        }
    }
    
    draw(ctx) {
        // Dibujar torre
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Dibujar borde
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

export class Enemy {
    constructor(path, health, speed, reward) {
        this.path = path;
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        this.maxHealth = health;
        this.health = health;
        this.speed = speed;
        this.reward = reward;
        this.damage = 10;
        this.reachedEnd = false;
        this.hasMovedOnce = false;
        
        console.log('Enemigo creado en:', this.x, this.y, 'Velocidad:', this.speed, 'Path:', this.path);
    }
    
    update() {
        if (!this.hasMovedOnce) {
            console.log('Primera actualización del enemigo en:', this.x, this.y);
            this.hasMovedOnce = true;
        }
        
        if (this.pathIndex >= this.path.length - 1) {
            this.reachedEnd = true;
            return;
        }
        
        const target = this.path[this.pathIndex + 1];
        if (!target) {
            console.log('No hay target disponible, pathIndex:', this.pathIndex);
            this.reachedEnd = true;
            return;
        }
        
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (Math.random() < 0.05) {
            console.log('Enemigo en:', this.x.toFixed(1), this.y.toFixed(1), 
                       'Target:', target.x, target.y, 
                       'Distance:', distance.toFixed(1), 
                       'PathIndex:', this.pathIndex);
        }
        
        if (distance < 5) {
            this.pathIndex++;
            console.log('Avanzando al siguiente punto. PathIndex:', this.pathIndex);
            if (this.pathIndex < this.path.length - 1) {
                this.x = target.x;
                this.y = target.y;
            } else {
                this.reachedEnd = true;
                console.log('Enemigo llegó al final');
            }
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }
    
    takeDamage(damage) {
        this.health -= damage;
    }
    
    draw(ctx) {
        // Dibujar enemigo
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Dibujar barra de vida
        const barWidth = 20;
        const barHeight = 4;
        const healthPercent = this.health / this.maxHealth;
        
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(this.x - barWidth/2, this.y - 20, barWidth, barHeight);
        
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(this.x - barWidth/2, this.y - 20, barWidth * healthPercent, barHeight);
    }
}

export class Projectile {
    constructor(x, y, target, damage) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = 5;
        this.hasHitTarget = false;
    }
    
    update() {
        if (!this.target || this.target.health <= 0) {
            this.hasHitTarget = true;
            return;
        }
        
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.speed) {
            this.target.takeDamage(this.damage);
            this.hasHitTarget = true;
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }
    
    isOutOfBounds() {
        return this.x < 0 || this.x > GAME_CONFIG.CANVAS_WIDTH || 
               this.y < 0 || this.y > GAME_CONFIG.CANVAS_HEIGHT;
    }
    
    draw(ctx) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
} 