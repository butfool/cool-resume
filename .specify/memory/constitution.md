<!--
Sync Impact Report
- Version change: unversioned template -> 0.1.0
- Modified principles: none; all five initial principles were established.
- Added sections: Data and Privacy Constraints; Delivery Workflow.
- Removed sections: none.
- Follow-up TODOs: TODO(RATIFICATION_DATE): the original adoption date is not available
  in repository context and must be confirmed by the project owner.
-->
# Resume Generator Constitution

## Core Principles

### I. Privacy-First Publication
Only `data-example/` may contain publishable resume data. Real resumes, attachments,
credentials, and personal tooling MUST remain in ignored local storage and MUST NOT be
staged, embedded in build outputs, or included in review artifacts. This preserves the
project's safe public-demo boundary.

### II. Valid Data and Safe Rendering
Resume JSON MUST be valid, independently renderable, and treated entirely as plain text.
Rendering MUST NOT introduce raw HTML from resume data. Data-model or renderer changes
MUST preserve preview, import/export, and version-tree behavior for valid user data.

### III. A4 Output Is a Product Contract
Visual, layout, pagination, theme, or export changes MUST be checked in the running
application and against the production build. When Google Chrome is available, A4 PDF
export MUST also be validated. A successful build alone is not evidence of correct resume
layout or export output.

### IV. Small, Direct Client-Side Design
The application MUST remain a Vite-powered client-side generator unless a requirement
explicitly justifies a broader architecture. Prefer existing project dependencies and small,
focused ES modules over speculative abstractions, compatibility layers, or new services.
Browser-stored edits and settings MUST not be silently uploaded.

### V. Documentation and Scoped Change Control
Each code or behavior change MUST update the applicable README or documentation in the
same change. Commits MUST use Conventional Commit style, stay scoped to one purpose, and
exclude generated outputs and ignored personal data. Reviewers MUST verify the privacy
boundary and the relevant validation evidence before approval.

## Data and Privacy Constraints

- `data/` is local-only and ignored; `data-example/` is the anonymized, publishable source.
- `dist/`, `output/resume.html`, and generated PDFs are outputs, not source artifacts to commit.
- The static build MAY use browser IndexedDB or localStorage for visitor edits, versions, and
  typography settings; it MUST NOT transmit them to a server.
- New data fields, imports, and exports MUST retain valid JSON and the plain-text rendering
  boundary.

## Delivery Workflow

1. Inspect the affected modules, existing dependency capabilities, and relevant documentation
   before implementation.
2. Keep the implementation focused and modular; remove obsolete paths instead of retaining
   compatibility shims.
3. Run `npm run build` for every implementation change. For rendering, layout, or export
   work, inspect the development-server result and run `npm run pdf` when Chrome is available.
4. Review the diff and staged files to confirm no `data/`, personal material, credentials, or
   generated exports are included.
5. Record user-visible, privacy, and validation effects in the commit or pull-request summary.

## Governance

This constitution supersedes conflicting project practices for implementation, review, and
release decisions. Amendments MUST be proposed as a documented change to this file, explain
their impact on principles and workflows, and be reviewed before adoption.

Constitution versions follow semantic versioning: MAJOR for incompatible governance changes or
principle removals/redefinitions, MINOR for new principles or materially expanded governance,
and PATCH for clarifications and non-semantic corrections. Every implementation review MUST
check compliance with the five core principles, applicable documentation updates, privacy
constraints, and proportionate build or rendering validation.

**Version**: 0.1.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm original adoption date | **Last Amended**: 2026-08-11
