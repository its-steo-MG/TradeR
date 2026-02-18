// app/suspended/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Clock, Upload, Send } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface SuspensionDetails {
  type: 'temporary' | 'permanent';
  reason: string;
  until?: string;
  evidenceStatus?: string;
  appealAvailable: boolean;
}

export default function SuspendedPage() {
  const router = useRouter();
  const [details, setDetails] = useState<SuspensionDetails | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isAppealing, setIsAppealing] = useState(false);
  const [appealDesc, setAppealDesc] = useState("");
  const [appealFile, setAppealFile] = useState<File | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('suspensionDetails');
    if (!stored) {
      // Fallback: redirect to login if no details
      router.push('/login');
      return;
    }

    const parsed: SuspensionDetails = JSON.parse(stored);
    setDetails(parsed);

    if (parsed.type === 'temporary' && parsed.until) {
      const untilDate = new Date(parsed.until).getTime();
      const now = Date.now();
      if (untilDate > now) {
        setCountdown(Math.floor((untilDate - now) / 1000));
      } else {
        // Already expired – clear and redirect
        localStorage.removeItem('suspensionDetails');
        router.push('/login');
      }
    }
  }, [router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleAppeal = async () => {
    if (!details?.appealAvailable || !appealDesc.trim()) {
      toast.error("Please provide a description for your appeal.");
      return;
    }

    setIsAppealing(true);
    const formData = new FormData();
    formData.append('description', appealDesc);
    if (appealFile) formData.append('evidence_file', appealFile);

    try {
      const response = await api.appealSuspension(formData);
      toast.success("Appeal submitted successfully! An admin will review it soon.");
      setAppealDesc("");  // Clear form
      setAppealFile(null);  // Clear file
      setIsAppealing(false);
      // Optional: Update local details to reflect pending status
      const updatedDetails = { ...details, evidenceStatus: 'pending' };
      setDetails(updatedDetails);
      localStorage.setItem('suspensionDetails', JSON.stringify(updatedDetails));
    } catch (error) {
      toast.error("Failed to submit appeal. Please try again.");
      setIsAppealing(false);
    }
  };

  if (!details) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
            <p className="text-white">Loading suspension details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400" />
          <CardTitle className="text-2xl font-bold text-white">Account Suspended</CardTitle>
          <p className="text-gray-300">{details.reason}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {details.type === 'temporary' && details.until && (
            <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <Clock className="w-5 h-5 mx-auto mb-2 text-yellow-400" />
              <p className="text-sm">Suspended until</p>
              <p className="text-lg font-bold">{new Date(details.until).toLocaleString()}</p>
              <p className="text-xs text-yellow-300 mt-1">
                Time remaining: {Math.floor(countdown / 3600)}h {Math.floor((countdown % 3600) / 60)}m {countdown % 60}s
              </p>
            </div>
          )}

          {details.type === 'permanent' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-300">Status: {details.evidenceStatus}</p>
              {details.appealAvailable && (
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <p className="text-sm mb-4">Submit an appeal with evidence for review:</p>
                  
                  {/* FIXED: Label + icon outside Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Evidence (optional)
                    </label>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setAppealFile(e.target.files?.[0] || null)}
                      className="bg-gray-800/50 border-gray-700 text-white file:bg-blue-600/20 file:text-blue-400 file:border-0 file:rounded-md file:px-4 file:py-2 hover:file:bg-blue-600/30 cursor-pointer"
                    />
                    {appealFile && (
                      <p className="text-xs text-green-400 mt-1 truncate">{appealFile.name}</p>
                    )}
                  </div>

                  <Textarea
                    value={appealDesc}
                    onChange={(e) => setAppealDesc(e.target.value)}
                    placeholder="Describe why you believe this suspension is incorrect..."
                    className="mb-2 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400"
                    rows={4}
                  />
                  
                  <Button
                    onClick={handleAppeal}
                    disabled={isAppealing || !appealDesc.trim()}
                    className="w-full"
                  >
                    {isAppealing ? "Submitting..." : <><Send className="w-4 h-4 mr-2" /> Submit Appeal</>}
                  </Button>
                </div>
              )}
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem('suspensionDetails');
              router.push('/login');
            }}
            className="w-full mt-4"
          >
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}