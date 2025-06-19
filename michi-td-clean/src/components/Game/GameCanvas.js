import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GAME_CONFIG, GAME_STATES, Tower, Enemy, Projectile } from '../../entities/entities';

const Game = () => {
    const canvasRef = useRef(null);
    const gameLoopRef = useRef(null);
    
    // Estado del juego
    const [gameState, setGameState] = useState({
        state: GAME_STATES.CONSTRUCTION,
        health: 100,
        gold: 500,
        wave: 1,
        selectedTowerType: null,
        towers: [],
        enemies: [],
        projectiles: [],
        enemiesSpawned: 0,
        enemiesToSpawn: 0,
        currentConstructionPhase: 1,
        stonesPlacedThisPhase: 0,
        selectedStone: null,
        showUpgradeMenu: false,
        upgradeMenuPosition: { x: 0, y: 0 },
        isPlacingStones: false,
        speedMultiplier: 1 // 1 = velocidad normal, 5 = velocidad acelerada
    });

    const getSidebarWidth = () => {
        if (window.innerWidth <= 600) return 70;
        if (window.innerWidth <= 800) return 80;
        return 90;
    };
    const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth - getSidebarWidth(), height: window.innerHeight });

    // Grid fijo y sistema de pan
    const FIXED_GRID = {
        COLS: 37, // 1-37 (37 columnas - ancho)
        ROWS: 37, // A-AK (37 filas - alto)
        CELL_SIZE: 40,
        TOTAL_WIDTH: 37 * 40, // 1480px
        TOTAL_HEIGHT: 37 * 40  // 1480px
    };

    const [camera, setCamera] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    const [cursorStyle, setCursorStyle] = useState('crosshair');

    // Tipos de torres
    const getTowerData = (type) => {
        const towerTypes = {
            basic: { cost: 50, damage: 20, range: 80, fireRate: 1000, color: '#43e97b', name: 'Básica' },
            strong: { cost: 100, damage: 50, range: 70, fireRate: 1500, color: '#fa709a', name: 'Fuerte' },
            fast: { cost: 75, damage: 15, range: 90, fireRate: 500, color: '#a8edea', name: 'Rápida' },
            stone: { cost: 10, damage: 0, range: 0, fireRate: 0, color: '#6b7280', name: 'Piedra' }
        };
        return towerTypes[type];
    };

    // Función auxiliar para convertir número a letra estilo Excel
    const numberToLetter = useCallback((num) => {
        let result = '';
        while (num >= 0) {
            result = String.fromCharCode(65 + (num % 26)) + result;
            num = Math.floor(num / 26) - 1;
        }
        return result;
    }, []);

    // Función auxiliar para convertir letra a número
    const letterToNumber = useCallback((letter) => {
        let result = 0;
        for (let i = 0; i < letter.length; i++) {
            result = result * 26 + (letter.charCodeAt(i) - 64);
        }
        return result - 1; // Ajustar para base 0
    }, []);

    // Checkpoints que seguirán los enemigos (nuevo sistema basado en celdas numeradas)
    const checkpoints = [
        // A5 (inicio) - fila A=0, columna 5=4 (base 0)
        {x: 4 * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, y: 0 * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, row: 0, col: 4},
        // S5 (checkpoint 1) - fila S=18, columna 5=4 
        {x: 4 * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, y: letterToNumber('S') * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, row: letterToNumber('S'), col: 4},
        // S33 (checkpoint 2) - fila S=18, columna 33=32
        {x: 32 * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, y: letterToNumber('S') * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, row: letterToNumber('S'), col: 32},
        // E33 (checkpoint 3) - fila E=4, columna 33=32
        {x: 32 * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, y: letterToNumber('E') * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, row: letterToNumber('E'), col: 32},
        // E19 (checkpoint 4) - fila E=4, columna 19=18
        {x: 18 * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, y: letterToNumber('E') * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, row: letterToNumber('E'), col: 18},
        // AG19 (checkpoint 5) - fila AG=32, columna 19=18
        {x: 18 * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, y: letterToNumber('AG') * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, row: letterToNumber('AG'), col: 18},
        // AG37 (final) - fila AG=32, columna 37=36
        {x: 36 * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, y: letterToNumber('AG') * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE/2, row: letterToNumber('AG'), col: 36}
    ];
    


    // Función para verificar si una celda es transitable (no tiene torre y no es área bloqueada)
    const isCellWalkable = (row, col, towers) => {
        // Verificar límites del grid
        if (row < 0 || row >= FIXED_GRID.ROWS || col < 0 || col >= FIXED_GRID.COLS) {
            return false;
        }

        // Verificar si hay una torre en esta posición
        for (const tower of towers) {
            const towerGridCol = Math.floor(tower.x / FIXED_GRID.CELL_SIZE);
            const towerGridRow = Math.floor(tower.y / FIXED_GRID.CELL_SIZE);
            if (towerGridRow === row && towerGridCol === col) {
                return false;
            }
        }

        return true;
    };

    // Algoritmo A* para pathfinding
    const findPath = (startRow, startCol, endRow, endCol, towers) => {
        const openSet = [{row: startRow, col: startCol, g: 0, h: 0, f: 0, parent: null}];
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
            ].filter(({row, col}) => isCellWalkable(row, col, towers));
        };

        while (openSet.length > 0) {
            // Encontrar el nodo con menor f
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            
            const currentKey = `${current.row},${current.col}`;
            if (closedSet.has(currentKey)) continue;
            closedSet.add(currentKey);

            // Si llegamos al destino
            if (current.row === endRow && current.col === endCol) {
                const path = [];
                let node = current;
                while (node) {
                    path.unshift({
                        x: node.col * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE / 2,
                        y: node.row * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE / 2
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
                const h = heuristic(neighbor.row, neighbor.col, endRow, endCol);
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
    };

    // Función para verificar conectividad entre checkpoints consecutivos
    const validateCheckpointConnectivity = (towers) => {
        for (let i = 0; i < checkpoints.length - 1; i++) {
            const start = checkpoints[i];
            const end = checkpoints[i + 1];
            
            const path = findPath(start.row, start.col, end.row, end.col, towers);
            if (!path) {
                return false; // No hay camino entre estos checkpoints
            }
        }
        return true;
    };

    // Función para dibujar celdas especiales
    const drawSpecialCells = useCallback((ctx) => {
        const currentCamera = cameraRef.current;
        const currentCanvasSize = canvasSizeRef.current;
        
        // Definir las celdas especiales
        const grayCells = [
            // Área superior izquierda: del 1 al 10, y de la A a la G (filas 0-6, cols 0-9)
            ...Array.from({length: 7}, (_, row) => 
                Array.from({length: 10}, (_, col) => ({row, col, color: '#353841'}))
            ).flat(),
            
            // Área inferior derecha: del 29 al 37, y de la AC a AK (filas 28-36, cols 28-36)
            ...Array.from({length: 9}, (_, i) => 
                Array.from({length: 9}, (_, j) => ({row: 28 + i, col: 28 + j, color: '#353841'}))
            ).flat(),
            
            // Celdas específicas grises
            {row: letterToNumber('E'), col: 18, color: '#353841'}, // E19 (col 18 porque es base 0)
            {row: letterToNumber('E'), col: 32, color: '#353841'}, // E33
            {row: letterToNumber('S'), col: 4, color: '#353841'},  // S5
            {row: letterToNumber('S'), col: 32, color: '#353841'}, // S33
            {row: letterToNumber('AG'), col: 18, color: '#353841'} // AG19
        ];
        
        // Celda dorada
        const goldenCell = {row: letterToNumber('S'), col: 18, color: '#fbbf24'}; // S19
        
        // Dibujar todas las celdas especiales
        [...grayCells, goldenCell].forEach(cell => {
            const x = cell.col * FIXED_GRID.CELL_SIZE;
            const y = cell.row * FIXED_GRID.CELL_SIZE;
            
            // Solo dibujar si está visible
            if (x + FIXED_GRID.CELL_SIZE >= currentCamera.x && x <= currentCamera.x + currentCanvasSize.width &&
                y + FIXED_GRID.CELL_SIZE >= currentCamera.y && y <= currentCamera.y + currentCanvasSize.height) {
                ctx.fillStyle = cell.color;
                ctx.fillRect(x, y, FIXED_GRID.CELL_SIZE, FIXED_GRID.CELL_SIZE);
            }
        });
    }, [FIXED_GRID.CELL_SIZE, letterToNumber]);

    // Función para dibujar números en celdas específicas
    const drawCellNumbers = useCallback((ctx) => {
        const currentCamera = cameraRef.current;
        const currentCanvasSize = canvasSizeRef.current;
        
        // Definir las celdas con números
        const numberedCells = [
            {row: letterToNumber('E'), col: 18, number: '4'}, // E19
            {row: letterToNumber('E'), col: 32, number: '3'}, // E33
            {row: letterToNumber('S'), col: 4, number: '1'},  // S5
            {row: letterToNumber('S'), col: 32, number: '2'}, // S33
            {row: letterToNumber('AG'), col: 18, number: '5'} // AG19
        ];
        
        // Configurar estilo del texto
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Dibujar números
        numberedCells.forEach(cell => {
            const x = cell.col * FIXED_GRID.CELL_SIZE;
            const y = cell.row * FIXED_GRID.CELL_SIZE;
            
            // Solo dibujar si está visible
            if (x + FIXED_GRID.CELL_SIZE >= currentCamera.x && x <= currentCamera.x + currentCanvasSize.width &&
                y + FIXED_GRID.CELL_SIZE >= currentCamera.y && y <= currentCamera.y + currentCanvasSize.height) {
                
                const centerX = x + FIXED_GRID.CELL_SIZE / 2;
                const centerY = y + FIXED_GRID.CELL_SIZE / 2;
                
                ctx.fillText(cell.number, centerX, centerY);
            }
        });
    }, [FIXED_GRID.CELL_SIZE, letterToNumber]);

    // Función para convertir coordenadas de píxeles a nomenclatura del grid
    const getGridCoordinates = useCallback((x, y) => {
        // Ajustar coordenadas por la posición de la cámara
        const worldX = x + camera.x;
        const worldY = y + camera.y;
        
        const gridX = Math.floor(worldX / FIXED_GRID.CELL_SIZE);
        const gridY = Math.floor(worldY / FIXED_GRID.CELL_SIZE);
        
        // Validar que esté dentro del grid fijo
        if (gridX < 0 || gridX >= FIXED_GRID.COLS || gridY < 0 || gridY >= FIXED_GRID.ROWS) {
            return 'Fuera del grid';
        }
        
        // Números en horizontal (1-45), letras en vertical (A, B, C... Z, AA, AB, AC...)
        const number = gridX + 1;
        const letter = numberToLetter(gridY);
        
        return `${letter}${number}`;
    }, [camera, FIXED_GRID.CELL_SIZE, FIXED_GRID.COLS, FIXED_GRID.ROWS, numberToLetter]);

    // Función para dibujar las etiquetas del grid
    const drawGridLabels = useCallback((ctx) => {
        const currentCamera = cameraRef.current;
        const currentCanvasSize = canvasSizeRef.current;
        
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        
        // Calcular qué parte del grid fijo está visible
        const startCol = Math.max(0, Math.floor(currentCamera.x / FIXED_GRID.CELL_SIZE));
        const endCol = Math.min(FIXED_GRID.COLS, Math.ceil((currentCamera.x + currentCanvasSize.width) / FIXED_GRID.CELL_SIZE));
        const startRow = Math.max(0, Math.floor(currentCamera.y / FIXED_GRID.CELL_SIZE));
        const endRow = Math.min(FIXED_GRID.ROWS, Math.ceil((currentCamera.y + currentCanvasSize.height) / FIXED_GRID.CELL_SIZE));
        
        // Dibujar números en la parte inferior (1, 2, 3, ...)
        ctx.textAlign = 'center';
        for (let col = startCol; col < endCol; col++) {
            const x = col * FIXED_GRID.CELL_SIZE - currentCamera.x;
            const number = col + 1;
            
            if (x >= -FIXED_GRID.CELL_SIZE && x <= currentCanvasSize.width) {
                ctx.fillText(number.toString(), x + FIXED_GRID.CELL_SIZE / 2, currentCanvasSize.height - 5);
            }
        }
        
        // Dibujar letras en el lado izquierdo (A, B, C... Z, AA, AB, AC...)
        ctx.textAlign = 'left';
        for (let row = startRow; row < endRow; row++) {
            const y = row * FIXED_GRID.CELL_SIZE - currentCamera.y;
            const letter = numberToLetter(row);
            
            if (y >= -FIXED_GRID.CELL_SIZE && y <= currentCanvasSize.height) {
                ctx.fillText(letter, 5, y + FIXED_GRID.CELL_SIZE / 2 + 4);
            }
        }
    }, [FIXED_GRID.CELL_SIZE, FIXED_GRID.COLS, FIXED_GRID.ROWS, numberToLetter]);

    // Activar/desactivar modo colocación de piedras
    const toggleStonePlacement = () => {
        setGameState(prev => {
            const canPlaceStones = prev.stonesPlacedThisPhase < 5 && prev.gold >= 10 && prev.state === GAME_STATES.CONSTRUCTION;
            return {
                ...prev,
                isPlacingStones: canPlaceStones ? !prev.isPlacingStones : false,
                selectedTowerType: canPlaceStones && !prev.isPlacingStones ? 'stone' : null
            };
        });
    };

    // Función para verificar si una posición está en el camino
    const isOnPath = useCallback((x, y) => {
        // Convertir coordenadas del mundo a coordenadas de grid
        const gridCol = Math.floor(x / FIXED_GRID.CELL_SIZE);
        const gridRow = Math.floor(y / FIXED_GRID.CELL_SIZE);
        
        // Verificar si está dentro de los límites del grid
        if (gridCol < 0 || gridCol >= FIXED_GRID.COLS || gridRow < 0 || gridRow >= FIXED_GRID.ROWS) {
            return true; // No permitir torres fuera del grid
        }
        
        // Zona superior izquierda: columnas 0-9 (1-10) y filas 0-6 (A-G)
        if (gridCol >= 0 && gridCol <= 9 && gridRow >= 0 && gridRow <= 6) {
            return true;
        }
        
        // Zona inferior derecha: columnas 28-36 (29-37) y filas 28-36 (AC-AK)
        if (gridCol >= 28 && gridCol <= 36 && gridRow >= 28 && gridRow <= 36) {
            return true;
        }
        
        // Checkpoints específicos grises
        const specialCells = [
            {row: letterToNumber('E'), col: 18}, // E19
            {row: letterToNumber('E'), col: 32}, // E33
            {row: letterToNumber('S'), col: 4},  // S5
            {row: letterToNumber('S'), col: 32}, // S33
            {row: letterToNumber('AG'), col: 18} // AG19
        ];
        
        for (const cell of specialCells) {
            if (gridRow === cell.row && gridCol === cell.col) {
                return true;
            }
        }
        
        return false; // Permitir torres en todas las demás celdas
    }, [FIXED_GRID.CELL_SIZE, FIXED_GRID.COLS, FIXED_GRID.ROWS, letterToNumber]);

    // Verificar si se puede colocar torre
    const canPlaceTower = useCallback((worldX, worldY) => {
        // Verificar si está dentro del grid fijo
        const gridX = Math.floor(worldX / FIXED_GRID.CELL_SIZE);
        const gridY = Math.floor(worldY / FIXED_GRID.CELL_SIZE);
        
        if (gridX < 0 || gridX >= FIXED_GRID.COLS || gridY < 0 || gridY >= FIXED_GRID.ROWS) {
            return false;
        }
        
        // Verificar si no hay otra torre en la posición
        for (let tower of gameState.towers) {
            if (Math.abs(tower.x - worldX) < FIXED_GRID.CELL_SIZE && 
                Math.abs(tower.y - worldY) < FIXED_GRID.CELL_SIZE) {
                return false;
            }
        }
        
        // Verificar si no está en el camino
        if (isOnPath(worldX, worldY)) {
            return false;
        }
        
        return true;
    }, [gameState.towers, FIXED_GRID.CELL_SIZE, FIXED_GRID.COLS, FIXED_GRID.ROWS, isOnPath]);

    // Determinar el estilo del cursor basado en el estado actual
    const getCursorStyle = useCallback(() => {
        if (isPanning) return 'grabbing';
        if (!gameState.isPlacingStones) return 'crosshair';
        
        // En modo colocación de piedras, verificar si la posición actual es válida
        const worldX = cursorPosition.x + camera.x;
        const worldY = cursorPosition.y + camera.y;
        
        if (canPlaceTower(worldX, worldY)) {
            return 'copy'; // Cursor gris para colocación válida
        } else {
            return 'not-allowed'; // Cursor rojo para zona inválida
        }
    }, [isPanning, gameState.isPlacingStones, cursorPosition.x, cursorPosition.y, camera.x, camera.y, canPlaceTower]);

    // Removed unused isPointOnLine function

    // Colocar torre (solo piedras en fase de construcción)
    const placeTower = (worldX, worldY, type) => {
        // Solo permitir colocar piedras en fase de construcción
        if (gameState.state !== GAME_STATES.CONSTRUCTION || type !== 'stone') {
            return;
        }
        
        // Verificar límite de 5 piedras por fase
        if (gameState.stonesPlacedThisPhase >= 5) {
            console.log('Máximo de 5 piedras por fase de construcción');
            return;
        }
        
        const towerData = getTowerData(type);
        
        if (gameState.gold >= towerData.cost && canPlaceTower(worldX, worldY)) {
            const newTower = new Tower(worldX, worldY, type, towerData, gameState.currentConstructionPhase);
            
            // Crear una lista temporal de torres incluyendo la nueva
            const tempTowers = [...gameState.towers, newTower];
            
            // Verificar que la nueva torre no bloquee totalmente los checkpoints
            if (validateCheckpointConnectivity(tempTowers)) {
                setGameState(prev => {
                    const newStoneCount = prev.stonesPlacedThisPhase + 1;
                    return {
                        ...prev,
                        towers: [...prev.towers, newTower],
                        gold: prev.gold - towerData.cost,
                        stonesPlacedThisPhase: newStoneCount,
                        // Mantener el modo colocación activo hasta llegar a 5 piedras
                        selectedTowerType: newStoneCount >= 5 ? null : prev.selectedTowerType,
                        isPlacingStones: newStoneCount < 5 && prev.isPlacingStones
                    };
                });
            }
        }
    };

    // Función para seleccionar piedra y mostrar menú de mejora
    const selectStone = (stone, canvasX, canvasY) => {
        // Solo permitir seleccionar piedras de la fase actual de construcción que han colocado 5 piedras
        if (gameState.state === GAME_STATES.CONSTRUCTION && 
            stone.type === 'stone' && 
            stone.constructionPhase === gameState.currentConstructionPhase &&
            gameState.stonesPlacedThisPhase >= 5) {
            
            setGameState(prev => ({
                ...prev,
                selectedStone: stone,
                showUpgradeMenu: true,
                upgradeMenuPosition: { x: canvasX, y: canvasY }
            }));
        }
    };

    // Función para mejorar piedra a torre de ataque
    const upgradeStone = (upgradeType) => {
        if (!gameState.selectedStone || gameState.state !== GAME_STATES.CONSTRUCTION) return;
        
        const upgradeTowerData = getTowerData(upgradeType);
        if (gameState.gold < upgradeTowerData.cost) {
            return;
        }

        setGameState(prev => {
            const updatedTowers = prev.towers.map(tower => {
                if (tower === prev.selectedStone) {
                    // Crear nueva torre con los datos de mejora
                    const upgradedTower = new Tower(
                        tower.x, 
                        tower.y, 
                        upgradeType, 
                        upgradeTowerData, 
                        tower.constructionPhase
                    );
                    upgradedTower.canBeUpgraded = false; // Ya no se puede mejorar más
                    return upgradedTower;
                }
                return tower;
            });


            
            // Prepare enemies
            const enemyCount = 5 + prev.wave * 2;
            const enemyHealth = 50 + prev.wave * 10;
            const enemySpeed = 0.3 + prev.wave * 0.05;
            
            const newEnemies = [];
            for (let i = 0; i < enemyCount; i++) {
                const newEnemy = new Enemy(checkpoints, enemyHealth, enemySpeed, 10 + prev.wave * 2, updatedTowers);
                // Retrasar la aparición visual pero crear el enemigo con el estado correcto
                newEnemy.spawnDelay = i * 1000;
                newEnemy.hasSpawned = false;
                newEnemies.push(newEnemy);
            }
            
            // Cambiar a fase de ataque y comenzar oleada
            return {
                ...prev,
                towers: updatedTowers,
                gold: prev.gold - upgradeTowerData.cost,
                selectedStone: null,
                showUpgradeMenu: false,
                state: GAME_STATES.ATTACK,
                enemies: [...prev.enemies, ...newEnemies],
                enemiesSpawned: enemyCount,
                enemiesToSpawn: enemyCount,
                // MANTENER el contador de piedras de esta fase
                stonesPlacedThisPhase: prev.stonesPlacedThisPhase
            };
        });
    };

    // Manejar click en canvas
    const handleCanvasClick = (e) => {
        if (isPanning) return;
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // Convertir a coordenadas del mundo
        const worldX = canvasX + camera.x;
        const worldY = canvasY + camera.y;

        // Manejar click derecho para cancelar modo colocación
        if (e.button === 2) {
            if (gameState.isPlacingStones) {
                setGameState(prev => ({
                    ...prev,
                    isPlacingStones: false,
                    selectedTowerType: null
                }));
            }
            return;
        }
        
        // Verificar si se clickeó en una piedra existente
        const clickedStone = gameState.towers.find(tower => {
            const distance = Math.sqrt(Math.pow(tower.x - worldX, 2) + Math.pow(tower.y - worldY, 2));
            return distance <= 20; // Radio de detección
        });

        if (clickedStone) {
            // Si es una piedra, seleccionarla
            selectStone(clickedStone, canvasX, canvasY);
        } else {
            // Cerrar menú de mejora si está abierto
            if (gameState.showUpgradeMenu) {
                setGameState(prev => ({
                    ...prev,
                    selectedStone: null,
                    showUpgradeMenu: false
                }));
                return;
            }
            
            // Colocar nueva piedra si está en modo colocación
            if (gameState.isPlacingStones && gameState.selectedTowerType === 'stone') {
                const gridX = Math.floor(worldX / FIXED_GRID.CELL_SIZE) * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE / 2;
                const gridY = Math.floor(worldY / FIXED_GRID.CELL_SIZE) * FIXED_GRID.CELL_SIZE + FIXED_GRID.CELL_SIZE / 2;
                
                placeTower(gridX, gridY, gameState.selectedTowerType);
            }
        }
    };

    // Manejar movimiento del mouse para mostrar coordenadas y pan
    const handleMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // Actualizar posición del cursor
        setCursorPosition(prev => {
            if (prev.x !== canvasX || prev.y !== canvasY) {
                return { x: canvasX, y: canvasY };
            }
            return prev;
        });
        
        // Pan del mapa
        if (isPanning) {
            const deltaX = e.clientX - lastPanPosition.x;
            const deltaY = e.clientY - lastPanPosition.y;
            
            setCamera(prev => ({
                x: Math.max(0, Math.min(FIXED_GRID.TOTAL_WIDTH - canvasSize.width, prev.x - deltaX)),
                y: Math.max(0, Math.min(FIXED_GRID.TOTAL_HEIGHT - canvasSize.height, prev.y - deltaY))
            }));
            
            setLastPanPosition({ x: e.clientX, y: e.clientY });
        } else {
            // Mostrar coordenadas
            const coordinates = getGridCoordinates(canvasX, canvasY);
            canvas.title = `Casilla: ${coordinates}`;
        }
    }, [isPanning, lastPanPosition, canvasSize, getGridCoordinates, FIXED_GRID.TOTAL_WIDTH, FIXED_GRID.TOTAL_HEIGHT]);

    // Actualizar el estilo del cursor cuando cambien las dependencias relevantes
    useEffect(() => {
        const newCursorStyle = getCursorStyle();
        if (newCursorStyle !== cursorStyle) {
            setCursorStyle(newCursorStyle);
        }
    }, [getCursorStyle, cursorStyle]);

    // Manejar eventos de pan con botón del medio
    const handleMouseDown = useCallback((e) => {
        if (e.button === 1) { // Botón del medio
            e.preventDefault();
            setIsPanning(true);
            setLastPanPosition({ x: e.clientX, y: e.clientY });
        }
    }, []);

    const handleMouseUp = useCallback((e) => {
        if (e.button === 1 || isPanning) { // Botón del medio o si estaba haciendo pan
            setIsPanning(false);
        }
    }, [isPanning]);

    // Las oleadas se inician automáticamente al mejorar una piedra directamente en upgradeStone

    // Pausar/reanudar
    const togglePause = () => {
        setGameState(prev => ({
            ...prev,
            state: prev.state === GAME_STATES.PAUSED ? GAME_STATES.ATTACK : GAME_STATES.PAUSED
        }));
    };

    const toggleSpeed = () => {
        setGameState(prev => ({
            ...prev,
            speedMultiplier: prev.speedMultiplier === 1 ? 5 : 1
        }));
    };

    // Reiniciar juego
    const resetGame = () => {
        setGameState({
            state: GAME_STATES.CONSTRUCTION,
            health: 100,
            gold: 500,
            wave: 1,
            selectedTowerType: null,
            towers: [],
            enemies: [],
            projectiles: [],
            enemiesSpawned: 0,
            enemiesToSpawn: 0,
            currentConstructionPhase: 1,
            stonesPlacedThisPhase: 0,
            selectedStone: null,
            showUpgradeMenu: false,
            upgradeMenuPosition: { x: 0, y: 0 },
            isPlacingStones: false,
            speedMultiplier: 1
        });
    };

    // 🚦 SEMÁFORO PARA CONTROL DE CONCURRENCIA DE SALUD
    const healthSemaphore = useRef({
        count: 1,           // Semáforo binario (1 = disponible, 0 = ocupado)
        waitingQueue: [],   // Cola de operaciones esperando
        isProcessing: false // Flag para evitar procesamiento múltiple
    });

    // Función para adquirir semáforo (P operation)
    const acquireHealthSemaphore = useCallback(() => {
        return new Promise((resolve) => {
            if (healthSemaphore.current.count > 0) {
                // Recurso disponible - adquirir inmediatamente
                healthSemaphore.current.count--;
                console.log('🟢 Health semaphore ACQUIRED (immediate)');
                resolve();
            } else {
                // Recurso ocupado - agregar a cola de espera
                healthSemaphore.current.waitingQueue.push(resolve);
                console.log(`🟡 Health semaphore QUEUED (waiting: ${healthSemaphore.current.waitingQueue.length})`);
            }
        });
    }, []);

    // Función para liberar semáforo (V operation)
    const releaseHealthSemaphore = useCallback(() => {
        if (healthSemaphore.current.waitingQueue.length > 0) {
            // Hay procesos esperando - despertar el siguiente
            const nextResolve = healthSemaphore.current.waitingQueue.shift();
            console.log(`🟠 Health semaphore TRANSFERRED (remaining: ${healthSemaphore.current.waitingQueue.length})`);
            nextResolve();
        } else {
            // No hay procesos esperando - liberar recurso
            healthSemaphore.current.count++;
            console.log('🔴 Health semaphore RELEASED');
        }
    }, []);

    // Función crítica para modificar salud con protección de semáforo
    const modifyPlayerHealth = useCallback(async (damageAmount, source) => {
        // 🚦 P(semaphore) - Adquirir recurso
        await acquireHealthSemaphore();
        
        try {
            // 🔒 SECCIÓN CRÍTICA - Modificar salud del jugador
            return new Promise((resolve) => {
                setGameState(prev => {
                    const oldHealth = prev.health;
                    const newHealth = Math.max(0, prev.health - damageAmount);
                    const actualDamage = oldHealth - newHealth;
                    
                    console.log(`💥 ${source}: ${actualDamage} damage applied. Health: ${oldHealth} -> ${newHealth}`);
                    
                    const newState = {
                        ...prev,
                        health: newHealth
                    };
                    
                    // Verificar Game Over
                    if (newHealth <= 0) {
                        newState.state = GAME_STATES.GAME_OVER;
                        console.log('💀 Game Over! Health reached 0');
                    }
                    
                    resolve(newState);
                    return newState;
                });
            });
        } finally {
            // 🚦 V(semaphore) - Liberar recurso
            setTimeout(() => {
                releaseHealthSemaphore();
            }, 0);
        }
    }, [acquireHealthSemaphore, releaseHealthSemaphore]);

    // Procesador de lote para múltiples operaciones de daño
    const processBatchDamage = useCallback(async (damageOperations) => {
        if (damageOperations.length === 0) return;
        
        // 🚦 P(semaphore) - Adquirir recurso para operación de lote
        await acquireHealthSemaphore();
        
        try {
            // 🔒 SECCIÓN CRÍTICA - Aplicar todo el daño de una vez
            return new Promise((resolve) => {
                setGameState(prev => {
                    const initialHealth = prev.health;
                    const totalDamage = damageOperations.reduce((sum, op) => sum + op.amount, 0);
                    const newHealth = Math.max(0, prev.health - totalDamage);
                    
                    console.log(`💥💥 BATCH DAMAGE: ${damageOperations.length} enemies, ${totalDamage} total damage`);
                    console.log(`    Health: ${initialHealth} -> ${newHealth}`);
                    
                    // Log individual damages
                    damageOperations.forEach(op => {
                        console.log(`    - ${op.source}: ${op.amount} damage`);
                    });
                    
                    const newState = {
                        ...prev,
                        health: newHealth
                    };
                    
                    // Verificar Game Over
                    if (newHealth <= 0) {
                        newState.state = GAME_STATES.GAME_OVER;
                        console.log('💀 Game Over! Health reached 0');
                    }
                    
                    resolve(newState);
                    return newState;
                });
            });
        } finally {
            // 🚦 V(semaphore) - Liberar recurso
            setTimeout(() => {
                releaseHealthSemaphore();
            }, 0);
        }
    }, [acquireHealthSemaphore, releaseHealthSemaphore]);

    // Game loop
    const update = useCallback(() => {
        setGameState(prev => {
            if (prev.state !== GAME_STATES.ATTACK) {
                return prev;
            }

            const newState = { ...prev };
            
            // 🚦 ACTUALIZAR ENEMIGOS CON SEMÁFORO PARA DAÑO
            const enemiesToRemove = [];
            const damageOperations = []; // Acumular operaciones de daño
            
            // Fase 1: Actualizar enemigos y recopilar daños
            newState.enemies.forEach((enemy, index) => {
                enemy.update(newState.speedMultiplier);
                
                if (enemy.reachedEnd) {
                    const damageToPlayer = enemy.calculateDamageToPlayer();
                    damageOperations.push({
                        amount: damageToPlayer,
                        source: `Enemy ${enemy.id || index}`
                    });
                    enemiesToRemove.push(index);
                } else if (enemy.health <= 0) {
                    newState.gold += enemy.reward;
                    enemiesToRemove.push(index);
                }
            });
            
            // Fase 2: Aplicar daños usando semáforo (asíncrono)
            if (damageOperations.length > 0) {
                processBatchDamage(damageOperations);
            }
            
            // Fase 3: Remover enemigos
            enemiesToRemove.reverse().forEach(index => {
                newState.enemies.splice(index, 1);
            });
            
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
            
            // Verificar si la oleada terminó (todos los enemigos eliminados o llegaron al final)
            const allEnemiesSpawned = newState.enemiesSpawned >= newState.enemiesToSpawn;
            if (newState.enemies.length === 0 && newState.state === GAME_STATES.ATTACK && allEnemiesSpawned) {
                // Pasar a la siguiente fase de construcción
                // Esto ocurre cuando todos los enemigos han sido eliminados (por torres) o llegaron al final
                newState.wave++;
                newState.state = GAME_STATES.CONSTRUCTION;
                newState.currentConstructionPhase++;
                newState.stonesPlacedThisPhase = 0;
                newState.gold += 50;
                newState.selectedTowerType = null;
            }
            
            return newState;
        });
    }, [processBatchDamage]);

    // Refs para acceder al estado actual sin crear dependencias
    const gameStateRef = useRef(gameState);
    const canvasSizeRef = useRef(canvasSize);
    const cameraRef = useRef(camera);
    
    // Actualizar refs cuando cambien los valores
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);
    
    useEffect(() => {
        canvasSizeRef.current = canvasSize;
    }, [canvasSize]);
    
    useEffect(() => {
        cameraRef.current = camera;
    }, [camera]);

    // Dibujar juego
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // Obtener valores actuales de los refs
        const currentGameState = gameStateRef.current;
        const currentCanvasSize = canvasSizeRef.current;
        const currentCamera = cameraRef.current;
        
        ctx.clearRect(0, 0, currentCanvasSize.width, currentCanvasSize.height);
        
        // Guardar el estado del contexto y aplicar transformación de cámara
        ctx.save();
        ctx.translate(-currentCamera.x, -currentCamera.y);
        
        // Calcular qué parte del grid necesitamos dibujar
        const startCol = Math.max(0, Math.floor(currentCamera.x / FIXED_GRID.CELL_SIZE));
        const endCol = Math.min(FIXED_GRID.COLS, Math.ceil((currentCamera.x + currentCanvasSize.width) / FIXED_GRID.CELL_SIZE));
        const startRow = Math.max(0, Math.floor(currentCamera.y / FIXED_GRID.CELL_SIZE));
        const endRow = Math.min(FIXED_GRID.ROWS, Math.ceil((currentCamera.y + currentCanvasSize.height) / FIXED_GRID.CELL_SIZE));
        
        // Dibujar fondo gris claro para todas las celdas normales
        ctx.fillStyle = '#949494';
        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                const x = col * FIXED_GRID.CELL_SIZE;
                const y = row * FIXED_GRID.CELL_SIZE;
                ctx.fillRect(x, y, FIXED_GRID.CELL_SIZE, FIXED_GRID.CELL_SIZE);
            }
        }
        
        // Dibujar celdas especiales encima del fondo normal
        drawSpecialCells(ctx);
        
        // Dibujar números en celdas específicas
        drawCellNumbers(ctx);
        
        // Dibujar cuadrícula con bordes negros
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        
        // Líneas verticales
        for (let col = startCol; col <= endCol; col++) {
            const x = col * FIXED_GRID.CELL_SIZE;
            ctx.beginPath();
            ctx.moveTo(x, startRow * FIXED_GRID.CELL_SIZE);
            ctx.lineTo(x, endRow * FIXED_GRID.CELL_SIZE);
            ctx.stroke();
        }
        
        // Líneas horizontales
        for (let row = startRow; row <= endRow; row++) {
            const y = row * FIXED_GRID.CELL_SIZE;
            ctx.beginPath();
            ctx.moveTo(startCol * FIXED_GRID.CELL_SIZE, y);
            ctx.lineTo(endCol * FIXED_GRID.CELL_SIZE, y);
            ctx.stroke();
        }
        
        // Ya no dibujamos el camino violeta - los enemigos siguen los checkpoints numerados
        
        // Dibujar entidades usando el estado actual
        currentGameState.towers.forEach(tower => tower.draw(ctx));
        currentGameState.enemies.forEach(enemy => enemy.draw(ctx));
        currentGameState.projectiles.forEach(projectile => projectile.draw(ctx));
        
        // Dibujar indicador de piedra seleccionada
        if (currentGameState.selectedStone) {
            ctx.strokeStyle = '#10b981'; // Verde claro
            ctx.lineWidth = 3;
            ctx.strokeRect(currentGameState.selectedStone.x - 20, currentGameState.selectedStone.y - 20, 40, 40);
        }
        
        // Restaurar el contexto para las etiquetas del grid
        ctx.restore();
        
        // Dibujar etiquetas del grid (sin transformación de cámara)
        drawGridLabels(ctx);
        
        // Dibujar UI de juego
        if (currentGameState.state === GAME_STATES.GAME_OVER) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, currentCanvasSize.width, currentCanvasSize.height);
            
            ctx.fillStyle = 'white';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', currentCanvasSize.width / 2, currentCanvasSize.height / 2);
        } else if (currentGameState.state === GAME_STATES.PAUSED) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, currentCanvasSize.width, currentCanvasSize.height);
            
            ctx.fillStyle = 'white';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSADO', currentCanvasSize.width / 2, currentCanvasSize.height / 2);
        }
    }, [FIXED_GRID.CELL_SIZE, FIXED_GRID.COLS, FIXED_GRID.ROWS, drawSpecialCells, drawCellNumbers, drawGridLabels]);

    // Game loop principal con useRef para evitar recreaciones
    const updateRef = useRef(update);
    const drawRef = useRef(draw);
    
    // Actualizar las referencias cuando cambien las funciones
    useEffect(() => {
        // console.log('🔄 Update/Draw functions changed - this should happen rarely');
        updateRef.current = update;
        drawRef.current = draw;
    }, [update, draw]);

    useEffect(() => {
        const gameLoop = () => {
            updateRef.current();
            drawRef.current();
            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };
        
        gameLoop();
        
        return () => {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
        };
    }, []); // Empty dependency array - using refs for stable loop

    useEffect(() => {
        const handleResize = () => {
            setCanvasSize({ width: window.innerWidth - getSidebarWidth(), height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Agregar event listeners para mouse
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const preventContext = (e) => e.preventDefault();
            
            canvas.addEventListener('mousemove', handleMouseMove);
            canvas.addEventListener('mousedown', handleMouseDown);
            canvas.addEventListener('mouseup', handleMouseUp);
            canvas.addEventListener('contextmenu', preventContext);
            
            // También agregar listeners globales para cuando el mouse sale del canvas
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('mouseleave', handleMouseUp);
            
            return () => {
                canvas.removeEventListener('mousemove', handleMouseMove);
                canvas.removeEventListener('mousedown', handleMouseDown);
                canvas.removeEventListener('mouseup', handleMouseUp);
                canvas.removeEventListener('contextmenu', preventContext);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('mouseleave', handleMouseUp);
            };
        }
    }, [handleMouseMove, handleMouseDown, handleMouseUp]);



    return (
        <div className="fullscreen-game-root">
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onMouseDown={handleCanvasClick}
                className="fullscreen-canvas"
                style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    width: `${canvasSize.width}px`, 
                    height: '100vh', 
                    zIndex: 1,
                    cursor: cursorStyle
                }}
            />
            <div className="sidebar">
                {/* Estadísticas del juego */}
                <div className="sidebar-stats">
                    <div className="sidebar-stat" title={`Vida: ${gameState.health}`} style={{
                        backgroundColor: gameState.health < 100 ? '#dc2626' : 'transparent',
                        color: gameState.health < 100 ? 'white' : 'inherit',
                        fontWeight: gameState.health < 100 ? 'bold' : 'normal',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: gameState.health < 100 ? '2px solid #ef4444' : 'none'
                    }}>
                        <span role="img" aria-label="vida">❤️</span>
                        <span>{gameState.health}/100</span>
                    </div>
                    <div className="sidebar-stat" title={`Oro: ${gameState.gold}`}>
                        <span role="img" aria-label="oro">💰</span>
                        <span>{gameState.gold}</span>
                    </div>
                    <div className="sidebar-stat" title={`Oleada: ${gameState.wave}`}>
                        <span role="img" aria-label="oleada">🌊</span>
                        <span>{gameState.wave}</span>
                    </div>
                    <div className="sidebar-stat" title={`Enemigos en mapa: ${gameState.enemies.length}`}>
                        <span role="img" aria-label="enemigos">👹</span>
                        <span>{gameState.enemies.length}</span>
                    </div>
                </div>

                {/* Botón de piedras */}
                {gameState.state === GAME_STATES.CONSTRUCTION && (
                    <div className="sidebar-section">
                        <button 
                            className={`sidebar-tower-btn ${gameState.isPlacingStones ? 'selected' : ''}`}
                            onClick={toggleStonePlacement}
                            disabled={gameState.gold < 10 || gameState.stonesPlacedThisPhase >= 5}
                            title={gameState.stonesPlacedThisPhase < 5 ? `Piedra - $10 (${gameState.stonesPlacedThisPhase}/5)` : 'Máximo 5 piedras por fase'}
                        >
                            <div className="tower-icon stone-tower">🪨</div>
                            <div className="tower-cost">$10</div>
                            <div className="stone-counter">{gameState.stonesPlacedThisPhase}/5</div>
                        </button>
                    </div>
                )}

                {/* Controles del juego */}
                <div className="sidebar-section">
                    <div className="sidebar-controls">
                        <button 
                            className={`sidebar-control-btn speed ${gameState.speedMultiplier === 5 ? 'active' : ''}`}
                            onClick={toggleSpeed}
                            disabled={gameState.state === GAME_STATES.CONSTRUCTION || gameState.state === GAME_STATES.GAME_OVER}
                            title={gameState.speedMultiplier === 1 ? "Acelerar (5x)" : "Velocidad normal (1x)"}
                        >
                            <span>{gameState.speedMultiplier === 1 ? "⚡" : "🐌"}</span>
                        </button>
                        <button 
                            className="sidebar-control-btn pause"
                            onClick={togglePause} 
                            disabled={gameState.state === GAME_STATES.CONSTRUCTION || gameState.state === GAME_STATES.GAME_OVER}
                            title="Pausar/Reanudar"
                        >
                            <span>⏸️</span>
                        </button>
                        <button 
                            className="sidebar-control-btn reset"
                            onClick={resetGame}
                            title="Reiniciar"
                        >
                            <span>🔄</span>
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Menú de mejora de piedras */}
            {gameState.showUpgradeMenu && (
                <div 
                    className="upgrade-menu"
                    style={{
                        position: 'fixed',
                        left: gameState.upgradeMenuPosition.x + 10,
                        top: gameState.upgradeMenuPosition.y - 80,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        border: '2px solid #10b981',
                        borderRadius: '8px',
                        padding: '10px',
                        zIndex: 1000,
                        display: 'flex',
                        gap: '5px'
                    }}
                >
                    {['basic', 'strong', 'fast'].map(upgradeType => {
                        const towerData = getTowerData(upgradeType);
                        const canAfford = gameState.gold >= towerData.cost;
                        return (
                            <button
                                key={upgradeType}
                                onClick={() => upgradeStone(upgradeType)}
                                disabled={!canAfford}
                                style={{
                                    padding: '8px 12px',
                                    backgroundColor: canAfford ? '#374151' : '#6b7280',
                                    color: canAfford ? 'white' : '#9ca3af',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: canAfford ? 'pointer' : 'not-allowed',
                                    fontSize: '12px'
                                }}
                                title={`${towerData.name} - $${towerData.cost}`}
                            >
                                <div>{towerData.name}</div>
                                <div>${towerData.cost}</div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Game;

