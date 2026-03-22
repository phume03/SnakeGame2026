import { useEffect, useCallback, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Users, Layers, Trophy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SnakeCanvas } from "@/components/game/SnakeCanvas";
import { useGameWebSocket } from "@/hooks/use-game-websocket";

export default function Game() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const modeParam = searchParams.get('mode') as 'SINGLE' | 'MULTI' | null;
  const nameParam = searchParams.get('name');

  const mode = modeParam || 'SINGLE';
  const playerName = nameParam || 'UNKNOWN';

  const {
    status,
    message,
    gameState,
    sessionId,
    gameOver,
    levelTransition,
    startGame,
    sendInput
  } = useGameWebSocket(playerName, mode);

  // Keyboard input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrows and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          sendInput('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          sendInput('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          sendInput('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          sendInput('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sendInput]);

  // Redirect if params missing
  useEffect(() => {
    if (!nameParam) {
      setLocation('/');
    }
  }, [nameParam, setLocation]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full bg-[#05050a] overflow-hidden">
      
      {/* Main Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center p-2 md:p-4 min-h-[50vh] lg:min-h-0">
        
        {/* Background purely decorative grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        <SnakeCanvas gameState={gameState} mySessionId={sessionId} />

        {/* Overlays */}
        <AnimatePresence>
          {/* Messages (Connecting, Waiting, Starting) */}
          {(status === 'CONNECTING' || message) && !gameOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <div className="bg-card border border-white/10 p-8 rounded-2xl shadow-2xl text-center max-w-md box-glow relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />
                <Terminal className="w-12 h-12 text-primary mx-auto mb-4 opacity-80" />
                <h2 className="text-2xl font-display mb-2">
                  {status === 'CONNECTING' ? 'ESTABLISHING UPLINK...' : message?.title}
                </h2>
                <p className="text-muted-foreground whitespace-pre-line mb-6 min-h-[3rem]">
                  {status === 'CONNECTING' ? 'Connecting to Arena Servers...' : message?.body}
                </p>
                
                {message?.title === 'READY' && mode === 'SINGLE' && (
                  <Button onClick={startGame} className="w-full h-12 text-lg">
                    INITIALIZE COMBAT
                  </Button>
                )}
                
                {(message?.title === 'Waiting...' || status === 'CONNECTING') && (
                  <div className="flex justify-center mt-4">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Level Transition */}
          {levelTransition && !gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.5, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center"
              >
                <div className="text-primary tracking-[0.5em] font-bold mb-2">SECTOR CLEARED</div>
                <div className="text-8xl md:text-9xl font-black font-display text-transparent bg-clip-text bg-gradient-to-b from-white to-primary drop-shadow-[0_0_30px_hsl(var(--primary))]">
                  LEVEL {levelTransition.level}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Game Over */}
          {gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            >
              <div className="bg-card/80 border-2 border-destructive p-8 md:p-12 rounded-2xl shadow-[0_0_50px_hsl(var(--destructive)/0.3)] text-center max-w-lg w-full">
                <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-6" />
                <h2 className="text-5xl font-display mb-2 text-white">GAME OVER</h2>
                
                <div className="my-8 p-6 bg-black/50 rounded-xl border border-white/5">
                  <div className="text-sm text-muted-foreground uppercase tracking-widest mb-1">VICTOR</div>
                  <div className="text-3xl font-bold text-yellow-400 flex justify-center items-center gap-3">
                    <Trophy className="w-8 h-8" /> {gameOver.winner}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={() => setLocation('/')} variant="outline" className="flex-1">
                    RETURN TO BASE
                  </Button>
                  <Button onClick={() => setLocation('/leaderboard')} className="flex-1">
                    VIEW ARCHIVES
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sidebar Scoreboard */}
      <div className="w-full lg:w-72 bg-[#0d0d1a] border-t lg:border-t-0 lg:border-l border-white/10 p-4 flex flex-col gap-6 overflow-y-auto z-10 shrink-0">
        
        {/* Status Header */}
        <div className="flex flex-wrap lg:flex-col gap-3">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/5">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">SECTOR:</span>
            <span className="font-display text-lg text-primary ml-auto">{gameState?.level || 1}</span>
          </div>
          <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/5">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">MODE:</span>
            <span className="font-display text-lg text-secondary ml-auto">{mode}</span>
          </div>
        </div>

        {/* Level Dots */}
        <div>
          <h4 className="text-xs font-bold text-muted-foreground tracking-widest mb-3">PROGRESSION</h4>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 10 }).map((_, i) => {
              const active = gameState ? (i + 1) <= gameState.level : i === 0;
              return (
                <div 
                  key={i} 
                  className={`w-3 h-3 rounded-full border transition-all duration-500 ${
                    active 
                      ? 'bg-primary border-primary shadow-[0_0_8px_hsl(var(--primary))]' 
                      : 'bg-transparent border-white/20'
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* Players List */}
        <div className="flex-1 min-h-[200px]">
          <h4 className="text-xs font-bold text-muted-foreground tracking-widest mb-3 flex justify-between">
            <span>COMBATANTS</span>
            <span className="text-primary">{gameState?.snakes?.filter(s => s.alive).length || 0} ALIVE</span>
          </h4>
          
          <div className="space-y-2">
            {gameState?.snakes?.sort((a,b) => b.score - a.score).map((snake) => (
              <div 
                key={snake.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  snake.id === sessionId 
                    ? 'bg-white/10 border-white/20' 
                    : 'bg-black/40 border-transparent'
                } ${!snake.alive ? 'opacity-50 grayscale' : ''}`}
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ 
                    backgroundColor: snake.color, 
                    boxShadow: snake.alive ? `0 0 10px ${snake.color}` : 'none' 
                  }}
                />
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-bold truncate">
                    {snake.name} {snake.id === sessionId && <span className="text-xs text-primary font-normal ml-1">(YOU)</span>}
                  </div>
                  {!snake.alive && <div className="text-[10px] text-destructive tracking-widest">DESTROYED</div>}
                </div>
                <div className="text-right">
                  <div className="font-display text-xl" style={{ color: snake.color }}>{snake.score}</div>
                </div>
              </div>
            ))}

            {!gameState && (
              <div className="text-center p-6 border border-dashed border-white/10 rounded-xl text-muted-foreground text-sm">
                Waiting for telemetry...
              </div>
            )}
          </div>
        </div>

        {/* Controls Info */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-auto">
          <h4 className="text-[10px] font-bold text-primary tracking-widest mb-3 uppercase">Tactical Manual</h4>
          <div className="space-y-3 text-xs text-gray-300">
            <div className="flex items-center justify-between">
              <span>Navigation</span>
              <div className="flex gap-1">
                <kbd className="px-1.5 py-0.5 bg-black rounded border border-white/20">W</kbd>
                <kbd className="px-1.5 py-0.5 bg-black rounded border border-white/20">A</kbd>
                <kbd className="px-1.5 py-0.5 bg-black rounded border border-white/20">S</kbd>
                <kbd className="px-1.5 py-0.5 bg-black rounded border border-white/20">D</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Warp Jump</span>
              <span className="text-primary italic">Double Tap Dir</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
