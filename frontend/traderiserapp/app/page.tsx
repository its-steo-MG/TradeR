"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Zap, Shield, DollarSign, ChevronRight, CheckCircle2, AlertCircle, Sparkles, Download } from "lucide-react"
import LandingPage from "./landing-page"
import InstallButton from '@/components/InstallButton'; // Assuming path to your InstallButton component

export default function WelcomePage() {
  const [showTerms, setShowTerms] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [hasVisited, setHasVisited] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const searchParams = useSearchParams()

  useEffect(() => {
    const visited = localStorage.getItem("v2_welcome_seen")
    if (visited) {
      setHasVisited(true)
    }

    // Check for install query param
    if (searchParams.get('install') === 'true') {
      setShowInstallModal(true)
    }
  }, [searchParams])

  const handleContinue = () => {
    setShowTerms(true)
  }

  const handleAgree = () => {
    localStorage.setItem("v2_welcome_seen", "true")
    setHasVisited(true)
  }

  if (hasVisited) {
    return <LandingPage />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-black">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />

        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl opacity-50 animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl opacity-50 animate-blob animation-delay-4000" />
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl opacity-30 animate-blob" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:50px_50px] opacity-30" />
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-gradient-to-br from-gray-950/95 via-gray-900/95 to-gray-950/95 rounded-2xl sm:rounded-3xl border border-pink-500/30 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-white/10 animate-scale-in">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-b from-gray-950 to-transparent px-4 sm:px-8 py-6 sm:py-8 border-b border-white/10">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <Sparkles className="w-5 sm:w-6 h-5 sm:h-6 text-pink-500 flex-shrink-0" />
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">
                  Trading Terms & Conditions
                </h2>
              </div>
              <p className="text-white/50 text-xs sm:text-sm">Version 2.0 - Updated January 2026</p>
            </div>

            {/* Content */}
            <div className="px-4 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
              {/* Withdrawal Rules */}
              <section>
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-lg bg-gradient-to-br from-pink-600 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Withdrawal Rules & Policies</h3>
                </div>
                <ul className="space-y-2 sm:space-y-3 text-white/80 text-xs sm:text-sm">
                  <li className="flex gap-3 group">
                    <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white">Maximum Withdrawal:</strong> $10,000 USD or equivalent. Withdrawals
                      above this amount will be rejected.
                    </span>
                  </li>
                  <li className="flex gap-3 group">
                    <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white">Processing Time:</strong> 24-48 hours for all withdrawal requests.
                      Bank transfers may take 3-5 business days.
                    </span>
                  </li>
                  <li className="flex gap-3 group">
                    <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white">Verification Required:</strong> All withdrawals require identity
                      verification. Unverified withdrawals will not be refunded.
                    </span>
                  </li>
                  <li className="flex gap-3 group">
                    <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white">Withdrawal Methods:</strong> Bank transfer, M-Pesa, Paypal, and
                      cryptocurrency options available.
                    </span>
                  </li>
                </ul>
              </section>

              {/* Account Management & Features */}
              <section>
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-lg bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Account Management & Features</h3>
                </div>
                <ul className="space-y-2 sm:space-y-3 text-white/80 text-xs sm:text-sm">
                  <li className="flex gap-3 group">
                    <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white">Demo Account:</strong> $10,000 virtual balance to practice trading risk-free.
                    </span>
                  </li>
                  <li className="flex gap-3 group">
                    <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white">Real Account:</strong> Trade with real money and keep your profits.
                    </span>
                  </li>
                  <li className="flex gap-3 group">
                    <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white">Automated Trading:</strong> Use our smart robots to automate your trading strategies.
                    </span>
                  </li>
                  <li className="flex gap-3 group">
                    <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white">Real-time Signals:</strong> Access daily forex & crypto trading signals from our AI and experts.
                    </span>
                  </li>
                </ul>
              </section>

              {/* Risk Management & Trading Rules */}
              <section>
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Risk Management & Trading Rules</h3>
                </div>
                <ul className="space-y-2 sm:space-y-3 text-white/80 text-xs sm:text-sm">
                  <li className="flex gap-3 group">
                    <AlertCircle className="w-4 sm:w-5 h-4 sm:h-5 text-yellow-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white">Maximum Trade Size:</strong> Limit single trades to 5% of your account balance.
                    </span>
                  </li>
                  <li className="flex gap-3 group">
                    <AlertCircle className="w-4 sm:w-5 h-4 sm:h-5 text-yellow-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white">Stop Loss Required:</strong> Always set stop-loss orders to protect your capital.
                    </span>
                  </li>
                  <li className="flex gap-3 group">
                    <AlertCircle className="w-4 sm:w-5 h-4 sm:h-5 text-yellow-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white">Daily Loss Limit:</strong> Stop trading if you lose 10% of your daily starting balance.
                    </span>
                  </li>
                  <li className="flex gap-3 group">
                    <AlertCircle className="w-4 sm:w-5 h-4 sm:h-5 text-yellow-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>
                      <strong className="text-white">Leverage Limits:</strong> Maximum 1:100 leverage on forex pairs. Higher leverage increases risk.
                    </span>
                  </li>
                </ul>
              </section>

              {/* Liability Disclaimer */}
              <section className="bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/30 rounded-lg sm:rounded-xl p-4 sm:p-5 group hover:border-red-500/50 transition-colors">
                <p className="text-white/80 text-xs sm:text-sm">
                  <strong className="text-red-300">Disclaimer:</strong> Trading financial instruments involves
                  substantial risk of loss. Past performance does not guarantee future results. Always trade responsibly
                  and never invest more than you can afford to lose.
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gradient-to-t from-gray-950 to-transparent px-4 sm:px-8 py-4 sm:py-6 border-t border-white/10 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setShowTerms(false)}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-white/20 text-white text-sm sm:text-base hover:border-white/40 hover:bg-white/5 transition-all font-semibold backdrop-blur-sm"
              >
                Go Back
              </button>
              <button
                onClick={handleAgree}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 text-white text-sm sm:text-base hover:from-pink-700 hover:to-pink-600 transition-all font-semibold shadow-lg hover:shadow-pink-500/50 hover:shadow-2xl transform hover:scale-105 active:scale-95"
              >
                I Agree & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-gradient-to-br from-gray-950/95 via-gray-900/95 to-gray-950/95 rounded-2xl sm:rounded-3xl border border-cyan-500/30 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl ring-1 ring-white/10 animate-scale-in">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-b from-gray-950 to-transparent px-4 sm:px-6 py-6 border-b border-white/10">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <Download className="w-5 sm:w-6 h-5 sm:h-6 text-cyan-500 flex-shrink-0" />
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-600 bg-clip-text text-transparent">
                  Install TradeRiser App
                </h2>
              </div>
              <p className="text-white/50 text-xs sm:text-sm">Go mobile for offline access & push alerts!</p>
            </div>

            {/* Content */}
            <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-4">
              <p className="text-white/80 text-sm sm:text-base text-center leading-relaxed">
                Add TradeRiser to your home screen for a seamless trading experience. Get instant notifications and trade anywhere, anytime.
              </p>
              
              {/* Install Button */}
              <div className="flex justify-center">
                <InstallButton />
              </div>

              {/* Fallback for iOS */}
              <div className="text-center text-white/60 text-xs sm:text-sm">
                <p>On iOS: Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gradient-to-t from-gray-950 to-transparent px-4 sm:px-6 py-4 border-t border-white/10">
              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-white/20 text-white text-sm sm:text-base hover:border-white/40 hover:bg-white/5 transition-all font-semibold backdrop-blur-sm"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl z-10 px-4 sm:px-6 lg:px-8">
        {/* Logo & Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 sm:w-24 h-20 sm:h-24 bg-gradient-to-br from-pink-600 to-cyan-600 rounded-2xl sm:rounded-3xl shadow-2xl mb-6 sm:mb-8 group hover:shadow-pink-500/50 hover:shadow-3xl transition-all transform hover:scale-110">
            <Zap className="w-10 sm:w-12 h-10 sm:h-12 text-white group-hover:animate-spin" />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            <span className="bg-gradient-to-r from-pink-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
              Welcome to TradeRiser V2
            </span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white/60 font-light max-w-2xl mx-auto px-4">
            The future of forex, crypto & indices trading is here
          </p>
        </div>

        {/* Feature Cards */}
        <div className="space-y-3 sm:space-y-4 mb-12 sm:mb-16">
          {[
            {
              icon: Zap,
              title: "Smart Automation",
              description:
                "Trade forex, binary options, crypto, and synthetic indices with advanced automation powered by AI robots.",
              gradient: "from-pink-600 to-pink-500",
            },
            {
              icon: Shield,
              title: "Risk-Free Practice",
              description:
                "Start with our demo account featuring $10,000 in virtual balance. Perfect for learning without losing real money.",
              gradient: "from-cyan-600 to-cyan-500",
            },
            {
              icon: DollarSign,
              title: "Real Profits",
              description:
                "Graduate to a real account and start earning real profits. Low minimum deposit, instant withdrawals.",
              gradient: "from-purple-600 to-purple-500",
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="group relative rounded-lg sm:rounded-2xl p-4 sm:p-6 md:p-8 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-pink-500/50 transition-all duration-300 backdrop-blur-xl hover:backdrop-blur-2xl hover:from-white/15 hover:to-white/10 cursor-pointer transform hover:scale-105"
              style={{
                animation: `slideInUp 0.6s ease-out ${idx * 0.1}s both`,
              }}
            >
              <div className="absolute inset-0 rounded-lg sm:rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
              <div className="flex items-start gap-3 sm:gap-5 relative z-10">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-2xl transition-all group-hover:scale-110`}
                >
                  <feature.icon className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-pink-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-white/70 text-xs sm:text-sm mt-1 sm:mt-2 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-12 sm:mb-16 animate-fade-in px-2 sm:px-0"
          style={{ animationDelay: "0.3s" }}
        >
          <button
            onClick={handleContinue}
            className="w-full sm:w-auto group relative px-8 sm:px-10 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 text-white font-bold text-base sm:text-lg shadow-2xl hover:from-pink-700 hover:to-pink-600 transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden hover:shadow-pink-500/50 hover:shadow-3xl transform hover:scale-105 active:scale-95"
          >
            <span>Continue to Trading</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={handleContinue}
            className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 rounded-xl border-2 border-white/30 text-white font-semibold hover:border-white/60 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm transform hover:scale-105 active:scale-95"
          >
            Terms & Services
          </button>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 sm:mt-20 pt-8 sm:pt-12 border-t border-white/10">
          <p className="text-center text-white/50 text-xs sm:text-sm mb-6 sm:mb-8 font-light">
            Trusted by traders in Kenya & across Africa
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[
              { value: "10K+", label: "Active Traders", color: "pink" },
              { value: "24/7", label: "Market Access", color: "cyan" },
              { value: "$M+", label: "Traded Daily", color: "purple" },
              { value: "5%", label: "Profit Share", color: "pink" },
            ].map((badge, idx) => (
              <div
                key={idx}
                className="group text-center p-3 sm:p-4 rounded-lg sm:rounded-xl border border-white/10 hover:border-white/30 transition-all hover:bg-white/5 cursor-pointer transform hover:scale-110"
              >
                <p
                  className={`text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r ${
                    badge.color === "pink"
                      ? "from-pink-400 to-pink-600"
                      : badge.color === "cyan"
                        ? "from-cyan-400 to-cyan-600"
                        : "from-purple-400 to-purple-600"
                  } bg-clip-text text-transparent group-hover:scale-110 transition-transform origin-center`}
                >
                  {badge.value}
                </p>
                <p className="text-white/60 text-xs sm:text-sm mt-1 sm:mt-2">{badge.label}</p>
              </div>
            ))}
          </div>
        </div>
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

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
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

        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}