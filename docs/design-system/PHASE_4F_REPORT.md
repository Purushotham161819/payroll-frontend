# Phase 4F - Employee Income Tax / TDS Profile

Date: 02 November 2026. Status: **Visually Approved and Closed**.

## Formal approval

The Product Owner explicitly granted visual approval on **02 November 2026**, after reviewing the rendered Employee Income Tax / TDS section. Employee Income Tax / TDS Profile is now the seventh protected visual reference. Existing implementation details, validation results, screenshots, tax comparisons and limitations below are retained. Statements below about the open gate describe the implementation-time state and are superseded by this approval. Phase 4G is separately authorized by the same instruction; this approval alone does not alter application code.

## Objective and investigation

Apply the existing PayStream Design System to the employee-specific tax tab, retaining its profile, employment, previous-employer information, saved annual calculations and payroll behavior. Reviewed the design system, shared component library, CODEX_PROMPTS, AGENTS and Phase 1, 2A, 2B, 3 and 4A-4E reports, the six approved reference implementations, the actual employee-tax component/template/styles, Employee Profile integration, TaxApi, tests and backend requirements/implementation.

Functional documentation inspected includes EMPLOYEE-TDS-PROFILE-UI-WORKFLOW, MID-YEAR-TDS-IMPLEMENTATION, OPTIONAL-TDS-PAYROLL-FIX, TDS-WIDGET-UI and TAX-PROFILE-EDITING-VALIDATION-FIX. Actual source takes precedence over historical screenshots or descriptions. No earlier approval record or protected screen was changed.

## Existing functionality and field inventory

The existing employee route with `?tab=tax`, administrator visibility, tab mounting/preservation and unsaved-navigation guard remain unchanged. Four existing cards are retained; Salary Taxability Breakdown is existing functionality and was not merged away or newly added.

| Existing section | Fields, values and workflow preserved |
| --- | --- |
| Employee Tax Profile | Saved/read-only state, financial year from configuration, read-only annual CTC and payroll frequency, backend calculation status and configuration-derived read-only regime. Saved year remains locked during ordinary editing. Edit obtains the existing version-bound permission. Change Financial Year opens the existing configured-year preview and confirmation dialog; source records are not re-keyed. |
| Employment During Current Financial Year | First Job / Changed Jobs radios; saved projection annual CTC, FY start, employee hire/current employment start dates, eligible months, prorated annual CTC and current gross. A saved job-change projection also retains prior gross, verified exempt wages and TDS credit. Projection data comes from the selected saved calculation, not a new UI calculation. |
| Previous Employer Information | Gross wages, exempt wages, total TDS and documented-exemptions verification. Original required, min/max, two-decimal, exempt-not-above-gross and positive-exemption verification rules remain. Zero is accepted. Helper explanations remain unchanged. First Job clears prior amounts through the original handler and removes the conditional controls. |
| Eligibility and confirmations | TDS applicable, Indian tax residency, salary-only income, operative/verified PAN, full-year employment fallback, documented exemption confirmation and reason/review note (required only when TDS is disabled; existing 1000-character limit). |
| Saved Annual Tax Breakdown | Regime, legislation, last calculated timestamp, configuration/profile versions; annual tax liability, submitted current-employer TDS at calculation, remaining annual TDS, remaining periods and excess-credit warning; gross wages, taxable salary, deduction, taxable income, tax before rebate, rebate, surcharge, marginal relief, cess, current-employer annual TDS, monthly/final-month TDS, submitted allocations, remaining estimate and withholding status. No existing row was removed. |
| Salary Taxability Breakdown | Component name/code/treatment, annual value, exempt and taxable amounts; current mappings before calculation and immutable saved mappings after calculation. Missing values remain missing. |
| History / Tax Slabs | Explicit history fetch, saved timestamp/year/regime/scenario/annual tax/remaining TDS/status and View breakdown; selected snapshot's slab from/to/rate/taxable amount/tax. Historical versions remain attached to their snapshots. |

Both Edit controls use **one existing shared profile editing state**. Independent employment persistence does not exist and was not invented. Cancel restores the saved profile or returns from an unsaved target year. Save uses the original form and API payload; changed facts require explicit calculation. Calculate Annual TDS retains its original save-then-calculate behavior where editing, busy/current-result guard and error handling. No automatic recalculation or manual regime override was added. Hire dates, eligible periods and payroll frequency remain display-only here; no new date or frequency editor was invented.

## UI changes and shared components

Reused shared Card title/subtitle/actions/footer, FormField/FieldControl, Button, native-host IconButton, Tooltip/Icon, StatusBadge, DataTable, psInr and psDate. The tax tab retains its existing nested heading and explanatory content within the approved employee page rather than adding a second outer page header.

Edit uses the approved pencil action. Save and Cancel use labelled primary/secondary controls in the employment card footer, Cancel before Save, preserving the original submit/cancel handlers. Calculate remains the single explicit calculation action above the cards. Change Financial Year, history and slabs use labelled secondary buttons; no calendar/history/table glyph was invented outside the approved action map. Field information uses the approved inline info icon and shared overlay tooltip, retaining the original explanation text. Unknown calculation/status labels remain neutral through the existing shared status map; no new tax-status tone was introduced.

Money uses psInr with Indian grouping in saved views, tables and summaries. Previous-employer edits retain native number controls and raw numeric values, with currency prefixes; saved amounts are formatted while the original disabled controls remain mounted. Dates use psDate; saved timestamps retain local hours/minutes/seconds. Three-column desktop summaries/forms reduce to two and then one column. Related confirmations and radio options use shared native control styling. Tables retain their full contents in keyboard-accessible horizontal scroll regions. All local CSS uses existing tokens; no global/shared styling, tokens, fonts or dependencies changed.

The existing shared DetailDialog is intentionally retained for history/slabs to preserve native modal focus, Escape/backdrop dismissal and focus restoration. Its legacy dialog shell and Close styling are a remaining shared dependency, also retained by earlier approved screens. It was not restyled for this module. No alternative shared dialog implementation was introduced.

## Files changed by this phase

| File | Reason |
| --- | --- |
| src/app/features/tax-management/employee-tax.html | Shared presentation components, formatting, labels, radio-group semantics and action placement. |
| src/app/features/tax-management/employee-tax.css | Screen-local token styling, grids, responsive stacking and modal layout. |
| src/app/features/tax-management/employee-tax.ts | Presentation imports/component metadata only; class logic unchanged. |
| src/app/features/tax-management/employee-tax-workflow.spec.ts | Three presentation selectors changed from section to shared card; behavior assertions retained. |
| e2e/tds-widgets.spec.ts | One whole-rupee display expectation updated to approved psInr presentation; all workflow/payload assertions retained. |
| e2e/employee-tax-design-system.spec.ts | New four-width screenshots and workflow/error/cancel/year-preview tests. |
| docs/design-system/PHASE_4F_REPORT.md | This implementation, evidence and limitations record. |

An entry SHA-256 inventory is retained in artifacts/phase4f-employee-tax/entry-hashes.json. Comparison confirms only the five listed existing files changed. The six protected screen sources, API/service code, earlier reports and unrelated working-tree changes are unchanged by this task. All original event-handler expressions and all **16 native control binding/validation signatures** match the original template. Tax component class logic is identical after whitespace normalization.

## Before/after screenshots and responsive validation

Evidence directory: [artifacts/phase4f-employee-tax](evidence/phase4f-employee-tax). It contains **112 screenshots**: 14 before and 14 after views at each of 1440, 1280, 768 and 390 pixels. These are ignored local artifacts and must accompany the review when sharing it.

| Width | Before | After |
| --- | --- | --- |
| 1440 | [Full page](evidence/phase4f-employee-tax/before-page-1440.png) | [Full page](evidence/phase4f-employee-tax/after-page-1440.png) |
| 1280 | [Full page](evidence/phase4f-employee-tax/before-page-1280.png) | [Full page](evidence/phase4f-employee-tax/after-page-1280.png) |
| 768 | [Full page](evidence/phase4f-employee-tax/before-page-768.png) | [Full page](evidence/phase4f-employee-tax/after-page-768.png) |
| 390 | [Full page](evidence/phase4f-employee-tax/before-page-390.png) | [Full page](evidence/phase4f-employee-tax/after-page-390.png) |

Other screenshot names follow `{before|after}-{profile-readonly|profile-edit|employment-readonly|employment-edit|previous-employer|first-job|changed-job|annual-breakdown|salary-taxability|calculated-result|year-dialog|history-dialog|slabs-dialog}-{width}.png`. Saved/editing profiles, first-job and job-change controls, prior amounts and explicit calculation/result are exercised at all widths. Representative desktop/mobile profile, employment, breakdown and dialog screenshots were visually inspected. Page-overflow assertions pass; wide tables remain horizontally scrollable. Long field labels wrap; actions remain reachable. Mobile stacks summaries and controls; no financial values are recomputed for layout.

Accessibility checks cover associated labels, required markers, retained native constraints, named radio group, regions and tables, scoped column headers, keyboard/focus tooltips and Escape dismissal, named icon controls, focus restoration after dialogs and error/status announcements. The existing shared focus rings are retained. No dedicated screen-reader or physical-device audit was performed.

## Validation results

| Check | Result |
| --- | --- |
| Complete frontend unit suite | **416 passed in 49 files** after the changes. |
| Baseline screenshot/workflow browser run | **4 passed** before runtime edits. |
| Final relevant browser run | **47 passed, 1 unrelated pre-existing presentation mismatch failed**, detailed below. All six Phase 4F/current TDS tests passed, as did all six protected reference suites and the saved-paycheck/PDF test. |
| Backend before | **187 passed, 0 failed, 2 skipped in 25 suites**. |
| Backend after | **187 passed, 0 failed, 2 skipped in 25 suites**, identical outcome. |
| Actual tax-engine comparison | **Five cases byte identical**, including monthly and remaining-period allocation arrays. |
| Production frontend build | **Passed**; initial bundle about 821.66 kB. Existing bundle/component budget and PDF CommonJS warnings remain; budgets were not changed. |

The final browser command ran employee-tax-design-system, tds-widgets, tax-design-system, employees-design-system, employee-details-design-system, users-design-system, organization-design-system, salary-design-system, pay-check-details and indian-format-search specs. New tests cover exact decimal prior-employer save payloads, first-job clearing, required blank rejection, zero amounts, failed save retaining draft, Cancel restoration, target-year derived-regime preview/confirmation/cancellation, immutable original snapshots and explicit calculation count. Existing TDS tests additionally cover navigation cancellation, no calculation on reads/Edit/history and status/version behavior. Unit tests exercise permission tokens, year save/reload and existing validation edge cases.

### Existing broader browser limitation

The final expanded browser run failed only `e2e/indian-format-search.spec.ts:98`, “salary settings, statutory amounts and tax revision displays share Indian currency presentation.” At line 106, before reaching the employee tax tab, it expects `₹10,00,000.00` on Statutory Deductions while the approved psInr output is `₹10,00,000`. The test helper always uses two decimals for whole rupees. This test and Statutory Deductions implementation are unchanged from entry, as verified by hashes. It is an independent existing expectation mismatch, not a tax calculation difference. It was neither removed, modified nor hidden by exclusion, and the 48-test command is not represented as fully passing. Earlier Phase 4D failures/limitations remain recorded in that report and were not claimed resolved.

### Backend and payroll eligibility evidence

Ran existing income-tax, employee-tax-profile, run-payroll and payroll-generator suites with RUN_TAX_MONGO_TESTS=1 and RUN_PAYROLL_MONGO_TESTS=1. Real MongoDB tests use isolated fixture databases, not customer data. [Before results](evidence/phase4f-employee-tax/backend-before.json) and [after results](evidence/phase4f-employee-tax/backend-after.json) are retained.

Passing payroll regressions explicitly verify:

- Employees without a TDS configuration remain processable with zero TDS, including earlier payroll without TDS.
- Missing/stale estimates use zero without creating calculations during payroll.
- Current Calculated status uses authoritative saved TDS and deducts it once; gross, employer amounts and mixed payroll totals remain intact.
- Saved/submitted checks, finalized snapshots and PDF content are preserved; recalculation credits submitted periods and avoids duplicate deductions.
- First-job September projection uses seven eligible months and actual non-CTC gross; April joining retains full-year behavior. Job-change verified exemptions, previous TDS credits, zero prior TDS, excess-credit warnings and edited decimal amounts preserve their existing treatment.

Two opt-in backend browser cases were skipped in both runs because RUN_PAYROLL_BROWSER_TESTS was not enabled: production Angular mixed-payroll workflow and production Angular existing-year workflow. Their real API/service/persistence assertions ran in the surrounding suites, while the current frontend Playwright suites validate presentation/workflows. Legacy backend browser selectors include earlier generic Edit/Cancel names and are not claimed as executed UI evidence. The unrelated complete backend catalog and live deployed tenant were not tested.

## Annual TDS comparison

Before runtime edits and after implementation, ran the actual unchanged backend calculateAnnualTax, allocateMonthly and allocatePeriods functions with identical synthetic financial year/regime, wages/components, deductions, rebate, slabs, cess, surcharge and prior-employer wages/exemptions. Fixture values derive from existing regression tests; they are not tax-law advice, newly hardcoded frontend values or production defaults. Mid-year proration and previous-employer TDS service credits are independently verified in the passing integration suites above; the standalone engine comparison does not claim to replace those service tests.

| Case | Annual TDS before = after | Monthly TDS before = after |
| --- | ---: | ---: |
| Rebate | 0 | 0 |
| Above rebate | 97,500 | 8,125 |
| Surcharge boundary | 11,23,200 | 93,600 |
| High income | 80,04,750 | 6,67,062.50 |
| Previous-employer wages/exemptions | 89,700 | 7,475 |

Complete serialized outputs are byte identical. Before and after SHA-256: `fe03f399e7419062cca3a8a56ee02bcf28aab2a638da6dfc7df0ad366414757a`.

Evidence: [before](evidence/phase4f-employee-tax/tax-before.json), [after](evidence/phase4f-employee-tax/tax-after.json), [comparison](evidence/phase4f-employee-tax/comparison.json), [runner](evidence/phase4f-employee-tax/calculation-evidence.cjs).

## Reproduction and integrity

Frontend:

```powershell
npm.cmd test -- --watch=false
npm.cmd run build
npx.cmd playwright test e2e/employee-tax-design-system.spec.ts e2e/tds-widgets.spec.ts e2e/tax-design-system.spec.ts e2e/employees-design-system.spec.ts e2e/employee-details-design-system.spec.ts e2e/users-design-system.spec.ts e2e/organization-design-system.spec.ts e2e/salary-design-system.spec.ts e2e/pay-check-details.spec.ts e2e/indian-format-search.spec.ts --output=test-results/phase4f-final
```

Backend:

```powershell
$env:RUN_TAX_MONGO_TESTS='1'
$env:RUN_PAYROLL_MONGO_TESTS='1'
npm.cmd test -- --runInBand src/income-tax src/employee-tax-profile src/run-payroll src/payroll-generator --testTimeout=30000
node -r ts-node/register/transpile-only D:/projects/payroll-frontend/artifacts/phase4f-employee-tax/calculation-evidence.cjs after
```

No engine, employee tax logic, salary formulas, annual-first architecture, hire-date/partial-month rules, eligibility, rates/thresholds, configuration, services, APIs, models/schemas, permissions, organization isolation, payroll processing or saved employee/payroll/TDS/PDF data changed. Browser fixtures are synthetic; successful mocked saves do not establish live-tenant acceptance. UI and backend scoped results, skipped cases and the independent browser mismatch are explicitly distinguished.

## Git status and approval gate

Existing frontend work was preserved: entry status had 51 modified tracked paths and 17 untracked entries. This phase changes five existing files and adds the browser spec and this report (the report is within an already-untracked directory). Final short-status counts are **56 modified tracked paths and 18 untracked entries**, including earlier work, not exclusively Phase 4F. Backend remains clean; index remains empty. Full final status is retained in [git-status-final.txt](evidence/phase4f-employee-tax/git-status-final.txt). No staging, commit, push, reset, clean or discard occurred. Screenshots/evidence are local ignored artifacts.

**Phase 4F remains OPEN for explicit Product Owner visual approval. Do not begin Phase 4G automatically.**
