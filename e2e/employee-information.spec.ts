import { test, expect } from './authenticated-test';
const id = '507f1f77bcf86cd799439011';
const person = () => ({
  _id: id,
  employeeId: 'EMP001',
  firstName: 'Ada',
  lastName: 'Example',
  email: 'ada@example.test',
  dateOfBirth: '1990-01-01',
  hireDate: '2020-01-01',
  annualCtc: 1200000,
  payFrequency: 'Monthly',
  status: 'Active',
});
test('Add Employee keeps exact input order, compact amounts, validation and creation payload', async ({
  page,
}) => {
  let posts: any[] = [];
  await page.route('http://localhost:3000/employees', async (route) => {
    if (route.request().method() === 'POST') {
      posts.push(route.request().postDataJSON());
      await route.fulfill({ status: 201, json: { ...person(), ...posts.at(-1) } });
    } else await route.fulfill({ json: [] });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Employee', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add employee' });
  await expect(dialog.locator('label')).toHaveText([
    'First Name',
    'Last Name',
    'Email',
    'Date of Birth',
    'Hire Date',
    'Annual CTC',
    'Pay Frequency',
  ]);
  const ctc = await dialog.getByLabel('Annual CTC', { exact: true }).boundingBox();
  const frequency = await dialog.getByLabel('Pay Frequency', { exact: true }).boundingBox();
  const email = await dialog.getByLabel('Email', { exact: true }).boundingBox();
  expect(ctc!.width).toBeLessThanOrEqual(260);
  expect(frequency!.width).toBeLessThanOrEqual(260);
  expect(email!.width).toBeGreaterThan(ctc!.width);
  await dialog.getByLabel('First Name', { exact: true }).fill('New');
  await dialog.getByLabel('Last Name', { exact: true }).fill('Employee');
  await dialog.getByLabel('Email', { exact: true }).fill('bad');
  await dialog.getByLabel('Date of Birth', { exact: true }).fill('1990-01-01');
  await dialog.getByLabel('Hire Date', { exact: true }).fill('2026-01-01');
  await dialog.getByLabel('Annual CTC', { exact: true }).fill('-1');
  await dialog.getByRole('button', { name: 'Save employee', exact: true }).click();
  expect(posts).toHaveLength(0);
  await expect(dialog.getByText('Enter a valid email address.')).toBeVisible();
  await dialog.getByLabel('Email', { exact: true }).fill('new@example.test');
  await dialog.getByLabel('Annual CTC', { exact: true }).fill('12345678.90');
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(390);
  await dialog.getByRole('button', { name: 'Save employee', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(posts).toEqual([
    {
      firstName: 'New',
      lastName: 'Employee',
      email: 'new@example.test',
      dateOfBirth: '1990-01-01',
      hireDate: '2026-01-01',
      annualCtc: 12345678.9,
      payFrequency: 'Monthly',
    },
  ]);
});
test('profile cards edit independently, retain drafts, persist after reload, and protect departure', async ({
  page,
}, testInfo) => {
  let saved: any = person();
  const patches: any[] = [];
  await page.route('http://localhost:3000/employees', (route) => route.fulfill({ json: [saved] }));
  await page.route('http://localhost:3000/employees/' + id, (route) => {
    const body = route.request().postDataJSON();
    patches.push(body);
    saved = { ...saved, ...body };
    return route.fulfill({ json: saved });
  });
  await page.goto('/employees/' + id);
  const employment = page.getByRole('region', { name: 'Employment Information', exact: true });
  const personal = page.getByRole('region', { name: 'Personal Information', exact: true });
  await expect(employment.locator('dt')).toHaveText([
    'Employee ID',
    'Employment Status',
    'Hiring Date',
    'Designation',
    'Pay Frequency',
    'Annual CTC',
    'Organization Name',
  ]);
  await expect(personal.locator('dt')).toHaveText([
    'Email',
    'Contact Number',
    'Date of Birth',
    'Address Line 1',
    'Address Line 2',
    'City',
    'State',
    'Zip Code',
    'Country',
  ]);
  await expect(page.getByRole('tab', { name: 'Employment History', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Employment History', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit employee', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Pay Checks', exact: true })).toBeVisible();
  // Read both boxes in the same frame so the shared page entrance animation cannot skew positions.
  const [left, right] = await page.locator('.widgets').evaluate((grid) =>
    [...grid.querySelectorAll('app-profile-card')].slice(0, 2).map((card) => {
      const { width, height, y } = card.getBoundingClientRect();
      return { width, height, y };
    }),
  );
  expect(left!.width).toBeCloseTo(right!.width, 3);
  expect(left!.height).toBeCloseTo(right!.height, 3);
  expect(left!.y).toBeCloseTo(right!.y, 3);
  await expect(employment.locator('input')).toHaveCount(0);
  await expect(personal.locator('input')).toHaveCount(0);
  await employment.getByRole('button', { name: 'Edit Employment Information' }).click();
  await expect(employment.getByLabel('Designation', { exact: true })).toHaveValue('');
  await employment.getByLabel('Designation', { exact: true }).fill('Engineer');
  await personal.getByRole('button', { name: 'Edit Personal Information' }).click();
  expect((await employment.boundingBox())!.height).toBeCloseTo(
    (await personal.boundingBox())!.height,
    3,
  );
  await expect(personal.getByLabel('Contact Number', { exact: true })).toHaveValue('');
  await expect(personal.getByLabel('Address Line 1', { exact: true })).toHaveValue('');
  await personal.getByLabel('Address Line 1', { exact: true }).fill('10 Test Street');
  await personal.getByLabel('City', { exact: true }).fill('Test City');
  await personal.getByLabel('Contact Number', { exact: true }).fill('+91 (98765) 43210');
  await personal.getByLabel('Zip Code', { exact: true }).fill('00120');
  await personal.getByLabel('Country', { exact: true }).fill('India');
  await employment.getByRole('button', { name: 'Save Employment Information' }).click();
  await expect(employment.getByText('Employment information saved.')).toBeVisible();
  expect(patches[0]).toEqual({ designation: 'Engineer' });
  await expect(personal.getByLabel('City', { exact: true })).toHaveValue('Test City');
  await personal.getByRole('button', { name: 'Save Personal Information' }).click();
  await expect(personal.getByText('Personal information saved.')).toBeVisible();
  expect(patches[1]).not.toHaveProperty('designation');
  expect(patches[1].contactNumber).toBe('+91 (98765) 43210');
  await page.screenshot({
    path: testInfo.outputPath('employee-cards-desktop.png'),
    fullPage: true,
  });
  await page.reload();
  await expect(employment).toContainText('Engineer');
  await expect(personal).toContainText('10 Test Street');
  await expect(personal).toContainText('00120');
  await expect(personal).toContainText('+91 (98765) 43210');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(employment).toBeVisible();
  await expect(personal).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('employee-cards-mobile.png'),
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto('/employees/' + id + '?tab=history');
  await expect(page.getByRole('tab', { name: 'Employee Details', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('region', { name: 'Employment History', exact: true })).toContainText(
    'No employment history records',
  );
  await employment.getByRole('button', { name: 'Edit Employment Information' }).click();
  await employment.getByLabel('Designation', { exact: true }).fill('Unsaved');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: 'Back to Employees', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/employees/' + id));
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('link', { name: 'Back to Employees', exact: true }).click();
  await expect(page).toHaveURL(/\/\?status=Active$/);
});

test('directory Edit omits contact data and preserves the saved number in Personal Information', async ({
  page,
}) => {
  let saved: any = { ...person(), contactNumber: '+44 (20) 1234 5678' };
  let patch: any;
  await page.route('http://localhost:3000/employees', (route) => route.fulfill({ json: [saved] }));
  await page.route('http://localhost:3000/employees/' + id, (route) => {
    patch = route.request().postDataJSON();
    saved = { ...saved, ...patch };
    return route.fulfill({ json: saved });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Actions for Ada Example', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Edit employee Ada Example', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit employee', exact: true });
  await expect(dialog.getByLabel(/Contact Number/)).toHaveCount(0);
  await dialog.getByLabel('First Name', { exact: true }).fill('Ada Updated');
  await dialog.getByRole('button', { name: 'Save employee', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(patch).not.toHaveProperty('contactNumber');
  expect(saved.contactNumber).toBe('+44 (20) 1234 5678');
  await page.getByRole('link', { name: 'Ada Updated', exact: true }).click();
  const employment = page.getByRole('region', { name: 'Employment Information', exact: true });
  await expect(employment).toContainText('Employment Status');
  await expect(employment).toContainText('Active');
  await expect(employment).toContainText('Pay Frequency');
  await expect(employment).toContainText('Monthly');
  await expect(page.locator('.profile-context')).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Personal Information', exact: true }),
  ).toContainText('+44 (20) 1234 5678');
  const history = page.getByRole('region', { name: 'Employment History', exact: true });
  await expect(history).toContainText('Original hire date');
  await expect(history).toContainText('No employment history records');
  expect((await history.boundingBox())!.height).toBeLessThan(
    (await employment.boundingBox())!.height,
  );
  await expect(history.locator('article')).toHaveCount(0);
});
