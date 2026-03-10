import React, { useState, useEffect } from 'react';
import { GameProvider } from './context/GameContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Casino } from './pages/Casino';
import { Arcade } from './pages/Arcade';
import { Slots } from './games/Slots';
import { Blackjack } from './games/Blackjack';
import { Snake } from './games/Snake';
import { Breakout } from './games/Breakout';
import { Invaders } from './games/Invaders';
import { Pacman } from './games/Pacman';
import { Tetris } from './games/Tetris';
import { Pong } from './games/Pong';
import { Asteroids } from './games/Asteroids';
import { Frogger } from './games/Frogger';
import { DonkeyKong } from './games/DonkeyKong';
import { Galaga } from './games/Galaga';
import { DigDug } from './games/DigDug';
import { Centipede } from './games/Centipede';
import { Zelda } from './games/Zelda';
import { Mario } from './games/Mario';
import { Racer } from './games/Racer';
import { RPG } from './games/RPG';
import { Pachinko } from './games/Pachinko';
import { Roulette } from './games/Roulette';
import { Poker } from './games/Poker';
import { Baccarat } from './games/Baccarat';
import { Craps } from './games/Craps';
import { SicBo } from './games/SicBo';
import { Keno } from './games/Keno';
import { Plinko } from './games/Plinko';
import { Mines } from './games/Mines';
import { Wheel } from './games/Wheel';
import { Bingo } from './games/Bingo';
import { DragonTiger } from './games/DragonTiger';
import { RedDog } from './games/RedDog';
import { MobileControls } from './components/MobileControls';
import { playMusic, stopMusic } from './lib/audio';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGame) {
      playMusic('gameplay');
    } else if (currentPage === 'casino') {
      playMusic('casino');
    } else if (currentPage === 'arcade') {
      playMusic('arcade');
    } else {
      playMusic('menu');
    }
  }, [currentPage, selectedGame]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedGame(null);
  };

  const handleSelectGame = (game: string) => {
    setSelectedGame(game);
  };

  const handleBackToMenu = () => {
    setSelectedGame(null);
  };

  const renderContent = () => {
    if (selectedGame) {
      switch (selectedGame) {
        case 'slots':
          return <Slots onBack={handleBackToMenu} />;
        case 'blackjack':
          return <Blackjack onBack={handleBackToMenu} />;
        case 'snake':
          return <Snake onBack={handleBackToMenu} />;
        case 'breakout':
          return <Breakout onBack={handleBackToMenu} />;
        case 'invaders':
          return <Invaders onBack={handleBackToMenu} />;
        case 'pacman':
          return <Pacman onBack={handleBackToMenu} />;
        case 'tetris':
          return <Tetris onBack={handleBackToMenu} />;
        case 'pong':
          return <Pong onBack={handleBackToMenu} />;
        case 'asteroids':
          return <Asteroids onBack={handleBackToMenu} />;
        case 'frogger':
          return <Frogger onBack={handleBackToMenu} />;
        case 'donkey':
          return <DonkeyKong onBack={handleBackToMenu} />;
        case 'galaga':
          return <Galaga onBack={handleBackToMenu} />;
        case 'digdug':
          return <DigDug onBack={handleBackToMenu} />;
        case 'centipede':
          return <Centipede onBack={handleBackToMenu} />; 
        case 'zelda':
          return <Zelda onBack={handleBackToMenu} />;
        case 'mario':
          return <Mario onBack={handleBackToMenu} />;
        case 'racer':
          return <Racer onBack={handleBackToMenu} />;
        case 'rpg':
          return <RPG onBack={handleBackToMenu} />;
        case 'pachinko':
          return <Pachinko onBack={handleBackToMenu} />;
        case 'roulette':
          return <Roulette onBack={handleBackToMenu} />;
        case 'poker':
          return <Poker onBack={handleBackToMenu} />;
        case 'baccarat':
          return <Baccarat onBack={handleBackToMenu} />;
        case 'craps':
          return <Craps onBack={handleBackToMenu} />;
        case 'sicbo':
          return <SicBo onBack={handleBackToMenu} />;
        case 'keno':
          return <Keno onBack={handleBackToMenu} />;
        case 'plinko':
          return <Plinko onBack={handleBackToMenu} />;
        case 'mines':
          return <Mines onBack={handleBackToMenu} />;
        case 'wheel':
          return <Wheel onBack={handleBackToMenu} />;
        case 'bingo':
          return <Bingo onBack={handleBackToMenu} />;
        case 'dragon-tiger':
          return <DragonTiger onBack={handleBackToMenu} />;
        case 'red-dog':
          return <RedDog onBack={handleBackToMenu} />;
        default:
          return <div className="text-white">Game not found</div>;
      }
    }

    switch (currentPage) {
      case 'home':
        return <Home onNavigate={handleNavigate} />;
      case 'casino':
        return <Casino onSelectGame={handleSelectGame} />;
      case 'arcade':
        return <Arcade onSelectGame={handleSelectGame} />;
      default:
        return <Home onNavigate={handleNavigate} />;
    }
  };

  return (
    <GameProvider>
      <Layout onNavigate={handleNavigate} currentPage={currentPage}>
        {renderContent()}
        {selectedGame && <MobileControls />}
      </Layout>
    </GameProvider>
  );
}
