"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import {
  Zap,
  Shield,
  DollarSign,
  ChevronRight,
  Sparkles,
  Download,
  Cpu,
} from "lucide-react"
import Image from "next/image"

import LandingPage from "./landing-page"
import InstallButton from "@/components/InstallButton"

export default function WelcomePage() {
  const [showTerms, setShowTerms] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [hasVisited, setHasVisited] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const searchParams = useSearchParams()

  useEffect(() => {
    const visited = localStorage.getItem("v4_deriv_welcome_seen")
    if (visited) {
      setHasVisited(true)
    }

    if (searchParams.get("install") === "true") {
      setShowInstallModal(true)
    }
  }, [searchParams])

  const handleContinue = () => {
    setShowTerms(true)
  }

  const handleAgree = () => {
    if (agreed) {
      localStorage.setItem("v4_deriv_welcome_seen", "true")
      setHasVisited(true)
    }
  }

  if (hasVisited) {
    return <LandingPage />
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 md:py-12 relative overflow-hidden">
      {/* Background — black + green */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#06120a] to-[#0a1a0f]" />
        <div className="absolute -top-32 -right-20 w-[700px] h-[700px] bg-emerald-500/25 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 -left-20 w-[600px] h-[600px] bg-green-600/20 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-emerald-600/15 rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] bg-[length:36px_36px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      <div className="w-full max-w-5xl mx-auto relative z-10">
        {/* Logos */}
        <div className="flex justify-center mb-10 md:mb-14">
          <div className="flex items-center gap-2 md:gap-12 scale-90 md:scale-100">
            <div className="relative w-40 md:w-48 h-20 flex items-center justify-center">
              <Image
                src="/deriv-account-icon.png"
                alt="Deriv"
                width={180}
                height={80}
                className="object-contain opacity-90 hover:opacity-100 transition-all hover:scale-105"
                priority
              />
            </div>

            <div className="relative w-40 md:w-48 h-20 flex items-center justify-center">
              <Image
                src="/traderiser-logo-192.png"
                alt="TradeRiser V4"
                width={100}
                height={80}
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>

            <div className="relative w-40 md:w-48 h-20 flex items-center justify-center">
              <Image
                src="/mt5.png"
                alt="MT5"
                width={180}
                height={80}
                className="object-contain opacity-90 hover:opacity-100 transition-all hover:scale-105"
                priority
              />
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-14 md:mb-20">
          <div className="drop-on-top relative inline-flex items-center gap-3 bg-white/5 border border-white/15 backdrop-blur-2xl px-6 py-3 rounded-full mb-6 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <span className="relative z-[1] flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_#34d399]" />
              <span className="uppercase text-emerald-300/90 text-sm font-medium tracking-[3px]">
                V4 • ADVANCED MULTI-BROKER
              </span>
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white leading-none mb-4">
            TRADE
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
              RISER
            </span>{" "}
            V4
          </h1>

          <p className="text-xl md:text-2xl text-white/70 font-light max-w-2xl mx-auto">
            Deriv • TradeRiser • MT5 — Seamlessly Integrated
          </p>
        </div>

        {/* Feature Cards — soft different colors + clear water drop */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16 md:mb-20">
  {[
    {
      icon: Cpu,
      title: "Unified Interface",
      desc: "Deriv, TradeRiser & MT5 in one platform",
      bg: "bg-gradient-to-br from-slate-700/90 to-slate-800/95",
      iconBg: "bg-white/10 text-slate-200 border-white/20",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      desc: "Ultra-low latency Deriv API execution",
      bg: "bg-gradient-to-br from-teal-800/85 to-teal-900/95",
      iconBg: "bg-teal-400/15 text-teal-200 border-teal-400/25",
    },
    {
      icon: Shield,
      title: "Secure",
      desc: "Bank-level encryption & segregated funds",
      bg: "bg-gradient-to-br from-indigo-800/85 to-indigo-950/95",
      iconBg: "bg-indigo-400/15 text-indigo-200 border-indigo-400/25",
    },
    {
      icon: DollarSign,
      title: "Flexible Trading",
      desc: "From $1 • Multipliers • Options • 24/7",
      bg: "bg-gradient-to-br from-amber-800/80 to-stone-900/95",
      iconBg: "bg-amber-400/15 text-amber-200 border-amber-400/25",
    },
  ].map((feature, i) => (
    <div
      key={i}
      className={`drop-on-top group relative ${feature.bg} border border-white/12 rounded-[2rem] p-6 md:p-7 transition-all duration-500 hover:-translate-y-2 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] overflow-hidden`}
    >
      <div className="relative z-[1]">
        <div
          className={`w-14 h-14 rounded-[1.8rem] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 border ${feature.iconBg}`}
        >
          <feature.icon className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">
          {feature.title}
        </h3>
        <p className="text-sm text-white/70 leading-relaxed">
          {feature.desc}
        </p>
      </div>
    </div>
  ))}
</div>
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <button
            onClick={handleContinue}
            className="drop-on-top group relative flex-1 py-5 px-8 rounded-full overflow-hidden transition-all active:scale-[0.97]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/90 to-green-500/90 rounded-full" />
            <div className="absolute inset-0 bg-white/10 backdrop-blur-xl rounded-full" />
            <div className="absolute inset-0 rounded-full border border-white/20" />
            <span className="relative z-[1] flex items-center justify-center gap-2 text-lg font-bold text-white">
              Continue to Trading
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>

          <button
            onClick={handleContinue}
            className="drop-on-top relative flex-1 py-5 px-8 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/30 text-white font-semibold text-lg backdrop-blur-2xl transition-all active:scale-[0.97] shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
          >
            <span className="relative z-[1]">Review Terms</span>
          </button>
        </div>

        <p className="text-center text-white/40 text-sm mt-10">
          V4 Platform • Deriv + TradeRiser + MT5
        </p>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col rounded-[2rem] bg-white/[0.06] border border-white/15 backdrop-blur-3xl shadow-[0_25px_80px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

            <div className="relative p-7 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-[1.8rem] bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Terms & Risk Disclosure
                  </h2>
                  <p className="text-emerald-300/80 text-sm">
                    TradeRiser V4 • Advanced Multi-Broker
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTerms(false)}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center justify-center text-2xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-7 space-y-7 text-white/75 custom-scrollbar">
              <p className="text-base font-medium text-white/90">
                Please read carefully before proceeding:
              </p>

              <div className="space-y-6">
                <div className="bg-white/[0.03] border border-white/10 rounded-[1.8rem] p-5">
                  <h3 className="text-emerald-400 font-semibold mb-2">
                    ● High Risk Investment
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Trading on Deriv involves significant risk. You may lose
                    more than your initial deposit.
                  </p>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-[1.8rem] p-5">
                  <h3 className="text-emerald-400 font-semibold mb-2">
                    ● Unified Ecosystem
                  </h3>
                  <p className="text-sm leading-relaxed">
                    TradeRiser V4 integrates Deriv, MT5, and TradeRiser into one
                    seamless platform. Access forex, synthetics, multipliers,
                    and options all in one place.
                  </p>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-[1.8rem] p-5">
                  <h3 className="text-amber-400 font-semibold mb-2">
                    ● Responsible Trading
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Only trade with funds you can afford to lose. Use stop loss
                    and take profit. Leverage magnifies both gains and losses.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative p-7 border-t border-white/10 bg-white/[0.03]">
              <label className="flex gap-4 cursor-pointer mb-6">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 mt-0.5 accent-emerald-500 rounded"
                />
                <span className="text-sm leading-relaxed text-white/80">
                  I have read, understood, and agree to the Terms & Conditions
                  and Risk Disclosure Statement.
                </span>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowTerms(false)}
                  className="drop-on-top relative flex-1 py-4 rounded-[1.8rem] bg-white/5 border border-white/15 hover:bg-white/10 font-medium transition-all"
                >
                  <span className="relative z-[1]">Go Back</span>
                </button>
                <button
                  onClick={handleAgree}
                  disabled={!agreed}
                  className={`drop-on-top relative flex-1 py-4 rounded-[1.8rem] font-bold transition-all text-base ${
                    agreed
                      ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:brightness-110 shadow-lg shadow-emerald-500/25"
                      : "bg-white/5 text-white/30 cursor-not-allowed border border-white/10"
                  }`}
                >
                  <span className="relative z-[1]">Accept & Continue</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Install Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white/[0.06] border border-white/15 backdrop-blur-3xl shadow-[0_25px_80px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

            <div className="relative p-8 text-center">
              <div className="w-16 h-16 rounded-[1.8rem] bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-6">
                <Download className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Install TradeRiser
              </h2>
              <p className="text-white/60 mb-8 text-sm">
                Add to your home screen for the best trading experience.
              </p>
              <InstallButton />
            </div>

            <div className="border-t border-white/10 p-4">
              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full py-3.5 text-white/60 hover:text-white font-medium transition-colors rounded-xl hover:bg-white/5"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.5);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  )
}