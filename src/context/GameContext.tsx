import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Difficulty = 'easy' | 'medium' | 'hard';

interface GameContextType {
  coins: number;
  addCoins: (amount: number) => void;
  removeCoins: (amount: number) => boolean;
  resetCoins: () => void;
  difficulty: Difficulty;
  setDifficulty: (diff: Difficulty) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem('dream_casino_coins');
    return saved ? parseInt(saved, 10) : 1000;
  });
  const coinsRef = React.useRef(coins);

  const [difficulty, setDifficultyState] = useState<Difficulty>(() => {
    return (localStorage.getItem('dream_casino_difficulty') as Difficulty) || 'medium';
  });

  useEffect(() => {
    coinsRef.current = coins;
    localStorage.setItem('dream_casino_coins', coins.toString());
  }, [coins]);

  const setDifficulty = useCallback((diff: Difficulty) => {
    setDifficultyState(diff);
    localStorage.setItem('dream_casino_difficulty', diff);
  }, []);

  const addCoins = useCallback((amount: number) => {
    setCoins(prev => prev + amount);
  }, []);

  const removeCoins = useCallback((amount: number) => {
    if (coinsRef.current >= amount) {
      setCoins(prev => prev - amount);
      return true;
    }
    return false;
  }, []);

  const resetCoins = useCallback(() => {
    setCoins(1000);
  }, []);

  return (
    <GameContext.Provider value={{ coins, addCoins, removeCoins, resetCoins, difficulty, setDifficulty }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
