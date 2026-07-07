"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Zap, Shield, DollarSign, ChevronRight, Sparkles, Download } from "lucide-react"
import Image from "next/image"

import LandingPage from "./landing-page"
import InstallButton from '@/components/InstallButton'

export default function WelcomePage() {
  const [showTerms, setShowTerms] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [hasVisited, setHasVisited] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const searchParams = useSearchParams()

  useEffect(() => {
    const visited = localStorage.getItem("v3_deriv_welcome_seen")
    if (visited) {
      setHasVisited(true)
    }

    if (searchParams.get('install') === 'true') {
      setShowInstallModal(true)
    }
  }, [searchParams])

  const handleContinue = () => {
    setShowTerms(true)
  }

  const handleAgree = () => {
    if (agreed) {
      localStorage.setItem("v3_deriv_welcome_seen", "true")
      setHasVisited(true)
    }
  }

  if (hasVisited) {
    return <LandingPage />
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 md:py-12 bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute top-20 right-10 w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] bg-[length:50px_50px]" />
      </div>

      <div className="w-full max-w-5xl mx-auto relative z-10">
        
        {/* ENLARGED COMBINED IMAGE AT THE TOP */}
        <div className="flex justify-center mb-10 md:mb-14">
          <div className="relative scale-110 md:scale-125 lg:scale-135 transition-transform duration-300">
            <Image
              src="/Instagram_post_-_9__3_-removebg-preview.png"
              alt="TradeRiser V3.0"
              width={620}
              height={220}
              className="drop-shadow-2xl"
              priority
            />
          </div>
        </div>

        {/* Main Heading */}
        <div className="text-center mb-14 md:mb-20">
          <div className="inline-flex items-center gap-3 bg-zinc-900/70 border border-emerald-500/30 px-6 py-3 rounded-full mb-6 mx-auto">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            <span className="uppercase text-emerald-400 text-sm font-semibold tracking-[3px]">V3 • DERIV INTEGRATION</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white leading-none mb-4">
            TRADE<span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-pink-500 bg-clip-text text-transparent">RISER</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/80 font-light max-w-2xl mx-auto">
            Official Deriv Integration • Next Generation Trading Platform
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 md:mb-20">
          {[
            {
              icon: Zap,
              title: "Lightning Fast",
              desc: "Powered by Deriv’s ultra-low latency API",
              color: "emerald"
            },
            {
              icon: Shield,
              title: "Maximum Security",
              desc: "Segregated funds • Bank-level encryption",
              color: "cyan"
            },
            {
              icon: DollarSign,
              title: "Flexible Trading",
              desc: "From $1 stakes • Multipliers • Options • 24/7 Synthetics",
              color: "pink"
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group bg-zinc-900/80 border border-white/10 hover:border-emerald-500/60 rounded-3xl p-8 md:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/10 backdrop-blur-xl"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${feature.color}-500/20 to-transparent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-9 h-9 text-${feature.color}-400`} />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-white/70 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <button
            onClick={handleContinue}
            className="group flex-1 py-5 px-10 rounded-3xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-lg font-bold text-white shadow-xl shadow-emerald-600/40 transition-all active:scale-[0.97]"
          >
            Continue to Trading
            <ChevronRight className="inline ml-2 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={handleContinue}
            className="flex-1 py-5 px-10 rounded-3xl border-2 border-white/30 hover:border-white/70 text-white font-semibold text-lg transition-all backdrop-blur-sm hover:bg-white/5 active:scale-[0.97]"
          >
            Review Terms
          </button>
        </div>

        <p className="text-center text-white/50 text-sm mt-10">
          Powered by Deriv • Trusted by traders across Africa
        </p>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b border-white/10 flex items-center justify-between sticky top-0 bg-zinc-950 z-10">
              <div className="flex items-center gap-4">
                <Sparkles className="w-8 h-8 text-emerald-400" />
                <div>
                  <h2 className="text-3xl font-bold text-white">Terms & Risk Disclosure</h2>
                  <p className="text-emerald-400">TradeRiser V3 • Powered by Deriv</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTerms(false)}
                className="text-3xl text-white/60 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 text-white/80 custom-scrollbar">
              <p className="text-lg font-medium text-white">Please read carefully before proceeding:</p>
              <div className="space-y-8">
                <div>
                  <h3 className="text-emerald-400 font-semibold mb-2">● High Risk Investment</h3>
                  <p>Trading on Deriv involves significant risk. You may lose more than your initial deposit.</p>
                </div>
                <div>
                  <h3 className="text-emerald-400 font-semibold mb-2">● Deriv Integration</h3>
                  <p>TradeRiser V3 provides a premium interface to access Deriv’s platforms including forex, synthetic indices, multipliers, and options.</p>
                </div>
                <div>
                  <h3 className="text-pink-400 font-semibold mb-2">● Responsible Trading</h3>
                  <p>Only trade with funds you can afford to lose. Use stop loss and take profit. Leverage magnifies both gains and losses.</p>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/10 bg-zinc-900">
              <label className="flex gap-4 cursor-pointer mb-8">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-6 h-6 mt-1 accent-emerald-500 border-white/30 rounded"
                />
                <span className="text-sm leading-relaxed">
                  I have read, understood, and agree to the Terms & Conditions and Risk Disclosure Statement.
                </span>
              </label>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowTerms(false)}
                  className="flex-1 py-4 rounded-2xl border border-white/20 hover:bg-white/5 font-medium transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleAgree}
                  disabled={!agreed}
                  className={`flex-1 py-4 rounded-2xl font-bold transition-all text-lg ${
                    agreed 
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:brightness-110" 
                      : "bg-zinc-800 text-white/40 cursor-not-allowed"
                  }`}
                >
                  Accept & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Install Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="bg-zinc-950 border border-cyan-500/30 rounded-3xl w-full max-w-md overflow-hidden">
            <div className="p-8 text-center">
              <Download className="w-16 h-16 text-cyan-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-3">Install TradeRiser</h2>
              <p className="text-white/70 mb-8">
                Add to your home screen for the best trading experience.
              </p>
              <InstallButton />
            </div>
            <div className="border-t border-white/10 p-4">
              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full py-4 text-white/70 hover:text-white font-medium transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
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