import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 80;
const BALL_RADIUS = 8;

export const Pong: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { addCoins, difficulty } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerY, setPlayerY] = useState(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [aiY, setAiY] = useState(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [ball, setBall] = useState({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  const [ballSpeed, setBallSpeed] = useState({ dx: 5, dy: 5 });
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  // Use ref for state accessed in game loop
  const stateRef = useRef({
    playerY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    aiY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    ballSpeed: { dx: 5, dy: 5 },
    playerScore: 0,
    aiScore: 0
  });

  const getDifficultySettings = () => {
    switch (difficulty) {
      case 'hard': return { ballSpeed: 8, aiSpeed: 6, winScore: 7 };
      case 'easy': return { ballSpeed: 4, aiSpeed: 2, winScore: 3 };
      case 'medium':
      default: return { ballSpeed: 6, aiSpeed: 4, winScore: 5 };
    }
  };

  const resetBall = (direction: 1 | -1) => {
    const settings = getDifficultySettings();
    stateRef.current.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    stateRef.current.ballSpeed = { 
      dx: settings.ballSpeed * direction, 
      dy: (Math.random() > 0.5 ? 1 : -1) * (settings.ballSpeed * 0.8)
    };
    setBall(stateRef.current.ball);
    setBallSpeed(stateRef.current.ballSpeed);
  };

  const resetGame = () => {
    stateRef.current.playerScore = 0;
    stateRef.current.aiScore = 0;
    stateRef.current.playerY = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    stateRef.current.aiY = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    
    setPlayerScore(0);
    setAiScore(0);
    setPlayerY(stateRef.current.playerY);
    setAiY(stateRef.current.aiY);
    
    resetBall(1);
    setGameOver(false);
    setWinner('');
    setIsPlaying(true);
  };

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const settings = getDifficultySettings();
    let animationFrameId: number;
    let lastTime = 0;

    const draw = () => {
      // Background
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw center line
      ctx.strokeStyle = '#334155'; // slate-700
      ctx.lineWidth = 4;
      ctx.setLineDash([15, 15]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw player paddle
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#3b82f6';
      ctx.fillStyle = '#60a5fa';
      ctx.roundRect(10, stateRef.current.playerY, PADDLE_WIDTH, PADDLE_HEIGHT, 6);
      ctx.fill();

      // Draw AI paddle
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.roundRect(CANVAS_WIDTH - 10 - PADDLE_WIDTH, stateRef.current.aiY, PADDLE_WIDTH, PADDLE_HEIGHT, 6);
      ctx.fill();

      // Draw ball
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(stateRef.current.ball.x, stateRef.current.ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
    };

    const gameLoop = (time: number) => {
      if (time - lastTime > 16) {
        lastTime = time;
        const state = stateRef.current;

        // Move ball
        let newX = state.ball.x + state.ballSpeed.dx;
        let newY = state.ball.y + state.ballSpeed.dy;

        // AI movement
        const aiCenter = state.aiY + PADDLE_HEIGHT / 2;
        // Add some "imperfection" to AI based on difficulty
        const aiTargetY = state.ball.y + (Math.random() * 20 - 10);
        
        if (aiCenter < aiTargetY - 10) {
          state.aiY = Math.min(state.aiY + settings.aiSpeed, CANVAS_HEIGHT - PADDLE_HEIGHT);
        } else if (aiCenter > aiTargetY + 10) {
          state.aiY = Math.max(state.aiY - settings.aiSpeed, 0);
        }

        // Wall collision (top/bottom)
        if (newY < BALL_RADIUS || newY > CANVAS_HEIGHT - BALL_RADIUS) {
          state.ballSpeed.dy = -state.ballSpeed.dy;
          newY = newY < BALL_RADIUS ? BALL_RADIUS : CANVAS_HEIGHT - BALL_RADIUS;
          playSound(200, 'sine', 0.1);
        }

        // Paddle collision
        // Player paddle
        if (newX < 10 + PADDLE_WIDTH + BALL_RADIUS && 
            newX > 10 &&
            newY > state.playerY && 
            newY < state.playerY + PADDLE_HEIGHT) {
          
          // Calculate bounce angle based on where it hit the paddle
          const hitPoint = newY - (state.playerY + PADDLE_HEIGHT / 2);
          const normalizedHitPoint = hitPoint / (PADDLE_HEIGHT / 2);
          const maxBounceAngle = Math.PI / 4; // 45 degrees
          const bounceAngle = normalizedHitPoint * maxBounceAngle;
          
          const speed = Math.sqrt(state.ballSpeed.dx * state.ballSpeed.dx + state.ballSpeed.dy * state.ballSpeed.dy);
          // Increase speed slightly on each hit, up to a max
          const newSpeed = Math.min(speed * 1.05, settings.ballSpeed * 1.5);
          
          state.ballSpeed.dx = newSpeed * Math.cos(bounceAngle);
          state.ballSpeed.dy = newSpeed * Math.sin(bounceAngle);
          newX = 10 + PADDLE_WIDTH + BALL_RADIUS; // Prevent sticking
          
          playSound(400, 'square', 0.1);
        } 
        // AI paddle
        else if (newX > CANVAS_WIDTH - 10 - PADDLE_WIDTH - BALL_RADIUS && 
                 newX < CANVAS_WIDTH - 10 &&
                 newY > state.aiY && 
                 newY < state.aiY + PADDLE_HEIGHT) {
                   
          const hitPoint = newY - (state.aiY + PADDLE_HEIGHT / 2);
          const normalizedHitPoint = hitPoint / (PADDLE_HEIGHT / 2);
          const maxBounceAngle = Math.PI / 4;
          const bounceAngle = normalizedHitPoint * maxBounceAngle;
          
          const speed = Math.sqrt(state.ballSpeed.dx * state.ballSpeed.dx + state.ballSpeed.dy * state.ballSpeed.dy);
          const newSpeed = Math.min(speed * 1.05, settings.ballSpeed * 1.5);
          
          state.ballSpeed.dx = -newSpeed * Math.cos(bounceAngle);
          state.ballSpeed.dy = newSpeed * Math.sin(bounceAngle);
          newX = CANVAS_WIDTH - 10 - PADDLE_WIDTH - BALL_RADIUS; // Prevent sticking
          
          playSound(300, 'square', 0.1);
        }

        // Score points
        if (newX < 0) {
          state.aiScore += 1;
          setAiScore(state.aiScore);
          playSound(150, 'sawtooth', 0.5);
          
          if (state.aiScore >= settings.winScore) {
            setWinner('AI');
            setGameOver(true);
            setIsPlaying(false);
            playSound(100, 'sawtooth', 0.8);
          } else {
            resetBall(-1); // Serve to AI
            return; // Skip updating ball position this frame
          }
        } else if (newX > CANVAS_WIDTH) {
          state.playerScore += 1;
          setPlayerScore(state.playerScore);
          addCoins(10);
          playSound(600, 'sine', 0.3);
          
          if (state.playerScore >= settings.winScore) {
            setWinner('Player');
            setGameOver(true);
            setIsPlaying(false);
            addCoins(100);
            addHighScore('pong', { name: 'Player', score: state.playerScore * 100 });
            playSound(800, 'sine', 0.8);
          } else {
            resetBall(1); // Serve to Player
            return; // Skip updating ball position this frame
          }
        } else {
          state.ball.x = newX;
          state.ball.y = newY;
        }

        // Sync state to React
        setBall({ ...state.ball });
        setAiY(state.aiY);
        
        draw();
      }
      
      if (isPlaying && !gameOver) {
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, gameOver, addCoins, difficulty]);

  // Mouse/Touch controls
  useEffect(() => {
    const handleMove = (clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleY = canvas.height / rect.height;
        const newPlayerY = (clientY - rect.top) * scaleY - PADDLE_HEIGHT / 2;
        const boundedY = Math.max(0, Math.min(newPlayerY, CANVAS_HEIGHT - PADDLE_HEIGHT));
        
        stateRef.current.playerY = boundedY;
        setPlayerY(boundedY);
    };
    
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      // Prevent scrolling while playing
      if (isPlaying) e.preventDefault();
      handleMove(e.touches[0].clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isPlaying]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <div className="w-full max-w-2xl flex justify-between items-center px-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          &larr; Back
        </button>
        <div className="text-white font-mono text-3xl font-black tracking-widest flex gap-8">
          <span className="text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]">{playerScore}</span>
          <span className="text-slate-500">-</span>
          <span className="text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]">{aiScore}</span>
        </div>
      </div>
      <div className="relative p-2 bg-slate-800 rounded-xl border-4 border-slate-700 shadow-2xl">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-slate-900 rounded-lg shadow-inner" />
        
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
            <button onClick={resetGame} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all hover:scale-105">
              START GAME
            </button>
          </div>
        )}
        
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg gap-4">
            <h3 className={`text-4xl font-black ${winner === 'Player' ? 'text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]' : 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]'}`}>
              {winner === 'Player' ? 'YOU WIN!' : 'GAME OVER'}
            </h3>
            <p className="text-white text-xl font-mono">Final Score: {playerScore} - {aiScore}</p>
            <button onClick={resetGame} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full font-bold text-lg shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all flex items-center gap-2 hover:scale-105 mt-4">
              <RefreshCw className="w-5 h-5" />
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>
      <p className="text-gray-500 text-sm">Use mouse or touch to move your paddle</p>
    </div>
  );
};
