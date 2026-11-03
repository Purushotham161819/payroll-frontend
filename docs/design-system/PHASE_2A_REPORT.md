# Phase 2a — Formatting utilities

**Phase 2a: Completed.** Date: 01 Nov 2026. No screen adoption or Phase 2b work performed. The user approved Phase 1 and authorized only the three formatting utilities and their supporting tests/documentation.

## Files created

All runtime utilities and their tests are in `src/app/shared/ui/pipes/`.

| File | Purpose |
| --- | --- |
| `inr-format.ts` | Shared presentation-only INR formatting, finite-number check, locale registration and precision-safe edit parsing |
| `ps-inr.pipe.ts` | Standalone `psInr` display pipe |
| `ps-inr-input.directive.ts` | Standalone `psInrInput` text-input numeric ControlValueAccessor |
| `ps-date.pipe.ts` | Standalone calendar-aware `psDate` display pipe |
| `ps-inr.pipe.spec.ts` | Currency examples, invalid input, negatives, large values and source-preservation tests |
| `ps-inr-input.directive.spec.ts` | Form integration, typing, cursor, precision, reset, validation preservation, disabled/updateOn/IME and invalid-entry tests |
| `ps-date.pipe.spec.ts` | Date/period/instant, leap year, invalid/range/early-year boundary and timezone tests |
| `docs/design-system/PHASE_2A_REPORT.md` | This report |

## Files modified

- `docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md`: implementation contracts, examples, precision/timezone limitations, inspection/reuse and the user-approved zero exception.
- `docs/design-system/CODEX_PROMPTS.md`: align the Phase 2a prompt with the approved requirements and implementation contracts.

No other pre-existing file was modified during Phase 2a. The branch is `main`. At entry, the Phase 1 `angular.json` change and setup/foundation documents/styles/AGENTS.md were already unstaged or untracked. Those changes were preserved. No file was staged, committed or pushed.

## Existing implementations inspected and reused

Inspected existing Angular CurrencyPipe, DecimalPipe, DatePipe, en-IN registration/global locale, statutory currency preview, payrollCurrency, annual/monthly report presentation, PDF formatting, payroll-calendar month choices, employee date validation/native inputs and lifecycle America/Chicago handling. No equivalent shared pipes/directive or custom value accessor existed.

The new utility reuses Angular formatCurrency/formatDate and the existing locale data. The common helper is shared by the pipe/directive rather than creating separate currency renderers. No existing payroll formatter was repurposed: payrollCurrency takes paise, lives in a protected calculation file and must keep its report contract. All existing formatters and services remain unchanged. No `PayStream-Component-Library.md` exists; the design reference documents intended usage instead of introducing another competing reference.

## `psInr`

- Finite numeric rupee values only; missing/invalid values return `—` without coercion.
- Nonzero whole values omit decimals; fractional values display two decimals; zero displays `₹0.00` as explicitly approved in this Phase 2a request. Negative zero is normalized for display, and negatives use Unicode minus.
- Required examples pass: 1000000 → `₹10,00,000`; 75000 → `₹75,000`; 125500.5 → `₹1,25,500.50`; 0 → `₹0.00`; 0.5 → `₹0.50`; -4500 → `−₹4,500`.
- Angular rounds values with more than two decimal places for display only. The source is never mutated, persisted, recomputed or sent through a new API path.
- Existing currency displays generally use two decimals everywhere. The specified nonzero-whole/zero/fractional convention is applied only to this new pipe; no existing screen behaviour changes. Extremely large numbers retain Angular's formatter behaviour, which may use scientific notation beyond normal currency magnitudes. JavaScript numeric precision cannot be recovered after upstream loss.

## `psInrInput`

- Opt-in `input[type=text]` ControlValueAccessor; supports reactive forms and ngModel while keeping a `number | null` model. No validators are registered or modified.
- Formats only when unfocused; focus shows the raw original number. Input events do not rewrite the text or move selection. Composition is buffered. Blur marks touched and formats the view without a second numeric model emission. Existing updateOn blur semantics and disabled/reset/programmatic writes are covered.
- Input formatting preserves represented fractional precision (125500.505 stays `₹1,25,500.505` on blur). Very small/large programmatic models retain scientific notation when ordinary formatting could hide precision.
- Clearing emits null, never zero. Malformed/incomplete/overflowing or precision-losing entry emits null and preserves raw text for correction. The parser rejects partial numeric prefixes; it does not calculate, clamp or silently round.
- Deliberate limitations: edit syntax is plain signed decimal, not pasted ₹/grouping/exponents; invalid optional fields have a null model just like empty fields, so caller validators remain responsible. This is a formatter/accessor, not a new validator.
- Native number inputs cannot contain formatted currency. The directive fails fast on non-text input types instead of changing their type or native constraints. Existing number inputs are not migrated. Any future adoption must preserve type-specific validators/native semantics explicitly in its separately approved phase.

## `psDate`

- Calendar-only YYYY-MM-DD returns `dd MMM yyyy` without timezone shifting; strict calendar validity is checked, including leap years and years 0001–9999.
- Month-only YYYY-MM returns `MMM yyyy`; no invented displayed day and no interpretation as a timestamp.
- ISO timestamps (T separator, optional seconds/milliseconds and optional Z/numeric offset), Date objects and epoch milliseconds use Angular's existing instant formatting. Optional timezone argument overrides DATE_PIPE_DEFAULT_OPTIONS.timezone; otherwise uses ambient local behaviour. No forced UTC, IANA conversion layer or changed global locale.
- `en-US` supplies consistent three-letter month labels, including Sep. A modern UTC month anchor avoids historical local-offset rounding errors for calendar years below 100.
- Null/undefined/empty/invalid/unsupported inputs return `—`, including invalid leap days, invalid offsets and epoch values outside the Date range. Date objects remain unmodified.
- Human/numeric date strings, payroll period calculations, date validation rules, native date controls and existing conversion utilities are not changed or adopted.

## Validation

| Check | Result |
| --- | --- |
| New formatting tests | 84 tests across three new spec files; all pass in the full unit run |
| `npm test -- --watch=false` | 39 files passed; 352 tests passed; no failures or skips |
| Production build | Passed; existing bundle/style budget and PDF dependency CommonJS warnings remain |
| `npm run test:browser -- indian-format-search.spec.ts` | 4 passed; no failures or skips |
| Source preservation | SHA-256 comparison of every pre-existing src/docs file plus global config, package manifests and AGENTS.md: only the two intended design documents differ |
| Runtime output | Production JavaScript chunk names/hashes remain identical to baseline; stylesheet filename/hash remains the Phase 1 output |
| Diff/whitespace | Complete tracked/untracked scope reviewed; `git diff --check` passes |

During development, boundary tests exposed historical timezone rounding and an out-of-range epoch rendering malformed text. Both were fixed in the new pipe, and the final full suite passes without changing existing tests or business expectations.

The browser check covers the existing Employees/search/navigation, Run Payroll/Pay Checks, salary/statutory settings and tax formatting paths. It does not exercise the unadopted utilities; their behaviours are covered through unit and Angular form-integration tests. The full 65-test browser suite was not repeated: Phase 1 already documented seven baseline selector/expectation failures and an intermittent PDF timeout. Those outstanding issues are not claimed fixed. This task adds no screen imports or runtime bundle changes.

## Strict review and functional preservation

- Backend/NestJS, schemas, APIs, authentication, organization isolation and stored values: unchanged.
- CTC, Gross, statutory contributions, EPF/EPS/ESI, TDS, Net Pay and pay-frequency calculations: unchanged.
- Run Payroll, employee lifecycle, Pay Checks, report/PDF generation and financial-year/payment date workflows: unchanged.
- Existing services, routing, models, validators, calculation utilities, environments, HTML, click/submit handlers, form bindings, component styles and tests: unchanged.
- No global styling, font, token, icon or dependency change. Phase 1 hashes are preserved.
- The only new utility functions are presentation helpers in `shared/ui/pipes/inr-format.ts`; they are not payroll/calculation utilities and are not imported by business code.
- Existing screen money/date/status adoption and icon accessibility review: N/A; no templates were changed.
- Consistency checklist: UI-only Pass; screen-specific rows N/A.
- No rejection-table violations introduced: no protected-file changes, business expectation updates, new fonts/icons, hard-coded component styling, screen redesign, filters/search or pagination changes.

Outstanding limits are documented above and in the design reference. No new business statuses, workflows or validations were introduced. Await explicit user approval before Phase 2b or screen adoption.
