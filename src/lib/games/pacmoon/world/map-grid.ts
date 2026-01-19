import type { Tile, TilePos, Vec2 } from '../types';
import { COLS, ROWS, BASE_TILE } from '../engine/config';
import type { LevelData } from './level-data';

const TS = BASE_TILE;

function charToTile(char: string): Tile {
	switch (char) {
		case '#':
			return 'wall';
		case '.':
			return 'pellet';
		case 'o':
			return 'power';
		case '-':
			return 'door';
		case 'T':
			return 'tunnel';
		default:
			return 'empty';
	}
}

export class MapGrid {
	readonly cols = COLS;
	readonly rows = ROWS;
	private tiles: Tile[][];
	private pelletsRemaining = 0;

	constructor(levelData: LevelData) {
		this.tiles = [];
		for (let row = 0; row < ROWS; row++) {
			const rowTiles: Tile[] = [];
			const mazeRow = levelData.maze[row] || '';
			for (let col = 0; col < COLS; col++) {
				const char = mazeRow[col] || ' ';
				const tile = charToTile(char);
				rowTiles.push(tile);
				if (tile === 'pellet' || tile === 'power') {
					this.pelletsRemaining++;
				}
			}
			this.tiles.push(rowTiles);
		}
	}

	getTile(pos: TilePos): Tile {
		if (pos.row < 0 || pos.row >= this.rows) return 'wall';
		if (pos.col < 0 || pos.col >= this.cols) return 'wall';
		return this.tiles[pos.row][pos.col];
	}

	getTileWrapped(pos: TilePos): Tile {
		if (pos.row < 0 || pos.row >= this.rows) return 'wall';
		let col = pos.col;
		if (col < 0) col = this.cols - 1;
		if (col >= this.cols) col = 0;
		return this.tiles[pos.row][col];
	}

	setTile(pos: TilePos, tile: Tile): void {
		if (pos.row < 0 || pos.row >= this.rows) return;
		if (pos.col < 0 || pos.col >= this.cols) return;
		this.tiles[pos.row][pos.col] = tile;
	}

	consumePellet(pos: TilePos): 'pellet' | 'power' | null {
		const tile = this.getTile(pos);
		if (tile === 'pellet' || tile === 'power') {
			this.setTile(pos, 'empty');
			this.pelletsRemaining--;
			return tile;
		}
		return null;
	}

	getPelletsRemaining(): number {
		return this.pelletsRemaining;
	}

	isWalkable(pos: TilePos): boolean {
		const tile = this.getTileWrapped(pos);
		return tile !== 'wall' && tile !== 'door';
	}

	isWalkableForGhost(pos: TilePos, canUseDoor: boolean): boolean {
		const tile = this.getTileWrapped(pos);
		if (tile === 'wall') return false;
		if (tile === 'door') return canUseDoor;
		return true;
	}

	posToTile(pos: Vec2): TilePos {
		return {
			col: Math.floor(pos.x / TS),
			row: Math.floor(pos.y / TS)
		};
	}

	tileToPos(tile: TilePos): Vec2 {
		return {
			x: (tile.col + 0.5) * TS,
			y: (tile.row + 0.5) * TS
		};
	}

	getTileCenter(pos: TilePos): Vec2 {
		return {
			x: (pos.col + 0.5) * TS,
			y: (pos.row + 0.5) * TS
		};
	}

	forEachTile(callback: (pos: TilePos, tile: Tile) => void): void {
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				callback({ col, row }, this.tiles[row][col]);
			}
		}
	}
}
