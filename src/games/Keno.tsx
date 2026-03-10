import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy, Target } from 'lucide-react';
import confetti from 'canvas-confetti';

export const Keno: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, addCoins, removeCoins } = useGame();
  const [selected, setSelected] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [bet, setBet] = useState(10);
  const [message, setMessage] = useState('Pick up to 10 numbers');

  const toggleNumber = (num: number) => {
    if (isDrawing) return;
    if (selected.includes(num)) {
      setSelected(selected.filter(n => n !== num));
    } else if (selected.length < 10) {
      setSelected([...selected, num]);
    }
  };

  const draw = () => {
    if (selected.length === 0) {
      setMessage('Pick at least one number!');
      return;
    }
    if (!removeCoins(bet)) {
      setMessage('Not enough coins!');
      return;
    }

    setIsDrawing(true);
    setDrawn([]);
    setMessage('Drawing numbers...');

    const numbers: number[] = [];
    const interval = setInterval(() => {
      let next;
      do {
        next = Math.floor(Math.random() * 80) + 1;
      } while (numbers.includes(next));
      numbers.push(next);
      setDrawn([...numbers]);
      if (numbers.length === 20) {
        clearInterval(interval);
        setIsDrawing(false);
        calculateWin(numbers);
      }
    }, 100);
  };

  const calculateWin = (finalDrawn: number[]) => {
    const matches = selected.filter(n => finalDrawn.includes(n)).length;
    let multiplier = 0;
    
    // Simple Keno paytable (varies by how many numbers picked)
    const paytable: Record<number, Record<number, number>> = {
      1: { 1: 3 },
      2: { 2: 12 },
      3: { 2: 1, 3: 42 },
      4: { 2: 1, 3: 3, 4: 130 },
      5: { 3: 3, 4: 15, 5: 700 },
      6: { 3: 1, 4: 7, 5: 50, 6: 1600 },
      7: { 3: 1, 4: 2, 5: 15, 6: 150, 7: 5000 },
      8: { 4: 2, 5: 7, 6: 50, 7: 600, 8: 15000 },
      9: { 4: 1, 5: 4, 6: 20, 7: 200, 8: 2500, 9: 30000 },
      10: { 5: 2, 6: 10, 7: 50, 8: 500, 9: 5000, 10: 100000 },
    };

    multiplier = paytable[selected.length]?.[matches] || 0;
    
    if (multiplier > 0) {
      const win = bet * multiplier;
      addCoins(win);
      setMessage(`Match ${matches}! You won ${win} coins!`);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } else {
      setMessage(`Match ${matches}. Better luck next time.`);
    }
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

      <div className="w-full max-w-4xl bg-indigo-950 rounded-3xl border-8 border-indigo-900 shadow-2xl p-8 relative overflow-hidden flex flex-col md:flex-row gap-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
        
        {/* Grid */}
        <div className="flex-1 grid grid-cols-10 gap-1 relative z-10">
          {[...Array(80)].map((_, i) => {
            const num = i + 1;
            const isSelected = selected.includes(num);
            const isDrawn = drawn.includes(num);
            const isMatch = isSelected && isDrawn;
            return (
              <button
                key={num}
                onClick={() => toggleNumber(num)}
                disabled={isDrawing}
                className={`aspect-square rounded flex items-center justify-center text-[10px] font-bold transition-all border ${isMatch ? 'bg-yellow-500 text-black border-yellow-400 scale-110 z-20 shadow-lg' : isDrawn ? 'bg-red-600 text-white border-red-500' : isSelected ? 'bg-blue-500 text-white border-blue-400' : 'bg-black/40 text-gray-400 border-white/5 hover:bg-white/10'}`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-6 relative z-10">
          <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="text-xs text-gray-400 uppercase tracking-widest font-black">Status</div>
            <div className="text-xl font-bold text-yellow-400 leading-tight">{message}</div>
            <div className="text-xs text-blue-400">Selected: {selected.length}/10</div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2 bg-black/40 p-1 rounded-full border border-white/10">
              {[10, 50, 100].map(amount => (
                <button
                  key={amount}
                  onClick={() => setBet(amount)}
                  className={`flex-1 py-2 rounded-full font-bold text-xs transition-all ${bet === amount ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {amount}
                </button>
              ))}
            </div>
            <button
              onClick={draw}
              disabled={isDrawing}
              className={`w-full py-4 rounded-2xl text-xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 ${isDrawing ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-indigo-500/50'}`}
            >
              <Target className="w-6 h-6" />
              {isDrawing ? 'DRAWING...' : 'DRAW!'}
            </button>
            <button
              onClick={() => { setSelected([]); setDrawn([]); setMessage('Pick up to 10 numbers'); }}
              disabled={isDrawing}
              className="w-full py-2 text-xs text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3 h-3" /> Clear Board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
