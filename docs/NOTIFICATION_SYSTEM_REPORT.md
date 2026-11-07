# Central notification system implementation report

Date: 5 November 2026 (America/Chicago)

## Result

PayStream now has one root-hosted notification modal and a shared NotificationService for success, error, warning and information messages. Existing completed-action success banners were removed throughout the inspected frontend. User invitation success now reads **User invitation email has been sent successfully.** Only backend invitationSent=true produces that success; a created account whose email attempt failed produces an amber warning that preserves the user and directs the administrator to Resend Invitation.

No backend email implementation, API contract, permission, calculation, database model, credential file or dependency was changed. Existing in-progress frontend work was preserved. Git's full diff also includes earlier user work, so it is not an attribution of every visible change to this task. No commit or push was performed.

## Architecture

- `src/app/shared/notification.service.ts`: root singleton with success(titleOrMessage, optionalDescription), error(message), warning(message), information(message), and dismiss(). One current notification is rendered. Distinct concurrent notices are queued (bounded to 20 pending), duplicates already active/pending are ignored, and repeated feedback from the same local source is coalesced. Errors take precedence over the active notice. A later operation can display the same message after dismissal.
- `completionSignal()` in the same file is a compatibility adapter for existing local success/message state. It preserves signal values, reset/update behavior and existing handlers/tests, while publishing completion at the existing successful callback. New features can call the service directly. It does not infer business success merely from HTTP 2xx.
- `src/app/shared/notification-modal.ts` and `.scss`: one native dialog at the application root, using existing PsButton, PsIcon and design tokens. All four kinds share the same layout. Success has the green circle/white tick; errors use red, warnings amber, and information blue. The headings are Success!, Something went wrong., Attention., and Information.
- `src/app/shared/notification-interceptor.ts`: central API-error presentation for application requests, rethrowing the unchanged error so existing local recovery/validation continues. Expected session probes and token-inspection state checks are excluded. It does not generate success for HTTP responses; an invitation response can be HTTP-successful while invitationSent=false.
- `src/app/app.ts`: host mounted alongside the root router outlet, covering authenticated screens, Super Admin and public account screens, including notifications that survive a sign-in redirect.
- `src/app/app.config.ts`: registers the presentation interceptor alongside the existing authentication interceptor. No routes or API payloads changed for this task.

Usage:

```ts
private readonly notifications = inject(NotificationService);
// In the existing successful completion callback:
this.notifications.success('Success!', 'Employee saved successfully.');
```

## Screens and operations addressed

| Area | Operations/presentation covered |
|---|---|
| User Management | Create/invite, edit, account status, administrator password reset, resend invitation, self-account changes; partial email failure warning |
| Employees | Add, update, permanent delete, terminate/rehire, personal and employment detail saves |
| Dashboard | Existing Add Employee completion |
| Salary Components | Save, delete, activate/deactivate |
| Statutory Deductions | Save configuration |
| Organization Settings | Save organization address |
| Tax Configuration | Financial year save, revision save, activation, Tax Master/slabs/surcharge/component-taxability section saves; copying to an editor is information |
| Employee Tax Profile | Profile save and annual estimate calculation/save; intermediate profile-save popup suppressed during the composite Calculate operation to avoid two notices for one action |
| Run Payroll | Manual recalculation, draft save, submit, payslip download; restored/changed payroll selection guidance is information |
| Payroll Generator | Successful generated PDF/download completion |
| Employee Pay Checks | Successful PDF download |
| Contractors | Add, update, delete, status, component assignments, individual/batch payment records and component configuration |
| Super Admin | Existing customer/account creation and updates, status and temporary password operations |
| Account screens | Password changed/reset/set completion; Forgot Password response remains generic and uses the information variant |
| API errors | Shared error modal for application request failures; existing page/field recovery and validation retained |

The repository contains no document-upload workflow to integrate; no unrelated upload feature was introduced. Viewing a record/PDF, changing a filter/tab, loading data and ordinary sign-in/out do not receive invented create/save completion messages.

## Email and error semantics

The invitation message is a user-facing acknowledgement of the backend's accepted send request. It never claims the email was opened/read or independently proves inbox delivery. The old Microsoft Graph/Delivery is not yet confirmed wording is no longer rendered by User Management. The backend response remains unchanged.

Forgot Password deliberately retains the generic eligible-account response. Its backend queues a request, so the UI does not claim a specific existing account or guarantee email delivery. The same modal presents that response as information.

Field-validation errors, page retry/error details, unsaved-change confirmations, loading indicators, payroll calculation warnings, explanatory information and record status badges remain in their existing contexts. They are not old completed-action success banners. API failures additionally use the common error modal, and no success is generated by the interceptor. Existing client-only validation/PDF error details remain locally visible.

## Accessibility and design consistency

Native showModal provides a modal top layer, background inertness and keyboard focus containment, including when an underlying edit/confirmation dialog remains open after a failure. The heading/description are connected with aria-labelledby/aria-describedby. OK receives focus; OK and Escape dismiss. The host remembers the page action that opened a form, restoring it when that form has closed. If an underlying editor remains open, focus returns to its usable control instead. Multiple notices reuse one dialog.

The first browser run exposed missing focus restoration after a form closed while its opener was disabled; the shared host was corrected and both viewport tests then passed. The modal adapts to narrow screens and viewport height, wraps long text, uses a subtle entrance animation and disables that animation for prefers-reduced-motion.

No new fonts, icon package, modal library or dependency was added. Existing Inter/Segoe UI/Arial typography and tokens are used. A Lucide-compatible warning glyph was added to the existing action icon map. Existing shared dialog components were not restyled for individual screens. There are no intentional deviations from PayStream's tokens or shared control styling; the new common notification layout is the design explicitly requested by this task.

## Files created

- src/app/shared/notification.service.ts
- src/app/shared/notification-modal.ts
- src/app/shared/notification-modal.scss
- src/app/shared/notification-interceptor.ts
- src/app/shared/notification.spec.ts
- src/app/shared/notification-interceptor.spec.ts
- e2e/notifications.spec.ts
- docs/NOTIFICATION_SYSTEM_REPORT.md
- docs/design-system/evidence/notifications/success-desktop.png
- docs/design-system/evidence/notifications/success-mobile.png

## Files modified in this task

- src/app/app.ts, src/app/app.config.ts
- src/app/shared/ui/action-icons.ts
- src/app/users/users.ts, users.html, users.spec.ts
- src/app/employees/employee-list.ts and .html; employee-profile.ts and .html; pay-checks.ts
- src/app/dashboard/dashboard.ts and .html
- src/app/contractors/contractor-directory.ts and .html; contractor-profile.ts and .html; contractor-settings.ts and .html
- src/app/settings/settings.ts and .html; organization-settings.ts and .html
- src/app/statutory-deductions/statutory-deductions.ts, .html and .spec.ts
- src/app/features/tax-management/employee-tax.ts and .html; tax-configuration.ts and .html
- src/app/features/run-payroll/run-payroll.component.ts and .html
- src/app/payroll/payroll-generator.ts and .html
- src/app/platform/platform.ts and .html
- src/app/auth/change-password.ts; set-password.ts and .html; forgot-password.ts; password-reset.spec.ts

Templates were inspected for action banners across src/app, rather than migrating User Management alone. Final searches found no remaining notice success, dynamic class.success or download-success completed-action elements in Angular templates, and no browser alert() calls. Existing unused legacy success CSS selectors may remain; no old completed-action banner renders from them.

## Verification

- **99 focused Angular tests passed across 13 files**, covering the notification service/modal/interceptor, user management, account password/reset pages, employee/salary-component deletion, organization address, contractor management, statutory settings, tax section/profile workflows and payroll.
- Presentation assertions in two existing unit tests were updated to check the centralized notification instead of removed inline markup; API/validation/business assertions were retained. The first broader run's one statutory test failure was that obsolete banner assertion; the final consolidated run is green.
- **2 Playwright browser tests passed**, at 1440px and 390px widths. Each covers invitation success with the old message absent, warning for partial email failure, error instead of success, information for the generic reset request, OK/Escape dismissal, focused OK, restored focus, a single notification dialog, and no horizontal overflow. API requests are mocked; no real user or email was created by browser testing.
- Desktop/mobile screenshots retained under docs/design-system/evidence/notifications. Screenshot animations are disabled to capture the settled visual state, while the runtime entrance animation remains enabled.
- **Frontend production build passed.** Existing initial/component-style budget warnings and PDF dependency CommonJS warnings remain. The initial bundle is approximately 870 kB versus the configured 500 kB warning budget, still below its error budget. No unrelated bundle cleanup was attempted.
- **git diff --check passed.** Routine Windows CRLF normalization notices are not whitespace failures.

Full legacy browser/screenshot suites were not run. Some older browser fixtures explicitly query former inline role=status success banners; those assertions and subsequent dismiss interactions require adaptation when those legacy suites are next maintained. They are not additional application notification implementations or remaining old UI banners. No claim is made that every historical browser test is green. The new focused browser tests validate the replacement behavior directly, and relevant module unit tests remain green.
