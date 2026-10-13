"use client";

import { useEffect, useState } from "react";

export type GlassMode = "clear" | "frosted" | "solid";

const KEY = "glass_mode";
const DEFAULT: GlassMode = "clear";

export function useGlassMode() {
  const [mode, setMode] = useState<GlassMode>(DEFAULT);

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as GlassMode | null;
    const next = saved === "clear" || saved === "frosted" || saved === "solid" ? saved : DEFAULT;
    setMode(next);
    document.documentElement.setAttribute("data-glass", next);
  }, []);

  const change = (next: GlassMode) => {
    setMode(next);
    localStorage.setItem(KEY, next);
    document.documentElement.setAttribute("data-glass", next);
  };

  return { mode, setMode: change };
}
