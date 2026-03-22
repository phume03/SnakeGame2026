import { useState } from "react";
import { Search, Trophy, History, Swords } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGetLeaderboard, useGetPlayerScores, useGetRecentMatches } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";

export default function Leaderboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'TOP' | 'HISTORY'>('TOP');

  // We keep search query separate from the active fetch query to only search on submit
  const [activeSearch, setActiveSearch] = useState("");

  const { data: topScores, isLoading: loadingTop } = useGetLeaderboard({ limit: 50 });
  const { data: playerScores, isLoading: loadingPlayer } = useGetPlayerScores(activeSearch, { query: { enabled: !!activeSearch } });
  const { data: recentMatches, isLoading: loadingMatches } = useGetRecentMatches();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery.trim());
    setActiveTab('TOP');
  };

  const clearSearch = () => {
    setSearchQuery("");
    setActiveSearch("");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-display text-glow text-white mb-2">LEADERBOARD</h1>
          <p className="text-muted-foreground">Global rankings and combat history.</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex w-full md:w-auto gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search callsign..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              className="pl-9 font-display tracking-widest"
            />
          </div>
          <Button type="submit" variant="secondary">FIND</Button>
          {activeSearch && (
            <Button type="button" variant="outline" onClick={clearSearch}>CLEAR</Button>
          )}
        </form>
      </div>

      <div className="flex gap-4 mb-6 border-b border-border pb-px">
        <button
          onClick={() => setActiveTab('TOP')}
          className={`pb-3 px-4 font-display text-xl transition-colors relative ${activeTab === 'TOP' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
        >
          <div className="flex items-center gap-2"><Trophy className="w-5 h-5" /> HIGH SCORES</div>
          {activeTab === 'TOP' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-md shadow-[0_0_10px_hsl(var(--primary))]" />}
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 px-4 font-display text-xl transition-colors relative ${activeTab === 'HISTORY' ? 'text-secondary' : 'text-muted-foreground hover:text-white'}`}
        >
          <div className="flex items-center gap-2"><Swords className="w-5 h-5" /> MATCH HISTORY</div>
          {activeTab === 'HISTORY' && <div className="absolute bottom-0 left-0 w-full h-1 bg-secondary rounded-t-md shadow-[0_0_10px_hsl(var(--secondary))]" />}
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden relative">
        {/* Glow accent */}
        <div className={`absolute top-0 left-0 w-full h-1 ${activeTab === 'TOP' ? 'bg-primary' : 'bg-secondary'} opacity-50`} />

        {activeTab === 'TOP' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-border text-muted-foreground text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold w-16 text-center">Rank</th>
                  <th className="p-4 font-semibold">Callsign</th>
                  <th className="p-4 font-semibold text-right">Score</th>
                  <th className="p-4 font-semibold text-center">Level</th>
                  <th className="p-4 font-semibold">Mode</th>
                  <th className="p-4 font-semibold text-right hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeSearch ? (
                  // Search Results
                  loadingPlayer ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><div className="animate-pulse">DECRYPTING ARCHIVES...</div></td></tr>
                  ) : playerScores?.length ? (
                    playerScores.map((entry, idx) => (
                      <ScoreRow key={idx} entry={entry} rank={idx + 1} />
                    ))
                  ) : (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">NO RECORDS FOUND FOR {activeSearch}</td></tr>
                  )
                ) : (
                  // Global Top
                  loadingTop ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><div className="animate-pulse">DECRYPTING ARCHIVES...</div></td></tr>
                  ) : topScores?.length ? (
                    topScores.map((entry, idx) => (
                      <ScoreRow key={idx} entry={entry} rank={idx + 1} />
                    ))
                  ) : (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">LEADERBOARD EMPTY.</td></tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'HISTORY' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-border text-muted-foreground text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">World ID</th>
                  <th className="p-4 font-semibold">Combatants</th>
                  <th className="p-4 font-semibold">Victor</th>
                  <th className="p-4 font-semibold text-center">Mode</th>
                  <th className="p-4 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingMatches ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground"><div className="animate-pulse">LOADING LOGS...</div></td></tr>
                ) : recentMatches?.length ? (
                  recentMatches.map((match, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-mono text-xs text-muted-foreground">{match.worldId}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {match.playerNames.map(p => (
                            <span key={p} className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        {match.winnerName && match.winnerName !== 'Nobody' ? (
                          <span className="text-yellow-400 font-bold flex items-center gap-2">
                            <Trophy className="w-3 h-3" /> {match.winnerName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Draw / None</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-xs px-2 py-1 rounded border ${match.gameMode === 'SINGLE_PLAYER' ? 'border-primary/30 text-primary bg-primary/10' : 'border-secondary/30 text-secondary bg-secondary/10'}`}>
                          {match.gameMode.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-right text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(match.playedAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">NO MATCHES RECORDED.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreRow({ entry, rank }: { entry: any, rank: number }) {
  const isGold = rank === 1;
  const isSilver = rank === 2;
  const isBronze = rank === 3;

  return (
    <tr className={`hover:bg-white/[0.02] transition-colors ${isGold ? 'bg-yellow-500/5' : ''}`}>
      <td className="p-4 text-center font-display text-xl">
        {isGold ? <span className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">1</span> :
         isSilver ? <span className="text-gray-300">2</span> :
         isBronze ? <span className="text-amber-600">3</span> :
         <span className="text-muted-foreground">{rank}</span>}
      </td>
      <td className={`p-4 font-bold tracking-wider ${isGold ? 'text-yellow-400' : 'text-white'}`}>
        {entry.playerName}
      </td>
      <td className="p-4 text-right">
        <span className="text-primary font-display text-xl">{entry.score.toLocaleString()}</span>
      </td>
      <td className="p-4 text-center">
        <span className="bg-white/10 px-2 py-1 rounded font-mono text-sm">{entry.level}</span>
      </td>
      <td className="p-4">
        <span className={`text-xs px-2 py-1 rounded border ${entry.gameMode === 'SINGLE_PLAYER' ? 'border-primary/30 text-primary' : 'border-secondary/30 text-secondary'}`}>
          {entry.gameMode.replace('_', ' ')}
        </span>
      </td>
      <td className="p-4 text-right text-sm text-muted-foreground hidden sm:table-cell whitespace-nowrap">
        {formatDate(entry.playedAt)}
      </td>
    </tr>
  );
}
