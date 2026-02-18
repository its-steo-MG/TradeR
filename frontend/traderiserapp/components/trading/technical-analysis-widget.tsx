
// components/trading/technical-analysis-widget.tsx
'use client';

import { useEffect, useRef, memo } from 'react';



interface TechnicalAnalysisWidgetProps {
  symbol?: string; // e.g., "NASDAQ:AAPL", "OANDA:EURUSD", "BINANCE:BTCUSDT"
}

function TechnicalAnalysisWidget({ symbol = 'NASDAQ:AAPL' }: TechnicalAnalysisWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!container.current) return;

    // Clear previous widget content and remove existing script
    container.current.innerHTML = '';
    if (scriptRef.current && scriptRef.current.parentNode) {
      scriptRef.current.parentNode.removeChild(scriptRef.current);
    }

    // Create new script for TradingView technical analysis widget
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      displayMode: 'single',
      isTransparent: false,
      locale: 'en',
      interval: '1m',
      disableInterval: false,
      width: 425,
      height: 450,
      symbol, // Dynamic symbol
      showIntervalTabs: true,
    });

    container.current.appendChild(script);
    scriptRef.current = script; // Store script reference for cleanup

    // Cleanup
    return () => {
      if (container.current) {
        container.current.innerHTML = ''; // Clear container
      }
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current); // Remove script
      }
      scriptRef.current = null; // Reset script reference
    };
  }, [symbol]); // Re-run effect when symbol changes

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
      <div className="tradingview-widget-copyright text-xs text-white/50 mt-2 text-right">
        <a
          href={`https://www.tradingview.com/symbols/${symbol.replace(':', '-')}/technicals/`}
          rel="noopener noreferrer"
          target="_blank"
          className="hover:underline"
        >
          {symbol} Technical Analysis by TradingView
        </a>
      </div>
    </div>
  );
}

export default memo(TechnicalAnalysisWidget);
