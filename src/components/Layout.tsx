import React from 'react';
import { useGame } from '../context/GameContext';
import { Coins, Menu, X, RotateCcw, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, onNavigate, currentPage }) => {
  const { coins, resetCoins } = useGame();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ coins, date: new Date().toISOString() }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "dream_casino_save.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const navItems = [
    { id: 'home', label: 'ホーム' }, // Home
    { id: 'casino', label: 'カジノ' }, // Casino
    { id: 'arcade', label: 'アーケード' }, // Arcade
  ];

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 font-sans overflow-hidden relative selection:bg-red-500/30 selection:text-white japanese-pattern">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-[#121212]/80 to-[#121212] pointer-events-none z-0" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 liquid-glass h-20 flex items-center justify-between px-6 md:px-10 rounded-b-3xl mx-2 md:mx-8 mt-2">
        <div 
          className="flex items-center gap-4 cursor-pointer group"
          onClick={() => onNavigate('home')}
        >
          <div className="w-10 h-10 rounded-xl neu-dark flex items-center justify-center group-hover:neu-dark-pressed transition-all">
            <span className="text-red-500 font-black text-xl font-jp">夢</span>
          </div>
          <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400 hidden sm:block font-display">
            DREAM CASINO
          </h1>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3 neu-dark px-5 py-2.5 rounded-full">
            <Coins className="w-5 h-5 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
            <span className="font-mono font-bold text-yellow-500 tabular-nums text-lg">
              {coins.toLocaleString()}
            </span>
          </div>
          
          <button 
            onClick={resetCoins}
            title="Reset Coins"
            className="neu-button p-3 text-gray-400 hover:text-red-400"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button 
            onClick={handleExport}
            title="Export Save"
            className="neu-button p-3 text-gray-400 hover:text-red-400"
          >
            <Download className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="neu-button p-3 md:hidden text-gray-400 hover:text-red-400"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <nav className="hidden md:flex gap-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "px-6 py-2.5 rounded-xl font-bold tracking-widest transition-all font-jp",
                  currentPage === item.id 
                    ? "neu-dark-pressed text-red-500" 
                    : "neu-button text-gray-400 hover:text-gray-200"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 liquid-glass pt-32 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={cn(
                    "p-6 rounded-2xl text-xl font-black text-left transition-all font-jp tracking-widest",
                    currentPage === item.id 
                      ? "neu-dark-pressed text-red-500" 
                      : "neu-button text-gray-400"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-32 pb-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
