import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  animations: [
    trigger('terminalFade', [
      state('void', style({ opacity: 1 })),
      transition(':leave', [
        animate('800ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ],
  template: `
    <!-- Terminal Loading Screen -->
    <div class="terminal-loader" *ngIf="showTerminal" [@terminalFade]>
      <div class="terminal-network-bg"></div>
      <div class="terminal-window">
        <div class="terminal-header">
          <div class="terminal-buttons">
            <span class="btn-close"></span>
            <span class="btn-minimize"></span>
            <span class="btn-maximize"></span>
          </div>
          <div class="terminal-title">root&#64;kali:~</div>
        </div>
        <div class="terminal-body">
          <div class="terminal-line" *ngFor="let line of terminalLines">
            <span [innerHTML]="line"></span>
          </div>
          <div class="terminal-cursor" *ngIf="showCursor">█</div>
        </div>
      </div>
    </div>

    <div class="home-container" *ngIf="!showTerminal">
      <!-- Cyber Logo -->
      <div class="cyber-logo">
        <div class="logo-icon">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <!-- Terminal window -->
            <rect x="10" y="20" width="80" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
            <line x1="10" y1="30" x2="90" y2="30" stroke="currentColor" stroke-width="2"/>
            <!-- Terminal prompt -->
            <text x="18" y="48" font-family="monospace" font-size="12" fill="currentColor">&gt;_</text>
            <!-- Code lines -->
            <line x1="35" y1="45" x2="70" y2="45" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="35" y1="55" x2="60" y2="55" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="35" y1="65" x2="75" y2="65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="logo-text">
          <span class="logo-prefix">user&#64;</span><span class="logo-host">portfolio</span>
        </div>
        <div class="scan-line"></div>
      </div>

      <!-- Animated Background -->
      <div class="animated-bg">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
        <div class="circle circle-3"></div>
      </div>

      <section class="hero" [class.scrolled]="scrolled">
        <div class="hero-content fade-in">
          <h1 class="hero-title">
            <span class="typed-text">{{ typedText }}</span><span class="cursor" [class.typing]="isTyping">|</span>
          </h1>
          <p class="hero-subtitle">Full Stack Developer & Security Enthusiast</p>
          <p class="hero-intro">
            Building secure, scalable applications with modern technologies. 
            Passionate about cloud architecture, DevSecOps practices, and creating 
            seamless user experiences. Let's connect and build something amazing together.
          </p>
          <div class="hero-buttons">
            <a routerLink="/projects" class="btn btn-primary">View Projects</a>
            <a href="/resume.html" target="_blank" class="btn btn-secondary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Resume
            </a>
            <a routerLink="/login" class="btn btn-outline">Interactive Projects (Login)</a>
            <a href="https://github.com/clark22134" target="_blank" class="btn btn-outline">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
        <div class="scroll-indicator">
          <div class="mouse"></div>
        </div>
      </section>

      <section class="featured-projects" #projectsSection>
        <h2 class="section-title">Featured Projects</h2>
        <div class="projects-grid">
          <div *ngFor="let project of featuredProjects; let i = index" 
               class="project-card"
               [class.visible]="projectsVisible"
               [style.animation-delay]="i * 0.1 + 's'">
            <div class="card-glow"></div>
            <h3>{{ project.title }}</h3>
            <p>{{ project.description }}</p>
            <div class="technologies">
              <span *ngFor="let tech of project.technologies" class="tech-badge">{{ tech }}</span>
            </div>
            <div class="project-links">
              <a *ngIf="project.githubUrl" [href]="project.githubUrl" target="_blank" class="link">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                GitHub
              </a>
              <a *ngIf="project.demoUrl" [href]="project.demoUrl" target="_blank" class="link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Live Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="skills" #skillsSection [class.visible]="skillsVisible">
        <h2 class="section-title">Skills & Expertise</h2>
        <div class="skills-grid">
          <div class="skill-category" *ngFor="let category of skillCategories; let i = index" [style.animation-delay]="i * 0.1 + 's'">
            <div class="skill-icon">{{ category.icon }}</div>
            <h3>{{ category.title }}</h3>
            <div class="skill-items">
              <span *ngFor="let skill of category.skills" class="skill-tag">{{ skill }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="about" #aboutSection [class.visible]="aboutVisible">
        <h2 class="section-title">About This Portfolio</h2>
        <p>
          This portfolio website was built using the following technologies:
        </p>
        <ul>
          <li>Angular 19 with TypeScript</li>
          <li>Spring Boot 3.2.1 with Java 21 (LTS)</li>
          <li>RESTful API architecture</li>
          <li>JWT Authentication & Spring Security</li>
          <li>AWS ECS Fargate (Serverless Containers)</li>
          <li>AWS Application Load Balancer (ALB)</li>
          <li>AWS Route 53 (DNS Management)</li>
          <li>AWS Certificate Manager (ACM) with SSL/TLS</li>
          <li>AWS ECR (Container Registry)</li>
          <li>AWS CloudWatch (Logging & Monitoring)</li>
          <li>Terraform Infrastructure as Code</li>
          <li>Docker Multi-Stage Builds</li>
          <li>DevSecOps with GitHub Actions CI/CD</li>
        </ul>
      </section>
    </div>
  `,
  styles: [`
    /* Terminal Loader Styles */
    .terminal-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #0a0a0a;
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .terminal-network-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        linear-gradient(rgba(0, 204, 51, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 204, 51, 0.05) 1px, transparent 1px),
        radial-gradient(circle at 20% 30%, rgba(0, 204, 51, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(0, 204, 51, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 50% 50%, rgba(0, 204, 51, 0.05) 0%, transparent 70%);
      background-size: 50px 50px, 50px 50px, 100% 100%, 100% 100%, 100% 100%;
      animation: networkPulse 4s ease-in-out infinite;
      opacity: 0.6;
    }

    @keyframes networkPulse {
      0%, 100% {
        opacity: 0.4;
      }
      50% {
        opacity: 0.8;
      }
    }

    .terminal-window {
      width: 90%;
      max-width: 800px;
      background: rgba(20, 20, 20, 0.95);
      border-radius: 8px;
      box-shadow: 
        0 0 30px rgba(0, 204, 51, 0.3),
        0 0 60px rgba(0, 204, 51, 0.2);
      border: 2px solid rgba(0, 204, 51, 0.4);
      overflow: hidden;
      backdrop-filter: blur(10px);
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

    .terminal-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .terminal-buttons span {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }

    .btn-close {
      background: #ff5f56;
      box-shadow: 0 0 5px rgba(255, 95, 86, 0.5);
    }

    .btn-minimize {
      background: #ffbd2e;
      box-shadow: 0 0 5px rgba(255, 189, 46, 0.5);
    }

    .btn-maximize {
      background: #27c93f;
      box-shadow: 0 0 5px rgba(39, 201, 63, 0.5);
    }

    .terminal-title {
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

    .terminal-line {
      margin-bottom: 0.5rem;
      animation: terminalTyping 0.1s ease-in;
    }

    @keyframes terminalTyping {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .terminal-cursor {
      display: inline-block;
      animation: cursorBlink 0.8s infinite;
      color: #00cc33;
      margin-left: 4px;
    }

    @keyframes cursorBlink {
      0%, 50% {
        opacity: 1;
      }
      51%, 100% {
        opacity: 0;
      }
    }

    .home-container {
      min-height: 100vh;
      position: relative;
      overflow-x: hidden;
    }

    /* Cyber Logo */
    .cyber-logo {
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      padding: 15px;
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
      width: 50px;
      height: 50px;
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
      font-size: 0.9rem;
      color: #00cc33;
      text-shadow: 0 0 5px rgba(0, 204, 51, 0.5);
      letter-spacing: 1px;
    }

    .logo-prefix {
      color: #808080;
    }

    .logo-host {
      color: #00cc33;
      font-weight: 600;
    }

    .scan-line {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #00cc33, transparent);
      animation: scanMove 2s linear infinite;
    }

    @keyframes scanMove {
      0% {
        transform: translateY(0);
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        transform: translateY(-80px);
        opacity: 0;
      }
    }

    /* Animated Background */
    .animated-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      overflow: hidden;
      background: #0a0a0a;
    }

    /* Cyber Grid Background */
    .animated-bg::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        linear-gradient(rgba(0, 255, 65, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 255, 65, 0.05) 1px, transparent 1px);
      background-size: 50px 50px;
      animation: gridMove 20s linear infinite;
    }

    @keyframes gridMove {
      0% {
        transform: translate(0, 0);
      }
      100% {
        transform: translate(50px, 50px);
      }
    }

    /* Network Nodes */
    .circle {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0, 255, 65, 0.15) 0%, transparent 70%);
      border: 2px solid rgba(0, 255, 65, 0.3);
      animation: pulse 4s infinite ease-in-out;
    }

    .circle::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 8px;
      height: 8px;
      background: #00ff41;
      border-radius: 50%;
      box-shadow: 0 0 20px #00ff41, 0 0 30px #00ff41;
    }

    /* Connecting Lines */
    .circle::after {
      content: '';
      position: absolute;
      width: 200%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.3), transparent);
      top: 50%;
      left: 50%;
      animation: lineGlow 3s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.5;
      }
      50% {
        transform: scale(1.2);
        opacity: 0.8;
      }
    }

    @keyframes lineGlow {
      0%, 100% {
        opacity: 0.2;
      }
      50% {
        opacity: 0.8;
      }
    }

    .circle-1 {
      width: 150px;
      height: 150px;
      top: 15%;
      left: 10%;
      animation-delay: 0s;
    }

    .circle-2 {
      width: 120px;
      height: 120px;
      top: 50%;
      right: 15%;
      animation-delay: 1.5s;
    }

    .circle-3 {
      width: 180px;
      height: 180px;
      bottom: 20%;
      left: 60%;
      animation-delay: 3s;
    }

    @keyframes float {
      0%, 100% {
        transform: translate(0, 0);
      }
      50% {
        transform: translate(20px, -20px);
      }
    }

    /* Fade-in animation */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .fade-in {
      animation: fadeIn 1s ease-out;
    }

    .hero {
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      color: white;
      padding: 6rem 2rem 4rem;
      text-align: center;
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      transition: transform 0.3s ease-out;
      border-bottom: 2px solid rgba(0, 255, 65, 0.3);
    }

    .hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 255, 65, 0.03) 0px,
        transparent 1px,
        transparent 2px,
        rgba(0, 255, 65, 0.03) 3px
      );
      pointer-events: none;
      animation: scanlines 8s linear infinite;
      z-index: 1;
    }

    @keyframes scanlines {
      0% {
        transform: translateY(0);
      }
      100% {
        transform: translateY(10px);
      }
    }

    .hero.scrolled {
      transform: scale(0.95);
    }

    .hero-content {
      max-width: 800px;
      margin: 0 auto;
      z-index: 1;
    }

    .hero-title {
      font-size: 4rem;
      margin-bottom: 1.5rem;
      font-weight: 700;
      color: #00cc33;
      text-shadow: 
        0 0 8px rgba(0, 204, 51, 0.4),
        0 0 15px rgba(0, 204, 51, 0.3);
      letter-spacing: 3px;
      position: relative;
      font-family: 'Courier New', 'Space Grotesk', monospace;
      text-transform: uppercase;
      min-height: 4.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .typed-text {
      display: inline-block;
    }

    .cursor {
      display: inline-block;
      color: #00cc33;
      text-shadow: 0 0 8px rgba(0, 204, 51, 0.4);
      animation: blink 0.7s infinite;
      margin-left: 2px;
    }

    .cursor.typing {
      animation: none;
      opacity: 1;
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    .hero-subtitle {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #00ff41;
      opacity: 0.85;
      animation: fadeIn 1s ease-out 0.4s both;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-weight: 500;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
    }

    .hero-intro {
      font-size: 1.1rem;
      max-width: 700px;
      margin: 0 auto 2rem;
      opacity: 0.8;
      line-height: 1.8;
      animation: fadeIn 1s ease-out 0.6s both;
      font-weight: 300;
    }

    .hero-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
      animation: fadeIn 1s ease-out 0.8s both;
    }

    .btn {
      padding: 0.75rem 2rem;
      border-radius: 25px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      position: relative;
      overflow: hidden;
    }

    .btn::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    .btn:hover::before {
      width: 300px;
      height: 300px;
    }

    .btn-primary {
      background: white;
      color: #1a1a1a;
      box-shadow: 0 4px 15px rgba(255, 255, 255, 0.3);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 2px solid white;
      backdrop-filter: blur(10px);
    }

    .btn-outline {
      background: transparent;
      color: white;
      border: 2px solid white;
    }

    .btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(255,255,255,0.4);
    }

    .btn svg {
      position: relative;
      z-index: 1;
    }

    /* Scroll indicator */
    .scroll-indicator {
      position: absolute;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      animation: bounce 2s infinite;
    }

    .mouse {
      width: 24px;
      height: 40px;
      border: 2px solid white;
      border-radius: 12px;
      position: relative;
    }

    .mouse::before {
      content: '';
      width: 4px;
      height: 8px;
      background: white;
      border-radius: 2px;
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      animation: scroll 2s infinite;
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateX(-50%) translateY(0);
      }
      40% {
        transform: translateX(-50%) translateY(-10px);
      }
      60% {
        transform: translateX(-50%) translateY(-5px);
      }
    }

    @keyframes scroll {
      0% {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      100% {
        opacity: 0;
        transform: translateX(-50%) translateY(12px);
      }
    }

    .featured-projects, .about {
      max-width: 1200px;
      margin: 4rem auto;
      padding: 0 2rem;
      position: relative;
      z-index: 1;
    }

    .section-title {
      font-size: 2.5rem;
      margin-bottom: 3rem;
      text-align: center;
      color: #ffffff;
      position: relative;
      display: inline-block;
      left: 50%;
      transform: translateX(-50%);
      font-weight: 600;
      letter-spacing: -0.5px;
    }

    .section-title::after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, #ffffff 0%, #808080 100%);
      border-radius: 2px;
    }

    h2 {
      font-size: 2.5rem;
      margin-bottom: 2rem;
      text-align: center;
      color: #333;
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 2rem;
      margin-top: 2rem;
    }

    .project-card {
      background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      opacity: 0;
      transform: translateY(30px);
      border: 1px solid rgba(255,255,255,0.1);
    }

    .project-card.visible {
      animation: slideUp 0.6s ease-out forwards;
    }

    @keyframes slideUp {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .card-glow {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }

    .card-glow:hover {
      opacity: 1;
    }

    .project-card:hover {
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 20px 40px rgba(255, 255, 255, 0.2);
      border-color: rgba(255,255,255,0.3);
    }

    .project-card h3 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #ffffff;
      position: relative;
      z-index: 1;
      transition: color 0.3s;
      font-weight: 600;
    }

    .project-card:hover h3 {
      color: #e0e0e0;
    }

    .project-card p {
      color: #b0b0b0;
      margin-bottom: 1rem;
      line-height: 1.6;
      position: relative;
      z-index: 1;
    }

    .technologies {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
      position: relative;
      z-index: 1;
    }

    .tech-badge {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.4rem 0.9rem;
      border-radius: 12px;
      font-size: 0.875rem;
      color: #e0e0e0;
      font-weight: 500;
      transition: all 0.3s;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .tech-badge:hover {
      background: rgba(255, 255, 255, 0.9);
      color: #1a1a1a;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(255, 255, 255, 0.3);
    }

    .project-links {
      display: flex;
      gap: 1rem;
      position: relative;
      z-index: 1;
    }

    .link {
      color: #ffffff;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      border: 2px solid transparent;
    }

    .link:hover {
      color: #e0e0e0;
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateX(3px);
    }

    .link svg {
      transition: transform 0.3s;
    }

    .link:hover svg {
      transform: scale(1.1);
    }

    /* Skills Section */
    .skills {
      max-width: 1200px;
      margin: 6rem auto;
      padding: 0 2rem;
      position: relative;
      z-index: 1;
      opacity: 0;
      transform: translateY(30px);
      transition: all 0.8s ease-out;
    }

    .skills.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .skills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      margin-top: 3rem;
    }

    .skill-category {
      background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
      border-radius: 16px;
      padding: 2.5rem 2rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      text-align: center;
      opacity: 0;
      animation: skillSlideUp 0.6s ease-out forwards;
      border: 1px solid rgba(255,255,255,0.1);
    }

    @keyframes skillSlideUp {
      to {
        opacity: 1;
      }
    }

    .skill-category:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 30px rgba(255, 255, 255, 0.2);
      border-color: rgba(255,255,255,0.3);
    }

    .skill-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      filter: grayscale(0.3);
      transition: all 0.3s;
    }

    .skill-category:hover .skill-icon {
      filter: grayscale(0);
      transform: scale(1.1);
    }

    .skill-category h3 {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      color: #ffffff;
      font-weight: 600;
    }

    .skill-items {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      justify-content: center;
    }

    .skill-tag {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      color: #e0e0e0;
      font-weight: 500;
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s;
    }

    .skill-tag:hover {
      background: rgba(255, 255, 255, 0.9);
      color: #1a1a1a;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(255, 255, 255, 0.3);
    }

    .about {
      text-align: center;
      opacity: 0;
      transform: translateY(30px);
      transition: all 0.8s ease-out;
    }

    .about.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .about p {
      font-size: 1.2rem;
      color: #b0b0b0;
      margin-bottom: 2rem;
    }

    .about ul {
      list-style: none;
      padding: 0;
      display: inline-block;
      text-align: left;
      background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
      border-radius: 16px;
      padding: 2rem 3rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
    }

    .about li {
      font-size: 1.1rem;
      color: #e0e0e0;
      margin: 1rem 0;
      padding-left: 2rem;
      position: relative;
      transition: all 0.3s;
    }

    .about li:hover {
      transform: translateX(5px);
      color: #ffffff;
    }

    .about li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #ffffff;
      font-weight: bold;
      font-size: 1.3rem;
      transition: transform 0.3s;
    }

    .about li:hover:before {
      transform: scale(1.2);
    }

    @media (max-width: 768px) {
      .terminal-window {
        width: 95%;
        max-width: none;
      }

      .cyber-logo {
        top: 10px;
        left: 10px;
        padding: 10px;
        gap: 5px;
      }

      .logo-icon {
        width: 35px;
        height: 35px;
      }

      .logo-text {
        font-size: 0.75rem;
      }

      .terminal-body {
        font-size: 0.75rem;
        padding: 1rem;
        min-height: 300px;
      }

      .terminal-title {
        font-size: 0.75rem;
      }

      .hero {
        padding: 4rem 1rem 3rem;
        min-height: 80vh;
      }

      .hero-title {
        font-size: 2rem;
        letter-spacing: 2px;
        min-height: 3rem;
      }

      .hero-subtitle {
        font-size: 1rem;
        letter-spacing: 1px;
      }

      .hero-intro {
        font-size: 0.95rem;
        line-height: 1.6;
      }

      .hero-buttons {
        flex-direction: column;
        width: 100%;
      }

      .btn {
        width: 100%;
        justify-content: center;
      }

      .projects-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .skills-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .section-title {
        font-size: 1.75rem;
      }

      .featured-projects, .skills, .about {
        padding: 0 1rem;
        margin: 3rem auto;
      }

      .about ul {
        padding: 1.5rem 2rem;
        font-size: 0.9rem;
      }

      .about li {
        font-size: 0.95rem;
      }

      .circle {
        display: none;
      }

      .scroll-indicator {
        display: none;
      }

      .project-card {
        padding: 1.5rem;
      }

      .skill-category {
        padding: 2rem 1.5rem;
      }
    }

    @media (max-width: 480px) {
      .hero-title {
        font-size: 1.5rem;
      }

      .hero-subtitle {
        font-size: 0.9rem;
      }

      .terminal-body {
        font-size: 0.65rem;
        line-height: 1.4;
      }

      .btn {
        padding: 0.6rem 1.5rem;
        font-size: 0.9rem;
      }
    }
  `]
})
export class HomeComponent implements OnInit, AfterViewInit {
  featuredProjects: Project[] = [];
  scrolled = false;
  projectsVisible = false;
  skillsVisible = false;
  aboutVisible = false;
  typedText = '';
  isTyping = true;
  private fullText = 'WELCOME';
  private typingSpeed = 150;

  // Terminal loading screen properties
  showTerminal = true;
  showCursor = true;
  terminalLines: string[] = [];

  skillCategories = [
    {
      icon: '💻',
      title: 'Frontend Development',
      skills: ['Angular', 'TypeScript', 'HTML/CSS', 'SCSS', 'Responsive Design']
    },
    {
      icon: '⚙️',
      title: 'Backend Development',
      skills: ['Java', 'Spring Boot', 'Spring Security', 'REST API', 'JWT']
    },
    {
      icon: '☁️',
      title: 'Cloud & DevOps',
      skills: ['AWS ECS', 'Docker', 'Terraform', 'GitHub Actions', 'CI/CD']
    },
    {
      icon: '🗄️',
      title: 'Database & Tools',
      skills: ['PostgreSQL', 'Git', 'Maven', 'Gradle', 'Postman']
    },
    {
      icon: '🔒',
      title: 'Cyber Security',
      skills: ['Network Penetration Testing', 'Host Penetration Testing', 'Threat Hunting', 'Incident Response', 'Digital Forensics']
    }
  ];

  constructor(private projectService: ProjectService) {}

  ngOnInit(): void {
    this.projectService.getFeaturedProjects().subscribe({
      next: (projects: Project[]) => this.featuredProjects = projects,
      error: (err: Error) => console.error('Error loading featured projects', err)
    });

    // Start terminal boot sequence
    this.startTerminalSequence();
  }

  private startTerminalSequence(): void {
    const lines = [
      '<span style="color: #808080;">root@kali</span>:<span style="color: #5555ff;">~</span>$ <span style="color: #fff;">./welcome.sh --init --security-mode=enhanced</span>',
      '',
      '<span style="color: #00cc33;">[✓]</span> Initializing security protocols...',
      '<span style="color: #00cc33;">[✓]</span> Loading network modules...',
      '<span style="color: #00cc33;">[✓]</span> Establishing secure connection...',
      '<span style="color: #00cc33;">[✓]</span> Scanning for vulnerabilities... <span style="color: #808080;">0 threats detected</span>',
      '<span style="color: #00cc33;">[✓]</span> Configuring firewall rules...',
      '<span style="color: #00cc33;">[✓]</span> Starting web services...',
      '',
      '<span style="color: #00cc33;">╔═══════════════════════════════════════╗</span>',
      '<span style="color: #00cc33;">║</span>  <span style="color: #fff;">PORTFOLIO SYSTEM v3.0</span>           <span style="color: #00cc33;">║</span>',
      '<span style="color: #00cc33;">║</span>  Status: <span style="color: #00cc33;">ONLINE</span>                   <span style="color: #00cc33;">║</span>',
      '<span style="color: #00cc33;">║</span>  Security: <span style="color: #00cc33;">ENABLED</span>                <span style="color: #00cc33;">║</span>',
      '<span style="color: #00cc33;">╚═══════════════════════════════════════╝</span>',
      '',
      '<span style="color: #ffbd2e;">⚡</span> <span style="color: #fff;">Launching interface...</span>',
      ''
    ];

    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      if (currentIndex < lines.length) {
        this.terminalLines.push(lines[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        this.showCursor = false;
        
        // Hide terminal and show main site after a delay
        setTimeout(() => {
          this.showTerminal = false;
          // Make all sections visible immediately after terminal
          this.projectsVisible = true;
          this.skillsVisible = true;
          this.aboutVisible = true;
          // Start typing animation for welcome text
          setTimeout(() => this.typeText(), 100);
        }, 800);
      }
    }, 200);
  }

  private typeText(): void {
    let index = 0;
    const type = () => {
      if (index < this.fullText.length) {
        this.typedText += this.fullText.charAt(index);
        index++;
        setTimeout(type, this.typingSpeed);
      } else {
        this.isTyping = false;
      }
    };
    setTimeout(type, 500); // Delay before starting
  }

  ngAfterViewInit(): void {
    // Set up intersection observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target.classList.contains('featured-projects')) {
            this.projectsVisible = true;
          }
          if (entry.target.classList.contains('skills')) {
            this.skillsVisible = true;
          }
          if (entry.target.classList.contains('about')) {
            this.aboutVisible = true;
          }
        }
      });
    }, observerOptions);

    // Observe sections after a delay to ensure DOM is ready
    setTimeout(() => {
      const projectsSection = document.querySelector('.featured-projects');
      const skillsSection = document.querySelector('.skills');
      const aboutSection = document.querySelector('.about');
      
      if (projectsSection) observer.observe(projectsSection);
      if (skillsSection) observer.observe(skillsSection);
      if (aboutSection) observer.observe(aboutSection);

      // Fallback: make all sections visible after terminal animation
      // This ensures content shows even if IntersectionObserver has issues
      setTimeout(() => {
        this.projectsVisible = true;
        this.skillsVisible = true;
        this.aboutVisible = true;
      }, 6000); // After terminal animation completes (approx 5-6 seconds)
    }, 100);
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.scrolled = window.scrollY > 50;
  }
}
