# Phase 1 — Design Tokens implementation report

Date: 01 Nov 2026. Scope: the user's Phase 1 clarification, using the supplied v1.1 reference package. No later phase is implemented.

## Files created and modified

| File | Phase 1 action and purpose |
| --- | --- |
| `src/styles.scss` | Created as the global Sass entry; loads tokens, then the unchanged existing CSS |
| `angular.json` | Changed only the global stylesheet entry from `src/styles.css` to `src/styles.scss` |
| `src/styles/_tokens.scss` | Updated the existing untracked setup file: preserve the declared font stack, replace reference typography selectors with definitions, and add semantic aliases/conventions |
| `docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md` | Updated the existing untracked setup document with approved Phase 1 scope, actual font, token inventory, employee terminology, actual status inventory and deferred decisions |
| `docs/design-system/CODEX_PROMPTS.md` | Updated its Phase 1 prompt to prevent the superseded component/body import and screen adoption instructions from being reused |
| `docs/design-system/PHASE_1_REPORT.md` | Created this implementation and validation report |

At task entry, `AGENTS.md`, `docs/design-system/` and `src/styles/` were already untracked from the setup task. Their existing content was preserved except for the explicitly listed Phase 1 updates. `AGENTS.md` and `src/styles/_ps-components.scss` remain unchanged. Nothing was staged, committed or pushed.

## Font discovery

- Existing exact declaration in `src/styles.css`: `font-family:Inter,'Segoe UI',Arial,sans-serif`.
- `--font-sans` preserves this stack, replacing the supplied placeholder.
- No Inter font import, browser font-face definition or bundled Inter font was found. The resolved rendered font was not verified; it depends on installed fonts and fallback. No discrepancy in the resolved face is claimed.
- Employee IDs separately retain `font-family: monospace` in their existing component CSS.
- The supplied mono token is retained for future approved adoption; it is not applied to employee IDs in Phase 1.
- PDF Noto Sans and its loading/embedding code are unchanged.

## Token inventory and integration

The canonical source is `src/styles/_tokens.scss`: 153 unique custom properties, emitted in one `:root` block. No JSON source, framework, font, icon library or dependency was added.

| Category | Contents |
| --- | --- |
| Colours | Original brand, accent, page/card/sunken/hover surfaces, text, border and focus values; primary/secondary/accent aliases |
| Typography | Preserved UI stack; reference mono stack; four weights; 14 role shorthands with size/line-height/weight and applicable letter spacing |
| Spacing | Supplied 4–48px scale; card padding, form-row gap and table-cell padding aliases |
| Borders/radii | 1px standard width, card-border alias, approved control/hover colours; supplied 4/6/8/12px radii |
| Shadows | No resting card shadow; supplied popover/dialog shadows; dropdown/modal aliases |
| Dimensions | Controls/buttons/inputs, icons/icon button, table header/rows, sidebar/top bar/content limit |
| Status | Success, warning, error/danger, information and neutral text/background/border aliases; no runtime business-state map |

All original palette and dimension values are retained. New aliases reuse them; typography values are transcribed from the supplied reference classes. The removed `.ps-text-*` selectors were never imported into the application. The token partial now emits definitions only.

The Sass entry uses `@use './styles/tokens'` and `@use './styles.css'`. Existing global CSS, including the CDK overlay import, is preserved. The reference component stylesheet and its body rule are not imported. Existing screens do not consume any new tokens.

## Functional preservation

| Protected area | Result |
| --- | --- |
| Backend/NestJS files | Unchanged; no backend write performed |
| Business, salary, EPF/EPS/ESI and payroll calculations | Unchanged |
| Income Tax/TDS calculations | Unchanged |
| Payroll workflows, employee lifecycle and filtering | Unchanged |
| API contracts, authentication and authorization | Unchanged |
| Database schemas and stored values | Unchanged |
| HTML templates, events, routes and form bindings | Unchanged |
| Existing component styles and original global CSS | Unchanged |
| Validators, date/timezone handling and payroll periods | Unchanged |
| PDF generation and report formatting | Unchanged |
| Existing test code and business expectations | Unchanged |

Every production JavaScript bundle has the same SHA-256 hash as the pre-change baseline, including lazy chunks containing component templates/styles. The tracked diff contains only the one-line Angular global-style entry change; other task changes are in new or previously untracked foundation/documentation files.

## Validation

| Check | Result |
| --- | --- |
| Pre-change production build | Passed; baseline CSS and JavaScript hashes captured outside the repository |
| Phase 1 production build | Passed; Sass compiled successfully |
| Unit tests: `npm test -- --watch=false` | 36 test files passed; 268 tests passed; no failed/skipped unit tests |
| Browser suite: `npm run test:browser` | 65 tests: 53 passed, 4 skipped, 8 failed; seven failures reproduced on baseline and the PDF timeout passed on rerun |
| Definition-only Sass output | Passed: exactly one `:root` rule containing custom-property declarations only |
| Duplicate tokens / unresolved aliases | Passed: zero duplicates, zero unresolved references |
| Existing compiled CSS | Passed: identical PostCSS syntax tree after removing the added token root block; includes rule order and declarations |
| Production JavaScript | Passed: all baseline bundle names/hashes identical |
| Browser visual comparison | Passed: Employees and Salary Components screenshots were byte-identical with tokens enabled versus removed, at 1440×1000 in headless Edge with mocked APIs |
| Whitespace review | `git diff --check` passed |
| Lint | No lint script is configured; no tooling added in this phase |

The screenshot comparison removes only the definitions from the same rendered page. Combined with the compiled-CSS baseline comparison, it verifies representative visual neutrality; it is not an exhaustive visual audit or verification of the resolved font face.

The baseline build already reports the initial-bundle warning, three component-style budget warnings and PDF dependency CommonJS warnings. The final build retains these warnings. Initial raw size increased from 780.59kB to 785.95kB solely through the added stylesheet definitions; there are no build errors.

The first annual PDF download test timed out during the full browser run. The same test subsequently passed on both the baseline and token-enabled app (3.5s and 3.8s test durations). The timeout is reported as an intermittent result, not asserted to be a baseline defect.

Persistent browser failures are checked separately against production assets with the original baseline global CSS. All production JavaScript hashes were already proven identical to the pre-change build. Baseline runs use port 4201 and temporary output directories outside the repository, without changing application or test source.

| Browser failure | Baseline evidence |
| --- | --- |
| `conditional-formulas.spec.ts:5` — advanced IF editing | Reproduced: exact `Edit` button selector times out |
| `formula-components.spec.ts:4` — formula component editing | Reproduced: exact `Edit` button selector times out |
| `management-delete.spec.ts:3` — employee deletion/selection | Reproduced: test waits for an employee-row checkbox absent from the current directory |
| `management-delete.spec.ts:17` — salary dependency repair | Reproduced: exact `Edit` button selector times out |
| `mandatory-components.spec.ts:2` — mandatory percentage editing | Reproduced: exact `Edit` button selector times out |
| `settings.spec.ts:3` — settings editing | Reproduced: exact `Edit` button selector times out |
| `unified-payroll.spec.ts:3` — unified table structure | Reproduced: test expects nine column headers; current table has ten |

These failures are not corrected in this phase: changing screen handlers, existing components or business-test expectations would exceed the approved token-only scope.

Four existing live-backend tests were skipped because administrator credentials were not supplied: `employee-modal-selection.spec.ts:41`, `employee-modal-selection.spec.ts:52`, `employees.spec.ts:2`, and `user-management.spec.ts:4`. No test was newly marked skipped, and no test source was changed.

Baseline failure details remain in the system temporary directory under `paystream-phase1-baseline-tests`, `paystream-phase1-baseline-formula`, `paystream-phase1-baseline-delete`, `paystream-phase1-baseline-mandatory`, `paystream-phase1-baseline-settings` and `paystream-phase1-baseline-unified`. The passing PDF recheck is under `paystream-phase1-pdf-recheck`. Normal browser-run diagnostics are in the existing ignored `test-results/` directory.

## Review against the rollout rules

- No services, models, API clients, guards, resolvers, validators, calculations, routing logic, environments, templates, component styles or test expectations changed.
- The `angular.json` change is limited to the global stylesheet entry, necessary to compile the supplied Sass foundation.
- Literal values are confined to the canonical token source. The unimported reference component stylesheet remains unchanged for later review.
- Existing handlers, form controls and links remain intact because their source files are unchanged.
- No changed templates require money/date/status conversion, icon accessibility changes or per-screen redesign checks.
- Consistency checklist rows 1–19 and 21: N/A; no screen was changed. Row 20 (UI-only): Pass.
- `main...HEAD` has no phase commits; review includes the tracked working-tree diff and all untracked files rather than relying on a commit-only comparison.

## Deferred decisions and known limits

- Employee filters retain Active/Terminated/All; design documentation corrected without changing bindings or option order.
- No Employees pagination exists; none added.
- Actual payroll review/eligibility, tax calculation/publication and compound payment statuses are inventoried in the design reference. Unapproved tones use a neutral foundation only; no new business statuses or runtime mapping were created.
- Date pipes/styling, timezone-sensitive display choices, shared components, token adoption, icon migration, component lint tooling and PDF formatting remain outside Phase 1.
- DS-011 remains unapproved. Existing approved palette values and component dimensions are unchanged.
- Supplied `_ps-components.scss` still contains broad selectors and literal dimensions. It must be reviewed separately before any future integration.

## Completion gate

**Phase 1 – Design Tokens: Completed.** The token foundation, documentation and scoped verification are complete. The browser suite is not fully green: the seven baseline failures and intermittent PDF timeout are explicitly reported above. They remain outstanding repository validation issues, not silently waived or repaired outside this scope.

No Phase 2/2a/2b/3/4 work was started. Await user approval before any next phase. No files were staged, committed or pushed.
