# Phase 4E – Income Tax / TDS Configuration

Date: 02 November 2026. Status: **Visually Approved and Closed**.

## Formal Product Owner approval

- Phase: 4E ? Income Tax / TDS Configuration.
- Approval date: 02 November 2026.
- Approval authority: Product Owner; explicitly granted after visual review.
- Visual implementation: Approved.
- Responsive implementation: Approved.
- Design-system consistency: Approved.
- Tax calculation regression evidence: Retained.

Income Tax / TDS Configuration is now the sixth protected visual reference. This closure authorizes documentation updates only. All implementation findings, tests, tax comparisons, limitations and screenshot evidence below are retained. References below to the open approval gate describe the implementation-time state, superseded by this formal approval. Phase 4F has not started and requires separate explicit instructions.

## Objective and investigation

Apply the shared PayStream design system to the existing Tax Configuration screen without changing configuration values, tax calculations, persistence or workflows. Reviewed the design system, component library, prompts, Phases 1–4D reports and AGENTS.md, the actual component/template/styles, TaxApi integrations, backend configuration and engine code, tests, and existing TAX-CONFIGURATION-WORKFLOW-VERIFICATION, TAX-CONFIGURATION-UI-IMPROVEMENTS, TAX-CONFIGURATION-SAVE-FIX and INDIAN-INCOME-TAX-TDS-ENGINE documentation.

The five approved screens remain protected and unchanged by this phase. Earlier approval records and technical findings are retained.

## Existing section and workflow inventory

| Section | Existing controls and behavior retained |
| --- | --- |
| Financial Years | Name, code, start/end dates, applicable legislation and rule version; required fields and existing date/code validation; add form, save/cancel, activation/deactivation confirmation; saved year metadata and active status. No financial-year edit workflow exists in this screen. |
| Tax Master | Financial year, regime, effective date, standard deduction, rebate eligibility limit, maximum rebate, cess percentage, minimum/maximum age, income/liability rounding and rebate/surcharge marginal-relief switches. Existing required/min/max/step constraints and section save retained. This section remains directly editable as before. |
| Progressive Tax Slabs | From/to amounts (blank upper bound means unlimited), percentage, add/remove draft rows, independent edit/save/cancel and existing boundary/order validation. Readonly saved presentation switches to the original number controls when editing. |
| Surcharge Thresholds | Threshold amount, surcharge percentage, add/remove draft rows, independent edit/save/cancel, existing ordering/validation and marginal-relief description. |
| Salary Component Taxability | Existing component identifiers/names, treatment classifications, exemption amount and legal reference; load components, reviewed employer-contribution confirmation, legal references and review note. Existing direct editing and section save retained; no classifications or mappings added. |
| Tax History | Existing year/regime selection context, revision/version/effective and saved dates, metadata/status, pagination, view dialog, copy to editor and confirmed activation. Original historical rules remain immutable. |

There is **no organization-level tax settings section** in this component. None was invented. Organization Information/Address belongs to the separately approved Organization Settings screen and was not touched.

The existing global Save new revision workflow, incomplete-draft handling, independent section snapshots, dirty-navigation confirmation, reload/retry feedback, activation confirmation and revision publication semantics remain intact. All 33 native input/select/textarea control binding/validation signatures and original event handlers were compared with the original template and preserved. The entire TaxConfiguration class body is unchanged; TypeScript edits only register presentation dependencies and the local stylesheet.

## UI implementation

Reused PageHeader, Card title/subtitle/actions/footer, DataTable, FormField/FieldControl, Button, IconButton, StatusBadge, psDate and psInr. Six separate cards preserve the original section order. Shared Edit, View and Close icons retain shared action conventions; Add uses the shared add icon. Copy/Activate/Remove remain explicit text actions using standard buttons. No new action icon mapping or shared-component restyle was introduced.

Saved slab/surcharge currency values use Indian rupee formatting and rates show percent units. Editing retains raw numeric values; currency prefixes do not alter models. Dates use the shared date pipe; history time retains its existing hours/minutes display. Saved/Unsaved/Published metadata uses the shared neutral fallback; active status uses the established mapping.

Local CSS uses existing tokens, compact layouts and a responsive field grid. Wide tables scroll within the shared table container rather than squeezing numeric editors. Shared SettingsTabs is retained unchanged, consistent with the prior approved settings screens.

## Files changed by Phase 4E

| File | Reason |
| --- | --- |
| src/app/features/tax-management/tax-configuration.html | Shared components, labels, formatting and accessible presentation; original handlers/controls retained. |
| src/app/features/tax-management/tax-configuration.css | Screen-local token styling and responsive layout. |
| src/app/features/tax-management/tax-configuration.ts | Presentation imports/metadata only. |
| src/app/features/tax-management/tax-component-workflow.spec.ts | Two field selectors updated for shared FormField wrappers; assertions retained. |
| e2e/settings-ui.spec.ts | Card selectors and responsive horizontal-scroll checks updated; existing workflow assertions retained. Earlier unrelated changes in this already-dirty file were preserved. |
| e2e/tax-design-system.spec.ts | New visual, responsive, configuration and revision workflow coverage. |
| docs/design-system/PHASE_4E_REPORT.md | This implementation and validation record. |

## Before/after screenshots and responsive review

88 local screenshots are in [artifacts/phase4e-tax](evidence/phase4e-tax): 11 before and 11 after views at each width 1440, 1280, 768 and 390 pixels. The directory is ignored by Git, so preserve it with this review evidence. Each width contains full page, all six sections, financial-year form, slabs editor, surcharge editor and history dialog. Synthetic fixture data is used throughout.

| Width | Before | After |
| --- | --- | --- |
| 1440 | [Page](evidence/phase4e-tax/before-page-1440.png) | [Page](evidence/phase4e-tax/after-page-1440.png) |
| 1280 | [Page](evidence/phase4e-tax/before-page-1280.png) | [Page](evidence/phase4e-tax/after-page-1280.png) |
| 768 | [Page](evidence/phase4e-tax/before-page-768.png) | [Page](evidence/phase4e-tax/after-page-768.png) |
| 390 | [Page](evidence/phase4e-tax/before-page-390.png) | [Page](evidence/phase4e-tax/after-page-390.png) |

Other screenshot names follow `{before|after}-{financial-years|master|slabs|surcharge|taxability|tax-history|year-form|slabs-edit|surcharge-edit|history-dialog}-{width}.png`. Responsive checks cover page overflow, contained table scrolling and reachable final columns, wrapping actions, readable fields and dialogs. Mobile uses a single field column; desktop uses a compact grid.

Accessibility: associated labels and unique control IDs, required markers matching original validators, retained native input semantics, named regions/tables, scoped table headers, shared named icon controls/tooltips, status/alert announcements and existing dialog dismissal/confirmation behavior. Browser coverage exercises keyboard Escape and field access. This is not a formal assistive-technology audit.

## Validation results

| Check | Result |
| --- | --- |
| Complete frontend unit suite | **416 passed across 49 files**. |
| Relevant browser suite | **39 passed**: tax design-system/settings plus Employees, Employee Details, User Management, Organization Settings and Salary Components reference suites. |
| Final strengthened table-scroll/settings check | **2 passed**; final columns reached by scrolling the table container to its end. |
| Backend tax regression suites | **66 passed, 0 failed, 0 skipped across 8 suites**, with RUN_TAX_MONGO_TESTS=1. |
| Backend configuration suites | **79 passed, 0 failed, 0 skipped across 3 suites**, with RUN_TAX_MONGO_TESTS=1. |
| Production frontend build | **Passed**; existing initial-bundle/component budget and CommonJS warnings remain. |

Backend integration runs use isolated Mongo fixtures. The initial baseline tax run without the opt-in flag was 52 passed/14 skipped; the final flagged run executed those integration cases. An intermediate configuration run used the wrong opt-in name (46 passed/33 skipped); the correctly flagged final run above supersedes it. Raw summaries are retained in artifacts/phase4e-tax/backend-tax-before.json, backend-tax-after.json and backend-configuration-mongo.json. No calculation assertions were weakened.

Browser workflows cover independent section saves, error/retry with drafts preserved, cancel confirmation, component refresh, reload persistence, exact request payloads, financial-year creation and date rejection, activation cancellation/confirmation, history pagination/view/copy/activation, immutable original revisions, and first complete reviewed revision creation.

## Annual tax/TDS comparison

Ran the actual unchanged backend tax-engine calculateAnnualTax, allocateMonthly and allocatePeriods functions before and after the UI changes. Each pair uses identical financial year, regime, annual wages, components, deduction, rebate, slabs, cess, surcharge and previous-employer input. Fixtures are synthetic regression inputs derived from existing tests, not tax-law guidance or new production defaults.

| Case | Annual TDS before = after | Monthly TDS before = after |
| --- | ---: | ---: |
| Rebate | 0 | 0 |
| Above rebate | 97,500 | 8,125 |
| Surcharge boundary | 11,23,200 | 93,600 |
| High income | 80,04,750 | 6,67,062.50 |
| Previous employer wages/exemptions | 89,700 | 7,475 |

All complete outputs, monthly allocations and remaining-period allocations are **byte identical**. Both JSON files have SHA-256 `fe03f399e7419062cca3a8a56ee02bcf28aab2a638da6dfc7df0ad366414757a`.

Evidence: [before](evidence/phase4e-tax/tax-before.json), [after](evidence/phase4e-tax/tax-after.json), [comparison](evidence/phase4e-tax/comparison.json), [runner](evidence/phase4e-tax/calculation-evidence.cjs). Previous-employer TDS adjustment service behavior is covered by the existing backend regression suites; the snapshot specifically includes previous-employer wages/exemptions.

## Integrity, limitations and Git state

Tax engine, parser/evaluator, tax rates/defaults, validators, TaxApi/service contracts, backend, schemas, permissions, organization isolation and payroll integration were not modified. No live employee/payroll/configuration/history data or PDFs were changed. Hash comparison against the entry snapshot confirms existing files changed only in the five Phase 4E files listed above; approved screen sources and pre-existing work are preserved.

Browser API data is mocked; backend integration tests independently exercise isolated persistence. This does not replace live-tenant acceptance testing or Product Owner visual approval. Missing organization tax settings and financial-year editing were reported instead of added. Existing backend legacy browser scripts were not used as the UI gate; current Playwright coverage validates this screen. The unrelated full backend catalog was not rerun. The five backend failures and unrelated legacy browser limitation documented in Phase 4D remain recorded there and were not rewritten or claimed resolved. No shared design-system deviation was introduced; unchanged shared SettingsTabs remains a legacy dependency.

Frontend Git remains dirty with extensive unstaged/untracked work already present at entry (the index was empty and remains empty). This phase adds the report and tax browser spec and modifies only the five listed existing files. Final frontend short status: 51 modified tracked paths and 17 untracked entries (including directory entries); no staged changes. Backend Git is clean. Nothing was staged, committed, pushed or discarded. Generated screenshots/test outputs/calculation evidence remain local ignored artifacts. Phase 4E remains **OPEN**, awaiting explicit Product Owner approval; do not start Phase 4F automatically.
