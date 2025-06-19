# 🏰 Michi Tower Defense

Un juego de defensa de torres estratégico desarrollado en React con Canvas rendering y sistema de fases de construcción.

## 🎮 Características Principales

### 🏗️ Sistema de Fases
- **Fase de Construcción**: Coloca hasta 5 piedras estratégicamente por $10 cada una
- **Fase de Ataque**: Las piedras se convierten en torres defensivas automáticamente

### 🪨 Torres y Piedras
- **Piedras**: Bloqueadores básicos que se colocan en la fase de construcción ($10)
- **Torre Básica**: Daño moderado, alcance 80px, disparo cada 1s ($50)
- **Torre Fuerte**: Alto daño, alcance 70px, disparo cada 1.5s ($100)  
- **Torre Rápida**: Daño rápido, alcance 90px, disparo cada 0.5s ($75)

### 🗺️ Sistema de Grid Avanzado
- **Grid 37x37**: Nomenclatura tipo Excel (A1-AK37)
- **Cámara móvil**: Pan con botón del medio, coordenadas en tiempo real
- **Checkpoints numerados**: Los enemigos siguen rutas del 1 al 5
- **Zonas especiales**: Áreas grises y doradas con funciones específicas

### 👹 Sistema de Oleadas Dinámico
- **Oleadas progresivas**: Más enemigos y vida por oleada
- **Spawning inteligente**: Enemigos aparecen con retrasos escalados
- **Pathfinding A***: Los enemigos recalculan rutas cuando se bloquean

### ⚡ Controles Avanzados
- **Velocidad variable**: Modo normal (1x) y acelerado (5x)
- **Pausa inteligente**: Solo en fase de ataque
- **Reinicio completo**: Vuelve a la oleada 1

## 🚀 Cómo jugar

### Fase de Construcción
1. **Planifica tu defensa**: Estudia el mapa y identifica los checkpoints numerados (1-5)
2. **Coloca piedras**: Haz clic en "🪨" y coloca hasta 5 piedras por $10 cada una
3. **Posicionamiento estratégico**: Las piedras bloquean el paso pero no pueden ir en zonas grises
4. **Mejora a torre**: Una vez colocadas las 5 piedras, haz clic en cualquier piedra para convertirla en torre de ataque

### Fase de Ataque
1. **Comienza automáticamente**: Al mejorar una piedra se inicia la oleada
2. **Observa el combate**: Las torres disparan automáticamente a enemigos en rango
3. **Gestiona recursos**: Gana oro eliminando enemigos, pierde vida si llegan al final
4. **Acelera el tiempo**: Usa ⚡ para ver la acción 5x más rápido

### Controles del Canvas
- **Click izquierdo**: Colocar piedra / Seleccionar piedra para mejorar
- **Click derecho**: Cancelar modo colocación
- **Botón del medio + arrastrar**: Mover cámara por el mapa
- **Hover**: Ver coordenadas de la casilla (ej: A5, S19, AG37)

## 💻 Desarrollo local

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo  
npm start

# Build para producción
npm run build
```

## 🌐 Despliegue en Vercel

Este proyecto está configurado para desplegarse automáticamente en Vercel.

1. Conecta tu repositorio a Vercel
2. Vercel detectará automáticamente la configuración de React
3. El juego estará disponible en tu dominio de Vercel

## 🛠️ Tecnologías

- **React** - Framework principal con hooks avanzados
- **Canvas API** - Rendering optimizado del juego
- **Algoritmo A*** - Pathfinding inteligente para enemigos
- **Sistema de Semáforos** - Prevención de race conditions en daño
- **CSS3** - Estilos y animaciones responsivas
- **Create React App** - Configuración inicial
- **Vercel** - Despliegue

## 🎯 Estrategias de Juego

- **Embudo de torres**: Crea cuellos de botella para maximizar el daño
- **Balance económico**: No gastes todo el oro en una sola oleada
- **Torres especializadas**: Combina torres rápidas y fuertes según la situación
- **Control del mapa**: Usa las 5 piedras para crear la ruta más larga posible

## 📱 Compatibilidad

- ✅ Chrome, Firefox, Safari, Edge
- ✅ Desktop (recomendado para mejor control de cámara)
- ✅ Móvil (funcional, controles táctiles limitados)
- ✅ Responsive design

---

Hecho con ❤️ usando React, Canvas y mucha estrategia
