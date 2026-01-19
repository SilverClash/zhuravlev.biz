import { WORLD_W, WORLD_H } from './config';

export type ViewportMode = 'contain' | 'cover';

export interface Viewport {
  vwCss: number;
  vhCss: number;
  dpr: number;
  scaleDevice: number;
  scaleCss: number;
  offsetCssX: number;
  offsetCssY: number;
  offsetDeviceX: number;
  offsetDeviceY: number;
  mode: ViewportMode;
}

export function computeViewport(
  vwCss: number,
  vhCss: number,
  mode: ViewportMode = 'contain',
  dprRaw: number = typeof window !== 'undefined' ? window.devicePixelRatio : 1
): Viewport {
  const dpr = Math.min(2, Math.max(1, dprRaw));

  const scaleX = (vwCss * dpr) / WORLD_W;
  const scaleY = (vhCss * dpr) / WORLD_H;

  const rawScale = mode === 'contain'
    ? Math.min(scaleX, scaleY)
    : Math.max(scaleX, scaleY);

  const scaleDevice = Math.max(1, Math.floor(rawScale));
  const scaleCss = scaleDevice / dpr;

  const mazeCssW = WORLD_W * scaleCss;
  const mazeCssH = WORLD_H * scaleCss;

  const offsetCssX = (vwCss - mazeCssW) / 2;
  const offsetCssY = (vhCss - mazeCssH) / 2;

  const canvasW = Math.round(vwCss * dpr);
  const canvasH = Math.round(vhCss * dpr);
  const mazeDeviceW = WORLD_W * scaleDevice;
  const mazeDeviceH = WORLD_H * scaleDevice;
  const offsetDeviceX = Math.floor((canvasW - mazeDeviceW) / 2);
  const offsetDeviceY = Math.floor((canvasH - mazeDeviceH) / 2);

  return {
    vwCss, vhCss, dpr,
    scaleDevice, scaleCss,
    offsetCssX, offsetCssY,
    offsetDeviceX, offsetDeviceY,
    mode
  };
}

export function resizeCanvasToViewport(
  canvas: HTMLCanvasElement,
  vp: Viewport
): CanvasRenderingContext2D {
  canvas.style.width = `${vp.vwCss}px`;
  canvas.style.height = `${vp.vhCss}px`;

  canvas.width = Math.round(vp.vwCss * vp.dpr);
  canvas.height = Math.round(vp.vhCss * vp.dpr);

  const ctx = canvas.getContext('2d', { alpha: false })!;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

export function beginFrame(ctx: CanvasRenderingContext2D, vp: Viewport): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.setTransform(
    vp.scaleDevice, 0,
    0, vp.scaleDevice,
    vp.offsetDeviceX,
    vp.offsetDeviceY
  );
}

export function cssToWorld(cssX: number, cssY: number, vp: Viewport): { x: number; y: number } {
  const x = (cssX - vp.offsetCssX) / vp.scaleCss;
  const y = (cssY - vp.offsetCssY) / vp.scaleCss;
  return { x, y };
}
