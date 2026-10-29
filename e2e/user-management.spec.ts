import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';

test('administrator creates, edits, resets and deactivates users; users cannot manage accounts',async({page})=>{
  test.skip(!process.env.TEST_AUTH_EMAIL || !process.env.TEST_AUTH_PASSWORD,'Requires a disposable backend with supplied administrator credentials');
  const email=`managed-${randomBytes(5).toString('hex')}@example.test`;
  const password=randomBytes(24).toString('base64url'),replacement=randomBytes(24).toString('base64url');
  await page.goto('/login');
  await page.getByLabel('Email address',{exact:true}).fill(process.env.TEST_AUTH_EMAIL!);
  await page.getByLabel('Password',{exact:true}).fill(process.env.TEST_AUTH_PASSWORD!);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('link',{name:'User Management',exact:true}).click();
  await expect(page.getByRole('heading',{name:'User Management',exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Add User',exact:true}).click();
  const editor=page.getByRole('dialog',{name:'Add User',exact:true});
  expect((await editor.boundingBox())!.width).toBeLessThanOrEqual(390);
  await editor.getByLabel('Email address',{exact:true}).fill(email);
  await editor.getByLabel('Password',{exact:true}).fill(password);
  await editor.getByLabel('Confirm password',{exact:true}).fill(password);
  await editor.getByRole('button',{name:'Save user',exact:true}).click();
  await expect(editor).not.toBeVisible();
  let row=page.getByRole('row').filter({has:page.getByRole('cell',{name:email,exact:true})});
  await expect(row).toContainText('User');await expect(row).toContainText('Active');
  await page.setViewportSize({width:1280,height:900});
  await row.getByRole('button',{name:`Edit ${email}`,exact:true}).click();
  await page.getByLabel('Role',{exact:true}).selectOption('admin');
  await page.getByRole('button',{name:'Save user',exact:true}).click();await expect(row.getByRole('cell',{name:'Admin',exact:true})).toBeVisible();
  await row.getByRole('button',{name:`Edit ${email}`,exact:true}).click();
  await page.getByLabel('Role',{exact:true}).selectOption('user');await page.getByRole('button',{name:'Save user',exact:true}).click();
  await row.getByRole('button',{name:`Reset password ${email}`,exact:true}).click();
  const reset=page.getByRole('dialog',{name:'Reset password',exact:true});
  await reset.getByLabel('Password',{exact:true}).fill(replacement);await reset.getByLabel('Confirm password',{exact:true}).fill(replacement);
  await reset.getByRole('button',{name:'Review reset',exact:true}).click();
  await page.getByRole('dialog',{name:'Confirm password reset',exact:true}).getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(reset).not.toBeVisible();
  // A separate browser context preserves the administrator session while testing the member.
  const memberContext=await page.context().browser()!.newContext();
  try {
    const member=await memberContext.newPage();await member.goto('http://localhost:4200/login');
    await member.getByLabel('Email address',{exact:true}).fill(email);await member.getByLabel('Password',{exact:true}).fill(replacement);await member.getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(member.getByRole('heading',{name:'Employees',exact:true})).toBeVisible();
    await expect(member.getByRole('link',{name:'User Management',exact:true})).toHaveCount(0);
    await member.goto('http://localhost:4200/users');await expect(member).toHaveURL('http://localhost:4200/');
    await row.getByRole('button',{name:`Deactivate ${email}`,exact:true}).click();
    await page.getByRole('dialog',{name:'Deactivate account?',exact:true}).getByRole('button',{name:'Cancel',exact:true}).click();await expect(row).toContainText('Active');
    await row.getByRole('button',{name:`Deactivate ${email}`,exact:true}).click();
    await page.getByRole('dialog',{name:'Deactivate account?',exact:true}).getByRole('button',{name:'Confirm',exact:true}).click();await expect(row).toContainText('Inactive');
    await member.reload();await expect(member).toHaveURL(/\/login/);
    await row.getByRole('button',{name:`Activate ${email}`,exact:true}).click();
    await page.getByRole('dialog',{name:'Activate account?',exact:true}).getByRole('button',{name:'Confirm',exact:true}).click();await expect(row).toContainText('Active');
  } finally {await memberContext.close();}
});
