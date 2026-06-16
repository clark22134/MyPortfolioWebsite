import { Component, OnInit, AfterViewInit, HostListener, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';
import { AuthService } from '../../services/auth.service';
import { TerminalLoaderService } from '../../services/terminal-loader.service';
import { CyberNetworkBackgroundComponent } from '../cyber-network-background/cyber-network-background.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, CyberNetworkBackgroundComponent],

  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  featuredProjects: Project[] = [];
  scrolled = false;
  projectsVisible = false;
  skillsVisible = false;
  aboutVisible = false;
  typedText = '';
  isTyping = true;
  cursorEnabled = false;
  cursorVisible = false;
  cursorPressed = false;
  activeVideoIndex = 0;
  cursorParticles: CursorParticle[] = [];
  cursorBranches: CursorBranch[] = [];
  backgroundNodes: BackgroundNode[] = [];
  backgroundEdges: BackgroundEdge[] = [];

  private particleAnimationFrame: number | null = null;
  private videoMonitorFrame: number | null = null;
  private crossfadeCleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private isCrossfading = false;
  private lastFrameTime = 0;
  private magneticTarget: MagneticTarget | null = null;
  private pointerX = 0;
  private pointerY = 0;
  private smoothPointerX = 0;
  private smoothPointerY = 0;
  viewportWidth = 100;
  viewportHeight = 100;
  private nodeAnimationPhase = 0;
  private particleIdCounter = 0;
  private branchIdCounter = 0;
  private readonly particleFrameMs = 16;
  private readonly maxParticles = 24;
  private readonly maxBranches = 16;
  private readonly particleLifeMs = 780;
  private readonly particleLifeVarianceMs = 220;
  private readonly emitMinDistancePx = 3;
  private readonly pointerLag = 0.12; // ~50-100ms perceived delay
  private readonly magneticRadiusPx = 140;
  private readonly magneticStrength = 0.13;
  private readonly backgroundNodeCount = 18;
  private readonly fullText = 'WELCOME';
  private readonly typingSpeed = 150;
  private readonly videoFadeDurationMs = 700;
  private readonly videoFadeLeadSeconds = 0.8;
  private terminalSub: Subscription | null = null;

  @ViewChild('videoA') private videoARef?: ElementRef<HTMLVideoElement>;
  @ViewChild('videoB') private videoBRef?: ElementRef<HTMLVideoElement>;

  skillCategories = [
    {
      icon: '💻',
      title: 'Frontend Development',
      skills: ['Angular', 'React', 'TypeScript', 'HTML/CSS', 'Responsive Design', 'WAI-ARIA 1.2']
    },
    {
      icon: '⚙️',
      title: 'Backend Development',
      skills: ['Java', 'Python', 'Spring Boot', 'C#/.NET', 'REST API', 'PostgreSQL', 'MySQL', 'JWT']
    },
    {
      icon: '☁️',
      title: 'Cloud Infrastructure',
      skills: ['AWS Lambda', 'Aurora Serverless', 'CloudFront', 'API Gateway', 'S3', 'WAF', 'Route 53', 'ACM', 'CloudWatch', 'Terraform', 'EC2']
    },
    {
      icon: '🔧',
      title: 'DevSecOps & CI/CD',
      skills: ['GitHub Actions', 'Jenkins', 'SonarQube', 'Trivy', 'Docker', 'Ansible', 'Bash/PowerShell', 'Linux', 'Windows', 'GitHub', 'Agile']
    },
    {
      icon: '🤖',
      title: 'AI/ML',
      skills: ['Python (HuggingFace & LangChain)', 'LLMs', 'RAG', 'Prompt Engineering', 'Pandas/NumPy/Scikit-Learn', 'GitHub Copilot', 'Claude', 'Codex', 'IDP']
    },
    {
      icon: '🔒',
      title: 'Cyber Security',
      skills: ['Network and Host Penetration Testing', 'Threat Hunting', 'Incident Response', 'Digital Forensics']
    },
    {
      icon: '♿',
      title: 'Accessibility & Testing',
      skills: ['Screen Reader Testing', 'axe-core / Puppeteer', 'Keyboard Navigation', 'ARIA Landmarks & Roles', 'Color Contrast Analysis', 'Web Speech API (TTS)']
    }
  ];

  isAuthenticated = false;

  constructor(
    private readonly projectService: ProjectService,
    private readonly authService: AuthService,
    private readonly terminalLoaderService: TerminalLoaderService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  ngOnInit(): void {
    this.projectService.getFeaturedProjects().subscribe({
      next: (projects: Project[]) => this.featuredProjects = projects,
      error: (err: Error) => {
        console.error('Failed to load featured projects', err);
      }
    });

    // Listen for the terminal animation to complete
    this.waitForTerminalComplete();

    // Enable custom cursor only on desktop-like pointer devices.
    this.cursorEnabled = this.supportsFancyCursor();
    if (this.cursorEnabled) {
      this.viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
      this.viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
      this.smoothPointerX = this.pointerX;
      this.smoothPointerY = this.pointerY;
      this.initializeBackgroundGraph();
      this.startParticleLoop();
    }
  }

  private waitForTerminalComplete(): void {
    const onComplete = () => {
      this.projectsVisible = true;
      this.skillsVisible = true;
      this.aboutVisible = true;
      setTimeout(() => this.typeText(), 100);
    };

    if (this.terminalLoaderService.isComplete) {
      onComplete();
    } else {
      this.terminalSub = this.terminalLoaderService.complete$.subscribe(complete => {
        if (complete) {
          onComplete();
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.terminalSub) {
      this.terminalSub.unsubscribe();
    }

    if (this.particleAnimationFrame !== null) {
      cancelAnimationFrame(this.particleAnimationFrame);
      this.particleAnimationFrame = null;
    }

    if (this.videoMonitorFrame !== null) {
      cancelAnimationFrame(this.videoMonitorFrame);
      this.videoMonitorFrame = null;
    }

    if (this.crossfadeCleanupTimer !== null) {
      clearTimeout(this.crossfadeCleanupTimer);
      this.crossfadeCleanupTimer = null;
    }
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
      const projectsSection = document.querySelector('.about-me');
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

    this.initializeVideoLayers();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.scrolled = window.scrollY > 50;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.cursorEnabled) return;

    this.cursorVisible = true;
    const dx = event.clientX - this.pointerX;
    const dy = event.clientY - this.pointerY;
    const distance = Math.hypot(dx, dy);

    this.pointerX = event.clientX;
    this.pointerY = event.clientY;

    if (distance >= this.emitMinDistancePx) {
      this.emitTrailParticle();
    }
  }

  @HostListener('window:mousedown')
  onMouseDown(): void {
    if (!this.cursorEnabled) return;
    this.cursorPressed = true;
    this.emitTrailParticle(2.2);
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    if (!this.cursorEnabled) return;
    this.cursorPressed = false;
  }

  @HostListener('window:mouseleave')
  onMouseLeave(): void {
    if (!this.cursorEnabled) return;
    this.cursorVisible = false;
    this.cursorPressed = false;
    this.magneticTarget = null;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!this.cursorEnabled) return;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.reseedBackgroundGraph();
  }

  private supportsFancyCursor(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }

    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const noReducedMotion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return finePointer && noReducedMotion;
  }

  private startParticleLoop(): void {
    if (this.particleAnimationFrame !== null) return;

    const animate = (timestamp: number) => {
      const dtMs = this.lastFrameTime ? Math.min(48, timestamp - this.lastFrameTime) : this.particleFrameMs;
      this.lastFrameTime = timestamp;
      this.advanceTrailFrame(dtMs);
      this.particleAnimationFrame = requestAnimationFrame(animate);
    };

    this.particleAnimationFrame = requestAnimationFrame(animate);
  }

  private emitTrailParticle(energy = 1): void {
    const now = this.lastFrameTime || performance.now();
    const baseSize = this.cursorPressed ? 8 : 6;
    const randomAngle = Math.random() * Math.PI * 2;
    const randomSpeed = (0.08 + Math.random() * 0.22) * energy;
    const vx = Math.cos(randomAngle) * randomSpeed;
    const vy = Math.sin(randomAngle) * randomSpeed;

    const particle: CursorParticle = {
      id: this.particleIdCounter++,
      x: this.pointerX + (Math.random() - 0.5) * 4,
      y: this.pointerY + (Math.random() - 0.5) * 4,
      vx,
      vy,
      bornAt: now,
      lifeMs: this.particleLifeMs + Math.random() * this.particleLifeVarianceMs,
      size: baseSize + Math.random() * 3,
      opacity: 0.2
    };

    this.cursorParticles = [...this.cursorParticles, particle].slice(-this.maxParticles);
  }

  private advanceTrailFrame(dtMs: number): void {
    this.advanceLaggedPointer();
    this.updateMagneticTarget();

    if (this.cursorVisible) {
      this.emitTrailParticle(this.cursorPressed ? 0.9 : 0.6);

      // Occasional branching network lines.
      if (Math.random() < 0.08) {
        this.spawnBranch();
      }
    }

    this.advanceParticlesAndBranches(dtMs);
    this.animateBackgroundGraph();
  }

  private advanceLaggedPointer(): void {
    let targetX = this.pointerX;
    let targetY = this.pointerY;

    if (this.magneticTarget) {
      targetX += (this.magneticTarget.x - targetX) * this.magneticStrength;
      targetY += (this.magneticTarget.y - targetY) * this.magneticStrength;
    }

    this.smoothPointerX += (targetX - this.smoothPointerX) * this.pointerLag;
    this.smoothPointerY += (targetY - this.smoothPointerY) * this.pointerLag;

    // Emit from lagged pointer for a true trailing feel.
    this.pointerX = this.smoothPointerX;
    this.pointerY = this.smoothPointerY;
  }

  private updateMagneticTarget(): void {
    if (typeof document === 'undefined') return;

    const interactive = document.elementFromPoint(this.smoothPointerX, this.smoothPointerY)
      ?.closest('a, button, .btn');
    if (!interactive) {
      this.magneticTarget = null;
      return;
    }

    const rect = (interactive as HTMLElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(cx - this.smoothPointerX, cy - this.smoothPointerY);

    this.magneticTarget = dist <= this.magneticRadiusPx ? { x: cx, y: cy } : null;
  }

  private spawnBranch(): void {
    const angle = Math.random() * Math.PI * 2;
    const len = 14 + Math.random() * 26;
    const branch: CursorBranch = {
      id: this.branchIdCounter++,
      x1: this.pointerX,
      y1: this.pointerY,
      x2: this.pointerX + Math.cos(angle) * len,
      y2: this.pointerY + Math.sin(angle) * len,
      bornAt: this.lastFrameTime || performance.now(),
      lifeMs: 380 + Math.random() * 260,
      opacity: 0.18
    };

    this.cursorBranches = [...this.cursorBranches, branch].slice(-this.maxBranches);
  }

  private advanceParticlesAndBranches(dtMs: number): void {
    const now = this.lastFrameTime || performance.now();
    const frameScale = dtMs / this.particleFrameMs;
    const damping = Math.pow(0.968, frameScale);

    this.cursorParticles = this.cursorParticles
      .map((particle) => {
        const age = now - particle.bornAt;
        const t = age / particle.lifeMs;
        if (t >= 1) return null;

        return {
          ...particle,
          x: particle.x + particle.vx * this.particleFrameMs * frameScale,
          y: particle.y + particle.vy * this.particleFrameMs * frameScale,
          vx: particle.vx * damping,
          vy: particle.vy * damping,
          opacity: (1 - t) * 0.2,
          size: Math.max(1.2, particle.size * (1 - t * 0.45))
        };
      })
      .filter((p): p is CursorParticle => p !== null);

    this.cursorBranches = this.cursorBranches
      .map((branch) => {
        const age = now - branch.bornAt;
        const t = age / branch.lifeMs;
        if (t >= 1) return null;
        return { ...branch, opacity: (1 - t) * 0.18 };
      })
      .filter((b): b is CursorBranch => b !== null);
  }

  private initializeBackgroundGraph(): void {
    this.backgroundNodes = Array.from({ length: this.backgroundNodeCount }, (_, idx) => ({
      id: idx,
      x: Math.random() * this.viewportWidth,
      y: Math.random() * Math.max(1, this.viewportHeight),
      baseX: 0,
      baseY: 0,
      size: 2 + Math.random() * 3,
      opacity: 0.12 + Math.random() * 0.08
    })).map((node) => ({
      ...node,
      baseX: node.x,
      baseY: node.y
    }));

    const edges: BackgroundEdge[] = [];
    let edgeId = 0;
    for (let i = 0; i < this.backgroundNodes.length; i++) {
      for (let j = i + 1; j < this.backgroundNodes.length; j++) {
        const dx = this.backgroundNodes[i].x - this.backgroundNodes[j].x;
        const dy = this.backgroundNodes[i].y - this.backgroundNodes[j].y;
        const d = Math.hypot(dx, dy);
        if (d < 220 && Math.random() > 0.45) {
          edges.push({ id: edgeId++, a: i, b: j, opacity: 0.08 });
        }
      }
    }
    this.backgroundEdges = edges;
  }

  private reseedBackgroundGraph(): void {
    if (!this.backgroundNodes.length) return;
    this.backgroundNodes = this.backgroundNodes.map((node) => {
      const nx = Math.min(this.viewportWidth, node.baseX);
      const ny = Math.min(this.viewportHeight, node.baseY);
      return { ...node, x: nx, y: ny, baseX: nx, baseY: ny };
    });
  }

  private animateBackgroundGraph(): void {
    if (!this.backgroundNodes.length) return;
    this.nodeAnimationPhase += 0.01;

    const cx = this.smoothPointerX;
    const cy = this.smoothPointerY;

    this.backgroundNodes = this.backgroundNodes.map((node, i) => {
      const wave = Math.sin(this.nodeAnimationPhase + i * 0.55);
      const swayX = wave * 2.5;
      const swayY = Math.cos(this.nodeAnimationPhase + i * 0.7) * 2.5;

      const dx = node.baseX - cx;
      const dy = node.baseY - cy;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const disturbance = Math.max(0, 1 - dist / 180);

      return {
        ...node,
        x: node.baseX + swayX + (dx / dist) * disturbance * 10,
        y: node.baseY + swayY + (dy / dist) * disturbance * 10,
        opacity: 0.1 + disturbance * 0.06
      };
    });

    this.backgroundEdges = this.backgroundEdges.map((edge) => {
      const n1 = this.backgroundNodes[edge.a];
      const n2 = this.backgroundNodes[edge.b];
      const midX = (n1.x + n2.x) / 2;
      const midY = (n1.y + n2.y) / 2;
      const distToPointer = Math.hypot(midX - cx, midY - cy);
      const disturbance = Math.max(0, 1 - distToPointer / 240);
      return { ...edge, opacity: 0.06 + disturbance * 0.05 };
    });
  }

  private initializeVideoLayers(): void {
    const videoA = this.videoARef?.nativeElement;
    const videoB = this.videoBRef?.nativeElement;
    if (!videoA || !videoB) return;

    this.activeVideoIndex = 0;
    this.isCrossfading = false;

    // Keep the inactive layer reset and paused until a crossfade starts.
    videoB.pause();
    videoB.currentTime = 0;

    // Ensure active layer is playing; autoplay may be delayed on some browsers.
    void this.safePlay(videoA);
    this.startVideoMonitor();
  }

  private startVideoMonitor(): void {
    if (this.videoMonitorFrame !== null) {
      cancelAnimationFrame(this.videoMonitorFrame);
    }

    const tick = () => {
      this.checkForCrossfadeWindow();
      this.videoMonitorFrame = requestAnimationFrame(tick);
    };

    this.videoMonitorFrame = requestAnimationFrame(tick);
  }

  private checkForCrossfadeWindow(): void {
    if (this.isCrossfading) return;

    const activeVideo = this.getActiveVideo();
    if (!activeVideo) return;

    const duration = activeVideo.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;

    const remaining = duration - activeVideo.currentTime;
    if (remaining <= this.videoFadeLeadSeconds) {
      void this.startCrossfade();
    }
  }

  private async startCrossfade(): Promise<void> {
    if (this.isCrossfading) return;

    const fromVideo = this.getActiveVideo();
    const toVideo = this.getInactiveVideo();
    if (!fromVideo || !toVideo) return;

    this.isCrossfading = true;

    toVideo.currentTime = 0;
    await this.safePlay(toVideo);

    // Trigger CSS opacity handoff.
    this.activeVideoIndex = this.activeVideoIndex === 0 ? 1 : 0;

    if (this.crossfadeCleanupTimer !== null) {
      clearTimeout(this.crossfadeCleanupTimer);
    }

    this.crossfadeCleanupTimer = setTimeout(() => {
      fromVideo.pause();
      fromVideo.currentTime = 0;
      this.isCrossfading = false;
      this.crossfadeCleanupTimer = null;
    }, this.videoFadeDurationMs);
  }

  private getActiveVideo(): HTMLVideoElement | null {
    const videoA = this.videoARef?.nativeElement ?? null;
    const videoB = this.videoBRef?.nativeElement ?? null;
    return this.activeVideoIndex === 0 ? videoA : videoB;
  }

  private getInactiveVideo(): HTMLVideoElement | null {
    const videoA = this.videoARef?.nativeElement ?? null;
    const videoB = this.videoBRef?.nativeElement ?? null;
    return this.activeVideoIndex === 0 ? videoB : videoA;
  }

  private async safePlay(video: HTMLVideoElement): Promise<void> {
    try {
      await video.play();
    } catch (err) {
      // Background videos are non-critical; swallow transient autoplay errors.
      console.warn('Background video play was blocked', err);
    }
  }
}

interface CursorParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bornAt: number;
  lifeMs: number;
  size: number;
  opacity: number;
}

interface CursorBranch {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  bornAt: number;
  lifeMs: number;
  opacity: number;
}

interface BackgroundNode {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  opacity: number;
}

interface BackgroundEdge {
  id: number;
  a: number;
  b: number;
  opacity: number;
}

interface MagneticTarget {
  x: number;
  y: number;
}
