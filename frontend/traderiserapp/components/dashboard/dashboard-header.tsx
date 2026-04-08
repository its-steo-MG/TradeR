// components/dashboard/dashboard-header.tsx
import Image from "next/image";

interface DashboardHeaderProps {
  username: string;
  email: string;
  isRealAccount: boolean;
  accountType: string;
}

export function DashboardHeader({
  username,
  email,
  isRealAccount,
  accountType,
}: DashboardHeaderProps) {
  const displayAccountType =
    accountType.charAt(0).toUpperCase() + accountType.slice(1);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
      {/* Welcome Section */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/traderiser-logo-512-XQKYiMKYDs3FHo4yZyfpTS70vqF8qV.png"
              alt="Traderiser"
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg ring-2 ring-white/20"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent tracking-tight">
            Welcome back, {username}
          </h1>
        </div>
        
        {/* Info Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-4 py-2 rounded-full glass border border-white/15 text-xs sm:text-sm font-semibold uppercase tracking-widest bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 transition-all duration-300">
            {displayAccountType}
          </span>
          <span className="hidden sm:inline text-white/30">•</span>
          <span className="hidden sm:inline text-sm text-white/60">{email}</span>
        </div>
      </div>

      {/* Integrated Platforms - Further Reduced Height */}
      <div className="glass rounded-3xl px-8 py-3 border border-white/10 backdrop-blur-2xl shadow-xl">
        <div className="flex flex-col items-center gap-2">
          {/* Icons Row */}
          <div className="flex items-center gap-7">
            {/* Traderiser Icon (Blue £) */}
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md ring-1 ring-white/20">
              <Image
                src="/images/traderiser-logo-192.png"
                alt="Traderiser"
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            </div>

            {/* X Icon */}
            <div className="w-14 h-14 flex items-center justify-center">
              <span className="text-5xl font-black bg-gradient-to-br from-purple-400 via-pink-400 to-violet-400 bg-clip-text text-transparent leading-none tracking-tighter">
                X
              </span>
            </div>

            {/* Deriv Icon */}
            {isRealAccount && (
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md ring-1 ring-white/20">
                <Image
                  src="/deriv-account-icon.png"
                  alt="Deriv"
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Traderiser V3.0 Text - Even tighter */}
          <div className="text-center -mt-1">
            <p className="text-lg font-bold text-white tracking-tight">
              Traderiser <span className="text-white/70">V3.0</span>
            </p>
            <p className="text-[9px] text-white/50 tracking-widest">INTEGRATED PLATFORMS</p>
          </div>
        </div>
      </div>
    </div>
  );
}