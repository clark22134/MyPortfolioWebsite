import { vi, type Mock } from 'vitest';

/**
 * Vitest-friendly drop-in replacement for `jasmine.SpyObj<T>`.
 *
 * The intersection with `T` keeps casts like
 * `TestBed.inject(MyService) as SpyObj<MyService>` valid (the runtime value is
 * still assignable to T), while the mapped type lets you call `mockReturnValue`,
 * `mockImplementation`, etc. on each method.
 */
export type SpyObj<T> = T & {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? Mock : T[K];
};

/**
 * Vitest-friendly drop-in replacement for `jasmine.createSpyObj(name, methodNames, propertyBag?)`.
 * Returns an object whose method names are `vi.fn()` instances and whose
 * property-bag entries are copied verbatim. The first `name` arg is ignored
 * (kept only for parity with the Jasmine signature).
 */
export function createSpyObj<T = any>(
  _name: string,
  methodNames: ReadonlyArray<keyof T> | string[],
  properties: Partial<T> = {} as Partial<T>
): SpyObj<T> {
  const obj: any = { ...properties };
  for (const m of methodNames) {
    obj[m as string] = vi.fn();
  }
  return obj as SpyObj<T>;
}
