import type { Dir, TilePos, Vec2 } from '../types';
import { DIR_V } from '../types';
import { BASE_TILE } from '../engine/config';
import type { Ghost } from './ghost';
import type { MapGrid } from '../world/map-grid';
import { bfsNextDir } from '../world/pathfinding';

const TS = BASE_TILE;
export const GHOST_HOUSE_TARGET: TilePos = { col: 13, row: 14 };

function clampTarget(target: TilePos, grid: MapGrid): TilePos {
  return {
    col: Math.max(0, Math.min(grid.cols - 1, target.col)),
    row: Math.max(0, Math.min(grid.rows - 1, target.row))
  };
}

export function updateGhostTarget(
  ghost: Ghost,
  pacmoonPos: Vec2,
  pacmoonDir: Dir,
  raPos: Vec2,
  grid: MapGrid
): void {
  if (ghost.mode === 'eaten') {
    ghost.targetTile = GHOST_HOUSE_TARGET;
    return;
  }

  if (ghost.mode === 'frightened') {
    ghost.targetTile = getRandomTarget(ghost, grid);
    return;
  }

  if (ghost.mode === 'scatter') {
    ghost.targetTile = ghost.scatterTarget;
    return;
  }

  const pacmoonTile = {
    col: Math.floor(pacmoonPos.x / TS),
    row: Math.floor(pacmoonPos.y / TS)
  };

  switch (ghost.name) {
    case 'ra':
      ghost.targetTile = pacmoonTile;
      break;

    case 'bastet':
      ghost.targetTile = clampTarget(getTileAhead(pacmoonTile, pacmoonDir, 4), grid);
      break;

    case 'thoth':
      ghost.targetTile = clampTarget(getThothTarget(pacmoonTile, pacmoonDir, raPos), grid);
      break;

    case 'anubis':
      ghost.targetTile = getAnubisTarget(ghost, pacmoonTile);
      break;
  }
}

function getTileAhead(tile: TilePos, dir: Dir, distance: number): TilePos {
  const v = DIR_V[dir];
  return {
    col: tile.col + v.x * distance,
    row: tile.row + v.y * distance
  };
}

function getThothTarget(pacmoonTile: TilePos, pacmoonDir: Dir, raPos: Vec2): TilePos {
  const twoAhead = getTileAhead(pacmoonTile, pacmoonDir, 2);
  const raTile = {
    col: Math.floor(raPos.x / TS),
    row: Math.floor(raPos.y / TS)
  };

  return {
    col: twoAhead.col + (twoAhead.col - raTile.col),
    row: twoAhead.row + (twoAhead.row - raTile.row)
  };
}

function getAnubisTarget(ghost: Ghost, pacmoonTile: TilePos): TilePos {
  const ghostTile = ghost.getTilePos();
  const dx = ghostTile.col - pacmoonTile.col;
  const dy = ghostTile.row - pacmoonTile.row;
  const distSq = dx * dx + dy * dy;

  if (distSq > 64) {
    return pacmoonTile;
  }
  return ghost.scatterTarget;
}

function getRandomTarget(ghost: Ghost, grid: MapGrid): TilePos {
  const current = ghost.getTilePos();
  const offset = Math.floor(Math.random() * 10) - 5;
  return {
    col: Math.max(0, Math.min(grid.cols - 1, current.col + offset)),
    row: Math.max(0, Math.min(grid.rows - 1, current.row + offset))
  };
}

export function chooseGhostDirection(ghost: Ghost, grid: MapGrid): Dir {
  const currentTile = ghost.getTilePos();

  return bfsNextDir({
    grid,
    from: currentTile,
    to: ghost.targetTile,
    currentDir: ghost.dir,
    canUseDoor: ghost.canUseDoor()
  });
}
