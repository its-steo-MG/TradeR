"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileHeader from "@/components/profile/profile-header";
import AccountSwitcher from "@/components/profile/account-switcher";
import TradingStats from "@/components/profile/trading-stats";
import AccountSettings from "@/components/profile/account-settings";
import SecuritySettings from "@/components/profile/security-settings";
import ReferralSection from "@/components/profile/referral-section"; // ← new import

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <main className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <ProfileHeader />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <AccountSwitcher />
          </div>

          {/* Main Panel */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700/50">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <TradingStats />
                <ReferralSection /> {/* ← added here – only renders if is_marketo */}
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