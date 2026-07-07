import type { ReactNode } from "react";
import MT5Shell from "@/components/mt5/MT5Shell";
import { Toaster } from "sonner";

export default function MT5Layout({ children }: { children: ReactNode }) {
  return (
    <MT5Shell>
      {children}
      <Toaster theme="dark" position="top-center" />
    </MT5Shell>
  );
}
