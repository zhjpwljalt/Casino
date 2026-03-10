import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';
import { MobileControls } from '../components/MobileControls';

const CANVAS_WIDTH = 448;
const CANVAS_HEIGHT = 512;
const GRID_SIZE = 32;
const COLS = CANVAS_WIDTH / GRID_SIZE;
const ROWS = CANVAS_HEIGHT / GRID_SIZE;
const PLAYER_SPEED = 2;
const ENEMY_SPEED_MULTIPLIER = 0.5;

interface GridCell {
    dug: boolean;
}

interface Character {
    x: number;
    y: number;
    dx: number;
    dy: number;
    facingRight: boolean;
}

interface Enemy extends Character {
    id: number;
    type: 'pooka' | 'fygar';
    isGhost: boolean;
    pumpLevel: number;
    targetX: number;
    targetY: number;
}

export const DigDug: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addCoins, difficulty } = useGame();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const getDifficultySettings = () => {
        switch (difficulty) {
            case 'hard': return { numEnemies: 5, enemySpeed: 1.2, startingLives: 2, pumpDuration: 200 };
            case 'easy': return { numEnemies: 2, enemySpeed: 0.8, startingLives: 5, pumpDuration: 400 };
            case 'medium':
            default: return { numEnemies: 3, enemySpeed: 1, startingLives: 3, pumpDuration: 300 };
        }
    };

    const stateRef = useRef({
        grid: Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ dug: false }))),
        player: { x: 7, y: 7, dx: 0, dy: 0, facingRight: true },
        enemies: [] as Enemy[],
        score: 0,
        lives: 3,
        lastTime: 0,
        keys: {} as { [key: string]: boolean },
        pumpActive: false,
        pumpTimer: 0,
        pumpDirection: 'right',
        gameOver: false,
        gameWon: false,
        isPlaying: false,
    });

    useEffect(() => {
        if (stateRef.current.gameOver || stateRef.current.gameWon) {
            if (stateRef.current.gameOver) playSound(100, 'sawtooth', 0.5); // Game over sound
            if (stateRef.current.gameWon) playSound(800, 'square', 0.5); // Win sound
            addHighScore('digdug', stateRef.current.score);
        }
    }, [gameOver, gameWon]);

    const createGrid = () => {
        const newGrid = Array.from({ length: ROWS }, () =>
            Array.from({ length: COLS }, () => ({ dug: false }))
        );
        // Create initial tunnels
        newGrid[7][7].dug = true;
        return newGrid;
    };

    const createEnemies = () => {
        const settings = getDifficultySettings();
        const newEnemies: Enemy[] = [];
        for (let i = 0; i < settings.numEnemies; i++) {
            newEnemies.push({
                id: i + 1,
                x: Math.floor(Math.random() * COLS),
                y: Math.floor(Math.random() * ROWS),
                dx: 0,
                dy: 0,
                facingRight: true,
                type: Math.random() > 0.5 ? 'pooka' : 'fygar',
                isGhost: false,
                pumpLevel: 0,
                targetX: 0,
                targetY: 0
            });
        }
        return newEnemies;
    };

    const resetGame = () => {
        const settings = getDifficultySettings();
        stateRef.current = {
            grid: createGrid(),
            player: { x: 7, y: 7, dx: 0, dy: 0, facingRight: true },
            enemies: createEnemies(),
            score: 0,
            lives: settings.startingLives,
            lastTime: performance.now(),
            keys: {},
            pumpActive: false,
            pumpTimer: 0,
            pumpDirection: 'right',
            gameOver: false,
            gameWon: false,
            isPlaying: true
        };
        setScore(0);
        setLives(settings.startingLives);
        setGameOver(false);
        setGameWon(false);
        setIsPlaying(true);
    };

    useEffect(() => {
        resetGame();
    }, []);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            stateRef.current.keys[e.key] = true;
            if (e.key === ' ' && stateRef.current.isPlaying && !stateRef.current.gameOver && !stateRef.current.gameWon) {
                e.preventDefault();
                stateRef.current.pumpActive = true;
                stateRef.current.pumpTimer = getDifficultySettings().pumpDuration;
                playSound(400, 'square', 0.1); // Pump sound
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
        if (!stateRef.current.isPlaying || stateRef.current.gameOver || stateRef.current.gameWon) return;

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

            // Clear canvas
            ctx.fillStyle = '#854d0e'; // Dirt color
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw tunnels
            state.grid.forEach((row, y) => {
                row.forEach((cell, x) => {
                    if (cell.dug) {
                        ctx.fillStyle = '#000';
                        ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                    }
                });
            });

            // Player movement
            const p = state.player;
            p.dx = 0;
            p.dy = 0;

            if (state.keys['ArrowUp']) { p.dy = -PLAYER_SPEED; p.facingRight = p.facingRight; state.pumpDirection = 'up'; }
            if (state.keys['ArrowDown']) { p.dy = PLAYER_SPEED; p.facingRight = p.facingRight; state.pumpDirection = 'down'; }
            if (state.keys['ArrowLeft']) { p.dx = -PLAYER_SPEED; p.facingRight = false; state.pumpDirection = 'left'; }
            if (state.keys['ArrowRight']) { p.dx = PLAYER_SPEED; p.facingRight = true; state.pumpDirection = 'right'; }

            const newPlayerX = p.x + p.dx * deltaTime / GRID_SIZE;
            const newPlayerY = p.y + p.dy * deltaTime / GRID_SIZE;

            if (newPlayerX >= 0 && newPlayerX < COLS && newPlayerY >= 0 && newPlayerY < ROWS) {
                p.x = newPlayerX;
                p.y = newPlayerY;
                const gridX = Math.floor(p.x);
                const gridY = Math.floor(p.y);
                if (!state.grid[gridY][gridX].dug) {
                    state.grid[gridY][gridX].dug = true;
                    state.score += 10;
                    setScore(state.score);
                    addCoins(1);
                    playSound(200, 'sine', 0.1); // Dig sound
                }
            }

            // Draw Player
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(p.x * GRID_SIZE, p.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);

            // Enemy logic
            state.enemies.forEach((enemy, enemyIndex) => {
                const enemySettings = settings.enemySpeed * ENEMY_SPEED_MULTIPLIER;

                // Enemy AI: Simple pathfinding towards player through dug tunnels
                if (enemy.isGhost) {
                    // Ghost enemies can move through dirt
                    const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
                    enemy.x += Math.cos(angle) * enemySettings * deltaTime / GRID_SIZE;
                    enemy.y += Math.sin(angle) * enemySettings * deltaTime / GRID_SIZE;
                } else {
                    // Non-ghost enemies follow dug paths
                    const currentGridX = Math.round(enemy.x);
                    const currentGridY = Math.round(enemy.y);

                    if (currentGridX === enemy.targetX && currentGridY === enemy.targetY) {
                        // Find a new random dug adjacent cell to move to
                        const possibleMoves = [];
                        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                        for (const [dx, dy] of directions) {
                            const nextX = currentGridX + dx;
                            const nextY = currentGridY + dy;
                            if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS && state.grid[nextY][nextX].dug) {
                                possibleMoves.push({ x: nextX, y: nextY });
                            }
                        }
                        if (possibleMoves.length > 0) {
                            const nextMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                            enemy.targetX = nextMove.x;
                            enemy.targetY = nextMove.y;
                        } else {
                            // If stuck, try to become ghost for a short period
                            enemy.isGhost = true;
                            setTimeout(() => enemy.isGhost = false, 1000);
                        }
                    }

                    // Move towards target
                    const angle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
                    enemy.x += Math.cos(angle) * enemySettings * deltaTime / GRID_SIZE;
                    enemy.y += Math.sin(angle) * enemySettings * deltaTime / GRID_SIZE;
                }

                // Pumping logic
                if (state.pumpActive) {
                    const pumpRange = 1.5; // Range in grid units
                    const playerGridX = Math.floor(p.x);
                    const playerGridY = Math.floor(p.y);

                    let targetEnemyX = enemy.x;
                    let targetEnemyY = enemy.y;

                    // Adjust target based on pump direction
                    switch (state.pumpDirection) {
                        case 'right': targetEnemyX = p.x + pumpRange; break;
                        case 'left': targetEnemyX = p.x - pumpRange; break;
                        case 'up': targetEnemyY = p.y - pumpRange; break;
                        case 'down': targetEnemyY = p.y + pumpRange; break;
                    }

                    const dist = Math.hypot(targetEnemyX - enemy.x, targetEnemyY - enemy.y);

                    if (dist < pumpRange && enemy.pumpLevel < 3) {
                        enemy.pumpLevel += 0.05 * deltaTime; // Increase pump level gradually
                        if (enemy.pumpLevel >= 3) {
                            playSound(600, 'square', 0.3); // Enemy burst sound
                            state.enemies.splice(enemyIndex, 1); // Remove enemy
                            state.score += 200;
                            setScore(state.score);
                            addCoins(10);
                        }
                    }
                }

                // Collision: player vs enemy
                const distToPlayer = Math.hypot(p.x - enemy.x, p.y - enemy.y);
                if (distToPlayer < 0.8 && enemy.pumpLevel < 3) { // Player hit
                    playSound(100, 'sawtooth', 0.5); // Player hit sound
                    state.lives--;
                    setLives(state.lives);
                    if (state.lives <= 0) {
                        state.gameOver = true;
                        setGameOver(true);
                        state.isPlaying = false;
                    } else {
                        // Reset player position
                        p.x = 7;
                        p.y = 7;
                    }
                }

                // Draw Enemy
                ctx.fillStyle = enemy.type === 'pooka' ? '#ef4444' : '#16a34a';
                ctx.beginPath();
                ctx.arc(enemy.x * GRID_SIZE + GRID_SIZE / 2, enemy.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE / 2, 0, 2 * Math.PI);
                ctx.fill();

                // Draw Pooka eyes/Fygar flame
                if (enemy.type === 'pooka') {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(enemy.x * GRID_SIZE + GRID_SIZE / 4, enemy.y * GRID_SIZE + GRID_SIZE / 3, GRID_SIZE / 8, GRID_SIZE / 8);
                    ctx.fillRect(enemy.x * GRID_SIZE + GRID_SIZE * 3 / 4 - GRID_SIZE / 8, enemy.y * GRID_SIZE + GRID_SIZE / 3, GRID_SIZE / 8, GRID_SIZE / 8);
                } else { // Fygar
                    if (Math.sin(time * 0.01) > 0) {
                        ctx.fillStyle = '#fde047'; // yellow-300
                        ctx.beginPath();
                        ctx.arc(enemy.x * GRID_SIZE + GRID_SIZE / 2, enemy.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE / 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // Draw pump level
                if (enemy.pumpLevel > 0) {
                    ctx.fillStyle = 'rgba(255,255,255,0.7)';
                    ctx.fillRect(enemy.x * GRID_SIZE, enemy.y * GRID_SIZE - 5, GRID_SIZE * (enemy.pumpLevel / 3), 3);
                }
            });

            // Pump timer
            if (state.pumpActive) {
                state.pumpTimer -= deltaTime;
                if (state.pumpTimer <= 0) {
                    state.pumpActive = false;
                    state.pumpTimer = 0;
                }
            }

            if (state.enemies.length === 0) {
                state.gameWon = true;
                setGameWon(true);
                state.isPlaying = false;
                state.score += 1500;
                setScore(state.score);
                addCoins(150);
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        stateRef.current.lastTime = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [difficulty, gameOver, gameWon]);

    const handleMobileControl = (action: string) => {
        if (!stateRef.current.isPlaying || stateRef.current.gameOver || stateRef.current.gameWon) return;
        const state = stateRef.current;

        // Reset movement keys
        state.keys['ArrowUp'] = false;
        state.keys['ArrowDown'] = false;
        state.keys['ArrowLeft'] = false;
        state.keys['ArrowRight'] = false;

        switch (action) {
            case 'up': state.keys['ArrowUp'] = true; break;
            case 'down': state.keys['ArrowDown'] = true; break;
            case 'left': state.keys['ArrowLeft'] = true; break;
            case 'right': state.keys['ArrowRight'] = true; break;
            case 'action':
                state.pumpActive = true;
                state.pumpTimer = getDifficultySettings().pumpDuration;
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
                    <div className="text-xl font-bold text-yellow-400">SCORE: {score}</div>
                    <div className="text-sm text-red-400">LIVES: {lives}</div>
                </div>
            </div>

            <div className="relative p-2 bg-gray-800 rounded-xl border-4 border-gray-600 shadow-2xl">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="bg-black rounded-lg shadow-inner"
                />
                {!stateRef.current.isPlaying && !stateRef.current.gameOver && !stateRef.current.gameWon && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
                        <button onClick={resetGame} className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all hover:scale-105">
                            START GAME
                        </button>
                    </div>
                )}
                {(stateRef.current.gameOver || stateRef.current.gameWon) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg gap-4">
                        <h3 className={`text-4xl font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] ${stateRef.current.gameWon ? 'text-green-400' : 'text-red-500'}`}>
                            {stateRef.current.gameWon ? 'YOU WIN!' : 'GAME OVER'}
                        </h3>
                        <p className="text-white text-xl font-mono">Final Score: {score}</p>
                        <button onClick={resetGame} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full font-bold text-lg shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all flex items-center gap-2 hover:scale-105 mt-4">
                            <RefreshCw className="w-5 h-5" />
                            PLAY AGAIN
                        </button>
                    </div>
                )}
            </div>

            <div className="hidden md:block text-gray-500 text-sm">Arrow keys to move, Space to pump</div>
            <div className="md:hidden w-full max-w-sm mt-4">
                <MobileControls onAction={handleMobileControl} actions={['up', 'down', 'left', 'right', 'action']} />
            </div>
        </div>
    );
};
