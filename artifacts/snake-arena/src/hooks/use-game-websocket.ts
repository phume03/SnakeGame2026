import { useState, useEffect, useRef, useCallback } from 'react';

export type GameState = {
  worldId: string;
  status: 'WAITING' | 'RUNNING' | 'PAUSED' | 'LEVEL_COMPLETE' | 'GAME_OVER';
  level: number;
  gridW: number;
  gridH: number;
  snakes: Array<{
    id: string;
    name: string;
    type: 'PLAYER' | 'AI';
    color: string;
    alive: boolean;
    score: number;
    direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
    body: Array<[number, number]>;
  }>;
  apples: Array<{
    x: number;
    y: number;
    color: string;
    points: number;
  }>;
  obstacles: Array<{
    type: 'WALL' | 'MOVING_BLOCK';
    cells: Array<[number, number]>;
  }>;
};

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export function useGameWebSocket(playerName: string, mode: 'SINGLE' | 'MULTI') {
  const [status, setStatus] = useState<ConnectionStatus>('CONNECTING');
  const [message, setMessage] = useState<{ title: string; body: string } | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<{ winner: string } | null>(null);
  const [levelTransition, setLevelTransition] = useState<{ level: number } | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!playerName) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/game`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('CONNECTED');
      const action = mode === 'SINGLE' ? 'JOIN_SINGLE' : 'JOIN_MULTI';
      ws.send(JSON.stringify({ action, playerName }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'CONNECTED':
            setSessionId(data.sessionId);
            break;
          case 'JOINED':
          case 'STARTING':
            setMessage({ title: data.type === 'STARTING' ? 'STARTING!' : 'READY', body: data.message });
            if (data.type === 'STARTING') {
              setTimeout(() => setMessage(null), 1500);
            }
            break;
          case 'STATE':
            setGameState(data);
            setMessage(null);
            break;
          case 'LEVEL_COMPLETE':
            setLevelTransition({ level: data.newLevel });
            setTimeout(() => setLevelTransition(null), 2000);
            break;
          case 'GAME_OVER':
            setGameOver({ winner: data.winner || 'Nobody' });
            break;
          case 'ERROR':
            setStatus('ERROR');
            setMessage({ title: 'ERROR', body: data.message });
            break;
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    ws.onclose = () => {
      setStatus('DISCONNECTED');
    };

    ws.onerror = () => {
      setStatus('ERROR');
    };

    return () => {
      ws.close();
    };
  }, [playerName, mode]);

  const sendAction = useCallback((action: string, payload: any = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...payload }));
    }
  }, []);

  const startGame = useCallback(() => {
    sendAction('START');
  }, [sendAction]);

  const sendInput = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    sendAction('INPUT', { direction });
  }, [sendAction]);

  return {
    status,
    message,
    gameState,
    sessionId,
    gameOver,
    levelTransition,
    startGame,
    sendInput
  };
}
