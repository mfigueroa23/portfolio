// Renders the server-rendered routes with the built SSR server and saves their HTML, so
// csp-hashes.pl can add the hashes of their inline scripts to nginx's CSP. Those scripts are
// Angular's event-replay bootstrap, whose event list depends on the components of each page
// (not on the content), so the pages rendered here carry the same scripts as in production.
// A 503 page (API unreachable at build time) keeps the same layout and scripts.
//
// Usage: node render-ssr-pages.mjs <server.mjs> <out-dir>
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [server, outDir] = process.argv.slice(2);
if (!server || !outDir) {
  console.error('usage: node render-ssr-pages.mjs <server.mjs> <out-dir>');
  process.exit(2);
}

const PORT = process.env.CSP_RENDER_PORT ?? '4100';
const ORIGIN = `http://localhost:${PORT}`;
// Every kind of server-rendered page: listings, details, the experience page and a 404.
const ROUTES = {
  'projects.html': '/projects',
  'project-detail.html': '/projects/csp-probe',
  'experience.html': '/experience',
  'blog.html': '/blog',
  'blog-tag.html': '/blog/tag/csp-probe',
  'post.html': '/blog/csp-probe',
  'not-found.html': '/blog/csp-probe/not-found',
};

const child = spawn(process.execPath, [server], {
  env: { ...process.env, PORT },
  stdio: ['ignore', 'ignore', 'inherit'],
});

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await fetch(`${ORIGIN}/`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`SSR server did not start on port ${PORT}`);
}

try {
  await waitForServer();
  await mkdir(outDir, { recursive: true });
  for (const [file, route] of Object.entries(ROUTES)) {
    const response = await fetch(`${ORIGIN}${route}`);
    const html = await response.text();
    // Every Angular page carries the event-replay contract; without it the render failed.
    if (!html.includes('ng-event-dispatch-contract')) {
      throw new Error(`${route} (${response.status}) is not an Angular page`);
    }
    await writeFile(join(outDir, file), html);
    console.log(`${route} → ${file} (${response.status})`);
  }
} finally {
  child.kill();
}
