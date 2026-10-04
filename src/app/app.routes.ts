import { Routes } from '@angular/router';

const notFound = () => import('./pages/not-found/not-found').then((comp) => comp.NotFound);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((comp) => comp.Home),
  },
  // Content pages, rendered on demand by the server (app.routes.server.ts).
  {
    path: 'projects',
    loadComponent: () => import('./pages/projects/projects-page').then((comp) => comp.ProjectsPage),
  },
  {
    path: 'projects/:slug',
    loadComponent: () =>
      import('./pages/project-detail/project-detail').then((comp) => comp.ProjectDetail),
  },
  // Answer 404 until their pages exist.
  { path: 'experience', loadComponent: notFound },
  { path: 'blog', loadComponent: notFound },
  { path: '**', loadComponent: notFound },
];
