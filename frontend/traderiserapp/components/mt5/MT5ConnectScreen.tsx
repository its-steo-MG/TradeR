"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = RAW_API_BASE.replace(/\/$/, "").replace(/\/api$/, "");

interface MT5Account {
  id: number;
  platform: string;
  account_type: string;        // Now can be "mt5-demo"
  balance: number;
  mt5_login?: string;
  mt5_server?: string;
}

export default function MT5ConnectScreen() {
  const router = useRouter();
  const [step, setStep] = useState<"login" | "select">("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [existingAccounts, setExistingAccounts] = useState<MT5Account[]>([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ====================== LOGIN ======================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/accounts/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, account_type: "standard" }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Invalid email or password");
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access);
      if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

      await fetchMT5Accounts();
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchMT5Accounts = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/mt5/my-accounts/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.mt5_accounts && data.mt5_accounts.length > 0) {
          setExistingAccounts(data.mt5_accounts);
          setStep("select");
          return;
        }
      }
    } catch (e) {
      console.error("Failed to fetch MT5 accounts");
    }
    toast.error("Could not load MT5 accounts. Please try again.");
  };

  // ====================== SELECT ACCOUNT ======================
  const selectAccount = (account: MT5Account) => {
    const isDemo = account.account_type === "mt5-demo" || account.account_type === "demo";
    const isReal = account.account_type === "mt5";

    const stored = {
      ...account,
      type: isDemo ? "demo" : "real",
      login: account.mt5_login || (isReal ? "Real Account" : "Demo Account"),
    };

    localStorage.setItem("mt5_account", JSON.stringify(stored));
    toast.success(`Logged into MT5 ${isReal ? "Real" : "Demo"}`);
    router.push("/mt5/chart");
  };

  // Find accounts with new logic
  const realAccount = existingAccounts.find(
    (a) => a.platform === "mt5" && a.account_type === "mt5"
  );

  const demoAccount = existingAccounts.find(
    (a) => a.platform === "mt5" && (a.account_type === "mt5-demo" || a.account_type === "demo")
  );

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* MT5 Logo */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="relative w-[200px] h-[200px]">
            <Image
              src="/mt5.png"
              alt="MT5 Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* LOGIN FORM */}
        {step === "login" && (
          <div className="bg-[#1e2937] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-1 text-white">
              Connect to MT5
            </h1>
            <p className="text-center text-white/60 mb-6 text-sm">
              Login with your Traderiser account
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-sm text-white/70 block mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-white/70 block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-12 text-white"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-70 text-white font-semibold py-3.5 rounded-2xl mt-2"
              >
                {loading ? "Logging in..." : "Login to MT5"}
              </button>
            </form>

            <p className="text-center text-sm text-white/60 mt-6">
              Dont have a Traderiser account?{" "}
              <a href="/signup" className="text-sky-400 hover:underline">
                Sign up
              </a>
            </p>
          </div>
        )}

        {/* REAL / DEMO SELECTION */}
        {step === "select" && (realAccount || demoAccount) && (
          <div className="bg-[#1e2937] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-center mb-6 text-white">
              Choose Your MT5 Account
            </h2>

            <div className="space-y-4">
              {/* MT5 Real Account */}
              {realAccount && (
                <button
                  onClick={() => selectAccount(realAccount)}
                  className="w-full group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 rounded-2xl p-5 text-left transition-all active:scale-[0.985]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center overflow-hidden">
                        <Image
                          src="/real-account-icon.png"
                          alt="Real Account"
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-lg text-white">
                          MT5 Real Account
                        </div>
                        <div className="text-sm text-white/60">
                          Trade with real funds
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/50">Balance</div>
                      <div className="text-xl font-bold text-emerald-400 tabular-nums">
                        ${Number(realAccount.balance).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </button>
              )}

              {/* MT5 Demo Account */}
              {demoAccount && (
                <button
                  onClick={() => selectAccount(demoAccount)}
                  className="w-full group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 rounded-2xl p-5 text-left transition-all active:scale-[0.985]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center overflow-hidden">
                        <Image
                          src="/demo-account-icon.png"
                          alt="Demo Account"
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-lg text-white">
                          MT5 Demo Account
                        </div>
                        <div className="text-sm text-white/60">
                          Practice with virtual funds
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/50">Balance</div>
                      <div className="text-xl font-bold text-amber-400 tabular-nums">
                        ${Number(demoAccount.balance).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </button>
              )}
            </div>

            <p className="text-center text-xs text-white/50 mt-6">
              Select the account you want to start trading with
            </p>
          </div>
        )}
      </div>
    </div>
  );
}