import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy, CircleDot } from 'lucide-react';
import confetti from 'canvas-confetti';

export const Bingo: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, addCoins, removeCoins } = useGame();
  const [card, setCard] = useState<number[][]>([]);
  const [marked, setMarked] = useState<boolean[][]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [bet, setBet] = useState(10);
  const [message, setMessage] = useState('Buy a card and wait for the draw!');
  const [isGameActive, setIsGameActive] = useState(false);

  const generateCard = () => {
    const newCard: number[][] = [];
    const ranges = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
    for (let i = 0; i < 5; i++) {
      const col: number[] = [];
      while (col.length < 5) {
        const num = Math.floor(Math.random() * (ranges[i][1] - ranges[i][0] + 1)) + ranges[i][0];
        if (!col.includes(num)) col.push(num);
      }
      newCard.push(col.sort((a, b) => a - b));
    }
    // Transpose to rows
    const rows: number[][] = [];
    for (let i = 0; i < 5; i++) {
      rows.push(newCard.map(col => col[i]));
    }
    rows[2][2] = 0; // Free space
    setCard(rows);
    const newMarked = Array(5).fill(0).map(() => Array(5).fill(false));
    newMarked[2][2] = true;
    setMarked(newMarked);
  };

  useEffect(() => {
    generateCard();
  }, []);

  const startGame = () => {
    if (!removeCoins(bet)) {
      setMessage('Not enough coins!');
      return;
    }
    setIsGameActive(true);
    setIsDrawing(true);
    setDrawn([]);
    setMessage('Drawing balls...');

    const pool = Array.from({ length: 75 }, (_, i) => i + 1);
    pool.sort(() => Math.random() - 0.5);

    let count = 0;
    const interval = setInterval(() => {
      const ball = pool[count];
      setDrawn(prev => [...prev, ball]);
      
      // Auto-mark card
      setMarked(prev => {
        const next = prev.map(row => [...row]);
        card.forEach((row, rIdx) => {
          row.forEach((num, cIdx) => {
            if (num === ball) next[rIdx][cIdx] = true;
          });
        });
        return next;
      });

      count++;
      if (count === 40 || checkBingo()) {
        clearInterval(interval);
        setIsDrawing(false);
        finishGame();
      }
    }, 500);
  };

  const checkBingo = () => {
    // This is tricky with state updates, so we'll check manually in finishGame
    return false;
  };

  const finishGame = () => {
    // Final check for bingo
    let bingos = 0;
    // Rows
    marked.forEach(row => { if (row.every(m => m)) bingos++; });
    // Cols
    for (let i = 0; i < 5; i++) {
      if (marked.every(row => row[i])) bingos++;
    }
    // Diagonals
    if (marked.every((row, i) => row[i])) bingos++;
    if (marked.every((row, i) => row[4 - i])) bingos++;

    if (bingos > 0) {
      const win = bet * (bingos * 10);
      addCoins(win);
      setMessage(`BINGO! ${bingos} line(s). You won ${win} coins!`);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } else {
      setMessage('No bingo. Better luck next time!');
    }
    setIsGameActive(false);
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

      <div className="w-full max-w-4xl bg-blue-900 rounded-3xl border-8 border-blue-950 shadow-2xl p-8 relative overflow-hidden flex flex-col md:flex-row gap-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
        
        {/* Card */}
        <div className="flex-1 bg-white p-4 rounded-xl shadow-inner relative z-10">
          <div className="grid grid-cols-5 gap-1 mb-2">
            {['B', 'I', 'N', 'G', 'O'].map(l => (
              <div key={l} className="text-center font-black text-blue-900 text-2xl">{l}</div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {card.map((row, rIdx) => (
              row.map((num, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`aspect-square rounded-full flex items-center justify-center font-bold text-lg border-2 transition-all ${marked[rIdx][cIdx] ? 'bg-red-500 text-white border-red-400 shadow-lg scale-105' : 'bg-gray-100 text-blue-900 border-gray-300'}`}
                >
                  {num === 0 ? 'FREE' : num}
                </div>
              ))
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-6 relative z-10">
          <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-4">
            <div className="text-xs text-gray-400 uppercase tracking-widest font-black">Latest Ball</div>
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl font-black text-blue-900 shadow-2xl border-4 border-blue-400">
                {drawn[drawn.length - 1] || '--'}
              </div>
            </div>
            <div className="text-sm font-bold text-yellow-400 text-center leading-tight">{message}</div>
          </div>

          <div className="space-y-4">
            {!isGameActive ? (
              <>
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
                  onClick={startGame}
                  className="w-full py-4 rounded-2xl text-xl font-black uppercase tracking-widest bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-indigo-500/50"
                >
                  PLAY
                </button>
                <button
                  onClick={generateCard}
                  className="w-full py-2 text-xs text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" /> New Card
                </button>
              </>
            ) : (
              <div className="text-center text-gray-400 animate-pulse">Drawing in progress...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
