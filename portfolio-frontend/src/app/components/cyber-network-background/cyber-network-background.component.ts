import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cyber-network-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cyber-network-background.component.html',
  styleUrl: './cyber-network-background.component.css'
})
export class CyberNetworkBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('surface', { static: true }) surfaceRef?: ElementRef<HTMLDivElement>;

  nodes: NetworkNode[] = [];
  edges: NetworkEdge[] = [];
  packets: NetworkPacket[] = [];

  viewWidth = 100;
  viewHeight = 100;
  reducedMotion = false;

  private animationFrame: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastFrameTime = 0;
  private phase = 0;
  private packetId = 0;
  private spawnAccumulatorMs = 0;
  private initTimer: number | null = null;
  private readonly onWindowResize = () => this.rebuildTopology();

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Defer topology setup to avoid NG0100 in dev/test mode when this component
    // is conditionally rendered and binds dynamic values immediately after init.
    this.initTimer = window.setTimeout(() => {
      this.initTimer = null;
      this.rebuildTopology();

      const resizeObserverCtor =
        (window as typeof window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;

      if (resizeObserverCtor && this.surfaceRef?.nativeElement) {
        this.resizeObserver = new resizeObserverCtor(() => this.rebuildTopology());
        this.resizeObserver.observe(this.surfaceRef.nativeElement);
      } else {
        window.addEventListener('resize', this.onWindowResize);
      }

      if (!this.reducedMotion) {
        this.startAnimationLoop();
      }
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.initTimer !== null) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }

    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onWindowResize);
    }
  }

  private rebuildTopology(): void {
    const host = this.surfaceRef?.nativeElement;
    if (!host) return;

    const rect = host.getBoundingClientRect();
    this.viewWidth = Math.max(100, Math.floor(rect.width));
    this.viewHeight = Math.max(100, Math.floor(rect.height));

    const isMobile = this.viewWidth < 768;
    const nodeCount = isMobile ? 12 : this.viewWidth < 1100 ? 16 : 20;
    const padding = isMobile ? 32 : 48;

    const nodes: NetworkNode[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const x = padding + Math.random() * Math.max(1, this.viewWidth - padding * 2);
      const y = padding + Math.random() * Math.max(1, this.viewHeight - padding * 2);
      nodes.push({
        id: i,
        baseX: x,
        baseY: y,
        x,
        y,
        drift: 2 + Math.random() * 4,
        size: 2.2 + Math.random() * 2.6,
        opacity: 0.12 + Math.random() * 0.07
      });
    }
    this.nodes = nodes;

    const maxLinkDistance = Math.min(this.viewWidth, this.viewHeight) * (isMobile ? 0.46 : 0.4);
    const edgeSet = new Set<string>();
    const edges: NetworkEdge[] = [];
    let edgeId = 0;

    for (let i = 0; i < nodes.length; i++) {
      const nearest = nodes
        .map((node, j) => {
          if (i === j) return null;
          const dx = nodes[i].baseX - node.baseX;
          const dy = nodes[i].baseY - node.baseY;
          return { idx: j, dist: Math.hypot(dx, dy) };
        })
        .filter((x): x is { idx: number; dist: number } => x !== null)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, isMobile ? 2 : 3);

      for (const candidate of nearest) {
        if (candidate.dist > maxLinkDistance) continue;
        const a = Math.min(i, candidate.idx);
        const b = Math.max(i, candidate.idx);
        const key = `${a}-${b}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push({
          id: edgeId++,
          a,
          b,
          opacity: 0.08 + Math.random() * 0.05
        });
      }
    }

    this.edges = edges;
    this.packets = [];
    this.spawnAccumulatorMs = 0;
  }

  private startAnimationLoop(): void {
    if (this.animationFrame !== null) return;

    const tick = (timestamp: number) => {
      if (!this.lastFrameTime) {
        this.lastFrameTime = timestamp;
      }
      const dt = Math.min(48, timestamp - this.lastFrameTime);
      this.lastFrameTime = timestamp;

      this.phase += dt * 0.0012;
      this.animateNodesAndEdges();
      this.animatePackets(dt);

      this.animationFrame = requestAnimationFrame(tick);
    };

    this.animationFrame = requestAnimationFrame(tick);
  }

  private animateNodesAndEdges(): void {
    this.nodes = this.nodes.map((node, idx) => {
      const nx = node.baseX + Math.sin(this.phase + idx * 0.72) * node.drift;
      const ny = node.baseY + Math.cos(this.phase * 0.9 + idx * 0.54) * node.drift;
      const pulse = (Math.sin(this.phase * 2 + idx * 0.5) + 1) * 0.5;
      return {
        ...node,
        x: nx,
        y: ny,
        opacity: 0.1 + pulse * 0.08
      };
    });

    this.edges = this.edges.map((edge) => {
      const shimmer = (Math.sin(this.phase * 2.2 + edge.id * 0.35) + 1) * 0.5;
      return { ...edge, opacity: 0.06 + shimmer * 0.07 };
    });
  }

  private animatePackets(dtMs: number): void {
    if (!this.edges.length) return;

    const isMobile = this.viewWidth < 768;
    const maxPackets = isMobile ? 6 : 12;
    const spawnIntervalMs = isMobile ? 320 : 170;

    this.spawnAccumulatorMs += dtMs;
    while (this.spawnAccumulatorMs >= spawnIntervalMs && this.packets.length < maxPackets) {
      this.spawnAccumulatorMs -= spawnIntervalMs;
      this.spawnPacket();
    }
    if (this.packets.length >= maxPackets) {
      this.spawnAccumulatorMs = Math.min(this.spawnAccumulatorMs, spawnIntervalMs);
    }

    this.packets = this.packets
      .map((packet) => {
        const edge = this.edges[packet.edgeIdx];
        if (!edge) return null;

        const nextProgress = packet.progress + packet.speed * (dtMs / 1000);
        if (nextProgress >= 1) return null;

        const n1 = this.nodes[edge.a];
        const n2 = this.nodes[edge.b];
        if (!n1 || !n2) return null;

        const x = n1.x + (n2.x - n1.x) * nextProgress;
        const y = n1.y + (n2.y - n1.y) * nextProgress;
        const centerFade = 1 - Math.abs(nextProgress - 0.5) * 1.8;

        return {
          ...packet,
          progress: nextProgress,
          x,
          y,
          opacity: Math.max(0, centerFade) * 0.16
        };
      })
      .filter((packet): packet is NetworkPacket => packet !== null);
  }

  private spawnPacket(): void {
    if (!this.edges.length) return;
    const edgeIdx = Math.floor(Math.random() * this.edges.length);
    const edge = this.edges[edgeIdx];
    const n1 = this.nodes[edge.a];
    const n2 = this.nodes[edge.b];
    if (!n1 || !n2) return;

    const progress = Math.random() * 0.1;
    const x = n1.x + (n2.x - n1.x) * progress;
    const y = n1.y + (n2.y - n1.y) * progress;

    this.packets = [
      ...this.packets,
      {
        id: this.packetId++,
        edgeIdx,
        progress,
        speed: 0.22 + Math.random() * 0.2,
        size: 1.8 + Math.random() * 1.8,
        x,
        y,
        opacity: 0.14
      }
    ];
  }
}

interface NetworkNode {
  id: number;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  drift: number;
  size: number;
  opacity: number;
}

interface NetworkEdge {
  id: number;
  a: number;
  b: number;
  opacity: number;
}

interface NetworkPacket {
  id: number;
  edgeIdx: number;
  progress: number;
  speed: number;
  size: number;
  x: number;
  y: number;
  opacity: number;
}
