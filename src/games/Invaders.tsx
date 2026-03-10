import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw, Heart, Shield } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';
import { MobileControls } from '../components/MobileControls';

const CANVAS_WIDTH = 550;
const CANVAS_HEIGHT = 400;

// Player
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 20;
const PLAYER_SPEED = 5;

// Alien
const ALIEN_ROWS = 5;
const ALIEN_COLS = 10;
const ALIEN_WIDTH = 30;
const ALIEN_HEIGHT = 20;
const ALIEN_PADDING = 10;
const ALIEN_OFFSET_TOP = 40;
const ALIEN_OFFSET_LEFT = 30;

// Bullet
const BULLET_SPEED = 7;
const BULLET_RADIUS = 3;

interface Alien {
  x: number;
  y: number;
  status: number;
  type: number;
}

interface Bullet {
    x: number;
    y: number;
}

export const Invaders: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { addCoins, difficulty } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerX, setPlayerX] = useState((CANVAS_WIDTH - PLAYER_WIDTH) / 2);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [aliens, setAliens] = useState<Alien[][]>([]);
  const [alienDirection, setAlienDirection] = useState(1);
  const [alienBullets, setAlienBullets] = useState<Bullet[]>([]);
  const [boss, setBoss] = useState<{ x: number, y: number, hp: number, active: boolean } | null>(null);
  const [wave, setWave] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  
  // Use ref for state accessed in game loop to avoid stale closures
  const stateRef = useRef({
    playerX: (CANVAS_WIDTH - PLAYER_WIDTH) / 2,
    bullets: [] as Bullet[],
    aliens: [] as Alien[][],
    alienBullets: [] as Bullet[],
    alienDirection: 1,
    alienSpeed: 0.5,
    score: 0,
    lives: 3,
    lastShotTime: 0,
    boss: null as { x: number, y: number, hp: number, active: boolean } | null,
    wave: 1
  });

  const getDifficultySettings = () => {
    switch (difficulty) {
      case 'hard': return { speed: 1.5, fireRate: 0.005, lives: 2 };
      case 'easy': return { speed: 0.3, fireRate: 0.0005, lives: 5 };
      case 'medium':
      default: return { speed: 0.8, fireRate: 0.002, lives: 3 };
    }
  };

  const initializeAliens = () => {
    const newAliens: Alien[][] = [];
    for (let c = 0; c < ALIEN_COLS; c++) {
      newAliens[c] = [];
      for (let r = 0; r < ALIEN_ROWS; r++) {
        const alienX = c * (ALIEN_WIDTH + ALIEN_PADDING) + ALIEN_OFFSET_LEFT;
        const alienY = r * (ALIEN_HEIGHT + ALIEN_PADDING) + ALIEN_OFFSET_TOP;
        // 0: top row (squid), 1: middle rows (crab), 2: bottom rows (octopus)
        const type = r === 0 ? 0 : r < 3 ? 1 : 2;
        newAliens[c][r] = { x: alienX, y: alienY, status: 1, type };
      }
    }
    setAliens(newAliens);
    stateRef.current.aliens = newAliens;
  };

  const resetGame = () => {
    const settings = getDifficultySettings();
    initializeAliens();
    setScore(0);
    setLives(settings.lives);
    setPlayerX((CANVAS_WIDTH - PLAYER_WIDTH) / 2);
    setBullets([]);
    setAlienBullets([]);
    setAlienDirection(1);
    setBoss(null);
    setWave(1);
    
    stateRef.current = {
      playerX: (CANVAS_WIDTH - PLAYER_WIDTH) / 2,
      bullets: [],
      aliens: stateRef.current.aliens,
      alienBullets: [],
      alienDirection: 1,
      alienSpeed: settings.speed,
      score: 0,
      lives: settings.lives,
      lastShotTime: 0,
      boss: null,
      wave: 1
    };
    
    setGameOver(false);
    setGameWon(false);
    setIsPlaying(true);
    import('../lib/audio').then(m => m.playMusic('gameplay'));
  };

  useEffect(() => {
    initializeAliens();
  }, []);

  const fireBullet = () => {
    const now = Date.now();
    if (now - stateRef.current.lastShotTime > 250) { // Limit fire rate
      stateRef.current.bullets.push({ 
        x: stateRef.current.playerX + PLAYER_WIDTH / 2, 
        y: CANVAS_HEIGHT - PLAYER_HEIGHT - 5 
      });
      stateRef.current.lastShotTime = now;
      playSound('shoot');
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        keysRef.current[e.key] = true;
        if (e.key === ' ' && isPlaying && !gameOver && !gameWon) {
            e.preventDefault();
            fireBullet();
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        keysRef.current[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, gameOver, gameWon]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver || gameWon) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const settings = getDifficultySettings();
    let animationFrameId: number;
    let lastTime = 0;

    const drawAlien = (ctx: CanvasRenderingContext2D, alien: Alien, time: number) => {
      const isAnimFrame1 = Math.floor(time / 500) % 2 === 0;
      
      ctx.save();
      ctx.translate(alien.x, alien.y);
      
      // Alien colors based on type
      const colors = ['#f43f5e', '#a855f7', '#3b82f6']; // rose, purple, blue
      ctx.fillStyle = colors[alien.type];
      
      // Glow effect for aliens
      ctx.shadowBlur = 10;
      ctx.shadowColor = colors[alien.type];
      
      // Draw pixelated alien (simplified)
      const s = 3; // pixel size
      
      if (alien.type === 0) { // Squid
        ctx.fillRect(3*s, 0, 4*s, s);
        ctx.fillRect(2*s, s, 6*s, s);
        ctx.fillRect(s, 2*s, 8*s, s);
        ctx.fillRect(0, 3*s, 3*s, s); ctx.fillRect(4*s, 3*s, 2*s, s); ctx.fillRect(7*s, 3*s, 3*s, s);
        ctx.fillRect(0, 4*s, 10*s, s);
        ctx.fillRect(2*s, 5*s, s, s); ctx.fillRect(7*s, 5*s, s, s);
        if (isAnimFrame1) {
          ctx.fillRect(s, 6*s, 2*s, s); ctx.fillRect(7*s, 6*s, 2*s, s);
        } else {
          ctx.fillRect(0, 6*s, s, s); ctx.fillRect(3*s, 6*s, s, s); ctx.fillRect(6*s, 6*s, s, s); ctx.fillRect(9*s, 6*s, s, s);
        }
      } else if (alien.type === 1) { // Crab
        ctx.fillRect(2*s, 0, s, s); ctx.fillRect(8*s, 0, s, s);
        ctx.fillRect(3*s, s, s, s); ctx.fillRect(7*s, s, s, s);
        ctx.fillRect(2*s, 2*s, 7*s, s);
        ctx.fillRect(s, 3*s, 2*s, s); ctx.fillRect(4*s, 3*s, 3*s, s); ctx.fillRect(8*s, 3*s, 2*s, s);
        ctx.fillRect(0, 4*s, 11*s, s);
        ctx.fillRect(0, 5*s, s, s); ctx.fillRect(2*s, 5*s, 7*s, s); ctx.fillRect(10*s, 5*s, s, s);
        ctx.fillRect(0, 6*s, s, s); ctx.fillRect(2*s, 6*s, s, s); ctx.fillRect(8*s, 6*s, s, s); ctx.fillRect(10*s, 6*s, s, s);
        if (isAnimFrame1) {
          ctx.fillRect(3*s, 7*s, 2*s, s); ctx.fillRect(6*s, 7*s, 2*s, s);
        } else {
          ctx.fillRect(s, 7*s, 2*s, s); ctx.fillRect(8*s, 7*s, 2*s, s);
        }
      } else { // Octopus
        ctx.fillRect(4*s, 0, 4*s, s);
        ctx.fillRect(1*s, s, 10*s, s);
        ctx.fillRect(0, 2*s, 12*s, s);
        ctx.fillRect(0, 3*s, 3*s, s); ctx.fillRect(4*s, 3*s, 4*s, s); ctx.fillRect(9*s, 3*s, 3*s, s);
        ctx.fillRect(0, 4*s, 12*s, s);
        ctx.fillRect(2*s, 5*s, 8*s, s);
        ctx.fillRect(3*s, 6*s, 2*s, s); ctx.fillRect(7*s, 6*s, 2*s, s);
        if (isAnimFrame1) {
          ctx.fillRect(2*s, 7*s, 2*s, s); ctx.fillRect(8*s, 7*s, 2*s, s);
        } else {
          ctx.fillRect(4*s, 7*s, 4*s, s);
        }
      }
      
      ctx.restore();
    };

    const drawPlayer = (ctx: CanvasRenderingContext2D, x: number) => {
      ctx.save();
      ctx.translate(x, CANVAS_HEIGHT - PLAYER_HEIGHT);
      
      // Player gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, PLAYER_HEIGHT);
      gradient.addColorStop(0, '#4ade80'); // green-400
      gradient.addColorStop(1, '#16a34a'); // green-600
      ctx.fillStyle = gradient;
      
      // Base
      ctx.fillRect(0, 10, PLAYER_WIDTH, 10);
      // Middle
      ctx.fillRect(4, 6, PLAYER_WIDTH - 8, 4);
      // Cannon
      ctx.fillRect(PLAYER_WIDTH / 2 - 2, 0, 4, 6);
      
      // Glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#4ade80';
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.restore();
    };

    const drawBoss = (ctx: CanvasRenderingContext2D, boss: { x: number, y: number, hp: number }, time: number) => {
      ctx.save();
      ctx.translate(boss.x, boss.y);
      
      const s = 6; // Larger pixels for boss
      ctx.fillStyle = '#facc15'; // yellow-400
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#facc15';
      
      // Mothership shape
      ctx.fillRect(4*s, 0, 8*s, s);
      ctx.fillRect(2*s, s, 12*s, s);
      ctx.fillRect(0, 2*s, 16*s, s);
      ctx.fillRect(0, 3*s, 3*s, s); ctx.fillRect(5*s, 3*s, 6*s, s); ctx.fillRect(13*s, 3*s, 3*s, s);
      ctx.fillRect(0, 4*s, 16*s, s);
      
      // HP Bar
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, -15, 16*s, 5);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, -15, (16*s) * (boss.hp / 50), 5);
      
      ctx.restore();
    };

    const gameLoop = (time: number) => {
      if (time - lastTime > 16) {
        lastTime = time;
        const state = stateRef.current;

        // Background
        ctx.fillStyle = '#0f172a'; // slate-900
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Draw stars
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
          const x = (Math.sin(i * 123) * 0.5 + 0.5) * CANVAS_WIDTH;
          const y = (Math.cos(i * 321 + time * 0.0001) * 0.5 + 0.5) * CANVAS_HEIGHT;
          const size = Math.sin(time * 0.005 + i) * 1 + 1.5;
          if (size > 0) {
            ctx.globalAlpha = Math.sin(time * 0.002 + i) * 0.5 + 0.5;
            ctx.fillRect(x, y, size, size);
          }
        }
        ctx.globalAlpha = 1.0;

        // Move player
        if (keysRef.current['ArrowLeft'] && state.playerX > 0) {
            state.playerX -= PLAYER_SPEED;
        }
        if (keysRef.current['ArrowRight'] && state.playerX < CANVAS_WIDTH - PLAYER_WIDTH) {
            state.playerX += PLAYER_SPEED;
        }

        // Draw player
        drawPlayer(ctx, state.playerX);

        // Update and draw bullets
        state.bullets = state.bullets.map(b => ({ ...b, y: b.y - BULLET_SPEED })).filter(b => b.y > 0);
        state.bullets.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = '#4ade80';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#4ade80';
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Update and draw alien bullets
        state.alienBullets = state.alienBullets.map(b => ({ ...b, y: b.y + BULLET_SPEED / 2 })).filter(b => b.y < CANVAS_HEIGHT);
        state.alienBullets.forEach(b => {
            ctx.beginPath();
            ctx.rect(b.x - 2, b.y, 4, 10);
            ctx.fillStyle = '#f43f5e';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f43f5e';
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Move and draw aliens
        let edgeReached = false;
        let activeAliens = 0;
        
        if (!state.boss) {
          state.aliens.forEach(col => {
              col.forEach(alien => {
                  if (alien.status === 1) {
                      activeAliens++;
                      alien.x += state.alienSpeed * state.alienDirection;
                      if (alien.x + ALIEN_WIDTH > CANVAS_WIDTH || alien.x < 0) {
                          edgeReached = true;
                      }
                      
                      drawAlien(ctx, alien, time);

                      // Alien shooting
                      if (Math.random() < settings.fireRate) {
                          state.alienBullets.push({ x: alien.x + ALIEN_WIDTH / 2, y: alien.y + ALIEN_HEIGHT });
                          playSound(300, 'sawtooth', 0.02);
                      }
                  }
              });
          });
        }

        // Boss Logic
        if (state.boss && state.boss.active) {
          state.boss.x += Math.sin(time * 0.002) * 3;
          drawBoss(ctx, state.boss, time);
          
          if (Math.random() < settings.fireRate * 5) {
            state.alienBullets.push({ x: state.boss.x + 40, y: state.boss.y + 30 });
            state.alienBullets.push({ x: state.boss.x + 60, y: state.boss.y + 30 });
            playSound(200, 'sawtooth', 0.05);
          }
        }

        // Increase speed as aliens are destroyed
        const totalAliens = ALIEN_ROWS * ALIEN_COLS;
        const speedMultiplier = 1 + ((totalAliens - activeAliens) / totalAliens) * 2;
        state.alienSpeed = settings.speed * speedMultiplier;

        if (edgeReached) {
            state.alienDirection *= -1;
            state.aliens.forEach(col => col.forEach(a => a.y += 15));
            playSound(150, 'square', 0.1);
        }

        // Collision detection: player bullets vs aliens/boss
        let scoreGained = 0;
        state.bullets.forEach((bullet, bIndex) => {
            if (state.boss && state.boss.active) {
              if (bullet.x > state.boss.x && bullet.x < state.boss.x + 100 && bullet.y > state.boss.y && bullet.y < state.boss.y + 40) {
                state.boss.hp -= 1;
                state.bullets.splice(bIndex, 1);
                playSound('hit');
                if (state.boss.hp <= 0) {
                  state.boss.active = false;
                  state.score += 1000;
                  setScore(state.score);
                  addCoins(100);
                  setGameWon(true);
                  setIsPlaying(false);
                  import('../lib/audio').then(m => m.playMusic('win'));
                }
                return;
              }
            }

            state.aliens.forEach(col => {
                col.forEach(alien => {
                    if (alien.status === 1 && bullet.x > alien.x && bullet.x < alien.x + ALIEN_WIDTH && bullet.y > alien.y && bullet.y < alien.y + ALIEN_HEIGHT) {
                        alien.status = 0;
                        state.bullets.splice(bIndex, 1);
                        
                        // Score based on alien type
                        const points = alien.type === 0 ? 30 : alien.type === 1 ? 20 : 10;
                        scoreGained += points;
                        
                        playSound('hit');
                        
                        // Explosion effect (simple)
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(alien.x + ALIEN_WIDTH/2, alien.y + ALIEN_HEIGHT/2, 15, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });
            });
        });

        if (scoreGained > 0) {
          state.score += scoreGained;
          setScore(state.score);
          addCoins(Math.ceil(scoreGained / 10));
        }

        // Collision detection: alien bullets vs player
        let hitPlayer = false;
        state.alienBullets.forEach((bullet, bIndex) => {
            if (bullet.x > state.playerX && bullet.x < state.playerX + PLAYER_WIDTH && bullet.y > CANVAS_HEIGHT - PLAYER_HEIGHT) {
                state.alienBullets.splice(bIndex, 1);
                hitPlayer = true;
            }
        });

        if (hitPlayer) {
          state.lives -= 1;
          setLives(state.lives);
          playSound('hit');
          
          // Screen shake effect
          ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5);
          
          if (state.lives <= 0) {
              setGameOver(true);
              setIsPlaying(false);
              addHighScore('invaders', state.score);
          } else {
              // Clear bullets on hit
              state.alienBullets = [];
              state.bullets = [];
          }
        }

        // Sync state to React for rendering UI
        setPlayerX(state.playerX);

        // Check for win/loss
        if (activeAliens === 0 && !state.boss) {
            state.boss = { x: CANVAS_WIDTH / 2 - 50, y: 50, hp: 50, active: true };
            setBoss(state.boss);
            import('../lib/audio').then(m => m.playMusic('boss'));
        }
        
        if (state.aliens.some(col => col.some(a => a.status === 1 && a.y + ALIEN_HEIGHT > CANVAS_HEIGHT - PLAYER_HEIGHT))) {
            setGameOver(true);
            setIsPlaying(false);
            addHighScore('invaders', { name: 'Player', score: state.score });
            playSound('gameover');
        }
      }
      
      if (isPlaying && !gameOver && !gameWon) {
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, gameOver, gameWon, addCoins, difficulty]);

  const handleMobileControl = (action: string) => {
    if (!isPlaying) return;
    
    if (action === 'left' && stateRef.current.playerX > 0) {
      stateRef.current.playerX -= PLAYER_SPEED * 3;
    } else if (action === 'right' && stateRef.current.playerX < CANVAS_WIDTH - PLAYER_WIDTH) {
      stateRef.current.playerX += PLAYER_SPEED * 3;
    } else if (action === 'action') {
      fireBullet();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <div className="w-full max-w-xl flex justify-between items-center px-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          &larr; Back
        </button>
        <div className="flex items-center gap-4 text-white font-mono">
          <span>SCORE: {score}</span>
          <div className="flex items-center gap-1">
            <span className="text-red-400">LIVES:</span>
            {Array(Math.max(0, lives)).fill(0).map((_, i) => <Heart key={i} className="w-4 h-4 text-red-500 fill-current drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />)}
          </div>
        </div>
      </div>
      <div className="relative p-2 bg-slate-800 rounded-xl border-4 border-slate-700 shadow-2xl">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-slate-900 rounded-lg shadow-inner" />
        
        {!isPlaying && !gameOver && !gameWon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
            <button onClick={resetGame} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all hover:scale-105">
              START GAME
            </button>
          </div>
        )}
        
        {(gameOver || gameWon) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg gap-4">
            <h3 className={`text-4xl font-black ${gameWon ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]'}`}>
              {gameWon ? 'YOU WIN!' : 'GAME OVER'}
            </h3>
            <p className="text-white text-xl font-mono">Final Score: {score}</p>
            <button onClick={resetGame} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full font-bold text-lg shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all flex items-center gap-2 hover:scale-105 mt-4">
              <RefreshCw className="w-5 h-5" />
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>
      
      <div className="hidden md:block text-gray-500 text-sm">Use Arrow Keys to move, Spacebar to shoot</div>
      <div className="md:hidden w-full max-w-md mt-4">
        <MobileControls onAction={handleMobileControl} />
      </div>
    </div>
  );
};
