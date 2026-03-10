import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw, Heart } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';
import { MobileControls } from '../components/MobileControls';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const GRAVITY = 0.5;
const PLAYER_JUMP_VELOCITY = -10;
const PLAYER_MOVE_SPEED = 3;

interface GameObject { x: number; y: number; width: number; height: number; }
interface Player extends GameObject { dx: number; dy: number; onGround: boolean; facingRight: boolean; }
interface Enemy extends GameObject { dx: number; }

const level = [
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '        P                       ',
    'XXXXXXXXXXXXXXXXX   XXXXXXXXXXXX',
    '                                ',
    '                                ',
    '    XXXXX               XXXXX   ',
    '                                ',
    '               E                ',
    'XXXXXXXXX   XXXXXXXXXXXX   XXXXX',
];

export const Mario: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addCoins, difficulty } = useGame();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const getDifficultySettings = () => {
        switch (difficulty) {
            case 'hard': return { enemySpeed: 1.5, startingLives: 2, playerJump: 1.1 };
            case 'easy': return { enemySpeed: 0.7, startingLives: 5, playerJump: 0.9 };
            case 'medium':
            default: return { enemySpeed: 1, startingLives: 3, playerJump: 1 };
        }
    };

    const stateRef = useRef({
        player: { x: 0, y: 0, width: 32, height: 32, dx: 0, dy: 0, onGround: false, facingRight: true } as Player,
        platforms: [] as GameObject[],
        enemies: [] as Enemy[],
        score: 0,
        lives: 3,
        lastTime: 0,
        keys: {} as { [key: string]: boolean },
    });

    useEffect(() => {
        if (gameOver || gameWon) {
            if (gameOver) playSound(100, 'sawtooth', 0.5); // Game over sound
            if (gameWon) playSound(800, 'square', 0.5); // Win sound
            addHighScore('mario', stateRef.current.score);
        }
    }, [gameOver, gameWon]);

    const parseLevel = () => {
        const newPlatforms: GameObject[] = [];
        const newEnemies: Enemy[] = [];
        const settings = getDifficultySettings();
        let playerStartX = 0;
        let playerStartY = 0;

        level.forEach((row, y) => {
            for (let x = 0; x < row.length; x++) {
                if (row[x] === 'X') {
                    newPlatforms.push({ x: x * 32, y: y * 32, width: 32, height: 32 });
                } else if (row[x] === 'P') {
                    playerStartX = x * 32;
                    playerStartY = y * 32;
                } else if (row[x] === 'E') {
                    newEnemies.push({ x: x * 32, y: y * 32, width: 32, height: 32, dx: -settings.enemySpeed });
                }
            }
        });
        stateRef.current.platforms = newPlatforms;
        stateRef.current.enemies = newEnemies;
        stateRef.current.player = { ...stateRef.current.player, x: playerStartX, y: playerStartY, dx: 0, dy: 0, onGround: false };
    };

    const resetGame = () => {
        const settings = getDifficultySettings();
        stateRef.current.score = 0;
        stateRef.current.lives = settings.startingLives;
        setScore(0);
        setLives(settings.startingLives);
        setGameOver(false);
        setGameWon(false);
        setIsPlaying(true);
        parseLevel();
    };

    useEffect(() => {
        resetGame();
    }, []);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { stateRef.current.keys[e.key] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { stateRef.current.keys[e.key] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Game loop
    useEffect(() => {
        if (!isPlaying || gameOver || gameWon) return;

        const settings = getDifficultySettings();
        let animationFrameId: number;

        const gameLoop = (time: number) => {
            const state = stateRef.current;
            const deltaTime = (time - state.lastTime) / 16; // Normalize to ~60fps
            state.lastTime = time;

            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Background
            ctx.fillStyle = '#60a5fa'; // Sky blue
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Player logic
            const p = state.player;
            p.dx = 0;
            if (state.keys['ArrowLeft'] || state.keys['a']) { p.dx = -PLAYER_MOVE_SPEED; p.facingRight = false; }
            else if (state.keys['ArrowRight'] || state.keys['d']) { p.dx = PLAYER_MOVE_SPEED; p.facingRight = true; }
            if ((state.keys[' '] || state.keys['w'] || state.keys['ArrowUp']) && p.onGround) {
                p.dy = PLAYER_JUMP_VELOCITY * settings.playerJump;
                p.onGround = false;
                playSound(400, 'triangle', 0.1); // Jump sound
            }

            p.dy += GRAVITY * deltaTime;
            p.x += p.dx * deltaTime;
            p.y += p.dy * deltaTime;
            p.onGround = false;

            // Collision with platforms
            state.platforms.forEach(plat => {
                if (p.x < plat.x + plat.width && p.x + p.width > plat.x &&
                    p.y < plat.y + plat.height && p.y + p.height > plat.y) {
                    // Collision from top
                    if (p.dy > 0 && p.y + p.height - p.dy * deltaTime <= plat.y) {
                        p.y = plat.y - p.height;
                        p.dy = 0;
                        p.onGround = true;
                    }
                    // Collision from bottom
                    else if (p.dy < 0 && p.y - p.dy * deltaTime >= plat.y + plat.height) {
                        p.y = plat.y + plat.height;
                        p.dy = 0;
                    }
                    // Collision from sides
                    else if (p.dx > 0 && p.x + p.width - p.dx * deltaTime <= plat.x) {
                        p.x = plat.x - p.width;
                        p.dx = 0;
                    }
                    else if (p.dx < 0 && p.x - p.dx * deltaTime >= plat.x + plat.width) {
                        p.x = plat.x + plat.width;
                        p.dx = 0;
                    }
                }
            });

            // Keep player in bounds
            if (p.x < 0) p.x = 0;
            if (p.x + p.width > CANVAS_WIDTH) p.x = CANVAS_WIDTH - p.width;

            // Draw platforms
            state.platforms.forEach(plat => {
                const grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.height);
                grad.addColorStop(0, '#a16207');
                grad.addColorStop(1, '#78350f');
                ctx.fillStyle = grad;
                ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
                
                ctx.strokeStyle = '#451a03';
                ctx.lineWidth = 2;
                ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
                
                // Add some detail to blocks
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(plat.x + 4, plat.y + 4, plat.width - 8, 4);
            });

            // Draw player
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ef4444';
            ctx.fillStyle = '#ef4444'; // Red
            ctx.fillRect(p.x, p.y, p.width, p.height);
            // Simple facing indicator
            ctx.fillStyle = '#000';
            ctx.fillRect(p.x + (p.facingRight ? p.width * 0.6 : p.width * 0.1), p.y + p.height * 0.2, p.width * 0.2, p.height * 0.2);
            ctx.restore();

            // Enemies logic
            state.enemies.forEach((e, eIndex) => {
                e.x += e.dx * deltaTime;
                if (e.x < 0 || e.x + e.width > CANVAS_WIDTH) e.dx *= -1;

                // Enemy-platform collision (simple for now)
                state.platforms.forEach(plat => {
                    if (e.x < plat.x + plat.width && e.x + e.width > plat.x &&
                        e.y + e.height > plat.y && e.y < plat.y + plat.height) {
                        // If enemy hits side of platform, reverse direction
                        if (e.x + e.width - e.dx * deltaTime <= plat.x || e.x - e.dx * deltaTime >= plat.x + plat.width) {
                            e.dx *= -1;
                        }
                    }
                });

                ctx.save();
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#166534';
                ctx.fillStyle = '#166534'; // Green
                ctx.fillRect(e.x, e.y, e.width, e.height);
                // Simple eyes for enemy
                ctx.fillStyle = '#000';
                ctx.fillRect(e.x + e.width * 0.2, e.y + e.height * 0.2, e.width * 0.2, e.height * 0.2);
                ctx.fillRect(e.x + e.width * 0.6, e.y + e.height * 0.2, e.width * 0.2, e.height * 0.2);
                ctx.restore();

                // Player-enemy collision
                if (p.x < e.x + e.width && p.x + p.width > e.x &&
                    p.y < e.y + e.height && p.y + p.height > e.y) {
                    // Stomp on enemy
                    if (p.dy > 0 && p.y + p.height - p.dy * deltaTime <= e.y) {
                        state.enemies.splice(eIndex, 1);
                        state.score += 100;
                        setScore(state.score);
                        addCoins(10);
                        p.dy = PLAYER_JUMP_VELOCITY * 0.7; // Small bounce
                        playSound(600, 'sine', 0.2); // Stomp sound
                    } else {
                        // Player hit by enemy
                        state.lives--;
                        setLives(state.lives);
                        playSound(100, 'sawtooth', 0.5); // Player hit sound
                        if (state.lives <= 0) {
                            setGameOver(true);
                            setIsPlaying(false);
                        } else {
                            parseLevel(); // Reset level on hit
                        }
                    }
                }
            });

            // Player falls off screen
            if (p.y > CANVAS_HEIGHT) {
                state.lives--;
                setLives(state.lives);
                playSound(100, 'sawtooth', 0.5); // Player hit sound
                if (state.lives <= 0) {
                    setGameOver(true);
                    setIsPlaying(false);
                } else {
                    parseLevel();
                }
            }

            // Check for win condition (e.g., all enemies defeated)
            if (state.enemies.length === 0 && !gameWon) {
                setGameWon(true);
                setIsPlaying(false);
                state.score += 500;
                setScore(state.score);
                addCoins(50);
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        stateRef.current.lastTime = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying, gameOver, gameWon, difficulty, addCoins]);

    const handleMobileControl = (action: string) => {
        if (!isPlaying || gameOver || gameWon) return;
        const state = stateRef.current;

        // Reset movement keys
        state.keys['ArrowLeft'] = false;
        state.keys['ArrowRight'] = false;
        state.keys[' '] = false;
        state.keys['w'] = false;
        state.keys['ArrowUp'] = false;

        switch (action) {
            case 'left': state.keys['ArrowLeft'] = true; break;
            case 'right': state.keys['ArrowRight'] = true; break;
            case 'up': state.keys['ArrowUp'] = true; state.keys['w'] = true; break; // Jump
            case 'action': state.keys[' '] = true; break; // Jump (alternative)
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
            <div className="w-full max-w-2xl flex justify-between items-center px-4">
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    &larr; Back
                </button>
                <div className="flex items-center gap-6 text-white font-mono">
                    <span>SCORE: {score}</span>
                    <div className="flex items-center gap-1">
                        <span className="text-red-400">LIVES:</span>
                        {Array(Math.max(0, lives)).fill(0).map((_, i) => <Heart key={i} className="w-4 h-4 text-red-500 fill-current drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />)}
                    </div>
                </div>
            </div>
            <div className="relative p-2 bg-gray-800 rounded-xl border-4 border-gray-600 shadow-2xl">
                <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-blue-400 rounded-lg shadow-inner" />
                {!isPlaying && !gameOver && !gameWon && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
                        <button onClick={resetGame} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all hover:scale-105">
                            START GAME
                        </button>
                    </div>
                )}
                {(gameOver || gameWon) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg gap-4">
                        <h3 className={`text-4xl font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] ${gameWon ? 'text-green-400' : 'text-red-500'}`}>
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
            <div className="hidden md:block text-gray-500 text-sm">Arrow keys to move, Space or W/ArrowUp to jump</div>
            <div className="md:hidden w-full max-w-sm mt-4">
                <MobileControls onAction={handleMobileControl} />
            </div>
        </div>
    );
};
