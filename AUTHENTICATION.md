# Authentication

See `../payroll-backend/AUTHENTICATION.md` for backend configuration, secure
administrator provisioning, deployment, CSRF requirements and test instructions.

The login page is `/login`. All workspace routes are guarded. The interceptor
uses HttpOnly session cookies and handles expired sessions. Sign out in the
workspace header invalidates the server session. No credentials or tokens are
stored in browser storage.

Set `src/environments/environment.ts` apiUrl before a production build; see
`environment.example.ts` for same-origin proxy configuration. This is public
build configuration, not a place for secrets. Use HTTPS in production, on the
same site as the API. The host must serve index.html for Angular route URLs.

Run `npm.cmd test -- --watch=false` and `npm.cmd run build`. To run browser
tests, start Angular on port 4200 and run `npm.cmd run test:browser`. Live backend
tests need an already provisioned account supplied via TEST_AUTH_EMAIL and
TEST_AUTH_PASSWORD. Other business tests mock authenticated sessions along with
their existing business API fixtures; backend end-to-end tests independently
verify real MongoDB sessions and every protected backend route.

## User Management

Create the first administrator in payroll-backend with `npm.cmd run create-admin`.
It securely prompts for email and password. Start both applications, sign in,
and open **User Management** in the sidebar. Ordinary Users do not see that link
and cannot access the page or its APIs.

Use **Add User** to choose an email, password, role and account status. **Edit**
changes email/role. **Reset password** requires a new password, confirmation,
and a confirmation dialog; **Deactivate / Activate** also requires confirmation.
Passwords, roles, email or status changes revoke prior sessions as applicable.
You cannot deactivate or demote yourself; accounts are never deleted.

For lost administrator credentials, run `npm.cmd run recover-admin` on the trusted
backend host. See `../payroll-backend/USER-MANAGEMENT.md` and
`../payroll-backend/AUTHENTICATION.md` for the complete operator instructions.
