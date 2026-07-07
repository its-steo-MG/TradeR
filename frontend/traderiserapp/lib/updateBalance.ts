// lib/updateBalance.ts
export const updateRealBalance = (profit: number): number => {
  const raw = localStorage.getItem("user_session");
  if (!raw) return 0;

  try {
    const userData = JSON.parse(raw) as {
      accounts?: Array<{
        id: number | string;
        account_type: string;
        balance: number | string;
        [key: string]: unknown;
      }>;
    };

    const activeId = localStorage.getItem("active_account_id");
    const accountType = localStorage.getItem("account_type") || "standard";

    // Update the correct account
    const updatedAccounts = userData.accounts?.map((acc) => {
      const accId = String(acc.id);
      const accType = acc.account_type;

      if (accId === String(activeId) || accType === accountType) {
        const oldBal = Number(acc.balance) || 0;
        return { 
          ...acc, 
          balance: oldBal + profit 
        };
      }
      return acc;
    }) ?? [];

    // Save back to localStorage
    const updatedUserData = {
      ...userData,
      accounts: updatedAccounts,
    };

    localStorage.setItem("user_session", JSON.stringify(updatedUserData));
    window.dispatchEvent(new Event("session-updated"));

    // Return the new balance of the active account
    const activeAccount = updatedAccounts.find((a) =>
      String(a.id) === String(activeId) || a.account_type === accountType
    );

    return Number(activeAccount?.balance) || 0;
  } catch (e: unknown) {
    console.error("Failed to update balance", e);
    return 0;
  }
};