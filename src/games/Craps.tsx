import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy, Dices } from 'lucide-react';
import confetti from 'canvas-confetti';

export const Craps: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, addCoins, removeCoins } = useGame();
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [isRolling, setIsRolling] = useState(false);
  const [point, setPoint] = useState<number | null>(null);
  const [bet, setBet] = useState(10);
  const [message, setMessage] = useState('Place your bet on Pass Line');
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'gameOver'>('betting');

  const roll = () => {
    if (isRolling) return;
    if (gameState === 'betting') {
      if (!removeCoins(bet)) {
        setMessage('Not enough coins!');
        return;
      }
      setGameState('playing');
    }

    setIsRolling(true);
    setMessage('Rolling...');

    const interval = setInterval(() => {
      setDice([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const sum = d1 + d2;
      setDice([d1, d2]);
      setIsRolling(false);
      handleResult(sum);
    }, 1000);
  };

  const handleResult = (sum: number) => {
    if (point === null) {
      // Come out roll
      if (sum === 7 || sum === 11) {
        addCoins(bet * 2);
        setMessage(`Natural! ${sum}. You win ${bet * 2} coins!`);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setGameState('gameOver');
      } else if (sum === 2 || sum === 3 || sum === 12) {
        setMessage(`Craps! ${sum}. You lose.`);
        setGameState('gameOver');
      } else {
        setPoint(sum);
        setMessage(`Point is ${sum}. Roll again to hit the point!`);
      }
    } else {
      // Point roll
      if (sum === point) {
        addCoins(bet * 2);
        setMessage(`Hit the point! ${sum}. You win ${bet * 2} coins!`);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setPoint(null);
        setGameState('gameOver');
      } else if (sum === 7) {
        setMessage(`Seven out! ${sum}. You lose.`);
        setPoint(null);
        setGameState('gameOver');
      } else {
        setMessage(`Rolled ${sum}. Keep rolling for ${point}!`);
      }
    }
  };

  const reset = () => {
    setGameState('betting');
    setPoint(null);
    setMessage('Place your bet on Pass Line');
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

      <div className="w-full max-w-4xl bg-blue-900 rounded-3xl border-8 border-blue-950 shadow-2xl p-12 relative overflow-hidden flex flex-col items-center gap-12">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30 pointer-events-none" />
        
        {/* Dice Area */}
        <div className="flex gap-8 relative z-10">
          {dice.map((val, i) => (
            <motion.div
              key={i}
              animate={isRolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.2, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.2 }}
              className="w-24 h-24 bg-white rounded-2xl shadow-2xl flex items-center justify-center border-4 border-gray-200"
            >
              <div className="grid grid-cols-3 grid-rows-3 gap-2 w-16 h-16">
                {[...Array(9)].map((_, idx) => {
                  const show = (val === 1 && idx === 4) ||
                    (val === 2 && (idx === 0 || idx === 8)) ||
                    (val === 3 && (idx === 0 || idx === 4 || idx === 8)) ||
                    (val === 4 && (idx === 0 || idx === 2 || idx === 6 || idx === 8)) ||
                    (val === 5 && (idx === 0 || idx === 2 || idx === 4 || idx === 6 || idx === 8)) ||
                    (val === 6 && (idx === 0 || idx === 2 || idx === 3 || idx === 5 || idx === 6 || idx === 8));
                  return <div key={idx} className={`w-3 h-3 rounded-full ${show ? 'bg-black' : 'bg-transparent'}`} />;
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Info */}
        <div className="text-center relative z-10 space-y-4">
          {point && (
            <div className="text-yellow-400 font-black text-4xl uppercase tracking-tighter animate-pulse">
              POINT: {point}
            </div>
          )}
          <div className="bg-black/60 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 text-2xl font-bold text-white shadow-2xl">
            {message}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-6 relative z-10 w-full">
          {gameState === 'betting' && (
            <div className="flex gap-4 items-center">
              <div className="flex gap-2 bg-black/40 p-1 rounded-full border border-white/10">
                {[10, 50, 100, 500].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setBet(amount)}
                    className={`px-4 py-2 rounded-full font-bold transition-all ${bet === amount ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-4 w-full max-w-sm">
            <button
              onClick={roll}
              disabled={isRolling}
              className={`flex-1 py-4 rounded-2xl text-2xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${isRolling ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-orange-600 hover:shadow-orange-500/50'}`}
            >
              <Dices className="w-8 h-8" />
              {isRolling ? 'ROLLING...' : 'ROLL!'}
            </button>
            {gameState === 'gameOver' && (
              <button
                onClick={reset}
                className="w-16 h-16 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all"
              >
                <RefreshCw className="w-8 h-8" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
