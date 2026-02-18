// components/agents/agent-grid.tsx
"use client"

import AgentCard from "./agent-card"  // Correct: default import

interface Agent {
  id: number
  name: string
  method: string
  location: string
  rating: number
  reviews: number
  deposit_rate_kes_to_usd: number
  withdrawal_rate_usd_to_kes: number
  min_amount?: number
  max_amount?: number
  response_time?: string
  verified: boolean
  image?: string
  instructions?: string
}

interface AgentGridProps {
  agents: Agent[]
  loading: boolean
}

export default function AgentGrid({ agents, loading }: AgentGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-200 rounded-2xl h-96 animate-pulse" />
        ))}
      </div>
    )
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-12 sm:py-16">
        <p className="text-slate-500 text-base sm:text-lg">No agents found. Try adjusting your filters.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  )
}