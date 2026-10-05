import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { API_URL } from './app/core/config/api';
import { SITE_URL } from './app/core/config/site';
import { PostSummary } from './app/core/interfaces/content';
import { buildRssFeed } from './server/rss';

// Requests with any other Host header are refused by the engine (SSRF protection).
const ALLOWED_HOSTS = ['marco.figueroa-sanchez.com', 'localhost'];

const engine = new AngularNodeAppEngine({ allowedHosts: ALLOWED_HOSTS });

// A slow API must not hold the request; the feed then answers 503.
const FEED_TIMEOUT_MS = 5000;

type Next = (error?: unknown) => void;

/** `GET /blog/rss.xml`: the latest published posts as RSS 2.0 (RF-107, RF-108). */
async function serveFeed(response: ServerResponse): Promise<void> {
  try {
    const api = await fetch(`${API_URL}/content/posts/feed`, {
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
    if (!api.ok) throw new Error(`API answered ${api.status}`);
    const feed = buildRssFeed((await api.json()) as PostSummary[], SITE_URL);
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.end(feed);
  } catch (error) {
    console.error('RSS feed unavailable:', error);
    response.statusCode = 503;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.end('Feed temporarily unavailable.\n');
  }
}

function isFeedRequest(request: IncomingMessage): boolean {
  const path = new URL(request.url ?? '/', 'http://localhost').pathname;
  return path === '/blog/rss.xml' && (request.method === 'GET' || request.method === 'HEAD');
}

async function handle(request: IncomingMessage, response: ServerResponse, next: Next) {
  try {
    // The feed is XML, not an Angular route, so it is answered before the engine (plan D17).
    if (isFeedRequest(request)) return await serveFeed(response);
    const rendered = await engine.handle(request);
    if (!rendered) return next();
    // Server-rendered pages reflect the content of each request (RF-120), so never cache them.
    rendered.headers.set('Cache-Control', 'no-store');
    await writeResponseToNodeResponse(rendered, response);
  } catch (error) {
    next(error);
  }
}

/** Request handler used by the Angular CLI dev server and the build. */
export const reqHandler = createNodeRequestHandler(handle);

// Static files are served by nginx in front of this process; anything the engine does not
// render ends here.
function fallback(response: ServerResponse): Next {
  return (error) => {
    if (response.headersSent) return void response.end();
    response.statusCode = error ? 500 : 404;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end(error ? 'Internal server error.\n' : 'Not found.\n');
  };
}

if (isMainModule(import.meta.url)) {
  const port = Number(process.env['PORT'] ?? 4000);
  createServer((request, response) => reqHandler(request, response, fallback(response))).listen(
    port,
    () => console.log(`SSR server listening on http://localhost:${port}`),
  );
}
