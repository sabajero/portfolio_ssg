# Digital Sovereignty Portfolio

A high-performance, minimalist artist portfolio. Static site — no database, no CMS, no lock-in.

## Stack
- **Eleventy v3** (SSG) · Nunjucks templates · Vanilla CSS · Vanilla JS
- **Hosting**: Cloudflare Pages (free tier) + custom domain

## Local Development
```bash
npm install
npm run dev        # → http://localhost:8080 (live reload)
```

## Build & Deploy
```bash
npm run build      # Outputs to _site/
```
Push to `main` — Cloudflare Pages (or GitHub Actions) auto-deploys.

## Adding a Project
1. Create `src/_projects/NNN-project-slug.md`
2. Fill in the YAML front-matter (see existing files for reference)
3. Add images to `src/assets/images/projects/NNN/`
4. Commit and push — the site rebuilds automatically

## Content Structure
```
src/_projects/     ← One .md file per project
src/_data/         ← site.yaml (global metadata), nav.yaml
src/assets/        ← css, js, images
_site/             ← Build output (gitignored)
```
