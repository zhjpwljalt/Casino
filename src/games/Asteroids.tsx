import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw, Heart, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';
import { MobileControls } from '../components/MobileControls';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

// Ship properties
const SHIP_SIZE = 20;
const SHIP_THRUST = 0.15;
const SHIP_TURN_SPEED = 0.1;
const FRICTION = 0.98;

// Asteroid properties
const ASTEROID_SPEED = 1;
const ASTEROID_SIZE = 50;

interface GameObject {
    x: number;
    y: number;
    dx: number;
    dy: number;
    angle: number;
    size: number;
}

interface Ship extends GameObject {
    invulnerable: number;
}
interface Asteroid extends GameObject { 
    sides: number; 
    offsets: number[];
    rotSpeed: number;
}
interface Bullet extends GameObject {
    life: number;
}

export const Asteroids: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addCoins, difficulty } = useGame();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const keysRef = useRef<{ [key: string]: boolean }>({});

    // Use ref for state accessed in game loop
    const stateRef = useRef({
        ship: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: 0, dy: 0, angle: Math.PI / 2, size: SHIP_SIZE, invulnerable: 0 } as Ship,
        asteroids: [] as Asteroid[],
        bullets: [] as Bullet[],
        particles: [] as any[],
        score: 0,
        lives: 3,
        level: 1,
        lastShotTime: 0,
        gameOver: false,
        gameWon: false,
        isPlaying: false,
    });

    const getDifficultySettings = () => {
        switch (difficulty) {
            case 'hard': return { asteroidCount: 5, speedMult: 1.5, lives: 2 };
            case 'easy': return { asteroidCount: 2, speedMult: 0.7, lives: 5 };
            case 'medium':
            default: return { asteroidCount: 3, speedMult: 1, lives: 3 };
        }
    };

    const createAsteroids = (count: number, currentLevel: number) => {
        const settings = getDifficultySettings();
        const newAsteroids: Asteroid[] = [];
        const speedMultiplier = settings.speedMult * (1 + (currentLevel - 1) * 0.2);
        
        for (let i = 0; i < count; i++) {
            // Spawn away from center
            let x, y;
            do {
                x = Math.random() * CANVAS_WIDTH;
                y = Math.random() * CANVAS_HEIGHT;
            } while (Math.hypot(x - CANVAS_WIDTH/2, y - CANVAS_HEIGHT/2) < 100);

            const sides = Math.floor(Math.random() * 5) + 7;
            const offsets = Array.from({length: sides}, () => Math.random() * 0.4 + 0.8); // 0.8 to 1.2

            newAsteroids.push({
                x, y,
                dx: (Math.random() - 0.5) * ASTEROID_SPEED * speedMultiplier,
                dy: (Math.random() - 0.5) * ASTEROID_SPEED * speedMultiplier,
                angle: Math.random() * Math.PI * 2,
                size: ASTEROID_SIZE,
                sides,
                offsets,
                rotSpeed: (Math.random() - 0.5) * 0.05
            });
        }
        return newAsteroids;
    };

    const resetGame = () => {
        const settings = getDifficultySettings();
        stateRef.current = {
            ship: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: 0, dy: 0, angle: Math.PI / 2, size: SHIP_SIZE, invulnerable: 100 },
            asteroids: createAsteroids(settings.asteroidCount, 1),
            bullets: [],
            particles: [],
            score: 0,
            lives: settings.lives,
            level: 1,
            lastShotTime: 0,
            gameOver: false,
            gameWon: false,
            isPlaying: true,
        };
        
        setScore(0);
        setLives(settings.lives);
        setLevel(1);
        setGameOver(false);
        setGameWon(false);
        setIsPlaying(true);
    };

    useEffect(() => {
        resetGame();
    }, [difficulty]);

    useEffect(() => {
        if (gameOver || gameWon) {
            if (gameOver) playSound('gameover');
            if (gameWon) playSound('win');
            addHighScore('asteroids', { name: 'Player', score: stateRef.current.score });
        }
    }, [gameOver, gameWon]);

    const fireBullet = () => {
        const now = Date.now();
        if (now - stateRef.current.lastShotTime > 150) {
            const ship = stateRef.current.ship;
            stateRef.current.bullets.push({
                x: ship.x + Math.cos(ship.angle) * SHIP_SIZE / 2,
                y: ship.y - Math.sin(ship.angle) * SHIP_SIZE / 2,
                dx: Math.cos(ship.angle) * 8 + ship.dx,
                dy: -Math.sin(ship.angle) * 8 + ship.dy,
                angle: 0,
                size: 4,
                life: 60 // frames
            });
            stateRef.current.lastShotTime = now;
            playSound(600, 'square', 0.05);
        }
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysRef.current[e.key] = true;
            if (e.key === ' ' && stateRef.current.isPlaying && !stateRef.current.gameOver && !stateRef.current.gameWon) {
                e.preventDefault();
                fireBullet();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key] = false; };
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

        const createExplosion = (x: number, y: number, color: string, count: number) => {
            for (let i = 0; i < count; i++) {
                stateRef.current.particles.push({
                    x, y,
                    dx: (Math.random() - 0.5) * 5,
                    dy: (Math.random() - 0.5) * 5,
                    life: Math.random() * 30 + 10,
                    color
                });
            }
        };

        const drawAsteroid = (ctx: CanvasRenderingContext2D, a: Asteroid) => {
            ctx.save();
            ctx.translate(a.x, a.y);
            ctx.rotate(a.angle);
            
            ctx.strokeStyle = '#94a3b8'; // slate-400
            ctx.lineWidth = 2;
            ctx.fillStyle = '#1e293b'; // slate-800
            
            ctx.beginPath();
            for (let i = 0; i < a.sides; i++) {
                const angle = i * Math.PI * 2 / a.sides;
                const radius = (a.size / 2) * a.offsets[i];
                const px = Math.cos(angle) * radius;
                const py = Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#64748b';
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Add some inner details
            ctx.beginPath();
            ctx.arc(-a.size/6, -a.size/6, a.size/8, 0, Math.PI*2);
            ctx.strokeStyle = '#475569';
            ctx.stroke();
            
            ctx.restore();
        };

        const drawShip = (ctx: CanvasRenderingContext2D, ship: Ship) => {
            ctx.save();
            ctx.translate(ship.x, ship.y);
            ctx.rotate(-ship.angle); // Canvas rotation is clockwise, math is counter-clockwise
            
            // Blink if invulnerable
            if (ship.invulnerable > 0 && Math.floor(ship.invulnerable / 5) % 2 === 0) {
                ctx.globalAlpha = 0.5;
            }

            // Draw thrust
            if (keysRef.current['ArrowUp'] || keysRef.current['w']) {
                ctx.fillStyle = '#f97316'; // orange-500
                ctx.beginPath();
                ctx.moveTo(-SHIP_SIZE/2, 0);
                ctx.lineTo(-SHIP_SIZE/2 - Math.random() * 15 - 5, 0);
                ctx.lineTo(-SHIP_SIZE/2, 5);
                ctx.lineTo(-SHIP_SIZE/2, -5);
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#fef08a'; // yellow-200
                ctx.beginPath();
                ctx.moveTo(-SHIP_SIZE/2, 0);
                ctx.lineTo(-SHIP_SIZE/2 - Math.random() * 10 - 2, 0);
                ctx.lineTo(-SHIP_SIZE/2, 2);
                ctx.lineTo(-SHIP_SIZE/2, -2);
                ctx.closePath();
                ctx.fill();
            }

            // Draw ship body
            ctx.strokeStyle = '#38bdf8'; // sky-400
            ctx.fillStyle = '#0f172a';
            ctx.lineWidth = 2;
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#38bdf8';
            
            ctx.beginPath();
            ctx.moveTo(SHIP_SIZE / 2, 0); // Nose
            ctx.lineTo(-SHIP_SIZE / 2, SHIP_SIZE / 2.5); // Right wing
            ctx.lineTo(-SHIP_SIZE / 3, 0); // Back indent
            ctx.lineTo(-SHIP_SIZE / 2, -SHIP_SIZE / 2.5); // Left wing
            ctx.closePath();
            
            ctx.fill();
            ctx.stroke();
            
            ctx.shadowBlur = 0;
            ctx.restore();
        };

        const gameLoop = (time: number) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            if (time - lastTime > 16) {
                lastTime = time;
                const state = stateRef.current;

                if (!state.isPlaying || state.gameOver || state.gameWon) {
                    animationFrameId = requestAnimationFrame(gameLoop);
                    return;
                }

                // Background
                ctx.fillStyle = '#020617'; // slate-950
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                
                // Draw stars
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 50; i++) {
                  const x = (Math.sin(i * 123) * 0.5 + 0.5) * CANVAS_WIDTH;
                  const y = (Math.cos(i * 321) * 0.5 + 0.5) * CANVAS_HEIGHT;
                  const size = Math.sin(time * 0.002 + i) * 1 + 1;
                  if (size > 0) {
                    ctx.globalAlpha = Math.sin(time * 0.001 + i) * 0.5 + 0.5;
                    ctx.fillRect(x, y, size, size);
                  }
                }
                ctx.globalAlpha = 1.0;

                // Ship logic
                let ship = state.ship;
                
                if (ship.invulnerable > 0) {
                    ship.invulnerable--;
                }

                if (keysRef.current['ArrowUp'] || keysRef.current['w']) {
                    ship.dx += Math.cos(ship.angle) * SHIP_THRUST;
                    ship.dy -= Math.sin(ship.angle) * SHIP_THRUST;
                    if (Math.random() < 0.2) playSound(100, 'sine', 0.02);
                }
                if (keysRef.current['ArrowLeft'] || keysRef.current['a']) { ship.angle += SHIP_TURN_SPEED; } else if (keysRef.current['ArrowRight'] || keysRef.current['d']) { ship.angle -= SHIP_TURN_SPEED; }

                ship.dx *= FRICTION;
                ship.dy *= FRICTION;
                ship.x += ship.dx;
                ship.y += ship.dy;

                // Screen wrap ship
                if (ship.x < 0) ship.x = CANVAS_WIDTH;
                if (ship.x > CANVAS_WIDTH) ship.x = 0;
                if (ship.y < 0) ship.y = CANVAS_HEIGHT;
                if (ship.y > CANVAS_HEIGHT) ship.y = 0;

                drawShip(ctx, ship);

                // Bullets logic
                state.bullets = state.bullets.map(b => ({ 
                    ...b, 
                    x: b.x + b.dx, 
                    y: b.y + b.dy,
                    life: b.life - 1
                })).filter(b => b.life > 0);
                
                // Screen wrap bullets
                state.bullets.forEach(b => {
                    if (b.x < 0) b.x = CANVAS_WIDTH;
                    if (b.x > CANVAS_WIDTH) b.x = 0;
                    if (b.y < 0) b.y = CANVAS_HEIGHT;
                    if (b.y > CANVAS_HEIGHT) b.y = 0;
                    
                    ctx.fillStyle = '#38bdf8';
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = '#38bdf8';
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, b.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                });

                // Particles logic
                state.particles = state.particles.map(p => ({
                    ...p,
                    x: p.x + p.dx,
                    y: p.y + p.dy,
                    life: p.life - 1
                })).filter(p => p.life > 0);
                
                state.particles.forEach(p => {
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.life / 40;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.globalAlpha = 1.0;

                // Asteroids logic
                let asteroidsDestroyed = 0;
                
                for (let aIndex = state.asteroids.length - 1; aIndex >= 0; aIndex--) {
                    const a = state.asteroids[aIndex];
                    a.x += a.dx;
                    a.y += a.dy;
                    a.angle += a.rotSpeed;
                    
                    // Screen wrap
                    if (a.x < -a.size) a.x = CANVAS_WIDTH + a.size; 
                    if (a.x > CANVAS_WIDTH + a.size) a.x = -a.size; 
                    if (a.y < -a.size) a.y = CANVAS_HEIGHT + a.size; 
                    if (a.y > CANVAS_HEIGHT + a.size) a.y = -a.size;

                    drawAsteroid(ctx, a);

                    // Collision: bullets vs asteroids
                    let asteroidHit = false;
                    for (let bIndex = state.bullets.length - 1; bIndex >= 0; bIndex--) {
                        const b = state.bullets[bIndex];
                        // Simple circle collision
                        if (Math.hypot(b.x - a.x, b.y - a.y) < a.size / 2) {
                            state.bullets.splice(bIndex, 1);
                            asteroidHit = true;
                            break;
                        }
                    }

                    if (asteroidHit) {
                        state.asteroids.splice(aIndex, 1);
                        asteroidsDestroyed++;
                        
                        const points = a.size === ASTEROID_SIZE ? 20 : a.size === ASTEROID_SIZE / 2 ? 50 : 100;
                        state.score += points;
                        setScore(state.score);
                        
                        createExplosion(a.x, a.y, '#94a3b8', 15);
                        playSound('hit');
                        
                        // Split asteroid
                        if (a.size > ASTEROID_SIZE / 4) {
                            const newSize = a.size / 2;
                            for (let i = 0; i < 2; i++) {
                                const sides = Math.floor(Math.random() * 5) + 5;
                                const offsets = Array.from({length: sides}, () => Math.random() * 0.4 + 0.8);
                                state.asteroids.push({ 
                                    ...a, 
                                    size: newSize, 
                                    dx: a.dx + (Math.random() * 2 - 1), 
                                    dy: a.dy + (Math.random() * 2 - 1),
                                    sides,
                                    offsets,
                                    rotSpeed: (Math.random() - 0.5) * 0.1
                                });
                            }
                        }
                    }

                    // Collision: ship vs asteroids
                    if (!asteroidHit && ship.invulnerable <= 0) {
                        if (Math.hypot(ship.x - a.x, ship.y - a.y) < (a.size + ship.size) / 2.5) { // Slightly forgiving hitbox
                            state.lives -= 1;
                            setLives(state.lives);
                            
                            createExplosion(ship.x, ship.y, '#f97316', 30);
                            playSound('hit');
                            
                            if (state.lives <= 0) {
                                state.gameOver = true;
                                setGameOver(true);
                                state.isPlaying = false;
                                setIsPlaying(false);
                                addHighScore('asteroids', state.score);
                            } else {
                                // Reset ship
                                state.ship = { 
                                    x: CANVAS_WIDTH / 2, 
                                    y: CANVAS_HEIGHT / 2, 
                                    dx: 0, 
                                    dy: 0, 
                                    angle: Math.PI / 2, 
                                    size: SHIP_SIZE, 
                                    invulnerable: 120 // 2 seconds at 60fps
                                };
                            }
                        }
                    }
                }

                if (asteroidsDestroyed > 0) {
                    addCoins(Math.ceil(asteroidsDestroyed * 2));
                }

                // Level up
                if (state.asteroids.length === 0) {
                    state.level += 1;
                    setLevel(state.level);
                    const settings = getDifficultySettings();
                    state.asteroids = createAsteroids(settings.asteroidCount + state.level, state.level);
                    state.ship.invulnerable = 120;
                    playSound(600, 'sine', 0.5);
                    addCoins(50);
                }
            }
            
            if (stateRef.current.isPlaying && !stateRef.current.gameOver && !stateRef.current.gameWon) {
                animationFrameId = requestAnimationFrame(gameLoop);
            }
        };
        
        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [addCoins, difficulty]);

    const handleMobileControl = (action: string) => {
        const state = stateRef.current;
        if (!state.isPlaying || state.gameOver || state.gameWon) return;

        // Simulate key presses for mobile controls
        switch (action) {
            case 'up': keysRef.current['ArrowUp'] = true; keysRef.current['w'] = true; break;
            case 'down': keysRef.current['ArrowDown'] = true; keysRef.current['s'] = true; break;
            case 'left': keysRef.current['ArrowLeft'] = true; keysRef.current['a'] = true; break;
            case 'right': keysRef.current['ArrowRight'] = true; keysRef.current['d'] = true; break;
            case 'action': fireBullet(); break;
        }
        // Release keys after a short delay to prevent continuous input
        setTimeout(() => {
            switch (action) {
                case 'up': keysRef.current['ArrowUp'] = false; keysRef.current['w'] = false; break;
                case 'down': keysRef.current['ArrowDown'] = false; keysRef.current['s'] = false; break;
                case 'left': keysRef.current['ArrowLeft'] = false; keysRef.current['a'] = false; break;
                case 'right': keysRef.current['ArrowRight'] = false; keysRef.current['d'] = false; break;
            }
        }, 100);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
            <div className="w-full max-w-2xl flex justify-between items-center px-4">
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors"> &larr; Back </button>
                <div className="flex items-center gap-6 text-white font-mono">
                    <span className="text-blue-400">LEVEL: {level}</span>
                    <span>SCORE: {score}</span>
                    <div className="flex items-center gap-1">
                        <span className="text-red-400">LIVES:</span>
                        {Array(Math.max(0, lives)).fill(0).map((_, i) => <Heart key={i} className="w-4 h-4 text-red-500 fill-current drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />)}
                    </div>
                </div>
            </div>
            <div className="relative p-2 bg-slate-800 rounded-xl border-4 border-slate-700 shadow-2xl">
                <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-slate-900 rounded-lg shadow-inner" />
                
                {!stateRef.current.isPlaying && !stateRef.current.gameOver && !stateRef.current.gameWon && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
                        <button onClick={resetGame} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(8,145,178,0.5)] transition-all hover:scale-105"> 
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
                        <p className="text-blue-400 font-mono">Level Reached: {level}</p>
                        <button onClick={resetGame} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full font-bold text-lg shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all flex items-center gap-2 hover:scale-105 mt-4">
                            <RefreshCw className="w-5 h-5" /> PLAY AGAIN
                        </button>
                    </div>
                )}
            </div>
            
            <div className="hidden md:block text-gray-500 text-sm">Use Arrow Keys to move/turn, Spacebar to shoot</div>
            <div className="md:hidden w-full max-w-md mt-4">
                <MobileControls onAction={handleMobileControl} actions={['up', 'down', 'left', 'right', 'action']} actionLabels={{ up: <ArrowUp />, down: <ArrowDown />, left: <ArrowLeft />, right: <ArrowRight />, action: 'SHOOT' }} />
            </div>
        </div>
    );
};
