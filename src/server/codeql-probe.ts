// Throwaway probe for Spec 009 E2: CodeQL must report stack trace exposure (medium) without
// blocking the PR.
import { createServer } from 'node:http';

export const probe = createServer((request, response) => {
  try {
    JSON.parse(decodeURIComponent(request.url ?? ''));
    response.end('ok');
  } catch (error) {
    response.end((error as Error).stack);
  }
});
