// Configuración del juego
export const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    GRID_SIZE: 40,
    FPS: 60
};

// Estados del juego
export const GAME_STATES = {
    CONSTRUCTION: 'construction', // Fase de construcción - colocar piedras
    ATTACK: 'attack',            // Fase de ataque - oleada en curso
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

export class Tower {
    constructor(x, y, type, data, constructionPhase = 1) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.damage = data.damage;
        this.range = data.range;
        this.fireRate = data.fireRate;
        this.color = data.color;
        this.lastFireTime = 0;
        this.constructionPhase = constructionPhase; // En qué fase de construcción fue creada
        this.canBeUpgraded = type === 'stone'; // Solo las piedras pueden ser mejoradas
    }
    
    update(enemies, projectiles) {
        // Las torres de piedra no atacan
        if (this.type === 'stone') {
            return;
        }
        
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
        if (this.type === 'stone') {
            // Dibujar torre de piedra como cuadrado
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
            
            // Borde más grueso para la piedra
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - 15, this.y - 15, 30, 30);
            
            // Añadir textura de piedra (líneas)
            ctx.strokeStyle = '#9ca3af';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x - 10, this.y - 5);
            ctx.lineTo(this.x + 10, this.y - 5);
            ctx.moveTo(this.x - 5, this.y + 5);
            ctx.lineTo(this.x + 8, this.y + 5);
            ctx.stroke();
        } else {
            // Dibujar torre normal (circular)
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
}

export class Enemy {
    constructor(checkpoints, health, speed, reward, towers = []) {
        this.checkpoints = checkpoints;
        this.currentCheckpointIndex = 0;
        this.maxHealth = health;
        this.health = health;
        this.speed = speed;
        this.reward = reward;
        this.reachedEnd = false;
        this.hasMovedOnce = false;
        
        // Spawn delay management
        this.spawnDelay = 0;
        this.hasSpawned = this.spawnDelay === 0; // Only spawn immediately if no delay
        this.spawnTime = Date.now();
        
        // Calcular el path completo al spawn
        this.fullPath = this.calculateFullPath(towers);
        this.pathIndex = 0;
        
        // Posición inicial
        if (this.fullPath && this.fullPath.length > 0) {
            this.x = this.fullPath[0].x;
            this.y = this.fullPath[0].y;
        } else {
            // Fallback a la posición del primer checkpoint
            this.x = checkpoints[0].x;
            this.y = checkpoints[0].y;
        }
        

    }
    
    // Calcular el path completo desde el inicio hasta el final
    calculateFullPath(towers) {
        const fullPath = [];
        
        for (let i = 0; i < this.checkpoints.length - 1; i++) {
            const start = this.checkpoints[i];
            const end = this.checkpoints[i + 1];
            
            // Usar el algoritmo A* para encontrar el camino entre checkpoints consecutivos
            const segmentPath = this.findPathBetweenPoints(start, end, towers);
            
            if (!segmentPath) {
                return null;
            }
            
            // Agregar el segmento al path completo (evitando duplicar puntos)
            if (i === 0) {
                fullPath.push(...segmentPath);
            } else {
                fullPath.push(...segmentPath.slice(1)); // Omitir el primer punto para evitar duplicados
            }
        }
        
        return fullPath;
    }
    
    // Algoritmo A* simplificado para enemigos
    findPathBetweenPoints(start, end, towers) {
        const GRID_SIZE = 40; // Tamaño de celda fijo
        const GRID_COLS = 37;
        const GRID_ROWS = 37;
        
        // Si no hay torres, usar línea recta simple
        if (towers.length === 0) {
            return [
                {x: start.col * GRID_SIZE + GRID_SIZE / 2, y: start.row * GRID_SIZE + GRID_SIZE / 2},
                {x: end.col * GRID_SIZE + GRID_SIZE / 2, y: end.row * GRID_SIZE + GRID_SIZE / 2}
            ];
        }
        
        const isCellWalkable = (row, col) => {
            // Verificar límites del grid
            if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
                return false;
            }
            
            // Verificar si hay una torre en esta posición
            for (const tower of towers) {
                const towerGridCol = Math.floor(tower.x / GRID_SIZE);
                const towerGridRow = Math.floor(tower.y / GRID_SIZE);
                if (towerGridRow === row && towerGridCol === col) {
                    return false;
                }
            }
            
            return true;
        };
        
        const openSet = [{row: start.row, col: start.col, g: 0, h: 0, f: 0, parent: null}];
        const closedSet = new Set();
        
        const heuristic = (row1, col1, row2, col2) => {
            return Math.abs(row1 - row2) + Math.abs(col1 - col2);
        };
        
        const getNeighbors = (row, col) => {
            return [
                {row: row - 1, col: col}, // arriba
                {row: row + 1, col: col}, // abajo
                {row: row, col: col - 1}, // izquierda
                {row: row, col: col + 1}  // derecha
            ].filter(({row, col}) => isCellWalkable(row, col));
        };
        
        while (openSet.length > 0) {
            // Encontrar el nodo con menor f
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            
            const currentKey = `${current.row},${current.col}`;
            if (closedSet.has(currentKey)) continue;
            closedSet.add(currentKey);
            
            // Si llegamos al destino
            if (current.row === end.row && current.col === end.col) {
                const path = [];
                let node = current;
                while (node) {
                    path.unshift({
                        x: node.col * GRID_SIZE + GRID_SIZE / 2,
                        y: node.row * GRID_SIZE + GRID_SIZE / 2
                    });
                    node = node.parent;
                }
                return path;
            }
            
            // Explorar vecinos
            for (const neighbor of getNeighbors(current.row, current.col)) {
                const neighborKey = `${neighbor.row},${neighbor.col}`;
                if (closedSet.has(neighborKey)) continue;
                
                const g = current.g + 1;
                const h = heuristic(neighbor.row, neighbor.col, end.row, end.col);
                const f = g + h;
                
                const existingNode = openSet.find(node => 
                    node.row === neighbor.row && node.col === neighbor.col
                );
                
                if (!existingNode || g < existingNode.g) {
                    const newNode = {
                        row: neighbor.row,
                        col: neighbor.col,
                        g: g,
                        h: h,
                        f: f,
                        parent: current
                    };
                    
                    if (existingNode) {
                        Object.assign(existingNode, newNode);
                    } else {
                        openSet.push(newNode);
                    }
                }
            }
        }
        
        return null; // No se encontró camino
    }
    
    update(speedMultiplier = 1) {
        // Check if enemy should spawn yet
        if (!this.hasSpawned) {
            const currentTime = Date.now();
            if (currentTime - this.spawnTime < this.spawnDelay) {
                return; // Don't update if not spawned yet
            }
            this.hasSpawned = true;
        }
        
        // Verificar si tenemos un path válido
        if (!this.fullPath || this.fullPath.length === 0) {
            this.reachedEnd = true;
            return;
        }
        
        if (this.pathIndex >= this.fullPath.length - 1) {
            this.reachedEnd = true;
            return;
        }
        
        const target = this.fullPath[this.pathIndex + 1];
        if (!target) {
            this.reachedEnd = true;
            return;
        }
        
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {
            this.pathIndex++;
            if (this.pathIndex < this.fullPath.length - 1) {
                this.x = target.x;
                this.y = target.y;
            } else {
                this.reachedEnd = true;
            }
        } else {
            const effectiveSpeed = this.speed * speedMultiplier;
            const moveX = (dx / distance) * effectiveSpeed;
            const moveY = (dy / distance) * effectiveSpeed;
            this.x += moveX;
            this.y += moveY;
        }
    }
    
    takeDamage(damage) {
        this.health -= damage;
    }

    // Calcular daño proporcional basado en la vida restante del enemigo
    calculateDamageToPlayer() {
        const healthPercentage = (this.health / this.maxHealth) * 100;
        
        // Sistema de daño proporcional usando fórmula matemática:
        // Divide porcentaje entre 10, redondea hacia arriba, mínimo 1
        return Math.max(1, Math.ceil(healthPercentage / 10));
    }
    
    draw(ctx) {
        // Don't draw if not spawned yet
        if (!this.hasSpawned) {
            return;
        }
        
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
        // Usar dimensiones del grid fijo: 37x37 celdas de 40px cada una
        const FIXED_WIDTH = 37 * 40; // 1480px (37 columnas)
        const FIXED_HEIGHT = 37 * 40; // 1480px (37 filas)
        return this.x < 0 || this.x > FIXED_WIDTH || 
               this.y < 0 || this.y > FIXED_HEIGHT;
    }
    
    draw(ctx) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 7, 0, Math.PI * 2);
        ctx.fill();
    }
} 