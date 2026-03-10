import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw, Heart } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';
import { MobileControls } from '../components/MobileControls';

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
const GRID_SIZE = 16;
const PLAYER_AREA_HEIGHT = CANVAS_HEIGHT / 4;

interface GameObject {
    x: number;
    y: number;
    dx: number;
    dy: number;
    size: number;
}

interface Player extends GameObject {
    isShooting: boolean;
}

interface Bullet extends GameObject {}

interface Mushroom extends GameObject {
    hits: number;
}

interface CentipedeSegment extends GameObject {
    id: number;
    direction: 'left' | 'right' | 'down';
    head: boolean;
}

export const Centipede: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addCoins, difficulty } = useGame();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);


    const getDifficultySettings = () => {
        switch (difficulty) {
            case 'hard': return { centipedeLength: 12, centipedeSpeed: 3, mushroomDensity: 0.15, startingLives: 2 };
            case 'easy': return { centipedeLength: 6, centipedeSpeed: 1, mushroomDensity: 0.05, startingLives: 5 };
            case 'medium':
            default: return { centipedeLength: 9, centipedeSpeed: 2, mushroomDensity: 0.1, startingLives: 3 };
        }
    };

    const stateRef = useRef({
        player: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - GRID_SIZE * 2, dx: 0, dy: 0, size: GRID_SIZE, isShooting: false } as Player,
        bullets: [] as Bullet[],
        mushrooms: [] as Mushroom[],
        centipede: [] as CentipedeSegment[],
        score: 0,
        lives: 3,
        lastTime: 0,
        keys: {} as { [key: string]: boolean },
        lastShotTime: 0,
        centipedeMoveTimer: 0,
        centipedeMoveInterval: 200 / getDifficultySettings().centipedeSpeed,
        isPlaying: false,
        gameOver: false,
        gameWon: false
    });

    useEffect(() => {
        if (gameOver || gameWon) {
            if (gameOver) playSound('gameover');
            if (gameWon) playSound('win');
            addHighScore('centipede', { name: 'Player', score: stateRef.current.score });
        }
    }, [gameOver, gameWon]);

    const createMushrooms = () => {
        const settings = getDifficultySettings();
        const newMushrooms: Mushroom[] = [];
        for (let y = 0; y < CANVAS_HEIGHT - PLAYER_AREA_HEIGHT; y += GRID_SIZE) {
            for (let x = 0; x < CANVAS_WIDTH; x += GRID_SIZE) {
                if (Math.random() < settings.mushroomDensity) {
                    newMushrooms.push({ x, y, dx: 0, dy: 0, size: GRID_SIZE, hits: 0 });
                }
            }
        }
        return newMushrooms;
    };

    const createCentipede = () => {
        const settings = getDifficultySettings();
        const newCentipede: CentipedeSegment[] = [];
        for (let i = 0; i < settings.centipedeLength; i++) {
            newCentipede.push({
                id: i,
                x: CANVAS_WIDTH - (i + 1) * GRID_SIZE,
                y: 0,
                dx: 0,
                dy: 0,
                size: GRID_SIZE,
                direction: 'left',
                head: i === 0,
            });
        }
        return newCentipede;
    };

    const resetGame = () => {
        const settings = getDifficultySettings();
        stateRef.current = {
            player: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - GRID_SIZE * 2, dx: 0, dy: 0, size: GRID_SIZE, isShooting: false },
            bullets: [],
            mushrooms: createMushrooms(),
            centipede: createCentipede(),
            score: 0,
            lives: settings.startingLives,
            lastTime: performance.now(),
            keys: {},
            lastShotTime: 0,
            centipedeMoveTimer: 0,
            centipedeMoveInterval: 200 / settings.centipedeSpeed,
            isPlaying: true,
            gameOver: false,
            gameWon: false
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
                stateRef.current.player.isShooting = true;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            stateRef.current.keys[e.key] = false;
            if (e.key === ' ') {
                stateRef.current.player.isShooting = false;
            }
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
        if (!stateRef.current.isPlaying || stateRef.current.gameOver || stateRef.current.gameWon) return;

        const settings = getDifficultySettings();
        let animationFrameId: number;

        const gameLoop = (time: number) => {
            const state = stateRef.current;
            const deltaTime = time - state.lastTime;
            state.lastTime = time;

            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear canvas
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Player movement
            const playerSpeed = 3;
            if (state.keys['ArrowUp'] && state.player.y > CANVAS_HEIGHT - PLAYER_AREA_HEIGHT) state.player.y -= playerSpeed;
            if (state.keys['ArrowDown'] && state.player.y < CANVAS_HEIGHT - state.player.size) state.player.y += playerSpeed;
            if (state.keys['ArrowLeft'] && state.player.x > 0) state.player.x -= playerSpeed;
            if (state.keys['ArrowRight'] && state.player.x < CANVAS_WIDTH - state.player.size) state.player.x += playerSpeed;

            // Shooting
            if (state.player.isShooting && time - state.lastShotTime > 150) {
                state.bullets.push({
                    x: state.player.x + state.player.size / 2 - 2,
                    y: state.player.y,
                    dx: 0,
                    dy: -10,
                    size: 4,
                });
                state.lastShotTime = time;
                playSound(800, 'square', 0.1);
            }

            // Update bullets
            for (let i = state.bullets.length - 1; i >= 0; i--) {
                const bullet = state.bullets[i];
                bullet.y += bullet.dy;
                if (bullet.y < 0) {
                    state.bullets.splice(i, 1);
                    continue;
                }

                // Bullet-mushroom collision
                for (let j = state.mushrooms.length - 1; j >= 0; j--) {
                    const mushroom = state.mushrooms[j];
                    if (
                        bullet.x < mushroom.x + mushroom.size &&
                        bullet.x + bullet.size > mushroom.x &&
                        bullet.y < mushroom.y + mushroom.size &&
                        bullet.y + bullet.size > mushroom.y
                    ) {
                        state.bullets.splice(i, 1);
                        mushroom.hits++;
                        if (mushroom.hits >= 4) {
                            state.mushrooms.splice(j, 1);
                            state.score += 10;
                            setScore(state.score);
                            addCoins(1);
                            playSound(400, 'sine', 0.05);
                        } else {
                            playSound(200, 'triangle', 0.05);
                        }
                        break;
                    }
                }
            }

            // Centipede movement
            state.centipedeMoveTimer += deltaTime;
            if (state.centipedeMoveTimer >= state.centipedeMoveInterval) {
                state.centipedeMoveTimer = 0;
                let headDirectionChanged = false;
                const newCentipede = state.centipede.map((segment, index) => {
                    const newSegment = { ...segment };
                    const oldX = newSegment.x;
                    const oldY = newSegment.y;

                    if (newSegment.head) {
                        let nextX = newSegment.x;
                        let nextY = newSegment.y;

                        if (newSegment.direction === 'left') nextX -= GRID_SIZE;
                        else if (newSegment.direction === 'right') nextX += GRID_SIZE;
                        else if (newSegment.direction === 'down') nextY += GRID_SIZE;

                        // Check for wall or mushroom collision
                        const hitWall = nextX < 0 || nextX >= CANVAS_WIDTH;
                        const hitMushroom = state.mushrooms.some(m => m.x === nextX && m.y === nextY);

                        if (hitWall || hitMushroom) {
                            if (newSegment.direction === 'down') {
                                newSegment.direction = (oldX < CANVAS_WIDTH / 2) ? 'right' : 'left';
                            } else {
                                newSegment.direction = 'down';
                                newSegment.y += GRID_SIZE;
                            }
                            headDirectionChanged = true;
                        } else {
                            newSegment.x = nextX;
                            newSegment.y = nextY;
                        }
                    } else {
                        // Follow the segment in front
                        const segmentInFront = state.centipede[index - 1];
                        newSegment.x = segmentInFront.x;
                        newSegment.y = segmentInFront.y;
                        newSegment.direction = segmentInFront.direction;
                    }
                    return newSegment;
                });
                state.centipede = newCentipede;
            }

            // Centipede-bullet collision
            for (let i = state.bullets.length - 1; i >= 0; i--) {
                const bullet = state.bullets[i];
                for (let j = state.centipede.length - 1; j >= 0; j--) {
                    const segment = state.centipede[j];
                    if (
                        bullet.x < segment.x + segment.size &&
                        bullet.x + bullet.size > segment.x &&
                        bullet.y < segment.y + segment.size &&
                        bullet.y + bullet.size > segment.y
                    ) {
                        state.bullets.splice(i, 1);
                        state.centipede.splice(j, 1);
                        state.mushrooms.push({ x: segment.x, y: segment.y, dx: 0, dy: 0, size: GRID_SIZE, hits: 0 }); // Spawn mushroom
                        state.score += segment.head ? 100 : 10;
                        setScore(state.score);
                        addCoins(segment.head ? 5 : 1);
                        playSound(600, 'square', 0.2); // Centipede hit sound
                        break;
                    }
                }
            }

            // Centipede-player collision
            for (let i = state.centipede.length - 1; i >= 0; i--) {
                const segment = state.centipede[i];
                if (
                    state.player.x < segment.x + segment.size &&
                    state.player.x + state.player.size > segment.x &&
                    state.player.y < segment.y + segment.size &&
                    state.player.y + state.player.size > segment.y
                ) {
                    playSound(100, 'sawtooth', 0.5); // Player hit sound
                    state.lives--;
                    setLives(state.lives);
                    if (state.lives <= 0) {
                        state.gameOver = true;
                        setGameOver(true);
                        state.isPlaying = false;
                        setIsPlaying(false);
                    } else {
                        // Reset player position
                        state.player.x = CANVAS_WIDTH / 2;
                        state.player.y = CANVAS_HEIGHT - GRID_SIZE * 2;
                    }
                    break;
                }
            }

            // Draw Mushrooms
            state.mushrooms.forEach(m => {
                ctx.fillStyle = `rgba(139, 69, 19, ${1 - m.hits * 0.25})`; // Brown, fades with hits
                ctx.fillRect(m.x, m.y, m.size, m.size);
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 2;
                ctx.strokeRect(m.x, m.y, m.size, m.size);
            });

            // Draw Centipede
            state.centipede.forEach(segment => {
                ctx.fillStyle = segment.head ? '#ef4444' : '#f97316'; // Red head, orange body
                ctx.beginPath();
                ctx.arc(segment.x + segment.size / 2, segment.y + segment.size / 2, segment.size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#be123c';
                ctx.lineWidth = 2;
                ctx.stroke();
            });

            // Draw Bullets
            state.bullets.forEach(bullet => {
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(bullet.x, bullet.y, bullet.size, bullet.size);
            });

            // Draw Player
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(state.player.x, state.player.y, state.player.size, state.player.size);

            if (state.centipede.length === 0) {
                state.gameWon = true;
                setGameWon(true);
                state.isPlaying = false;
                setIsPlaying(false);
                state.score += 1000;
                setScore(state.score);
                addCoins(100);
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
        state.player.isShooting = false;

        switch (action) {
            case 'up': state.keys['ArrowUp'] = true; break;
            case 'down': state.keys['ArrowDown'] = true; break;
            case 'left': state.keys['ArrowLeft'] = true; break;
            case 'right': state.keys['ArrowRight'] = true; break;
            case 'action':
                state.player.isShooting = true;
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
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-red-400">LIVES:</span>
                        {Array(Math.max(0, lives)).fill(0).map((_, i) => <Heart key={i} className="w-4 h-4 text-red-500 fill-current drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />)}
                    </div>
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

            <div className="hidden md:block text-gray-500 text-sm">Arrow keys to move, Space to shoot</div>
            <div className="md:hidden w-full max-w-sm mt-4">
                <MobileControls onAction={handleMobileControl} actions={['up', 'down', 'left', 'right', 'action']} />
            </div>
        </div>
    );
};
