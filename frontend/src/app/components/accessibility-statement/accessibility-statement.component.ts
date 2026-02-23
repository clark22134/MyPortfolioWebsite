import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavComponent } from '../nav/nav.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-accessibility-statement',
  standalone: true,
  imports: [CommonModule, RouterModule, NavComponent],
  template: `
    <app-nav></app-nav>

    <div class="a11y-statement-container">
      <!-- Cyber Logo -->
      <div class="cyber-logo" role="img" aria-label="Clark Foster Portfolio Logo">
        <div class="logo-icon">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
               aria-hidden="true" focusable="false">
            <rect x="10" y="20" width="80" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
            <line x1="10" y1="30" x2="90" y2="30" stroke="currentColor" stroke-width="2"/>
            <text x="18" y="48" font-family="monospace" font-size="12" fill="currentColor">&gt;_</text>
            <line x1="35" y1="45" x2="70" y2="45" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="35" y1="55" x2="60" y2="55" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="35" y1="65" x2="75" y2="65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="logo-text">
          <span class="logo-prefix">{{ isAuthenticated ? 'root' : 'user' }}&#64;</span><span class="logo-host">portfolio</span>
        </div>
        <div class="scan-line" aria-hidden="true"></div>
      </div>

      <article class="a11y-content" aria-labelledby="a11y-page-title">
        <header>
          <h1 id="a11y-page-title">Accessibility Statement</h1>
          <p class="subtitle">Our commitment to digital accessibility and WCAG 2.1 AA compliance</p>
          <p class="last-updated">Last updated: February 2026</p>
        </header>

        <!-- Commitment Section -->
        <section aria-labelledby="commitment-heading">
          <h2 id="commitment-heading">Our Commitment</h2>
          <p>
            Clark Foster's portfolio is committed to ensuring digital accessibility for people with disabilities.
            We continually improve the user experience for everyone and apply the relevant accessibility standards
            to ensure we provide equal access to all users. This commitment aligns with our work supporting
            federal applications including Library of Congress XPRESS IOSS and webreads systems, where
            Section 508 compliance and WCAG adherence are foundational requirements.
          </p>
        </section>

        <!-- Conformance Status -->
        <section aria-labelledby="conformance-heading">
          <h2 id="conformance-heading">Conformance Status</h2>
          <p>
            This website strives to conform to the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong>.
            These guidelines explain how to make web content more accessible to people with a wide array of disabilities.
            Conforming to these guidelines helps make the web a more inclusive experience.
          </p>
          <div class="conformance-details">
            <div class="conformance-card">
              <h3>WCAG 2.1 Level AA</h3>
              <p>Target conformance level</p>
            </div>
            <div class="conformance-card">
              <h3>Section 508</h3>
              <p>U.S. Federal accessibility standard</p>
            </div>
            <div class="conformance-card">
              <h3>EN 301 549</h3>
              <p>European accessibility standard</p>
            </div>
          </div>
        </section>

        <!-- Accessibility Features -->
        <section aria-labelledby="features-heading">
          <h2 id="features-heading">Accessibility Features</h2>

          <h3>ARIA Landmarks & Semantic Structure</h3>
          <ul>
            <li>Proper use of ARIA landmark roles (<code>main</code>, <code>navigation</code>, <code>contentinfo</code>, <code>banner</code>) for page structure</li>
            <li>Semantic HTML5 elements (<code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code>, <code>&lt;footer&gt;</code>, <code>&lt;section&gt;</code>, <code>&lt;article&gt;</code>)</li>
            <li>ARIA labels and descriptions on interactive components</li>
            <li>ARIA live regions for dynamic content announcements to screen readers</li>
            <li>Proper heading hierarchy (h1 → h2 → h3) for document outline</li>
          </ul>

          <h3>Keyboard Navigation</h3>
          <ul>
            <li><strong>Skip navigation link</strong> — Press <kbd>Tab</kbd> on any page to reveal a "Skip to main content" link</li>
            <li><strong>Focus trap in navigation menu</strong> — When the mobile menu is open, focus cycles within the menu</li>
            <li><strong>Escape key support</strong> — Press <kbd>Esc</kbd> to close menus and dialogs</li>
            <li><strong>Visible focus indicators</strong> — All interactive elements show a bright green focus ring (3px outline with glow effect)</li>
            <li><strong>Logical tab order</strong> — Elements are ordered in a meaningful sequence</li>
            <li>All interactive elements are operable via keyboard alone</li>
          </ul>

          <h3>Color Contrast & Visual Design</h3>
          <ul>
            <li>Primary text (#e5e5e5 on #0a0a0a) meets <strong>WCAG AAA 16.15:1</strong> contrast ratio</li>
            <li>Accent text (#00cc33 on #0a0a0a) meets <strong>WCAG AA 7.44:1</strong> contrast ratio</li>
            <li><strong>High contrast mode</strong> — Toggle via accessibility toolbar for maximum contrast with pure white text on black</li>
            <li>Information is not conveyed by color alone — icons, labels, and text accompany color differences</li>
          </ul>

          <h3>Text-to-Speech (TTS)</h3>
          <ul>
            <li>Built-in text-to-speech using the Web Speech API</li>
            <li>Adjustable speech rate (0.5x to 2.0x)</li>
            <li>TTS can be toggled on/off via the accessibility toolbar</li>
            <li>Navigation links announce on hover when TTS is enabled</li>
          </ul>

          <h3>Screen Reader Support</h3>
          <ul>
            <li>Tested with NVDA, VoiceOver (macOS), and Chrome's built-in screen reader</li>
            <li>All decorative images and SVGs marked with <code>aria-hidden="true"</code></li>
            <li>External links announce "(opens in new tab)" for screen readers</li>
            <li>Form inputs are properly associated with labels</li>
            <li>Dynamic content changes announced via ARIA live regions</li>
            <li>Screen reader mode available to hide purely decorative elements</li>
          </ul>

          <h3>Resizable Text & Zoom</h3>
          <ul>
            <li>Text resizable from 75% to 200% via the accessibility toolbar</li>
            <li>Page supports up to 400% browser zoom without loss of content</li>
            <li>All sizing uses <code>rem</code> units relative to root font size</li>
            <li>Layout adapts fluidly at all text sizes</li>
          </ul>

          <h3>Motion & Animation</h3>
          <ul>
            <li><strong>Reduced motion mode</strong> — Disables all animations and transitions</li>
            <li>Respects <code>prefers-reduced-motion</code> OS-level setting automatically</li>
            <li>Terminal boot animation is decorative and skippable</li>
          </ul>

          <h3>Images & Media</h3>
          <ul>
            <li>All informative SVG icons have <code>aria-label</code> attributes</li>
            <li>Decorative SVGs use <code>aria-hidden="true"</code> and <code>focusable="false"</code></li>
            <li>Alt text provided for all meaningful images</li>
          </ul>
        </section>

        <!-- Tools & Testing -->
        <section aria-labelledby="tools-heading">
          <h2 id="tools-heading">Testing Tools & Methodology</h2>
          <p>
            We use a combination of automated and manual testing to evaluate accessibility compliance:
          </p>

          <h3>Automated Testing (CI/CD Pipeline)</h3>
          <ul>
            <li><strong>axe-core</strong> — Industry-standard accessibility engine integrated into our CI/CD pipeline via GitHub Actions</li>
            <li><strong>pa11y</strong> — Automated accessibility testing runner for continuous compliance checking</li>
            <li><strong>Lighthouse CI</strong> — Google's accessibility auditing tool run on every pull request</li>
            <li>Tests run automatically on every commit and pull request</li>
            <li>Pipeline fails if accessibility violations of level A or AA are detected</li>
          </ul>

          <h3>Manual Testing</h3>
          <ul>
            <li><strong>Keyboard-only navigation</strong> — Complete site traversal without mouse</li>
            <li><strong>Screen reader testing</strong> — Tested with NVDA (Windows), VoiceOver (macOS/iOS)</li>
            <li><strong>Browser zoom</strong> — Verified content at 200% and 400% zoom</li>
            <li><strong>axe DevTools</strong> — Chrome extension for page-level auditing</li>
            <li><strong>WAVE</strong> — WebAIM's web accessibility evaluation tool</li>
            <li><strong>Color contrast analyzers</strong> — Verified all color combinations</li>
          </ul>

          <h3>Standards Audited Against</h3>
          <ul>
            <li>WCAG 2.1 Level A and Level AA success criteria</li>
            <li>Section 508 of the Rehabilitation Act</li>
            <li>WAI-ARIA 1.2 Authoring Practices</li>
            <li>ATAG 2.0 (Authoring Tool Accessibility Guidelines)</li>
          </ul>
        </section>

        <!-- Known Limitations -->
        <section aria-labelledby="limitations-heading">
          <h2 id="limitations-heading">Known Limitations</h2>
          <p>
            While we strive for comprehensive accessibility, some areas may have limitations:
          </p>
          <ul>
            <li>The terminal boot animation on the homepage — while decorative — may be challenging for users with vestibular disorders (mitigated by reduced motion support)</li>
            <li>Some third-party content (e.g., embedded GitHub widgets) may not fully conform</li>
            <li>Text-to-speech quality depends on the user's browser and OS speech engine</li>
          </ul>
        </section>

        <!-- Feedback -->
        <section aria-labelledby="feedback-heading">
          <h2 id="feedback-heading">Feedback</h2>
          <p>
            We welcome your feedback on the accessibility of this portfolio website. If you encounter
            accessibility barriers or have suggestions for improvement, please contact us:
          </p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:clark&#64;clarkfoster.com">clark&#64;clarkfoster.com</a></li>
            <li><strong>Contact Form:</strong> <a routerLink="/contact">Submit a message</a></li>
            <li><strong>GitHub:</strong> <a href="https://github.com/clark22134" target="_blank" rel="noopener noreferrer">Open an issue<span class="sr-only"> (opens in new tab)</span></a></li>
          </ul>
          <p>We aim to respond to accessibility feedback within 2 business days.</p>
        </section>

        <!-- Technical Details -->
        <section aria-labelledby="technical-heading">
          <h2 id="technical-heading">Technical Specifications</h2>
          <p>Accessibility of this website relies on the following technologies:</p>
          <ul>
            <li>HTML5</li>
            <li>WAI-ARIA 1.2</li>
            <li>CSS3 (with prefers-reduced-motion and prefers-contrast media queries)</li>
            <li>Angular 21 with standalone components</li>
            <li>Web Speech API for text-to-speech</li>
            <li>axe-core for automated accessibility testing</li>
          </ul>
          <p>
            These technologies are relied upon for conformance with WCAG 2.1 Level AA.
          </p>
        </section>
      </article>
    </div>
  `,
  styles: [`
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .a11y-statement-container {
      min-height: calc(100vh - 60px);
      background: #0a0a0a;
      padding: 4rem 2rem;
      position: relative;
    }

    .a11y-statement-container::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background:
        repeating-linear-gradient(
          0deg,
          rgba(0, 204, 51, 0.03) 0px,
          transparent 1px,
          transparent 2px,
          rgba(0, 204, 51, 0.03) 3px
        );
      pointer-events: none;
      z-index: 0;
    }

    .a11y-content {
      max-width: 900px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
      padding-top: 100px;
    }

    header {
      text-align: center;
      margin-bottom: 4rem;
    }

    h1 {
      color: #00cc33;
      font-size: 2.25rem;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
      text-shadow:
        0 0 8px rgba(0, 204, 51, 0.4),
        0 0 15px rgba(0, 204, 51, 0.3);
      margin-bottom: 1rem;
    }

    .subtitle {
      color: #e0e0e0;
      font-size: 1.2rem;
      margin-bottom: 0.5rem;
    }

    .last-updated {
      color: #808080;
      font-size: 0.9rem;
      font-family: 'Courier New', monospace;
    }

    h2 {
      color: #00cc33;
      font-size: 1.5rem;
      font-family: 'Courier New', monospace;
      margin: 3rem 0 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid rgba(0, 204, 51, 0.3);
      text-shadow: 0 0 5px rgba(0, 204, 51, 0.3);
    }

    h3 {
      color: #00ff41;
      font-size: 1.15rem;
      font-family: 'Courier New', monospace;
      margin: 2rem 0 0.75rem;
    }

    p {
      color: #e0e0e0;
      line-height: 1.8;
      margin-bottom: 1rem;
      font-size: 1rem;
    }

    ul {
      padding-left: 2rem;
      margin-bottom: 1.5rem;
    }

    li {
      color: #e0e0e0;
      line-height: 1.8;
      margin-bottom: 0.5rem;
    }

    a {
      color: #00cc33;
      text-decoration: underline;
      text-underline-offset: 3px;
      transition: color 0.2s;
    }

    a:hover,
    a:focus-visible {
      color: #00ff41;
    }

    strong {
      color: #ffffff;
    }

    code {
      background: rgba(0, 204, 51, 0.15);
      border: 1px solid rgba(0, 204, 51, 0.3);
      border-radius: 4px;
      padding: 0.15rem 0.4rem;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #00ff41;
    }

    kbd {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      padding: 0.15rem 0.5rem;
      font-family: 'Courier New', monospace;
      font-size: 0.85em;
      color: #ffffff;
      box-shadow: 0 2px 0 rgba(255, 255, 255, 0.2);
    }

    .conformance-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }

    .conformance-card {
      background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
      border: 1px solid rgba(0, 204, 51, 0.3);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      transition: all 0.3s;
    }

    .conformance-card:hover {
      border-color: #00cc33;
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0, 204, 51, 0.3);
    }

    .conformance-card h3 {
      margin-top: 0;
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }

    .conformance-card p {
      color: #b0b0b0;
      font-size: 0.9rem;
      margin-bottom: 0;
    }

    /* Cyber Logo Styles */
    .cyber-logo {
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 8px;
      background: rgba(20, 20, 20, 0.85);
      border: 2px solid rgba(0, 204, 51, 0.4);
      border-radius: 8px;
      backdrop-filter: blur(10px);
      box-shadow:
        0 0 20px rgba(0, 204, 51, 0.2),
        inset 0 0 20px rgba(0, 204, 51, 0.05);
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .cyber-logo:hover {
      border-color: rgba(0, 204, 51, 0.7);
      box-shadow:
        0 0 30px rgba(0, 204, 51, 0.4),
        inset 0 0 20px rgba(0, 204, 51, 0.1);
      transform: translateY(-2px);
    }

    .logo-icon {
      width: 38px;
      height: 38px;
      color: #00cc33;
      animation: pulse 3s ease-in-out infinite;
      filter: drop-shadow(0 0 8px rgba(0, 204, 51, 0.5));
    }

    .logo-icon svg {
      width: 100%;
      height: 100%;
    }

    .logo-text {
      font-family: 'Courier New', monospace;
      font-size: 0.68rem;
      color: #00cc33;
      text-shadow: 0 0 5px rgba(0, 204, 51, 0.5);
      letter-spacing: 1px;
    }

    .logo-prefix { color: #808080; }
    .logo-host { color: #00cc33; font-weight: 600; }

    .scan-line {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #00cc33, transparent);
      animation: scanMove 2s linear infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        filter: drop-shadow(0 0 8px rgba(0, 204, 51, 0.5));
      }
      50% {
        opacity: 0.8;
        filter: drop-shadow(0 0 15px rgba(0, 204, 51, 0.7));
      }
    }

    @keyframes scanMove {
      0% { transform: translateY(0); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: translateY(-80px); opacity: 0; }
    }

    @media (max-width: 768px) {
      .a11y-content {
        padding-top: 80px;
      }

      h1 { font-size: 1.75rem; }
      h2 { font-size: 1.3rem; }

      .conformance-details {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .a11y-statement-container {
        padding: 2rem 1rem;
      }

      h1 { font-size: 1.4rem; }
    }
  `]
})
export class AccessibilityStatementComponent {
  isAuthenticated = false;

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }
}
