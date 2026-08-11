# Research: Prevent Toolbar Overlap

## Decision 1: Synchronize clearance from the toolbar's rendered size

**Decision**: Observe the fixed editor toolbar's actual rendered size and refresh the existing toolbar-offset value after a size change.

**Rationale**: A fixed toolbar is outside normal document flow and cannot reserve layout space itself. The current offset is read only during initialization, visibility changes, and drawer interactions. Runtime reproduction showed it remained `55px` after a viewport change although the responsive toolbar grew to `127px`; the first separated page was therefore covered by `72px`.

**Alternatives considered**:

- Refresh only on window resize: less direct, and toolbar content or style changes can alter its height without a resize.
- Use breakpoint-specific fixed offsets: duplicates responsive layout knowledge and fails for zoom, localization, and future controls.
- Make the toolbar part of normal flow: changes the established fixed-toolbar interaction and exceeds scope.

**Sources**:

- [MDN: CSS position](https://developer.mozilla.org/en-US/docs/Web/CSS/position) confirms that fixed-position elements are removed from normal document flow.
- [MDN: ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) documents observation of an element's content or border-box dimensions.

## Decision 2: Retain the existing CSS-variable ownership boundary

**Decision**: Continue using the existing toolbar-offset variable as the single clearance value for continuous preview, separated preview, and the optional JSON editor.

**Rationale**: The application already centralizes toolbar height in this value. Correct lifecycle updates fix all consumers without changing data, A4 layout, or separator DOM.

**Alternatives considered**:

- Add a page-separator-specific offset API: duplicate state can diverge.
- Pass toolbar height into pagination logic: couples an overlay concern to row distribution without improving correctness.

## Decision 3: Include visual clearance and transition behavior

**Decision**: Reserve a small visual buffer below the toolbar and prevent separated preview from animating through an obstructed intermediate position.

**Rationale**: The toolbar shadow extends below its layout box, while the current 220ms top-padding transition can temporarily expose the first page beneath the toolbar. The acceptance criterion is no visible obstruction, not only a correct final computed value.

**Alternatives considered**:

- Reserve only layout height: may leave content visually under the shadow.
- Retain the transition: preserves a known short-lived overlap.

## Decision 4: Preserve page construction and export paths

**Decision**: Do not change row splitting, page distribution, print styling, PDF export, image export, or preference storage.

**Rationale**: The defect is preview placement after pages are constructed. Changing export or pagination would add unrelated regression risk.
