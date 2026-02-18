// components/theme-provider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps as NextThemesProviderProps } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: NextThemesProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}