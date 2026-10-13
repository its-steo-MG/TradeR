// components/trading/trading-mode-selector.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserRobot {
  id: number;
  robot: {
    id: number;
    name: string;
    available_for_demo?: boolean;
    is_elite_robot?: boolean;
    is_s_digit_robot?: boolean;
    is_bulk_robot?: boolean;
  };
  purchased_at: string | null;
  is_used?: boolean;
  is_setting?: boolean;
}

interface TradingModeSelectorProps {
  onModeChange: (mode: "manual" | "robot") => void;
  selectedRobot: number | null;
  onRobotSelect: (robotId: number | null) => void;
  userRobots: UserRobot[];
}

export function TradingModeSelector({
  onModeChange,
  selectedRobot,
  onRobotSelect,
  userRobots,
}: TradingModeSelectorProps) {
  const [mode, setMode] = useState<"manual" | "robot">("manual");
  const [loginType, setLoginType] = useState<"real" | "demo">("real");

  useEffect(() => {
    const stored = localStorage.getItem("login_type");
    setLoginType((stored === "demo" ? "demo" : "real") as "real" | "demo");
  }, []);

  const visibleRobots = userRobots.filter((ur) => {
    if (ur.robot.is_s_digit_robot || ur.robot.is_bulk_robot) {
      return false;
    }
    if (loginType === "real") {
      return ur.purchased_at !== null;
    }
    return true;
  });

  const handleModeChange = (value: "manual" | "robot") => {
    setMode(value);
    onModeChange(value);
    if (value === "manual") {
      onRobotSelect(null);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div>
        <label className="text-xs text-slate-500 dark:text-zinc-400 mb-1 block">
          Trading Mode
        </label>
        <Select value={mode} onValueChange={handleModeChange}>
          <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="robot">Robot</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "robot" && (
        <div>
          <label className="text-xs text-slate-500 dark:text-zinc-400 mb-1 block">
            Select Robot
          </label>
          {visibleRobots.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              {loginType === "demo"
                ? "No demo robots available"
                : "You haven't purchased any normal/Elite robots yet"}
            </p>
          ) : (
            <Select
              value={selectedRobot?.toString() ?? ""}
              onValueChange={(v) => onRobotSelect(v ? Number(v) : null)}
            >
              <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white">
                <SelectValue placeholder="Select a robot" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
                {visibleRobots.map((ur) => (
                  <SelectItem key={ur.robot.id} value={ur.robot.id.toString()}>
                    {ur.robot.name}
                    {ur.robot.is_elite_robot && (
                      <span className="ml-2 text-xs text-amber-500 dark:text-amber-400">
                        (Elite)
                      </span>
                    )}
                    {ur.purchased_at === null && loginType === "demo" && (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                        (Demo)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}