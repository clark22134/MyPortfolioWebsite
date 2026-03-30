import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TerminalLoaderService } from '../../services/terminal-loader.service';

@Component({
  selector: 'app-kali-terminal-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kali-terminal-loader.component.html',
  styleUrl: './kali-terminal-loader.component.css'
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
