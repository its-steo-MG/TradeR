'use client';

import { useEffect, useRef, memo } from 'react';

interface TechnicalAnalysisWidgetProps {
  symbol?: string;
}

function TechnicalAnalysisWidget({ symbol = 'NASDAQ:AAPL' }: TechnicalAnalysisWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!container.current) return;

    const mount = () => {
      if (!container.current) return;
      container.current.innerHTML = '';
      if (scriptRef.current?.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }

      const dark = document.documentElement.classList.contains('dark');
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        colorTheme: dark ? 'dark' : 'light',
        displayMode: 'single',
        isTransparent: false,
        locale: 'en',
        interval: '1m',
        disableInterval: false,
        width: '100%',
        height: 450,
        symbol,
        showIntervalTabs: true,
      });

      container.current.appendChild(script);
      scriptRef.current = script;
    };

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      if (container.current) container.current.innerHTML = '';
      if (scriptRef.current?.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
      scriptRef.current = null;
    };
  }, [symbol]);

  return (
    <div className="tradingview-widget-container w-full overflow-hidden rounded-xl bg-white dark:bg-zinc-950" ref={container}>
      <div className="tradingview-widget-container__widget" />
      <div className="tradingview-widget-copyright text-xs text-slate-500 dark:text-zinc-400 mt-2 text-right">
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
