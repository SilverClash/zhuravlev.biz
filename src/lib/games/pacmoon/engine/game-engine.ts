import type { HudState, GamePhase, Dir, Vec2, TilePos, GhostName } from '../types';
import {
	FRAME_MS,
	WORLD_W,
	BASE_TILE,
	PACMOON_SPEED,
	PELLET_SCORE,
	POWER_PELLET_SCORE,
	INITIAL_LIVES,
	CENTER_EPS_PX,
	COLLISION_DIST_PX,
	GHOST_BASE_SCORE
} from './config';
import { computeViewport, beginFrame, type Viewport } from './viewport';
import { MapGrid } from '../world/map-grid';
import { getLevelData, type LevelData } from '../world/level-data';
import { drawMaze, drawPellets, drawPacmoon, drawReadyText, drawGhost } from '../render/renderer';
import { DIR_V } from '../types';
import { Ghost } from '../entities/ghost';
import { updateGhostTarget, chooseGhostDirection, GHOST_HOUSE_TARGET } from '../entities/ghost-ai';

const TS = BASE_TILE;

const GHOST_NAMES: GhostName[] = ['ra', 'bastet', 'thoth', 'anubis'];

function getFrightenedDurationMs(level: number): number {
	if (level === 1) return 6000;
	if (level === 2) return 5000;
	if (level === 3) return 4000;
	if (level === 4) return 3000;
	return 2000;
}

export interface GameCallbacks {
	onHudUpdate: (hud: HudState) => void;
}

export class GameEngine {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private viewport: Viewport;
	private callbacks: GameCallbacks;

	private animationId: number | null = null;
	private lastTime = 0;
	private accumulator = 0;
	private gameTimeMs = 0;

	private levelData: LevelData;
	private grid: MapGrid;
	private pacmoonPos: Vec2;
	private pacmoonDir: Dir = 'none';
	private desiredDir: Dir = 'none';

	private ghosts: Ghost[] = [];
	private ghostsEatenCombo = 0;
	private modeTimer = 0;
	private modeIndex = 0;
	private globalMode: 'scatter' | 'chase' = 'scatter';

	private hud: HudState;
	private powerPelletBlink = true;
	private blinkTimer = 0;

	constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d', { alpha: false })!;
		this.ctx.imageSmoothingEnabled = false;
		this.callbacks = callbacks;

		this.viewport = computeViewport(canvas.clientWidth, canvas.clientHeight);

		this.levelData = getLevelData(1);
		this.grid = new MapGrid(this.levelData);
		this.pacmoonPos = this.grid.tileToPos(this.levelData.pacmoonSpawn);
		this.initGhosts();

		this.hud = {
			score: 0,
			lives: INITIAL_LIVES,
			level: 1,
			phase: 'start'
		};

		this.emitHud();
	}

	private initGhosts(): void {
		this.ghosts = [];
		for (const name of GHOST_NAMES) {
			const spawn = this.levelData.ghostSpawns[name];
			const scatter = this.levelData.scatterTargets[name];
			const pos = this.grid.tileToPos(spawn);
			const ghost = new Ghost(name, pos, scatter);
			this.ghosts.push(ghost);
		}
	}

	resize(width: number, height: number): void {
		this.viewport = computeViewport(width, height);
		this.ctx.imageSmoothingEnabled = false;
	}

	setDesiredDirection(dir: Dir): void {
		this.desiredDir = dir;
	}

	setPhase(phase: GamePhase): void {
		this.hud.phase = phase;
		this.emitHud();
	}

	getPhase(): GamePhase {
		return this.hud.phase;
	}

	start(): void {
		if (this.animationId !== null) return;
		this.lastTime = performance.now();
		this.accumulator = 0;
		this.loop(this.lastTime);
	}

	stop(): void {
		if (this.animationId !== null) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}
	}

	reset(): void {
		this.stop();

		this.levelData = getLevelData(1);
		this.grid = new MapGrid(this.levelData);
		this.pacmoonPos = this.grid.tileToPos(this.levelData.pacmoonSpawn);
		this.pacmoonDir = 'none';
		this.desiredDir = 'none';
		this.gameTimeMs = 0;
		this.modeTimer = 0;
		this.modeIndex = 0;
		this.globalMode = 'scatter';
		this.ghostsEatenCombo = 0;

		this.initGhosts();

		this.hud = {
			score: 0,
			lives: INITIAL_LIVES,
			level: 1,
			phase: 'start'
		};

		this.emitHud();
		this.render();
	}

	private loop = (time: number): void => {
		let dt = time - this.lastTime;
		this.lastTime = time;

		dt = Math.min(dt, 100);

		if (this.hud.phase === 'playing') {
			this.accumulator = Math.min(this.accumulator + dt, FRAME_MS * 5);

			while (this.accumulator >= FRAME_MS) {
				this.update(FRAME_MS);
				this.accumulator -= FRAME_MS;
			}
		}

		this.render();
		this.animationId = requestAnimationFrame(this.loop);
	};

	private update(dtMs: number): void {
		this.gameTimeMs += dtMs;

		this.blinkTimer += dtMs;
		if (this.blinkTimer >= 200) {
			this.blinkTimer = 0;
			this.powerPelletBlink = !this.powerPelletBlink;
		}

		this.updateModeTimer(dtMs);
		this.updatePacmoon(dtMs);
		this.checkPelletConsumption();
		this.updateGhosts(dtMs);
		this.checkGhostCollisions();
		this.checkLevelClear();
	}

	private updateModeTimer(dtMs: number): void {
		const schedule = this.getModeSchedule();
		if (this.modeIndex >= schedule.length) return;

		this.modeTimer += dtMs;
		if (this.modeTimer >= schedule[this.modeIndex]) {
			this.modeTimer = 0;
			this.modeIndex++;
			this.globalMode = this.modeIndex % 2 === 0 ? 'scatter' : 'chase';

			for (const ghost of this.ghosts) {
				if (ghost.mode !== 'frightened' && ghost.mode !== 'eaten') {
					ghost.mode = this.globalMode;
					ghost.reverseDirection();
				}
			}
		}
	}

	private getModeSchedule(): number[] {
		const level = this.hud.level;
		if (level === 1) {
			return [7000, 20000, 7000, 20000, 5000, 20000, 5000, Infinity];
		}
		if (level >= 2 && level <= 4) {
			return [7000, 20000, 7000, 20000, 5000, 20000, 5000, Infinity];
		}
		return [5000, 20000, 5000, 20000, 5000, 20000, 5000, Infinity];
	}

	private updatePacmoon(dtMs: number): void {
		const speed = PACMOON_SPEED * (dtMs / 1000);

		if (this.desiredDir !== 'none') {
			const newDir = this.tryTurn(this.desiredDir);
			if (newDir !== this.pacmoonDir) {
				this.pacmoonDir = newDir;
			}
		}

		if (this.pacmoonDir === 'none') return;

		const v = DIR_V[this.pacmoonDir];
		const newX = this.pacmoonPos.x + v.x * speed;
		const newY = this.pacmoonPos.y + v.y * speed;

		const canMove = this.canMoveTo({ x: newX, y: newY }, this.pacmoonDir);

		if (canMove) {
			this.pacmoonPos.x = newX;
			this.pacmoonPos.y = newY;
			this.wrapPosition();
		} else {
			this.snapToCenter();
			this.pacmoonDir = 'none';
		}
		
		// Log every 500ms to see position over time
		if (Math.floor(this.gameTimeMs / 500) !== Math.floor((this.gameTimeMs - FRAME_MS) / 500)) {
			console.log('[position]', {
				time: Math.floor(this.gameTimeMs),
				x: this.pacmoonPos.x.toFixed(1),
				y: this.pacmoonPos.y.toFixed(1),
				dir: this.pacmoonDir
			});
		}
	}

	private updateGhosts(dtMs: number): void {
		const ra = this.ghosts.find((g) => g.name === 'ra')!;

		for (const ghost of this.ghosts) {
			ghost.updateFrightened(dtMs, this.globalMode);

			if (ghost.mode !== 'frightened' && ghost.mode !== 'eaten') {
				ghost.mode = this.globalMode;
			}

			updateGhostTarget(ghost, this.pacmoonPos, this.pacmoonDir, ra.pos, this.grid);

			if (ghost.isAtTileCenter()) {
				const newDir = chooseGhostDirection(ghost, this.grid);
				if (newDir !== 'none') {
					ghost.dir = newDir;
				}
			}

			const tile = ghost.getTilePos();
			const isInTunnel = this.grid.getTile(tile) === 'tunnel';
			const speed = ghost.getSpeed(isInTunnel) * (dtMs / 1000);

			if (ghost.dir !== 'none') {
				const v = DIR_V[ghost.dir];
				ghost.pos.x += v.x * speed;
				ghost.pos.y += v.y * speed;
				ghost.wrapPosition();
			}

			if (ghost.mode === 'eaten') {
				const houseCenter = {
					x: (GHOST_HOUSE_TARGET.col + 0.5) * TS,
					y: (GHOST_HOUSE_TARGET.row + 0.5) * TS
				};
				const dist = Math.abs(ghost.pos.x - houseCenter.x) + Math.abs(ghost.pos.y - houseCenter.y);
				if (dist < 4) {
					ghost.respawn();
					ghost.pos = { ...houseCenter };
				}
			}
		}
	}

	private tryTurn(dir: Dir): Dir {
		// If already moving in desired direction, no turn needed
		if (dir === this.pacmoonDir) {
			return this.pacmoonDir;
		}

		const tilePos = this.grid.posToTile(this.pacmoonPos);
		const center = this.grid.getTileCenter(tilePos);

		if (this.pacmoonDir === 'none') {
			const nextTile = this.getNextTile(tilePos, dir);
			if (this.grid.isWalkable(nextTile)) {
				this.pacmoonPos.x = center.x;
				this.pacmoonPos.y = center.y;
				return dir;
			}
			return 'none';
		}

		if (this.isOpposite(dir, this.pacmoonDir)) {
			return dir;
		}

		const eps = CENTER_EPS_PX * 4;

		if ((dir === 'up' || dir === 'down') && Math.abs(this.pacmoonPos.x - center.x) > eps) {
			return this.pacmoonDir;
		}
		if ((dir === 'left' || dir === 'right') && Math.abs(this.pacmoonPos.y - center.y) > eps) {
			return this.pacmoonDir;
		}

		const nextTile = this.getNextTile(tilePos, dir);
		if (this.grid.isWalkable(nextTile)) {
			this.pacmoonPos.x = center.x;
			this.pacmoonPos.y = center.y;
			return dir;
		}

		return this.pacmoonDir;
	}

	private isOpposite(a: Dir, b: Dir): boolean {
		return (
			(a === 'up' && b === 'down') ||
			(a === 'down' && b === 'up') ||
			(a === 'left' && b === 'right') ||
			(a === 'right' && b === 'left')
		);
	}

	private getNextTile(pos: TilePos, dir: Dir): TilePos {
		const v = DIR_V[dir];
		return { col: pos.col + v.x, row: pos.row + v.y };
	}

	private canMoveTo(pos: Vec2, dir: Dir): boolean {
		const v = DIR_V[dir];
		const probeX = pos.x + v.x * 4;
		const probeY = pos.y + v.y * 4;

		const tilePos = {
			col: Math.floor(probeX / TS),
			row: Math.floor(probeY / TS)
		};

		return this.grid.isWalkable(tilePos);
	}

	private snapToCenter(): void {
		const tilePos = this.grid.posToTile(this.pacmoonPos);
		const center = this.grid.getTileCenter(tilePos);
		this.pacmoonPos.x = center.x;
		this.pacmoonPos.y = center.y;
	}

	private wrapPosition(): void {
		if (this.pacmoonPos.x < 0) {
			this.pacmoonPos.x += WORLD_W;
		} else if (this.pacmoonPos.x >= WORLD_W) {
			this.pacmoonPos.x -= WORLD_W;
		}
	}

	private checkPelletConsumption(): void {
		const tilePos = this.grid.posToTile(this.pacmoonPos);
		const consumed = this.grid.consumePellet(tilePos);

		if (consumed === 'pellet') {
			this.hud.score += PELLET_SCORE;
			this.emitHud();
		} else if (consumed === 'power') {
			this.hud.score += POWER_PELLET_SCORE;
			this.ghostsEatenCombo = 0;
			const duration = getFrightenedDurationMs(this.hud.level);
			for (const ghost of this.ghosts) {
				ghost.setFrightened(duration);
			}
			this.emitHud();
		}
	}

	private checkGhostCollisions(): void {
		for (const ghost of this.ghosts) {
			const dx = this.pacmoonPos.x - ghost.pos.x;
			const dy = this.pacmoonPos.y - ghost.pos.y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist < COLLISION_DIST_PX) {
				if (ghost.mode === 'frightened') {
					ghost.setEaten();
					this.ghostsEatenCombo++;
					const score = GHOST_BASE_SCORE * Math.pow(2, this.ghostsEatenCombo - 1);
					this.hud.score += score;
					this.emitHud();
				} else if (ghost.mode !== 'eaten') {
					this.handleLifeLost();
					return;
				}
			}
		}
	}

	private handleLifeLost(): void {
		console.log('[LIFE LOST]', { lives: this.hud.lives, pacPos: this.pacmoonPos });
		this.hud.lives--;
		if (this.hud.lives <= 0) {
			this.hud.phase = 'game_over';
		} else {
			this.hud.phase = 'life_lost';
			this.resetPositions();
		}
		this.emitHud();
	}

	private resetPositions(): void {
		this.pacmoonPos = this.grid.tileToPos(this.levelData.pacmoonSpawn);
		this.pacmoonDir = 'none';
		this.desiredDir = 'none';
		this.modeTimer = 0;
		this.modeIndex = 0;
		this.globalMode = 'scatter';

		for (let i = 0; i < this.ghosts.length; i++) {
			const name = GHOST_NAMES[i];
			const spawn = this.levelData.ghostSpawns[name];
			const pos = this.grid.tileToPos(spawn);
			this.ghosts[i].pos = { ...pos };
			this.ghosts[i].mode = 'scatter';
			this.ghosts[i].frightenedTimeRemaining = 0;
			this.ghosts[i].dir = name === 'ra' ? 'left' : 'up';
		}
	}

	private checkLevelClear(): void {
		if (this.grid.getPelletsRemaining() === 0) {
			this.hud.phase = 'level_clear';
			this.emitHud();
		}
	}

	private render(): void {
		beginFrame(this.ctx, this.viewport);

		drawMaze(this.ctx, this.grid);
		drawPellets(this.ctx, this.grid, this.powerPelletBlink);

		if (this.hud.phase === 'start') {
			drawReadyText(this.ctx);
		}

		for (const ghost of this.ghosts) {
			drawGhost(
				this.ctx,
				ghost.pos,
				ghost.name,
				ghost.mode,
				ghost.dir,
				this.gameTimeMs,
				ghost.frightenedTimeRemaining
			);
		}

		drawPacmoon(
			this.ctx,
			this.pacmoonPos,
			this.pacmoonDir === 'none' ? 'right' : this.pacmoonDir,
			this.gameTimeMs
		);
	}

	private emitHud(): void {
		this.callbacks.onHudUpdate({ ...this.hud });
	}
}
