
"use client"

import { Zap } from "lucide-react"
import { motion } from "framer-motion"



interface TradeExecutionBadgeProps {
  activeTradesCount: number
  onClick: () => void
}

export function TradeExecutionBadge({ activeTradesCount, onClick }: TradeExecutionBadgeProps) {
  if (activeTradesCount === 0) return null

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      onClick={onClick}
      className="fixed bottom-8 right-8 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      >
        <Zap className="w-5 h-5" />
      </motion.div>
      <span className="text-sm">{activeTradesCount} Active</span>
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
      />
    </motion.button>
  )
}
