# Quickstart: Validate Toolbar Clearance

## Prerequisites

- Node.js version supported by `package.json`.
- Dependencies installed with `npm ci` if necessary.
- Google Chrome on macOS for optional PDF regression validation.

## Start the Application

```bash
npm run dev
```

Use sample resume data only in screenshots and review artifacts.

## Visual Validation

1. With toolbar visible, open Layout and enable `分隔线`.
   Expected: the first page and first resume content begin below the toolbar.
2. Resize to at most `840px` so toolbar controls wrap.
   Expected: first page follows the taller toolbar and remains clear.
3. Resize to at most `540px` and repeat.
   Expected: no overlap, truncated page boundary, or hidden resume text.
4. Toggle `分隔线` repeatedly. Hide and restore toolbar using its control or `Alt/Option + E`.
   Expected: clearance tracks visibility without changing resume content, theme, spacing, or preference.
5. Open JSON editor with separated preview active, then resize editor width.
   Expected: canvas, editor, and toolbar remain clear of each other.

## Build and Export Regression Checks

```bash
npm run build
npm run pdf
```

Expected: production build completes; PDF remains A4 and omits toolbar UI. Export a PNG or JPEG in the app and verify it remains a continuous long image without toolbar UI.

## Evidence to Record

- Screenshots at wide desktop, toolbar-wrapped, and compact-toolbar widths with separators enabled.
- Note that first-page edge and first resume content are visible in each screenshot.
- Build output and, when available, PDF/export result.
