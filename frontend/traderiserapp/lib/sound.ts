"use client";

// Web Audio synthesized SFX with anti-overlap lock so win/lose never
// stomp each other when trades fire back-to-back.

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    ctx = new (
      window.AudioContext || 
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    )();
  }
  return ctx;
};

let muted = false;
let lockedUntil = 0;

export const setMuted = (v: boolean) => {
  muted = v;
};

export const isMuted = () => muted;

function beep(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.08, delay = 0) {
  const c = getCtx();
  if (!c) return;

  const start = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();

  o.type = type;
  o.frequency.value = freq;

  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  o.connect(g);
  g.connect(c.destination);

  o.start(start);
  o.stop(start + duration);
}

function tryLock(ms: number): boolean {
  const now = Date.now();
  if (now < lockedUntil) return false;
  lockedUntil = now + ms;
  return true;
}

export const sfx = {
  click: () => {
    if (muted) return;
    beep(420, 0.06, "triangle", 0.06);
  },
  buy: () => {
    if (muted) return;
    beep(520, 0.08, "sine", 0.08);
    beep(780, 0.1, "sine", 0.08, 0.07);
  },
  win: () => {
    if (muted) return;
    if (!tryLock(450)) return;
    beep(660, 0.1, "sine", 0.1);
    beep(880, 0.12, "sine", 0.1, 0.11);
    beep(1175, 0.15, "sine", 0.1, 0.24);
  },
  lose: () => {
    if (muted) return;
    if (!tryLock(450)) return;
    beep(300, 0.15, "sawtooth", 0.08);
    beep(180, 0.25, "sawtooth", 0.08, 0.16);
  },
};