import { Routes } from '@angular/router';

const notFound = () => import('./pages/not-found/not-found').then((comp) => comp.NotFound);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((comp) => comp.Home),
  },
  // Content pages, served on demand by the server; they answer 404 until each page exists.
  { path: 'projects', loadComponent: notFound },
  { path: 'projects/:slug', loadComponent: notFound },
  { path: 'experience', loadComponent: notFound },
  { path: 'blog', loadComponent: notFound },
  { path: '**', loadComponent: notFound },
];
