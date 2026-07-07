"use client";

export type MT5AccountType = "real" | "demo";

export interface MT5Account {
  id: string;
  type: MT5AccountType;
  login: string;
  server: string;
  leverage: number;
  balance: number;
  currency: "USD";
  createdAt: number;
}

export interface MT5Position {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  volume: number;
  openPrice: number;
  currentPrice: number;
  sl?: number;
  tp?: number;
  openedAt: number;
  swap: number;
  commission: number;
}

export interface MT5ClosedTrade extends MT5Position {
  closePrice: number;
  closedAt: number;
  profit: number;
}

export interface MT5Robot {
  id: string;
  name: string;
  description: string;
  symbols: string[];
  riskLevel: "Low" | "Medium" | "High";
  monthlyReturn: string;
  price: number;
  owned: boolean;
  active: boolean;
}

export interface MT5Symbol {
  symbol: string;
  name: string;
  price: number;
  prev: number;
  day: { high: number; low: number; open: number };
  digits: number;
  spread: number;
  contractSize: number;
}

const KEYS = {
  account: "mt5_account",
  positions: "mt5_positions",
  history: "mt5_history",
  robots: "mt5_robots",
  candles: "mt5_candles_v1",
  selectedSymbol: "mt5_sel_symbol",
  selectedTf: "mt5_sel_tf",
};

// ====================== PRICE PERSISTENCE ======================
const PRICE_KEY = "mt5_symbol_prices";

export function saveSymbolPrices() {
  if (typeof window === "undefined") return;
  const snap: Record<string, { p: number; dh: number; dl: number; do_: number }> = {};
  SYMBOLS.forEach(s => {
    snap[s.symbol] = { p: s.price, dh: s.day.high, dl: s.day.low, do_: s.day.open };
  });
  try { localStorage.setItem(PRICE_KEY, JSON.stringify(snap)); } catch {}
}

function loadSymbolPrices() {
  if (typeof window === "undefined") return;
  try {
    const saved = localStorage.getItem(PRICE_KEY);
    if (!saved) return;
    const snap = JSON.parse(saved);
    SYMBOLS.forEach(s => {
      const v = snap[s.symbol];
      if (!v) return;
      if (typeof v === "number") { s.price = v; s.prev = v; return; }
      if (typeof v.p === "number") { s.price = v.p; s.prev = v.p; }
      if (typeof v.dh === "number") s.day.high = v.dh;
      if (typeof v.dl === "number") s.day.low = v.dl;
      if (typeof v.do_ === "number") s.day.open = v.do_;
    });
  } catch {}
}

if (typeof window !== "undefined") {
  loadSymbolPrices();
  window.addEventListener("beforeunload", () => { try { saveSymbolPrices(); } catch {} });
  window.addEventListener("pagehide", () => { try { saveSymbolPrices(); } catch {} });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { try { saveSymbolPrices(); } catch {} }
  });
}

function read<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function write<T>(k: string, v: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(k, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent("mt5:update", { detail: { key: k } }));
}

function mkSym(symbol: string, name: string, price: number, digits: number, spread = 5, contractSize = 100000): MT5Symbol {
  return { symbol, name, price, prev: price, day: { high: price * 1.003, low: price * 0.997, open: price }, digits, spread, contractSize };
}

export const SYMBOLS: MT5Symbol[] = [
  mkSym("EURUSD", "Euro vs US Dollar", 1.08542, 5),
  mkSym("GBPUSD", "Great Britain Pound vs US Dollar", 1.26431, 5),
  mkSym("USDJPY", "US Dollar vs Japanese Yen", 156.842, 3),
  mkSym("AUDUSD", "Australian Dollar vs US Dollar", 0.6523, 5),
  mkSym("USDCAD", "US Dollar vs Canadian Dollar", 1.3854, 5),
  mkSym("USDCHF", "US Dollar vs Swiss Franc", 0.8721, 5),
  mkSym("NZDUSD", "New Zealand Dollar vs US Dollar", 0.5987, 5),

  // Minor & Cross Forex
  mkSym("EURGBP", "Euro vs Great Britain Pound", 0.8574, 5),
  mkSym("EURJPY", "Euro vs Japanese Yen", 163.25, 3),
  mkSym("GBPJPY", "Great Britain Pound vs Japanese Yen", 190.45, 3),
  mkSym("AUDJPY", "Australian Dollar vs Japanese Yen", 98.75, 3),
  mkSym("AUDCAD", "Australian Dollar vs Canadian Dollar", 0.98277, 5),
  mkSym("EURCAD", "Euro vs Canadian Dollar", 1.5023, 5),
  mkSym("EURAUD", "Euro vs Australian Dollar", 1.6621, 5),

  // Popular Cryptocurrencies
  mkSym("BTCUSD", "Bitcoin vs US Dollar", 68420.5, 2),
  mkSym("ETHUSD", "Ethereum vs US Dollar", 2650, 2),
  mkSym("XRPUSD", "Ripple vs US Dollar", 0.524, 4),
  mkSym("LTCUSD", "Litecoin vs US Dollar", 72.85, 2),
  mkSym("SOLUSD", "Solana vs US Dollar", 148.3, 2),
  mkSym("BNBUSD", "Binance Coin vs US Dollar", 585.4, 2),

  // Keep your original ones too
  mkSym("AUDCHF", "Australian Dollar vs Swiss Franc", 0.56324, 5),
  mkSym("AUDNZD", "Australian Dollar vs New Zealand Dollar", 1.21882, 5),
  mkSym("XAUUSD", "Gold vs US Dollar", 2351.23, 2, 20, 100),
  mkSym("XAGUSD", "Silver vs US Dollar", 28.43, 3, 25, 5000),
];

export function bidAsk(s: MT5Symbol) {
  const pip = Math.pow(10, -s.digits);
  const half = (s.spread * pip) / 2;
  return { bid: +(s.price - half).toFixed(s.digits), ask: +(s.price + half).toFixed(s.digits) };
}

export function calcProfit(p: MT5Position): number {
  const sym = SYMBOLS.find((x) => x.symbol === p.symbol);
  if (!sym) return 0;
  const dir = p.side === "buy" ? 1 : -1;
  const diff = (p.currentPrice - p.openPrice) * dir;
  let profit = diff * sym.contractSize * p.volume;
  if (sym.symbol.endsWith("JPY")) profit = profit / sym.price;
  return +(profit - (p.swap || 0) - (p.commission || 0)).toFixed(2);
}

export function positionMargin(p: MT5Position, leverage: number): number {
  const sym = SYMBOLS.find((x) => x.symbol === p.symbol);
  if (!sym) return 0;
  return +((sym.price * sym.contractSize * p.volume) / leverage).toFixed(2);
}

export type Timeframe = "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1" | "W1";

export const TIMEFRAMES: Timeframe[] = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];

export const TF_SECONDS: Record<Timeframe, number> = {
  M1: 60, M5: 300, M15: 900, M30: 1800,
  H1: 3600, H4: 14400, D1: 86400, W1: 604800,
};

export interface Candle { t: number; o: number; h: number; l: number; c: number; }

type CandleStore = Record<string, Candle[]>;
const ckey = (s: string, tf: Timeframe) => `${s}|${tf}`;
const readCandleStore = () => read<CandleStore>(KEYS.candles, {});
const writeCandleStore = (s: CandleStore) => write(KEYS.candles, s);

function seedCandles(sym: MT5Symbol, tf: Timeframe, n = 220): Candle[] {
  const secs = TF_SECONDS[tf];
  const nowBucket = Math.floor(Date.now() / 1000 / secs) * secs;
  const start = nowBucket - secs * (n - 1);
  const vol = sym.price * 0.0018;
  let price = sym.price * (0.985 + Math.random() * 0.03);
  const out: Candle[] = [];

  for (let i = 0; i < n; i++) {
    const o = price;
    const c = +(o + (Math.random() - 0.5) * vol).toFixed(sym.digits);
    const h = +Math.max(o, c, o + Math.random() * vol).toFixed(sym.digits);
    const l = +Math.min(o, c, o - Math.random() * vol).toFixed(sym.digits);
    out.push({ t: start + i * secs, o, h, l, c });
    price = c;
  }

  const last = out[out.length - 1];
  last.c = sym.price;
  last.h = Math.max(last.h, sym.price);
  last.l = Math.min(last.l, sym.price);
  return out;
}

export function getCandles(symbol: string, tf: Timeframe): Candle[] {
  const store = readCandleStore();
  const key = ckey(symbol, tf);

  if (!store[key] || store[key].length === 0) {
    const sym = SYMBOLS.find((s) => s.symbol === symbol);
    if (!sym) return [];
    store[key] = seedCandles(sym, tf);
    writeCandleStore(store);
  } else {
    const sym = SYMBOLS.find((s) => s.symbol === symbol);
    if (sym) {
      const last = store[key][store[key].length - 1];
      if (last) {
        last.c = sym.price;
        if (sym.price > last.h) last.h = sym.price;
        if (sym.price < last.l) last.l = sym.price;
      }
    }
  }
  return store[key];
}

// ====================== IMPROVED SASHI BIAS (Realistic + Opposite for non-Sashi) ======================
export function tickCandles() {
  if (typeof window === "undefined") return;

  const store = readCandleStore();
  let changed = false;
  const positions = mt5Store.getPositions();
  const isSashi = mt5Store.isSashi;

  for (const sym of SYMBOLS) {
    for (const tf of TIMEFRAMES) {
      const key = ckey(sym.symbol, tf);
      if (!store[key]) continue;

      const secs = TF_SECONDS[tf];
      const bucket = Math.floor(Date.now() / 1000 / secs) * secs;
      const arr = store[key];
      const last = arr[arr.length - 1];
      if (!last) continue;

      if (bucket > last.t) {
        let closePrice = sym.price;

        const relevant = positions.filter(p => p.symbol === sym.symbol);
        const net = relevant.reduce((sum, p) => {
          return sum + (p.side === "buy" ? p.volume : -p.volume);
        }, 0);

        if (net !== 0 && (tf === "M1" || tf === "M5")) {
          const isLong = net > 0;
          const isShort = net < 0;

          let desiredDirection = 0;

          if (isSashi) {
            if (isLong) desiredDirection = 1;
            if (isShort) desiredDirection = -1;
          } else {
            if (isLong) desiredDirection = -1;
            if (isShort) desiredDirection = 1;
          }

          if (desiredDirection !== 0) {
            const biasStrength = isSashi ? 0.00075 : 0.00038;
            const favorChance = 0.85;
            const shouldFavor = Math.random() < favorChance;

            if (shouldFavor) {
              closePrice = sym.price * (1 + desiredDirection * biasStrength);
            } else {
              closePrice = sym.price * (1 + (Math.random() - 0.5) * biasStrength * 0.6);
            }

            const momentum = (sym.price - last.c) * 0.25;
            closePrice = closePrice * (1 + momentum * 0.0004);
          }
        } else {
          const normalVol = tf === "M1" || tf === "M5" ? 0.00028 : 0.00018;
          closePrice = sym.price * (1 + (Math.random() - 0.5) * normalVol);
        }

        arr.push({
          t: bucket,
          o: last.c,
          h: Math.max(last.c, closePrice, sym.price),
          l: Math.min(last.c, closePrice, sym.price),
          c: closePrice,
        });

        if (arr.length > 420) arr.shift();
      } else {
        last.c = sym.price;
        if (sym.price > last.h) last.h = sym.price;
        if (sym.price < last.l) last.l = sym.price;
      }

      changed = true;
    }
  }

  if (changed) {
    writeCandleStore(store);
  }
}

function seedRobots(): MT5Robot[] {
  return [
    { id: "r1", name: "Scalper Pro X", description: "M1 scalper for major FX pairs.", symbols: ["EURUSD", "GBPUSD"], riskLevel: "High", monthlyReturn: "+18%", price: 199, owned: true, active: false },
    { id: "r2", name: "Trend Rider", description: "H1/H4 trend EA with dynamic SL/TP.", symbols: ["XAUUSD", "USDJPY"], riskLevel: "Medium", monthlyReturn: "+9%", price: 149, owned: true, active: false },
    { id: "r3", name: "Grid Master", description: "Grid bot for ranging markets.", symbols: ["AUDCAD", "AUDNZD"], riskLevel: "High", monthlyReturn: "+14%", price: 179, owned: false, active: false },
    { id: "r4", name: "Swing Sniper", description: "D1 swing trades on majors.", symbols: ["EURUSD", "GBPUSD", "USDJPY"], riskLevel: "Low", monthlyReturn: "+5%", price: 99, owned: false, active: false },
  ];
}

// ====================== EA ENGINE ======================
let eaInterval: any = null;
let isInCooldown = false;
const CYCLE_COOLDOWN = 10000;

export const mt5Store = {
  getAccount: (): MT5Account | null => {
    const a = read<MT5Account | null>(KEYS.account, null);
    if (a) return a;

    const seed: MT5Account = {
      id: "acc-demo-1",
      type: "demo",
      login: "50012345",
      server: "MetaQuotes-Demo",
      leverage: 500,
      balance: 100000,
      currency: "USD",
      createdAt: Date.now(),
    };
    write(KEYS.account, seed);
    return seed;
  },

  setAccount: (a: MT5Account | null) => write(KEYS.account, a),

  updateAccountBalance: (delta: number) => {
    const acc = mt5Store.getAccount();
    if (!acc) return;
    acc.balance = Math.max(0, +(acc.balance + delta).toFixed(2));
    mt5Store.setAccount(acc);
  },

  isSashi: false,
  _marginWarningShown: false,

  // ====================== EA STATE ======================
  isEaRunning: false,
  eaMaxPositions: 5,
  eaSymbol: "",

  startEA: (maxPositions: number) => {
    mt5Store.isEaRunning = true;
    mt5Store.eaMaxPositions = maxPositions;
    mt5Store.eaSymbol = mt5Store.getSelectedSymbol();
    isInCooldown = false;

    if (eaInterval) clearInterval(eaInterval);

    eaInterval = setInterval(() => mt5Store.runEAStep(), 3000);
    console.log(`[EA] Started with max ${maxPositions} positions`);
  },

  stopEA: () => {
    mt5Store.isEaRunning = false;
    if (eaInterval) {
      clearInterval(eaInterval);
      eaInterval = null;
    }
    isInCooldown = false;
    console.log("[EA] Stopped");
  },

  stopEAAndClosePositions: async () => {
    await mt5Store.closeAllCurrentPositions();
    mt5Store.stopEA();
    window.dispatchEvent(new CustomEvent("mt5:ea-closed"));
    console.log("[EA] Fully stopped and closed all positions");
  },

  closeAllCurrentPositions: async () => {
    const positions = mt5Store.getPositions();
    if (positions.length === 0) return;

    let totalProfit = 0;
    const token = localStorage.getItem("access_token");
    const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
      .replace(/\/$/, "")
      .replace(/\/api$/, "");

    for (const pos of positions) {
      const profit = calcProfit(pos);
      totalProfit += profit;

      if (token && !pos.id.toString().startsWith("p_")) {
        try {
          await fetch(`${base}/api/mt5/positions/close/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              position_id: pos.id,
              close_price: pos.currentPrice,
            }),
          });

          //await fetch(`${base}/api/forex/positions/credit-on-close/`, {
          //  method: "POST",
          //  headers: {
          //    "Content-Type": "application/json",
          //    Authorization: `Bearer ${token}`,
          //  },
          //  body: JSON.stringify({
          //    realized_profit: profit,
          //    symbol: pos.symbol,
          //    volume: pos.volume,
          //    side: pos.side,
          //  }),
          //});
        } catch (e) {
          console.warn("Backend close failed for", pos.id, e);
        }
      }

      addClosedTrade({
        ...pos,
        closePrice: pos.currentPrice,
        profit,
        closedAt: Date.now(),
      });
    }

    mt5Store.setPositions([]);
    mt5Store.updateAccountBalance(totalProfit);
    mt5Store.refreshPositions();
  },

  runEAStep: async () => {
    if (!mt5Store.isEaRunning || isInCooldown) return;

    const symbol = mt5Store.eaSymbol || mt5Store.getSelectedSymbol();
    const maxPos = mt5Store.eaMaxPositions;
    const isSashi = mt5Store.isSashi;

    let currentBatch = mt5Store.getPositions().filter(p => p.symbol === symbol);

    if (currentBatch.length > 0) {
      const totalPnL = currentBatch.reduce((sum, p) => sum + calcProfit(p), 0);
      const shouldClose = isSashi ? totalPnL > 5 : totalPnL < -35;

      if (shouldClose) {
        isInCooldown = true;
        let realized = 0;

        const token = localStorage.getItem("access_token");
        const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
          .replace(/\/$/, "")
          .replace(/\/api$/, "");

        for (const pos of currentBatch) {
          const profit = calcProfit(pos);
          realized += profit;

          if (token) {
            try {
              console.log(`[EA] Calling backend close for ${pos.id}`);

              await fetch(`${base}/api/mt5/positions/close/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  position_id: pos.id,
                  close_price: pos.currentPrice,
                }),
              });

              //await fetch(`${base}/api/forex/positions/credit-on-close/`, {
              //  method: "POST",
              //  headers: {
              //    "Content-Type": "application/json",
              //    Authorization: `Bearer ${token}`,
              //  },
              //  body: JSON.stringify({
              //    realized_profit: profit,
              //    symbol: pos.symbol,
              //    volume: pos.volume,
              //    side: pos.side,
              //  }),
              //});
            } catch (e) {
              console.warn("Backend close failed for", pos.id, e);
            }
          }

          addClosedTrade({
            ...pos,
            closePrice: pos.currentPrice,
            profit,
            closedAt: Date.now()
          });
        }

        let allPositions = mt5Store.getPositions();
        allPositions = allPositions.filter(p => 
          !currentBatch.some(c => String(c.id) === String(p.id))
        );

        mt5Store.setPositions(allPositions);
        mt5Store.updateAccountBalance(realized);
        mt5Store.refreshPositions();

        window.dispatchEvent(new CustomEvent("mt5:ea-closed"));

        console.log(`[EA] Batch closed | Total PnL: ${realized.toFixed(2)}`);

        setTimeout(() => { isInCooldown = false; }, CYCLE_COOLDOWN);
        return;
      }
    }

    if (currentBatch.length === 0) {
      isInCooldown = true;
      const side: "buy" | "sell" = Math.random() > 0.5 ? "buy" : "sell";

      for (let i = 0; i < maxPos; i++) {
        openPosition(symbol, side, 0.01);
      }

      console.log(`[EA] Opened new batch of ${maxPos} ${side}`);

      setTimeout(() => { isInCooldown = false; }, CYCLE_COOLDOWN);
    }
  },
  
  // ====================== REST OF FUNCTIONS ======================
  fetchSashiStatus: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return false;

    try {
      let base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
      if (base.endsWith("/api")) base = base.slice(0, -4);

      const url = `${base}/api/accounts/account/`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

      if (res.ok) {
        const data = await res.json();
        const isSashi = data.user?.is_sashi || false;
        mt5Store.isSashi = isSashi;
        return isSashi;
      }
    } catch {}
    return false;
  },

  fetchPositionsFromBackend: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return read<MT5Position[]>(KEYS.positions, []);

    try {
      let base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
      if (base.endsWith("/api")) base = base.slice(0, -4);

      const res = await fetch(`${base}/api/mt5/positions/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const backendPositions = data.positions || [];

        const formatted = backendPositions.map((p: any) => ({
          id: p.id.toString(),
          symbol: p.symbol,
          side: p.side,
          volume: Number(p.volume),
          openPrice: Number(p.open_price),
          currentPrice: Number(p.current_price),
          openedAt: new Date(p.opened_at).getTime(),
          swap: Number(p.swap || 0),
          commission: Number(p.commission || 0),
        }));

        write(KEYS.positions, formatted);
        return formatted;
      }
    } catch {
      console.warn("Failed to fetch positions from backend");
    }
    return read<MT5Position[]>(KEYS.positions, []);
  },

  openPositionOnBackend: async (position: any) => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;

    try {
      let base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
      if (base.endsWith("/api")) base = base.slice(0, -4);

      const res = await fetch(`${base}/api/mt5/positions/open/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol: position.symbol,
          side: position.side,
          volume: position.volume,
          open_price: position.openPrice,
          current_price: position.currentPrice,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.position;
      }
    } catch {}
    return null;
  },

  closePositionOnBackend: async (positionId: string, closePrice: number) => {
    const token = localStorage.getItem("access_token");
    if (!token) return 0;

    if (positionId.startsWith("p_")) {
      console.log("[Simulator] Local position closed (no backend call):", positionId);
      return 0;
    }

    try {
      let base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
      if (base.endsWith("/api")) base = base.slice(0, -4);

      const res = await fetch(`${base}/api/mt5/positions/close/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          position_id: positionId,
          close_price: closePrice,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.final_profit || 0;
      }
    } catch (e) {
      console.warn("Backend close failed for position", positionId);
    }
    return 0;
  },

  checkMarginCall: async () => {
    const acc = mt5Store.getAccount();
    if (!acc) return;

    const positions = mt5Store.getPositions();
    if (positions.length === 0) return;

    const leverage = acc.leverage || 500;
    const totalFloatingPnL = positions.reduce((sum, p) => sum + calcProfit(p), 0);
    const equity = acc.balance + totalFloatingPnL;
    const usedMargin = positions.reduce((sum, p) => sum + positionMargin(p, leverage), 0);

    if (usedMargin <= 0) return;

    const marginLevel = (equity / usedMargin) * 100;

    if (marginLevel < 70 && marginLevel >= 30) {
      if (!mt5Store._marginWarningShown) {
        mt5Store._marginWarningShown = true;
        window.dispatchEvent(new CustomEvent("mt5:margin-warning", {
          detail: {
            message: `Margin Call Warning! Level: ${marginLevel.toFixed(1)}%`,
            marginLevel: marginLevel.toFixed(1)
          }
        }));
      }
      return;
    }

    if (marginLevel < 30) {
      console.warn(`[STOP OUT] Level: ${marginLevel.toFixed(1)}% — Force closing all positions`);

      const token = localStorage.getItem("access_token");
      let base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
      if (base.endsWith("/api")) base = base.slice(0, -4);

      let realizedPnL = 0;
      const toClose = [...positions];

      for (const p of toClose) {
        const profit = calcProfit(p);
        realizedPnL += profit;

        addClosedTrade({
          id: p.id,
          symbol: p.symbol,
          side: p.side,
          volume: p.volume,
          openPrice: p.openPrice,
          currentPrice: p.currentPrice,
          closePrice: p.currentPrice,
          profit: profit,
          closedAt: Date.now(),
          openedAt: p.openedAt,
          swap: p.swap || 0,
          commission: p.commission || 0,
        });

        if (token && !p.id.startsWith("p_")) {
          try {
            await fetch(`${base}/api/mt5/positions/close/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                position_id: p.id,
                close_price: p.currentPrice,
              }),
            });
          } catch (e) {
            console.warn("Backend close failed for position", p.id);
          }
        }
      }

      const currentBal = acc.balance;
      const tentativeNewBal = currentBal + realizedPnL;
      const finalNewBal = Math.max(0, tentativeNewBal);

      mt5Store.setAccount({ ...acc, balance: finalNewBal });

      if (token && realizedPnL !== 0) {
        try {
          //await fetch(`${base}/api/forex/positions/credit-on-close/`, {
          //  method: "POST",
          //  headers: {
          //    "Content-Type": "application/json",
          //    Authorization: `Bearer ${token}`,
          //  },
          //  body: JSON.stringify({
          //    realized_profit: realizedPnL,
          //    symbol: "STOP_OUT",
          //    volume: 0,
          //    side: "close_all",
          //  }),
          //});
        } catch (e) {
          console.warn("Credit on stop out failed");
        }
      }

      mt5Store.setPositions([]);
      mt5Store._marginWarningShown = false;

      window.dispatchEvent(new CustomEvent("mt5:update", { detail: { key: "stop-out" } }));
      window.dispatchEvent(new CustomEvent("mt5:stop-out", {
        detail: {
          message: `Stop Out! All positions closed. Margin Level: ${marginLevel.toFixed(1)}%`,
          finalBalance: finalNewBal,
          realizedPnL,
          marginLevel: marginLevel.toFixed(1)
        }
      }));
    }
  },

  syncAccountFromBackend: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;

    try {
      let base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
      if (base.endsWith("/api")) base = base.slice(0, -4);

      const url = `${base}/api/mt5/my-accounts/`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

      if (!res.ok) return null;

      const data = await res.json();
      const accounts: any[] = data.mt5_accounts || [];
      const current = read<any>(KEYS.account, null);
      if (!current) return null;

      const fresh = accounts.find((a) => a.id === current.id);
      if (!fresh) return null;

      const updatedAccount = { ...current, balance: Number(fresh.balance) || 0 };
      write(KEYS.account, updatedAccount);
      return updatedAccount;
    } catch {
      return null;
    }
  },

  canOpenTrade: (volume: number): { allowed: boolean; reason?: string } => {
    const acc = mt5Store.getAccount();
    if (!acc) return { allowed: false, reason: "No account found" };

    const positions = mt5Store.getPositions();
    const leverage = acc.leverage || 500;

    let usedMargin = 0;
    for (const p of positions) {
      usedMargin += positionMargin(p, leverage);
    }

    const equity = acc.balance + positions.reduce((sum, p) => sum + calcProfit(p), 0);
    const freeMargin = equity - usedMargin;

    const referencePrice = 1.085;
    const newMargin = (referencePrice * 100000 * volume) / leverage;

    if (newMargin > freeMargin) {
      return {
        allowed: false,
        reason: `Insufficient margin. Required: $${newMargin.toFixed(2)}`,
      };
    }

    return { allowed: true };
  },

  getPositions: () => read<MT5Position[]>(KEYS.positions, []),
  setPositions: (p: MT5Position[]) => write(KEYS.positions, p),

  refreshPositions: () => {
    let saved = read<MT5Position[]>(KEYS.positions, []);
    const uniqueMap = new Map<string, MT5Position>();
    saved.forEach(p => {
      uniqueMap.set(String(p.id), p);
    });
    const unique = Array.from(uniqueMap.values());
    write(KEYS.positions, unique);
    return unique;
  },

  getHistory: () => read<MT5ClosedTrade[]>(KEYS.history, []),
  setHistory: (h: MT5ClosedTrade[]) => write(KEYS.history, h),
  getRobots: (): MT5Robot[] => {
    const existing = read<MT5Robot[] | null>(KEYS.robots, null);
    if (existing && existing.length) return existing;
    const seed = seedRobots();
    write(KEYS.robots, seed);
    return seed;
  },
  setRobots: (r: MT5Robot[]) => write(KEYS.robots, r),
  getSelectedSymbol: () => read<string>(KEYS.selectedSymbol, "AUDCAD"),
  setSelectedSymbol: (s: string) => write(KEYS.selectedSymbol, s),
  getSelectedTf: () => read<Timeframe>(KEYS.selectedTf, "M1"),
  setSelectedTf: (t: Timeframe) => write(KEYS.selectedTf, t),

  // ==================== ADDED FOR QUOTES PAGE ====================
  getSymbol: (symbol: string): MT5Symbol | undefined => {
    return SYMBOLS.find(s => s.symbol === symbol);
  },

  initializeSymbols: () => {
    loadSymbolPrices();
    console.log("[MT5] Symbols initialized with saved prices");
  },
};

// ====================== OPEN POSITION ======================
export async function openPosition(symbol: string, side: "buy" | "sell", volume: number) {
  const sym = SYMBOLS.find((s) => s.symbol === symbol);
  if (!sym) return;

  const check = mt5Store.canOpenTrade(volume);

  if (!check.allowed) {
    console.warn("Trade blocked:", check.reason);
    return null;
  }

  const { bid, ask } = bidAsk(sym);
  const price = side === "buy" ? ask : bid;

  const newId = Date.now() + Math.floor(Math.random() * 100000);

  const newPosition: MT5Position = {
    id: newId.toString(),
    symbol,
    side,
    volume,
    openPrice: price,
    currentPrice: price,
    openedAt: Date.now(),
    swap: 0,
    commission: 0,
  };

  await mt5Store.openPositionOnBackend(newPosition);

  const current = mt5Store.getPositions();
  mt5Store.setPositions([newPosition, ...current]);

  try { saveSymbolPrices(); } catch {}

  return newPosition;
}

export function addClosedTrade(trade: MT5ClosedTrade) {
  const current = mt5Store.getHistory();
  const updated = [trade, ...current].slice(0, 200);
  mt5Store.setHistory(updated);
}