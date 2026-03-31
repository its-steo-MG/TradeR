'use client';

import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/glass-button';
import { LiquidGlassCard } from '@/components/liquid-glass-card';
import { ArrowLeft, Settings } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <LiquidGlassCard className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Settings className="w-8 h-8 text-primary" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">
          Manage your account and Deriv connection
        </p>

        <div className="space-y-4">
          <GlassButton 
            onClick={() => router.push('/dashboard')}
            variant="accent"
            fullWidth
            size="lg"
          >
            Go to Dashboard
          </GlassButton>

          <GlassButton 
            onClick={() => router.back()}
            variant="outline"
            fullWidth
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </GlassButton>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          Deriv Connection • Trading Settings coming soon...
        </p>
      </LiquidGlassCard>
    </div>
  );
}