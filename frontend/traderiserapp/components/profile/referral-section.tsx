"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2, Gift, User, X } from "lucide-react";
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

interface ApiError {
  error?: string;
  message?: string;
  // Add other possible error fields from your backend if needed
}

export default function ReferralSection() {
  const [referralLink, setReferralLink] = useState<string>("");
  const [isMarketo, setIsMarketo] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);

  const [realName, setRealName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [pin, setPin] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);

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

  const fetchMpesaProfile = async () => {
    try {
      const token = localStorage.getItem("mpesa_access_token") || localStorage.getItem("access_token");
      if (!token) return;

      const res = await axios.get<MpesaProfile>(
        `${process.env.NEXT_PUBLIC_API_URL}/mpesa/profile/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const photoUrl = res.data.profile_photo;
      if (photoUrl) {
        const urlWithCacheBuster = `${photoUrl}?t=${Date.now()}`;
        setProfilePhotoUrl(urlWithCacheBuster);
        console.log("Profile photo URL loaded:", urlWithCacheBuster);
      }
    } catch (err) {
      console.error("Failed to fetch M-Pesa profile photo", err);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      setProfilePhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setProfilePhotoPreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearPhotoPreview = () => {
    setProfilePhotoFile(null);
    setProfilePhotoPreview(null);
  };

  const handleConnect = async () => {
    if (!realName.trim() || !phoneNumber.trim() || !profilePhotoFile || pin.length !== 4) {
      toast.error("Please fill all fields correctly (4-digit PIN required)");
      return;
    }

    setConnectLoading(true);

    try {
      const token = localStorage.getItem("mpesa_access_token") || localStorage.getItem("access_token");
      if (!token) throw new Error("No authentication token found");

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
        toast.success("M-Pesa connected successfully! Photo uploaded.");

        await fetchMpesaProfile();

        setIsConnected(true);
        setShowModal(false);

        // Reset form
        setRealName("");
        setPhoneNumber("");
        setProfilePhotoFile(null);
        setProfilePhotoPreview(null);
        setPin("");
      }
    } catch (err: unknown) {
      let errorMsg = "Failed to connect M-Pesa";

      if (axios.isAxiosError(err)) {
        const data = err.response?.data as ApiError | undefined;
        errorMsg = data?.error || data?.message || err.message || errorMsg;
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }

      toast.error(errorMsg);
    } finally {
      setConnectLoading(false);
    }
  };

  const openMpesaApp = () => {
    const url = process.env.NODE_ENV === "production"
      ? "https://mpesa-orpin-gamma.vercel.app/login"
      : "http://localhost:3001/login";
    window.open(url, "_blank");
  };

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join TradeRiser with my referral",
        text: "Check out TradeRiser!",
        url: referralLink,
      });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent("Join me on TradeRiser: " + referralLink)}`);
    }
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
                <DialogDescription>Enter your details</DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div>
                  <Label>Profile Photo</Label>
                  <div className="mt-2 flex flex-col items-center">
                    {profilePhotoPreview ? (
                      <div className="relative">
                        <img 
                          src={profilePhotoPreview} 
                          alt="Preview" 
                          className="w-28 h-28 rounded-full object-cover border-2 border-green-500" 
                        />
                        <button 
                          onClick={clearPhotoPreview} 
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-slate-700 flex items-center justify-center border border-dashed border-slate-500">
                        <User className="w-12 h-12 text-slate-400" />
                      </div>
                    )}
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoChange} 
                      className="mt-3 hidden" 
                      id="profilePhoto" 
                    />
                    <label 
                      htmlFor="profilePhoto" 
                      className="cursor-pointer text-green-400 hover:text-green-500 text-sm mt-2 underline"
                    >
                      {profilePhotoPreview ? "Change Photo" : "Upload Profile Photo"}
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="realName">Real Name</Label>
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
                  <Label htmlFor="pin">4-Digit PIN</Label>
                  <Input 
                    id="pin" 
                    type="password" 
                    maxLength={4} 
                    value={pin} 
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} 
                    className="mt-2 text-center tracking-widest text-lg" 
                    placeholder="••••" 
                  />
                </div>

                <Button 
                  onClick={handleConnect} 
                  disabled={connectLoading || !profilePhotoFile} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {connectLoading ? "Connecting..." : "Connect to M-Pesa"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col items-center gap-3">
              {profilePhotoUrl ? (
                <img 
                  src={profilePhotoUrl} 
                  alt="M-Pesa Profile" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-green-500 shadow-lg" 
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center border-2 border-green-500">
                  <User className="w-12 h-12 text-slate-400" />
                </div>
              )}
              <p className="text-green-400 font-medium">M-Pesa Connected Successfully!</p>
            </div>

            <Button onClick={openMpesaApp} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
              Open M-Pesa App
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}