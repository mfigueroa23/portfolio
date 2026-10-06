# Constitución — Portfolio

1. Stack fijo: Angular 22 standalone + signals, Tailwind v4, TypeScript, pnpm. Nuevas dependencias requieren aprobación.
2. Server rendering: la home y las rutas existentes se prerenderizan (`RenderMode.Prerender`); `/projects*`, `/experience` y `/blog*` (incluido `/blog/rss.xml`) se renderizan en el servidor bajo demanda (`RenderMode.Server`, `outputMode: server`). Las páginas en español viven bajo `/es` y replican el modo de render de su equivalente en inglés (`/es` prerenderizada; `/es/projects*`, `/es/experience`, `/es/blog*` y `/es/blog/rss.xml` en el servidor). La redirección de la primera visita a `/es` la decide nginx a partir de `Accept-Language` y la cookie `lang` (configuración, no código de servidor). El código de servidor vive solo en `src/server.ts` y `src/server/`; contenido y formularios pasan por la API (`src/app/core/`).
3. Cada componente tiene su `*.spec.ts`; `pnpm test` pasa antes de cada commit.
4. `pnpm build` en producción sin errores ni budgets excedidos (initial < 500kB, estilos de componente < 4kB).
5. Código formateado con Prettier (`prettier --check` limpio).
6. La web no maneja secretos; viven en la API, nunca en `src/` ni en el repo.
7. Toda entrada de usuario se valida en la API (`api.figueroa-sanchez.com`), no solo en el cliente.
8. Accesible: HTML semántico, `alt` en imágenes, foco visible en elementos interactivos.
9. Código y commits en inglés; la UI en inglés y español (textos en `src/app/core/i18n/`); Conventional Commits.
10. Las funcionalidades nuevas parten de una spec en `docs/specs/NNN-*/`.
