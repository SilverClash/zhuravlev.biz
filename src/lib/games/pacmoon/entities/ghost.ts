import type { Dir, Vec2, TilePos, GhostMode, GhostName } from '../types';
import { DIR_ORDER } from '../types';
import { Entity } from './entity';
import { GHOST_SPEED, GHOST_FRIGHTENED_SPEED, GHOST_EATEN_SPEED, GHOST_TUNNEL_SPEED, BASE_TILE, CENTER_EPS_PX } from '../engine/config';
import type { MapGrid } from '../world/map-grid';

const TS = BASE_TILE;

export class Ghost extends Entity {
  readonly name: GhostName;
  mode: GhostMode = 'scatter';
  targetTile: TilePos = { col: 0, row: 0 };
  scatterTarget: TilePos;
  spawnPos: Vec2;
  frightenedTimeRemaining = 0;

  constructor(
    name: GhostName,
    pos: Vec2,
    scatterTarget: TilePos
  ) {
    super(pos, GHOST_SPEED);
    this.name = name;
    this.scatterTarget = scatterTarget;
    this.spawnPos = { ...pos };
    
    if (name === 'ra') {
      this.dir = 'left';
    } else {
      this.dir = 'up';
    }
  }

  getSpeed(isInTunnel: boolean): number {
    if (this.mode === 'eaten') return GHOST_EATEN_SPEED;
    if (this.mode === 'frightened') return GHOST_FRIGHTENED_SPEED;
    if (isInTunnel) return GHOST_TUNNEL_SPEED;
    return GHOST_SPEED;
  }

  setFrightened(durationMs: number): void {
    if (this.mode === 'eaten') return;
    this.mode = 'frightened';
    this.frightenedTimeRemaining = durationMs;
    this.reverseDirection();
  }

  updateFrightened(dtMs: number, globalMode: 'scatter' | 'chase'): void {
    if (this.mode !== 'frightened') return;
    this.frightenedTimeRemaining -= dtMs;
    if (this.frightenedTimeRemaining <= 0) {
      this.mode = globalMode;
      this.frightenedTimeRemaining = 0;
    }
  }

  setEaten(): void {
    this.mode = 'eaten';
    this.frightenedTimeRemaining = 0;
  }

  respawn(): void {
    this.mode = 'scatter';
  }

  reverseDirection(): void {
    switch (this.dir) {
      case 'up': this.dir = 'down'; break;
      case 'down': this.dir = 'up'; break;
      case 'left': this.dir = 'right'; break;
      case 'right': this.dir = 'left'; break;
    }
  }

  isAtTileCenter(): boolean {
    const center = this.getTileCenter();
    const dx = Math.abs(this.pos.x - center.x);
    const dy = Math.abs(this.pos.y - center.y);
    return dx <= CENTER_EPS_PX && dy <= CENTER_EPS_PX;
  }

  canUseDoor(): boolean {
    return this.mode === 'eaten';
  }
}
