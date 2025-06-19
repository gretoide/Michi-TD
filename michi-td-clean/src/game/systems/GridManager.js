/**
 * GridManager - Sistema de gestión del grid
 * Centraliza toda la lógica relacionada con el grid, coordenadas y pathfinding
 */
export class GridManager {
    constructor(config = {}) {
        this.gridSize = config.gridSize || 37;
        this.cellSize = config.cellSize || 20;
        this.canvasWidth = config.canvasWidth || 1110;
        this.canvasHeight = config.canvasHeight || 740;
        
        // Checkpoints del camino
        this.checkpoints = config.checkpoints || [
            { x: 0, y: 350, label: '1' },
            { x: 200, y: 350, label: '2' },
            { x: 200, y: 150, label: '3' },
            { x: 600, y: 150, label: '4' },
            { x: 600, y: 550, label: '5' },
            { x: 1110, y: 550, label: 'End' }
        ];
        
        // Cache para pathfinding
        this.pathCache = new Map();
        this.blockedCells = new Set();
    }

    /**
     * Convertir coordenadas de pantalla a coordenadas de grid
     */
    screenToGrid(screenX, screenY, camera = { x: 0, y: 0 }) {
        const worldX = screenX + camera.x;
        const worldY = screenY + camera.y;
        
        const gridX = Math.floor(worldX / this.cellSize);
        const gridY = Math.floor(worldY / this.cellSize);
        
        return { x: gridX, y: gridY };
    }

    /**
     * Convertir coordenadas de grid a coordenadas de mundo
     */
    gridToWorld(gridX, gridY) {
        return {
            x: gridX * this.cellSize + this.cellSize / 2,
            y: gridY * this.cellSize + this.cellSize / 2
        };
    }

    /**
     * Convertir coordenadas de grid a nomenclatura Excel (A1, B2, etc.)
     */
    gridToExcel(gridX, gridY) {
        const col = this.numberToColumnName(gridX + 1);
        const row = gridY + 1;
        return `${col}${row}`;
    }

    /**
     * Convertir nomenclatura Excel a coordenadas de grid
     */
    excelToGrid(excelNotation) {
        const match = excelNotation.match(/^([A-Z]+)(\d+)$/);
        if (!match) return null;
        
        const col = this.columnNameToNumber(match[1]) - 1;
        const row = parseInt(match[2]) - 1;
        
        if (col < 0 || col >= this.gridSize || row < 0 || row >= this.gridSize) {
            return null;
        }
        
        return { x: col, y: row };
    }

    /**
     * Convertir número a letra de columna Excel
     */
    numberToColumnName(num) {
        let result = '';
        while (num > 0) {
            num--;
            result = String.fromCharCode(65 + (num % 26)) + result;
            num = Math.floor(num / 26);
        }
        return result;
    }

    /**
     * Convertir letra de columna Excel a número
     */
    columnNameToNumber(name) {
        let result = 0;
        for (let i = 0; i < name.length; i++) {
            result = result * 26 + (name.charCodeAt(i) - 64);
        }
        return result;
    }

    /**
     * Verificar si una posición está dentro del grid
     */
    isValidGridPosition(gridX, gridY) {
        return gridX >= 0 && gridX < this.gridSize && 
               gridY >= 0 && gridY < this.gridSize;
    }

    /**
     * Verificar si se puede colocar una torre en una posición
     */
    canPlaceTower(worldX, worldY, existingTowers = []) {
        const gridPos = this.screenToGrid(worldX, worldY);
        
        // Verificar límites del grid
        if (!this.isValidGridPosition(gridPos.x, gridPos.y)) {
            return false;
        }

        // Verificar si ya hay una torre en esa posición
        const cellKey = `${gridPos.x},${gridPos.y}`;
        if (this.blockedCells.has(cellKey)) {
            return false;
        }

        // Verificar colisiones con torres existentes
        const worldPos = this.gridToWorld(gridPos.x, gridPos.y);
        for (const tower of existingTowers) {
            const distance = Math.sqrt(
                Math.pow(tower.x - worldPos.x, 2) + 
                Math.pow(tower.y - worldPos.y, 2)
            );
            if (distance < this.cellSize) {
                return false;
            }
        }

        // Verificar que no bloquee completamente el camino
        return this.wouldAllowPath(gridPos.x, gridPos.y, existingTowers);
    }

    /**
     * Verificar si colocar una torre permitiría que siga existiendo un camino
     */
    wouldAllowPath(gridX, gridY, existingTowers) {
        // Temporalmente agregar la nueva torre al conjunto de bloqueadas
        const cellKey = `${gridX},${gridY}`;
        this.blockedCells.add(cellKey);
        
        // Actualizar celdas bloqueadas con torres existentes
        this.updateBlockedCells(existingTowers);
        
        // Intentar encontrar un camino
        const path = this.findPath();
        
        // Remover la torre temporal
        this.blockedCells.delete(cellKey);
        
        return path !== null;
    }

    /**
     * Actualizar conjunto de celdas bloqueadas
     */
    updateBlockedCells(towers) {
        // Limpiar celdas bloqueadas anteriores (excepto las temporales)
        const tempBlocked = new Set();
        this.blockedCells.forEach(key => {
            if (key.includes('temp_')) {
                tempBlocked.add(key);
            }
        });
        this.blockedCells = tempBlocked;

        // Agregar celdas bloqueadas por torres
        towers.forEach(tower => {
            if (tower.blocksPath && tower.blocksPath()) {
                const gridPos = this.screenToGrid(tower.x, tower.y);
                const cellKey = `${gridPos.x},${gridPos.y}`;
                this.blockedCells.add(cellKey);
            }
        });
    }

    /**
     * Algoritmo A* para pathfinding
     */
    findPath(startCheckpoint = 0, endCheckpoint = null) {
        if (endCheckpoint === null) {
            endCheckpoint = this.checkpoints.length - 1;
        }

        const start = this.checkpoints[startCheckpoint];
        const end = this.checkpoints[endCheckpoint];
        
        if (!start || !end) return null;

        const startGrid = this.screenToGrid(start.x, start.y);
        const endGrid = this.screenToGrid(end.x, end.y);

        // Cache key para evitar recálculos
        const cacheKey = `${startGrid.x},${startGrid.y}-${endGrid.x},${endGrid.y}-${this.blockedCells.size}`;
        if (this.pathCache.has(cacheKey)) {
            return this.pathCache.get(cacheKey);
        }

        const path = this.aStar(startGrid, endGrid);
        
        // Convertir a coordenadas de mundo
        const worldPath = path ? path.map(gridPos => this.gridToWorld(gridPos.x, gridPos.y)) : null;
        
        // Cachear el resultado
        this.pathCache.set(cacheKey, worldPath);
        
        return worldPath;
    }

    /**
     * Implementación del algoritmo A*
     */
    aStar(start, goal) {
        const openSet = [start];
        const closedSet = new Set();
        const gScore = new Map();
        const fScore = new Map();
        const cameFrom = new Map();

        const getKey = (pos) => `${pos.x},${pos.y}`;
        
        gScore.set(getKey(start), 0);
        fScore.set(getKey(start), this.heuristic(start, goal));

        while (openSet.length > 0) {
            // Obtener nodo con menor fScore
            let current = openSet[0];
            let currentIndex = 0;
            
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(getKey(openSet[i])) < fScore.get(getKey(current))) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }

            // Remover current del openSet
            openSet.splice(currentIndex, 1);
            closedSet.add(getKey(current));

            // Si llegamos al goal
            if (current.x === goal.x && current.y === goal.y) {
                return this.reconstructPath(cameFrom, current);
            }

            // Examinar vecinos
            const neighbors = this.getNeighbors(current);
            
            for (const neighbor of neighbors) {
                const neighborKey = getKey(neighbor);
                
                if (closedSet.has(neighborKey)) continue;
                if (this.blockedCells.has(neighborKey)) continue;

                const tentativeGScore = gScore.get(getKey(current)) + 1;

                if (!openSet.some(pos => pos.x === neighbor.x && pos.y === neighbor.y)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= gScore.get(neighborKey)) {
                    continue;
                }

                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));
            }
        }

        return null; // No se encontró camino
    }

    /**
     * Obtener vecinos de una celda
     */
    getNeighbors(pos) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 }, // Norte
            { x: 1, y: 0 },  // Este
            { x: 0, y: 1 },  // Sur
            { x: -1, y: 0 }  // Oeste
        ];

        for (const dir of directions) {
            const neighbor = { x: pos.x + dir.x, y: pos.y + dir.y };
            if (this.isValidGridPosition(neighbor.x, neighbor.y)) {
                neighbors.push(neighbor);
            }
        }

        return neighbors;
    }

    /**
     * Función heurística para A* (distancia Manhattan)
     */
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * Reconstruir camino desde el resultado de A*
     */
    reconstructPath(cameFrom, current) {
        const path = [current];
        const getKey = (pos) => `${pos.x},${pos.y}`;
        
        while (cameFrom.has(getKey(current))) {
            current = cameFrom.get(getKey(current));
            path.unshift(current);
        }
        
        return path;
    }

    /**
     * Obtener checkpoints del juego
     */
    getCheckpoints() {
        return this.checkpoints;
    }

    /**
     * Limpiar cache de pathfinding
     */
    clearPathCache() {
        this.pathCache.clear();
    }

    /**
     * Dibujar grid en el canvas
     */
    drawGrid(ctx, camera) {
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.3;

        // Líneas verticales
        for (let x = 0; x <= this.canvasWidth; x += this.cellSize) {
            const screenX = x - camera.x;
            ctx.beginPath();
            ctx.moveTo(screenX, -camera.y);
            ctx.lineTo(screenX, this.canvasHeight - camera.y);
            ctx.stroke();
        }

        // Líneas horizontales
        for (let y = 0; y <= this.canvasHeight; y += this.cellSize) {
            const screenY = y - camera.y;
            ctx.beginPath();
            ctx.moveTo(-camera.x, screenY);
            ctx.lineTo(this.canvasWidth - camera.x, screenY);
            ctx.stroke();
        }

        ctx.globalAlpha = 1.0;
    }

    /**
     * Dibujar checkpoints
     */
    drawCheckpoints(ctx, camera) {
        this.checkpoints.forEach(checkpoint => {
            const screenX = checkpoint.x - camera.x;
            const screenY = checkpoint.y - camera.y;

            // Dibujar checkpoint
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 15, 0, Math.PI * 2);
            ctx.fill();

            // Dibujar número
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(checkpoint.label, screenX, screenY + 4);
        });
    }
} 