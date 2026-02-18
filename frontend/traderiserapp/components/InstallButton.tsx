// components/InstallButton.tsx
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const STORAGE_KEY = 'install_prompt_deferred';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Try to restore from sessionStorage on mount/refresh
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      // We can't store the actual Event object → so we just remember "it was available"
      // The real fix needs a small trick (see below)
    }

    const handler = (e: Event) => {
      e.preventDefault();
      // Store a flag that prompt is available
      sessionStorage.setItem(STORAGE_KEY, 'true');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // On first load or when event fires → show button
    // Also check if we previously had it
    if (sessionStorage.getItem(STORAGE_KEY) === 'true' && !deferredPrompt) {
      // Unfortunately we can't recover the real event object after refresh
      // → Best compromise: hide button after refresh unless event fires again
      // Many apps just accept it disappears after refresh
    }

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      sessionStorage.removeItem(STORAGE_KEY);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', () => {});
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  // Hide if installed or we never got the prompt (most reliable)
  if (isInstalled || !deferredPrompt) return null;

  return (
    <Button
      onClick={handleInstallClick}
      className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl flex items-center gap-2 px-5 py-2.5"
      size="sm"
    >
      <div className="relative w-6 h-6 flex-shrink-0">
        <Image
          src="/images/traderiser-logo-192.png"
          alt="TradeRiser"
          fill
          className="object-contain rounded-md"
          sizes="24px"
          priority
        />
      </div>
      <span>Install App</span>
    </Button>
  );
}