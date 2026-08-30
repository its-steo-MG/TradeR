/**
 * Multi-symbol Deriv tick streamer.
 * Opens ONE websocket and subscribes to every volatility index at once so the
 * analysis tool can scan all markets in parallel (independent of the chart).
 */

export type SymbolInfo = { symbol: string; label: string; short: string; pip: number };

export const VOLATILITY_MARKETS: SymbolInfo[] = [
  { symbol: "R_10", label: "Volatility 10 Index", short: "V10", pip: 3 },
  { symbol: "R_25", label: "Volatility 25 Index", short: "V25", pip: 3 },
  { symbol: "R_50", label: "Volatility 50 Index", short: "V50", pip: 4 },
  { symbol: "R_75", label: "Volatility 75 Index", short: "V75", pip: 4 },
  { symbol: "R_100", label: "Volatility 100 Index", short: "V100", pip: 2 },
  { symbol: "1HZ10V", label: "Volatility 10 (1s) Index", short: "V10 (1s)", pip: 2 },
  { symbol: "1HZ25V", label: "Volatility 25 (1s) Index", short: "V25 (1s)", pip: 2 },
  { symbol: "1HZ50V", label: "Volatility 50 (1s) Index", short: "V50 (1s)", pip: 2 },
  { symbol: "1HZ75V", label: "Volatility 75 (1s) Index", short: "V75 (1s)", pip: 2 },
  { symbol: "1HZ100V", label: "Volatility 100 (1s) Index", short: "V100 (1s)", pip: 2 },
];

export const MARKET_LABEL: Record<string, string> = Object.fromEntries(
  VOLATILITY_MARKETS.map((m) => [m.symbol, m.short]),
);

export type TickStore = Record<string, number[]>; // symbol -> last digits (oldest -> newest)

type Listener = (store: TickStore) => void;

export type StreamOptions = {
  appId?: string | number;
  history?: number; // how many ticks of history per symbol
  symbols?: string[];
};

export function createTickStream(opts: StreamOptions = {}) {
  const appId = String(opts.appId ?? 1089);
  const count = opts.history ?? 500;
  const symbols = opts.symbols ?? VOLATILITY_MARKETS.map((m) => m.symbol);
  const pipOf = (s: string) => VOLATILITY_MARKETS.find((m) => m.symbol === s)?.pip ?? 2;

  const store: TickStore = {};
  symbols.forEach((s) => (store[s] = []));

  const listeners = new Set<Listener>();
  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;
  let status: "connecting" | "open" | "closed" = "connecting";
  const statusListeners = new Set<(s: typeof status) => void>();

  const digitOf = (quote: number | string, symbol: string) => {
    const str = typeof quote === "string" ? quote : quote.toFixed(pipOf(symbol));
    const cleaned = str.replace(/[^0-9]/g, "");
    return Number(cleaned[cleaned.length - 1] ?? 0);
  };

  const emit = () => listeners.forEach((l) => l(store));
  const setStatus = (s: typeof status) => {
    status = s;
    statusListeners.forEach((l) => l(s));
  };

  const connect = () => {
    if (closed) return;
    setStatus("connecting");
    ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);

    ws.onopen = () => {
      retry = 0;
      setStatus("open");
      symbols.forEach((symbol) => {
        ws?.send(
          JSON.stringify({
            ticks_history: symbol,
            adjust_start_time: 1,
            count,
            end: "latest",
            style: "ticks",
            subscribe: 1,
          }),
        );
      });
      ping = setInterval(() => ws?.readyState === 1 && ws.send(JSON.stringify({ ping: 1 })), 20000);
    };

    ws.onmessage = (evt) => {
      let data: any;
      try {
        data = JSON.parse(evt.data as string);
      } catch {
        return;
      }
      if (data.error) return;

      if (data.msg_type === "history" && data.echo_req?.ticks_history) {
        const sym = data.echo_req.ticks_history as string;
        const prices: string[] = data.history?.prices ?? [];
        store[sym] = prices.map((p) => digitOf(p, sym));
        emit();
      } else if (data.msg_type === "tick" && data.tick) {
        const sym = data.tick.symbol as string;
        if (!store[sym]) store[sym] = [];
        store[sym] = [...store[sym], digitOf(data.tick.quote, sym)].slice(-count);
        emit();
      }
    };

    const bounce = () => {
      if (ping) clearInterval(ping);
      ping = null;
      if (closed) return;
      setStatus("closed");
      retry = Math.min(retry + 1, 6);
      timer = setTimeout(connect, 500 * 2 ** retry);
    };
    ws.onclose = bounce;
    ws.onerror = () => ws?.close();
  };

  connect();

  return {
    subscribe(l: Listener) {
      listeners.add(l);
      l(store);
      return () => listeners.delete(l);
    },
    onStatus(l: (s: typeof status) => void) {
      statusListeners.add(l);
      l(status);
      return () => statusListeners.delete(l);
    },
    getStore: () => store,
    destroy() {
      closed = true;
      if (timer) clearTimeout(timer);
      if (ping) clearInterval(ping);
      try {
        ws?.close();
      } catch {
        /* noop */
      }
      listeners.clear();
      statusListeners.clear();
    },
  };
}
