import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw } from 'lucide-react';
import { playSound } from '../lib/audio';
import { addHighScore } from '../lib/highscore';
import { MobileControls } from '../components/MobileControls';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 25;

const SHAPES = {
    'I': [[1, 1, 1, 1]],
    'J': [[1, 0, 0], [1, 1, 1]],
    'L': [[0, 0, 1], [1, 1, 1]],
    'O': [[1, 1], [1, 1]],
    'S': [[0, 1, 1], [1, 1, 0]],
    'T': [[0, 1, 0], [1, 1, 1]],
    'Z': [[1, 1, 0], [0, 1, 1]]
};

const COLORS = {
    'I': '#38bdf8', // sky-400
    'J': '#60a5fa', // blue-400
    'L': '#f97316', // orange-500
    'O': '#facc15', // yellow-400
    'S': '#4ade80', // green-400
    'T': '#c084fc', // purple-400
    'Z': '#f87171'  // red-400
};

type ShapeKey = keyof typeof SHAPES;

export const Tetris: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addCoins, difficulty } = useGame();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [board, setBoard] = useState<string[][]>(Array.from({ length: ROWS }, () => Array(COLS).fill('')));
    const [currentPiece, setCurrentPiece] = useState(getRandomPiece());
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Use refs for game loop state
    const stateRef = useRef({
        board: Array.from({ length: ROWS }, () => Array(COLS).fill('')),
        piece: getRandomPiece(),
        score: 0,
        level: 1,
        dropCounter: 0,
        lastTime: 0
    });

    const getDifficultySettings = () => {
        switch (difficulty) {
            case 'hard': return { baseSpeed: 500, speedDecrease: 40 };
            case 'easy': return { baseSpeed: 1200, speedDecrease: 80 };
            case 'medium':
            default: return { baseSpeed: 800, speedDecrease: 60 };
        }
    };

    function getRandomPiece() {
        const keys = Object.keys(SHAPES) as ShapeKey[];
        const key = keys[Math.floor(Math.random() * keys.length)];
        return {
            shape: SHAPES[key],
            color: COLORS[key],
            pos: { x: Math.floor(COLS / 2) - Math.floor(SHAPES[key][0].length / 2), y: 0 }
        };
    }

    const resetGame = () => {
        const newBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(''));
        const newPiece = getRandomPiece();
        
        stateRef.current = {
            board: newBoard,
            piece: newPiece,
            score: 0,
            level: 1,
            dropCounter: 0,
            lastTime: performance.now()
        };
        
        setBoard(newBoard);
        setCurrentPiece(newPiece);
        setScore(0);
        setLevel(1);
        setGameOver(false);
        setIsPlaying(true);
    };

    const isValidMove = (piece: any, newPos: { x: number, y: number }, currentBoard: string[][]) => {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x] !== 0) {
                    const newX = newPos.x + x;
                    const newY = newPos.y + y;
                    if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && currentBoard[newY][newX] !== '')) {
                        return false;
                    }
                }
            }
        }
        return true;
    };

    const mergePieceToBoard = () => {
        const state = stateRef.current;
        const newBoard = state.board.map(row => [...row]);
        
        state.piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const boardY = state.piece.pos.y + y;
                    const boardX = state.piece.pos.x + x;
                    if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                        newBoard[boardY][boardX] = state.piece.color;
                    }
                }
            });
        });
        
        playSound(200, 'square', 0.1); // Drop sound
        
        // Clear lines
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (newBoard[y].every(cell => cell !== '')) {
                newBoard.splice(y, 1);
                newBoard.unshift(Array(COLS).fill(''));
                linesCleared++;
                y++; // re-check the same row index
            }
        }
        
        if (linesCleared > 0) {
            const points = [0, 100, 300, 500, 800][linesCleared] * state.level;
            state.score += points;
            setScore(state.score);
            addCoins(Math.ceil(points / 10));
            
            // Level up every 1000 points
            const newLevel = Math.floor(state.score / 1000) + 1;
            if (newLevel > state.level) {
                state.level = newLevel;
                setLevel(newLevel);
                playSound(600, 'sine', 0.5); // Level up sound
            } else {
                playSound(400, 'sine', 0.3); // Clear line sound
            }
        }

        state.board = newBoard;
        setBoard(newBoard);
        
        const newPiece = getRandomPiece();
        if (!isValidMove(newPiece, newPiece.pos, newBoard)) {
            setGameOver(true);
            setIsPlaying(false);
            addHighScore('tetris', state.score);
            playSound(100, 'sawtooth', 0.5); // Game over
        } else {
            state.piece = newPiece;
            setCurrentPiece(newPiece);
        }
    };

    const drop = () => {
        const state = stateRef.current;
        const newPos = { ...state.piece.pos, y: state.piece.pos.y + 1 };
        
        if (isValidMove(state.piece, newPos, state.board)) {
            state.piece.pos = newPos;
            setCurrentPiece({ ...state.piece });
        } else {
            mergePieceToBoard();
        }
        state.dropCounter = 0;
    };

    const move = (dir: number) => {
        const state = stateRef.current;
        const newPos = { ...state.piece.pos, x: state.piece.pos.x + dir };
        if (isValidMove(state.piece, newPos, state.board)) {
            state.piece.pos = newPos;
            setCurrentPiece({ ...state.piece });
            playSound(300, 'sine', 0.05); // Move sound
        }
    };

    const rotate = () => {
        const state = stateRef.current;
        const shape = state.piece.shape;
        // Transpose and reverse rows
        const newShape = shape[0].map((_, colIndex) => shape.map(row => row[colIndex]).reverse());
        
        if (isValidMove({ ...state.piece, shape: newShape }, state.piece.pos, state.board)) {
            state.piece.shape = newShape;
            setCurrentPiece({ ...state.piece });
            playSound(400, 'sine', 0.05); // Rotate sound
        }
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPlaying || gameOver) return;
            switch (e.key) {
                case 'ArrowLeft': move(-1); break;
                case 'ArrowRight': move(1); break;
                case 'ArrowDown': drop(); break;
                case 'ArrowUp': rotate(); break;
                case ' ': 
                    // Hard drop
                    let newY = stateRef.current.piece.pos.y;
                    while (isValidMove(stateRef.current.piece, { x: stateRef.current.piece.pos.x, y: newY + 1 }, stateRef.current.board)) {
                        newY++;
                    }
                    stateRef.current.piece.pos.y = newY;
                    drop();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, gameOver]);

    // Game loop
    useEffect(() => {
        if (!isPlaying || gameOver) return;
        
        const settings = getDifficultySettings();
        let animationFrameId: number;

        const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
            const grad = ctx.createLinearGradient(x * BLOCK_SIZE, y * BLOCK_SIZE, (x + 1) * BLOCK_SIZE, (y + 1) * BLOCK_SIZE);
            grad.addColorStop(0, color);
            grad.addColorStop(1, '#00000040');
            ctx.fillStyle = grad;
            ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            
            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, 4);
            ctx.fillRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, 4, BLOCK_SIZE - 4);
            
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + BLOCK_SIZE - 6, BLOCK_SIZE - 4, 4);
            ctx.fillRect(x * BLOCK_SIZE + BLOCK_SIZE - 6, y * BLOCK_SIZE + 2, 4, BLOCK_SIZE - 4);
            
            // Inner border
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        };

        const gameLoop = (time: number) => {
            const state = stateRef.current;
            const deltaTime = time - state.lastTime;
            state.lastTime = time;
            
            state.dropCounter += deltaTime;
            
            // Calculate drop interval based on level and difficulty
            const dropInterval = Math.max(100, settings.baseSpeed - (state.level - 1) * settings.speedDecrease);
            
            if (state.dropCounter > dropInterval) {
                drop();
            }

            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear canvas
            ctx.fillStyle = '#0f172a'; // slate-900
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw grid
            ctx.strokeStyle = '#1e293b'; // slate-800
            ctx.lineWidth = 1;
            for (let x = 0; x <= COLS; x++) {
                ctx.beginPath();
                ctx.moveTo(x * BLOCK_SIZE, 0);
                ctx.lineTo(x * BLOCK_SIZE, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y <= ROWS; y++) {
                ctx.beginPath();
                ctx.moveTo(0, y * BLOCK_SIZE);
                ctx.lineTo(canvas.width, y * BLOCK_SIZE);
                ctx.stroke();
            }

            // Draw board
            state.board.forEach((row, y) => {
                row.forEach((color, x) => {
                    if (color !== '') {
                        drawBlock(ctx, x, y, color);
                    }
                });
            });

            // Draw ghost piece
            let ghostY = state.piece.pos.y;
            while (isValidMove(state.piece, { x: state.piece.pos.x, y: ghostY + 1 }, state.board)) {
                ghostY++;
            }
            
            ctx.globalAlpha = 0.2;
            state.piece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        drawBlock(ctx, state.piece.pos.x + x, ghostY + y, state.piece.color);
                    }
                });
            });
            ctx.globalAlpha = 1.0;

            // Draw current piece
            state.piece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        drawBlock(ctx, state.piece.pos.x + x, state.piece.pos.y + y, state.piece.color);
                    }
                });
            });

            animationFrameId = requestAnimationFrame(gameLoop);
        };
        
        stateRef.current.lastTime = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);
        
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying, gameOver, difficulty]);

    const handleMobileControl = (action: string) => {
        if (!isPlaying || gameOver) return;
        switch (action) {
            case 'left': move(-1); break;
            case 'right': move(1); break;
            case 'up': rotate(); break;
            case 'down': drop(); break;
            case 'action': 
                // Hard drop
                let newY = stateRef.current.piece.pos.y;
                while (isValidMove(stateRef.current.piece, { x: stateRef.current.piece.pos.x, y: newY + 1 }, stateRef.current.board)) {
                    newY++;
                }
                stateRef.current.piece.pos.y = newY;
                drop();
                break;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
            <div className="w-full max-w-sm flex justify-between items-center px-4">
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    &larr; Back
                </button>
                <div className="flex flex-col items-end text-white font-mono">
                    <div className="text-xl font-bold text-blue-400">SCORE: {score}</div>
                    <div className="text-sm text-purple-400">LEVEL: {level}</div>
                </div>
            </div>
            <div className="relative p-2 bg-slate-800 rounded-xl border-4 border-slate-700 shadow-2xl">
                <canvas ref={canvasRef} width={COLS * BLOCK_SIZE} height={ROWS * BLOCK_SIZE} className="bg-slate-900 rounded-lg shadow-inner" />
                
                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
                        <button onClick={resetGame} className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all hover:scale-105">
                            START GAME
                        </button>
                    </div>
                )}
                
                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg gap-4">
                        <h3 className="text-4xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">GAME OVER</h3>
                        <p className="text-white text-xl font-mono">Final Score: {score}</p>
                        <button onClick={resetGame} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full font-bold text-lg shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all flex items-center gap-2 hover:scale-105 mt-4">
                            <RefreshCw className="w-5 h-5" />
                            PLAY AGAIN
                        </button>
                    </div>
                )}
            </div>
            
            <div className="hidden md:block text-gray-500 text-sm">Arrow keys to move/rotate, Space to hard drop</div>
            <div className="md:hidden w-full max-w-sm mt-4">
                <MobileControls onAction={handleMobileControl} />
            </div>
        </div>
    );
};
