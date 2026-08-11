# Repository Guidelines

## Project Structure & Module Organization

This is a Vite-powered, client-side resume generator. Application behavior lives in `src/`: `main.js` initializes the app, `renderer.js` produces resume markup, `version-store.js` manages version data, and `dev-panel*.{js,css}` implements editing controls. Keep visual changes in `style.css` (layout and typography) or `themes.css` (theme variables). Build and data tooling belongs in `scripts/` and `vite.config.js`.

`data-example/` contains the anonymized, publishable resume tree used for production builds. Local resumes live in the ignored `data/` directory; do not commit them. `dist/` is Vite's intermediate build directory; `output/` contains the generated self-contained HTML and PDFs.

## Build, Test, and Development Commands

```bash
npm ci          # install the lockfile-defined dependency set
npm run init    # create ignored local data/ from the example data
npm run dev     # start Vite development server (normally port 60090)
npm run build   # create output/resume.html (with dist/ as an intermediate)
npm run pdf     # build, then export an A4 PDF in output/; requires Google Chrome on macOS
npm run clean   # remove generated build and export files
```

There is currently no automated test or lint command. Before submitting a change, run `npm run build`; for rendering, layout, or export changes, also inspect the result in the development server and validate `npm run pdf` when Chrome is available.

## Coding Style & Naming Conventions

Use ES modules, two-space indentation, semicolons, and single quotes, matching the existing JavaScript. Prefer small, focused functions and `camelCase` for variables and functions; use `SCREAMING_SNAKE_CASE` for constants. Keep source filenames lowercase and hyphenated, such as `image-export.js`. Reuse the existing CSS custom-property layers: `--theme-*` in `themes.css` and `--resume-*` in `style.css`.

Resume JSON must remain valid and independently renderable. Treat user-provided text as plain text; do not introduce raw HTML into resume data.

## Commit & Pull Request Guidelines

Follow the repository’s Conventional Commit style, e.g. `feat: publish reusable resume generator`. Keep each commit scoped to one change. PRs should explain the user-visible effect, note data/privacy implications, link related issues when available, and include before/after screenshots for UI or A4 layout changes. Confirm that no ignored personal `data/` content or generated exports are staged.

## Privacy & Documentation

Only `data-example/` may be published. Do not add real personal information, attachments, or credentials. Update `README.md` or other relevant documentation whenever a command, data workflow, or user-visible behavior changes.
