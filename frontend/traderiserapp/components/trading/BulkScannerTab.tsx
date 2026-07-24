"use client";

/* -------------------------------------------------------------------------- */
/*  BulkScannerTab.tsx                                                        */
/*  Small pill button rendered ALONGSIDE ModeTabs. Only visible when the user */
/*  owns at least one bulk robot. Opens BulkScannerModal, and after the scan  */
/*  hands off to the RobotRunner — parent can auto-open the RunPanel via      */
/*  the onBatchStarted callback.                                              */
/* -------------------------------------------------------------------------- */

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
  /** Called right after the AI finishes scanning and the batch is dispatched
   *  to the RobotRunner — parent should open the RunPanel here so users see
   *  every trade land live. */
  onBatchStarted?: () => void;
};

export default function BulkScannerTab({ markets, onBatchStarted }: Props) {
  const [hasBulk, setHasBulk] = useState(false);
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl
                   text-xs font-semibold text-white
                   bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
                   shadow-lg shadow-indigo-900/30
                   hover:brightness-110 active:scale-[0.98] transition-all"
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
