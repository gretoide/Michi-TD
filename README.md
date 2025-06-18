# Michi-TD

Un juego de **Tower Defense** desarrollado con HTML5, CSS3 y JavaScript usando Canvas para el renderizado.

## 🎮 Características del Juego

- **3 tipos de torres** con diferentes características:
  - **Torre Básica**: Equilibrada en daño y velocidad (50 oro)
  - **Torre Fuerte**: Alto daño, disparo lento (100 oro)
  - **Torre Rápida**: Bajo daño, disparo rápido (75 oro)

- **Sistema de oleadas** progresivo con enemigos cada vez más fuertes
- **Interfaz moderna** con gradientes y animaciones CSS
- **Mecánicas básicas** de tower defense:
  - Colocación de torres en cuadrícula
  - Sistema de pathfinding para enemigos
  - Proyectiles con seguimiento
  - Sistema de economía (oro/recursos)
  - Barras de vida para enemigos

## 🚀 Cómo Jugar

1. Abre `index.html` en tu navegador
2. Selecciona un tipo de torre haciendo clic en los botones del panel lateral
3. Haz clic en el canvas para colocar la torre (no puedes colocarlas en el camino)
4. Presiona "Iniciar Oleada" para comenzar
5. Defiende tu base - si tu vida llega a 0, pierdes
6. Gana oro eliminando enemigos para comprar más torres

## 🛠️ Estructura del Proyecto

```
Michi-TD/
├── index.html      # Estructura HTML principal
├── styles.css      # Estilos y diseño responsivo
├── game.js         # Lógica principal del juego
├── entities.js     # Clases para torres, enemigos y proyectiles
└── README.md       # Este archivo
```

## ⚙️ Configuración Técnica

- **Canvas**: 800x600 píxeles
- **Cuadrícula**: 40x40 píxeles por celda
- **FPS objetivo**: 60 FPS
- **Estados del juego**: Esperando, Jugando, Pausado, Game Over

## 🎯 Próximas Mejoras

- [ ] Más tipos de torres (torres de hielo, explosivas, etc.)
- [ ] Diferentes tipos de enemigos (voladores, blindados, etc.)
- [ ] Sistema de mejoras para torres
- [ ] Efectos de sonido y música
- [ ] Mapas alternativos
- [ ] Sistema de puntuaciones
- [ ] Guardar/cargar partidas

## 🤝 Contribuir

Este es un proyecto de aprendizaje. Siéntete libre de hacer fork y experimentar con nuevas características.

---

**¡Disfruta defendiendo tu territorio!** 🏰