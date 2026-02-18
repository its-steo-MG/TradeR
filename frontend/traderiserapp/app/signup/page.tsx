// app/(auth)/signup/page.tsx
"use client";

import type React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import Image from "next/image";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const accountType = searchParams.get("type") === "demo" ? "demo" : "standard";
  const referralCode = searchParams.get("ref") || "";

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isRealAccount = accountType === "standard";
  const accountLabel = isRealAccount ? "Real Account" : "Demo Account";
  const accountDescription = isRealAccount
    ? "Trade with real money and earn real profits"
    : "Practice trading with $10,000 virtual balance";
  const iconPath = isRealAccount ? "/real-account-icon.png" : "/demo-account-icon.png";

  useEffect(() => {
    if (showOtpScreen && secondsLeft > 0) {
      const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1_000);
      return () => clearTimeout(timer);
    } else if (secondsLeft === 0) {
      setCanResend(true);
    }
  }, [showOtpScreen, secondsLeft]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.email || !formData.password || !formData.username) {
      toast.error("Please fill in all required fields");
      setIsLoading(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.signup({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        account_type: accountType,
        referral_code: referralCode,
      });

      if (response.error) {
        toast.error(response.error);
        setIsLoading(false);
        return;
      }

      const otpRes = await api.resendEmailOtp(formData.email);
      if (otpRes.error) {
        toast.error("Account created but failed to send verification code.");
        setIsLoading(false);
        return;
      }

      toast.success("Account created! Check your email for the OTP.");
      setShowOtpScreen(true);
      setSecondsLeft(60);
      setCanResend(false);
    } catch (err) {
      toast.error("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!/^\d?$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.verifyEmailOtp({ email: formData.email, otp: code });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Email verified!");
      router.push("/dashboard");
    } catch {
      toast.error("Verification failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    setIsLoading(true);
    try {
      const res = await api.resendEmailOtp(formData.email);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setOtp(["", "", "", "", "", ""]);
      setSecondsLeft(60);
      setCanResend(false);
      toast.success("New OTP sent!");
    } catch {
      toast.error("Resend failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (showOtpScreen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-white/20 bg-white/5 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl text-white">Verify Your Email</CardTitle>
            <CardDescription className="text-white/70">
              We sent a 6-digit code to <br />
              <span className="font-medium">{formData.email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex justify-center gap-2">
              {otp.map((digit, i) => (
                <Input
                  key={i}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
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
              className="w-full bg-white text-black hover:bg-white/90 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Verifying…" : "Verify & Continue"}
            </Button>

            <div className="text-center space-y-1">
              <p className="text-sm text-white/70">
                {canResend ? (
                  <button
                    type="button"
                    onClick={resendOtp}
                    className="font-medium text-white hover:underline"
                    disabled={isLoading}
                  >
                    Resend code
                  </button>
                ) : (
                  <>Resend available in {secondsLeft}s</>
                )}
              </p>
            </div>

            <Button
              variant="ghost"
              onClick={() => {
                setShowOtpScreen(false);
                setOtp(["", "", "", "", "", ""]);
              }}
              className="w-full text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to sign-up
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border-white/20 bg-white/5 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <Link href="/" className="inline-flex items-center text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <CardTitle className="text-2xl text-white">Sign Up</CardTitle>
          <CardDescription className="text-white/70">{accountDescription}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden">
                  <Image src={iconPath} alt={accountLabel} width={48} height={48} className="object-cover" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{accountLabel}</h3>
                <p className="text-sm text-white/70">{accountDescription}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Username</label>
              <Input
                type="text"
                name="username"
                placeholder="john_doe"
                value={formData.username}
                onChange={handleChange}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                disabled={isLoading}
              />
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
              <label className="text-sm font-medium text-white">Phone</label>
              <Input
                type="tel"
                name="phone"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
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
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Confirm Password</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-white/90 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account…" : "Create Account"}
            </Button>

            <p className="text-center text-sm text-white/70">
              Already have an account?{" "}
              <Link href={`/login?type=${accountType}`} className="text-white hover:underline font-semibold">
                Log in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}