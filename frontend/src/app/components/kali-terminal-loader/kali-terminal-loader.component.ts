import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TerminalLoaderService } from '../../services/terminal-loader.service';

@Component({
  selector: 'app-kali-terminal-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="terminal-loader"
      [class.fade-out]="fadeOut"
      [class.hidden]="hidden"
      role="status"
      aria-label="Loading portfolio">

      <div class="network-bg" aria-hidden="true"></div>

      <div class="terminal-window" aria-hidden="true">
        <div class="terminal-header">
          <div class="btn-group">
            <span class="btn-close"></span>
            <span class="btn-minimize"></span>
            <span class="btn-maximize"></span>
          </div>
          <div class="title">root&#64;kali:~</div>
        </div>
        <div class="terminal-body">
          <div
            *ngFor="let line of visibleLines"
            class="line">
            {{ line || '\u00A0' }}
          </div>
          <span *ngIf="showCursor" class="cursor">█</span>
        </div>
      </div>

      <span class="sr-only">Portfolio is loading, please wait.</span>
    </div>
  `,
  styles: [`
    .terminal-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #0a0a0a;
      z-index: 99999;
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 1;
      transition: opacity 800ms ease-out;
      overflow: visible;
      margin: 0;
      padding: 0;
    }

    .terminal-loader.fade-out {
      opacity: 0;
      pointer-events: none;
    }

    .terminal-loader.hidden {
      display: none;
    }

    .network-bg {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background-image:
        linear-gradient(rgba(0, 204, 51, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 204, 51, 0.05) 1px, transparent 1px),
        radial-gradient(circle at 20% 30%, rgba(0, 204, 51, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(0, 204, 51, 0.1) 0%, transparent 50%);
      background-size: 50px 50px, 50px 50px, 100% 100%, 100% 100%;
      animation: networkPulse 4s ease-in-out infinite;
      opacity: 0.6;
    }

    @keyframes networkPulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }

    .terminal-window {
      width: 90%;
      max-width: 800px;
      background: rgba(20, 20, 20, 0.95);
      border-radius: 8px;
      box-shadow: 0 0 30px rgba(0, 204, 51, 0.3), 0 0 60px rgba(0, 204, 51, 0.2);
      border: 2px solid rgba(0, 204, 51, 0.4);
      overflow: hidden;
      position: relative;
      z-index: 1;
    }

    .terminal-header {
      background: rgba(40, 40, 40, 0.9);
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border-bottom: 1px solid rgba(0, 204, 51, 0.3);
    }

    .btn-group {
      display: flex;
      gap: 0.5rem;
    }

    .btn-group span {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }

    .btn-close { background: #ff5f56; box-shadow: 0 0 5px rgba(255,95,86,0.5); }
    .btn-minimize { background: #ffbd2e; box-shadow: 0 0 5px rgba(255,189,46,0.5); }
    .btn-maximize { background: #27c93f; box-shadow: 0 0 5px rgba(39,201,63,0.5); }

    .title {
      color: #00cc33;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      font-weight: 600;
      text-shadow: 0 0 5px rgba(0, 204, 51, 0.5);
    }

    .terminal-body {
      padding: 1.5rem;
      font-family: 'Courier New', monospace;
      font-size: 0.95rem;
      line-height: 1.6;
      min-height: 400px;
      color: #00cc33;
    }

    .line {
      margin-bottom: 0.5rem;
      animation: lineAppear 0.1s ease-in;
      color: #00cc33;
    }

    @keyframes lineAppear {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .cursor {
      display: inline-block;
      animation: cursorBlink 0.8s infinite;
      color: #00cc33;
      margin-left: 4px;
    }

    @keyframes cursorBlink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @media (max-width: 768px) {
      .terminal-window { width: 95%; }
      .terminal-body { font-size: 0.75rem; min-height: 300px; padding: 1rem; }
    }

    @media (max-width: 480px) {
      .terminal-body { font-size: 0.65rem; line-height: 1.4; }
    }

    @media (prefers-reduced-motion: reduce) {
      .terminal-loader { transition-duration: 0.01ms; }
      .network-bg { animation: none; }
      .cursor { animation: none; }
      .line { animation: none; }
    }
  `]
})
export class KaliTerminalLoaderComponent implements OnInit, OnDestroy {
  visibleLines: string[] = [];
  showCursor = true;
  fadeOut = false;
  hidden = false;

  private lines: string[] = [
    'root@kali:~$ ./welcome.sh --init --security-mode=enhanced',
    '',
    '[✓] Initializing security protocols...',
    '[✓] Loading network modules...',
    '[✓] Establishing secure connection...',
    '[✓] Scanning for vulnerabilities... 0 threats detected',
    '[✓] Configuring firewall rules...',
    '[✓] Starting web services...',
    '',
    '╔═══════════════════════════════════════╗',
    '║  PORTFOLIO SYSTEM v3.0                ║',
    '║  Status: ONLINE                       ║',
    '║  Security: ENABLED                    ║',
    '╚═══════════════════════════════════════╝',
    '',
    '⚡ Launching interface...',
    ''
  ];

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private timeouts: ReturnType<typeof setTimeout>[] = [];

  constructor(private terminalLoaderService: TerminalLoaderService) {}

  ngOnInit(): void {
    this.runAnimation();
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.timeouts.forEach(t => clearTimeout(t));
  }

  private runAnimation(): void {
    let i = 0;

    this.intervalId = setInterval(() => {
      if (i < this.lines.length) {
        this.visibleLines.push(this.lines[i]);
        i++;
      } else {
        clearInterval(this.intervalId!);
        this.intervalId = null;
        this.showCursor = false;

        const fadeTimeout = setTimeout(() => {
          this.fadeOut = true;

          const hideTimeout = setTimeout(() => {
            this.hidden = true;
            this.terminalLoaderService.markComplete();
          }, 850);
          this.timeouts.push(hideTimeout);
        }, 800);
        this.timeouts.push(fadeTimeout);
      }
    }, 200);
  }
}
