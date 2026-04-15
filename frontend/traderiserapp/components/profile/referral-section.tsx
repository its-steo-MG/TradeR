"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2, Gift, User } from "lucide-react";
import { toast } from "sonner";
import { getAccountData } from "@/lib/api-helpers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import axios from "axios";

interface AccountData {
  user?: {
    is_marketo?: boolean;
    referral_link?: string;
    mpesa_connected?: boolean;
  };
}

interface MpesaProfile {
  real_name: string;
  phone_number: string;
  balance: string;
  fuliza: string;
  profile_photo: string | null;
}

// Proper error type for axios errors
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

export default function ReferralSection() {
  const [referralLink, setReferralLink] = useState<string>("");
  const [isMarketo, setIsMarketo] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);

  // Form states
  const [realName, setRealName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [pin, setPin] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);

  // Fetch basic account data + M-Pesa profile if connected
  const fetchUserData = async () => {
    try {
      const data: AccountData = await getAccountData();
      setIsMarketo(data.user?.is_marketo || false);
      setReferralLink(data.user?.referral_link || "");
      setIsConnected(data.user?.mpesa_connected || false);

      if (data.user?.mpesa_connected) {
        await fetchMpesaProfile();
      }
    } catch (err) {
      console.error("Failed to fetch user data", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full M-Pesa profile (includes S3 photo URL)
  const fetchMpesaProfile = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const res = await axios.get<MpesaProfile>(
        `${process.env.NEXT_PUBLIC_API_URL}/mpesa/profile/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.profile_photo) {
        setProfilePhotoUrl(res.data.profile_photo);
      }
    } catch (err) {
      console.error("Failed to fetch M-Pesa profile photo", err);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join TradeRiser with my referral",
        text: "Check out TradeRiser - a great trading platform!",
        url: referralLink,
      }).catch(() => {
        window.open(`https://wa.me/?text=${encodeURIComponent("Join me on TradeRiser: " + referralLink)}`);
      });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent("Join me on TradeRiser: " + referralLink)}`);
    }
  };

  const handleConnect = async () => {
    if (!realName.trim() || !phoneNumber.trim() || !profilePhotoFile || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error("Please fill all fields correctly");
      return;
    }

    setConnectLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No token found");

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
        setIsConnected(true);
        setShowModal(false);

        // Clear form
        setRealName("");
        setPhoneNumber("");
        setProfilePhotoFile(null);
        setPin("");

        // Immediately fetch the new profile photo from S3
        await fetchMpesaProfile();
      }
    } catch (err: unknown) {
      console.error(err);
      
      const apiError = err as ApiError;
      const errorMsg = 
        apiError.response?.data?.error || 
        apiError.message || 
        "Failed to connect M-Pesa";

      toast.error(errorMsg);
    } finally {
      setConnectLoading(false);
    }
  };

  const openMpesaApp = () => {
    // Change this to your production URL when deploying
    const url = process.env.NODE_ENV === "production"
      ? "https://mpesa-orpin-gamma.vercel.app/login"
      : "http://localhost:3000/login";
    
    window.open(url, "_blank");
  };

  if (loading || !isMarketo || !referralLink) return null;

  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-pink-400" />
          Your Referral Link
        </CardTitle>
        <CardDescription>Share this link with friends and earn rewards</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Referral Link */}
        <div className="flex gap-2">
          <Input 
            readOnly 
            value={referralLink} 
            className="bg-slate-700/30 border-slate-600/50 text-white font-mono text-sm" 
          />
          <Button onClick={copyLink} size="icon" variant="outline">
            <Copy className="w-4 h-4" />
          </Button>
          <Button onClick={shareLink} size="icon" variant="outline">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* M-Pesa Connect Section */}
        {!isConnected ? (
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogTrigger asChild>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white mt-4">
                Connect to M-Pesa App
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Connect to M-Pesa</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Enter your details to connect your M-Pesa account.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="realName">Real Name (as in M-Pesa)</Label>
                  <Input 
                    id="realName" 
                    value={realName} 
                    onChange={(e) => setRealName(e.target.value)} 
                    className="mt-2" 
                    placeholder="Enter your full name" 
                  />
                </div>

                <div>
                  <Label htmlFor="phoneNumber">M-Pesa Phone Number</Label>
                  <Input 
                    id="phoneNumber" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))} 
                    className="mt-2" 
                    placeholder="2547xxxxxxxx" 
                  />
                </div>

                <div>
                  <Label htmlFor="profilePhoto">Profile Photo</Label>
                  <Input 
                    id="profilePhoto" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)} 
                    className="mt-2" 
                  />
                </div>

                <div>
                  <Label htmlFor="pin">4-Digit PIN</Label>
                  <Input 
                    id="pin" 
                    type="password" 
                    maxLength={4} 
                    value={pin} 
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} 
                    className="mt-2 text-center tracking-widest" 
                    placeholder="••••" 
                  />
                </div>

                <Button 
                  onClick={handleConnect} 
                  disabled={connectLoading} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {connectLoading ? "Connecting..." : "Connect"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col items-center gap-3">
              {/* Profile Photo from S3 */}
              {profilePhotoUrl ? (
                <img 
                  src={profilePhotoUrl} 
                  alt="M-Pesa Profile" 
                  className="w-20 h-20 rounded-full object-cover border-2 border-green-500" 
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center">
                  <User className="w-10 h-10 text-slate-400" />
                </div>
              )}

              <p className="text-green-400 font-medium text-center">
                M-Pesa Connected Successfully!
              </p>
            </div>

            <Button 
              onClick={openMpesaApp} 
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              Open M-Pesa App
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}