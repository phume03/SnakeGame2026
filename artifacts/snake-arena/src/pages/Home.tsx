import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Bot, Gamepad2, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetLeaderboard, useGetActiveWorlds } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedMode, setSelectedMode] = useState<'SINGLE' | 'MULTI' | null>(null);
  const [playerName, setPlayerName] = useState("");

  const { data: leaderboard } = useGetLeaderboard({ limit: 5 });
  const { data: worldsInfo } = useGetActiveWorlds();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !selectedMode) return;
    setLocation(`/game?mode=${selectedMode}&name=${encodeURIComponent(playerName.trim())}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center py-12 px-4 relative">
      {/* Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute bottom-0 w-full h-[50vh] bg-grid-pattern opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-6xl md:text-8xl font-black font-display tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary animate-pulse-fast text-glow">
          SNAKE ARENA
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-wide">
          Classic Snake. Multiplayer Mayhem. 10 Brutal Levels.
        </p>
      </motion.div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {/* Single Player Card */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedMode('SINGLE')}
          className={`cursor-pointer rounded-2xl p-8 border-2 backdrop-blur-sm transition-all duration-300 shadow-lg ${
            selectedMode === 'SINGLE' 
              ? 'border-primary bg-primary/10 shadow-[0_0_30px_hsl(var(--primary)/0.2)]' 
              : 'border-white/10 bg-card/40 hover:border-primary/50'
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-display mb-4 text-white">Single Player</h2>
          <p className="text-muted-foreground mb-6 h-12">
            Battle the ruthless AI system snake through 10 increasingly difficult obstacle courses.
          </p>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> 10 Deterministic Levels</li>
            <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> BFS Pathfinding AI Opponent</li>
            <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Double-tap to Warp</li>
          </ul>
        </motion.div>

        {/* Multiplayer Card */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedMode('MULTI')}
          className={`cursor-pointer rounded-2xl p-8 border-2 backdrop-blur-sm transition-all duration-300 shadow-lg ${
            selectedMode === 'MULTI' 
              ? 'border-secondary bg-secondary/10 shadow-[0_0_30px_hsl(var(--secondary)/0.2)]' 
              : 'border-white/10 bg-card/40 hover:border-secondary/50'
          }`}
        >
          <div className="flex justify-between items-start mb-6">
            <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
              <Users className="w-8 h-8 text-secondary" />
            </div>
            {worldsInfo && (
              <div className="bg-secondary/20 border border-secondary text-secondary px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                {worldsInfo.runningWorlds + worldsInfo.waitingWorlds} Active Worlds
              </div>
            )}
          </div>
          <h2 className="text-3xl font-display mb-4 text-white">Multiplayer</h2>
          <p className="text-muted-foreground mb-6 h-12">
            Enter the arena. Up to 3 players per world. Last snake standing wins the match.
          </p>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-secondary" /> 3 Players per Arena</li>
            <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-secondary" /> Auto-matchmaking</li>
            <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-secondary" /> Real-time WebSocket</li>
          </ul>
        </motion.div>
      </div>

      {/* Join Form Modal/Inline */}
      <AnimatePresence>
        {selectedMode && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-full max-w-md bg-card border border-white/20 p-6 rounded-2xl shadow-2xl relative z-10 box-glow"
            style={{ '--tw-shadow-color': selectedMode === 'SINGLE' ? 'hsl(var(--primary)/0.3)' : 'hsl(var(--secondary)/0.3)' } as any}
          >
            <h3 className="text-2xl font-display mb-4 text-center">
              Deploying to {selectedMode === 'SINGLE' ? 'Sector Alpha' : 'Sector Beta'}
            </h3>
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <Input
                placeholder="ENTER CALLSIGN..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                maxLength={15}
                className="text-center font-display text-2xl tracking-widest uppercase h-14"
                autoFocus
              />
              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedMode(null)}
                >
                  ABORT
                </Button>
                <Button 
                  type="submit" 
                  className={`flex-1 ${selectedMode === 'MULTI' ? 'bg-secondary hover:bg-secondary/80' : ''}`}
                  disabled={!playerName.trim()}
                >
                  INITIALIZE <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Leaderboard */}
      {!selectedMode && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-3xl mt-12 bg-card/50 backdrop-blur border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h3 className="text-xl font-display flex items-center gap-2">
              <Trophy className="text-accent w-5 h-5" /> HALL OF FAME
            </h3>
            <Button variant="link" onClick={() => setLocation('/leaderboard')} className="text-sm">
              VIEW ALL TARGETS
            </Button>
          </div>
          
          {leaderboard && leaderboard.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leaderboard.slice(0, 6).map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className={`font-display text-lg ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      #{idx + 1}
                    </span>
                    <span className="font-bold tracking-wider">{entry.playerName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-primary font-bold">{entry.score.toLocaleString()} PTS</div>
                    <div className="text-xs text-muted-foreground">LVL {entry.level} • {entry.gameMode}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
              <Gamepad2 className="w-12 h-12 mb-3 opacity-20" />
              <p>NO DATA FOUND. BE THE FIRST.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
