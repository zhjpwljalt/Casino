import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy, Crown, User, Building2 } from 'lucide-react';
import confetti from 'canvas-confetti';

type Card = { suit: string; value: string };
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const getCardValue = (card: Card) => {
  if (['10', 'J', 'Q', 'K'].includes(card.value)) return 0;
  if (card.value === 'A') return 1;
  return parseInt(card.value);
};

const calculateScore = (hand: Card[]) => {
  let score = hand.reduce((acc, card) => acc + getCardValue(card), 0);
  return score % 10;
};

export const Baccarat: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, addCoins, removeCoins } = useGame();
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [bankerHand, setBankerHand] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'gameOver'>('betting');
  const [bet, setBet] = useState(10);
  const [betType, setBetType] = useState<'player' | 'banker' | 'tie'>('player');
  const [message, setMessage] = useState('Place your bet');

  const deal = () => {
    if (!removeCoins(bet)) {
      setMessage('Not enough coins!');
      return;
    }
    setGameState('playing');
    setMessage('Dealing...');

    const deck = [];
    SUITS.forEach(suit => VALUES.forEach(value => deck.push({ suit, value })));
    deck.sort(() => Math.random() - 0.5);

    const pHand = [deck.pop()!, deck.pop()!];
    const bHand = [deck.pop()!, deck.pop()!];

    setPlayerHand(pHand);
    setBankerHand(bHand);

    setTimeout(() => {
      let pScore = calculateScore(pHand);
      let bScore = calculateScore(bHand);

      // Simple Baccarat rules for 3rd card
      if (pScore < 8 && bScore < 8) {
        if (pScore <= 5) {
          const p3rd = deck.pop()!;
          pHand.push(p3rd);
          setPlayerHand([...pHand]);
          pScore = calculateScore(pHand);
          
          // Banker rules after player 3rd card
          const p3rdVal = getCardValue(p3rd);
          if (bScore <= 2 || (bScore === 3 && p3rdVal !== 8) || (bScore === 4 && [2,3,4,5,6,7].includes(p3rdVal)) || (bScore === 5 && [4,5,6,7].includes(p3rdVal)) || (bScore === 6 && [6,7].includes(p3rdVal))) {
            bHand.push(deck.pop()!);
            setBankerHand([...bHand]);
            bScore = calculateScore(bHand);
          }
        } else if (bScore <= 5) {
          bHand.push(deck.pop()!);
          setBankerHand([...bHand]);
          bScore = calculateScore(bHand);
        }
      }

      determineWinner(pScore, bScore);
    }, 1500);
  };

  const determineWinner = (pScore: number, bScore: number) => {
    let winner: 'player' | 'banker' | 'tie' = 'tie';
    if (pScore > bScore) winner = 'player';
    else if (bScore > pScore) winner = 'banker';

    let winAmount = 0;
    if (betType === winner) {
      if (winner === 'tie') winAmount = bet * 9;
      else if (winner === 'banker') winAmount = bet * 1.95; // 5% commission
      else winAmount = bet * 2;
      
      addCoins(winAmount);
      setMessage(`Win! ${winner.toUpperCase()} won. +${winAmount.toFixed(0)}`);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
      setMessage(`Loss. ${winner.toUpperCase()} won.`);
    }
    setGameState('gameOver');
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

      <div className="w-full max-w-4xl bg-emerald-900 rounded-3xl border-8 border-yellow-900 shadow-2xl p-8 relative overflow-hidden flex flex-col gap-12">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-40 pointer-events-none" />
        
        {/* Banker */}
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="flex items-center gap-2 text-emerald-200 font-black tracking-widest uppercase">
            <Building2 className="w-5 h-5" /> Banker ({bankerHand.length > 0 ? calculateScore(bankerHand) : 0})
          </div>
          <div className="flex gap-4 min-h-[140px]">
            {bankerHand.map((card, i) => (
              <motion.div
                key={i}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-20 h-32 bg-white rounded-lg shadow-xl flex items-center justify-center text-3xl border-2 border-gray-300"
              >
                <span className={['♥', '♦'].includes(card.suit) ? 'text-red-600' : 'text-black'}>
                  {card.suit}{card.value}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="text-center relative z-10">
          <div className="bg-black/40 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 inline-block text-2xl font-bold text-yellow-400 shadow-2xl">
            {message}
          </div>
        </div>

        {/* Player */}
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="flex gap-4 min-h-[140px]">
            {playerHand.map((card, i) => (
              <motion.div
                key={i}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-20 h-32 bg-white rounded-lg shadow-xl flex items-center justify-center text-3xl border-2 border-gray-300"
              >
                <span className={['♥', '♦'].includes(card.suit) ? 'text-red-600' : 'text-black'}>
                  {card.suit}{card.value}
                </span>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-emerald-200 font-black tracking-widest uppercase">
            <User className="w-5 h-5" /> Player ({playerHand.length > 0 ? calculateScore(playerHand) : 0})
          </div>
        </div>
      </div>

      {/* Betting Controls */}
      <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
        {gameState !== 'playing' && (
          <>
            <div className="flex gap-4">
              {(['player', 'tie', 'banker'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setBetType(type)}
                  className={`px-8 py-4 rounded-2xl font-black text-xl uppercase tracking-widest transition-all border-2 ${betType === type ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg shadow-yellow-500/50' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                >
                  {type}
                  <span className="block text-[10px] opacity-70">{type === 'tie' ? 'x9' : 'x2'}</span>
                </button>
              ))}
            </div>
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
              <button
                onClick={deal}
                className="px-12 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-black text-xl shadow-lg shadow-red-600/50 transition-all"
              >
                DEAL
              </button>
            </div>
          </>
        )}
        {gameState === 'gameOver' && (
          <button
            onClick={() => { setGameState('betting'); setPlayerHand([]); setBankerHand([]); setMessage('Place your bet'); }}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reset Table
          </button>
        )}
      </div>
    </div>
  );
};
