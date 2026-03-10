import React from 'react';
import { motion } from 'motion/react';
import { Gamepad2, Ghost, Rocket, Trophy, Zap, Star, Heart, Skull, Target, Sword, Shield, Crown, Flag, Map, Box } from 'lucide-react';
import { getHighScores } from '../lib/highscore';
import { useGame } from '../context/GameContext';

interface Game {
  id: string;
  name: string;
  jpName: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface ArcadeProps {
  onSelectGame: (game: string) => void;
}

export const Arcade: React.FC<ArcadeProps> = ({ onSelectGame }) => {
  const { difficulty, setDifficulty } = useGame();

  const games: Game[] = [
    { id: 'snake', name: 'Snake', jpName: 'スネーク', icon: <Ghost className="w-8 h-8 text-green-500" /> },
    { id: 'breakout', name: 'Breakout', jpName: 'ブロック崩し', icon: <Box className="w-8 h-8 text-blue-500" /> },
    { id: 'invaders', name: 'Invaders', jpName: 'インベーダー', icon: <Rocket className="w-8 h-8 text-red-500" /> },
    { id: 'pacman', name: 'Pac-Man', jpName: 'パックマン', icon: <Zap className="w-8 h-8 text-yellow-500" /> },
    { id: 'tetris', name: 'Tetris', jpName: 'テトリス', icon: <Box className="w-8 h-8 text-purple-500" /> },
    { id: 'pong', name: 'Pong', jpName: 'ポン', icon: <Trophy className="w-8 h-8 text-gray-300" /> },
    { id: 'asteroids', name: 'Asteroids', jpName: 'アステロイド', icon: <Star className="w-8 h-8 text-cyan-500" /> },
    { id: 'frogger', name: 'Frogger', jpName: 'フロッガー', icon: <Target className="w-8 h-8 text-green-600" /> },
    { id: 'donkey', name: 'Kong', jpName: 'コング', icon: <Skull className="w-8 h-8 text-orange-500" /> },
    { id: 'galaga', name: 'Galaga', jpName: 'ギャラガ', icon: <Rocket className="w-8 h-8 text-pink-500" /> },
    { id: 'digdug', name: 'Dig Dug', jpName: 'ディグダグ', icon: <Target className="w-8 h-8 text-yellow-600" /> },
    { id: 'centipede', name: 'Centipede', jpName: 'センチピード', icon: <Ghost className="w-8 h-8 text-lime-500" /> },
    { id: 'zelda', name: 'Quest', jpName: 'クエスト', icon: <Sword className="w-8 h-8 text-green-400" /> },
    { id: 'mario', name: 'Plumber', jpName: '配管工', icon: <Crown className="w-8 h-8 text-red-600" /> },
    { id: 'racer', name: 'Racer', jpName: 'レーサー', icon: <Flag className="w-8 h-8 text-blue-600" /> },
    { id: 'rpg', name: 'RPG', jpName: 'RPG', icon: <Map className="w-8 h-8 text-purple-600" /> },
  ];

  return (
    <div className="space-y-12">
      <div className="liquid-glass p-10 rounded-[2.5rem] text-center relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
        <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 tracking-widest font-jp relative z-10 mb-4">
          アーケード
        </h2>
        <p className="text-gray-400 tracking-[0.3em] uppercase font-display font-bold relative z-10 mb-8">Arcade Zone</p>
        
        <div className="flex justify-center gap-4 relative z-10">
          {(['easy', 'medium', 'hard'] as const).map((diff) => (
            <button
              key={diff}
              onClick={() => setDifficulty(diff)}
              className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                difficulty === diff 
                  ? 'neu-dark-pressed text-blue-400' 
                  : 'neu-button text-gray-500 hover:text-gray-300'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {games.map((game) => {
          const scores = getHighScores(game.id);
          return (
            <motion.button
              key={game.id}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => !game.disabled && onSelectGame(game.id)}
              disabled={game.disabled}
              className={`neu-dark p-6 flex flex-col items-center justify-between aspect-[3/4] group ${game.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="w-20 h-20 rounded-2xl neu-dark-pressed flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                {game.icon}
              </div>

              <div className="text-center w-full space-y-1 mb-6">
                <h3 className="font-black text-xl text-gray-100 font-jp tracking-widest group-hover:text-blue-400 transition-colors">
                  {game.jpName}
                </h3>
                <p className="text-gray-500 font-display font-bold uppercase tracking-widest text-xs">
                  {game.name}
                </p>
              </div>
              
              <div className="w-full neu-dark-pressed rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-2">
                  <span>Top Score</span>
                  <Trophy className="w-3 h-3" />
                </div>
                {scores.slice(0, 3).map((s, idx) => (
                  <div key={idx} className="flex justify-between text-xs font-mono text-gray-400">
                    <span>{s.name}</span>
                    <span className="text-gray-200">{s.score}</span>
                  </div>
                ))}
                {scores.length === 0 && (
                  <div className="text-xs font-mono text-gray-600 text-center py-2">No scores yet</div>
                )}
              </div>

              {game.disabled && (
                <div className="absolute inset-0 flex items-center justify-center liquid-glass rounded-2xl z-20">
                  <span className="text-sm font-black text-gray-400 px-6 py-3 rounded-xl neu-dark-pressed tracking-widest font-jp">
                    準備中
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
