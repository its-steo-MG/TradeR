"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import BulkScannerModal from "./BulkScannerModal";

type Market = {
  id: number;
  name: string;
  display_name?: string;
  market_type?: { name: string };
};

type UserRobotRaw = {
  robot?: { is_bulk_robot?: boolean };
};

type Props = {
  markets: Market[];
  onBatchStarted?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export default function BulkScannerTab({
  markets,
  onBatchStarted,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  const [hasBulk, setHasBulk] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getUserRobots();
        const raw = (res?.data ?? res) as unknown;
        const arr = Array.isArray(raw)
          ? (raw as UserRobotRaw[])
          : Array.isArray((raw as { user_robots?: UserRobotRaw[] })?.user_robots)
            ? (raw as { user_robots: UserRobotRaw[] }).user_robots
            : [];
        const owns = arr.some((ur) => ur?.robot?.is_bulk_robot === true);
        if (!cancelled) setHasBulk(owns);
      } catch {
        if (!cancelled) setHasBulk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hasBulk) return null;

  if (hideTrigger) {
    return (
      <BulkScannerModal
        open={open}
        onClose={() => setOpen(false)}
        markets={markets}
        onBatchStarted={onBatchStarted}
      />
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Bulk Scanner
      </button>
      <BulkScannerModal
        open={open}
        onClose={() => setOpen(false)}
        markets={markets}
        onBatchStarted={onBatchStarted}
      />
    </>
  );
}
