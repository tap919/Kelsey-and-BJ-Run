/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GamePhase {
  HOME = 'home',
  CHARACTER_SELECT = 'character_select',
  STARTING_P1 = 'starting_p1',
  PLAYING_P1 = 'playing_p1',
  HANDOFF = 'handoff',
  STARTING_P2 = 'starting_p2',
  PLAYING_P2 = 'playing_p2',
  RESULTS = 'results'
}

export interface PlayerStats {
  score: number;
  distance: number;
  character: 'girl' | 'boy';
}

export interface GameState {
  phase: GamePhase;
  p1Stats: PlayerStats | null;
  p2Stats: PlayerStats | null;
  currentSeed: number;
}

export enum LaneType {
  GRASS = 'grass',
  ROAD = 'road',
}

export interface Lane {
  id: number;
  type: LaneType;
  y: number;
  color: string;
  speed?: number; // Speed of vehicles
  direction?: number; // 1 or -1
  obstacles: Array<{
    x: number;
    width: number;
    type: string;
  }>;
}
