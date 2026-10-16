// Runs the Angular CLI with the API and assistant base URLs from the environment.
//
// The site is prerendered, so the URLs must be fixed at build/serve time. `API_URL` and
// `AGENT_URL` come from `.env` locally, from the project's environment variables on Vercel, or
// from secrets in CI. When one is not set, its define is not passed and the app falls back to
// production for it.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

// loadEnvFile does not override variables that are already set, so a real environment wins.
if (existsSync('.env')) process.loadEnvFile('.env');

// Environment variable → global identifier read by `core/config/api.ts` and `agent.ts`.
const DEFINES = { API_URL: 'NG_API_URL', AGENT_URL: 'NG_AGENT_URL' };

const args = process.argv.slice(2);
for (const [variable, identifier] of Object.entries(DEFINES)) {
  const value = process.env[variable]?.trim();
  // `--define` inserts the value as code, so a string needs its quotes (JSON.stringify).
  if (value) args.push('--define', `${identifier}=${JSON.stringify(value)}`);
}

const ng = createRequire(import.meta.url).resolve('@angular/cli/bin/ng.js');
const child = spawn(process.execPath, [ng, ...args], { stdio: 'inherit' });
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
