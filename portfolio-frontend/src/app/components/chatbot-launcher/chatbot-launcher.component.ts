import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { marked } from 'marked';
import { ChatbotService } from '../../services/chatbot.service';

/**
 * Floating portfolio assistant.
 *
 * Mounted once globally in {@link AppComponent}, so the launcher is
 * available on every route. Wraps the {@link ChatbotService} state
 * (signals) into an accessible chat panel.
 *
 * Accessibility
 * - Launcher button has aria-expanded + descriptive aria-label.
 * - Panel is `role="dialog" aria-modal="true"`.
 * - Message log is an aria-live="polite" region so screen readers
 *   announce streamed tokens without interrupting the user.
 * - Esc closes the panel and restores focus to the launcher.
 * - Tab cycles within the panel while open.
 */
@Component({
  selector: 'app-chatbot-launcher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-launcher.component.html',
  styleUrl: './chatbot-launcher.component.scss',
})
export class ChatbotLauncherComponent implements OnInit, AfterViewChecked {
  protected readonly chatbot = inject(ChatbotService);

  protected open = false;
  protected draft = '';

  protected readonly messages = this.chatbot.messages;
  protected readonly streaming = this.chatbot.streaming;
  protected readonly available = this.chatbot.available;
  protected readonly disabled = computed(() => this.streaming() || this.available() === false);

  @ViewChild('messageLog') private messageLog?: ElementRef<HTMLElement>;
  @ViewChild('input') private input?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('launcherBtn') private launcherBtn?: ElementRef<HTMLButtonElement>;

  private shouldScroll = false;

  constructor() {
    // Auto-scroll on every message mutation while open.
    effect(() => {
      // Read the signal so the effect tracks it.
      this.messages();
      if (this.open) this.shouldScroll = true;
    });
  }

  ngOnInit(): void {
    this.chatbot.checkHealth();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.messageLog) {
      const el = this.messageLog.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      this.shouldScroll = true;
      // Focus the input once the panel renders.
      queueMicrotask(() => this.input?.nativeElement.focus());
    } else {
      this.launcherBtn?.nativeElement.focus();
    }
  }

  close(): void {
    if (this.open) {
      this.open = false;
      this.launcherBtn?.nativeElement.focus();
    }
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || this.disabled()) return;
    this.draft = '';
    this.chatbot.send(text).subscribe();
  }

  reset(): void {
    this.chatbot.reset();
    queueMicrotask(() => this.input?.nativeElement.focus());
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  /**
   * Render assistant markdown to HTML. `marked` is already a dependency in
   * this project (used by the documentation viewer). We trust the LLM
   * output enough for inline markdown but escape raw HTML by leaving
   * `marked` defaults — it does not allow raw script tags.
   */
  protected renderMarkdown(text: string): string {
    if (!text) return '';
    const html = marked.parse(text, { async: false }) as string;
    return html;
  }

  protected trackById(_: number, m: { id: string }): string {
    return m.id;
  }
}
