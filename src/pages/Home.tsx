import React from 'react';
import { motion } from 'motion/react';
import { Gamepad2, Dice5 } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] gap-16">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center space-y-6 liquid-glass p-12 rounded-[3rem] w-full max-w-4xl relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl" />
        
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-orange-400 tracking-widest font-jp drop-shadow-lg relative z-10">
          夢のカジノ
        </h1>
        <p className="text-2xl md:text-4xl text-gray-300 font-light tracking-[0.5em] uppercase font-display relative z-10">
          Dream Casino
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl">
        {/* Casino Card */}
        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('casino')}
          className="group relative h-80 rounded-[2.5rem] neu-dark overflow-hidden flex flex-col items-center justify-center p-8 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="w-24 h-24 rounded-full neu-dark-pressed flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
            <Dice5 className="w-12 h-12 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
          </div>
          
          <h2 className="text-4xl font-black text-gray-100 mb-3 tracking-widest font-jp group-hover:text-red-400 transition-colors">
            カジノ
          </h2>
          <p className="text-gray-500 tracking-widest uppercase text-sm font-display font-bold">
            Casino Zone
          </p>
        </motion.button>

        {/* Arcade Card */}
        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('arcade')}
          className="group relative h-80 rounded-[2.5rem] neu-dark overflow-hidden flex flex-col items-center justify-center p-8 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="w-24 h-24 rounded-full neu-dark-pressed flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
            <Gamepad2 className="w-12 h-12 text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          </div>
          
          <h2 className="text-4xl font-black text-gray-100 mb-3 tracking-widest font-jp group-hover:text-blue-400 transition-colors">
            アーケード
          </h2>
          <p className="text-gray-500 tracking-widest uppercase text-sm font-display font-bold">
            Arcade Zone
          </p>
        </motion.button>
      </div>
    </div>
  );
};
