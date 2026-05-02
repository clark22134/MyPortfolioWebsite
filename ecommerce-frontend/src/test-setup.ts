// Vitest global setup for the ecommerce-frontend.
// Node 22+ ships an experimental built-in `localStorage` that, without a
// `--localstorage-file=path`, is exposed as an empty `{}` and shadows the
// jsdom implementation.  That breaks any test which spies on
// `Storage.prototype.getItem` (the spy attaches to jsdom's class, but the
// active instance has a null prototype).  Replace `localStorage` and
// `sessionStorage` with a deterministic in-memory implementation that DOES
// extend `Storage.prototype`, so existing prototype-level spies keep working.

// Per-instance backing stores keyed by the Storage object.
const stores = new WeakMap<Storage, Record<string, string>>();
function backing(self: Storage): Record<string, string> {
  let s = stores.get(self);
  if (!s) {
    s = {};
    stores.set(self, s);
  }
  return s;
}

// Install working implementations on Storage.prototype so that
// `vi.spyOn(Storage.prototype, 'getItem')` can intercept calls and
// `vi.restoreAllMocks()` will restore these working defaults.
Object.defineProperties(Storage.prototype, {
  getItem: {
    configurable: true,
    writable: true,
    value: function (this: Storage, key: string) {
      const s = backing(this);
      return Object.prototype.hasOwnProperty.call(s, key) ? s[key] : null;
    },
  },
  setItem: {
    configurable: true,
    writable: true,
    value: function (this: Storage, key: string, value: string) {
      backing(this)[key] = String(value);
    },
  },
  removeItem: {
    configurable: true,
    writable: true,
    value: function (this: Storage, key: string) {
      delete backing(this)[key];
    },
  },
  clear: {
    configurable: true,
    writable: true,
    value: function (this: Storage) {
      stores.set(this, {});
    },
  },
  key: {
    configurable: true,
    writable: true,
    value: function (this: Storage, index: number) {
      return Object.keys(backing(this))[index] ?? null;
    },
  },
  length: {
    configurable: true,
    get: function (this: Storage) {
      return Object.keys(backing(this)).length;
    },
  },
});

for (const name of ['localStorage', 'sessionStorage'] as const) {
  const fresh = Object.create(Storage.prototype) as Storage;
  try {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: fresh,
    });
  } catch {
    /* ignore — globalThis property may be locked */
  }
  try {
    Object.defineProperty(window, name, {
      configurable: true,
      writable: true,
      value: fresh,
    });
  } catch {
    /* ignore */
  }
}
