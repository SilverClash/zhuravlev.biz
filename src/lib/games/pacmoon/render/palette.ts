export const PALETTE = {
  // Background
  BACKGROUND: '#000000',

  // Walls (moon-gray double-stroke style)
  WALL_OUTER: '#5a5a5a',
  WALL_INNER: '#8b8b8b',

  // Pacmoon
  PACMOON: '#ffff00',

  // Egyptian deities (Apophis servants)
  RA: '#ff0000', // Red - Sun god
  BASTET: '#ffb8ff', // Pink - Cat goddess
  THOTH: '#00ffff', // Cyan - Wisdom god
  ANUBIS: '#ffb852', // Orange - Jackal god

  // Ghost modes
  FRIGHTENED: '#2121de',
  FRIGHTENED_BLINK: '#ffffff',
  EATEN: '#ffffff',

  // Pellets
  PELLET: '#ffb897',
  POWER_PELLET: '#ffb897',

  // Ghost house door
  DOOR: '#ffb8de',

  // HUD text
  TEXT: '#ffffff',
  TEXT_READY: '#ffff00',
  TEXT_GAME_OVER: '#ff0000',

  // Ghost eyes
  EYE_WHITE: '#ffffff',
  EYE_PUPIL: '#1a1a1a'
};

import type { GhostName } from '../types';

export const GHOST_COLORS: Record<GhostName, string> = {
  ra: PALETTE.RA,
  bastet: PALETTE.BASTET,
  thoth: PALETTE.THOTH,
  anubis: PALETTE.ANUBIS
};

export const APOPHIS_SCHEMES: Record<GhostName, {
  body: string;
  accent: string;
  disk: string;
  eye: string;
  tongue: string;
}> = {
  ra: { body: '#C0392B', accent: '#D4AF37', disk: '#FFD166', eye: '#0B0B0B', tongue: '#FF4D6D' },
  bastet: { body: '#7D3C98', accent: '#D4AF37', disk: '#F7D6FF', eye: '#120016', tongue: '#FF4D6D' },
  thoth: { body: '#1565C0', accent: '#D4AF37', disk: '#4DD0E1', eye: '#00121F', tongue: '#FF4D6D' },
  anubis: { body: '#C97C2B', accent: '#B08D57', disk: '#FFE29A', eye: '#1A0F00', tongue: '#FF4D6D' }
};
