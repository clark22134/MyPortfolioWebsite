import { createSpyObj, type SpyObj } from '../../../test-helpers';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HomeComponent } from './home.component';
import { ProjectService } from '../../services/project.service';
import { TerminalLoaderService } from '../../services/terminal-loader.service';
import { of } from 'rxjs';
import { Project } from '../../models/project.model';
import { vi } from 'vitest';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let projectService: SpyObj<ProjectService>;

  const mockProjects: Project[] = [
    {
      id: 1,
      title: 'Portfolio Website',
      description: 'A modern portfolio website',
      technologies: ['Angular', 'Spring Boot'],
      featured: true
    }
  ];

  beforeEach(async () => {
    const projectServiceSpy = createSpyObj('ProjectService', ['getFeaturedProjects']);

    await TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ProjectService, useValue: projectServiceSpy }
      ]
    }).compileComponents();

    projectService = TestBed.inject(ProjectService) as SpyObj<ProjectService>;
    projectService.getFeaturedProjects.mockReturnValue(of([]));

    // Mark terminal as complete so component initializes properly
    const terminalService = TestBed.inject(TerminalLoaderService);
    terminalService.markComplete();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load featured projects on init', () => {
    projectService.getFeaturedProjects.mockReturnValue(of(mockProjects));

    component.ngOnInit();

    expect(projectService.getFeaturedProjects).toHaveBeenCalled();
    expect(component.featuredProjects).toEqual(mockProjects);
  });

  it('should handle empty featured projects', () => {
    projectService.getFeaturedProjects.mockReturnValue(of([]));

    component.ngOnInit();

    expect(component.featuredProjects).toEqual([]);
  });

  it('should have featuredProjects array', () => {
    expect(component.featuredProjects).toBeDefined();
    expect(Array.isArray(component.featuredProjects)).toBe(true);
  });

  it('should render home container', () => {
    fixture.detectChanges();

    const homeContainer = fixture.nativeElement.querySelector('.home-container');
    expect(homeContainer).toBeTruthy();
  });

  it('should render hero section', () => {
    fixture.detectChanges();

    const hero = fixture.nativeElement.querySelector('.hero');
    expect(hero).toBeTruthy();
  });

  it('should render skills section', () => {
    fixture.detectChanges();

    const skills = fixture.nativeElement.querySelector('.skills');
    expect(skills).toBeTruthy();
  });

  it('should reference Claude Code CLI and Codex CLI in AI/ML and About Me content', () => {
    fixture.detectChanges();

    const aiMlCategory = component.skillCategories.find(category => category.title === 'AI/ML');
    expect(aiMlCategory?.skills).toContain('Claude Code CLI');
    expect(aiMlCategory?.skills).toContain('Codex CLI');

    const aboutMeText = fixture.nativeElement.querySelector('.about-me')?.textContent ?? '';
    expect(aboutMeText).toContain('Claude Code CLI');
    expect(aboutMeText).toContain('Codex CLI');
  });

  it('should render about section', () => {
    fixture.detectChanges();

    const about = fixture.nativeElement.querySelector('.about');
    expect(about).toBeTruthy();
  });

  it('should have skill categories defined', () => {
    expect(component.skillCategories).toBeDefined();
    expect(component.skillCategories.length).toBeGreaterThan(0);
  });

  it('should start typing animation after terminal complete', fakeAsync(() => {
    component.ngOnInit();
    tick(600); // 500ms delay + 100ms from waitForTerminalComplete

    expect(component.typedText.length).toBeGreaterThan(0);
  }));

  it('should set sections visible after terminal complete', () => {
    component.ngOnInit();

    expect(component.projectsVisible).toBe(true);
    expect(component.skillsVisible).toBe(true);
    expect(component.aboutVisible).toBe(true);
  });

  it('should set scrolled on window scroll', () => {
    expect(component.scrolled).toBe(false);

    Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
    component.onWindowScroll();

    expect(component.scrolled).toBe(true);
  });

  it('should not render route-local nav component', () => {
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('app-nav');
    expect(nav).toBeNull();
  });

  it('should bind cursor and graph SVG viewBox to viewport dimensions', () => {
    fixture.detectChanges();
    component.cursorEnabled = true;
    component.viewportWidth = 640;
    component.viewportHeight = 360;

    fixture.detectChanges();

    const branchSvg: SVGElement = fixture.nativeElement.querySelector('.cursor-branch-layer');
    const graphSvg: SVGElement = fixture.nativeElement.querySelector('.bg-node-edges');
    expect(branchSvg.getAttribute('viewBox')).toBe('0 0 640 360');
    expect(graphSvg.getAttribute('viewBox')).toBe('0 0 640 360');
  });

  it('should emit cursor particle only after minimum movement threshold', () => {
    component.cursorEnabled = true;
    const emitSpy = vi.spyOn(component as any, 'emitTrailParticle');

    component.onMouseMove({ clientX: 1, clientY: 1 } as MouseEvent);
    component.onMouseMove({ clientX: 20, clientY: 15 } as MouseEvent);

    expect(component.cursorVisible).toBe(true);
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should toggle cursor pressed state and clear on mouse leave', () => {
    component.cursorEnabled = true;
    const emitSpy = vi.spyOn(component as any, 'emitTrailParticle');
    (component as any).magneticTarget = { x: 10, y: 10 };
    component.cursorVisible = true;

    component.onMouseDown();
    expect(component.cursorPressed).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith(2.2);

    component.onMouseUp();
    expect(component.cursorPressed).toBe(false);

    component.onMouseLeave();
    expect(component.cursorVisible).toBe(false);
    expect(component.cursorPressed).toBe(false);
    expect((component as any).magneticTarget).toBeNull();
  });

  it('should update viewport and reseed graph on resize when cursor is enabled', () => {
    component.cursorEnabled = true;
    const reseedSpy = vi.spyOn(component as any, 'reseedBackgroundGraph').mockImplementation(() => {});
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 });

    component.onWindowResize();

    expect(component.viewportWidth).toBe(1200);
    expect(component.viewportHeight).toBe(700);
    expect(reseedSpy).toHaveBeenCalled();
  });

  it('should apply frame-rate scaling and damping to particle motion', () => {
    const now = performance.now();
    (component as any).lastFrameTime = now;
    component.cursorParticles = [
      {
        id: 1,
        x: 10,
        y: 20,
        vx: 1,
        vy: 0.5,
        bornAt: now - 10,
        lifeMs: 1000,
        size: 4,
        opacity: 0.2
      }
    ];
    component.cursorBranches = [
      {
        id: 1,
        x1: 0,
        y1: 0,
        x2: 10,
        y2: 10,
        bornAt: now - 10,
        lifeMs: 1000,
        opacity: 0.18
      }
    ];

    (component as any).advanceParticlesAndBranches(32);

    expect(component.cursorParticles.length).toBe(1);
    expect(component.cursorParticles[0].x).toBeCloseTo(42, 6);
    expect(component.cursorParticles[0].y).toBeCloseTo(36, 6);
    expect(component.cursorParticles[0].vx).toBeCloseTo(Math.pow(0.968, 2), 6);
    expect(component.cursorBranches[0].opacity).toBeLessThan(0.18);
  });

  it('should initialize video layers and reset inactive layer', () => {
    const videoA = {
      currentTime: 4,
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined)
    } as unknown as HTMLVideoElement;
    const videoB = {
      currentTime: 9,
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined)
    } as unknown as HTMLVideoElement;

    (component as any).videoARef = { nativeElement: videoA };
    (component as any).videoBRef = { nativeElement: videoB };
    const safePlaySpy = vi.spyOn(component as any, 'safePlay').mockResolvedValue(undefined);
    const monitorSpy = vi.spyOn(component as any, 'startVideoMonitor').mockImplementation(() => {});

    (component as any).initializeVideoLayers();

    expect(component.activeVideoIndex).toBe(0);
    expect((component as any).isCrossfading).toBe(false);
    expect(videoB.pause).toHaveBeenCalled();
    expect(videoB.currentTime).toBe(0);
    expect(safePlaySpy).toHaveBeenCalledWith(videoA);
    expect(monitorSpy).toHaveBeenCalled();
  });

  it('should start crossfade when active video nears completion', () => {
    const activeVideo = { duration: 10, currentTime: 9.4 } as HTMLVideoElement;
    vi.spyOn(component as any, 'getActiveVideo').mockReturnValue(activeVideo);
    const crossfadeSpy = vi.spyOn(component as any, 'startCrossfade').mockResolvedValue(undefined);
    (component as any).isCrossfading = false;

    (component as any).checkForCrossfadeWindow();

    expect(crossfadeSpy).toHaveBeenCalled();
  });

  it('should swallow non-critical video autoplay failures', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const blockedVideo = {
      play: vi.fn().mockRejectedValue(new Error('Autoplay blocked'))
    } as unknown as HTMLVideoElement;

    await (component as any).safePlay(blockedVideo);

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should log project loading failures without crashing', () => {
    const error = new Error('network');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    projectService.getFeaturedProjects.mockReturnValue({
      subscribe: ({ error: onError }: { error: (e: Error) => void }) => {
        onError(error);
      }
    } as any);

    component.ngOnInit();

    expect(errorSpy).toHaveBeenCalledWith('Failed to load featured projects', error);
    errorSpy.mockRestore();
  });

  it('should update magnetic target when cursor is near interactive elements', () => {
    const button = document.createElement('button');
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn().mockReturnValue(button),
    });
    vi.spyOn(button, 'closest').mockReturnValue(button);
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      left: 40,
      top: 40,
      width: 40,
      height: 20,
    } as DOMRect);
    (component as any).smoothPointerX = 52;
    (component as any).smoothPointerY = 48;

    (component as any).updateMagneticTarget();
    expect((component as any).magneticTarget).toEqual({ x: 60, y: 50 });

    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn().mockReturnValue(null),
    });
    (component as any).updateMagneticTarget();
    expect((component as any).magneticTarget).toBeNull();
  });

  it('should advance lagged pointer towards magnetic target', () => {
    (component as any).pointerX = 100;
    (component as any).pointerY = 120;
    (component as any).smoothPointerX = 20;
    (component as any).smoothPointerY = 40;
    (component as any).magneticTarget = { x: 140, y: 150 };

    (component as any).advanceLaggedPointer();

    expect((component as any).smoothPointerX).toBeGreaterThan(20);
    expect((component as any).smoothPointerY).toBeGreaterThan(40);
    expect((component as any).pointerX).toBe((component as any).smoothPointerX);
    expect((component as any).pointerY).toBe((component as any).smoothPointerY);
  });

  it('should execute trail frame updates and branch emission path', () => {
    component.cursorVisible = true;
    component.cursorPressed = false;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn().mockReturnValue(null),
    });
    const emitSpy = vi.spyOn(component as any, 'emitTrailParticle').mockImplementation(() => {});
    const branchSpy = vi.spyOn(component as any, 'spawnBranch').mockImplementation(() => {});
    const particlesSpy = vi.spyOn(component as any, 'advanceParticlesAndBranches').mockImplementation(() => {});
    const graphSpy = vi.spyOn(component as any, 'animateBackgroundGraph').mockImplementation(() => {});
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);

    (component as any).advanceTrailFrame(16);

    expect(emitSpy).toHaveBeenCalledWith(0.6);
    expect(branchSpy).toHaveBeenCalled();
    expect(particlesSpy).toHaveBeenCalledWith(16);
    expect(graphSpy).toHaveBeenCalled();
    randomSpy.mockRestore();
  });

  it('should initialize and animate background graph state', () => {
    component.viewportWidth = 200;
    component.viewportHeight = 200;
    (component as any).smoothPointerX = 300;
    (component as any).smoothPointerY = 220;
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
    (component as any).initializeBackgroundGraph();
    expect(component.backgroundNodes.length).toBe(18);
    expect(component.backgroundEdges.length).toBeGreaterThan(0);

    component.viewportWidth = 600;
    component.viewportHeight = 320;
    (component as any).reseedBackgroundGraph();
    (component as any).animateBackgroundGraph();

    expect(component.backgroundNodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
    randomSpy.mockRestore();
  });

  it('should monitor videos with requestAnimationFrame and call crossfade checks', () => {
    const checkSpy = vi.spyOn(component as any, 'checkForCrossfadeWindow').mockImplementation(() => {});
    let firstTick = true;
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      if (firstTick) {
        firstTick = false;
        cb(0);
      }
      return 1;
    });

    (component as any).startVideoMonitor();

    expect(checkSpy).toHaveBeenCalled();
    rafSpy.mockRestore();
  });

  it('should crossfade videos and clean up previous layer after fade duration', fakeAsync(() => {
    const videoA = {
      currentTime: 8,
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
    } as unknown as HTMLVideoElement;
    const videoB = {
      currentTime: 0,
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
    } as unknown as HTMLVideoElement;
    (component as any).videoARef = { nativeElement: videoA };
    (component as any).videoBRef = { nativeElement: videoB };
    component.activeVideoIndex = 0;
    vi.spyOn(component as any, 'safePlay').mockResolvedValue(undefined);

    void (component as any).startCrossfade();
    flushMicrotasks();
    tick(700);

    expect(component.activeVideoIndex).toBe(1);
    expect(videoA.pause).toHaveBeenCalled();
    expect(videoA.currentTime).toBe(0);
    expect((component as any).isCrossfading).toBe(false);
  }));

  it('should return active and inactive video references based on current layer index', () => {
    const videoA = { id: 'a' } as unknown as HTMLVideoElement;
    const videoB = { id: 'b' } as unknown as HTMLVideoElement;
    (component as any).videoARef = { nativeElement: videoA };
    (component as any).videoBRef = { nativeElement: videoB };

    component.activeVideoIndex = 0;
    expect((component as any).getActiveVideo()).toBe(videoA);
    expect((component as any).getInactiveVideo()).toBe(videoB);

    component.activeVideoIndex = 1;
    expect((component as any).getActiveVideo()).toBe(videoB);
    expect((component as any).getInactiveVideo()).toBe(videoA);
  });
});
