import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { vi } from 'vitest';
import { CyberNetworkBackgroundComponent } from './cyber-network-background.component';

describe('CyberNetworkBackgroundComponent', () => {
  let fixture: ComponentFixture<CyberNetworkBackgroundComponent>;
  let component: CyberNetworkBackgroundComponent;
  let originalResizeObserver: unknown;

  const stubSurface = () => {
    (component as any).surfaceRef = {
      nativeElement: {
        getBoundingClientRect: () => ({
          width: 960,
          height: 420,
        }),
      },
    };
  };

  beforeEach(async () => {
    originalResizeObserver = (window as any).ResizeObserver;

    await TestBed.configureTestingModule({
      imports: [CyberNetworkBackgroundComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CyberNetworkBackgroundComponent);
    component = fixture.componentInstance;
    stubSurface();
  });

  afterEach(() => {
    (window as any).ResizeObserver = originalResizeObserver;
    component.ngOnDestroy();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize topology and observer when ResizeObserver exists', fakeAsync(() => {
    const observeSpy = vi.fn();
    const disconnectSpy = vi.fn();

    class ResizeObserverMock {
      constructor(_cb: ResizeObserverCallback) {}
      observe = observeSpy;
      unobserve = vi.fn();
      disconnect = disconnectSpy;
    }

    (window as any).ResizeObserver = ResizeObserverMock;
    const startLoopSpy = vi
      .spyOn(component as any, 'startAnimationLoop')
      .mockImplementation(() => {});

    component.ngAfterViewInit();
    tick(0);

    expect(component.nodes.length).toBeGreaterThan(0);
    expect(component.edges.length).toBeGreaterThan(0);
    expect(observeSpy).toHaveBeenCalled();
    expect(startLoopSpy).toHaveBeenCalled();
  }));

  it('should fall back to window resize listener when ResizeObserver is unavailable', fakeAsync(() => {
    (window as any).ResizeObserver = undefined;
    const addListenerSpy = vi.spyOn(window, 'addEventListener');
    const startLoopSpy = vi
      .spyOn(component as any, 'startAnimationLoop')
      .mockImplementation(() => {});

    component.ngAfterViewInit();
    tick(0);

    expect(addListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(startLoopSpy).toHaveBeenCalled();
  }));

  it('should skip animation loop when reduced motion is enabled', fakeAsync(() => {
    (window as any).ResizeObserver = undefined;
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as MediaQueryList);
    const startLoopSpy = vi
      .spyOn(component as any, 'startAnimationLoop')
      .mockImplementation(() => {});

    component.ngAfterViewInit();
    tick(0);

    expect(component.reducedMotion).toBe(true);
    expect(startLoopSpy).not.toHaveBeenCalled();
  }));

  it('should rebuild topology and reset packet state', () => {
    component.packets = [
      {
        id: 1,
        edgeIdx: 0,
        progress: 0.3,
        speed: 0.2,
        size: 2,
        x: 5,
        y: 5,
        opacity: 0.1,
      },
    ];
    (component as any).spawnAccumulatorMs = 999;

    (component as any).rebuildTopology();

    expect(component.nodes.length).toBeGreaterThan(0);
    expect(component.edges.length).toBeGreaterThan(0);
    expect(component.packets).toEqual([]);
    expect((component as any).spawnAccumulatorMs).toBe(0);
  });

  it('should animate nodes and edges based on phase', () => {
    component.nodes = [
      { id: 0, baseX: 10, baseY: 10, x: 10, y: 10, drift: 2, size: 2, opacity: 0.1 },
      { id: 1, baseX: 20, baseY: 20, x: 20, y: 20, drift: 2, size: 2, opacity: 0.1 },
    ];
    component.edges = [{ id: 0, a: 0, b: 1, opacity: 0.1 }];
    (component as any).phase = 1.2;

    (component as any).animateNodesAndEdges();

    expect(component.nodes[0].x).not.toBe(10);
    expect(component.edges[0].opacity).not.toBe(0.1);
  });

  it('should spawn packets when edges and nodes are available', () => {
    component.nodes = [
      { id: 0, baseX: 0, baseY: 0, x: 0, y: 0, drift: 0, size: 2, opacity: 0.1 },
      { id: 1, baseX: 100, baseY: 0, x: 100, y: 0, drift: 0, size: 2, opacity: 0.1 },
    ];
    component.edges = [{ id: 0, a: 0, b: 1, opacity: 0.1 }];
    component.packets = [];

    (component as any).spawnPacket();

    expect(component.packets.length).toBe(1);
    expect(component.packets[0].edgeIdx).toBe(0);
  });

  it('should advance packet progress along edges', () => {
    component.nodes = [
      { id: 0, baseX: 0, baseY: 0, x: 0, y: 0, drift: 0, size: 2, opacity: 0.1 },
      { id: 1, baseX: 100, baseY: 0, x: 100, y: 0, drift: 0, size: 2, opacity: 0.1 },
    ];
    component.edges = [{ id: 0, a: 0, b: 1, opacity: 0.1 }];
    component.packets = [
      {
        id: 7,
        edgeIdx: 0,
        progress: 0.1,
        speed: 0.5,
        size: 2,
        x: 10,
        y: 0,
        opacity: 0.1,
      },
    ];

    (component as any).animatePackets(16);

    expect(component.packets.length).toBe(1);
    expect(component.packets[0].progress).toBeGreaterThan(0.1);
    expect(component.packets[0].x).toBeGreaterThan(10);
  });

  it('should no-op packet animation when no edges exist', () => {
    component.edges = [];
    component.packets = [];
    (component as any).spawnAccumulatorMs = 25;

    (component as any).animatePackets(16);

    expect((component as any).spawnAccumulatorMs).toBe(25);
  });

  it('should clamp spawn accumulator when packet layer is at capacity', () => {
    component.viewWidth = 1200;
    component.nodes = [
      { id: 0, baseX: 0, baseY: 0, x: 0, y: 0, drift: 0, size: 2, opacity: 0.1 },
      { id: 1, baseX: 100, baseY: 0, x: 100, y: 0, drift: 0, size: 2, opacity: 0.1 },
    ];
    component.edges = [{ id: 0, a: 0, b: 1, opacity: 0.1 }];
    component.packets = Array.from({ length: 12 }, (_, idx) => ({
      id: idx,
      edgeIdx: 0,
      progress: 0.1,
      speed: 0,
      size: 2,
      x: 10,
      y: 0,
      opacity: 0.1,
    }));
    (component as any).spawnAccumulatorMs = 5000;

    (component as any).animatePackets(16);

    expect((component as any).spawnAccumulatorMs).toBeLessThanOrEqual(170);
  });

  it('should run animation loop tick with bounded delta time', () => {
    const nodesSpy = vi
      .spyOn(component as any, 'animateNodesAndEdges')
      .mockImplementation(() => {});
    const packetsSpy = vi
      .spyOn(component as any, 'animatePackets')
      .mockImplementation(() => {});
    let scheduled: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      scheduled = cb;
      return 1;
    });
    (component as any).lastFrameTime = 0;

    (component as any).startAnimationLoop();
    scheduled?.(100);

    expect(nodesSpy).toHaveBeenCalled();
    expect(packetsSpy).toHaveBeenCalledWith(expect.any(Number));
  });

  it('should clean up timers, animation frames, observers, and listeners on destroy', () => {
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');
    const cancelAnimationSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const disconnectSpy = vi.fn();

    (component as any).initTimer = window.setTimeout(() => {}, 1000);
    (component as any).animationFrame = 42;
    (component as any).resizeObserver = { disconnect: disconnectSpy };

    component.ngOnDestroy();

    expect(cancelAnimationSpy).toHaveBeenCalledWith(42);
    expect(disconnectSpy).toHaveBeenCalled();
    expect(removeListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect((component as any).resizeObserver).toBeNull();
  });
});
