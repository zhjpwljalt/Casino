import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

type Card = { suit: string; value: string; hidden?: boolean };
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const HAND_RANKINGS = [
  { name: 'Royal Flush', multiplier: 250 },
  { name: 'Straight Flush', multiplier: 50 },
  { name: 'Four of a Kind', multiplier: 25 },
  { name: 'Full House', multiplier: 9 },
  { name: 'Flush', multiplier: 6 },
  { name: 'Straight', multiplier: 4 },
  { name: 'Three of a Kind', multiplier: 3 },
  { name: 'Two Pair', multiplier: 2 },
  { name: 'Jacks or Better', multiplier: 1 },
];

export const Poker: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, addCoins, removeCoins } = useGame();
  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [gameState, setGameState] = useState<'betting' | 'deal' | 'draw' | 'gameOver'>('betting');
  const [bet, setBet] = useState(10);
  const [message, setMessage] = useState('Place your bet');
  const [winName, setWinName] = useState<string | null>(null);

  const initializeDeck = () => {
    const newDeck: Card[] = [];
    SUITS.forEach(suit => {
      VALUES.forEach(value => {
        newDeck.push({ suit, value });
      });
    });
    return newDeck.sort(() => Math.random() - 0.5);
  };

  const deal = () => {
    if (!removeCoins(bet)) {
      setMessage('Not enough coins!');
      return;
    }
    const newDeck = initializeDeck();
    const newHand = [newDeck.pop()!, newDeck.pop()!, newDeck.pop()!, newDeck.pop()!, newDeck.pop()!];
    setDeck(newDeck);
    setHand(newHand);
    setHeld([false, false, false, false, false]);
    setGameState('deal');
    setMessage('Hold cards and Draw');
  };

  const draw = () => {
    const newDeck = [...deck];
    const newHand = hand.map((card, i) => held[i] ? card : newDeck.pop()!);
    setHand(newHand);
    setDeck(newDeck);
    setGameState('gameOver');
    evaluateHand(newHand);
  };

  const evaluateHand = (currentHand: Card[]) => {
    const values = currentHand.map(c => VALUES.indexOf(c.value)).sort((a, b) => a - b);
    const suits = currentHand.map(c => c.suit);
    const isFlush = new Set(suits).size === 1;
    const isStraight = values.every((v, i) => i === 0 || v === values[i - 1] + 1);
    
    const counts: Record<string, number> = {};
    currentHand.forEach(c => counts[c.value] = (counts[c.value] || 0) + 1);
    const countValues = Object.values(counts).sort((a, b) => b - a);

    let rank = null;
    if (isFlush && isStraight && values[0] === 8) rank = HAND_RANKINGS[0]; // Royal Flush
    else if (isFlush && isStraight) rank = HAND_RANKINGS[1];
    else if (countValues[0] === 4) rank = HAND_RANKINGS[2];
    else if (countValues[0] === 3 && countValues[1] === 2) rank = HAND_RANKINGS[3];
    else if (isFlush) rank = HAND_RANKINGS[4];
    else if (isStraight) rank = HAND_RANKINGS[5];
    else if (countValues[0] === 3) rank = HAND_RANKINGS[6];
    else if (countValues[0] === 2 && countValues[1] === 2) rank = HAND_RANKINGS[7];
    else if (countValues[0] === 2) {
      const pairValue = Object.keys(counts).find(k => counts[k] === 2)!;
      if (VALUES.indexOf(pairValue) >= 9) rank = HAND_RANKINGS[8]; // Jacks or Better
    }

    if (rank) {
      const win = bet * rank.multiplier;
      addCoins(win);
      setWinName(rank.name);
      setMessage(`You won ${win} coins!`);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      setMessage('No win. Try again!');
      setWinName(null);
    }
  };

  const toggleHold = (index: number) => {
    if (gameState !== 'deal') return;
    const newHeld = [...held];
    newHeld[index] = !newHeld[index];
    setHeld(newHeld);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 text-white p-4">
      <div className="w-full max-w-5xl flex justify-between items-center">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          &larr; Back
        </button>
        <div className="bg-black/50 px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
          <Coins className="text-yellow-400 w-4 h-4" />
          <span className="font-mono text-yellow-400">{coins}</span>
        </div>
      </div>

      <div className="w-full max-w-5xl bg-blue-900 rounded-3xl border-8 border-blue-950 shadow-2xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-30 pointer-events-none" />
        
        {/* Paytable */}
        <div className="grid grid-cols-3 md:grid-cols-9 gap-2 mb-8 bg-black/40 p-4 rounded-xl border border-white/10 text-[10px] md:text-xs">
          {HAND_RANKINGS.map(rank => (
            <div key={rank.name} className={`flex flex-col items-center p-1 rounded ${winName === rank.name ? 'bg-yellow-500 text-black font-bold' : 'text-blue-200'}`}>
              <span className="text-center leading-tight h-8 flex items-center">{rank.name}</span>
              <span className="font-mono">x{rank.multiplier}</span>
            </div>
          ))}
        </div>

        {/* Cards */}
        <div className="flex justify-center gap-2 md:gap-4 mb-8 min-h-[160px]">
          {hand.map((card, i) => (
            <motion.div
              key={i}
              onClick={() => toggleHold(i)}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`relative w-16 h-24 md:w-32 md:h-48 bg-white rounded-xl shadow-2xl flex flex-col items-center justify-center cursor-pointer border-2 transition-all ${held[i] ? 'border-yellow-400 -translate-y-4' : 'border-gray-300'}`}
            >
              <span className={`text-2xl md:text-5xl ${['♥', '♦'].includes(card.suit) ? 'text-red-600' : 'text-black'}`}>
                {card.value}{card.suit}
              </span>
              {held[i] && (
                <div className="absolute -top-6 bg-yellow-400 text-black text-[10px] md:text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  HELD
                </div>
              )}
            </motion.div>
          ))}
          {hand.length === 0 && Array(5).fill(0).map((_, i) => (
            <div key={i} className="w-16 h-24 md:w-32 md:h-48 bg-blue-800 rounded-xl border-2 border-blue-700 opacity-50" />
          ))}
        </div>

        {/* Info & Controls */}
        <div className="flex flex-col items-center gap-6">
          <div className="text-2xl font-bold text-yellow-400 h-8">
            {message}
          </div>

          <div className="flex gap-4">
            {gameState === 'betting' || gameState === 'gameOver' ? (
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
                  onClick={deal}
                  className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-xl shadow-lg shadow-red-600/50 transition-all"
                >
                  DEAL
                </button>
              </div>
            ) : (
              <button
                onClick={draw}
                className="px-12 py-4 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full font-black text-2xl shadow-lg shadow-yellow-500/50 transition-all"
              >
                DRAW
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
