"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { TopNavbar } from "@/components/top-navbar";
import type { Account } from "@/types/account";

export default function KYCPage() {
  const router = useRouter();

  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Sidebar / TopNavbar state
  const [user, setUser] = useState<any>(null);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loginType, setLoginType] = useState<"real" | "demo">("real");

  // Load user + KYC status
  useEffect(() => {
    const loadData = async () => {
      try {
        const userSession = localStorage.getItem("user_session");
        const storedLoginType = localStorage.getItem("login_type") as "real" | "demo" | null;

        if (userSession) {
          const parsedUser = JSON.parse(userSession);
          setUser(parsedUser);
          setAccounts(parsedUser.accounts || []);
          
          const activeId = localStorage.getItem("active_account_id");
          const foundAccount = parsedUser.accounts?.find((acc: Account) => String(acc.id) === activeId) 
            || parsedUser.accounts?.[0];
          setActiveAccount(foundAccount || null);
        }

        if (storedLoginType) setLoginType(storedLoginType);

        // Fetch latest KYC status from backend
        const res = await api.getAccount();
        const latestUser = (res.data as any)?.user;
        if (latestUser?.kyc_status) {
          setKycStatus(latestUser.kyc_status);
        }
      } catch (error) {
        console.error("Failed to load KYC status");
      } finally {
        setIsLoadingStatus(false);
      }
    };

    loadData();
  }, []);

  const handleAccountSwitch = (account: Account) => {
    setActiveAccount(account);
    localStorage.setItem("active_account_id", String(account.id));
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  // Submit KYC
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idFile || !selfieFile) {
      toast.error("Please upload both ID and Selfie");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("id_document", idFile);
      formData.append("selfie", selfieFile);
      if (addressFile) formData.append("proof_of_address", addressFile);

      const response = await api.submitKYC(formData);

      if (response.error) {
        toast.error(response.error);
        return;
      }

      setKycStatus("pending");
      toast.success("KYC submitted successfully! We'll review it within 24-48 hours.");
    } catch (error) {
      toast.error("Failed to submit KYC. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoadingStatus) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <p className="text-white/70">Loading...</p>
      </div>
    );
  }

  // Already Approved
  if (kycStatus === "approved") {
    return (
      <div className="flex h-screen bg-black">
        <Sidebar loginType={loginType} activeAccount={activeAccount} accounts={accounts} />
        <div className="flex-1 flex flex-col">
          <TopNavbar
            isLoggedIn={true}
            user={user}
            accountBalance={Number(activeAccount?.balance) || 0}
            showBalance={true}
            activeAccount={activeAccount}
            accounts={accounts}
            onSwitchAccount={handleAccountSwitch}
            onLogout={handleLogout}
          />
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center border-white/10 bg-zinc-900">
              <CardContent className="pt-10 pb-10">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">KYC Approved</h2>
                <p className="text-white/70">Your identity has been verified. You now have full access.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Under Review (Pending)
  if (kycStatus === "pending") {
    return (
      <div className="flex h-screen bg-black">
        <Sidebar loginType={loginType} activeAccount={activeAccount} accounts={accounts} />
        <div className="flex-1 flex flex-col">
          <TopNavbar
            isLoggedIn={true}
            user={user}
            accountBalance={Number(activeAccount?.balance) || 0}
            showBalance={true}
            activeAccount={activeAccount}
            accounts={accounts}
            onSwitchAccount={handleAccountSwitch}
            onLogout={handleLogout}
          />
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center border-white/10 bg-zinc-900">
              <CardContent className="pt-10 pb-10">
                <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">KYC Under Review</h2>
                <p className="text-white/70">
                  Your documents have been submitted and are currently being reviewed. 
                  You will receive an email once the review is complete.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Default: Show Upload Form (for new or rejected users)
  return (
    <div className="flex h-screen bg-black">
      <Sidebar 
        loginType={loginType} 
        activeAccount={activeAccount} 
        accounts={accounts} 
        onSwitchAccount={handleAccountSwitch} 
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar
          isLoggedIn={true}
          user={user}
          accountBalance={Number(activeAccount?.balance) || 0}
          showBalance={true}
          activeAccount={activeAccount}
          accounts={accounts}
          onSwitchAccount={handleAccountSwitch}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white">Complete Your KYC</h1>
              <p className="text-white/70 mt-2">
                Submit your Proof of Identity to unlock full platform features and withdrawals.
              </p>
            </div>

            <Card className="border-white/10 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white">Upload Required Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* ID Upload */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Government Issued ID <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-dashed border-white/30 rounded-2xl p-6 text-center hover:border-amber-500/50 transition-colors">
                      <input type="file" accept="image/*,.pdf" onChange={(e) => setIdFile(e.target.files?.[0] || null)} className="hidden" id="id-upload" />
                      <label htmlFor="id-upload" className="cursor-pointer block">
                        <Upload className="w-8 h-8 mx-auto text-white/60 mb-2" />
                        <p className="text-white/80 text-sm">{idFile ? idFile.name : "Upload Passport or National ID"}</p>
                      </label>
                    </div>
                  </div>

                  {/* Selfie Upload */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Selfie Holding Your ID <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-dashed border-white/30 rounded-2xl p-6 text-center hover:border-amber-500/50 transition-colors">
                      <input type="file" accept="image/*" onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} className="hidden" id="selfie-upload" />
                      <label htmlFor="selfie-upload" className="cursor-pointer block">
                        <Upload className="w-8 h-8 mx-auto text-white/60 mb-2" />
                        <p className="text-white/80 text-sm">{selfieFile ? selfieFile.name : "Clear selfie while holding your ID"}</p>
                      </label>
                    </div>
                  </div>

                  {/* Optional Address */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Proof of Address (Optional)</label>
                    <div className="border border-dashed border-white/30 rounded-2xl p-6 text-center hover:border-amber-500/50 transition-colors">
                      <input type="file" accept="image/*,.pdf" onChange={(e) => setAddressFile(e.target.files?.[0] || null)} className="hidden" id="address-upload" />
                      <label htmlFor="address-upload" className="cursor-pointer block">
                        <Upload className="w-8 h-8 mx-auto text-white/60 mb-2" />
                        <p className="text-white/80 text-sm">{addressFile ? addressFile.name : "Utility bill or bank statement"}</p>
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!idFile || !selfieFile || isSubmitting}
                    className="w-full py-6 text-lg font-semibold bg-amber-600 hover:bg-amber-700"
                  >
                    {isSubmitting ? "Submitting..." : "Submit KYC Documents"}
                  </Button>

                  <p className="text-center text-xs text-white/50">
                    Your documents are encrypted and will be reviewed manually.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}