import React from 'react';
import { motion } from 'motion/react';
import { Coins, Club, Diamond, Spade, Heart, CircleDot, Dices, Target, Star, Gem, Crown, Zap, Dog } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface CasinoProps {
  onSelectGame: (game: string) => void;
}

interface Game {
  id: string;
  name: string;
  jpName: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

export const Casino: React.FC<CasinoProps> = ({ onSelectGame }) => {
  const { coins } = useGame();

  const games: Game[] = [
    {
      id: 'slots',
      name: 'Slots',
      jpName: 'スロット',
      description: 'Classic 3-reel slots. Hit the jackpot!',
      icon: <Coins className="w-10 h-10 text-yellow-500" />,
    },
    {
      id: 'blackjack',
      name: 'Blackjack',
      jpName: 'ブラックジャック',
      description: 'Beat the dealer. Aim for 21.',
      icon: <Spade className="w-10 h-10 text-gray-300" />,
    },
    {
      id: 'pachinko',
      name: 'Pachinko',
      jpName: 'パチンコ',
      description: 'Traditional Japanese pinball game.',
      icon: <CircleDot className="w-10 h-10 text-pink-500" />,
    },
    {
      id: 'roulette',
      name: 'Roulette',
      jpName: 'ルーレット',
      description: 'The wheel of destiny. Red or black?',
      icon: <Diamond className="w-10 h-10 text-red-500" />,
    },
    {
      id: 'poker',
      name: 'Poker',
      jpName: 'ポーカー',
      description: 'Strategy and luck. Make the best hand.',
      icon: <Club className="w-10 h-10 text-blue-500" />,
    },
    {
      id: 'baccarat',
      name: 'Baccarat',
      jpName: 'バカラ',
      description: 'Player or Banker. The ultimate choice.',
      icon: <Crown className="w-10 h-10 text-yellow-600" />,
    },
    {
      id: 'craps',
      name: 'Craps',
      jpName: 'クラップス',
      description: 'Trust the roll of the dice.',
      icon: <Dices className="w-10 h-10 text-gray-200" />,
    },
    {
      id: 'sicbo',
      name: 'Sic Bo',
      jpName: '大小',
      description: 'Ancient Asian dice game with 3 dice.',
      icon: <Dices className="w-10 h-10 text-red-400" />,
    },
    {
      id: 'keno',
      name: 'Keno',
      jpName: 'キノ',
      description: 'Pick your numbers and win big.',
      icon: <Target className="w-10 h-10 text-green-500" />,
    },
    {
      id: 'videopoker',
      name: 'Video Poker',
      jpName: 'ビデオポーカー',
      description: 'Poker vs the machine. Get a Royal Flush!',
      icon: <Heart className="w-10 h-10 text-red-500" />,
    },
    {
      id: 'bingo',
      name: 'Bingo',
      jpName: 'ビンゴ',
      description: 'Classic bingo fun.',
      icon: <CircleDot className="w-10 h-10 text-blue-400" />,
    },
    {
      id: 'plinko',
      name: 'Plinko',
      jpName: 'プリンコ',
      description: 'Drop the ball and watch it bounce.',
      icon: <Star className="w-10 h-10 text-yellow-400" />,
    },
    {
      id: 'mines',
      name: 'Mines',
      jpName: 'マインズ',
      description: 'Avoid the mines, find the gems.',
      icon: <Gem className="w-10 h-10 text-cyan-400" />,
    },
    {
      id: 'wheel',
      name: 'Wheel of Fortune',
      jpName: 'ルーレット盤',
      description: 'Spin the wheel for massive prizes.',
      icon: <Zap className="w-10 h-10 text-purple-500" />,
    },
    {
      id: 'dragon-tiger',
      name: 'Dragon Tiger',
      jpName: '龍虎',
      description: 'Simple high-card game. Dragon or Tiger?',
      icon: <Zap className="w-10 h-10 text-orange-500" />,
    },
    {
      id: 'red-dog',
      name: 'Red Dog',
      jpName: 'レッドドッグ',
      description: 'Bet on the spread between two cards.',
      icon: <Dog className="w-10 h-10 text-orange-300" />,
    }
  ];

  return (
    <div className="space-y-12">
      <div className="liquid-glass p-10 rounded-[2.5rem] text-center relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/20 rounded-full blur-3xl" />
        <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400 tracking-widest font-jp relative z-10 mb-4">
          カジノフロア
        </h2>
        <p className="text-gray-400 tracking-[0.3em] uppercase font-display font-bold relative z-10">Casino Floor</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {games.map((game) => (
          <motion.button
            key={game.id}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => !game.disabled && onSelectGame(game.id)}
            disabled={game.disabled}
            className={`neu-dark p-8 text-left flex flex-col gap-6 group ${game.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div className="w-20 h-20 rounded-2xl neu-dark-pressed flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                {game.icon}
              </div>
              {game.disabled && (
                <span className="text-xs font-bold bg-[#121212] px-3 py-1.5 rounded-full text-gray-500 border border-white/5 shadow-inner">
                  準備中
                </span>
              )}
            </div>

            <div>
              <h3 className="text-2xl font-black text-gray-100 font-jp tracking-wider mb-1 group-hover:text-red-400 transition-colors">
                {game.jpName}
              </h3>
              <p className="text-gray-500 text-sm font-display font-bold tracking-widest uppercase mb-4">
                {game.name}
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                {game.description}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
