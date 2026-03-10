import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy, Zap, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

const SECTORS = [
  { label: 'x1', multiplier: 1, color: 'bg-gray-600', weight: 40 },
  { label: 'x2', multiplier: 2, color: 'bg-blue-600', weight: 25 },
  { label: 'x5', multiplier: 5, color: 'bg-purple-600', weight: 15 },
  { label: 'x10', multiplier: 10, color: 'bg-pink-600', weight: 10 },
  { label: 'x20', multiplier: 20, color: 'bg-orange-600', weight: 5 },
  { label: 'JACKPOT', multiplier: 100, color: 'bg-yellow-500', weight: 2 },
  { label: 'LOSE', multiplier: 0, color: 'bg-red-800', weight: 3 },
];

export const Wheel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, addCoins, removeCoins } = useGame();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [bet, setBet] = useState(10);
  const [message, setMessage] = useState('Spin to win big!');

  const spin = () => {
    if (isSpinning) return;
    if (!removeCoins(bet)) {
      setMessage('Not enough coins!');
      return;
    }

    setIsSpinning(true);
    setMessage('Spinning...');

    const spinRotation = 1800 + Math.random() * 360;
    const newRotation = rotation + spinRotation;
    setRotation(newRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const normalizedRotation = (newRotation % 360);
      const sectorAngle = 360 / SECTORS.length;
      const index = Math.floor(((360 - normalizedRotation + (sectorAngle / 2)) % 360) / sectorAngle);
      const sector = SECTORS[index % SECTORS.length];
      
      const win = bet * sector.multiplier;
      if (win > 0) {
        addCoins(win);
        setMessage(`WIN! ${sector.label} - You won ${win} coins!`);
        if (sector.multiplier >= 10) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      } else {
        setMessage('Better luck next time!');
      }
    }, 4000);
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

      <div className="w-full max-w-4xl bg-gradient-to-b from-indigo-900 to-black rounded-3xl border-8 border-indigo-950 shadow-2xl p-12 relative overflow-hidden flex flex-col items-center gap-12">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
        
        {/* Wheel */}
        <div className="relative flex justify-center">
          <motion.div
            animate={{ rotate: rotation }}
            transition={{ duration: 4, ease: "circOut" }}
            className="w-80 h-80 md:w-96 md:h-96 rounded-full border-8 border-yellow-600 shadow-2xl relative overflow-hidden bg-black"
          >
            {SECTORS.map((sector, i) => {
              const angle = (i * 360) / SECTORS.length;
              return (
                <div
                  key={i}
                  className={`absolute top-0 left-1/2 -translate-x-1/2 h-1/2 origin-bottom flex flex-col items-center border-x border-white/10 ${sector.color}`}
                  style={{ 
                    transform: `translateX(-50%) rotate(${angle}deg)`,
                    width: `${360 / SECTORS.length}%`,
                    clipPath: 'polygon(50% 100%, 0 0, 100% 0)'
                  }}
                >
                  <span className="mt-8 font-black text-xs md:text-sm whitespace-nowrap rotate-0">
                    {sector.label}
                  </span>
                </div>
              );
            })}
            <div className="absolute inset-0 m-auto w-16 h-16 bg-yellow-600 rounded-full border-4 border-yellow-400 shadow-inner z-10 flex items-center justify-center">
              <Star className="text-white w-8 h-8 fill-white" />
            </div>
          </motion.div>
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-8 h-12 bg-white clip-path-triangle z-20 shadow-xl" />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-6 relative z-10 w-full">
          <div className="text-3xl font-black text-yellow-400 h-10 text-center drop-shadow-lg">{message}</div>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2 bg-black/40 p-1 rounded-full border border-white/10">
              {[10, 50, 100, 1000].map(amount => (
                <button
                  key={amount}
                  onClick={() => setBet(amount)}
                  className={`px-6 py-2 rounded-full font-bold transition-all ${bet === amount ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {amount}
                </button>
              ))}
            </div>
            <button
              onClick={spin}
              disabled={isSpinning}
              className={`px-16 py-4 rounded-2xl text-2xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-3 ${isSpinning ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 hover:shadow-orange-500/50 text-white'}`}
            >
              <Zap className="w-8 h-8 fill-white" />
              {isSpinning ? 'SPINNING...' : 'SPIN!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
