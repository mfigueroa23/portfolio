# AGENTS.md — Portfolio

## Proyecto

Portafolio personal de Marco Figueroa (marco.figueroa-sanchez.com): SPA de una página con secciones (hero, about, experience, projects, testimonials, contact).
Angular 22 standalone con Tailwind CSS v4. La home se prerenderiza (el prerender embebe el contenido y el navegador lo vuelve a pedir); `/projects`, `/projects/<slug>`, `/experience`, `/blog*` y `/blog/rss.xml` se renderizan bajo demanda en un servidor Node (`src/server.ts`: `node:http` + `AngularNodeAppEngine`, puerto 4000) que corre como sidecar (imagen `portfolio-ssr`, target `ssr` del Dockerfile) junto al nginx (target `static`), que sirve lo estático y le hace proxy de esas rutas. El contenido, el formulario de contacto y el de testimonios pasan por la API `https://api.figueroa-sanchez.com` (repo `api`). Testimonios de visitantes: tras hidratar la home, la sección testimonials muestra el botón "Leave a testimonial", que abre un `<dialog>` nativo (`components/testimonial-dialog/`) con el formulario (nombre, rol, email, testimonio y honeypot `website`), validado en el cliente con las reglas de la API (`core/utils/testimonial-validation.ts`) y enviado con `TestimonialService` a `POST /testimonials`; el envío queda pendiente hasta que el dueño lo aprueba en el panel. Un testimonio sin foto muestra las iniciales del autor (`core/utils/initials.ts`).
Versión en español bajo `/es` (Spec 004): las mismas rutas montadas dos veces desde un solo `pageRoutes` (`app.routes.ts`; `/es` se prerenderiza y `/es/projects*`, `/es/experience`, `/es/blog*` se renderizan en el servidor, `app.routes.server.ts`). El idioma sale de la URL (`core/i18n/language.ts` y `LanguageService`, que además fija `<html lang>`); los textos de interfaz viven en diccionarios tipados (`core/i18n/messages.en.ts` y `messages.es.ts`, una clave faltante rompe el build) y los enlaces internos pasan por `LanguageService.href()`. El selector EN/ES (`components/language-switch/`) enlaza a las `alternates` de la página y guarda la cookie `lang` (365 días). La API recibe `?lang=` en cada lectura de contenido y en los formularios; un ítem no traducido llega en inglés y se marca con `lang="en"`. `SeoService` escribe canonical por idioma, `hreflang` en/es/x-default y `og:locale`; los detalles con slug en español redirigen 301 desde el slug inglés (`HttpStatusService.redirect`). El feed en español es `/es/blog/rss.xml`. La redirección de la primera visita la hace nginx (`nginx.conf`): sin cookie `lang` y con `Accept-Language` que empieza por `es`, las páginas en inglés (`/`, `/projects*`, `/experience`, `/blog*`, nunca `/blog/rss.xml` ni archivos) responden `302` a `/es$request_uri`, con `Cache-Control: private, no-cache` y `Vary: Accept-Language, Cookie`; `/es` sirve la home prerenderizada y `/es/(projects|experience|blog)` va al sidecar SSR. Las sondas CSP (`docker/render-ssr-pages.mjs`) incluyen las rutas `/es`.
Estructura: `src/app/core/` (config, interfaces, servicios y utilidades), `src/app/components/` (UI reutilizable), `src/app/sections/` (bloques de la home), `src/app/pages/` (rutas lazy), `src/server.ts` y `src/server/` (servidor SSR y feed RSS), `public/` (assets estáticos).

## Comandos

- Instalar: `pnpm install`
- Ejecutar: `pnpm start` (dev) · `pnpm build` (producción) · `node dist/devsonic.cl/server/server.mjs` (servidor SSR, `PORT` por defecto 4000); ambos pasan por `scripts/ng.mjs`, que toma `API_URL` del entorno o de `.env` (copiar `.env.example`) y, si no está, usa `https://api.figueroa-sanchez.com`. En Vercel: Project Settings → Environment Variables → `API_URL`. En el CI: secret `API_URL` del repo, que `release.yaml` pasa al build y a la imagen.
- Imágenes Docker: `docker build --target static --build-arg API_URL=<url> .` (nginx) y `docker build --target ssr .` (servidor SSR); `static` pone el origen de la API en el CSP `connect-src` de `nginx.conf` (placeholder `__API_ORIGIN__`); debe ser la misma URL usada en `pnpm build`. Sin el argumento, usa producción. El CSP `script-src` lleva los hashes de los scripts inline del sitio prerenderizado y de las rutas SSR: el stage `ssr-pages` renderiza esas rutas con el servidor construido (`docker/render-ssr-pages.mjs`) y `docker/csp-hashes.pl` hashea ambos; `scripts/check-ssr-csp.sh` repite esos pasos en CI.
- Tests: `pnpm test`
- Lint/formato: `pnpm exec prettier --check .` (`--write` para corregir)

## Estilo y convenciones

- TypeScript ~6, Angular 22: componentes standalone, signals (`signal`, `input`, `computed`), sin NgModules ni decoradores `@Input`.
- Archivos sin sufijo `.component`: `button.ts`/`.html`/`.css`/`.spec.ts`; clase `Button`, selector `app-button`.
- Estilos con utilidades Tailwind; CSS por componente mínimo (budget 4kB).
- Prettier: 100 columnas, comillas simples, 2 espacios.
- Idioma: código y commits en inglés; UI en inglés y español (todo texto de interfaz va en los diccionarios de `core/i18n/`, nunca en las plantillas); respuestas al usuario en español.
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
