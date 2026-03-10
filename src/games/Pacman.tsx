import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';
import { MobileControls } from '../components/MobileControls';

const CANVAS_WIDTH = 448;
const CANVAS_HEIGHT = 576;
const CELL_SIZE = 16;

// Game assets and map
const map = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 3, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 3, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 2, 2, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 3, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 3, 1],
  [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const GHOST_COLORS = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb851'];

interface Position { x: number; y: number; }
interface Character extends Position { velocity: Position; }
interface Ghost extends Character { color: string; isScared: boolean; }

export const Pacman: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { addCoins, difficulty } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pacman, setPacman] = useState<Character>({ x: 14, y: 23, velocity: { x: 0, y: 0 } });
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [pellets, setPellets] = useState<Position[]>([]);
  const [powerPellets, setPowerPellets] = useState<Position[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const ghostSpeedMultiplier = difficulty === 'easy' ? 0.5 : difficulty === 'medium' ? 1 : 1.5;

  useEffect(() => {
    if (gameOver || gameWon) {
      if (gameOver) playSound('gameover');
      if (gameWon) playSound('win');
      addHighScore('pacman', { name: 'Player', score });
    }
  }, [gameOver, gameWon, score]);

  const initializeGame = () => {
    const newPellets: Position[] = [];
    const newPowerPellets: Position[] = [];
    map.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 0) newPellets.push({ x, y });
        if (cell === 3) newPowerPellets.push({ x, y });
      });
    });
    setPellets(newPellets);
    setPowerPellets(newPowerPellets);

    setGhosts([
      { x: 14, y: 11, velocity: { x: 0, y: -1 }, color: GHOST_COLORS[0], isScared: false },
      { x: 12, y: 14, velocity: { x: -1, y: 0 }, color: GHOST_COLORS[1], isScared: false },
      { x: 14, y: 14, velocity: { x: 1, y: 0 }, color: GHOST_COLORS[2], isScared: false },
      { x: 16, y: 14, velocity: { x: 0, y: 1 }, color: GHOST_COLORS[3], isScared: false },
    ]);
  };

  const resetGame = () => {
    initializeGame();
    setScore(0);
    setLives(3);
    setPacman({ x: 14, y: 23, velocity: { x: 0, y: 0 } });
    setGameOver(false);
    setGameWon(false);
    setIsPlaying(true);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': setPacman(p => ({ ...p, velocity: { x: 0, y: -1 } })); break;
        case 'ArrowDown': setPacman(p => ({ ...p, velocity: { x: 0, y: 1 } })); break;
        case 'ArrowLeft': setPacman(p => ({ ...p, velocity: { x: -1, y: 0 } })); break;
        case 'ArrowRight': setPacman(p => ({ ...p, velocity: { x: 1, y: 0 } })); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver || gameWon) return;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawMap(ctx);
      drawPellets(ctx);
      drawPowerPellets(ctx);

      // Pacman logic
      updatePacman();
      drawPacman(ctx);

      // Ghost logic
      updateGhosts();
      drawGhosts(ctx);

      checkCollisions();

      if (pellets.length === 0 && powerPellets.length === 0) {
          setGameWon(true);
          setIsPlaying(false);
          addCoins(500);
      }
    };

    const interval = setInterval(gameLoop, 1000 / 60);
    return () => clearInterval(interval);
  }, [isPlaying, gameOver, gameWon, pacman, ghosts, pellets, powerPellets]);

  const drawMap = (ctx: CanvasRenderingContext2D) => {
    map.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 1) {
          const gradient = ctx.createLinearGradient(x * CELL_SIZE, y * CELL_SIZE, (x + 1) * CELL_SIZE, (y + 1) * CELL_SIZE);
          gradient.addColorStop(0, '#1e40af');
          gradient.addColorStop(1, '#1e3a8a');
          ctx.fillStyle = gradient;
          ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      });
    });
  };

  const drawPellets = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#fde047';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#fde047';
    pellets.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x * CELL_SIZE + CELL_SIZE / 2, p.y * CELL_SIZE + CELL_SIZE / 2, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  };

  const drawPowerPellets = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#fde047';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fde047';
    powerPellets.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x * CELL_SIZE + CELL_SIZE / 2, p.y * CELL_SIZE + CELL_SIZE / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    ctx.shadowBlur = 0;
  }

  const drawPacman = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#facc15';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#facc15';
    ctx.beginPath();
    const mouthOpen = Math.sin(Date.now() / 100) * 0.2 + 0.2;
    ctx.arc(pacman.x * CELL_SIZE + CELL_SIZE / 2, pacman.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2, mouthOpen * Math.PI, (2 - mouthOpen) * Math.PI);
    ctx.lineTo(pacman.x * CELL_SIZE + CELL_SIZE / 2, pacman.y * CELL_SIZE + CELL_SIZE / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const drawGhosts = (ctx: CanvasRenderingContext2D) => {
    ghosts.forEach(g => {
      ctx.fillStyle = g.isScared ? '#60a5fa' : g.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = g.isScared ? '#60a5fa' : g.color;
      ctx.beginPath();
      ctx.arc(g.x * CELL_SIZE + CELL_SIZE / 2, g.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2, Math.PI, 0);
      ctx.lineTo(g.x * CELL_SIZE + CELL_SIZE, g.y * CELL_SIZE + CELL_SIZE);
      ctx.lineTo(g.x * CELL_SIZE, g.y * CELL_SIZE + CELL_SIZE);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  };

  const updatePacman = () => {
    const nextX = pacman.x + pacman.velocity.x;
    const nextY = pacman.y + pacman.velocity.y;
    if (map[nextY] && map[nextY][nextX] !== 1) {
      setPacman(p => ({ ...p, x: nextX, y: nextY }));
    }
  };

  const updateGhosts = () => {
    setGhosts(prevGhosts => prevGhosts.map(g => {
        const nextX = g.x + g.velocity.x;
        const nextY = g.y + g.velocity.y;
        if (map[nextY] && map[nextY][nextX] !== 1 && Math.random() > 0.99) {
            return { ...g, x: nextX, y: nextY };
        } else if (map[nextY] === undefined || map[nextY][nextX] === 1 || Math.random() < 0.1) {
            const directions = [{x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}];
            const newVel = directions[Math.floor(Math.random() * directions.length)];
            return { ...g, velocity: newVel };
        }
        return g;
    }));
  };

  const checkCollisions = () => {
    // Pellets
    const newPellets = pellets.filter(p => {
        if (p.x === pacman.x && p.y === pacman.y) {
            playSound('coin');
            setScore(s => s + 10);
            addCoins(1);
            return false;
        }
        return true;
    });
    setPellets(newPellets);

    // Power Pellets
    const newPowerPellets = powerPellets.filter(p => {
        if (p.x === pacman.x && p.y === pacman.y) {
            playSound('coin');
            setScore(s => s + 50);
            addCoins(5);
            setGhosts(gs => gs.map(g => ({ ...g, isScared: true })));
            setTimeout(() => setGhosts(gs => gs.map(g => ({ ...g, isScared: false }))), 5000);
            return false;
        }
        return true;
    });
    setPowerPellets(newPowerPellets);

    // Ghosts
    ghosts.forEach((g, index) => {
        if (g.x === pacman.x && g.y === pacman.y) {
            if (g.isScared) {
                setScore(s => s + 200);
                addCoins(20);
                setGhosts(gs => gs.map((ghost, i) => i === index ? { ...ghost, x: 14, y: 11 } : ghost));
            } else {
                setLives(l => l - 1);
                if (lives - 1 <= 0) {
                    setGameOver(true);
                    setIsPlaying(false);
                } else {
                    setPacman({ x: 14, y: 23, velocity: { x: 0, y: 0 } });
                }
            }
        }
    });
  };

  const handleMobileControl = (action: string) => {
    if (!isPlaying || gameOver || gameWon) return;
    switch (action) {
      case 'up': setPacman(p => ({ ...p, velocity: { x: 0, y: -1 } })); break;
      case 'down': setPacman(p => ({ ...p, velocity: { x: 0, y: 1 } })); break;
      case 'left': setPacman(p => ({ ...p, velocity: { x: -1, y: 0 } })); break;
      case 'right': setPacman(p => ({ ...p, velocity: { x: 1, y: 0 } })); break;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <div className="w-full max-w-lg flex justify-between items-center px-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          &larr; Back
        </button>
        <div className="text-white font-mono flex gap-4">
          <span>SCORE: {score}</span>
          <span>LIVES: {lives}</span>
        </div>
      </div>
      <div className="relative p-4 bg-slate-900 rounded-3xl border-8 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-black rounded-xl" />
        {!isPlaying && !gameOver && !gameWon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
            <button onClick={resetGame} className="px-12 py-4 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full font-black text-2xl shadow-lg shadow-yellow-500/50 transition-all">
              START
            </button>
          </div>
        )}
        {(gameOver || gameWon) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl gap-6">
            <h3 className={`text-5xl font-black tracking-tighter ${gameWon ? 'text-green-400' : 'text-red-500'}`}>
              {gameWon ? 'VICTORY!' : 'GAME OVER'}
            </h3>
            <p className="text-white text-2xl font-mono">Score: {score}</p>
            <button onClick={resetGame} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full font-bold text-lg shadow-lg shadow-yellow-500/50 transition-all flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              TRY AGAIN
            </button>
          </div>
        )}
      </div>
      <div className="md:hidden w-full max-w-sm mt-4">
        <MobileControls onAction={handleMobileControl} />
      </div>
      <p className="text-gray-500 text-sm font-mono uppercase tracking-widest hidden md:block">Use arrow keys to move</p>
    </div>
  );
};
