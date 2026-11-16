import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Universal Mobile Haptics Engine
 * Provides subtle, tactile, Apple-grade vibration feedback across iOS, Android Capacitor, and Web Browsers.
 */
class HapticEngine {
  private enabled: boolean = true;

  constructor() {
    try {
      const saved = localStorage.getItem('app_haptics_enabled');
      if (saved !== null) {
        this.enabled = saved === 'true';
      }
    } catch {
      this.enabled = true;
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    try {
      localStorage.setItem('app_haptics_enabled', String(val));
    } catch {}
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Subtle tick for 1-Tap quick expenses, tab switches, and toggles (10-15ms)
   */
  public async light(): Promise<void> {
    if (!this.enabled) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(12);
        } catch {}
      }
    }
  }

  /**
   * Crisp bump for primary action buttons, opening modals, camera scan (25-30ms)
   */
  public async medium(): Promise<void> {
    if (!this.enabled) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(28);
        } catch {}
      }
    }
  }

  /**
   * Firm impact for important milestones or primary saves (40-50ms)
   */
  public async heavy(): Promise<void> {
    if (!this.enabled) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(45);
        } catch {}
      }
    }
  }

  /**
   * Harmonious double-pulse for successfully saving an expense, deposit, or backup
   */
  public async success(): Promise<void> {
    if (!this.enabled) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([15, 60, 20]);
        } catch {}
      }
    }
  }

  /**
   * Warning pulse for budget limit warnings, impulse pauser reminder, delete actions
   */
  public async warning(): Promise<void> {
    if (!this.enabled) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([30, 80, 30]);
        } catch {}
      }
    }
  }

  /**
   * Distinct pulse for error or budget overspend
   */
  public async error(): Promise<void> {
    if (!this.enabled) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([40, 100, 40, 100, 40]);
        } catch {}
      }
    }
  }

  /**
   * Light selection change feedback for pickers and sliders
   */
  public async selection(): Promise<void> {
    if (!this.enabled) return;
    try {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } catch {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(8);
        } catch {}
      }
    }
  }
}

export const haptics = new HapticEngine();
