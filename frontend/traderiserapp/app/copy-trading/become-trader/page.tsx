"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, Zap, DollarSign, CheckCircle2, AlertCircle, Trophy } from "lucide-react"
import { applyToBecomeTrader } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function BecomeTraderPage() {
  const [formData, setFormData] = useState({
    bio: "",
    risk_level: "",
    min_allocation: "",
    performance_fee: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await applyToBecomeTrader({
      bio: formData.bio,
      risk_level: formData.risk_level as "low" | "medium" | "high",
      min_allocation: Number(formData.min_allocation),
      performance_fee_percent: Number(formData.performance_fee),
    })

    setIsSubmitting(false)

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      setSubmitSuccess(true)
      toast({
        title: "Application Submitted!",
        description: "We'll review your application within 24-48 hours.",
      })
    }
  }

  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-700">
        <Card className="glass-card border-emerald-500/20">
          <CardContent className="p-12 text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Application Submitted!</h2>
              <p className="text-white/60 text-lg">
                Your application to become a signal provider is under review. We will notify you within 24-48 hours.
              </p>
            </div>
            <div className="flex gap-4 justify-center pt-4">
              <Button
                onClick={() => setSubmitSuccess(false)}
                variant="outline"
                className="border-white/10 hover:bg-white/5 bg-transparent"
              >
                Submit Another
              </Button>
              <Button className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm font-medium">
          <Trophy size={16} />
          <span>Become a Signal Provider</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Share Your <span className="text-gradient-pink">Trading Expertise</span>
        </h1>
        <p className="text-lg text-white/60 leading-relaxed max-w-2xl">
          Turn your trading skills into passive income. Allow others to copy your trades and earn performance fees on
          their profits.
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="glass-card border-white/5">
          <CardContent className="p-6 space-y-3">
            <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center">
              <DollarSign size={24} className="text-pink-400" />
            </div>
            <h3 className="font-bold text-lg">Earn Performance Fees</h3>
            <p className="text-sm text-white/60">
              Set your own fee structure and earn a percentage of subscriber profits
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5">
          <CardContent className="p-6 space-y-3">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Users size={24} className="text-blue-400" />
            </div>
            <h3 className="font-bold text-lg">Build Your Following</h3>
            <p className="text-sm text-white/60">
              Grow your reputation and attract subscribers with consistent results
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5">
          <CardContent className="p-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Zap size={24} className="text-emerald-400" />
            </div>
            <h3 className="font-bold text-lg">Automated System</h3>
            <p className="text-sm text-white/60">Your trades are automatically copied - no extra work required</p>
          </CardContent>
        </Card>
      </div>

      {/* Requirements */}
      <Alert className="bg-blue-500/10 border-blue-500/20">
        <Shield className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-white/80">
          <strong className="text-blue-400">Requirements:</strong> You must have a Standard or Pro-FX real account with
          a minimum balance of $500 and at least 30 days of trading history to apply.
        </AlertDescription>
      </Alert>

      {/* Application Form */}
      <Card className="glass-card border-white/5">
        <CardHeader>
          <CardTitle className="text-2xl">Application Form</CardTitle>
          <CardDescription className="text-white/60">
            Tell us about your trading strategy and set your parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-white/80">
                Trading Bio
              </Label>
              <Textarea
                id="bio"
                placeholder="Describe your trading strategy, experience, and approach to risk management..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="min-h-[120px] bg-black/40 border-white/10 focus:ring-pink-500/50 resize-none"
                required
              />
              <p className="text-xs text-white/40">This will be shown to potential subscribers</p>
            </div>

            {/* Risk Level */}
            <div className="space-y-2">
              <Label htmlFor="risk_level" className="text-white/80">
                Risk Level
              </Label>
              <Select
                value={formData.risk_level}
                onValueChange={(val) => setFormData({ ...formData, risk_level: val })}
              >
                <SelectTrigger id="risk_level" className="bg-black/40 border-white/10 focus:ring-pink-500/50">
                  <SelectValue placeholder="Select your strategy risk level" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-white">
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-emerald-400 border-emerald-400/30 bg-transparent text-xs"
                      >
                        Low
                      </Badge>
                      <span>Conservative, focus on capital preservation</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-amber-400 border-amber-400/30 bg-transparent text-xs">
                        Medium
                      </Badge>
                      <span>Balanced approach with moderate risk</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-rose-400 border-rose-400/30 bg-transparent text-xs">
                        High
                      </Badge>
                      <span>Aggressive, seeking maximum returns</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Allocation and Performance Fee in Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Min Allocation */}
              <div className="space-y-2">
                <Label htmlFor="min_allocation" className="text-white/80">
                  Minimum Allocation
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  <Input
                    id="min_allocation"
                    type="number"
                    min={100}
                    step={50}
                    value={formData.min_allocation}
                    onChange={(e) => setFormData({ ...formData, min_allocation: e.target.value })}
                    placeholder="100"
                    className="pl-8 bg-black/40 border-white/10 focus:ring-pink-500/50"
                    required
                  />
                </div>
                <p className="text-xs text-white/40">Minimum amount subscribers must allocate (min: $100)</p>
              </div>

              {/* Performance Fee */}
              <div className="space-y-2">
                <Label htmlFor="performance_fee" className="text-white/80">
                  Performance Fee
                </Label>
                <div className="relative">
                  <Input
                    id="performance_fee"
                    type="number"
                    min={0}
                    max={50}
                    step={5}
                    value={formData.performance_fee}
                    onChange={(e) => setFormData({ ...formData, performance_fee: e.target.value })}
                    placeholder="20"
                    className="pr-8 bg-black/40 border-white/10 focus:ring-pink-500/50"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">%</span>
                </div>
                <p className="text-xs text-white/40">Percentage of subscriber profits (0-50%)</p>
              </div>
            </div>

            {/* Warning */}
            <Alert className="bg-amber-500/10 border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <AlertDescription className="text-white/80">
                As a signal provider, you will be responsible for maintaining consistent trading performance. Your account
                may be reviewed periodically to ensure quality standards.
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 h-12 font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} className="mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Expected Timeline */}
      <Card className="glass-card border-white/5">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-4">What Happens Next?</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-pink-400">1</span>
              </div>
              <div>
                <h4 className="font-semibold">Application Review</h4>
                <p className="text-sm text-white/60">
                  Our team will review your trading history and performance (24-48 hours)
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-pink-400">2</span>
              </div>
              <div>
                <h4 className="font-semibold">Approval & Activation</h4>
                <p className="text-sm text-white/60">
                  Once approved, your profile will be listed in the trader leaderboard
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-pink-400">3</span>
              </div>
              <div>
                <h4 className="font-semibold">Start Earning</h4>
                <p className="text-sm text-white/60">
                  Begin trading normally - subscribers will copy your positions automatically
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
