"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Lock, Shield, Smartphone } from "lucide-react"

const card = "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
const field = "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white mt-2"
const row = "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"

export default function SecuritySettings() {
  return (
    <div className="space-y-6">
      <Card className={card}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><Label htmlFor="currentPassword">Current Password</Label><Input id="currentPassword" type="password" className={field} /></div>
          <div><Label htmlFor="newPassword">New Password</Label><Input id="newPassword" type="password" className={field} /></div>
          <div><Label htmlFor="confirmPassword">Confirm Password</Label><Input id="confirmPassword" type="password" className={field} /></div>
          <Button className="bg-pink-600 hover:bg-pink-700 text-white">Update Password</Button>
        </CardContent>
      </Card>

      <Card className={card}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5" /> Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center justify-between p-4 rounded-lg border ${row}`}>
            <div>
              <p className="font-semibold">Authenticator App</p>
              <p className="text-sm text-slate-500 dark:text-zinc-400">Use an app like Google Authenticator</p>
            </div>
            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Disabled</Badge>
          </div>
          <Button className="bg-pink-600 hover:bg-pink-700 text-white">Enable 2FA</Button>
        </CardContent>
      </Card>

      <Card className={card}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { device: "Chrome on Windows", location: "New York, USA", lastActive: "2 minutes ago", current: true },
            { device: "Safari on iPhone", location: "New York, USA", lastActive: "1 hour ago", current: false },
            { device: "Chrome on MacBook", location: "San Francisco, USA", lastActive: "3 days ago", current: false },
          ].map((session, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${row}`}>
              <div>
                <p className="font-semibold">{session.device}</p>
                <p className="text-sm text-slate-500 dark:text-zinc-400">{session.location} • {session.lastActive}</p>
              </div>
              <div className="flex items-center gap-2">
                {session.current && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Current</Badge>}
                <Button variant="ghost" size="sm" className="text-red-500">Logout</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
