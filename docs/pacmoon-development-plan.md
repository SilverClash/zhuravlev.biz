# Pacmoon Game Development Plan

## Overview

Build a retro Pacmoon clone as a standalone page on a SvelteKit website using TypeScript and HTML5 Canvas.

**Estimated Effort:**
- First playable (one level): 1–2 days
- Polish (touch, sounds, multiple levels): 2–4 days

---

## File Architecture

```
src/
  routes/
    pacmoon/
      +page.svelte                      # Game page route
      pacmoon-view.svelte               # Canvas + HUD + input plumbing
  lib/
    games/
      pacmoon/
        index.ts                        # Public API: createPacmoonGame(...)
        engine/
          game-engine.ts                # rAF loop + fixed timestep + orchestration
          state-machine.ts              # Game states (start/playing/paused/...)
          config.ts                     # Speeds, timings, colors, tile size
        world/
          map-grid.ts                   # 2D grid tiles + pellet counts + helpers
          level-data.ts                 # Initial tile maps (string arrays) and spawns
          pathfinding.ts                # BFS shortest path over walkable tiles
        entities/
          entity.ts                     # Base position/direction/speed
          pacmoon.ts                    # Player entity
          ghost.ts                      # Ghost entity
          ghost-ai.ts                   # Target selection per ghost + mode handling
        render/
          renderer.ts                   # Draws map + entities + HUD overlays
          palette.ts                    # Retro colors
        input/
          input-manager.ts              # Keyboard + touch; outputs desired direction
          touch-controls.svelte         # Optional on-screen D-pad
        audio/
          audio-manager.ts              # Unlock + play SFX
        types.ts                        # Shared types (Tile, Dir, Vec2, etc.)
```

---

## Implementation Phases

### Phase 0: Route + UI Shell
1. Create route: `src/routes/pacmoon/+page.svelte`
2. Add minimal layout: canvas centered, HUD (score/lives/state), "Press Space to Start"
3. Implement `PacmoonView` component that:
   - Owns the `<canvas>` element reference
   - Creates/disposes the engine on mount/unmount
   - Forwards input events (keyboard/touch)
   - Binds HUD via `$state`

### Phase 1: Engine Skeleton + Fixed-Step Loop
1. Implement `GameEngine` with:
   - `update(dtMs)` pure simulation (tile movement, collisions, AI)
   - `render(ctx)` canvas rendering
   - `start() / stop() / reset()`
2. Use `requestAnimationFrame` with fixed timestep (16.666ms) using accumulator

### Phase 2: Maze Grid + Pellets
1. Add `MapGrid` (2D array) with tile metadata (wall/pellet/power/empty)
2. Render walls in double-stroke style (thick dark + thin light stroke)
3. Implement pellet consumption, scoring, remaining pellet count

### Phase 3: Pacmoon Movement + Wall Collision
1. Implement tile-centered movement:
   - Entities move continuously in pixels
   - Direction changes only when near tile center
2. Wall collision via grid lookup and "snap to center" when blocked

### Phase 4: Ghosts + Mode State Machine + BFS
1. Implement `Ghost` with modes: scatter, chase, frightened, eaten
2. Mode scheduler with scatter ↔ chase cycles
3. BFS pathfinding at intersections
4. Ghost-Pacmoon collisions

### Phase 5: States, Sounds, Touch, Levels
1. Game state machine: start, playing, paused, life lost, game over, level clear
2. Sound effects (pellet, power, death, ghost eaten)
3. Touch: on-screen D-pad + optional swipe
4. Level progression: speed and mode durations scale per level

---

## TypeScript Type Definitions

```typescript
// types.ts

export type Dir = 'up' | 'down' | 'left' | 'right' | 'none';

export type Vec2 = { x: number; y: number };

export type TilePos = { col: number; row: number };

export type GamePhase =
  | 'start'
  | 'playing'
  | 'paused'
  | 'life_lost'
  | 'level_clear'
  | 'game_over';

export type GhostMode = 'scatter' | 'chase' | 'frightened' | 'eaten';

export type GhostName = 'blinky' | 'pinky' | 'inky' | 'clyde';

export type Tile =
  | 'wall'
  | 'empty'
  | 'pellet'
  | 'power'
  | 'door'      // ghost house gate
  | 'tunnel';   // wrap-around

export type HudState = {
  score: number;
  lives: number;
  level: number;
  phase: GamePhase;
};
```

---

## Maze Representation (Full-Screen Responsive)

### Design Philosophy

The maze fills the **entire viewport** while maintaining aspect ratio. We use a **logical coordinate system** (448×496 pixels at BASE_TILE=16) internally, then scale to fill the screen with **pixel-perfect integer scaling** for the retro aesthetic.

### Scaling Strategy

```
┌─────────────────────────────────────────────┐
│                 VIEWPORT                     │
│   ┌─────────────────────────────────────┐   │
│   │                                     │   │
│   │         LETTERBOX AREA              │   │
│   │         (black bars)                │   │
│   │   ┌─────────────────────────┐       │   │
│   │   │                         │       │   │
│   │   │      GAME MAZE          │       │   │
│   │   │    (scaled integer)     │       │   │
│   │   │                         │       │   │
│   │   └─────────────────────────┘       │   │
│   │                                     │   │
│   └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Viewport Configuration

```typescript
// viewport.ts

const COLS = 28;
const ROWS = 31;
const BASE_TILE = 16;              // Logical pixels per tile
const WORLD_W = COLS * BASE_TILE;  // 448 logical pixels
const WORLD_H = ROWS * BASE_TILE;  // 496 logical pixels

type ViewportMode = 'contain' | 'cover';

interface Viewport {
  vwCss: number;              // Viewport width (CSS pixels)
  vhCss: number;              // Viewport height (CSS pixels)
  dpr: number;                // Device pixel ratio (clamped 1-2)
  scaleDevice: number;        // Integer scale in device pixels
  scaleCss: number;           // Scale in CSS pixels
  offsetCssX: number;         // Horizontal offset for centering
  offsetCssY: number;         // Vertical offset for centering
  mode: ViewportMode;
}

function computeViewport(
  vwCss: number,
  vhCss: number,
  mode: ViewportMode = 'contain',
  dprRaw: number = window.devicePixelRatio
): Viewport {
  // Clamp DPR for performance (max 2x on mobile)
  const dpr = Math.min(2, Math.max(1, dprRaw));

  // Calculate scale factors
  const scaleX = (vwCss * dpr) / WORLD_W;
  const scaleY = (vhCss * dpr) / WORLD_H;

  // Choose scale based on mode
  const rawScale = mode === 'contain'
    ? Math.min(scaleX, scaleY)  // Fit inside (letterbox)
    : Math.max(scaleX, scaleY); // Fill viewport (crop)

  // Quantize to integer for pixel-perfect rendering
  const scaleDevice = Math.max(1, Math.floor(rawScale));
  const scaleCss = scaleDevice / dpr;

  // Calculate maze size in CSS pixels
  const mazeCssW = WORLD_W * scaleCss;
  const mazeCssH = WORLD_H * scaleCss;

  // Center the maze (offsets can be negative in 'cover' mode)
  const offsetCssX = (vwCss - mazeCssW) / 2;
  const offsetCssY = (vhCss - mazeCssH) / 2;

  return {
    vwCss, vhCss, dpr,
    scaleDevice, scaleCss,
    offsetCssX, offsetCssY,
    mode
  };
}
```

### Canvas Setup (Full-Screen)

```typescript
// Canvas fills entire viewport, internal buffer uses DPR

function resizeCanvasToViewport(
  canvas: HTMLCanvasElement,
  vp: Viewport
): CanvasRenderingContext2D {
  // CSS size = full viewport
  canvas.style.width = `${vp.vwCss}px`;
  canvas.style.height = `${vp.vhCss}px`;

  // Buffer size = viewport × DPR (for crisp rendering)
  canvas.width = Math.round(vp.vwCss * vp.dpr);
  canvas.height = Math.round(vp.vhCss * vp.dpr);

  const ctx = canvas.getContext('2d', { alpha: false })!;
  ctx.imageSmoothingEnabled = false; // Pixel-perfect scaling
  return ctx;
}
```

### Render Transform (Logical → Device Pixels)

```typescript
function beginFrame(ctx: CanvasRenderingContext2D, vp: Viewport): void {
  // Reset transform and clear
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, vp.vwCss * vp.dpr, vp.vhCss * vp.dpr);

  // Snap offsets to device pixels for crispness
  const offsetDevX = Math.round(vp.offsetCssX * vp.dpr);
  const offsetDevY = Math.round(vp.offsetCssY * vp.dpr);

  // Apply world transform: logical px → device px
  ctx.setTransform(
    vp.scaleDevice, 0,
    0, vp.scaleDevice,
    offsetDevX, offsetDevY
  );
}
```

### Input Coordinate Mapping

```typescript
// Convert screen touch/click (CSS pixels) to world logical pixels

function screenCssToWorld(
  vp: Viewport,
  pCss: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: (pCss.x - vp.offsetCssX) / vp.scaleCss,
    y: (pCss.y - vp.offsetCssY) / vp.scaleCss
  };
}

function worldToTile(pWorld: { x: number; y: number }): TilePos {
  return {
    col: Math.floor(pWorld.x / BASE_TILE),
    row: Math.floor(pWorld.y / BASE_TILE)
  };
}

function isInsideMaze(vp: Viewport, pCss: { x: number; y: number }): boolean {
  const x = pCss.x - vp.offsetCssX;
  const y = pCss.y - vp.offsetCssY;
  return x >= 0 && y >= 0 &&
         x < WORLD_W * vp.scaleCss &&
         y < WORLD_H * vp.scaleCss;
}
```

### Touch Controls (Screen-Space D-Pad)

```typescript
// D-pad anchored to viewport corner (works with letterboxing)

interface TouchPad {
  centerCss: { x: number; y: number };
  radiusCss: number;
  deadzoneCss: number;
}

function computeTouchPad(vwCss: number, vhCss: number): TouchPad {
  const minDim = Math.min(vwCss, vhCss);

  // 18% of min dimension, clamped for usability
  const radiusCss = clamp(minDim * 0.18, 48, 96);
  const deadzoneCss = radiusCss * 0.25;
  const margin = clamp(minDim * 0.04, 12, 24);

  return {
    centerCss: {
      x: margin + radiusCss,
      y: vhCss - margin - radiusCss
    },
    radiusCss,
    deadzoneCss
  };
}

function touchDirFromPoint(
  pad: TouchPad,
  pCss: { x: number; y: number }
): Dir {
  const dx = pCss.x - pad.centerCss.x;
  const dy = pCss.y - pad.centerCss.y;
  const dist = Math.hypot(dx, dy);

  if (dist < pad.deadzoneCss || dist > pad.radiusCss) return 'none';

  // Choose dominant axis
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
```

### CSS for Full-Screen Container

```css
/* Full viewport game container */
.game-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: #000;
  overflow: hidden;
  touch-action: none;
}

.game-canvas {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* Prevent scroll/bounce on iOS */
html, body {
  overflow: hidden;
  overscroll-behavior: none;
}
```

### Svelte 5 Full-Screen Component

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { createPacmoonGame } from '$lib/games/pacmoon';
  import type { HudState } from '$lib/games/pacmoon/types';

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let hud = $state<HudState>({ score: 0, lives: 3, level: 1, phase: 'start' });

  onMount(() => {
    const game = createPacmoonGame(canvas, (newHud) => {
      hud = newHud;
    });
    game.start();

    // Observe container (not canvas) for resize
    const resizeObserver = new ResizeObserver(() => {
      game.resize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    // Handle visibility
    const onVisibilityChange = () => {
      if (document.hidden) game.pause();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      game.stop();
    };
  });
</script>

<div bind:this={container} class="game-container">
  <!-- HUD overlay -->
  <div class="fixed top-4 left-0 right-0 z-10 flex justify-center gap-8
              text-white font-mono text-lg pointer-events-none">
    <span>SCORE: {hud.score}</span>
    <span>{'●'.repeat(hud.lives)}</span>
    <span>LEVEL {hud.level}</span>
  </div>

  <canvas bind:this={canvas} class="game-canvas"></canvas>

  <!-- Touch D-pad (mobile) -->
  <div class="fixed bottom-8 left-8 z-10 md:hidden">
    <!-- D-pad SVG or buttons here -->
  </div>
</div>

<style>
  .game-container {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: #000;
    overflow: hidden;
    touch-action: none;
  }

  .game-canvas {
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
</style>
```

### Aspect Ratio Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **contain** | Full maze visible, letterboxed | Default (gameplay-safe) |
| **cover** | Maze fills screen, edges cropped | Immersive (risky for tunnels) |

**Recommendation:** Use `contain` mode for Pacmoon to ensure tunnels and all gameplay elements remain visible.

### Scale Examples

| Device | Viewport | DPR | scaleDevice | Tile Size (CSS) |
|--------|----------|-----|-------------|-----------------|
| iPhone SE | 375×667 | 2 | 2 | 16px |
| iPhone 14 | 390×844 | 3 | 2 | 10.67px |
| iPad | 768×1024 | 2 | 3 | 24px |
| Desktop | 1920×1080 | 1 | 2 | 32px |
| 4K Monitor | 3840×2160 | 1 | 4 | 64px |

---

### ASCII Map Format
```
Legend:
  # = wall
  . = pellet
  o = power pellet
  (space) = empty
  T = tunnel (wrap-around)
  - = ghost house door
  P = pacmoon spawn
  B = blinky spawn
  I = inky spawn
  N = pinky spawn
  C = clyde spawn
```

### Example Level
```typescript
export const level1: string[] = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o####.#####.##.#####.####o#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.##### ## #####.######",
  "     #.##### ## #####.#     ",
  "     #.##    B     ##.#     ",
  "     #.## ###--### ##.#     ",
  "######.## # INC # ##.######",
  "T     .   #     #   .     T",
  "######.## ####### ##.######",
  "     #.##         ##.#     ",
  "     #.## ####### ##.#     ",
  "######.## ####### ##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o..##....... P.......##..o#",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#..........................#",
  "############################",
];
```

---

## Ghost AI Specifications

### Mode State Machine

| Mode       | Target                          | Speed  | Duration        |
|------------|--------------------------------|--------|-----------------|
| Scatter    | Fixed corner tile per ghost    | 75%    | 7s (waves)      |
| Chase      | Computed from Pacmoon position | 75%    | 20s (waves)     |
| Frightened | Random valid direction         | 50%    | 6s (decreases)  |
| Eaten      | Ghost house entrance           | 150%   | Until home      |

### Ghost Personalities (Chase Mode Targeting)

| Ghost  | Color  | Target Tile                                              |
|--------|--------|----------------------------------------------------------|
| Blinky | Red    | Pacmoon's current tile                                   |
| Pinky  | Pink   | 4 tiles ahead of Pacmoon's direction                     |
| Inky   | Cyan   | Vector from Blinky to 2 tiles ahead of Pacmoon, doubled  |
| Clyde  | Orange | Pacmoon if >8 tiles away, else scatter corner            |

### Scatter Corner Targets

| Ghost  | Corner        |
|--------|---------------|
| Blinky | Top-right     |
| Pinky  | Top-left      |
| Inky   | Bottom-right  |
| Clyde  | Bottom-left   |

### Mode Wave Schedule (Level 1)

| Wave | Mode    | Duration |
|------|---------|----------|
| 1    | Scatter | 7s       |
| 2    | Chase   | 20s      |
| 3    | Scatter | 7s       |
| 4    | Chase   | 20s      |
| 5    | Scatter | 5s       |
| 6    | Chase   | 20s      |
| 7    | Scatter | 5s       |
| 8    | Chase   | ∞        |

---

## Scoring System

| Event                    | Points |
|--------------------------|--------|
| Pellet                   | 10     |
| Power Pellet             | 50     |
| Ghost #1 (frightened)    | 200    |
| Ghost #2 (frightened)    | 400    |
| Ghost #3 (frightened)    | 800    |
| Ghost #4 (frightened)    | 1600   |
| Cherry (bonus, level 1)  | 100    |
| Strawberry (level 2)     | 300    |

---

## Game Configuration

```typescript
// config.ts

export const CONFIG = {
  // Grid
  TILE_SIZE: 16,
  COLS: 28,
  ROWS: 31,

  // Speeds (pixels per second at 100%)
  BASE_SPEED: 80,
  PACMOON_SPEED_PERCENT: 80,
  GHOST_SPEED_PERCENT: 75,
  GHOST_FRIGHTENED_SPEED_PERCENT: 50,
  GHOST_EATEN_SPEED_PERCENT: 150,
  GHOST_TUNNEL_SPEED_PERCENT: 40,

  // Timing (milliseconds)
  FRIGHTENED_DURATION: 6000,
  FRIGHTENED_BLINK_START: 2000,
  LIFE_LOST_DELAY: 1500,
  LEVEL_CLEAR_DELAY: 2000,
  READY_DELAY: 2000,

  // Lives
  STARTING_LIVES: 3,
  EXTRA_LIFE_SCORE: 10000,

  // Animation
  PACMOON_MOUTH_SPEED: 0.15,
  GHOST_WIGGLE_SPEED: 0.1,
};
```

---

## Canvas Rendering Specifications

### Resolution
- Logical: `COLS * TILE_SIZE` × `ROWS * TILE_SIZE` (448×496 at 16px tiles)
- Physical: Scaled by `devicePixelRatio` for crisp rendering
- CSS: Responsive scaling to fit viewport

### Color Palette

```typescript
// palette.ts

export const PALETTE = {
  BACKGROUND: '#000000',
  
  // Walls (double-stroke style)
  WALL_OUTER: '#1a1aff',
  WALL_INNER: '#4444ff',
  
  // Pellets
  PELLET: '#ffb8ae',
  POWER_PELLET: '#ffb8ae',
  
  // Pacmoon
  PACMOON: '#ffff00',
  
  // Ghosts
  BLINKY: '#ff0000',
  PINKY: '#ffb8ff',
  INKY: '#00ffff',
  CLYDE: '#ffb852',
  
  // Frightened ghost
  FRIGHTENED: '#2121ff',
  FRIGHTENED_BLINK: '#ffffff',
  
  // Eyes
  EYE_WHITE: '#ffffff',
  EYE_PUPIL: '#2121de',
  
  // Text
  TEXT_WHITE: '#ffffff',
  TEXT_YELLOW: '#ffff00',
  TEXT_RED: '#ff0000',
};
```

### Drawing Order
1. Clear background (black)
2. Walls (double stroke: outer dark, inner light)
3. Pellets and power pellets (power pellets blink)
4. Pacmoon (arc wedge with mouth animation)
5. Ghosts (body + eyes, or frightened blue)
6. HUD overlays ("READY!", "PAUSED", "GAME OVER")

---

## Input Handling

### Keyboard Mappings

| Key          | Action              |
|--------------|---------------------|
| Arrow Up / W | Move up             |
| Arrow Down / S | Move down         |
| Arrow Left / A | Move left         |
| Arrow Right / D | Move right       |
| Space        | Start / Pause       |
| Escape       | Pause / Back        |

### Touch Controls
- On-screen D-pad (4 directional buttons)
- Optional swipe detection for direction changes
- Tap anywhere to start/pause

---

## Collision Detection

### Wall Collision
- Grid-based: check tile at next position
- Movement only axis-aligned
- Direction change allowed only at tile centers
- Snap to tile center when blocked

### Pellet Collection
- Check tile at Pacmoon's current tile position
- If pellet/power: mark as empty, add score, decrement count

### Ghost Collision
- Compare Pacmoon tile with ghost tiles
- Frightened: eat ghost, score bonus, ghost becomes eaten
- Otherwise: lose life, reset positions

---

## BFS Pathfinding

```typescript
// pathfinding.ts

export function bfsNextDir(args: {
  grid: MapGrid;
  from: TilePos;
  to: TilePos;
  forbidReverseDir: Dir;
}): Dir {
  // 1. BFS from 'from' to 'to' over walkable tiles
  // 2. Track parent pointers
  // 3. Backtrack from 'to' to find first step
  // 4. Return direction of first step
  // 5. Exclude reverse direction (ghosts can't reverse)
  // 6. Tie-break order: up, left, down, right
}
```

---

## Game State Machine

```
┌─────────┐
│  START  │──────────────────────────────┐
└────┬────┘                              │
     │ space/tap                         │
     ▼                                   │
┌─────────┐  all pellets  ┌─────────────┐│
│ PLAYING │──────────────►│ LEVEL_CLEAR ││
└────┬────┘               └──────┬──────┘│
     │                           │       │
     │ ghost collision           │ delay │
     ▼                           ▼       │
┌───────────┐             ┌─────────┐    │
│ LIFE_LOST │             │ PLAYING │◄───┘
└─────┬─────┘             │(next lvl)    
      │                   └─────────┘    
      │ lives > 0                        
      ▼                                  
┌─────────┐                              
│ PLAYING │                              
└─────────┘                              
      │ lives == 0                       
      ▼                                  
┌───────────┐                            
│ GAME_OVER │                            
└───────────┘                            
```

---

## Sound Effects

| Sound       | Trigger                    | File          |
|-------------|----------------------------|---------------|
| munch       | Eating pellet              | munch.wav     |
| power       | Eating power pellet        | power.wav     |
| ghost       | Eating frightened ghost    | ghost.wav     |
| death       | Pacmoon dies               | death.wav     |
| levelup     | Level cleared              | levelup.wav   |
| siren       | Background during chase    | siren.wav     |
| frightened  | Background when frightened | frightened.wav|

---

## Level Progression

| Level | Pacmoon Speed | Ghost Speed | Frightened Duration |
|-------|--------------|-------------|---------------------|
| 1     | 80%          | 75%         | 6s                  |
| 2     | 90%          | 85%         | 5s                  |
| 3     | 90%          | 85%         | 4s                  |
| 4     | 90%          | 85%         | 3s                  |
| 5+    | 100%         | 95%         | 2s                  |

---

## Svelte 5 Integration

```svelte
<!-- pacmoon-view.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { createPacmoonGame } from '$lib/games/pacmoon';
  import type { HudState } from '$lib/games/pacmoon/types';

  let canvas: HTMLCanvasElement;
  let hud = $state<HudState>({ score: 0, lives: 3, level: 1, phase: 'start' });

  onMount(() => {
    const game = createPacmoonGame(canvas, (newHud) => {
      hud = newHud;
    });
    game.start();

    return () => game.stop();
  });
</script>

<div class="game-container">
  <div class="hud">
    <span>Score: {hud.score}</span>
    <span>Lives: {hud.lives}</span>
    <span>Level: {hud.level}</span>
  </div>
  <canvas bind:this={canvas}></canvas>
</div>
```

---

## Testing Strategy

1. **Unit tests** for pathfinding (BFS correctness)
2. **Unit tests** for collision detection logic
3. **Unit tests** for ghost AI targeting
4. **Integration tests** for game state transitions
5. **Manual playtesting** for feel and balance

---

## Detailed Implementation Specifications

### Constants & Coordinate System

```typescript
// config.ts - Core constants
export const TS = 16;  // Tile size in pixels
export const COLS = 28;
export const ROWS = 31;
export const WORLD_W = COLS * TS;  // 448px
export const WORLD_H = ROWS * TS;  // 496px

// Direction unit vectors
export const DIR_V: Record<Dir, Vec2> = {
  up:    { x: 0,  y: -1 },
  down:  { x: 0,  y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1,  y: 0 },
  none:  { x: 0,  y: 0 }
};

// Movement tolerances
export const CENTER_EPS_PX = 0.75;    // Within 0.75px = "at center"
export const SNAP_EPS_PX = 1.25;      // Snap threshold when blocked/turning
export const CORNER_CUT_EPS_PX = 2.0; // Allow small misalignment when turning

// Entity radii (for TS=16)
export const PACMOON_RADIUS = 6;
export const GHOST_RADIUS = 6;
export const COLLISION_DIST_PX = 8;   // Ghost-Pacmoon collision threshold

// Animation
export const MOUTH_OPEN_MAX_DEG = 70;
export const MOUTH_OPEN_MIN_DEG = 8;
export const GHOST_WIGGLE_PERIOD_MS = 100;

// Frightened blinking
export const FRIGHTENED_BLINK_PERIOD_MS = 250;
```

---

### Pixel ↔ Tile Conversion Formulas

```typescript
// Tile index from pixel center
function pixelToTile(pos: Vec2): TilePos {
  return {
    col: Math.floor(pos.x / TS),
    row: Math.floor(pos.y / TS)
  };
}

// Tile center pixel from tile index
function tileToPixel(tile: TilePos): Vec2 {
  return {
    x: (tile.col + 0.5) * TS,
    y: (tile.row + 0.5) * TS
  };
}

// Offset from current tile center
function offsetFromCenter(pos: Vec2): Vec2 {
  const col = Math.floor(pos.x / TS);
  const row = Math.floor(pos.y / TS);
  return {
    x: pos.x - ((col + 0.5) * TS),
    y: pos.y - ((row + 0.5) * TS)
  };
}
```

---

### Near Center & Snap Functions

```typescript
function nearCenter(pos: Vec2): boolean {
  const col = Math.floor(pos.x / TS);
  const row = Math.floor(pos.y / TS);
  const cx = (col + 0.5) * TS;
  const cy = (row + 0.5) * TS;
  return Math.abs(pos.x - cx) <= CENTER_EPS_PX && 
         Math.abs(pos.y - cy) <= CENTER_EPS_PX;
}

function snapToCenterIfClose(pos: Vec2): void {
  const col = Math.floor(pos.x / TS);
  const row = Math.floor(pos.y / TS);
  const cx = (col + 0.5) * TS;
  const cy = (row + 0.5) * TS;

  if (Math.abs(pos.x - cx) <= SNAP_EPS_PX) pos.x = cx;
  if (Math.abs(pos.y - cy) <= SNAP_EPS_PX) pos.y = cy;
}
```

---

### Turn Buffering Logic (Precise)

```typescript
function tryApplyTurnBuffered(args: {
  pos: Vec2;
  dir: Dir;
  desiredDir: Dir;
  grid: MapGrid;
}): Dir {
  const { pos, dir, desiredDir, grid } = args;
  if (desiredDir === 'none' || desiredDir === dir) return dir;

  // Immediate reversal for Pacmoon (if next tile walkable)
  if (isOpposite(dir, desiredDir)) {
    if (canEnterNextTile({ pos, dir: desiredDir, grid })) return desiredDir;
    return dir;
  }

  const col = Math.floor(pos.x / TS);
  const row = Math.floor(pos.y / TS);
  const cx = (col + 0.5) * TS;
  const cy = (row + 0.5) * TS;

  const wantVertical = desiredDir === 'up' || desiredDir === 'down';
  const movingHorizontal = dir === 'left' || dir === 'right';
  const wantHorizontal = desiredDir === 'left' || desiredDir === 'right';
  const movingVertical = dir === 'up' || dir === 'down';

  // Check alignment tolerance
  const alignedEnough =
    (movingHorizontal && wantVertical && Math.abs(pos.y - cy) <= CORNER_CUT_EPS_PX) ||
    (movingVertical && wantHorizontal && Math.abs(pos.x - cx) <= CORNER_CUT_EPS_PX) ||
    (Math.abs(pos.x - cx) <= CENTER_EPS_PX && Math.abs(pos.y - cy) <= CENTER_EPS_PX);

  if (!alignedEnough) return dir;
  if (!canEnterNextTile({ pos: { x: cx, y: cy }, dir: desiredDir, grid })) return dir;

  // Snap onto rail before turning
  if (movingHorizontal) pos.y = cy;
  if (movingVertical) pos.x = cx;

  return desiredDir;
}

function isOpposite(a: Dir, b: Dir): boolean {
  return (a === 'up' && b === 'down') || (a === 'down' && b === 'up') ||
         (a === 'left' && b === 'right') || (a === 'right' && b === 'left');
}

function opposite(dir: Dir): Dir {
  switch (dir) {
    case 'up': return 'down';
    case 'down': return 'up';
    case 'left': return 'right';
    case 'right': return 'left';
    default: return 'none';
  }
}
```

---

### Wall Collision Detection

```typescript
function canEnterNextTile(args: {
  pos: Vec2;
  dir: Dir;
  grid: MapGrid;
  radiusPx?: number;
}): boolean {
  const r = args.radiusPx ?? PACMOON_RADIUS;
  const v = DIR_V[args.dir];

  // Probe point at leading edge
  const px = args.pos.x + v.x * (r + 0.01);
  const py = args.pos.y + v.y * (r + 0.01);

  const col = Math.floor(px / TS);
  const row = Math.floor(py / TS);

  const tile = args.grid.getTileWrapped({ col, row });
  return tile !== 'wall';
}

function circlesOverlap(a: Vec2, b: Vec2, threshold = COLLISION_DIST_PX): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return (dx * dx + dy * dy) <= (threshold * threshold);
}
```

---

### BFS Pathfinding (Complete Algorithm)

```typescript
const DIR_ORDER: Dir[] = ['up', 'left', 'down', 'right'];

function stepTile(grid: MapGrid, from: TilePos, dir: Dir): TilePos {
  const v = DIR_V[dir];
  let col = from.col + v.x;
  let row = from.row + v.y;

  // Vertical bounds: clamp (no wrap)
  if (row < 0 || row >= grid.rows) return from;

  // Horizontal wrap for tunnels
  if (col < 0) col = grid.cols - 1;
  if (col >= grid.cols) col = 0;

  return { col, row };
}

function isWalkableForGhost(
  tile: Tile,
  ghostCtx: { mode: GhostMode; houseState: 'in_house' | 'leaving' | 'outside' }
): boolean {
  if (tile === 'wall') return false;
  if (tile === 'door') {
    return ghostCtx.mode === 'eaten' || ghostCtx.houseState === 'leaving';
  }
  return true;
}

function bfsNextDir(args: {
  grid: MapGrid;
  from: TilePos;
  to: TilePos;
  forbidReverseDir: Dir;
  ghostCtx: { mode: GhostMode; houseState: 'in_house' | 'leaving' | 'outside' };
}): Dir {
  const { grid, from, to, forbidReverseDir, ghostCtx } = args;
  const reverseDir = opposite(forbidReverseDir);

  if (from.col === to.col && from.row === to.row) {
    return pickBestLocalDir({ grid, from, forbidReverseDir, ghostCtx });
  }

  const key = (p: TilePos) => `${p.col},${p.row}`;
  const visited = new Set<string>([key(from)]);
  const parent = new Map<string, { prev: TilePos; via: Dir }>();
  const queue: TilePos[] = [from];

  while (queue.length > 0) {
    const cur = queue.shift()!;

    for (const dir of DIR_ORDER) {
      // Forbid reverse at root
      if (cur.col === from.col && cur.row === from.row && dir === reverseDir) {
        continue;
      }

      const nxt = stepTile(grid, cur, dir);
      if (nxt.col === cur.col && nxt.row === cur.row) continue;

      const tile = grid.getTile(nxt);
      if (!isWalkableForGhost(tile, ghostCtx)) continue;

      const k = key(nxt);
      if (visited.has(k)) continue;

      visited.add(k);
      parent.set(k, { prev: cur, via: dir });

      if (nxt.col === to.col && nxt.row === to.row) {
        // Backtrack to find first move
        let backKey = k;
        let step = parent.get(backKey)!;
        let lastDir = step.via;

        while (!(step.prev.col === from.col && step.prev.row === from.row)) {
          backKey = key(step.prev);
          step = parent.get(backKey)!;
          lastDir = step.via;
        }
        return lastDir;
      }

      queue.push(nxt);
    }
  }

  return pickBestLocalDir({ grid, from, forbidReverseDir, ghostCtx });
}
```

---

### Ghost Mode Schedule Per Level

```typescript
function getWaveScheduleMs(level: number): number[] {
  // [scatter, chase, scatter, chase, ...] - last chase is Infinity
  if (level === 1) {
    return [7000, 20000, 7000, 20000, 5000, 20000, 5000, Infinity];
  }
  if (level >= 2 && level <= 4) {
    return [7000, 20000, 7000, 20000, 5000, 20000, 5000, Infinity];
  }
  return [5000, 20000, 5000, 20000, 5000, 20000, 5000, Infinity];
}

function getFrightenedDurationMs(level: number): number {
  if (level === 1) return 6000;
  if (level === 2) return 5000;
  if (level === 3) return 4000;
  if (level === 4) return 3000;
  return 2000;
}
```

---

### Frightened Blinking Logic

```typescript
function getFrightenedColor(frightenedMsRemaining: number): string {
  const blinking = frightenedMsRemaining <= FRIGHTENED_BLINK_START_MS;
  
  if (!blinking) return PALETTE.FRIGHTENED;
  
  const blinkOn = Math.floor(frightenedMsRemaining / FRIGHTENED_BLINK_PERIOD_MS) % 2 === 0;
  return blinkOn ? PALETTE.FRIGHTENED_BLINK : PALETTE.FRIGHTENED;
}
```

---

### Pacmoon Mouth Animation

```typescript
const MOUTH_MAX_RAD = (MOUTH_OPEN_MAX_DEG * Math.PI) / 180;
const MOUTH_MIN_RAD = (MOUTH_OPEN_MIN_DEG * Math.PI) / 180;

function triWave01(t: number): number {
  const f = t - Math.floor(t);
  return f < 0.5 ? f * 2 : 2 - f * 2;
}

function getMouthAngle(animPhase: number): number {
  const open01 = triWave01(animPhase);
  return MOUTH_MIN_RAD + (MOUTH_MAX_RAD - MOUTH_MIN_RAD) * open01;
}

function getDirectionBaseAngle(dir: Dir): number {
  switch (dir) {
    case 'right': return 0;
    case 'left': return Math.PI;
    case 'up': return -Math.PI / 2;
    case 'down': return Math.PI / 2;
    default: return 0;
  }
}
```

---

### Canvas Drawing Functions

```typescript
// Pacmoon
function drawPacmoon(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
  dir: Dir,
  radius: number,
  mouthRad: number
): void {
  const base = getDirectionBaseAngle(dir);
  const a0 = base + mouthRad / 2;
  const a1 = base - mouthRad / 2;

  ctx.fillStyle = PALETTE.PACMOON;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.arc(pos.x, pos.y, radius, a0, a1, true);
  ctx.closePath();
  ctx.fill();
}

// Ghost body
function drawGhostBody(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
  color: string,
  frame: 0 | 1
): void {
  const r = TS * 0.5;
  const top = pos.y - r;
  const bottom = pos.y + r;
  const left = pos.x - r;
  const right = pos.x + r;

  const bumps = frame === 0 ? [0, 3, 0, 3] : [3, 0, 3, 0];

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pos.x, top + r, r, Math.PI, 0, false);
  ctx.lineTo(right, bottom - 4);

  const step = (right - left) / 4;
  for (let i = 0; i < 4; i++) {
    const x0 = right - step * i;
    const x1 = right - step * (i + 1);
    const mid = (x0 + x1) / 2;
    const y = bottom - bumps[i];
    ctx.quadraticCurveTo(mid, bottom + 2, x1, y);
  }

  ctx.lineTo(left, bottom - 4);
  ctx.closePath();
  ctx.fill();
}

// Ghost eyes
function drawGhostEyes(ctx: CanvasRenderingContext2D, pos: Vec2, dir: Dir): void {
  const eyeOffsetX = 4;
  const eyeOffsetY = -2;
  const eyeR = 3;
  const pupilR = 1.5;

  const pv = DIR_V[dir];
  const pupilOffX = pv.x * 1.5;
  const pupilOffY = pv.y * 1.5;

  const eyes = [pos.x - eyeOffsetX, pos.x + eyeOffsetX];
  const ey = pos.y + eyeOffsetY;

  ctx.fillStyle = PALETTE.EYE_WHITE;
  for (const ex of eyes) {
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = PALETTE.EYE_PUPIL;
  for (const ex of eyes) {
    ctx.beginPath();
    ctx.arc(ex + pupilOffX, ey + pupilOffY, pupilR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Wall edge detection + double stroke
function drawWalls(ctx: CanvasRenderingContext2D, grid: MapGrid): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.getTile({ col: c, row: r }) !== 'wall') continue;

      const x0 = c * TS;
      const y0 = r * TS;
      const x1 = x0 + TS;
      const y1 = y0 + TS;

      // Top edge
      if (grid.getTile({ col: c, row: r - 1 }) !== 'wall') {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y0);
      }
      // Bottom edge
      if (grid.getTile({ col: c, row: r + 1 }) !== 'wall') {
        ctx.moveTo(x0, y1);
        ctx.lineTo(x1, y1);
      }
      // Left edge
      if (grid.getTile({ col: c - 1, row: r }) !== 'wall') {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0, y1);
      }
      // Right edge
      if (grid.getTile({ col: c + 1, row: r }) !== 'wall') {
        ctx.moveTo(x1, y0);
        ctx.lineTo(x1, y1);
      }
    }
  }

  // Outer stroke
  ctx.strokeStyle = PALETTE.WALL_OUTER;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Inner stroke
  ctx.strokeStyle = PALETTE.WALL_INNER;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}
```

---

### Game Loop (Fixed Timestep)

```typescript
const STEP_MS = 1000 / 60;
const MAX_CATCHUP_MS = 250;
const MAX_STEPS_PER_FRAME = 5;

class GameLoop {
  private running = false;
  private paused = false;
  private lastT = 0;
  private acc = 0;
  private animationId = 0;

  constructor(
    private update: (dtMs: number) => void,
    private render: (alpha: number) => void
  ) {}

  start(): void {
    this.running = true;
    this.lastT = 0;
    this.acc = 0;
    this.animationId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationId);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.lastT = performance.now();
    this.acc = 0;
  }

  private tick = (t: number): void => {
    if (!this.running) return;

    if (this.lastT === 0) this.lastT = t;
    let delta = t - this.lastT;
    this.lastT = t;

    if (this.paused) {
      this.render(1);
      this.animationId = requestAnimationFrame(this.tick);
      return;
    }

    if (delta > MAX_CATCHUP_MS) delta = MAX_CATCHUP_MS;
    this.acc += delta;

    let steps = 0;
    while (this.acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      this.update(STEP_MS);
      this.acc -= STEP_MS;
      steps++;
    }

    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;

    const alpha = this.acc / STEP_MS;
    this.render(alpha);

    this.animationId = requestAnimationFrame(this.tick);
  };
}
```

---

### Svelte 5 Component Integration

```svelte
<!-- pacmoon-view.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { createPacmoonGame } from '$lib/games/pacmoon';
  import type { HudState } from '$lib/games/pacmoon/types';

  let canvas: HTMLCanvasElement;
  let hud = $state<HudState>({ score: 0, lives: 3, level: 1, phase: 'start' });

  onMount(() => {
    const game = createPacmoonGame(canvas, (newHud) => {
      hud = newHud;
    });
    game.start();

    const preventedKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      ' ', 'Spacebar'
    ];

    const onKeyDown = (e: KeyboardEvent) => {
      if (preventedKeys.includes(e.key)) e.preventDefault();
      game.input.handleKeyDown(e);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (preventedKeys.includes(e.key)) e.preventDefault();
      game.input.handleKeyUp(e);
    };

    const onVisibilityChange = () => {
      if (document.hidden) game.pause();
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp, { passive: false });
    document.addEventListener('visibilitychange', onVisibilityChange);

    const resizeObserver = new ResizeObserver(() => game.resize());
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      game.stop();
    };
  });
</script>

<div class="game-container touch-none">
  <div class="hud flex justify-between p-4 text-white font-mono">
    <span>SCORE: {hud.score}</span>
    <span>LIVES: {'●'.repeat(hud.lives)}</span>
    <span>LEVEL: {hud.level}</span>
  </div>
  <canvas bind:this={canvas} class="mx-auto block"></canvas>
</div>

<style>
  .game-container {
    touch-action: none;
  }
</style>
```

---

## References

- [mumuy/pacman](https://github.com/mumuy/pacman) - Comprehensive game engine
- [daleharvey/pacman](https://github.com/daleharvey/pacman) - Modular OOP approach
- [platzhersh/pacman-canvas](https://github.com/platzhersh/pacman-canvas) - Modern ES6+
- [The Pac-Man Dossier](https://www.gamedeveloper.com/design/the-pac-man-dossier) - Definitive ghost AI reference
