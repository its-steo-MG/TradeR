"use client"

import { useState } from "react"
import { X, Zap, Shield, Sparkles, Clock, ArrowRight, CheckCircle2 } from "lucide-react"
import Image from "next/image"

export default function WelcomeV4({ onContinue }: { onContinue: () => void }) {
  const [showTerms, setShowTerms] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const handleContinue = () => {
    if (agreed) {
      localStorage.setItem("v4_deriv_welcome_seen", "true")
      onContinue()
    }
  }

  return (
    <div className="min-h-screen w-full fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="fixed inset-0 z-0 dark:block hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-950/30 to-pink-950/20" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl" />
      </div>
      <div className="fixed inset-0 z-0 block dark:hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-400/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {!showTerms ? (
          <div className="space-y-12 animate-fade-in">
            <div className="text-center space-y-6">
              <div className="drop-on-top relative inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-xl">
                <span className="relative z-[1] flex items-center gap-3">
                  <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-white/90 tracking-[2px] uppercase">V4.1 • Premium Edition</span>
                  <span className="drop-on-top relative overflow-hidden rounded-full border border-white/40 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-blue-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg shadow-pink-500/40">
                    <span className="relative z-[1]">Beta</span>
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="relative">
                  <Image src="/deriv-account-icon.png" alt="Deriv" width={80} height={80} className="drop-shadow-lg" priority />
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-[10px] font-bold px-2 py-0.5 rounded-full text-white">
                    OFFICIAL
                  </div>
                </div>
                <div className="text-2xl text-white/40">+</div>
                <Image src="/traderiser-logo-512.png" alt="TradeRiser" width={90} height={90} className="drop-shadow-lg" priority />
              </div>

              <div className="space-y-3">
                <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-white text-balance">
                  TRADE<span className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">RISER</span>
                  <span className="ml-3 text-2xl md:text-3xl align-top text-white/70">V4.1</span>
                </h1>
                <p className="text-xl text-white/70">Premium Trading Platform • Officially Powered by Deriv</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Zap, label: "Ultra-Fast", desc: "Deriv API" },
                { icon: Shield, label: "Secure", desc: "Bank-grade" },
                { icon: Clock, label: "24/7 Markets", desc: "Always open" },
                { icon: Sparkles, label: "Premium UX", desc: "V4.1 Beta" },
              ].map((item, i) => (
                <div key={i} className="drop-on-top group relative p-4 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 backdrop-blur transition-all duration-300 hover:scale-105">
                  <div className="relative z-[1]">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center mb-3">
                      <item.icon className="w-4 h-4 text-pink-300" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">{item.label}</h3>
                    <p className="text-xs text-white/60">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex flex-col gap-3 max-w-md mx-auto">
              <button
                onClick={() => setShowTerms(true)}
                className="drop-on-top group relative w-full px-6 py-4 rounded-xl font-semibold text-white overflow-hidden transition-all hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-blue-500" />
                <span className="relative z-[1] flex items-center justify-center gap-2">
                  Enter Trading Platform
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>

            <p className="text-center text-xs text-white/50">TradeRiser V4.1 Beta • Trusted by traders worldwide</p>
          </div>
        ) : (
          <div className="bg-zinc-950/90 backdrop-blur-xl border border-white/15 rounded-[1.8rem] p-8 max-w-2xl mx-auto animate-fade-in shadow-2xl text-white">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/15 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-pink-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Terms & Risk Disclosure</h2>
                  <p className="text-xs text-white/60 mt-1">TradeRiser V4.1 Beta</p>
                </div>
              </div>
              <button onClick={() => setShowTerms(false)} className="text-white/60 hover:text-white transition-colors p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto pr-4 custom-scrollbar space-y-5 text-sm mb-8">
              <p className="font-medium text-white">By proceeding, you acknowledge that:</p>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-white text-sm">Age & Eligibility</h3>
                    <p className="text-white/60 text-xs">You must be at least 18 years old and provide accurate information.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-white text-sm">High Risk Warning</h3>
                    <p className="text-white/60 text-xs">Trading on Deriv carries high risk. You may lose more than your initial deposit.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-white text-sm">Official Partnership</h3>
                    <p className="text-white/60 text-xs">TradeRiser V4.1 is an integrated trading interface powered by Deriv.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-white text-sm">Responsible Trading</h3>
                    <p className="text-white/60 text-xs">Use stop-loss orders. Leverage amplifies both profits and losses.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-white/10 pt-8">
              <label className="flex gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 accent-pink-500 rounded border border-white/20 mt-0.5"
                />
                <span className="text-xs leading-relaxed text-white/70 group-hover:text-white transition-colors">
                  I have read and agree to the Terms & Conditions and fully understand the Risk Disclosure Statement.
                </span>
              </label>
              <div className="flex gap-3">
                <button onClick={() => setShowTerms(false)} className="flex-1 px-4 py-3 rounded-lg border border-white/15 hover:bg-white/10 font-medium transition-colors text-sm">
                  Go Back
                </button>
                <button
                  onClick={handleContinue}
                  disabled={!agreed}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    agreed
                      ? "bg-gradient-to-r from-fuchsia-500 via-pink-500 to-blue-500 text-white hover:shadow-lg"
                      : "bg-white/5 text-white/30 cursor-not-allowed"
                  }`}
                >
                  Accept & Continue
                  {agreed && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 20px; }
      `}</style>
    </div>
  )
}
