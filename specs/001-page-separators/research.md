# Research: Page Separators

## Decision: Use one desktop canvas for both preview states

**Decision**: Keep the existing 210 mm outer canvas and 14 mm horizontal margins as the shared desktop layout contract. The page-separator state changes only whether the rendered content is presented as discrete pages with gaps and page cues or as one continuous flow.

**Rationale**: The current continuous layout already limits the body to 210 mm, while each separated page is 210 mm wide with 14 mm padding. These dimensions yield the same 182 mm content width. Making that equality explicit prevents a toggle from changing line wrapping.

**Alternatives considered**:

- Make continuous preview fluid/full-width: rejected because it directly violates the requested stable width and would change line wrapping.
- Make separated pages adapt their width to the continuous layout: rejected because the existing A4 PDF contract requires true A4 page geometry.

## Decision: Rename the preview concept, retain A4 only for export

**Decision**: Rename all preview-facing identifiers and user-facing text from A4 preview to page separators. Use A4 terminology only in physical page and PDF export logic/documentation.

**Rationale**: The user defines the control as a visual page-separation setting. Keeping old preview names would continue to imply it changes width or export format. The repository guidance prefers removing obsolete paths instead of compatibility layers.

**Alternatives considered**:

- Rename only the Chinese toolbar label: rejected because code comments, help text, and internal state would still conflate two meanings.
- Keep old function names and add new aliases: rejected because this preserves an obsolete conceptual path without benefit.

## Decision: Keep PDF export independent of the preview preference

**Decision**: Before command-line PDF export, explicitly render separated pages, then generate A4 output. Browser preview preference remains a presentation setting.

**Rationale**: The export script already ensures page wrappers exist before emitting the PDF. Preserving that explicit step makes the export deterministic when the new preference defaults to continuous preview or is unavailable.

**Alternatives considered**:

- Export the currently visible preview state: rejected because a continuous preview could then weaken the A4 output contract.
- Add a second export preference: rejected because it adds unnecessary user state to a fixed product contract.

## Decision: Preserve responsive behavior at narrow widths

**Decision**: Keep the existing narrow-screen responsive layout: continuous preview may use its established narrow-screen padding, while separated pages scale as fixed pages. Validate that neither state clips horizontal content.

**Rationale**: The fixed-width requirement is explicitly for desktop previews, and existing mobile rules prioritize readable content within a small viewport.

**Alternatives considered**:

- Force 210 mm wide continuous content on narrow screens: rejected because it would require horizontal scrolling and violate the readability requirement.
- Remove narrow-screen behavior from one state: rejected because it creates a regression unrelated to page separators.
