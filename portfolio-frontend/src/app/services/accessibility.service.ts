import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AccessibilitySettings {
  fontSize: number;         // 100 = default, 75-200 range
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
  ttsEnabled: boolean;
  ttsRate: number;          // 0.5 - 2.0
  ttsPitch: number;         // 0 - 2
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 100,
  highContrast: false,
  reducedMotion: false,
  screenReaderMode: false,
  ttsEnabled: false,
  ttsRate: 1.0,
  ttsPitch: 1.0
};

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private renderer: Renderer2;
  private settingsSubject = new BehaviorSubject<AccessibilitySettings>(this.loadSettings());
  settings$ = this.settingsSubject.asObservable();
  private synth: SpeechSynthesis | null = null;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }

    // Detect OS-level prefers-reduced-motion
    if (typeof window !== 'undefined') {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motionQuery.matches) {
        this.updateSetting('reducedMotion', true);
      }
    }

    // Apply saved settings on init
    this.applySettings(this.settingsSubject.value);
  }

  get settings(): AccessibilitySettings {
    return this.settingsSubject.value;
  }

  updateSetting<K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]): void {
    const updated = { ...this.settingsSubject.value, [key]: value };
    this.settingsSubject.next(updated);
    this.saveSettings(updated);
    this.applySettings(updated);
  }

  increaseFontSize(): void {
    const current = this.settings.fontSize;
    if (current < 200) {
      this.updateSetting('fontSize', Math.min(200, current + 10));
    }
  }

  decreaseFontSize(): void {
    const current = this.settings.fontSize;
    if (current > 75) {
      this.updateSetting('fontSize', Math.max(75, current - 10));
    }
  }

  resetFontSize(): void {
    this.updateSetting('fontSize', 100);
  }

  toggleHighContrast(): void {
    this.updateSetting('highContrast', !this.settings.highContrast);
  }

  toggleReducedMotion(): void {
    this.updateSetting('reducedMotion', !this.settings.reducedMotion);
  }

  toggleScreenReaderMode(): void {
    this.updateSetting('screenReaderMode', !this.settings.screenReaderMode);
  }

  toggleTTS(): void {
    this.updateSetting('ttsEnabled', !this.settings.ttsEnabled);
    if (!this.settings.ttsEnabled) {
      this.stopSpeaking();
    }
  }

  speak(text: string): void {
    if (!this.synth || !this.settings.ttsEnabled) return;

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.settings.ttsRate;
    utterance.pitch = this.settings.ttsPitch;
    utterance.lang = 'en-US';

    this.synth.speak(utterance);
  }

  stopSpeaking(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Announce a message to screen readers via a live region
   */
  announceToScreenReader(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
    if (typeof document === 'undefined') return;

    const liveRegion = document.getElementById(`aria-live-${politeness}`);
    if (liveRegion) {
      liveRegion.textContent = '';
      // Force reflow so screen readers detect the change
      void liveRegion.offsetHeight;
      liveRegion.textContent = message;
    }
  }

  private applySettings(settings: AccessibilitySettings): void {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;

    // Font size
    html.style.fontSize = `${settings.fontSize}%`;

    // High contrast
    if (settings.highContrast) {
      html.classList.add('high-contrast');
    } else {
      html.classList.remove('high-contrast');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      html.classList.add('reduced-motion');
    } else {
      html.classList.remove('reduced-motion');
    }

    // Screen reader mode
    if (settings.screenReaderMode) {
      html.classList.add('screen-reader-mode');
    } else {
      html.classList.remove('screen-reader-mode');
    }
  }

  private loadSettings(): AccessibilitySettings {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };

    try {
      const saved = localStorage.getItem('a11y-settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore parse errors
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(settings: AccessibilitySettings): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('a11y-settings', JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }
}
