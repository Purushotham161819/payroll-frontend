# Statutory deductions and authentication UI report

Implemented 04 November 2026. Limited to statutory settings, Login and the existing forced password-change screen.

## Changes

- Statutory settings: existing shared page header gains the settings eyebrow; EPF/ESI cards gain concise descriptions; numeric columns share a compact 320px maximum; EPF ceiling applicability is separated with the standard divider. Existing responsive stacking, INR display, save/reset, retry and status feedback are retained.
- Authentication: shared PsPageHeader, PsFormField/PsFieldControl and PsButton replace bespoke fields/buttons. Both forms use token-based, bordered cards, standard typography, branding, consistent field spacing and responsive padding. Login retains Show/Hide, touched validation messages and error alerts; validation descriptions are associated with inputs. Busy forms expose aria-busy. Shared focus and disabled styles apply unchanged.
- Existing password-change submit is explicitly type=submit, preserving native form submission when using PsButton (whose default is button).

## Inspection and preserved behavior

Reviewed AGENTS.md, PAYSTREAM_DESIGN_SYSTEM.md, canonical tokens, Employees markup/styles, settings controls, shared fields/cards/buttons, app.config.ts routes, Auth guards/interceptor, Login and ChangePassword handlers and existing tests. The existing authentication screens are Login and forced ChangePassword; no recovery route was found or added.

No handler bodies, validators, API payloads/contracts, rates, caps, calculations, models, persistence, services, session handling, guards, role routing, Super Admin portal or organization isolation changed. No shared/global styles, approved screens, dependencies or backend files changed. No design-system deviations; existing native numeric input behavior is retained per the documented restriction on adopting the currency value accessor. All new appearance values use existing tokens. No animation was added; existing reduced-motion handling remains intact.

## Files

Runtime:
- src/app/auth/login.ts (imports and external template/style metadata only)
- src/app/auth/login.html (extracted and enhanced template)
- src/app/auth/change-password.ts (imports and external template/style metadata only)
- src/app/auth/change-password.html (extracted and enhanced template)
- src/app/auth/auth.css (scoped styles reused by these two authentication components)
- src/app/statutory-deductions/statutory-deductions.html
- src/app/statutory-deductions/statutory-deductions.css

Verification/evidence:
- e2e/auth-ui.spec.ts (one focused mobile and forced-password-change test)
- docs/design-system/evidence/statutory-auth/capture.cjs and PNG screenshots
- This report.

## Focused validation

- Existing auth/auth.spec.ts and statutory-deductions/statutory-deductions.spec.ts: **18 tests passed**, 2 files. Final command: npm.cmd test -- --watch=false --runner-config=artifacts/final-cleanup/vitest.config.mjs --include=src/app/auth/auth.spec.ts --include=src/app/statutory-deductions/statutory-deductions.spec.ts. Uses the existing one-worker configuration. The original default-worker run also finished with 18 passing tests after slow startup.
- Existing authentication.spec.ts and statutory-deductions.spec.ts plus new auth-ui.spec.ts: **3 browser tests passed**. Covers validation, safe errors, Show/Hide, intended destination, login/logout/expiration, statutory save/reload/reset/failure handling, mobile stacking, password-confirmation gating, exact password-change payload and return to login. The added test caught the shared button default during implementation; explicit submit type fixed it before the final passing run.
- Screenshot script: desktop 1440px, tablet 768px and mobile 390px. Tablet/mobile overflow checks passed for statutory and password-change forms; mobile login overflow check passed. Desktop and mobile screenshots visually inspected.
- Angular development preview and unit compilation passed. Separate production build was not needed or run. No comprehensive suites or backend tests ran.
- git diff --check passed.

## Screenshots

All screenshots use mocked illustrative data, not live customer configuration. They are UI evidence, not confirmation of statutory rates.

| Screen | Before desktop | After desktop | After mobile |
| --- | --- | --- | --- |
| Login | [Before](evidence/statutory-auth/before-login-1440.png) | [After](evidence/statutory-auth/after-login-1440.png) | [Mobile](evidence/statutory-auth/after-login-390.png) |
| Statutory deductions | [Before](evidence/statutory-auth/before-statutory-1440.png) | [After](evidence/statutory-auth/after-statutory-1440.png) | [Mobile](evidence/statutory-auth/after-statutory-390.png) |
| Forced password change | [Before](evidence/statutory-auth/before-change-password-1440.png) | [After](evidence/statutory-auth/after-change-password-1440.png) | [Mobile](evidence/statutory-auth/after-change-password-390.png) |

Limitations: browser verification uses mocked API responses; no live authentication/backend certification or production-build verification is claimed. No known outstanding issue from these focused checks. Visual approval remains with the Product Owner. No staging, commits, pushes, branch switches or history changes performed.
