import {payrollPdfHead,payrollPdfAlignment} from './payroll-report-presentation';
import {AnnualPayrollResponse} from './annual-payroll-report';
describe('PDF presentation without changing payroll values',()=>{
 it('keeps only the name headers after selection/order and preserves code configuration',()=>{
  const data:AnnualPayrollResponse={employees:[],components:[{_id:'basic',code:'BASIC'},{_id:'da',code:'DA'},{_id:'ra',code:'RA'},{_id:'first',code:'LONG_CUSTOM_CODE'},{_id:'second',code:'SPECIAL/&-CODE'}],reportComponents:[{componentId:'first',code:'LONG_CUSTOM_CODE',name:'Same name',category:'allowance',mandatory:false},{componentId:'second',code:'SPECIAL/&-CODE',name:'Same name',category:'deduction',mandatory:false}]};
  const report={headings:['Employee Name','Same name','Basic','ER EPS','Same name','DA','RA'],columnIds:['employee:name','second','result:annualBasicSalary','result:employerEpsContribution','first','result:annualDearnessAllowance','result:annualRetainingAllowance']};
  const before=JSON.stringify({data,report});
  expect(payrollPdfHead(data,report)).toEqual([report.headings]);
  expect(JSON.stringify({data,report})).toBe(before);
 });
 it('does not invent codes for aggregate fields or legacy responses without metadata',()=>{
  expect(payrollPdfHead({employees:[]},{headings:['Employee Name','Core Wages'],columnIds:['employee:name','result:annualCoreWages']})).toEqual([['Employee Name','Core Wages']]);
 });
 it('centers both header rows and right-aligns every numeric data/total cell, retaining descriptive labels',()=>{
  for(const section of ['head','body','foot'])for(let index=0;index<25;index++)expect(payrollPdfAlignment(section,index)).toBe(section==='head'?'center':index===0?'left':'right');
 });
});
