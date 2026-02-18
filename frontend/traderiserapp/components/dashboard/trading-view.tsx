// components/dashboard/trading-view.tsx
"use client";

import { useEffect, useState } from "react";

interface TradingViewWidgetProps {
  symbol: string;
}

export function TradingViewWidget({ symbol }: TradingViewWidgetProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document.getElementById("tradingview-widget-script")) {
      setIsScriptLoaded(true);
      return;
    }

    const timer = setTimeout(() => {
      const script = document.createElement("script");
      script.id = "tradingview-widget-script";
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.async = true;
      script.type = "text/javascript";
      script.innerHTML = JSON.stringify({
        allow_symbol_change: true,
        calendar: false,
        details: false,
        hide_side_toolbar: true,
        hide_top_toolbar: false,
        hide_legend: false,
        hide_volume: false,
        hotlist: false,
        interval: symbol.includes("USD") ? "60" : "D", // 1-hour for forex
        locale: "en",
        save_image: true,
        style: "1",
        symbol: symbol,
        theme: "dark",
        timezone: "Etc/UTC",
        backgroundColor: "#0F0F0F",
        gridColor: "rgba(242, 242, 242, 0.06)",
        watchlist: [],
        withdateranges: false,
        compareSymbols: [],
        studies: [],
        autosize: false,
      });

      script.onload = () => setIsScriptLoaded(true);
      script.onerror = () => setError("Failed to load TradingView widget");

      const container = document.getElementById("tradingview-widget-container");
      if (container) {
        container.appendChild(script);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      const script = document.getElementById("tradingview-widget-script");
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbol]);

  if (error) {
    return (
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-8">
        <h3 className="text-xl font-bold text-white mb-6">Market Overview</h3>
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 mb-8">
      <h3 className="text-xl font-bold text-white mb-6">Market Overview</h3>
      <div
        id="tradingview-widget-container"
        className="tradingview-widget-container w-full"
        style={{ height: "500px !important", width: "100% !important", minHeight: "500px", maxHeight: "500px" }}
      >
        <div
          className="tradingview-widget-container__widget"
          style={{ height: "calc(100% - 32px) !important", width: "100% !important" }}
        ></div>
        {isScriptLoaded ? (
          <div className="tradingview-widget-copyright text-sm text-slate-400 mt-2"></div>
        ) : (
          <div className="text-white text-center py-8">Loading TradingView chart... Please wait.</div>
        )}
      </div>
    </div>
  );
}