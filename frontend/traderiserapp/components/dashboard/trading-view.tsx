"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

interface TradingViewWidgetProps {
  symbol: string;
}

export function TradingViewWidget({ symbol }: TradingViewWidgetProps) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    setIsLoading(true);
    setError(null);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      interval: symbol.includes("USD") ? "60" : "D",
      locale: "en",
      save_image: true,
      style: "1",
      symbol,
      theme: resolvedTheme === "light" ? "light" : "dark",
      timezone: "Etc/UTC",
      backgroundColor: resolvedTheme === "light" ? "#f7f8ff" : "#0a0a0a",
      gridColor: resolvedTheme === "light" ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.06)",
      autosize: true,
      height: 500,
      width: "100%",
    });
    script.onload = () => setIsLoading(false);
    script.onerror = () => {
      setError("Failed to load TradingView widget");
      setIsLoading(false);
    };

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "500px";
    widget.style.width = "100%";
    containerRef.current.appendChild(widget);
    containerRef.current.appendChild(script);
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol, resolvedTheme]);

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-sky-50 p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            Portfolio performance
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">{symbol}</p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
          ● Live
        </span>
      </div>
      {error ? (
        <div className="py-16 text-center text-destructive">{error}</div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-white dark:border-zinc-800 dark:bg-transparent">
          <div ref={containerRef} className="tradingview-widget-container w-full" style={{ height: 500 }} />
          {isLoading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-500 dark:text-zinc-400">
              Loading chart...
            </div>
          )}
        </div>
      )}
    </section>
  );
}
