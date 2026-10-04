# AGENTS.md — Portfolio

## Proyecto

Portafolio personal de Marco Figueroa (marco.figueroa-sanchez.com): SPA de una página con secciones (hero, about, experience, projects, testimonials, contact).
Angular 22 standalone con Tailwind CSS v4. La home se prerenderiza (el prerender embebe el contenido y el navegador lo vuelve a pedir); `/projects`, `/projects/<slug>`, `/experience`, `/blog*` y `/blog/rss.xml` se renderizan bajo demanda en un servidor Node (`src/server.ts`: `node:http` + `AngularNodeAppEngine`, puerto 4000) que corre como sidecar (imagen `portfolio-ssr`, target `ssr` del Dockerfile) junto al nginx (target `static`), que sirve lo estático y le hace proxy de esas rutas. El contenido y el formulario de contacto pasan por la API `https://api.figueroa-sanchez.com` (repo `api`).
Estructura: `src/app/core/` (config, interfaces, servicios y utilidades), `src/app/components/` (UI reutilizable), `src/app/sections/` (bloques de la home), `src/app/pages/` (rutas lazy), `src/server.ts` y `src/server/` (servidor SSR y feed RSS), `public/` (assets estáticos).

## Comandos

- Instalar: `pnpm install`
- Ejecutar: `pnpm start` (dev) · `pnpm build` (producción) · `node dist/devsonic.cl/server/server.mjs` (servidor SSR, `PORT` por defecto 4000); ambos pasan por `scripts/ng.mjs`, que toma `API_URL` del entorno o de `.env` (copiar `.env.example`) y, si no está, usa `https://api.figueroa-sanchez.com`. En Vercel: Project Settings → Environment Variables → `API_URL`. En el CI: secret `API_URL` del repo, que `release.yaml` pasa al build y a la imagen.
- Imágenes Docker: `docker build --target static --build-arg API_URL=<url> .` (nginx) y `docker build --target ssr .` (servidor SSR); `static` pone el origen de la API en el CSP `connect-src` de `nginx.conf` (placeholder `__API_ORIGIN__`); debe ser la misma URL usada en `pnpm build`. Sin el argumento, usa producción.
- Tests: `pnpm test`
- Lint/formato: `pnpm exec prettier --check .` (`--write` para corregir)

## Estilo y convenciones

- TypeScript ~6, Angular 22: componentes standalone, signals (`signal`, `input`, `computed`), sin NgModules ni decoradores `@Input`.
- Archivos sin sufijo `.component`: `button.ts`/`.html`/`.css`/`.spec.ts`; clase `Button`, selector `app-button`.
- Estilos con utilidades Tailwind; CSS por componente mínimo (budget 4kB).
- Prettier: 100 columnas, comillas simples, 2 espacios.
- Idioma: código, UI y commits en inglés; respuestas al usuario en español.
- Commits con Conventional Commits.

## Reglas

- Lee docs/constitution.md y la spec activa (`docs/specs/NNN-*/spec.md`) antes de tocar código.
- No añadir dependencias, ni añadir rutas renderizadas en servidor, ni tocar `angular.json`/budgets sin preguntar.
- Código de servidor solo en `src/server.ts` y `src/server/`; Mermaid se carga solo con `import()` dinámico (`MermaidService`).
- No exponer secretos: la web no maneja secretos (viven en la API); nunca en `src/` ni en el repo.
- No modificar contenido personal (experiencia, CV en `public/`, datos de contacto) sin indicación explícita.

## Al terminar cualquier tarea

- Ejecutar `pnpm test` y `pnpm build`; ambos deben pasar sin errores ni budgets excedidos.
- Ejecutar `pnpm exec prettier --check` sobre los archivos tocados.
