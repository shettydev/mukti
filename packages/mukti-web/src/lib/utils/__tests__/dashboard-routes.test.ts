import { getDashboardRedirectPath } from '../dashboard-routes';

describe('getDashboardRedirectPath', () => {
  it('redirects the dashboard root to chat', () => {
    expect(getDashboardRedirectPath([])).toBe('/chat');
  });

  it('redirects settings to the canonical settings route', () => {
    expect(getDashboardRedirectPath(['settings'])).toBe('/settings');
  });

  it('redirects conversation routes to chat routes', () => {
    expect(getDashboardRedirectPath(['conversations'])).toBe('/chat');
    expect(getDashboardRedirectPath(['conversations', 'abc-123'])).toBe('/chat/abc-123');
    expect(getDashboardRedirectPath(['conversations', 'new'])).toBe('/chat');
  });

  it('redirects canvas and map routes to canonical URLs', () => {
    expect(getDashboardRedirectPath(['canvas'])).toBe('/canvas');
    expect(getDashboardRedirectPath(['canvas', 'canvas-1'])).toBe('/canvas/canvas-1');
    expect(getDashboardRedirectPath(['map'])).toBe('/maps');
    expect(getDashboardRedirectPath(['map', 'map-1'])).toBe('/maps/map-1');
  });

  it('returns null for unsupported dashboard routes', () => {
    expect(getDashboardRedirectPath(['help'])).toBeNull();
    expect(getDashboardRedirectPath(['reports'])).toBeNull();
    expect(getDashboardRedirectPath(['conversations', 'a', 'b'])).toBeNull();
  });
});
