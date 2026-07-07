"use client";

import { useEffect, useState } from "react";
import QuotesList from "@/components/mt5/QuotesList";
import MT5ConnectScreen from "@/components/mt5/MT5ConnectScreen";

export default function MT5EntryPage() {
  const [hasMT5Account, setHasMT5Account] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccount = () => {
      const mt5Account = localStorage.getItem("mt5_account");
      const token = localStorage.getItem("access_token");

      if (mt5Account && token) {
        setHasMT5Account(true);
      } else {
        setHasMT5Account(false);
      }
    };

    checkAccount();
  }, []);

  if (hasMT5Account === null) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  // If user already has an MT5 account → show Quotes directly
  if (hasMT5Account) {
    return <QuotesList />;
  }

  // No MT5 account yet → show connect flow
  return <MT5ConnectScreen />;
}