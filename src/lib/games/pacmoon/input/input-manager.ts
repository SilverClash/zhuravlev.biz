import type { Dir } from '../types';

export interface InputState {
  desiredDir: Dir;
}

export class InputManager {
  private desiredDir: Dir = 'none';
  private keydownHandler: (e: KeyboardEvent) => void;
  private touchStartPos: { x: number; y: number } | null = null;

  constructor() {
    this.keydownHandler = this.handleKeyDown.bind(this);
  }

  attach(): void {
    window.addEventListener('keydown', this.keydownHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keydownHandler);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.desiredDir = 'up';
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.desiredDir = 'down';
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.desiredDir = 'left';
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.desiredDir = 'right';
        e.preventDefault();
        break;
    }
  }

  handleTouchStart(x: number, y: number): void {
    this.touchStartPos = { x, y };
  }

  handleTouchEnd(x: number, y: number): void {
    if (!this.touchStartPos) return;

    const dx = x - this.touchStartPos.x;
    const dy = y - this.touchStartPos.y;
    const minSwipe = 30;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minSwipe) {
        this.desiredDir = dx > 0 ? 'right' : 'left';
      }
    } else {
      if (Math.abs(dy) > minSwipe) {
        this.desiredDir = dy > 0 ? 'down' : 'up';
      }
    }

    this.touchStartPos = null;
  }

  setDirection(dir: Dir): void {
    this.desiredDir = dir;
  }

  getDesiredDir(): Dir {
    return this.desiredDir;
  }

  consumeDir(): Dir {
    const dir = this.desiredDir;
    return dir;
  }
}
