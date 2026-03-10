import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';
import { MobileControls } from '../components/MobileControls';

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 320;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 8;

// Brick constants
const BRICK_ROW_COUNT = 5;
const BRICK_COLUMN_COUNT = 9;
const BRICK_WIDTH = 40;
const BRICK_HEIGHT = 15;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 40;
const BRICK_OFFSET_LEFT = 20;

interface Brick {
  x: number;
  y: number;
  status: number;
  color: string;
}

export const Breakout: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { addCoins, difficulty } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const getInitialSpeed = () => {
    switch (difficulty) {
      case 'hard': return { dx: 4, dy: -4 };
      case 'easy': return { dx: 2, dy: -2 };
      case 'medium':
      default: return { dx: 3, dy: -3 };
    }
  };

  const stateRef = useRef({
    paddleX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 30 },
    ballSpeed: { dx: 2, dy: -2 },
    bricks: [] as Brick[][],
    score: 0,
    lives: 3,
    gameOver: false,
    gameWon: false,
    isPlaying: false,
    keys: { left: false, right: false },
  });

  const initializeBricks = () => {
    const newBricks: Brick[][] = [];
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9']; // Tailwind red, orange, yellow, green, sky
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
      newBricks[c] = [];
      for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        const brickX = c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT;
        const brickY = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;
        newBricks[c][r] = { x: brickX, y: brickY, status: 1, color: colors[r] };
      }
    }
    stateRef.current.bricks = newBricks;
  };

  const resetGame = () => {
    const settings = getInitialSpeed();
    stateRef.current.paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    stateRef.current.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 30 };
    stateRef.current.ballSpeed = settings;
    stateRef.current.score = 0;
    stateRef.current.lives = difficulty === 'hard' ? 2 : difficulty === 'easy' ? 5 : 3;
    stateRef.current.gameOver = false;
    stateRef.current.gameWon = false;
    stateRef.current.isPlaying = true;
    initializeBricks();

    setScore(0);
    setLives(stateRef.current.lives);
    setGameOver(false);
    setGameWon(false);
  };

  useEffect(() => {
    resetGame();
  }, [difficulty]);

  useEffect(() => {
    if (stateRef.current.gameOver || stateRef.current.gameWon) {
      if (stateRef.current.gameOver) playSound(100, 'sawtooth', 0.5); // Game over sound
      if (stateRef.current.gameWon) playSound(800, 'square', 0.5); // Win sound
      addHighScore('breakout', stateRef.current.score);
    }
  }, [gameOver, gameWon]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') stateRef.current.keys.left = true;
      if (e.key === 'ArrowRight') stateRef.current.keys.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') stateRef.current.keys.left = false;
      if (e.key === 'ArrowRight') stateRef.current.keys.right = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;

    const draw = (ctx: CanvasRenderingContext2D) => {
      // Background with gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGradient.addColorStop(0, '#0f172a'); // slate-900
      bgGradient.addColorStop(1, '#1e293b'); // slate-800
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawBricks(ctx);
      drawBall(ctx);
      drawPaddle(ctx);
    };

    const drawBricks = (ctx: CanvasRenderingContext2D) => {
      stateRef.current.bricks.forEach(column => {
        column.forEach(brick => {
          if (brick.status === 1) {
            ctx.beginPath();
            ctx.roundRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT, 4);
            
            // Brick gradient
            const gradient = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + BRICK_HEIGHT);
            gradient.addColorStop(0, brick.color);
            gradient.addColorStop(1, '#00000040'); // Darken bottom
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Brick highlight
            ctx.strokeStyle = '#ffffff40';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.closePath();
          }
        });
      });
    };

    const drawBall = (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.arc(stateRef.current.ball.x, stateRef.current.ball.y, BALL_RADIUS, 0, Math.PI * 2);
      
      // Ball glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffffff';
      
      // Ball gradient
      const gradient = ctx.createRadialGradient(stateRef.current.ball.x - 3, stateRef.current.ball.y - 3, 1, stateRef.current.ball.x, stateRef.current.ball.y, BALL_RADIUS);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.4, '#e2e8f0');
      gradient.addColorStop(1, '#94a3b8'); // slate-400
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Reset shadow
      ctx.shadowBlur = 0;
      ctx.closePath();
    };

    const drawPaddle = (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.roundRect(stateRef.current.paddleX, CANVAS_HEIGHT - PADDLE_HEIGHT - 5, PADDLE_WIDTH, PADDLE_HEIGHT, 6);
      
      // Paddle gradient
      const gradient = ctx.createLinearGradient(stateRef.current.paddleX, CANVAS_HEIGHT - PADDLE_HEIGHT - 5, stateRef.current.paddleX, CANVAS_HEIGHT - 5);
      gradient.addColorStop(0, '#60a5fa'); // blue-400
      gradient.addColorStop(1, '#2563eb'); // blue-600
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Paddle glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#3b82f6';
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.closePath();
    };

    const collisionDetection = () => {
        let allBricksBroken = true;
        let hit = false;
        stateRef.current.bricks.forEach(column => {
            column.forEach(brick => {
                if (brick.status === 1) {
                    allBricksBroken = false;
                    if (
                        stateRef.current.ball.x > brick.x &&
                        stateRef.current.ball.x < brick.x + BRICK_WIDTH &&
                        stateRef.current.ball.y > brick.y &&
                        stateRef.current.ball.y < brick.y + BRICK_HEIGHT
                    ) {
                        stateRef.current.ballSpeed.dy = -stateRef.current.ballSpeed.dy;
                        brick.status = 0;
                        stateRef.current.score += 10;
                        setScore(stateRef.current.score);
                        addCoins(1);
                        hit = true;
                    }
                }
            });
        });
        if (hit) playSound(400, 'square', 0.1);
        if (allBricksBroken) {
            stateRef.current.gameWon = true;
            stateRef.current.isPlaying = false;
            setGameWon(true);
            addCoins(100); // Bonus for winning
            playSound(600, 'sine', 0.5);
        }
    };

    const gameLoop = (time: number) => {
      if (!stateRef.current.isPlaying || stateRef.current.gameOver || stateRef.current.gameWon) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      if (time - lastTime > 16) { // roughly 60fps
        lastTime = time;

        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        // Paddle movement from keyboard
        if (stateRef.current.keys.left) {
            stateRef.current.paddleX = Math.max(0, stateRef.current.paddleX - 7);
        }
        if (stateRef.current.keys.right) {
            stateRef.current.paddleX = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, stateRef.current.paddleX + 7);
        }

        let newX = stateRef.current.ball.x + stateRef.current.ballSpeed.dx;
        let newY = stateRef.current.ball.y + stateRef.current.ballSpeed.dy;

        // Wall collision
        if (newX > CANVAS_WIDTH - BALL_RADIUS || newX < BALL_RADIUS) {
          stateRef.current.ballSpeed.dx = -stateRef.current.ballSpeed.dx;
          playSound(200, 'sine', 0.1);
        }
        if (newY < BALL_RADIUS) {
          stateRef.current.ballSpeed.dy = -stateRef.current.ballSpeed.dy;
          playSound(200, 'sine', 0.1);
        } else if (newY > CANVAS_HEIGHT - BALL_RADIUS - 5) {
          // Paddle collision
          if (newX > stateRef.current.paddleX && newX < stateRef.current.paddleX + PADDLE_WIDTH) {
            // Change angle based on where it hit the paddle
            const hitPoint = newX - (stateRef.current.paddleX + PADDLE_WIDTH / 2);
            const normalizedHitPoint = hitPoint / (PADDLE_WIDTH / 2);
            const maxBounceAngle = Math.PI / 3; // 60 degrees
            const bounceAngle = normalizedHitPoint * maxBounceAngle;
            
            const speed = Math.sqrt(stateRef.current.ballSpeed.dx * stateRef.current.ballSpeed.dx + stateRef.current.ballSpeed.dy * stateRef.current.ballSpeed.dy);
            
            stateRef.current.ballSpeed = {
              dx: speed * Math.sin(bounceAngle),
              dy: -speed * Math.cos(bounceAngle)
            };
            playSound(300, 'sine', 0.1);
          } else if (newY > CANVAS_HEIGHT) {
            stateRef.current.lives -= 1;
            setLives(stateRef.current.lives);
            playSound(150, 'sawtooth', 0.3);
            if (stateRef.current.lives <= 0) {
              stateRef.current.gameOver = true;
              stateRef.current.isPlaying = false;
              setGameOver(true);
              playSound(100, 'sawtooth', 0.5);
            } else {
              stateRef.current.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 30 };
              stateRef.current.ballSpeed = getInitialSpeed();
              stateRef.current.paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
            }
          }
        }

        stateRef.current.ball = { x: newX, y: newY };
        collisionDetection();
        draw(ctx);
      }
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [difficulty, addCoins, gameOver, gameWon]);

  const handleMobileControl = (action: string) => {
    const state = stateRef.current;
    if (!state.isPlaying || state.gameOver || state.gameWon) return;

    if (action === 'left') {
      state.paddleX = Math.max(0, state.paddleX - 20);
    } else if (action === 'right') {
      state.paddleX = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, state.paddleX + 20);
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
              <span className="text-red-400">LIVES: {lives}</span>
            </div>
        </div>
        <div className="relative p-2 bg-slate-800 rounded-xl border-4 border-slate-700 shadow-2xl">
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-slate-900 rounded-lg shadow-inner" />
            
            {!stateRef.current.isPlaying && !stateRef.current.gameOver && !stateRef.current.gameWon && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
                    <button
                    onClick={resetGame}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all hover:scale-105"
                    >
                    START GAME
                    </button>
                </div>
            )}

            {(stateRef.current.gameOver || stateRef.current.gameWon) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg gap-4">
                    <h3 className={`text-4xl font-black ${stateRef.current.gameWon ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]'}`}>
                      {stateRef.current.gameWon ? 'YOU WIN!' : 'GAME OVER'}
                    </h3>
                    <p className="text-white text-xl font-mono">Final Score: {score}</p>
                    <button
                    onClick={resetGame}
                    className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full font-bold text-lg shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all flex items-center gap-2 hover:scale-105 mt-4"
                    >
                    <RefreshCw className="w-5 h-5" />
                    PLAY AGAIN
                    </button>
                </div>
            )}
        </div>
        <div className="md:hidden w-full max-w-md mt-4">
            <MobileControls onAction={handleMobileControl} actions={['left', 'right']} actionLabels={{ left: <ArrowLeft />, right: <ArrowRight /> }} />
        </div>
        <p className="hidden md:block text-gray-500 text-sm">Use mouse or touch to move the paddle</p>
    </div>
  );
};
