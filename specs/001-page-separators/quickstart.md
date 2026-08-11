# Quickstart Validation: Page Separators

## Prerequisites

- Node.js version supported by `package.json`.
- Dependencies installed with `npm ci`.
- A local resume tree initialized with `npm run init` when `data/` does not already exist.
- Google Chrome available for the final PDF check.

## Run the Application

```bash
npm run dev
```

Open the local Vite URL. Use a multi-page sample resume so that separated preview can show more than one page.

## Validate Preview Semantics

1. At a desktop-width viewport, turn on `分隔线` and record the outer canvas width, horizontal margins, and a few line-wrap points.
2. Turn `分隔线` off. Confirm that page frames, gaps, and page cues disappear, while the canvas width, margins, content order, theme, spacing, and recorded line-wrap points remain unchanged.
3. Turn `分隔线` back on. Confirm that the same content is displayed in pages without an extra blank page or clipped long entry.
4. Repeat the label/help check in Chinese and English. The control must describe page separation; the PDF export option may still describe A4 pages.
5. At a narrow viewport, switch each state and confirm that the resume stays readable without clipped horizontal content.
6. Change the theme and one spacing setting in separated preview. Confirm that pages refresh and that switching back to continuous preview still returns to the fixed desktop canvas.

## Validate Exports

1. With separators hidden, use the application PDF export. Confirm the generated PDF uses A4 pages and contains all sections in order.
2. With separators shown, repeat the PDF export and compare that the same content is present in source order.
3. Export an image in either state. Confirm it is one continuous image without page gaps, then verify the preceding preview state is restored.

## Build and Repository Checks

```bash
npm run build
npm run pdf
git diff --check
git status --short
```

`npm run pdf` is required when Chrome is available. Inspect the PDF visually for A4 page dimensions, complete content, and stable page boundaries. Before commit, confirm that generated `dist/`, PDFs, `resume.html`, and any ignored personal `data/` content are not staged.
