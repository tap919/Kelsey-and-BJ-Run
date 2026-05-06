/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Trophy, RefreshCw, Home } from 'lucide-react';
import { PlayerStats } from '../../types';

interface ResultScreenProps {
  p1: PlayerStats;
  p2: PlayerStats;
  onRestart: () => void;
  onHome: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ p1, p2, onRestart, onHome }) => {
  const winner = p1.distance > p2.distance ? 'P1: Kelsey' : p2.distance > p1.distance ? 'P2: BJ' : 'Tie!';
  const winnerColor = p1.distance > p2.distance ? 'text-pink-600' : p2.distance > p1.distance ? 'text-blue-600' : 'text-slate-600';

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-sky-50 text-slate-900 text-center">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8"
      >
        <Trophy className="mx-auto text-yellow-500 mb-4" size={80} />
        <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-500">The Winner Is</h2>
        <h3 className={`text-5xl font-black ${winnerColor}`}>{winner}</h3>
      </motion.div>

      <div className="w-full max-w-sm grid grid-cols-2 gap-4 mb-12">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-pink-100">
          <p className="text-xs font-bold text-pink-500 uppercase tracking-widest mb-1">Kelsey</p>
          <p className="text-4xl font-black">{p1.distance} <span className="text-sm">Hops</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-blue-100">
          <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">BJ</p>
          <p className="text-4xl font-black">{p2.distance} <span className="text-sm">Hops</span></p>
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <button 
          onClick={onRestart}
          className="flex items-center justify-center gap-3 w-full py-5 bg-green-500 hover:bg-green-400 text-white text-2xl font-black rounded-2xl border-b-8 border-green-700 active:border-b-0 active:translate-y-2 transition-all"
        >
          <RefreshCw /> PLAY AGAIN
        </button>
        <button 
          onClick={onHome}
          className="flex items-center justify-center gap-3 w-full py-4 text-slate-500 font-bold"
        >
          <Home size={20} /> BACK TO MENU
        </button>
      </div>
    </div>
  );
};

export default ResultScreen;
