import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { FooterComponent } from './components/footer/footer.component';
import { AccessibilityToolbarComponent } from './components/accessibility-toolbar/accessibility-toolbar.component';
import { KaliTerminalLoaderComponent } from './components/kali-terminal-loader/kali-terminal-loader.component';
import { ChatbotLauncherComponent } from './components/chatbot-launcher/chatbot-launcher.component';
import { TerminalLoaderService } from './services/terminal-loader.service';
import { CyberNetworkBackgroundComponent } from './components/cyber-network-background/cyber-network-background.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    FooterComponent,
    AccessibilityToolbarComponent,
    KaliTerminalLoaderComponent,
    ChatbotLauncherComponent,
    CyberNetworkBackgroundComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy {
  title = 'Portfolio';
  terminalComplete = false;
  isHomeRoute = true;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly terminalLoaderService: TerminalLoaderService,
    private readonly router: Router
  ) {
    this.isHomeRoute = this.computeIsHomeRoute(this.router.url);

    this.subscriptions.add(this.terminalLoaderService.complete$.subscribe(complete => {
      this.terminalComplete = complete;
    }));

    this.subscriptions.add(this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isHomeRoute = this.computeIsHomeRoute(event.urlAfterRedirects);
      }
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private computeIsHomeRoute(url: string): boolean {
    const path = url.split('?')[0].split('#')[0];
    return path === '' || path === '/';
  }
}
