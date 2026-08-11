# Implementation Plan: Page Separators

**Branch**: `001-page-separators` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-page-separators/spec.md`

## Summary

Make the preview switch a page-separation-only setting. Both continuous and separated desktop previews will use the same 210 mm canvas and 14 mm horizontal margins, so switching does not alter line wrapping. Rename preview-facing state, labels, help, DOM classes, and the module from A4 terminology to page-separator terminology; retain A4 only where it correctly describes PDF output. Keep the existing PDF export path explicitly separated from the user's preview choice, and update the README with the clarified behavior.

## Technical Context

**Language/Version**: JavaScript ES modules; Node.js `^20.19.0 || >=22.12.0`

**Primary Dependencies**: Vite 8, i18next, lucide, Sortable, html2canvas, Puppeteer Core

**Storage**: Browser localStorage for the page-separator display preference; existing local resume data and version storage are unchanged

**Testing**: No automated test runner exists. Validation is `npm run build`, running-app checks at desktop and narrow widths, and `npm run pdf` with Google Chrome when available.

**Target Platform**: Modern desktop and mobile web browsers; macOS Chrome is required for the repository PDF-export command

**Project Type**: Client-side web application with local development-only data routes

**Performance Goals**: Switching the separator state should complete in under one second for the checked sample resumes and must not visibly alter content order or wrapping beyond the existing page rendering work.

**Constraints**: Keep the 210 mm outer canvas and 14 mm horizontal margins equal in both desktop states; preserve valid plain-text resume rendering, A4 PDF export, and continuous image export; add no dependency, server endpoint, or resume JSON field.

**Scale/Scope**: One persisted presentation preference, two supported interface locales, existing multi-page resume preview and export flows

## Constitution Check

*GATE: Passed before Phase 0 research. Re-checked after Phase 1 design: passed.*

- **Privacy-first publication**: Pass. No resume data, attachments, or remote storage changes are required.
- **Valid data and safe rendering**: Pass. The change operates on already-rendered preview structure and display preference only; it does not modify resume JSON or raw-HTML handling.
- **A4 output contract**: Pass with mandatory runtime visual review, production build, and PDF export validation when Chrome is available. PDF remains A4 independent of the preview setting.
- **Small, direct client-side design**: Pass. Reuse the existing preview renderer, local preference, localization, and export mechanism; no new package or abstraction is needed.
- **Documentation and scoped change control**: Pass. The implementation includes README terminology/behavior updates, a focused Conventional Commit, privacy check, and review of generated artifacts.

## Project Structure

### Documentation (this feature)

```text
specs/001-page-separators/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── page-separator-ui.md
└── tasks.md                 # Created later by speckit-tasks
```

### Source Code (repository root)

```text
src/
├── page-separator-mode.js   # Renamed preview state and page rendering module
├── main.js                  # Applies the stored display preference after render
├── dev-panel.js             # Toolbar control and display-state event wiring
├── app-i18n.js              # Chinese and English labels/help
├── image-export.js          # Temporarily uses continuous preview for image capture
├── style.css                # Shared canvas, separated preview, print rules, responsive layout
├── dev-panel.css            # Toolbar offset rules for both display states
└── resume-editor.css        # Split-editor rules for both display states
scripts/
└── export-pdf.js            # Explicitly enables page separation before A4 export
README.md                    # Documents preview and export semantics
```

**Structure Decision**: Keep the existing single client-side project. Rename the current A4 preview module and its preview-only identifiers to page-separator terminology rather than maintaining aliases. Keep A4 terms only for physical PDF page/export rules.

## Implementation Outline

1. Rename the preview module and all preview-only imports, function names, DOM classes, CSS variables, and local preference key from A4 naming to page-separator naming. Do not retain deprecated aliases or read the old preference key.
2. Define the continuous and separated preview layouts from one outer canvas contract: 210 mm outer width and 14 mm horizontal margins on desktop. Ensure the continuous body layout and each separated page derive the same content width.
3. Make the renamed toolbar control operate only on `showPageSeparators`; update Chinese text to `分隔线` and English text to equivalent page-separation wording. Keep the control's help restricted to showing and hiding page boundaries.
4. Preserve the current re-render behavior for theme, spacing, resume edits, and viewport changes. When separators are hidden, restore continuous rendered nodes without modifying their canvas width or content order.
5. Keep image export continuous. Make the PDF export command explicitly enable separated pages before generating A4 output, so the document contract does not depend on the preview preference.
6. Update README documentation to distinguish the fixed preview canvas, optional preview separators, A4 PDF output, and continuous image export.
7. Validate the behavior using the scenarios in [quickstart.md](./quickstart.md), including desktop width, narrow width, both locales, build, and PDF export where Chrome is available.

## Complexity Tracking

No constitution violations or complexity exceptions require justification.
