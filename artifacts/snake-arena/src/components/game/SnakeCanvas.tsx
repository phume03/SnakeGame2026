import React, { useEffect, useRef } from 'react';
import { GameState } from '@/hooks/use-game-websocket';

interface SnakeCanvasProps {
  gameState: GameState | null;
  mySessionId: string | null;
}

export function SnakeCanvas({ gameState, mySessionId }: SnakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let cellSize = 20;

    const resize = () => {
      const W = gameState?.gridW || 40;
      const H = gameState?.gridH || 30;
      const maxW = container.clientWidth;
      const maxH = container.clientHeight;
      
      cellSize = Math.max(10, Math.floor(Math.min(maxW / W, maxH / H)));
      
      canvas.width = W * cellSize;
      canvas.height = H * cellSize;
    };

    window.addEventListener('resize', resize);
    resize();

    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const render = () => {
      if (!gameState) return;
      
      const W = gameState.gridW;
      const H = gameState.gridH;
      const cs = cellSize;

      // Draw Background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        ctx.moveTo(x * cs, 0);
        ctx.lineTo(x * cs, H * cs);
      }
      for (let y = 0; y <= H; y++) {
        ctx.moveTo(0, y * cs);
        ctx.lineTo(W * cs, y * cs);
      }
      ctx.stroke();

      // Draw Obstacles
      gameState.obstacles?.forEach(obs => {
        const isMoving = obs.type === 'MOVING_BLOCK';
        ctx.fillStyle = isMoving ? '#FF6B00' : '#2a2a3a';
        ctx.shadowColor = isMoving ? '#FF6B00' : 'transparent';
        ctx.shadowBlur = isMoving ? 10 : 0;

        obs.cells.forEach(([cx, cy]) => {
          ctx.fillRect(cx * cs + 1, cy * cs + 1, cs - 2, cs - 2);
        });
      });
      ctx.shadowBlur = 0;

      // Draw Apples
      gameState.apples?.forEach(apple => {
        const ax = apple.x * cs + cs / 2;
        const ay = apple.y * cs + cs / 2;
        const r = cs * 0.4;
        
        const grad = ctx.createRadialGradient(ax - r*0.3, ay - r*0.3, r*0.1, ax, ay, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, apple.color);
        
        ctx.fillStyle = grad;
        ctx.shadowColor = apple.color;
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        ctx.arc(ax, ay, r, 0, Math.PI * 2);
        ctx.fill();

        // Stem
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ax, ay - r);
        ctx.lineTo(ax + r*0.4, ay - r*1.5);
        ctx.stroke();
      });

      // Draw Snakes
      gameState.snakes?.forEach(snake => {
        if (!snake.body || snake.body.length === 0) return;
        
        const color = snake.color;
        const isMe = snake.id === mySessionId;
        const alpha = snake.alive ? 1.0 : 0.3;

        // Draw body segments
        snake.body.forEach((seg, i) => {
          const isHead = i === 0;
          const px = seg[0] * cs;
          const py = seg[1] * cs;
          
          if (isHead) {
            ctx.shadowColor = color;
            ctx.shadowBlur = snake.alive ? 20 : 0;
            ctx.fillStyle = color;
          } else {
            ctx.shadowBlur = 0;
            ctx.globalAlpha = alpha * (1 - (i / snake.body.length) * 0.5);
            ctx.fillStyle = color;
          }

          const margin = isHead ? 0 : 1;
          const rr = isHead ? cs * 0.3 : cs * 0.2;
          
          drawRoundRect(px + margin, py + margin, cs - 2*margin, cs - 2*margin, rr);
          ctx.fill();
          ctx.globalAlpha = 1.0;

          // Draw Eyes on head
          if (isHead && snake.alive) {
            ctx.shadowBlur = 0;
            const hx = px + cs/2;
            const hy = py + cs/2;
            const r = cs * 0.15;
            const off = cs * 0.25;
            
            let ox = 0, oy = 0;
            if (snake.direction === 'RIGHT' || snake.direction === 'LEFT') {
              oy = off;
              ox = snake.direction === 'RIGHT' ? off : -off;
            } else {
              ox = off;
              oy = snake.direction === 'DOWN' ? off : -off;
            }

            // Whites
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(hx + ox, hy - oy, r, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(hx - ox, hy + oy, r, 0, Math.PI*2); ctx.fill();
            
            // Pupils
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(hx + ox + (ox*0.2), hy - oy + (oy*0.2), r*0.5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(hx - ox + (ox*0.2), hy + oy + (oy*0.2), r*0.5, 0, Math.PI*2); ctx.fill();
          }
        });

        // Name Tag
        if (snake.alive) {
          ctx.shadowBlur = 0;
          const hx = snake.body[0][0] * cs + cs/2;
          const hy = snake.body[0][1] * cs - 6;
          ctx.font = `bold ${Math.max(10, cs * 0.6)}px 'Chakra Petch'`;
          ctx.fillStyle = isMe ? '#fff' : color;
          ctx.textAlign = 'center';
          ctx.fillText(isMe ? 'YOU' : snake.name, hx, hy);
        }
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    resize();
    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, mySessionId]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center p-4">
      <canvas 
        ref={canvasRef} 
        className="block bg-[#0a0a0f] rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/10"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
