// Vitest global setup for Angular tests.
// `zone.js` and `zone.js/testing` are loaded as polyfills (see angular.json
// `build:test` configuration), so `fakeAsync` and friends work out of the box.
import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

declare const Zone: any;

// Always (re)install a matchMedia stub — jsdom does not implement it, and
// any consumers (e.g. AccessibilityService, CDK BreakpointObserver) crash
// without it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// jsdom does not implement DragEvent — provide a minimal stub used by
// the interactive-projects component drag/drop tests.
if (typeof (globalThis as any).DragEvent === 'undefined') {
  class DragEventPolyfill extends Event {
    dataTransfer: any;
    constructor(type: string, init: any = {}) {
      super(type, init);
      this.dataTransfer = init.dataTransfer ?? null;
    }
  }
  (globalThis as any).DragEvent = DragEventPolyfill;
}

// jsdom does not implement Element.scrollIntoView — stub it so components
// that scroll programmatically (e.g. CredentialsComponent.scrollToSection)
// work in tests.
if (typeof (Element.prototype as any).scrollIntoView !== 'function') {
  (Element.prototype as any).scrollIntoView = vi.fn();
}

// jsdom does not implement IntersectionObserver — provide a minimal no-op
// stub used by HomeComponent.ngAfterViewInit and similar consumers.
if (typeof (globalThis as any).IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    constructor(_cb: any, _opts?: any) {}
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): any[] {
      return [];
    }
    root: any = null;
    rootMargin = '';
    thresholds: number[] = [];
  }
  (globalThis as any).IntersectionObserver = IntersectionObserverStub;
  (window as any).IntersectionObserver = IntersectionObserverStub;
}

// ---------------------------------------------------------------------------
// Vitest <-> zone.js bridge
// ---------------------------------------------------------------------------
// `zone.js/testing` provides `ProxyZoneSpec`, but no test-runner adapter
// (zone.js ships only `jasmine-patch` and `mocha-patch`).  Without an
// adapter, `fakeAsync(...)` aborts with "Expected to be running in
// 'ProxyZone'".  The block below installs an equivalent for Vitest by
// wrapping every `beforeEach`/`afterEach`/`beforeAll`/`afterAll` and test
// callback so they execute inside a freshly forked ProxyZone.
if (typeof Zone !== 'undefined' && Zone.ProxyZoneSpec) {
  const ProxyZoneSpec = Zone.ProxyZoneSpec;
  const ambientZone = Zone.current;

  const runInProxyZone = <T>(fn: (...args: any[]) => T, args: any[]): T => {
    const proxyZone = ambientZone.fork(new ProxyZoneSpec());
    return proxyZone.run(fn, undefined, args);
  };

  const wrap = <T extends (...args: any[]) => any>(fn: T | undefined): T | undefined => {
    if (typeof fn !== 'function') {
      return fn;
    }
    return function wrappedInProxyZone(this: unknown, ...args: any[]) {
      return runInProxyZone(fn.bind(this), args);
    } as T;
  };

  // Patch the lifecycle hooks themselves so the user-supplied callback runs
  // inside ProxyZone.  Vitest's globals come from `vitest/globals` types and
  // `globals: true` in the runner config (see configuration.js).
  const lifecycleNames = ['beforeEach', 'afterEach', 'beforeAll', 'afterAll'] as const;
  for (const name of lifecycleNames) {
    const original = (globalThis as any)[name];
    if (typeof original === 'function') {
      (globalThis as any)[name] = (fn: any, ...rest: any[]) =>
        original(wrap(fn), ...rest);
    }
  }

  // Patch `it` / `test` (and their `.only` / `.skip` / `.todo` / `.concurrent`
  // chainables) so each test body also runs inside ProxyZone.
  const patchTestFn = (root: any, key: string) => {
    const original = root?.[key];
    if (typeof original !== 'function') return;

    const patched = function (this: unknown, name: any, fn: any, ...rest: any[]) {
      return original.call(this, name, wrap(fn), ...rest);
    };

    // Preserve modifiers like `.only`, `.skip`, `.todo`, `.each`, `.concurrent`
    for (const mod of Object.keys(original)) {
      const value = (original as any)[mod];
      if (typeof value === 'function') {
        (patched as any)[mod] = function (this: unknown, name: any, fn: any, ...rest: any[]) {
          return value.call(this, name, wrap(fn), ...rest);
        };
      } else {
        (patched as any)[mod] = value;
      }
    }

    root[key] = patched;
  };

  patchTestFn(globalThis, 'it');
  patchTestFn(globalThis, 'test');

  // Use beforeEach/afterEach to surface a clearer error if zone-testing somehow
  // gets unloaded between specs.
  beforeEach(() => {
    if (!Zone.ProxyZoneSpec) {
      throw new Error(
        '[test-setup] zone-testing was unloaded — fakeAsync will not work. ' +
          'Ensure "zone.js/testing" remains in the polyfills list.',
      );
    }
  });
} else if (typeof Zone === 'undefined') {
  // eslint-disable-next-line no-console
  console.warn('[test-setup] Zone.js not loaded — fakeAsync tests will fail.');
}
