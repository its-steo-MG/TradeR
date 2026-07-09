"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getCandles, type Candle, type Timeframe, type MT5Position, calcProfit, TF_SECONDS } from "@/lib/mt5-store";

interface Props {
  symbol: string;
  tf: Timeframe;
  digits: number;
  positions: MT5Position[];
  onClosePosition?: (id: string) => void;
}

export default function CandleChart({ symbol, tf, digits, positions, onClosePosition }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  // ====================== INTERACTIVE STATE ======================
  const [offset, setOffset] = useState(0);
  const [visibleCount, setVisibleCount] = useState(80);

  // Mouse drag
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const dragMovedRef = useRef(false);

  // Touch state (mobile)
  const touchModeRef = useRef<"none" | "pan" | "pinch">("none");
  const lastTouchXRef = useRef(0);
  const pinchStartDistRef = useRef(0);
  const pinchStartCountRef = useRef(80);

  const clampCount = (n: number) => Math.max(20, Math.min(300, Math.floor(n)));

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.12 : 0.88;
    setVisibleCount((c) => clampCount(c * zoomFactor));
  };

  // ============ MOUSE ============
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragMovedRef.current = false;
    lastXRef.current = e.clientX;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastXRef.current;
    const candleWidth = (ref.current?.clientWidth || 900) / visibleCount;
    const candlesMoved = Math.round(deltaX / candleWidth);
    if (candlesMoved !== 0) {
      dragMovedRef.current = true;
      setOffset((prev) => Math.max(0, prev - candlesMoved));
      lastXRef.current = e.clientX;
    }
  };
  const handleMouseUp = () => { isDraggingRef.current = false; };

  // ============ TOUCH (mobile pan + pinch zoom) ============
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;

    const dist = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        touchModeRef.current = "pinch";
        pinchStartDistRef.current = dist(e.touches[0], e.touches[1]);
        pinchStartCountRef.current = visibleCount;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        touchModeRef.current = "pan";
        lastTouchXRef.current = e.touches[0].clientX;
        dragMovedRef.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchModeRef.current === "pinch" && e.touches.length === 2) {
        e.preventDefault();
        const d = dist(e.touches[0], e.touches[1]);
        if (pinchStartDistRef.current > 0) {
          const ratio = pinchStartDistRef.current / d; // pinch-in => zoom in => fewer candles
          setVisibleCount(clampCount(pinchStartCountRef.current * ratio));
        }
      } else if (touchModeRef.current === "pan" && e.touches.length === 1) {
        const x = e.touches[0].clientX;
        const deltaX = x - lastTouchXRef.current;
        const candleWidth = (cv.clientWidth || 900) / visibleCount;
        const candlesMoved = Math.round(deltaX / candleWidth);
        if (candlesMoved !== 0) {
          dragMovedRef.current = true;
          setOffset((prev) => Math.max(0, prev - candlesMoved));
          lastTouchXRef.current = x;
          e.preventDefault();
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) touchModeRef.current = "none";
      else if (e.touches.length === 1) {
        touchModeRef.current = "pan";
        lastTouchXRef.current = e.touches[0].clientX;
      }
    };

    cv.addEventListener("touchstart", onTouchStart, { passive: false });
    cv.addEventListener("touchmove", onTouchMove, { passive: false });
    cv.addEventListener("touchend", onTouchEnd);
    cv.addEventListener("touchcancel", onTouchEnd);
    return () => {
      cv.removeEventListener("touchstart", onTouchStart);
      cv.removeEventListener("touchmove", onTouchMove);
      cv.removeEventListener("touchend", onTouchEnd);
      cv.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [visibleCount]);

  // ====================== DRAW FUNCTION ======================
  const draw = useCallback(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const w = cv.clientWidth;
    const h = cv.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    cv.width = w * dpr;
    cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    const all = getCandles(symbol, tf);
    if (!all.length) return;

    const startIndex = Math.max(0, all.length - visibleCount - offset);
    const candles: Candle[] = all.slice(startIndex, startIndex + visibleCount);
    if (!candles.length) return;

    const padR = 70, padB = 28, padT = 6, padL = 4;
    const cw = w - padL - padR;
    const ch = h - padT - padB;

    let hi = -Infinity, lo = Infinity;
    candles.forEach((c) => {
      if (c.h > hi) hi = c.h;
      if (c.l < lo) lo = c.l;
    });

    positions.forEach((p) => {
      if (p.symbol === symbol) {
        if (p.openPrice > hi) hi = p.openPrice;
        if (p.openPrice < lo) lo = p.openPrice;
      }
    });

    const range = (hi - lo) || hi * 0.001;
    hi += range * 0.08;
    lo -= range * 0.08;

    const yOf = (price: number) => padT + ((hi - price) / (hi - lo)) * ch;

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 4]);
    const ticks = 12;
    for (let i = 0; i <= ticks; i++) {
      const p = hi - (i / ticks) * (hi - lo);
      const y = yOf(p);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + cw, y);
      ctx.stroke();

      const priceText = p.toFixed(digits);
      const textWidth = ctx.measureText(priceText).width + 10;
      ctx.fillStyle = "rgba(20, 20, 20, 0.85)";
      ctx.fillRect(padL + cw + 2, y - 8, textWidth + 4, 16);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "10px ui-sans-serif, system-ui";
      ctx.fillText(priceText, padL + cw + 6, y + 3);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL + cw, padT);
    ctx.lineTo(padL + cw, padT + ch);
    ctx.stroke();

    const vCols = 6;
    for (let i = 1; i < vCols; i++) {
      const x = padL + (cw / vCols) * i;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + ch);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 12px ui-sans-serif, system-ui";
    ctx.fillText(`${symbol} ${tf}`, padL + 6, padT + 14);

    // Candles
    const slot = cw / candles.length;
    const bw = Math.max(2, slot * 0.7);

    candles.forEach((c, i) => {
      const x = padL + i * slot + slot / 2;
      const up = c.c >= c.o;
      const color = up ? "#26a69a" : "#ef5350";

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(x, yOf(c.h));
      ctx.lineTo(x, yOf(c.l));
      ctx.stroke();

      const yO = yOf(c.o), yC = yOf(c.c);
      ctx.fillRect(x - bw / 2, Math.min(yO, yC), bw, Math.max(1, Math.abs(yC - yO)));
    });

    // Last price line
    const last = candles[candles.length - 1];
    if (last) {
      const yLast = yOf(last.c);
      ctx.strokeStyle = "rgba(38,166,154,0.7)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, yLast);
      ctx.lineTo(padL + cw, yLast);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#1f8b80";
      ctx.fillRect(padL + cw + 2, yLast - 9, padR - 4, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px ui-sans-serif, system-ui";
      ctx.fillText(last.c.toFixed(digits), padL + cw + 6, yLast + 3);
    }

    // Position lines + labels
    const symPositions = positions.filter((p) => p.symbol === symbol);
    symPositions.forEach((p, idx) => {
      const y = yOf(p.openPrice);
      const isBuy = p.side === "buy";

      ctx.strokeStyle = isBuy ? "rgba(56,189,248,0.9)" : "rgba(244,63,94,0.9)";
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + cw, y);
      ctx.stroke();
      ctx.setLineDash([]);

      const ax = padL + cw - 18;
      ctx.fillStyle = isBuy ? "#38bdf8" : "#f43f5e";
      ctx.beginPath();
      if (isBuy) {
        ctx.moveTo(ax, y - 6);
        ctx.lineTo(ax - 5, y + 2);
        ctx.lineTo(ax + 5, y + 2);
      } else {
        ctx.moveTo(ax, y + 6);
        ctx.lineTo(ax - 5, y - 2);
        ctx.lineTo(ax + 5, y - 2);
      }
      ctx.closePath();
      ctx.fill();

      const profit = calcProfit(p);
      const label = `${isBuy ? "BUY" : "SELL"} ${p.volume.toFixed(2)} ${profit >= 0 ? "+" : ""}${profit.toFixed(2)} USD`;

      ctx.font = "bold 11px ui-sans-serif, system-ui";
      const tw = ctx.measureText(label).width + 12;
      const pos = profit >= 0;

      ctx.fillStyle = pos ? "rgba(56,189,248,0.18)" : "rgba(244,63,94,0.18)";
      ctx.fillRect(padL + 4, y - 9 - (idx % 3) * 18, tw, 16);

      ctx.fillStyle = pos ? "#38bdf8" : "#fda4af";
      ctx.fillText(label, padL + 10, y + 2 - (idx % 3) * 18);

      ctx.fillStyle = isBuy ? "#0ea5e9" : "#e11d48";
      ctx.fillRect(padL + cw + 2, y - 9, padR - 4, 18);
      ctx.fillStyle = "#fff";
      ctx.fillText(p.openPrice.toFixed(digits), padL + cw + 6, y + 3);
    });

    // Time labels
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "10px ui-sans-serif, system-ui";
    const tfSec = TF_SECONDS[tf];
    const step = Math.max(1, Math.floor(candles.length / 4));
    for (let i = 0; i < candles.length; i += step) {
      const x = padL + i * slot + slot / 2;
      const d = new Date(candles[i].t * 1000);
      const label = tfSec >= 86400
        ? `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`
        : `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en", { month: "short" })} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      ctx.fillText(label, x - 36, h - 10);
    }
  }, [symbol, tf, digits, positions, offset, visibleCount]);

  useEffect(() => {
    draw();
    const id = setInterval(draw, 900);
    const ro = new ResizeObserver(draw);
    if (ref.current) ro.observe(ref.current);
    return () => {
      clearInterval(id);
      ro.disconnect();
    };
  }, [draw]);

  // Click to close position — ignore if user was dragging
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !onClosePosition) return;

    const handleClick = (e: MouseEvent) => {
      if (dragMovedRef.current) { dragMovedRef.current = false; return; }
      const rect = cv.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const clickX = e.clientX - rect.left;

      const all = getCandles(symbol, tf);
      const startIndex = Math.max(0, all.length - visibleCount - offset);
      const candles = all.slice(startIndex, startIndex + visibleCount);
      if (!candles.length) return;

      let hi = -Infinity, lo = Infinity;
      candles.forEach((c) => { hi = Math.max(hi, c.h); lo = Math.min(lo, c.l); });
      positions.forEach((p) => {
        if (p.symbol === symbol) {
          hi = Math.max(hi, p.openPrice);
          lo = Math.min(lo, p.openPrice);
        }
      });

      const range = (hi - lo) || hi * 0.001;
      hi += range * 0.08;
      lo -= range * 0.08;

      const ch = cv.clientHeight - 34;
      const yOf = (price: number) => 6 + ((hi - price) / (hi - lo)) * ch;

      const symPositions = positions.filter((p) => p.symbol === symbol);
      symPositions.forEach((p, idx) => {
        const y = yOf(p.openPrice);
        const labelTop = y - 9 - (idx % 3) * 18;
        const labelBottom = labelTop + 16;
        if (clickY >= labelTop && clickY <= labelBottom && clickX >= 4 && clickX <= 250) {
          onClosePosition(p.id);
        }
      });
    };

    cv.addEventListener("click", handleClick);
    return () => cv.removeEventListener("click", handleClick);
  }, [symbol, tf, positions, visibleCount, offset, onClosePosition]);

  return (
    <canvas
      ref={ref}
      className="h-full w-full cursor-grab active:cursor-grabbing touch-none select-none"
      style={{ touchAction: "none" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
