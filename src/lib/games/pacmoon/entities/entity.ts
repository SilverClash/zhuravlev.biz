import type { Dir, Vec2, TilePos } from '../types';
import { DIR_V } from '../types';
import { BASE_TILE, WORLD_W } from '../engine/config';

const TS = BASE_TILE;

export abstract class Entity {
  pos: Vec2;
  dir: Dir = 'none';
  speed: number;

  constructor(pos: Vec2, speed: number) {
    this.pos = { ...pos };
    this.speed = speed;
  }

  getTilePos(): TilePos {
    return {
      col: Math.floor(this.pos.x / TS),
      row: Math.floor(this.pos.y / TS)
    };
  }

  getTileCenter(): Vec2 {
    const tile = this.getTilePos();
    return {
      x: (tile.col + 0.5) * TS,
      y: (tile.row + 0.5) * TS
    };
  }

  move(dtMs: number): void {
    if (this.dir === 'none') return;

    const distance = this.speed * (dtMs / 1000);
    const v = DIR_V[this.dir];

    this.pos.x += v.x * distance;
    this.pos.y += v.y * distance;
  }

  wrapPosition(): void {
    if (this.pos.x < 0) {
      this.pos.x += WORLD_W;
    } else if (this.pos.x >= WORLD_W) {
      this.pos.x -= WORLD_W;
    }
  }

  snapToCenter(): void {
    const center = this.getTileCenter();
    this.pos.x = center.x;
    this.pos.y = center.y;
  }

  distanceTo(other: Vec2): number {
    const dx = this.pos.x - other.x;
    const dy = this.pos.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
