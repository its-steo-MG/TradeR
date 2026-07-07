"use client";

import { useEffect, useRef } from "react";

/** MT5-style canvas candlestick mock — dashed grid, teal/red candles. */
export default function ChartPlaceholder({ symbol = "AUDCAD" }: { symbol?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current; if (!cvs) return;
    const ctx = cvs.getContext("2d"); if (!ctx) return;

    const candles: { o: number; h: number; l: number; c: number }[] = [];
    let p = 0.98 + Math.random() * 0.01;
    for (let i = 0; i < 70; i++) {
      const o = p, c = o + (Math.random() - 0.5) * 0.0015;
      const h = Math.max(o, c) + Math.random() * 0.0008;
      const l = Math.min(o, c) - Math.random() * 0.0008;
      candles.push({ o, h, l, c }); p = c;
    }

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = cvs.clientWidth, h = cvs.clientHeight;
      cvs.width = w * dpr; cvs.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // MT5 pure black bg
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);

      const padR = 60, padT = 6, padB = 24, padL = 4;
      const cw = w - padL - padR, ch = h - padT - padB;

      const max = Math.max(...candles.map(c => c.h));
      const min = Math.min(...candles.map(c => c.l));
      const range = (max - min) || max * 0.001;
      const hi = max + range * 0.08;
      const lo = min - range * 0.08;
      const yOf = (v: number) => padT + ((hi - v) / (hi - lo)) * ch;

      // Dashed grid — horizontal + vertical
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "10px ui-sans-serif, system-ui";

      const ticks = 12;
      for (let i = 0; i <= ticks; i++) {
        const pr = hi - (i / ticks) * (hi - lo);
        const y = yOf(pr);
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cw, y); ctx.stroke();
        ctx.fillText(pr.toFixed(5), padL + cw + 6, y + 3);
      }
      const vCols = 6;
      for (let i = 1; i < vCols; i++) {
        const x = padL + (cw / vCols) * i;
        ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + ch); ctx.stroke();
      }
      ctx.setLineDash([]);

      // Symbol label
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "bold 12px ui-sans-serif, system-ui";
      ctx.fillText(`${symbol}  M1`, padL + 6, padT + 14);

      // Candles
      const slot = cw / candles.length;
      const bw = Math.max(2, slot * 0.7);
      candles.forEach((c, i) => {
        const x = padL + i * slot + slot / 2;
        const up = c.c >= c.o;
        const color = up ? "#26a69a" : "#ef5350";
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, yOf(c.h)); ctx.lineTo(x, yOf(c.l)); ctx.stroke();
        const yO = yOf(c.o), yC = yOf(c.c);
        ctx.fillRect(x - bw / 2, Math.min(yO, yC), bw, Math.max(1, Math.abs(yC - yO)));
      });

      // Last price tag
      const last = candles[candles.length - 1];
      const yLast = yOf(last.c);
      ctx.strokeStyle = "rgba(38,166,154,0.7)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(padL, yLast); ctx.lineTo(padL + cw, yLast); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#1f8b80"; ctx.fillRect(padL + cw + 2, yLast - 9, padR - 4, 18);
      ctx.fillStyle = "#fff"; ctx.font = "bold 11px ui-sans-serif, system-ui";
      ctx.fillText(last.c.toFixed(5), padL + cw + 6, yLast + 3);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cvs);
    return () => ro.disconnect();
  }, [symbol]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-black">
      <canvas ref={ref} className="h-full w-full" />
    </div>
  );
}
