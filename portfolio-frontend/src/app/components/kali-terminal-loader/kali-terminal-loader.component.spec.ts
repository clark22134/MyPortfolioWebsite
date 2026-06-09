import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { KaliTerminalLoaderComponent } from './kali-terminal-loader.component';
import { TerminalLoaderService } from '../../services/terminal-loader.service';

describe('KaliTerminalLoaderComponent', () => {
  let component: KaliTerminalLoaderComponent;
  let fixture: ComponentFixture<KaliTerminalLoaderComponent>;
  let loader: TerminalLoaderService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KaliTerminalLoaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KaliTerminalLoaderComponent);
    component = fixture.componentInstance;
    loader = TestBed.inject(TerminalLoaderService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with no visible lines and the cursor showing', () => {
    expect(component.visibleLines.length).toBe(0);
    expect(component.showCursor).toBe(true);
    expect(component.fadeOut).toBe(false);
    expect(component.hidden).toBe(false);
  });

  it('reveals every line, then fades out, hides, and marks the loader complete', fakeAsync(() => {
    const markSpy = vi.spyOn(loader, 'markComplete');
    const total = (component as unknown as { lines: string[] }).lines.length;

    // Invoke ngOnInit directly (rather than via detectChanges) so the
    // animation's setInterval is scheduled inside the fakeAsync zone and
    // therefore advanced by tick().
    component.ngOnInit();

    // One 200ms interval reveals each line; one more interval hits the
    // completion branch that stops the cursor and schedules the fade-out.
    tick(200 * (total + 1));
    expect(component.visibleLines.length).toBe(total);
    expect(component.showCursor).toBe(false);

    tick(800); // fade-out delay
    expect(component.fadeOut).toBe(true);

    tick(850); // hide delay
    expect(component.hidden).toBe(true);
    expect(markSpy).toHaveBeenCalledTimes(1);
  }));

  it('clears its timers on destroy so the loader never completes after teardown', fakeAsync(() => {
    const markSpy = vi.spyOn(loader, 'markComplete');

    component.ngOnInit();
    tick(400); // a couple of lines in, animation still running
    component.ngOnDestroy();

    tick(20000); // advance well past every scheduled timeout
    expect(markSpy).not.toHaveBeenCalled();
  }));
});
