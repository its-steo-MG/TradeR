"use client"

import { Search, ChevronDown } from "lucide-react"

interface AgentFiltersProps {
  selectedMethod: string | null
  onMethodChange: (method: string | null) => void
  sortBy: string
  onSortChange: (sort: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export default function AgentFilters({
  selectedMethod,
  onMethodChange,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
}: AgentFiltersProps) {
  const methods = [
    { id: "mpesa", label: "M-Pesa" },
    { id: "paypal", label: "PayPal" },
    { id: "bank", label: "Bank Transfer" },
  ]

  return (
    <div className="space-y-4 sm:space-y-6 mb-8">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search agents by name or location..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all text-sm sm:text-base text-slate-900 placeholder-slate-500"
        />
      </div>

      {/* Payment Method Filter - Responsive Grid */}
      <div>
        <p className="text-xs sm:text-sm font-semibold text-slate-900 mb-2 sm:mb-3">Payment Method</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          <button
            onClick={() => onMethodChange(null)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border-2 transition-all font-medium text-xs sm:text-sm ${
              selectedMethod === null
                ? "border-purple-600 bg-purple-50 text-purple-600"
                : "border-slate-200 bg-white text-slate-600 hover:border-purple-300"
            }`}
          >
            All
          </button>
          {methods.map((method) => (
            <button
              key={method.id}
              onClick={() => onMethodChange(method.id)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border-2 transition-all font-medium text-xs sm:text-sm whitespace-nowrap ${
                selectedMethod === method.id
                  ? "border-purple-600 bg-purple-50 text-purple-600"
                  : "border-slate-200 bg-white text-slate-600 hover:border-purple-300"
              }`}
            >
              {method.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <span className="text-xs sm:text-sm font-semibold text-slate-900">Sort by:</span>
        <div className="relative w-full sm:w-auto">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="appearance-none w-full sm:w-48 px-4 py-2 sm:py-2.5 pr-8 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-all cursor-pointer"
          >
            <option value="rate">Best Rate</option>
            <option value="rating">Highest Rating</option>
            <option value="reviews">Most Reviews</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}
