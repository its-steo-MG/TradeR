// app/(auth)/login/page.tsx
"use client";

import type React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Image from "next/image";
import { toast } from "sonner";

// Define the expected shape of API error responses (no 'any'!)
interface ApiError {
  response?: {
    status?: number;
    data?: {
      code?: string;
      details?: {
        reason?: string;
        until?: string;
        evidence_status?: string;
        appeal_available?: boolean;
      };
      [key: string]: unknown; // Allows extra fields without breaking
    };
  };
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [accountType, setAccountType] = useState<"demo" | "standard">(
    searchParams.get("type") === "demo" ? "demo" : "standard"
  );
  const referralCode = searchParams.get("ref") || "";

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "otp" | "newPassword">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const signupLink = `/signup?type=${accountType}${referralCode ? `&ref=${referralCode}` : ""}`;

  useEffect(() => {
    setAccountType(searchParams.get("type") === "demo" ? "demo" : "standard");
  }, [searchParams]);

  useEffect(() => {
    if (resetStep === "otp" && secondsLeft > 0) {
      const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
      return () => clearTimeout(timer);
    } else if (secondsLeft === 0) {
      setCanResend(true);
    }
  }, [resetStep, secondsLeft]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Updated handleSubmit – fully type-safe, no 'any'
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.login({
        email: formData.email,
        password: formData.password,
        account_type: accountType,
      });

      // SUCCESS: Check for suspension in response.data
      if (response.data && 'suspension' in response.data) {
  const suspension = response.data.suspension!;           // ← tell TS it's definitely there

  const { code, details } = suspension;

  localStorage.setItem('suspensionDetails', JSON.stringify({
    type: code.replace('suspended_', '') as 'temporary' | 'permanent',
    reason: details.reason,
    until: details.until,
    evidenceStatus: details.evidence_status || 'no_evidence',
    appealAvailable: details.appeal_available || false,
  }));

        // User-friendly toast
        toast.error(
          code === 'suspended_temporary'
            ? `Account temporarily suspended until ${details.until ? new Date(details.until).toLocaleString() : 'later'}.`
            : 'Account permanently suspended. Please submit an appeal for review.'
        );

        // Redirect to suspension page
        router.push('/suspended');
        setIsLoading(false);
        return;
      }

      // Normal success: No suspension
      if (response.data) {
        toast.success("Logged in successfully!");
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const apiError = err as ApiError;

      const errorData = apiError.response?.data ?? {};
      const status = apiError.response?.status ?? 0;

      if (status === 401 || status === 403) {
        // Check if it's a suspension-related error (if backend still raises)
        if (errorData.code === 'suspended_temporary' || errorData.code === 'suspended_permanent') {
          // Fallback: Save minimal details and redirect
          localStorage.setItem('suspensionDetails', JSON.stringify({
            type: (errorData.code as string).replace('suspended_', '') as 'temporary' | 'permanent',
            reason: (errorData.details as { reason?: string })?.reason || 'Your account has been suspended',
            until: (errorData.details as { until?: string })?.until,
            evidenceStatus: (errorData.details as { evidence_status?: string })?.evidence_status || 'no_evidence',
            appealAvailable: (errorData.details as { appeal_available?: boolean })?.appeal_available || false,
          }));

          toast.error(
            errorData.code === 'suspended_temporary'
              ? `Account temporarily suspended.`
              : 'Account permanently suspended. Please submit an appeal.'
          );

          router.push('/suspended');
          setIsLoading(false);
          return;
        }

        // Generic auth failure
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.error("Login failed. Check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startReset = async () => {
    setIsLoading(true);
    try {
      const res = await api.requestPasswordReset(resetEmail);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("4-digit code sent!");
      setResetStep("otp");
      setSecondsLeft(60);
      setCanResend(false);
    } catch {
      toast.error("Failed to send code. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    setIsLoading(true);
    try {
      const res = await api.requestPasswordReset(resetEmail);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setOtp(["", "", "", ""]);
      setSecondsLeft(60);
      setCanResend(false);
      toast.success("New OTP sent!");
    } catch {
      toast.error("Resend failed");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 4) {
      toast.error("Enter 4-digit code");
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.verifyPasswordResetOtp({ email: resetEmail, otp: code });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("OTP verified!");
      setResetStep("newPassword");
    } catch {
      toast.error("Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmNewPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be 8+ characters");
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.confirmPasswordReset({
        email: resetEmail,
        otp: otp.join(""),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Password reset successful! Please log in.");
      setShowResetModal(false);
      setResetStep("email");
    } catch {
      toast.error("Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 3) otpRefs.current[idx + 1]?.focus();
  };

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-white/20 bg-white/5 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <Link href="/" className="inline-flex items-center text-white/70 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
            <CardTitle className="text-2xl text-white">Log In</CardTitle>
            <CardDescription className="text-white/70">
              {accountType === "standard"
                ? "Access your real trading account"
                : "Practice with your demo account"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-full ${accountType === "standard" ? "from-orange-400 to-orange-500" : "from-blue-400 to-blue-500"} flex items-center justify-center overflow-hidden shadow-md`}>
                  <Image
                    src={accountType === "standard" ? "/real-account-icon.png" : "/demo-account-icon.png"}
                    alt={accountType === "standard" ? "Real Account" : "Demo Account"}
                    width={64}
                    height={64}
                    className="w-14 h-14 object-cover"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {accountType === "standard" ? "Real Account" : "Demo Account"}
                </h3>
                <p className="text-sm text-white/70">
                  {accountType === "standard"
                    ? "Trade with real money and earn real profits."
                    : "Practice trading with $10,000 virtual balance."}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType("standard")}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                    accountType === "standard"
                      ? "bg-white text-black"
                      : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  }`}
                  disabled={isLoading}
                >
                  Real Account
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("demo")}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                    accountType === "demo"
                      ? "bg-white text-black"
                      : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  }`}
                  disabled={isLoading}
                >
                  Demo Account
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Email</label>
                <Input
                  type="email"
                  name="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-sm text-white/70 hover:text-white"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-white/90 font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Log In"}
              </Button>

              <p className="text-center text-sm text-white/70">
                Dont have an account?{" "}
                <Link href={signupLink} className="text-white hover:underline font-semibold">
                  Sign up
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md border-white/20 bg-white/5 backdrop-blur-sm">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl text-white">Reset Password</CardTitle>
              <CardDescription className="text-white/70">
                {resetStep === "email" && "Enter your email to receive a 4-digit code"}
                {resetStep === "otp" && `Enter code sent to ${resetEmail}`}
                {resetStep === "newPassword" && "Set your new password"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {resetStep === "email" && (
                <>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                  <Button
                    onClick={startReset}
                    className="w-full bg-white text-black hover:bg-white/90 font-semibold"
                    disabled={isLoading || !resetEmail}
                  >
                    {isLoading ? "Sending..." : "Send Code"}
                  </Button>
                </>
              )}

              {resetStep === "otp" && (
                <>
                  <div className="flex justify-center gap-2">
                    {otp.map((d, i) => (
                      <Input
                        key={i}
                        type="text"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        ref={(el) => {
                          otpRefs.current[i] = el;
                        }}
                        className="w-12 h-12 text-center text-lg font-semibold bg-white/10 border-white/20 text-white"
                      />
                    ))}
                  </div>

                  <Button
                    onClick={verifyOtp}
                    className="w-full bg-white text-black hover:bg-white/90 font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </Button>

                  <p className="text-center text-sm text-white/70">
                    {canResend ? (
                      <button
                        type="button"
                        onClick={resendOtp}
                        className="text-white hover:underline font-medium"
                      >
                        Resend code
                      </button>
                    ) : (
                      `Resend in ${secondsLeft}s`
                    )}
                  </p>
                </>
              )}

              {resetStep === "newPassword" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">New Password</label>
                    <div className="relative">
                      <Input
                        type={showNewPass ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                      >
                        {showNewPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Confirm Password</label>
                    <div className="relative">
                      <Input
                        type={showConfirmPass ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                      >
                        {showConfirmPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={confirmNewPassword}
                    className="w-full bg-white text-black hover:bg-white/90 font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Reset Password"}
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                onClick={() => {
                  setShowResetModal(false);
                  setResetStep("email");
                  setOtp(["", "", "", ""]);
                }}
                className="w-full text-white/70 hover:text-white"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}