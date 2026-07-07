"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, Play, Square, ShoppingCart, Activity } from "lucide-react";
import MT5Navbar from "@/components/mt5/MT5Navbar";
import MT5BottomNav from "@/components/mt5/MT5BottomNav";
import { mt5Store, type MT5Robot } from "@/lib/mt5-store";

export default function MT5RobotsPage() {
  const router = useRouter();
  const [robots, setRobots] = useState<MT5Robot[]>([]);

  useEffect(() => {
    if (!mt5Store.getAccount()) { router.replace("/mt5"); return; }
    const refresh = () => setRobots(mt5Store.getRobots());
    refresh();
    window.addEventListener("mt5:update", refresh);
    return () => window.removeEventListener("mt5:update", refresh);
  }, [router]);

  const update = (id: string, patch: Partial<MT5Robot>) => {
    const next = mt5Store.getRobots().map((r) => (r.id === id ? { ...r, ...patch } : r));
    mt5Store.setRobots(next);
  };

  const toggle = (r: MT5Robot) => {
    update(r.id, { active: !r.active });
    toast.success(`${r.name} ${!r.active ? "started" : "stopped"}`);
  };
  const purchase = (r: MT5Robot) => {
    update(r.id, { owned: true });
    toast.success(`Purchased ${r.name}`);
  };

  const mine = robots.filter((r) => r.owned);
  const store = robots.filter((r) => !r.owned);

  return (
    <>
      <MT5Navbar />
      <main className="mx-auto max-w-[1600px] px-4 pb-24 pt-4 md:pb-6">
        <h1 className="text-2xl font-bold">EA Robots</h1>
        <p className="text-sm text-white/50">Automate strategies on your MT5 account.</p>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/70">My Robots</h2>
          {mine.length === 0 ? (
            <div className="grid h-24 place-items-center rounded-xl border border-dashed border-white/10 text-sm text-white/40">No robots purchased yet</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {mine.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-[#0f172a] p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-10 w-10 place-items-center rounded-lg ${r.active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/60"}`}>
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{r.name}</h3>
                        <p className="text-xs text-white/50">{r.symbols.join(", ")}</p>
                      </div>
                    </div>
                    {r.active && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                        <Activity className="h-3 w-3" /> Running
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-white/60">{r.description}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-white/40">Risk: <span className="text-white/80">{r.riskLevel}</span></span>
                    <span className="text-emerald-400 tabular-nums">{r.monthlyReturn} / mo</span>
                  </div>
                  <button onClick={() => toggle(r)}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${r.active ? "bg-rose-500 text-white hover:bg-rose-400" : "bg-emerald-500 text-white hover:bg-emerald-400"}`}>
                    {r.active ? <><Square className="h-4 w-4" /> Stop</> : <><Play className="h-4 w-4" /> Start</>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/70">Available Robots</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {store.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/10 bg-[#0f172a] p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/15 text-sky-300"><Bot className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-semibold text-white">{r.name}</h3>
                    <p className="text-xs text-white/50">{r.symbols.join(", ")}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/60">{r.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-white/40">Risk: <span className="text-white/80">{r.riskLevel}</span></span>
                  <span className="text-emerald-400 tabular-nums">{r.monthlyReturn} / mo</span>
                </div>
                <button onClick={() => purchase(r)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400">
                  <ShoppingCart className="h-4 w-4" /> Purchase · ${r.price}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
      <MT5BottomNav />
    </>
  );
}
