import { test, expect } from '@playwright/test';
test('real employee reads, validation, duplicate handling, responsive layout, and simulated success', async ({page, request}) => {
  const initial = await request.get('http://localhost:3000/employees');
  expect(initial.status()).toBe(200);
  const employees = await initial.json();
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', {name: 'Employees', exact: true})).toBeVisible();
  if (employees.length) await expect(page.getByRole('cell', {name: employees[0]._id, exact: true})).toBeVisible();
  else await expect(page.getByText('No employees found.')).toBeVisible();
  await page.getByRole('button', {name: 'Add Employee', exact: true}).first().click();
  await page.getByRole('button', {name: 'Save employee', exact: true}).click();
  await expect(page.getByText('Enter a first name.', {exact:true})).toBeVisible();
  await expect(page.getByText('Enter a valid email address.', {exact:true})).toBeVisible();
  // Reuse a real existing record to exercise the real 409 without inventing a record.
  const existing = employees.find((employee: any) => employee.email);
  if (existing) {
    await page.getByLabel('First Name', {exact:true}).fill(existing.firstName);
    await page.getByLabel('Last Name', {exact:true}).fill(existing.lastName);
    await page.getByLabel('Email', {exact:true}).fill('  ' + existing.email.toUpperCase() + '  ');
    await page.getByLabel('Date of Birth', {exact:true}).fill(existing.dateOfBirth.slice(0,10));
    await page.getByLabel('Hire Date', {exact:true}).fill(existing.hireDate.slice(0,10));
    await page.getByLabel('Annual CTC', {exact:true}).fill(String(existing.annualCtc));
    const duplicate = page.waitForResponse(response => response.url().endsWith('/employees') && response.request().method() === 'POST');
    await page.getByRole('button', {name: 'Save employee', exact:true}).click();
    expect((await duplicate).status()).toBe(409);
    await expect(page.getByRole('alert')).toContainText('already exists');
    // A valid create cannot be run without writing data. Simulate only the 201 response.
    await page.route('http://localhost:3000/employees', async route => {
      if (route.request().method() === 'POST') {
        expect(route.request().postDataJSON().email).toBe(existing.email.toLowerCase());
        await route.fulfill({status:201, contentType:'application/json', body:'{}'});
      } else await route.continue();
    });
    const refresh = page.waitForResponse(response => response.url().endsWith('/employees') && response.request().method() === 'GET');
    await page.getByRole('button', {name: 'Save employee', exact:true}).click();
    await expect(page.getByText('Employee added successfully.', {exact:true})).toBeVisible();
    expect((await refresh).status()).toBe(200);
    await page.unroute('http://localhost:3000/employees');
    const invalid = await request.post('http://localhost:3000/employees', { data: {firstName:existing.firstName, lastName:existing.lastName, email:'invalid', dateOfBirth:existing.dateOfBirth, hireDate:existing.hireDate, annualCtc:existing.annualCtc} });
    expect(invalid.status()).toBe(400);
  }
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('heading', {name:'Employees',exact:true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:'artifacts/employees-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'artifacts/employees-desktop.png',fullPage:true});
  expect(browserErrors).toEqual([]);
  const after = await (await request.get('http://localhost:3000/employees')).json();
  expect(after).toEqual(employees);
});
test('empty, loading, and network error states without changing MongoDB', async ({page}) => {
  await page.route('http://localhost:3000/employees', route => route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto('/');
  await expect(page.getByText('No employees found.')).toBeVisible();
  await page.unroute('http://localhost:3000/employees');
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('http://localhost:3000/employees', async route => {await pending; await route.abort();});
  await page.getByRole('button', {name:'Refresh list'}).click();
  await expect(page.getByText('Loading employees…', {exact:true})).toBeVisible();
  release();
  await expect(page.getByRole('alert')).toContainText('Cannot reach the server');
});