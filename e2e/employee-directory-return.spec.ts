import { test, expect } from './authenticated-test';
const people = Array.from({ length: 45 }, (_, i) => ({
  _id: (i + 1).toString(16).padStart(24, '0'), employeeId: 'EMP' + String(i + 1).padStart(3, '0'),
  firstName: 'Ada', lastName: 'Example ' + i, email: 'ada' + i + '@example.test',
  hireDate: '2020-01-01', annualCtc: 120000, status: i % 2 ? 'Terminated' : 'Active', payFrequency: 'Monthly',
}));
for (const search of ['', '  Ada  ', 'Example']) test('directory restores exact search ' + JSON.stringify(search), async ({ page }) => {
  await page.route('**/employees', r => r.fulfill({ json: people }));
  await page.goto('/?status=All');
  const input = page.getByRole('searchbox', { name: 'Search employees', exact: true });
  await input.fill(search);
  const link = page.getByRole('link', { name: 'Ada', exact: true }).nth(18);
  await link.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => window.scrollY);
  expect(scroll).toBeGreaterThan(0);
  await link.click();
  await expect(page.getByRole('heading', { name: 'Ada Example 18', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Back to Employees', exact: true }).click();
  await expect(input).toHaveValue(search);
  await expect(page.getByLabel('Employee Status', { exact: true })).toHaveValue('All');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scroll, 0);
});
