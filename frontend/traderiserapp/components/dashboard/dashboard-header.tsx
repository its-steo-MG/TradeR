// components/dashboard/dashboard-header.tsx
//import { User } from "lucide-react";

interface DashboardHeaderProps {
  username: string;
  email: string;
  isRealAccount: boolean;
  accountType: string;
}

export function DashboardHeader({
  username,
  email,
  //isRealAccount,
  accountType,
}: DashboardHeaderProps) {
  const displayAccountType =
    accountType.charAt(0).toUpperCase() + accountType.slice(1);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
          Welcome back, {username}
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          {displayAccountType} • {email}
        </p>
      </div>
    </div>
  );
}