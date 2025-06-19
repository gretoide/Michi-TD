import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../../game/core/GameEngine.js';

/**
 * GameCanvas Refactorizado - Usa la nueva arquitectura modular
 * Aplica Separation of Concerns y Clean Architecture
 */
const GameCanvasRefactored = () => {
    const canvasRef = useRef(null);
    const gameEngineRef = useRef(null);
    const [gameInfo, setGameInfo] = useState(null);
    const [isGameRunning, setIsGameRunning] = useState(false);

    /**
     * Inicializar el juego cuando el componente se monta
     */
    useEffect(() => {
        if (canvasRef.current && !gameEngineRef.current) {
            // Configurar canvas
            const canvas = canvasRef.current;
            canvas.width = 800;
            canvas.height = 600;

            // Crear engine del juego con Dependency Injection
            gameEngineRef.current = new GameEngine(canvas);
            
            // Suscribirse a eventos del juego - Observer Pattern
            setupGameEventListeners();
            
            // Configurar event listeners de input
            setupInputHandlers();
            
            // Iniciar el juego
            gameEngineRef.current.start();
            setIsGameRunning(true);
            
            // Actualizar info de la UI
            updateGameInfo();
        }

        // Cleanup al desmontar
        return () => {
            if (gameEngineRef.current) {
                gameEngineRef.current.destroy();
                gameEngineRef.current = null;
            }
        };
    }, []);

    /**
     * Configurar listeners de eventos del juego
     */
    const setupGameEventListeners = useCallback(() => {
        const engine = gameEngineRef.current;
        if (!engine) return;

        // Observer Pattern - Reaccionar a eventos del juego
        engine.eventEmitter.on('stateChanged', (data) => {
            updateGameInfo();
            console.log(`🎮 Estado cambiado a: ${data.state}`);
        });

        engine.eventEmitter.on('stonePlaced', (data) => {
            updateGameInfo();
        });

        engine.eventEmitter.on('waveStarted', (data) => {
            updateGameInfo();
        });

        engine.eventEmitter.on('gameOver', (data) => {
            setIsGameRunning(false);
            alert(`Game Over! Oleada: ${data.wave}, Puntaje: ${data.score}`);
        });

        engine.eventEmitter.on('error', (message) => {
            // Mostrar error en la UI
            console.warn(`❌ Error: ${message}`);
        });
    }, []);

    /**
     * Configurar manejadores de input
     */
    const setupInputHandlers = useCallback(() => {
        const canvas = canvasRef.current;
        const engine = gameEngineRef.current;
        if (!canvas || !engine) return;

        // Click en canvas - Command Pattern a través del engine
        const handleCanvasClick = (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Delegar al engine que maneje el input según el estado actual
            const inputEvent = {
                type: 'click',
                x: x,
                y: y,
                button: event.button
            };

            engine.handleInput(inputEvent);
            updateGameInfo();
        };

        canvas.addEventListener('click', handleCanvasClick);

        // Cleanup
        return () => {
            canvas.removeEventListener('click', handleCanvasClick);
        };
    }, []);

    /**
     * Actualizar información del juego para la UI
     */
    const updateGameInfo = useCallback(() => {
        if (gameEngineRef.current) {
            const info = gameEngineRef.current.getGameInfo();
            setGameInfo(info);
        }
    }, []);

    /**
     * Manejar acciones de la sidebar - Command Pattern
     */
    const handleSidebarAction = useCallback((action, data = {}) => {
        const engine = gameEngineRef.current;
        if (!engine) return;

        const inputEvent = {
            type: action,
            ...data
        };

        const handled = engine.handleInput(inputEvent);
        if (handled) {
            updateGameInfo();
        }
    }, []);

    /**
     * Manejar colocación de piedras
     */
    const handlePlaceStone = useCallback(() => {
        handleSidebarAction('togglePlaceStone');
    }, [handleSidebarAction]);

    /**
     * Manejar pausa/reanudación
     */
    const handlePause = useCallback(() => {
        const engine = gameEngineRef.current;
        if (!engine) return;

        if (isGameRunning) {
            engine.pause();
            setIsGameRunning(false);
        } else {
            engine.resume();
            setIsGameRunning(true);
        }
    }, [isGameRunning]);

    /**
     * Cambiar velocidad del juego
     */
    const handleSpeedChange = useCallback(() => {
        handleSidebarAction('changeSpeed');
    }, [handleSidebarAction]);

    /**
     * Reiniciar juego
     */
    const handleReset = useCallback(() => {
        handleSidebarAction('reset');
        setIsGameRunning(true);
    }, [handleSidebarAction]);

    /**
     * Renderizar sidebar con nueva arquitectura
     */
    const renderSidebar = () => {
        if (!gameInfo) return null;

        return (
            <div className="game-sidebar">
                {/* Estadísticas */}
                <div className="sidebar-section">
                    <h3>📊 Estado</h3>
                    <div className="sidebar-stats">
                        <div className="sidebar-stat" title={`Vida: ${gameInfo.health}`}>
                            <span role="img" aria-label="corazón">❤️</span>
                            <span>{gameInfo.health}</span>
                        </div>
                        <div className="sidebar-stat" title={`Oro: ${gameInfo.gold}`}>
                            <span role="img" aria-label="oro">💰</span>
                            <span>{gameInfo.gold}</span>
                        </div>
                        <div className="sidebar-stat" title={`Oleada: ${gameInfo.wave}`}>
                            <span role="img" aria-label="oleada">🌊</span>
                            <span>{gameInfo.wave}</span>
                        </div>
                        <div className="sidebar-stat" title={`Enemigos: ${gameInfo.enemies?.length || 0}`}>
                            <span role="img" aria-label="enemigos">👹</span>
                            <span>{gameInfo.enemies?.length || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Estado actual */}
                <div className="sidebar-section">
                    <h3>🎮 Estado Actual</h3>
                    <p><strong>{gameInfo.currentStateName}</strong></p>
                    {gameInfo.currentConstructionPhase && (
                        <p>Fase: {gameInfo.currentConstructionPhase}</p>
                    )}
                </div>

                {/* Acciones disponibles */}
                <div className="sidebar-section">
                    <h3>⚡ Acciones</h3>
                    
                    {/* Botón de piedras - solo en construcción */}
                    {gameInfo.canPlaceStones && (
                        <button 
                            onClick={handlePlaceStone}
                            className="action-button stone-button"
                            disabled={gameInfo.gold < 10}
                        >
                            <div className="tower-info">
                                <span className="tower-name">🪨 Piedra</span>
                                <span className="tower-cost">$10</span>
                                <span className="stone-counter">
                                    {gameInfo.stonesPlacedThisPhase}/5
                                </span>
                            </div>
                        </button>
                    )}

                    {/* Controles del juego */}
                    <div className="game-controls">
                        {gameInfo.canPause && (
                            <button 
                                onClick={handlePause}
                                className="control-button"
                            >
                                {isGameRunning ? '⏸️ Pausar' : '▶️ Reanudar'}
                            </button>
                        )}
                        
                        {gameInfo.canChangeSpeed && (
                            <button 
                                onClick={handleSpeedChange}
                                className="control-button"
                            >
                                ⚡ {gameInfo.speedMultiplier}x
                            </button>
                        )}
                        
                        <button 
                            onClick={handleReset}
                            className="control-button reset-button"
                        >
                            🔄 Reiniciar
                        </button>
                    </div>
                </div>

                {/* Información del estado */}
                <div className="sidebar-section">
                    <h3>ℹ️ Información</h3>
                    <div className="game-instructions">
                        {gameInfo.currentStateName === 'Construction' && (
                            <p>
                                {gameInfo.canPlaceStones 
                                    ? `Coloca ${5 - gameInfo.stonesPlacedThisPhase} piedras más`
                                    : 'Mejora las piedras a torres de ataque'
                                }
                            </p>
                        )}
                        {gameInfo.currentStateName === 'Attack' && (
                            <p>¡Defiende tu base de la oleada {gameInfo.wave}!</p>
                        )}
                        {gameInfo.currentStateName === 'Paused' && (
                            <p>Juego pausado. Presiona reanudar para continuar.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="game-container">
            <canvas 
                ref={canvasRef}
                className="game-canvas"
                style={{ border: '2px solid #e2e8f0', borderRadius: '8px' }}
            />
            {renderSidebar()}
        </div>
    );
};

export default GameCanvasRefactored; 