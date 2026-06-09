import { TerminalLoaderService } from './terminal-loader.service';

describe('TerminalLoaderService', () => {
  let service: TerminalLoaderService;

  beforeEach(() => {
    service = new TerminalLoaderService();
  });

  it('starts in the incomplete state', () => {
    expect(service.isComplete).toBe(false);
  });

  it('markComplete() flips isComplete and emits true', () => {
    const emissions: boolean[] = [];
    service.complete$.subscribe(value => emissions.push(value));

    service.markComplete();

    expect(service.isComplete).toBe(true);
    expect(emissions).toEqual([false, true]);
  });

  it('replays the current value to late subscribers', () => {
    service.markComplete();

    let latest: boolean | undefined;
    service.complete$.subscribe(value => (latest = value));

    expect(latest).toBe(true);
  });

  it('stays complete once marked, even if called again', () => {
    service.markComplete();
    service.markComplete();

    expect(service.isComplete).toBe(true);
  });
});
