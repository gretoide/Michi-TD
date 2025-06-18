// Configuración del juego
const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    GRID_SIZE: 40,
    FPS: 60
};

// Estados del juego
const GAME_STATES = {
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    WAITING: 'waiting'
};

// Inicializar el juego cuando la página se carga
document.addEventListener('DOMContentLoaded', () => {
    new Game();
});

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = GAME_STATES.WAITING;
        
        // Verificar que el canvas se cargó correctamente
        if (!this.canvas || !this.ctx) {
            console.error('No se pudo cargar el canvas');
            return;
        }
        
        console.log('Juego inicializado correctamente');
        
        // Estado del juego
        this.health = 100;
        this.gold = 500;
        this.wave = 1;
        this.selectedTowerType = null;
        
        // Arrays de entidades
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        
        // Control de oleadas
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = 0;
        
        // Path que seguirán los enemigos
        this.path = [
            {x: 0, y: 300},
            {x: 200, y: 300},
            {x: 200, y: 150},
            {x: 400, y: 150},
            {x: 400, y: 450},
            {x: 600, y: 450},
            {x: 600, y: 300},
            {x: 800, y: 300}
        ];
        
        this.setupEventListeners();
        this.initGameLoop();
    }
    
    setupEventListeners() {
        // Botones de torres
        document.querySelectorAll('.tower-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectTower(btn.dataset.tower));
        });
        
        // Canvas click para colocar torres
        this.canvas.addEventListener('click', (e) => {
            this.handleCanvasClick(e);
        });
        
        // Controles del juego
        document.getElementById('startWave').addEventListener('click', () => {
            this.startWave();
        });
        
        document.getElementById('pauseGame').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('resetGame').addEventListener('click', () => {
            this.resetGame();
        });
    }
    
    selectTower(towerType) {
        console.log('Torre seleccionada:', towerType);
        
        // Deseleccionar todos los botones
        document.querySelectorAll('.tower-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Seleccionar el botón actual
        if (this.selectedTowerType === towerType) {
            this.selectedTowerType = null;
            console.log('Torre deseleccionada');
        } else {
            this.selectedTowerType = towerType;
            document.querySelector(`[data-tower="${towerType}"]`).classList.add('selected');
            console.log('Torre activa:', towerType);
        }
    }
    
    handleCanvasClick(e) {
        if (!this.selectedTowerType) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Alinear a la cuadrícula
        const gridX = Math.floor(x / GAME_CONFIG.GRID_SIZE) * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2;
        const gridY = Math.floor(y / GAME_CONFIG.GRID_SIZE) * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2;
        
        if (this.canPlaceTower(gridX, gridY)) {
            this.placeTower(gridX, gridY, this.selectedTowerType);
        }
    }
    
    canPlaceTower(x, y) {
        // Verificar si no hay otra torre en la posición
        for (let tower of this.towers) {
            if (Math.abs(tower.x - x) < GAME_CONFIG.GRID_SIZE && 
                Math.abs(tower.y - y) < GAME_CONFIG.GRID_SIZE) {
                return false;
            }
        }
        
        // Verificar si no está en el camino
        if (this.isOnPath(x, y)) {
            return false;
        }
        
        return true;
    }
    
    isOnPath(x, y) {
        for (let i = 0; i < this.path.length - 1; i++) {
            const p1 = this.path[i];
            const p2 = this.path[i + 1];
            
            if (this.isPointOnLine(x, y, p1, p2, 30)) {
                return true;
            }
        }
        return false;
    }
    
    isPointOnLine(px, py, p1, p2, tolerance) {
        const A = px - p1.x;
        const B = py - p1.y;
        const C = p2.x - p1.x;
        const D = p2.y - p1.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B) <= tolerance;
        
        const param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
            xx = p1.x;
            yy = p1.y;
        } else if (param > 1) {
            xx = p2.x;
            yy = p2.y;
        } else {
            xx = p1.x + param * C;
            yy = p1.y + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        
        return Math.sqrt(dx * dx + dy * dy) <= tolerance;
    }
    
    placeTower(x, y, type) {
        console.log('Intentando colocar torre', type, 'en', x, y);
        const towerData = this.getTowerData(type);
        
        if (this.gold >= towerData.cost) {
            this.towers.push(new Tower(x, y, type, towerData));
            this.gold -= towerData.cost;
            this.updateUI();
            console.log('Torre colocada. Torres totales:', this.towers.length);
        } else {
            console.log('No hay suficiente oro. Costo:', towerData.cost, 'Oro disponible:', this.gold);
        }
    }
    
    getTowerData(type) {
        const towerTypes = {
            basic: { cost: 50, damage: 20, range: 80, fireRate: 1000, color: '#43e97b' },
            strong: { cost: 100, damage: 50, range: 70, fireRate: 1500, color: '#fa709a' },
            fast: { cost: 75, damage: 15, range: 90, fireRate: 500, color: '#a8edea' }
        };
        return towerTypes[type];
    }
    
    startWave() {
        console.log('Iniciando oleada', this.wave, 'Estado actual:', this.state);
        if (this.state !== GAME_STATES.WAITING) return;
        
        this.state = GAME_STATES.PLAYING;
        console.log('Estado cambiado a:', this.state, 'GAME_STATES.PLAYING:', GAME_STATES.PLAYING);
        this.spawnEnemies();
    }
    
    spawnEnemies() {
        const enemyCount = 5 + this.wave * 2;
        const enemyHealth = 50 + this.wave * 10;
        const enemySpeed = 1 + this.wave * 0.1;
        
        console.log(`Spawning ${enemyCount} enemies with health ${enemyHealth} and speed ${enemySpeed}`);
        console.log('Path to follow:', this.path);
        
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = enemyCount;
        
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => {
                const enemy = new Enemy(this.path, enemyHealth, enemySpeed, 10 + this.wave * 2);
                this.enemies.push(enemy);
                this.enemiesSpawned++;
                console.log(`Enemy ${i + 1} spawned. Total enemies: ${this.enemies.length}`);
            }, i * 1000);
        }
    }
    
    togglePause() {
        if (this.state === GAME_STATES.PLAYING) {
            this.state = GAME_STATES.PAUSED;
        } else if (this.state === GAME_STATES.PAUSED) {
            this.state = GAME_STATES.PLAYING;
        }
    }
    
    resetGame() {
        this.health = 100;
        this.gold = 500;
        this.wave = 1;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.state = GAME_STATES.WAITING;
        this.selectedTowerType = null;
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = 0;
        
        document.querySelectorAll('.tower-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('health').textContent = this.health;
        document.getElementById('gold').textContent = this.gold;
        document.getElementById('wave').textContent = this.wave;
    }
    
    update() {
        // Debug: verificar si update se ejecuta
        if (this.enemies.length > 0 && Math.random() < 0.02) {
            console.log('UPDATE ejecutándose. Estado:', this.state, 'Enemigos:', this.enemies.length);
        }
        
        if (this.state !== GAME_STATES.PLAYING) {
            if (this.enemies.length > 0 && Math.random() < 0.02) {
                console.log('UPDATE se detiene porque estado no es PLAYING. Estado actual:', this.state);
            }
            return;
        }
        
        // Debug: mostrar estado del juego ocasionalmente
        if (Math.random() < 0.01) {
            console.log('Game update - Estado:', this.state, 'Enemigos:', this.enemies.length);
        }
        
        // Actualizar enemigos
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update();
            
            if (enemy.reachedEnd) {
                this.health -= enemy.damage;
                this.enemies.splice(i, 1);
                
                if (this.health <= 0) {
                    this.state = GAME_STATES.GAME_OVER;
                }
            } else if (enemy.health <= 0) {
                this.gold += enemy.reward;
                this.enemies.splice(i, 1);
            }
        }
        
        // Actualizar torres
        this.towers.forEach(tower => {
            tower.update(this.enemies, this.projectiles);
        });
        
        // Actualizar proyectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update();
            
            if (projectile.hasHitTarget || projectile.isOutOfBounds()) {
                this.projectiles.splice(i, 1);
            }
        }
        
        // Verificar si la oleada terminó
        const allEnemiesSpawned = this.enemiesSpawned >= this.enemiesToSpawn;
        if (this.enemies.length === 0 && this.state === GAME_STATES.PLAYING && allEnemiesSpawned) {
            console.log('Oleada completada. Pasando a la siguiente.');
            this.wave++;
            this.state = GAME_STATES.WAITING;
            this.gold += 50; // Bonus por completar oleada
        }
        
        this.updateUI();
    }
    
    draw() {
        // Limpiar canvas
        this.ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        // Dibujar cuadrícula
        this.drawGrid();
        
        // Dibujar camino
        this.drawPath();
        
        // Dibujar torres
        this.towers.forEach(tower => tower.draw(this.ctx));
        
        // Dibujar enemigos
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        
        // Dibujar proyectiles
        this.projectiles.forEach(projectile => projectile.draw(this.ctx));
        
        // Dibujar interfaz del juego
        this.drawGameUI();
        
        // Debug info
        if (this.towers.length > 0 || this.enemies.length > 0) {
            this.ctx.fillStyle = 'black';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`Torres: ${this.towers.length} | Enemigos: ${this.enemies.length} | Estado: ${this.state}`, 10, 20);
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= GAME_CONFIG.CANVAS_WIDTH; x += GAME_CONFIG.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, GAME_CONFIG.CANVAS_HEIGHT);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= GAME_CONFIG.CANVAS_HEIGHT; y += GAME_CONFIG.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, y);
            this.ctx.stroke();
        }
    }
    
    drawPath() {
        this.ctx.strokeStyle = '#8b5cf6';
        this.ctx.lineWidth = 20;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        
        for (let i = 1; i < this.path.length; i++) {
            this.ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        
        this.ctx.stroke();
    }
    
    drawGameUI() {
        if (this.state === GAME_STATES.GAME_OVER) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2);
        } else if (this.state === GAME_STATES.PAUSED) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSADO', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2);
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    // Debug: verificar que gameLoop se inicializa
    initGameLoop() {
        console.log('Game loop iniciado');
        this.gameLoop();
    }
} 