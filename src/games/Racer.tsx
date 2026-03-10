import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw, Heart } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';
import { MobileControls } from '../components/MobileControls';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 500;

interface Car {
    x: number;
    y: number;
    width: number;
    height: number;
    isPlayer: boolean;
    color: string;
}

export const Racer: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addCoins, difficulty } = useGame();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false); // Not used in Racer, but kept for consistency
    const [isPlaying, setIsPlaying] = useState(false);

    const getDifficultySettings = () => {
        switch (difficulty) {
            case 'hard': return { playerSpeed: 6, obstacleSpeed: 7, obstacleSpawnRate: 0.03, startingLives: 1 };
            case 'easy': return { playerSpeed: 3, obstacleSpeed: 3, obstacleSpawnRate: 0.01, startingLives: 3 };
            case 'medium':
            default: return { playerSpeed: 4, obstacleSpeed: 5, obstacleSpawnRate: 0.02, startingLives: 2 };
        }
    };

    const stateRef = useRef({
        player: { x: CANVAS_WIDTH / 2 - 20, y: CANVAS_HEIGHT - 80, width: 40, height: 60, isPlayer: true, color: '#3b82f6' } as Car,
        obstacles: [] as Car[],
        roadOffset: 0,
        score: 0,
        lives: 1,
        lastTime: 0,
        keys: {} as { [key: string]: boolean },
    });

    useEffect(() => {
        if (gameOver) {
            playSound(100, 'sawtooth', 0.5); // Game over sound
            addHighScore('racer', stateRef.current.score);
        }
    }, [gameOver]);

    const resetGame = () => {
        const settings = getDifficultySettings();
        stateRef.current.player = { x: CANVAS_WIDTH / 2 - 20, y: CANVAS_HEIGHT - 80, width: 40, height: 60, isPlayer: true, color: '#3b82f6' };
        stateRef.current.obstacles = [];
        stateRef.current.roadOffset = 0;
        stateRef.current.score = 0;
        stateRef.current.lives = settings.startingLives;
        setScore(0);
        setLives(settings.startingLives);
        setGameOver(false);
        setIsPlaying(true);
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
        if (!isPlaying || gameOver) return;

        const settings = getDifficultySettings();
        let animationFrameId: number;

        const drawCar = (ctx: CanvasRenderingContext2D, car: Car) => {
            ctx.fillStyle = car.color;
            ctx.fillRect(car.x, car.y, car.width, car.height);

            // Simple car details
            ctx.fillStyle = '#cbd5e1'; // Light gray for windows
            ctx.fillRect(car.x + car.width * 0.2, car.y + car.height * 0.15, car.width * 0.6, car.height * 0.3);
            ctx.fillRect(car.x + car.width * 0.2, car.y + car.height * 0.55, car.width * 0.6, car.height * 0.3);

            ctx.fillStyle = '#1e293b'; // Dark gray for tires
            ctx.fillRect(car.x - 5, car.y + car.height * 0.2, 5, car.height * 0.6);
            ctx.fillRect(car.x + car.width, car.y + car.height * 0.2, 5, car.height * 0.6);
        };

        const gameLoop = (time: number) => {
            const state = stateRef.current;
            const deltaTime = (time - state.lastTime) / 16; // Normalize to ~60fps
            state.lastTime = time;

            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw road
            ctx.fillStyle = '#334155'; // Darker road
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Road lines
            ctx.fillStyle = '#facc15'; // Yellow lines
            for (let i = -100; i < CANVAS_HEIGHT + 100; i += 50) {
                ctx.fillRect(CANVAS_WIDTH / 2 - 5, (i + state.roadOffset) % (CANVAS_HEIGHT + 100) - 50, 10, 30);
            }
            state.roadOffset = (state.roadOffset + settings.obstacleSpeed * deltaTime) % (CANVAS_HEIGHT + 100);

            // Player logic
            const p = state.player;
            if ((state.keys['ArrowLeft'] || state.keys['a']) && p.x > 50) { p.x -= settings.playerSpeed * deltaTime; }
            if ((state.keys['ArrowRight'] || state.keys['d']) && p.x < CANVAS_WIDTH - 50 - p.width) { p.x += settings.playerSpeed * deltaTime; }
            drawCar(ctx, p);

            // Obstacles logic
            if (Math.random() < settings.obstacleSpawnRate * deltaTime) {
                state.obstacles.push({
                    x: Math.random() * (CANVAS_WIDTH - 100) + 50,
                    y: -60,
                    width: 40,
                    height: 60,
                    isPlayer: false,
                    color: '#ef4444' // Red obstacle car
                });
            }
            state.obstacles = state.obstacles.map(o => ({ ...o, y: o.y + settings.obstacleSpeed * deltaTime })).filter(o => o.y < CANVAS_HEIGHT);
            state.obstacles.forEach(o => {
                drawCar(ctx, o);

                // Collision
                if (p.x < o.x + o.width && p.x + p.width > o.x &&
                    p.y < o.y + o.height && p.y + p.height > o.y) {
                    state.lives--;
                    setLives(state.lives);
                    playSound(200, 'square', 0.2); // Collision sound
                    if (state.lives <= 0) {
                        setGameOver(true);
                        setIsPlaying(false);
                    } else {
                        // Remove collided obstacle to prevent multiple hits
                        state.obstacles = state.obstacles.filter(obs => obs !== o);
                    }
                }
            });

            state.score += 1;
            setScore(state.score);
            if (state.score % 100 === 0) addCoins(1);

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        stateRef.current.lastTime = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying, gameOver, difficulty, addCoins]);

    const handleMobileControl = (action: string) => {
        if (!isPlaying || gameOver) return;
        const state = stateRef.current;

        // Reset movement keys
        state.keys['ArrowLeft'] = false;
        state.keys['ArrowRight'] = false;
        state.keys['a'] = false;
        state.keys['d'] = false;

        switch (action) {
            case 'left': state.keys['ArrowLeft'] = true; state.keys['a'] = true; break;
            case 'right': state.keys['ArrowRight'] = true; state.keys['d'] = true; break;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
            <div className="w-full max-w-sm flex justify-between items-center px-4">
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
                <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-gray-600 rounded-lg shadow-inner" />
                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
                        <button onClick={resetGame} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all hover:scale-105">
                            START GAME
                        </button>
                    </div>
                )}
                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg gap-4">
                        <h3 className="text-4xl font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] text-red-500">
                            GAME OVER
                        </h3>
                        <p className="text-white text-xl font-mono">Final Score: {score}</p>
                        <button onClick={resetGame} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full font-bold text-lg shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all flex items-center gap-2 hover:scale-105 mt-4">
                            <RefreshCw className="w-5 h-5" />
                            PLAY AGAIN
                        </button>
                    </div>
                )}
            </div>
            <div className="hidden md:block text-gray-500 text-sm">Arrow keys or A/D to move</div>
            <div className="md:hidden w-full max-w-sm mt-4">
                <MobileControls onAction={handleMobileControl} actions={['left', 'right']} />
            </div>
        </div>
    );
};
