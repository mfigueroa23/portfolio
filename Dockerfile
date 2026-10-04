# Stage 1: set the API origin in the CSP, compute hashes for inline scripts and lock down
# file permissions. API_URL must match the one used by `pnpm build`; an empty value (unset CI
# secret) falls back to production.
FROM perl:5-slim AS csp
ARG API_URL=https://api.figueroa-sanchez.com
COPY dist/devsonic.cl/browser /site
COPY nginx.conf docker/csp-hashes.pl /work/
# Only scheme://host[:port] reaches nginx.conf, so the value can't inject CSP directives.
RUN API_ORIGIN=$(perl -e '$ARGV[0] =~ m{^(https?://[A-Za-z0-9.-]+(?::[0-9]+)?)(?:/.*)?$} or die "invalid API_URL\n"; print $1' "${API_URL:-https://api.figueroa-sanchez.com}") \
 && sed -i "s|__API_ORIGIN__|$API_ORIGIN|" /work/nginx.conf \
 && perl /work/csp-hashes.pl /site /work/nginx.conf \
 && find /site -type d -exec chmod 0555 {} + \
 && find /site -type f -exec chmod 0444 {} +

# Target `ssr`: the Node server rendering /projects, /experience and /blog on demand. It runs as
# a sidecar of the `static` container in the same pod; nginx proxies those paths to port 4000.
FROM node:26-alpine AS ssr
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --chown=root:root dist/devsonic.cl/server ./server
COPY --chown=root:root dist/devsonic.cl/browser ./browser
USER node
EXPOSE 4000
# The engine only answers allowed hosts, so the probe uses `localhost`.
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q -O /dev/null http://localhost:4000/projects || exit 1
CMD ["node", "server/server.mjs"]

# Target `static` (default, last stage): unprivileged nginx serving the prerendered build and
# proxying the server-rendered paths to the `ssr` sidecar.
FROM nginx:stable-alpine AS static
RUN rm -rf /etc/nginx/conf.d/* /etc/nginx/templates /usr/share/nginx/html/*
COPY --from=csp /work/nginx.conf /etc/nginx/nginx.conf
COPY --from=csp --chown=root:root /site /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
