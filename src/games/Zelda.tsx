import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw, Heart, Sword, Shield, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';
import { MobileControls } from '../components/MobileControls';

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 448;
const TILE_SIZE = 32;
const COLS = CANVAS_WIDTH / TILE_SIZE;
const ROWS = CANVAS_HEIGHT / TILE_SIZE;

// 0: grass, 1: tree, 2: water, 3: player spawn, 4: enemy spawn
const initialMap = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 0, 2, 2, 2, 2, 0, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 4, 2, 0, 0, 2, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 0, 2, 2, 0, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 2, 2, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

interface Character { x: number; y: number; hp: number; maxHp: number; attack: number; direction: 'up' | 'down' | 'left' | 'right'; }
interface Enemy extends Character { id: number; health: number; }

export const Zelda: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addCoins, difficulty } = useGame();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);

    const getDifficultySettings = () => {
        switch (difficulty) {
            case 'hard': return { enemyHealthMultiplier: 1.5, enemyAttackMultiplier: 1.2, playerStartingHp: 80, enemySpeed: 0.015 };
            case 'easy': return { enemyHealthMultiplier: 0.7, enemyAttackMultiplier: 0.8, playerStartingHp: 120, enemySpeed: 0.005 };
            case 'medium':
            default: return { enemyHealthMultiplier: 1, enemyAttackMultiplier: 1, playerStartingHp: 100, enemySpeed: 0.01 };
        }
    };

    const stateRef = useRef({
        player: { x: 0, y: 0, hp: 100, maxHp: 100, attack: 10, direction: 'down' } as Character,
        enemies: [] as Enemy[],
        isAttacking: false,
        score: 0,
        lives: 3,
        gameOver: false,
        gameWon: false,
        isPlaying: false,
        keys: {} as { [key: string]: boolean },
        lastTime: 0,
        attackCooldown: 0,
        playerHitCooldown: 0,
    });

    useEffect(() => {
        if (stateRef.current.gameOver || stateRef.current.gameWon) {
            if (stateRef.current.gameOver) playSound(100, 'sawtooth', 0.5); // Game over sound
            if (stateRef.current.gameWon) playSound(800, 'square', 0.5); // Win sound
            addHighScore('zelda', stateRef.current.score);
        }
    }, [stateRef.current.gameOver, stateRef.current.gameWon]);

    const createEnemies = () => {
        const settings = getDifficultySettings();
        const newEnemies: Enemy[] = [];
        let enemyId = 0;
        initialMap.forEach((row, y) => {
            row.forEach((tile, x) => {
                if (tile === 4) {
                    newEnemies.push({
                        id: enemyId++,
                        x: x,
                        y: y,
                        health: Math.floor(2 * settings.enemyHealthMultiplier),
                        hp: Math.floor(2 * settings.enemyHealthMultiplier),
                        maxHp: Math.floor(2 * settings.enemyHealthMultiplier),
                        attack: Math.floor(5 * settings.enemyAttackMultiplier),
                        direction: 'down',
                    });
                }
            });
        });
        stateRef.current.enemies = newEnemies;
    };

    const resetGame = () => {
        const settings = getDifficultySettings();
        let playerStartX = 0;
        let playerStartY = 0;
        initialMap.forEach((row, y) => {
            row.forEach((tile, x) => {
                if (tile === 3) {
                    playerStartX = x;
                    playerStartY = y;
                }
            });
        });

        stateRef.current.player = { x: playerStartX, y: playerStartY, hp: settings.playerStartingHp, maxHp: settings.playerStartingHp, attack: 10, direction: 'down' };
        createEnemies();
        stateRef.current.score = 0;
        stateRef.current.lives = 3;
        stateRef.current.gameOver = false;
        stateRef.current.gameWon = false;
        stateRef.current.isPlaying = true;
        stateRef.current.attackCooldown = 0;
        stateRef.current.playerHitCooldown = 0;
        setScore(0);
        setGameOver(false);
        setGameWon(false);
    };

    useEffect(() => {
        resetGame();
    }, [difficulty]);

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
        let animationFrameId: number;

        const gameLoop = (time: number) => {
            const state = stateRef.current;
            const deltaTime = (time - state.lastTime) / 16; // Normalize to ~60fps
            state.lastTime = time;

            if (!state.isPlaying || state.gameOver || state.gameWon) {
                animationFrameId = requestAnimationFrame(gameLoop);
                return;
            }

            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Player movement
            let playerMoved = false;
            let newPlayerX = state.player.x;
            let newPlayerY = state.player.y;
            let newDirection = state.player.direction;

            if (state.keys['ArrowUp'] || state.keys['w']) { newPlayerY--; newDirection = 'up'; playerMoved = true; }
            else if (state.keys['ArrowDown'] || state.keys['s']) { newPlayerY++; newDirection = 'down'; playerMoved = true; }
            else if (state.keys['ArrowLeft'] || state.keys['a']) { newPlayerX--; newDirection = 'left'; playerMoved = true; }
            else if (state.keys['ArrowRight'] || state.keys['d']) { newPlayerX++; newDirection = 'right'; playerMoved = true; }

            if (playerMoved) {
                const targetTile = initialMap[newPlayerY]?.[newPlayerX];
                if (targetTile !== undefined && targetTile !== 1 && targetTile !== 2) { // Not wall or water
                    state.player.x = newPlayerX;
                    state.player.y = newPlayerY;
                    state.player.direction = newDirection;
                    playSound(200, 'sine', 0.05); // Footstep sound
                }
                // Clear keys after processing to prevent continuous movement
                state.keys['ArrowUp'] = false; state.keys['w'] = false;
                state.keys['ArrowDown'] = false; state.keys['s'] = false;
                state.keys['ArrowLeft'] = false; state.keys['a'] = false;
                state.keys['ArrowRight'] = false; state.keys['d'] = false;
            }

            // Player attack
            if ((state.keys[' '] || state.keys['e']) && state.attackCooldown <= 0) {
                state.isAttacking = true;
                playSound(500, 'square', 0.1); // Attack sound
                state.attackCooldown = 15; // Cooldown frames
                // Check for enemy hit
                state.enemies = state.enemies.filter(enemy => {
                    let hit = false;
                    if (state.player.direction === 'up' && enemy.x === state.player.x && enemy.y === state.player.y - 1) hit = true;
                    if (state.player.direction === 'down' && enemy.x === state.player.x && enemy.y === state.player.y + 1) hit = true;
                    if (state.player.direction === 'left' && enemy.y === state.player.y && enemy.x === state.player.x - 1) hit = true;
                    if (state.player.direction === 'right' && enemy.y === state.player.y && enemy.x === state.player.x + 1) hit = true;

                    if (hit) {
                        enemy.health -= state.player.attack; // Player attack damage
                        if (enemy.health <= 0) {
                            state.score += 100;
                            addCoins(10);
                            playSound(600, 'sine', 0.2); // Enemy defeated sound
                            return false; // Remove enemy
                        }
                    }
                    return true;
                });
                setScore(state.score);
                setTimeout(() => state.isAttacking = false, 200);
                state.keys[' '] = false; state.keys['e'] = false;
            }

            // Update cooldowns
            if (state.attackCooldown > 0) state.attackCooldown--;
            if (state.playerHitCooldown > 0) state.playerHitCooldown--;

            // Draw map
            initialMap.forEach((row, y) => {
                row.forEach((tile, x) => {
                    if (tile === 1) {
                        const grad = ctx.createLinearGradient(x * TILE_SIZE, y * TILE_SIZE, x * TILE_SIZE, (y + 1) * TILE_SIZE);
                        grad.addColorStop(0, '#166534');
                        grad.addColorStop(1, '#14532d');
                        ctx.fillStyle = grad;
                    } else if (tile === 2) {
                        const grad = ctx.createLinearGradient(x * TILE_SIZE, y * TILE_SIZE, x * TILE_SIZE, (y + 1) * TILE_SIZE);
                        grad.addColorStop(0, '#2563eb');
                        grad.addColorStop(1, '#1e40af');
                        ctx.fillStyle = grad;
                    } else {
                        const grad = ctx.createLinearGradient(x * TILE_SIZE, y * TILE_SIZE, x * TILE_SIZE, (y + 1) * TILE_SIZE);
                        grad.addColorStop(0, '#a3e635');
                        grad.addColorStop(1, '#84cc16');
                        ctx.fillStyle = grad;
                    }
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                    // Draw tile borders for better visibility
                    ctx.strokeStyle = 'rgba(30, 41, 59, 0.2)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                });
            });

            // Draw Player
            ctx.fillStyle = state.playerHitCooldown > 0 ? '#fef08a' : '#f97316'; // Flash on hit
            ctx.fillRect(state.player.x * TILE_SIZE, state.player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            // Simple player details (e.g., eyes based on direction)
            ctx.fillStyle = '#000';
            if (state.player.direction === 'up') ctx.fillRect(state.player.x * TILE_SIZE + TILE_SIZE * 0.3, state.player.y * TILE_SIZE + TILE_SIZE * 0.1, TILE_SIZE * 0.4, TILE_SIZE * 0.2);
            else if (state.player.direction === 'down') ctx.fillRect(state.player.x * TILE_SIZE + TILE_SIZE * 0.3, state.player.y * TILE_SIZE + TILE_SIZE * 0.7, TILE_SIZE * 0.4, TILE_SIZE * 0.2);
            else if (state.player.direction === 'left') ctx.fillRect(state.player.x * TILE_SIZE + TILE_SIZE * 0.1, state.player.y * TILE_SIZE + TILE_SIZE * 0.3, TILE_SIZE * 0.2, TILE_SIZE * 0.4);
            else if (state.player.direction === 'right') ctx.fillRect(state.player.x * TILE_SIZE + TILE_SIZE * 0.7, state.player.y * TILE_SIZE + TILE_SIZE * 0.3, TILE_SIZE * 0.2, TILE_SIZE * 0.4);

            // Draw attack animation
            if (state.isAttacking) {
                ctx.fillStyle = '#facc15';
                if (state.player.direction === 'up') ctx.fillRect(state.player.x * TILE_SIZE, (state.player.y - 1) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                else if (state.player.direction === 'down') ctx.fillRect(state.player.x * TILE_SIZE, (state.player.y + 1) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                else if (state.player.direction === 'left') ctx.fillRect((state.player.x - 1) * TILE_SIZE, state.player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                else if (state.player.direction === 'right') ctx.fillRect((state.player.x + 1) * TILE_SIZE, state.player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }

            // Enemies logic
            const settings = getDifficultySettings();
            state.enemies.forEach(enemy => {
                // Enemy movement
                if (Math.random() < settings.enemySpeed * deltaTime) { // Adjust speed with deltaTime
                    const possibleMoves = [];
                    if (initialMap[enemy.y - 1]?.[enemy.x] === 0) possibleMoves.push({ x: enemy.x, y: enemy.y - 1, direction: 'up' });
                    if (initialMap[enemy.y + 1]?.[enemy.x] === 0) possibleMoves.push({ x: enemy.x, y: enemy.y + 1, direction: 'down' });
                    if (initialMap[enemy.y]?.[enemy.x - 1] === 0) possibleMoves.push({ x: enemy.x - 1, y: enemy.y, direction: 'left' });
                    if (initialMap[enemy.y]?.[enemy.x + 1] === 0) possibleMoves.push({ x: enemy.x + 1, y: enemy.y, direction: 'right' });

                    if (possibleMoves.length > 0) {
                        const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                        enemy.x = move.x;
                        enemy.y = move.y;
                        enemy.direction = move.direction as 'up' | 'down' | 'left' | 'right';
                    }
                }

                // Draw enemy
                ctx.fillStyle = '#ef4444'; // Red
                ctx.fillRect(enemy.x * TILE_SIZE, enemy.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                // Simple enemy details (e.g., eyes based on direction)
                ctx.fillStyle = '#000';
                if (enemy.direction === 'up') ctx.fillRect(enemy.x * TILE_SIZE + TILE_SIZE * 0.3, enemy.y * TILE_SIZE + TILE_SIZE * 0.1, TILE_SIZE * 0.4, TILE_SIZE * 0.2);
                else if (enemy.direction === 'down') ctx.fillRect(enemy.x * TILE_SIZE + TILE_SIZE * 0.3, enemy.y * TILE_SIZE + TILE_SIZE * 0.7, TILE_SIZE * 0.4, TILE_SIZE * 0.2);
                else if (enemy.direction === 'left') ctx.fillRect(enemy.x * TILE_SIZE + TILE_SIZE * 0.1, enemy.y * TILE_SIZE + TILE_SIZE * 0.3, TILE_SIZE * 0.2, TILE_SIZE * 0.4);
                else if (enemy.direction === 'right') ctx.fillRect(enemy.x * TILE_SIZE + TILE_SIZE * 0.7, enemy.y * TILE_SIZE + TILE_SIZE * 0.3, TILE_SIZE * 0.2, TILE_SIZE * 0.4);

                // Player-enemy collision (damage)
                if (state.playerHitCooldown <= 0 && enemy.x === state.player.x && enemy.y === state.player.y) {
                    state.player.hp -= enemy.attack; // Enemy attack damage
                    playSound(100, 'sawtooth', 0.5); // Player hit sound
                    state.playerHitCooldown = 30; // Invincibility frames
                    if (state.player.hp <= 0) {
                        state.gameOver = true;
                        setGameOver(true);
                    }
                }
            });

            if (state.enemies.length === 0 && !state.gameWon) {
                state.gameWon = true;
                setGameWon(true);
                addCoins(2500);
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        stateRef.current.lastTime = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [difficulty, addCoins]);

    const handleMobileControl = (action: string) => {
        const state = stateRef.current;
        if (state.gameOver || state.gameWon) return;

        if (state.gameState === 'explore') {
            // Clear keys to prevent continuous movement from mobile controls
            state.keys['ArrowUp'] = false; state.keys['w'] = false;
            state.keys['ArrowDown'] = false; state.keys['s'] = false;
            state.keys['ArrowLeft'] = false; state.keys['a'] = false;
            state.keys['ArrowRight'] = false; state.keys['d'] = false;

            switch (action) {
                case 'up': state.keys['ArrowUp'] = true; state.keys['w'] = true; break;
                case 'down': state.keys['ArrowDown'] = true; state.keys['s'] = true; break;
                case 'left': state.keys['ArrowLeft'] = true; state.keys['a'] = true; break;
                case 'right': state.keys['ArrowRight'] = true; state.keys['d'] = true; break;
                case 'action': state.keys[' '] = true; state.keys['e'] = true; break; // Attack
            }
        } else if (state.gameState === 'combat') {
            if (action === 'action') {
                // In combat, 'action' button triggers attack
                if (state.attackCooldown <= 0) {
                    state.isAttacking = true;
                    playSound(500, 'square', 0.1); // Attack sound
                    state.attackCooldown = 15; // Cooldown frames
                    // Check for enemy hit
                    state.enemies = state.enemies.filter(enemy => {
                        let hit = false;
                        if (state.player.direction === 'up' && enemy.x === state.player.x && enemy.y === state.player.y - 1) hit = true;
                        if (state.player.direction === 'down' && enemy.x === state.player.x && enemy.y === state.player.y + 1) hit = true;
                        if (state.player.direction === 'left' && enemy.y === state.player.y && enemy.x === state.player.x - 1) hit = true;
                        if (state.player.direction === 'right' && enemy.y === state.player.y && enemy.x === state.player.x + 1) hit = true;

                        if (hit) {
                            enemy.health -= state.player.attack; // Player attack damage
                            if (enemy.health <= 0) {
                                state.score += 100;
                                addCoins(10);
                                playSound(600, 'sine', 0.2); // Enemy defeated sound
                                return false; // Remove enemy
                            }
                        }
                        return true;
                    });
                    setScore(state.score);
                    setTimeout(() => state.isAttacking = false, 200);
                }
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
            <div className="w-full max-w-xl flex justify-between items-center px-4">
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    &larr; Back
                </button>
                <div className="flex items-center gap-6 text-white font-mono">
                    <span>SCORE: {score}</span>
                    <div className="flex items-center gap-1">
                        <span className="text-red-400">HP:</span>
                        {Array(Math.max(0, Math.ceil(stateRef.current.player.hp / 10))).fill(0).map((_, i) => <Heart key={i} className="w-4 h-4 text-red-500 fill-current drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />)}
                    </div>
                </div>
            </div>
            <div className="relative p-2 bg-gray-800 rounded-xl border-4 border-gray-600 shadow-2xl">
                <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-black rounded-lg shadow-inner" />
                {(!stateRef.current.isPlaying && !stateRef.current.gameOver && !stateRef.current.gameWon) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
                        <button onClick={resetGame} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(22,163,74,0.5)] transition-all hover:scale-105">
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
                            <RefreshCw className="w-5 h-5" /> PLAY AGAIN
                        </button>
                    </div>
                )}
            </div>
            <div className="hidden md:block text-gray-500 text-sm">Arrow keys or WASD to move, Space or E to attack</div>
            <div className="md:hidden w-full max-w-sm mt-4">
                <MobileControls onAction={handleMobileControl} actions={['up', 'down', 'left', 'right', 'action']} actionLabel="Attack" />
            </div>
        </div>
    );
};
