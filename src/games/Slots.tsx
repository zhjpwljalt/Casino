import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import confetti from 'canvas-confetti';
import { Coins, RefreshCw, Trophy, AlertCircle, Sparkles, Zap } from 'lucide-react';
import { playSound } from '../lib/audio';

const SYMBOLS = ['💎', '🔔', '🍒', '🍋', '🍇', '7️⃣', '🎰', '⭐'];
const PAYOUTS: Record<string, number> = {
  '🍒': 2,
  '🍋': 3,
  '🍇': 5,
  '🔔': 10,
  '⭐': 20,
  '💎': 50,
  '7️⃣': 100,
  '🎰': 500,
};

const REEL_COUNT = 3;
const SPIN_DURATION = 2500;

export const Slots: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, removeCoins, addCoins } = useGame();
  const [reels, setReels] = useState<string[]>(['🎰', '🎰', '🎰']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [message, setMessage] = useState('PLACE YOUR BETS');
  const [bet, setBet] = useState(10);
  const [winAmount, setWinAmount] = useState(0);
  const [lastWin, setLastWin] = useState(0);

  const spin = () => {
    if (isSpinning) return;
    if (!removeCoins(bet)) {
      setMessage('INSUFFICIENT COINS');
      playSound('hit');
      return;
    }

    setIsSpinning(true);
    setMessage('SPINNING...');
    setWinAmount(0);
    playSound('shoot');

    // Simulate spinning
    const interval = setInterval(() => {
      setReels(prev => prev.map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]));
      playSound(200 + Math.random() * 100, 'sine', 0.05);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const finalReels = Array(REEL_COUNT).fill(0).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      setReels(finalReels);
      setIsSpinning(false);
      checkWin(finalReels);
    }, SPIN_DURATION);
  };

  const checkWin = (finalReels: string[]) => {
    const allSame = finalReels.every(s => s === finalReels[0]);
    if (allSame) {
      const symbol = finalReels[0];
      const payout = bet * PAYOUTS[symbol];
      addCoins(payout);
      setWinAmount(payout);
      setLastWin(payout);
      setMessage(`JACKPOT! +${payout}`);
      playSound('win');
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF4500']
      });
    } else {
      setMessage('TRY AGAIN');
      playSound('hit');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 font-display">
      <div className="flex justify-between w-full max-w-3xl items-center px-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold uppercase tracking-widest text-sm">
          &larr; EXIT FLOOR
        </button>
        <div className="flex items-center gap-4">
          <div className="bg-black/80 px-6 py-2 rounded-full border border-yellow-500/30 flex items-center gap-3 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
            <Coins className="text-yellow-400 w-5 h-5 animate-pulse" />
            <span className="font-mono text-xl text-yellow-400 font-black">{coins}</span>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-3xl">
        {/* Machine Frame */}
        <div className="absolute -inset-4 bg-gradient-to-b from-gray-700 via-gray-800 to-black rounded-[3rem] border-8 border-gray-600 shadow-[0_0_100px_rgba(0,0,0,0.9)]" />
        <div className="absolute -inset-2 bg-black rounded-[2.8rem] border border-white/10" />
        
        {/* Neon Header */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-16 bg-black border-4 border-yellow-500 rounded-t-3xl flex items-center justify-center shadow-[0_-10px_30px_rgba(234,179,8,0.3)]">
          <span className="text-2xl font-black text-yellow-400 tracking-[0.2em] animate-pulse">GOLDEN SLOTS</span>
        </div>

        <div className="relative p-8 bg-zinc-900 rounded-[2.5rem] overflow-hidden border-4 border-zinc-800">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
          
          {/* Display Panel */}
          <div className="mb-8 bg-black/90 p-4 rounded-2xl border-2 border-yellow-500/20 flex justify-between items-center px-8 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Last Win</span>
              <span className="text-2xl font-mono font-black text-green-400">${lastWin}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Status</span>
              <div className={`text-xl font-black tracking-widest ${isSpinning ? 'text-cyan-400 animate-pulse' : 'text-yellow-400'}`}>
                {message}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Current Bet</span>
              <span className="text-2xl font-mono font-black text-yellow-400">${bet}</span>
            </div>
          </div>

          {/* Reels Container */}
          <div className="relative flex justify-center gap-6 mb-10 bg-gradient-to-b from-zinc-800 to-zinc-950 p-8 rounded-3xl border-4 border-zinc-800 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none z-10" />
            
            {reels.map((symbol, i) => (
              <div key={i} className="relative w-32 h-48 bg-white rounded-2xl flex items-center justify-center text-7xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-4 border-gray-200 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-gray-200 via-transparent to-gray-200 pointer-events-none" />
                <motion.div
                  key={`${isSpinning}-${i}-${reels[i]}`}
                  initial={{ y: -150, opacity: 0, scale: 0.5 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: i * 0.15 
                  }}
                  className="drop-shadow-lg"
                >
                  {symbol}
                </motion.div>
                
                {/* Reel Lines */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/10 -translate-y-1/2" />
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center gap-4 bg-black/60 p-3 rounded-2xl border border-white/5 shadow-inner">
              <span className="text-gray-500 text-xs font-black uppercase tracking-widest px-4">Bet Amount</span>
              <div className="flex gap-2">
                {[10, 50, 100, 500].map(amount => (
                  <button
                    key={amount}
                    onClick={() => {
                      setBet(amount);
                      playSound('coin');
                    }}
                    disabled={isSpinning}
                    className={`px-6 py-2 rounded-xl text-sm font-black transition-all border-2 ${bet === amount ? 'bg-yellow-500 border-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-zinc-800 border-zinc-700 text-gray-400 hover:bg-zinc-700'}`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={spin}
                disabled={isSpinning}
                className={`flex-1 py-6 rounded-2xl text-3xl font-black uppercase tracking-[0.3em] shadow-2xl transition-all relative overflow-hidden group ${isSpinning ? 'bg-zinc-800 cursor-not-allowed text-zinc-600' : 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white border-b-8 border-red-800 hover:brightness-110'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                {isSpinning ? 'SPINNING' : 'SPIN'}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Side Accents */}
        <div className="absolute -left-4 top-1/4 bottom-1/4 w-2 bg-yellow-500 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.8)]" />
        <div className="absolute -right-4 top-1/4 bottom-1/4 w-2 bg-yellow-500 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.8)]" />
      </div>

      {/* Paytable */}
      <div className="w-full max-w-3xl glass-card p-6 grid grid-cols-4 md:grid-cols-8 gap-4">
        {Object.entries(PAYOUTS).map(([symbol, multiplier]) => (
          <div key={symbol} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/5 transition-colors">
            <span className="text-3xl drop-shadow-md">{symbol}</span>
            <span className="font-mono text-xs font-bold text-yellow-500">x{multiplier}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
