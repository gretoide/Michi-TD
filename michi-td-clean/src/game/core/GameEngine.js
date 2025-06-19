import { EventEmitter } from './EventEmitter.js';
import { EntityFactory } from '../entities/EntityFactory.js';
import { GridManager } from '../systems/GridManager.js';
import { ConstructionState } from '../states/GameState.js';

/**
 * GameEngine - Orquestador principal del juego
 * Aplica Inversion of Control y Dependency Injection
 */
export class GameEngine {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        // Dependency Injection de sistemas
        this.eventEmitter = new EventEmitter();
        this.entityFactory = new EntityFactory();
        this.gridManager = new GridManager({
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height
        });
        
        // Estado del juego centralizado
        this.gameData = this.initializeGameData();
        
        // State Pattern - Estado actual del juego
        this.currentState = null;
        this.setState(new ConstructionState(this, 1));
        
        // Control de tiempo
        this.lastFrameTime = 0;
        this.isRunning = false;
        
        // Cámara
        this.camera = { x: 0, y: 0 };
        
        this.setupEventListeners();
    }

    /**
     * Inicializar datos del juego
     */
    initializeGameData() {
        return {
            // Estado básico
            health: 100,
            gold: 500,
            wave: 1,
            state: 'CONSTRUCTION',
            
            // Entidades
            towers: [],
            enemies: [],
            projectiles: [],
            
            // Estado de construcción
            currentConstructionPhase: 1,
            stonesPlacedThisPhase: 0,
            isPlacingStones: false,
            
            // UI
            selectedStone: null,
            showUpgradeMenu: false,
            upgradeMenuPosition: { x: 0, y: 0 },
            
            // Control
            speedMultiplier: 1,
            isPaused: false
        };
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Eventos del sistema
        this.eventEmitter.on('stateChanged', (data) => {
            console.log(`🎮 State changed to: ${data.state}`);
        });
        
        this.eventEmitter.on('error', (message) => {
            console.warn(`⚠️ Game Error: ${message}`);
        });
        
        this.eventEmitter.on('stonePlaced', (data) => {
            console.log(`🪨 Stone placed: ${data.stonesRemaining} remaining`);
        });
        
        this.eventEmitter.on('waveStarted', (data) => {
            console.log(`⚔️ Wave ${data.wave} started with ${data.enemyCount} enemies`);
        });
    }

    /**
     * Cambiar estado del juego - State Pattern
     */
    setState(newState) {
        this.currentState = newState;
    }

    /**
     * Iniciar el juego
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.gameLoop();
        
        this.eventEmitter.emit('gameStarted');
    }

    /**
     * Pausar el juego
     */
    pause() {
        this.isRunning = false;
        this.eventEmitter.emit('gamePaused');
    }

    /**
     * Reanudar el juego
     */
    resume() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.gameLoop();
        
        this.eventEmitter.emit('gameResumed');
    }

    /**
     * Loop principal del juego
     */
    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Actualizar usando State Pattern
        this.update(deltaTime);
        
        // Renderizar
        this.render();
        
        // Continuar loop
        requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * Actualizar lógica del juego
     */
    update(deltaTime) {
        if (this.currentState) {
            this.currentState.update(deltaTime);
        }
        
        // Actualizar sistemas independientes
        this.updateCamera(deltaTime);
        this.cleanupEntities();
    }

    /**
     * Actualizar cámara
     */
    updateCamera(deltaTime) {
        // Lógica de cámara si es necesario
        // Por ahora la cámara es estática
    }

    /**
     * Limpiar entidades inactivas
     */
    cleanupEntities() {
        this.gameData.towers = this.gameData.towers.filter(tower => tower.isActive());
        this.gameData.enemies = this.gameData.enemies.filter(enemy => enemy.isActive());
        this.gameData.projectiles = this.gameData.projectiles.filter(projectile => projectile.isActive());
    }

    /**
     * Renderizar el juego
     */
    render() {
        // Limpiar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dibujar fondo
        this.drawBackground();
        
        // Dibujar grid y checkpoints
        this.gridManager.drawGrid(this.ctx, this.camera);
        this.gridManager.drawCheckpoints(this.ctx, this.camera);
        
        // Dibujar entidades
        this.drawEntities();
        
        // Dibujar UI del juego
        this.drawGameUI();
    }

    /**
     * Dibujar fondo
     */
    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#f7fafc');
        gradient.addColorStop(1, '#edf2f7');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Dibujar todas las entidades
     */
    drawEntities() {
        // Dibujar torres
        this.gameData.towers.forEach(tower => {
            tower.draw(this.ctx, this.camera);
        });
        
        // Dibujar enemigos
        this.gameData.enemies.forEach(enemy => {
            enemy.draw(this.ctx, this.camera);
        });
        
        // Dibujar proyectiles
        this.gameData.projectiles.forEach(projectile => {
            projectile.draw(this.ctx, this.camera);
        });
    }

    /**
     * Dibujar UI específica del juego (no sidebar)
     */
    drawGameUI() {
        // Mostrar menú de mejora si está activo
        if (this.gameData.showUpgradeMenu && this.gameData.selectedStone) {
            this.drawUpgradeMenu();
        }
        
        // Mostrar información de estado
        this.drawStateInfo();
    }

    /**
     * Dibujar menú de mejora
     */
    drawUpgradeMenu() {
        const pos = this.gameData.upgradeMenuPosition;
        const menuWidth = 200;
        const menuHeight = 120;
        
        // Fondo del menú
        this.ctx.fillStyle = 'rgba(45, 55, 72, 0.95)';
        this.ctx.fillRect(pos.x, pos.y, menuWidth, menuHeight);
        
        // Borde
        this.ctx.strokeStyle = '#cbd5e0';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(pos.x, pos.y, menuWidth, menuHeight);
        
        // Título
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText('Mejorar Piedra', pos.x + 10, pos.y + 20);
        
        // Opciones de torres
        const towerTypes = [
            { name: 'Básica', cost: 50, y: 40 },
            { name: 'Fuerte', cost: 100, y: 60 },
            { name: 'Rápida', cost: 75, y: 80 }
        ];
        
        towerTypes.forEach(tower => {
            this.ctx.fillStyle = this.gameData.gold >= tower.cost ? '#48bb78' : '#e53e3e';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`${tower.name} - $${tower.cost}`, pos.x + 10, pos.y + tower.y);
        });
    }

    /**
     * Dibujar información del estado actual
     */
    drawStateInfo() {
        if (this.currentState) {
            this.ctx.fillStyle = '#2d3748';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillText(`Estado: ${this.currentState.name}`, 10, 30);
            
            if (this.currentState.phase) {
                this.ctx.fillText(`Fase: ${this.currentState.phase}`, 10, 50);
            }
            
            if (this.currentState.wave) {
                this.ctx.fillText(`Oleada: ${this.currentState.wave}`, 10, 50);
            }
        }
    }

    /**
     * Manejar input del usuario
     */
    handleInput(inputEvent) {
        if (this.currentState) {
            return this.currentState.handleInput(inputEvent);
        }
        return false;
    }

    /**
     * Obtener información del juego para la UI
     */
    getGameInfo() {
        return {
            ...this.gameData,
            currentStateName: this.currentState?.name,
            canPlaceStones: this.currentState?.canPlaceStones(),
            canUpgradeStones: this.currentState?.canUpgradeStones(),
            canPause: this.currentState?.canPause(),
            canChangeSpeed: this.currentState?.canChangeSpeed()
        };
    }

    /**
     * Limpiar recursos
     */
    destroy() {
        this.isRunning = false;
        this.eventEmitter.clear();
        this.gridManager.clearPathCache();
    }
} 