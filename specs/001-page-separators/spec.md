# Feature Specification: Page Separators

**Feature Branch**: `001-page-separators`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "A4 should only control whether page separators are shown. Turning it off must not make the HTML full width; rename A4 to separators."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keep a Consistent Resume Canvas (Priority: P1)

As a resume author, I can turn page separators off to review one continuous resume without the content becoming wider or reflowing differently.

**Why this priority**: Authors must be able to compare and edit the same resume layout without a mode switch changing its readable line length or visual hierarchy.

**Independent Test**: Open a multi-page resume, record the content canvas width and line wrapping, turn separators off, and confirm that the same content width, horizontal margins, and line wrapping remain.

**Acceptance Scenarios**:

1. **Given** a desktop-width resume preview with separators shown, **When** the author turns separators off, **Then** the preview becomes continuous while preserving the same fixed resume canvas width and horizontal content margins.
2. **Given** a resume line that wraps when separators are shown, **When** the author turns separators off, **Then** that line wraps at the same point unless the author changes the resume content or layout settings.
3. **Given** a narrow viewport, **When** the author turns separators on or off, **Then** the resume remains readable within the viewport and no horizontal content is lost.

---

### User Story 2 - Understand the Display Control (Priority: P2)

As a resume author, I see the display control named "分隔线" so that its purpose is clear: it shows or hides page separation in the preview.

**Why this priority**: The existing A4 name incorrectly suggests that the control changes the entire page size rather than only the visual separation of pages.

**Independent Test**: Inspect the control label and its accessible help in every supported interface language, then toggle it and confirm the visible result matches the wording.

**Acceptance Scenarios**:

1. **Given** the Chinese interface, **When** the editing toolbar is visible, **Then** the page-separation control is labeled "分隔线" and its help describes showing or hiding page separation.
2. **Given** any supported interface language, **When** the author reads the page-separation control, **Then** its label and help describe page separation rather than changing the resume width.

---

### User Story 3 - Preserve A4 Export (Priority: P3)

As a resume author, I can export an A4 PDF regardless of whether preview separators are currently shown.

**Why this priority**: The display preference should not weaken the document's printable A4 output.

**Independent Test**: Export the same multi-page resume once with separators shown and once hidden, then confirm that both exports use A4 pages and contain the same resume content in the same order.

**Acceptance Scenarios**:

1. **Given** separators are hidden in the preview, **When** the author exports a PDF, **Then** the exported document uses A4 pages.
2. **Given** separators are shown or hidden, **When** the author exports the unchanged resume, **Then** all sections and entries are present in the same order.

### Edge Cases

- A one-page resume shows no artificial blank page or trailing separator when separators are enabled.
- An unusually long entry that crosses a page boundary remains readable in both display states without clipping or horizontal overflow.
- Changing a theme or spacing setting while separators are enabled updates the page boundaries without changing the fixed canvas width used when they are disabled.
- A stored display preference that is unavailable or cannot be read falls back to a usable preview with the fixed resume canvas preserved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST use one fixed, paper-width resume canvas with the same horizontal content margins whether page separators are shown or hidden on desktop-width previews.
- **FR-002**: The system MUST make the page-separation control affect only the presence of page boundaries, page gaps, and page-level preview cues; it MUST NOT make the continuous preview use the available browser width.
- **FR-003**: The system MUST preserve content order, text, theme, layout settings, and line-wrapping width when the author switches between separated and continuous preview states.
- **FR-004**: The system MUST label the Chinese page-separation control as "分隔线" and describe it as a show/hide page-separation control.
- **FR-005**: The system MUST use equivalent page-separation wording for the control label and help in every supported interface language.
- **FR-006**: The system MUST keep A4 as the PDF export format independently of the page-separation display preference.
- **FR-007**: The system MUST keep the continuous image export as one uninterrupted image and must not add page separators to it.
- **FR-008**: The system MUST retain a usable, non-clipped preview at supported narrow viewport widths in both page-separation states.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In visual checks of at least three multi-page sample resumes, switching separators on and off leaves the desktop content canvas width and every unchanged line's wrap point identical in 100% of checked cases.
- **SC-002**: In 100% of checks, turning separators off removes page boundaries from the preview without expanding the resume to the browser's available width.
- **SC-003**: In every supported interface language, 100% of visible labels and help for this control describe page separation rather than a page-width mode.
- **SC-004**: For each checked sample resume, A4 PDF export succeeds with separators initially either shown or hidden and preserves all resume sections in source order.
- **SC-005**: At desktop and narrow viewport checks, 100% of checked previews remain readable with no clipped horizontal resume content after switching either state.

## Assumptions

- "分隔线" is the required Chinese product name for the display control; it describes preview page separation, not the A4 paper size used for PDF export.
- The existing resume canvas is the intended fixed desktop width and should remain the baseline in both display states.
- This feature changes preview semantics and user-facing wording only; it does not add new resume data, themes, or export formats.
- Existing A4 PDF and continuous-image export promises remain in scope as behavior that must not regress.
