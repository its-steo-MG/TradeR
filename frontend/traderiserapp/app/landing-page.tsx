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
    <div className="min-h-screen flex flex-col relative">
      {/* Enhanced WhatsApp + User Guide Popup - responsive modal */}
      {showWhatsAppPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-5 sm:p-6 md:p-8 max-w-md w-full border border-white/20 shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <div className="flex justify-end mb-2">
              <button onClick={handleClose} className="text-white/60 hover:text-white transition-colors p-1">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* === WELCOME HEADER === */}
            <div className="text-center mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Welcome to Traderiser Pro! 🚀</h2>
              <p className="text-xs sm:text-sm text-white/70 mt-1">Your journey to smart trading starts here.</p>
            </div>

            {/* === USER GUIDE SECTION === */}
            <div className="space-y-4 sm:space-y-5 mb-6 bg-white/5 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-white/10">
              <div className="flex items-center gap-2 text-yellow-400 mb-3">
                <HelpCircle className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
                <h3 className="font-bold text-white text-sm sm:text-base">How to Get Started</h3>
              </div>

              <ol className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-white/90">
                <li className="flex gap-2">
                  <span className="font-bold text-green-400 flex-shrink-0">1.</span>
                  <div>
                    <strong>Create a Real Account</strong> first.
                    <br />
                    <span className="text-white/70 text-xs">This is required to unlock all features.</span>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-green-400 flex-shrink-0">2.</span>
                  <div>
                    <strong>Access Demo Account</strong> automatically.
                    <br />
                    <span className="text-white/70 text-xs">You will get $10,000 virtual balance to practice.</span>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-green-400 flex-shrink-0">3.</span>
                  <div>
                    <strong>Log in to Demo using Real Account</strong>.<br />
                    <span className="text-white/70 text-xs">Same email & password for both.</span>
                  </div>
                </li>
              </ol>

              {/* Support Info */}
              <div className="mt-4 sm:mt-5 space-y-2 sm:space-y-3 text-xs text-white/70 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>
                    Report fraud:{" "}
                    <a href="mailto:traderiserpro@gmail.com" className="text-green-400 underline">
                      traderiserpro@gmail.com
                    </a>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>
                    For help, visit <strong>Customer Care</strong> in sidebar.
                  </span>
                </div>
              </div>
            </div>

            {/* === WHATSAPP CHANNEL SECTION === */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">Join TRADERISER WhatsApp</h3>
              </div>

              <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                Stay connected with exclusive trading signals, real-time market updates, expert tips, and community
                insights to supercharge your trades on TradeRiser Pro.
                <br />
                <strong>10K+ Kenyan traders already rising together!</strong>
              </p>

              <ul className="text-xs text-white/70 space-y-1">
                <li>• Daily forex & crypto alerts</li>
                <li>• Live synthetic indices tips</li>
                <li>• Robot strategy breakdowns</li>
                <li>• M-Pesa funding hacks</li>
              </ul>

              {/* Buttons */}
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

      {/* Header - responsive header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
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

      {/* Main Content - responsive hero and cards */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-2xl space-y-8 sm:space-y-10 md:space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-10 sm:w-12 h-10 sm:h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">Traderiser</h1>
            <p className="text-lg sm:text-xl text-white/80">Choose Your Journey</p>
          </div>

          <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
            <div className="flex flex-col gap-4 sm:gap-6 md:gap-10">
              {/* Real Account Card */}
              <Link href="/login?type=real">
                <div className="group relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-gradient-to-br from-orange-100 to-orange-50 hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center overflow-hidden shadow-md bg-white/50">
                        <Image
                          src="/real-account-icon.png"
                          alt="Real Account"
                          width={64}
                          height={64}
                          className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900">Real Account</h3>
                      <p className="text-gray-700 text-xs sm:text-sm mt-1">
                        Trade with real money and earn real profits.
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900 flex-shrink-0 group-hover:translate-x-1 transition-transform hidden sm:block" />
                  </div>
                </div>
              </Link>

              {/* Demo Account Card */}
              <Link href="/login?type=demo">
                <div className="group relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-gradient-to-br from-blue-100 to-blue-50 hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center overflow-hidden shadow-md bg-white/50">
                        <Image
                          src="/demo-account-icon.png"
                          alt="Demo Account"
                          width={64}
                          height={64}
                          className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900">Demo Account</h3>
                      <p className="text-gray-700 text-xs sm:text-sm mt-1">
                        Practice trading with $10,000 virtual balance.
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900 flex-shrink-0 group-hover:translate-x-1 transition-transform hidden sm:block" />
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
