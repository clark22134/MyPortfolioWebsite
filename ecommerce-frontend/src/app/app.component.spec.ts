import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app.component';

describe('App', () => {
  beforeEach(async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have title signal', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect((app as any).title()).toBe('angular-ecommerce');
  });

  it('should dismissVideo set showVideoIntro to false', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.showVideoIntro()).toBe(true);
    app.dismissVideo();
    expect(app.showVideoIntro()).toBe(false);
  });

  it('should onVideoEnded set showVideoIntro to false', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.onVideoEnded();
    expect(app.showVideoIntro()).toBe(false);
  });

  it('should closeMobileMenu set mobileMenuOpen to false', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.mobileMenuOpen.set(true);
    app.closeMobileMenu();
    expect(app.mobileMenuOpen()).toBe(false);
  });

  it('should togglePlayback pause a playing video', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const mockVideo = { paused: false, pause: vi.fn(), play: vi.fn() } as unknown as HTMLVideoElement;
    app.togglePlayback(mockVideo);
    expect(mockVideo.pause).toHaveBeenCalled();
  });

  it('should togglePlayback play a paused video', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const mockVideo = { paused: true, pause: vi.fn(), play: vi.fn().mockResolvedValue(undefined) } as unknown as HTMLVideoElement;
    app.togglePlayback(mockVideo);
    expect(mockVideo.play).toHaveBeenCalled();
  });

  it('should render video intro when showVideoIntro is true', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toBeTruthy();
  });
});
