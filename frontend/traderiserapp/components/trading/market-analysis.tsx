'use client';

import TechnicalAnalysisWidget from './technical-analysis-widget';

interface Props {
  market: string | null;
}

export default function MarketAnalysis({ market }: Props) {
  const symbol = market
    ? market.includes(':')
      ? market
      : `OANDA:${market}`
    : 'NASDAQ:AAPL';

  return (
    <div className="rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
        Technical Analysis
      </h3>
      <TechnicalAnalysisWidget symbol={symbol} />
    </div>
  );
}
