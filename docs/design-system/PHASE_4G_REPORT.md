# Phase 4G - Run Payroll UI/UX

Date: 02 November 2026. Status: **Visually Approved and Closed**.

## Formal Product Owner approval - Phase 4G

**Visually Approved and Closed on 02 November 2026.** The Product Owner explicitly approved Run Payroll and the product-wide enhanced dropdown implementation across all **23 select templates**. Closed fields, arrows, open-menu styling and checkbox appearance are approved. Run Payroll is the eighth protected visual reference. The free-text Country datalist and command menus remain documented exceptions. Existing implementation findings, screenshots, test results and limitations (including six legacy browser failures and skipped cases) are retained below as historical evidence; earlier OPEN/not-started statements are superseded by this approval. No application source changes are made merely to record approval. Phase 4H - Pay Checks is separately authorized by the same instruction, and remains open pending its own visual approval. Do not begin Phase 4I without explicit instructions.



## Objective, audit and baseline

Adopt the approved PayStream Design System on Run Payroll, its submission confirmation/result, warning popovers and historical Pay Check viewer without changing payroll calculations, records, permissions or workflows.

Reviewed the actual frontend component/template/CSS, feature-local guide, models, service, routes, navigation context and tests, backend controller/DTO/service/calculation/persistence paths, RUN_PAYROLL, RUN_PAYROLL_ARCHITECTURE, RUN_PAYROLL_UNIFIED_UI, RUN-PAYROLL-REVIEW-FIX and current optional-TDS requirements. Reviewed design-system/component guidance and the approved phase reports/references. Historical requirements describing TDS blocking are superseded by the current optional-TDS policy; no such blocking was reintroduced.

The seven protected references are Employees, Employee Details, User Management, Organization Settings, Salary Components, Income Tax / TDS Configuration and Employee Income Tax / TDS Profile. Their screen sources are unchanged. Phase 4F was explicitly visually approved by the Product Owner on 02 November 2026 and formally closed in its existing report and governance guidance; all its findings, comparisons and limitations remain retained.

Baseline observations:

- One existing employee table combines selectable draft employees with read-only finalized rows; there is no second employee-selection panel or separate submission-history index to invent.
- Ten existing columns: selection, First Name, Last Name, Monthly CTC, Employer Contributions, TDS, Deductions, NET Pay, Payment Status and Pay Check. TDS remains separate from other employee deductions.
- Pay Period uses the configured current-calendar-year month list. Payment Date is independent of Submission Date. Existing change/dirty/disabled conditions remain authoritative.
- KPIs are existing monthly totals for the selected new draft or selected submission. Historical rows are excluded from new draft totals. Missing calculations remain unavailable rather than falsely zero.
- Selection debounce, preview/refresh, stale-input review, version/input-hash saves, draft reopening, confirmed submission, idempotency and finalized-row locks already exist.
- Existing employee links preserve payroll period/date/selection/version/context and page/table scroll where supported. No filters, pager or route were added.
- Backend currently supports Monthly payroll only. Other pay-frequency conversions are rejected; this visual phase does not add support.
- Preview, draft, submit, submission, employee-check history and persisted-PDF endpoints/contracts remain unchanged. No customer data was submitted for testing.

## Implementation and shared components

Reused PageHeader with the existing Back to Employees route, shared Back icon, native FormField controls, Card KPI/table composition, Button, IconButton, StatusBadge, DataTable, psInr and psDate. Existing descriptions and calculation guide remain; the feature-local guide now uses tokens and the approved info glyph. The period/date controls remain native dropdown/date inputs with unchanged values/events. Four existing KPI values retain their original expressions.

The table retains every column, row, total and action. Monetary cells remain right aligned with tabular figures; saved values use Indian grouping. Unknown statuses retain the shared neutral fallback; Paid and Submitted use the existing shared mappings. Payment Pending remains explicitly distinguished from disbursement. View/Download use the same approved eye/download glyphs and 32px ghost controls as the reference screens. Refresh retains its existing handler, disabled condition and aria-busy state. Save remains secondary and Submit primary; confirmation Cancel/Confirm ordering and all guards remain unchanged.

Existing warning messages are retained and deduplicated by the original logic. Their existing focus-trapped CDK popover uses the approved info/Close icons and token styling, with the existing above/below viewport fallback, backdrop dismissal and focus restoration. PDF modal content remains the existing authenticated blob; Close uses the shared icon control. No new animation was introduced; reduced-motion browser coverage exercises the workflow.

Two narrowly scoped shared DataTable APIs support the existing workflow:

1. `nativeElement` exposes the existing scroll region so existing scroll-position capture/restore still targets the actual scroll container. The Run Payroll view query changes its presentation type from ElementRef to PsDataTable; business/state methods are unchanged.
2. Optional `naturalWidth` defaults to false. Run Payroll opts in to intrinsic table width instead of forcing the standard 1180px minimum. Header content wraps onto two lines where needed. Typography, row/header heights, spacing and colors stay shared. All seven approved references retain the original default and were covered in the final browser regression.

The representative table fits 1440px and 1280px desktops without forced extra scrolling. Tablet/mobile and genuinely longer content use contained horizontal scrolling, preserving readable amounts and reachable actions. On mobile, period/date fields use full-width rows and the four KPI cards use two columns to avoid excessive vertical space. No global tokens, fonts, dependencies or approved-screen-specific styling changed.

## Files changed

| Files | Purpose |
| --- | --- |
| src/app/features/run-payroll/run-payroll.component.html, .css, .ts | Shared UI adoption, token styling and DOM query adaptation only. |
| src/app/features/run-payroll/components/payroll-guide.ts | Feature-local guide presentation; existing text/input retained. |
| src/app/shared/ui/ps-data-table.ts, .scss, .spec.ts | Optional intrinsic width and scroll-region access, with default/opt-in and existing rendering/scroll tests. |
| src/app/features/run-payroll/unified-payroll.spec.ts | Accessible selection-header text and psInr display expectations; business assertions retained. |
| e2e/run-payroll.spec.ts, e2e/unified-payroll.spec.ts, e2e/payroll-ui-refinements.spec.ts | Formatting/accessibility assertions, actual ten-column baseline and existing CDK above/below fallback. |
| e2e/run-payroll-design-system.spec.ts, e2e/run-payroll-warning-design-system.spec.ts | New four-width visual/workflow, reduced-motion, context/scroll restoration and warning evidence. |
| docs/design-system/PHASE_4F_REPORT.md, PAYSTREAM_DESIGN_SYSTEM.md, CODEX_PROMPTS.md; AGENTS.md | Formal Phase 4F approval and seven protected references; Phase 4G authorization/gate. |
| docs/design-system/PayStream-Component-Library.md | Document the shared table APIs without changing existing defaults. |
| docs/design-system/PHASE_4G_REPORT.md | This report. |

The entry hash inventory identifies exactly which existing files this task changed, independently of the extensive earlier work. All original event-handler expressions and all five native control binding/disabled/value signatures were compared and preserved. Calculation/state logic was not changed. Backend source, frontend services/models/routes, employee/profile/tax configuration logic, schemas, authentication, authorization and organization isolation are untouched.

## Validation

| Check | Baseline | Final |
| --- | --- | --- |
| Full frontend units | 416 passed, 49 files | 416 passed, 49 files |
| Initial relevant browser baseline | 6 passed; 1 existing nine-versus-ten-column assertion failed | Corrected to preserve/assert all ten existing columns |
| Supplemental baseline warning views | 4 passed | Four-width after views included in final browser suite |
| Final browser regression | - | 55 passed, covering payroll workflows and all seven protected references |
| Backend tax/payroll/employee-profile/payroll-generator | 187 passed, 2 skipped, 25 suites | 187 passed, 2 skipped, 25 suites |
| Calculation snapshots | Ten representative cases captured before runtime edits | Byte-identical complete outputs |
| Production frontend build | Existing build warnings known | Passed; initial bundle approximately 820.99 kB; existing budget/CommonJS warnings retained |

Backend runs enabled RUN_PAYROLL_MONGO_TESTS and RUN_TAX_MONGO_TESTS. Existing real MongoDB/service/API tests verify employees without TDS profiles remain processable with zero TDS, authoritative configured TDS is deducted once, mixed totals remain correct, finalized checks/PDFs are retained, concurrent submission/draft races have one winner, retries use the same idempotency key and unsupported pay frequencies remain rejected.

Two backend production-Angular browser cases remain skipped because RUN_PAYROLL_BROWSER_TESTS was not enabled. They are not counted as passing. Current frontend Edge tests mock business API responses; backend integration tests independently use actual services and isolated fixture databases. This is not a live-tenant/authentication acceptance run. Raw before/after results are retained in artifacts/phase4g-run-payroll/backend-before.json and backend-after.json.

Workflow coverage includes period/date changes, eligible selection/select-all, recalculation and busy states, exact draft payloads, save/reload, historical rows, submission confirmation/cancellation, one submission and no resubmission control after finalization, reopening the submitted result, authenticated PDF viewing/downloading and unchanged PDF bytes. The mobile test independently checks return from Employee Profile with selected IDs/date/period/table scroll restored, then uses a fresh entry to test subsequent persisted-draft reload. Existing history-state restoration intentionally takes precedence when that prior navigation context is present; it was not redesigned.

### Test findings and limits

The baseline `e2e/unified-payroll.spec.ts` expected nine headers, but the unchanged baseline already had ten including TDS. Its assertion was corrected to ten; no column was removed. Shared hidden selection-label text and whole-rupee psInr expectations were updated without changing requests, amounts or calculation assertions. The popover positioning assertion now checks either of the already-supported above/below CDK positions using the trigger bounds after browser scrolling; assuming it always opens below was invalid once the page layout changed. Refresh tooltip checks now use its accessible shared label. The final Download Pay Check PDF tooltip matches the approved Pay Checks action; the four-width payroll workflow was rerun after that label alignment. The final eight-test visual/workflow run passed all eight tests after the mobile KPI spacing adjustment and warning screenshot refresh.

Early implementation-only markup/selector failures were corrected; no unresolved new failure remains. The unrelated Statutory Deductions formatting mismatch and other limitations retained in the approved Phase 4F report were not erased or claimed fixed. The wider unrelated backend/browser catalogs were not executed. No dedicated screen-reader or physical-device audit was performed.

## Calculation comparison

Ran the unchanged actual SalaryCalculationService/annualPayroll, existing monthlyAmount/sumMoney derivation, calculateAnnualTax and applyPayrollTax using identical synthetic employees, salary structures, statutory settings and tax rules before/after. Five structures are each tested without a tax profile and with a configured tax calculation: below statutory ceiling, above ESI ceiling, decimal CTC, custom allowance/formula deduction, and high income. Complete annual/component/check outputs include Annual CTC, Gross, BASIC, DA, RA, employer EPF/EPS/ESI, existing employee deductions, TDS, allocations and NET Pay. Existing integration/unit suites independently cover employee deduction components and statutory/pay-frequency eligibility; no unsupported frequency was fabricated for the snapshot.

Representative monthly checks (before = after):

| Structure | Gross | No-profile TDS | No-profile NET | Configured TDS | Configured NET |
| --- | ---: | ---: | ---: | ---: | ---: |
| Below ceiling | 13,937.28 | 0 | 13,937.28 | 0 | 13,937.28 |
| Above ESI ceiling | 98,200 | 0 | 98,200 | 0 | 98,200 |
| Decimal CTC | 1,02,783.38 | 0 | 1,02,783.38 | 0 | 1,02,783.38 |
| Allowance/formula deduction | 98,200 | 0 | 97,200 | 0 | 97,200 |
| High income | 1,98,200 | 0 | 1,98,200 | 23,906.66 | 1,74,293.34 |

All ten complete serialized snapshots are **byte identical**, SHA-256 `e81eda7421218e33625770cf5826db219e175fb91e7a9a2924b3a0ce2a6136ff`.

Evidence: [before](evidence/phase4g-run-payroll/calculations-before.json), [after](evidence/phase4g-run-payroll/calculations-after.json), [comparison](evidence/phase4g-run-payroll/comparison.json), [runner](evidence/phase4g-run-payroll/calculation-evidence.cjs). Fixtures are regression data, not production defaults or tax/statutory guidance. No payroll formula, calculation sequence, base, rounding, salary frequency, tax rule or result changed.

## Visual evidence and responsiveness

[Screenshot directory](evidence/phase4g-run-payroll): **64 screenshots**, eight before and eight after views at each of 1440, 1280, 768 and 390px. Names follow `{before|after}-{main|kpis|employee-table|draft|paycheck-viewer|confirmation|submitted|warnings}-{width}.png`. Main views are full-page; component/modal shots provide readable detail. No synthetic mockup images were used: screenshots show the rendered Angular application with synthetic API fixtures.

| Width | Before | After |
| --- | --- | --- |
| 1440 | [Main](evidence/phase4g-run-payroll/before-main-1440.png) | [Main](evidence/phase4g-run-payroll/after-main-1440.png) |
| 1280 | [Main](evidence/phase4g-run-payroll/before-main-1280.png) | [Main](evidence/phase4g-run-payroll/after-main-1280.png) |
| 768 | [Main](evidence/phase4g-run-payroll/before-main-768.png) | [Main](evidence/phase4g-run-payroll/after-main-768.png) |
| 390 | [Main](evidence/phase4g-run-payroll/before-main-390.png) | [Main](evidence/phase4g-run-payroll/after-main-390.png) |

Main/draft/confirmation/PDF/submitted baseline screenshots were captured before runtime edits. Additional before-warning screenshots were captured by temporarily rendering the four entry-original Run Payroll files verified against entry hashes, then restoring the implementation byte-for-byte in a finally block. No existing unrelated file or approved screen was reverted. After evidence was regenerated from the final implementation. Artifacts are ignored by existing Git rules and should accompany a shared review.

Responsive checks verify no page overflow, reachable controls/actions, native field heights, readable currency and contained table scrolling. Representative desktop/mobile main, table, confirmation, viewer and warning screenshots were inspected. Native keyboard activation, labels, scoped table headers, shared focus rings, warning focus trap/Escape/backdrop restoration and modal focus behavior remain covered.

## Git safety and next steps

Entry frontend status contained 56 modified tracked paths and 18 untracked entries, including earlier phases. Final status contains 64 modified tracked paths and 20 untracked entries, including the existing work; these are not exclusively Phase 4G files. Backend remains clean. The Git index was not changed; nothing was staged, committed, pushed, reset, cleaned, discarded or switched. Full status is retained in [git-status-final.txt](evidence/phase4g-run-payroll/git-status-final.txt).

Deferred: any new payroll frequency support, history index, changed navigation-context policy, payment/disbursement workflow or business defect requires separate authorization. None was added here. The screen is ready for Product Owner visual review, not automatically approved. **Wait for explicit Phase 4G visual approval; do not begin Phase 4H.**

## Shared dropdown, date and checkbox visual remediation

02 November 2026. **Phase 4G remains OPEN.** This appendix records the focused Product Owner remediation request; the original implementation findings and validation above are retained.

### Issues, measured causes and corrections

| Issue | Investigation | Shared correction |
| --- | --- | --- |
| Oversized Pay Period / Payment Date | Both controls measured 40px high, matching the approved default, but expanded to 556px wide at 1440px. No unexpected height override was found; the normal full-width form treatment was visually too large for these operational controls. | Added a reusable, opt-in `compact` input to the existing PsFormField. These two fields now measure 32px high and at most 320px wide, using existing dimension tokens and preserving text/padding. Other forms retain their 40px default. No Run Payroll CSS override was added. |
| Dropdown arrow/menu inconsistencies | Shared fields relied on `appearance:auto`, native OS decoration and native option menus. The reference chevron styling existed only in the unimported reference stylesheet. The reported left-position arrow was not reproduced in tested Edge, but there was no shared deterministic arrow/end-padding implementation. Cross-screen inspection also identified a legacy disabled-select background shorthand in Employee Tax Profile that could erase the enhanced background arrow. | Added one shared trailing CSS chevron in the shared field wrapper with reserved end padding, independent of legacy native-control background resets. Where `appearance:base-select` is supported, CSS styles the existing native picker/options with token surfaces, border/radius/shadow, spacing, selected checkmark and hover/focus. The picker retains native top-layer positioning, keyboard selection and native values. No custom combobox or dependency was introduced. |
| Faint/missing checkbox marks | The later generic disabled-input rule replaced the checked dark fill with a pale surface while the tick remained white. Global border-box sizing also reduced the small border-drawn tick, and appearance:none had no indeterminate dash implementation. | Corrected the shared tick's content-box geometry, supplied a mixed-state dash, and retained a contrasting disabled-checked fill. Dimensions remain 18px. Hidden-label table checkboxes are centered. Forced-colors mode uses native checkbox/radio drawing. Existing checked, disabled, indeterminate, selection and validation bindings are unchanged. |

A selectable employee, an unchecked employee, the mixed select-all state, fully selected state and disabled historical checks are all covered. The disabled tick/background contrast is checked at at least 4.5:1 in real browsers. Native selection is still authoritative; CSS does not set any form value or selection state.

### Remediation file inventory

Only these files changed during this remediation, relative to the remediation entry hash inventory:

- `src/app/shared/ui/ps-form-field.ts`: optional presentation-only compact input/host class.
- `src/app/shared/ui/ps-form-field.scss`: shared compact dimensions, select/picker and checkbox state corrections.
- `src/app/shared/ui/ps-form-field.spec.ts`: verify compact opt-in preserves native control identity, value, validators and pristine/untouched state.
- `src/app/features/run-payroll/run-payroll.component.html`: opt the two existing fields into shared compact presentation; no handler changes.
- `e2e/shared-controls-remediation.spec.ts` (new): four-width payroll control, keyboard, checkbox, date, contrast and forced-colors checks.
- `e2e/shared-controls-product.spec.ts` (new): representative Employees dropdown and User Management dropdown/checkbox evidence at all four widths.
- `docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md`: reusable shared-control usage and native fallback.
- `docs/design-system/PayStream-Component-Library.md`: component contract and intended use.
- `docs/design-system/PHASE_4G_REPORT.md`: this appendix.

The existing shared components were reused. No duplicate component, custom selection implementation, new library, token palette, font, validator, date parser or value accessor was introduced. Default field height, other approved screen layouts, cards, tables, typography and buttons were not redesigned. The only Run Payroll template edits are the two compact attributes. No application business-method, service, route, API, database or backend source changed.

### Product-wide verification and evidence

Verified Employees, Employee Details, User Management, Organization Settings, Salary Components, Tax Configuration, Employee Income Tax / TDS Profile and Run Payroll through the existing protected-reference/workflow suites. Organization Settings has no relevant select/checkbox to convert; its existing field/card layout is still covered. Default form heights and existing button dimensions remain asserted in the reference tests. Representative desktop/mobile images were also inspected, including the locked employee-tax year field, enabled/disabled checks and open native select menus.

Primary evidence: [artifacts/phase4g-controls-remediation](evidence/phase4g-controls-remediation). There are **86 primary PNGs**: before/after field and menu views at 1440, 1280, 768 and 390px, payroll checkbox states, representative Employees and User Management controls, plus native date-picker invocation and forced-colors captures. **46 additional Chrome PNGs** are retained in its `chrome` subdirectory. Measurements are in `{before|after}-metrics-{width}.json`.

| Evidence | Before | After |
| --- | --- | --- |
| Pay Period, desktop | [Field](evidence/phase4g-controls-remediation/before-period-1440.png) | [Field](evidence/phase4g-controls-remediation/after-period-1440.png) |
| Open dropdown, desktop | [Menu](evidence/phase4g-controls-remediation/before-open-period-1440.png) | [Menu](evidence/phase4g-controls-remediation/after-open-period-1440.png) |
| Payment Date, mobile | [Field](evidence/phase4g-controls-remediation/before-date-390.png) | [Field](evidence/phase4g-controls-remediation/after-date-390.png) |
| Payroll checkbox states | [Table](evidence/phase4g-controls-remediation/before-checkboxes-1440.png) | [Table](evidence/phase4g-controls-remediation/after-checkboxes-1440.png) |
| Employees dropdown | [Menu](evidence/phase4g-controls-remediation/before-employees-options-390.png) | [Menu](evidence/phase4g-controls-remediation/after-employees-options-390.png) |
| User Management controls | [Form](evidence/phase4g-controls-remediation/before-users-controls-390.png) | [Form](evidence/phase4g-controls-remediation/after-users-controls-390.png) |

Additional filenames use `all-selected`, `mixed-selection`, `users-options`, `employees-status`, `date-picker` and `forced-colors`. Before-product evidence was rendered from exact entry-byte shared styles/component/template, verified by hashes, then the implementation was restored in a finally block. Screenshots use synthetic API fixtures and the actual rendered app. All artifacts are ignored local review evidence; preserve the directory when sharing the report.

### Remediation validation

| Check | Actual outcome |
| --- | --- |
| Final complete frontend unit suite, including shared controls | **417 passed, 49 files**. |
| Baseline control/product browser evidence | **8 passed** after correcting a new test fixture assumption and waiting for the existing selection debounce. |
| Edge full payroll/protected-screen/control regression | **63 passed**. |
| Installed Chrome focused control/product regression | **8 passed**. |
| Backend tax/payroll/profile/generator regression | **187 passed, 2 opt-in browser cases skipped, 25 suites**. |
| Payroll comparison against original Phase 4G baseline | **Ten complete snapshots byte identical**; SHA-256 `e81eda7421218e33625770cf5826db219e175fb91e7a9a2924b3a0ce2a6136ff`. |
| Production frontend build | **Passed**, initial bundle approximately 824.40kB. Existing budgets were not raised. |

Control tests open the native period dropdown, verify visible selected-option presentation and viewport containment, select by Space/Home/Arrow/Enter, check the resulting period, change native date values and verify displayed/model values, toggle individual/all employees, wait for the existing debounced preview, check mixed selection and preserve disabled finalized checks. They exercise default 40px fields on other screens, compact 32px fields on payroll, forced-colors drawing and checkbox contrast. All tests use native events and the original handlers. No payroll was submitted or draft saved by the new control tests.

The native date picker is invoked through the original native input's indicator and `showPicker()` after a trusted click. Date selection is verified through native keyboard date-segment editing and the original date field; no custom calendar or injected business handler is used. The OS/browser calendar panel is not reliably present in headless page screenshots, so the captures do not claim calendar-cell visual verification. Existing end-to-end payroll tests separately cover dates through saving and submission.

The first implementation build exceeded the existing 8kB shared component style limit by 95 bytes. Duplicate checkbox rules were consolidated rather than changing budgets or removing states. The final shared stylesheet remains below the 8kB error threshold, with its size warning retained. Bundle/component warning budgets and existing PDF CommonJS warnings remain visible. This is a resolved implementation-time build failure, not an all-clear warning-free build claim.

A concurrent verification run timed out two existing tax unit tests at their unchanged five-second limits. After browser jobs finished, the unchanged complete suite was rerun alone and passed all 417 tests. No timeout or assertion was relaxed.

Initial new evidence tests incorrectly looked for Account active in Edit User; the existing field belongs to Add User. The test was corrected without changing User Management. A baseline selection test also needed to wait for the existing 180ms asynchronous selection/preview cycle. Those fixture/timing issues were corrected without weakening calculation or request assertions. An intermediate disabled-select cascade correction overrode the native picker appearance; browser visibility assertions caught it. The final chevron is drawn in the shared wrapper instead of the native control background, avoiding both legacy background conflicts and suppressed gradient images in forced-colors mode. Native picker appearance remains controlled by its supported rule, and verification was rerun. This was an introduced-and-resolved CSS issue, not a pre-existing failure. Earlier known limitations in the original Phase 4G and approved Phase 4F reports remain recorded and were not claimed resolved.

Backend results are retained in `backend-after.json`; comparison inputs/results and `comparison.json` are in the same evidence directory. Existing real MongoDB tests use isolated databases and verify zero TDS without a profile, authoritative configured TDS, immutable finalized checks/PDFs, payroll totals and duplicate/idempotency safeguards. No customer records were edited. RUN_PAYROLL_BROWSER_TESTS was not enabled; the two skipped backend browser cases are not counted as passed. Frontend business APIs are mocked, so this is not a live-tenant authentication/authorization acceptance run.

### Remaining boundaries and Git safety

Native select-menu polishing is a progressive enhancement. Tested Edge and installed Chrome support the native customizable picker; browsers without `appearance:base-select` retain their OS option-menu appearance while receiving the corrected closed-field arrow. Firefox/Safari were not available for this verification and are not claimed tested. Native date-picker panel theming remains browser/OS owned. No searchable dropdown, new tax rule, business validation or unsupported pay-frequency behavior was added. No dedicated screen-reader audit was performed.

Entry Git status was 64 modified tracked frontend paths and 20 untracked entries, including earlier work. Final status is **64 modified tracked paths and 22 untracked entries**; the two new browser specs account for the additional entries. Existing shared UI/docs remain within their already-untracked directories. Backend remains clean and the index is unchanged/empty. Full status is retained in [git-status-final.txt](evidence/phase4g-controls-remediation/git-status-final.txt). Nothing was staged, committed, pushed, reset, cleaned, deleted or switched; unrelated work was preserved.

**Remediation is ready for visual review. Phase 4G remains OPEN pending explicit Product Owner visual approval. Phase 4H has not started.**

## Final compact-control remediation - 02 November 2026

**Status: OPEN, awaiting explicit Product Owner visual approval.** This final correction supersedes the preceding rejected base-select/32px control design. Earlier implementation findings, failures, limitations, comparisons and evidence remain historical records above. Phase 4H has not started.

### Reference and final shared implementation

The supplied attachment directory contains only Pasted text.txt; the two referenced images were not attached. Comparison therefore uses the actual Employee Status implementation and the saved original native-menu capture at `artifacts/phase4g-controls-remediation/before-employees-options-1440.png`. Exact comparison against the user's two screenshots remains unavailable and is not claimed.

The oversized option treatment came from the previous shared base-select picker: large option rows, menu dimensions, shadow and selected-option decoration. Those rules and the wrapper chevron are removed. Employee Status and Pay Period now share appearance:auto, the native right-hand arrow and native compact menu interaction. No custom option styling, menu shadow, duplicate arrow, custom scrolling or selection handler remains. Long native menus can display an OS/browser scrollbar and reposition around the selected option; this is native behavior, not an added scroll container.

Both payroll fields now use the standard Employee Status **40px height**. The existing compact opt-in constrains width only using intrinsic sizing and existing tokens. At 1440px, Pay Period measures **160 x 40px**, Payment Date **148 x 40px**. No Run Payroll template, layout stylesheet or other page source was edited during this final correction.

Enabled/mixed checkboxes use native marks at the existing 18px size. Disabled checked/mixed controls use a centered, contrasting shared tick/dash with unchanged disabled semantics; forced-colors restores native rendering. Checked, unchecked, all-selected, mixed, disabled and keyboard-focus states are exercised without changing handlers, form values, validation or payroll calculations. Radio/switch conventions remain intact.

### Files changed in this final task

- `src/app/shared/ui/ps-form-field.scss`: native select baseline, standard-height intrinsic-width fields and checkbox presentation.
- `e2e/shared-controls-remediation.spec.ts`: native control/state assertions and viewport menu captures.
- `e2e/shared-controls-product.spec.ts`: Employee Status/User Management native control assertions and captures.
- `docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md`: current shared-control guidance.
- `docs/design-system/PayStream-Component-Library.md`: matching component contract.
- `docs/design-system/PHASE_4G_REPORT.md`: this additive final record.

Entry-file SHA-256 inventory is retained in `artifacts/phase4g-final-controls/entry-hashes.json`. No runtime TypeScript, application template, business logic, service, API, backend, schema or customer data changed in this task. Existing approved-screen files were preserved; the requested shared-control correction applies consistently across their controls. No duplicate component/library/token palette was introduced. The shared guidance now explicitly supersedes the rejected design.

### Final screenshot evidence

Evidence directory: [phase4g-final-controls](evidence/phase4g-final-controls). Before captures preserve the immediately preceding rejected implementation; after captures use the final native-control implementation. Four widths are covered: **1440, 1280, 768 and 390px**. Chrome evidence is isolated in the `chrome` subdirectory.

| Evidence | Final capture |
| --- | --- |
| Employee Status, desktop | [Native menu](evidence/phase4g-final-controls/after-employees-options-1440.png) |
| Employee Status, mobile | [Native menu](evidence/phase4g-final-controls/after-employees-options-390.png) |
| Pay Period closed | [Field](evidence/phase4g-final-controls/after-period-1440.png) |
| Pay Period open | [Native menu](evidence/phase4g-final-controls/after-open-period-1440.png) |
| Payment Date | [Mobile field](evidence/phase4g-final-controls/after-date-390.png) |
| Checkbox states | [Payroll table](evidence/phase4g-final-controls/after-checkboxes-1440.png) |
| Mixed selection | [Table](evidence/phase4g-final-controls/after-mixed-selection-1440.png) |
| Other-screen controls | [User Management](evidence/phase4g-final-controls/after-users-controls-390.png) |

There are **92 primary PNGs** (46 before and 46 after) and **46 additional Chrome PNGs**. Matching before files and per-width metrics are retained. Native open-menu screenshots use viewport capture because full-page capture can resize the page and dismiss browser-owned popups. Native date-picker invocation and keyboard date editing are verified; headless screenshots do not establish calendar-cell visual correctness. Exact OS popup styling may differ across browsers/platforms. Firefox/Safari and a dedicated screen-reader audit are not claimed tested.

### Final validation

- Full frontend unit suite: **417 passed, 49 files**.
- Edge full protected-screen, payroll and shared-control regression: **63 passed** across all eight screens and the four target widths.
- Installed Chrome shared-control/product tests: **8 passed**.
- Backend tax/profile/payroll/generator tests: **187 passed, 2 opt-in browser cases skipped, 25 suites passed**. Results retained in `backend-after.json`. The skipped cases were not run or counted as passed.
- Ten complete payroll/tax comparison snapshots remain byte identical to the original Phase 4G baseline. SHA-256: `e81eda7421218e33625770cf5826db219e175fb91e7a9a2924b3a0ce2a6136ff`. Inputs and outputs are retained in this evidence directory.
- Production build: **passed**, initial bundle **822.63kB**, shared field stylesheet **6.33kB**, below the unchanged 8kB error budget. Existing warning budgets and PDF CommonJS warnings remain; no budget was raised.

The first focused run caught the forced-colors selector losing specificity to the disabled checked fallback at 390px. The shared selector was corrected before final verification; no assertion or browser behavior was weakened. Existing backend/test limitations in earlier report sections remain recorded. Frontend browser suites use synthetic API fixtures; this is not a live-tenant security acceptance test.

### Preservation and approval gate

Frontend Git status remains **64 modified tracked paths and 22 untracked entries**, including all previous work; the index remains unchanged and empty. Backend status is clean. Full status: [git-status-final.txt](evidence/phase4g-final-controls/git-status-final.txt). No staging, commit, push, reset, clean, branch switch or unrelated discard was performed. Evidence artifacts are ignored local review files and must accompany the report when shared.

**Phase 4G remains OPEN for visual approval. Phase 4H has not started.**


## Shared dropdown specification implementation - 02 November 2026

**Phase 4G remains OPEN, awaiting explicit Product Owner visual approval. Phase 4H has not started.** This appendix supersedes the earlier native-only decision for Pay Period. All earlier findings, limitations, screenshots and regression evidence above remain retained as historical records.

### Authority, inspection and root cause recorded before runtime edits

The user's pasted instruction is the implementation request. The separately supplied PayStream-Dropdown-Design-System-Spec-Phase-4G.md supplies design details; its hypotheses are not treated as established facts. The pasted request explicitly authorizes the native closed-field correction and, when no custom select exists, one shared CDK CVA for Pay Period. Its explicit implementation direction controls the document's conflicting baseline stop condition: Employee Status's existing 24px right padding differs from the requested 36px by more than 2px. That difference was reported before editing; it was not silently assumed to match. No visual approval is inferred from this authorization.

Read-only inspection covered FormField, native select/date controls, ChoiceControls/radio/switch styles, the CSS/SCSS entries, canonical tokens, unimported reference stylesheet, CDK overlay declarations and the approved design system. Actual before captures ran **8 tests successfully before runtime edits**. Entry hashes/status and the pre-edit root-cause record are in this evidence directory.

- Employee Status (entry employee-list.html:21) and Pay Period (entry run-payroll.component.html:36) were both native selects with PsFieldControl. Hypothesis of different control types was false at entry. No Material/ng-select/custom form select was found.
- Entry ps-form-field.scss:2 supplied the shared 40px height, 12px padding, border, radius and type; entry line31 set appearance:auto and 24px trailing padding. No arrow element or background image existed. Native arrow geometry and OS popup height/scrollbars were not controllable. Pay Period's 12 options versus Employee Status's three explained different open-menu proportions. The old base-select experiment was already absent at entry.
- A left arrow, flex reorder or duplicate arrow was **not reproduced**. Native arrows have no measurable DOM box. The triangle arrow in _ps-components.scss was unimported reference code, not the rendered control.
- Background shorthands in shared FormField and Employee Tax Profile's profile-summary rules could erase the requested image arrow. Shared control surface declarations now use background-color. The profile-summary select branches of the normal/disabled/focus rules were removed so those selects inherit the shared standard; input rules remain. These were the only screen CSS overrides removed. Current implementation lives in src/styles/paystream-select.css:2; the new component's overlay/dialog placement is in ps-select.ts:65-85.

Full pre-edit record: [root-cause-before-edit.txt](evidence/phase4g-dropdown-spec/root-cause-before-edit.txt).

### Computed-style comparison

At 1440px, before and final closed fields:

| Property | Employee Status before | Pay Period before | Employee Status final | Pay Period final |
| --- | --- | --- | --- | --- |
| Control type | Native select | Native select | Native select | Shared CDK CVA combobox |
| Height | 40px | 40px | 40px | 40px |
| Width | 127px | 160px | 160px | 160px |
| Padding left/right | 12px / 24px | 12px / 24px | 12px / 36px | 12px / 36px |
| Border / radius | 1px #86918a / 6px | Same | Same | Same |
| Font | 14px / 20px, 400 | Same | Same | Same |
| Appearance | auto | auto | none | Custom trigger |
| Background arrow | none; OS-drawn | none; OS-drawn | One 16px Lucide SVG image | One 16px PsIcon element |
| Image position/size | 0% 0% / auto | Same | right 12px center / 16px 16px | Not applicable; real icon |
| Arrow box | OS-owned; unavailable | OS-owned; unavailable | Image box derived from CSS | 16 x 16px measured |
| Arrow inside border / vertical offset | OS-owned | OS-owned | 12px / centered via background geometry | 12px / 0px measured |

Per-width before/after JSON includes height, padding, border/color/radius, font size/weight, image/position/size, appearance, arrow element box and checkbox styles. Native background arrows have no DOM bounding rectangle; their geometry is derived from the computed 16px image and right/center position, and inspected in captures. No fictitious native-arrow measurement is reported.

| Final measurement | 1440 | 1280 | 768 | 390 |
| --- | --- | --- | --- | --- |
| Pay Period height | 40px | 40px | 40px | 40px |
| Arrow inside border | 12px | 12px | 12px | 12px |
| Arrow vertical offset | 0px | 0px | 0px | 0px |
| Value-to-arrow gap | 8px | 8px | 8px | 8px |
| Panel width | 160px | 160px | 160px | 358px |
| Panel height | 296px | 296px | 296px | 296px |
| Option height | 36px | 36px | 36px | 36px |
| Option text inset | 13px | 13px | 13px | 13px |

Desktop filter controls stay within the proposed 160-280px bounds; forms fill their existing columns. At 390px the payroll fields fill their available 358px container. Existing native inline filter composition is preserved. The 16px calendar image shares the same right inset. On coarse pointers native selects/date text is 16px, field height stays 40px and panel rows are 44px; desktop rows remain 36px. The panel has a 296px cap including its border and padding (the handoff's eight-row arithmetic does not account for the two border pixels). Its width never falls below the field; the 390px panel matches the field and is also capped at half the viewport height. The active/selected row stays visible. Desktop Chromium receives explicit 6px scrollbar pseudo styles; Firefox retains scrollbar-width:thin. A standard thin rule would override Chromium's pixel scrollbar rules, so the Chromium branch restores scrollbar-width:auto.

### Dropdown inventory and implementation choice

| Implementation / tier | Screens and controls | Decision |
| --- | --- | --- |
| Native, Tier A | Employees status; employee form pay frequency; lifecycle reason; platform role; report type/month; User Management role; Organization country; Salary category/status/base/type/formula variable/amount period; Tax year/regime/rounding/taxability/partial exemption; Employee Tax financial-year selectors | Remain native; shared closed-field styling only. No option values, bindings, handlers or validators changed. Long formula-variable lists are not automatically converted. |
| CDK, Tier B | Run Payroll Pay Period only | Required styled scrolling menu; reuses installed CDK. PsSelect is a thin single-value CVA because existing CDK action menus are commands, not reusable form selects. |
| Other custom form dropdowns | None found | No Material/ng-select migration, dependency, new search/multi-select/clear feature or speculative variant. |
| No relevant dropdown in main screen | Employee Details | Existing fields/date controls and approved screen regression retained. |

The existing months list, raw YYYY-MM values, period ngModel, busy binding and changePeriod handler are retained. Unit tests prove exact value emission occurs before the change handler, model writes/reset do not emit extra changes, validators/pristine/touched states are preserved and disabled options/controls remain inert. The normal confirmation-page readonly input remains unchanged.

Tier B uses ps-select-panel, existing typography/colors/radius/shadow, one selected tint/medium weight/check, keyboard active outline, type-ahead, Home/End/Page Up/Page Down, arrows, Enter/Space, Tab, Esc and outside-click close. Options wrap to at most two lines; no search or multi-select feature is introduced. No standalone searchable/multi-select variants exist to restyle. The CDK layer (existing z-index 1000) and native popover top layer are reused without a new z-index token. Body-level overlays avoid card clipping; within native modal dialogs, CDK inserts the top-layer popover under the dialog to avoid inert body siblings. A rendered hit-test verifies the selected option is interactive above the dialog.

**DS-012 PROPOSED:** surface-selected #e6eee8; option-height 36px; option-height-touch 44px; menu-max-height 296px; menu-max-width 360px; select-filter-min 160px; select-filter-max 280px. The supplied document calls these five tokens but lists seven; all seven were added with the exact requested names. Supporting proposed tokens are select-scrollbar-width 6px and centralized chevron/calendar SVG image variables (rest/active/disabled). No font, dependency, new palette or z-index was added. The existing approved DS-012 shell decision is preserved; the decision log explicitly distinguishes this dropdown proposal with the same supplied ID. It is not recorded as approved.

### Screenshot and accessibility evidence

Evidence: [artifacts/phase4g-dropdown-spec](evidence/phase4g-dropdown-spec). Before files are actual entry captures at all four widths, not reconstructed screenshots. New custom-panel states have no custom-panel before counterpart because the entry control was native. Before captures cover Employee Status, native Pay Period/date, payroll checkbox states and User Management's native dialog control; synthetic error/disabled/overflow fixtures were added for final verification and do not establish missing before-state comparisons.

| Evidence | Before | Final |
| --- | --- | --- |
| Employee Status closed | [Before](evidence/phase4g-dropdown-spec/before-employees-status-1440.png) | [Final](evidence/phase4g-dropdown-spec/after-employees-status-1440.png) |
| Employee Status open | [Before](evidence/phase4g-dropdown-spec/before-employees-options-390.png) | [Final](evidence/phase4g-dropdown-spec/after-employees-options-390.png) |
| Pay Period closed | [Before](evidence/phase4g-dropdown-spec/before-period-1440.png) | [Final](evidence/phase4g-dropdown-spec/after-period-1440.png) |
| Pay Period open | [Before](evidence/phase4g-dropdown-spec/before-open-period-1440.png) | [Final](evidence/phase4g-dropdown-spec/after-open-period-1440.png) |
| Selected / scrolled | Native menu above | [Selected](evidence/phase4g-dropdown-spec/after-panel-selected-390.png), [Scrolled](evidence/phase4g-dropdown-spec/after-panel-scrolled-390.png) |
| Payment Date | [Before](evidence/phase4g-dropdown-spec/before-date-390.png) | [Final](evidence/phase4g-dropdown-spec/after-date-390.png) |
| Disabled / error | No matching synthetic entry fixture | [Disabled](evidence/phase4g-dropdown-spec/after-disabled-period-390.png), [Error](evidence/phase4g-dropdown-spec/after-error-period-390.png) |
| Native disabled / error | Existing normal native dialog capture | [Disabled](evidence/phase4g-dropdown-spec/after-native-disabled-390.png), [Error](evidence/phase4g-dropdown-spec/after-native-error-390.png) |
| Overflow / dialog / flip | Entry native menus OS-owned | [Card](evidence/phase4g-dropdown-spec/after-overflow-card-390.png), [Dialog](evidence/phase4g-dropdown-spec/after-dialog-panel-390.png), [Flip](evidence/phase4g-dropdown-spec/after-panel-flipped-390.png) |
| Checkbox states | [Before](evidence/phase4g-dropdown-spec/before-checkboxes-1440.png) | [Final](evidence/phase4g-dropdown-spec/after-checkboxes-1440.png), [200%](evidence/phase4g-dropdown-spec/after-checkboxes-200-1440.png) |

There are **134 primary PNGs** (40 before, 94 final), plus **94 Chrome** and **94 coarse-pointer** PNGs. Chrome and coarse-pointer captures are isolated in chrome/ and touch/. Viewport screenshots preserve OS/native popups, which full-page resizing may dismiss. API fixtures are synthetic. Overflow-card/modal/error/disabled evidence uses a test-only DOM container/state around the actual shared control, without changing application routes, saved data or validation rules. Required/error behavior is independently tested through the real reactive-form/FormField contract.

Accessible names, descriptions, combobox/listbox/option roles, aria-expanded/selected/disabled/invalid, active descendant and focus restoration are asserted. Keyboard navigation, type-ahead, selected/active scrolling, outside click, resize close, flip, reduced motion and dialog hit-testing pass. These are automated accessibility/keyboard checks, not a dedicated NVDA/JAWS/VoiceOver audit. Browser differences remain for native popup styling; Firefox/Safari and physical iOS/Android devices were not tested.

**Checkbox isolation:** new rules are scoped to select.ps-select, input.ps-date, the custom trigger/panel and their wrappers; no bare input/select or attribute wildcard selector was added. Choice/radio/switch-specific styling was not changed. Before/after checkbox computed-style JSON is identical at all four widths (checkbox-before-after-comparison.json). Existing native Chromium checked boxes report computed border/radius as 0 while UA drawing supplies their visible outline; this was already true at entry and was not restyled to invent a 1px/4px CSS geometry. The CSS box remains 18px. Raster analysis of the visible white tick is retained in checkbox-raster-metrics.json: unclipped at 100% and 200% CSS rendering zoom, bounding-box center offsets within 0.5 CSS pixels. These are CSS rendering-scale checks, not physical browser-toolbar/device zoom certification.

### Validation results and limits

| Check | Command / outcome |
| --- | --- |
| Complete frontend unit suite | npm.cmd test -- --watch=false: **421 passed, 50 files**. |
| Complete browser catalog | npm.cmd run test:browser -- --output=test-results/phase4g-dropdown-full --reporter=list,json: **118 passed, 6 failed, 4 skipped**, 128 cases. Raw report: frontend-browser.json. This is not an all-green suite claim. |
| Final Edge control/product verification | npm.cmd run test:browser -- e2e/shared-controls-remediation.spec.ts e2e/shared-controls-product.spec.ts --output=test-results/phase4g-dropdown-final-focused: **8 passed** after final scrollbar, token-positioning, label-focus and type-ahead refinements. |
| Chrome | Same two specs with artifacts/phase4g-dropdown-spec/chrome.config.ts; isolated evidence directory. **8 passed**. |
| Coarse pointer | Same two specs with artifacts/phase4g-dropdown-spec/touch.config.ts (hasTouch true); isolated evidence directory. Final result recorded below. |
| Production build | npm.cmd run build: **passed**, initial bundle **839.24kB**, approximately **194.12kB** transfer. Existing warning budgets and PDF CommonJS warnings remain; no budget changed. Direct npm build exited 0. |
| Backend regression | RUN_TAX_MONGO_TESTS=1, RUN_PAYROLL_MONGO_TESTS=1; npm.cmd test -- --runInBand src/income-tax src/employee-tax-profile src/run-payroll src/payroll-generator --testTimeout=30000 --json --outputFile=.../backend-after.json: **187 passed, 2 opt-in browser cases skipped, 25 suites**. |
| Calculation comparison | Ten complete snapshots byte identical to original Phase 4G baseline; SHA-256 e81eda7421218e33625770cf5826db219e175fb91e7a9a2924b3a0ce2a6136ff. Files retained here. |

The complete browser catalog's six failures concern unchanged pre-existing behavior/legacy expectations; they were not fixed or weakened as part of dropdown styling:

1. final-ui.spec.ts:23 expects 10,000.00; approved psInr renders whole rupees as 10,000.
2. indian-format-search.spec.ts:72 expects 1,000.00; current approved rendering is 1,000.
3. indian-format-search.spec.ts:98 expects whole-rupee statutory displays with .00.
4. management-delete.spec.ts:3 looks for an employee-directory selection checkbox removed by the approved selection-free directory.
5. profile-payroll-ui.spec.ts:127 expects 95.00 in a whole-rupee total; current rendering is 95.
6. ui-refinements.spec.ts:16 targets the obsolete + Add Salary Component accessible label.

Currency formatters, directory selection behavior and Salary Component button labels were not changed here; entry hashes/source inspection and existing approval documentation support that classification. The full 128-case catalog was not run before this task, so this is not a claim that all six were independently reproduced in a complete pre-edit browser run. Four existing browser skips and two backend opt-in skips are not counted as passes. Protected-screen/Run Payroll/control suites passed within the complete run. Existing payload/PDF/numeric assertions remain intact; only Pay Period's UI locator/selection helpers were adapted for its authorized custom representation. No unrelated failure assertion was altered.

A redirected PowerShell build invocation reported wrapper status 1 because stderr warnings became NativeCommandError records, despite successful Angular generation. The unchanged direct npm.cmd run build was rerun and exited 0; the redirected log is retained as build-final.log.

Implementation-time corrections: the initial component import omission was fixed; measured shared-style specificity was corrected to preserve 36px trailing padding; dialog inertness was found by hit-testing and fixed through CDK placement; native label-click focus is explicitly retained for the non-native host (without changing native-label/info-button behavior), and type-ahead state resets on each opening; stale 320px test limits were updated to the requested 280px desktop/full-container mobile contract. No business assertion or timeout was relaxed. Earlier report limitations remain retained.

**Native date limitation:** the existing native date implementation and click target are retained. Its editable date text is locale/OS-controlled (the test environment displays a numeric date), so DD MMM YYYY cannot be forced without replacing its value accessor/picker. Native calendar popup radius/shadow/layer cannot be themed consistently by page CSS. Those requested visual details were deliberately not faked or replaced; keyboard date editing and ISO form values remain verified. Headless captures do not establish calendar-cell visual correctness.

### Complete file inventory for this task

This inventory is relative to entry-hashes.json, not relative to Git HEAD, because the workspace already contained earlier implementation work. Ignored local artifacts are review evidence, not application source.

- Updated docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md.
- Updated docs/design-system/PHASE_4G_REPORT.md.
- Updated docs/design-system/PayStream-Component-Library.md.
- Created e2e/dropdown-evidence.ts.
- Updated e2e/final-ui.spec.ts.
- Updated e2e/run-payroll-design-system.spec.ts.
- Updated e2e/run-payroll.spec.ts.
- Created e2e/select-period.ts.
- Updated e2e/shared-controls-product.spec.ts.
- Updated e2e/shared-controls-remediation.spec.ts.
- Updated e2e/unified-payroll.spec.ts.
- Updated src/app/employees/employee-form.html.
- Updated src/app/employees/lifecycle-dialog.ts.
- Updated src/app/features/run-payroll/run-payroll.component.html.
- Updated src/app/features/run-payroll/run-payroll.component.ts.
- Updated src/app/features/tax-management/employee-tax.css.
- Updated src/app/payroll/payroll-generator.html.
- Updated src/app/platform/platform.html.
- Updated src/app/shared/ui/action-icons.ts.
- Updated src/app/shared/ui/index.ts.
- Updated src/app/shared/ui/ps-form-field.scss.
- Updated src/app/shared/ui/ps-form-field.ts.
- Created src/app/shared/ui/ps-select.spec.ts.
- Created src/app/shared/ui/ps-select.ts.
- Updated src/styles.css.
- Created src/styles/paystream-select.css.
- Updated src/styles/paystream-tokens.css.

The Run Payroll TypeScript change is component imports only. Its template preserves the period model, options, disabled binding and original change handler. Other application template edits only attach shared select/date classes to legacy controls. Employee Tax Profile CSS removes only the conflicting select presentation branches; no profile logic changes. No backend/service/API/route/schema/calculation/validation/customer-record change occurred. No dependency, font or unrelated module redesign was introduced.

### Git preservation and approval gate

Entry frontend status: **64 modified tracked paths, 22 untracked entries**. Final frontend status: **68 modified tracked paths and 24 untracked entries**, recorded in git-status-final.txt; it includes all earlier work. Backend is clean; the index remains unchanged/empty. No reset, clean, restore, checkout, stash, staging, commit, push or unrelated discard was performed. Do not assume the accumulated dirty files belong exclusively to this task.

**Phase 4G remains OPEN pending explicit Product Owner visual approval. Phase 4H has not started.**


## Product-wide Enhanced Dropdown Menu Adoption

**02 November 2026 - implemented for visual review. Phase 4G remains OPEN; Phase 4H has not started.** The Product Owner accepts the existing Run Payroll open-menu design as the reference and explicitly requests its product-wide adoption. This does not constitute final approval/closure of Phase 4G. Earlier findings, screenshots, known failures and limitations above remain retained; this section supersedes the earlier short-native-list menu exception.

### Why the previous implementation was limited and what is reused

The previous handoff expressly kept short/static lists native and used PsSelect only for Pay Period. Native closed-field CSS could align arrows/dimensions, but could not style OS-drawn open menus. Inspection found **23 select templates**: 22 native select templates, plus the existing Run Payroll PsSelect. No Material/ng-select, searchable or multi-select application dropdown was found. Repeated taxability rows instantiate their template multiple times; 23 is a template count, not a claim of only 23 runtime instances.

The new shared **PsNativeSelect** adapter retains the existing HTML select and its original options, labels, IDs/names, native Angular value accessor, validators, disabled rules and event handlers. PsFieldControl applies the adapter through a host directive; the legacy employee form, lifecycle dialog, report generator and platform form import the same directive and opt in using psSelectMenu. The adapter reads the native option list, opens the **existing PsSelect CDK portal**, and sends chosen native option values through the original input/change events. Angular therefore decodes ngValue null/object values through its existing accessor; no replacement form control/CVA or new data conversion is introduced.

PsSelect receives only an optional origin input for the native field. Pay Period continues to use the same component, template, styles and behavior. The adapter's controller view is detached from the DOM; it inserts no duplicate trigger, hidden form input, wrapper, or extra accessible control. The existing panel handles keyboard/type-ahead, active/selected scrolling, outside click/Esc/Tab/resize, viewport flip and modal placement. Dynamic options and disabled/dependent state are synchronized without emitting model changes. Popup ARIA state is mirrored on the original native control; original helper/error associations remain.

**No CSS/SCSS or token file changed.** No dependency, framework, font, new visual variant, date-picker change, checkbox/radio/toggle change or Run Payroll layout change was introduced. The existing menu border/radius, shadow, row sizes/padding, selected tint/weight/check, hover/focus/disabled treatment and scrollbar are reused exactly. Native closed arrows are not replaced or redesigned again.

### Complete application select inventory

All 23 templates are configured for the enhanced menu. The original native elements remain native form controls; only their interactive popup presentation is enhanced. Disabled fields remain unable to open until the existing workflow enables them.

| Screen | Field | Entry implementation | Enhanced shared menu | Exception |
| --- | --- | --- | --- | --- |
| Employees | Employee Status | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Employee add/edit | Pay Frequency | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Employee lifecycle | Termination reason | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Platform organization accounts | Role | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Payroll reports | Report Type | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Payroll reports | Payroll Month | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| User Management | Role | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Organization Settings | Country | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Salary Components | Component Category | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Salary Components | Status | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Salary Components | Calculation Base | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Salary Components | Calculation Type | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Salary Components | Supported formula values | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Salary Components | Amount Period | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Tax Configuration | Financial Year | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Tax Configuration | Regime | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Tax Configuration | Income rounding | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Tax Configuration | Liability rounding | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Tax Configuration | Salary-component taxability treatment (repeated rows) | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Tax Configuration | Partial exemption method (conditional repeated rows) | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Employee Income Tax / TDS Profile | Financial Year (locked profile field) | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Employee Income Tax / TDS Profile | Change Financial Year dialog | Native select | PsNativeSelect + existing PsSelect panel | None; existing disabled rules retained |
| Run Payroll | Pay Period | Existing PsSelect/CDK | Retained | None; existing disabled rules retained |

Machine-readable inventory with source paths, entry line references, attributes and adoption checks: inventory-before.json and inventory-final.json. A final source scan found the 23 select templates plus the opening/closing datalist tags, with no overlooked select library. All native select tags use PsFieldControl or psSelectMenu; legacy owning components import the adapter. Runtime popup checks cover representative fields and both conditional Salary/Tax branches; full workflows cover employee forms, lifecycle, reports and platform accounts.

### Genuine exceptions and fields that are not dropdowns

- **Employee Details Country suggestions:** an editable input plus native datalist, not a select-only form control. It accepts arbitrary valid country text under the existing 120-character rule. Replacing it with a select-only panel would restrict valid typed values and change its editable-combobox/validation semantics. Native datalist suggestions remain; no new editable/searchable combo is invented in this focused task.
- **Existing CDK action menus:** Employees, Users and Salary Components menus remain command menus with their original menu/menuitem behavior. They are not selection-value fields and should not acquire selected-value/check semantics. Existing menu styling and actions are preserved.
- **Not present as dropdowns:** User Management status is an existing checkbox/action; Organization state is a text field; Employee Tax regime and employment scenarios use their existing display/radio controls. Employee Details main view does not gain an Employment Status or Pay Frequency dropdown. Its existing pay-frequency editor uses the employee-form template listed above.
- The adapter conservatively leaves native multiple, grouped/optgroup and multi-row listbox controls alone to preserve their distinct interaction semantics. **None were found among the application selects**, so this is not an ordinary-application-dropdown exception. Searchable/multi-select features are not added.

### Before/after evidence and preservation of closed styling

Evidence directory: [phase4g-product-dropdowns](evidence/phase4g-product-dropdowns). **148 before PNGs and 236 after PNGs**, captured from the actual application at **1440, 1280, 768 and 390px**. Before captures completed before runtime edits; 33 selected tests passed, followed by four dedicated Tax baseline captures. The extra conditional Salary/Tax states have final evidence without a fabricated before counterpart. Coarse-pointer evidence is in touch/ (24 PNGs).

Every open capture has a corresponding closed capture with the same name using the closed prefix; before files use before instead of after. Native short menus in before captures are OS-drawn; final menus use the approved panel.

| Open menu | 1440 | 1280 | 768 | 390 |
| --- | --- | --- | --- | --- |
| Employee Status | [View](evidence/phase4g-product-dropdowns/after-open-employees-employee-status-1440.png) | [View](evidence/phase4g-product-dropdowns/after-open-employees-employee-status-1280.png) | [View](evidence/phase4g-product-dropdowns/after-open-employees-employee-status-768.png) | [View](evidence/phase4g-product-dropdowns/after-open-employees-employee-status-390.png) |
| User Management Role | [View](evidence/phase4g-product-dropdowns/after-open-users-user-role-1440.png) | [View](evidence/phase4g-product-dropdowns/after-open-users-user-role-1280.png) | [View](evidence/phase4g-product-dropdowns/after-open-users-user-role-768.png) | [View](evidence/phase4g-product-dropdowns/after-open-users-user-role-390.png) |
| Organization Country | [View](evidence/phase4g-product-dropdowns/after-open-organization-country-1440.png) | [View](evidence/phase4g-product-dropdowns/after-open-organization-country-1280.png) | [View](evidence/phase4g-product-dropdowns/after-open-organization-country-768.png) | [View](evidence/phase4g-product-dropdowns/after-open-organization-country-390.png) |
| Salary Calculation Type | [View](evidence/phase4g-product-dropdowns/after-open-salary-add-component-type-1440.png) | [View](evidence/phase4g-product-dropdowns/after-open-salary-add-component-type-1280.png) | [View](evidence/phase4g-product-dropdowns/after-open-salary-add-component-type-768.png) | [View](evidence/phase4g-product-dropdowns/after-open-salary-add-component-type-390.png) |
| Tax Financial Year | [View](evidence/phase4g-product-dropdowns/after-open-tax-tax-field-7-1440.png) | [View](evidence/phase4g-product-dropdowns/after-open-tax-tax-field-7-1280.png) | [View](evidence/phase4g-product-dropdowns/after-open-tax-tax-field-7-768.png) | [View](evidence/phase4g-product-dropdowns/after-open-tax-tax-field-7-390.png) |
| Tax Regime | [View](evidence/phase4g-product-dropdowns/after-open-tax-tax-field-8-1440.png) | [View](evidence/phase4g-product-dropdowns/after-open-tax-tax-field-8-1280.png) | [View](evidence/phase4g-product-dropdowns/after-open-tax-tax-field-8-768.png) | [View](evidence/phase4g-product-dropdowns/after-open-tax-tax-field-8-390.png) |
| Employee Tax Change Year | [View](evidence/phase4g-product-dropdowns/after-open-employee-tax-ps-field-ae138522-167d-4435-9c12-076a72b89212-1440.png) | [View](evidence/phase4g-product-dropdowns/after-open-employee-tax-ps-field-69424db8-27cd-4dea-b1e5-411e051679ad-1280.png) | [View](evidence/phase4g-product-dropdowns/after-open-employee-tax-ps-field-564cef07-7352-4172-a805-a5eabc4b3338-768.png) | [View](evidence/phase4g-product-dropdowns/after-open-employee-tax-ps-field-adf6044c-fabf-431c-a343-aba2db5f0d6a-390.png) |
| Run Payroll Pay Period | [View](evidence/phase4g-product-dropdowns/after-open-payroll-pay-period-1440.png) | [View](evidence/phase4g-product-dropdowns/after-open-payroll-pay-period-1280.png) | [View](evidence/phase4g-product-dropdowns/after-open-payroll-pay-period-768.png) | [View](evidence/phase4g-product-dropdowns/after-open-payroll-pay-period-390.png) |

Examples: [Employee Status before](evidence/phase4g-product-dropdowns/before-open-employees-employee-status-1440.png), [Employee Status after](evidence/phase4g-product-dropdowns/after-open-employees-employee-status-1440.png), [Country before](evidence/phase4g-product-dropdowns/before-open-organization-country-390.png), [Country after](evidence/phase4g-product-dropdowns/after-open-organization-country-390.png), [conditional Amount Period](evidence/phase4g-product-dropdowns/after-open-salary-fixed-component-period-390.png), [partial exemption method](evidence/phase4g-product-dropdowns/after-open-tax-partial-tax-partialMode0-390.png).

**72 paired closed-field metric files match exactly**, including width/height, padding, border, radius, font, background image/position/size. These cover the stable-ID fields at all four widths; automatically generated UUID IDs in the Change Year dialog are captured but cannot be paired by filename across page creations. All existing CSS/SCSS and token SHA-256 values are unchanged from entry, independently confirming that date/choice controls, arrows, buttons, cards, tables, typography and page layouts were not restyled. Results: closed-field-comparisons.json and entry-hashes.json. Open menus are asserted visible, bounded by the viewport and 296px cap, with the selected row visible and option counts matching the original native options. Card/modal captures demonstrate reuse of the existing top-layer positioning rather than clipping within their parent.

Screenshots and frontend fixtures are synthetic, not live-tenant edits. Popup ARIA, naming, selected/disabled states and focus/keyboard behavior are exercised; no dedicated NVDA/JAWS/VoiceOver or physical mobile-device certification is claimed. Coarse-pointer checks include a real Playwright tap opening the Role menu. Native datalist appearance remains browser-owned; this exception is explicitly retained.

### Functional and regression validation

| Check | Outcome |
| --- | --- |
| Complete frontend unit suite: npm.cmd test -- --watch=false | **424 passed, 51 files**. Includes the three new native-adapter value-preservation tests. |
| Before selected screen/control suites | **33 passed** before runtime edits; dedicated Tax baseline captures **4 passed**. |
| After selected screen/control suites | **33 passed**, across all four target widths. |
| Conditional Salary/Tax branches | **8 passed** across all four widths: fixed-amount period, disabled placeholder, keyboard skip/commit, dependent partial-exemption selector. |
| Save/reopen integration | **1 passed**; Role selected through the shared menu, saved with the unchanged exact API payload, reopened with the saved selection. Existing account workflows remain asserted. |
| Coarse-pointer shared controls | **4 passed**, including tap to open the native Role adapter and unchanged 40px fields. |
| Complete browser catalog: npm.cmd run test:browser -- --output=test-results/phase4g-product-full --reporter=list,json | **118 passed, 6 failed, 4 skipped** out of 128. **No new failing test cases** versus the retained previous report. |
| Backend tax/profile/payroll/generator regression | **187 passed, 2 opt-in browser cases skipped, 25 suites passed**. No backend code changed. |
| Production build: npm.cmd run build | **Passed**, exit 0; initial bundle **845.71kB**, estimated transfer **195.49kB**. Existing bundle/component budget and PDF CommonJS warnings remain; no budget changed. |
| Payroll/tax comparisons | Ten complete snapshots remain byte identical to original Phase 4G baseline; SHA-256 e81eda7421218e33625770cf5826db219e175fb91e7a9a2924b3a0ce2a6136ff. |

The unit tests retain native element identity, validators, pristine/touched/reset state, disabled-option/control guards, dynamic option labels/values and exact null/object/string identity. Changes flow through the original Angular accessor and original change handlers. The browser suites also exercise original versioned Organization/Tax saves and reopening, required/error validation, employee/lifecycle workflows, selected payroll values, stored TDS/PDF checks and immutable history. No test assertion for business values, payloads or security boundaries was weakened.

The browser comparison is against the prior raw artifacts/phase4g-dropdown-spec/frontend-browser.json, not an assumed clean baseline. browser-baseline-comparison.json shows exactly the same six failure keys and zero new failures:

1. final-ui: whole-rupee 10,000.00 expectation versus approved whole-rupee rendering.
2. indian-format-search payroll: 1,000.00 expectation versus whole-rupee rendering.
3. indian-format-search statutory: whole-rupee .00 expectations.
4. management-delete: obsolete employee-directory selection checkbox.
5. profile-payroll-ui: 95.00 expectation versus whole-rupee rendering.
6. ui-refinements formula help: obsolete + Add Salary Component accessible label.

These six failures and four browser skips remain unresolved and are not counted as passes. Two optional backend browser cases remain skipped. Detailed current results are in frontend-browser.json and backend-after.json; earlier limitations in this report remain retained.

Commands: selected coverage uses npm.cmd run test:browser with shared-controls-product, shared-controls-remediation, organization-design-system, salary-design-system, tax-design-system and employee-tax-design-system specs. PRODUCT_DROPDOWNS=before/after opts into dedicated evidence without changing application behavior; test outputs are in phase4g-product-before/after. Conditional checks use salary/tax specs with the salary components|Tax configuration at filter; save/reopen uses the existing User Management workflow test. Coarse-pointer checks reuse the existing ignored touch config with a separate evidence directory. Backend command: RUN_TAX_MONGO_TESTS=1, RUN_PAYROLL_MONGO_TESTS=1; npm.cmd test -- --runInBand src/income-tax src/employee-tax-profile src/run-payroll src/payroll-generator --testTimeout=30000 --json --outputFile=.../backend-after.json.

### Files modified or created in this task

Relative to the entry hash inventory, rather than Git HEAD (which includes substantial previous work):

- Updated docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md.
- Updated docs/design-system/PHASE_4G_REPORT.md.
- Updated docs/design-system/PayStream-Component-Library.md.
- Updated e2e/employee-tax-design-system.spec.ts.
- Updated e2e/organization-design-system.spec.ts.
- Created e2e/product-dropdown-evidence.ts.
- Updated e2e/salary-design-system.spec.ts.
- Updated e2e/shared-controls-product.spec.ts.
- Updated e2e/shared-controls-remediation.spec.ts.
- Updated e2e/tax-design-system.spec.ts.
- Updated e2e/users-design-system.spec.ts.
- Updated src/app/employees/employee-form.html.
- Updated src/app/employees/employee-form.ts.
- Updated src/app/employees/lifecycle-dialog.ts.
- Updated src/app/payroll/payroll-generator.html.
- Updated src/app/payroll/payroll-generator.ts.
- Updated src/app/platform/platform.html.
- Updated src/app/platform/platform.ts.
- Updated src/app/shared/ui/ps-form-field.ts.
- Created src/app/shared/ui/ps-native-select.spec.ts.
- Created src/app/shared/ui/ps-native-select.ts.
- Updated src/app/shared/ui/ps-select.ts.

The four legacy component TypeScript changes are imports/component registration only (plus the lifecycle template adapter attribute). Their native bindings and business methods are unchanged. Most screens require no application-template edit because PsFieldControl adopts the shared adapter automatically. PsSelect changes only add the optional origin/getter; the existing Pay Period view and approved menu styles are retained. No source stylesheet, token file, service, API, backend calculation, schema, authorization, organization-isolation rule or stored customer value was changed.

### Git protection and final approval gate

Frontend entry: **68 modified tracked paths, 24 untracked entries**. Frontend final: **70 modified tracked paths, 25 untracked entries**, including all earlier work. The additional aggregate untracked entry is the evidence helper; new adapter/unit files live under the already-untracked shared UI directory. Backend is clean both before and after. The index remains unchanged and empty.

Before/final statuses for both repositories are retained as git-status-frontend-before/final.txt and git-status-backend-before/final.txt in the evidence directory. Nothing was reset, cleaned, restored, stashed, staged, committed, pushed, switched or discarded. Evidence files are ignored local review artifacts; retain this directory when sharing the report.

**Product-wide adoption is ready for visual review. Phase 4G remains OPEN pending explicit Product Owner visual approval. Phase 4H has not started.**


## Closure confirmation - 02 November 2026

**Phase 4G is Visually Approved and Closed**, explicitly approved by the Product Owner. Run Payroll is the eighth protected reference; the enhanced product-wide dropdown standard covers all 23 select templates, retaining the Country datalist/command-menu exceptions. All preceding implementation findings, test results and limitations are retained as historical records, including the six legacy browser failures and skipped tests. Earlier open-gate statements are superseded. Phase 4H is separately authorized; see PHASE_4H_REPORT.md for its audit and implementation. Phase 4H requires its own visual approval. Do not begin Phase 4I automatically.
