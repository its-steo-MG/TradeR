"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import type { Account } from "@/types/account";
import { api } from "@/lib/api";
import { Zap, ShoppingCart, Play, Pause, RefreshCw, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface ForexRobot {
  id: number;
  name: string;
  image?: string;
  description: string;
  price: number;
  discounted_price?: number;
  effective_price: number;
  win_rate_sashi: number;
  win_rate_normal: number;
  is_ea: boolean;
  max_open_positions: number;
}

interface UserRobot {
  id: number;
  robot: ForexRobot;
  is_running: boolean;
  purchased_at: string;
  last_trade_time?: string;
  max_open_positions: number;
}

export default function EARobotsPage() {
  const [robots, setRobots] = useState<ForexRobot[]>([]);
  const [myRobots, setMyRobots] = useState<UserRobot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginType, setLoginType] = useState<"real" | "demo">("real");
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [isMT5, setIsMT5] = useState(false);

  const loadData = useCallback(async () => {
    const storedLoginType = (localStorage.getItem("login_type") as "real" | "demo") ?? "real";
    setLoginType(storedLoginType);

    const userSessionStr = localStorage.getItem("user_session");
    const accountType = localStorage.getItem("account_type");

    if (userSessionStr) {
      try {
        const session = JSON.parse(userSessionStr);
        // Prioritize active account from localStorage
        const activeId = localStorage.getItem("active_account_id");
        
        const currentAcc = session.accounts?.find((a: Account) => 
          String(a.id) === activeId
        ) || session.accounts?.find((a: Account) => 
          a.platform === 'mt5' || a.account_type === accountType
        ) || session.accounts?.[0];

        setActiveAccount(currentAcc);
        
        const mt5Status = currentAcc?.platform === 'mt5' || 
                         currentAcc?.account_type?.toLowerCase().includes('mt5');
        setIsMT5(mt5Status);
      } catch (e) {
        console.error("Failed to parse session:", e);
      }
    }

    await fetchRobots();
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fetchRobots = async () => {
    try {
      const [availRes, myRes] = await Promise.all([
        api.getForexRobots(),
        api.getMyForexRobots()
      ]);

      // Available EA robots only
      const availableEAs = (availRes.data?.robots || [])
        .filter((r: any) => r.is_ea === true)
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          image: r.image_url ?? r.image,
          description: r.description || "Professional MT5 Expert Advisor with advanced risk management.",
          price: Number(r.price),
          discounted_price: r.discounted_price ? Number(r.discounted_price) : undefined,
          effective_price: Number(r.effective_price || r.price),
          win_rate_sashi: Number(r.win_rate_sashi || 90),
          win_rate_normal: Number(r.win_rate_normal || 10),
          is_ea: true,
          max_open_positions: r.max_open_positions || 5,
        }));

      // User's purchased EA robots
      const myEAs = (myRes.data?.user_robots || [])
        .filter((ur: any) => ur.is_ea || ur.robot?.is_ea)
        .map((ur: any) => ({
          id: ur.id,
          robot: {
            ...ur.robot,
            image: ur.robot.image_url ?? ur.robot.image,
          },
          is_running: ur.is_running,
          purchased_at: ur.purchased_at,
          last_trade_time: ur.last_trade_time,
          max_open_positions: ur.max_open_positions || 5,
        }));

      setRobots(availableEAs);
      setMyRobots(myEAs);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load EA Robots. Please try again.");
    }
  };

  const handlePurchase = async (robotId: number) => {
    if (!isMT5) {
      toast.error("Please switch to an MT5 account to purchase EA Robots");
      return;
    }

    try {
      const res = await api.purchaseForexRobot(robotId);
      if (res.error) return toast.error(res.error);

      toast.success("EA Robot purchased successfully!");
      await fetchRobots();
    } catch (err) {
      toast.error("Purchase failed");
    }
  };

  const handleToggle = async (userRobotId: number) => {
    if (!isMT5) {
      toast.error("EA Robots can only run on MT5 accounts");
      return;
    }

    try {
      const res = await api.toggleForexRobot(userRobotId);
      if (res.error) return toast.error(res.error);

      const nowRunning = res.data?.is_running;

      if (!nowRunning) {
        await api.closeEAPositions(userRobotId);
        toast.success("EA stopped and all positions closed");
      } else {
        toast.success("🚀 EA Robot Activated Successfully");
      }

      await fetchRobots();
    } catch (err) {
      toast.error("Failed to toggle robot");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white">
      <Sidebar loginType={loginType} activeAccount={activeAccount} />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl">
                <Zap className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">EA Robots</h1>
                <p className="text-white/60">Professional MT5 Expert Advisors</p>
              </div>
            </div>
            <button 
              onClick={fetchRobots} 
              className="p-3 hover:bg-white/10 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
          </div>

          {!isMT5 && (
            <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500 rounded-2xl flex gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-400">MT5 Account Required</p>
                <p className="text-sm text-white/70">
                  Switch to your MT5 account to purchase and run EA Robots.
                </p>
              </div>
            </div>
          )}

          {/* Available Robots */}
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> Available EA Robots
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {robots.length > 0 ? (
              robots.map((robot) => {
                const hasDiscount = robot.discounted_price && robot.discounted_price < robot.price;
                return (
                  <div 
                    key={robot.id} 
                    className="bg-gradient-to-br from-slate-900 to-slate-800 border border-emerald-500/30 rounded-3xl overflow-hidden group"
                  >
                    {robot.image && (
                      <img 
                        src={robot.image} 
                        alt={robot.name} 
                        className="w-full h-52 object-cover" 
                      />
                    )}
                    
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-2xl font-bold">{robot.name}</h3>
                        <span className="bg-emerald-500 text-black px-3 py-1 text-xs font-bold rounded-full">EA</span>
                      </div>

                      <p className="text-white/70 text-sm mb-6 line-clamp-3">{robot.description}</p>

                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Max Positions</span>
                          <span className="font-mono">{robot.max_open_positions}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Sashi Win Rate</span>
                          <span className="text-green-400 font-bold">{robot.win_rate_sashi}%</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePurchase(robot.id)}
                        disabled={!isMT5}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Purchase — ${robot.effective_price}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="col-span-full text-center py-12 text-white/60">
                No EA Robots available at the moment.
              </p>
            )}
          </div>

          {/* My Robots */}
          <h2 className="text-2xl font-semibold mb-6">My EA Robots</h2>
          {myRobots.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myRobots.map((ur) => (
                <div key={ur.id} className="bg-slate-900 border border-white/10 rounded-3xl p-6">
                  <div className="flex justify-between mb-6">
                    <h3 className="text-xl font-bold">{ur.robot.name}</h3>
                    <span className={`px-4 py-1 rounded-full text-xs font-bold ${ur.is_running ? "bg-green-500 text-black" : "bg-red-500/20 text-red-400"}`}>
                      {ur.is_running ? "RUNNING" : "STOPPED"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggle(ur.id)}
                    className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      ur.is_running 
                        ? "bg-red-500/20 hover:bg-red-500/30 text-red-400" 
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {ur.is_running ? (
                      <><Pause className="w-5 h-5"/> Stop EA</>
                    ) : (
                      <><Play className="w-5 h-5"/> Start EA</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/60">
              You haven't purchased any EA Robots yet.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}