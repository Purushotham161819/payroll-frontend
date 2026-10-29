import {test,expect} from './authenticated-test';
import {readFile} from 'node:fs/promises';
import cases from './fixtures/conditional-payroll.json';
for(const period of ['Annual','Monthly'])test(`${period} PDF single header row, centered headers and right-aligned data/totals`,async({page})=>{
 const source=cases[0],a=source.components[3]._id,b='000000000000000000000005';
 const longCode='LONG_CONFIGURED_COMPONENT_CODE_WITH_EXTRA_DETAIL_A';
 const configured=[...source.components.slice(0,3),{...source.components[3],name:'Shared Name',code:longCode},{...source.components[3],_id:b,name:'Shared Name',code:'B&/SPECIAL'}];
 const employees=source.employees.map(row=>({...row,employee:{firstName:'Layout',lastName:'Employee'},calculation:{...row.calculation,components:[...row.calculation.components,{componentId:b,code:'B&/SPECIAL',category:'earning',annual:240,monthly:20,showInPayslip:true}]}}));
 await page.route('**/employees',r=>r.fulfill({json:[]}));await page.route('**/salary-components',r=>r.fulfill({json:configured}));
 await page.route('**/payroll/annual',r=>r.fulfill({json:{components:configured,employees,reportComponents:configured.slice(3).map(c=>({componentId:c._id,code:c.code,name:c.name,category:c.category,mandatory:false}))}}));
 await page.goto('/');await page.getByRole('button',{name:'Generate Payroll',exact:true}).click();await page.getByRole('button',{name:'Deselect All',exact:true}).click();
 for(const checkbox of await page.getByRole('checkbox',{name:'Shared Name',exact:true}).all())await checkbox.check();
 await page.getByRole('checkbox',{name:'Annual CTC',exact:true}).check();await page.getByRole('checkbox',{name:'ER EPS',exact:true}).check();
 await page.getByRole('button',{name:'Move Shared Name up',exact:true}).nth(1).click();
 await page.getByLabel('Report Type',{exact:true}).selectOption(period);await page.getByLabel('Payroll Month',{exact:true}).selectOption({index:1});
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Generate PDF',exact:true}).click();const download=await pending;
 const bytes=await readFile((await download.path())!);const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
 const pdfPage=await pdf.getPage(1),viewport=pdfPage.getViewport({scale:1});expect(viewport.width).toBeCloseTo(841.89,0);expect(viewport.height).toBeCloseTo(595.28,0);
 const items=(await pdfPage.getTextContent()).items as any[];const bodyStart=items.findIndex(item=>item.str==='Layout Employee');expect(items.some(item=>item.str==='Component Code')).toBe(false);
 const headings=['Employee Name',period==='Annual'?'Annual CTC':'Monthly CTC','ER EPS','Basic','DA','RA','Shared Name','Shared Name','Core Wages'];
 expect(items.slice(0,bodyStart).map(i=>i.str).filter(s=>s.trim())).toEqual(headings);
 const headers=items.slice(0,bodyStart).filter(i=>i.str?.trim());expect(headers.map(i=>i.str).join('')).not.toContain(longCode);expect(headers.some(i=>i.str==='BASIC')).toBe(false);
 const mm=72/25.4,left=7*mm,name=31*mm,money=(viewport.width-2*left-name)/(headings.length-1),padding=1.2*mm;
 const bounds=(column:number)=>({left:column===0?left:left+name+(column-1)*money,width:column===0?name:money});
 for(const item of headers){const center=item.transform[4]+item.width/2;const column=center<left+name?0:1+Math.floor((center-left-name)/money);const cell=bounds(column);expect(Math.abs(center-(cell.left+cell.width/2))).toBeLessThan(.8);expect(item.transform[4]).toBeGreaterThanOrEqual(cell.left-.1);expect(item.transform[4]+item.width).toBeLessThanOrEqual(cell.left+cell.width+.1);}
 for(const item of items.slice(bodyStart).filter(i=>i.str?.includes('\u20b9'))){const end=item.transform[4]+item.width;const column=1+Math.floor((end-left-name)/money);const cell=bounds(column);expect(Math.abs(end-(cell.left+cell.width-padding))).toBeLessThan(.8);}
 const total=items.find(item=>item.str==='Total')!;expect(Math.abs(total.transform[4]-(left+padding))).toBeLessThan(.8);
 const cells=items.slice(bodyStart).map(i=>i.str).filter(s=>s.trim());const currency=(v:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(v);
 const columnOf=(item:any)=>1+Math.floor((item.transform[4]+item.width/2-left-name)/money);
 const duplicates=headers.filter(i=>i.str==='Shared Name');const codeBColumn=columnOf(duplicates[0]),codeAColumn=columnOf(duplicates[1]);
 expect(cells[codeBColumn]).toBe(currency(period==='Annual'?240:20));expect(cells[codeAColumn]).toBe(currency(period==='Annual'?375:31.25));
 const totalIndex=cells.indexOf('Total');expect(cells[totalIndex+codeBColumn]).toBe(currency(period==='Annual'?480:40));expect(cells[totalIndex+codeAColumn]).toBe(currency(period==='Annual'?750:62.5));
 await pdf.cleanup();
});
