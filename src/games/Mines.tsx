import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy, Gem, Bomb, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

export const Mines: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, addCoins, removeCoins } = useGame();
  const [grid, setGrid] = useState<('gem' | 'bomb')[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
  const [isGameOver, setIsGameOver] = useState(false);
  const [isBetting, setIsBetting] = useState(true);
  const [bet, setBet] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [message, setMessage] = useState('Place your bet and avoid the mines!');
  const [currentWin, setCurrentWin] = useState(0);

  const startGame = () => {
    if (!removeCoins(bet)) {
      setMessage('Not enough coins!');
      return;
    }
    const newGrid: ('gem' | 'bomb')[] = Array(25).fill('gem');
    let bombCount = 0;
    while (bombCount < mineCount) {
      const idx = Math.floor(Math.random() * 25);
      if (newGrid[idx] === 'gem') {
        newGrid[idx] = 'bomb';
        bombCount++;
      }
    }
    setGrid(newGrid);
    setRevealed(Array(25).fill(false));
    setIsGameOver(false);
    setIsBetting(false);
    setCurrentWin(bet);
    setMessage('Find the gems!');
  };

  const reveal = (idx: number) => {
    if (isGameOver || revealed[idx] || isBetting) return;
    const newRevealed = [...revealed];
    newRevealed[idx] = true;
    setRevealed(newRevealed);

    if (grid[idx] === 'bomb') {
      setIsGameOver(true);
      setMessage('BOOM! Game Over.');
    } else {
      const gemsRevealed = newRevealed.filter((r, i) => r && grid[i] === 'gem').length;
      const multiplier = calculateMultiplier(gemsRevealed);
      const nextMultiplier = calculateMultiplier(gemsRevealed + 1);
      setCurrentWin(bet * multiplier);
      setMessage(`Found a gem! Current win: ${(bet * multiplier).toFixed(0)}`);
      
      if (gemsRevealed === 25 - mineCount) {
        cashOut();
      }
    }
  };

  const calculateMultiplier = (gems: number) => {
    // Simple multiplier calculation based on probability
    let prob = 1;
    for (let i = 0; i < gems; i++) {
      prob *= (25 - mineCount - i) / (25 - i);
    }
    return 0.95 / prob; // 5% house edge
  };

  const cashOut = () => {
    if (isGameOver || isBetting) return;
    addCoins(currentWin);
    setMessage(`Cashed out! You won ${currentWin.toFixed(0)} coins!`);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setIsGameOver(true);
    setIsBetting(true);
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

      <div className="w-full max-w-4xl bg-zinc-900 rounded-3xl border-8 border-zinc-800 shadow-2xl p-8 relative overflow-hidden flex flex-col md:flex-row gap-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
        
        {/* Grid */}
        <div className="flex-1 grid grid-cols-5 gap-2 relative z-10">
          {revealed.map((isRevealed, i) => (
            <motion.button
              key={i}
              whileHover={!isRevealed && !isGameOver ? { scale: 1.05 } : {}}
              whileTap={!isRevealed && !isGameOver ? { scale: 0.95 } : {}}
              onClick={() => reveal(i)}
              className={`aspect-square rounded-xl border-2 transition-all flex items-center justify-center ${isRevealed ? (grid[i] === 'bomb' ? 'bg-red-600 border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'bg-emerald-600 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]') : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}
            >
              {isRevealed ? (
                grid[i] === 'bomb' ? <Bomb className="w-8 h-8" /> : <Gem className="w-8 h-8" />
              ) : (
                <div className="w-2 h-2 bg-zinc-600 rounded-full" />
              )}
            </motion.button>
          ))}
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-6 relative z-10">
          <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="text-xs text-gray-400 uppercase tracking-widest font-black">Status</div>
            <div className="text-xl font-bold text-yellow-400 leading-tight">{message}</div>
          </div>

          <div className="space-y-4">
            {isBetting ? (
              <>
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 uppercase tracking-widest">Mines: {mineCount}</div>
                  <div className="flex gap-1">
                    {[1, 3, 5, 10, 20].map(m => (
                      <button
                        key={m}
                        onClick={() => setMineCount(m)}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all ${mineCount === m ? 'bg-red-600 border-red-400 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 uppercase tracking-widest">Bet</div>
                  <div className="flex gap-1">
                    {[10, 50, 100].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setBet(amount)}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all ${bet === amount ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-white/5 border-white/10 text-gray-400'}`}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={startGame}
                  className="w-full py-4 rounded-2xl text-xl font-black uppercase tracking-widest bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/50"
                >
                  PLAY
                </button>
              </>
            ) : (
              <button
                onClick={cashOut}
                disabled={isGameOver}
                className={`w-full py-4 rounded-2xl text-xl font-black uppercase tracking-widest transition-all ${isGameOver ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg shadow-yellow-500/50'}`}
              >
                CASH OUT
              </button>
            )}
            {isGameOver && !isBetting && (
              <button
                onClick={() => setIsBetting(true)}
                className="w-full py-2 text-xs text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3 h-3" /> New Game
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
