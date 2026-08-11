# Preview Layout Contract

## Inputs

| Input | Source | Required behavior |
|-------|--------|-------------------|
| Toolbar visibility | Existing toolbar control | A visible toolbar requires clearance; a hidden toolbar requires none. |
| Toolbar rendered height | Actual displayed toolbar | Any change updates shared clearance before the next settled preview frame. |
| Page-separator preference | Existing preview control | Changes page presentation only; does not reset toolbar visibility or clearance. |

## Outputs

| Surface | Contract |
|---------|----------|
| Continuous preview | Begins below visible toolbar using shared clearance. |
| Separated-page preview | First page and its first resume content are entirely below toolbar's visual footprint. |
| JSON split editor | Uses same toolbar clearance and does not cover toolbar controls. |
| Print and exports | Ignore toolbar layout and retain existing A4 or continuous-image behavior. |

## Invariants

- No resume text, page content, or first-page boundary is visibly covered by the shown toolbar.
- Toolbar size changes do not mutate resume content or page-separator preference.
- Page-separation algorithm remains independent of toolbar measurements.
