# Generate Payroll popup refinement

04 November 2026. UI-only refinement of the existing PayrollGenerator dialog opened by Generate Payroll on Employees.

## Implementation

Reviewed the design-system rules/tokens, existing generator template/styles/handlers, shared PsDialog/PsFormField/PsButton/PsIconButton conventions and existing unit/browser coverage. The existing native dialog and all handler bodies remain intact.

- Reused ps-dialog.scss for standard width, padding, border, radius, backdrop, title and shadow. No shared styles changed.
- Standard close icon aligned with the title and supporting description; accessible dialog description and busy state.
- Report Type and Payroll Month use the shared fields and enhanced dropdown behavior, aligned side by side on desktop and stacked on mobile.
- Historical inclusion uses the shared checkbox field with its existing explanatory warning.
- Report columns have compact selection controls, standard checkboxes, a bounded scrolling list, drag handles and labeled move controls. Existing required/hidden-checkbox behavior and reordering remain wired identically.
- Shared secondary Cancel and primary Generate PDF actions have consistent footer alignment and remain visible while the content scrolls on short screens.
- Standard semantic feedback, readable messages and token-based spacing replace hardcoded component styling. Existing corrupted loading ellipses are replaced with readable text.

The old feature CSS is replaced by SCSS solely to import shared dialog styling; remaining feature rules cover only the report grid, column-list/drag layout, footer and feedback. Existing fonts remain unchanged. No design-system deviations, new dependencies, shared-component overrides or broad CSS changes.

## Files modified

- src/app/payroll/payroll-generator.ts: presentation imports and SCSS reference only.
- src/app/payroll/payroll-generator.html: existing popup markup and shared controls.
- src/app/payroll/payroll-generator.css: replaced by payroll-generator.scss.
- src/app/payroll/payroll-generator.scss: shared dialog import and popup-specific layout.
- docs/design-system/evidence/generate-payroll/verify.cjs and popup screenshots.
- This report.

No calculations, employee eligibility/selection, period logic, generation/download handlers, API payloads/responses, payroll submission, database/backend code or PDF contents were changed. Existing report type, month, inclusion, select/deselect, mandatory columns, drag/drop, keyboard ordering, loading/disabled states and close workflow are preserved. Other approved work remains intact. No commits, pushes, staging, branch changes or Git history changes.

## Focused validation

- Existing payroll-generator.spec.ts: **1 test passed**, covering load/reload of component choices, select/deselect/toggle, ordering and unchanged download arguments.
- Basic popup browser verification: **passed** using the retained verify.cjs script. Checked opening/rendering, required disabled checkboxes, Generate PDF disabled without a month and enabled with one, Annual/Monthly selection, month selection, historical checkbox, select/deselect, Move up ordering, desktop/tablet/mobile bounds, Cancel/Close/Escape and focus return. No browser errors.
- No dedicated existing browser test limited to this popup was found; existing PDF tests execute financial/PDF assertions, so they were not run. No new test framework or comprehensive suite was added.
- Angular development compilation and focused unit compilation passed. Separate production build was unnecessary and not run.
- git diff --check passed.

Commands:

```text
npm.cmd test -- --watch=false --runner-config=artifacts/final-cleanup/vitest.config.mjs --include=src/app/payroll/payroll-generator.spec.ts
node docs/design-system/evidence/generate-payroll/verify.cjs
```

The verification script uses a local preview on port 4201 and mocked directory/component responses. It performs no real payroll download or calculation comparison. No backend, payroll calculation, TDS or unrelated component suites ran.

## Visual evidence

- [Desktop, 1440px](evidence/generate-payroll/popup-1440.png)
- [Tablet, 768px](evidence/generate-payroll/popup-768.png)
- [Mobile, 390px](evidence/generate-payroll/popup-390.png)

Screenshots use illustrative mocked configuration. The report-column list scrolls for long configurations; short viewports also scroll the content while retaining the footer. No known outstanding issue in the focused checks; live PDF generation and full regression certification are outside this UI-only task.
