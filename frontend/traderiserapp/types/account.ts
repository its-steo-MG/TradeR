// src/types/account.ts
export interface Account {
  id?: number;
  account_type: string;
  platform?: string;           // "traderiser", "mt5", "deriv", etc.
  login: string;
  balance?: number;
  activeAccount: boolean;
  leverage?: number;
  mt5_login?: string;
  mt5_server?: string;
}

interface SidebarProps {
  loginType: string;
  activeAccount: Account | null;
  
}

export interface ManagementRequest {
  id: number
  management_id: string
  user: string
  stake: number
  target_profit: number
  payment_amount: number
  status: string
  status_display: string
  current_pnl: number
  days: number | null
  daily_target_profit: number | null
  start_date: string | null
  end_date: string | null
  created_at: string
  account_type: "standard" | "pro-fx"
}

export const ACCOUNT_TYPE_LABELS = {
  standard: "Standard Account",
  "pro-fx": "ProFX Account",
} 

export interface SuspensionDetails {
  reason?: string;
  until?: string;
  evidence_status?: string;
  appeal_available?: boolean;
  // add more fields if backend sends them
}

export interface LoginSuccessResponse {
  // normal success fields (token, user, etc.)
  access_token?: string;
  user?: { id: string; email: string; /* ... */ };
  // ... other fields

  // suspension info when present
  suspension?: {
    code: 'suspended_temporary' | 'suspended_permanent';
    details: SuspensionDetails;
  };
}

