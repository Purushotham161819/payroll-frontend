> Current status - 03 November 2026: Phases 1 through 4H are complete and approved, including Phase 4G shared dropdowns and Phase 4H Pay Checks. Phase 4I Dashboard is deferred. Earlier OPEN/pending statements below are historical; the final approval registry supersedes them.

# Phase 4H - Pay Checks UI/UX implementation

Date: 02 November 2026. **Status: Implemented; OPEN pending explicit Product Owner visual approval.** Phase 4I has not started.

## Objective and approval scope

Make the existing employee Pay Checks experience consistent with the eight approved visual references while preserving finalized records, saved TDS, payroll calculations, payment status, navigation and stored PDF contents. Phase 4G was explicitly approved and formally closed on 02 November 2026; Run Payroll is the eighth protected reference and the enhanced dropdown design is now approved across all 23 select templates, retaining the free-text Country datalist and command-menu exceptions. Approval is recorded in PHASE_4G_REPORT.md, PAYSTREAM_DESIGN_SYSTEM.md, PayStream-Component-Library.md, CODEX_PROMPTS.md and AGENTS.md. All Phase 4G technical findings, known failures and prior evidence remain historical records.

Phase 4H authorizes Pay Checks UI/UX, not a new payroll engine or duplicate screen. Separately, the Product Owner explicitly answered **"Authorize the focused accessibility fix"** after the pre-change PDF-viewer focus failure was reported. That authorization covers the focus repair described below; it is not Phase 4H visual approval.

## Preliminary audit and existing architecture

Audit completed before runtime edits; record: [audit-before-edit.txt](evidence/phase4h-pay-checks/audit-before-edit.txt). Reviewed the current Pay Checks component/template/styles/tests, routes, profile/editor tab composition, shared components, approved guidance, previous phase approval/validation/limitation records and backend history/PDF/finalization code.

- **No standalone Pay Checks route exists.** app.config.ts routes employees/:id to EmployeeProfile; tab=checks mounts app-pay-checks inside the existing Employee Profile ribbon/panel. EmployeeForm also reuses this component in its existing checks tab. No new route, duplicate screen or ribbon/navigation change was introduced.
- EmployeeProfile's existing header and back behavior remain the page header. This embedded feature uses its shared card title/subtitle rather than nesting another oversized PageHeader/h1.
- RunPayrollService.history(employeeId) calls GET /payroll/employees/:id/checks. The backend filters the existing organization and Submitted runs, includes finalized submission snapshots, excludes stored PDF bytes from the history response and orders periods descending. The UI retains the returned order and records.
- View and Download call GET /payroll/runs/:period/checks/:id/pdf. The backend decodes the existing stored base64 PDF; retrieval does not invoke payslipPdf. PDF generation remains solely in the existing payroll submission flow. View uses the existing authenticated blob URL/iframe; Download uses the existing filename and service path.
- Pay Period, Payment Date, Gross Pay, Employer Contributions, Deductions, Net Pay, Payment Status and Actions are the eight existing table columns. All are retained. Pay frequency is optional underlying data; no speculative new field/column was added.
- Saved TDS remains behind the existing info icon. Zero displays as ₹0.00, and absent TDS retains the existing not-recorded message. Opening it issues no history/PDF/tax calculation request.
- Existing loading, empty, error, busy, generation/stale-response and object-URL cleanup paths are retained. Existing authenticated routes/guards and organization-scoped backend queries remain untouched.

Baseline observations: the component already used much of the shared system, but the forced 1180px table minimum clipped the action end even at the available desktop card width. The card lacked supporting history context; the viewer used a large text Close button; TDS used a wider 320px popover. The first four-width baseline tests also exposed a real focus-return failure after a delayed PDF load: the View button was focused while the native modal was still active/inert. It was reported and separately authorized before any functional fix.

## Implemented visual changes

- Shared Card title **Pay Checks** and concise subtitle clarify the finalized history and stored-payslip purpose. Existing profile header/tab ribbon and navigation stay intact.
- The existing DataTable opts into its approved naturalWidth input. Two-line Employer Contributions and Payment Status headings reduce intrinsic width without removing columns. Numeric alignment, 44px headers, 56px rows, currency/date pipes and status badges remain shared standards. Mobile scrolling stays inside the table region.
- View, Download and TDS retain existing shared 32px icon buttons, labels, tooltips and event handlers. The PDF viewer Close action now uses the same compact shared close icon convention as Run Payroll.
- Saved-TDS popover remains the existing CDK overlay; its presentation uses the existing 240px tooltip width, 6px radius, token padding/shadow and readable saved-amount typography. No TDS value or calculation logic changes.
- Existing PDF-loading/error messages receive token-based spacing/surface treatment. The empty-state wording is **No finalized pay checks available.** No retry behavior or new error handling was invented.
- The existing PDF viewer gains a short stored-document description, clear download footer and compact mobile padding. The original iframe/source and download handler are unchanged; no PDF template, byte content or generation code changes.

**Separately authorized accessibility fix:** closeViewer now closes the native dialog before the existing URL/state cleanup and queued opener focus restoration. This releases modal inertness first. Delayed-load/Escape tests demonstrate false focus-return before and true after at all four widths. No payroll/business calculation or persistence behavior changes.

Shared components reused: PsCard/Title/Subtitle, PsDataTable (existing naturalWidth), PsIconButton (existing View/Download/info/close action map and tooltips), PsStatusBadge, PsInrPipe, PsDatePipe and existing CDK ConnectedOverlay. No shared implementation/style/token was modified. The approved product-wide dropdown implementation and the other approved screen files remain unchanged.

## Responsive verification and screenshots

Actual rendered application evidence: [artifacts/phase4h-pay-checks](evidence/phase4h-pay-checks). **56 before and 56 after PNGs** at 1440, 1280, 768 and 390px. They include full Employee Profile context, history/table, TDS/zero/missing states, viewer/return, download, empty, loading, unavailable and permission-denied states. There is no standalone screen to capture. Before captures completed before runtime edits, using the same isolated data/PDF fixture as after. These are application screenshots, not mockups.

| State | 1440 | 1280 | 768 | 390 |
| --- | --- | --- | --- | --- |
| Profile Pay Checks tab | [View](evidence/phase4h-pay-checks/after-profile-1440.png) | [View](evidence/phase4h-pay-checks/after-profile-1280.png) | [View](evidence/phase4h-pay-checks/after-profile-768.png) | [View](evidence/phase4h-pay-checks/after-profile-390.png) |
| History and actions | [View](evidence/phase4h-pay-checks/after-history-1440.png) | [View](evidence/phase4h-pay-checks/after-history-1280.png) | [View](evidence/phase4h-pay-checks/after-history-768.png) | [View](evidence/phase4h-pay-checks/after-history-390.png) |
| Stored TDS | [View](evidence/phase4h-pay-checks/after-tds-1440.png) | [View](evidence/phase4h-pay-checks/after-tds-1280.png) | [View](evidence/phase4h-pay-checks/after-tds-768.png) | [View](evidence/phase4h-pay-checks/after-tds-390.png) |
| Zero TDS | [View](evidence/phase4h-pay-checks/after-tds-zero-1440.png) | [View](evidence/phase4h-pay-checks/after-tds-zero-1280.png) | [View](evidence/phase4h-pay-checks/after-tds-zero-768.png) | [View](evidence/phase4h-pay-checks/after-tds-zero-390.png) |
| PDF viewer | [View](evidence/phase4h-pay-checks/after-viewer-1440.png) | [View](evidence/phase4h-pay-checks/after-viewer-1280.png) | [View](evidence/phase4h-pay-checks/after-viewer-768.png) | [View](evidence/phase4h-pay-checks/after-viewer-390.png) |
| Download action | [View](evidence/phase4h-pay-checks/after-download-1440.png) | [View](evidence/phase4h-pay-checks/after-download-1280.png) | [View](evidence/phase4h-pay-checks/after-download-768.png) | [View](evidence/phase4h-pay-checks/after-download-390.png) |
| Empty state | [View](evidence/phase4h-pay-checks/after-empty-1440.png) | [View](evidence/phase4h-pay-checks/after-empty-1280.png) | [View](evidence/phase4h-pay-checks/after-empty-768.png) | [View](evidence/phase4h-pay-checks/after-empty-390.png) |
| History loading | [View](evidence/phase4h-pay-checks/after-loading-1440.png) | [View](evidence/phase4h-pay-checks/after-loading-1280.png) | [View](evidence/phase4h-pay-checks/after-loading-768.png) | [View](evidence/phase4h-pay-checks/after-loading-390.png) |
| PDF loading | [View](evidence/phase4h-pay-checks/after-pdf-loading-1440.png) | [View](evidence/phase4h-pay-checks/after-pdf-loading-1280.png) | [View](evidence/phase4h-pay-checks/after-pdf-loading-768.png) | [View](evidence/phase4h-pay-checks/after-pdf-loading-390.png) |
| PDF unavailable | [View](evidence/phase4h-pay-checks/after-pdf-unavailable-1440.png) | [View](evidence/phase4h-pay-checks/after-pdf-unavailable-1280.png) | [View](evidence/phase4h-pay-checks/after-pdf-unavailable-768.png) | [View](evidence/phase4h-pay-checks/after-pdf-unavailable-390.png) |
| Download denied | [View](evidence/phase4h-pay-checks/after-download-denied-1440.png) | [View](evidence/phase4h-pay-checks/after-download-denied-1280.png) | [View](evidence/phase4h-pay-checks/after-download-denied-768.png) | [View](evidence/phase4h-pay-checks/after-download-denied-390.png) |

Matching before files use the before prefix. Additional tds-missing, history-denied and viewer-closed images are retained. Before/after table comparison: [before](evidence/phase4h-pay-checks/before-history-1440.png), [after](evidence/phase4h-pay-checks/after-history-1440.png).

| Width | Header / row height | Action buttons | Table region client / scroll width | Numeric alignment |
| --- | --- | --- | --- | --- |
| 1440 | 44px / 56px | 32px square | 1126px / 1126px | right |
| 1280 | 44px / 56px | 32px square | 966px / 966px | right |
| 768 | 44px / 56px | 32px square | 734px / 898px | right |
| 390 | 44px / 56px | 32px square | 356px / 898px | right |

All four widths pass no-page-overflow assertions. The desktop card now contains both actions without forced horizontal scrolling; narrower viewports retain focusable, labelled table scrolling with every action reachable. TDS bounds are checked against the viewport. PDF close returns to the same employee/profile tab and original table scroll position. Tests use reduced-motion preferences; no animation was introduced.

The embedded native PDF renderer may appear gray in headless screenshots. Captures verify the real viewer shell, and independent blob/download comparisons verify actual unchanged bytes. They do not certify native PDF-plugin page rasterization on every browser/device. Headed browser visual acceptance remains appropriate; no replacement PDF renderer was introduced merely to make a screenshot render a page.

## Data, PDF and functional preservation

The new four-width browser tests use isolated API fixtures with immutable check identifiers, employee ID, periods, dates, gross, contributions, deductions, saved TDS, net, frequency and payment status. They compare the actual component records before/after and assert **zero payroll mutation requests**. Existing View/Download fetch the same finalized artifact. Its creation is test-fixture setup, not an application View/Download generation path.

- All representative record fields and IDs remain identical at each width.
- The viewed blob and downloaded file are byte identical before/after and to the original stored fixture.
- SHA-256: **a5b6455bd03724242c99c1a911dcc58afe51a7aa826c317250bdb9427bf3064e**.
- Download filename remains Payslip_2026-11_507f1f77bcf86cd799439011.pdf.
- TDS popovers show the saved positive value, ₹0.00 and existing missing-value message without an extra API request or recalculation.
- Escape closure, opener focus, selected Pay Checks tab and table scroll context pass at every width.
- PDF unavailable/download denied/history denied use the unchanged error handlers. No real payroll submissions or customer-record changes were made.

Evidence: before/after-comparison-{width}.json, data-pdf-comparison.json and stored-payslip.pdf. Backend tests independently exercise immutable finalized snapshots/PDFs, retrieval, authorization and organization isolation using existing isolated infrastructure. Browser tests use mocked APIs and are not live-tenant acceptance testing. Payroll engine, APIs/services, schemas, auth/tenant logic, PDF generation/template and records are untouched.

## Validation and failure accounting

| Check | Result |
| --- | --- |
| Complete frontend unit baseline | **424 passed, 51 files** before runtime edits. |
| Complete frontend unit after | **424 passed, 51 files**; npm.cmd test -- --watch=false. |
| Existing Pay Checks browser baseline | **1 passed** (pay-check-details.spec.ts). |
| Four-width complete before captures | **4 passed** after recording the independently reported focus limitation and correcting the capture interaction. |
| Focused after Pay Checks/browser integrity suite | **5 passed** initially; **11 passed** in the final combined Employee Details/Pay Checks regression, preserving saved amounts, permissions and navigation assertions. |
| Chrome four-width PDF/data/focus verification | **4 passed**, using the same test with isolated chrome/ evidence (56 additional PNGs). |
| Final responsive measurements/evidence | **4 passed**; explicit row/header/button dimensions, numeric alignment and viewport checks. |
| Complete browser regression | **122 passed, 6 pre-existing failures, 4 skipped** across 132 cases. Failure keys exactly match the Phase 4G baseline; zero new unresolved failures. Raw results: frontend-browser-final.json and browser-baseline-comparison.json. |
| Backend retrieval/calculation/security regression | **190 passed, 2 optional browser cases skipped, 26 suites passed**. |
| Production build | **Passed**, exit 0; initial bundle **846.24kB**, transfer estimate **195.59kB**. Existing budget/CommonJS warnings retained; no budget changed. |

Commands run: npm.cmd test -- --watch=false; npm.cmd run test:browser -- e2e/pay-checks-design-system.spec.ts e2e/pay-check-details.spec.ts (before/after output directories); npm.cmd run test:browser -- e2e/pay-checks-design-system.spec.ts (final measurements/evidence); npm.cmd run test:browser -- --output=test-results/phase4h-full --reporter=list,json; npm.cmd run build. Backend: RUN_TAX_MONGO_TESTS=1, RUN_PAYROLL_MONGO_TESTS=1; npm.cmd test -- --runInBand src/income-tax src/employee-tax-profile src/run-payroll src/payroll-generator src/auth/http-security.spec.ts --testTimeout=30000 --json --outputFile=.../backend-after.json.

The pre-implementation Phase 4G catalog is **118 passed, 6 legacy failures, 4 skipped** across 128 cases. Current catalog adds the four new Pay Checks cases. The six baseline failures concern old whole-rupee .00 expectations (four cases), an obsolete employee selection checkbox, and the obsolete + Add Salary Component accessible label. They are retained and not fixed or weakened by Phase 4H. The four browser skips and two optional backend browser skips are not counted as passes.

The initial complete Phase 4H browser run produced 121 passed, 7 failed and 4 skipped: the extra failure was an existing Employee Details empty-state text selector still expecting No submitted pay checks. It was updated to the authorized new presentation wording only, preserving all amount, PDF-request and permission assertions. The final focused 11-case regression passed; the complete catalog was rerun after that correction. Initial results remain in frontend-browser.json and initial-browser-comparison.json.

Initial new baseline focus assertions failed at all four widths **before UI source edits**. This existing defect was reported; the Product Owner separately authorized the focused repair, and final focus assertions now pass. No unapproved functional fix was applied. An intermediate capture run redundantly hovered an already-focused Download button and timed out because its existing tooltip intercepted the repeated pointer action; captures now use the supported Escape dismissal before the next action, without modifying the protected shared tooltip. Financial/PDF/payload assertions were not relaxed. Additional final DOM amount assertions encountered PowerShell encoding corruption in new test literals. Unicode escapes corrected the literals; an intermediate test-only substitution also touched the fixture status ternary and was restored before the passing four-width rerun. Application currency/data were unaffected. No application build failure was introduced.

## Known limitations and deferred recommendations

- Six pre-existing broad browser failures and skipped cases remain documented; this report does not claim an entirely green catalog.
- Native embedded PDF rendering is browser/plugin dependent; headless gray iframe captures do not prove physical-device PDF rendering. Firefox/Safari, physical mobile devices and a dedicated assistive-technology audit were not run.
- Existing error handling is preserved, including shared retrieval-error wording and possible coexistence with the existing empty state after history failure. No retry feature was added.
- Existing history identity/tracking and PDF routes still use employee/period context. Separately audit additional-submission identity if multiple finalized history entries share one period; no submission selector, backend fix or new rule is invented here.
- A standalone Pay Checks route, filters, new data columns, new statuses and PDF regeneration are outside this visual phase. They require separate requirements/approval.

## Files changed and Git protection

Relative to the entry-file hash inventory (not Git HEAD, which already contains earlier work):

- Updated AGENTS.md.
- Updated docs/design-system/CODEX_PROMPTS.md.
- Updated docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md.
- Updated docs/design-system/PHASE_4G_REPORT.md.
- Created docs/design-system/PHASE_4H_REPORT.md.
- Updated docs/design-system/PayStream-Component-Library.md.
- Updated e2e/employee-details-design-system.spec.ts.
- Created e2e/pay-checks-design-system.spec.ts.
- Updated src/app/employees/pay-checks.css.
- Updated src/app/employees/pay-checks.html.
- Updated src/app/employees/pay-checks.ts.

Only the three Pay Checks runtime files changed. The sole functional addition is the explicitly authorized native-dialog focus fix; other changes are UI presentation/imports. Phase 4G approval recording changed documentation only, retaining its historical technical findings. No backend source, schema, API, service, calculation, PDF-template, approved dropdown implementation, Profile ribbon/navigation or other approved module source changed.

Frontend entry status: **70 modified tracked paths, 25 untracked entries**. Final status: **70 modified tracked paths, 26 untracked entries**, including all accumulated user work. Full statuses are in the evidence directory. Backend is clean before/after; the index remains unchanged and empty. No staging, commit, push, reset, clean, stash, history rewrite, branch switch or unrelated discard occurred. Before/final statuses for both repositories and entry/final hashes are retained with the evidence. Local ignored artifacts must accompany the report when shared.

**Phase 4H is ready for visual review and remains OPEN pending explicit Product Owner visual approval. Phase 4I has not started.**


## Final approval and release scope - 03 November 2026

The Product Owner confirms that Phases 1 through 4H are complete and approved. Phase 4G Run Payroll and its shared enhanced dropdown implementation across all 23 select templates are approved, retaining the Country datalist and command-menu exceptions. Phase 4H Pay Checks is approved and closed. All nine approved screens are protected visual references. Earlier OPEN/pending statements are historical and superseded by this approval; their findings, evidence and limitations remain retained.

Phase 4I Dashboard is deferred. Dashboard improvements will be addressed later. This release authorizes careful cleanup, validation, explicit staging, commits and normal pushes to existing origin/main; it does not authorize new features, redesigns, payroll/tax formula changes, PDF changes, history rewrites or removal of unrelated work. See FINAL_CLEANUP_REPORT.md for final validation and publication results.
