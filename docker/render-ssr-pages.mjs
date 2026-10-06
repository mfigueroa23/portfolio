// Renders the server-rendered routes with the built SSR server and saves their HTML, so
// csp-hashes.pl can add the hashes of their inline scripts to nginx's CSP. Those scripts are
// Angular's event-replay bootstrap, whose event list depends on the components of each page
// (not on the content), so the pages rendered here carry the same scripts as in production.
// A 503 page (API unreachable at build time) keeps the same layout and scripts.
//
// buildx runs this stage for every platform at once on the builder's shared network, so the
// server listens on a free port (not a fixed one) and the render aborts if it dies, instead of
// talking to another platform's server.
//
// Usage: node render-ssr-pages.mjs <server.mjs> <out-dir>
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';

const [server, outDir] = process.argv.slice(2);
if (!server || !outDir) {
  console.error('usage: node render-ssr-pages.mjs <server.mjs> <out-dir>');
  process.exit(2);
}

/** A port nothing is listening on, chosen by the OS. */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(String(port)));
    });
  });
}

const PORT = process.env.CSP_RENDER_PORT || (await freePort());
// The SSR engine only accepts the `localhost` host (ALLOWED_HOSTS in src/server.ts).
const ORIGIN = `http://localhost:${PORT}`;
// Every kind of server-rendered page: listings, details, the experience page and a 404, in
// English and under /es (Spec 004 RF-146).
const ENGLISH_ROUTES = {
  'projects.html': '/projects',
  'project-detail.html': '/projects/csp-probe',
  'experience.html': '/experience',
  'blog.html': '/blog',
  'blog-tag.html': '/blog/tag/csp-probe',
  'post.html': '/blog/csp-probe',
  'not-found.html': '/blog/csp-probe/not-found',
};
const ROUTES = {
  ...ENGLISH_ROUTES,
  ...Object.fromEntries(
    Object.entries(ENGLISH_ROUTES).map(([file, route]) => [`es-${file}`, `/es${route}`]),
  ),
};

// A request must not hang the build (e.g. a stray process holding the port).
const REQUEST_TIMEOUT_MS = 30_000;
const START_TIMEOUT_MS = 60_000;

const child = spawn(process.execPath, [server], {
  env: { ...process.env, PORT },
  stdio: ['ignore', 'pipe', 'inherit'],
});
let exited = null;
child.on('exit', (code, signal) => {
  exited = `SSR server exited (${signal ?? `code ${code}`})`;
});

function assertServerAlive() {
  if (exited) throw new Error(exited);
}

// Waits for the child's own "listening" line: a successful request alone could come from
// another process on the port (a failed listen is logged, but does not stop the server).
function waitForServer() {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(
      () => reject(new Error(`SSR server did not start on port ${PORT}`)),
      START_TIMEOUT_MS,
    );
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.includes(`listening on ${ORIGIN}`)) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once('exit', () => {
      clearTimeout(timer);
      reject(new Error(exited));
    });
  });
}

try {
  await waitForServer();
  await mkdir(outDir, { recursive: true });
  for (const [file, route] of Object.entries(ROUTES)) {
    assertServerAlive();
    const response = await fetch(`${ORIGIN}${route}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const html = await response.text();
    assertServerAlive();
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
