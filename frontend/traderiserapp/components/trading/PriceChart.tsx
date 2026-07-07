"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { Tick } from "@/lib/ticks";

type Props = {
  ticks: Tick[];
  current: Tick | null;
  marketId?: number | null;
  isRefreshing?: boolean; // NEW
};

const LINE_COLOR = "#3b82f6";
const LINE_GLOW = "rgba(59,130,246,0.55)";
const AREA_TOP = "rgba(59,130,246,0.35)";
const AREA_MID = "rgba(59,130,246,0.12)";
const AREA_BOT = "rgba(59,130,246,0.00)";

export default function PriceChart({ ticks, current, marketId, isRefreshing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    cv.width = w * dpr;
    cv.height = h * dpr;

    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (isRefreshing || ticks.length < 2) {
      // leave canvas blank — overlay handles the visual
      return;
    }

    const visible = ticks.slice(-60);
    const prices = visible.map((t) => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.15 || 1;
    const lo = min - pad;
    const hi = max + pad;

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (h / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 1; i < 6; i++) {
      const x = (w / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "10px ui-sans-serif, system-ui";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = hi - ((hi - lo) / 4) * i;
      const y = (h / 4) * i;
      ctx.fillText(v.toFixed(2), w - 8, y + 10);
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor((visible.length - 1) * (i / 4));
      const t = visible[idx];
      if (!t) continue;
      const d = new Date(t.time);
      const label = `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      const x = (w / 5) * i + w / 10;
      ctx.fillText(label, x, h - 8);
    }

    const chartW = w - 60;
    const chartTop = 0;
    const chartBottom = h - 30;
    const usableH = h - 60;

    const points = visible.map((t, i) => {
      const x = (i / (visible.length - 1)) * chartW;
      const y = chartBottom - ((t.price - lo) / (hi - lo)) * usableH;
      return { x, y };
    });

    const grad = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
    grad.addColorStop(0, AREA_TOP);
    grad.addColorStop(0.55, AREA_MID);
    grad.addColorStop(1, AREA_BOT);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, chartBottom);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, chartBottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = LINE_GLOW;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (current && points.length > 0) {
      const last = points[points.length - 1];
      ctx.fillStyle = "rgba(59,130,246,0.25)";
      ctx.beginPath();
      ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(59,130,246,0.95)";
      ctx.strokeStyle = LINE_COLOR;
      ctx.lineWidth = 1.5;
      const tag = current.price.toFixed(2);
      ctx.font = "bold 13px ui-sans-serif, system-ui";
      const textWidth = ctx.measureText(tag).width + 16;
      ctx.fillRect(last.x + 10, last.y - 18, textWidth, 24);
      ctx.strokeRect(last.x + 10, last.y - 18, textWidth, 24);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(tag, last.x + 18, last.y + 4);
    }
  }, [ticks, current, marketId, isRefreshing]);

  return (
    <div className="absolute inset-0 w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {isRefreshing && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Shimmer sweep */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-blue-500/15 to-transparent animate-[shimmer_1.1s_ease-in-out_infinite]" />
          </div>

          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <div className="mt-3 text-xs text-slate-300 tracking-wider uppercase">
            Loading market…
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(0%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
