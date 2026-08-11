# Implementation Plan: Prevent Toolbar Overlap

**Branch**: `main` (workflow feature identifier: `001-fix-toolbar-overlap`) | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-fix-toolbar-overlap/spec.md`

## Summary

Keep the page-separated resume preview clear of the fixed editor toolbar by synchronizing its top clearance to the toolbar's actual rendered height. Preserve the page-separation DOM, preference storage, resume data, print path, and image/PDF exports. Include a small visual buffer beneath the toolbar and eliminate any transition that briefly places the first page under it.

## Technical Context

**Language/Version**: JavaScript ES modules; Node.js `^20.19.0 || >=22.12.0`

**Primary Dependencies**: Vite, Lucide, CodeMirror, SortableJS, i18next; browser-native element-size observation

**Storage**: Existing browser local storage and IndexedDB; no schema change

**Testing**: No automated test suite; browser visual checks, `npm run build`, and `npm run pdf` when Chrome is available

**Target Platform**: Modern desktop and narrow-screen browsers; A4 print preview and PDF export on macOS Chrome

**Project Type**: Client-side Vite web application

**Performance Goals**: Publish current clearance on the next rendered frame after a toolbar height change; do not re-paginate solely for toolbar clearance

**Constraints**: Keep the toolbar fixed; retain the local-first boundary; do not alter A4 dimensions, the pagination algorithm, preference semantics, or export content

**Scale/Scope**: One toolbar, one separated-preview container, and two responsive toolbar breakpoints; no new data or external interfaces

## Constitution Check

*GATE: Passed before Phase 0 research. Re-checked after Phase 1 design: passed.*

- **Privacy-first publication**: Pass. No resume data is read, written, transmitted, or published.
- **Valid data and safe rendering**: Pass. Resume JSON, renderer output, import/export, and version behavior remain unchanged.
- **A4 output is a product contract**: Pass with mandatory runtime validation of separated preview, production build, and PDF when Chrome is available.
- **Small, direct client-side design**: Pass. Extend the existing toolbar-offset CSS-variable mechanism; add no dependency, service, compatibility layer, or paging rewrite.
- **Documentation and scoped change control**: Pass. Review README preview wording and update it if the behavior description needs clarification.

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-toolbar-overlap/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── preview-layout.md
└── tasks.md                 # Created by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── main.js                    # Renders active resume and applies separator mode
├── dev-panel.js               # Fixed toolbar lifecycle and clearance synchronization
├── dev-panel.css              # Toolbar layout and preview-clearance styles
├── page-separator-mode.js     # A4 page DOM construction and width scaling
├── style.css                  # Resume and separated-page canvas layout
└── resume-editor.{js,css}     # Optional JSON split editor and canvas placement

README.md                      # Preview/export behavior documentation
scripts/export-pdf.js          # Existing A4 export validation path
```

**Structure Decision**: Keep the fix in the existing toolbar module and stylesheet. The page-separation module remains responsible for A4 page construction and width scaling, not toolbar lifecycle.
