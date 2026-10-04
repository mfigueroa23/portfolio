import { RenderMode, ServerRoute } from '@angular/ssr';

// The home is prerendered at build time; the content pages are rendered on each request so
// they reflect the panel's changes immediately (RF-116, RF-120).
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'projects', renderMode: RenderMode.Server },
  { path: 'projects/:slug', renderMode: RenderMode.Server },
  { path: 'experience', renderMode: RenderMode.Server },
  { path: 'blog', renderMode: RenderMode.Server },
  { path: 'blog/**', renderMode: RenderMode.Server },
  // Unknown paths render the not-found page with a 404 status.
  { path: '**', renderMode: RenderMode.Server },
];
