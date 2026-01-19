import type { Dir, TilePos } from '../types';
import { DIR_V, DIR_ORDER } from '../types';
import type { MapGrid } from './map-grid';

function opposite(dir: Dir): Dir {
  switch (dir) {
    case 'up': return 'down';
    case 'down': return 'up';
    case 'left': return 'right';
    case 'right': return 'left';
    default: return 'none';
  }
}

function stepTile(grid: MapGrid, from: TilePos, dir: Dir): TilePos {
  const v = DIR_V[dir];
  let col = from.col + v.x;
  let row = from.row + v.y;

  if (row < 0 || row >= grid.rows) return from;

  if (col < 0) col = grid.cols - 1;
  if (col >= grid.cols) col = 0;

  return { col, row };
}

function tileKey(pos: TilePos): string {
  return `${pos.col},${pos.row}`;
}

export function bfsNextDir(args: {
  grid: MapGrid;
  from: TilePos;
  to: TilePos;
  currentDir: Dir;
  canUseDoor: boolean;
}): Dir {
  const { grid, from, to, currentDir, canUseDoor } = args;
  const reverseDir = opposite(currentDir);

  if (from.col === to.col && from.row === to.row) {
    return pickBestLocalDir({ grid, from, reverseDir, canUseDoor });
  }

  const visited = new Set<string>([tileKey(from)]);
  const parent = new Map<string, { prev: TilePos; via: Dir }>();
  const queue: TilePos[] = [from];

  while (queue.length > 0) {
    const cur = queue.shift()!;

    for (const dir of DIR_ORDER) {
      if (cur.col === from.col && cur.row === from.row && dir === reverseDir) {
        continue;
      }

      const nxt = stepTile(grid, cur, dir);
      if (nxt.col === cur.col && nxt.row === cur.row) continue;

      if (!grid.isWalkableForGhost(nxt, canUseDoor)) continue;

      const k = tileKey(nxt);
      if (visited.has(k)) continue;

      visited.add(k);
      parent.set(k, { prev: cur, via: dir });

      if (nxt.col === to.col && nxt.row === to.row) {
        let backKey = k;
        let step = parent.get(backKey)!;
        let lastDir = step.via;

        while (!(step.prev.col === from.col && step.prev.row === from.row)) {
          backKey = tileKey(step.prev);
          step = parent.get(backKey)!;
          lastDir = step.via;
        }
        return lastDir;
      }

      queue.push(nxt);
    }
  }

  return pickBestLocalDir({ grid, from, reverseDir, canUseDoor });
}

function pickBestLocalDir(args: {
  grid: MapGrid;
  from: TilePos;
  reverseDir: Dir;
  canUseDoor: boolean;
}): Dir {
  const { grid, from, reverseDir, canUseDoor } = args;

  for (const dir of DIR_ORDER) {
    if (dir === reverseDir) continue;
    const nxt = stepTile(grid, from, dir);
    if (nxt.col !== from.col || nxt.row !== from.row) {
      if (grid.isWalkableForGhost(nxt, canUseDoor)) {
        return dir;
      }
    }
  }

  if (reverseDir !== 'none') {
    const nxt = stepTile(grid, from, reverseDir);
    if (grid.isWalkableForGhost(nxt, canUseDoor)) {
      return reverseDir;
    }
  }

  return 'none';
}

export function getDistanceSquared(a: TilePos, b: TilePos): number {
  const dx = a.col - b.col;
  const dy = a.row - b.row;
  return dx * dx + dy * dy;
}
