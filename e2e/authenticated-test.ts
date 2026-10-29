import { test as base, expect } from '@playwright/test';
// Business UI tests use mocked business APIs and a matching authenticated session.
// Real server-side session enforcement is exercised by the backend route audit.
export const test = base.extend({
  request: async ({ context }, use) => {
    const email = process.env.TEST_AUTH_EMAIL, password = process.env.TEST_AUTH_PASSWORD;
    base.skip(!email || !password, 'Live API tests require TEST_AUTH_EMAIL and TEST_AUTH_PASSWORD for an existing account');
    const response = await context.request.post('http://localhost:3000/auth/login', {
      headers: { Origin: 'http://localhost:4200', 'X-Payroll-Request': '1' }, data: { email, password },
    });
    expect(response.status()).toBe(200);
    await use(context.request);
    await context.request.post('http://localhost:3000/auth/logout', { headers: { Origin: 'http://localhost:4200', 'X-Payroll-Request': '1' } });
  },
  page: async ({ page }, use) => {
    await page.route('**/auth/me', route => route.fulfill({ json: { id: 'test-user', email: 'ui-test@example.test' } }));
    await use(page);
  },
});
export { expect };
