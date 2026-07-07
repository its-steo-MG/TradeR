/**
 * Cross-platform notification sound that works on desktop, mobile browsers,
 * and installed PWAs — including iOS Safari / iOS standalone PWA, where
 * autoplay is blocked until audio has been "unlocked" by a real user gesture.
 *
 * Strategy:
 * 1. Use the Web Audio API (AudioContext) instead of a bare <audio> element.
 *    Once an AudioContext is resumed inside a user gesture, it can play sounds
 *    later without a fresh gesture — this is what makes iOS work.
 * 2. On the very first user interaction (pointerdown / touchend / keydown) we
 *    resume the context and play a silent buffer to "unlock" audio.
 * 3. The mp3 is fetched once and decoded into an AudioBuffer for instant replay.
 * 4. A plain <audio> element is kept as a fallback for environments where the
 *    Web Audio path fails.
 */

const SOUND_URL = "/sounds/mpesa-notification.mp3";

let audioCtx: AudioContext | null = null;
let decodedBuffer: AudioBuffer | null = null;
let bufferPromise: Promise<AudioBuffer | null> | null = null;
let unlocked = false;
let fallbackEl: HTMLAudioElement | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
}

async function loadBuffer(): Promise<AudioBuffer | null> {
  const ctx = getCtx();
  if (!ctx) return null;
  if (decodedBuffer) return decodedBuffer;
  if (bufferPromise) return bufferPromise;

  bufferPromise = (async () => {
    try {
      const res = await fetch(SOUND_URL);
      const arr = await res.arrayBuffer();
      decodedBuffer = await ctx.decodeAudioData(arr);
      return decodedBuffer;
    } catch (err) {
      console.log("Failed to decode notification sound:", err);
      return null;
    }
  })();

  return bufferPromise;
}

function getFallbackEl(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (fallbackEl) return fallbackEl;
  fallbackEl = new Audio(SOUND_URL);
  fallbackEl.preload = "auto";
  fallbackEl.volume = 0.8;
  return fallbackEl;
}

/**
 * Resume the AudioContext and play a near-silent blip inside a user gesture so
 * iOS marks audio as unlocked. Safe to call many times.
 */
export function unlockNotificationSound() {
  const ctx = getCtx();
  if (!ctx) {
    // Prime the fallback element instead.
    const el = getFallbackEl();
    if (el && !unlocked) {
      el.muted = true;
      el.play()
        .then(() => {
          el.pause();
          el.currentTime = 0;
          el.muted = false;
          unlocked = true;
        })
        .catch(() => {});
    }
    return;
  }

  if (ctx.state === "suspended") void ctx.resume();

  // Kick off decoding early.
  void loadBuffer();

  if (unlocked) return;
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    unlocked = true;
  } catch {
    /* ignore */
  }
}

/** Play the notification sound. Works after unlock without a fresh gesture. */
export async function playNotificationSound() {
  const ctx = getCtx();
  if (ctx) {
    try {
      if (ctx.state === "suspended") await ctx.resume();
      const buffer = await loadBuffer();
      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = 0.8;
        source.connect(gain).connect(ctx.destination);
        source.start(0);
        return;
      }
    } catch (err) {
      console.log("Web Audio playback failed, falling back:", err);
    }
  }

  // Fallback: plain <audio> element.
  const el = getFallbackEl();
  if (el) {
    try {
      el.currentTime = 0;
      await el.play();
    } catch (err) {
      console.log("Notification sound blocked by browser:", err);
    }
  }
}

/**
 * Install one-time listeners that unlock audio on the first user interaction.
 * Returns a cleanup function. Call this once (e.g. from the NotificationProvider).
 */
export function installSoundUnlock(): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => unlockNotificationSound();
  const events: (keyof DocumentEventMap)[] = [
    "pointerdown",
    "touchend",
    "keydown",
    "click",
  ];
  events.forEach((e) =>
    document.addEventListener(e, handler, { passive: true }),
  );

  return () => {
    events.forEach((e) => document.removeEventListener(e, handler));
  };
}
