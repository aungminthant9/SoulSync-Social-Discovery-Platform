'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import {
  Pencil, Eraser, Trash2, Palette, ChevronDown, ChevronUp,
  Lightbulb, Users, Wifi, WifiOff, Square, Circle, Minus,
  ArrowUpRight, Sparkles, ZoomIn, ZoomOut, Maximize2, Star, X, Loader2, PhoneOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const CANVAS_W = 2400;
const CANVAS_H = 1600;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

// ── Types ─────────────────────────────────────────────────────────────────────
type Tool = 'brush' | 'spray' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'eraser';
const SHAPE_TOOLS: Tool[] = ['rectangle', 'circle', 'line', 'arrow'];

interface Point  { x: number; y: number }
interface Stroke {
  tool: Tool; color: string; lineWidth: number;
  points?: Point[]; start?: Point; end?: Point;
}

interface AiScore {
  score: number; grade: string; title: string; feedback: string; emoji: string;
}

interface SoulCanvasProps {
  matchId: string; token: string; userId: string; partnerName?: string;
}

// ── Colour swatches ───────────────────────────────────────────────────────────
const COLORS = [
  '#E8604C','#C94A38','#2AB5A0','#D4A853',
  '#5B6AF0','#9B5DE5','#F72585','#06D6A0',
  '#FB8500','#1A1613','#FFFFFF','#A0A0A0',
];

// ── Grade colour map ──────────────────────────────────────────────────────────
const gradeColor: Record<string, string> = {
  'A+':'#06D6A0','A':'#2AB5A0','B+':'#5B6AF0','B':'#5B6AF0',
  'C+':'#D4A853','C':'#D4A853','D':'#FB8500','F':'#E8604C',
};

// ── Drawing helpers ───────────────────────────────────────────────────────────
function drawArrowhead(ctx: CanvasRenderingContext2D, from: Point, to: Point, lw: number) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size  = Math.max(lw * 4, 14);
  ctx.save();
  ctx.translate(to.x, to.y); ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0,0); ctx.lineTo(-size,-size/2.5); ctx.lineTo(-size,size/2.5);
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (!stroke) return;
  ctx.save();
  ctx.globalCompositeOperation = stroke.tool==='eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = stroke.tool==='eraser' ? 'rgba(0,0,0,1)' : stroke.color;
  ctx.fillStyle   = stroke.tool==='eraser' ? 'rgba(0,0,0,1)' : stroke.color;
  ctx.lineWidth   = stroke.lineWidth; ctx.lineCap='round'; ctx.lineJoin='round';
  const pts=stroke.points??[], s=stroke.start, e=stroke.end;
  switch(stroke.tool){
    case 'brush': case 'eraser': {
      if(pts.length<2) break;
      ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<pts.length;i++){const p=pts[i-1],c=pts[i];ctx.quadraticCurveTo(p.x,p.y,(p.x+c.x)/2,(p.y+c.y)/2);}
      ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y); ctx.stroke(); break;
    }
    case 'spray': {
      const r=stroke.lineWidth*5, d=18;
      for(let pi=0;pi<pts.length;pi++){const pt=pts[pi];for(let i=0;i<d;i++){const s2=pi*d+i+1,a=(s2*137.508)%(2*Math.PI),ds=((s2*61)%100)/100*r;ctx.beginPath();ctx.arc(pt.x+Math.cos(a)*ds,pt.y+Math.sin(a)*ds,1.2,0,Math.PI*2);ctx.fill();}}
      break;
    }
    case 'rectangle': { if(!s||!e) break; ctx.strokeRect(s.x,s.y,e.x-s.x,e.y-s.y); break; }
    case 'circle': { if(!s||!e) break; const rx=(e.x-s.x)/2,ry=(e.y-s.y)/2; ctx.beginPath(); ctx.ellipse(s.x+rx,s.y+ry,Math.abs(rx),Math.abs(ry),0,0,2*Math.PI); ctx.stroke(); break; }
    case 'line': { if(!s||!e) break; ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(e.x,e.y); ctx.stroke(); break; }
    case 'arrow': { if(!s||!e) break; ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(e.x,e.y); ctx.stroke(); drawArrowhead(ctx,s,e,stroke.lineWidth); break; }
  }
  ctx.restore();
}

const TOOL_DEFS: {id:Tool;label:string;Icon:React.ComponentType<{className?:string}>}[] = [
  {id:'brush',label:'Brush',Icon:Pencil},{id:'spray',label:'Spray',Icon:Sparkles},
  {id:'rectangle',label:'Rect',Icon:Square},{id:'circle',label:'Circle',Icon:Circle},
  {id:'line',label:'Line',Icon:Minus},{id:'arrow',label:'Arrow',Icon:ArrowUpRight},
  {id:'eraser',label:'Eraser',Icon:Eraser},
];

// ── End Confirm Modal ────────────────────────────────────────────────────────
function EndConfirmModal({ partnerName, onConfirm, onCancel }: { partnerName?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="relative rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(239,68,68,0.12)' }}>
          <PhoneOff className="w-7 h-7" style={{ color: '#EF4444' }} />
        </div>

        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          End Soul Canvas?
        </h3>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
          This will end the session for both you{partnerName ? ` and ${partnerName}` : ' and your partner'}. The drawing will be lost.
        </p>

        <div className="flex gap-3">
          <button type="button" onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-all"
            style={{ background: '#EF4444', color: 'white' }}>
            <PhoneOff className="w-4 h-4" />
            End Session
          </button>
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 text-sm cursor-pointer rounded-xl border font-medium transition-colors"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
            Keep Drawing
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Score Modal ───────────────────────────────────────────────────────────────
function ScoreModal({ score, onClose, onDrawAgain }: { score: AiScore; onClose: () => void; onDrawAgain: () => void }) {
  const gc = gradeColor[score.grade] ?? '#E8604C';
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (circumference * score.score) / 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="relative rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button type="button" onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl cursor-pointer transition-colors"
          style={{ color: 'var(--text-muted)' }}>
          <X className="w-4 h-4" />
        </button>

        {/* Emoji */}
        <div className="text-5xl mb-4">{score.emoji}</div>

        {/* Score ring */}
        <div className="relative w-28 h-28 mx-auto mb-4">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--bg-elevated)" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="44" fill="none" stroke={gc} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-3xl font-black leading-none"
              style={{ color: gc }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {score.score}
            </motion.span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>

        {/* Grade badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold mb-3"
          style={{ background: `${gc}20`, color: gc }}>
          <Star className="w-3.5 h-3.5 fill-current" />
          Grade {score.grade}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          "{score.title}"
        </h3>

        {/* Feedback */}
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
          {score.feedback}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={onDrawAgain}
            className="flex-1 btn-primary py-2.5 text-sm cursor-pointer rounded-xl">
            Draw Again
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm cursor-pointer rounded-xl border font-medium transition-colors"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
            Keep Drawing
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SoulCanvas({ matchId, token, partnerName }: SoulCanvasProps) {
  const router = useRouter();
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const socketRef    = useRef<Socket | null>(null);
  const isDrawingRef = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);
  const snapshotRef  = useRef<ImageData | null>(null);

  const [tool,          setTool]          = useState<Tool>('brush');
  const [color,         setColor]         = useState(COLORS[0]);
  const [brushSize,     setBrushSize]     = useState(6);
  const [zoom,          setZoom]          = useState(1);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerDrawing,setPartnerDrawing]= useState(false);
  const [connected,     setConnected]     = useState(false);
  const [showColors,    setShowColors]    = useState(false);

  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // AI state
  const [aiPrompt,       setAiPrompt]       = useState<string | null>(null);
  const [loadingPrompt,  setLoadingPrompt]  = useState(false);
  const [loadingScore,   setLoadingScore]   = useState(false);
  const [aiScore,        setAiScore]        = useState<AiScore | null>(null);
  const [showScore,      setShowScore]      = useState(false);

  const partnerTimer = useRef<NodeJS.Timeout | null>(null);

  // ── Ctrl+Wheel zoom ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return; e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      setZoom(z => parseFloat(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)).toFixed(2)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── Socket ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socket.on('connect',    () => { setConnected(true); socket.emit('canvasJoin', { matchId }); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('canvasPartnerJoined', () => setPartnerOnline(true));
    socket.on('canvasPartnerLeft',   () => { setPartnerOnline(false); setPartnerDrawing(false); });

    socket.on('canvasStroke', ({ stroke }: { stroke: Stroke }) => {
      const ctx = canvasRef.current?.getContext('2d'); if (ctx) drawStroke(ctx, stroke);
      setPartnerDrawing(true);
      if (partnerTimer.current) clearTimeout(partnerTimer.current);
      partnerTimer.current = setTimeout(() => setPartnerDrawing(false), 1500);
    });

    socket.on('canvasCleared', () => {
      canvasRef.current?.getContext('2d')?.clearRect(0, 0, CANVAS_W, CANVAS_H);
    });

    // AI prompt synced from either user
    socket.on('canvasAiPromptSet', ({ prompt }: { prompt: string }) => {
      setAiPrompt(prompt);
    });

    // canvasEnded — partner (or self) ended the session; navigate back to chat
    socket.on('canvasEnded', () => {
      socket.disconnect();
      router.push(`/chat/${matchId}`);
    });

    socketRef.current = socket;
    return () => { socket.emit('canvasLeave', { matchId }); socket.disconnect(); socketRef.current = null; };
  }, [token, matchId]);

  // ── Drawing ───────────────────────────────────────────────────────────────────
  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (CANVAS_W / r.width), y: (e.clientY - r.top) * (CANVAS_H / r.height) };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pos = getPos(e);
    if (SHAPE_TOOLS.includes(tool)) {
      const ctx = canvasRef.current!.getContext('2d')!;
      snapshotRef.current = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
      currentStroke.current = { tool, color, lineWidth: brushSize, start: pos, end: pos };
    } else {
      currentStroke.current = { tool, color, lineWidth: brushSize, points: [pos] };
    }
  }, [tool, color, brushSize, getPos]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStroke.current) return;
    const pos = getPos(e);
    const ctx = canvasRef.current!.getContext('2d')!;
    if (SHAPE_TOOLS.includes(tool)) {
      if (snapshotRef.current) ctx.putImageData(snapshotRef.current, 0, 0);
      currentStroke.current.end = pos;
      drawStroke(ctx, currentStroke.current);
    } else {
      currentStroke.current.points!.push(pos);
      const pts = currentStroke.current.points!, len = pts.length;
      ctx.save();
      ctx.globalCompositeOperation = tool==='eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = tool==='eraser' ? 'rgba(0,0,0,1)' : color;
      ctx.fillStyle   = tool==='eraser' ? 'rgba(0,0,0,1)' : color;
      ctx.lineWidth = brushSize; ctx.lineCap='round'; ctx.lineJoin='round';
      if (tool === 'spray') {
        const r=brushSize*5,d=18,pi=len-1,pt=pts[pi];
        for(let i=0;i<d;i++){const s=pi*d+i+1,a=(s*137.508)%(2*Math.PI),ds=((s*61)%100)/100*r;ctx.beginPath();ctx.arc(pt.x+Math.cos(a)*ds,pt.y+Math.sin(a)*ds,1.2,0,Math.PI*2);ctx.fill();}
      } else {
        ctx.beginPath();
        if(len>=3){const p=pts[len-2],c=pts[len-1];ctx.moveTo(pts[len-3].x,pts[len-3].y);ctx.quadraticCurveTo(p.x,p.y,(p.x+c.x)/2,(p.y+c.y)/2);}
        else if(len===2){ctx.moveTo(pts[0].x,pts[0].y);ctx.lineTo(pts[1].x,pts[1].y);}
        ctx.stroke();
      }
      ctx.restore();
      if (len % 5 === 0) socketRef.current?.emit('canvasDraw', { matchId, stroke: { ...currentStroke.current } });
    }
  }, [tool, color, brushSize, matchId, getPos]);

  const onPointerUp = useCallback(() => {
    if (!isDrawingRef.current || !currentStroke.current) return;
    isDrawingRef.current = false;
    if (SHAPE_TOOLS.includes(tool)) snapshotRef.current = null;
    socketRef.current?.emit('canvasDraw', { matchId, stroke: { ...currentStroke.current } });
    currentStroke.current = null;
  }, [tool, matchId]);

  // ── Canvas clear ──────────────────────────────────────────────────────────────
  const handleClear = () => {
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, CANVAS_W, CANVAS_H);
    snapshotRef.current = null;
    socketRef.current?.emit('canvasClear', { matchId });
  };

  // ── Zoom helpers ──────────────────────────────────────────────────────────────
  const zoomIn    = () => setZoom(z => parseFloat(Math.min(MAX_ZOOM, z + ZOOM_STEP).toFixed(2)));
  const zoomOut   = () => setZoom(z => parseFloat(Math.max(MIN_ZOOM, z - ZOOM_STEP).toFixed(2)));
  const zoomReset = () => setZoom(1);
  const zoomFit   = () => {
    const w = scrollRef.current; if (!w) return;
    setZoom(parseFloat(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(w.clientWidth/CANVAS_W, w.clientHeight/CANVAS_H))).toFixed(2)));
  };

  // ── AI: generate prompt ───────────────────────────────────────────────────────
  const handleAiPrompt = async () => {
    if (loadingPrompt) return;
    setLoadingPrompt(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/canvas-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const prompt: string = data.prompt || 'Draw something beautiful together';
      setAiPrompt(prompt);
      // Broadcast to partner via socket
      socketRef.current?.emit('canvasAiPrompt', { matchId, prompt });
    } catch {
      setAiPrompt('Draw something beautiful together');
    } finally {
      setLoadingPrompt(false);
    }
  };

  // ── AI: score drawing ─────────────────────────────────────────────────────────
  const handleAiScore = async () => {
    if (loadingScore) return;
    setLoadingScore(true);
    try {
      // Downscale canvas to 800px wide JPEG for faster upload
      const src = canvasRef.current!;
      const tmp = document.createElement('canvas');
      tmp.width  = 800;
      tmp.height = Math.round(800 * (CANVAS_H / CANVAS_W));
      const tctx = tmp.getContext('2d')!;
      tctx.fillStyle = '#FFFFFF';
      tctx.fillRect(0, 0, tmp.width, tmp.height);
      tctx.drawImage(src, 0, 0, tmp.width, tmp.height);
      const imageBase64 = tmp.toDataURL('image/jpeg', 0.75).replace('data:image/jpeg;base64,', '');

      const res = await fetch(`${API_URL}/api/ai/canvas-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageBase64, prompt: aiPrompt }),
      });
      const data: AiScore = await res.json();
      setAiScore(data);
      setShowScore(true);
    } catch {
      setAiScore({ score: 70, grade: 'B', title: 'Soul Canvas Classic', feedback: "A wonderful effort! Keep drawing together.", emoji: '🎨' });
      setShowScore(true);
    } finally {
      setLoadingScore(false);
    }
  };

  const handleDrawAgain = () => {
    handleClear();
    setShowScore(false);
    setAiScore(null);
  };

  // ── End session ───────────────────────────────────────────────────────────────
  const handleEndConfirm = () => {
    socketRef.current?.emit('canvasEnd', { matchId });
    // Navigation handled by canvasEnded event listener
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const activePrompt = aiPrompt;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-page)' }}>

      {/* ── Top status bar ──────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2 border-b"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>

        {/* AI Prompt display / generate button */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button type="button" onClick={handleAiPrompt} disabled={loadingPrompt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all shrink-0"
            style={{ background: 'linear-gradient(135deg,#E8604C,#D4A853)', color: 'white', opacity: loadingPrompt ? 0.7 : 1 }}>
            {loadingPrompt
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Sparkles className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{loadingPrompt ? 'Generating…' : 'AI Prompt'}</span>
          </button>

          {activePrompt ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs min-w-0"
              style={{ background: 'var(--color-brand-subtle)', color: 'var(--color-brand)' }}>
              <Lightbulb className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate font-medium">{activePrompt}</span>
            </div>
          ) : (
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
              Click "AI Prompt" to get a drawing challenge!
            </span>
          )}
        </div>

        {/* Right: partner status + End button */}
        <div className="flex items-center gap-2 shrink-0">
          {partnerDrawing && (
            <span className="text-xs font-medium animate-pulse hidden sm:inline" style={{ color: 'var(--color-teal)' }}>
              {partnerName ?? 'Partner'} is drawing…
            </span>
          )}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
            style={{
              background: partnerOnline ? 'rgba(42,181,160,0.1)' : 'var(--bg-elevated)',
              color: partnerOnline ? 'var(--color-teal)' : 'var(--text-muted)',
            }}>
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{partnerOnline ? (partnerName ?? 'Partner') : 'Waiting…'}</span>
          </div>
          {connected ? <Wifi className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} /> : <WifiOff className="w-3.5 h-3.5" style={{ color: 'var(--color-error)' }} />}

          {/* End session button — phone hang-up style */}
          <button
            id="canvas-end-session"
            type="button"
            title="End session for both"
            onClick={() => setShowEndConfirm(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all shrink-0"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End</span>
          </button>
        </div>
      </div>

      {/* ── Canvas viewport ──────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-auto" style={{ background: 'var(--bg-elevated)', cursor: SHAPE_TOOLS.includes(tool) ? 'crosshair' : tool==='eraser' ? 'cell' : 'crosshair' }}>
        <div style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom, position: 'relative' }}>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
            className="touch-none"
            style={{ position:'absolute', top:0, left:0, transformOrigin:'0 0', transform:`scale(${zoom})`, background:'#FFFFFF', boxShadow:'0 2px 24px rgba(0,0,0,0.12)', display:'block' }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
          />
        </div>
      </div>

      {/* ── Colour palette (foldable) ────────────────────────────────────── */}
      <AnimatePresence>
        {showColors && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="shrink-0 flex items-center gap-2 px-3 py-2 border-t overflow-hidden"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              {COLORS.map(c => (
                <button key={c} type="button" title={c}
                  onClick={() => { setColor(c); if (tool==='eraser') setTool('brush'); }}
                  className="rounded-full cursor-pointer transition-all"
                  style={{ width:'22px', height:'22px', background:c, border:c===color?'2.5px solid var(--color-brand)':'1.5px solid rgba(0,0,0,0.15)', boxShadow:c===color?'0 0 0 2px rgba(232,96,76,0.35)':'none', transform:c===color?'scale(1.25)':'scale(1)' }} />
              ))}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <span className="text-[10px] font-mono hidden sm:inline" style={{ color: 'var(--text-muted)' }}>{color}</span>
              <div className="w-5 h-5 rounded-md border" style={{ background: color, borderColor: 'var(--border-default)' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-t overflow-x-auto no-scrollbar"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', scrollbarWidth: 'none' }}>

        {/* Drawing tools */}
        <div className="flex rounded-xl overflow-hidden border shrink-0" style={{ borderColor: 'var(--border-default)' }}>
          {TOOL_DEFS.map(({ id, label, Icon }, i) => (
            <button key={id} id={`canvas-tool-${id}`} type="button" title={label} onClick={() => setTool(id)}
              className="flex items-center gap-1 px-2.5 py-2 text-[11px] font-medium cursor-pointer transition-all"
              style={{ background:tool===id?'var(--color-brand)':'var(--bg-elevated)', color:tool===id?'white':'var(--text-secondary)', borderRight:i<TOOL_DEFS.length-1?'1px solid var(--border-default)':'none' }}>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-6 shrink-0" style={{ background: 'var(--border-default)' }} />

        {/* Zoom controls */}
        <div className="flex items-center rounded-xl overflow-hidden border shrink-0" style={{ borderColor: 'var(--border-default)' }}>
          <button id="canvas-zoom-out" type="button" title="Zoom out" onClick={zoomOut}
            className="flex items-center px-2.5 py-2 cursor-pointer transition-all"
            style={{ background:'var(--bg-elevated)', color:'var(--text-secondary)', borderRight:'1px solid var(--border-default)' }}>
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button id="canvas-zoom-reset" type="button" title="Reset zoom" onClick={zoomReset}
            className="px-2.5 py-2 text-[11px] font-mono font-medium cursor-pointer"
            style={{ background:'var(--bg-elevated)', color:'var(--text-secondary)', borderRight:'1px solid var(--border-default)', minWidth:'44px', textAlign:'center' }}>
            {Math.round(zoom*100)}%
          </button>
          <button id="canvas-zoom-in" type="button" title="Zoom in" onClick={zoomIn}
            className="flex items-center px-2.5 py-2 cursor-pointer transition-all"
            style={{ background:'var(--bg-elevated)', color:'var(--text-secondary)' }}>
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <button id="canvas-fit" type="button" title="Fit to view" onClick={zoomFit}
          className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-medium cursor-pointer transition-all border shrink-0"
          style={{ background:'var(--bg-elevated)', borderColor:'var(--border-default)', color:'var(--text-secondary)' }}>
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Fit</span>
        </button>

        <div className="w-px h-6 shrink-0" style={{ background: 'var(--border-default)' }} />

        {/* Brush size */}
        <div className="flex items-center gap-2 flex-1 min-w-[70px] max-w-[130px]">
          <div className="rounded-full shrink-0" style={{ width:`${Math.max(4,brushSize/2)}px`, height:`${Math.max(4,brushSize/2)}px`, background:tool==='eraser'?'var(--border-default)':color }} />
          <input id="canvas-brush-size" type="range" min={1} max={40} value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
            className="flex-1 cursor-pointer" style={{ accentColor: 'var(--color-brand)' }} />
        </div>

        <div className="w-px h-6 shrink-0" style={{ background: 'var(--border-default)' }} />

        {/* Colour toggle */}
        <button id="canvas-color-toggle" type="button" title="Toggle colours" onClick={() => setShowColors(v => !v)}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-medium cursor-pointer border shrink-0"
          style={{ background:showColors?'var(--color-brand-subtle)':'var(--bg-elevated)', borderColor:showColors?'var(--color-brand)':'var(--border-default)', color:showColors?'var(--color-brand)':'var(--text-secondary)' }}>
          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background:color, boxShadow:'0 0 0 1.5px rgba(0,0,0,0.15)' }} />
          <Palette className="w-3 h-3" />
          {showColors ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        {/* Clear */}
        <button id="canvas-clear" type="button" title="Clear canvas" onClick={handleClear}
          className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-medium cursor-pointer border shrink-0"
          style={{ background:'var(--bg-elevated)', borderColor:'var(--border-default)', color:'var(--text-secondary)' }}>
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>

        <div className="w-px h-6 shrink-0" style={{ background: 'var(--border-default)' }} />

        {/* AI Score button */}
        <button id="canvas-ai-score" type="button" onClick={handleAiScore} disabled={loadingScore}
          title="Get AI feedback on your drawing"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold cursor-pointer border shrink-0 transition-all"
          style={{ background:'linear-gradient(135deg,rgba(91,106,240,0.15),rgba(155,93,229,0.15))', borderColor:'rgba(91,106,240,0.4)', color:'#7B86F0', opacity: loadingScore ? 0.7 : 1 }}>
          {loadingScore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{loadingScore ? 'Scoring…' : 'AI Score'}</span>
        </button>
      </div>

      {/* ── Session notice ───────────────────────────────────────────────── */}
      <div className="shrink-0 text-center py-1 text-[10px]"
        style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
        Drawings are not saved • Scroll to pan • Ctrl+Scroll or +/– to zoom
      </div>

      {/* ── Score Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showScore && aiScore && (
          <ScoreModal score={aiScore} onClose={() => setShowScore(false)} onDrawAgain={handleDrawAgain} />
        )}
      </AnimatePresence>

      {/* ── End Confirm Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEndConfirm && (
          <EndConfirmModal
            partnerName={partnerName}
            onConfirm={handleEndConfirm}
            onCancel={() => setShowEndConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
