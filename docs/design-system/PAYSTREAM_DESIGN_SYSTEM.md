> Current status - 03 November 2026: Phases 1 through 4H are complete and approved, including Phase 4G shared dropdowns and Phase 4H Pay Checks. Phase 4I Dashboard is deferred. Earlier OPEN/pending statements below are historical; the final approval registry supersedes them.

# PayStream Design System v1.1 — Codex Implementation Brief

You are restyling the existing PayStream Angular application to match the PayStream Design System v1.1. This file is the single source of truth for UI work. Canonical token values live in `src/styles/paystream-tokens.css`; `_tokens.scss` forwards that file for Sass consumers. `_ps-components.scss` remains an unimported component reference.

**Approved implementation references:** Employees (Phase 3) was visually approved on 01 November 2026; Employee Details (Phase 4A), User Management (Phase 4B), Organization Settings (Phase 4C) and Salary Components (Phase 4D) were explicitly visually approved and closed on 02 November 2026. The Product Owner approved User Management's, Organization Settings' and Salary Components' visual implementation, responsive implementation and design-system consistency. Salary Components calculation comparisons and known test limitations remain retained in its report. Employee Income Tax / TDS Profile (Phase 4F) was explicitly visually approved and closed on 02 November 2026. All seven are protected visual reference standards for subsequent modules. Do not modify them unless the Product Owner explicitly requests a change or a genuine defect is identified. Preserve page headers, typography, colors/tokens, buttons/icon buttons, cards/tables, form fields, status badges, tooltips, spacing/alignment, responsive behavior, navigation and interaction conventions. The same action must use the same icon, size, color, tooltip, placement and interaction convention throughout PayStream. This design system remains the single source of truth; no module may introduce an independent visual style. Preserve all existing functionality, calculations, APIs, validations, employee records, payroll data, TDS history and PDFs; approval authorizes no functionality or security changes. Wait for separate explicit instructions before Phase 4H. Approval and evidence are recorded in `PHASE_3_REPORT.md`, `PHASE_3_REMEDIATION_REPORT.md`, `PHASE_4A_REPORT.md`, `PHASE_4B_REPORT.md`, `PHASE_4C_REPORT.md` and `PHASE_4D_REPORT.md`.

## Non-negotiable rules

1. **UI/UX only.** Do NOT modify business logic, payroll calculations, TDS calculations, services, APIs, routes, database schemas, form validators, stored values, or existing workflows. Change templates, styles, presentation-only pipes/directives and accessibility attributes only.
2. **Keep every existing handler.** `(click)`, `(submit)`, form controls, route links and menu actions stay wired exactly as they are. Restyle; do not rewire.
3. **Tokens only.** No hard-coded hex, px font sizes, radii or spacing in component styles. Use `var(--token)` from `_tokens.scss`.
4. **Font (DS-001): do not change the font.** First read the font family already used in `styles.scss`, global and component styles. Put it in `--font-sans` in `_tokens.scss` and report it. Do not add any font import.
5. **One component, one look.** Build each shared component once in `src/app/shared/ui/` and use it everywhere. Never restyle a shared component for one screen.
6. **Money is display-only.** The `psInr` pipe formats for display. Never round, recompute or reformat values sent to or received from the API. Form controls keep the raw number.
7. **If a standard does not fit, stop and report.** Do not invent a new pattern, colour, icon or size.
8. Unit and e2e tests must stay green without changing test expectations for business behaviour.

## Work in phases (one PR per phase)

| Phase | Scope | Done when |
|---|---|---|
| 1 | Load definition-only `_tokens.scss` through `src/styles.scss`; retain existing `styles.css`. Do not import `_ps-components.scss` or apply tokens to screens | Existing appearance and behaviour unchanged; build/tests pass; font reported |
| 2 | Shared components: Button directive, IconButton, Card, PageHeader, FormField, ChoiceControls, StatusBadge, Tooltip; `psInr`, `psInrInput`, `psDate` | Components exist with no screen changes yet |
| 3 | Employees screen per its Target spec | Visual matches spec; behaviour identical |
| 4 | Roll out to other modules (Employee Details, Salary Components, Income Tax/TDS, Run Payroll, Pay Checks, reports, Settings, User Management) one module per PR | Consistency checklist passes per module |

Report after each phase: files changed, anything that could not follow the standard, and why.

---

# Part A — Angular implementation handoff

How to bring the existing Angular app onto this system **without changing business behaviour**: no service, API, route, form-validation or data-model changes — styling, markup structure and accessibility attributes only.

### 1. Tokens as CSS custom properties

- `src/styles/paystream-tokens.css` is the canonical source of CSS custom properties on `:root`. No `tokens.json` was supplied; do not create a duplicate source.
- `src/styles.css` imports the canonical token CSS first. `src/styles.scss` uses that CSS entry only; `_tokens.scss` is a compatibility facade, not another value source. This also supports already-running builds configured with the original CSS entry.
- Component lint enforcement belongs to a later phase; do not add dependencies or modify component styles in Phase 1.

### 2. Shared components (one implementation each)

Create under `src/app/shared/ui/` and replace ad-hoc markup:

| Component | Selector | Notes |
| --- | --- | --- |
| Button | `button[psButton]` with `variant="primary|secondary|ghost|danger"` | Attribute directive on native `<button>`; keeps existing `(click)` handlers |
| IconButton | `ps-icon-button` | Inputs `icon`, `label` (→ `aria-label` + tooltip), `size="sm|md"` |
| Card | `ps-card` | Slots: `[cardTitle]`, `[cardSubtitle]`, `[cardActions]`, body, `[cardFooter]` |
| PageHeader | `ps-page-header` | Inputs `eyebrow`, `title`, `subtitle`; slot `[pageActions]` |
| FormField | `ps-form-field` | Wraps existing reactive-form controls; shows label, required mark, helper, error from the control's state |
| StatusBadge | `ps-status-badge` | Input `status`; maps status codes → tone in one place |
| DataTable styles | `.ps-table` | Keep the current table/`mat-table`; apply classes only |

`_ps-components.scss` is the reference stylesheet for these classes.

### 3. Pipes (display only)

- `psInr` (DS-008) → INR with Indian digit grouping, display only:
  - Standalone `PsInrPipe` wraps Angular `formatCurrency(value, 'en-IN', '₹', 'INR', digits)`: nonzero whole rupees use `'1.0-0'`; zero and fractional values use `'1.2-2'` → `₹10,00,000`, `₹75,000`, `₹1,25,500.50`, `₹0.00`, `₹0.50`. The zero exception is approved by the user's Phase 2a request.
  - Negative: `−₹4,500`. Null/undefined: `—`.
  - Register the `en-IN` locale data (`registerLocaleData(localeEnIn)`).
  - Replace every currency/number display of money in Employee Details, Salary Components, Income Tax/TDS, Run Payroll, Pay Checks and reports. **Never** round, recompute or reformat the value sent to or received from the API — the pipe touches the template only.
  - Currency inputs: standalone `PsInrInputDirective` is an opt-in text-input numeric value accessor; formatted on blur, raw on focus. It does not format while typing, modify validators or round the model. Do not attach to existing native number inputs without a separately approved adoption/validation review.
- Standalone `PsDatePipe` → `dd MMM yyyy` with three-letter months (`en-US` locale). Calendar dates retain their literal day; month-only periods use `MMM yyyy`. Timestamp timezone behaviour remains explicit/default/local as documented in the Phase 2a contract below. No screen adoption in Phase 2a.

### 4. Borders and choice controls (DS-004)

Set `border-color: var(--border-control)` on every input, select, date picker, textarea, checkbox, radio and toggle, including Angular Material overrides (`--mdc-outlined-text-field-outline-color`, `--mdc-checkbox-unselected-icon-color`, `--mdc-radio-unselected-icon-color` if Material is in use). Hover `--border-control-hover`, disabled `--border-subtle`.

### 5. Status badges (DS-009)

`ps-status-badge` owns the single status → tone map (see StatusBadge). Replace every hand-coloured status in templates with it. It maps the existing backend status value; no status values change.

### 6. Icons

Install `lucide-angular`; register only the icons in the Action → icon map. Remove other icon fonts once replaced.

### 7. Employees screen changes

Apply the Target spec in *Screen spec — Employees*: button hierarchy, column order (Actions last), StatusBadge, row height, pagination footer, control heights. Data, filters, search, kebab-menu behaviours and the Run Payroll / Generate Payroll flows keep their existing handlers and routes — only the button variant changes.

### 8. Font (DS-001)

The declared UI stack in `src/styles.css` is `Inter, 'Segoe UI', Arial, sans-serif`; preserve it in `--font-sans`. Inter has no application font import or bundled browser font. The resolved rendered face has not been verified. Employee IDs separately declare `monospace`. Noto Sans is used only by PDF generation, which is outside Phase 1.

### 9. Done when

- No hard-coded colours/sizes remain in touched components.
- Keyboard: every action reachable, focus ring visible.
- Visual diff of Employees matches the Target spec; unit/e2e tests unchanged and green.

---

# Part B — Design system reference

PayStream — An Excelhire Product. Indian payroll and people operations: calm, dense, trustworthy.

This is the single source of truth for every PayStream screen. Version **1.1** (1 Nov 2026), baselined on the Employees screen, with DS-004, DS-005, DS-008 and DS-009 approved as permanent standards. Anything not covered here is not yet a standard — propose it through the Decision log, with its impact across modules, before shipping it.

**Scope: UI/UX only.** Standards here change presentation — styling, layout, markup, accessibility. They never change business logic, payroll or TDS calculations, APIs, database schemas, validations, stored values or existing workflows.

### How to use this system

| You are… | Start with |
| --- | --- |
| Designing a new screen | Principles below → Components → *Consistency checklist* |
| Changing a shared component | *Decision log* (change process) |
| Implementing in Angular | *Angular implementation handoff* |
| Reviewing a screen | *Consistency checklist* |

Status words used throughout: **Established** = visible in a shipped screen; **Standard v1.0** = adopted in this version, may differ from what ships today; **Proposed** = needs sign-off before use.

### Principles

1. **One product, one hand.** A Save, an Edit, a table, a card looks and behaves the same in Employees, Settings, Tax Configuration and Run Payroll. Like a kirana shop where every shelf label uses the same format — customers find things without reading twice.
2. **Money is serious, so the UI is quiet.** Deep green and white; colour is reserved for status and the one primary action. No gradients, no decorative illustration.
3. **Density with breathing room.** Payroll users scan hundreds of rows. Rows are compact, but headers and cards keep generous space.
4. **Every action names itself.** Icon-only buttons always carry a tooltip and an `aria-label`.

### Content fundamentals

- **Voice:** plain, direct, second person. "Your people, organized in one place." Not "Welcome to your Employee Hub!"
- **Case:** page and card titles in Sentence case (*Employee directory*). Buttons and nav items in Title Case (*Add Employee*, *Run Payroll*). Eyebrows and table headers uppercase via CSS, written in Title Case in code.
- **Buttons are verb + object:** *Add Employee*, *Run Payroll*, *Refresh List*. Never *OK* / *Submit*.
- **Dates:** `DD MMM YYYY` with three-letter months (*15 Sep 2026*, never *Sept*) — see DS-007.
- **Money (DS-008, approved): INR with Indian digit grouping, everywhere.** `₹10,00,000` · `₹75,000` · `₹1,25,500.50`. The ₹ symbol sits directly before the digits, no space. Whole amounts show no decimals; amounts with paise show exactly two. Negative amounts: `−₹4,500` in `danger`. Never USD, never international grouping (*1,000,000*). Applies to Employee Details, Salary Components, Income Tax/TDS, Run Payroll, Pay Checks, reports and every other money display. Formatting is display-only — stored values and calculations are untouched.
- **Money in tables and inputs:** right-aligned, tabular figures. Input fields show the ₹ as a fixed prefix and format on blur.
- **Status:** always a StatusBadge from the fixed status map (DS-009) — the same status looks the same in every module.
- **IDs:** uppercase prefix + zero-padded number in mono (*EMP001*).

### Visual foundations

**Colour.** `brand-900` owns the sidebar; `brand-700` is the single filled-button colour; `lime-300` is the identity accent, used only for the logo tile and the active nav item on dark. Content sits on `surface-card` cards over the `surface-page` canvas. Semantic colours (`success`, `warning`, `danger`, `info`) appear only in badges, alerts, toasts and validation — never as decoration or for an ordinary action.

**Borders (DS-004, approved).** Two borders, two jobs. `border-subtle` separates content (cards, dividers, table rows) and stays light. `border-control` (3.27:1) outlines anything you can type in, pick or tick — text, number, currency and date inputs, selects, search, checkboxes, radios, secondary buttons — so controls are findable without looking heavy. Hover `border-control-hover`, focus `focus-ring`, error `danger`, disabled `border-subtle`. Always 1 px.

**Type.** One sans family, one mono for IDs. Hierarchy per page: `eyebrow` → `page-title` → `page-subtitle`; per card: `card-title` → `card-subtitle`. No other heading sizes without a Decision-log entry. **Font (DS-001): preserve the declared stack `Inter, 'Segoe UI', Arial, sans-serif`**, recorded in `src/styles/paystream-tokens.css`. The resolved browser font has not been verified; no font is introduced, and any change requires separate approval.

**Spacing.** 4-px base: `space-1`…`space-12`. Cards pad `space-6`. Page header → first card `space-8`.

**Shape.** `radius-md` for every control, `radius-xl` for every card and dialog. Cards are bordered (`border-subtle`), not shadowed; shadows exist only for floating layers (`shadow-popover`, `shadow-dialog`).

**Layout.** Fixed sidebar (`sidebar-width`) + top bar (`topbar-height`) + centred content (`content-max`). Page header: eyebrow / title / subtitle on the left, page actions on the right, top-aligned to the title.

### Iconography

**One library: Lucide (outline), stroke 1.75, `icon-sm` 16 px in controls, `icon-md` 20 px in the sidebar.** Do not mix in Material or Font Awesome glyphs. Icons inherit `currentColor`.

### Action → icon map (mandatory)

| Action | Lucide icon | Form | Placement |
| --- | --- | --- | --- |
| Add | `plus` | Primary button with label (*Add Employee*) | Page header, rightmost |
| Run Payroll | — | Secondary button, label only, on Employees (DS-005); primary only on the Run Payroll page itself | Page header, left of Add Employee |
| Save | `check` | Primary button with label **Save** (no icon in forms) | Form/card footer right, after Cancel |
| Cancel | — | Secondary button **Cancel** | Immediately left of Save |
| Edit | `pencil` | Ghost icon button, tooltip *Edit* | Card header, top-right |
| Delete | `trash-2` | In kebab menu (danger item) or danger button in confirm dialog | Never a resting row icon |
| View | `eye` | Kebab menu item *View details*, or row click | — |
| Download | `download` | Secondary button with label, or icon button with tooltip | Card header right |
| Refresh | `rotate-cw` | Secondary button *Refresh List* with icon | Card header right |
| Close | `x` | Ghost icon button 32 px, tooltip *Close* | Dialog/popover top-right |
| Back | `arrow-left` | Ghost button with label *Back to Employees* | Above eyebrow, left |
| More actions | `more-vertical` | Ghost icon button 32 px, tooltip *More actions* | Last table column, right-aligned |
| Info | `info` | 16 px inline icon, ink-subtle, opens tooltip | Right of the field label, `space-1` gap |
| Search | `search` | Leading icon inside search field | Card toolbar, right |

### Components

| Component | Status | Summary |
| --- | --- | --- |
| Button | Established | Primary / secondary / ghost / danger, one height |
| IconButton | Standard v1.0 | Ghost 32 px in rows, always with tooltip |
| PageHeader | Established | Eyebrow, title, subtitle, actions |
| Card | Established | Bordered white card with header + actions |
| FormField | Standard v1.1 | Top label, 40 px control, ₹ prefix for money, helper/error below |
| Choice controls | Standard v1.1 | Checkbox, radio, toggle — same border as fields |
| SearchInput | Established | Leading search icon, toolbar right |
| DataTable | Established, revised | Sunken header, 56 px rows, ₹ right-aligned, actions last |
| StatusBadge | Standard v1.1 | One fixed status map for every module |
| SidebarNav | Established | Dark rail, lime active state |
| Tooltip | Standard v1.0 | Dark, 12 px, top placement |

Full specs live on each component's page.

### Governance

- **Compare before designing.** Every new screen starts from this system and ends with the Consistency checklist.
- **No screen-level redesigns.** A component is never restyled on one screen; it changes everywhere through the Decision log or not at all.
- **Propose before changing.** A change to a standard is proposed first, with every affected module listed, and applied only after approval.
- **No one-off styling.** A new colour, size or radius needs a Decision-log entry and a token.
- **Exceptions** are registered (EX-nnn) with reason, scope and the screens that use them.
- **Changes to a shared component** list every affected module and whether existing screens are updated in the same release.

---

# Part C — Component specifications

## Button

The single button component for every text action in PayStream, in four variants at one height.

| Variant | Use | Tokens |
| --- | --- | --- |
| Primary | The one main action of a view (Add Employee on Employees, Save in forms, Run Payroll on the Run Payroll page) | `brand-700` fill, hover `brand-600`, label `ink-on-brand` |
| Secondary | Every other action (Cancel, Generate Payroll, Refresh List, Download) | `surface-card`, `border-control`, label `ink` |
| Ghost | Low-emphasis and navigation (Back, Clear filters) | transparent, hover `surface-hover` |
| Danger | Confirming a destructive action inside a confirmation dialog only | `danger` fill |

**Anatomy:** height `control-height`, padding `0 space-4`, `radius-md`, label style `button`, optional leading 16 px Lucide icon with `space-2` gap.

**Rules**
- Exactly one primary per view; it sits rightmost in its group (DS-005, approved). The same hierarchy applies in every module.
- Order in forms and dialogs: **Cancel** (secondary) then **Save** (primary), bottom-right.
- Labels are verb + object, Title Case. Save buttons say **Save**, not *Submit* / *Update*.
- Disabled: `neutral-bg` fill, `ink-subtle` label, `not-allowed` cursor, and a tooltip saying why when the reason isn't obvious.
- Save feedback: button shows a 16 px spinner and *Saving…* while pending, then a success toast; never a silent save.
- Don't use a text button where the map says icon button, or vice versa.

## IconButton

A ghost, icon-only button for compact repeated actions, always paired with a tooltip and an accessible label.

**Sizes:** `icon-button-sm` (32 px) inside table rows and card headers; `control-height` (40 px) in toolbars. Icon 16 px, `radius-md`.

**States:** rest `ink-muted` on transparent · hover `surface-hover` + `ink` · focus `focus-ring` · disabled `ink-subtle`, no hover.

**Rules**
- Icons come only from the Action → icon map in the README (Lucide, stroke 1.75).
- Tooltip text = the `aria-label` = the action name (*Edit*, *More actions*). Tooltip appears after 300 ms hover or on keyboard focus.
- No bordered icon boxes — the baseline's 40 px bordered kebab is retired (DS-003).
- Delete is a danger item inside the kebab menu, not a resting row icon. The trash icon in `danger` appears only in a card header for removing that card's own content, with a confirmation dialog.
- Edit in an editable card: top-right of the card header, 32 px.

## PageHeader

The top of every page: module eyebrow, page title, one-line subtitle, and page-level actions on the right.

**Anatomy:** `eyebrow` (module name, same words as the breadcrumb — DS-010) → `page-title` → `page-subtitle`. Actions right, top-aligned with the eyebrow, `space-3` gaps. `space-12` above, `space-8` below to the first card.

**Rules**
- One primary action, rightmost; others secondary (DS-005). On Employees: Generate Payroll · Run Payroll (secondary) · Add Employee (primary). Run Payroll stays on Employees — it is an operational shortcut, not decoration.
- Detail pages put a ghost *Back to {List}* button (`arrow-left`) above the eyebrow.
- Actions wrap below the title under 960 px viewport width.

## Card

The one container for grouped content and widgets: white, bordered, rounded, with a standard header.

**Anatomy:** `surface-card`, 1 px `border-subtle`, `radius-xl`, no resting shadow. Header padding `space-6 space-6 0`: `card-title` + optional `card-subtitle` left; actions right (32 px icon buttons or secondary buttons). Body padding `space-6`. Footer (edit mode only): top border, Cancel + Save right-aligned.

**Edit pattern (view → edit)**
1. View mode: Edit icon button top-right of the header.
2. Click Edit: the card switches in place to fields; header action hides; footer with Cancel / Save appears.
3. Save: button spinner → success toast "Changes saved" → back to view mode. Cancel discards and returns to view mode without a prompt unless fields changed (then confirm dialog *Discard changes?*).

**Exceptions:** Dashboard KPI tiles may drop the header (registered when introduced).

## FormField

Label, control and helper/error text in one fixed stack — the wrapper for every text, number, currency, date and select field, and every textarea.

**Anatomy:** `label` above the control (`space-2` gap); required mark `*` in `danger` after the label; optional `info` icon 16 px `ink-subtle` after that, opening a Tooltip. Control: `control-height`, `radius-md`, 1 px `border-control`, `surface-card`, text style `control`, placeholder `ink-subtle`. Helper or error below in `helper` style.

**Border states (DS-004):** rest `border-control` · hover `border-control-hover` · focus `focus-ring` outline (border unchanged) · error `danger` border and helper, `aria-invalid` + `aria-describedby` · disabled `border-subtle` on `surface-sunken`, `ink-subtle` text. Identical for every field type.

### Field types

| Type | Rule |
| --- | --- |
| Text | Full width of its grid column |
| Number | Right-aligned, tabular figures |
| Currency (DS-008) | Fixed `₹` prefix in `ink-muted`; digits right-aligned with Indian grouping (`14,00,000`, `1,25,500.50`); formats on blur, raw number while editing. Display only — the value sent to the API is unchanged |
| Date | Shows `DD MMM YYYY`; calendar icon trailing; picker panel uses `shadow-popover`, `radius-md` |
| Select | Same height, border and chevron everywhere; searchable when > 10 options |
| Textarea | Same border; min 3 rows; resizes vertically only |

**Behaviour**
- Validation messages and rules come from the existing form logic — the design only defines where and how they appear: under the field, in `helper` style, `danger`.
- On submit, focus moves to the first field in error.
- Fields sit in a 2- or 3-column grid with `space-5` row gaps; never content-width.
- Filter bars may place the label inline to the left (EX-002); forms never do.

## ChoiceControls

Checkbox, radio and toggle — the controls for ticking and picking, sharing one border standard with text fields (DS-004).

| Control | Size | Unchecked | Checked |
| --- | --- | --- | --- |
| Checkbox | 18 px, `radius-sm` | 1 px `border-control` on `surface-card` | `brand-700` fill, white tick |
| Radio | 18 px circle | 1 px `border-control` | `brand-700` ring + 8 px dot |
| Toggle | 36 × 20 px | `border-control`, `surface-sunken`, grey knob | `brand-700` track, white knob |

**States:** hover `border-control-hover` · focus `focus-ring` · disabled `border-subtle` on `surface-sunken`, label `ink-subtle`.

**Rules**
- Label to the right, `space-2` gap; the whole label is clickable.
- Groups stack vertically with `space-3` gaps under a `label`-style group title, wrapped in `role="group"` / `radiogroup`.
- Toggle = an immediate on/off setting. Checkbox = a choice applied when the form is saved. Never swap them for looks.
- Radios for 2–5 exclusive options; more than 5 → Select.

## DataTable

The single list pattern for records: a Card holding a toolbar, the table, and a pagination footer.

**Structure:** Card header (title, subtitle, *Refresh List* right) → toolbar (filters left, SearchInput right, `space-6` padding) → table → footer (range text left, pager right).

**Table spec**
| Part | Spec |
| --- | --- |
| Header row | `table-header-height`, `surface-sunken`, `table-header` style, uppercase, borders `border-subtle` |
| Body row | `table-row-height` (56 px); `table-row-compact` only under EX-001; divider `border-subtle`; hover `surface-hover` |
| Cells | `table-cell`; padding `0 space-4`; record name 600; IDs `table-id` mono |
| Alignment | Text left; numbers, counts and ₹ amounts right with tabular figures; header matches its column |
| Money | ₹ with Indian grouping via `psInr` (DS-008): `₹14,00,000`, `₹1,25,500.50` |
| Status | StatusBadge from the fixed status map (DS-009), never plain text |
| Actions | Always the last column, right-aligned, 64 px: ghost 32 px kebab (*More actions*). Menu items: View Details, Edit, divider, destructive item in `danger` |
| Selection | Checkbox column first, 48 px, centred (when bulk actions exist) |

**States:** loading — 8 skeleton rows at row height; empty — centred message + ghost *Clear filters*; error — danger alert above the table with *Retry*.

**Don't:** redesign a module's table, put actions mid-row, or add bordered icon boxes.

## StatusBadge

A small tinted pill with a dot that shows a record's state — the only way status is shown in PayStream (DS-009, approved).

**Anatomy:** height 22 px, padding `2px space-2`, 1 px tone border, `radius-sm`, 12 px / 600 label in Title Case, 6 px dot in the text colour, `space-1` gap. Never a hand-coloured text, chip or icon instead.

### Tones

| Tone | Text | Background | Border | Means |
| --- | --- | --- | --- | --- |
| success | `success` | `success-bg` | `success-border` | Done, valid, in good standing |
| info | `info` | `info-bg` | `info-border` | In progress, waiting on someone else |
| warning | `warning` | `warning-bg` | `warning-border` | Needs attention soon |
| danger | `danger` | `danger-bg` | `danger-border` | Stopped, refused, invalid |
| neutral | `ink-muted` | `neutral-bg` | `neutral-border` | Not in play: off, unfinished, archived |

Every text/background pair is ≥ 5:1. Colour is never the only signal: the label always names the status.

### Status map (one map, every module)

| Status | Tone |
| --- | --- |
| Active | success |
| Approved | success |
| Paid | success |
| Completed | success |
| Processed | success |
| Submitted | info |
| In Review | info |
| Processing | info |
| Scheduled | info |
| Pending | warning |
| On Hold | warning |
| Expiring Soon | warning |
| Rejected | danger |
| Expired | danger |
| Terminated | danger |
| Failed | danger |
| Overdue | danger |
| Inactive | neutral |
| Draft | neutral |
| Archived | neutral |
| Cancelled | neutral |

**Rules**
- A status keeps its tone in every module: *Paid* is success on Pay Checks, Run Payroll and reports alike.
- The map lives in one place — the Angular `ps-status-badge` component maps the backend status value to label and tone. Screens pass the status; they never pick a colour.
- A new status is added here first (Decision log), then to the component. Unknown values render neutral with the raw label, so nothing breaks.
- Badges are read-only. A status that can be changed is changed through an action (kebab menu, button), not by clicking the badge.

## SidebarNav

The fixed dark navigation rail holding the PayStream lockup and module links.

**Anatomy:** `sidebar-width`, `brand-900`. Lockup: 48 px `lime-300` tile with "P" in `brand-900`, name *PayStream* (no trailing comma) and *An Excelhire Product* in `ink-on-dark-muted`. Section label in `eyebrow` style, `ink-on-dark-muted`. Items: `nav` style, 20 px Lucide icon, `space-3` padding, `radius-lg`.

**States:** rest `ink-on-dark` · hover `brand-800` background · active `brand-800` + `border-on-dark` outline, `lime-300` label and icon at 600, `aria-current="page"`.

**Rules:** labels single-line (ellipsis + tooltip if ever truncated); one icon per module, reused in page breadcrumbs.

## Tooltip

A short dark label that names an icon action or explains a field, shown on hover or focus.

**Anatomy:** `brand-900` background, `ink-on-dark` text, `helper` style, padding `space-1 space-2`, `radius-sm`, 6 px above the trigger, centred. Max width 240 px; wraps beyond.

**Behaviour:** opens after 300 ms hover or immediately on keyboard focus; closes on leave, blur or Esc. Never holds links or buttons — use a Popover (`surface-card`, `radius-lg`, `shadow-popover`, close `x` top-right) for rich content.

**Info icon:** Lucide `info`, 16 px, `ink-subtle`, `space-1` after the label text, `aria-label="More information"`. Identical in Employee Details, Tax Configuration and Run Payroll.

---

# Part D — Employees screen spec

The Employees list is the first established PayStream screen and the baseline for v1.0. This page records what it establishes, what it gets wrong against the standard, and the target spec.

### What it establishes

| Area | Established pattern |
| --- | --- |
| Shell | Dark `brand-900` sidebar, white top bar (breadcrumb left, org name centre, Sign out right), `surface-page` canvas |
| Page header | Eyebrow → page title → subtitle; actions right |
| Primary button | `brand-700` fill, white 13/600 label, `radius-md` |
| Secondary button | White fill, `border-control`, ink label |
| Card | White, `border-subtle`, `radius-xl`, header with title + subtitle and a right-aligned action |
| Filter bar | Inline label + select on the left, search on the right |
| Table | Sunken header, uppercase 11 px headers, mono IDs, bold name column, currency right-aligned |

### Baseline audit — inconsistencies found

| # | Finding | Severity | Fix (standard) | Ref |
| --- | --- | --- | --- | --- |
| 1 | Two filled primary buttons in one header (*Add Employee*, *Run Payroll*) | High | **Approved:** *Add Employee* primary; *Generate Payroll* and *Run Payroll* secondary. Run Payroll stays on this screen | DS-005 ✓ |
| 2 | Status shown as plain text "Active" | High | **Approved:** StatusBadge, success tone | DS-009 ✓ |
| 3 | Actions column is not last (Created Date follows it) | High | Actions always the last column, right-aligned | DS-003 |
| 4 | Every row has a bordered 40 px kebab box — heavy visual noise | Medium | Ghost IconButton 32 px, tooltip *More actions* | DS-003 |
| 5 | Row height ≈ 84 px; ~6 rows per screen | Medium | `table-row-height` 56 px | DS-003 |
| 6 | Annual CTC has Indian grouping but no ₹ symbol, and always shows `.00` | High | **Approved:** `psInr` formatter — `₹14,00,000`, `₹3,43,632.50`; tabular figures, right-aligned | DS-008 ✓ |
| 7 | Mixed month abbreviations (*Sept* vs *Aug*, *Oct*) — likely the `en-IN` locale's CLDR month names | Low | `DD MMM YYYY`, three-letter months (see handoff) | DS-007 |
| 8 | Status select ≈ 34 px, search ≈ 36 px, buttons 40 px | Medium | All controls `control-height` 40 px | DS-002 |
| 9 | Brand lockup reads "PayStream," (trailing comma) | Low | "PayStream" / "An Excelhire Product" | — |
| 10 | Sidebar item "User Management" wraps to two lines | Low | `sidebar-width` 248 px; labels single-line | DS-006 |
| 11 | Breadcrumb "People & operations" vs eyebrow "People Management" name the same area differently | Medium | One module name in both places: *People Management* | DS-010 |
| 12 | *Refresh list* has no icon; sentence case on a button | Low | *Refresh List* with `rotate-cw` | Iconography |
| 13 | No pagination visible | Medium | DataTable footer: range text left, pager right | DataTable |
| 14 | Control borders below 3:1 contrast | Medium | **Approved:** `border-control` `#86918a` (3.27:1) on all controls | DS-004 ✓ |

### Target spec

- **Header actions (right, `space-3` gaps):** Generate Payroll (secondary) · Run Payroll (secondary) · Add Employee (primary, `plus`). Primary sits rightmost.
- **Card header:** *Employee directory* / subtitle; right: *Refresh List* (secondary, `rotate-cw`).
- **Toolbar:** left — label *Employee Status* + Select (Active, Terminated, All); right — SearchInput 320 px, placeholder *Search employees…*. Preserve the existing filter bindings, default and option order.
- **Columns:** Employee ID (mono) · First Name (600) · Last Name · Email · Date of Birth · Hire Date · Annual CTC (₹, right) · Pay Frequency · Status (badge) · Created Date · Actions (right, 64 px).
- **Kebab menu:** preserve the actual existing options and order: Edit, Delete, Terminate or Rehire, Employment history. Delete uses danger text. No new View action or divider is added; existing name links retain profile navigation. This reflects the Phase 3 user's explicit action-preservation requirement.
- **Footer:** existing filtered employee count only. No pagination/page-size control exists; do not add one to satisfy the earlier illustrative range/pager design.
- **States:** loading = 8 skeleton rows; empty = existing "No employees found." and existing search/filter explanation with the existing secondary Add Employee action; error = existing inline danger alert with Retry. Do not introduce a Clear filters workflow.

---

# Part E — Consistency checklist (run per screen)

Run this on every new or changed screen before it is presented. Attach the filled checklist to the screen spec. Any "No" is fixed before review, or logged as an exception (EX-nnn).

| # | Check | Pass rule |
| --- | --- | --- |
| 1 | Page header | Eyebrow → `page-title` → `page-subtitle`; actions right, top-aligned |
| 2 | Primary action | Exactly one primary (`brand-700`) button visible per view; it is rightmost in its group |
| 3 | Button order | Cancel left of Save; destructive actions never primary-styled |
| 4 | Action icons | Every action icon matches the Action → icon map; Lucide only |
| 5 | Icon-only buttons | Ghost style, 32 px in rows / 40 px in toolbars, tooltip + `aria-label` |
| 6 | Edit placement | Editable cards show Edit (`pencil`) at the card header's top-right |
| 7 | Controls | All buttons, inputs, selects at `control-height`; `radius-md`; labels above fields (filter bars may inline — EX-002) |
| 8 | Required fields | Red asterisk after label, `danger`; error text under field in `helper` style |
| 9 | Cards | `surface-card`, `border-subtle`, `radius-xl`, padding `space-6`, no resting shadow |
| 10 | Tables | Sunken 44 px header, 56 px rows (44 px only under EX-001), numbers right-aligned, actions last |
| 11 | Status | StatusBadge from the fixed status map — same status, same tone as every other module |
| 12 | Dates and money | `DD MMM YYYY`; all money via `psInr` — ₹ symbol, Indian grouping, paise only when non-zero |
| 13 | Tokens only | Component values reference canonical `src/styles/paystream-tokens.css` tokens; existing screens migrate only in their approved phase |
| 14 | Tooltips and info icons | `info` 16 px ink-subtle beside label; dark tooltip, top placement |
| 15 | Feedback | Save → success toast top-right, 4 s; errors stay until dismissed |
| 16 | States | Loading, empty, error and disabled designed for every data region |
| 17 | Focus | Visible `focus-ring` on every interactive element; logical tab order |
| 18 | Contrast | Text ≥ 4.5:1; icons and control borders ≥ 3:1 (`border-control` on every input, select, date, checkbox, radio) |
| 19 | Belongs to PayStream | Side-by-side with Employees, it reads as the same product |
| 20 | UI-only | No change to business logic, calculations (payroll, TDS), APIs, schemas, validations, stored values or workflows |
| 21 | No local redesign | No shared component restyled for this screen alone; any standard change is proposed in the Decision log first |

---

# Part F — Decision log

Every change to a shared standard is recorded here before it ships. Approved decisions are permanent standards for every PayStream screen until a later entry supersedes them.

**Change process:** (1) existing standard, (2) problem, (3) proposal, (4) every affected module, (5) whether existing screens update in the same release, (6) approval, then update tokens and components. Nothing is applied before approval.

### Decisions

| ID | Decision | Status | Affects |
| --- | --- | --- | --- |
| DS-001 | Preserve the declared stack `Inter, 'Segoe UI', Arial, sans-serif` from `src/styles.css`. No new font; resolved browser face remains unverified | Approved; declared stack recorded 01 Nov 2026 | All |
| DS-002 | One `control-height` (40 px) for buttons, inputs, selects, search | Standard v1.0 | All forms, toolbars |
| DS-003 | Table: 56 px rows, actions last and right-aligned, ghost 32 px kebab | Standard v1.0 | Employees, Users, all lists |
| DS-004 | `border-control` darkened `#cfd6cf` → `#86918a` (1.48 → 3.27:1 on white, 3.06:1 on sunken); hover `#66716a`. Applies to text, number, currency and date fields, selects, search, textareas, checkboxes, radios, toggles, secondary buttons. Cards and dividers keep the light `border-subtle` so the UI stays light | **Approved 01 Nov 2026** | Every form and filter bar in every module |
| DS-005 | One primary button per view, rightmost. Employees: *Add Employee* primary; *Generate Payroll* and *Run Payroll* secondary and kept on the screen. Same hierarchy product-wide | **Approved 01 Nov 2026** | All page headers, cards, dialogs |
| DS-006 | Sidebar width 248 px; nav labels never wrap | Standard v1.0 | Shell |
| DS-007 | Date display `DD MMM YYYY`, three-letter months | Standard v1.0 | All date cells and fields |
| DS-008 | INR everywhere: ₹ symbol, Indian digit grouping (`₹10,00,000`, `₹75,000`, `₹1,25,500.50`); nonzero whole values omit decimals, fractional values show two; zero displays `₹0.00` per approved Phase 2a request. Via shared `psInr`, display only — calculations and stored values unchanged | **Approved 01 Nov 2026; zero clarified in Phase 2a** | Employee Details, Salary Components, Income Tax/TDS, Run Payroll, Pay Checks, reports, all money displays |
| DS-009 | StatusBadge with five tones (success, info, warning, danger, neutral), 1 px tone border, and one status map used by every module (see StatusBadge) | **Approved 01 Nov 2026** | All status columns and record headers |
| DS-010 | Breadcrumb and eyebrow use the same module name | Standard v1.0 | Shell, all pages |
| DS-012 | Shared shell visual correction: remove brand comma, apply 248px sidebar/single-line labels and aligned breadcrumb naming, preserve every route/menu/permission/binding | Implemented in remediation and visually approved with the corrected Employees baseline on 01 Nov 2026 | Shared shell, all routes |
| DS-012 (dropdown standard) | Shared fields/arrows and enhanced PsSelect/PsNativeSelect menu across all 23 templates, with Country datalist/command-menu exceptions | **Approved 02 November 2026** | Product-wide |

### Proposals awaiting approval

| ID | Proposal | Impact |
| --- | --- | --- |
| DS-011 | In financial tables where figures are compared line by line (Run Payroll register, Pay Checks, TDS reports), always show two decimals (`₹75,000.00`) so decimal points align. Elsewhere follow DS-008 as approved | Payroll register, Pay Checks, TDS and salary reports only. Not applied until approved |

### Registered exceptions

| ID | Exception | Reason | Scope |
| --- | --- | --- | --- |
| EX-001 | Compact table rows 44 px | Payroll registers show 50–500 lines that are compared line by line | Run Payroll, payroll register, pay-run history |
| EX-002 | Inline label + control in filter bars | Filters are a single row above a table; top labels would double the toolbar height | Table toolbars only — never in forms |

### Changelog

- **Phase 3 visual approval — 01 Nov 2026.** User reviewed and accepted the corrected Employees screen as the product-wide reference implementation. Preserve the approved screen except for genuine identified defects; retain one design-system source of truth and existing business functionality. Phase 4 awaits explicit user instructions. This approval-record update changes no application code.

- **Phase 3 remediation — 01 Nov 2026; subsequently visually approved.** Correct the actual CSS entry path as well as the SCSS entry: canonical browser CSS tokens, Sass facade, no duplicated values. Add intrinsic 16px SVG dimensions, compact icon-only Refresh per the user's remediation instruction, reference 1180px table minimum and bounded email text, single-owner page padding and approved shell visual corrections. Existing statuses, actions, navigation, data and handlers remain authoritative over reference sample behaviours. The earlier premature completion claim is superseded; corrected evidence is in `PHASE_3_REMEDIATION_REPORT.md`.

- **Phase 3 — 01 Nov 2026.** User approved Part D's written target as authority because the Claude artifact was inaccessible. Employees adopts shared components and display pipes; all existing handlers/workflows remain unchanged. Corrected illustrative menu/footer/empty-state instructions to preserve actual actions and the absence of pagination. Shared composition APIs implement native CDK triggers, existing inline/hidden-label fields and full-width Card/DataTable composition. Generate Payroll's Employees-only trigger adopts PsButton; its dialog and class logic are unchanged. At that initial submission, shared-shell work was deferred under DS-012; the subsequent remediation and visual approval supersede that deferral.

- **Phase 2b — 01 Nov 2026.** Nine standalone UI standards implemented without screen adoption; see `PayStream-Component-Library.md`. User approved vendoring only the approved Lucide glyphs and license because lucide-angular@1.0.0 declares Angular 13–21 peers while this app uses Angular 22. No incompatible package was forced. Existing tokens retain their values; missing reference dimensions become definition-only tokens. Unapproved status tones remain neutral.

- **Phase 2a clarification — 01 Nov 2026.** User approved utilities only: zero is `₹0.00`, nonzero whole rupees omit decimals, fractions display two decimals. Currency input preserves model precision. Calendar dates and month-only periods preserve their meaning; timestamp timezone behaviour is retained. No screen, business, date calculation, validator or PDF changes.

- **Phase 1 clarification — 01 Nov 2026.** User-approved scope: definitions only, no component stylesheet import or screen adoption. Record the existing font stack and Active/Terminated/All filter terminology. Preserve all dates, workflows and PDFs. The supplied package remains v1.1; these clarifications do not revise approved palette values or approve DS-011.

- **1.1 — 01 Nov 2026.** DS-004, DS-005, DS-008, DS-009 approved and applied. New tokens: `border-control-hover`, five badge border tokens. New component: ChoiceControls. FormField gains the ₹ currency field. DS-001 approved in principle; font name to be read from the codebase. Scope rule added: UI/UX only.
- **1.0 — 01 Nov 2026.** Baseline from the Employees screen. Colours sampled from screenshot; to be replaced with exact SCSS values.

## Phase 1 token foundation — approved scope clarification

The repository uses Angular 22 standalone components and CSS component styles. `angular.json` selects the small `src/styles.scss` global entry point, which uses `src/styles.css`. That original CSS entry now imports canonical token CSS first; its existing rules, including the CDK overlay import, body colours, typography and controls, remain unchanged. No new dependency is needed: Angular's build tool already supports Sass.

Only `:root` custom-property definitions are emitted by the token partial. The supplied `.ps-text-*` classes are represented as typography tokens instead of emitted selectors. `_ps-components.scss` remains an unimported reference, including its conflicting global body rule and literal dimensions. Its later adoption requires a separate review.

### Naming and inventory

Use lowercase kebab-case custom properties through `var(--token)`. Original palette and dimension names remain stable. Semantic aliases reference original tokens instead of duplicating values. No token is applied to an existing screen in Phase 1.

| Category | Definitions in `src/styles/paystream-tokens.css` |
| --- | --- |
| Brand/action colours | `brand-900` #12292b, `brand-800` #1b3a35, `brand-700` #1f4a3a, `brand-600` #2b5e4a, `lime-300` #c6eba6; aliases `color-primary`, `color-secondary`, `color-accent` |
| Surfaces | `surface-page` #f4f6f2, `surface-card` #ffffff, `surface-sunken` #f6f8f5, `surface-hover` #f1f5ef. Existing body background stays #f5f7f2 until an approved screen migration |
| Text | `ink` #16261f, `ink-muted` #5b6660, `ink-subtle` #66716a; existing on-dark/on-brand tokens retained |
| Border/focus | `border-width` 1px; `border-subtle` #e3e8e2; `border-card` alias; approved `border-control` #86918a and hover #66716a; `focus-ring` #2b7a5b. Existing controls are unchanged |
| Status colours | Success #1e6b40 / #e3f2e8 / #bcd9c6; warning #7d5200 / #fbf0d6 / #efd9a6; error uses danger #b42318 / #fdecea / #f3c3be; information #1d5a9e / #e8f0fa / #c3d6ee; neutral #5b6660 / #eef1ed / #d7ddd8 (text/background/border) |
| Status aliases | `status-{success,warning,error,info,neutral}-{text,bg,border}`; unknown/unapproved statuses use the neutral foundation in a future shared badge, with raw labels preserved |
| Families/weights | `font-sans` preserves the declared UI stack; supplied `font-mono` retained for future use; regular 400, medium 500, semibold 600, bold 700 |
| Typography | `type-{role}-{size,line-height,weight}` plus shorthand `type-{role}`; letter spacing where specified. See role scale below |
| Spacing | `space-1/2/3/4/5/6/8/12`: 4/8/12/16/20/24/32/48px; card padding = space-6, form row gap = space-5, table inline cell padding = space-4 |
| Radii | `radius-sm/md/lg/xl`: 4/6/8/12px |
| Shadows | Card = none; dropdown/popover = supplied 0 8px 24px rgba(18,41,43,.14); modal/dialog = supplied 0 16px 48px rgba(18,41,43,.20) |
| Dimensions | Control/button/input 40px; small icon button 32px; icons 16/20px; table header/row/compact 44/56/44px; sidebar 248px; top bar 72px; content maximum 1440px |

| Typography role | Weight | Size / line height |
| --- | --- | --- |
| page-title | 700 | 34 / 40px; letter spacing -0.02em |
| eyebrow | 700 | 11 / 16px; letter spacing 0.16em |
| page-subtitle, body, control | 400 | 14 / 20px |
| card-title | 600 | 16 / 24px |
| card-subtitle | 400 | 13 / 20px |
| label | 500 | 13 / 20px |
| button | 600 | 13 / 20px |
| helper | 400 | 12 / 16px |
| nav | 500 | 15 / 22px |
| table-header | 600 | 11 / 16px; letter spacing 0.06em |
| table-cell | 400 | 13 / 20px |
| table-id | 500 | 12 / 16px; mono family |

### Actual statuses and deferred mappings

This inventory records existing labels/codes, not new business statuses. No runtime mapping is introduced in Phase 1. Existing approved StatusBadge mappings remain authoritative; neutral fallback for unmapped values is provisional and does not imply approval of their eventual tone.

| Area | Existing values or labels | Future visual decision |
| --- | --- | --- |
| Employees/history | Active, Terminated | Approved success/danger; keep existing filter terminology |
| Salary components/accounts/financial years | active/inactive or boolean Active/Inactive | Approved success/neutral; preserve backend values |
| Organizations | Raw API status; active, pending, inactive occur in platform workflow | Normalize presentation only in a later shared component; never change stored values |
| Payroll review/eligibility | Needs Review, Ineligible, Not Processed | Neutral foundation until tones are approved |
| Payroll run/submission | Draft, Submitted; row Paid | Existing approved neutral/info/success |
| Payment | Not Paid, Payment Pending, Paid; generic Pending remains in the approved reference map | Compound payment-state tones need approval; no transfer is implied by submission |
| Tax calculation codes | not_configured, disabled, not_calculated, estimate_saved, calculated | Neutral foundation until tones are approved |
| Tax calculation labels | TDS not configured; TDS disabled; Not calculated; Estimate saved — recalculate after input changes in Income Tax/TDS.; Calculated | Preserve server-provided labels; do not shorten or reinterpret |
| Tax configuration publication | Published; Unpublished / superseded | Neutral foundation until tones are approved |
| Tax profile UI mode | Editing; Saved · Read-only | UI state, not a new stored status; visual treatment deferred |
| Withholding explanation | Payment Pending; submitted allocations are not confirmed withholding | Preserve explanatory text; treatment deferred |
| Other approved reference states | Approved, Completed, Processed, In Review, Processing, Scheduled, On Hold, Expiring Soon, Rejected, Expired, Failed, Overdue, Archived, Cancelled | Reference mappings only; this list is not evidence that each occurs in current screens |

### Deferred work and preservation

- No Employees pagination implementation was found. Do not add pagination as styling work.
- Date pipes and styling are deferred. Preserve timestamp/time-only requirements, UTC conversions, America/Chicago lifecycle dates, stored dates, payroll periods and native date controls.
- PDF formatting, services and calculation utilities are excluded. PDF Noto Sans remains unchanged.
- Shared components, status mapping implementation, token adoption, new lint tooling, icon migration and all later phases require separate tasks. DS-011 remains unapproved.

## Phase 2a utility contract

All implementations are standalone under `src/app/shared/ui/pipes/`. Import `PsInrPipe`, `PsInrInputDirective` or `PsDatePipe` in a future approved standalone component's `imports`. No current screen imports them. No component-library document exists in this repository; this section is their canonical usage reference.

### `psInr` — display only

```html
{{ amount | psInr }}
```

- Supports finite JavaScript numbers in rupees. No string coercion. Null, undefined, non-finite numbers and invalid runtime types return `—`.
- Nonzero whole numbers omit decimals; zero and fractional values display exactly two decimals. Negative values use Unicode minus before ₹; negative zero displays `₹0.00`.
- Examples: 1000000 → `₹10,00,000`; 75000 → `₹75,000`; 125500.5 → `₹1,25,500.50`; 0 → `₹0.00`; 0.5 → `₹0.50`; -4500 → `−₹4,500`.
- Values with more than two fractional digits are rounded for display by Angular's currency formatter (12.345 → `₹12.35`); the numeric source is never rewritten. This is the documented display convention, not financial rounding or a calculation utility.
- `inr-format.ts` registers existing en-IN locale data so isolated imports work without app bootstrap. It shares formatting between pipe and directive. Global LOCALE_ID is not changed.

### `psInrInput` — opt-in editable numeric binding

```html
<input type="text" inputmode="decimal" psInrInput [formControl]="amountControl">
<input type="text" psInrInput name="amount" [(ngModel)]="amount">
```

- `ControlValueAccessor` separates the displayed string from a `number | null` model. Both reactive and template-driven bindings are supported; updateOn blur, disabled state and touched/dirty semantics are retained.
- Intended for explicitly opted-in **text** inputs. Omitted inputmode defaults to decimal; an existing inputmode is retained. Native number/date/etc. types fail fast rather than being silently converted. A number input cannot display ₹ or grouping.
- On focus, shows the original numeric string. During typing/deletion/composition, does not rewrite text or move the cursor. On blur, shows ₹ and Indian grouping without emitting a second model change. Programmatic writes and resets update the display without calling onChange.
- Ordinary decimals show at least two fractional digits when nonzero; extra represented fractional digits are retained (125500.505 → `₹1,25,500.505`) to avoid hiding precision in an editable value. Nonzero whole numbers omit decimals; zero is `₹0.00`.
- For extreme model values (more than 20 decimal places or magnitude at least 1e21), retains the model's scientific notation prefixed with ₹ instead of introducing formatting precision loss. Focus/blur never changes those values. Exponent notation is not accepted as newly typed currency syntax.
- Plain decimal typing supports optional sign, leading zeros, `.5` and trailing decimal points. Clearing emits null, not zero. Invalid/incomplete/overflowing/precision-losing input emits null and retains the user's text for correction. It never accepts a numeric prefix from malformed text, clamps, calculates, or silently rounds.
- Pasted currency symbols, separators, exponent notation and malformed grouping are rejected; grouping is a blur display feature, not accepted edit syntax. Invalid optional fields have the same null model as empty fields; this directive is not a validator and does not add an invalid-syntax error. Existing required and numeric validators remain the caller's authority.
- No validators are added, removed or replaced. Adoption into an existing native number field needs a later explicit review: type-specific native constraints and template-driven min/max behaviour must not be lost when choosing a text control. This phase changes no existing form or validator.
- Ordinary JavaScript Number precision still applies to programmatically supplied models; precision already lost upstream cannot be recovered. Typed decimal values that would change when converted to Number are rejected rather than rounded.

### `psDate` — calendar-aware display only

```html
{{ calendarDate | psDate }}
{{ payrollMonth | psDate }}
{{ timestamp | psDate:'UTC' }}
```

| Input | Behaviour |
| --- | --- |
| Strict `YYYY-MM-DD` | Validates the actual calendar date, years 0001–9999; returns `dd MMM yyyy` without interpreting it as an instant or applying timezone offsets |
| Strict `YYYY-MM` | Validates the month; returns `MMM yyyy`, without displaying an invented day or treating it as a timestamp |
| ISO timestamp with `T`, optional seconds/milliseconds and optional Z/numeric offset | Returns `dd MMM yyyy`; retains the instant's existing offset semantics; no forced UTC conversion |
| ISO timestamp without a timezone | Preserves Angular's ambient local interpretation |
| Valid Date / finite epoch milliseconds | Formats the instant without modifying it; zero epoch is valid |
| Null / undefined / empty / invalid date / unsupported type | Returns `—` safely |

The optional second argument uses the same timezone syntax as Angular's DatePipe (e.g. UTC, +0530, -0600); it applies to timestamps/Date/epoch inputs, never to calendar-only values. When omitted, honours DATE_PIPE_DEFAULT_OPTIONS.timezone, otherwise the existing local timezone. It does not add an IANA-zone conversion layer or alter lifecycle America/Chicago rules. Non-ISO human/numeric date strings and payroll-period calculations are outside this utility. `en-US` supplies three-letter month names, including Sep. No date storage, UTC conversion utility, date validator, picker or native input is changed.

### Inspection and reuse

Existing Angular CurrencyPipe/DecimalPipe/DatePipe and en-IN registration were inspected. The new display utilities reuse Angular's formatting functions rather than reimplementing financial formatting. Existing statutory currency previews, payrollCurrency (which takes paise), annual/monthly report code, PDF date/font formatting, payroll-calendar month choices and lifecycle timezone helpers remain untouched: they have different responsibilities and cannot be migrated during a utility-only phase.


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


### Phase 4G implementation under visual review

Run Payroll adopts the existing DataTable with the optional naturalWidth presentation input, preserving intrinsic content width while avoiding a forced minimum wider than the available desktop space. Shared component defaults and all approved screens remain unchanged. See PHASE_4G_REPORT.md for validation and the approval gate; this implementation is not automatically approved.


## Phase 4G dropdown styling - DS-012 PROPOSED

The 02 November 2026 dropdown handoff supersedes the preceding native-only remediation for visual review. Phase 4G remains OPEN. This is a proposed dropdown standard, distinct from the existing approved DS-012 shell correction; that historical decision is preserved.

Tier A: all existing short/static native selects remain native and receive the shared ps-select class. PsFieldControl applies the class automatically; legacy native controls opt in through markup. One Lucide chevron background image replaces browser decoration, with 16px box, 12px inset inside the border and 36px trailing padding. Native menus remain OS-owned; no base-select enhancement is used.

Tier B: the reusable PsSelect CVA on the existing Angular CDK overlay is first adopted by Run Payroll Pay Period, whose 12-option list requires a styled scrolling panel. Existing command menus are not form selects and are not repurposed. The original period model, YYYY-MM values, option list, disabled binding and changePeriod handler remain. No other native control is converted. Future adoption requires an existing custom, searchable, multi-select or long-list need; no search, multi-select or clear feature is added here.

Both tiers use 40px height, existing typography, borders, radius and focus/error states. Form controls fill their column; inline filters use the proposed 160-280px range. The existing compact FormField input now uses those width bounds and stays 40px; at 390px it fills its container. Panel class ps-select-panel owns all menu styling: 36px rows (44px on coarse pointers), selected tint/weight and one existing Lucide check, thin scrollbar, 296px maximum height, up to 360px width and viewport bounds. Options can wrap to two lines. The selected/active row scrolls into view. The CDK layer and native popover top layer are reused without a new z-index; within a modal, CDK attaches the popover under the dialog to avoid inert body siblings.

Canonical proposed tokens in paystream-tokens.css: surface-selected (#e6eee8), option-height (36px), option-height-touch (44px), menu-max-height (296px), menu-max-width (360px), select-filter-min (160px), select-filter-max (280px). The handoff calls these five tokens but enumerates seven; all seven are recorded as PROPOSED. select-scrollbar-width (6px) and centralized chevron/calendar SVG image variables are supporting proposed implementation tokens. Font, existing palette and existing dimension tokens are preserved.

Shared native date styling uses a Lucide calendar in the same icon position while retaining the original clickable browser indicator and ISO value/model. Native editable date text is locale-controlled; DD MMM YYYY and native calendar-panel theming cannot be guaranteed without replacing the implementation, which is outside this authorization. ChoiceControls, radio and switch rules are not redesigned or matched by the new select/date rules. See PHASE_4G_REPORT.md for measurements, tests, browser limitations and evidence. No claim of visual approval is made.


## Product-wide Enhanced Dropdown Menu Adoption - Phase 4G

The Product Owner's 02 November 2026 remediation accepts the existing Run Payroll open menu as the product-wide visual reference. This supersedes the previous short-native-list menu exception. It does not close Phase 4G or approve the final product-wide adoption automatically.

Every ordinary application single-select now opens the same existing PsSelect CDK portal and ps-select-panel option styling. PsNativeSelect adapts the original native select through PsFieldControl's host directive; legacy standalone fields opt in with psSelectMenu and import that same directive. The native element, closed dimensions/arrow, options, Angular value accessor, names, validators, model values and original event handlers remain authoritative. The adapter passes native option values unchanged through the original input/change events so Angular can decode ngValue null/object values. It adds no alternate trigger, hidden form input, replacement CVA, new panel stylesheet, token or dependency. PsSelect's optional origin input lets this adapter reuse the approved panel while Pay Period retains its existing component and behavior.

Options and disabled/dependent state are read from the original select. Dynamic option changes are observed; model resets and writes synchronize without emitting changes. Selected/active scrolling, keys, outside-click/Esc/resize closing, viewport positioning and modal layering reuse PsSelect. The closed-field, date, checkbox/radio/toggle, button, card, table and layout styles are unchanged.

Exceptions: Employee Details Country is an editable free-text input with native datalist suggestions, not a select-only control. Preserve its arbitrary valid text and native editable-combobox behavior. Existing CDK action menus remain command menus; do not impose select-option/check semantics on them. No application searchable/multi-select dropdown, optgroup or multi-row select was found. The adapter conservatively retains native behavior for multiple, grouped and multi-row selects rather than losing their semantics; these are not current application select exceptions. Do not add nonexistent Status/State/Employment Type dropdowns.

Inventory, before/after captures, exact closed-field comparisons, integration tests and the six-failure browser baseline comparison are retained in PHASE_4G_REPORT.md and artifacts/phase4g-product-dropdowns. All 23 select templates (22 native plus existing Pay Period) use the shared menu. Phase 4G remains OPEN pending explicit Product Owner visual approval; Phase 4H has not started.


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
