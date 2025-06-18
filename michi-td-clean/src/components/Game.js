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

    const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    // Path que seguirán los enemigos
    const path = [
        {x: 0, y: canvasSize.height * 0.2},
        {x: canvasSize.width * 0.25, y: canvasSize.height * 0.2},
        {x: canvasSize.width * 0.25, y: canvasSize.height * 0.5},
        {x: canvasSize.width * 0.5, y: canvasSize.height * 0.5},
        {x: canvasSize.width * 0.5, y: canvasSize.height * 0.8},
        {x: canvasSize.width * 0.75, y: canvasSize.height * 0.8},
        {x: canvasSize.width * 0.75, y: canvasSize.height * 0.4},
        {x: canvasSize.width, y: canvasSize.height * 0.4}
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
        const enemySpeed = 0.3 + gameState.wave * 0.05;
        
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
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        
        // Dibujar cuadrícula
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= canvasSize.width; x += GAME_CONFIG.GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasSize.height);
            ctx.stroke();
        }
        
        for (let y = 0; y <= canvasSize.height; y += GAME_CONFIG.GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasSize.width, y);
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
            ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
            
            ctx.fillStyle = 'white';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvasSize.width / 2, canvasSize.height / 2);
        } else if (gameState.state === GAME_STATES.PAUSED) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
            
            ctx.fillStyle = 'white';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSADO', canvasSize.width / 2, canvasSize.height / 2);
        }
    }, [gameState, canvasSize]);

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

    useEffect(() => {
        const handleResize = () => {
            setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [showTowerMenu, setShowTowerMenu] = useState(false);

    return (
        <div className="fullscreen-game-root">
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onClick={handleCanvasClick}
                className="fullscreen-canvas"
                style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}
            />
            <div className="hud-bar">
                <div className="hud-stats">
                    <div className="hud-stat"><span role="img" aria-label="vida">❤️</span> {gameState.health}</div>
                    <div className="hud-stat"><span role="img" aria-label="oro">💰</span> {gameState.gold}</div>
                    <div className="hud-stat"><span role="img" aria-label="oleada">🌊</span> {gameState.wave}</div>
                </div>
            </div>
            <div className="hud-tower-fab" onClick={() => setShowTowerMenu(v => !v)}>
                <span role="img" aria-label="torre">🏰</span>
            </div>
            {showTowerMenu && (
                <div className="hud-tower-menu">
                    {['basic', 'strong', 'fast'].map(towerType => {
                        const towerData = getTowerData(towerType);
                        const isSelected = gameState.selectedTowerType === towerType;
                        const canAfford = gameState.gold >= towerData.cost;
                        let emoji = '🟢';
                        if (towerType === 'strong') emoji = '🔴';
                        if (towerType === 'fast') emoji = '🔵';
                        return (
                            <button
                                key={towerType}
                                className={`hud-tower-btn ${isSelected ? 'selected' : ''}`}
                                onClick={() => { selectTower(towerType); setShowTowerMenu(false); }}
                                disabled={!canAfford}
                            >
                                <div className={`tower-icon ${towerType}-tower`}>{emoji}</div>
                                <div className="tower-info">
                                    <div className="tower-name">{towerData.name}</div>
                                    <div className="tower-cost">${towerData.cost}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
            <div className="hud-controls-fab">
                <button className="hud-control-icon" onClick={startWave} disabled={gameState.state !== GAME_STATES.WAITING} title="Iniciar Oleada">▶️</button>
                <button className="hud-control-icon" onClick={togglePause} disabled={gameState.state === GAME_STATES.WAITING || gameState.state === GAME_STATES.GAME_OVER} title="Pausar/Reanudar">⏸️</button>
                <button className="hud-control-icon" onClick={resetGame} title="Reiniciar">🔄</button>
            </div>
        </div>
    );
};

export default Game;

