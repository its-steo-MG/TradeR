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

export default function ReferralSection() {
  const [referralLink, setReferralLink] = useState<string>("");
  const [isMarketo, setIsMarketo] = useState<boolean>(false);
  const [isMpesaConnected, setIsMpesaConnected] = useState<boolean>(false);
  const [isMessagesConnected, setIsMessagesConnected] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);

  // M-Pesa form states
  const [realName, setRealName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [pin, setPin] = useState<string>("");
  const [showForm, setShowForm] = useState<boolean>(false);

  const [mpesaPhoneForUrl, setMpesaPhoneForUrl] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data: AccountData = await getAccountData();
        setIsMarketo(data.user?.is_marketo || false);
        setReferralLink(data.user?.referral_link || "");
        setIsMpesaConnected(data.user?.mpesa_connected || false);
        setIsMessagesConnected(data.user?.messages_connected || false);
        setMpesaPhoneForUrl(data.user?.phone || "");
      } catch (err) {
        console.error("Failed to fetch referral data", err);
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
      navigator
        .share({
          title: "Join TradeRiser with my referral",
          text: "Check out TradeRiser - a great trading platform!",
          url: referralLink,
        })
        .catch(() => {
          window.open(
            `https://wa.me/?text=${encodeURIComponent("Join me on TradeRiser: " + referralLink)}`
          );
        });
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent("Join me on TradeRiser: " + referralLink)}`
      );
    }
  };

  const handleConnect = async () => {
    if (
      !realName.trim() ||
      !phoneNumber.trim() ||
      !profilePhotoFile ||
      pin.length !== 4 ||
      !/^\d{4}$/.test(pin)
    ) {
      toast.error(
        "Please enter valid real name, phone number, select a profile photo, and 4-digit PIN"
      );
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

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/mpesa/connect/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

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
      console.error("Failed to connect M-Pesa:", err);
      const errorMsg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : (err as Error).message || "Failed to connect. Please try again.";
      toast.error(errorMsg);
    } finally {
      setConnectLoading(false);
    }
  };

  const openMpesaApp = () => {
    let url = "https://mpesa-orpin-gamma.vercel.app/login";
    if (mpesaPhoneForUrl) {
      url += `?phone=${encodeURIComponent(mpesaPhoneForUrl)}`;
    }
    window.open(url, "_blank");
  };

  const openMessagesApp = () => {
    let url = "https://messages-apktrader.vercel.app";
    if (mpesaPhoneForUrl) {
      url += `?phone=${encodeURIComponent(mpesaPhoneForUrl)}`;
    }
    window.open(url, "_blank");
  };

  const connectMessages = async () => {
    setConnectLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No token");

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/mpesa-notif/connect/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Opening Messages App...");
      setIsMessagesConnected(true);
    } catch (err) {
      console.error(err);
      toast.info("Opening Messages App...");
    } finally {
      setConnectLoading(false);
      openMessagesApp();
    }
  };

  if (loading || !isMarketo || !referralLink) return null;

  return (
    <Card className="liquid-glass border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Gift className="w-5 h-5 text-pink-400" />
          Your Referral Link
        </CardTitle>
        <CardDescription className="text-white/70">
          Share this link with friends and earn rewards when they sign up
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            readOnly
            value={referralLink}
            className="bg-white/10 border-white/20 text-white font-mono text-sm placeholder:text-white/40"
          />
          <Button onClick={copyLink} size="icon" className="btn-liquid shrink-0">
            <Copy className="w-4 h-4" />
          </Button>
          <Button onClick={shareLink} size="icon" className="btn-liquid shrink-0">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-white/60">
          Anyone who signs up using this link will be associated with your MarketO account.
        </p>

        {/* M-Pesa + Messages Section */}
        {!isMpesaConnected ? (
          <div className="mt-4 space-y-3">
            {/* Toggle button */}
            <Button
              onClick={() => setShowForm((v) => !v)}
              className="w-full btn-liquid-primary text-white flex items-center justify-center gap-2"
            >
              {showForm ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  Connect to M-Pesa App
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </Button>

            {/* Expandable inline form card */}
            {showForm && (
              <div className="liquid-glass ios-notification-card p-5 space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="relative z-10">
                  <h3 className="text-title text-white mb-1">Connect to M-Pesa</h3>
                  <p className="text-sm text-white/70">
                    Enter your details to connect your M-Pesa account.
                  </p>
                </div>

                <div className="space-y-4 relative z-10">
                  <div>
                    <Label htmlFor="realName" className="text-slate-200">
                      Real Name (as in M-Pesa)
                    </Label>
                    <Input
                      id="realName"
                      value={realName}
                      onChange={(e) => setRealName(e.target.value)}
                      className="bg-white/10 border-white/20 text-white mt-2 placeholder:text-white/40"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber" className="text-slate-200">
                      M-Pesa Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      className="bg-white/10 border-white/20 text-white mt-2 placeholder:text-white/40"
                      placeholder="e.g. 254712345678"
                      maxLength={15}
                    />
                  </div>

                  <div>
                    <Label htmlFor="profilePhoto" className="text-slate-200">
                      Profile Photo
                    </Label>
                    <Input
                      id="profilePhoto"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)}
                      className="bg-white/10 border-white/20 text-white mt-2 file:bg-white/20 file:text-white file:border-0 file:rounded file:px-3 file:py-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pin" className="text-slate-200">
                      4-Digit PIN
                    </Label>
                    <Input
                      id="pin"
                      type="password"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                      className="bg-white/10 border-white/20 text-white mt-2 text-center tracking-widest placeholder:text-white/40"
                      placeholder="••••"
                    />
                  </div>

                  <Button
                    onClick={handleConnect}
                    disabled={connectLoading}
                    className="w-full btn-liquid-primary text-white"
                  >
                    {connectLoading ? "Connecting..." : "Connect"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            <p className="text-profit font-medium text-center">
              ✅ M-Pesa Connected Successfully!
            </p>

            <Button onClick={openMpesaApp} className="w-full btn-liquid-primary text-white">
              Login to M-Pesa App
            </Button>

            {!isMessagesConnected ? (
              <Button
                onClick={connectMessages}
                disabled={connectLoading}
                className="w-full btn-liquid text-white flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                {connectLoading ? "Connecting..." : "Connect to Messages"}
              </Button>
            ) : (
              <Button
                onClick={openMessagesApp}
                className="w-full btn-liquid text-white flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Open Messages
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
