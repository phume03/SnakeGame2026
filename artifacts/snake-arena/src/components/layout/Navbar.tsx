import { Link, useLocation } from "wouter";
import { Trophy, Home, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-7xl mx-auto flex h-16 items-center px-4">
        <Link href="/" className="flex items-center gap-2 mr-8 group">
          <span className="text-2xl group-hover:animate-glitch">🐍</span>
          <span className="font-display text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary text-glow">
            SNAKE ARENA
          </span>
        </Link>
        
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link 
            href="/" 
            className={cn(
              "flex items-center gap-2 transition-colors hover:text-primary",
              location === "/" ? "text-primary text-glow" : "text-muted-foreground"
            )}
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">HOME</span>
          </Link>
          <Link 
            href="/leaderboard" 
            className={cn(
              "flex items-center gap-2 transition-colors hover:text-secondary",
              location === "/leaderboard" ? "text-secondary text-glow" : "text-muted-foreground"
            )}
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">LEADERBOARD</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
