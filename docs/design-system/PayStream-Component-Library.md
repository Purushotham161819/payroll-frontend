> Current status - 03 November 2026: Phases 1 through 4H are complete and approved, including Phase 4G shared dropdowns and Phase 4H Pay Checks. Phase 4I Dashboard is deferred. Earlier OPEN/pending statements below are historical; the final approval registry supersedes them.

# PayStream shared UI library — Phase 2b

**Approved reference implementation:** the corrected Employees pilot was visually approved on 01 Nov 2026. Preserve that screen except for genuine identified defects. Subsequent modules must use these shared standards consistently with `PAYSTREAM_DESIGN_SYSTEM.md`; do not create competing module-specific visual patterns or change business functionality. Phase 4 remains on hold until explicit user instructions.

Phase 3 remediation correction: token values now have one browser-compatible source, `src/styles/paystream-tokens.css`. The original CSS global entry imports it, the SCSS entry uses that CSS entry, and `_tokens.scss` forwards it for Sass compatibility. This fixes missing token values in builds still running with the original CSS entry; do not restore the duplicate SCSS/global import arrangement.

The nine standards below are standalone Angular components/directives in `src/app/shared/ui/`. Import only what an approved screen uses, directly or through `shared/ui/index.ts`. Phase 3 adopts the relevant components on Employees only. There is no demo route or navigation change; component test hosts remain isolated demonstrations.

The supplied `_ps-components.scss` is an unimported reference. Its body rule, broad selectors and literal dimensions are not copied globally. Styles are encapsulated; projected native controls/tables/navigation use selectors explicitly anchored to the new component host. No service, data model, route, validator, request or calculation belongs in this library.

## Inventory and APIs

| Standard | Selector/export | Inputs / projection / behaviour |
| --- | --- | --- |
| Button | `button[psButton]` / `PsButton` | `variant`: primary (default), secondary, ghost (tertiary/text), danger (destructive); `type`: button (default), submit, reset; `disabled`, `loading`, optional `loadingLabel`, optional `icon: PsAction`, `iconPosition`: start/end; exposed `psTooltip`. Uses the native button and caller's `(click)`, no synthetic activation output |
| IconButton | `ps-icon-button` / `PsIconButton` | Required `action: PsAction` and nonempty `label`; `size`: md (40px) or sm (32px); `disabled`. Native inner button; normal click bubbles to a caller's handler. Label is the accessible name and tooltip text. Disabled button gets a focusable tooltip wrapper; it does not activate |
| PageHeader | `ps-page-header` / `PsPageHeader` | Required `title`; optional `eyebrow`, `subtitle`; slots `[breadcrumbs]` and `[pageActions]`. Projects existing links/actions without configuring routes or hierarchy automatically. Actions wrap below the heading at the approved 960px breakpoint |
| Card / Widget | `ps-card` / `PsCard` | Slots `[cardTitle]`, `[cardSubtitle]`, `[cardActions]`, default body, `[cardFooter]`; import corresponding `PsCardTitle`, `PsCardSubtitle`, `PsCardActions`, `PsCardFooter` marker directives. Controlled `loading`, `empty`, `loadingLabel`, `emptyLabel`. No data fetch, edit/save/discard logic or new layout variant |
| FormField | `ps-form-field` / `PsFormField` | Required `label`; `helper`, `info`, `required` (visual mark only), `errorText` from existing validation messages, optional `control: AbstractControl`, `controlId`, `choice`. Project existing controls with `PsFieldControl` (`psFieldControl`) for native styling and automatic ID/ARIA linkage |
| DataTable | `ps-data-table` / `PsDataTable` | Required accessible region `label`; controlled `loading`, `empty`, labels; slots `[tableToolbar]`, default caller-owned native `table.ps-table`, `[tableFooter]`. Presentation only: no columns/data source/sort/filter/page/selection model |
| StatusBadge | `ps-status-badge` / `PsStatusBadge` | Required raw string `status`; approved mappings are centralized, case-insensitive for known values; unknown values remain neutral with the raw label. No tone override, transitions, interactive state or business mutation |
| SidebarNav | `ps-sidebar-nav` / `PsSidebarNav`; `a[psNavItem],button[psNavItem]` / `PsNavItem` | `label` defaults to Main navigation; `[navBrand]` projection; caller-supplied groups `[navGroup]`, `[navGroupLabel]`, icons, links/buttons and `[navLabel]`. `PsNavItem.active` adds visual active state and aria-current. No routes, auth, visibility, menu items or collapsed workflow |
| Tooltip | `[psTooltip]` / `PsTooltip` | String text. Existing CDK overlay positions above the trigger with below fallback near viewport edges. 300ms hover; immediate keyboard focus; Escape/blur/leave and destroy cleanup. Text-only, noninteractive and hoverable. Preserves existing aria-describedby IDs and does not intercept clicks |

All state inputs are controlled by the caller. Existing form validity, events and model values remain authoritative. No output introduces a new workflow; use existing native handlers and projected content.

## Usage examples (not adopted into screens)

```html
<ps-page-header title="Employees" eyebrow="People Management" subtitle="Employee directory">
  <div pageActions>
    <button psButton variant="secondary" (click)="existingRunHandler()">Run Payroll</button>
    <button psButton icon="add" (click)="existingAddHandler()">Add Employee</button>
  </div>
</ps-page-header>

<ps-card>
  <span cardTitle>Employment information</span>
  <span cardSubtitle>Current saved details</span>
  <ps-icon-button cardActions action="edit" label="Edit" size="sm" (click)="existingEditHandler()" />
  <!-- Existing view content or existing reactive form controls -->
  <div cardFooter>
    <button psButton variant="secondary" (click)="existingCancelHandler()">Cancel</button>
    <button psButton [loading]="saving" loadingLabel="Saving…" (click)="existingSaveHandler()">Save</button>
  </div>
</ps-card>

<ps-form-field label="Annual CTC" helper="Amount in INR" [errorText]="existingErrorMessage">
  <input psFieldControl type="number" [formControl]="existingAmountControl">
</ps-form-field>
<!-- Currency formatting is separately opted in only after reviewing native number constraints: -->
<ps-form-field label="Amount" [errorText]="existingErrorMessage">
  <input psFieldControl type="text" psInrInput [formControl]="existingAmountControl">
</ps-form-field>

<ps-data-table label="Employee directory" [loading]="loading" [empty]="rows.length === 0">
  <table class="ps-table">
    <caption>Employee directory</caption>
    <thead><tr><th scope="col">Name</th><th scope="col" class="num">CTC</th><th scope="col">Status</th><th scope="col" class="act">Actions</th></tr></thead>
    <tbody><!-- Caller-owned rows; psInr / psDate / ps-status-badge in cells --></tbody>
  </table>
</ps-data-table>
```

The examples name handlers as placeholders only. Adopting a component must retain the real existing handler, route, binding, control and workflow. Do not implement new behaviour to match an example.

## Forms, controls and accessibility

- `PsFormField` does not provide a ControlValueAccessor or Validator. `PsFieldControl` only exposes the existing native element/NgControl. No values, validators, disabled flags or dirty/touched state are changed by the wrapper.
- Required is inferred from existing `Validators.required`, or explicitly shown with the visual-only `required` input. It never installs a validator or a native required attribute. Errors are shown only when the existing control is invalid and dirty/touched; callers supply existing message text.
- Existing native IDs take precedence; otherwise the wrapper supplies a unique ID. Label `for`, helper/error IDs and aria-invalid reflect presentation state. Existing description IDs are preserved. These ARIA attributes should be owned by the wrapper when opting in rather than separately bound to conflicting values.
- Text/number/date/search inputs, native selects, textareas, checkboxes, radios and native checkbox switches are styled only when marked `psFieldControl`. Textareas resize vertically. Use `choice=true` for label-right layout; checkbox/radio native keyboard and form semantics remain unchanged. A toggle is a native checkbox with `role="switch"`, only for an existing immediate setting.
- A searchable custom select/combobox can be projected unchanged, using `control` and `controlId` to expose its existing state. Its implementation must own internal styling, keyboard and ARIA integration; this phase does not invent a second select implementation or automatically make selects searchable.
- Group labels/radiogroup semantics, existing native min/max/pattern constraints, error-message computation and submit/focus-first-error behaviour remain with the existing form. There is no generic form submission interceptor.
- Native buttons retain Enter/Space activation. Text buttons require visible labels; icon buttons require an action label, hide decorative SVGs and always include the common tooltip. For a disabled native text button's keyboard tooltip, wrap it in a focusable element carrying `psTooltip`; do not add a click handler to that wrapper.
- Tooltip panes are text-only, max 240px, placed 6px from the trigger. Escape dismisses them; hover dismissal allows movement into the pane. No links, focus traps or click interception are introduced. Rich popovers remain a different future standard.
- Table captions, th scope, row identity, row content and cell semantics remain caller-owned. The scroll region is keyboard focusable with a visible focus ring. Loading is an accessible status plus eight decorative rows; the caller's table/drafts remain mounted. `.num` aligns numbers, `.act` belongs last, `.selection` is used only for an existing selection workflow. `.ps-table--compact` is restricted to EX-001.
- Sidebar active state is caller-owned, e.g. from an existing routerLinkActive expression. Disabled buttons use native disabled. aria-disabled on links is presentation only: callers retain their existing prevention/permission rules; the library does not create or override them. No collapse toggle exists in the approved product, so none is introduced.

## Design tokens and scope

Components consume existing palette, semantic status colours, typography role shorthands, spacing, border/radius, shadows and dimensions. `src/styles/_tokens.scss` adds definition-only tokens extracted from the approved reference: focus width/offset, stroke width, tooltip size/gap/delay, badge/choice/toggle/tick dimensions, table action/selection widths, round radius and loading-spinner duration (the existing application's 800ms convention). Existing token values are unchanged.

`src/styles/_breakpoints.scss` holds the approved Sass-only 960px page-actions breakpoint, because CSS custom properties cannot be used in media-query conditions. New component SCSS has no hex colours, literal pixel dimensions or typography sizes. SVG coordinates are licensed drawing data, not CSS layout tokens. The original component stylesheet remains unimported and unchanged.

Existing `ProfileCard`, `InformationTip`, `ActionIcon`, native buttons/tables, tabs and dialogs were inspected. Their APIs and styling differ from the new standard: ProfileCard lacks subtitle/footer and has a resting shadow; InformationTip is a field-info component rather than a general tooltip and uses a light panel; ActionIcon is a legacy custom path map. Changing them would affect current consumers and violate this phase's no-screen/no-existing-style boundary. They remain legacy implementations pending explicit adoption, not alternate new standards. The new library reuses native controls, Angular Forms and the installed CDK overlay/portal mechanisms.

## Icons — approved compatibility decision

The registry's `lucide-angular@1.0.0` declares Angular 13–21 peers; this application is Angular 22.2.3. Installation was rejected by npm. No force/legacy-peer-deps flag, package upgrade or new dependency was used.

**User approved in this task:** vendor only the approved Lucide SVG glyphs and license. `action-icons.ts` contains the 12 glyphs extracted from the official npm package archive, and `LUCIDE-LICENSE.txt` preserves its full license. `PsIcon` renders static SVG data through Angular Renderer2 (no innerHTML or untrusted dynamic SVG). No Lucide Angular runtime code is vendored.

| Action key | Approved Lucide glyph |
| --- | --- |
| save | check (form Save stays label-only by default) |
| edit | pencil |
| delete | trash-2 |
| view | eye |
| download | download |
| refresh | rotate-cw |
| add | plus |
| close | x |
| back | arrow-left |
| more | more-vertical; upstream package now calls the same glyph ellipsis-vertical |
| info | info |
| search | search |

This is a transport/compatibility exception, not a new icon library or icon-map change. Existing screen icons remain untouched. Delete is not a resting row icon, Save in forms is label-only, and Back normally has its label; the API supports approved glyphs but does not decide where actions are allowed. Future consumers must follow the action map's placement rules.

## Status governance and outstanding decisions

### Phase 3 composition/compatibility clarifications

- Remediation: PsIcon has intrinsic width/height 16 attributes in addition to token styling; it remains compact even when the size token is unavailable. PageHeader no longer adds top padding already owned by the page container. DataTable has the reference's 1180px minimum and a shared `.email-text` clipping treatment, reusing the approved 240px measure; full email text remains in the DOM and common tooltip.
- The user explicitly changed Employees Refresh to an icon-only 32px PsIconButton with accessible label/tooltip `Refresh List`; this supersedes the earlier labelled secondary Refresh illustration for this pilot. No refresh handler or disabled condition changed.

- `PsButton.nativeElement` exposes the physical native button for existing ElementRef-style template queries and focus restoration. Its native click/submit semantics are unchanged.

- `PsIconButton` also supports `button[psIconButton]`, with identical action/label/size/disabled inputs and appearance. It renders no nested button. This preserves native focus, CDK menu-trigger attributes, keyboard activation and focus restoration. Tooltip text defaults to the existing contextual label and can be supplied with the exposed `psTooltip` input. Native disabled elements needing keyboard explanations still require an explicit focusable tooltip wrapper.
- `PsFormField.layout` supports `stacked` (unchanged default), `inline` (existing EX-002 filter-bar standard) and `hidden-label` (accessible search labels). Projected `[fieldPrefix]`/`[fieldSuffix]` slots reserve input space for approved search/clear icons; no value accessor, validator or input handler is installed. Prefix/suffix layout and focus styling are shared, not overridden by Employees CSS.
- A Card containing a projected `PsDataTable` uses the already-specified full-width DataTable composition: no second body padding around a toolbar/table that owns its own padding. Ordinary card padding is unchanged. DataTable suppresses a footer whose sole projected child is hidden, preserving empty/loading presentation.
- `--search-width: 320px` is now centralized from the approved Employees target. Existing token values are unchanged.
- These are reusable implementations of existing standards, not new screen-specific visual variants. Consumers before Phase 3 are only isolated tests; no other module changes appearance.

Only the approved Part C status map is implemented. Active/Approved/Paid/Completed/Processed are success; Submitted/In Review/Processing/Scheduled are info; Pending/On Hold/Expiring Soon are warning; Rejected/Expired/Terminated/Failed/Overdue are danger; Inactive/Draft/Archived/Cancelled are neutral. Known labels are Title Case; unknown labels remain raw.

Needs Review, Ineligible, Not Processed, Not Paid, Payment Pending, tax calculation codes/labels and Published/Unpublished states have no newly approved mapping and remain neutral. A later proposal may consider warning for review-required states, neutral for ineligibility/not-processed, info for pending payment and success for publication/calculated states, but **none of these proposed tones is implemented or approved**. A status label must not imply a bank transfer or recalculation.

Module-to-icon mappings beyond the action map, collapsed-sidebar presentation, custom searchable-select visuals and richer loading/error widgets require a design decision before adoption. No one-off variants or business-state interpretations were invented. Per-view primary-button hierarchy and Cancel/Save ordering remain caller composition responsibilities, documented and tested through projected slots rather than enforced by moving controls in the DOM.


## Phase 4G table integration (pending visual review)

PsDataTable now exposes its existing native scroll region through nativeElement for callers preserving scroll position. Its optional naturalWidth boolean (default false) lets a caller use the table intrinsic minimum instead of forcing the standard 1180px minimum. Existing header/row sizes, spacing, typography, colors and scroll behavior remain unchanged; all current approved references keep the default. Run Payroll opts in to avoid unnecessary desktop scrolling for its ten preserved columns and uses two-line header content where needed. Smaller viewports or long values still scroll within the table. No data, sorting, filtering, pagination or navigation state is owned by this presentation option.


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
