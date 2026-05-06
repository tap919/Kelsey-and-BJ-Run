/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useReducer, useEffect } from 'react';
import { GamePhase, PlayerStats } from './types';
import HomeScreen from './components/Screens/HomeScreen';
import HandoffScreen from './components/Screens/HandoffScreen';
import ResultScreen from './components/Screens/ResultScreen';
import GameCanvas from './components/GameCanvas';

type AppState = {
  phase: GamePhase;
  p1Stats: PlayerStats | null;
  p2Stats: PlayerStats | null;
  currentSeed: number;
  runId: number;
  isAutoplay: boolean;
};

type Action =
  | { type: 'START_GAME'; autoplay?: boolean }
  | { type: 'P1_GAME_OVER'; distance: number }
  | { type: 'START_P2' }
  | { type: 'P2_GAME_OVER'; distance: number }
  | { type: 'GO_HOME' };

const createSeed = () => Date.now();

const toPlayerStats = (
  distance: number,
  character: PlayerStats['character']
): PlayerStats => ({
  distance,
  score: distance,
  character,
});

const createInitialState = (): AppState => ({
  phase: GamePhase.HOME,
  p1Stats: null,
  p2Stats: null,
  currentSeed: createSeed(),
  runId: 0,
  isAutoplay: false,
});

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'START_GAME':
      return {
        phase: GamePhase.PLAYING_P1,
        p1Stats: null,
        p2Stats: null,
        currentSeed: createSeed(),
        runId: state.runId + 1,
        isAutoplay: !!action.autoplay,
      };

    case 'P1_GAME_OVER':
      if (state.phase !== GamePhase.PLAYING_P1) return state;

      return {
        ...state,
        p1Stats: toPlayerStats(action.distance, 'girl'),
        phase: GamePhase.HANDOFF,
      };

    case 'START_P2':
      if (state.phase !== GamePhase.HANDOFF || !state.p1Stats) return state;

      return {
        ...state,
        phase: GamePhase.PLAYING_P2,
      };

    case 'P2_GAME_OVER':
      if (state.phase !== GamePhase.PLAYING_P2) return state;

      return {
        ...state,
        p2Stats: toPlayerStats(action.distance, 'boy'),
        phase: GamePhase.RESULTS,
      };

    case 'GO_HOME':
      return {
        ...state,
        phase: GamePhase.HOME,
        p1Stats: null,
        p2Stats: null,
      };

    default: {
      const _exhaustive: never = action as any; // Cast as any to avoid TS error if switch is exhaustive but TS doesn't know
      return state;
    }
  }
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);

  const startGame = useCallback((autoplay = false) => {
    dispatch({ type: 'START_GAME', autoplay });
  }, []);

  const handleP1GameOver = useCallback((distance: number) => {
    dispatch({ type: 'P1_GAME_OVER', distance });
  }, []);

  const handleP2GameOver = useCallback((distance: number) => {
    dispatch({ type: 'P2_GAME_OVER', distance });
  }, []);

  const startP2 = useCallback(() => {
    dispatch({ type: 'START_P2' });
  }, []);

  useEffect(() => {
    if (state.phase === GamePhase.HANDOFF && state.isAutoplay) {
      const timer = setTimeout(() => startP2(), 2000);
      return () => clearTimeout(timer);
    }
    if (state.phase === GamePhase.RESULTS && state.isAutoplay) {
      const timer = setTimeout(() => startGame(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.isAutoplay, startP2, startGame]);

  const goHome = useCallback(() => {
    dispatch({ type: 'GO_HOME' });
  }, []);

  const renderScreen = () => {
    switch (state.phase) {
      case GamePhase.HOME:
        return <HomeScreen onStart={startGame} />;

      case GamePhase.PLAYING_P1:
        return (
          <GameCanvas
            key={`run-${state.runId}-p1`}
            character="girl"
            seed={state.currentSeed}
            onGameOver={handleP1GameOver}
            autoplay={state.isAutoplay}
          />
        );

      case GamePhase.HANDOFF:
        return state.p1Stats ? (
          <HandoffScreen
            p1Score={state.p1Stats.distance}
            onStartP2={startP2}
          />
        ) : (
          <HomeScreen onStart={startGame} />
        );

      case GamePhase.PLAYING_P2:
        return (
          <GameCanvas
            key={`run-${state.runId}-p2`}
            character="boy"
            seed={state.currentSeed}
            onGameOver={handleP2GameOver}
            autoplay={state.isAutoplay}
          />
        );

      case GamePhase.RESULTS:
        return state.p1Stats && state.p2Stats ? (
          <ResultScreen
            p1={state.p1Stats}
            p2={state.p2Stats}
            onRestart={startGame}
            onHome={goHome}
          />
        ) : (
          <HomeScreen onStart={startGame} />
        );

      default:
        return <HomeScreen onStart={startGame} />;
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 font-sans select-none">
      <div className="mx-auto flex h-full w-full max-w-md items-center justify-center">
        <main className="relative h-full w-full overflow-hidden bg-white shadow-2xl md:my-6 md:h-[calc(100%-3rem)] md:rounded-3xl">
          {renderScreen()}
        </main>
      </div>
    </div>
  );
}
