> Current status - 03 November 2026: Phases 1 through 4H are complete and approved, including Phase 4G shared dropdowns and Phase 4H Pay Checks. Phase 4I Dashboard is deferred. Earlier OPEN/pending statements below are historical; the final approval registry supersedes them.

## PayStream UI rules (mandatory)
- For any UI work, follow docs/design-system/PAYSTREAM_DESIGN_SYSTEM.md. It is the single source of truth.
- UI/UX only. Never change business logic, payroll or TDS calculations, services, APIs, routes, models,
  database schemas, form validators, stored values, or workflows.
- Keep every existing event handler, form control, route link and menu action wired exactly as it is.
- Use design tokens (var(--token)) only. No hard-coded colours, font sizes, radii or spacing.
- Do not change or add fonts. Do not add icon libraries other than lucide-angular.
- Money: display through the psInr pipe only (₹, Indian grouping). Never alter the underlying value.
- Never restyle a shared component for one screen. If a standard does not fit, stop and report.
- After each task, report: files changed, deviations from the design system, and why.
- Phase 3 Employees was visually approved on 01 Nov 2026. Preserve its corrected implementation as a protected reference for subsequent modules; change it only on explicit Product Owner request or for a genuine identified defect.
- Phase 4A Employee Details was explicitly visually approved and closed on 02 November 2026. Preserve it as a protected visual reference; change it only on explicit Product Owner request or for a genuine identified defect.
- The same action must use the same icon, size, color, tooltip, placement and interaction convention throughout PayStream. The design system remains the single source of truth; no module may introduce an independent visual style.
- Phase 4B User Management was explicitly approved and closed on 02 November 2026. The eight protected visual references are Employees, Employee Details, User Management, Organization Settings, Salary Components, Income Tax / TDS Configuration, Employee Income Tax / TDS Profile and Run Payroll. Change approved references only on explicit Product Owner request or for an independently authorized genuine defect.
- Preserve page headers, typography, colors/tokens, buttons/icon buttons, cards/tables, form fields, status badges, tooltips, spacing/alignment, responsive behavior, navigation and interaction conventions across subsequent modules.
- Phase 4C Organization Settings was formally visually approved and closed by the Product Owner on 02 November 2026, including visual implementation, responsive implementation and design-system consistency. Preserve it as a protected visual reference; change it only on explicit Product Owner request or for a genuine identified defect.
- Phase 4D Salary Components was formally visually approved and closed by the Product Owner on 02 November 2026, including visual implementation, responsive implementation and design-system consistency. Preserve it as a protected visual reference; change it only on explicit Product Owner request or for a genuine identified defect. Retain calculation comparison evidence and all known test limitations in PHASE_4D_REPORT.md.
- Wait for separate explicit user instructions before Phase 4I. Approval authorizes no functionality or security changes. Preserve existing functionality, calculations, APIs, validations, employee records, payroll data, TDS history and PDFs.


## Phase 4E approval and protected visual references

**Phase 4E ? Income Tax / TDS Configuration: Visually Approved and Closed.** Explicit Product Owner approval dated **02 November 2026** covers visual implementation, responsive implementation and design-system consistency. Tax calculation regression evidence, implementation details, test results, comparisons, limitations and screenshots are retained in docs/design-system/PHASE_4E_REPORT.md.

The six approved protected visual references are:

1. Employees ? Phase 3.
2. Employee Details ? Phase 4A.
3. User Management ? Phase 4B.
4. Organization Settings ? Phase 4C.
5. Salary Components ? Phase 4D.
6. Income Tax / TDS Configuration ? Phase 4E.

Future screens must follow these references and the shared PayStream Design System, the single source of truth. Preserve page headers, typography, colors/design tokens, buttons/icon buttons, cards/tables, form fields, status badges, tooltips, spacing/alignment, responsive behavior, navigation and interaction conventions. The same action must use the same icon, size, color, tooltip, placement and interaction convention throughout PayStream. No module may independently introduce a different visual style.

Do not modify an approved screen unless explicitly requested by the Product Owner or a genuine defect is identified. This approval authorizes documentation updates only; preserve financial years, Tax Master, progressive slabs, surcharge thresholds, component taxability, tax history, tax rates/thresholds, the tax engine, annual TDS, payroll integration, backend services, APIs and database schemas. UI/UX changes must preserve application stability, existing functionality and business logic.

**Phase 4G is separately authorized; do not begin Phase 4H without explicit user instructions.** Preserve all staged, unstaged and untracked work; do not stage, commit, push, reset, clean or discard unrelated changes.


## Phase 4F approval and current protected references

**Phase 4F - Employee Income Tax / TDS Profile: Visually Approved and Closed on 02 November 2026**, explicitly approved by the Product Owner. Retain implementation results, regression evidence and all known issues/limitations in PHASE_4F_REPORT.md.

The seven protected approved visual references are Employees (Phase 3), Employee Details (Phase 4A), User Management (Phase 4B), Organization Settings (Phase 4C), Salary Components (Phase 4D), Income Tax / TDS Configuration (Phase 4E) and Employee Income Tax / TDS Profile (Phase 4F). Future modules follow these references and the PayStream Design System as the single source of truth. Preserve headers, typography, colors/tokens, buttons/icons, cards/tables, fields, badges, tooltips, spacing, responsive layout, navigation and interaction conventions. The same action uses the same icon, size, color, tooltip, placement and interaction convention. Change approved screens only on explicit Product Owner request or for a genuine identified defect. Preserve functionality, calculations, APIs, validation, saved employee/payroll/TDS records and PDFs.

Phase 4G - Run Payroll UI/UX is explicitly authorized separately in the approval instruction. It remains open until explicit visual approval. Do not begin Phase 4H automatically. Preserve all existing staged/unstaged/untracked work; do not stage, commit, push, reset, clean or discard unrelated work.


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
