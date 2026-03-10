import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';
import { MobileControls } from '../components/MobileControls';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 500;
const PLAYER_SPEED = 4;
const BULLET_SPEED = 8;
const ENEMY_BULLET_SPEED = 5;

interface GameObject {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Player extends GameObject { facingRight: boolean; }
interface Enemy extends GameObject { type: number; dx: number; dy: number; state: 'diving' | 'formation'; diveTimer: number; animationFrame: number; }
interface Bullet extends GameObject { dy: number; }

export const Galaga: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addCoins, difficulty } = useGame();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const getDifficultySettings = () => {
        switch (difficulty) {
            case 'hard': return { enemySpeed: 1.5, enemyFireRate: 0.002, startingLives: 2, diveFrequency: 300 };
            case 'easy': return { enemySpeed: 0.7, enemyFireRate: 0.0005, startingLives: 5, diveFrequency: 800 };
            case 'medium':
            default: return { enemySpeed: 1, enemyFireRate: 0.001, startingLives: 3, diveFrequency: 500 };
        }
    };

    const stateRef = useRef({
        player: { x: CANVAS_WIDTH / 2 - 15, y: CANVAS_HEIGHT - 40, width: 30, height: 20, facingRight: true },
        enemies: [] as Enemy[],
        bullets: [] as Bullet[],
        enemyBullets: [] as Bullet[],
        score: 0,
        lives: 3,
        lastTime: 0,
        keys: {} as { [key: string]: boolean },
        enemyMoveDirection: 1,
        enemyMoveTimer: 0,
        enemyMoveInterval: 1000
    });

    const createEnemies = () => {
        const newEnemies: Enemy[] = [];
        const settings = getDifficultySettings();
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 8; col++) {
                newEnemies.push({
                    x: col * 40 + 40,
                    y: row * 40 + 50,
                    width: 30,
                    height: 20,
                    type: row % 2,
                    dx: settings.enemySpeed,
                    dy: 0,
                    state: 'formation',
                    diveTimer: Math.random() * settings.diveFrequency + settings.diveFrequency / 2,
                    animationFrame: 0
                });
            }
        }
        return newEnemies;
    };

    const resetGame = () => {
        const settings = getDifficultySettings();
        stateRef.current = {
            player: { x: CANVAS_WIDTH / 2 - 15, y: CANVAS_HEIGHT - 40, width: 30, height: 20, facingRight: true },
            enemies: createEnemies(),
            bullets: [],
            enemyBullets: [],
            score: 0,
            lives: settings.startingLives,
            lastTime: performance.now(),
            keys: {},
            enemyMoveDirection: 1,
            enemyMoveTimer: 0,
            enemyMoveInterval: 1000
        };
        setScore(0);
        setLives(settings.startingLives);
        setGameOver(false);
        setGameWon(false);
        setIsPlaying(true);
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            stateRef.current.keys[e.key] = true;
            if (e.key === ' ' && isPlaying && !gameOver && !gameWon) {
                e.preventDefault();
                stateRef.current.bullets.push({ x: stateRef.current.player.x + stateRef.current.player.width / 2 - 2, y: stateRef.current.player.y, width: 4, height: 10, dy: -BULLET_SPEED });
                playSound(400, 'square', 0.1); // Player shoot sound
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

        const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
            ctx.fillStyle = '#3b82f6'; // blue-500
            ctx.beginPath();
            ctx.moveTo(player.x, player.y + player.height);
            ctx.lineTo(player.x + player.width / 2, player.y);
            ctx.lineTo(player.x + player.width, player.y + player.height);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#fde047'; // yellow-300
            ctx.fillRect(player.x + player.width / 2 - 2, player.y + player.height / 2, 4, player.height / 2);
        };

        const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
            const color = enemy.type === 0 ? '#f43f5e' : '#84cc16'; // rose or lime
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, enemy.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Wings
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y + enemy.height / 2);
            ctx.lineTo(enemy.x - 10 + Math.sin(enemy.animationFrame * 0.1) * 5, enemy.y + enemy.height / 2 - 5);
            ctx.moveTo(enemy.x + enemy.width, enemy.y + enemy.height / 2);
            ctx.lineTo(enemy.x + enemy.width + 10 - Math.sin(enemy.animationFrame * 0.1) * 5, enemy.y + enemy.height / 2 - 5);
            ctx.stroke();
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

            // Player logic
            const p = state.player;
            if (state.keys['ArrowLeft'] && p.x > 0) { p.x -= PLAYER_SPEED * deltaTime; p.facingRight = false; }
            if (state.keys['ArrowRight'] && p.x < CANVAS_WIDTH - p.width) { p.x += PLAYER_SPEED * deltaTime; p.facingRight = true; }
            drawPlayer(ctx, p);

            // Bullets logic
            state.bullets = state.bullets.map(b => ({ ...b, y: b.y + b.dy * deltaTime })).filter(b => b.y > 0);
            state.bullets.forEach(b => {
                ctx.fillStyle = '#fff';
                ctx.fillRect(b.x, b.y, b.width, b.height);
            });

            // Enemy bullets logic
            state.enemyBullets = state.enemyBullets.map(b => ({ ...b, y: b.y + b.dy * deltaTime })).filter(b => b.y < CANVAS_HEIGHT);
            state.enemyBullets.forEach((b, bIndex) => {
                ctx.fillStyle = '#f87171'; // red-400
                ctx.fillRect(b.x, b.y, b.width, b.height);
                if (b.x < p.x + p.width && b.x + b.width > p.x && b.y < p.y + p.height && b.y + b.height > p.y) {
                    playSound(100, 'sawtooth', 0.5); // Player hit sound
                    state.lives--;
                    setLives(state.lives);
                    state.enemyBullets.splice(bIndex, 1); // Remove bullet
                    if (state.lives <= 0) {
                        setGameOver(true);
                        setIsPlaying(false);
                        addHighScore('galaga', state.score);
                    }
                }
            });

            // Enemies logic
            state.enemyMoveTimer += deltaTime;
            if (state.enemyMoveTimer > state.enemyMoveInterval) {
                state.enemyMoveDirection *= -1;
                state.enemyMoveTimer = 0;
            }

            state.enemies.forEach((e, eIndex) => {
                e.animationFrame += deltaTime;
                if (e.state === 'formation') {
                    e.x += e.dx * state.enemyMoveDirection * deltaTime;
                    if (e.x < 0 || e.x > CANVAS_WIDTH - e.width) {
                        state.enemies.forEach(en => en.dx *= -1); // Reverse all enemies
                    }
                    e.diveTimer -= deltaTime;
                    if (e.diveTimer <= 0) {
                        e.state = 'diving';
                        e.dy = settings.enemySpeed * 2;
                        e.dx = (p.x - e.x) / 100; // Dive towards player
                        playSound(200, 'triangle', 0.1); // Enemy dive sound
                    }
                } else { // Diving
                    e.y += e.dy * deltaTime;
                    e.x += e.dx * deltaTime;
                    if (e.y > CANVAS_HEIGHT) {
                        e.y = -20;
                        e.state = 'formation';
                        e.diveTimer = Math.random() * settings.diveFrequency + settings.diveFrequency / 2;
                        e.dx = settings.enemySpeed;
                    }
                }
                drawEnemy(ctx, e);

                if (Math.random() < settings.enemyFireRate * deltaTime) {
                    state.enemyBullets.push({ x: e.x + e.width / 2 - 2, y: e.y + e.height, width: 4, height: 10, dy: ENEMY_BULLET_SPEED });
                    playSound(150, 'sine', 0.05); // Enemy shoot sound
                }

                // Collision: bullets vs enemies
                state.bullets.forEach((b, bIndex) => {
                    if (b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
                        playSound(300, 'square', 0.2); // Enemy hit sound
                        state.enemies.splice(eIndex, 1); // Remove enemy
                        state.bullets.splice(bIndex, 1); // Remove bullet
                        state.score += 50;
                        setScore(state.score);
                        addCoins(5);
                    }
                });
            });

            if (state.enemies.length === 0) {
                setGameWon(true);
                setIsPlaying(false);
                state.score += 2000;
                setScore(state.score);
                addCoins(200);
                addHighScore('galaga', state.score);
                playSound(800, 'square', 0.5); // Win sound
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
                state.bullets.push({ x: state.player.x + state.player.width / 2 - 2, y: state.player.y, width: 4, height: 10, dy: -BULLET_SPEED });
                playSound(400, 'square', 0.1);
                break;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
            <div className="w-full max-w-md flex justify-between items-center px-4">
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    &larr; Back
                </button>
                <div className="flex flex-col items-end text-white font-mono">
                    <div className="text-xl font-bold text-pink-400">SCORE: {score}</div>
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
                        <button onClick={resetGame} className="px-8 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(217,70,239,0.5)] transition-all hover:scale-105">
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
            
            <div className="hidden md:block text-gray-500 text-sm">Arrow keys to move, Space to fire</div>
            <div className="md:hidden w-full max-w-sm mt-4">
                <MobileControls onAction={handleMobileControl} />
            </div>
        </div>
    );
};
