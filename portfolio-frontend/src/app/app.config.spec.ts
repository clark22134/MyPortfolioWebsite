import { routerScrollingOptions } from './app.config';

describe('appConfig', () => {
  it('restores the viewport to the destination route on navigation', () => {
    expect(routerScrollingOptions.scrollPositionRestoration).toBe('enabled');
    expect(routerScrollingOptions.anchorScrolling).toBe('enabled');
  });
});
