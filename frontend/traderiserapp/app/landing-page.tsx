"use client"

import Link from "next/link"
import Image from "next/image"
import { TrendingUp, ChevronRight, MessageCircle, X, HelpCircle, Mail, Users } from "lucide-react"
import { useEffect, useState } from "react"

export default function LandingPage() {
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(false)

  useEffect(() => {
    const hasJoined = localStorage.getItem("joinedWhatsAppChannel")
    if (!hasJoined) {
      setShowWhatsAppPopup(true)
    }
  }, [])

  const handleJoin = () => {
    window.open("https://whatsapp.com/channel/0029VbBh1Yr4tRrntmwk9T3i", "_blank")
  }

  const handleJoined = () => {
    localStorage.setItem("joinedWhatsAppChannel", "true")
    setShowWhatsAppPopup(false)
  }

  const handleClose = () => {
    setShowWhatsAppPopup(false)
  }

  return (
    <div 
      className="min-h-screen flex flex-col relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/background.jpg')" }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/70 z-0" />

      {/* WhatsApp Popup (kept as is) */}
      {showWhatsAppPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-5 sm:p-6 md:p-8 max-w-md w-full border border-white/20 shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-end mb-2">
              <button onClick={handleClose} className="text-white/60 hover:text-white transition-colors p-1">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="text-center mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Welcome to Traderiser App! 🚀</h2>
              <p className="text-xs sm:text-sm text-white/70 mt-1">Your journey to smart trading starts here.</p>
            </div>

            {/* User Guide */}
            <div className="space-y-4 sm:space-y-5 mb-6 bg-white/5 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-white/10">
              <div className="flex items-center gap-2 text-yellow-400 mb-3">
                <HelpCircle className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
                <h3 className="font-bold text-white text-sm sm:text-base">How to Get Started</h3>
              </div>

              <ol className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-white/90">
                <li className="flex gap-2">
                  <span className="font-bold text-green-400 flex-shrink-0">1.</span>
                  <div>
                    <strong>Create a Traderiser Account</strong> first.
                    <br />
                    <span className="text-white/70 text-xs">This unlocks access to Traderiser, MT5, and more.</span>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-green-400 flex-shrink-0">2.</span>
                  <div>
                    <strong>Connect to MT5</strong> using your Traderiser account.
                    <br />
                    <span className="text-white/70 text-xs">No separate login needed.</span>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-green-400 flex-shrink-0">3.</span>
                  <div>
                    Choose between <strong>Traderiser</strong> or <strong>MT5</strong> trading interface.
                  </div>
                </li>
              </ol>

              <div className="mt-4 sm:mt-5 space-y-2 sm:space-y-3 text-xs text-white/70 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>
                    Report fraud: <a href="mailto:traderiserpro@gmail.com" className="text-green-400 underline">traderiserpro@gmail.com</a>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>For help, visit <strong>Customer Care</strong> in sidebar.</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">Join TRADERISER WhatsApp</h3>
              </div>

              <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                Stay connected with exclusive trading signals, real-time market updates, expert tips, and community insights.
                <br />
                <strong>10K+ Kenyan traders already rising together!</strong>
              </p>

              <ul className="text-xs text-white/70 space-y-1">
                <li>• Daily forex & crypto alerts</li>
                <li>• Live synthetic indices tips</li>
                <li>• MT5 & Robot strategy breakdowns</li>
                <li>• M-Pesa funding hacks</li>
              </ul>

              <div className="flex flex-col gap-2 sm:gap-3">
                <button
                  onClick={handleJoin}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base"
                >
                  <MessageCircle className="w-4 h-4" />
                  Join Channel Now
                </button>
                <button
                  onClick={handleJoined}
                  className="text-green-400 hover:text-green-300 font-semibold py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base border border-green-500/30"
                >
                  I Have Already Joined
                </button>
              </div>

              <p className="text-xs text-white/50 text-center mt-2 sm:mt-3">
                No spam – just value. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 sm:w-8 h-7 sm:h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5 text-black" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-white">Traderiser</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-white hover:text-white/80 transition-colors text-sm sm:text-base">
              Log in
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative z-10">
        <div className="w-full max-w-2xl space-y-8 sm:space-y-10 md:space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-10 sm:w-12 h-10 sm:h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">Traderiser App</h1>
            <p className="text-lg sm:text-xl text-white/80">Choose Your Trading Platform</p>
          </div>

          {/* Three Platform Cards */}
          <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
            <div className="flex flex-col gap-4 sm:gap-6">

              {/* === TRADERISER === */}
              <Link href="/login">
                <div className="group relative rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-orange-100 to-orange-50 hover:shadow-xl transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center overflow-hidden shadow-md bg-white/60">
                        <Image
                          src="/traderiser-logo-192.png"
                          alt="Traderiser"
                          width={96}
                          height={96}
                          className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Traderiser</h3>
                      <p className="text-gray-700 text-sm sm:text-base mt-1">
                        Trade on our powerful web terminal with Real & Demo accounts.
                      </p>
                    </div>
                    <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* === MT5 === */}
              <Link href="/mt5">
                <div className="group relative rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-blue-100 to-blue-50 hover:shadow-xl transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center overflow-hidden shadow-md bg-white/60">
                        <Image
                          src="/mt5.png"   // You can change this to an MT5 icon later
                          alt="MT5"
                          width={96}
                          height={96}
                          className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">MT5</h3>
                      <p className="text-gray-700 text-sm sm:text-base mt-1">
                        Connect with your Traderiser account and trade on MT5 (Real & Demo).
                      </p>
                    </div>
                    <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* === DERIV === */}
              <Link href="/login?type=deriv">
                <div className="group relative rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-emerald-100 to-emerald-50 hover:shadow-xl transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center overflow-hidden shadow-md bg-white/60">
                        <Image
                          src="/deriv-account-icon.png"
                          alt="Deriv Account"
                          width={96}
                          height={96}
                          className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Deriv</h3>
                      <p className="text-gray-700 text-sm sm:text-base mt-1">
                        Trade synthetic indices, forex & more on Deriv.
                      </p>
                    </div>
                    <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}