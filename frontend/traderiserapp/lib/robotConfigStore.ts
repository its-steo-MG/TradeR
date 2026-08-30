"use client";

/** Persistent robot draft so re-opening the config panel never starts afresh. */

export type RobotDraft = {
  robotId: number | null;
  robotName: string;
  marketId: number | null;
  contractKind: string;
  barrier: string;
  initialStake: string;
  multiplier: string;
  targetProfit: string;
  stopLoss: string;
  maxRuns: string;
  configured: boolean;
};

const KEY = "sdigit.robot.draft.v1";

const DEFAULTS: RobotDraft = {
  robotId: null,
  robotName: "",
  marketId: null,
  contractKind: "matches",
  barrier: "",
  initialStake: "1",
  multiplier: "2",
  targetProfit: "10",
  stopLoss: "10",
  maxRuns: "10",
  configured: false,
};

export function getRobotDraft(): RobotDraft {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<RobotDraft>) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveRobotDraft(patch: Partial<RobotDraft>) {
  if (typeof window === "undefined") return;
  const next = { ...getRobotDraft(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function markConfigured() {
  saveRobotDraft({ configured: true });
}

export function isConfigured() {
  return getRobotDraft().configured;
}

export function clearRobotDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
