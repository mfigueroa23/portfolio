import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';

// Requests with any other Host header are refused by the engine (SSRF protection).
const ALLOWED_HOSTS = ['marco.figueroa-sanchez.com', 'localhost'];

const engine = new AngularNodeAppEngine({ allowedHosts: ALLOWED_HOSTS });

type Next = (error?: unknown) => void;

async function handle(request: IncomingMessage, response: ServerResponse, next: Next) {
  try {
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
