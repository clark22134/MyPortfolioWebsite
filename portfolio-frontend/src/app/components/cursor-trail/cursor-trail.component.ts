import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-cursor-trail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cursor-trail.component.html',
  styleUrl: './cursor-trail.component.css'
})
export class CursorTrailComponent implements OnInit, OnDestroy {
  cursorEnabled = false;
  cursorVisible = false;
  cursorPressed = false;
  cursorParticles: CursorParticle[] = [];
  cursorBranches: CursorBranch[] = [];
  viewportWidth = 100;
  viewportHeight = 100;

  private particleAnimationFrame: number | null = null;
  private lastFrameTime = 0;
  private magneticTarget: MagneticTarget | null = null;
  private pointerX = 0;
  private pointerY = 0;
  private smoothPointerX = 0;
  private smoothPointerY = 0;
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

  ngOnInit(): void {
    this.cursorEnabled = this.supportsFancyCursor();
    if (!this.cursorEnabled) return;

    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.smoothPointerX = this.pointerX;
    this.smoothPointerY = this.pointerY;
    this.startParticleLoop();
  }

  ngOnDestroy(): void {
    if (this.particleAnimationFrame !== null) {
      cancelAnimationFrame(this.particleAnimationFrame);
      this.particleAnimationFrame = null;
    }
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
      ?.closest('a, button, .btn, [role="button"], [tabindex]:not([tabindex="-1"])');
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

interface MagneticTarget {
  x: number;
  y: number;
}
