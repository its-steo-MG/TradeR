"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { start, useRobotRunner } from "@/lib/robotRunner";
import { api } from "@/lib/api";
import { armRobot, disarmRobot, useRobotArm } from "@/lib/robotArm";
import { Play, Minimize2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  clearRobotDraft,
  getRobotDraft,
  markConfigured,
  saveRobotDraft,
} from "@/lib/robotConfigStore";

import type { DigitContractKind } from "@/lib/types/positions";

type Robot = {
  id: number;
  name: string;
  is_s_digit_robot: boolean;
  default_digit_contract_type?: string;
};

type Market = {
  id: number;
  name: string;
  display_name?: string;
  market_type?: { name: string };
};

type RobotConfigFormProps = {
  selectedMarketId?: number | null;
  onRun?: () => void;
};

export function RobotConfigForm({
  selectedMarketId: propSelectedMarketId,
  onRun,
}: RobotConfigFormProps) {
  const { isRunning } = useRobotRunner();
  const { minimized } = useRobotArm();

  // ---- Hydrate from the saved draft so re-opening never starts afresh ----
  const draft = useRef(getRobotDraft()).current;

  const [robots, setRobots] = useState<Robot[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(
    draft.robotId
      ? { id: draft.robotId, name: draft.robotName || "S-Digit Robot", is_s_digit_robot: true }
      : null,
  );
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(
    draft.marketId ?? propSelectedMarketId ?? null,
  );

  const [contractKind, setContractKind] = useState<DigitContractKind>(
    draft.contractKind as DigitContractKind,
  );
  const [barrier, setBarrier] = useState<string>(draft.barrier);
  const [initialStake, setInitialStake] = useState<string>(draft.initialStake);
  const [multiplier, setMultiplier] = useState<string>(draft.multiplier);
  const [targetProfit, setTargetProfit] = useState<string>(draft.targetProfit);
  const [stopLoss, setStopLoss] = useState<string>(draft.stopLoss);
  const [maxRuns, setMaxRuns] = useState<string>(draft.maxRuns);

  // ---- Persist every change immediately ----
  useEffect(() => {
    saveRobotDraft({
      robotId: selectedRobot?.id ?? null,
      robotName: selectedRobot?.name ?? null,
      marketId: selectedMarketId,
      contractKind,
      barrier,
      initialStake,
      multiplier,
      targetProfit,
      stopLoss,
      maxRuns,
    });
  }, [
    selectedRobot,
    selectedMarketId,
    contractKind,
    barrier,
    initialStake,
    multiplier,
    targetProfit,
    stopLoss,
    maxRuns,
  ]);

  // ==================== Load only OWNED S-Digit Robots ====================
  useEffect(() => {
    const fetchRobots = async () => {
      try {
        const res = await api.getUserRobots();
        const raw = (res?.data ?? res) as any;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.user_robots)
            ? raw.user_robots
            : [];

        const sDigitRobots: Robot[] = list
          .map((ur: any) => ur.robot)
          .filter((r: any) => r && r.is_s_digit_robot === true)
          .map((r: any): Robot => ({
            id: Number(r.id),
            name: String(r.name || ""),
            is_s_digit_robot: true,
            default_digit_contract_type:
              typeof r.default_digit_contract_type === "string"
                ? r.default_digit_contract_type
                : undefined,
          }));

        const unique = sDigitRobots.filter(
          (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i,
        );

        setRobots(unique);

        // Re-attach the full robot object saved in the draft.
        setSelectedRobot((prev) =>
          prev ? unique.find((r) => r.id === prev.id) ?? prev : prev,
        );
      } catch (error) {
        console.error("Failed to fetch owned S-Digit robots:", error);
        setRobots([]);
      }
    };

    fetchRobots();
  }, []);

  // ==================== Load Volatility Markets ====================
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const token = localStorage.getItem("access_token");
        let marketList: Market[] = [];

        if (!token) {
          marketList = [
            { id: 1, name: "volatility-10-1s", display_name: "Volatility 10 (1s) Index" },
            { id: 2, name: "volatility-25-1s", display_name: "Volatility 25 (1s) Index" },
            { id: 3, name: "volatility-50-1s", display_name: "Volatility 50 (1s) Index" },
            { id: 4, name: "volatility-100-1s", display_name: "Volatility 100 (1s) Index" },
          ];
        } else {
          const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
          const response = await fetch(`${baseURL}/trading/markets/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error("Failed to fetch markets");

          const data: unknown = await response.json();

          if (Array.isArray(data)) {
            const volatilityMarkets: Market[] = (data as Record<string, unknown>[])
              .filter((m) => {
                const market = m as Record<string, unknown>;
                const marketType =
                  (market.market_type as Record<string, unknown>)?.name || market.name;
                return String(marketType || "").toLowerCase().includes("volatility");
              })
              .map((m): Market => {
                const market = m as Record<string, unknown>;
                const name = String(market.name || "");
                return {
                  id: Number(market.id) || 0,
                  name,
                  display_name:
                    typeof market.display_name === "string"
                      ? market.display_name
                      : name
                          .replace(/-/g, " ")
                          .replace(/\bvolatility\b/i, "Volatility")
                          .replace(/\b(\d+)\s*1s\b/i, "$1 (1s)")
                          .replace(/\bindex\b/i, "")
                          .trim() + " Index",
                  market_type: market.market_type as { name: string } | undefined,
                };
              });

            marketList =
              volatilityMarkets.length > 0
                ? volatilityMarkets
                : (data as Record<string, unknown>[]).map((m): Market => {
                    const market = m as Record<string, unknown>;
                    return {
                      id: Number(market.id) || 0,
                      name: String(market.name || ""),
                      display_name:
                        typeof market.display_name === "string"
                          ? market.display_name
                          : undefined,
                      market_type: market.market_type as { name: string } | undefined,
                    };
                  });
          }
        }

        setMarkets(marketList);

        // Only auto-pick when nothing was previously chosen.
        setSelectedMarketId((prev) =>
          prev && marketList.some((m) => m.id === prev)
            ? prev
            : (marketList[0]?.id ?? prev ?? null),
        );
      } catch (err) {
        console.error("Failed to fetch markets:", err);
        const fallback: Market[] = [
          { id: 1, name: "volatility-10-1s", display_name: "Volatility 10 (1s) Index" },
          { id: 4, name: "volatility-100-1s", display_name: "Volatility 100 (1s) Index" },
        ];
        setMarkets(fallback);
        setSelectedMarketId((prev) => prev ?? fallback[0].id);
      }
    };

    fetchMarkets();
    // Fetch once — re-fetching on selection change wiped the user's choice.
  }, []);

  const handleRobotSelect = (robotId: string) => {
    const robot = robots.find((r) => r.id === Number(robotId));
    if (!robot) return;
    setSelectedRobot(robot);
    // Only apply the robot default the FIRST time it is picked, so it never
    // overwrites a contract type the user has already tuned.
    if (robot.default_digit_contract_type && !getRobotDraft().configured) {
      setContractKind(robot.default_digit_contract_type as DigitContractKind);
    }
  };

  const buildConfig = () => {
    if (!selectedMarketId) {
      toast.error("Please select a volatility market");
      return null;
    }
    if (!selectedRobot) {
      toast.error("Please select an S-Digit robot");
      return null;
    }

    const selectedMarket = markets.find((m) => m.id === selectedMarketId);
    const isDigitWithBarrier = ["over", "under", "matches", "differs"].includes(
      contractKind,
    );

    return {
      market: selectedMarket?.name || selectedMarket?.display_name || "Volatility Market",
      contractKind,
      barrier: isDigitWithBarrier ? Number(barrier) : undefined,
      initialStake: Number(initialStake),
      multiplier: Number(multiplier),
      targetProfit: Number(targetProfit),
      stopLoss: Number(stopLoss),
      maxRuns: Number(maxRuns),
      marketId: selectedMarketId,
      robotId: selectedRobot.id,
      robotName: selectedRobot.name,
      marketLabel: selectedMarket?.display_name || selectedMarket?.name,
    };
  };

  // Minimise: keep the settings ready in the dock, start later with RUN.
  const handleMinimize = () => {
    const cfg = buildConfig();
    if (!cfg) return;
    markConfigured();
    armRobot(cfg);
    toast.success("Robot armed", {
      description: "Tap RUN on the dock when you see your entry.",
    });
  };

  const handleRun = () => {
    const cfg = buildConfig();
    if (!cfg) return;

    markConfigured();
    disarmRobot();
    start({
      market: cfg.market,
      contractKind: cfg.contractKind,
      barrier: cfg.barrier,
      initialStake: cfg.initialStake,
      multiplier: cfg.multiplier,
      targetProfit: cfg.targetProfit,
      stopLoss: cfg.stopLoss,
      maxRuns: cfg.maxRuns,
      marketId: cfg.marketId,
      robotId: cfg.robotId,
    });

    onRun?.();
    toast.success("Robot started successfully!", {
      description: `Trading on ${cfg.marketLabel}`,
    });
  };

  const handleResetSetup = () => {
    clearRobotDraft();
    const d = getRobotDraft();
    setSelectedRobot(null);
    setContractKind(d.contractKind as DigitContractKind);
    setBarrier(d.barrier);
    setInitialStake(d.initialStake);
    setMultiplier(d.multiplier);
    setTargetProfit(d.targetProfit);
    setStopLoss(d.stopLoss);
    setMaxRuns(d.maxRuns);
    toast.message("Setup cleared");
  };

  // Hidden while running, or while collapsed into the RobotDock.
  if (isRunning || minimized) return null;

  return (
    <div className="glass-card p-6 space-y-6 rounded-3xl overflow-visible">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleResetSetup}
          title="Start a fresh setup"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-400 transition-colors hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <h2 className="text-2xl font-bold text-center">S-Digit Robot</h2>
        <button
          type="button"
          onClick={handleMinimize}
          title="Minimise to dock"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-300 transition-colors hover:text-white disabled:opacity-40"
          disabled={!selectedRobot || !selectedMarketId}
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Select Robot — value is controlled so the saved robot stays selected */}
      <div className="relative z-50">
        <Label className="text-sm text-muted-foreground mb-2 block">
          Select S-Digit Robot
        </Label>
        <Select
          value={selectedRobot ? String(selectedRobot.id) : ""}
          onValueChange={handleRobotSelect}
          disabled={robots.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose your S-Digit Robot..." />
          </SelectTrigger>
          <SelectContent className="z-[10000]">
            {robots.map((robot) => (
              <SelectItem key={robot.id} value={String(robot.id)}>
                {robot.name} ⭐
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedRobot && (
        <>
          <div className="relative z-50">
            <Label className="text-sm text-muted-foreground mb-2 block">
              Volatility Market
            </Label>
            <Select
              value={selectedMarketId?.toString() || ""}
              onValueChange={(val) => setSelectedMarketId(Number(val))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Volatility Market" />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                {markets.map((market) => (
                  <SelectItem key={market.id} value={market.id.toString()}>
                    {market.display_name || market.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative z-50">
              <Label>Contract Type</Label>
              <Select
                value={contractKind}
                onValueChange={(value) => setContractKind(value as DigitContractKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  <SelectItem value="over">Over</SelectItem>
                  <SelectItem value="under">Under</SelectItem>
                  <SelectItem value="matches">Matches</SelectItem>
                  <SelectItem value="differs">Differs</SelectItem>
                  <SelectItem value="even">Even</SelectItem>
                  <SelectItem value="odd">Odd</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {["over", "under", "matches", "differs"].includes(contractKind) && (
              <div>
                <Label>Prediction Digit (0-9)</Label>
                <Input
                  type="number"
                  min={0}
                  max={9}
                  value={barrier}
                  onChange={(e) => setBarrier(e.target.value)}
                  onBlur={() => {
                    let num = parseInt(barrier);
                    if (isNaN(num) || num < 0) num = 0;
                    if (num > 9) num = 9;
                    setBarrier(num.toString());
                  }}
                />
              </div>
            )}

            <div>
              <Label>Initial Stake (USD) — Min 0.5</Label>
              <Input
                type="number"
                step="0.1"
                min="0.5"
                value={initialStake}
                onChange={(e) => setInitialStake(e.target.value)}
                onBlur={() => {
                  let num = parseFloat(initialStake);
                  if (isNaN(num) || num < 0.5) num = 0.5;
                  setInitialStake(num.toFixed(1));
                }}
              />
            </div>

            <div>
              <Label>Martingale Multiplier — Min 1</Label>
              <Input
                type="number"
                step="0.1"
                min="1"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
                onBlur={() => {
                  let num = parseFloat(multiplier);
                  if (isNaN(num) || num < 1) num = 1;
                  setMultiplier(num.toFixed(1));
                }}
              />
            </div>

            <div>
              <Label>Target Profit (USD)</Label>
              <Input
                type="number"
                min="0"
                value={targetProfit}
                onChange={(e) => setTargetProfit(e.target.value)}
                onBlur={() => {
                  let num = parseFloat(targetProfit);
                  if (isNaN(num) || num < 0) num = 0;
                  setTargetProfit(num.toFixed(0));
                }}
              />
            </div>

            <div>
              <Label>Stop Loss (USD)</Label>
              <Input
                type="number"
                min="0"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                onBlur={() => {
                  let num = parseFloat(stopLoss);
                  if (isNaN(num) || num < 0) num = 0;
                  setStopLoss(num.toFixed(0));
                }}
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Max Runs</Label>
              <Input
                type="number"
                min="1"
                value={maxRuns}
                onChange={(e) => setMaxRuns(e.target.value)}
                onBlur={() => {
                  let num = parseInt(maxRuns);
                  if (isNaN(num) || num < 1) num = 1;
                  setMaxRuns(num.toString());
                }}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button
              variant="outline"
              onClick={handleMinimize}
              className="py-6 text-base rounded-2xl"
            >
              <Minimize2 className="mr-2 h-5 w-5" /> Minimise
            </Button>
            <Button
              onClick={handleRun}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg rounded-2xl"
              disabled={!selectedMarketId || !selectedRobot}
            >
              <Play className="mr-2 h-5 w-5" /> START ROBOT
            </Button>
          </div>
        </>
      )}

      {robots.length === 0 ? (
        <p className="text-center text-amber-400 text-sm py-8">
          You don’t own any S-Digit Robot yet.
          <br />
          Please purchase one from the Marketplace first.
        </p>
      ) : !selectedRobot ? (
        <p className="text-center text-amber-400 text-sm py-8">
          Please select an S-Digit Robot to continue
        </p>
      ) : null}
    </div>
  );
}
