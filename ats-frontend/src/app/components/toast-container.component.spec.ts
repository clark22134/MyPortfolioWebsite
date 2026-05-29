import { TestBed } from '@angular/core/testing';
import { ToastContainerComponent } from './toast-container.component';
import { ToastService } from '../services/toast.service';

describe('ToastContainerComponent', () => {
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ToastContainerComponent] });
    toast = TestBed.inject(ToastService);
  });

  it('renders nothing when no toasts', () => {
    const fixture = TestBed.createComponent(ToastContainerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.toast').length).toBe(0);
  });

  it('renders each toast in the stack', () => {
    toast.show('success', 'A', 'msg', 0);
    toast.show('error', 'B', undefined, 0);
    const fixture = TestBed.createComponent(ToastContainerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.toast').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('A');
    expect(fixture.nativeElement.textContent).toContain('B');
  });

  it('dismiss button removes a toast', () => {
    toast.show('info', 'A', '', 0);
    const fixture = TestBed.createComponent(ToastContainerComponent);
    fixture.detectChanges();
    fixture.componentInstance.dismiss(toast.toasts()[0].id);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.toast').length).toBe(0);
  });
});
