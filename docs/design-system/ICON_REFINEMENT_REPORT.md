# Navigation and authentication icon refinement

04 November 2026. Visual-only changes, preserving earlier workspace work.

Icons use the existing shared Lucide-based glyph registry and PsIcon/PsButton/PsIconButton rendering:

| Control | Selected icon |
| --- | --- |
| Dashboard navigation | LayoutDashboard (registry key dashboard) |
| Employees navigation | Users (users) |
| Settings navigation | Settings (settings) |
| Sign out, workspace and forced password change | LogOut (logout) |
| Password hidden | Eye (existing view glyph) |
| Password visible | EyeOff (eyeOff) |

The three navigation icons use the existing icon-md token (20px); control icons use icon-sm (16px), all with currentColor and icon-stroke (1.75). PsIcon gains an opt-in md size while preserving its existing default size. No existing glyph is changed. The Login toggle now uses the shared fieldSuffix slot, shared icon button and tooltip/label, with a 32px clickable area. The two obsolete external-toggle layout rules were removed; no feature-specific icon CSS was added. Existing active/hover/focus/button colors are preserved. User Management and Super Admin navigation items remain unchanged.

Files for this task:
- src/app/shared/ui/action-icons.ts: additive glyph definitions.
- src/app/shared/ui/ps-icon.ts: opt-in standard md size.
- src/app/app.ts: PsIcon import.
- src/app/app.html: three requested navigation icons and workspace sign-out icon.
- src/app/auth/login.ts: PsIconButton import.
- src/app/auth/login.html: field-suffix visibility icon, original toggle expression preserved.
- src/app/auth/auth.css: remove obsolete password-row layout rules only.
- src/app/auth/change-password.html: sign-out icon only.
- docs/design-system/evidence/icon-refinement/verify.cjs and screenshots.
- This report.

Verification: Angular development compilation passed. Basic browser/visual checks passed at 1440px, 768px and 390px: all three navigation icons have equal size/stroke, sign-out SVG renders, password toggle stays vertically centered inside the field, labels/pressed state and password type update, the password value stays unchanged, the toggle remains type=button, focus is visible and there is no horizontal overflow or browser error. Screenshots reviewed. git diff --check passed. No unit suites, browser suites, backend tests, regression suites or separate production build ran.

Routes, role-based visibility, login/logout handlers, password toggle logic, validators, sessions/tokens, APIs and backend behavior are unchanged. No dependencies added; no commits or pushes. No known issue in these minimal checks; browser verification used mocked account/data responses and did not exercise live login/logout.

Evidence: [Navigation desktop](evidence/icon-refinement/navigation-1440.png), [Navigation mobile](evidence/icon-refinement/navigation-390.png), [Login mobile](evidence/icon-refinement/login-390.png), [Eye-off desktop](evidence/icon-refinement/login-eye-off-1440.png).
