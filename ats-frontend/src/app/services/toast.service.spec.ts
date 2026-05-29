import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('adds and auto-dismisses', async () => {
    service.show('info', 'Hi', 'msg', 20);
    expect(service.toasts().length).toBe(1);
    await new Promise(r => setTimeout(r, 60));
    expect(service.toasts().length).toBe(0);
  });

  it('helper methods set variant', () => {
    service.success('S', undefined);
    service.error('E');
    service.warning('W');
    service.info('I');
    const variants = service.toasts().map(t => t.variant);
    expect(variants).toEqual(['success', 'error', 'warning', 'info']);
  });

  it('dismiss by id', () => {
    service.show('info', 'A', '', 0);
    service.show('info', 'B', '', 0);
    const [first] = service.toasts();
    service.dismiss(first.id);
    expect(service.toasts().some(t => t.id === first.id)).toBe(false);
  });

  it('clear removes all', () => {
    service.show('info', 'A', '', 0);
    service.show('info', 'B', '', 0);
    service.clear();
    expect(service.toasts().length).toBe(0);
  });
});
