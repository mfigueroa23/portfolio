# Marco Figueroa

Hi, I'm Marco Figueroa — a full-stack developer working with Angular, Node.js, and Kubernetes. I build web apps and run the servers behind them.

## About me

I'm a software engineer and system administrator based in Santiago, Chile, with 3 years of experience supporting and operating critical systems — Windows, Linux, databases and TLS/SSL certificates.

Today I build AI-powered solutions with Python, FastAPI, LangGraph and Next.js, and I work across the stack with Angular, Node.js and TypeScript, backed by CI/CD pipelines, Docker and Kubernetes.

I enjoy understanding the whole picture: how the code is written, how it's deployed and how it keeps running in production.

## Experience

| Period              | Role                                         | Company       | Technologies                                      |
| ------------------- | -------------------------------------------- | ------------- | ------------------------------------------------- |
| Sep 2026 — Present  | Intern — Systems & Technology, AI Solutions  | Autofin Chile | Python, FastAPI, LangGraph, Next.js, Jira         |
| Mar 2025 — Apr 2025 | Technical Support Agent                      | E-Cert Chile  | Technical Support, Incident Management            |
| Jul 2023 — Oct 2024 | TLS/SSL Operator — System Administrator      | E-SIGN S.A.   | Linux, Windows Server, TLS/SSL, Kubernetes, CI/CD |
| Dec 2021 — Apr 2023 | Customer Service — Technical & Sales Support | E-SIGN S.A.   | Technical Support, Customer Service               |

## Contact

- **Email:** [marco@figueroa-sanchez.com](mailto:marco@figueroa-sanchez.com)
- **Website:** [marco.figueroa-sanchez.com](https://marco.figueroa-sanchez.com)
- **LinkedIn:** [mfigueroa23](https://www.linkedin.com/in/mfigueroa23)
- **Location:** Santiago, Chile

## Deployment

The site runs as one Kubernetes pod (`deployment/portfolio`, namespace `portfolio`) with two containers:

- `portfolio` (image `portfolio`, Dockerfile target `static`): nginx on port 8080 serving the prerendered home and static files, and proxying `/projects`, `/experience` and `/blog` to the sidecar.
- `ssr` (image `portfolio-ssr`, Dockerfile target `ssr`): the Node server (`node server/server.mjs`) rendering those routes and `/blog/rss.xml` on demand on port 4000.

Every push to `main` builds both images and sets both containers by digest (`.github/workflows/release.yaml`).

Runbook before the first release with server rendering:

1. Create the Docker Hub repository `portfolio-ssr`.
2. Add the `ssr` container to `deployment/portfolio` (same pod as nginx, so it is reachable on `127.0.0.1:4000`):
   ```yaml
   - name: ssr
     image: <dockerhub-user>/portfolio-ssr:latest
     ports:
       - containerPort: 4000
   ```
