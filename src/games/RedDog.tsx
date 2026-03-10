import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '../lib/audio';

type Card = { suit: string; value: string; rank: number };
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const CardUI: React.FC<{ card: Card | null; label: string; hidden?: boolean }> = ({ card, label, hidden }) => {
  const isRed = card ? ['♥', '♦'].includes(card.suit) : false;
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-white font-black tracking-widest uppercase text-[10px] opacity-30">{label}</div>
      <div className="relative w-24 h-36 perspective-1000">
        <AnimatePresence mode="wait">
          {!card ? (
            <motion.div
              key="empty"
              className="absolute inset-0 bg-black/20 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center"
            >
              <span className="text-white/10 font-black text-2xl">?</span>
            </motion.div>
          ) : (
            <motion.div
              key="card"
              initial={{ rotateY: 180, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              className="absolute inset-0 bg-white rounded-xl border-2 border-gray-200 shadow-xl flex flex-col p-2"
            >
              <div className={`flex justify-between items-start ${isRed ? 'text-red-600' : 'text-black'}`}>
                <div className="flex flex-col items-center leading-none">
                  <span className="text-sm font-black">{card.value}</span>
                  <span className="text-[10px]">{card.suit}</span>
                </div>
              </div>
              <div className={`flex-1 flex items-center justify-center text-4xl ${isRed ? 'text-red-600' : 'text-black'}`}>
                {card.suit}
              </div>
              <div className={`flex justify-between items-end rotate-180 ${isRed ? 'text-red-600' : 'text-black'}`}>
                <div className="flex flex-col items-center leading-none">
                  <span className="text-sm font-black">{card.value}</span>
                  <span className="text-[10px]">{card.suit}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const RedDog: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, addCoins, removeCoins } = useGame();
  const [cards, setCards] = useState<(Card | null)[]>([null, null, null]);
  const [gameState, setGameState] = useState<'betting' | 'spread' | 'result'>('betting');
  const [bet, setBet] = useState(10);
  const [spread, setSpread] = useState(0);
  const [message, setMessage] = useState('PLACE YOUR BET');

  const dealInitial = () => {
    if (!removeCoins(bet)) {
      setMessage('INSUFFICIENT COINS');
      playSound('hit');
      return;
    }

    playSound('shoot');
    const c1 = { suit: SUITS[Math.floor(Math.random() * 4)], value: VALUES[Math.floor(Math.random() * 13)], rank: Math.floor(Math.random() * 13) + 2 };
    const c2 = { suit: SUITS[Math.floor(Math.random() * 4)], value: VALUES[Math.floor(Math.random() * 13)], rank: Math.floor(Math.random() * 13) + 2 };
    
    setCards([c1, c2, null]);
    
    const diff = Math.abs(c1.rank - c2.rank);
    if (diff === 0) {
      setMessage('CONSECUTIVE! PUSH');
      addCoins(bet);
      setGameState('result');
    } else if (diff === 1) {
      setMessage('CONSECUTIVE! PUSH');
      addCoins(bet);
      setGameState('result');
    } else {
      setSpread(diff - 1);
      setGameState('spread');
      setMessage(`SPREAD: ${diff - 1}. RAISE?`);
    }
  };

  const drawThird = (raise: boolean) => {
    let finalBet = bet;
    if (raise) {
      if (!removeCoins(bet)) {
        // Can't raise, just proceed with original bet
      } else {
        finalBet += bet;
      }
    }

    playSound('shoot');
    const c3 = { suit: SUITS[Math.floor(Math.random() * 4)], value: VALUES[Math.floor(Math.random() * 13)], rank: Math.floor(Math.random() * 13) + 2 };
    setCards(prev => [prev[0], prev[1], c3]);
    setGameState('result');

    const low = Math.min(cards[0]!.rank, cards[1]!.rank);
    const high = Math.max(cards[0]!.rank, cards[1]!.rank);

    if (c3.rank > low && c3.rank < high) {
      let multiplier = 2;
      if (spread === 1) multiplier = 6;
      else if (spread === 2) multiplier = 5;
      else if (spread === 3) multiplier = 3;
      
      const payout = finalBet * multiplier;
      addCoins(payout);
      setMessage(`WINNER! +${payout}`);
      playSound('win');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      setMessage('HOUSE WINS');
      playSound('hit');
    }
  };

  const reset = () => {
    setCards([null, null, null]);
    setGameState('betting');
    setMessage('PLACE YOUR BET');
    playSound('coin');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 font-display">
      <div className="w-full max-w-4xl flex justify-between items-center px-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold uppercase tracking-widest text-sm">
          &larr; EXIT FLOOR
        </button>
        <div className="bg-black/80 px-6 py-2 rounded-full border border-yellow-500/30 flex items-center gap-3 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
          <Coins className="text-yellow-400 w-5 h-5" />
          <span className="font-mono text-xl text-yellow-400 font-black">{coins}</span>
        </div>
      </div>

      <div className="relative w-full max-w-4xl aspect-[16/9] bg-[#1a4d2e] rounded-[3rem] border-[12px] border-[#3d2b1f] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col justify-between p-12">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-40 pointer-events-none" />
        
        <div className="flex justify-around items-center h-full">
          <CardUI card={cards[0]} label="Card 1" />
          
          <div className="flex flex-col items-center gap-6 z-10">
            {gameState === 'spread' && (
              <div className="text-4xl font-black text-yellow-400 animate-bounce">SPREAD: {spread}</div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={message}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-black/80 backdrop-blur-xl px-8 py-3 rounded-2xl border border-white/10 text-xl font-black text-white tracking-widest uppercase"
              >
                {message}
              </motion.div>
            </AnimatePresence>
          </div>

          <CardUI card={cards[1]} label="Card 2" />
        </div>

        <div className="flex justify-center mt-4">
          <CardUI card={cards[2]} label="Third Card" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        {gameState === 'betting' && (
          <div className="flex gap-4 bg-black/40 p-3 rounded-3xl border border-white/10">
            <div className="flex gap-2 mr-4 border-r border-white/10 pr-4">
              {[10, 50, 100].map(amount => (
                <button
                  key={amount}
                  onClick={() => {
                    setBet(amount);
                    playSound('coin');
                  }}
                  className={`px-6 py-2 rounded-xl font-black transition-all border-2 ${bet === amount ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-zinc-800 border-zinc-700 text-gray-400'}`}
                >
                  ${amount}
                </button>
              ))}
            </div>
            <button
              onClick={dealInitial}
              className="px-12 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-black text-xl shadow-xl border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
            >
              DEAL
            </button>
          </div>
        )}

        {gameState === 'spread' && (
          <div className="flex gap-4">
            <button
              onClick={() => drawThird(true)}
              className="px-12 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-xl font-black text-xl shadow-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1"
            >
              RAISE & DRAW
            </button>
            <button
              onClick={() => drawThird(false)}
              className="px-12 py-4 bg-zinc-800 text-white rounded-xl font-black text-xl shadow-xl border-b-4 border-black active:border-b-0 active:translate-y-1"
            >
              DRAW
            </button>
          </div>
        )}

        {gameState === 'result' && (
          <button
            onClick={reset}
            className="px-12 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black text-xl shadow-xl border-b-4 border-black active:border-b-0 active:translate-y-1 flex items-center gap-3"
          >
            <RefreshCw className="w-6 h-6" />
            NEW ROUND
          </button>
        )}
      </div>
    </div>
  );
};
