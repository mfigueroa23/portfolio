#!/usr/bin/env bash
# Runs, outside Docker, the same CSP steps as the image build: renders the server-rendered
# routes, in English and under /es, with the built server (docker/render-ssr-pages.mjs; the
# prerendered /es home is part of the browser build), computes the hashes of the
# prerendered site plus those pages (docker/csp-hashes.pl) and fails when an inline script of
# an SSR page is missing from the resulting CSP, which nginx would then block.
#
# Usage (after `pnpm build`): scripts/check-ssr-csp.sh
set -euo pipefail

DIST=dist/devsonic.cl
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

CSP_RENDER_PORT=${CSP_CHECK_PORT:-4100} node docker/render-ssr-pages.mjs "$DIST/server/server.mjs" "$work/ssr"

echo '__CSP_SCRIPT_HASHES__' >"$work/nginx.conf"
perl docker/csp-hashes.pl "$DIST/browser" "$work/ssr" "$work/nginx.conf" >/dev/null

echo '__CSP_SCRIPT_HASHES__' >"$work/ssr.conf"
perl docker/csp-hashes.pl "$work/ssr" "$work/ssr.conf" >/dev/null

missing=$(comm -23 <(tr ' ' '\n' <"$work/ssr.conf" | grep "^'sha256-" | sort -u) \
  <(tr ' ' '\n' <"$work/nginx.conf" | grep "^'sha256-" | sort -u))

if [ -n "$missing" ]; then
  echo "SSR pages need CSP script hashes missing from the generated CSP:" >&2
  echo "$missing" >&2
  exit 1
fi
echo "The generated CSP covers every inline script of the SSR pages."
