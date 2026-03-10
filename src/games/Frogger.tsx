import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw, Home, ChevronsRight } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';
import { MobileControls } from '../components/MobileControls';

const GRID_SIZE = 30;
const COLS = 13;
const ROWS = 14;
const CANVAS_WIDTH = COLS * GRID_SIZE;
const CANVAS_HEIGHT = ROWS * GRID_SIZE;

interface GameObject {
    x: number;
    y: number;
    width: number;
    speed: number;
    type: 'car' | 'truck' | 'log' | 'turtle';
}

export const Frogger: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addCoins, difficulty } = useGame();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const getDifficultySettings = () => {
        switch (difficulty) {
            case 'hard': return { speedMultiplier: 1.5, startingLives: 2 };
            case 'easy': return { speedMultiplier: 0.7, startingLives: 5 };
            case 'medium':
            default: return { speedMultiplier: 1, startingLives: 3 };
        }
    };

    const stateRef = useRef({
        frog: { x: 6, y: 13 },
        lanes: [] as GameObject[][],
        homes: [false, false, false, false, false],
        score: 0,
        lives: 3,
        highestRow: 13,
        lastTime: 0,
        waterTimer: 0
    });

    const createLane = (y: number, type: 'car' | 'truck' | 'log' | 'turtle', count: number, width: number, speed: number): GameObject[] => {
        const lane: GameObject[] = [];
        const spacing = CANVAS_WIDTH / count;
        for (let i = 0; i < count; i++) {
            lane.push({ x: i * spacing, y, width, speed, type });
        }
        return lane;
    };

    const initializeLanes = () => {
        const settings = getDifficultySettings();
        const m = settings.speedMultiplier;
        const newLanes: GameObject[][] = [];
        
        // Road (bottom to top)
        newLanes.push(createLane(12, 'car', 3, GRID_SIZE, -1.5 * m));
        newLanes.push(createLane(11, 'car', 3, GRID_SIZE, 1.5 * m));
        newLanes.push(createLane(10, 'truck', 2, GRID_SIZE * 2, -1 * m));
        newLanes.push(createLane(9, 'car', 4, GRID_SIZE, 2 * m));
        newLanes.push(createLane(8, 'truck', 2, GRID_SIZE * 2, -1.2 * m));
        
        // Water (bottom to top)
        newLanes.push(createLane(6, 'turtle', 3, GRID_SIZE * 2, -1 * m));
        newLanes.push(createLane(5, 'log', 3, GRID_SIZE * 3, 1.5 * m));
        newLanes.push(createLane(4, 'log', 2, GRID_SIZE * 4, 2 * m));
        newLanes.push(createLane(3, 'turtle', 4, GRID_SIZE * 2, -1.5 * m));
        newLanes.push(createLane(2, 'log', 3, GRID_SIZE * 3, 1 * m));
        
        return newLanes;
    };

    const resetGame = () => {
        const settings = getDifficultySettings();
        stateRef.current = {
            frog: { x: 6, y: 13 },
            lanes: initializeLanes(),
            homes: [false, false, false, false, false],
            score: 0,
            lives: settings.startingLives,
            highestRow: 13,
            lastTime: performance.now(),
            waterTimer: 0
        };
        setScore(0);
        setLives(settings.startingLives);
        setGameOver(false);
        setGameWon(false);
        setIsPlaying(true);
    };

    const resetFrog = () => {
        stateRef.current.frog = { x: 6, y: 13 };
        stateRef.current.highestRow = 13;
    };

    const frogDied = () => {
        playSound(100, 'sawtooth', 0.5); // Death sound
        stateRef.current.lives--;
        setLives(stateRef.current.lives);
        
        if (stateRef.current.lives <= 0) {
            setGameOver(true);
            setIsPlaying(false);
            addHighScore('frogger', stateRef.current.score);
        } else {
            resetFrog();
        }
    };

    const moveFrog = (dx: number, dy: number) => {
        const state = stateRef.current;
        const newX = state.frog.x + dx;
        const newY = state.frog.y + dy;

        if (newX >= 0 && newX < COLS && newY >= 1 && newY < ROWS) {
            state.frog.x = newX;
            state.frog.y = newY;
            playSound(300, 'sine', 0.05); // Hop sound

            // Score for moving forward
            if (newY < state.highestRow) {
                state.highestRow = newY;
                state.score += 10;
                setScore(state.score);
            }
        }
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPlaying || gameOver || gameWon) return;
            e.preventDefault();
            switch (e.key) {
                case 'ArrowUp': moveFrog(0, -1); break;
                case 'ArrowDown': moveFrog(0, 1); break;
                case 'ArrowLeft': moveFrog(-1, 0); break;
                case 'ArrowRight': moveFrog(1, 0); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, gameOver, gameWon]);

    // Game loop
    useEffect(() => {
        if (!isPlaying || gameOver || gameWon) return;

        let animationFrameId: number;

        const drawFrog = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
            ctx.fillStyle = '#4ade80'; // green-400
            ctx.beginPath();
            ctx.arc(x + GRID_SIZE/2, y + GRID_SIZE/2, GRID_SIZE/2 - 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Eyes
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(x + GRID_SIZE/4, y + GRID_SIZE/4, 3, 0, Math.PI * 2);
            ctx.arc(x + GRID_SIZE*3/4, y + GRID_SIZE/4, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(x + GRID_SIZE/4, y + GRID_SIZE/4, 1.5, 0, Math.PI * 2);
            ctx.arc(x + GRID_SIZE*3/4, y + GRID_SIZE/4, 1.5, 0, Math.PI * 2);
            ctx.fill();
        };

        const drawCar = (ctx: CanvasRenderingContext2D, obj: GameObject) => {
            ctx.fillStyle = obj.type === 'car' ? '#ef4444' : '#f59e0b'; // red or amber
            ctx.fillRect(obj.x + 2, obj.y * GRID_SIZE + 4, obj.width - 4, GRID_SIZE - 8);
            
            // Windows
            ctx.fillStyle = '#94a3b8';
            if (obj.speed > 0) {
                ctx.fillRect(obj.x + obj.width - 8, obj.y * GRID_SIZE + 6, 4, GRID_SIZE - 12);
            } else {
                ctx.fillRect(obj.x + 4, obj.y * GRID_SIZE + 6, 4, GRID_SIZE - 12);
            }
        };

        const drawLog = (ctx: CanvasRenderingContext2D, obj: GameObject) => {
            ctx.fillStyle = '#78350f'; // amber-900
            ctx.fillRect(obj.x, obj.y * GRID_SIZE + 2, obj.width, GRID_SIZE - 4);
            
            // Wood grain
            ctx.strokeStyle = '#451a03';
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y * GRID_SIZE + GRID_SIZE/3);
            ctx.lineTo(obj.x + obj.width, obj.y * GRID_SIZE + GRID_SIZE/3);
            ctx.moveTo(obj.x, obj.y * GRID_SIZE + GRID_SIZE*2/3);
            ctx.lineTo(obj.x + obj.width, obj.y * GRID_SIZE + GRID_SIZE*2/3);
            ctx.stroke();
        };

        const drawTurtle = (ctx: CanvasRenderingContext2D, obj: GameObject, time: number) => {
            const isDiving = Math.sin(time / 500 + obj.x) > 0.8;
            
            if (isDiving) {
                ctx.fillStyle = 'rgba(22, 163, 74, 0.3)'; // Submerged
            } else {
                ctx.fillStyle = '#16a34a'; // green-600
            }
            
            for (let i = 0; i < obj.width / GRID_SIZE; i++) {
                ctx.beginPath();
                ctx.arc(obj.x + i * GRID_SIZE + GRID_SIZE/2, obj.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/2 - 2, 0, Math.PI * 2);
                ctx.fill();
            }
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
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw background zones
            ctx.fillStyle = '#1e293b'; // Road (slate-800)
            ctx.fillRect(0, 8 * GRID_SIZE, CANVAS_WIDTH, 5 * GRID_SIZE);
            
            ctx.fillStyle = '#0284c7'; // Water (sky-600)
            ctx.fillRect(0, 2 * GRID_SIZE, CANVAS_WIDTH, 5 * GRID_SIZE);
            
            ctx.fillStyle = '#166534'; // Safe zones (green-800)
            ctx.fillRect(0, 7 * GRID_SIZE, CANVAS_WIDTH, GRID_SIZE);
            ctx.fillRect(0, 13 * GRID_SIZE, CANVAS_WIDTH, GRID_SIZE);
            
            // Draw home row
            ctx.fillStyle = '#14532d'; // Dark green
            ctx.fillRect(0, GRID_SIZE, CANVAS_WIDTH, GRID_SIZE);
            
            for (let i = 0; i < 5; i++) {
                const homeX = i * (GRID_SIZE * 2.5) + GRID_SIZE;
                ctx.fillStyle = '#0284c7'; // Water bay
                ctx.fillRect(homeX, GRID_SIZE, GRID_SIZE, GRID_SIZE);
                
                if (state.homes[i]) {
                    drawFrog(ctx, homeX, GRID_SIZE);
                }
            }

            // Update and draw lanes
            state.lanes.forEach(lane => {
                lane.forEach(obj => {
                    obj.x += obj.speed * deltaTime;
                    
                    // Wrap around
                    if (obj.speed > 0 && obj.x > CANVAS_WIDTH) obj.x = -obj.width;
                    if (obj.speed < 0 && obj.x < -obj.width) obj.x = CANVAS_WIDTH;
                    
                    if (obj.type === 'car' || obj.type === 'truck') {
                        drawCar(ctx, obj);
                    } else if (obj.type === 'log') {
                        drawLog(ctx, obj);
                    } else if (obj.type === 'turtle') {
                        drawTurtle(ctx, obj, time);
                    }
                });
            });

            // Frog logic & collision
            let frogX = state.frog.x * GRID_SIZE;
            let frogY = state.frog.y * GRID_SIZE;
            let onLog = false;
            let dead = false;

            if (state.frog.y >= 2 && state.frog.y <= 6) { // In water
                state.lanes.forEach(lane => {
                    if (lane[0] && lane[0].y === state.frog.y) {
                        lane.forEach(obj => {
                            if (frogX + GRID_SIZE/2 > obj.x && frogX + GRID_SIZE/2 < obj.x + obj.width) {
                                if (obj.type === 'turtle') {
                                    const isDiving = Math.sin(time / 500 + obj.x) > 0.8;
                                    if (!isDiving) {
                                        onLog = true;
                                        state.frog.x += (obj.speed * deltaTime) / GRID_SIZE;
                                    }
                                } else {
                                    onLog = true;
                                    state.frog.x += (obj.speed * deltaTime) / GRID_SIZE;
                                }
                            }
                        });
                    }
                });
                
                if (!onLog) dead = true;
                
                // Check screen bounds while on log
                if (state.frog.x < 0 || state.frog.x >= COLS) dead = true;
                
            } else if (state.frog.y >= 8 && state.frog.y <= 12) { // On road
                state.lanes.forEach(lane => {
                    if (lane[0] && lane[0].y === state.frog.y) {
                        lane.forEach(car => {
                            // Simple AABB collision with some leniency
                            if (frogX + 4 < car.x + car.width && 
                                frogX + GRID_SIZE - 4 > car.x) {
                                dead = true;
                            }
                        });
                    }
                });
            } else if (state.frog.y === 1) { // Home row
                const homeIndex = Math.floor((state.frog.x - 1) / 2.5);
                const homeX = homeIndex * 2.5 + 1;
                
                // Check if aligned with a home bay
                if (Math.abs(state.frog.x - homeX) < 0.5 && homeIndex >= 0 && homeIndex < 5) {
                    if (!state.homes[homeIndex]) {
                        state.homes[homeIndex] = true;
                        state.score += 50;
                        setScore(state.score);
                        addCoins(5);
                        playSound(600, 'sine', 0.5); // Home sound
                        
                        if (state.homes.every(h => h)) {
                            setGameWon(true);
                            setIsPlaying(false);
                            state.score += 1000;
                            setScore(state.score);
                            addCoins(100);
                            addHighScore('frogger', state.score);
                            playSound(800, 'square', 0.5); // Win sound
                        } else {
                            resetFrog();
                        }
                    } else {
                        dead = true; // Jumped into occupied home
                    }
                } else {
                    dead = true; // Hit the wall between homes
                }
            }

            if (dead) {
                frogDied();
            } else {
                drawFrog(ctx, state.frog.x * GRID_SIZE, state.frog.y * GRID_SIZE);
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        stateRef.current.lastTime = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying, gameOver, gameWon, difficulty]);

    const handleMobileControl = (action: string) => {
        if (!isPlaying || gameOver || gameWon) return;
        switch (action) {
            case 'up': moveFrog(0, -1); break;
            case 'down': moveFrog(0, 1); break;
            case 'left': moveFrog(-1, 0); break;
            case 'right': moveFrog(1, 0); break;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
            <div className="w-full max-w-lg flex justify-between items-center px-4">
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    &larr; Back
                </button>
                <div className="flex flex-col items-end text-white font-mono">
                    <div className="text-xl font-bold text-green-400">SCORE: {score}</div>
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
                        <button onClick={resetGame} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(22,163,74,0.5)] transition-all hover:scale-105">
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
            
            <div className="hidden md:block text-gray-500 text-sm">Arrow keys to move</div>
            <div className="md:hidden w-full max-w-sm mt-4">
                <MobileControls />
            </div>
        </div>
    );
};
