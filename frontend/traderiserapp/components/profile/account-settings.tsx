"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { getAccountData } from "@/lib/api-helpers"

interface UserData { username: string; email: string; phone?: string }

const card = "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
const field = "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white mt-2"

export default function AccountSettings() {
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    username: "", email: "", phone: "", currency: "usd", leverage: "1:100", notifications: true, alerts: true,
  })

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getAccountData()
        setFormData((prev) => ({
          ...prev,
          username: data.user.username || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
        }))
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  const handleSave = async () => console.log("Saving settings:", formData)

  if (loading) {
    return (
      <Card className={card}><CardContent className="pt-6"><div className="h-40 bg-slate-100 dark:bg-zinc-800 rounded-lg animate-pulse" /></CardContent></Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className={card}>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className={field} />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={field} />
            </div>
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={field} />
          </div>
          <Button onClick={handleSave} className="bg-pink-600 hover:bg-pink-700 text-white">Save Changes</Button>
        </CardContent>
      </Card>

      <Card className={card}>
        <CardHeader>
          <CardTitle>Trading Preferences</CardTitle>
          <CardDescription>Customize your trading experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Base Currency</Label>
            <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
              <SelectTrigger className={field}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
                <SelectItem value="usd">USD - US Dollar</SelectItem>
                <SelectItem value="eur">EUR - Euro</SelectItem>
                <SelectItem value="gbp">GBP - British Pound</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default Leverage</Label>
            <Select value={formData.leverage} onValueChange={(value) => setFormData({ ...formData, leverage: value })}>
              <SelectTrigger className={field}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
                <SelectItem value="1:50">1:50</SelectItem>
                <SelectItem value="1:100">1:100</SelectItem>
                <SelectItem value="1:200">1:200</SelectItem>
                <SelectItem value="1:500">1:500</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label>Trade Notifications</Label>
            <Switch checked={formData.notifications} onCheckedChange={(checked) => setFormData({ ...formData, notifications: checked })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Price Alerts</Label>
            <Switch checked={formData.alerts} onCheckedChange={(checked) => setFormData({ ...formData, alerts: checked })} />
          </div>
          <Button onClick={handleSave} className="bg-pink-600 hover:bg-pink-700 text-white">Save Preferences</Button>
        </CardContent>
      </Card>
    </div>
  )
}
