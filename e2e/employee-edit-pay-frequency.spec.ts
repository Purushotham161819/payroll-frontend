import { test, expect } from '@playwright/test';

test('employee add and edit use Monthly and persist through the employee API', async ({ page }) => {
  let employee = {
    _id: '507f1f77bcf86cd799439011',
    firstName: 'Existing',
    lastName: 'Employee',
    email: 'existing@example.com',
    dateOfBirth: '1990-01-01T00:00:00.000Z',
    hireDate: '2026-01-01T00:00:00.000Z',
    annualCtc: 120000,
  };
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/employees', async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON().payFrequency).toBe('Monthly');
      await route.fulfill({ status: 201, json: route.request().postDataJSON() });
    } else await route.fulfill({ json: [employee] });
  });
  await page.route('**/employees/' + employee._id, async (route) => {
    expect(route.request().method()).toBe('PATCH');
    const payload = route.request().postDataJSON();
    expect(payload.payFrequency).toBe('Monthly');
    expect(payload.firstName).toBe('Updated');
    employee = { ...employee, ...payload };
    await route.fulfill({ json: employee });
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Actions for Existing Employee',exact:true}).click();await page.getByRole('menuitem',{name:'Edit employee Existing Employee',exact:true}).click();
  await expect(page.getByRole('heading', { name: 'Edit employee', exact: true })).toBeVisible();
  await expect(page.getByLabel('First Name', { exact: true })).toHaveValue('Existing');
  await expect(page.getByLabel('Date of Birth', { exact: true })).toHaveValue('1990-01-01');
  await expect(page.getByLabel('Pay Frequency', { exact: true })).toHaveValue('Monthly');
  await expect(page.getByLabel('Pay Frequency').locator('option')).toHaveText(['Monthly']);
  await page.getByLabel('First Name', { exact: true }).fill('Updated');
  await page.getByRole('button', { name: 'Save employee', exact: true }).click();
  await expect(page.getByText('Employee updated successfully.', { exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Updated', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add Employee', exact: true }).first().click();
  await expect(page.getByLabel('Pay Frequency', { exact: true })).toHaveValue('Monthly');
  for (const [label, value] of Object.entries({
    'First Name': 'New',
    'Last Name': 'Employee',
    Email: 'new@example.com',
    'Date of Birth': '1991-01-01',
    'Hire Date': '2026-01-01',
    'Annual CTC': '240000',
  }))
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Save employee', exact: true }).click();
  await expect(page.getByText('Employee added successfully.', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
