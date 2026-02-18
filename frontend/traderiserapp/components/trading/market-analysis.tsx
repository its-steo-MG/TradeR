// components/trading/market-analysis.tsx
'use client';

import TechnicalAnalysisWidget from './technical-analysis-widget';

interface Props {
  market: string | null;
}

export default function MarketAnalysis({ market }: Props) {
  // Format symbol to match TradingView's expected format
  const symbol = market
    ? market.includes(':')
      ? market // Already in "EXCHANGE:SYMBOL" format
      : `OANDA:${market}` // Adjust prefix for your broker
    : 'NASDAQ:AAPL'; // Default

  return (
    <div className="rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4">
      <h3 className="text-lg font-semibold text-white mb-3">
        Technical Analysis
      </h3>
      <TechnicalAnalysisWidget symbol={symbol} />
    </div>
  );
}