import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import Matter from 'matter-js';
import { playSound } from '../lib/audio';
import { Coins, RefreshCw, Sparkles, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

const CANVAS_WIDTH = 450;
const CANVAS_HEIGHT = 700;

export const Pachinko: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { coins, addCoins, removeCoins } = useGame();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef(Matter.Engine.create());
    const runnerRef = useRef<Matter.Runner>();
    const [ballCount, setBallCount] = useState(0);
    const [jackpotActive, setJackpotActive] = useState(false);

    useEffect(() => {
        const engine = engineRef.current;
        const world = engine.world;
        
        engine.gravity.y = 1.0;

        const render = Matter.Render.create({
            canvas: canvasRef.current!,
            engine: engine,
            options: {
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                wireframes: false,
                background: 'transparent'
            }
        });

        const wallOptions = { 
            isStatic: true, 
            restitution: 0.9,
            render: { fillStyle: '#1a1a1a', strokeStyle: '#333', lineWidth: 2 }
        };
        
        Matter.World.add(world, [
            Matter.Bodies.rectangle(CANVAS_WIDTH / 2, 0, CANVAS_WIDTH, 20, wallOptions),
            Matter.Bodies.rectangle(0, CANVAS_HEIGHT / 2, 20, CANVAS_HEIGHT, wallOptions),
            Matter.Bodies.rectangle(CANVAS_WIDTH, CANVAS_HEIGHT / 2, 20, CANVAS_HEIGHT, wallOptions),
            Matter.Bodies.rectangle(CANVAS_WIDTH / 4, CANVAS_HEIGHT - 10, CANVAS_WIDTH / 2, 20, { ...wallOptions, angle: 0.2 }),
            Matter.Bodies.rectangle(3 * CANVAS_WIDTH / 4, CANVAS_HEIGHT - 10, CANVAS_WIDTH / 2, 20, { ...wallOptions, angle: -0.2 })
        ]);

        // Complex Pin Layout
        const pins: Matter.Body[] = [];
        const createPinCircle = (centerX: number, centerY: number, radius: number, count: number) => {
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                pins.push(Matter.Bodies.circle(x, y, 3, { 
                    isStatic: true, 
                    restitution: 0.8,
                    render: { fillStyle: '#fbbf24', strokeStyle: '#fff', lineWidth: 1 }
                }));
            }
        };

        // Center Diamond
        createPinCircle(CANVAS_WIDTH / 2, 250, 60, 12);
        createPinCircle(CANVAS_WIDTH / 2, 250, 30, 6);
        
        // Side Clusters
        createPinCircle(100, 400, 40, 8);
        createPinCircle(350, 400, 40, 8);

        // General Grid
        for (let row = 0; row < 18; row++) {
            for (let col = 0; col < 12; col++) {
                const x = col * 40 + (row % 2 === 0 ? 20 : 40);
                const y = row * 35 + 60;
                if (x > 30 && x < CANVAS_WIDTH - 30) {
                    // Skip pins that overlap with clusters
                    const distToCenter = Math.hypot(x - CANVAS_WIDTH/2, y - 250);
                    const distToLeft = Math.hypot(x - 100, y - 400);
                    const distToRight = Math.hypot(x - 350, y - 400);
                    
                    if (distToCenter > 70 && distToLeft > 50 && distToRight > 50) {
                        pins.push(Matter.Bodies.circle(x, y, 3, { 
                            isStatic: true, 
                            restitution: 0.7,
                            render: { fillStyle: '#94a3b8', strokeStyle: '#fff', lineWidth: 0.5 }
                        }));
                    }
                }
            }
        }
        Matter.World.add(world, pins);

        // Pockets
        const pockets: Matter.Body[] = [];
        const pocketPositions = [
            { x: CANVAS_WIDTH / 2, y: 250, label: 'jackpot', color: '#ef4444', prize: 100, size: 45 },
            { x: 100, y: 400, label: 'win', color: '#f59e0b', prize: 25, size: 35 },
            { x: 350, y: 400, label: 'win', color: '#f59e0b', prize: 25, size: 35 },
            { x: CANVAS_WIDTH / 2, y: 550, label: 'win', color: '#10b981', prize: 15, size: 40 },
            { x: CANVAS_WIDTH / 2 - 80, y: 620, label: 'win', color: '#3b82f6', prize: 10, size: 30 },
            { x: CANVAS_WIDTH / 2 + 80, y: 620, label: 'win', color: '#3b82f6', prize: 10, size: 30 }
        ];

        pocketPositions.forEach(pos => {
            const pocket = Matter.Bodies.circle(pos.x, pos.y, pos.size / 2, { 
                isStatic: true, 
                isSensor: true,
                label: pos.label,
                plugin: { prize: pos.prize },
                render: { 
                    fillStyle: pos.color,
                    strokeStyle: '#fff',
                    lineWidth: 3
                }
            });
            pockets.push(pocket);
        });
        Matter.World.add(world, pockets);

        Matter.Events.on(engine, 'collisionStart', (event: any) => {
            event.pairs.forEach((pair: any) => {
                const { bodyA, bodyB } = pair;
                const pocket = bodyA.isSensor ? bodyA : bodyB.isSensor ? bodyB : null;
                const ball = pocket === bodyA ? bodyB : bodyA;

                if (pocket && !ball.isStatic) {
                    const prize = (pocket as any).plugin.prize;
                    if (prize) {
                        Matter.World.remove(world, ball);
                        setBallCount(prev => Math.max(0, prev - 1));
                        addCoins(prize);
                        playSound('coin');
                        
                        if (pocket.label === 'jackpot') {
                            setJackpotActive(true);
                            playSound('win');
                            confetti({ particleCount: 50, spread: 60, origin: { x: posToCanvas(pocket.position.x), y: posToCanvas(pocket.position.y) } });
                            setTimeout(() => setJackpotActive(false), 2000);
                        }
                        
                        pocket.render.opacity = 0.3;
                        setTimeout(() => pocket.render.opacity = 1, 150);
                    }
                } else if (!bodyA.isSensor && !bodyB.isSensor) {
                    if (Math.random() > 0.8) playSound(1000 + Math.random() * 500, 'sine', 0.01);
                }
            });
        });

        const posToCanvas = (val: number) => val / CANVAS_WIDTH;

        const cleanupInterval = setInterval(() => {
            const ballsInWorld = Matter.Composite.allBodies(world).filter(b => !b.isStatic && !b.isSensor);
            ballsInWorld.forEach(ball => {
                if (ball.position.y > CANVAS_HEIGHT + 50) {
                    Matter.World.remove(world, ball);
                    setBallCount(prev => Math.max(0, prev - 1));
                }
            });
        }, 1000);

        const runner = Matter.Runner.create();
        Matter.Runner.run(runner, engine);
        Matter.Render.run(render);
        runnerRef.current = runner;

        return () => {
            clearInterval(cleanupInterval);
            Matter.Runner.stop(runner);
            Matter.Render.stop(render);
            Matter.World.clear(world, false);
            Matter.Engine.clear(engine);
        };
    }, [addCoins]);

    const launchBall = () => {
        if (removeCoins(5)) {
            const engine = engineRef.current;
            const ball = Matter.Bodies.circle(CANVAS_WIDTH - 30, CANVAS_HEIGHT - 60, 6, { 
                restitution: 0.6,
                friction: 0.001,
                render: { 
                    fillStyle: '#e2e8f0',
                    strokeStyle: '#fff',
                    lineWidth: 2
                }
            });
            
            const force = -0.04 - (Math.random() * 0.015);
            Matter.Body.applyForce(ball, ball.position, { x: -0.008, y: force });
            Matter.World.add(engine.world, ball);
            setBallCount(prev => prev + 1);
            playSound('shoot');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 font-display">
            <div className="w-full max-w-xl flex justify-between items-center px-4">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold uppercase tracking-widest text-sm">
                    &larr; EXIT PARLOR
                </button>
                <div className="bg-black/80 px-6 py-2 rounded-full border border-yellow-500/30 flex items-center gap-3 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                    <Coins className="text-yellow-400 w-5 h-5" />
                    <span className="font-mono text-xl text-yellow-400 font-black">{coins}</span>
                </div>
            </div>

            <div className="relative">
                {/* Cabinet Frame */}
                <div className="absolute -inset-8 bg-gradient-to-b from-zinc-700 via-zinc-800 to-black rounded-[3rem] border-8 border-zinc-600 shadow-[0_0_100px_rgba(0,0,0,0.9)]" />
                <div className="absolute -inset-4 bg-black rounded-[2.8rem] border border-white/10" />
                
                {/* Neon Header */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-20 bg-black border-4 border-pink-500 rounded-t-[2rem] flex items-center justify-center shadow-[0_-10px_30px_rgba(236,72,153,0.3)] z-10">
                    <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-pink-500 tracking-[0.3em] animate-pulse">夢のパチンコ</span>
                        <span className="text-[8px] text-pink-400/50 font-bold tracking-widest uppercase">Dream Pachinko</span>
                    </div>
                </div>

                <div className="relative p-4 bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden border-4 border-zinc-800 arcade-grid">
                    <canvas ref={canvasRef} className="rounded-2xl relative z-10" />
                    
                    {/* Background Decorative Elements */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                        <div className="w-64 h-64 border-8 border-pink-500 rounded-full animate-ping" />
                    </div>

                    {/* Jackpot Overlay */}
                    <AnimatePresence>
                        {jackpotActive && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center z-50 bg-pink-500/20 backdrop-blur-sm"
                            >
                                <div className="text-6xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] italic uppercase tracking-tighter">
                                    JACKPOT!!
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Status Panels */}
                <div className="absolute top-12 right-12 bg-black/90 border-2 border-cyan-500/30 p-4 rounded-2xl flex flex-col items-center min-w-[100px] shadow-[0_0_20px_rgba(6,182,212,0.2)] z-20">
                    <span className="text-[10px] text-cyan-500 uppercase font-black tracking-widest mb-1">Balls</span>
                    <span className="text-3xl font-mono font-black text-white">{ballCount}</span>
                </div>

                <div className="absolute top-12 left-12 bg-black/90 border-2 border-pink-500/30 p-4 rounded-2xl flex flex-col items-center min-w-[100px] shadow-[0_0_20px_rgba(236,72,153,0.2)] z-20">
                    <span className="text-[10px] text-pink-500 uppercase font-black tracking-widest mb-1">Prize</span>
                    <span className="text-3xl font-mono font-black text-white">MAX</span>
                </div>
            </div>

            <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={launchBall} 
                    className="w-full py-6 bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 bg-[length:200%_auto] hover:bg-right text-white rounded-2xl font-black text-3xl shadow-[0_15px_40px_rgba(236,72,153,0.4)] transition-all border-b-8 border-pink-800 active:border-b-0 active:translate-y-2 uppercase tracking-widest"
                >
                    Launch!
                </motion.button>
                <div className="flex items-center gap-2 text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em]">
                    <Zap className="w-3 h-3" />
                    5 Coins / Ball
                    <Zap className="w-3 h-3" />
                </div>
            </div>
        </div>
    );
};
