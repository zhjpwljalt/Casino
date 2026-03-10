import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';
import { MobileControls } from '../components/MobileControls';

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 400;
const GRID_SIZE = 20;

// Player properties
const PLAYER_WIDTH = 16;
const PLAYER_HEIGHT = 18;
const JUMP_HEIGHT = 5.5;
const GRAVITY = 0.25;
const MOVE_SPEED = 3;

// Barrel properties
const BARREL_RADIUS = 8;

interface Platform {
    x: number;
    y: number;
    width: number;
    slant?: number; // 0 = flat, 1 = up-right, -1 = down-right
}

interface Barrel {
    x: number;
    y: number;
    dx: number;
    dy: number;
    onGround: boolean;
    rotation: number;
}

export const DonkeyKong: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addCoins, difficulty } = useGame();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const getDifficultySettings = () => {
        switch (difficulty) {
            case 'hard': return { barrelSpawnRate: 0.03, barrelSpeed: 3, startingLives: 2 };
            case 'easy': return { barrelSpawnRate: 0.01, barrelSpeed: 1.5, startingLives: 5 };
            case 'medium':
            default: return { barrelSpawnRate: 0.02, barrelSpeed: 2, startingLives: 3 };
        }
    };

    const stateRef = useRef({
        player: { x: 40, y: CANVAS_HEIGHT - GRID_SIZE - PLAYER_HEIGHT, dx: 0, dy: 0, onGround: true, facingRight: true },
        barrels: [] as Barrel[],
        kong: { x: 40, y: 60, timer: 0 },
        princess: { x: 200, y: 20 },
        score: 0,
        lives: 3,
        lastTime: 0,
        keys: {} as { [key: string]: boolean }
    });

    const platforms: Platform[] = [
        { x: 0, y: 19, width: 24, slant: 0 }, // Bottom
        { x: 1, y: 15, width: 21, slant: -0.05 },
        { x: 2, y: 11, width: 21, slant: 0.05 },
        { x: 1, y: 7, width: 21, slant: -0.05 },
        { x: 2, y: 3, width: 10, slant: 0 }, // Top
    ];

    const resetGame = () => {
        const settings = getDifficultySettings();
        stateRef.current = {
            player: { x: 40, y: CANVAS_HEIGHT - GRID_SIZE - PLAYER_HEIGHT, dx: 0, dy: 0, onGround: true, facingRight: true },
            barrels: [],
            kong: { x: 40, y: 60, timer: 0 },
            princess: { x: 200, y: 20 },
            score: 0,
            lives: settings.startingLives,
            lastTime: performance.now(),
            keys: {}
        };
        setScore(0);
        setLives(settings.startingLives);
        setGameOver(false);
        setGameWon(false);
        setIsPlaying(true);
    };

    const playerDied = () => {
        playSound(100, 'sawtooth', 0.5); // Death sound
        stateRef.current.lives--;
        setLives(stateRef.current.lives);
        
        if (stateRef.current.lives <= 0) {
            setGameOver(true);
            setIsPlaying(false);
            addHighScore('donkeykong', stateRef.current.score);
        } else {
            stateRef.current.player = { 
                x: 40, 
                y: CANVAS_HEIGHT - GRID_SIZE - PLAYER_HEIGHT, 
                dx: 0, dy: 0, onGround: true, facingRight: true 
            };
        }
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { 
            stateRef.current.keys[e.key] = true; 
            if (e.key === ' ' && stateRef.current.player.onGround && isPlaying && !gameOver && !gameWon) {
                stateRef.current.player.dy = -JUMP_HEIGHT;
                stateRef.current.player.onGround = false;
                playSound(300, 'sine', 0.1); // Jump sound
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => { stateRef.current.keys[e.key] = false; };
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

        const settings = getDifficultySettings();
        let animationFrameId: number;

        const getPlatformY = (x: number, platform: Platform) => {
            const px = platform.x * GRID_SIZE;
            const py = platform.y * GRID_SIZE;
            if (platform.slant) {
                return py + (x - px) * platform.slant;
            }
            return py;
        };

        const gameLoop = (time: number) => {
            const state = stateRef.current;
            const deltaTime = (time - state.lastTime) / 16; // Normalize to ~60fps
            state.lastTime = time;

            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear canvas
            ctx.fillStyle = '#0f172a'; // slate-900
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw platforms
            ctx.strokeStyle = '#dc2626'; // red-600
            ctx.lineWidth = 4;
            platforms.forEach(p => {
                const startX = p.x * GRID_SIZE;
                const endX = (p.x + p.width) * GRID_SIZE;
                const startY = getPlatformY(startX, p);
                const endY = getPlatformY(endX, p);
                
                // Shadow for platform
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(220, 38, 38, 0.5)';
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                
                // Draw girders
                ctx.beginPath();
                ctx.moveTo(startX, startY + 8);
                ctx.lineTo(endX, endY + 8);
                ctx.stroke();
                
                ctx.shadowBlur = 0;
                
                ctx.lineWidth = 2;
                for (let x = startX; x < endX; x += 10) {
                    const y1 = getPlatformY(x, p);
                    const y2 = getPlatformY(x + 5, p) + 8;
                    ctx.beginPath();
                    ctx.moveTo(x, y1);
                    ctx.lineTo(x + 5, y2);
                    ctx.stroke();
                    
                    const y3 = getPlatformY(x + 10, p);
                    ctx.beginPath();
                    ctx.moveTo(x + 5, y2);
                    ctx.lineTo(x + 10, y3);
                    ctx.stroke();
                }
                ctx.lineWidth = 4;
            });

            // Draw Kong
            state.kong.timer += deltaTime;
            const isThrowing = Math.sin(state.kong.timer * 0.1) > 0.5;
            
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#78350f';
            ctx.fillStyle = '#78350f'; // amber-900
            ctx.fillRect(state.kong.x, state.kong.y, 40, 40);
            
            // Kong face
            ctx.fillStyle = '#fcd34d'; // amber-300
            ctx.fillRect(state.kong.x + 8, state.kong.y + 8, 24, 20);
            ctx.fillStyle = 'black';
            ctx.fillRect(state.kong.x + 12, state.kong.y + 12, 4, 4);
            ctx.fillRect(state.kong.x + 24, state.kong.y + 12, 4, 4);
            
            // Kong arms
            ctx.fillStyle = '#78350f';
            if (isThrowing) {
                ctx.fillRect(state.kong.x - 10, state.kong.y + 10, 10, 30);
                ctx.fillRect(state.kong.x + 40, state.kong.y - 10, 10, 30);
            } else {
                ctx.fillRect(state.kong.x - 10, state.kong.y + 10, 10, 30);
                ctx.fillRect(state.kong.x + 40, state.kong.y + 10, 10, 30);
            }
            ctx.restore();

            // Draw Princess
            ctx.fillStyle = '#f472b6'; // pink-400
            ctx.fillRect(state.princess.x, state.princess.y, 16, 24);
            ctx.fillStyle = '#fde047'; // yellow-300 (hair)
            ctx.fillRect(state.princess.x - 2, state.princess.y - 4, 20, 12);

            // Player logic
            const p = state.player;
            p.dx = 0;
            if (state.keys['ArrowLeft']) { p.dx = -MOVE_SPEED; p.facingRight = false; }
            if (state.keys['ArrowRight']) { p.dx = MOVE_SPEED; p.facingRight = true; }

            p.dy += GRAVITY * deltaTime;
            
            // Apply movement
            p.x += p.dx * deltaTime;
            p.y += p.dy * deltaTime;
            
            // Screen bounds
            if (p.x < 0) p.x = 0;
            if (p.x > CANVAS_WIDTH - PLAYER_WIDTH) p.x = CANVAS_WIDTH - PLAYER_WIDTH;

            p.onGround = false;

            // Platform collision
            platforms.forEach(plat => {
                const startX = plat.x * GRID_SIZE;
                const endX = (plat.x + plat.width) * GRID_SIZE;
                
                if (p.x + PLAYER_WIDTH > startX && p.x < endX) {
                    const platY = getPlatformY(p.x + PLAYER_WIDTH/2, plat);
                    
                    // Check if falling onto platform
                    if (p.dy >= 0 && p.y + PLAYER_HEIGHT >= platY && p.y + PLAYER_HEIGHT - p.dy * deltaTime <= platY + 10) {
                        p.y = platY - PLAYER_HEIGHT;
                        p.dy = 0;
                        p.onGround = true;
                    }
                }
            });

            // Draw player
            ctx.fillStyle = '#3b82f6'; // blue-500 (overalls)
            ctx.fillRect(p.x, p.y + 8, PLAYER_WIDTH, PLAYER_HEIGHT - 8);
            ctx.fillStyle = '#ef4444'; // red-500 (shirt/hat)
            ctx.fillRect(p.x + 2, p.y, PLAYER_WIDTH - 4, 8);
            ctx.fillRect(p.facingRight ? p.x + 8 : p.x, p.y, 8, 4); // hat brim
            
            // Face
            ctx.fillStyle = '#fcd34d';
            ctx.fillRect(p.facingRight ? p.x + 8 : p.x + 2, p.y + 4, 6, 6);

            // Barrel logic
            if (Math.random() < settings.barrelSpawnRate * deltaTime) {
                state.barrels.push({ 
                    x: state.kong.x + 50, 
                    y: state.kong.y + 20, 
                    dx: settings.barrelSpeed, 
                    dy: 0, 
                    onGround: false,
                    rotation: 0
                });
            }
            
            const newBarrels: Barrel[] = [];
            
            state.barrels.forEach(b => {
                b.dy += GRAVITY * deltaTime;
                b.x += b.dx * deltaTime;
                b.y += b.dy * deltaTime;
                b.rotation += b.dx * 0.1 * deltaTime;
                b.onGround = false;

                // Platform collision for barrels
                platforms.forEach(plat => {
                    const startX = plat.x * GRID_SIZE;
                    const endX = (plat.x + plat.width) * GRID_SIZE;
                    
                    if (b.x > startX && b.x < endX) {
                        const platY = getPlatformY(b.x, plat);
                        
                        if (b.dy >= 0 && b.y + BARREL_RADIUS >= platY && b.y + BARREL_RADIUS - b.dy * deltaTime <= platY + 10) {
                            b.y = platY - BARREL_RADIUS;
                            b.dy = 0;
                            b.onGround = true;
                            
                            // Adjust direction based on slant or edges
                            if (plat.slant && plat.slant > 0) b.dx = -settings.barrelSpeed;
                            else if (plat.slant && plat.slant < 0) b.dx = settings.barrelSpeed;
                            
                            // Fall off edges
                            if (b.x <= startX + 5) b.dx = settings.barrelSpeed;
                            if (b.x >= endX - 5) b.dx = -settings.barrelSpeed;
                        }
                    }
                });

                // Keep barrel if on screen
                if (b.y < CANVAS_HEIGHT + 20) {
                    newBarrels.push(b);
                }

                // Draw barrel
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.rotation);
                
                ctx.fillStyle = '#b45309'; // amber-700
                ctx.beginPath();
                ctx.arc(0, 0, BARREL_RADIUS, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = '#fcd34d'; // amber-300
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-BARREL_RADIUS, 0);
                ctx.lineTo(BARREL_RADIUS, 0);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, -BARREL_RADIUS);
                ctx.lineTo(0, BARREL_RADIUS);
                ctx.stroke();
                
                ctx.restore();

                // Collision: player vs barrel
                const dist = Math.hypot(p.x + PLAYER_WIDTH/2 - b.x, p.y + PLAYER_HEIGHT/2 - b.y);
                if (dist < (PLAYER_WIDTH/2 + BARREL_RADIUS - 2)) {
                    playerDied();
                } else if (dist < 40 && p.y < b.y - 10 && p.dy > 0 && !b.onGround) {
                    // Score for jumping over barrel
                    state.score += 100;
                    setScore(state.score);
                    addCoins(10);
                    playSound(400, 'sine', 0.1); // Score sound
                }
            });
            
            state.barrels = newBarrels;
            
            // Win condition
            if (Math.hypot(p.x + PLAYER_WIDTH/2 - (state.princess.x + 8), p.y + PLAYER_HEIGHT/2 - (state.princess.y + 12)) < 30) {
                setGameWon(true);
                setIsPlaying(false);
                state.score += 2000;
                setScore(state.score);
                addCoins(200);
                addHighScore('donkeykong', state.score);
                playSound(800, 'square', 0.5); // Win sound
            }

            // Score over time
            if (Math.random() < 0.02 * deltaTime) {
                state.score += 10;
                setScore(state.score);
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };
        
        stateRef.current.lastTime = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying, gameOver, gameWon, difficulty]);

    const handleMobileControl = (action: string) => {
        if (!isPlaying || gameOver || gameWon) return;
        const state = stateRef.current;
        
        // Reset horizontal movement
        if (action !== 'left' && action !== 'right') {
            state.keys['ArrowLeft'] = false;
            state.keys['ArrowRight'] = false;
        }

        switch (action) {
            case 'left': 
                state.keys['ArrowLeft'] = true; 
                state.keys['ArrowRight'] = false;
                break;
            case 'right': 
                state.keys['ArrowRight'] = true; 
                state.keys['ArrowLeft'] = false;
                break;
            case 'action': 
                if (state.player.onGround) {
                    state.player.dy = -JUMP_HEIGHT;
                    state.player.onGround = false;
                    playSound(300, 'sine', 0.1);
                }
                break;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
            <div className="w-full max-w-lg flex justify-between items-center px-4">
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    &larr; Back
                </button>
                <div className="flex flex-col items-end text-white font-mono">
                    <div className="text-xl font-bold text-orange-400">SCORE: {score}</div>
                    <div className="text-sm text-red-400">LIVES: {lives}</div>
                </div>
            </div>
            
            <div className="relative p-2 bg-slate-800 rounded-xl border-4 border-slate-700 shadow-2xl">
                <canvas 
                    ref={canvasRef} 
                    width={CANVAS_WIDTH} 
                    height={CANVAS_HEIGHT} 
                    className="bg-slate-900 rounded-lg shadow-inner" 
                />
                
                {!isPlaying && !gameOver && !gameWon && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
                        <button onClick={resetGame} className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(234,88,12,0.5)] transition-all hover:scale-105">
                            START GAME
                        </button>
                    </div>
                )}
                
                {(gameOver || gameWon) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg gap-4">
                        <h3 className={`text-4xl font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] ${gameWon ? 'text-yellow-400' : 'text-red-500'}`}>
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
            
            <div className="hidden md:block text-gray-500 text-sm">Arrow keys to move, Space to jump</div>
            <div className="md:hidden w-full max-w-sm mt-4">
                <MobileControls onAction={handleMobileControl} />
            </div>
        </div>
    );
};
