"use client"

import { useState } from "react"
import { X, Zap, Shield, Award, Clock } from "lucide-react"
import Image from "next/image"

export default function WelcomeV3({ onContinue }: { onContinue: () => void }) {
  const [showTerms, setShowTerms] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const handleContinue = () => {
    if (agreed) {
      localStorage.setItem("v3_deriv_welcome_seen", "true")
      onContinue()
    }
  }

  return (
    <div className="min-h-screen w-full fixed inset-0 z-50 flex items-center justify-center p-6 bg-black overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(at_50%_30%,rgba(16,185,129,0.15)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(at_20%_70%,rgba(236,72,153,0.12)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-grid-white/5 bg-[size:40px_40px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {!showTerms ? (
          <div className="animate-fade-in space-y-10">
            {/* Logos Partnership Header */}
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="relative">
                <Image
                  src="/deriv-account-icon.png"
                  alt="Deriv"
                  width={90}
                  height={90}
                  className="drop-shadow-2xl"
                  priority
                />
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full text-black">
                  OFFICIAL
                </div>
              </div>

              <div className="text-4xl text-white/40 font-light">+</div>

              <Image
                src="/traderiser-logo-512.png"
                alt="TradeRiser"
                width={110}
                height={110}
                className="drop-shadow-2xl"
                priority
              />
            </div>

            {/* Main Title */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-emerald-500/30 bg-black/50 backdrop-blur-md">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="uppercase tracking-[3px] text-sm font-semibold text-emerald-400">V3 • DERIV INTEGRATION</span>
              </div>

              <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white">
                TRADE<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-pink-500">RISER</span>
              </h1>

              <p className="text-2xl text-white/80 font-light max-w-2xl mx-auto">
                Official Partnership with <span className="text-emerald-400 font-semibold">Deriv</span>
              </p>
              <p className="text-white/60 text-lg">Next-generation trading platform • Powered by Deriv infrastructure</p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Zap, label: "Ultra-Fast", desc: "Deriv API execution" },
                { icon: Shield, label: "Secure", desc: "Bank-grade protection" },
                { icon: Award, label: "24/7 Markets", desc: "Derived Indices" },
                { icon: Clock, label: "Low Stakes", desc: "From $1 per trade" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="group bg-zinc-900/70 border border-white/10 hover:border-emerald-500/60 rounded-3xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/20 backdrop-blur-xl"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-pink-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <item.icon className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-1">{item.label}</h3>
                  <p className="text-sm text-white/60">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="pt-8 flex justify-center">
              <button
                onClick={() => setShowTerms(true)}
                className="group relative px-16 py-6 text-xl font-bold rounded-3xl overflow-hidden transition-all active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-cyan-500 to-pink-600 transition-all group-hover:brightness-110" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all" />
                <span className="relative flex items-center gap-3 text-white">
                  Enter Deriv-Powered Platform
                  <span className="text-2xl group-hover:translate-x-2 transition-transform">→</span>
                </span>
              </button>
            </div>

            <p className="text-center text-xs text-white/50 pt-4">
              TradeRiser V3 • Official Deriv Integration
            </p>
          </div>
        ) : (
          /* Terms Modal */
          <div className="bg-zinc-950/95 backdrop-blur-3xl border border-white/10 rounded-3xl p-10 max-w-2xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-white">Terms & Risk Disclosure</h2>
                <p className="text-emerald-400 text-sm mt-1">TradeRiser V3 • Powered by Deriv</p>
              </div>
              <button
                onClick={() => setShowTerms(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto pr-6 custom-scrollbar space-y-8 text-sm leading-relaxed text-white/75">
              <p className="font-medium text-white">By proceeding, you acknowledge that:</p>

              <section className="space-y-3">
                <h3 className="text-emerald-400 font-semibold">● Age & Eligibility</h3>
                <p>You must be at least 18 years old and provide accurate information.</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-pink-400 font-semibold">● High Risk Warning</h3>
                <p>
                  Trading on Deriv (CFDs, Multipliers, Options, and Derived Indices) carries a high level of risk. 
                  You may lose more than your initial deposit. Only use funds you can afford to lose.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-emerald-400 font-semibold">● Partnership</h3>
                <p>
                  TradeRiser V3 is an integrated trading interface powered by Deriv’s robust infrastructure, 
                  offering access to forex, synthetics, multipliers, and more.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-pink-400 font-semibold">● Responsible Trading</h3>
                <p>Use stop-loss where possible. Leverage amplifies both profits and losses.</p>
              </section>
            </div>

            <div className="mt-10 pt-8 border-t border-white/10">
              <label className="flex gap-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-6 h-6 accent-emerald-500 border-white/30 rounded"
                />
                <span className="text-sm text-white/80 group-hover:text-white">
                  I have read and agree to the Terms & Conditions and fully understand the Risk Disclosure.
                </span>
              </label>

              <div className="flex gap-4 mt-10">
                <button
                  onClick={() => setShowTerms(false)}
                  className="flex-1 py-4 rounded-2xl border border-white/20 hover:bg-white/5 font-medium transition"
                >
                  Go Back
                </button>
                <button
                  onClick={handleContinue}
                  disabled={!agreed}
                  className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all ${
                    agreed 
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:brightness-110 text-black" 
                      : "bg-zinc-800 text-white/40 cursor-not-allowed"
                  }`}
                >
                  Accept & Continue to Trading
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }

        .bg-grid-white/5 {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 20px;
        }
      `}</style>
    </div>
  )
}