import { RenderMode, ServerRoute } from '@angular/ssr';

// Content pages rendered on each request so they reflect the panel's changes immediately
// (RF-116, RF-120).
const contentPaths = ['projects', 'projects/:slug', 'experience', 'blog', 'blog/**'];

// The home is prerendered at build time; the Spanish pages under `/es` mirror the render mode
// of their English equivalents (Spec 004 RF-146).
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'es', renderMode: RenderMode.Prerender },
  ...contentPaths.map((path) => ({ path, renderMode: RenderMode.Server as const })),
  ...contentPaths.map((path) => ({ path: `es/${path}`, renderMode: RenderMode.Server as const })),
  // Unknown paths render the not-found page with a 404 status.
  { path: '**', renderMode: RenderMode.Server },
];
