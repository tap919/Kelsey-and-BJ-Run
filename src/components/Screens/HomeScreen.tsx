/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Play, Info, Trophy, Users } from 'lucide-react';

interface HomeScreenProps {
  onStart: (autoplay?: boolean) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-between h-full p-8 bg-sky-100 text-slate-800 text-center">
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mt-12"
      >
        <h1 className="text-5xl font-black italic text-sky-600 drop-shadow-md">
          KELSEY & BJ<br/><span className="text-6xl text-slate-900 NOT-italic">RUN!</span>
        </h1>
        <p className="mt-2 text-slate-500 font-medium tracking-widest uppercase">Neighborhood Dash</p>
      </motion.div>

      <div className="relative w-full max-w-xs aspect-square flex items-end justify-center gap-4">
        {/* Character Preview */}
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-24 h-32 bg-pink-500 rounded-xl border-4 border-slate-900 shadow-[8px_8px_0_0_rgba(0,0,0,0.2)] flex flex-col items-center justify-center"
        >
          <div className="w-4 h-4 bg-white rounded-full mb-1" />
          <span className="text-white font-bold text-xs">P1</span>
        </motion.div>
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
          className="w-24 h-32 bg-blue-500 rounded-xl border-4 border-slate-900 shadow-[8px_8px_0_0_rgba(0,0,0,0.2)] flex flex-col items-center justify-center"
        >
           <div className="w-4 h-4 bg-white rounded-full mb-1" />
           <span className="text-white font-bold text-xs">P2</span>
        </motion.div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4 mb-8">
        <button 
          onClick={() => onStart(false)}
          className="group relative flex items-center justify-center gap-3 w-full py-5 bg-green-500 hover:bg-green-400 text-white text-2xl font-black rounded-2xl border-b-8 border-green-700 active:border-b-0 active:translate-y-2 transition-all"
        >
          <Play className="fill-current" />
          PLAY CHALLENGE
        </button>

        <button 
          onClick={() => onStart(true)}
          className="group relative flex items-center justify-center gap-2 w-full py-3 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl border-b-4 border-slate-200 active:translate-y-1 transition-all"
        >
          <Users size={18} /> WATCH AI (DEMO)
        </button>
        
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 py-2 bg-slate-100/50 text-slate-500 text-sm font-bold rounded-xl active:translate-y-1 transition-all">
            <Trophy size={14} /> BEST
          </button>
          <button className="flex items-center justify-center gap-2 py-2 bg-slate-100/50 text-slate-500 text-sm font-bold rounded-xl active:translate-y-1 transition-all">
            <Info size={14} /> HOW
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
