import { RendererFactory2 } from '@angular/core';
import { AccessibilityService, AccessibilitySettings } from './accessibility.service';

const DEFAULTS: AccessibilitySettings = {
  fontSize: 100,
  highContrast: false,
  reducedMotion: false,
  screenReaderMode: false,
  ttsEnabled: false,
  ttsRate: 1.0,
  ttsPitch: 1.0,
};

// The service assigns a renderer from the factory but applies all DOM changes
// directly on document.documentElement, so an inert renderer is sufficient.
function createService(): AccessibilityService {
  const rendererFactory = {
    createRenderer: () => ({}),
  } as unknown as RendererFactory2;
  return new AccessibilityService(rendererFactory);
}

function makeStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

describe('AccessibilityService', () => {
  afterEach(() => {
    // Reset the document root mutated by applySettings between tests.
    document.documentElement.className = '';
    document.documentElement.style.fontSize = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('defaults', () => {
    it('is created with default settings when nothing is persisted', () => {
      const service = createService();
      expect(service.settings).toEqual(DEFAULTS);
    });

    it('applies the default font size to the document root on init', () => {
      createService();
      expect(document.documentElement.style.fontSize).toBe('100%');
    });
  });

  describe('font size', () => {
    it('increaseFontSize() steps up by 10 and caps at 200', () => {
      const service = createService();
      service.updateSetting('fontSize', 195);

      service.increaseFontSize();
      expect(service.settings.fontSize).toBe(200);

      service.increaseFontSize();
      expect(service.settings.fontSize).toBe(200);
    });

    it('decreaseFontSize() steps down by 10 and floors at 75', () => {
      const service = createService();
      service.updateSetting('fontSize', 80);

      service.decreaseFontSize();
      expect(service.settings.fontSize).toBe(75);

      service.decreaseFontSize();
      expect(service.settings.fontSize).toBe(75);
    });

    it('resetFontSize() returns to 100', () => {
      const service = createService();
      service.updateSetting('fontSize', 150);

      service.resetFontSize();

      expect(service.settings.fontSize).toBe(100);
    });

    it('mirrors the font size onto the document root', () => {
      const service = createService();
      service.updateSetting('fontSize', 120);
      expect(document.documentElement.style.fontSize).toBe('120%');
    });
  });

  describe('boolean toggles apply matching CSS classes to the document root', () => {
    it('toggleHighContrast() flips the flag and the class', () => {
      const service = createService();
      service.toggleHighContrast();
      expect(service.settings.highContrast).toBe(true);
      expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
      service.toggleHighContrast();
      expect(service.settings.highContrast).toBe(false);
      expect(document.documentElement.classList.contains('high-contrast')).toBe(false);
    });

    it('toggleReducedMotion() flips the flag and the class', () => {
      const service = createService();
      service.toggleReducedMotion();
      expect(service.settings.reducedMotion).toBe(true);
      expect(document.documentElement.classList.contains('reduced-motion')).toBe(true);
    });

    it('toggleScreenReaderMode() flips the flag and the class', () => {
      const service = createService();
      service.toggleScreenReaderMode();
      expect(service.settings.screenReaderMode).toBe(true);
      expect(document.documentElement.classList.contains('screen-reader-mode')).toBe(true);
    });
  });

  describe('settings$ stream', () => {
    it('emits the current value immediately and on every update', () => {
      const service = createService();
      const emissions: AccessibilitySettings[] = [];
      service.settings$.subscribe(s => emissions.push(s));

      service.toggleHighContrast();

      expect(emissions.length).toBeGreaterThanOrEqual(2);
      expect(emissions[0].highContrast).toBe(false);
      expect(emissions[emissions.length - 1].highContrast).toBe(true);
    });
  });

  describe('announceToScreenReader', () => {
    it('writes the message into the polite live region by default', () => {
      const region = document.createElement('div');
      region.id = 'aria-live-polite';
      document.body.appendChild(region);

      createService().announceToScreenReader('Saved');

      expect(region.textContent).toBe('Saved');
      region.remove();
    });

    it('targets the assertive live region when requested', () => {
      const region = document.createElement('div');
      region.id = 'aria-live-assertive';
      document.body.appendChild(region);

      createService().announceToScreenReader('Error', 'assertive');

      expect(region.textContent).toBe('Error');
      region.remove();
    });

    it('is a no-op when no live region exists', () => {
      const service = createService();
      expect(() => service.announceToScreenReader('nothing here')).not.toThrow();
    });
  });

  describe('persistence (localStorage available)', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', makeStorageMock());
    });

    it('persists settings on update', () => {
      const service = createService();
      service.updateSetting('highContrast', true);

      const saved = JSON.parse(localStorage.getItem('a11y-settings') as string);
      expect(saved.highContrast).toBe(true);
    });

    it('restores persisted settings on construction, merged over defaults', () => {
      localStorage.setItem('a11y-settings', JSON.stringify({ fontSize: 150, highContrast: true }));

      const service = createService();

      expect(service.settings.fontSize).toBe(150);
      expect(service.settings.highContrast).toBe(true);
      // Keys absent from storage fall back to defaults.
      expect(service.settings.ttsRate).toBe(1.0);
    });

    it('falls back to defaults when the persisted value is corrupt', () => {
      localStorage.setItem('a11y-settings', '{ not valid json');

      const service = createService();

      expect(service.settings).toEqual(DEFAULTS);
    });
  });

  describe('OS prefers-reduced-motion', () => {
    it('enables reduced motion at construction when the OS prefers it', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
      } as MediaQueryList);

      const service = createService();

      expect(service.settings.reducedMotion).toBe(true);
      expect(document.documentElement.classList.contains('reduced-motion')).toBe(true);
    });
  });

  describe('text-to-speech', () => {
    let cancel: ReturnType<typeof vi.fn>;
    let speak: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      cancel = vi.fn();
      speak = vi.fn();
      vi.stubGlobal(
        'SpeechSynthesisUtterance',
        class {
          rate = 1;
          pitch = 1;
          lang = '';
          constructor(public text: string) {}
        },
      );
      // The constructor reads `'speechSynthesis' in window` then `window.speechSynthesis`.
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: { cancel, speak },
      });
    });

    afterEach(() => {
      delete (window as unknown as Record<string, unknown>)['speechSynthesis'];
    });

    it('speak() does nothing while TTS is disabled', () => {
      const service = createService();
      service.speak('hello');
      expect(speak).not.toHaveBeenCalled();
    });

    it('speak() utters the text with the configured rate and pitch when enabled', () => {
      const service = createService();
      service.updateSetting('ttsEnabled', true);
      service.updateSetting('ttsRate', 1.5);
      service.updateSetting('ttsPitch', 0.8);

      service.speak('hello world');

      expect(cancel).toHaveBeenCalled();
      expect(speak).toHaveBeenCalledTimes(1);
      const utterance = speak.mock.calls[0][0];
      expect(utterance.text).toBe('hello world');
      expect(utterance.rate).toBe(1.5);
      expect(utterance.pitch).toBe(0.8);
      expect(utterance.lang).toBe('en-US');
    });

    it('stopSpeaking() cancels active synthesis', () => {
      const service = createService();
      service.stopSpeaking();
      expect(cancel).toHaveBeenCalled();
    });

    it('toggleTTS() that disables TTS also stops any ongoing speech', () => {
      const service = createService();
      service.updateSetting('ttsEnabled', true);
      cancel.mockClear();

      service.toggleTTS();

      expect(service.settings.ttsEnabled).toBe(false);
      expect(cancel).toHaveBeenCalled();
    });
  });
});
