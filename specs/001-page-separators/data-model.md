# Data Model: Page Separators

## Existing Resume Data

This feature does not add, remove, or change any resume JSON field. Resume content, themes, spacing settings, version data, and image-export options remain their current models.

## Page Separator Preference

| Field | Type | Meaning | Validation |
| --- | --- | --- | --- |
| `showPageSeparators` | Boolean | Whether the browser preview renders discrete page boundaries and page-level cues | `true` or `false`; an unavailable or invalid stored value uses the continuous-preview default |

**Persistence**: A browser-local presentation preference. It must never be included in published resume data or sent to a server.

**Default**: `false`, which renders the fixed-width continuous preview without page boundaries.

## State Transitions

| Current state | User action or system event | Resulting state | Required outcome |
| --- | --- | --- | --- |
| Continuous | Turn on `分隔线` | Separated | Content is repackaged into discrete pages; outer canvas and content width remain equal to continuous desktop preview. |
| Separated | Turn off `分隔线` | Continuous | Original content returns as one flow with the same desktop width, margins, ordering, and wrapping. |
| Either state | Resume, theme, or spacing changes | Same state | Content refreshes; separated state recalculates boundaries and continuous state retains its canvas. |
| Either state | Image export | Restored state | A continuous image is captured; the prior preview state is restored afterwards. |
| Either state | PDF export | Restored display preference | A4 separated pages are generated for export without changing the saved preview preference. |

## Relationships

- The page-separator preference controls preview presentation only.
- Resume JSON is the source of content for both preview states and both export formats.
- A4 PDF output is an export contract, not an alternate value of the page-separator preference.
