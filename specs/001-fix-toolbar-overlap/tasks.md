---

description: "Actionable task list for preventing editor-toolbar overlap in separated preview"
---

# Tasks: Prevent Toolbar Overlap

**Input**: Design documents from `specs/001-fix-toolbar-overlap/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/preview-layout.md`, `quickstart.md`

**Tests**: No automated test tasks. The feature specifies visual and export regression validation, and the repository has no automated test infrastructure. Execute the documented browser, build, and PDF checks in the final phase.

**Organization**: Tasks are grouped by user story so that the P1 correction can be delivered and checked before responsive lifecycle coverage is added.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches a different file and does not depend on incomplete work.
- **[Story]**: Maps a task to the user story in `spec.md`.
- Every task includes its exact target path.

## Phase 1: Setup (Shared Understanding)

**Purpose**: Establish the baseline and preserve the agreed layout boundary before changing source.

- [X] T001 Review the confirmed runtime measurements, visual-clearance decision, and acceptance contract in `specs/001-fix-toolbar-overlap/research.md` and `specs/001-fix-toolbar-overlap/contracts/preview-layout.md` before modifying source files.

---

## Phase 2: Foundational

**Purpose**: No new shared infrastructure is required. The existing `--resume-editor-toolbar-offset` value is the shared layout boundary and is extended within User Story 1.

**Checkpoint**: Existing page construction, local preference storage, and export paths remain out of scope; user story work may begin.

---

## Phase 3: User Story 1 - View Separated Resume Without Obstruction (Priority: P1) MVP

**Goal**: Enabling page separators with a visible editor toolbar never leaves the first separated page or first resume content behind the toolbar.

**Independent Test**: With the toolbar visible, enable `分隔线` at a wide desktop viewport and verify the first page and its first resume content are entirely visible below the toolbar.

### Implementation for User Story 1

- [X] T002 [US1] Refactor the toolbar-offset update path in `src/dev-panel.js` so initialization, toolbar visibility changes, and layout-drawer interactions publish the current rendered toolbar height through the existing shared offset value on a coalesced rendered frame.
- [X] T003 [P] [US1] Update separated-preview clearance and its transition behavior in `src/dev-panel.css` so `#app` reserves the shared toolbar offset plus a deliberate visual buffer without animating through an obstructed intermediate position.

**Checkpoint**: User Story 1 is independently complete when a wide separated preview has no toolbar overlap and switching separators preserves current resume data and layout choices.

---

## Phase 4: User Story 2 - Keep the Preview Clear After Layout Changes (Priority: P2)

**Goal**: The correction remains accurate when responsive layout, browser zoom, toolbar visibility, or control wrapping changes the toolbar's displayed height.

**Independent Test**: With separated preview open, change viewport width across the `840px` and `540px` toolbar breakpoints, hide/restore the toolbar, and confirm the first page is never obscured after each layout settles.

### Implementation for User Story 2

- [X] T004 [US2] Add toolbar rendered-size observation and lifecycle cleanup in `src/dev-panel.js`, routing each actual height change through the User Story 1 offset updater and disconnecting the observer when the panel is destroyed.

**Checkpoint**: User Stories 1 and 2 are complete when the first page follows the toolbar after responsive wrapping, repeated separator toggles, and toolbar hide/restore without changing the stored page-separator preference.

---

## Phase 5: Polish and Cross-Cutting Validation

**Purpose**: Document the user-visible behavior and prove the preview-only correction does not regress export, A4 layout, or privacy boundaries.

- [X] T005 Update preview behavior documentation in `README.md` to remain accurate about page separators and toolbar clearance.
- [X] T006 Run every visual interaction in `specs/001-fix-toolbar-overlap/quickstart.md` and capture sample-data screenshots at wide desktop, toolbar-wrapped, and compact-toolbar widths.
- [X] T007 Run `npm run build` from `package.json` and inspect the generated sample resume to confirm the production build succeeds without toolbar UI in resume output.
- [ ] T008 Run `npm run pdf` through `scripts/export-pdf.js` when Google Chrome is available; verify the A4 PDF and an in-app image export retain their current toolbar-free output behavior.
- [X] T009 Run `git diff --check` and inspect `git status` against `AGENTS.md` to confirm only intended source/documentation/spec files are included and no local `data/`, generated exports, or personal material is staged.

**Validation note for T008**: PDF export was generated and visually inspected. The in-app image-download check remains pending because Browser policy denied loading the public `output/resume.html` test target; no alternate browser-control path was used.

---

## Dependencies and Execution Order

```text
T001
  ├── T002 ──┐
  └── T003 ──┴── T004 ── T005 ── T006 ── T007 ── T008 ── T009
```

- **User Story 1 (P1)**: T002 and T003 implement the smallest shippable correction. T003 can proceed in parallel with T002 because it consumes the pre-existing offset value in a different file.
- **User Story 2 (P2)**: T004 depends on T002 because it routes responsive size changes through the shared update path. It has no data or export dependency.
- **Polish**: T005 follows settled behavior. T006 validates both stories. T007 and T008 run after implementation; T009 is the final scope/privacy check.

## Parallel Opportunities

### User Story 1

```text
Task: "Refactor toolbar-offset update behavior in src/dev-panel.js"        # T002
Task: "Update separated-preview clearance in src/dev-panel.css"            # T003
```

No other implementation tasks are parallel-safe: T004 changes the same toolbar lifecycle after T002, while documentation and validation must describe and verify the final behavior.

## Implementation Strategy

### MVP First

1. Complete T001-T003.
2. Enable separators at a wide desktop viewport and complete the User Story 1 independent test.
3. Stop if the first page is not fully visible; do not proceed to responsive lifecycle work until the baseline correction holds.

### Incremental Delivery

1. Add T004 and repeat the User Story 2 independent test across responsive breakpoints and visibility changes.
2. Complete T005-T009 to document and validate the finished behavior, including build and A4/export regression checks.
