"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2, Gift } from "lucide-react";
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

export default function ReferralSection() {
  const [referralLink, setReferralLink] = useState<string>("");
  const [isMarketo, setIsMarketo] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [realName, setRealName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);  // ← CHANGED: File instead of URL string
  const [pin, setPin] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getAccountData();
        setIsMarketo(data.user?.is_marketo || false);
        setReferralLink(data.user?.referral_link || "");
        setIsConnected(data.user?.mpesa_connected || false);
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
      navigator.share({
        title: "Join TradeRiser with my referral",
        text: "Check out TradeRiser - a great trading platform!",
        url: referralLink,
      });
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent("Join me on TradeRiser: " + referralLink)}`
      );
    }
  };

  const handleConnect = async () => {
    if (!realName.trim() || !phoneNumber.trim() || !profilePhotoFile || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error("Please enter valid real name, phone number, select a profile photo, and 4-digit PIN");
      return;
    }

    setConnectLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("real_name", realName.trim());
      formData.append("phone_number", phoneNumber.trim());
      formData.append("profile_photo", profilePhotoFile);  // ← NEW: Send file
      formData.append("pin", pin);

      // Use full backend URL from environment variable
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/mpesa/connect/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",  // ← Important for file upload
          },
        }
      );

      if (response.status === 200) {
        toast.success("M-Pesa connected successfully!");
        setIsConnected(true);
        setShowModal(false);
        setRealName("");
        setPhoneNumber("");
        setProfilePhotoFile(null);
        setPin("");

        // Refetch to confirm the new status
        const updatedData = await getAccountData();
        setIsConnected(updatedData.user?.mpesa_connected || false);
      }
    } catch (err: any) {
      console.error("Failed to connect M-Pesa:", err);
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        "Failed to connect. Please try again or check your connection.";
      toast.error(errorMsg);
    } finally {
      setConnectLoading(false);
    }
  };

  const openMpesaApp = () => {
    // Replace with your actual deployed M-Pesa app URL
    // For local dev you can use: http://localhost:3001/login (if separate Next.js app)
    //window.open(" http://localhost:3001/login", "_blank");
    window.open(" https://mpesa-orpin-gamma.vercel.app/login", "_blank");
    

  };

  if (loading || !isMarketo || !referralLink) return null;

  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-pink-400" />
          Your Referral Link
        </CardTitle>
        <CardDescription>
          Share this link with friends and earn rewards when they sign up
        </CardDescription>
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
        <p className="text-xs text-slate-400">
          Anyone who signs up using this link will be associated with your MarketO account.
        </p>

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
                  <Label htmlFor="realName" className="text-slate-300">
                    Real Name (as in M-Pesa)
                  </Label>
                  <Input
                    id="realName"
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                    className="bg-slate-700/30 border-slate-600/50 text-white mt-2"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber" className="text-slate-300">
                    M-Pesa Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    className="bg-slate-700/30 border-slate-600/50 text-white mt-2"
                    placeholder="e.g. 254123456789"
                    maxLength={15}
                  />
                </div>
                <div>
                  <Label htmlFor="profilePhoto" className="text-slate-300">
                    Profile Photo
                  </Label>
                  <Input
                    id="profilePhoto"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)}  // ← NEW: Handle file selection
                    className="bg-slate-700/30 border-slate-600/50 text-white mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="pin" className="text-slate-300">
                    4-Digit PIN
                  </Label>
                  <Input
                    id="pin"
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="bg-slate-700/30 border-slate-600/50 text-white mt-2 text-center tracking-widest"
                    placeholder="••••"
                  />
                </div>
                <Button
                  onClick={handleConnect}
                  disabled={connectLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {connectLoading ? "Connecting..." : "Connect"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="space-y-2 mt-4">
            <p className="text-green-400 font-medium">M-Pesa Connected Successfully!</p>
            <Button
              onClick={openMpesaApp}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              Login to M-Pesa App
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}