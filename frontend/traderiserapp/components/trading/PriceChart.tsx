"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Tick } from "@/lib/ticks";

type Props = {
  ticks: Tick[];
  current: Tick | null;
  marketId?: number | null;
  isRefreshing?: boolean;
  chartType?: "line" | "candle";
  burst?: { kind: "win" | "loss"; id: number; digit?: number | null } | null;
};

const LINE_COLOR = "#3b82f6";
const LINE_GLOW = "rgba(59,130,246,0.55)";
const AREA_TOP = "rgba(59,130,246,0.35)";
const AREA_MID = "rgba(59,130,246,0.12)";
const AREA_BOT = "rgba(59,130,246,0.00)";
const UP_COLOR = "#22c55e";
const DOWN_COLOR = "#ef4444";
const TICKS_PER_CANDLE = 5;

type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  forming: boolean;
};

function buildCandles(ticks: Tick[], size: number): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < ticks.length; i += size) {
    const group = ticks.slice(i, i + size);
    if (!group.length) continue;
    const open = group[0].price;
    const close = group[group.length - 1].price;
    let high = open;
    let low = open;
    for (const t of group) {
      if (t.price > high) high = t.price;
      if (t.price < low) low = t.price;
    }
    out.push({ open, close, high, low, forming: group.length < size });
  }
  return out;
}

export default function PriceChart({
  ticks,
  current,
  marketId,
  isRefreshing,
  chartType = "line",
  burst,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const [showBurst, setShowBurst] = useState(burst);

  useEffect(() => {
    if (!burst) return;
    setShowBurst(burst);
    const t = setTimeout(() => setShowBurst(null), 2200);
    return () => clearTimeout(t);
  }, [burst?.id]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    cv.width = w * dpr;
    cv.height = h * dpr;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (isRefreshing || ticks.length < 2) return;

    if (chartType === "candle") {
      const dark = document.documentElement.classList.contains("dark");
      const glass = ctx.createLinearGradient(0, 0, 0, h);
      if (dark) {
        glass.addColorStop(0, "rgba(24,24,27,0.35)");
        glass.addColorStop(1, "rgba(9,9,11,0.15)");
      } else {
        glass.addColorStop(0, "rgba(255,255,255,0.55)");
        glass.addColorStop(1, "rgba(226,232,240,0.25)");
      }
      ctx.fillStyle = glass;
      ctx.fillRect(0, 0, w, h);

      const candles = buildCandles(ticks, TICKS_PER_CANDLE).slice(-40);
      if (!candles.length) return;

      const padR = 70, padB = 28, padT = 6, padL = 4;
      const cw = w - padL - padR;
      const ch = h - padT - padB;

      let hi = -Infinity, lo = Infinity;
      candles.forEach((c) => {
        if (c.high > hi) hi = c.high;
        if (c.low < lo) lo = c.low;
      });
      const range = hi - lo || hi * 0.001;
      hi += range * 0.12;
      lo -= range * 0.12;
      const yOf = (price: number) => padT + ((hi - price) / (hi - lo)) * ch;

      ctx.strokeStyle = dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      for (let i = 0; i <= 8; i++) {
        const p = hi - (i / 8) * (hi - lo);
        const y = yOf(p);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + cw, y);
        ctx.stroke();
        ctx.fillStyle = dark ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.6)";
        ctx.font = "10px ui-sans-serif, system-ui";
        ctx.textAlign = "left";
        ctx.fillText(p.toFixed(2), padL + cw + 6, y + 3);
      }
      ctx.setLineDash([]);

      const slot = cw / candles.length;
      const bw = Math.max(3, slot * 0.62);

      candles.forEach((c, i) => {
        const x = padL + i * slot + slot / 2;
        const up = c.close >= c.open;
        const color = up ? UP_COLOR : DOWN_COLOR;
        const bodyTop = yOf(Math.max(c.open, c.close));
        const bodyBot = yOf(Math.min(c.open, c.close));
        const bodyH = Math.max(2, bodyBot - bodyTop);

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.2;

        if (c.high > Math.max(c.open, c.close)) {
          ctx.beginPath();
          ctx.moveTo(x, yOf(c.high));
          ctx.lineTo(x, bodyTop);
          ctx.stroke();
        }
        if (c.low < Math.min(c.open, c.close)) {
          ctx.beginPath();
          ctx.moveTo(x, bodyBot);
          ctx.lineTo(x, yOf(c.low));
          ctx.stroke();
        }

        ctx.globalAlpha = c.forming ? 0.95 : 1;
        ctx.fillRect(x - bw / 2, bodyTop, bw, bodyH);
        ctx.globalAlpha = 1;
      });

      const last = candles[candles.length - 1];
      const lastX = padL + (candles.length - 1) * slot + slot / 2;
      const yLast = yOf(last.close);
      setTip({ x: lastX, y: yLast });

      ctx.strokeStyle = last.close >= last.open ? "rgba(34,197,94,0.7)" : "rgba(239,68,68,0.7)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, yLast);
      ctx.lineTo(padL + cw, yLast);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = last.close >= last.open ? "#16a34a" : "#dc2626";
      ctx.fillRect(padL + cw + 2, yLast - 9, padR - 6, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px ui-sans-serif, system-ui";
      ctx.fillText(last.close.toFixed(2), padL + cw + 6, yLast + 3);
      return;
    }

    const visible = ticks.slice(-80);
    const prices = visible.map((t) => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.15 || 1;
    const lo = min - pad;
    const hi = max + pad;
    const dark = document.documentElement.classList.contains("dark");
    const chartW = w - 70;
    const chartBottom = h - 24;
    const usableH = h - 48;
    const yOf = (price: number) => chartBottom - ((price - lo) / (hi - lo)) * usableH;

    ctx.strokeStyle = dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.font = "10px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    for (let i = 0; i <= 5; i++) {
      const p = hi - (i / 5) * (hi - lo);
      const y = yOf(p);
      ctx.beginPath();
      ctx.moveTo(4, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();
      ctx.fillStyle = dark ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.6)";
      ctx.fillText(p.toFixed(2), chartW + 6, y + 3);
    }
    ctx.setLineDash([]);

    const points = visible.map((t, i) => ({
      x: (i / Math.max(visible.length - 1, 1)) * chartW,
      y: yOf(t.price),
    }));

    const grad = ctx.createLinearGradient(0, 0, 0, chartBottom);
    grad.addColorStop(0, AREA_TOP);
    grad.addColorStop(0.55, AREA_MID);
    grad.addColorStop(1, AREA_BOT);
    ctx.beginPath();
    ctx.moveTo(points[0].x, chartBottom);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, chartBottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.shadowColor = LINE_GLOW;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (points.length) {
      const last = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#2563eb";
      ctx.fill();
    }
  }, [ticks, current, marketId, isRefreshing, chartType]);

  const isWin = showBurst?.kind === "win";

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden rounded-3xl bg-gradient-to-br from-white/80 via-slate-50/60 to-sky-50/50 backdrop-blur-xl dark:from-zinc-950/80 dark:via-zinc-900/40 dark:to-black/50">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full rounded-3xl" />
      {chartType === "candle" && showBurst && tip && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
          style={{ left: tip.x, top: tip.y }}
        >
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-lg ${
              isWin ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {isWin ? "WIN" : "LOSS"}
          </span>
        </div>
      )}
      {isRefreshing && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-zinc-950/80">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <div className="mt-3 text-xs text-slate-500 dark:text-zinc-400 tracking-wider uppercase">Loading market…</div>
        </div>
      )}
    </div>
  );
}
