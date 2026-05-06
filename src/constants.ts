/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const GRID_SIZE = 50;
export const GAME_WIDTH = 400; // Fixed width for mobile portrait
export const GAME_HEIGHT = 700; // Viewport height

export const LANES_IN_VIEW = 14; 
export const PLAYER_START_Y = GRID_SIZE * 10;

// Seeded random (Mulberry32)
export function createRandom(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
