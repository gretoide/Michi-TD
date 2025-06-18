import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GAME_CONFIG, GAME_STATES, Tower, Enemy, Projectile } from '../utils/entities';

const Game = () => {
    const canvasRef = useRef(null);
    const gameLoopRef = useRef(null);
    
    // Estado del juego
    const [gameState, setGameState] = useState({
        state: GAME_STATES.WAITING,
        health: 100,
        gold: 500,
        wave: 1,
        selectedTowerType: null,
        towers: [],
        enemies: [],
        projectiles: [],
        enemiesSpawned: 0,
        enemiesToSpawn: 0
    });

    // Path que seguirán los enemigos
    const path = [
        {x: 0, y: 300},
        {x: 200, y: 300},
        {x: 200, y: 150},
        {x: 400, y: 150},
        {x: 400, y: 450},
        {x: 600, y: 450},
        {x: 600, y: 300},
        {x: 800, y: 300}
    ];

    // Tipos de torres
    const getTowerData = (type) => {
        const towerTypes = {
            basic: { cost: 50, damage: 20, range: 80, fireRate: 1000, color: '#43e97b', name: 'Básica' },
            strong: { cost: 100, damage: 50, range: 70, fireRate: 1500, color: '#fa709a', name: 'Fuerte' },
            fast: { cost: 75, damage: 15, range: 90, fireRate: 500, color: '#a8edea', name: 'Rápida' }
        };
        return towerTypes[type];
    };

    // Seleccionar torre
    const selectTower = (towerType) => {
        setGameState(prev => ({
            ...prev,
            selectedTowerType: prev.selectedTowerType === towerType ? null : towerType
        }));
    };

    // Verificar si se puede colocar torre
    const canPlaceTower = useCallback((x, y) => {
        // Verificar si no hay otra torre en la posición
        for (let tower of gameState.towers) {
            if (Math.abs(tower.x - x) < GAME_CONFIG.GRID_SIZE && 
                Math.abs(tower.y - y) < GAME_CONFIG.GRID_SIZE) {
                return false;
            }
        }
        
        // Verificar si no está en el camino
        if (isOnPath(x, y)) {
            return false;
        }
        
        return true;
    }, [gameState.towers]);

    const isOnPath = (x, y) => {
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            
            if (isPointOnLine(x, y, p1, p2, 30)) {
                return true;
            }
        }
        return false;
    };

    const isPointOnLine = (px, py, p1, p2, tolerance) => {
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
    };

    // Colocar torre
    const placeTower = (x, y, type) => {
        const towerData = getTowerData(type);
        
        if (gameState.gold >= towerData.cost && canPlaceTower(x, y)) {
            setGameState(prev => ({
                ...prev,
                towers: [...prev.towers, new Tower(x, y, type, towerData)],
                gold: prev.gold - towerData.cost
            }));
        }
    };

    // Manejar click en canvas
    const handleCanvasClick = (e) => {
        if (!gameState.selectedTowerType) return;
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Alinear a la cuadrícula
        const gridX = Math.floor(x / GAME_CONFIG.GRID_SIZE) * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2;
        const gridY = Math.floor(y / GAME_CONFIG.GRID_SIZE) * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2;
        
        placeTower(gridX, gridY, gameState.selectedTowerType);
    };

    // Iniciar oleada
    const startWave = () => {
        if (gameState.state !== GAME_STATES.WAITING) return;
        
        setGameState(prev => ({ ...prev, state: GAME_STATES.PLAYING }));
        spawnEnemies();
    };

    // Crear enemigos
    const spawnEnemies = () => {
        const enemyCount = 5 + gameState.wave * 2;
        const enemyHealth = 50 + gameState.wave * 10;
        const enemySpeed = 1 + gameState.wave * 0.1;
        
        console.log(`Spawning ${enemyCount} enemies`);
        
        setGameState(prev => ({
            ...prev,
            enemiesSpawned: 0,
            enemiesToSpawn: enemyCount
        }));
        
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => {
                setGameState(prev => ({
                    ...prev,
                    enemies: [...prev.enemies, new Enemy(path, enemyHealth, enemySpeed, 10 + prev.wave * 2)],
                    enemiesSpawned: prev.enemiesSpawned + 1
                }));
            }, i * 1000);
        }
    };

    // Pausar/reanudar
    const togglePause = () => {
        setGameState(prev => ({
            ...prev,
            state: prev.state === GAME_STATES.PLAYING ? GAME_STATES.PAUSED : GAME_STATES.PLAYING
        }));
    };

    // Reiniciar juego
    const resetGame = () => {
        setGameState({
            state: GAME_STATES.WAITING,
            health: 100,
            gold: 500,
            wave: 1,
            selectedTowerType: null,
            towers: [],
            enemies: [],
            projectiles: [],
            enemiesSpawned: 0,
            enemiesToSpawn: 0
        });
    };

    // Game loop
    const update = useCallback(() => {
        if (gameState.state !== GAME_STATES.PLAYING) return;

        setGameState(prev => {
            const newState = { ...prev };
            
            // Actualizar enemigos
            for (let i = newState.enemies.length - 1; i >= 0; i--) {
                const enemy = newState.enemies[i];
                enemy.update();
                
                if (enemy.reachedEnd) {
                    newState.health -= enemy.damage;
                    newState.enemies.splice(i, 1);
                    
                    if (newState.health <= 0) {
                        newState.state = GAME_STATES.GAME_OVER;
                    }
                } else if (enemy.health <= 0) {
                    newState.gold += enemy.reward;
                    newState.enemies.splice(i, 1);
                }
            }
            
            // Actualizar torres
            newState.towers.forEach(tower => {
                tower.update(newState.enemies, newState.projectiles);
            });
            
            // Actualizar proyectiles
            for (let i = newState.projectiles.length - 1; i >= 0; i--) {
                const projectile = newState.projectiles[i];
                projectile.update();
                
                if (projectile.hasHitTarget || projectile.isOutOfBounds()) {
                    newState.projectiles.splice(i, 1);
                }
            }
            
            // Verificar si la oleada terminó
            const allEnemiesSpawned = newState.enemiesSpawned >= newState.enemiesToSpawn;
            if (newState.enemies.length === 0 && newState.state === GAME_STATES.PLAYING && allEnemiesSpawned) {
                newState.wave++;
                newState.state = GAME_STATES.WAITING;
                newState.gold += 50;
            }
            
            return newState;
        });
    }, [gameState.state]);

    // Dibujar juego
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        // Dibujar cuadrícula
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= GAME_CONFIG.CANVAS_WIDTH; x += GAME_CONFIG.GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, GAME_CONFIG.CANVAS_HEIGHT);
            ctx.stroke();
        }
        
        for (let y = 0; y <= GAME_CONFIG.CANVAS_HEIGHT; y += GAME_CONFIG.GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, y);
            ctx.stroke();
        }
        
        // Dibujar camino
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        
        ctx.stroke();
        
        // Dibujar entidades
        gameState.towers.forEach(tower => tower.draw(ctx));
        gameState.enemies.forEach(enemy => enemy.draw(ctx));
        gameState.projectiles.forEach(projectile => projectile.draw(ctx));
        
        // Dibujar UI de juego
        if (gameState.state === GAME_STATES.GAME_OVER) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
            
            ctx.fillStyle = 'white';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2);
        } else if (gameState.state === GAME_STATES.PAUSED) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
            
            ctx.fillStyle = 'white';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSADO', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2);
        }
    }, [gameState]);

    // Game loop principal
    useEffect(() => {
        const gameLoop = () => {
            update();
            draw();
            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };
        
        gameLoop();
        
        return () => {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
        };
    }, [update, draw]);

    return (
        <div className="game-container">
            <div className="game-header">
                <h1>Michi Tower Defense</h1>
                <div className="game-stats">
                    <div className="stat">
                        <span className="label">Vida</span>
                        <span>{gameState.health}</span>
                    </div>
                    <div className="stat">
                        <span className="label">Oro</span>
                        <span>{gameState.gold}</span>
                    </div>
                    <div className="stat">
                        <span className="label">Oleada</span>
                        <span>{gameState.wave}</span>
                    </div>
                </div>
            </div>
            
            <div className="game-area">
                <canvas
                    ref={canvasRef}
                    width={GAME_CONFIG.CANVAS_WIDTH}
                    height={GAME_CONFIG.CANVAS_HEIGHT}
                    onClick={handleCanvasClick}
                    className="game-canvas"
                />
                
                <div className="control-panel">
                    <div>
                        <h3>Torres</h3>
                        <div className="tower-buttons">
                            {['basic', 'strong', 'fast'].map(towerType => {
                                const towerData = getTowerData(towerType);
                                const isSelected = gameState.selectedTowerType === towerType;
                                const canAfford = gameState.gold >= towerData.cost;
                                
                                return (
                                    <button
                                        key={towerType}
                                        className={`tower-btn ${isSelected ? 'selected' : ''}`}
                                        onClick={() => selectTower(towerType)}
                                        disabled={!canAfford}
                                    >
                                        <div className={`tower-icon ${towerType}-tower`}>T</div>
                                        <div className="tower-info">
                                            <div className="tower-name">{towerData.name}</div>
                                            <div className="tower-cost">${towerData.cost}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="game-controls">
                        <button
                            className="control-btn"
                            onClick={startWave}
                            disabled={gameState.state !== GAME_STATES.WAITING}
                        >
                            Iniciar Oleada
                        </button>
                        <button
                            className="control-btn pause"
                            onClick={togglePause}
                            disabled={gameState.state === GAME_STATES.WAITING || gameState.state === GAME_STATES.GAME_OVER}
                        >
                            {gameState.state === GAME_STATES.PAUSED ? 'Reanudar' : 'Pausar'}
                        </button>
                        <button
                            className="control-btn reset"
                            onClick={resetGame}
                        >
                            Reiniciar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Game;
