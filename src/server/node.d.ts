// Minimal typings for the Node.js APIs used by `src/server.ts` and `src/server/`.
// The repo has no `@types/node` (no new dependencies without approval), so only the members
// the server needs are declared here.
declare module 'node:http' {
  interface IncomingMessage {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined>;
  }

  interface ServerResponse {
    statusCode: number;
    headersSent: boolean;
    setHeader(name: string, value: string | number): this;
    end(chunk?: string): this;
  }

  interface Server {
    listen(port: number, callback?: () => void): this;
  }

  function createServer(
    listener: (request: IncomingMessage, response: ServerResponse) => void,
  ): Server;
}

declare const process: {
  env: Record<string, string | undefined>;
};
