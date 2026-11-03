> Current status - 03 November 2026: Phases 1 through 4H are complete and approved, including Phase 4G shared dropdowns and Phase 4H Pay Checks. Phase 4I Dashboard is deferred. Earlier OPEN/pending statements below are historical; the final approval registry supersedes them.

# PayStream UI Rollout — Codex Prompt Playbook

Copy-paste prompts for implementing PayStream Design System v1.1 with Codex, one phase at a time. Keep this file at `docs/design-system/CODEX_PROMPTS.md`.

---

## Step 0 — One-time setup (you do this, not Codex)

1. Put the package in the repo:

| File | Location |
|---|---|
| `PAYSTREAM_DESIGN_SYSTEM.md` | `docs/design-system/` |
| `CODEX_PROMPTS.md` (this file) | `docs/design-system/` |
| `_tokens.scss` | `src/styles/` |
| `_ps-components.scss` | `src/styles/` |

2. Add this block to `AGENTS.md` at the repo root (create it if missing). Codex reads it on every task:

```markdown
## PayStream UI rules (mandatory)
- For any UI work, follow docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md. It is the single source of truth.
- UI/UX only. Never change business logic, payroll or TDS calculations, services, APIs, routes, models,
  database schemas, form validators, stored values, or workflows.
- Keep every existing event handler, form control, route link and menu action wired exactly as it is.
- Use design tokens (var(--token)) only. No hard-coded colours, font sizes, radii or spacing.
- Do not change or add fonts. Do not add icon libraries other than lucide-angular.
- Money: display through the psInr pipe only (₹, Indian grouping). Never alter the underlying value.
- Never restyle a shared component for one screen. If a standard does not fit, stop and report.
- After each task, report: files changed, deviations from the design system, and why.
```

3. Commit this on `main` before starting.

---

## The loop for every phase

| Step | Who | Action |
|---|---|---|
| 1 | You | Create a branch, e.g. `ui/phase-1-tokens` |
| 2 | You | Paste the phase prompt into Codex |
| 3 | Codex | Implements and reports |
| 4 | You | Paste the **Review prompt** (bottom of this file) |
| 5 | You | Check the **Reject-the-PR** list; run the app and tests |
| 6 | You | Merge, then start the next phase |

Never run two phases in one task. Small PRs are easy to review and easy to roll back.

---

## Phase 0 — Discovery (read-only)

```text
Read docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md fully.

This task is READ-ONLY. Do not modify, create or delete any file.

Inspect the Angular project and report:
1. Angular version, and whether Angular Material / CDK or any other UI library is used (name + version).
2. The font family actually in use: check styles.scss, global styles, angular.json styles array,
   index.html font links, and component styles. Quote the exact font-family declarations and file paths.
3. Global style files and their import order.
4. Icon libraries/fonts in use and where.
5. Every place money is displayed or entered (pipe used, locale, file paths), grouped by module:
   Employee Details, Salary Components, Income Tax/TDS, Run Payroll, Pay Checks, reports, others.
6. Every place dates are displayed (pipe, format, locale).
7. Every place a status is displayed, with the status values used.
8. List of all routed screens/modules with their component file paths.
9. Hard-coded colours: count per file, top 20 files.
10. Existing shared UI components (buttons, cards, tables, dialogs) and where they live.

Output a structured report with tables. Change nothing.
```

> **Send the Phase 0 report back to Claude** in the PayStream project. It settles DS-001 (font) and the design system gets updated before Phase 1.

---

## Phase 1 — Tokens and global styles

The user-approved Phase 1 clarification in `PAYSTREAM_DESIGN_SYSTEM.md` supersedes the original direct-import instructions. Definitions only; preserve existing rendering.

```text
Follow docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md, Phase 1 only.

1. Current canonical source: src/styles/paystream-tokens.css; _tokens.scss is a Sass facade.
   No duplicate values or tokens.json.
2. Preserve --font-sans: Inter, 'Segoe UI', Arial, sans-serif (declared stack;
   do not claim the resolved browser font is verified without evidence).
3. Emit only :root custom-property definitions. Represent reference typography classes as tokens.
4. src/styles.css imports canonical token CSS first; src/styles.scss @uses './styles.css' only.
   Keep one value source and one root block; support both CSS and SCSS entry configurations.
5. Do NOT import _ps-components.scss, its body rule, or any new reset/component selectors.
6. Do NOT apply tokens to screens or change HTML, TypeScript, component styles, tests,
   status/filter logic, dates, PDFs, workflows, APIs or calculations.
7. Keep Active/Terminated/All employee terminology; document unapproved status tones
   using the neutral foundation without implementing a runtime map.
8. Run the production build and existing tests; verify the emitted existing CSS is unchanged
   apart from added root definitions. Report actual browser verification and its limits.

Report: files created/modified, font discovery, token inventory, functional preservation,
validation results, preserved existing changes, deferred decisions, and completion status.
Do not stage, commit, push, or start another phase.
```

---
## Phase 2a — Display pipes and directive

```text
Follow docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md, Phase 2 — pipes only.
Read Part A §3 (Pipes) carefully.

Create in src/app/shared/ui/pipes/ (standalone if the app uses standalone components, otherwise
add to a SharedUiModule):

1. psInr pipe — INR, Indian digit grouping, display only:
   - registerLocaleData(localeEnIn)
   - nonzero whole rupees → '1.0-0'; zero and fractional values → '1.2-2'
   - examples that MUST pass as unit tests:
     1000000 → ₹10,00,000 | 75000 → ₹75,000 | 125500.5 → ₹1,25,500.50
     0 → ₹0.00 | 0.5 → ₹0.50 | -4500 → −₹4,500 | null/undefined → —
   - finite numbers only; display rounding does not change source precision.
2. psInrInput directive — opt-in text-input numeric value accessor, formatted on blur and raw on focus.
   Preserve represented model precision, validators, composition, cursor and form update semantics.
   Do not migrate native number inputs in this phase. Document invalid/empty handling and limits.
3. psDate pipe — 'dd MMM yyyy' with three-letter months using the en-US locale
   (en-IN gives "Sept"). Test: 2026-09-15 → 15 Sep 2026.
   Calendar dates must not shift; month-only periods display MMM yyyy. Timestamp handling honours
   explicit/default/local timezone behaviour. Test calendar boundaries, invalid dates and offsets.

Do NOT replace any existing pipe usage in templates yet. Do not touch services or models.
Update the design reference and Phase 2a report with contracts, reuse, precision, timezone handling
and limitations. Run new/all unit tests and the production build; review protected files and styles.
Do not stage, commit, push, or begin Phase 2b. Report files created/modified and validation results.
```

## Phase 2b — Shared UI components

```text
Follow docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md, Phase 2 — components.
Use Part C (Component specifications) and _ps-components.scss as the exact reference.

Create in src/app/shared/ui/ (match the app's standalone/module style):
- psButton attribute directive on native <button>: variant = primary | secondary | ghost | danger
- ps-icon-button: inputs icon, label (→ aria-label + tooltip), size = sm | md
- ps-card: slots [cardTitle], [cardSubtitle], [cardActions], body, [cardFooter]
- ps-page-header: inputs eyebrow, title, subtitle; slot [pageActions]
- ps-form-field: wraps an existing reactive form control; label, required mark, info icon,
  helper text, and error text read from the control's existing validation state.
  It must NOT add, remove or change validators.
- ps-status-badge: input status; owns the single status → tone map from Part C StatusBadge.
  Unknown statuses render neutral with the raw label.
- Choice controls styling: .ps-check, .ps-radio, .ps-toggle (or Material overrides if Material is used —
  see Part A §4).
- Tooltip: use the existing tooltip mechanism (e.g. matTooltip) styled per spec, or a small directive.

Use ONLY the Action → icon map (Part B). Phase 2b compatibility decision: the user approved
vendored Lucide glyph data plus license because lucide-angular@1.0.0 does not declare Angular 22
support. Use the central PsIcon renderer; do not force incompatible peers or add another library.

Phase 2b also establishes the DataTable and SidebarNav presentation wrappers, without routing,
pagination, sorting, filtering, selection, permission or menu logic. Project caller-owned controls
and content. Follow docs/design-system/PayStream-Component-Library.md for the implemented APIs.

Every value via var(--token). Add a Storybook-style demo route ONLY if one already exists;
otherwise add unit tests for inputs/outputs.
Do NOT use these components in any screen yet.
Report: files created, how Material (if present) was themed, deviations.
```

---

## Phase 3 — Employees screen (pilot)

**Status: visually approved by the user on 01 Nov 2026 after remediation.** Preserve the corrected Employees implementation as the reference baseline; do not rerun this phase or change the screen unless a genuine defect is identified. All subsequent modules must follow its shared design/component/interaction standards under the design-system source of truth, without changing business functionality. Employee Details (Phase 4A) was subsequently visually approved and closed on 02 November 2026. User Management (Phase 4B) was subsequently explicitly visually approved and closed by the Product Owner on 02 November 2026. Organization Settings (Phase 4C) was subsequently explicitly visually approved and closed by the Product Owner on 02 November 2026. Salary Components (Phase 4D) was subsequently explicitly visually approved and closed by the Product Owner on 02 November 2026. All seven approved screens are protected visual references; Phase 4H requires separate explicit instructions.

```text
Follow docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md, Phase 3.
Apply Part D (Employees screen spec → Target spec) to the Employees list screen only.

Changes allowed (presentation only):
- Page header via ps-page-header. Buttons: Generate Payroll (secondary), Run Payroll (secondary),
  Add Employee (primary, plus icon, rightmost). Keep their existing (click) handlers and routes.
- Card via ps-card; "Refresh List" secondary button with rotate-cw icon, same handler.
- Toolbar: status filter (inline label, EX-002) left, search right (320px). Same bindings.
- Table: apply .ps-table classes; 56px rows; Actions column LAST and right-aligned;
  kebab as ps-icon-button size sm with label "More actions". Keep the existing menu items and handlers.
- Annual CTC via psInr; all dates via psDate; Status via ps-status-badge.
- Pagination footer only if pagination already exists in the component/API; if not, REPORT it,
  do not add new pagination logic.
- The initial pilot deferred shared-shell corrections. The remediation request explicitly authorizes
  its sidebar/top-header visual corrections (DS-012); routes, permissions, bindings and other module
  implementations remain unchanged. Phase 3 visual approval was received on 01 Nov 2026.

Preserve the actual menu actions/order and existing empty-state Add Employee action. No new View,
Clear filters, sorting, selection or pagination workflow. Native CDK triggers use button[psIconButton].
Use shared FormField inline/hidden-label layouts and prefix/suffix projection; never override shared
component appearance in the screen stylesheet. Compare against Part D if the user authorizes it
in place of an inaccessible artifact; report the visual-reference limitation explicitly.

Forbidden: changes to services, API calls, filter/search logic, data mapping, routes, tests' business
expectations.

Report: files changed, a before/after description, and the completed Consistency checklist (Part E)
for this screen with Pass/Fail per row.
```

---

## Phase 4 — Roll out one module at a time

**Phase 4A - Employee Details: VISUALLY APPROVED AND CLOSED on 02 November 2026.** The user reviewed the completion report and validation results and explicitly approved the screen. See `PHASE_4A_REPORT.md` for implementation, tests and visual evidence. Do not rerun or redesign Phase 4A.

**Phase 4B - User Management: Visually Approved and Closed on 02 November 2026.** Approval was explicitly granted by the Product Owner for visual implementation, responsive implementation and design-system consistency. See `PHASE_4B_REPORT.md`; do not rerun or redesign this phase.

**Phase 4C - Organization Settings: Visually Approved and Closed on 02 November 2026.** Explicit Product Owner approval covers visual implementation, responsive implementation and design-system consistency. See `PHASE_4C_REPORT.md`; retain its technical findings and evidence. Do not rerun or redesign this phase.

**Phase 4D - Salary Components: Visually Approved and Closed on 02 November 2026.** Explicit Product Owner approval covers visual implementation, responsive implementation and design-system consistency. See `PHASE_4D_REPORT.md`; retain its calculation comparisons, all technical findings, the five documented backend test failures, the unrelated legacy browser-test limitation and screenshots. Do not rerun or redesign this phase.

For every subsequent module, preserve Employees (Phase 3, approved 01 November 2026), Employee Details (Phase 4A), User Management (Phase 4B), Organization Settings (Phase 4C) Salary Components (Phase 4D) and Income Tax / TDS Configuration (Phase 4E) as protected visual reference standards under `PAYSTREAM_DESIGN_SYSTEM.md`, the single source of truth. Change any approved screen only if explicitly requested by the Product Owner or a genuine defect is identified. Preserve page headers, typography, colors/tokens, buttons/icon buttons, cards/tables, form fields, status badges, tooltips, spacing/alignment, responsive behavior, navigation and interaction conventions. The same action must use the same icon, size, color, tooltip, placement and interaction convention. Reuse shared components and established typography, spacing, cards, forms, tables and responsive behavior; do not introduce an independent visual style. Preserve existing functionality, calculations, APIs, validations, employee records, payroll data, TDS history and PDFs.

**Wait for separate explicit user instructions before Phase 4H.** Phase 4D approval does not authorize another module, functionality/security changes or any staging, commit or push. The template below applies only after explicit authorization.

Repeat per module, in this order: Employee Details → Salary Components → Income Tax/TDS → Run Payroll → Pay Checks → Reports → Settings → User Management.

```text
Follow docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md, Phase 4, module: <MODULE NAME>.

Apply the design system to every screen, dialog, form and table in <MODULE NAME> using ONLY the
shared components from src/app/shared/ui and the tokens. Match the approved Employees, Employee Details, User Management, Organization Settings, Salary Components and Income Tax / TDS Configuration screens as the protected references.

Rules:
- Same action → same icon, size, color, tooltip, placement and interaction convention as the approved Action → icon map and shared components.
- One primary button per view, rightmost. Cancel left of Save.
- Editable cards: Edit icon top-right; edit-in-place with Cancel/Save footer (Part C Card).
- All money via psInr / psInrInput. All dates via psDate. All statuses via ps-status-badge.
- All inputs, selects, date pickers, checkboxes, radios via ps-form-field / choice-control styles.
- Tables: .ps-table; compact rows (EX-001) ONLY for payroll register / pay-run tables.
- UI/UX only: no changes to calculations (payroll, TDS), services, APIs, models, validators,
  workflows or stored values.

If anything in this module cannot follow an existing standard, do not invent a new pattern —
list it under "Needs design decision" in your report with the reason.

Report: files changed, completed Consistency checklist (Part E) per screen, and the
"Needs design decision" list.
```

> Bring every "Needs design decision" item back to Claude. It gets decided in the design system first, then implemented.

---

## Review prompt (run after every phase)

```text
Review the changes on this branch against main as a strict reviewer.

1. Run: git diff --stat main...HEAD and list every changed file.
2. Flag ANY change in: *.service.ts, models/interfaces, API clients, guards, resolvers, routing,
   form validators, calculation or utility functions, environment files, or test expectations
   about business behaviour. For each, explain why it changed or revert it.
3. Search the changed style files for hard-coded hex colours, px font sizes, radii or spacing
   not using var(--token). List them.
4. Confirm every (click), (submit), [formControl]/formControlName and routerLink that existed
   before still exists and points to the same handler.
5. Confirm money uses psInr, dates use psDate, statuses use ps-status-badge in changed templates.
6. Confirm icon-only buttons have aria-label and a tooltip.
7. Run lint, unit tests and e2e tests; report results.
8. Fill in the Consistency checklist (Part E) for each changed screen: Pass / Fail / N/A.

Fix any violation found in steps 2–6 that is safe to fix, then report what remains.
```

## Fix prompt (when Codex drifts)

```text
This change deviates from docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md:
<describe the problem, e.g. "Save button uses a different icon than the Action → icon map">

Revert the deviation and implement it exactly as the design system specifies.
Do not introduce new styles, icons or patterns. Do not touch business logic.
Report the files changed.
```

---

## Reject the PR if you see any of these

| Red flag | Why |
|---|---|
| Changes in services, models, API clients, validators or calculation files | Violates UI-only scope |
| Changed numbers in payroll/TDS outputs or tests | Business logic touched |
| New font import or changed font family | Violates DS-001 |
| Hex colours or px values in component styles | Bypasses tokens |
| A second icon library, or a different icon for an existing action | Breaks the icon map |
| Two primary buttons in one view | Breaks DS-005 |
| Money without ₹ / with international grouping (1,000,000) | Breaks DS-008 |
| A status shown as plain or hand-coloured text | Breaks DS-009 |
| A shared component restyled inside one screen's stylesheet | Breaks consistency |
| New pagination, filter or search logic added "to match the design" | Workflow change — needs approval |


## Phase 4E approval and protected visual references

**Phase 4E ? Income Tax / TDS Configuration: Visually Approved and Closed.** Explicit Product Owner approval dated **02 November 2026** covers visual implementation, responsive implementation and design-system consistency. Tax calculation regression evidence, implementation details, test results, comparisons, limitations and screenshots are retained in docs/design-system/PHASE_4E_REPORT.md.

The six approved protected visual references are:

1. Employees ? Phase 3.
2. Employee Details ? Phase 4A.
3. User Management ? Phase 4B.
4. Organization Settings ? Phase 4C.
5. Salary Components ? Phase 4D.
6. Income Tax / TDS Configuration ? Phase 4E.

Future screens must follow these references and the shared PayStream Design System, the single source of truth. Preserve page headers, typography, colors/design tokens, buttons/icon buttons, cards/tables, form fields, status badges, tooltips, spacing/alignment, responsive behavior, navigation and interaction conventions. The same action must use the same icon, size, color, tooltip, placement and interaction convention throughout PayStream. No module may independently introduce a different visual style.

Do not modify an approved screen unless explicitly requested by the Product Owner or a genuine defect is identified. This approval authorizes documentation updates only; preserve financial years, Tax Master, progressive slabs, surcharge thresholds, component taxability, tax history, tax rates/thresholds, the tax engine, annual TDS, payroll integration, backend services, APIs and database schemas. UI/UX changes must preserve application stability, existing functionality and business logic.

**Phase 4G is separately authorized; do not begin Phase 4H without explicit user instructions.** Preserve all staged, unstaged and untracked work; do not stage, commit, push, reset, clean or discard unrelated changes.


## Phase 4F approval and current protected references

**Phase 4F - Employee Income Tax / TDS Profile: Visually Approved and Closed on 02 November 2026**, explicitly approved by the Product Owner. Retain implementation results, regression evidence and all known issues/limitations in PHASE_4F_REPORT.md.

The seven protected approved visual references are Employees (Phase 3), Employee Details (Phase 4A), User Management (Phase 4B), Organization Settings (Phase 4C), Salary Components (Phase 4D), Income Tax / TDS Configuration (Phase 4E) and Employee Income Tax / TDS Profile (Phase 4F). Future modules follow these references and the PayStream Design System as the single source of truth. Preserve headers, typography, colors/tokens, buttons/icons, cards/tables, fields, badges, tooltips, spacing, responsive layout, navigation and interaction conventions. The same action uses the same icon, size, color, tooltip, placement and interaction convention. Change approved screens only on explicit Product Owner request or for a genuine identified defect. Preserve functionality, calculations, APIs, validation, saved employee/payroll/TDS records and PDFs.

Phase 4G - Run Payroll UI/UX is explicitly authorized separately in the approval instruction. It remains open until explicit visual approval. Do not begin Phase 4H automatically. Preserve all existing staged/unstaged/untracked work; do not stage, commit, push, reset, clean or discard unrelated work.


## Current approval registry and Phase 4H authorization - 02 November 2026

**Phase 4G - Run Payroll: Visually Approved and Closed**, explicitly approved by the Product Owner on **02 November 2026**. The product-wide enhanced dropdown design is an **approved standard** covering all **23 select templates**, including closed fields/arrows, open menus and the accepted checkbox presentation. Keep the documented free-text Country datalist and command-menu exceptions. Implementation-time PROPOSED/OPEN wording in earlier sections and source comments is historical; this approval supersedes it without rewriting technical findings or editing application source to record approval.

The eight approved protected visual references are:

1. Employees - Phase 3.
2. Employee Details - Phase 4A.
3. User Management - Phase 4B.
4. Organization Settings - Phase 4C.
5. Salary Components - Phase 4D.
6. Income Tax / TDS Configuration - Phase 4E.
7. Employee Income Tax / TDS Profile - Phase 4F.
8. Run Payroll - Phase 4G.

The PayStream Design System remains the single source of truth. Preserve the same icons, sizes, colors, tooltips, placement, spacing, typography, responsive behavior and interactions for the same action throughout the product. Protect all eight references; modify them only on explicit Product Owner request or for an independently authorized genuine defect. Retain Phase 4G validation results, six known legacy browser failures and documented exceptions/limitations.

**Phase 4H - Pay Checks UI/UX is explicitly authorized and OPEN.** Improve the actual existing employee-profile/editor Pay Checks presentation without creating a duplicate screen or changing routes/navigation, services/APIs, authorization/isolation, calculations, finalized snapshots, stored records, payment statuses or PDF contents/generation. Preserve original View/Download and saved TDS behavior. Any functional defect requires separate approval before a fix. Do not modify other approved screens to accommodate this phase. Phase 4H needs explicit visual approval; **do not start Phase 4I** or later work automatically. Preserve all existing staged/unstaged/untracked work; no staging, commit, push, reset, clean, stash, branch switch or index change.


## Final approval and release scope - 03 November 2026

The Product Owner confirms that Phases 1 through 4H are complete and approved. Phase 4G Run Payroll and its shared enhanced dropdown implementation across all 23 select templates are approved, retaining the Country datalist and command-menu exceptions. Phase 4H Pay Checks is approved and closed. All nine approved screens are protected visual references. Earlier OPEN/pending statements are historical and superseded by this approval; their findings, evidence and limitations remain retained.

Phase 4I Dashboard is deferred. Dashboard improvements will be addressed later. This release authorizes careful cleanup, validation, explicit staging, commits and normal pushes to existing origin/main; it does not authorize new features, redesigns, payroll/tax formula changes, PDF changes, history rewrites or removal of unrelated work. See FINAL_CLEANUP_REPORT.md for final validation and publication results.
