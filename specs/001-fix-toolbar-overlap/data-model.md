# Data Model: Prevent Toolbar Overlap

## Persistent Entities

No persistent data entities change. The existing page-separator preference, resume content, themes, spacing settings, version history, exports, and local-storage keys retain their formats and semantics.

## Transient View State

| State | Owner | Purpose | Validation |
|-------|-------|---------|------------|
| Toolbar rendered height | Editor toolbar | Determines current vertical exclusion area | Matches displayed height after responsive layout, visibility, and control changes. |
| Preview top clearance | Shared application layout setting | Positions continuous and separated previews below toolbar | Is zero while hidden and sufficient to keep first page clear while shown. |
| Page-separator preference | Existing preference storage | Controls separated preview display | Does not change as a side effect of clearance synchronization. |

## State Transitions

1. Toolbar is attached or becomes visible: measure its rendered height and publish clearance.
2. Toolbar height changes: refresh clearance on the next rendered frame.
3. Toolbar is hidden: clear clearance; restore it when toolbar returns.
4. Page separators change: retain current clearance while preserving existing preference and preview content.
