"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileHeader from "@/components/profile/profile-header";
import AccountSwitcher from "@/components/profile/account-switcher";
import TradingStats from "@/components/profile/trading-stats";
import AccountSettings from "@/components/profile/account-settings";
import SecuritySettings from "@/components/profile/security-settings";
import ReferralSection from "@/components/profile/referral-section";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <main className="relative min-h-screen text-foreground p-4 md:p-8 overflow-hidden">
      <div className="fixed inset-0 z-0 hidden dark:block">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-950/30 to-pink-950/20" />
      </div>
      <div className="fixed inset-0 z-0 block dark:hidden bg-gradient-to-br from-slate-50 via-white to-slate-100" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        <ProfileHeader />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <AccountSwitcher />
          </div>
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-6 mt-6">
                <TradingStats />
                <ReferralSection />
              </TabsContent>
              <TabsContent value="settings" className="space-y-6 mt-6">
                <AccountSettings />
              </TabsContent>
              <TabsContent value="security" className="space-y-6 mt-6">
                <SecuritySettings />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </main>
  );
}
