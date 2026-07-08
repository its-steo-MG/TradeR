"use client";

import { useEffect, useState } from "react";
import { Bot, Play, Pause, Activity } from "lucide-react";
import { toast } from "sonner";
import { mt5Store } from  "@/lib/mt5-store";

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
  const [runningRobotId, setRunningRobotId] = useState<number | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const fetchMyRobots = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/forex/my-robots/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const allRobots = data.user_robots || [];

        const eaRobots = allRobots.filter((ur: any) => 
          ur?.is_ea === true || ur?.robot?.is_ea === true
        );

        setMyRobots(eaRobots);
      }
    } catch (e) {
      console.error("Failed to fetch robots", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!token || myRobots.length === 0) return;

    setLogsLoading(true);
    try {
      const allLogs: BotLog[] = [];
      for (const ur of myRobots) {
        const res = await fetch(
          `${API_BASE}/api/forex/robot-logs/user-robot/${ur.id}/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) allLogs.push(...data);
        }
      }
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(allLogs.slice(0, 30));
    } catch (e) {
      console.error("Failed to fetch logs", e);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    // Restore the persisted EA state so navigating back to this screen
    // still shows the robot as RUNNING. The robot is only marked stopped
    // when the USER explicitly clicks Stop.
    const resumed = mt5Store.resumeEA();
    if (resumed) {
      const eaState = mt5Store.getEAState();
      if (eaState.robotId != null) setRunningRobotId(eaState.robotId);
    }

    fetchMyRobots();
    const interval = setInterval(fetchMyRobots, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchLogs();
    const logInterval = setInterval(fetchLogs, 4000);
    return () => clearInterval(logInterval);
  }, [myRobots]);

  // ====================== EA TOGGLE ======================
  const toggleRobot = async (userRobot: UserRobot) => {
    if (!userRobot.is_ea) {
      toast.error("This is not an EA robot");
      return;
    }

    // Local persisted state is the source of truth — the backend
    // is_running flag is never synced and was making the UI show the
    // wrong status after navigation.
    const eaState = mt5Store.getEAState();
    const isCurrentlyRunning =
      runningRobotId === userRobot.id ||
      (eaState.running && eaState.robotId === userRobot.id);

    try {
      if (isCurrentlyRunning) {
        // STOP EA — terminate the robot AND close ALL its open positions
        // at once (positions are closed on the backend too, then the EA
        // engine is stopped).
        toast.info(`Stopping ${userRobot.robot.name} — closing all positions...`);
        await mt5Store.stopEAAndClosePositions();
        setRunningRobotId(null);
        toast.success(`${userRobot.robot.name} stopped — all positions closed`);
      } else {
        // START EA
        const maxPos = userRobot.robot.max_open_positions || 5;

        mt5Store.startEA(maxPos, userRobot.id);
        setRunningRobotId(userRobot.id);
        toast.success(`${userRobot.robot.name} started with ${maxPos} max positions`);
      }

      // Optional: sync state with backend
      // await updateRobotStatusOnBackend(userRobot.id, !isCurrentlyRunning);
    } catch (err) {
      toast.error("Failed to toggle robot");
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-white/60">Loading robots...</div>;
  }

  return (
    <div className="pb-24">
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold">Trading Robots</h1>
        <p className="text-sm text-white/50">EA Robots • Powered by MT5 Simulator</p>
      </header>

      <div className="px-4 mt-2">
        <h2 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
          <Bot className="h-4 w-4" /> My EA Robots
        </h2>

        {myRobots.length === 0 ? (
          <div className="text-center py-10 text-white/40 text-sm border border-dashed border-white/10 rounded-2xl">
            You don&apos;t have any EA robots yet.
          </div>
        ) : (
          <div className="space-y-3">
            {myRobots.map((ur) => {
              // Only the local (persisted) state decides the button — the
              // robot stays "running" until the user explicitly stops it.
              const isRunning = runningRobotId === ur.id;

              return (
                <div key={ur.id} className="rounded-2xl border border-white/10 bg-[#0f0f10] p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white flex items-center gap-2">
                        {ur.robot.name}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                          EA
                        </span>
                      </div>
                      <div className="text-xs text-white/50 mt-0.5 line-clamp-2">
                        {ur.robot.description}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleRobot(ur)}
                      className={`ml-3 h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all ${
                        isRunning 
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                          : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      }`}
                    >
                      {isRunning ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-white/60">
                    <span>Max positions: <span className="text-white/80">{ur.robot.max_open_positions}</span></span>
                    <span>Multiplier: <span className="text-white/80">{ur.robot.profit_multiplier}x</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Logs Section */}
      <div className="px-4 mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Activity Logs
          </h2>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm border border-dashed border-white/10 rounded-2xl">
            No activity yet. Start an EA robot to see logs.
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#0f0f10] divide-y divide-white/10 text-sm max-h-[420px] overflow-auto">
            {logs.map((log, index) => (
              <div key={index} className="px-4 py-3 flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">
                  {log.trade_result === "win" ? "✅" : log.trade_result === "loss" ? "❌" : "•"}
                </div>
                <div className="flex-1">
                  <div className="text-white/90">{log.message}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: "2-digit", minute: "2-digit", second: "2-digit"
                    })}
                  </div>
                </div>
                {log.profit_loss !== undefined && (
                  <div className={`font-medium ${log.profit_loss >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
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