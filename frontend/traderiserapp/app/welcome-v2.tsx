"use client"

import { useState } from "react"
import { X } from "lucide-react"

export default function WelcomeV2({ onContinue }: { onContinue: () => void }) {
  const [showTerms, setShowTerms] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const handleContinue = () => {
    if (agreed) {
      localStorage.setItem("v2_welcome_seen", "true")
      onContinue()
    }
  }

  return (
    <div className="min-h-screen w-full fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-black">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-600 to-transparent opacity-20 blur-3xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-cyan-600 to-transparent opacity-20 blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-br from-purple-600 to-transparent opacity-10 blur-3xl animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {!showTerms ? (
          <div className="animate-fade-in">
            {/* Hero Section */}
            <div className="text-center space-y-8 mb-12">
              <div className="space-y-4">
                <div className="inline-block">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-cyan-600 rounded-2xl blur-lg opacity-75 animate-pulse"></div>
                    <div className="relative bg-black rounded-2xl p-6 border border-white/20">
                      <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                        TradeRiser V2
                      </h1>
                    </div>
                  </div>
                </div>
                <p className="text-xl md:text-2xl text-white/90 font-light">
                  Welcome to the Next Generation of Forex Trading
                </p>
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {[
                  { icon: "⚡", label: "Lightning Fast", desc: "Instant execution" },
                  { icon: "🎯", label: "Smart Tools", desc: "AI-powered insights" },
                  { icon: "🔐", label: "Secure", desc: "Bank-level security" },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="group relative rounded-xl p-4 bg-white/5 backdrop-blur-md border border-white/10 hover:border-pink-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/20 transform hover:scale-105"
                  >
                    <div className="text-3xl mb-2">{feature.icon}</div>
                    <p className="font-semibold text-white text-sm">{feature.label}</p>
                    <p className="text-xs text-white/60">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-3 gap-4 mb-12">
              {[
                { number: "50K+", label: "Active Traders" },
                { number: "24/7", label: "Market Access" },
                { number: "$2B+", label: "Daily Volume" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="text-center p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
                    {stat.number}
                  </p>
                  <p className="text-xs md:text-sm text-white/70 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Main CTA Section */}
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-cyan-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                <button
                  onClick={() => setShowTerms(true)}
                  className="relative w-full bg-black rounded-2xl px-8 py-4 text-lg font-bold text-white hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                >
                  <span>Continue to Trading</span>
                  <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                </button>
              </div>

              <p className="text-xs text-white/60 text-center">Click continue to review our terms and get started</p>
            </div>
          </div>
        ) : (
          /* Terms and Services Modal */
          <div className="animate-fade-in space-y-6 bg-black/80 backdrop-blur-xl border border-white/20 rounded-3xl p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">Terms & Conditions</h2>
              <button onClick={() => setShowTerms(false)} className="text-white/60 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Terms content */}
            <div className="space-y-6 text-sm text-white/80 max-h-96 overflow-y-auto pr-4 custom-scrollbar">
              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-pink-500">●</span> Account Requirements
                </h3>
                <p>
                  You must be 18 years or older to create a trading account. Provide accurate information during
                  registration. You are responsible for maintaining account security.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-cyan-500">●</span> Risk Disclosure
                </h3>
                <p>
                  Forex and CFD trading carry substantial risk. You may lose more than your initial investment. Only
                  trade with money you can afford to lose. Past performance does not guarantee future results.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-pink-500">●</span> Withdrawal Rules
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Minimum withdrawal: $10</li>
                  <li>Withdrawals processed within 24-48 hours</li>
                  <li>Verify identity before first withdrawal</li>
                  <li>Must have zero open positions</li>
                  <li>Funds return to original payment method</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-cyan-500">●</span> Position Management
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Maximum position size: Limited by account balance</li>
                  <li>Stop loss recommended for all trades</li>
                  <li>Leverage: Up to 1:500 available</li>
                  <li>Automated margin calls at 100% margin level</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-pink-500">●</span> Demo Account Rules
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>$10,000 virtual balance (non-withdrawable)</li>
                  <li>Resets after 30 days of inactivity</li>
                  <li>Use for practice and strategy testing only</li>
                  <li>Transfer to real account not allowed</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-cyan-500">●</span> Prohibited Activities
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>No automated bots or expert advisors without approval</li>
                  <li>No market manipulation or fraud</li>
                  <li>No account sharing or unauthorized access</li>
                  <li>Violations result in account suspension</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-pink-500">●</span> Fund Security & Privacy
                </h3>
                <p>
                  Your funds are held in segregated accounts. We comply with data protection regulations. Personal
                  information is never shared with third parties without consent.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-cyan-500">●</span> Changes to Terms
                </h3>
                <p>
                  We reserve the right to modify these terms. Continued use of the platform constitutes acceptance of
                  updated terms. You will be notified of material changes.
                </p>
              </section>
            </div>

            {/* Checkbox and buttons */}
            <div className="space-y-4 border-t border-white/10 pt-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-white/30 accent-pink-600 cursor-pointer"
                />
                <span className="text-white/80 text-sm">
                  I have read and agree to the Terms & Conditions and Risk Disclosure
                </span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowTerms(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors font-semibold"
                >
                  Go Back
                </button>
                <button
                  onClick={handleContinue}
                  disabled={!agreed}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                    agreed
                      ? "bg-gradient-to-r from-pink-600 to-cyan-600 text-white hover:shadow-lg hover:shadow-pink-500/50"
                      : "bg-white/10 text-white/50 cursor-not-allowed"
                  }`}
                >
                  Accept & Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  )
}
