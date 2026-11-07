const {chromium}=require('playwright');
const path=require('path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}, reducedMotion:'reduce'});
const phase=process.argv[2]||'after';
await page.route('**/auth/me',r=>r.fulfill({status:401,json:{}}));
await page.goto('http://localhost:4201/login');await page.getByRole('heading',{name:'Welcome back'}).waitFor();await page.screenshot({path:path.join(__dirname,`${phase}-login-1440.png`),fullPage:true});
await page.unroute('**/auth/me');await page.route('**/auth/me',r=>r.fulfill({json:{id:'test',email:'preview@example.test',role:'admin'}}));
await page.route('http://localhost:3000/settings/organization',r=>r.fulfill({json:{displayName:'Example organization'}}));
await page.route('http://localhost:3000/settings/statutory-deductions',r=>r.fulfill({json:{wageCap:180000,annualEsiCeilingLimit:252000,epfEmployerContributionPercentage:3.67,epsEmployerContributionPercentage:8.33,esiEmployerContributionPercentage:3.25,isEpfCeilingApplicable:true}}));
await page.goto('http://localhost:4201/settings/statutory-deductions');await page.locator('#wageCap').waitFor();await page.screenshot({path:path.join(__dirname,`${phase}-statutory-1440.png`),fullPage:true});
await page.goto('http://localhost:4201/change-password');await page.getByRole('heading',{name:'Set your new password'}).waitFor();await page.screenshot({path:path.join(__dirname,`${phase}-change-password-1440.png`),fullPage:true});
if(phase==='after') { for(const width of [768,390]) { await page.setViewportSize({width,height:844}); for(const [name,url] of [['statutory','/settings/statutory-deductions'],['change-password','/change-password']]) { await page.goto('http://localhost:4201'+url); await page.locator('form').waitFor(); if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)) throw new Error(name+' overflow at '+width); if(width===390) await page.screenshot({path:path.join(__dirname,`after-${name}-390.png`),fullPage:true}); } } await page.unroute('**/auth/me');await page.route('**/auth/me',r=>r.fulfill({status:401,json:{}}));await page.goto('http://localhost:4201/login'); await page.locator('#email').waitFor();if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw new Error('Login overflow');await page.screenshot({path:path.join(__dirname,'after-login-390.png'),fullPage:true}); }
await browser.close();})();
