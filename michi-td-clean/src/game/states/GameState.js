/**
 * State Pattern - Interfaz base para estados del juego
 * Reemplaza los if/else del estado del juego con polimorfismo
 */
export class GameState {
    constructor(context) {
        this.context = context;
        this.name = 'BaseState';
    }

    /**
     * Método abstracto - debe ser implementado por estados concretos
     */
    enter() {
        throw new Error('enter method must be implemented');
    }

    /**
     * Método abstracto - debe ser implementado por estados concretos
     */
    exit() {
        throw new Error('exit method must be implemented');
    }

    /**
     * Método abstracto - debe ser implementado por estados concretos
     */
    update(deltaTime) {
        throw new Error('update method must be implemented');
    }

    /**
     * Método abstracto - debe ser implementado por estados concretos
     */
    handleInput(inputEvent) {
        throw new Error('handleInput method must be implemented');
    }

    /**
     * Método para verificar si ciertas acciones están permitidas
     */
    canPlaceStones() {
        return false;
    }

    canUpgradeStones() {
        return false;
    }

    canPause() {
        return false;
    }

    canChangeSpeed() {
        return false;
    }

    /**
     * Template Method para transiciones de estado
     */
    transitionTo(newStateClass, ...args) {
        this.exit();
        const newState = new newStateClass(this.context, ...args);
        this.context.setState(newState);
        newState.enter();
    }
}

/**
 * Estado de Construcción - Concrete State
 * Permite colocar piedras y mejorarlas
 */
export class ConstructionState extends GameState {
    constructor(context, phase = 1) {
        super(context);
        this.name = 'Construction';
        this.phase = phase;
        this.stonesPlaced = 0;
        this.maxStones = 5;
    }

    enter() {
        console.log(`🏗️ Entering Construction Phase ${this.phase}`);
        this.context.gameData.state = 'CONSTRUCTION';
        this.context.gameData.currentConstructionPhase = this.phase;
        this.context.gameData.stonesPlacedThisPhase = 0;
        this.context.gameData.isPlacingStones = false;
        this.context.gameData.selectedStone = null;
        this.context.gameData.showUpgradeMenu = false;
        
        // Event: Notify UI about state change
        this.context.eventEmitter.emit('stateChanged', {
            state: this.name,
            phase: this.phase,
            canPlaceStones: true
        });
    }

    exit() {
        console.log(`🏗️ Exiting Construction Phase ${this.phase}`);
    }

    update(deltaTime) {
        // En construcción no hay enemigos moviéndose
        // Solo actualizamos torres estáticas si es necesario
        const towers = this.context.gameData.towers;
        towers.forEach(tower => {
            if (tower.isActive()) {
                tower.update(deltaTime, {
                    enemies: [], // No hay enemigos en construcción
                    projectiles: this.context.gameData.projectiles
                });
            }
        });
    }

    handleInput(inputEvent) {
        switch (inputEvent.type) {
            case 'placeStone':
                return this.handlePlaceStone(inputEvent);
            case 'selectStone':
                return this.handleSelectStone(inputEvent);
            case 'upgradeStone':
                return this.handleUpgradeStone(inputEvent);
            case 'reset':
                return this.handleReset();
            default:
                return false;
        }
    }

    handlePlaceStone(event) {
        if (!this.canPlaceStones()) return false;
        
        const { x, y } = event;
        const gameData = this.context.gameData;
        
        // Verificar límite de piedras
        if (this.stonesPlaced >= this.maxStones) {
            this.context.eventEmitter.emit('error', 'Máximo 5 piedras por fase');
            return false;
        }

        // Verificar oro suficiente
        if (gameData.gold < 10) {
            this.context.eventEmitter.emit('error', 'Oro insuficiente');
            return false;
        }

        // Crear piedra usando Factory
        const stone = this.context.entityFactory.createTower('stone', x, y, {
            constructionPhase: this.phase
        });

        // Validar posición (grid manager se encargará)
        if (!this.context.gridManager.canPlaceTower(x, y, gameData.towers)) {
            this.context.eventEmitter.emit('error', 'Posición inválida');
            return false;
        }

        // Colocar piedra
        gameData.towers.push(stone);
        gameData.gold -= 10;
        this.stonesPlaced++;
        gameData.stonesPlacedThisPhase = this.stonesPlaced;

        this.context.eventEmitter.emit('stonePlaced', {
            stone,
            stonesRemaining: this.maxStones - this.stonesPlaced
        });

        return true;
    }

    handleSelectStone(event) {
        if (!this.canUpgradeStones()) return false;

        const { stone, position } = event;
        const gameData = this.context.gameData;

        // Solo permitir seleccionar piedras de la fase actual
        if (stone.constructionPhase !== this.phase) return false;

        gameData.selectedStone = stone;
        gameData.showUpgradeMenu = true;
        gameData.upgradeMenuPosition = position;

        this.context.eventEmitter.emit('stoneSelected', { stone, position });
        return true;
    }

    handleUpgradeStone(event) {
        const { towerType } = event;
        const gameData = this.context.gameData;
        
        if (!gameData.selectedStone) return false;

        // Crear nueva torre usando Factory
        const newTower = this.context.entityFactory.createTower(towerType, 
            gameData.selectedStone.x, 
            gameData.selectedStone.y, {
                constructionPhase: this.phase
            });

        // Verificar oro suficiente
        if (gameData.gold < newTower.cost) {
            this.context.eventEmitter.emit('error', 'Oro insuficiente');
            return false;
        }

        // Reemplazar piedra con torre de ataque
        const stoneIndex = gameData.towers.indexOf(gameData.selectedStone);
        gameData.towers[stoneIndex] = newTower;
        gameData.gold -= newTower.cost;

        // Limpiar selección
        gameData.selectedStone = null;
        gameData.showUpgradeMenu = false;

        this.context.eventEmitter.emit('stoneUpgraded', { newTower });

        // Transición a estado de ataque
        this.transitionTo(AttackState, this.phase);
        return true;
    }

    handleReset() {
        this.transitionTo(ConstructionState, 1);
        return true;
    }

    // Override de permisos
    canPlaceStones() {
        return this.stonesPlaced < this.maxStones;
    }

    canUpgradeStones() {
        return this.stonesPlaced >= this.maxStones;
    }

    canPause() {
        return false;
    }

    canChangeSpeed() {
        return false;
    }
}

/**
 * Estado de Ataque - Concrete State
 * Los enemigos atacan y las torres defienden
 */
export class AttackState extends GameState {
    constructor(context, wave = 1) {
        super(context);
        this.name = 'Attack';
        this.wave = wave;
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = 5 + (wave * 2); // Más enemigos por oleada
        this.spawnTimer = 0;
        this.spawnInterval = Math.max(500, 2000 - (wave * 100)); // Spawn más rápido
    }

    enter() {
        console.log(`⚔️ Starting Wave ${this.wave}`);
        this.context.gameData.state = 'ATTACK';
        this.context.gameData.wave = this.wave;
        this.context.gameData.enemiesSpawned = 0;
        this.context.gameData.enemiesToSpawn = this.enemiesToSpawn;

        this.context.eventEmitter.emit('stateChanged', {
            state: this.name,
            wave: this.wave,
            canPause: true,
            canChangeSpeed: true
        });

        this.context.eventEmitter.emit('waveStarted', {
            wave: this.wave,
            enemyCount: this.enemiesToSpawn
        });
    }

    exit() {
        console.log(`⚔️ Wave ${this.wave} completed`);
    }

    update(deltaTime) {
        const gameData = this.context.gameData;
        const actualDelta = deltaTime * gameData.speedMultiplier;

        // Spawn enemigos
        this.updateEnemySpawning(actualDelta);

        // Actualizar entidades
        this.updateEntities(actualDelta);

        // Verificar condiciones de fin de oleada
        this.checkWaveCompletion();
    }

    updateEnemySpawning(deltaTime) {
        if (this.enemiesSpawned >= this.enemiesToSpawn) return;

        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }
    }

    spawnEnemy() {
        const gameData = this.context.gameData;
        
        // Crear enemigo usando Factory
        const enemy = this.context.entityFactory.createEnemy('basic', {
            health: 50 + (this.wave * 10),
            speed: 1 + (this.wave * 0.1),
            reward: 10 + this.wave,
            checkpoints: this.context.gridManager.getCheckpoints(),
            towers: gameData.towers
        });

        gameData.enemies.push(enemy);
        this.enemiesSpawned++;
        gameData.enemiesSpawned = this.enemiesSpawned;

        this.context.eventEmitter.emit('enemySpawned', { enemy, remaining: this.enemiesToSpawn - this.enemiesSpawned });
    }

    updateEntities(deltaTime) {
        const gameData = this.context.gameData;

        // Actualizar torres
        gameData.towers.forEach(tower => {
            if (tower.isActive()) {
                tower.update(deltaTime, {
                    enemies: gameData.enemies,
                    projectiles: gameData.projectiles
                });
            }
        });

        // Actualizar enemigos
        gameData.enemies = gameData.enemies.filter(enemy => {
            if (!enemy.isActive()) return false;
            
            enemy.update(deltaTime, {
                towers: gameData.towers,
                gridManager: this.context.gridManager
            });

            // Verificar si llegó al final
            if (enemy.reachedEnd) {
                const damage = enemy.calculateDamageToPlayer();
                gameData.health = Math.max(0, gameData.health - damage);
                
                this.context.eventEmitter.emit('playerDamaged', { damage, newHealth: gameData.health });
                
                if (gameData.health <= 0) {
                    this.transitionTo(GameOverState);
                }
                return false;
            }

            // Verificar si murió
            if (enemy.health <= 0) {
                gameData.gold += enemy.reward;
                this.context.eventEmitter.emit('enemyDefeated', { enemy, goldGained: enemy.reward });
                return false;
            }

            return true;
        });

        // Actualizar proyectiles
        gameData.projectiles = gameData.projectiles.filter(projectile => {
            projectile.update(deltaTime);
            return !projectile.hasHitTarget && !projectile.isOutOfBounds();
        });
    }

    checkWaveCompletion() {
        const gameData = this.context.gameData;
        const allEnemiesSpawned = this.enemiesSpawned >= this.enemiesToSpawn;
        const noEnemiesAlive = gameData.enemies.length === 0;

        if (allEnemiesSpawned && noEnemiesAlive) {
            // Oleada completada - volver a construcción
            const nextPhase = this.context.gameData.currentConstructionPhase + 1;
            gameData.gold += 50; // Bonus por completar oleada
            
            this.context.eventEmitter.emit('waveCompleted', {
                wave: this.wave,
                goldBonus: 50,
                nextPhase
            });

            this.transitionTo(ConstructionState, nextPhase);
        }
    }

    handleInput(inputEvent) {
        switch (inputEvent.type) {
            case 'pause':
                this.transitionTo(PausedState, this);
                return true;
            case 'changeSpeed':
                return this.handleSpeedChange();
            case 'reset':
                this.transitionTo(ConstructionState, 1);
                return true;
            default:
                return false;
        }
    }

    handleSpeedChange() {
        const gameData = this.context.gameData;
        gameData.speedMultiplier = gameData.speedMultiplier === 1 ? 5 : 1;
        
        this.context.eventEmitter.emit('speedChanged', { 
            newSpeed: gameData.speedMultiplier 
        });
        return true;
    }

    // Override de permisos
    canPause() {
        return true;
    }

    canChangeSpeed() {
        return true;
    }
}

/**
 * Estado de Pausa - Concrete State
 */
export class PausedState extends GameState {
    constructor(context, previousState) {
        super(context);
        this.name = 'Paused';
        this.previousState = previousState;
    }

    enter() {
        console.log('⏸️ Game Paused');
        this.context.gameData.state = 'PAUSED';
        this.context.eventEmitter.emit('stateChanged', {
            state: this.name,
            canResume: true
        });
    }

    exit() {
        console.log('▶️ Game Resumed');
    }

    update(deltaTime) {
        // No actualizar nada mientras está pausado
    }

    handleInput(inputEvent) {
        switch (inputEvent.type) {
            case 'resume':
            case 'pause':
                this.transitionTo(this.previousState.constructor, 
                    ...this.getPreviousStateArgs());
                return true;
            case 'reset':
                this.transitionTo(ConstructionState, 1);
                return true;
            default:
                return false;
        }
    }

    getPreviousStateArgs() {
        if (this.previousState instanceof AttackState) {
            return [this.previousState.wave];
        } else if (this.previousState instanceof ConstructionState) {
            return [this.previousState.phase];
        }
        return [];
    }
}

/**
 * Estado de Game Over - Concrete State
 */
export class GameOverState extends GameState {
    constructor(context) {
        super(context);
        this.name = 'GameOver';
    }

    enter() {
        console.log('💀 Game Over');
        this.context.gameData.state = 'GAME_OVER';
        this.context.eventEmitter.emit('stateChanged', {
            state: this.name,
            canRestart: true
        });
        this.context.eventEmitter.emit('gameOver', {
            wave: this.context.gameData.wave,
            score: this.calculateScore()
        });
    }

    exit() {
        console.log('🔄 Restarting Game');
    }

    update(deltaTime) {
        // No actualizar nada en game over
    }

    handleInput(inputEvent) {
        switch (inputEvent.type) {
            case 'reset':
            case 'restart':
                this.resetGameData();
                this.transitionTo(ConstructionState, 1);
                return true;
            default:
                return false;
        }
    }

    resetGameData() {
        const gameData = this.context.gameData;
        gameData.health = 100;
        gameData.gold = 500;
        gameData.wave = 1;
        gameData.towers = [];
        gameData.enemies = [];
        gameData.projectiles = [];
        gameData.speedMultiplier = 1;
    }

    calculateScore() {
        const gameData = this.context.gameData;
        return gameData.wave * 1000 + gameData.gold * 2;
    }
} 