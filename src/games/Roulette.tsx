import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy, Zap, Target } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '../lib/audio';

const NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export const Roulette: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, addCoins, removeCoins } = useGame();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [selectedBets, setSelectedBets] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('PLACE YOUR BETS');
  const [history, setHistory] = useState<number[]>([]);

  const spin = () => {
    if (isSpinning) return;
    const totalBet = Object.values(selectedBets).reduce((a: number, b: number) => a + b, 0);
    if (totalBet === 0) {
      setMessage('PLACE A BET FIRST!');
      return;
    }

    setIsSpinning(true);
    setMessage('NO MORE BETS!');
    playSound('shoot');
    
    const spins = 5 + Math.random() * 5;
    const extraDegrees = Math.random() * 360;
    const newRotation = rotation + (spins * 360) + extraDegrees;
    setRotation(newRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const normalizedRotation = (newRotation % 360);
      const index = Math.floor(((360 - normalizedRotation + (360 / NUMBERS.length / 2)) % 360) / (360 / NUMBERS.length));
      const winningNumber = NUMBERS[index];
      setResult(winningNumber);
      setHistory(prev => [winningNumber, ...prev].slice(0, 10));
      checkWins(winningNumber);
    }, 4000);
  };

  const checkWins = (winningNumber: number) => {
    let totalWin = 0;
    const isRed = RED_NUMBERS.includes(winningNumber);
    const isBlack = winningNumber !== 0 && !isRed;
    const isEven = winningNumber !== 0 && winningNumber % 2 === 0;
    const isOdd = winningNumber !== 0 && winningNumber % 2 !== 0;

    Object.entries(selectedBets).forEach(([betType, amount]: [string, number]) => {
      if (betType === winningNumber.toString()) totalWin += amount * 36;
      if (betType === 'red' && isRed) totalWin += amount * 2;
      if (betType === 'black' && isBlack) totalWin += amount * 2;
      if (betType === 'even' && isEven) totalWin += amount * 2;
      if (betType === 'odd' && isOdd) totalWin += amount * 2;
    });

    if (totalWin > 0) {
      addCoins(totalWin);
      setMessage(`WINNER: ${winningNumber}! WON ${totalWin}`);
      playSound('win');
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } else {
      setMessage(`RESULT: ${winningNumber}. BETTER LUCK!`);
    }
    setSelectedBets({});
  };

  const placeBet = (type: string) => {
    if (isSpinning) return;
    if (removeCoins(betAmount)) {
      setSelectedBets(prev => ({
        ...prev,
        [type]: (prev[type] || 0) + betAmount
      }));
      playSound('coin');
    } else {
      setMessage('NOT ENOUGH COINS!');
    }
  };

  const clearBets = () => {
    if (isSpinning) return;
    const totalBet = Object.values(selectedBets).reduce((a: number, b: number) => a + b, 0);
    addCoins(totalBet);
    setSelectedBets({});
    setMessage('BETS CLEARED');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 text-white p-4 font-display">
      <div className="w-full max-w-6xl flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-black uppercase tracking-widest text-sm">
          &larr; EXIT TABLE
        </button>
        <div className="bg-black/80 px-6 py-2 rounded-full border border-yellow-500/30 flex items-center gap-3 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
          <Coins className="text-yellow-400 w-5 h-5" />
          <span className="font-mono text-xl text-yellow-400 font-black">{coins}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full max-w-6xl">
        {/* Roulette Wheel Section */}
        <div className="relative flex flex-col items-center gap-8">
          <div className="relative">
            {/* Outer Frame */}
            <div className="absolute -inset-10 bg-gradient-to-b from-yellow-800 via-yellow-900 to-black rounded-full border-8 border-yellow-700 shadow-[0_0_100px_rgba(0,0,0,0.8)]" />
            
            <motion.div
              animate={{ rotate: rotation }}
              transition={{ duration: 4, ease: "circOut" }}
              className="w-80 h-80 md:w-[450px] md:h-[450px] rounded-full border-4 border-yellow-600 shadow-2xl relative bg-zinc-900 overflow-hidden"
            >
              {NUMBERS.map((num, i) => {
                const angle = (i * 360) / NUMBERS.length;
                const isRed = RED_NUMBERS.includes(num);
                const isZero = num === 0;
                return (
                  <div
                    key={num}
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 origin-bottom flex flex-col items-center"
                    style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
                  >
                    <div className={`w-10 h-16 flex items-center justify-center text-sm font-black border-x border-white/5 ${isZero ? 'bg-emerald-600' : isRed ? 'bg-red-600' : 'bg-zinc-950'}`}>
                      <span className="rotate-180" style={{ writingMode: 'vertical-rl' }}>{num}</span>
                    </div>
                  </div>
                );
              })}
              {/* Inner Decoration */}
              <div className="absolute inset-16 rounded-full border-4 border-yellow-800/50 bg-gradient-to-br from-zinc-800 to-zinc-950 shadow-inner" />
              <div className="absolute inset-0 m-auto w-16 h-16 bg-gradient-to-br from-yellow-600 to-yellow-900 rounded-full border-4 border-yellow-500 shadow-2xl z-10 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              </div>
            </motion.div>
            
            {/* Pointer */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20">
              <div className="w-6 h-12 bg-white rounded-b-full shadow-[0_0_20px_rgba(255,255,255,0.5)] border-2 border-zinc-300" />
            </div>
          </div>

          {/* History */}
          <div className="flex gap-2">
            {history.map((h, i) => (
              <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border border-white/10 ${h === 0 ? 'bg-emerald-600' : RED_NUMBERS.includes(h) ? 'bg-red-600' : 'bg-zinc-900'}`}>
                {h}
              </div>
            ))}
          </div>
        </div>

        {/* Betting Board Section */}
        <div className="space-y-8">
          <div className="bg-emerald-950/40 p-8 rounded-[2rem] border-4 border-yellow-900/50 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 arcade-grid opacity-20" />
            
            <div className="relative z-10 space-y-8">
              <div className="text-center">
                <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                  {message}
                </h3>
                <div className="h-1 w-24 bg-yellow-500 mx-auto rounded-full" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => placeBet('red')} className="group relative h-24 bg-red-600 rounded-2xl font-black text-2xl flex flex-col items-center justify-center border-b-4 border-red-800 hover:brightness-110 transition-all active:border-b-0 active:translate-y-1">
                  RED
                  <span className="text-[10px] opacity-50 tracking-widest">PAYOUT 2:1</span>
                  {selectedBets['red'] > 0 && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 text-black rounded-full flex items-center justify-center text-xs font-black shadow-lg">
                      {selectedBets['red']}
                    </div>
                  )}
                </button>
                <button onClick={() => placeBet('black')} className="group relative h-24 bg-zinc-900 rounded-2xl font-black text-2xl flex flex-col items-center justify-center border-b-4 border-black hover:brightness-110 transition-all active:border-b-0 active:translate-y-1">
                  BLACK
                  <span className="text-[10px] opacity-50 tracking-widest">PAYOUT 2:1</span>
                  {selectedBets['black'] > 0 && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 text-black rounded-full flex items-center justify-center text-xs font-black shadow-lg">
                      {selectedBets['black']}
                    </div>
                  )}
                </button>
                <button onClick={() => placeBet('even')} className="group relative h-20 bg-zinc-800 rounded-2xl font-black text-xl flex flex-col items-center justify-center border-b-4 border-zinc-950 hover:brightness-110 transition-all active:border-b-0 active:translate-y-1">
                  EVEN
                  {selectedBets['even'] > 0 && <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center text-[10px] font-black">{selectedBets['even']}</div>}
                </button>
                <button onClick={() => placeBet('odd')} className="group relative h-20 bg-zinc-800 rounded-2xl font-black text-xl flex flex-col items-center justify-center border-b-4 border-zinc-950 hover:brightness-110 transition-all active:border-b-0 active:translate-y-1">
                  ODD
                  {selectedBets['odd'] > 0 && <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center text-[10px] font-black">{selectedBets['odd']}</div>}
                </button>
              </div>

              <div className="flex justify-center gap-4">
                {[10, 50, 100, 500].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setBetAmount(amount)}
                    className={`w-16 h-16 rounded-full font-black text-xs transition-all border-4 flex items-center justify-center ${betAmount === amount ? 'bg-yellow-500 border-yellow-300 text-black scale-110 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
                  >
                    {amount}
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={clearBets}
                  disabled={isSpinning}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  Clear Bets
                </button>
                <button
                  onClick={spin}
                  disabled={isSpinning}
                  className={`flex-[2] py-4 rounded-xl text-xl font-black uppercase tracking-[0.2em] shadow-xl transition-all border-b-4 ${isSpinning ? 'bg-zinc-700 border-zinc-900 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-800 hover:brightness-110 active:border-b-0 active:translate-y-1'}`}
                >
                  {isSpinning ? 'SPINNING...' : 'SPIN WHEEL'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
