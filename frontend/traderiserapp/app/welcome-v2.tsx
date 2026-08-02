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
    <div className="min-h-screen w-full fixed inset-0 z-50 flex items-center justify-center p-4 bg-background overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(51,65,85,0.15)_0%,transparent_50%)]" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {!showTerms ? (
          <div className="space-y-12 animate-fade-in">
            
            {/* Partnership Header */}
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 backdrop-blur-sm">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">V4 • Premium Edition</span>
              </div>

              {/* Logos */}
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="relative">
                  <Image
                    src="/deriv-account-icon.png"
                    alt="Deriv"
                    width={80}
                    height={80}
                    className="drop-shadow-lg"
                    priority
                  />
                  <div className="absolute -bottom-2 -right-2 bg-accent text-[10px] font-bold px-2 py-0.5 rounded-full text-white">
                    OFFICIAL
                  </div>
                </div>

                <div className="text-2xl text-border">+</div>

                <Image
                  src="/traderiser-logo-512.png"
                  alt="TradeRiser"
                  width={90}
                  height={90}
                  className="drop-shadow-lg"
                  priority
                />
              </div>

              {/* Main Title */}
              <div className="space-y-3">
                <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-balance">
                  TRADE<span className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">RISER</span>
                </h1>
                <p className="text-xl text-muted-foreground">
                  Premium Trading Platform • Officially Powered by Deriv
                </p>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Zap, label: "Ultra-Fast", desc: "Deriv API" },
                { icon: Shield, label: "Secure", desc: "Bank-grade" },
                { icon: Clock, label: "24/7 Markets", desc: "Always open" },
                { icon: Sparkles, label: "Premium UX", desc: "V4 Edition" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="group p-4 rounded-lg border border-border hover:border-accent/50 bg-secondary/30 hover:bg-secondary/60 backdrop-blur transition-all duration-300 hover:scale-105"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                    <item.icon className="w-4 h-4 text-accent" />
                  </div>
                  <h3 className="text-sm font-semibold text-balance">{item.label}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="pt-4 flex flex-col gap-3 max-w-md mx-auto">
              <button
                onClick={() => setShowTerms(true)}
                className="group relative w-full px-6 py-4 rounded-xl font-semibold text-white overflow-hidden transition-all hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-accent to-secondary" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <span className="relative flex items-center justify-center gap-2">
                  Enter Trading Platform
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              TradeRiser V4 • Trusted by traders worldwide
            </p>
          </div>
        ) : (
          /* Terms Modal */
          <div className="bg-background/95 backdrop-blur-xl border border-border rounded-[1.8rem] p-8 max-w-2xl mx-auto animate-fade-in shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Terms & Risk Disclosure</h2>
                  <p className="text-xs text-muted-foreground mt-1">TradeRiser V4</p>
                </div>
              </div>
              <button
                onClick={() => setShowTerms(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto pr-4 custom-scrollbar space-y-5 text-sm mb-8">
              <p className="font-medium text-foreground">By proceeding, you acknowledge that:</p>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Age & Eligibility</h3>
                    <p className="text-muted-foreground text-xs">You must be at least 18 years old and provide accurate information.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">High Risk Warning</h3>
                    <p className="text-muted-foreground text-xs">
                      Trading on Deriv (CFDs, Multipliers, Options, and Derived Indices) carries high risk. You may lose more than your initial deposit.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Official Partnership</h3>
                    <p className="text-muted-foreground text-xs">
                      TradeRiser V4 is an integrated trading interface powered by Deriv's infrastructure.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Responsible Trading</h3>
                    <p className="text-muted-foreground text-xs">Use stop-loss orders. Leverage amplifies both profits and losses.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkbox & Buttons */}
            <div className="space-y-4 border-t border-border pt-8">
              <label className="flex gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 accent-accent rounded border border-border mt-0.5"
                />
                <span className="text-xs leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors">
                  I have read and agree to the Terms & Conditions and fully understand the Risk Disclosure Statement.
                </span>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowTerms(false)}
                  className="flex-1 px-4 py-3 rounded-lg border border-border hover:bg-secondary/50 font-medium transition-colors text-sm"
                >
                  Go Back
                </button>
                <button
                  onClick={handleContinue}
                  disabled={!agreed}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    agreed 
                      ? "bg-gradient-to-r from-accent to-secondary text-white hover:shadow-lg" 
                      : "bg-secondary/50 text-muted-foreground cursor-not-allowed"
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

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--accent));
        }
      `}</style>
    </div>
  )
}
