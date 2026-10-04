#!/usr/bin/env bash
# Fails when a server-rendered page needs a CSP script hash that the prerendered pages do not
# have. nginx's CSP only lists the hashes of the prerendered build (docker/csp-hashes.pl), so
# an extra inline script in an SSR page would be blocked in production.
#
# Usage (after `pnpm build`): scripts/check-ssr-csp.sh
set -euo pipefail

DIST=dist/devsonic.cl
PORT=${CSP_CHECK_PORT:-4100}
work=$(mktemp -d)

PORT=$PORT node "$DIST/server/server.mjs" >"$work/server.log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true; rm -rf "$work"' EXIT

for _ in $(seq 1 50); do
  curl -s -o /dev/null "http://localhost:$PORT/" && break
  sleep 0.2
done

# Without -f: a 503 page (API unreachable) still carries the same bootstrap scripts.
mkdir "$work/ssr"
curl -s "http://localhost:$PORT/projects" -o "$work/ssr/projects.html"
curl -s "http://localhost:$PORT/blog" -o "$work/ssr/blog.html"

hashes() {
  local conf="$work/conf-$2"
  echo '__CSP_SCRIPT_HASHES__' >"$conf"
  perl docker/csp-hashes.pl "$1" "$conf" >/dev/null
  tr ' ' '\n' <"$conf" | grep "^'sha256-" | sort -u
}

hashes "$DIST/browser" static >"$work/static.txt"
hashes "$work/ssr" ssr >"$work/ssr.txt"
missing=$(comm -23 "$work/ssr.txt" "$work/static.txt")

if [ -n "$missing" ]; then
  echo "SSR pages need CSP script hashes the prerendered pages do not have:" >&2
  echo "$missing" >&2
  exit 1
fi
echo "SSR pages use only the prerendered CSP script hashes ($(wc -l <"$work/ssr.txt" | tr -d ' ') checked)."
