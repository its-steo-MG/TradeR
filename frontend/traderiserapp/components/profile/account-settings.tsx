"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { getAccountData } from "@/lib/api-helpers"

interface UserData {
  username: string
  email: string
  phone?: string
}

export default function AccountSettings() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    currency: "usd",
    leverage: "1:100",
    notifications: true,
    alerts: true,
  })

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getAccountData()
        setUser(data.user)
        setFormData((prev) => ({
          ...prev,
          username: data.user.username || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
        }))
      } catch (error) {
        console.error("[v0] Failed to fetch user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleSave = async () => {
    console.log("[v0] Saving settings:", formData)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="pt-6">
            <div className="h-40 bg-slate-700/30 rounded-lg animate-pulse" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username" className="text-slate-300">
                Username
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-slate-700/30 border-slate-600/50 text-white mt-2"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-slate-300">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-700/30 border-slate-600/50 text-white mt-2"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="phone" className="text-slate-300">
              Phone Number
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="bg-slate-700/30 border-slate-600/50 text-white mt-2"
            />
          </div>
          <Button onClick={handleSave} className="bg-pink-600 hover:bg-pink-700 text-white">
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Trading Preferences */}
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader>
          <CardTitle>Trading Preferences</CardTitle>
          <CardDescription>Customize your trading experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currency" className="text-slate-300">
              Base Currency
            </Label>
            <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
              <SelectTrigger className="bg-slate-700/30 border-slate-600/50 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="usd">USD - US Dollar</SelectItem>
                <SelectItem value="eur">EUR - Euro</SelectItem>
                <SelectItem value="gbp">GBP - British Pound</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="leverage" className="text-slate-300">
              Default Leverage
            </Label>
            <Select value={formData.leverage} onValueChange={(value) => setFormData({ ...formData, leverage: value })}>
              <SelectTrigger className="bg-slate-700/30 border-slate-600/50 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="1:50">1:50</SelectItem>
                <SelectItem value="1:100">1:100</SelectItem>
                <SelectItem value="1:200">1:200</SelectItem>
                <SelectItem value="1:500">1:500</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="notifications" className="text-slate-300">
              Trade Notifications
            </Label>
            <Switch
              id="notifications"
              checked={formData.notifications}
              onCheckedChange={(checked) => setFormData({ ...formData, notifications: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="alerts" className="text-slate-300">
              Price Alerts
            </Label>
            <Switch
              id="alerts"
              checked={formData.alerts}
              onCheckedChange={(checked) => setFormData({ ...formData, alerts: checked })}
            />
          </div>
          <Button onClick={handleSave} className="bg-pink-600 hover:bg-pink-700 text-white">
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
