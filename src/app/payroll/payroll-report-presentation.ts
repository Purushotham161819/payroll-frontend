import {AnnualPayrollResponse} from './annual-payroll-report';
// Codes are configuration metadata, joined after column selection/order by stable ID.
export function payrollPdfHead(data:AnnualPayrollResponse, report:{headings:string[];columnIds:string[]}):string[][] {
 return [[...report.headings]];
}
export function payrollPdfAlignment(section:string,columnIndex:number):'center'|'left'|'right' {
 return section==='head'?'center':columnIndex===0?'left':'right';
}
