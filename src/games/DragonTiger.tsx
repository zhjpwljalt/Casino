import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy, ShieldCheck, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '../lib/audio';

type Card = { suit: string; value: string; rank: number };
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const CardUI: React.FC<{ card: Card | null; label: string }> = ({ card, label }) => {
  const isRed = card ? ['♥', '♦'].includes(card.suit) : false;
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-white font-black tracking-widest uppercase text-sm opacity-50">{label}</div>
      <div className="relative w-32 h-48 perspective-1000">
        <AnimatePresence mode="wait">
          {!card ? (
            <motion.div
              key="empty"
              className="absolute inset-0 bg-black/20 rounded-2xl border-4 border-dashed border-white/10 flex items-center justify-center"
            >
              <span className="text-white/10 font-black text-4xl">?</span>
            </motion.div>
          ) : (
            <motion.div
              key="card"
              initial={{ rotateY: 180, opacity: 0, scale: 0.8 }}
              animate={{ rotateY: 0, opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-white rounded-2xl border-4 border-gray-200 shadow-2xl flex flex-col p-3"
            >
              <div className={`flex justify-between items-start ${isRed ? 'text-red-600' : 'text-black'}`}>
                <div className="flex flex-col items-center leading-none">
                  <span className="text-xl font-black">{card.value}</span>
                  <span className="text-sm">{card.suit}</span>
                </div>
              </div>
              <div className={`flex-1 flex items-center justify-center text-6xl ${isRed ? 'text-red-600' : 'text-black'}`}>
                {card.suit}
              </div>
              <div className={`flex justify-between items-end rotate-180 ${isRed ? 'text-red-600' : 'text-black'}`}>
                <div className="flex flex-col items-center leading-none">
                  <span className="text-xl font-black">{card.value}</span>
                  <span className="text-sm">{card.suit}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const DragonTiger: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, addCoins, removeCoins } = useGame();
  const [dragonCard, setDragonCard] = useState<Card | null>(null);
  const [tigerCard, setTigerCard] = useState<Card | null>(null);
  const [gameState, setGameState] = useState<'betting' | 'result'>('betting');
  const [bet, setBet] = useState(10);
  const [betOn, setBetOn] = useState<'dragon' | 'tiger' | 'tie'>('dragon');
  const [message, setMessage] = useState('PLACE YOUR BET');

  const play = () => {
    if (!removeCoins(bet)) {
      setMessage('INSUFFICIENT COINS');
      playSound('hit');
      return;
    }

    setGameState('result');
    setMessage('DEALING...');
    playSound('shoot');

    setTimeout(() => {
      const dCard = {
        suit: SUITS[Math.floor(Math.random() * 4)],
        value: VALUES[Math.floor(Math.random() * 13)],
        rank: Math.floor(Math.random() * 13) + 1
      };
      setDragonCard(dCard);
      playSound('shoot');

      setTimeout(() => {
        const tCard = {
          suit: SUITS[Math.floor(Math.random() * 4)],
          value: VALUES[Math.floor(Math.random() * 13)],
          rank: Math.floor(Math.random() * 13) + 1
        };
        setTigerCard(tCard);
        playSound('shoot');

        setTimeout(() => {
          let win = false;
          if (dCard.rank > tCard.rank && betOn === 'dragon') win = true;
          else if (tCard.rank > dCard.rank && betOn === 'tiger') win = true;
          else if (dCard.rank === tCard.rank && betOn === 'tie') win = true;

          if (win) {
            const multiplier = betOn === 'tie' ? 8 : 2;
            const payout = bet * multiplier;
            addCoins(payout);
            setMessage(`WINNER! +${payout}`);
            playSound('win');
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          } else {
            setMessage('HOUSE WINS');
            playSound('hit');
          }
        }, 500);
      }, 800);
    }, 800);
  };

  const reset = () => {
    setDragonCard(null);
    setTigerCard(null);
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

      <div className="relative w-full max-w-4xl aspect-[16/9] bg-[#1a1a1a] rounded-[3rem] border-[12px] border-zinc-800 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col justify-between p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.05)_0%,transparent_70%)]" />
        
        <div className="flex justify-around items-center h-full">
          <CardUI card={dragonCard} label="Dragon" />
          
          <div className="flex flex-col items-center gap-6 z-10">
            <div className="text-6xl font-black text-white/10 italic">VS</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={message}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-black/80 backdrop-blur-xl px-8 py-3 rounded-2xl border border-white/10 text-xl font-black text-yellow-400 tracking-widest uppercase"
              >
                {message}
              </motion.div>
            </AnimatePresence>
          </div>

          <CardUI card={tigerCard} label="Tiger" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        {gameState === 'betting' ? (
          <div className="flex flex-col items-center gap-6">
            <div className="flex gap-4">
              {(['dragon', 'tie', 'tiger'] as const).map(side => (
                <button
                  key={side}
                  onClick={() => {
                    setBetOn(side);
                    playSound('coin');
                  }}
                  className={`px-10 py-4 rounded-2xl font-black text-xl tracking-widest uppercase transition-all border-b-4 ${betOn === side ? 'bg-yellow-500 border-yellow-700 text-black scale-105' : 'bg-zinc-800 border-zinc-950 text-gray-400 hover:bg-zinc-700'}`}
                >
                  {side}
                </button>
              ))}
            </div>
            
            <div className="flex gap-4 bg-black/40 p-3 rounded-3xl border border-white/10">
              <div className="flex gap-2 mr-4 border-r border-white/10 pr-4">
                {[10, 50, 100, 500].map(amount => (
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
                onClick={play}
                className="px-12 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-black text-xl shadow-xl border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
              >
                PLAY
              </button>
            </div>
          </div>
        ) : (
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
