# Michi Tower Defense

Juego tipo Tower Defense hecho en React, inspirado en Gem TD, con enfoque en visuales modernos y jugabilidad estratégica.

## Tecnologías
- React + JavaScript (ES6+)
- CSS moderno
- Vercel (deploy)

## Estructura Modular Propuesta

```
src/
├── assets/                 # Imágenes, sonidos, fuentes (si hay)
│   ├── sprites/
│   └── sounds/
│
├── components/             # React components (solo UI)
│   ├── HUD/
│   │   ├── TopBar.js
│   │   ├── TowerMenu.js
│   │   └── Controls.js
│   └── Game/
│       └── GameCanvas.js   # Solo el canvas embebido y resize
│
├── core/                   # Lógica del juego (motor propio)
│   ├── GameLoop.js         # Loop de animación, timing, pausas
│   ├── EntityManager.js    # Manejo y updates de torres, enemigos, proyectiles
│   ├── Pathfinding.js      # Lógica de caminos
│   ├── Spawner.js          # Oleadas, enemigos, intervalos
│   └── Upgrades.js         # Mejora de torres, combinaciones
│
├── entities/               # Clases individuales
│   ├── Enemy.js
│   ├── Tower.js
│   ├── Projectile.js
│   └── Grid.js             # Opcional para mapa y celdas
│
├── utils/                  # Funciones generales
│   ├── math.js
│   └── collision.js
│
├── App.js
├── index.js
└── styles/                 # CSS o Tailwind si usan
    ├── App.css
    └── index.css
```

## Etapas de Desarrollo

1. **Modularización:** Separar lógica, render y entidades en carpetas.
2. **Estética y UX:** Mejorar HUD, efectos visuales, fuente custom.
3. **Mecánicas:** Tipos de torres, mejoras, enemigos variados, oleadas escalables.
4. **Pathfinding (opcional):** Maze-building o path predefinido.
5. **Pulido visual:** Sprites, efectos, partículas, HUD responsivo.
6. **UX Final:** Sonidos, animaciones, pantallas de game over/victoria, puntaje.

## Organización de Trabajo
- Ramas: `main`, `dev`, `feature/nombre`.
- Pull Requests para revisión.
- División de features por carpeta/archivo.
- Comentarios TODO/@nombre para notas internas.

---
¡Listo para escalar y trabajar en equipo! 