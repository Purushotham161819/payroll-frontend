# Phase 4D - Salary Components UI/UX implementation

Date: 02 November 2026 (America/Chicago).

**Status: Visually Approved and Closed.** Phase 4E will be initiated separately; this approval does not authorize its start.

## Formal Product Owner approval

- Phase: **4D - Salary Components**.
- Status: **Visually Approved and Closed**.
- Approval date: **02 November 2026**.
- Approval authority: **Product Owner**, explicitly granted after visual review of the implemented screen.
- Visual implementation: **Approved**.
- Responsive implementation: **Approved**.
- Design-system consistency: **Approved**.
- Calculation regression evidence: **Retained**.

Salary Components joins Employees (Phase 3), Employee Details (Phase 4A), User Management (Phase 4B) and Organization Settings (Phase 4C) as an officially approved, protected PayStream visual reference. Preserve all five unless the Product Owner explicitly requests a change or a genuine defect is identified. The shared PayStream Design System remains the single source of truth. Preserve established page headers, typography, colors/tokens, buttons/icon buttons, cards/tables, form fields, tooltips, spacing/alignment, responsive behavior, navigation and interaction conventions. This approval authorizes documentation updates only, not changes to payroll, formulas, statutory settings, APIs or other functionality. All existing findings below, including the five backend test failures and unrelated legacy browser-test limitation, remain recorded without alteration.

## Objective and references

Apply the shared PayStream Design System to Salary Components and its explicitly requested Statutory Deductions settings, preserving annual-first payroll, formulas, dependencies, saved data and security. Reviewed current AGENTS.md, design-system source of truth, component library, CODEX_PROMPTS and Phase 1/2A/2B/3/4A/4B/4C reports. Employees, Employee Details, User Management and Organization Settings remain protected references; none of their runtime implementations or approval records changed.

## Existing functionality inspected

Salary Components is src/app/settings/settings.ts/.html/.css. Its existing SalaryComponentService lives in settings.ts. Existing APIs are list/create/update/delete/status under /salary-components and the dynamic /salary-components/formula-variables metadata endpoint. Models, service implementations, payload normalization, HTTP methods and response handling remain unchanged.

The existing table preserves all nine columns: Component Name, Component Code, Component Category, Calculation Base, Calculation Type, Calculation Value, Show in Payslip, Status and Actions. Categories remain earning, deduction and allowance; statuses remain active/inactive. BASIC, DA and RA retain their mandatory significance, unavailable-deletion explanation, locked identity/type/category/status rules, configured percentages and existing base selection behavior.

Add/edit controls retain name/code validators, category/status options, dynamic bases, calculation type, percentage/fixed number, fixed period, formula, reference identifiers and payslip visibility. Percentage remains 0-100; fixed values retain the existing maximum and monthly/annual period choices. Payslip visibility still defaults true. Save trims names/uppercases codes exactly as before; no new required/default field or behavior was added.

### Calculation bases and formulas

Existing base options remain Annual CTC, Gross Wages, Core Wages and the records returned by options()/allowed(), including the existing inactive/self/dependency exclusions. They are not replaced or hard-coded differently. The form still hides base/value controls for formulas and loads available variable metadata using the existing handler.

The native formula textarea retains its 1024-character limit, original syntax, safe parser integration, conditional display, help toggle, MIN/MAX/IF examples, operators, percentage syntax, dynamic amount/rate variables, insertion behavior, loading/retry messages and component reference identifiers. The formula string, variable keys and parser/evaluator/graph code are unchanged. No eval or Function implementation was introduced.

### Statutory settings

The existing /settings/statutory-deductions screen is included because section 7 of the Phase 4D instruction explicitly requests its presentation. It retains:

- Annual EPF Ceiling Limit (required amount).
- EPF Employer Contribution Rate and EPS Employer Contribution Rate (required percentages).
- Is Ceiling Limit Applicable (existing checkbox/default false).
- Annual ESI Wage Ceiling Limit (optional; existing no-default/blank handling).
- ESI Employer Contribution Rate (required percentage).
- Existing Save Settings and Reset Changes actions. Reset remains reset-in-place, not a new edit/cancel workflow.

No employee-rate input was added: employee deductions remain configured through existing component/formula behavior. All statutory min/max/step/pattern attributes, numeric model values, API field selection and optional ESI omission behavior remain unchanged. Native number inputs were retained; no formatted value accessor was attached.

### Revision/history boundary

Salary Components and Statutory Deductions have no configuration revision/history UI or Save New Revision/Load Current Salary Components actions. Those belong to Tax Configuration. No revision feature was added, migrated or repaired here. Its implementation was untouched; the existing cross-settings browser regression still exercises its current save behavior. No claim of a new salary revision workflow is made.

## UI/UX changes

- Shared PsPageHeader for existing titles/descriptions and the existing Add Salary Component action, with the approved plus glyph and primary hierarchy.
- Shared PsCard/PsDataTable for the list, retaining every column and horizontal scrolling instead of hiding data. Calculation values are right-aligned/tabular; component codes use the shared ID type. Formulas remain readable, wrap within a bounded cell and retain complete text with a shared tooltip.
- Mandatory and account status use PsStatusBadge. Mandatory and Inactive use the existing neutral fallback; no status mapping or statutory rule was invented.
- Edit uses the approved 32px pencil IconButton. Custom status/delete actions move to the approved More Actions menu; deletion stays behind the existing confirmation and dependency checks. Mandatory actions remain unavailable exactly as before.
- Native add/edit dialog, existing open/close/save handlers and focus return to Add remain. Shared FormField/FieldControl wrap existing controls; required indicators, field errors, 40px controls, checkbox and Save/Cancel hierarchy match references. Save is the shared primary button with loading feedback; Close is the approved icon button.
- Formula controls use the same field/button/info-icon patterns with a readable multiline area and bounded help panel. Fixed corrupted display separators in help/loading copy; formula examples and evaluation are unchanged.
- Statutory groups use shared cards/fields, INR prefixes and percent suffixes, existing helper/error wording, checkbox, Reset/Save buttons and display-only PsInr previews. Whole-rupee previews now follow approved grouping/no-decimal treatment, while zero/paise retain pipe conventions. Models/payloads are untouched.
- Local styles use existing palette/type/dimension/spacing/radius/focus tokens. No shared component runtime implementation, new font, icon library, token, dependency or global stylesheet was changed. Existing 650px/750px form breakpoints remain. SettingsTabs and shared DeleteConfirmation remain unchanged across modules.

Shared components reused: PsPageHeader, PsCard/CardTitle, PsDataTable, PsButton, PsIconButton, PsIcon, PsFormField/PsFieldControl, PsStatusBadge, PsTooltip and PsInrPipe; existing CDK menus, SettingsTabs, native dialogs and DeleteConfirmation are reused.

## Files modified

| File | Purpose |
| --- | --- |
| src/app/settings/settings.ts | Presentation imports/component metadata only; Settings class logic and SalaryComponentService unchanged. |
| src/app/settings/settings.html | Shared list/form/action presentation, accessibility labels and display-only money/status formatting. |
| src/app/settings/settings.css | Token layout, native dialog/formula/menu presentation, responsive fields. |
| src/app/statutory-deductions/statutory-deductions.ts | Presentation imports/component metadata only; class, model, API and helper functions unchanged. |
| src/app/statutory-deductions/statutory-deductions.html | Shared cards/fields/buttons/checkbox and display-only INR previews with original bindings/validation. |
| src/app/statutory-deductions/statutory-deductions.css | Token-based statutory layout/alerts/responsive spacing. |
| src/app/statutory-deductions/statutory-deductions.spec.ts | Preserve four-invalid-field assertion using shared validation markup; align whole-rupee preview expectation with PsInr. No payload/rule assertion removed. |
| e2e/salary-design-system.spec.ts | New before/after captures and four-width form/base/formula/keyboard/menu/scroll checks. |
| e2e/settings.spec.ts | Shared Add/Save labels, semantic form selectors and unambiguous component-code/Edit locator. |
| e2e/formula-components.spec.ts | Semantic required-field/Save/Edit selectors; retain formula/error/payload/PDF assertions. |
| e2e/conditional-formulas.spec.ts | Same selector adoption; retain IF syntax/payload and annual/monthly PDF assertions. |
| e2e/mandatory-components.spec.ts | Shared labels/semantic selectors and custom status menu; retain mandatory protection/percentage/base assertions. |
| e2e/management-delete.spec.ts | Salary-case menu/Save/Edit selectors only; original employee-case body remains byte-identical to HEAD. |
| e2e/settings-ui.spec.ts | Status/delete menu selectors and activation visibility within the menu; preserve all mutation/navigation assertions. |
| e2e/statutory-deductions.spec.ts | Use semantic numeric-control selectors with unchanged field values, validation, save/reset/error expectations. |
| docs/design-system/PHASE_4D_REPORT.md | This report and evidence index. |
| artifacts/phase4d-salary/ | 48 rendered screenshots, before/after calculation JSON, comparison summary, calculation runner and backend result JSON. Ignored under existing artifact convention. |

SHA-256 entry snapshots verify pre-existing edits outside these files were preserved. No approved-screen runtime, route/guard/auth/tenant code, payroll/PDF implementation, backend file or existing approval document changed. Settings and StatutoryDeductionsPage class bodies match HEAD after normalizing trailing line endings; TypeScript diffs contain only presentation imports/decorator metadata. No business method was rewritten.

## Before-and-after screenshots

Actual Angular rendering in headless Edge, synthetic API fixtures, reduced motion and the same viewport sizes/data before and after. No mockup or production data edit is used as visual evidence. Before captures completed before runtime edits.

| View | Before | After |
| --- | --- | --- |
| Desktop list | [Before](evidence/phase4d-salary/before-list-1440.png) | [After](evidence/phase4d-salary/after-list-1440.png) |
| Laptop list | [Before](evidence/phase4d-salary/before-list-1280.png) | [After](evidence/phase4d-salary/after-list-1280.png) |
| Tablet list | [Before](evidence/phase4d-salary/before-list-768.png) | [After](evidence/phase4d-salary/after-list-768.png) |
| Mobile list | [Before](evidence/phase4d-salary/before-list-390.png) | [After](evidence/phase4d-salary/after-list-390.png) |
| Add form desktop | [Before](evidence/phase4d-salary/before-add-1440.png) | [After](evidence/phase4d-salary/after-add-1440.png) |
| Add form mobile | [Before](evidence/phase4d-salary/before-add-390.png) | [After](evidence/phase4d-salary/after-add-390.png) |
| Calculation base | [Before](evidence/phase4d-salary/before-bases-1440.png) | [After](evidence/phase4d-salary/after-bases-1440.png) |
| Mandatory component edit | [Before](evidence/phase4d-salary/before-mandatory-1440.png) | [After](evidence/phase4d-salary/after-mandatory-1440.png) |
| Formula edit/help | [Before](evidence/phase4d-salary/before-formula-1440.png) | [After](evidence/phase4d-salary/after-formula-1440.png) |
| Statutory desktop | [Before](evidence/phase4d-salary/before-statutory-1440.png) | [After](evidence/phase4d-salary/after-statutory-1440.png) |
| Statutory mobile | [Before](evidence/phase4d-salary/before-statutory-390.png) | [After](evidence/phase4d-salary/after-statutory-390.png) |

Every one of the six views (list/add/bases/mandatory/formula/statutory) has before/after captures at 1440, 1280, 768 and 390px, height 1000px. Calculation-base captures show the focused existing selector; browser assertions verify the actual dynamic option list rather than relying on an operating-system dropdown screenshot.

Visually inspected desktop list/formula/statutory and mobile add-form captures. Compare [Employees](evidence/phase3-remediation/after-desktop.png), [Employee Details](evidence/phase4a-employee-details/after-details-1440.png), [User Management](evidence/phase4b-users/after-directory-1440.png), [Organization Settings](evidence/phase4c-organization/after-readonly-1440.png). The shared controls/cards/type/actions match these references. Native dialog/formula/help areas scroll vertically when needed; tables scroll within their region to retain all nine columns/actions.

## Responsive and accessibility results

All four responsive tests completed: **1440, 1280, 768 and 390px: PASS**. Checked actual field heights, viewport-bounded dialogs, formula area larger than 90px, dynamic base options, mandatory locks, variable insertion preserving exact strings, accessible Save reached through vertical scrolling, 32px row-menu targets, keyboard Enter/Escape/focus restoration, statutory input values/previews and no page-wide horizontal overflow. Existing 650px/750px breakpoints stack form grids without compressing controls.

Shared labels, required indicators, checkbox labels, aria-invalid/error links, semantic table headings, native dialogs, tooltips, focus outlines and menu semantics are retained/adopted. Roles/accessibility names exclude decorative required stars; tests use semantic textbox/spinbutton names rather than matching hidden marker text in labels. No validation rule or hidden business action was changed to satisfy a test. Dedicated screen-reader/physical-device testing was not performed.

## Calculation comparison - actual backend engine

Executed the existing annualPayroll and calculateProjection functions before runtime UI edits, then again after. Four identical input configurations cover ESI eligibility, above-ceiling wages, fractional annual CTC and fixed allowance/formula deduction. Each also evaluates existing 1-, 3-, 6- and 12-month projections. Stored complete outputs, including annual components, totals, diagnostics and projections, are **byte-for-byte identical**.

- [Before values](evidence/phase4d-salary/calculations-before.json)
- [After values](evidence/phase4d-salary/calculations-after.json)
- [Comparison summary](evidence/phase4d-salary/calculation-comparison.json)
- [Reproducible runner](evidence/phase4d-salary/calculation-evidence.cjs)

Both complete snapshots have SHA-256 f59932aa3177a2309b5f69ee6720881d95acf9184c3667aa8115b5f2ed6e8809.

Representative annual CTC 1200000 (the other cases and projections are in the linked complete evidence):

| Existing engine metric | Before | After | Difference |
| --- | --- | --- | --- |
| annualCtc | 1200000 | 1200000 | 0 |
| employerEpsContribution | 14994 | 14994 | 0 |
| employerEpfContribution | 6606 | 6606 | 0 |
| employerEsiContribution | 0 | 0 | 0 |
| annualGrossWages | 1178400 | 1178400 | 0 |
| annualBasicSalary | 471360 | 471360 | 0 |
| annualDearnessAllowance | 47136 | 47136 | 0 |
| annualRetainingAllowance | 70704 | 70704 | 0 |
| annualCoreWages | 589200 | 589200 | 0 |
| annualTotalAllowances | 0 | 0 | 0 |
| annualExcessAllowance | 0 | 0 | 0 |
| annualComplianceWageBase | 589200 | 589200 | 0 |
| annualTotalDeductions | 0 | 0 | 0 |
| annualNetPay | 1178400 | 1178400 | 0 |

The allowance/formula case additionally retains annual allowances 12000, annual deductions 12000 and annual net pay 1166400 before/after. Eligibility and fractional-CTC cases exercise nonzero employer ESI and fractional outputs. No monthly-first derivation, Gross-times-12 rewrite, rounding change, parser/evaluator substitution or dependency-order change was introduced.

## Test/build results and baseline accounting

| Check | Result |
| --- | --- |
| Complete frontend unit suite | **49 files / 416 passed**, zero failed/skipped, final runtime template. |
| Final browser group | **43 passed**, zero failed/skipped among selected cases, including all four approved reference-screen suites. One known unrelated employee-selection case was explicitly deselected after its failure was investigated below. |
| Before visual run | **4 passed** before runtime edits. |
| Production frontend build | **PASS**, approximately 825.5 kB initial bundle. Existing bundle/component budget and CommonJS warning categories remain; no warning limit/dependency was changed. |
| Backend payroll-generator tests, before | **74 passed**, zero failures. |
| Backend payroll-generator tests, after | **74 passed**, zero failures; same suite and engine source. |
| Backend statutory tests with Mongo enabled | **16 passed**, zero failures/skips. |
| Backend salary-components default, before | **91 passed, 4 failed, 2 skipped**; 4 legacy calculation-fixture failures reproduced before UI edits. |
| Backend salary-components default, after | **91 passed, 4 failed, 2 skipped**, identical failure names/reasons. |
| Backend salary-components Mongo-enabled | **92 passed, 5 failed**, zero skips. Repeated independently with identical five failures, no backend changes. |
| Calculation snapshots | Four configurations plus 16 projections; complete serialized outputs identical. |
| Token/diff review | All CSS token references resolve; no new hard-coded colors/control dimensions; git diff --check passes. |

### Independently verified existing failures - not fixed or hidden

1. src/salary-components/salary-calculation.service.spec.ts has four legacy fixtures that omit/replace required BASIC/DA/RA configurations. Tests expecting dependency/percentage results instead hit the existing mandatory-component guard. All four failed before UI work and in the identical default after run. The production engine, tests and assertions were not changed.
2. With RUN_MONGO_TESTS=1, src/salary-components/mandatory-components.integration.spec.ts expects 404 when deleting a mandatory component, while the existing backend returns the protective 409 Conflict. Both independent Mongo-enabled runs produce the same failure. Backend source/Git status is unchanged, and these standalone tests do not import frontend UI. This existing test-contract mismatch is documented rather than changing delete protection or its assertion.
3. The unchanged first case of e2e/management-delete.spec.ts expects employee selection checkboxes and a selected-count footer that the approved Employees implementation does not have. It timed out at row.getByRole('checkbox').check() in two runs. That test body remains byte-identical to HEAD; the approved Employees implementation is also unchanged from entry. The current approved Employees deletion regression passes separately. The final command explicitly excludes only this unrelated selection case; it does not remove it or claim it passed.

No unresolved newly introduced Phase 4D failure remains. These baseline failures are still present and must not be read as an all-green backend/historical-browser catalog.

### Test corrections limited to presentation

Initial new screenshot setup matched BASIC cells in both code/base columns; narrowed the locator to the existing code column. Shared required markers necessitated semantic form-control selectors. Shared validation markup changed .invalid to .ps-field-error .error-text while preserving the four-error assertion; approved PsInr changed one whole-rupee display expectation from 15000.00 to 15000. Add/Save labels, Edit names and More Actions navigation were updated without removing payload, dependency, role, statutory-rate, reset, formula-error or PDF assertions. Formula helper corrupted display separators were corrected as text only.

### Reproduction commands

~~~powershell
npm.cmd test -- --watch=false
npm.cmd run build
npx.cmd playwright test e2e/salary-design-system.spec.ts e2e/settings.spec.ts e2e/settings-ui.spec.ts e2e/mandatory-components.spec.ts e2e/formula-components.spec.ts e2e/conditional-formulas.spec.ts e2e/statutory-deductions.spec.ts e2e/management-delete.spec.ts e2e/employees-design-system.spec.ts e2e/employee-details-design-system.spec.ts e2e/users-design-system.spec.ts e2e/organization-design-system.spec.ts --grep-invert="employee delete confirmation" --output=test-results/phase4d-final
~~~

Backend suites (existing code, isolated fixture databases where enabled):

~~~powershell
npm.cmd test -- --runInBand --testPathPatterns=payroll-generator --testTimeout=30000
npm.cmd test -- --runInBand --testPathPatterns=salary-components --testTimeout=30000
$env:RUN_MONGO_TESTS='1'
npm.cmd test -- --runInBand --testPathPatterns=salary-components --testTimeout=30000
npm.cmd test -- --runInBand --testPathPatterns=statutory-deductions --testTimeout=30000
node -r ts-node/register/transpile-only D:/projects/payroll-frontend/artifacts/phase4d-salary/calculation-evidence.cjs after
~~~

JSON results are retained as backend-payroll-after.json, backend-statutory.json, backend-salary-default-after.json, backend-salary-after.json and backend-salary-confirmation.json under the same artifacts folder. The first default run before edits is recorded in session output with the same counts as the after result. npm.cmd avoids the host npm.ps1 policy without changing execution policy. Existing Playwright single-worker/headless Edge configuration was used.

## Security, data integrity and remaining limits

No authentication/authorization, role guards, organization ownership/ID handling, backend/controller/service/schema, environment, formula/parser/evaluator/graph, saved configuration, revision snapshot, payroll/TDS/PDF or employee record code changed. Dynamic options and API payloads remain sourced from existing methods. Browser APIs use synthetic fixtures; mocked success is not proof of live tenant isolation. Backend suites test actual local HTTP/service behavior with isolated Mongo test data where enabled, not a deployed customer environment. No production configuration was saved.

The shared Settings navigation and shared DeleteConfirmation retain their existing presentation across modules; no screen-only override was applied. No new reusable design decision was necessary, so central guidance and historical approvals were not changed. Statutory Reset remains the existing reset workflow, and missing salary revision features remain absent. Formula help/dialogs can require scrolling on narrow/short screens; all controls remain reachable.

Not executed: complete unrelated backend/browser catalogs, live deployed authentication/tenant tests, physical mobile hardware or dedicated screen-reader audit. Existing backend baseline failures and the unrelated employee-selection browser failure remain as listed. Correcting engine rules, mandatory delete contracts, protected-screen selection behavior or historical tests beyond presentation is not authorized by this phase.

## Git status and approval gate

Entry and final Git status inspected. Existing staged/unstaged/untracked work preserved; index remains empty. Backend remains clean. No stage, commit, push, reset, clean, branch switch or history rewrite was performed. Protected source/approval records remain unchanged by entry-hash comparison. Screenshot/comparison artifacts are ignored by existing repository rules and available locally, not staged.

**Phase 4D was formally visually approved and closed by the Product Owner on 02 November 2026. No Phase 4E work is authorized or started; the next phase requires separate explicit instructions.**
