import { Routes } from '@angular/router';

const notFound = () => import('./pages/not-found/not-found').then((comp) => comp.NotFound);
const blogPage = () => import('./pages/blog/blog-page').then((comp) => comp.BlogPage);

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
  {
    path: 'experience',
    loadComponent: () =>
      import('./pages/experience-page/experience-page').then((comp) => comp.ExperiencePage),
  },
  { path: 'blog', loadComponent: blogPage },
  { path: 'blog/page/:page', loadComponent: blogPage },
  { path: 'blog/tag/:tag', loadComponent: blogPage },
  { path: 'blog/tag/:tag/page/:page', loadComponent: blogPage },
  {
    path: 'blog/:slug',
    loadComponent: () => import('./pages/post/post-page').then((comp) => comp.PostPage),
  },
  { path: '**', loadComponent: notFound },
];
