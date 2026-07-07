"use client";

import { useEffect, useState } from "react";
import { Bot, Play, Pause, Activity } from "lucide-react";
import { toast } from "sonner";
import { mt5Store } from "@/lib/mt5-store";

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = RAW_API_BASE.replace(/\/$/, "").replace(/\/api$/, "");

interface Robot {
  id: number;
  name: string;
  description: string;
  price: number;
  effective_price: number;
  is_ea: boolean;
  max_open_positions: number;
  profit_multiplier: number;
  is_active: boolean;
}

interface UserRobot {
  id: number;
  robot: Robot;
  is_running: boolean;
  is_ea: boolean;
  target_profit?: number;
  purchased_at: string;
}

interface BotLog {
  id: number;
  message: string;
  trade_result?: string;
  profit_loss?: number;
  timestamp: string;
}

export default function BotsScreen() {
  const [myRobots, setMyRobots] = useState<UserRobot[]>([]);
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const fetchMyRobots = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/forex/my-robots/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMyRobots(data.user_robots || []);
      }
    } catch (e) {
      console.error("Failed to fetch robots", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!token) return;

    const runningRobots = myRobots.filter((r) => r.is_running);
    if (runningRobots.length === 0) {
      setLogs([]);
      return;
    }

    setLogsLoading(true);

    try {
      const allLogs: BotLog[] = [];

      for (const ur of runningRobots) {
        const res = await fetch(
          `${API_BASE}/api/forex/robot-logs/user-robot/${ur.id}/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            allLogs.push(...data);
          }
        }
      }

      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(allLogs.slice(0, 30));
    } catch (e) {
      console.error("Failed to fetch robot logs", e);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRobots();
    const interval = setInterval(fetchMyRobots, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const hasRunning = myRobots.some((r) => r.is_running);

    if (!hasRunning) {
      setLogs([]);
      return;
    }

    fetchLogs();
    const logInterval = setInterval(fetchLogs, 4000);
    return () => clearInterval(logInterval);
  }, [myRobots]);

  const toggleRobot = async (userRobot: UserRobot) => {
    if (userRobot.is_ea) {
      toast.info("EA Robots are temporarily disabled. Manual mode only.");
      return;
    }

    if (!token) return;

    const wasRunning = userRobot.is_running;

    try {
      const res = await fetch(`${API_BASE}/api/forex/robots/${userRobot.id}/toggle/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to toggle robot");
      }

      const data = await res.json();
      toast.success(data.message || (wasRunning ? "Robot stopped" : "Robot started"));

      await fetchMyRobots();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-white/60">Loading robots...</div>;
  }

  const hasRunningRobots = myRobots.some((r) => r.is_running);

  return (
    <div className="pb-24">
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold">Trading Robots</h1>
        <p className="text-sm text-white/50">Manual trading tools (EA temporarily disabled)</p>
      </header>

      {/* My Robots Section */}
      <div className="px-4 mt-2">
        <h2 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
          <Bot className="h-4 w-4" /> My Robots
        </h2>

        {myRobots.length === 0 ? (
          <div className="text-center py-10 text-white/40 text-sm border border-dashed border-white/10 rounded-2xl">
            You haven&apos;t purchased any robots yet.<br />
            Go to the Robots store to buy one.
          </div>
        ) : (
          <div className="space-y-3">
            {myRobots.map((ur) => (
              <div key={ur.id} className="rounded-2xl border border-white/10 bg-[#0f0f10] p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white flex items-center gap-2">
                      {ur.robot.name}
                      {ur.is_ea && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                          EA (Temporarily Disabled)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/50 mt-0.5 line-clamp-2">{ur.robot.description}</div>
                  </div>

                  <button
                    onClick={() => toggleRobot(ur)}
                    disabled={ur.is_ea}
                    className={`ml-3 h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                      ur.is_running 
                        ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30" 
                        : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    }`}
                  >
                    {ur.is_running ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-white/60">
                  <span>Max positions: <span className="text-white/80">{ur.robot.max_open_positions}</span></span>
                  <span>Multiplier: <span className="text-white/80">{ur.robot.profit_multiplier}x</span></span>
                  {ur.is_running && (
                    <span className="ml-auto flex items-center gap-1 text-emerald-400 font-medium">
                      <Activity className="h-3 w-3" /> RUNNING
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Robot Activity Logs */}
      <div className="px-4 mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Activity Logs
          </h2>
          {hasRunningRobots && logsLoading && (
            <span className="text-[10px] text-white/40">Updating...</span>
          )}
        </div>

        {!hasRunningRobots ? (
          <div className="text-center py-8 text-white/40 text-sm border border-dashed border-white/10 rounded-2xl">
            Start a robot to see live activity logs here
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm border border-dashed border-white/10 rounded-2xl">
            Waiting for activity from running robots...
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#0f0f10] divide-y divide-white/10 text-sm max-h-[420px] overflow-auto">
            {logs.map((log, index) => (
              <div key={index} className="px-4 py-3 flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">
                  {log.trade_result === "win" ? (
                    <span className="text-emerald-400">✅</span>
                  ) : log.trade_result === "loss" ? (
                    <span className="text-rose-400">❌</span>
                  ) : (
                    <span className="text-sky-400">•</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white/90 leading-snug">{log.message}</div>
                  <div className="text-[10px] text-white/40 mt-0.5 tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString([], { 
                      hour: "2-digit", 
                      minute: "2-digit", 
                      second: "2-digit" 
                    })}
                  </div>
                </div>
                {log.profit_loss !== null && log.profit_loss !== undefined && (
                  <div className={`text-right tabular-nums font-medium flex-shrink-0 ${
                    log.profit_loss >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {log.profit_loss >= 0 ? "+" : ""}${Number(log.profit_loss).toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}