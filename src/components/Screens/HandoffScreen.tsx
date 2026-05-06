/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface HandoffScreenProps {
  p1Score: number;
  onStartP2: () => void;
}

const HandoffScreen: React.FC<HandoffScreenProps> = ({ p1Score, onStartP2 }) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      onStartP2();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onStartP2]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-blue-600 text-white text-center">
      <AnimatePresence mode="wait">
        {countdown === null ? (
          <motion.div 
            key="handoff"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-xl font-bold uppercase tracking-widest text-blue-200">Player 1 Finished</h2>
              <p className="text-6xl font-black">{p1Score} Hops</p>
            </div>

            <div className="bg-white/10 p-8 rounded-3xl border-4 border-white/20">
              <h3 className="text-3xl font-black mb-4">PASS TO PLAYER 2</h3>
              <p className="font-medium text-blue-100">BJ is up next! Can he beat {p1Score} hops?</p>
            </div>

            <button 
              onClick={() => setCountdown(3)}
              className="px-12 py-6 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 text-3xl font-black rounded-2xl border-b-8 border-yellow-600 active:border-b-0 active:translate-y-2 transition-all"
            >
              I'M READY!
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="countdown"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <p className="text-2xl font-bold uppercase tracking-widest mb-4">Get Ready, BJ!</p>
            <motion.span 
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[12rem] font-black leading-none"
            >
              {countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HandoffScreen;
