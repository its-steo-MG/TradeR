// lib/balance-utils.ts
"use client";

export function updateBalanceAfterTrade(
  netProfit: number,
  isDemo: boolean = false
) {
  const raw = localStorage.getItem("user_session");
  if (!raw) return;

  try {
    const session = JSON.parse(raw) as {
      accounts?: Array<{
        account_type: string;
        balance: number | string;
        [key: string]: unknown;
      }>;
    };

    const accountType = localStorage.getItem("account_type") || "standard";

    // Update the correct account's balance
    if (session.accounts && Array.isArray(session.accounts)) {
      session.accounts = session.accounts.map((acc) => {
        if (acc.account_type === accountType) {
          const current = Number(acc.balance) || 0;
          return {
            ...acc,
            balance: current + netProfit,
          };
        }
        return acc;
      });
    }

    localStorage.setItem("user_session", JSON.stringify(session));

    // This triggers TradingLayout, TopNavbar, Dashboard, etc.
    window.dispatchEvent(new Event("session-updated"));

    console.log(`✅ Balance synced after trade: +${netProfit.toFixed(2)}`);
  } catch (e: unknown) {
    console.error("Failed to sync balance after trade:", e);
  }
}