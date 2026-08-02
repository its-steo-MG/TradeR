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
import { ArrowLeft, Eye, EyeOff, ExternalLink, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Image from "next/image";
import { toast } from "sonner";

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
      [key: string]: unknown;
    };
  };
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const [accountType, setAccountType] = useState<"standard" | "demo" | "deriv">(
    (searchParams.get("type") as "standard" | "demo" | "deriv") || "standard"
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

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const signupLink = `/signup?type=${accountType}${referralCode ? `&ref=${referralCode}` : ""}`;
  const isRealAccount = accountType === "standard";

  useEffect(() => {
    const typeFromUrl = searchParams.get("type") as "standard" | "demo" | "deriv" | null;
    if (typeFromUrl) setAccountType(typeFromUrl);
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
        account_type: accountType === "deriv" ? "standard" : accountType,
      });

      if (response.data && "suspension" in response.data) {
        const suspension = response.data.suspension!;
        const { code, details } = suspension;

        localStorage.setItem(
          "suspensionDetails",
          JSON.stringify({
            type: code.replace("suspended_", "") as "temporary" | "permanent",
            reason: details.reason,
            until: details.until,
            evidenceStatus: details.evidence_status || "no_evidence",
            appealAvailable: details.appeal_available || false,
          })
        );

        toast.error(
          code === "suspended_temporary"
            ? `Account temporarily suspended until ${
                details.until ? new Date(details.until).toLocaleString() : "later"
              }.`
            : "Account permanently suspended. Please submit an appeal for review."
        );

        router.push("/suspended");
        setIsLoading(false);
        return;
      }

      const user = response.data?.user;
      if (user && user.kyc_status && user.kyc_status !== "approved") {
        const kycMessage =
          user.kyc_status === "rejected"
            ? "Your previous KYC submission was rejected. Please resubmit your Proof of Identity."
            : "Complete your KYC (Proof of Identity) to unlock withdrawals and full platform features.";

        toast.warning(kycMessage, {
          duration: 7000,
          action: {
            label: "Submit KYC",
            onClick: () => router.push("/kyc"),
          },
        });
      } else if (user?.kyc_status === "approved") {
        toast.success("Logged in successfully! KYC verified.");
      } else {
        toast.success("Logged in successfully!");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const errorData = apiError.response?.data ?? {};
      const status = apiError.response?.status ?? 0;

      if (status === 401 || status === 403) {
        if (
          errorData.code === "suspended_temporary" ||
          errorData.code === "suspended_permanent"
        ) {
          localStorage.setItem(
            "suspensionDetails",
            JSON.stringify({
              type: (errorData.code as string).replace("suspended_", "") as
                | "temporary"
                | "permanent",
              reason:
                (errorData.details as { reason?: string })?.reason ||
                "Your account has been suspended",
              until: (errorData.details as { until?: string })?.until,
              evidenceStatus:
                (errorData.details as { evidence_status?: string })
                  ?.evidence_status || "no_evidence",
              appealAvailable:
                (errorData.details as { appeal_available?: boolean })
                  ?.appeal_available || false,
            })
          );

          toast.error(
            errorData.code === "suspended_temporary"
              ? "Account temporarily suspended."
              : "Account permanently suspended. Please submit an appeal."
          );

          router.push("/suspended");
          setIsLoading(false);
          return;
        }
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.error("Login failed. Check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDerivConnect = () => {
    window.open("https://digister.site", "_blank");
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
      setOtp(["", "", "", ""]);
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
      const res = await api.verifyPasswordResetOtp({
        email: resetEmail,
        otp: code,
      });
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
      setOtp(["", "", "", ""]);
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
    if (val && idx < 3) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  return (
    <>
      <div
        className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: "url('/background.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/70 z-0" />

        <Card className="w-full max-w-md border-white/20 bg-white/5 backdrop-blur-sm relative z-10">
          <CardHeader className="space-y-2">
            <Link
              href="/"
              className="inline-flex items-center text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
            <CardTitle className="text-2xl text-white">Log In</CardTitle>
            <CardDescription className="text-white/70">
              Choose your trading journey
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Account Type Tabs — liquid glass card style */}
            <div className="flex gap-1.5 p-1.5 rounded-2xl bg-white/5 border border-white/10">
              {(["standard", "demo", "deriv"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAccountType(type)}
                  disabled={isLoading}
                  className={`
                    relative flex-1 py-2.5 px-3 rounded-xl font-medium text-sm transition-all
                    ${
                      accountType === type
                        ? "drop-on-top bg-white text-black shadow"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }
                  `}
                >
                  <span className="relative z-[1]">
                    {type === "standard"
                      ? "Real"
                      : type === "demo"
                      ? "Demo"
                      : "Deriv"}
                  </span>
                </button>
              ))}
            </div>

            {isRealAccount && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-amber-200 text-xs leading-snug">
                  Real accounts require completed KYC (Proof of Identity) for
                  withdrawals and full access.
                </div>
              </div>
            )}

            {/* Account Info Card */}
            <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden shadow-md">
                  <Image
                    src={
                      accountType === "standard"
                        ? "/real-account-icon.png"
                        : accountType === "demo"
                        ? "/demo-account-icon.png"
                        : "/deriv-account-icon.png"
                    }
                    alt={
                      accountType === "standard"
                        ? "Real Account"
                        : accountType === "demo"
                        ? "Demo Account"
                        : "Deriv Account"
                    }
                    width={64}
                    height={64}
                    className="w-12 h-12 object-cover"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {accountType === "standard"
                    ? "Real Account"
                    : accountType === "demo"
                    ? "Demo Account"
                    : "Deriv Account"}
                </h3>
                <p className="text-sm text-white/70 mt-1 leading-tight">
                  {accountType === "standard"
                    ? "Trade with real money • KYC required for withdrawals."
                    : accountType === "demo"
                    ? "Practice trading with $10,000 virtual balance."
                    : "Trade synthetic indices, forex & more on Deriv."}
                </p>
              </div>
            </div>

            {accountType === "deriv" ? (
              <div className="space-y-4 pt-2">
                <div className="bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                  <p className="text-white/80 mb-5 text-sm">
                    Connect your Deriv account to start trading on Traderiser Pro
                  </p>
                  <Button
                    onClick={handleDerivConnect}
                    className="drop-on-top relative w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-base flex items-center justify-center gap-2"
                  >
                    <span className="relative z-[1] flex items-center gap-2">
                      Connect to Deriv Account
                      <ExternalLink className="w-5 h-5" />
                    </span>
                  </Button>
                </div>
                <p className="text-center text-xs text-white/50">
                  You will be redirected to digister.site
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <label className="text-sm font-medium text-white">
                    Password
                  </label>
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
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
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
                  className="drop-on-top relative w-full bg-white text-black hover:bg-white/90 font-semibold py-6"
                  disabled={isLoading}
                >
                  <span className="relative z-[1]">
                    {isLoading ? "Logging in..." : "Log In"}
                  </span>
                </Button>

                <p className="text-center text-sm text-white/70">
                  Dont have an account?{" "}
                  <Link
                    href={signupLink}
                    className="text-white hover:underline font-semibold"
                  >
                    Sign up
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md border-white/20 bg-white/5 backdrop-blur-sm">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl text-white">Reset Password</CardTitle>
              <CardDescription className="text-white/70">
                {resetStep === "email" &&
                  "Enter your email to receive a 4-digit code"}
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
                    className="drop-on-top relative w-full bg-white text-black hover:bg-white/90 font-semibold"
                    disabled={isLoading || !resetEmail}
                  >
                    <span className="relative z-[1]">
                      {isLoading ? "Sending..." : "Send Code"}
                    </span>
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
                        disabled={isLoading}
                      />
                    ))}
                  </div>

                  <Button
                    onClick={verifyOtp}
                    className="drop-on-top relative w-full bg-white text-black hover:bg-white/90 font-semibold"
                    disabled={isLoading}
                  >
                    <span className="relative z-[1]">
                      {isLoading ? "Verifying..." : "Verify Code"}
                    </span>
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
                    <label className="text-sm font-medium text-white">
                      New Password
                    </label>
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
                        {showNewPass ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">
                      Confirm Password
                    </label>
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
                        {showConfirmPass ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={confirmNewPassword}
                    className="drop-on-top relative w-full bg-white text-black hover:bg-white/90 font-semibold"
                    disabled={isLoading}
                  >
                    <span className="relative z-[1]">
                      {isLoading ? "Saving..." : "Reset Password"}
                    </span>
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