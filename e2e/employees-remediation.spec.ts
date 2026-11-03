import { test, expect } from './authenticated-test';

const longEmail = 'a.very.long.employee.email.address.that.must.not.expand.the.page@department.example.test';
const records = () => Array.from({ length: 24 }, (_, i) => ({
  _id: 'fixture-' + i, employeeId: 'EMP' + String(i + 1).padStart(3, '0'),
  firstName: 'Employee ' + (i + 1), lastName: 'Reference', email: i === 0 ? longEmail : `employee${i}@example.test`,
  dateOfBirth: '1990-09-15', hireDate: '2020-01-01', createdAt: '2026-10-30T18:00:00Z',
  annualCtc: [1000000, 75000, 125500.5][i % 3], payFrequency: 'Monthly', status: 'Active',
}));

test('actual global entry loads tokens and all shared action SVGs remain compact across navigation', async ({ page }) => {
  await page.route('**/employees', r => r.fulfill({ json: records() }));
  await page.route('**/users', r => r.fulfill({ json: [] }));
  await page.route('**/salary-components', r => r.fulfill({ json: [] }));
  await page.goto('/');
  for (let visit = 0; visit < 2; visit++) {
    await expect(page.locator('tbody tr')).toHaveCount(24);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--icon-sm').trim())).toBe('16px');
    await expect(page.getByRole('link', { name: 'Employees', exact: true })).toHaveCSS('font-weight', '600');
    const sizes = await page.locator('ps-icon svg').evaluateAll(nodes => nodes.map(n => ({
      width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height,
      intrinsicWidth: n.getAttribute('width'), intrinsicHeight: n.getAttribute('height'),
    })));
    expect(sizes.length).toBeGreaterThan(24);
    for (const size of sizes) expect(size).toEqual({ width: 16, height: 16, intrinsicWidth: '16', intrinsicHeight: '16' });
    const refresh = page.getByRole('button', { name: 'Refresh List', exact: true });
    expect((await refresh.boundingBox())?.width).toBe(32);
    await expect(refresh).toHaveText(''); await refresh.focus();
    await expect(page.getByRole('tooltip')).toHaveText('Refresh List');
    await page.keyboard.press('Escape');
    if (visit === 0) { await page.getByRole('link', { name: 'Settings', exact: true }).click(); await page.getByRole('link', { name: 'Employees', exact: true }).click(); }
  }
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect(page.locator('.sidebar .brand')).toBeInViewport();
  expect(await page.locator('.sidebar').evaluate(n => n.getBoundingClientRect().top)).toBe(0);
  // Intrinsic dimensions must bound the SVG even if an icon token is temporarily unavailable.
  await page.addStyleTag({ content: ':root{--icon-sm:initial}' });
  const intrinsic = await page.locator('ps-icon svg').first().boundingBox();
  expect(intrinsic?.width).toBe(16); expect(intrinsic?.height).toBe(16);
});

test('table headings stay separated, long emails are bounded and all columns remain aligned at responsive widths', async ({ page }) => {
  await page.route('**/employees', r => r.fulfill({ json: records() })); await page.goto('/');
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const measure = await page.locator('table.ps-table').evaluate(table => {
      const headings = Array.from(table.querySelectorAll('th'));
      const cells = Array.from(table.querySelectorAll('tbody tr:first-child td'));
      return { width: table.getBoundingClientRect().width,
        headings: headings.map((th, i) => {
          const r = th.getBoundingClientRect(), c = cells[i].getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(th); const text = range.getBoundingClientRect();
          return { x: r.x, width: r.width, cellX: c.x, cellWidth: c.width, textInside: text.left >= r.left && text.right <= r.right };
        }) };
    });
    expect(measure.width).toBeGreaterThanOrEqual(1180); expect(measure.headings).toHaveLength(11);
    for (const h of measure.headings) { expect(h.textInside).toBe(true); expect(h.cellX).toBeCloseTo(h.x, 1); expect(h.cellWidth).toBeCloseTo(h.width, 1); }
    const email = page.locator('.email-text').first();
    await expect(email).toHaveText(longEmail); expect((await email.boundingBox())!.width).toBeLessThanOrEqual(240);
    expect((await page.locator('tbody tr').first().boundingBox())?.height).toBe(56);
    await page.locator('ps-data-table .scroll').evaluate(el => { el.scrollLeft = el.scrollWidth; });
    await expect(page.getByRole('button', { name: 'Actions for Employee 1 Reference' })).toBeInViewport();
  }
});
