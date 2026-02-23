import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessibilityService, AccessibilitySettings } from '../../services/accessibility.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-accessibility-toolbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Accessibility Toolbar Toggle Button -->
    <button
      class="a11y-toggle-btn"
      (click)="togglePanel()"
      [attr.aria-expanded]="isPanelOpen"
      aria-controls="a11y-panel"
      aria-label="Accessibility settings"
      title="Accessibility Settings">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           aria-hidden="true" focusable="false">
        <circle cx="12" cy="4.5" r="2.5"/>
        <path d="M12 7v5m0 0l-3 7m3-7l3 7"/>
        <path d="M5 10.5h14"/>
      </svg>
    </button>

    <!-- Accessibility Settings Panel -->
    <div
      id="a11y-panel"
      class="a11y-panel"
      [class.open]="isPanelOpen"
      role="dialog"
      aria-label="Accessibility settings panel"
      [attr.aria-hidden]="!isPanelOpen">

      <div class="a11y-panel-header">
        <h2 id="a11y-heading">Accessibility</h2>
        <button
          class="a11y-close-btn"
          (click)="togglePanel()"
          aria-label="Close accessibility panel">
          &times;
        </button>
      </div>

      <div class="a11y-panel-body" role="group" aria-labelledby="a11y-heading">
        <!-- Font Size Controls -->
        <div class="a11y-control-group">
          <span class="a11y-label" id="font-size-label">Text Size: {{ settings.fontSize }}%</span>
          <div class="a11y-btn-row" role="group" aria-labelledby="font-size-label">
            <button
              class="a11y-btn"
              (click)="decreaseFontSize()"
              [disabled]="settings.fontSize <= 75"
              aria-label="Decrease text size">
              A-
            </button>
            <button
              class="a11y-btn"
              (click)="resetFontSize()"
              aria-label="Reset text size to default">
              Reset
            </button>
            <button
              class="a11y-btn"
              (click)="increaseFontSize()"
              [disabled]="settings.fontSize >= 200"
              aria-label="Increase text size">
              A+
            </button>
          </div>
        </div>

        <!-- High Contrast Toggle -->
        <div class="a11y-control-group">
          <button
            class="a11y-btn full-width"
            [class.active]="settings.highContrast"
            (click)="toggleHighContrast()"
            [attr.aria-pressed]="settings.highContrast"
            role="switch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2v20"/>
              <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor"/>
            </svg>
            High Contrast
          </button>
        </div>

        <!-- Reduced Motion Toggle -->
        <div class="a11y-control-group">
          <button
            class="a11y-btn full-width"
            [class.active]="settings.reducedMotion"
            (click)="toggleReducedMotion()"
            [attr.aria-pressed]="settings.reducedMotion"
            role="switch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 aria-hidden="true" focusable="false">
              <path d="M5 12h14"/>
              <path d="M12 5l7 7-7 7"/>
            </svg>
            Reduce Motion
          </button>
        </div>

        <!-- Text-to-Speech Toggle -->
        <div class="a11y-control-group">
          <button
            class="a11y-btn full-width"
            [class.active]="settings.ttsEnabled"
            (click)="toggleTTS()"
            [attr.aria-pressed]="settings.ttsEnabled"
            role="switch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 aria-hidden="true" focusable="false">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
            Text-to-Speech
          </button>
        </div>

        <!-- TTS Rate Controls (only when TTS enabled) -->
        <div class="a11y-control-group" *ngIf="settings.ttsEnabled">
          <span class="a11y-label" id="tts-rate-label">Speech Rate: {{ settings.ttsRate.toFixed(1) }}x</span>
          <div class="a11y-btn-row" role="group" aria-labelledby="tts-rate-label">
            <button
              class="a11y-btn"
              (click)="decreaseTTSRate()"
              [disabled]="settings.ttsRate <= 0.5"
              aria-label="Decrease speech rate">
              Slower
            </button>
            <button
              class="a11y-btn"
              (click)="increaseTTSRate()"
              [disabled]="settings.ttsRate >= 2.0"
              aria-label="Increase speech rate">
              Faster
            </button>
          </div>
        </div>

        <!-- Screen Reader Mode Toggle -->
        <div class="a11y-control-group">
          <button
            class="a11y-btn full-width"
            [class.active]="settings.screenReaderMode"
            (click)="toggleScreenReaderMode()"
            [attr.aria-pressed]="settings.screenReaderMode"
            role="switch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 aria-hidden="true" focusable="false">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Screen Reader Mode
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Toolbar Toggle Button */
    .a11y-toggle-btn {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 3000;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(20, 20, 20, 0.95);
      border: 2px solid rgba(0, 204, 51, 0.6);
      color: #00cc33;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(0, 204, 51, 0.3);
      transition: all 0.3s ease;
      padding: 0;
    }

    .a11y-toggle-btn:hover,
    .a11y-toggle-btn:focus-visible {
      border-color: #00cc33;
      box-shadow: 0 0 30px rgba(0, 204, 51, 0.5);
      transform: scale(1.1);
      outline: 3px solid #00cc33;
      outline-offset: 2px;
    }

    /* Panel */
    .a11y-panel {
      position: fixed;
      bottom: 80px;
      left: 20px;
      z-index: 3001;
      width: 300px;
      max-height: 80vh;
      background: rgba(15, 15, 15, 0.98);
      border: 2px solid rgba(0, 204, 51, 0.5);
      border-radius: 12px;
      box-shadow: 0 0 40px rgba(0, 204, 51, 0.3);
      backdrop-filter: blur(15px);
      transform: translateY(20px);
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      overflow-y: auto;
    }

    .a11y-panel.open {
      transform: translateY(0);
      opacity: 1;
      visibility: visible;
    }

    .a11y-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(0, 204, 51, 0.3);
    }

    .a11y-panel-header h2 {
      color: #00cc33;
      font-size: 1.1rem;
      font-family: 'Courier New', monospace;
      margin: 0;
      letter-spacing: 1px;
    }

    .a11y-close-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid rgba(0, 204, 51, 0.4);
      color: #00cc33;
      font-size: 1.3rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      padding: 0;
    }

    .a11y-close-btn:hover,
    .a11y-close-btn:focus-visible {
      background: rgba(0, 204, 51, 0.15);
      border-color: #00cc33;
      outline: 2px solid #00cc33;
      outline-offset: 1px;
    }

    .a11y-panel-body {
      padding: 1rem 1.25rem;
    }

    .a11y-control-group {
      margin-bottom: 1rem;
    }

    .a11y-label {
      display: block;
      color: #e0e0e0;
      font-size: 0.85rem;
      font-family: 'Courier New', monospace;
      margin-bottom: 0.5rem;
      letter-spacing: 0.5px;
    }

    .a11y-btn-row {
      display: flex;
      gap: 0.5rem;
    }

    .a11y-btn {
      flex: 1;
      padding: 0.6rem 0.5rem;
      background: rgba(0, 204, 51, 0.08);
      border: 1px solid rgba(0, 204, 51, 0.35);
      border-radius: 6px;
      color: #e0e0e0;
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }

    .a11y-btn:hover:not(:disabled),
    .a11y-btn:focus-visible:not(:disabled) {
      background: rgba(0, 204, 51, 0.2);
      border-color: #00cc33;
      color: #00cc33;
      outline: 2px solid #00cc33;
      outline-offset: 1px;
    }

    .a11y-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .a11y-btn.full-width {
      width: 100%;
      padding: 0.75rem;
    }

    .a11y-btn.active {
      background: rgba(0, 204, 51, 0.25);
      border-color: #00cc33;
      color: #00cc33;
      box-shadow: 0 0 10px rgba(0, 204, 51, 0.2);
    }

    @media (max-width: 480px) {
      .a11y-panel {
        left: 10px;
        right: 10px;
        width: auto;
        bottom: 75px;
      }

      .a11y-toggle-btn {
        left: 10px;
        bottom: 10px;
      }
    }
  `]
})
export class AccessibilityToolbarComponent implements OnInit, OnDestroy {
  isPanelOpen = false;
  settings: AccessibilitySettings = {} as AccessibilitySettings;
  private subscription: Subscription | null = null;

  constructor(private a11yService: AccessibilityService) {}

  ngOnInit(): void {
    this.subscription = this.a11yService.settings$.subscribe(s => {
      this.settings = s;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  togglePanel(): void {
    this.isPanelOpen = !this.isPanelOpen;
    if (this.isPanelOpen) {
      this.a11yService.announceToScreenReader('Accessibility settings panel opened');
    }
  }

  increaseFontSize(): void {
    this.a11yService.increaseFontSize();
    this.a11yService.announceToScreenReader(`Text size increased to ${this.settings.fontSize}%`);
  }

  decreaseFontSize(): void {
    this.a11yService.decreaseFontSize();
    this.a11yService.announceToScreenReader(`Text size decreased to ${this.settings.fontSize}%`);
  }

  resetFontSize(): void {
    this.a11yService.resetFontSize();
    this.a11yService.announceToScreenReader('Text size reset to default');
  }

  toggleHighContrast(): void {
    this.a11yService.toggleHighContrast();
    this.a11yService.announceToScreenReader(
      this.settings.highContrast ? 'High contrast enabled' : 'High contrast disabled'
    );
  }

  toggleReducedMotion(): void {
    this.a11yService.toggleReducedMotion();
    this.a11yService.announceToScreenReader(
      this.settings.reducedMotion ? 'Reduced motion enabled' : 'Reduced motion disabled'
    );
  }

  toggleTTS(): void {
    this.a11yService.toggleTTS();
    this.a11yService.announceToScreenReader(
      this.settings.ttsEnabled ? 'Text-to-speech enabled' : 'Text-to-speech disabled'
    );
  }

  toggleScreenReaderMode(): void {
    this.a11yService.toggleScreenReaderMode();
    this.a11yService.announceToScreenReader(
      this.settings.screenReaderMode ? 'Screen reader mode enabled' : 'Screen reader mode disabled'
    );
  }

  increaseTTSRate(): void {
    const newRate = Math.min(2.0, this.settings.ttsRate + 0.25);
    this.a11yService.updateSetting('ttsRate', newRate);
  }

  decreaseTTSRate(): void {
    const newRate = Math.max(0.5, this.settings.ttsRate - 0.25);
    this.a11yService.updateSetting('ttsRate', newRate);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isPanelOpen) {
      this.isPanelOpen = false;
    }
  }
}
