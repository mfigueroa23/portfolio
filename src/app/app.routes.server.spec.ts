import { RenderMode } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';

describe('serverRoutes', () => {
  const modeOf = (path: string) => serverRoutes.find((route) => route.path === path)?.renderMode;

  it('keeps the home prerendered', () => {
    expect(modeOf('')).toBe(RenderMode.Prerender);
  });

  it.each(['projects', 'projects/:slug', 'experience', 'blog', 'blog/**'])(
    'renders %s on the server on demand',
    (path) => {
      expect(modeOf(path)).toBe(RenderMode.Server);
    },
  );

  it('renders unknown paths on the server so they answer 404', () => {
    expect(modeOf('**')).toBe(RenderMode.Server);
    expect(serverRoutes.at(-1)?.path).toBe('**');
  });
});
