# Feature Specification: Prevent Toolbar Overlap

**Feature Branch**: `main`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "When page separators are enabled, the top editing toolbar covers resume content. The issue does not occur when separators are disabled."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Separated Resume Without Obstruction (Priority: P1)

As a resume editor, I can enable page separators and inspect the beginning of the first resume page without the fixed editing toolbar obscuring any resume text or visual content.

**Why this priority**: Page-separated preview is intended to show the printable page layout. Obscuring the start of the resume prevents users from reviewing content and makes the preview misleading.

**Independent Test**: Open a resume with the editing toolbar visible, enable page separators, and visually verify that the full top of the first page and its first resume content are visible below the toolbar.

**Acceptance Scenarios**:

1. **Given** the editing toolbar is visible and page separators are disabled, **When** the user enables page separators, **Then** the first page is repositioned so that no part of its resume content is behind the toolbar.
2. **Given** page separators and the editing toolbar are visible, **When** the user scrolls to the top of the preview, **Then** the first visible resume content remains fully readable and is not clipped or covered by the toolbar.

---

### User Story 2 - Keep the Preview Clear After Layout Changes (Priority: P2)

As a resume editor, I can change the available screen width while viewing separated pages and continue to see an unobstructed first page.

**Why this priority**: The toolbar may occupy different heights when its controls wrap, so the correction must remain valid beyond the initial desktop layout.

**Independent Test**: With page separators and the toolbar visible, resize the viewport across supported desktop and narrow layouts, then verify the top of the first page remains clear of the toolbar after each layout settles.

**Acceptance Scenarios**:

1. **Given** separated-page preview is open, **When** the viewport changes width and the toolbar height changes, **Then** the preview updates its top clearance to keep the first page content unobstructed.
2. **Given** separated-page preview is open, **When** the toolbar is hidden and later restored, **Then** the first page adjusts so that it is unobstructed when the toolbar is restored and does not retain unnecessary toolbar clearance while hidden.

### Edge Cases

- The toolbar controls wrap onto additional rows at narrow viewport widths.
- The user toggles page separators repeatedly while the toolbar is visible.
- The user changes browser zoom or resizes the window after page separators have been enabled.
- A resume begins with content close to the top page margin, making even a small overlap noticeable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When both the editing toolbar and page separators are visible, the system MUST reserve enough vertical preview space for the toolbar's current displayed height before the first separated page begins.
- **FR-002**: The system MUST ensure that no visible resume content on the first separated page is covered, clipped, or made unreadable by the editing toolbar.
- **FR-003**: The system MUST recalculate the required preview clearance whenever page separators are enabled, the toolbar visibility changes, or the viewport layout changes the toolbar's displayed height.
- **FR-004**: Enabling or disabling page separators MUST preserve the user's existing resume content, selected theme, spacing choices, and page-separator preference behavior.
- **FR-005**: The separated-page preview MUST retain its existing page boundaries, page spacing, and page-number cues apart from the vertical positioning needed to avoid toolbar overlap.
- **FR-006**: The uninterrupted preview, print output, and exported resume content MUST remain unaffected by the separated-preview positioning change.
- **FR-007**: User-facing documentation for the preview behavior MUST remain accurate after the change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of visual checks at supported desktop and narrow viewport layouts, the first visible resume text and graphics in separated-page preview are fully visible below the editing toolbar.
- **SC-002**: In 100% of checks after toggling page separators, hiding or restoring the toolbar, and resizing the viewport, the preview reaches an unobstructed layout within one second of the action completing.
- **SC-003**: In 100% of regression checks, switching between uninterrupted and separated previews preserves the same resume content, theme, and spacing selections.
- **SC-004**: In 100% of print and export regression checks, the generated resume content and page structure match the behavior before this preview-only correction.

## Assumptions

- The fixed editing toolbar remains available while users inspect separated pages; removing or making the toolbar non-fixed is outside this feature's scope.
- The correction applies to all supported viewport widths, including layouts where toolbar controls wrap to multiple rows.
- This feature changes preview positioning only. It does not change resume data, page dimensions, print behavior, or export formats.
- Existing page-separator preference storage remains the source of truth for whether the separated preview is shown.
