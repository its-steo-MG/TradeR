"use client";

import { useEffect, useRef } from "react";
import type { Tick } from "@/lib/ticks";

type Props = { 
  ticks: Tick[]; 
  current: Tick | null;
  marketId?: number | null;   // Added to force reset on market change
};

export default function PriceChart({ ticks, current, marketId }: Props) {
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
    ctx.clearRect(0, 0, w, h);   // Force clear

    // If no data yet, show loading state
    if (ticks.length < 2) {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "14px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Loading market data...", w / 2, h / 2);
      return;
    }

    const visible = ticks.slice(-60);
    const prices = visible.map((t) => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.15 || 1;
    const lo = min - pad;
    const hi = max + pad;

    // Grid
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

    // Price labels (right)
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "10px ui-sans-serif, system-ui";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = hi - ((hi - lo) / 4) * i;
      const y = (h / 4) * i;
      ctx.fillText(v.toFixed(2), w - 8, y + 10);
    }

    // Time labels (bottom)
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor((visible.length - 1) * (i / 4));
      const t = visible[idx];
      if (!t) continue;
      const d = new Date(t.time);
      const label = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes()
        .toString()
        .padStart(2, "0")}`;
      const x = (w / 5) * i + (w / 10);
      ctx.fillText(label, x, h - 8);
    }

    // Price Line
    ctx.strokeStyle = "#14b8a6";   // Nice teal color
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = "#14b8a6";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    visible.forEach((t, i) => {
      const x = (i / (visible.length - 1)) * (w - 60);
      const y = h - 30 - ((t.price - lo) / (hi - lo)) * (h - 60);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Last point + price tag
    if (current && visible.length > 0) {
      const lastX = (visible.length - 1) / (visible.length - 1) * (w - 60);
      const lastY = h - 30 - ((current.price - lo) / (hi - lo)) * (h - 60);

      // Dot
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Price tag
      ctx.fillStyle = "rgba(20, 184, 166, 0.9)";
      ctx.strokeStyle = "#14b8a6";
      ctx.lineWidth = 1.5;
      const tag = current.price.toFixed(2);
      ctx.font = "bold 13px ui-sans-serif, system-ui";
      const textWidth = ctx.measureText(tag).width + 16;

      ctx.fillRect(lastX + 10, lastY - 18, textWidth, 24);
      ctx.strokeRect(lastX + 10, lastY - 18, textWidth, 24);

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(tag, lastX + 18, lastY + 4);
    }
  }, [ticks, current, marketId]);   // ← Added marketId dependency

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
}