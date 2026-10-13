"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Shield, AlertTriangle, Bot, Wallet, UserCheck, Ban, Scale } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { TopNavbar } from "@/components/top-navbar";
import type { Account } from "@/types/account";

interface User {
  username: string;
  email: string;
  phone?: string;
  image?: string;
  accounts: Account[];
}

export default function TermsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [loginType, setLoginType] = useState<"real" | "demo">("real");

  useEffect(() => {
    const raw = localStorage.getItem("user_session");
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as User;
      if (!data?.accounts) return;
      const normalized: User = {
        ...data,
        accounts: data.accounts.map((a) => ({ ...a, balance: Number(a.balance) || 0 })),
      };
      setIsLoggedIn(true);
      setUser(normalized);
      const activeId = localStorage.getItem("active_account_id");
      const account =
        normalized.accounts.find((a) => String(a.id) === String(activeId)) ||
        normalized.accounts[0];
      if (account) {
        setActiveAccount(account);
        setLoginType(account.account_type === "demo" || account.account_type === "mt5-demo" ? "demo" : "real");
      }
    } catch {}
  }, []);

  const availableAccounts =
    loginType === "real"
      ? (user?.accounts || []).filter((a) => a.account_type !== "demo" && a.account_type !== "mt5-demo")
      : (user?.accounts || []).filter((a) => a.account_type === "demo" || a.account_type === "mt5-demo");

  const handleSwitch = (account: Account) => {
    setActiveAccount(account);
    localStorage.setItem("active_account_id", String(account.id));
    localStorage.setItem("account_type", account.account_type);
    setLoginType(account.account_type === "demo" || account.account_type === "mt5-demo" ? "demo" : "real");
    window.dispatchEvent(new Event("session-updated"));
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="relative min-h-screen text-foreground">
      <div className="fixed inset-0 z-0 hidden dark:block pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl" />
      </div>
      <div className="fixed inset-0 z-0 block dark:hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <TopNavbar
          isLoggedIn={isLoggedIn}
          user={user}
          accountBalance={Number(activeAccount?.balance) || 0}
          showBalance={true}
          activeAccount={activeAccount}
          accounts={availableAccounts}
          onSwitchAccount={handleSwitch}
          onLogout={handleLogout}
        />
        <div className="flex flex-1">
          <Sidebar
            loginType={loginType}
            activeAccount={activeAccount}
            accounts={availableAccounts}
            onSwitchAccount={handleSwitch}
          />
          <main className="flex-1 w-full overflow-auto md:pl-64">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-8 h-8 text-pink-500" />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Terms & Conditions</h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Last updated: October 13, 2026. By creating an account or using TradeRiser, you agree to these rules.
          </p>
        </header>

        <div className="space-y-8">
          {/* 1. Account Creation */}
          <Section icon={<UserCheck className="w-5 h-5" />} title="1. Account Creation">
            <p>
              To use TradeRiser you must first create a TradeRiser account. A TradeRiser account is required before you can access any other platform on the system.
            </p>
            <ul>
              <li>After creating your TradeRiser account you may open or connect Pro-FX, MT5, and Deriv accounts.</li>
              <li>You must be at least 18 years old and legally allowed to trade in your country.</li>
              <li>One person may hold one primary TradeRiser account. Multiple accounts to evade limits or suspensions are not allowed.</li>
              <li>You are responsible for keeping your login details private. Sharing accounts is prohibited.</li>
              <li>You must provide accurate information during registration. False information can lead to account closure.</li>
            </ul>
          </Section>

          {/* 2. Email Verification */}
          <Section icon={<Shield className="w-5 h-5" />} title="2. Email Verification">
            <p>
              Email verification through a one-time password (OTP) sent to your email during registration is mandatory.
            </p>
            <ul>
              <li>Without email verification, withdrawals are limited.</li>
              <li>Manual verification of an unverified email requires an agent fee.</li>
              <li>You must use an email address you control and can access.</li>
              <li>TradeRiser may send important notices, including target-profit emails and security alerts, to your verified email. You are responsible for monitoring it.</li>
            </ul>
          </Section>

          {/* 3. KYC */}
          <Section icon={<UserCheck className="w-5 h-5" />} title="3. KYC Verification">
            <p>
              Know Your Customer (KYC) verification is required for full access to deposits and withdrawals.
            </p>
            <ul>
              <li>If your KYC is not verified, you cannot deposit or withdraw more than <strong>$999 USD</strong> in total.</li>
              <li>Once KYC is approved, the $999 limit is removed, subject to the normal wallet and agent limits below.</li>
              <li>Rejected KYC submissions must be corrected and resubmitted.</li>
              <li>Providing fake or altered documents is a serious breach and can result in permanent suspension and possible legal action.</li>
            </ul>
          </Section>

          {/* 4. Deposits & Withdrawals */}
          <Section icon={<Wallet className="w-5 h-5" />} title="4. Deposits & Withdrawals">
            <p>For smooth withdrawals, both your email and KYC must be verified.</p>
            <div className="grid sm:grid-cols-2 gap-4 my-4">
              <LimitCard title="Wallet Deposit" min="$5 USD" max="$1,500 USD" note="per transaction" />
              <LimitCard title="Wallet Withdrawal" min="$5 USD" max="$2,000 USD" note="per transaction" />
            </div>
            <ul>
              <li>Amounts outside these limits will be rejected.</li>
              <li>Agent services may apply their own fees and processing times. Always confirm before confirming a transaction.</li>
              <li>TradeRiser may delay or hold a withdrawal for security review, especially on new or high-value requests.</li>
              <li>You are responsible for entering the correct payment details. Wrong details can cause loss of funds.</li>
              <li>Chargebacks or reversed deposits may result in negative balance and account restriction until resolved.</li>
            </ul>
          </Section>

          {/* 5. Denari AI */}
          <Section icon={<Bot className="w-5 h-5" />} title="5. Denari AI — Professional Operating Rules">
            <p>
              To ensure stable operation, accurate configuration, and uninterrupted performance of Denari AI, all users must follow these rules.
            </p>
            <h4 className="font-semibold mt-4 mb-2">Main Rules</h4>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>No interference while Denari AI is running.</strong> Do not interrupt, modify, or interfere with Denari AI while it is actively running or performing configuration and operational processes.
              </li>
              <li>
                <strong>No transactions during an active Denari trade.</strong> Do not initiate, modify, or execute any transaction while there is an active Denari AI trade. The active trade must be completed or properly closed first.
              </li>
              <li>
                <strong>Reset Denari AI before making a transaction.</strong> Denari AI must be properly reset and returned to its required operating state before any new transaction. This prevents conflicts with its existing configuration.
              </li>
              <li>
                <strong>Do not reset Denari AI before the target-profit email is sent.</strong> Do not reset while a target-profit process is still active or before the corresponding target-profit notification email has been successfully sent. Resetting early may interrupt the process.
              </li>
              <li>
                <strong>Configure Denari AI at least 45 minutes after purchase.</strong> After purchasing or activating Denari AI, allow a minimum of 45 minutes before configuring or using it. Do not use it immediately after purchase. The waiting period lets the system finish initial setup.
              </li>
            </ol>
            <h4 className="font-semibold mt-4 mb-2">Additional Operating Rules</h4>
            <ol className="list-decimal pl-5 space-y-2" start={6}>
              <li>
                <strong>Follow the required configuration sequence.</strong> Complete all Denari AI configuration steps in the prescribed order. Do not skip, alter, or manually override stages unless the system specifically instructs you to.
              </li>
              <li>
                <strong>Avoid simultaneous system operations.</strong> Do not perform multiple Denari AI-related actions at the same time. Let each operation finish before starting another.
              </li>
              <li>
                <strong>Monitor system notifications.</strong> You are responsible for reading Denari AI notifications, status messages, and system emails. Follow any instruction that requires an action, confirmation, reset, or configuration change before continuing.
              </li>
            </ol>
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">Compliance Notice</p>
              Failure to follow these operating rules may result in configuration conflicts, interrupted AI processes, delayed operations, or temporary restrictions on certain Denari AI functions.
            </div>
          </Section>

          {/* 6. Robots & Transactions */}
          <Section icon={<Bot className="w-5 h-5" />} title="6. Robots & Active Sessions">
            <ul>
              <li>No deposits, withdrawals, or transfers should be made while an AI robot or any automated trading session is running on the account.</li>
              <li>Transactions are suspended while a robot is active or while other account activity is in progress. Wait until the robot is fully stopped and positions are closed.</li>
              <li>Starting, stopping, or reconfiguring a robot during an open trade can cause errors or unexpected results.</li>
              <li>You are responsible for monitoring open positions and robot status.</li>
            </ul>
          </Section>

          {/* 7. Transfers */}
          <Section icon={<Ban className="w-5 h-5" />} title="7. Transfers">
            <ul>
              <li>Transferring funds from a suspended account is strictly prohibited.</li>
              <li>Any attempt to move funds from a suspended account can cause further account blockage and may lead to legal action, as it is considered fraud.</li>
              <li>Only transfer between accounts you own and that are in good standing.</li>
              <li>TradeRiser may reverse or freeze transfers that appear suspicious.</li>
            </ul>
          </Section>

          {/* 8. Device & Session Rules */}
          <Section icon={<AlertTriangle className="w-5 h-5" />} title="8. Devices & Sessions">
            <ul>
              <li>Trading or running robots on two different devices at the same time can cause system interruption and may lead to account suspension.</li>
              <li>Use one active session at a time for trading and robot operations.</li>
              <li>If you suspect unauthorized access, change your password immediately and contact support.</li>
            </ul>
          </Section>

          {/* 9. General Trading Rules */}
          <Section icon={<Scale className="w-5 h-5" />} title="9. General Trading Rules">
            <ul>
              <li>Trading involves risk. You can lose some or all of the money you deposit. Only trade with funds you can afford to lose.</li>
              <li>Past performance of any robot, signal, or strategy does not guarantee future results.</li>
              <li>Demo accounts are for practice only. Virtual balances have no cash value.</li>
              <li>Market conditions can change quickly. Slippage, delays, or temporary unavailability of a market may occur.</li>
              <li>You must not use the platform for money laundering, fraud, or any illegal activity.</li>
              <li>Abuse of promotions, referral systems, or bonuses can result in removal of rewards and account restriction.</li>
              <li>TradeRiser may suspend or close an account that violates these terms, with or without prior notice depending on the severity.</li>
              <li>We may update these terms from time to time. Continued use of the platform after an update means you accept the new terms.</li>
            </ul>
          </Section>

          {/* 10. Contact */}
          <Section icon={<Shield className="w-5 h-5" />} title="10. Support & Contact">
            <p>
              If you have questions about these terms or need help with your account, contact TradeRiser support through the Customer Care section in your dashboard.
            </p>
          </Section>
        </div>

        <footer className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} TradeRiser. All rights reserved.
        </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="liquid-glass rounded-3xl p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/15 text-pink-500">
          {icon}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
      </div>
      <div className="space-y-3 text-sm sm:text-base text-foreground/90 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:space-y-2">
        {children}
      </div>
    </section>
  );
}

function LimitCard({ title, min, max, note }: { title: string; min: string; max: string; note: string }) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/10 dark:border-white/10 dark:bg-white/5 p-4">
      <p className="text-sm font-semibold mb-2">{title}</p>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Minimum</span>
        <span className="font-bold text-emerald-500">{min}</span>
      </div>
      <div className="flex justify-between text-sm mt-1">
        <span className="text-muted-foreground">Maximum</span>
        <span className="font-bold text-pink-500">{max}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{note}</p>
    </div>
  );
}
