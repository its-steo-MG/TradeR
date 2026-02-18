"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Lock, Shield, Smartphone } from "lucide-react"

export default function SecuritySettings() {
  return (
    <div className="space-y-6">
      {/* Password */}
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentPassword" className="text-slate-300">
              Current Password
            </Label>
            <Input
              id="currentPassword"
              type="password"
              className="bg-slate-700/30 border-slate-600/50 text-white mt-2"
            />
          </div>
          <div>
            <Label htmlFor="newPassword" className="text-slate-300">
              New Password
            </Label>
            <Input id="newPassword" type="password" className="bg-slate-700/30 border-slate-600/50 text-white mt-2" />
          </div>
          <div>
            <Label htmlFor="confirmPassword" className="text-slate-300">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              className="bg-slate-700/30 border-slate-600/50 text-white mt-2"
            />
          </div>
          <Button className="bg-pink-600 hover:bg-pink-700 text-white">Update Password</Button>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-700/30">
            <div>
              <p className="font-semibold text-white">Authenticator App</p>
              <p className="text-sm text-slate-400">Use an app like Google Authenticator</p>
            </div>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Disabled</Badge>
          </div>
          <Button className="bg-pink-600 hover:bg-pink-700 text-white">Enable 2FA</Button>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { device: "Chrome on Windows", location: "New York, USA", lastActive: "2 minutes ago", current: true },
            { device: "Safari on iPhone", location: "New York, USA", lastActive: "1 hour ago", current: false },
            { device: "Chrome on MacBook", location: "San Francisco, USA", lastActive: "3 days ago", current: false },
          ].map((session, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-slate-700/20 rounded-lg border border-slate-700/30"
            >
              <div>
                <p className="font-semibold text-white">{session.device}</p>
                <p className="text-sm text-slate-400">
                  {session.location} • {session.lastActive}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {session.current && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Current</Badge>
                )}
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                  Logout
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
