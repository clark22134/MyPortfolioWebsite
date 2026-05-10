import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { AccessibilityToolbarComponent } from './components/accessibility-toolbar/accessibility-toolbar.component';
import { KaliTerminalLoaderComponent } from './components/kali-terminal-loader/kali-terminal-loader.component';
import { ChatbotLauncherComponent } from './components/chatbot-launcher/chatbot-launcher.component';
import { TerminalLoaderService } from './services/terminal-loader.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    FooterComponent,
    AccessibilityToolbarComponent,
    KaliTerminalLoaderComponent,
    ChatbotLauncherComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Portfolio';
  terminalComplete = false;

  constructor(private readonly terminalLoaderService: TerminalLoaderService) {
    this.terminalLoaderService.complete$.subscribe(complete => {
      this.terminalComplete = complete;
    });
  }
}
