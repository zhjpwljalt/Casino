import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

const ROWS = 8;
const MULTIPLIERS = [5, 2, 0.5, 0.2, 0.2, 0.5, 2, 5];

export const Plinko: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, addCoins, removeCoins } = useGame();
  const [balls, setBalls] = useState<{ id: number; x: number; y: number; path: number[] }[]>([]);
  const [isDropping, setIsDropping] = useState(false);
  const [bet, setBet] = useState(10);
  const [message, setMessage] = useState('Drop the ball!');

  const dropBall = () => {
    if (!removeCoins(bet)) {
      setMessage('Not enough coins!');
      return;
    }

    setIsDropping(true);
    const id = Date.now();
    const path: number[] = [];
    let currentPos = 0;
    for (let i = 0; i < ROWS; i++) {
      const move = Math.random() > 0.5 ? 1 : -1;
      currentPos += move;
      path.push(currentPos);
    }

    const newBall = { id, x: 0, y: 0, path };
    setBalls(prev => [...prev, newBall]);

    setTimeout(() => {
      setBalls(prev => prev.filter(b => b.id !== id));
      const finalIdx = Math.floor((currentPos + ROWS) / 2);
      const multiplier = MULTIPLIERS[finalIdx] || 0.2;
      const win = bet * multiplier;
      addCoins(win);
      setMessage(`Win x${multiplier}! +${win.toFixed(0)} coins`);
      if (multiplier >= 2) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setIsDropping(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 text-white p-4">
      <div className="w-full max-w-4xl flex justify-between items-center">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          &larr; Back
        </button>
        <div className="bg-black/50 px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
          <Coins className="text-yellow-400 w-4 h-4" />
          <span className="font-mono text-yellow-400">{coins}</span>
        </div>
      </div>

      <div className="w-full max-w-4xl bg-indigo-900 rounded-3xl border-8 border-indigo-950 shadow-2xl p-12 relative overflow-hidden flex flex-col items-center gap-12">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
        
        {/* Plinko Board */}
        <div className="relative w-full max-w-md aspect-square flex flex-col justify-between items-center">
          {/* Pegs */}
          {[...Array(ROWS)].map((_, row) => (
            <div key={row} className="flex gap-8 md:gap-12">
              {[...Array(row + 1)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white] z-10" />
              ))}
            </div>
          ))}

          {/* Balls */}
          <AnimatePresence>
            {balls.map(ball => (
              <motion.div
                key={ball.id}
                initial={{ y: -50, x: 0 }}
                animate={{ 
                  y: ROWS * 40,
                  x: ball.path.reduce((acc, val, i) => acc + val * 10, 0)
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, ease: "linear" }}
                className="absolute top-0 w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.8)] z-20"
              />
            ))}
          </AnimatePresence>

          {/* Slots */}
          <div className="flex w-full justify-between gap-1 mt-8">
            {MULTIPLIERS.map((m, i) => (
              <div key={i} className={`flex-1 h-12 rounded-lg flex items-center justify-center font-black text-xs border-2 ${m >= 2 ? 'bg-red-600 border-red-400' : m >= 1 ? 'bg-yellow-600 border-yellow-400' : 'bg-blue-900 border-blue-700'}`}>
                x{m}
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-6 relative z-10 w-full">
          <div className="text-2xl font-bold text-yellow-400 h-8 text-center">{message}</div>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2 bg-black/40 p-1 rounded-full border border-white/10">
              {[10, 50, 100].map(amount => (
                <button
                  key={amount}
                  onClick={() => setBet(amount)}
                  className={`px-4 py-2 rounded-full font-bold transition-all ${bet === amount ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {amount}
                </button>
              ))}
            </div>
            <button
              onClick={dropBall}
              className={`px-12 py-4 rounded-2xl text-2xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:shadow-orange-500/50 text-black`}
            >
              <Star className="w-8 h-8" />
              DROP!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
