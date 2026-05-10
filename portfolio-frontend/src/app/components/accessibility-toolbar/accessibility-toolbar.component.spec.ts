import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { AccessibilityToolbarComponent } from './accessibility-toolbar.component';
import { AccessibilityService, AccessibilitySettings } from '../../services/accessibility.service';

const defaultSettings: AccessibilitySettings = {
  fontSize: 100,
  highContrast: false,
  reducedMotion: false,
  screenReaderMode: false,
  ttsEnabled: false,
  ttsRate: 1.0,
  ttsPitch: 1.0
};

function makeA11yServiceSpy() {
  const settingsSubject = new BehaviorSubject<AccessibilitySettings>({ ...defaultSettings });
  return {
    settings$: settingsSubject.asObservable(),
    settingsSubject,
    announceToScreenReader: vi.fn(),
    increaseFontSize: vi.fn(),
    decreaseFontSize: vi.fn(),
    resetFontSize: vi.fn(),
    toggleHighContrast: vi.fn(),
    toggleReducedMotion: vi.fn(),
    toggleScreenReaderMode: vi.fn(),
    toggleTts: vi.fn(),
    speak: vi.fn()
  };
}

describe('AccessibilityToolbarComponent', () => {
  let component: AccessibilityToolbarComponent;
  let fixture: ComponentFixture<AccessibilityToolbarComponent>;
  let a11ySpy: ReturnType<typeof makeA11yServiceSpy>;

  beforeEach(async () => {
    a11ySpy = makeA11yServiceSpy();

    await TestBed.configureTestingModule({
      imports: [AccessibilityToolbarComponent],
      providers: [
        { provide: AccessibilityService, useValue: a11ySpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccessibilityToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize isPanelOpen to false', () => {
    expect(component.isPanelOpen).toBe(false);
  });

  it('should subscribe to settings on init', () => {
    expect(component.settings.fontSize).toBe(100);
  });

  it('should toggle panel open', () => {
    component.togglePanel();
    expect(component.isPanelOpen).toBe(true);
    expect(a11ySpy.announceToScreenReader).toHaveBeenCalled();
  });

  it('should toggle panel closed', () => {
    component.isPanelOpen = true;
    component.togglePanel();
    expect(component.isPanelOpen).toBe(false);
  });

  it('should call increaseFontSize', () => {
    component.increaseFontSize();
    expect(a11ySpy.increaseFontSize).toHaveBeenCalled();
  });

  it('should call decreaseFontSize', () => {
    component.decreaseFontSize();
    expect(a11ySpy.decreaseFontSize).toHaveBeenCalled();
  });

  it('should call resetFontSize', () => {
    component.resetFontSize();
    expect(a11ySpy.resetFontSize).toHaveBeenCalled();
  });

  it('should call toggleHighContrast', () => {
    component.toggleHighContrast();
    expect(a11ySpy.toggleHighContrast).toHaveBeenCalled();
  });

  it('should call toggleReducedMotion', () => {
    component.toggleReducedMotion();
    expect(a11ySpy.toggleReducedMotion).toHaveBeenCalled();
  });

  it('should render template', () => {
    component.togglePanel();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el).toBeTruthy();
  });
});
