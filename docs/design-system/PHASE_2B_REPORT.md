# Phase 2b — Shared UI components

**Phase 2b: Completed.** Date: 01 Nov 2026. No Phase 3 work or screen adoption. Branch: `main`; no stage, commit or push.

## A. Component inventory

| Standard | Status | Implementation |
| --- | --- | --- |
| Button | Implemented/tested | Native `button[psButton]` with four approved variants, optional action icon, leading/trailing placement, loading/disabled/type and tooltip support |
| IconButton | Implemented/tested | `ps-icon-button`; approved centralized action glyph, required accessible label, two sizes, shared tooltip and disabled handling |
| PageHeader | Implemented/tested | `ps-page-header`; hierarchy, breadcrumb/actions projection, approved responsive breakpoint |
| Card / Widget | Implemented/tested | `ps-card`; title/subtitle/actions/body/footer slots, loading and empty states without destroying drafts |
| FormField | Implemented/tested | `ps-form-field` plus `PsFieldControl`; native control projection, existing validation-state display, required mark, information tooltip and helper/error linkage |
| DataTable | Implemented/tested | `ps-data-table`; caller-owned table, optional toolbar/footer, loading with eight decorative rows, empty state, scroll region and cell conventions |
| StatusBadge | Implemented/tested | `ps-status-badge`; one approved map; raw neutral fallback for unapproved values; no tone override or business-state changes |
| SidebarNav | Implemented/tested | `ps-sidebar-nav` plus `PsNavItem`; projected brand/groups/links/icons, active/native disabled styles; no routing/auth/visibility logic |
| Tooltip | Implemented/tested | `psTooltip`; CDK overlay, text-only, delayed hover/immediate focus, hoverable panel, Escape/dismissal, positioning and cleanup |

## B. File inventory

All nine standards have individual spec files. Files newly created under `src/app/shared/ui/`:

- `ps-button.ts`, `ps-button.scss`, `ps-button.spec.ts`
- `ps-icon-button.ts`, `ps-icon-button.spec.ts`
- `ps-page-header.ts`, `ps-page-header.scss`, `ps-page-header.spec.ts`
- `ps-card.ts`, `ps-card.spec.ts`
- `ps-form-field.ts`, `ps-form-field.scss`, `ps-form-field.spec.ts`
- `ps-data-table.ts`, `ps-data-table.scss`, `ps-data-table.spec.ts`
- `ps-status-badge.ts`, `ps-status-badge.scss`, `ps-status-badge.spec.ts`
- `ps-sidebar-nav.ts`, `ps-sidebar-nav.scss`, `ps-sidebar-nav.spec.ts`
- `ps-tooltip.ts`, `ps-tooltip.spec.ts`
- `ps-icon.ts`, `action-icons.ts`, `LUCIDE-LICENSE.txt`, `index.ts`

Other created files:

- `src/styles/_breakpoints.scss`: approved 960px Sass-only PageHeader breakpoint; emits no CSS itself.
- `docs/design-system/PayStream-Component-Library.md`: API, usage, token, accessibility and design-decision reference.
- `docs/design-system/PHASE_2B_REPORT.md`: this report.

Pre-existing files modified during this task:

- `src/styles/_tokens.scss`: 21 additional definition-only tokens extracted from approved reference dimensions/behaviour and existing spinner timing. Existing values remain unchanged; total 174 unique properties.
- `docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md`: Phase 2b implementation/compatibility decision in the changelog.
- `docs/design-system/CODEX_PROMPTS.md`: approved Lucide compatibility approach, DataTable/Sidebar scope and library API reference.

The Phase 1 `angular.json` change and setup/foundation files were already unstaged/untracked at task entry. They were preserved. Phase 2a files and reports, AGENTS.md, original styles.css, all existing components/styles/templates, package.json and package-lock.json remain unchanged during this task.

## C. APIs and reuse

Complete inputs, projection slots, intended usage and constraints are in `PayStream-Component-Library.md`. Public exports are in `shared/ui/index.ts`; individual imports also work. There are no synthetic data/save/navigation outputs. Native handlers and projected controls remain caller-owned.

Existing ProfileCard, InformationTip, ActionIcon, dialogs, tabs and screen-local buttons/tables were inspected. None was an equivalent implementation of the required complete API and visual standard: the existing card lacks subtitle/footer/loading slots and has a resting shadow; existing info tips use a light panel and a dedicated info button. Extending their active styles would change existing consumers, forbidden in this phase. They remain untouched legacy components for a later approved adoption. CDK overlay/portal infrastructure, Angular Forms and native control semantics are reused.

The existing psInr/psInrInput/psDate utilities are exported and used unchanged in isolated table/form integration tests. Currency formatting is never automatically installed on a native number input. The wrapper neither replaces accessors nor registers validators.

No preview route existed. Rather than modify application routing, nine isolated Angular test hosts demonstrate component rendering, projection, forms and states. No separate application or navigation entry was created.

## D. Design compliance

- Shared palette, semantic status, type-role, spacing, border/radius, focus, shadow and dimension tokens are used consistently. No new colours or visual variants were invented.
- New component SCSS and all inline style blocks were parsed/audited: no literal hex colours, pixel dimensions or font-size values; all custom-property references resolve.
- Added token definitions cover missing approved focus, icon, tooltip, badge, choice, toggle, tick and table dimensions. The 800ms spinner timing reuses the application's existing convention. The sole media-query breakpoint is centralized as a Sass token because CSS custom properties cannot be media-query conditions.
- The provided component stylesheet remains unimported, including its global body rule. Components use emulated encapsulation; projected table/control/nav rules are anchored to the component host. No body/html/reset selector is introduced.
- Save uses check, Edit pencil, Delete trash-2; the complete approved action map is centralized. Save in forms remains label-only by default. Delete placement, one-primary hierarchy and Cancel/Save ordering remain governed by the design reference and caller composition; the library never moves or rewires controls.
- Known statuses use only approved tones; unknown payroll/tax/publication/payment labels render neutral/raw. No stored status, transition or workflow changes.
- Native button keyboard semantics, icon accessible names, aria-busy, focus styles, native disabled behaviour, label/control association, preserved description IDs, current-page nav state, labelled table scroll regions and tooltip Escape/focus/hover cleanup are covered.
- The field wrapper is not a validator or input implementation. Existing control values/validators remain intact, including native number/date/select/checkbox/radio/textarea/switch types and separately opted-in psInrInput.

### User-approved icon compatibility exception

The npm registry's `lucide-angular@1.0.0` declares Angular 13–21 peers. npm rejected installation against Angular 22. No force/legacy-peer-deps option was used and manifests remain unchanged.

The user explicitly chose **“Use licensed Lucide SVG glyphs”**. Twelve approved action glyphs were extracted from the official package archive with its full ISC/Feather notices. Only static glyph data and license are vendored, not Angular wrapper code. PsIcon renders through Renderer2 without innerHTML or an added library. The upstream rename of more-vertical to ellipsis-vertical retains the same vertical-dot action glyph. No existing screen icon was changed.

## E. Validation

| Check | Result |
| --- | --- |
| New component suite | 59 tests across 9 spec files pass in the full run |
| Full unit suite | 48 test files, 411 tests passed; zero failed/skipped |
| Production build | Passed; unchanged application JavaScript hashes, added token definitions only in global CSS |
| Browser regression | `npm run test:browser -- indian-format-search.spec.ts`: 4 passed, zero failed/skipped |
| Style audit | All component SCSS compiles; inline/external styles have no hard-coded hex/px declarations; references resolve against 174 unique tokens |
| Existing file preservation | Snapshot hashes show only the three intended existing files changed; all existing app sources, Phase 2a utilities, validators, configs/manifests and tests preserved |
| Existing emitted global rules | PostCSS syntax tree identical to baseline after removing added :root definitions |
| Existing production JavaScript | Every baseline chunk name and SHA-256 hash identical |
| Git whitespace | `git diff --check` passed |
| Backend repository | Clean status; no backend writes |

The production build retains the prior initial/component-style budget and PDF CommonJS warnings. Initial size is 786.40kB versus 785.95kB in Phase 2a, solely due to additional root token definitions. No new dependency or business bundle code is loaded.

During implementation, test-host mutation checks needed an explicit eager/default fixture strategy under Angular 22. Existing tests and expectations were not altered. The tests also verify projection preservation and ordinary boolean-attribute/loading semantics. A possible collision with the app's global `.error` notice class was removed by naming the wrapper state `ps-field-error`.

The browser check validates existing screens, not an adopted component library; new component behaviour is covered in isolated Angular tests. No exhaustive visual/accessibility certification is claimed. The full historical 65-test browser suite was not repeated; the seven baseline failures and intermittent PDF timeout documented in Phase 1 remain outstanding and are not claimed fixed.

## F. Functional preservation and strict review

Existing screens, templates, component styles, click/submit handlers, forms, validators, routes, menu visibility, authentication/authorization, organization isolation, backend/API/database contracts, employee workflows, salary/CTC/Gross/EPF/EPS/ESI/TDS/Net Pay calculations, payroll periods, payment dates, Run Payroll, Pay Checks and PDFs are unchanged.

No service, model, API client, guard, resolver, route, environment, business utility or business test expectation was modified. No pagination, sorting, filtering, selection or new workflow was introduced. The only new utilities are presentation components, static icon data and styles. No existing templates require a money/date/status or icon migration review in this phase.

Reject-table review: no protected changes, new font, competing icon library, local screen redesign, workflow logic or hard-coded component colour/size was introduced. Per-screen consistency checklist is N/A because no screen was changed; UI-only and no-local-redesign requirements pass. Component hierarchy/placement requirements are documented for future adoption, not falsely reported as verified across current screens.

## G. Outstanding design decisions and limitations

- Unapproved Needs Review/Ineligible/Not Processed/payment/tax calculation/publication mappings remain neutral; proposals are recorded in the library document, not implemented. The same raw value always receives the same treatment.
- Module-to-icon mappings beyond the approved action map require a decision; no new module glyph was assigned. Existing navigation remains authoritative.
- Collapsed navigation is not in the approved existing product, so no collapse control or state is added.
- Custom searchable select internals, richer error/popover widgets and any additional layout variants require separate design/adoption work. Existing custom controls can be projected without replacing their CVA, search logic or validation.
- aria-disabled on a projected link is a visual/accessibility state, not permission logic; its existing caller must retain prevention behaviour. Disabled native controls remain native.
- Card slot marker directives must be imported with the card. Primary-action counts, form button order, table-column order, selection existence and status business meaning remain caller responsibilities governed by the design system.
- No existing screen adoption and no Phase 3 work are authorized by this report. Await explicit approval.

## H. Git review

Reviewed tracked and untracked changes, not just main...HEAD (there are no new commits). Entry snapshots distinguish earlier untracked work from this phase's files. No user changes were reverted, no destructive Git operation used, and no files were staged, committed or pushed.
