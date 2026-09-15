# Repository Guidelines

## Project Structure & Module Organization

This is a Vite-powered, client-side resume generator. Application behavior lives in `src/`: `main.js` initializes the app, `renderer.js` produces resume markup, `version-store.js` manages version data, and `dev-panel*.{js,css}` implements editing controls. Keep visual changes in `style.css` (layout and typography) or `themes.css` (theme variables). Build and data tooling belongs in `scripts/` and `vite.config.js`.

`data-example/` contains the anonymized, publishable resume tree used for production builds. Local resumes live in the ignored `data/` directory; do not commit them. `dist/` is Vite's intermediate build directory; `output/` contains the generated self-contained HTML and PDFs.

## Build, Test, and Development Commands

```bash
npm ci          # install the lockfile-defined dependency set
npm run init    # create ignored local data/ from the example data
npm run migrate # upgrade any legacy schemaVersion data/versions/*.json to current
npm test        # node --test tests/ — runs the migrations test suite
npm run dev     # start Vite development server (normally port 60090)
npm run build   # create output/resume.html (with dist/ as an intermediate)
npm run pdf     # build, then export an A4 PDF in output/; requires Google Chrome on macOS
npm run clean   # remove generated build and export files
```

Before submitting a change, run `npm test` and `npm run build`; for rendering, layout, or export changes, also inspect the result in the development server and validate `npm run pdf` when Chrome is available.

## Coding Style & Naming Conventions

Use ES modules, two-space indentation, semicolons, and single quotes, matching the existing JavaScript. Prefer small, focused functions and `camelCase` for variables and functions; use `SCREAMING_SNAKE_CASE` for constants. Keep source filenames lowercase and hyphenated, such as `image-export.js`. Reuse the existing CSS custom-property layers: `--theme-*` in `themes.css` and `--resume-*` in `style.css`.

Resume JSON must remain valid and independently renderable. Treat user-provided text as plain text; do not introduce raw HTML into resume data.

## Data Model & Schema Migrations

The resume version format (`data/versions/<id>.json`, `data-example/versions/baseline.json`) is the contract for the renderer, editor, and any AI integration that touches user data.

- Official schema: `docs/resume.schema.json` (Draft 2020-12). Update this file whenever fields are added, renamed, removed, or have their type/enum changed.
- Human-readable field reference and AI baseline prompt: see `CLAUDE.md` → "版本 JSON 数据结构", which explicitly references the schema above.
- Migration registry: `src/migrations.js` keeps an ordered dictionary of pure functions keyed as `'X->Y'`. Only append new migrations; never rewrite an existing one (old user data only runs each step once). When the schema bumps:
  1. Add a new `'X->Y'` function to `src/migrations.js`.
  2. Update `docs/resume.schema.json`.
  3. Update `CLAUDE.md` → "版本 JSON 数据结构" to reflect the new shape.
  4. Update `data-example/versions/baseline.json` to the new shape and bump its `schemaVersion`.
  5. Update `src/version-store.js`'s `EMPTY_RESUME` and `vite.config.js`'s `EMPTY_RESUME` to the new shape.

Loading a version file (dev middleware GET, the Vite HTML theme injection, IndexedDB reads) runs `needsMigration` + `migrate` automatically and writes the migrated form back to disk/IndexedDB so subsequent reads skip the work. The `saveVersion` path also normalizes input through `migrate` to catch edits that bypass the editor.

## Commit & Pull Request Guidelines

Follow the repository’s Conventional Commit style, e.g. `feat: publish reusable resume generator`. Keep each commit scoped to one change. PRs should explain the user-visible effect, note data/privacy implications, link related issues when available, and include before/after screenshots for UI or A4 layout changes. Confirm that no ignored personal `data/` content or generated exports are staged.

## Privacy & Documentation

Only `data-example/` may be published. Do not add real personal information, attachments, or credentials. Update `README.md` or other relevant documentation whenever a command, data workflow, or user-visible behavior changes.
