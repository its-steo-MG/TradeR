"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2, Gift } from "lucide-react";
import { toast } from "sonner";
import { getAccountData } from "@/lib/api-helpers";

export default function ReferralSection() {
  const [referralLink, setReferralLink] = useState<string>("");
  const [isMarketo, setIsMarketo] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getAccountData();
        setIsMarketo(data.user?.is_marketo || false);
        setReferralLink(data.user?.referral_link || "");
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
      </CardContent>
    </Card>
  );
}