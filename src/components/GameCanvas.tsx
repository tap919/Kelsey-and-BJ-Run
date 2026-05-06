/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GRID_SIZE,
  PLAYER_START_Y,
  LANES_IN_VIEW,
  createRandom,
} from '../constants';
import { Lane, LaneType } from '../types';

// ----------------------------------------------------------------------
// Polyfill for CanvasRenderingContext2D.roundRect
// ----------------------------------------------------------------------
if (typeof window !== 'undefined' && typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): CanvasRenderingContext2D {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    return this;
  };
}

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------
interface GameCanvasProps {
  character: 'girl' | 'boy';
  seed: number;
  onGameOver: (distance: number) => void;
  autoplay?: boolean;       // If true, automatically hops every ~0.9s
  isPaused?: boolean;       // External pause (e.g., from parent)
}

interface Obstacle {
  x: number;
  width: number;
  type: 'car' | 'tree';
}

interface ExtendedLane extends Lane {
  speed?: number;
  direction?: 1 | -1;
  obstacles: Obstacle[];
}

interface GameState {
  playerX: number;
  playerY: number;
  targetY: number;
  lanes: ExtendedLane[];
  cameraY: number;
  maxDistance: number;
  rng: () => number;
  isGameOver: boolean;
  laneCounter: number;
}

const VEHICLE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#a855f7'];

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------
const GameCanvas: React.FC<GameCanvasProps> = ({
  character,
  seed,
  onGameOver,
  autoplay = false,
  isPaused = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const jumpRequestedRef = useRef(false);
  const pausedRef = useRef(isPaused);
  const onGameOverRef = useRef(onGameOver);
  const autoplayRef = useRef(autoplay);
  const lastAutoplayHopRef = useRef(0);

  const [displayDistance, setDisplayDistance] = useState(0);
  const [showGameOverOverlay, setShowGameOverOverlay] = useState(false);

  const gameStateRef = useRef<GameState>(null!);

  // --------------------------------------------------------------------
  // Lane generation
  // --------------------------------------------------------------------
  const generateLane = useCallback((state: GameState) => {
    const rng = state.rng;
    const laneId = state.laneCounter++;
    const y = -laneId * GRID_SIZE + PLAYER_START_Y;

    // First 3 lanes always grass (safe start)
    const type = laneId < 3 ? LaneType.GRASS : rng() > 0.4 ? LaneType.ROAD : LaneType.GRASS;

    const lane: ExtendedLane = {
      id: laneId,
      type,
      y,
      color: type === LaneType.GRASS ? '#86efac' : '#334155',
      obstacles: [],
    };

    if (type === LaneType.ROAD) {
      lane.speed = 1.2 + rng() * 2.2; // Slightly slower/more consistent
      lane.direction = rng() > 0.5 ? 1 : -1;

      const vehicleCount = 2 + Math.floor(rng() * 2);
      let lastX = rng() * GAME_WIDTH;
      for (let i = 0; i < vehicleCount; i++) {
        // Ensure at least 3 grid units between cars
        const spacing = (GRID_SIZE * 3) + (rng() * GRID_SIZE * 4);
        lastX = (lastX + spacing) % (GAME_WIDTH + 200);
        lane.obstacles.push({
          x: lastX - 100,
          width: GRID_SIZE * 1.5,
          type: 'car',
        });
      }
    } else if (laneId > 5) {
      const treeCount = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < treeCount; i++) {
        const gridX = Math.floor(rng() * (GAME_WIDTH / GRID_SIZE));
        lane.obstacles.push({
          x: gridX * GRID_SIZE,
          width: GRID_SIZE,
          type: 'tree',
        });
      }
    }

    state.lanes.push(lane);
  }, []);

  // --------------------------------------------------------------------
  // Reset game state
  // --------------------------------------------------------------------
  const resetGame = useCallback(() => {
    gameStateRef.current = {
      playerX: Math.floor(GAME_WIDTH / (2 * GRID_SIZE)) * GRID_SIZE,
      playerY: PLAYER_START_Y,
      targetY: PLAYER_START_Y,
      lanes: [],
      cameraY: PLAYER_START_Y,
      maxDistance: 0,
      rng: createRandom(seed),
      isGameOver: false,
      laneCounter: 0,
    };
    setDisplayDistance(0);
    setShowGameOverOverlay(false);
    jumpRequestedRef.current = false;
    lastAutoplayHopRef.current = 0;

    const state = gameStateRef.current;
    for (let i = 0; i < LANES_IN_VIEW + 4; i++) {
      generateLane(state);
    }
  }, [seed, generateLane]);

  // --------------------------------------------------------------------
  // Collision helper
  // --------------------------------------------------------------------
  const checkCollision = (
    playerX: number,
    playerY: number,
    playerW: number,
    playerH: number,
    obsX: number,
    obsY: number,
    obsW: number,
    obsH: number
  ): boolean => {
    return (
      playerX < obsX + obsW &&
      playerX + playerW > obsX &&
      playerY < obsY + obsH &&
      playerY + playerH > obsY
    );
  };

  // --------------------------------------------------------------------
  // Game update (delta time)
  // --------------------------------------------------------------------
  const updateGame = useCallback(
    (deltaMs: number, now: number) => {
      const state = gameStateRef.current;
      if (pausedRef.current || state.isGameOver) return;

      const dt = Math.min(0.033, deltaMs / 1000);

      // ---- Autoplay: Smart AI logic ----
      if (autoplayRef.current && !state.isGameOver) {
        const HOP_INTERVAL_MS = 600; // Faster decision making
        if (now - lastAutoplayHopRef.current >= HOP_INTERVAL_MS) {
          const nextY = state.targetY - GRID_SIZE;
          const targetLane = state.lanes.find((l) => Math.abs(l.y - nextY) < GRID_SIZE * 0.5);
          
          let isSafe = true;
          if (targetLane) {
            // Check for trees in landing spot
            const treeInWay = targetLane.obstacles.some(
              (obs) => obs.type === 'tree' && Math.abs(obs.x - state.playerX) < GRID_SIZE * 0.5
            );
            if (treeInWay) isSafe = false;

            // Check for cars in target lane (predictive)
            if (targetLane.type === LaneType.ROAD) {
              const speed = (targetLane.speed || 0) * (targetLane.direction || 0) * 120;
              const dangerMargin = GRID_SIZE * 1.8;
              
              isSafe = !targetLane.obstacles.some((obs) => {
                // Where will the car be in ~0.2 seconds? (approx hop time)
                const futureObsX = obs.x + speed * 0.2;
                const dist = Math.abs((futureObsX + obs.width / 2) - (state.playerX + GRID_SIZE / 2));
                return dist < dangerMargin;
              });
            }
          }

          if (isSafe) {
            jumpRequestedRef.current = true;
            lastAutoplayHopRef.current = now;
          }
        }
      }

      // ---- Manual / autoplay hop request ----
      if (jumpRequestedRef.current) {
        const nextY = state.targetY - GRID_SIZE;
        const minY = -state.laneCounter * GRID_SIZE + PLAYER_START_Y;
        if (nextY >= minY) {
          const targetLane = state.lanes.find((l) => Math.abs(l.y - nextY) < GRID_SIZE * 0.5);
          let blocked = false;
          if (targetLane && targetLane.type === LaneType.GRASS) {
            blocked = targetLane.obstacles.some(
              (obs) =>
                obs.type === 'tree' &&
                state.playerX >= obs.x &&
                state.playerX <= obs.x + obs.width
            );
          }
          if (!blocked) {
            state.targetY = nextY;
            const distanceHopped = Math.floor((PLAYER_START_Y - state.targetY) / GRID_SIZE);
            if (distanceHopped > state.maxDistance) {
              state.maxDistance = distanceHopped;
              setDisplayDistance(state.maxDistance);
            }
          }
        }
        jumpRequestedRef.current = false;
      }

      // Smooth player movement
      const playerDiff = state.targetY - state.playerY;
      const moveStep = playerDiff * 8 * dt;
      state.playerY += Math.abs(moveStep) < Math.abs(playerDiff) ? moveStep : playerDiff;

      // Camera smoothing
      const cameraDiff = state.playerY - state.cameraY;
      state.cameraY += cameraDiff * 6 * dt;

      // Vehicle movement & collision
      // Slightly smaller hitbox for more 'fair' gameplay
      const playerHitbox = {
        x: state.playerX + 10,
        y: state.playerY + 12,
        w: GRID_SIZE - 20,
        h: GRID_SIZE - 20,
      };

      for (const lane of state.lanes) {
        if (lane.type !== LaneType.ROAD) continue;

        const laneY = lane.y;
        const speedPerSec = (lane.speed || 2) * (lane.direction || 1);

        for (const obs of lane.obstacles) {
          if (obs.type !== 'car') continue;

          // Always update movement
          obs.x += speedPerSec * dt * 120;
          
          // Looping
          if (speedPerSec > 0 && obs.x > GAME_WIDTH + 100) obs.x = -150;
          if (speedPerSec < 0 && obs.x < -150) obs.x = GAME_WIDTH + 100;

          // Only check collision if player is on this lane
          if (Math.abs(playerHitbox.y - laneY) < GRID_SIZE * 0.8) {
            const carHitbox = {
              x: obs.x + 8,
              y: laneY + 10,
              w: obs.width - 16,
              h: GRID_SIZE - 20
            };

            if (
              checkCollision(
                playerHitbox.x,
                playerHitbox.y,
                playerHitbox.w,
                playerHitbox.h,
                carHitbox.x,
                carHitbox.y,
                carHitbox.w,
                carHitbox.h
              )
            ) {
              state.isGameOver = true;
              setShowGameOverOverlay(true);
              onGameOverRef.current(state.maxDistance);
              return;
            }
          }
        }
      }

      // Lane generation & cleanup
      const lastLane = state.lanes[state.lanes.length - 1];
      if (lastLane && lastLane.y > state.cameraY - GAME_HEIGHT - GRID_SIZE * 2) {
        generateLane(state);
      }
      if (state.lanes.length > 0 && state.lanes[0].y < state.cameraY - GAME_HEIGHT * 2) {
        state.lanes.shift();
      }
    },
    [generateLane]
  );

  // --------------------------------------------------------------------
  // Drawing (includes enhanced Black girl / boy characters)
  // --------------------------------------------------------------------
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const state = gameStateRef.current;
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.save();
      ctx.translate(0, -state.cameraY + GAME_HEIGHT * 0.7);

      // ---- Lanes ----
      for (const lane of state.lanes) {
        ctx.fillStyle = lane.color;
        ctx.fillRect(0, lane.y, GAME_WIDTH, GRID_SIZE);

        if (lane.type === LaneType.ROAD) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.setLineDash([15, 20]);
          ctx.lineWidth = 2;
          for (let i = 0; i < 2; i++) {
            const yOffset = lane.y + GRID_SIZE / 2 - 2 + i * 4;
            ctx.beginPath();
            ctx.moveTo(0, yOffset);
            ctx.lineTo(GAME_WIDTH, yOffset);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }

        // Obstacles (cars / trees)
        for (let idx = 0; idx < lane.obstacles.length; idx++) {
          const obs = lane.obstacles[idx];
          if (lane.type === LaneType.ROAD) {
            const color = VEHICLE_COLORS[idx % VEHICLE_COLORS.length];
            ctx.fillStyle = color;
            ctx.fillRect(obs.x, lane.y + 5, obs.width, GRID_SIZE - 10);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            if (lane.direction === 1) {
              ctx.fillRect(obs.x + obs.width - 15, lane.y + 10, 8, GRID_SIZE - 20);
              ctx.fillStyle = '#fde047';
              ctx.fillRect(obs.x + 5, lane.y + GRID_SIZE - 12, 6, 5);
            } else {
              ctx.fillRect(obs.x + 7, lane.y + 10, 8, GRID_SIZE - 20);
              ctx.fillStyle = '#fde047';
              ctx.fillRect(obs.x + obs.width - 11, lane.y + GRID_SIZE - 12, 6, 5);
            }
          } else if (obs.type === 'tree') {
            ctx.fillStyle = '#8B5A2B';
            ctx.fillRect(obs.x + GRID_SIZE * 0.35, lane.y + GRID_SIZE * 0.5, GRID_SIZE * 0.3, GRID_SIZE * 0.5);
            ctx.fillStyle = '#2e7d32';
            ctx.beginPath();
            ctx.ellipse(obs.x + GRID_SIZE / 2, lane.y + GRID_SIZE * 0.4, GRID_SIZE * 0.35, GRID_SIZE * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1b5e20';
            ctx.beginPath();
            ctx.ellipse(obs.x + GRID_SIZE / 2, lane.y + GRID_SIZE * 0.25, GRID_SIZE * 0.25, GRID_SIZE * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // ---- Enhanced Player Character (Black girl / boy) ----
      const px = state.playerX;
      const py = state.playerY;
      const centerX = px + GRID_SIZE / 2;
      const skinColor = '#C68642';
      const darkSkin = '#8B5A2B';

      ctx.save();
      ctx.shadowBlur = 0;

      // Body (rounded rect)
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      // @ts-ignore
      ctx.roundRect(px + 6, py + GRID_SIZE * 0.4, GRID_SIZE - 12, GRID_SIZE * 0.5, 8);
      ctx.fill();

      // Cheeks
      ctx.fillStyle = darkSkin;
      ctx.beginPath();
      ctx.ellipse(centerX - 8, py + GRID_SIZE * 0.62, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(centerX + 8, py + GRID_SIZE * 0.62, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (white + pupils)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(centerX - 8, py + GRID_SIZE * 0.7, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(centerX + 8, py + GRID_SIZE * 0.7, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2C1E14';
      ctx.beginPath();
      ctx.arc(centerX - 8, py + GRID_SIZE * 0.7, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + 8, py + GRID_SIZE * 0.7, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Eye highlights
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(centerX - 9, py + GRID_SIZE * 0.68, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + 7, py + GRID_SIZE * 0.68, 1, 0, Math.PI * 2);
      ctx.fill();

      // Smile
      ctx.beginPath();
      ctx.strokeStyle = '#3B1E08';
      ctx.lineWidth = 1.5;
      ctx.arc(centerX, py + GRID_SIZE * 0.78, 6, 0.05, Math.PI - 0.05);
      ctx.stroke();

      // Hair (gender specific)
      if (character === 'girl') {
        // Afro puffs + bow
        ctx.fillStyle = '#2C1A0F';
        ctx.beginPath();
        ctx.ellipse(centerX - 12, py + GRID_SIZE * 0.45, 9, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + 12, py + GRID_SIZE * 0.45, 9, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F48FB1';
        ctx.beginPath();
        ctx.moveTo(centerX - 6, py + GRID_SIZE * 0.35);
        ctx.lineTo(centerX, py + GRID_SIZE * 0.28);
        ctx.lineTo(centerX + 6, py + GRID_SIZE * 0.35);
        ctx.fill();
        ctx.fillRect(centerX - 2, py + GRID_SIZE * 0.28, 4, 8);
      } else {
        // Boy: short fade with curly top
        ctx.fillStyle = '#1E2A2E';
        ctx.beginPath();
        ctx.ellipse(centerX, py + GRID_SIZE * 0.45, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3A2A1F';
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.arc(centerX + i * 5, py + GRID_SIZE * 0.42, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.strokeStyle = '#2E1C0F';
        ctx.lineWidth = 2;
        ctx.moveTo(centerX - 12, py + GRID_SIZE * 0.64);
        ctx.lineTo(centerX - 5, py + GRID_SIZE * 0.66);
        ctx.moveTo(centerX + 12, py + GRID_SIZE * 0.64);
        ctx.lineTo(centerX + 5, py + GRID_SIZE * 0.66);
        ctx.stroke();
      }

      ctx.restore();

      // ---- Game Over overlay (canvas) ----
      if (state.isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.font = 'bold 24px "Press Start 2P", monospace';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2);
        ctx.font = '18px monospace';
        ctx.fillStyle = '#facc15';
        ctx.fillText(`Hop count: ${state.maxDistance}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
      }

      ctx.restore();
    },
    [character]
  );

  // --------------------------------------------------------------------
  // Animation loop (with delta time and autoplay timing)
  // --------------------------------------------------------------------
  useLayoutEffect(() => {
    resetGame();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let previousTime = performance.now();
    const animate = (now: number) => {
      if (!canvas || !ctx) return;
      const dt = now - previousTime;
      previousTime = now;

      if (!pausedRef.current && !gameStateRef.current.isGameOver) {
        updateGame(dt, now);
      }
      draw(ctx);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [resetGame, updateGame, draw]);

  // --------------------------------------------------------------------
  // Effects for props sync
  // --------------------------------------------------------------------
  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    autoplayRef.current = autoplay;
  }, [autoplay]);

  useEffect(() => {
    resetGame();
  }, [seed, resetGame]);

  // --------------------------------------------------------------------
  // Input handlers
  // --------------------------------------------------------------------
  const handleHop = useCallback(() => {
    if (pausedRef.current || gameStateRef.current?.isGameOver) return;
    jumpRequestedRef.current = true;
  }, []);

  const handleRestart = useCallback(() => {
    resetGame();
  }, [resetGame]);

  // Keyboard support (Space / ArrowUp for hop, R for restart)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleHop();
      }
      if (e.code === 'KeyR' && gameStateRef.current?.isGameOver) {
        e.preventDefault();
        handleRestart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleHop, handleRestart]);

  // --------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------
  return (
    <div
      className="relative w-full h-full overflow-hidden bg-slate-900 touch-none select-none"
    >
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="w-full h-full object-contain"
      />

      <div className="absolute top-4 left-4 p-2 bg-white/80 rounded-lg shadow-sm border-2 border-slate-900 font-retro text-xs">
        {character === 'girl' ? 'Kelsey' : 'BJ'}
      </div>

      <div className="absolute top-4 right-4 p-2 bg-white/80 rounded-lg shadow-sm font-bold border-2 border-slate-900 font-retro text-xs">
        HOPS: {displayDistance}
      </div>

      {!gameStateRef.current?.isGameOver && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[200px]">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              handleHop();
            }}
            className="w-full py-5 bg-yellow-400 border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 rounded-2xl text-2xl font-black text-yellow-900 shadow-xl transition-all uppercase italic tracking-tighter font-sans"
          >
            HOP!
          </button>
        </div>
      )}

      {showGameOverOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 text-center shadow-2xl w-64">
            <h2 className="text-2xl font-black mb-2">GAME OVER</h2>
            <p className="text-lg mb-4">Hop count: {displayDistance}</p>
            <button
              onClick={handleRestart}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full transition-all"
            >
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
