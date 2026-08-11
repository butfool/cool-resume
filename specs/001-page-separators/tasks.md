---

description: "Actionable tasks for the page-separator preview feature"
---

# Tasks: Page Separators

**Input**: Design documents from `/specs/001-page-separators/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [page-separator UI contract](./contracts/page-separator-ui.md), [quickstart.md](./quickstart.md)

**Tests**: No automated test framework is present or requested. Each story has an explicit running-application validation task; final validation includes build and A4 PDF checks.

**Organization**: Tasks are grouped by user story so each outcome can be implemented and validated independently after the shared naming foundation is complete.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Record the exact migration boundary before changing the existing preview implementation.

- [X] T001 Review the current A4-preview references and preserve the export-only A4 boundary described in `specs/001-page-separators/research.md` before editing `src/a4-mode.js`, `src/style.css`, `src/dev-panel.js`, `src/main.js`, `src/image-export.js`, and `scripts/export-pdf.js`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Replace the obsolete A4-preview concept with one page-separator concept that all user stories share.

**⚠️ CRITICAL**: Complete this phase before beginning user-story work. Do not keep A4-preview compatibility aliases or read the old display-preference key.

- [X] T002 Rename `src/a4-mode.js` to `src/page-separator-mode.js`, rename its preview-only public API/state/storage terminology to page-separator equivalents, and retain A4 constants only where they define physical page geometry.
- [X] T003 Update imports and invocations from the renamed preview module in `src/main.js`, `src/dev-panel.js`, and `src/image-export.js` so all runtime consumers use the page-separator API.
- [X] T004 [P] Replace preview-only A4 mode/page class and CSS variable names with page-separator names in `src/style.css`, `src/dev-panel.css`, and `src/resume-editor.css`, while retaining A4 print geometry and `@page` rules.
- [X] T005 Update the page-wrapper selectors used by PDF generation in `scripts/export-pdf.js` to the renamed page-separator DOM contract without changing its A4 PDF options.

**Checkpoint**: All preview state, DOM, and stylesheet references have one name; A4 refers only to physical PDF/page geometry.

---

## Phase 3: User Story 1 - Keep a Consistent Resume Canvas (Priority: P1) 🎯 MVP

**Goal**: Authors can show or hide page boundaries without widening the desktop resume, changing horizontal margins, or reflowing unchanged text.

**Independent Test**: With a multi-page sample resume at desktop width, compare the separator-on and separator-off canvas width, horizontal margins, and several line-wrap points; then repeat the readability check at a narrow viewport.

- [X] T006 [US1] Implement the `showPageSeparators` local presentation preference and continuous/separated state transitions in `src/page-separator-mode.js`, defaulting unavailable or invalid preference data to continuous preview and preserving source-node order through state changes.
- [X] T007 [US1] Define shared desktop canvas dimensions and margins for continuous and separated previews in `src/style.css`, ensuring both produce a 210 mm outer width and 14 mm horizontal margins while preserving existing narrow-screen readability rules.
- [X] T008 [US1] Wire the renamed separator toggle to the page-separator preference and refresh lifecycle in `src/dev-panel.js` and `src/main.js`, including theme, spacing, resume-edit, and viewport-refresh behavior.
- [X] T009 [US1] Run the User Story 1 preview scenarios in `specs/001-page-separators/quickstart.md` against `src/page-separator-mode.js` and `src/style.css`: verify equal desktop wrapping, no full-width continuous preview, no blank trailing page, and no narrow-screen horizontal clipping.

**Checkpoint**: The continuous and separated preview states are independently usable and have identical desktop canvas geometry for unchanged content.

---

## Phase 4: User Story 2 - Understand the Display Control (Priority: P2)

**Goal**: Authors see a clear page-separation control, called `分隔线` in Chinese, rather than an ambiguous A4 mode control.

**Independent Test**: In each supported locale, inspect the toolbar's visible label and help, toggle the control, and verify the wording describes page boundaries rather than width or PDF paper size.

- [X] T010 [US2] Add page-separator label and help localization entries in `src/app-i18n.js`, using `分隔线` plus show/hide page-separation help in Chinese and `Page breaks` plus page-boundary help in English.
- [X] T011 [US2] Replace the old A4 translation keys, toggle selector, variable names, and control title usage in `src/dev-panel.js` with the page-separator UI contract from `specs/001-page-separators/contracts/page-separator-ui.md`.
- [X] T012 [US2] Validate the locale-specific control labels and help in the running toolbar per `specs/001-page-separators/quickstart.md`, confirming that only PDF export retains A4 wording.

**Checkpoint**: The control communicates a display-only separator choice in both supported locales.

---

## Phase 5: User Story 3 - Preserve A4 Export (Priority: P3)

**Goal**: A4 PDF export remains deterministic whether separators are currently shown or hidden, while image export remains continuous.

**Independent Test**: Export a multi-page resume from both preview states and verify ordered A4 PDF content; export an image from either state and verify it has no page gaps and restores the previous preview state.

- [X] T013 [P] [US3] Update continuous-image capture in `src/image-export.js` to use the page-separator API and restore the preceding separator preference after capture.
- [X] T014 [US3] Make `scripts/export-pdf.js` explicitly enable page separators through the renamed toolbar control before it waits for page wrappers and generates its A4 PDF.
- [X] T015 [US3] Verify the PDF and image export scenarios in `specs/001-page-separators/quickstart.md` using `scripts/export-pdf.js` and `src/image-export.js`, including a PDF export initiated with separators hidden.

**Checkpoint**: Preview state is independent of export format: PDF is A4 and image remains continuous.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Document the clarified behavior and complete the required implementation evidence.

- [X] T016 Update the preview and export behavior documentation in `README.md` to distinguish the fixed-width resume canvas, optional `分隔线` preview state, A4 PDF export, and continuous image export.
- [X] T017 Run the full validation checklist in `specs/001-page-separators/quickstart.md`: `npm run build`, running-app checks at desktop and narrow widths in both locales, `npm run pdf` when Chrome is available, `git diff --check`, and a privacy/staging review with `git status --short`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on T001 and blocks all story work because it establishes the only supported preview state and DOM terminology.
- **User Story 1 (Phase 3)**: Depends on T002-T004; it is the MVP and defines the stable canvas behavior.
- **User Story 2 (Phase 4)**: Depends on T002-T003; it can proceed independently of the P1 visual checks once the renamed control exists.
- **User Story 3 (Phase 5)**: Depends on T002-T005; it can proceed independently of P1 and P2 after the export selectors and API are renamed.
- **Polish (Phase 6)**: Depends on every desired user story being complete.

### User Story Dependencies

- **US1 (P1)**: Requires the renamed state/module and matching CSS selectors; no dependency on US2 wording or US3 export work.
- **US2 (P2)**: Requires the renamed control/API but does not depend on US1's geometry work.
- **US3 (P3)**: Requires the renamed API and page-wrapper contract but does not depend on US1 or US2.

### Dependency Graph

```text
T001
  └── T002 ──┬── T003 ──┬── T008 ── T009  (US1)
             │          └── T010 ── T011 ── T012  (US2)
             ├── T004 ──────── T007 ── T008  (US1)
             └── T005 ── T014 ── T015  (US3)
                         T013 ──────── T015  (US3)

US1 + US2 + US3 ── T016 ── T017
```

## Parallel Opportunities

- After T002 establishes the renamed module contract, T004 can proceed in parallel with the consumer-import work in T003 because they modify separate files.
- After the foundation completes, US1, US2, and US3 can be assigned to separate developers, subject to their listed prerequisites.
- Within US3, T013 and T014 modify separate files and can run in parallel after T002-T005.

## Parallel Example: User Story 3

```text
Task: "Update continuous-image capture in src/image-export.js"
Task: "Make scripts/export-pdf.js explicitly enable page separators before A4 export"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001-T005 to establish the renamed page-separator foundation.
2. Complete T006-T009 to deliver stable canvas geometry and verify it in the running application.
3. Stop and validate the P1 desktop/narrow preview behavior before adding labels or export follow-through.

### Incremental Delivery

1. Deliver US1: functional stable-width page-separator preview.
2. Deliver US2: unambiguous control wording in Chinese and English.
3. Deliver US3: deterministic A4 PDF plus continuous image behavior.
4. Complete documentation and the full validation checklist.

## Notes

- Every task follows the required checkbox, task ID, optional parallel marker, story label, and exact-path format.
- Do not add a migration or compatibility alias for obsolete A4-preview names; this feature deliberately replaces them.
- Do not stage ignored `data/`, generated `dist/`, `resume.html`, or exported PDF/image files.
