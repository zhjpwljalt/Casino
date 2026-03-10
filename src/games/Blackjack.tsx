import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy, AlertCircle, User, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '../lib/audio';

type Card = { suit: string; value: string; hidden?: boolean };
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const getCardValue = (card: Card) => {
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value);
};

const calculateScore = (hand: Card[]) => {
  let score = 0;
  let aces = 0;
  hand.forEach(card => {
    if (card.hidden) return;
    score += getCardValue(card);
    if (card.value === 'A') aces += 1;
  });
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
};

const CardUI: React.FC<{ card: Card; index: number; isDealer?: boolean }> = ({ card, index, isDealer }) => {
  const isRed = ['♥', '♦'].includes(card.suit);
  
  return (
    <motion.div
      initial={{ y: isDealer ? -100 : 100, opacity: 0, rotateY: 180 }}
      animate={{ y: 0, opacity: 1, rotateY: card.hidden ? 180 : 0 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
      className="relative w-24 h-36 preserve-3d"
    >
      {/* Back of Card */}
      <div className={`absolute inset-0 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl border-4 border-white shadow-xl backface-hidden flex items-center justify-center rotate-y-180`}>
        <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        <div className="absolute inset-2 border-2 border-white/20 rounded-lg flex items-center justify-center">
          <span className="text-white/20 font-black text-2xl">CASINO</span>
        </div>
      </div>

      {/* Front of Card */}
      <div className={`absolute inset-0 bg-white rounded-xl border-2 border-gray-200 shadow-xl backface-hidden flex flex-col p-2`}>
        <div className={`flex justify-between items-start ${isRed ? 'text-red-600' : 'text-black'}`}>
          <div className="flex flex-col items-center leading-none">
            <span className="text-lg font-black">{card.value}</span>
            <span className="text-sm">{card.suit}</span>
          </div>
        </div>
        <div className={`flex-1 flex items-center justify-center text-4xl ${isRed ? 'text-red-600' : 'text-black'}`}>
          {card.suit}
        </div>
        <div className={`flex justify-between items-end rotate-180 ${isRed ? 'text-red-600' : 'text-black'}`}>
          <div className="flex flex-col items-center leading-none">
            <span className="text-lg font-black">{card.value}</span>
            <span className="text-sm">{card.suit}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const Blackjack: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { coins, addCoins, removeCoins } = useGame();
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'dealerTurn' | 'gameOver'>('betting');
  const [bet, setBet] = useState(10);
  const [message, setMessage] = useState('PLACE YOUR BETS');

  const initializeDeck = () => {
    const newDeck: Card[] = [];
    SUITS.forEach(suit => {
      VALUES.forEach(value => {
        newDeck.push({ suit, value });
      });
    });
    return newDeck.sort(() => Math.random() - 0.5);
  };

  const dealInitialCards = () => {
    if (!removeCoins(bet)) {
      setMessage('INSUFFICIENT COINS');
      playSound('hit');
      return;
    }
    const newDeck = initializeDeck();
    const pHand = [newDeck.pop()!, newDeck.pop()!];
    const dHand = [newDeck.pop()!, { ...newDeck.pop()!, hidden: true }];
    setDeck(newDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setGameState('playing');
    setMessage('HIT OR STAND?');
    playSound('shoot');
  };

  const hit = () => {
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setDeck(newDeck);
    playSound('shoot');
    if (calculateScore(newHand) > 21) {
      setGameState('gameOver');
      setMessage('BUST! DEALER WINS');
      playSound('hit');
    }
  };

  const stand = () => {
    setGameState('dealerTurn');
    let dHand = [...dealerHand];
    dHand[1].hidden = false;
    let dScore = calculateScore(dHand);
    playSound('coin');

    const newDeck = [...deck];
    const interval = setInterval(() => {
      if (dScore < 17) {
        const card = newDeck.pop()!;
        dHand.push(card);
        dScore = calculateScore(dHand);
        setDealerHand([...dHand]);
        playSound('shoot');
      } else {
        clearInterval(interval);
        setDeck(newDeck);
        determineWinner(playerHand, dHand);
      }
    }, 600);
  };

  const determineWinner = (pHand: Card[], dHand: Card[]) => {
    const pScore = calculateScore(pHand);
    const dScore = calculateScore(dHand);
    
    if (dScore > 21 || pScore > dScore) {
      setMessage('YOU WIN!');
      addCoins(bet * 2);
      playSound('win');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else if (dScore > pScore) {
      setMessage('DEALER WINS');
      playSound('hit');
    } else {
      setMessage('PUSH - TIE');
      addCoins(bet);
      playSound('coin');
    }
    setGameState('gameOver');
  };

  const resetGame = () => {
    setPlayerHand([]);
    setDealerHand([]);
    setGameState('betting');
    setMessage('PLACE YOUR BETS');
    playSound('coin');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 font-display">
      <div className="w-full max-w-5xl flex justify-between items-center px-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold uppercase tracking-widest text-sm">
          &larr; EXIT FLOOR
        </button>
        <div className="bg-black/80 px-6 py-2 rounded-full border border-yellow-500/30 flex items-center gap-3 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
          <Coins className="text-yellow-400 w-5 h-5" />
          <span className="font-mono text-xl text-yellow-400 font-black">{coins}</span>
        </div>
      </div>

      <div className="relative w-full max-w-5xl aspect-[16/9] bg-[#0a4d2e] rounded-[3rem] border-[12px] border-[#3d2b1f] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col justify-between p-12">
        {/* Table Felt Texture & Markings */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-40 pointer-events-none" />
        <div className="absolute inset-12 border-4 border-white/10 rounded-[2rem] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] border-t-4 border-white/10 rounded-[50%] pointer-events-none" />
        
        {/* Dealer Area */}
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 bg-black/40 px-4 py-1 rounded-full border border-white/10">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="text-white font-black text-xs tracking-widest uppercase">Dealer</span>
            {gameState !== 'betting' && (
              <span className="ml-2 bg-blue-500 text-white px-2 rounded text-sm font-mono">{calculateScore(dealerHand)}</span>
            )}
          </div>
          <div className="flex gap-4 min-h-[144px] perspective-1000">
            <AnimatePresence>
              {dealerHand.map((card, i) => (
                <CardUI key={`dealer-${i}`} card={card} index={i} isDealer />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Center Info */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={message}
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0, y: -20 }}
              className="bg-black/80 backdrop-blur-xl px-10 py-4 rounded-2xl border-2 border-yellow-500/50 text-2xl font-black text-white shadow-[0_0_50px_rgba(0,0,0,0.5)] tracking-widest uppercase"
            >
              {message}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Player Area */}
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="flex gap-4 min-h-[144px] perspective-1000">
            <AnimatePresence>
              {playerHand.map((card, i) => (
                <CardUI key={`player-${i}`} card={card} index={i} />
              ))}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-2 bg-black/40 px-4 py-1 rounded-full border border-white/10">
            <User className="w-4 h-4 text-green-400" />
            <span className="text-white font-black text-xs tracking-widest uppercase">Player</span>
            {gameState !== 'betting' && (
              <span className="ml-2 bg-green-500 text-white px-2 rounded text-sm font-mono">{calculateScore(playerHand)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-6">
        {gameState === 'betting' && (
          <div className="flex gap-4 bg-black/40 p-3 rounded-3xl border border-white/10">
            <div className="flex gap-2 mr-4 border-r border-white/10 pr-4">
              {[10, 50, 100, 500].map(amount => (
                <button
                  key={amount}
                  onClick={() => {
                    setBet(amount);
                    playSound('coin');
                  }}
                  className={`px-6 py-3 rounded-xl font-black text-lg transition-all border-2 ${bet === amount ? 'bg-yellow-500 border-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-zinc-800 border-zinc-700 text-gray-400 hover:bg-zinc-700'}`}
                >
                  ${amount}
                </button>
              ))}
            </div>
            <button
              onClick={dealInitialCards}
              className="px-10 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-black text-xl shadow-xl shadow-green-600/30 transition-all border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
            >
              DEAL
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="flex gap-4">
            <button
              onClick={hit}
              className="px-12 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-black text-xl shadow-xl shadow-blue-600/30 transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
            >
              HIT
            </button>
            <button
              onClick={stand}
              className="px-12 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl font-black text-xl shadow-xl shadow-red-600/30 transition-all border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
            >
              STAND
            </button>
          </div>
        )}

        {gameState === 'gameOver' && (
          <button
            onClick={resetGame}
            className="px-12 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black rounded-xl font-black text-xl shadow-xl shadow-yellow-500/30 transition-all border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 flex items-center gap-3"
          >
            <RefreshCw className="w-6 h-6" />
            PLAY AGAIN
          </button>
        )}
      </div>
    </div>
  );
};
