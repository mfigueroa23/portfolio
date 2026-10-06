import { RenderMode } from '@angular/ssr';
import { routes } from './app.routes';
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

  it('prerenders the Spanish home (RF-146)', () => {
    expect(modeOf('es')).toBe(RenderMode.Prerender);
  });

  it.each(['es/projects', 'es/projects/:slug', 'es/experience', 'es/blog', 'es/blog/**'])(
    'renders %s on the server on demand, like its English page (RF-146)',
    (path) => {
      expect(modeOf(path)).toBe(RenderMode.Server);
    },
  );
});

describe('routes', () => {
  it('mounts the same pages under /es (RF-120)', () => {
    const es = routes.find((route) => route.path === 'es');
    const english = routes.filter((route) => route !== es && route.path !== '**');

    expect(es?.data).toEqual({ lang: 'es' });
    expect(es?.children).toEqual(english);
    expect(routes.at(-1)?.path).toBe('**');
  });
});
