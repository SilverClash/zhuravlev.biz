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

export type GhostName = 'ra' | 'bastet' | 'thoth' | 'anubis';

export type Tile =
  | 'wall'
  | 'empty'
  | 'pellet'
  | 'power'
  | 'door'
  | 'tunnel';

export type HudState = {
  score: number;
  lives: number;
  level: number;
  phase: GamePhase;
};

export const DIR_V: Record<Dir, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  none: { x: 0, y: 0 }
};

export const DIR_ORDER: Dir[] = ['up', 'left', 'down', 'right'];
