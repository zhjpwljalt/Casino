import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy, Dices } from 'lucide-react';
import confetti from 'canvas-confetti';

export const SicBo: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, addCoins, removeCoins } = useGame();
  const [dice, setDice] = useState<[number, number, number]>([1, 1, 1]);
  const [isRolling, setIsRolling] = useState(false);
  const [bet, setBet] = useState(10);
  const [selectedBets, setSelectedBets] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('Place your bets on Big, Small or Triple!');

  const roll = () => {
    if (isRolling) return;
    const totalBet = Object.values(selectedBets).reduce((a: number, b: number) => a + b, 0);
    if (totalBet === 0) {
      setMessage('Please place a bet first!');
      return;
    }
    if (totalBet > coins) {
      setMessage('Not enough coins!');
      return;
    }

    setIsRolling(true);
    setMessage('Rolling...');

    const interval = setInterval(() => {
      setDice([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      const finalDice: [number, number, number] = [d1, d2, d3];
      setDice(finalDice);
      setIsRolling(false);
      checkWins(finalDice);
    }, 1500);
  };

  const checkWins = (finalDice: [number, number, number]) => {
    const sum = finalDice.reduce((a: number, b: number) => a + b, 0);
    const isTriple = finalDice[0] === finalDice[1] && finalDice[1] === finalDice[2];
    const isSmall = sum >= 4 && sum <= 10 && !isTriple;
    const isBig = sum >= 11 && sum <= 17 && !isTriple;

    let totalWin = 0;
    Object.entries(selectedBets).forEach(([type, amount]: [string, number]) => {
      if (type === 'small' && isSmall) totalWin += amount * 2;
      if (type === 'big' && isBig) totalWin += amount * 2;
      if (type === 'triple' && isTriple) totalWin += amount * 31;
      if (type === 'any_triple' && isTriple) totalWin += amount * 6;
    });

    if (totalWin > 0) {
      addCoins(totalWin);
      setMessage(`Win! Total sum is ${sum}. You won ${totalWin} coins!`);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } else {
      setMessage(`Sum is ${sum}. No win this time.`);
    }
    setSelectedBets({});
  };

  const placeBet = (type: string) => {
    if (isRolling) return;
    if (removeCoins(bet)) {
      setSelectedBets(prev => ({ ...prev, [type]: (prev[type] || 0) + bet }));
    } else {
      setMessage('Not enough coins!');
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

      <div className="w-full max-w-4xl bg-red-900 rounded-3xl border-8 border-red-950 shadow-2xl p-12 relative overflow-hidden flex flex-col items-center gap-12">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
        
        {/* Dice Area */}
        <div className="flex gap-6 relative z-10">
          {dice.map((val, i) => (
            <motion.div
              key={i}
              animate={isRolling ? { rotate: [0, 90, 180, 270, 360], y: [0, -20, 0] } : {}}
              transition={{ repeat: Infinity, duration: 0.3, delay: i * 0.1 }}
              className="w-20 h-20 bg-white rounded-xl shadow-2xl flex items-center justify-center border-4 border-gray-200"
            >
              <div className="grid grid-cols-3 grid-rows-3 gap-1 w-12 h-12">
                {[...Array(9)].map((_, idx) => {
                  const show = (val === 1 && idx === 4) ||
                    (val === 2 && (idx === 0 || idx === 8)) ||
                    (val === 3 && (idx === 0 || idx === 4 || idx === 8)) ||
                    (val === 4 && (idx === 0 || idx === 2 || idx === 6 || idx === 8)) ||
                    (val === 5 && (idx === 0 || idx === 2 || idx === 4 || idx === 6 || idx === 8)) ||
                    (val === 6 && (idx === 0 || idx === 2 || idx === 3 || idx === 5 || idx === 6 || idx === 8));
                  return <div key={idx} className={`w-2.5 h-2.5 rounded-full ${show ? 'bg-red-600' : 'bg-transparent'}`} />;
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Betting Board */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full relative z-10">
          <button onClick={() => placeBet('small')} className="h-24 bg-black/40 rounded-2xl border-2 border-white/10 hover:bg-black/60 flex flex-col items-center justify-center gap-1">
            <span className="font-black text-xl">SMALL</span>
            <span className="text-[10px] opacity-70">4-10 (x2)</span>
            {selectedBets['small'] > 0 && <span className="text-xs bg-yellow-400 text-black px-2 rounded-full">{selectedBets['small']}</span>}
          </button>
          <button onClick={() => placeBet('big')} className="h-24 bg-black/40 rounded-2xl border-2 border-white/10 hover:bg-black/60 flex flex-col items-center justify-center gap-1">
            <span className="font-black text-xl">BIG</span>
            <span className="text-[10px] opacity-70">11-17 (x2)</span>
            {selectedBets['big'] > 0 && <span className="text-xs bg-yellow-400 text-black px-2 rounded-full">{selectedBets['big']}</span>}
          </button>
          <button onClick={() => placeBet('any_triple')} className="h-24 bg-black/40 rounded-2xl border-2 border-white/10 hover:bg-black/60 flex flex-col items-center justify-center gap-1">
            <span className="font-black text-xl">ANY TRIPLE</span>
            <span className="text-[10px] opacity-70">Any 3 same (x6)</span>
            {selectedBets['any_triple'] > 0 && <span className="text-xs bg-yellow-400 text-black px-2 rounded-full">{selectedBets['any_triple']}</span>}
          </button>
          <button onClick={() => placeBet('triple')} className="h-24 bg-black/40 rounded-2xl border-2 border-white/10 hover:bg-black/60 flex flex-col items-center justify-center gap-1">
            <span className="font-black text-xl">TRIPLE</span>
            <span className="text-[10px] opacity-70">Specific (x31)</span>
            {selectedBets['triple'] > 0 && <span className="text-xs bg-yellow-400 text-black px-2 rounded-full">{selectedBets['triple']}</span>}
          </button>
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
              onClick={roll}
              disabled={isRolling}
              className={`px-12 py-4 rounded-2xl text-2xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-3 ${isRolling ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:shadow-orange-500/50 text-black'}`}
            >
              <Dices className="w-8 h-8" />
              {isRolling ? 'ROLLING...' : 'ROLL!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
