import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CursorTrailComponent } from './cursor-trail.component';

function setMatchMedia(finePointer: boolean, reducedMotion: boolean): void {
  const matcher = vi.fn().mockImplementation((query: string) => ({
    matches:
      query === '(pointer: fine)'
        ? finePointer
        : query === '(prefers-reduced-motion: reduce)'
          ? reducedMotion
          : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matcher,
  });
}

describe('CursorTrailComponent', () => {
  let component: CursorTrailComponent;
  let fixture: ComponentFixture<CursorTrailComponent>;

  beforeEach(async () => {
    setMatchMedia(true, false);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [CursorTrailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CursorTrailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should enable cursor trail on fine pointer devices', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 720 });

    fixture.detectChanges();

    expect(component.cursorEnabled).toBe(true);
    expect(component.viewportWidth).toBe(1280);
    expect(component.viewportHeight).toBe(720);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('should disable cursor trail on coarse pointers', () => {
    setMatchMedia(false, false);

    fixture.detectChanges();

    expect(component.cursorEnabled).toBe(false);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('should update cursor visibility and emit on meaningful movement', () => {
    component.cursorEnabled = true;
    const emitSpy = vi.spyOn(component as any, 'emitTrailParticle');

    component.onMouseMove({ clientX: 1, clientY: 1 } as MouseEvent);
    component.onMouseMove({ clientX: 20, clientY: 15 } as MouseEvent);

    expect(component.cursorVisible).toBe(true);
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should set pressed state and emit extra energy on mouse down', () => {
    component.cursorEnabled = true;
    const emitSpy = vi.spyOn(component as any, 'emitTrailParticle');

    component.onMouseDown();
    expect(component.cursorPressed).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith(2.2);

    component.onMouseUp();
    expect(component.cursorPressed).toBe(false);
  });

  it('should clear visibility and magnetic target on mouse leave', () => {
    component.cursorEnabled = true;
    component.cursorVisible = true;
    component.cursorPressed = true;
    (component as any).magneticTarget = { x: 10, y: 20 };

    component.onMouseLeave();

    expect(component.cursorVisible).toBe(false);
    expect(component.cursorPressed).toBe(false);
    expect((component as any).magneticTarget).toBeNull();
  });

  it('should update viewport dimensions on resize when enabled', () => {
    component.cursorEnabled = true;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });

    component.onWindowResize();

    expect(component.viewportWidth).toBe(1440);
    expect(component.viewportHeight).toBe(900);
  });

  it('should run trail frame update pipeline and branch emission path', () => {
    component.cursorVisible = true;
    const emitSpy = vi.spyOn(component as any, 'emitTrailParticle').mockImplementation(() => undefined);
    const branchSpy = vi.spyOn(component as any, 'spawnBranch').mockImplementation(() => undefined);
    const advanceSpy = vi.spyOn(component as any, 'advanceParticlesAndBranches').mockImplementation(() => undefined);
    vi.spyOn(component as any, 'updateMagneticTarget').mockImplementation(() => undefined);
    vi.spyOn(component as any, 'advanceLaggedPointer').mockImplementation(() => undefined);
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);

    (component as any).advanceTrailFrame(16);

    expect(emitSpy).toHaveBeenCalledWith(0.6);
    expect(branchSpy).toHaveBeenCalled();
    expect(advanceSpy).toHaveBeenCalledWith(16);
    randomSpy.mockRestore();
  });

  it('should apply damping and remove expired particles and branches', () => {
    const now = performance.now();
    (component as any).lastFrameTime = now;
    component.cursorParticles = [
      {
        id: 1,
        x: 10,
        y: 10,
        vx: 1,
        vy: 0.6,
        bornAt: now - 50,
        lifeMs: 1000,
        size: 4,
        opacity: 0.2,
      },
      {
        id: 2,
        x: 5,
        y: 5,
        vx: 1,
        vy: 0.6,
        bornAt: now - 2000,
        lifeMs: 1000,
        size: 4,
        opacity: 0.2,
      },
    ];
    component.cursorBranches = [
      {
        id: 1,
        x1: 0,
        y1: 0,
        x2: 10,
        y2: 10,
        bornAt: now - 30,
        lifeMs: 1000,
        opacity: 0.18,
      },
      {
        id: 2,
        x1: 0,
        y1: 0,
        x2: 10,
        y2: 10,
        bornAt: now - 2000,
        lifeMs: 1000,
        opacity: 0.18,
      },
    ];

    (component as any).advanceParticlesAndBranches(32);

    expect(component.cursorParticles.length).toBe(1);
    expect(component.cursorParticles[0].opacity).toBeLessThan(0.2);
    expect(component.cursorBranches.length).toBe(1);
    expect(component.cursorBranches[0].opacity).toBeLessThan(0.18);
  });

  it('should update magnetic target near interactive elements', () => {
    const button = document.createElement('button');
    vi.spyOn(button, 'closest').mockReturnValue(button);
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      left: 30,
      top: 30,
      width: 40,
      height: 20,
    } as DOMRect);
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn().mockReturnValue(button),
    });
    (component as any).smoothPointerX = 42;
    (component as any).smoothPointerY = 41;

    (component as any).updateMagneticTarget();
    expect((component as any).magneticTarget).toEqual({ x: 50, y: 40 });

    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn().mockReturnValue(null),
    });
    (component as any).updateMagneticTarget();
    expect((component as any).magneticTarget).toBeNull();
  });

  it('should move lagged pointer toward magnetic target', () => {
    (component as any).pointerX = 100;
    (component as any).pointerY = 100;
    (component as any).smoothPointerX = 20;
    (component as any).smoothPointerY = 20;
    (component as any).magneticTarget = { x: 130, y: 140 };

    (component as any).advanceLaggedPointer();

    expect((component as any).smoothPointerX).toBeGreaterThan(20);
    expect((component as any).smoothPointerY).toBeGreaterThan(20);
    expect((component as any).pointerX).toBe((component as any).smoothPointerX);
    expect((component as any).pointerY).toBe((component as any).smoothPointerY);
  });

  it('should cancel animation frame on destroy', () => {
    (component as any).particleAnimationFrame = 12;

    component.ngOnDestroy();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(12);
    expect((component as any).particleAnimationFrame).toBeNull();
  });

  it('should render trail layer when cursor is enabled', () => {
    component.cursorEnabled = true;
    component.cursorVisible = true;
    component.cursorBranches = [
      {
        id: 1,
        x1: 0,
        y1: 0,
        x2: 10,
        y2: 10,
        bornAt: performance.now(),
        lifeMs: 1000,
        opacity: 0.12,
      },
    ];
    component.cursorParticles = [
      {
        id: 1,
        x: 10,
        y: 10,
        vx: 0,
        vy: 0,
        bornAt: performance.now(),
        lifeMs: 1000,
        size: 4,
        opacity: 0.2,
      },
    ];

    fixture.detectChanges();

    const layer = fixture.nativeElement.querySelector('.cursor-trail-layer');
    const particles = fixture.nativeElement.querySelectorAll('.cursor-particle');
    const branches = fixture.nativeElement.querySelectorAll('.cursor-branch-layer line');
    expect(layer).toBeTruthy();
    expect(particles.length).toBe(1);
    expect(branches.length).toBe(1);
  });
});
