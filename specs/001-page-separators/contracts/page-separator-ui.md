# Page Separator UI Contract

## Purpose

Define the observable browser behavior for the page-separator display control. This is an application UI contract, not a network API.

## Control

| Property | Contract |
| --- | --- |
| Chinese label | `分隔线` |
| Chinese help | States that the control shows or hides preview page separation. It must not describe a width mode. |
| English label | `Page breaks` |
| English help | States that the control shows or hides preview page boundaries. It must not describe a width mode. |
| Value | A boolean `showPageSeparators` display preference. |
| Default | Off, showing a continuous fixed-width preview. |

## State Behavior

| `showPageSeparators` | Preview result | Canvas contract |
| --- | --- | --- |
| `false` | One continuous resume; no page gaps, paper frames, or page number cues | Desktop outer width is 210 mm with 14 mm horizontal margins. |
| `true` | Resume content displayed in discrete A4 page frames with page gaps and page number cues | Every page outer width is 210 mm with 14 mm horizontal margins. |

In both states, unchanged content must preserve ordering, theme, spacing values, and desktop line-wrap points.

## Export Behavior

| Export type | Required result | Relationship to the control |
| --- | --- | --- |
| PDF | A4 pages containing all resume content in order | Always prepares separated pages before export; does not overwrite the stored control value. |
| Image | One continuous image | Captures continuous content; does not include page boundaries and restores the preceding control state. |

## Non-Goals

- The control does not select PDF paper size.
- The control does not alter resume JSON, theme, spacing values, version data, or image-export format.
- The control does not introduce a server interface or synchronization behavior.
