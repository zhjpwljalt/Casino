import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Coins, RefreshCw, Trophy } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore, getHighScores } from '../lib/highscore';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };

export const Snake: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { addCoins, difficulty } = useGame();
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const speed = difficulty === 'easy' ? 200 : difficulty === 'medium' ? 150 : 100;

  useEffect(() => {
    if (gameOver) {
      playSound('gameover');
      addHighScore('snake', { name: 'Player', score });
    }
  }, [gameOver, score]);

  const generateFood = () => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  };

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(generateFood());
    setGameOver(false);
    setScore(0);
    setIsPlaying(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (direction.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          if (direction.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          if (direction.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          if (direction.x !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const moveSnake = (time: number) => {
      if (time - lastTimeRef.current < speed) {
        requestRef.current = requestAnimationFrame(moveSnake);
        return;
      }
      lastTimeRef.current = time;

      setSnake(prevSnake => {
        const newHead = {
          x: prevSnake[0].x + direction.x,
          y: prevSnake[0].y + direction.y,
        };

        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          setGameOver(true);
          setIsPlaying(false);
          return prevSnake;
        }

        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          setIsPlaying(false);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        if (newHead.x === food.x && newHead.y === food.y) {
          playSound('coin');
          setScore(prev => prev + 10);
          addCoins(5);
          setFood(generateFood());
        } else {
          newSnake.pop();
        }

        return newSnake;
      });

      requestRef.current = requestAnimationFrame(moveSnake);
    };

    requestRef.current = requestAnimationFrame(moveSnake);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [isPlaying, gameOver, direction, food, addCoins, speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(canvas.width, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw food with glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw snake with gradients
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      const gradient = ctx.createRadialGradient(
        segment.x * CELL_SIZE + CELL_SIZE / 2,
        segment.y * CELL_SIZE + CELL_SIZE / 2,
        2,
        segment.x * CELL_SIZE + CELL_SIZE / 2,
        segment.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2
      );
      
      if (isHead) {
        gradient.addColorStop(0, '#4ade80');
        gradient.addColorStop(1, '#166534');
      } else {
        gradient.addColorStop(0, '#22c55e');
        gradient.addColorStop(1, '#14532d');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      const radius = isHead ? 6 : 4;
      ctx.roundRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2,
        radius
      );
      ctx.fill();

      if (isHead) {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(segment.x * CELL_SIZE + 6, segment.y * CELL_SIZE + 6, 2, 0, Math.PI * 2);
        ctx.arc(segment.x * CELL_SIZE + 14, segment.y * CELL_SIZE + 6, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

  }, [snake, food]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
      <div className="w-full max-w-md flex justify-between items-center">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          &larr; Back
        </button>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Trophy className="text-yellow-400 w-4 h-4" />
                <span className="font-mono text-white">{score}</span>
            </div>
        </div>
      </div>

      <div className="relative p-4 bg-slate-900 rounded-3xl border-8 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          className="bg-black rounded-xl shadow-inner max-w-full h-auto"
        />
        
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
            <button
              onClick={resetGame}
              className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-full font-bold text-lg shadow-lg shadow-green-600/50 transition-all"
            >
              START
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl gap-4">
            <h3 className="text-4xl font-black text-red-500 tracking-tighter">GAME OVER</h3>
            <p className="text-white text-xl font-mono">Score: {score}</p>
            <button
              onClick={resetGame}
              className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full font-bold text-lg shadow-lg shadow-yellow-500/50 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              TRY AGAIN
            </button>
          </div>
        )}
      </div>

      <p className="text-gray-500 text-sm hidden md:block font-mono uppercase tracking-widest">
        Use arrow keys to move
      </p>
    </div>
  );
};
