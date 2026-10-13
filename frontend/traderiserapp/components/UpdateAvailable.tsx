"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";

const UPDATE_MS = 60_000;

export default function UpdateAvailable() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [phase, setPhase] = useState<"prompt" | "downloading" | "restart">("prompt");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;

    const check = async () => {
      reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;
      if (reg.waiting) setWaiting(reg.waiting);

      reg.addEventListener("updatefound", () => {
        const next = reg?.installing;
        if (!next) return;
        next.addEventListener("statechange", () => {
          if (next.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(next);
          }
        });
      });
    };

    check();

    const onController = () => {
      // New worker took control — reload into the new version
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onController);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onController);
  }, []);

  useEffect(() => {
    if (phase !== "downloading") return;
    const started = Date.now();
    const timer = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / UPDATE_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timer);
        setPhase("restart");
      }
    }, 200);
    return () => clearInterval(timer);
  }, [phase]);

  if (!waiting) return null;

  const startUpdate = () => setPhase("downloading");

  const restart = () => {
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <div className="fixed bottom-24 right-4 z-[99990] w-[min(92vw,320px)]">
      <div className="drop-on-top relative overflow-hidden rounded-2xl border border-emerald-400/40 bg-zinc-950/90 p-4 text-white shadow-2xl backdrop-blur-xl">
        <span className="relative z-[1] block">
          {phase === "prompt" && (
            <>
              <p className="text-sm font-semibold">New update available</p>
              <p className="mt-1 text-xs text-white/70">
                A newer version of Traderiser is ready. Your current version stays until you update.
              </p>
              <button
                onClick={startUpdate}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
              >
                <Download className="h-4 w-4" /> Update
              </button>
            </>
          )}

          {phase === "downloading" && (
            <>
              <p className="text-sm font-semibold">Downloading update</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-white/60">{Math.round(progress)}%</p>
            </>
          )}

          {phase === "restart" && (
            <>
              <p className="text-sm font-semibold">Update complete</p>
              <p className="mt-1 text-xs text-white/70">Restart the app to open the new version.</p>
              <button
                onClick={restart}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
              >
                <RefreshCw className="h-4 w-4" /> Restart
              </button>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
