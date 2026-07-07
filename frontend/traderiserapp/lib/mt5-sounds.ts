"use client";

/**
 * MT5-style trade sounds — synthesised with WebAudio so no assets are needed.
 * Two variants that mimic the classic MetaTrader "order placed" and "order
 * closed" cues (the short cash-register / coin click MT5 plays).
 */

let _ctx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC();
    return _ctx;
  } catch {
    return null;
  }
}

function beep(freq: number, dur: number, when: number, type: OscillatorType = "sine", gain = 0.18) {
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + when);
  g.gain.setValueAtTime(0.0001, ac.currentTime + when);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + when + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + when);
  osc.stop(ac.currentTime + when + dur + 0.02);
}

/** Order placed — short bright double click (MT5 "ok" cue). */
export function playOpenTradeSound() {
  const ac = ctx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  beep(1320, 0.08, 0.00, "triangle", 0.22);
  beep(1760, 0.10, 0.06, "triangle", 0.20);
}

/** Order closed — descending "cha-ching" style pair (MT5 close cue). */
export function playCloseTradeSound() {
  const ac = ctx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  beep(1568, 0.10, 0.00, "triangle", 0.22);
  beep(1046, 0.14, 0.09, "triangle", 0.22);
  beep(784, 0.18, 0.20, "sine", 0.18);
}
