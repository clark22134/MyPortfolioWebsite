import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessibilityService, AccessibilitySettings } from '../../services/accessibility.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-accessibility-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accessibility-toolbar.component.html',
  styleUrl: './accessibility-toolbar.component.css'
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
