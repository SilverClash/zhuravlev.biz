<script lang="ts">
  import { onMount } from 'svelte';
  import type { HudState, Dir } from '$lib/games/pacmoon/types';
  import { GameEngine } from '$lib/games/pacmoon';
  import { InputManager } from '$lib/games/pacmoon/input/input-manager';

  let canvas: HTMLCanvasElement | null = $state(null);
  let containerEl: HTMLDivElement | null = $state(null);

  let hudState = $state<HudState>({
    score: 0,
    lives: 3,
    level: 1,
    phase: 'start'
  });

  let canvasWidth = $state(0);
  let canvasHeight = $state(0);
  let dpr = $state(1);

  let engine: GameEngine | null = null;
  let inputManager: InputManager | null = null;

  function updateDpr() {
    dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  }

  function handleResize() {
    if (!containerEl) return;
    canvasWidth = containerEl.clientWidth;
    canvasHeight = containerEl.clientHeight;
    if (engine) {
      engine.resize(canvasWidth, canvasHeight);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.code === 'Space') {
      if (hudState.phase === 'start') {
        engine?.setPhase('playing');
        engine?.start();
      } else if (hudState.phase === 'paused') {
        engine?.setPhase('playing');
      } else if (hudState.phase === 'game_over') {
        engine?.reset();
        engine?.setPhase('playing');
        engine?.start();
      } else if (hudState.phase === 'life_lost') {
        engine?.setPhase('playing');
      } else if (hudState.phase === 'level_clear') {
        engine?.setPhase('playing');
      }
    }
    if (event.code === 'Escape' && hudState.phase === 'playing') {
      engine?.setPhase('paused');
    }
  }

  function handleTouchStart(event: TouchEvent) {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      inputManager?.handleTouchStart(touch.clientX, touch.clientY);
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    if (event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      inputManager?.handleTouchEnd(touch.clientX, touch.clientY);
    }
  }

  onMount(() => {
    updateDpr();
    handleResize();

    inputManager = new InputManager();
    inputManager.attach();

    if (canvas) {
      engine = new GameEngine(canvas, {
        onHudUpdate: (hud) => {
          hudState = hud;
        }
      });
      engine.resize(canvasWidth, canvasHeight);
      engine.start();
    }

    const ro = new ResizeObserver(handleResize);
    if (containerEl) ro.observe(containerEl);

    window.addEventListener('resize', updateDpr);
    window.addEventListener('keydown', handleKeyDown);

    const inputLoop = setInterval(() => {
      if (inputManager && engine && engine.getPhase() === 'playing') {
        const dir = inputManager.getDesiredDir();
        if (dir !== 'none') {
          engine.setDesiredDirection(dir);
        }
      }
    }, 16);

    return () => {
      clearInterval(inputLoop);
      ro.disconnect();
      engine?.stop();
      inputManager?.detach();
      window.removeEventListener('resize', updateDpr);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });
</script>

<div
  class="view-container"
  bind:this={containerEl}
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
>
  <canvas
    bind:this={canvas}
    width={Math.floor(canvasWidth * dpr)}
    height={Math.floor(canvasHeight * dpr)}
    style="width: {canvasWidth}px; height: {canvasHeight}px;"
  ></canvas>

  <!-- HUD Overlay -->
  <div class="hud">
    <div class="hud-top">
      <span class="score">SCORE: {hudState.score}</span>
      <span class="level">LEVEL {hudState.level}</span>
      <span class="lives">{'●'.repeat(hudState.lives)}</span>
    </div>
  </div>

  <!-- State Overlays -->
  {#if hudState.phase === 'start'}
    <div class="overlay">
      <div class="overlay-text">
        <h1>PACMOON</h1>
        <p>Press SPACE to Start</p>
      </div>
    </div>
  {/if}

  {#if hudState.phase === 'paused'}
    <div class="overlay">
      <div class="overlay-text">
        <h1>PAUSED</h1>
        <p>Press SPACE to Resume</p>
      </div>
    </div>
  {/if}

  {#if hudState.phase === 'game_over'}
    <div class="overlay">
      <div class="overlay-text game-over">
        <h1>GAME OVER</h1>
        <p>Press SPACE to Restart</p>
      </div>
    </div>
  {/if}

  {#if hudState.phase === 'life_lost'}
    <div class="overlay">
      <div class="overlay-text">
        <h1>OUCH!</h1>
        <p>Press SPACE to Continue</p>
      </div>
    </div>
  {/if}

  {#if hudState.phase === 'level_clear'}
    <div class="overlay">
      <div class="overlay-text">
        <h1>LEVEL CLEAR!</h1>
        <p>Press SPACE for Next Level</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .view-container {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  canvas {
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    padding: 1rem;
  }

  .hud-top {
    display: flex;
    justify-content: space-between;
    font-family: 'Courier New', monospace;
    font-size: 1.25rem;
    font-weight: bold;
    color: #fff;
    text-shadow: 2px 2px 0 #000;
  }

  .lives {
    color: #ffff00;
    letter-spacing: 0.25em;
  }

  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
  }

  .overlay-text {
    text-align: center;
    font-family: 'Courier New', monospace;
    color: #ffff00;
  }

  .overlay-text h1 {
    font-size: 3rem;
    margin: 0 0 1rem;
    letter-spacing: 0.2em;
  }

  .overlay-text p {
    font-size: 1.25rem;
    color: #fff;
    animation: blink 1s ease-in-out infinite;
  }

  .game-over h1 {
    color: #ff0000;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
</style>
