# Payroll Generator frontend

Standalone Angular employee management connected to the local NestJS backend. No seed data.

## Run (CMD)

Backend, in one terminal:

```cmd
cd /d D:\Projects\payroll-backend
npm run start:dev
```

Frontend, in another terminal:

```cmd
cd /d D:\Projects\payroll-frontend
npm ci
npm start
```

Open http://localhost:4200. Backend must run on http://localhost:3000. CORS permits the Angular origin.

## Structure

- src/app/employees/employee.ts: request and response types, including MongoDB _id.
- employee.service.ts: HTTP calls and safe error messages.
- employee-list.*: directory, loading, empty and error states.
- employee-form.*: empty reactive form and validation.
- src/environments/environment.ts: backend API URL; change it for deployment.
- src/app/app.*: responsive app shell.

## Verification

npm run build
npm test -- --watch=false
npx playwright test

Browser tests require both servers and installed Microsoft Edge. They read real records and submit an existing email to test rejection, never a new employee. The 201 success response is simulated with request interception, and no records are inserted. Empty/error states are also simulated. Existing records must remain stable while tests run.

## Manual creation check

Click Add Employee, enter your real employee details, then Save employee. Expect success and a refreshed table showing the new MongoDB ID. Repeating the email should show a conflict. In Compass connect to mongodb://127.0.0.1:27017 and inspect payroll_db/employees. Restart the backend and refresh to confirm persistence.
