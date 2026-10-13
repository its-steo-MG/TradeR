// Add this to lib/ticks.ts TickFeed class, next to forcedDigits.

// Queue of forced price moves so Rise/Fall candles follow Sashi.
private forcedMoves: Array<"up" | "down"> = [];

/** Force the next tick to close higher (up) or lower (down). */
forcePriceMove(dir: "up" | "down") {
  this.forcedMoves.push(dir);
}

// In emit(), after the natural drift and before building the tick:
if (this.forcedMoves.length > 0) {
  const dir = this.forcedMoves.shift()!;
  const step = 8 + Math.random() * 10; // visible candle move
  this.price += dir === "up" ? step : -step;
}
