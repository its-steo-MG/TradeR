"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2, Gift, MessageCircle, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { getAccountData } from "@/lib/api-helpers";
import { Label } from "@/components/ui/label";
import axios from "axios";

interface AccountData {
  user?: {
    is_marketo?: boolean;
    referral_link?: string;
    mpesa_connected?: boolean;
    messages_connected?: boolean;
    phone?: string;
  };
}

const card = "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800";
const field = "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white";

export default function ReferralSection() {
  const [referralLink, setReferralLink] = useState("");
  const [isMarketo, setIsMarketo] = useState(false);
  const [isMpesaConnected, setIsMpesaConnected] = useState(false);
  const [isMessagesConnected, setIsMessagesConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [realName, setRealName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [pin, setPin] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [mpesaPhoneForUrl, setMpesaPhoneForUrl] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data: AccountData = await getAccountData();
        setIsMarketo(data.user?.is_marketo || false);
        setReferralLink(data.user?.referral_link || "");
        setIsMpesaConnected(data.user?.mpesa_connected || false);
        setIsMessagesConnected(data.user?.messages_connected || false);
        setMpesaPhoneForUrl(data.user?.phone || "");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({ title: "Join TradeRiser with my referral", text: "Check out TradeRiser", url: referralLink }).catch(() => {
        window.open(`https://wa.me/?text=${encodeURIComponent("Join me on TradeRiser: " + referralLink)}`);
      });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent("Join me on TradeRiser: " + referralLink)}`);
    }
  };

  const handleConnect = async () => {
    if (!realName.trim() || !phoneNumber.trim() || !profilePhotoFile || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error("Please enter valid real name, phone number, photo, and 4-digit PIN");
      return;
    }
    setConnectLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No authentication token found. Please log in again.");
      const formData = new FormData();
      formData.append("real_name", realName.trim());
      formData.append("phone_number", phoneNumber.trim());
      formData.append("profile_photo", profilePhotoFile);
      formData.append("pin", pin);
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/mpesa/connect/`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      if (response.status === 200) {
        toast.success("M-Pesa connected successfully!");
        setIsMpesaConnected(true);
        setMpesaPhoneForUrl(phoneNumber.trim());
        setShowForm(false);
        const updatedData: AccountData = await getAccountData();
        setIsMpesaConnected(updatedData.user?.mpesa_connected || false);
        setIsMessagesConnected(updatedData.user?.messages_connected || false);
      }
    } catch (err: unknown) {
      const errorMsg = axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : (err as Error).message || "Failed to connect.";
      toast.error(errorMsg);
    } finally {
      setConnectLoading(false);
    }
  };

  const openMpesaApp = () => {
    let url = "https://mpesa-orpin-gamma.vercel.app/login";
    if (mpesaPhoneForUrl) url += `?phone=${encodeURIComponent(mpesaPhoneForUrl)}`;
    window.open(url, "_blank");
  };
  const openMessagesApp = () => {
    let url = "https://messages-apktrader.vercel.app";
    if (mpesaPhoneForUrl) url += `?phone=${encodeURIComponent(mpesaPhoneForUrl)}`;
    window.open(url, "_blank");
  };
  const connectMessages = async () => {
    setConnectLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No token");
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/mpesa-notif/connect/`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setIsMessagesConnected(true);
    } catch {
      toast.info("Opening Messages App...");
    } finally {
      setConnectLoading(false);
      openMessagesApp();
    }
  };

  if (loading || !isMarketo || !referralLink) return null;

  return (
    <Card className={card}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gift className="w-5 h-5 text-pink-500" /> Your Referral Link</CardTitle>
        <CardDescription>Share this link with friends and earn rewards when they sign up</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input readOnly value={referralLink} className={`${field} font-mono text-sm`} />
          <Button onClick={copyLink} size="icon" className="shrink-0 bg-pink-600 text-white"><Copy className="w-4 h-4" /></Button>
          <Button onClick={shareLink} size="icon" className="shrink-0 bg-pink-600 text-white"><Share2 className="w-4 h-4" /></Button>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">Anyone who signs up using this link will be associated with your MarketO account.</p>

        {!isMpesaConnected ? (
          <div className="mt-4 space-y-3">
            <Button onClick={() => setShowForm((v) => !v)} className="w-full bg-pink-600 hover:bg-pink-700 text-white">
              {showForm ? <><X className="w-4 h-4" /> Cancel</> : <>Connect to M-Pesa App <ChevronDown className="w-4 h-4" /></>}
            </Button>
            {showForm && (
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 p-5 space-y-4">
                <h3 className="font-semibold">Connect to M-Pesa</h3>
                <div>
                  <Label htmlFor="realName">Real Name (as in M-Pesa)</Label>
                  <Input id="realName" value={realName} onChange={(e) => setRealName(e.target.value)} className={`${field} mt-2`} placeholder="Enter your full name" />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">M-Pesa Phone Number</Label>
                  <Input id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))} className={`${field} mt-2`} placeholder="e.g. 254712345678" maxLength={15} />
                </div>
                <div>
                  <Label htmlFor="profilePhoto">Profile Photo</Label>
                  <Input id="profilePhoto" type="file" accept="image/*" onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)} className={`${field} mt-2`} />
                </div>
                <div>
                  <Label htmlFor="pin">4-Digit PIN</Label>
                  <Input id="pin" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} className={`${field} mt-2 text-center tracking-widest`} placeholder="••••" />
                </div>
                <Button onClick={handleConnect} disabled={connectLoading} className="w-full bg-pink-600 hover:bg-pink-700 text-white">
                  {connectLoading ? "Connecting..." : "Connect"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            <p className="text-emerald-600 dark:text-emerald-400 font-medium text-center">M-Pesa Connected Successfully!</p>
            <Button onClick={openMpesaApp} className="w-full bg-pink-600 hover:bg-pink-700 text-white">Login to M-Pesa App</Button>
            {!isMessagesConnected ? (
              <Button onClick={connectMessages} disabled={connectLoading} className="w-full bg-slate-900 dark:bg-zinc-800 text-white">
                <MessageCircle className="w-5 h-5 mr-2" /> {connectLoading ? "Connecting..." : "Connect to Messages"}
              </Button>
            ) : (
              <Button onClick={openMessagesApp} className="w-full bg-slate-900 dark:bg-zinc-800 text-white">
                <MessageCircle className="w-5 h-5 mr-2" /> Open Messages
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
