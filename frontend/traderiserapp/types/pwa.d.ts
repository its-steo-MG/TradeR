// pwa.d.ts

interface BeforeInstallPromptEvent extends Event {
  /**
   * Returns an array of DOMString containing the platforms on which the event was dispatched.
   * This is used to present a choice of installation options to the user.
   */
  readonly platforms: Array<string>;

  /**
   * Returns a Promise that resolves to an object describing the outcome of the prompt
   * (whether the user accepted or dismissed it).
   */
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;

  /**
   * Allows a developer to show the install prompt at a time of their own choosing.
   * This method returns a Promise that resolves when the user has made a choice.
   */
  prompt(): Promise<void>;
}

// Extend WindowEventMap so TypeScript knows about the event
interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}