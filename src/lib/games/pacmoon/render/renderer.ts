import type { Dir, Vec2, TilePos, GhostMode, GhostName } from '../types';
import {
	BASE_TILE,
	PACMOON_RADIUS,
	GHOST_RADIUS,
	MOUTH_OPEN_MAX_DEG,
	MOUTH_OPEN_MIN_DEG,
	MOUTH_CYCLE_MS
} from '../engine/config';
import { PALETTE, APOPHIS_SCHEMES } from './palette';
import type { MapGrid } from '../world/map-grid';

const TS = BASE_TILE;

const DIR_ANGLE: Record<Dir, number> = {
	right: 0,
	down: Math.PI / 2,
	left: Math.PI,
	up: -Math.PI / 2,
	none: 0
};

export function drawMaze(ctx: CanvasRenderingContext2D, grid: MapGrid): void {
	grid.forEachTile((pos, tile) => {
		const x = pos.col * TS;
		const y = pos.row * TS;

		if (tile === 'wall') {
			drawWallTile(ctx, pos, grid);
		} else if (tile === 'door') {
			ctx.fillStyle = PALETTE.DOOR;
			ctx.fillRect(x, y + TS * 0.4, TS, TS * 0.2);
		}
	});
}

function drawWallTile(ctx: CanvasRenderingContext2D, pos: TilePos, grid: MapGrid): void {
	const x = pos.col * TS;
	const y = pos.row * TS;

	ctx.fillStyle = PALETTE.WALL_OUTER;
	ctx.fillRect(x + 2, y + 2, TS - 4, TS - 4);

	ctx.fillStyle = PALETTE.WALL_INNER;
	ctx.fillRect(x + 4, y + 4, TS - 8, TS - 8);

	ctx.fillStyle = PALETTE.BACKGROUND;
	ctx.fillRect(x + 5, y + 5, TS - 10, TS - 10);
}

export function drawPellets(
	ctx: CanvasRenderingContext2D,
	grid: MapGrid,
	powerPelletVisible: boolean
): void {
	grid.forEachTile((pos, tile) => {
		const cx = (pos.col + 0.5) * TS;
		const cy = (pos.row + 0.5) * TS;

		if (tile === 'pellet') {
			drawAsteroid(ctx, cx, cy, 2.5, pos.col * 7 + pos.row * 13);
		} else if (tile === 'power' && powerPelletVisible) {
			drawAsteroid(ctx, cx, cy, 6, pos.col * 11 + pos.row * 17);
		}
	});
}

function drawAsteroid(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	radius: number,
	seed: number
): void {
	const points = 7;
	const angleStep = (Math.PI * 2) / points;

	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate((seed % 6) * 0.5);

	const gradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius * 1.2);
	gradient.addColorStop(0, '#c4b89a');
	gradient.addColorStop(0.5, '#9a8f78');
	gradient.addColorStop(1, '#6b6355');
	ctx.fillStyle = gradient;

	ctx.beginPath();
	for (let i = 0; i < points; i++) {
		const angle = i * angleStep;
		const variation = 0.7 + ((seed * (i + 1) * 31) % 100) / 200;
		const r = radius * variation;
		const x = Math.cos(angle) * r;
		const y = Math.sin(angle) * r;
		if (i === 0) {
			ctx.moveTo(x, y);
		} else {
			ctx.lineTo(x, y);
		}
	}
	ctx.closePath();
	ctx.fill();

	if (radius > 4) {
		ctx.fillStyle = 'rgba(80, 70, 55, 0.5)';
		ctx.beginPath();
		ctx.arc(radius * 0.2, radius * 0.1, radius * 0.25, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(-radius * 0.3, -radius * 0.2, radius * 0.15, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
}

export function drawPacmoon(
	ctx: CanvasRenderingContext2D,
	pos: Vec2,
	dir: Dir,
	timeMs: number
): void {
	const mouthMaxRad = (MOUTH_OPEN_MAX_DEG * Math.PI) / 180;
	const mouthMinRad = (MOUTH_OPEN_MIN_DEG * Math.PI) / 180;

	const t = (timeMs % MOUTH_CYCLE_MS) / MOUTH_CYCLE_MS;
	const mouthAngle = mouthMinRad + (mouthMaxRad - mouthMinRad) * triWave01(t);

	const angle = DIR_ANGLE[dir];
	const r = PACMOON_RADIUS;

	ctx.save();
	ctx.translate(pos.x, pos.y);
	ctx.rotate(angle);

	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.arc(0, 0, r, mouthAngle, Math.PI * 2 - mouthAngle);
	ctx.closePath();
	ctx.clip();

	const gradient = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 1.2);
	gradient.addColorStop(0, '#fffef0');
	gradient.addColorStop(0.4, '#e8e4d0');
	gradient.addColorStop(0.7, '#c9c4a8');
	gradient.addColorStop(1, '#a09878');
	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.arc(0, 0, r, 0, Math.PI * 2);
	ctx.fill();

	drawMoonCraters(ctx, r);

	ctx.restore();
}

function triWave01(t: number): number {
	const sawtooth = t * 2;
	return sawtooth <= 1 ? sawtooth : 2 - sawtooth;
}

function drawMoonCraters(ctx: CanvasRenderingContext2D, r: number): void {
	const craters = [
		{ x: -0.3, y: -0.25, size: 0.22 },
		{ x: 0.35, y: 0.1, size: 0.18 },
		{ x: -0.1, y: 0.4, size: 0.15 },
		{ x: 0.25, y: -0.35, size: 0.12 },
		{ x: -0.45, y: 0.15, size: 0.1 },
		{ x: 0.1, y: -0.1, size: 0.08 }
	];

	for (const crater of craters) {
		const cx = crater.x * r;
		const cy = crater.y * r;
		const cr = crater.size * r;

		const craterGradient = ctx.createRadialGradient(cx - cr * 0.2, cy - cr * 0.2, 0, cx, cy, cr);
		craterGradient.addColorStop(0, '#b8b4a0');
		craterGradient.addColorStop(0.6, '#9a9684');
		craterGradient.addColorStop(1, '#7a7668');

		ctx.fillStyle = craterGradient;
		ctx.beginPath();
		ctx.arc(cx, cy, cr, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = 'rgba(90, 86, 74, 0.4)';
		ctx.lineWidth = 0.3;
		ctx.beginPath();
		ctx.arc(cx, cy, cr * 0.95, 0, Math.PI * 2);
		ctx.stroke();
	}
}

export function drawGhost(
	ctx: CanvasRenderingContext2D,
	pos: Vec2,
	name: GhostName,
	mode: GhostMode,
	dir: Dir,
	timeMs: number,
	frightenedMsRemaining: number
): void {
	if (mode === 'eaten') {
		drawApophisEyes(ctx, pos, dir);
		return;
	}

	const scheme = APOPHIS_SCHEMES[name];
	const baseColor = mode === 'frightened' ? getFrightenedColor(frightenedMsRemaining) : scheme.body;
	const accentColor = mode === 'frightened' ? PALETTE.FRIGHTENED_BLINK : scheme.accent;

	ctx.save();
	ctx.translate(pos.x, pos.y);
	ctx.rotate(DIR_ANGLE[dir]);

	const t = timeMs / 1000;
	const wave1 = Math.sin(t * 12) * 1.5;
	const wave2 = Math.sin(t * 12 + 1.5) * 2;
	const wave3 = Math.sin(t * 12 + 3) * 2.5;

	ctx.strokeStyle = 'rgba(0,0,0,0.35)';
	ctx.lineWidth = 4;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	ctx.moveTo(4, 0);
	ctx.quadraticCurveTo(0, wave1, -4, wave2);
	ctx.quadraticCurveTo(-6, wave2 + 1, -7, wave3 + 2);
	ctx.stroke();

	ctx.strokeStyle = baseColor;
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(4, 0);
	ctx.quadraticCurveTo(0, wave1, -4, wave2);
	ctx.quadraticCurveTo(-6, wave2 + 1, -7, wave3 + 2);
	ctx.stroke();

	ctx.strokeStyle = accentColor;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(2, wave1 * 0.3);
	ctx.quadraticCurveTo(-1, wave1 * 0.5, -3, wave2 * 0.4);
	ctx.stroke();

	ctx.fillStyle = baseColor;
	ctx.beginPath();
	ctx.ellipse(5, 0, 4, 3, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = 'rgba(0,0,0,0.35)';
	ctx.lineWidth = 1;
	ctx.stroke();

	if (mode !== 'frightened') {
		ctx.fillStyle = '#ffe066';
		ctx.beginPath();
		ctx.ellipse(6, -1.2, 1.3, 0.9, 0, 0, Math.PI * 2);
		ctx.ellipse(6, 1.2, 1.3, 0.9, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#000';
		ctx.beginPath();
		ctx.ellipse(6.3, -1.2, 0.4, 0.7, 0, 0, Math.PI * 2);
		ctx.ellipse(6.3, 1.2, 0.4, 0.7, 0, 0, Math.PI * 2);
		ctx.fill();
	} else {
		ctx.fillStyle = PALETTE.FRIGHTENED_BLINK;
		ctx.beginPath();
		ctx.arc(5.5, -1.2, 1, 0, Math.PI * 2);
		ctx.arc(5.5, 1.2, 1, 0, Math.PI * 2);
		ctx.fill();
	}

	const tongueFrame = Math.floor(timeMs / 80) % 8;
	if (tongueFrame < 2 && mode !== 'frightened') {
		ctx.strokeStyle = scheme.tongue;
		ctx.lineWidth = 1;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(9, 0);
		ctx.lineTo(11, -1);
		ctx.moveTo(9, 0);
		ctx.lineTo(11, 1);
		ctx.stroke();
	}

	ctx.restore();
}

function drawApophisEyes(ctx: CanvasRenderingContext2D, pos: Vec2, dir: Dir): void {
	const eyeOffsetX = 3;
	const eyeOffsetY = -1;
	const eyeRadius = 2.5;
	const pupilRadius = 1.2;

	const pupilOffset = { x: 0, y: 0 };
	if (dir === 'left') pupilOffset.x = -1;
	if (dir === 'right') pupilOffset.x = 1;
	if (dir === 'up') pupilOffset.y = -1;
	if (dir === 'down') pupilOffset.y = 1;

	for (const side of [-1, 1]) {
		const ex = pos.x + side * eyeOffsetX;
		const ey = pos.y + eyeOffsetY;

		ctx.fillStyle = PALETTE.EYE_WHITE;
		ctx.beginPath();
		ctx.arc(ex, ey, eyeRadius, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#1a1a1a';
		ctx.beginPath();
		ctx.arc(ex + pupilOffset.x, ey + pupilOffset.y, pupilRadius, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.fillStyle = PALETTE.EYE_WHITE;
	ctx.beginPath();
	ctx.moveTo(pos.x - 2, pos.y + 2);
	ctx.lineTo(pos.x - 1, pos.y + 5);
	ctx.lineTo(pos.x, pos.y + 2);
	ctx.closePath();
	ctx.fill();

	ctx.beginPath();
	ctx.moveTo(pos.x + 2, pos.y + 2);
	ctx.lineTo(pos.x + 1, pos.y + 5);
	ctx.lineTo(pos.x, pos.y + 2);
	ctx.closePath();
	ctx.fill();
}

function getFrightenedColor(frightenedMsRemaining: number): string {
	const blinkStart = 2000;
	const blinkPeriod = 200;

	if (frightenedMsRemaining > blinkStart) {
		return PALETTE.FRIGHTENED;
	}

	const blinkOn = Math.floor(frightenedMsRemaining / blinkPeriod) % 2 === 0;
	return blinkOn ? PALETTE.FRIGHTENED_BLINK : PALETTE.FRIGHTENED;
}

export function drawReadyText(ctx: CanvasRenderingContext2D): void {
	ctx.fillStyle = PALETTE.TEXT_READY;
	ctx.font = 'bold 14px monospace';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('READY!', 14 * TS, 17.5 * TS);
}
