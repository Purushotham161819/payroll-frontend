# User names, invitations and Set Password implementation

Implemented 04 November 2026. Changes are limited to account names, organization User Management invitations and password setup, with compatibility changes for platform account operations.

## Result

Add User now begins with required First Name and Last Name, side by side on desktop and stacked on mobile. Both are trimmed and limited to 100 characters on the frontend and backend. Email, role and active-account controls retain their existing rules. Administrators no longer choose a password during ordinary User Management creation: the recipient receives an invitation to set their own. Existing administrator password-reset actions remain available and retain their policy and confirmations.

Names persist in MongoDB, return in managed-user responses and authenticated identity responses, appear in the User directory and load/save through Edit User. Legacy accounts without names remain valid; the directory displays “Name not provided.” Name properties are optional in storage and legacy platform DTOs, but required for the new invitation creation DTO. No database migration, destructive update or index migration was introduced.

User Management shows pending/not-sent invitation information and offers Resend invitation only for pending accounts. Resends are organization-scoped, require administrator permission, and have a 60-second cooldown. Email failures close creation safely with a warning that the account exists but email could not be sent; the account remains pending. Unique email enforcement and the existing database-wide account-operation lock prevent duplicate accounts/emails from repeated creation or concurrent resend requests.

## Email and password setup

No SMTP/provider service, reset-token infrastructure or outbox existed. Added one dependency, Nodemailer, as a standard SMTP adapter rather than implementing SMTP manually or selecting a new hosted provider. It uses the configured organization's relay, authenticated SMTP when configured, TLS enforcement in production, bounded timeouts and disabled file/URL attachment access. It logs neither credentials nor messages/tokens. No additional dependency was retained for TypeScript types because this Nodemailer version includes types.

The email has the requested subject, personalized full name, PayStream header, branded CTA, fallback URL, plain-text alternative and Excelhire footer. HTML uses inline styles and presentation tables without external assets. Email colors are resolved values matching canonical application tokens; email clients cannot reliably use the application's CSS variables.

The new /set-password page reuses existing authentication CSS and shared fields/buttons/icons. It safely displays the validated first name, offers independent eye/eye-off controls, enforces matching 8-128-character passwords, shows busy/error/success feedback and redirects to the existing Login page after success. It creates no session and never automatically signs in the recipient. Invalid/expired/used/disabled/deleted invitations receive the same professional, non-identifying message and a contact-administrator instruction.

## Security and compatibility

- Invitations use 32 cryptographically random bytes; only SHA-256 hashes persist in the existing user record, binding each invitation to that user's immutable organization. No user/org identifier supplied by the recipient is trusted.
- Expiration defaults to 24 hours and is enforced by backend queries. Single-use completion checks the hash, account activity, pending state and expiration, changes the Argon2id password, clears invitation fields and increments the session version under the existing account lock and a conditional update. Concurrent completion permits only one success.
- Pending users have unknown random initial credentials, and both login and current-session checks explicitly reject pending accounts. Administrator password reset cannot bypass invitation completion.
- Disabled/deleted accounts and inactive organizations cannot complete invitations. Deactivation or changing the recipient email invalidates a pending link. Resending invalidates its predecessor. Pending admins do not count as replacements for the last usable organization administrator.
- Invitation links use URL fragments so bearer values are not sent in HTTP URLs/referrers. The page immediately removes the fragment and applies no-referrer. APIs accept tokens only in POST bodies. No valid test token is stored in screenshot/HTML artifacts.
- Only the two specific invitation handlers are publicly reachable; existing Origin/custom-header CSRF checks still apply. Invitation attempts have a separate 10-attempt/15-minute IP limiter; existing login/password-change limits are preserved.
- Existing Super Admin onboarding/account creation retains its password plus forced-change workflow. Optional names now persist there too, and platform edits preserve invitation safety. Existing sessions, role menus, organization selection and access restrictions are otherwise unchanged.

The token controls follow [OWASP's token lifecycle guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html); SMTP settings follow [Nodemailer's transport documentation](https://nodemailer.com/smtp).

## Files changed for this task

Frontend:
- src/app/users/users.ts, users.html, users.css, users.spec.ts
- src/app/auth/set-password.ts, set-password.html, set-password.spec.ts (new)
- src/app/auth/auth.ts (optional identity name fields)
- src/app/app.config.ts (Set Password route)
- e2e/users-design-system.spec.ts (invitation/name expectations)
- This report and docs/design-system/evidence/user-invitations/*

Backend:
- src/auth/auth.schema.ts (optional names and invitation state/hash/expiry metadata; secret fields excluded by default)
- src/auth/users.dto.ts, users.controller.ts, users.service.ts
- src/auth/account-storage.ts (safe public response fields)
- src/auth/auth.service.ts, auth.controller.ts, auth.guard.ts, auth.module.ts, http-security.ts
- src/auth/invitation-mail.ts, invitation-mail.spec.ts (new)
- src/auth/invitations.service.ts, invitations.integration.spec.ts (new)
- src/organizations/platform.service.ts (name persistence and pending-account safety)
- test/users.e2e-spec.ts (legacy creation fixture updated to complete its controlled invitation before subsequent existing account tests)
- package.json, package-lock.json (Nodemailer only)
- .env.example (SMTP and expiration configuration)

No unrelated screen, payroll/TDS/statutory calculation or backend business API changed. Earlier workspace changes were preserved. No commits, pushes, staging, branch switches, reset or cleanup of unrelated files occurred.

## Focused validation

| Check | Result |
| --- | --- |
| Frontend users.spec.ts + set-password.spec.ts | 12 passed |
| Backend invitations.integration.spec.ts + invitation-mail.spec.ts | 11 passed, including the connected browser case |
| Existing User Management browser test, selected “existing account workflows” case only | 1 passed |
| Backend Nest build | Passed |
| Frontend development and focused-test compilation | Passed; separate production build not needed/run |
| git diff --check, both repositories | Passed |

Backend tests start a private MongoDB process/database and controlled email mock. Coverage includes persisted names and detail responses, required fields, legacy compatibility, cross-organization denial, email failure/no duplicate account, scoped resends/cooldown, token rotation, expiry/reuse, concurrent consumption, inactive/deleted accounts and organizations, password-reset bypass prevention, platform name compatibility, preservation of the last usable administrator, CSRF, rate limiting and SMTP adapter/template behavior.

The connected browser case uses the running frontend and real test backend: administrator login → Add User with names → MongoDB record → controlled email receipt → invitation link → password visibility/matching → password setup → Login redirect → successful recipient login → used-link rejection. Only the API origin is bridged to the isolated test server; production code contains no fixture or test bypass. The older broad backend users E2E file was adapted for compatibility but was not executed. No full suites, unrelated authentication regression, employee, payroll, TDS or contractor suites ran.

Reproduction:

```text
# Frontend, existing local one-worker runner
npm.cmd test -- --watch=false --runner-config=artifacts/final-cleanup/vitest.config.mjs --include=src/app/users/users.spec.ts --include=src/app/auth/set-password.spec.ts
# Frontend preview on 4201 required for connected browser test
npm.cmd start -- --host localhost --port 4201
# Backend PowerShell
$env:RUN_INVITATION_BROWSER='1'
npm.cmd test -- --runInBand --runTestsByPath src/auth/invitations.integration.spec.ts src/auth/invitation-mail.spec.ts
npm.cmd run build
# Frontend
$env:TEST_BASE_URL='http://localhost:4201'
npx.cmd playwright test e2e/users-design-system.spec.ts --grep 'existing account workflows'
```

The integration harness uses the existing local MongoDB binary convention; MONGOD_BINARY can override its location.

## Configuration and limits

Configure SMTP_HOST, SMTP_PORT, SMTP_FROM, SMTP_USER and SMTP_PASSWORD in the private environment. SMTP_SECURE=true normally selects implicit TLS on 465; port 587 uses STARTTLS with SMTP_REQUIRE_TLS=true by default. TLS remains mandatory in production. Set FRONTEND_ORIGIN to the real frontend origin, using HTTPS in production, and optionally INVITATION_TTL_HOURS (1-168). Restart the backend after configuration changes. Deploy the frontend and backend together: ordinary POST /users now accepts names/email/role/active instead of an administrator-chosen password; platform creation APIs retain their prior password contract.

**Actual external email delivery was not verified.** Local tests used a controlled mail mock and a mocked SMTP transporter; they prove invocation, content and lifecycle behavior, not relay credentials, inbox delivery or Outlook rendering. Configure a real relay and verify delivery with an authorized test recipient before production use. Without SMTP configuration, accounts remain pending and can be resent after configuration. The synchronous send follows the existing account-operation lock; no queue/outbox or automatic delivery retry was added. A process interruption during an account write retains the existing fail-closed lock recovery behavior.

## Screenshots

- [Updated Add User, desktop](evidence/user-invitations/add-user-1440.png) · [Mobile](evidence/user-invitations/add-user-390.png)
- [Set Password, desktop](evidence/user-invitations/set-password-1440.png) · [Mobile](evidence/user-invitations/set-password-390.png)
- [Invitation email design](evidence/user-invitations/invitation-email-1440.png) · [Safe HTML preview](evidence/user-invitations/invitation-email-preview.html)

Screenshots were reviewed and contain isolated test accounts only. The email preview uses a nonfunctional placeholder URL.
