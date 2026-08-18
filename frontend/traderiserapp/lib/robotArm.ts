"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny store that holds a robot configuration that has been "armed"
 * (configured + minimised) but not started yet.
 *
 * Flow:
 *  1. User fills the Robot Config panel and clicks "Minimise".
 *  2. Config is armed -> RobotDock appears with a green RUN button.
 *  3. User waits for their entry on the chart, taps RUN -> robot starts.
 */

export type ArmedConfig = {
  market: string;
  contractKind: string;
  barrier?: number;
  initialStake: number;
  multiplier: number;
  targetProfit: number;
  stopLoss: number;
  maxRuns: number;
  marketId: number;
  robotId: number;
  robotName?: string;
  marketLabel?: string;
};

type State = {
  armed: ArmedConfig | null;
  /** true when the config panel is collapsed into the dock */
  minimized: boolean;
};

let state: State = { armed: null, minimized: false };
const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}

export function armRobot(config: ArmedConfig) {
  state.armed = config;
  state.minimized = true;
  emit();
}

export function disarmRobot() {
  state.armed = null;
  state.minimized = false;
  emit();
}

/** Bring the config panel back (expand from dock) keeping the armed config. */
export function restoreConfigPanel() {
  state.minimized = false;
  emit();
}

export function minimizeConfigPanel() {
  state.minimized = true;
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const serverSnapshot: State = { armed: null, minimized: false };

export function useRobotArm(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverSnapshot,
  );
}

/* ---------------------------------------------------------------
 * Run-panel visibility (expanded robot console).
 * The AI Scanner FAB subscribes to this so it can hide itself while
 * the robot run panel is open.
 * ------------------------------------------------------------- */
let runPanelOpen = false;
const runListeners = new Set<() => void>();

export function setRunPanelOpen(open: boolean) {
  if (runPanelOpen === open) return;
  runPanelOpen = open;
  runListeners.forEach((l) => l());
}

export function useRunPanelOpen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      runListeners.add(cb);
      return () => runListeners.delete(cb);
    },
    () => runPanelOpen,
    () => false,
  );
}
