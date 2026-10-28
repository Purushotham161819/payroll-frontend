import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { payrollPeriod } from './payroll-calculation';
import { monthlyReport } from './monthly-payroll-report';
import { annualReport, AnnualPayrollResponse } from './annual-payroll-report';

@Injectable({providedIn:'root'})
export class PayrollReportService {
  private http = inject(HttpClient);
  private font?: Promise<string>;
  private loadFont() {
    return this.font ??= fetch('fonts/NotoSans-Regular.ttf').then(async response => {
      if (!response.ok) throw new Error('Unable to load the PDF font. Please try again.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
      return btoa(binary);
    }).catch(error => { this.font = undefined; throw error; });
  }
  async create(periodValue: string, generatedOn = new Date(), reportType: 'Annual' | 'Monthly' = 'Annual') {
    const period = payrollPeriod(periodValue,generatedOn);
    const data = await firstValueFrom(this.http.get<AnnualPayrollResponse>(environment.apiUrl + '/payroll/annual'));
    const report = reportType === 'Monthly' ? monthlyReport(data) : annualReport(data);
    const [{jsPDF},{autoTable},font] = await Promise.all([import('jspdf'),import('jspdf-autotable'),this.loadFont()]);
    const doc = new jsPDF({unit:'mm',format:'a4',orientation:'landscape',compress:true});
    doc.addFileToVFS('NotoSans-Regular.ttf',font);
    doc.addFont('NotoSans-Regular.ttf','NotoSans','normal');
    doc.setFont('NotoSans','normal');
    const monthName = new Intl.DateTimeFormat('en-IN',{month:'long'}).format(new Date(period.year,period.month,1));
    const month = `${monthName} ${period.year}`;
    const date = new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'long',year:'numeric'}).format(generatedOn);
    doc.setProperties({title:`${reportType} Payroll Report - ${month}`,author:data.companyName || 'Payroll Generator',subject:reportType === 'Annual' ? 'Validated annual payroll through Compliance Wage Base' : 'Monthly payroll derived from annual results'});
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 7;
    const nameWidth = 31;
    const moneyWidth = (width - margin * 2 - nameWidth) / 12;
    // Fit the widest formatted monetary value, including totals, on one line.
    // Larger datasets flow vertically; font size never shrinks with row count.
    const allAmounts = [...report.body.flatMap(row=>row.slice(1)),...report.foot.slice(1)];
    let fontSize = 7;
    doc.setFontSize(fontSize);
    const widest = Math.max(...allAmounts.map(value=>doc.getTextWidth(value)));
    fontSize = Math.max(6.5, Math.min(fontSize, fontSize * (moneyWidth - 2) / widest));
    const columnStyles: Record<number,{cellWidth:number;halign:'left'|'right'}> = {0:{cellWidth:nameWidth,halign:'left'}};
    for (let i=1;i<13;i++) columnStyles[i]={cellWidth:moneyWidth,halign:'right'};
    autoTable(doc,{
      startY:31, margin:{top:31,bottom:10,left:margin,right:margin},
      tableWidth:width-margin*2,head:[report.headings],body:report.body,foot:[report.foot],
      showHead:'everyPage',showFoot:'lastPage',rowPageBreak:'avoid',theme:'striped',
      styles:{font:'NotoSans',fontStyle:'normal',fontSize,cellPadding:1.2,textColor:[32,55,44],overflow:'linebreak',valign:'middle'},
      headStyles:{fillColor:[33,77,54],textColor:255,fontSize:7,fontStyle:'normal'},
      footStyles:{fillColor:[218,235,218],textColor:[24,64,40],fontStyle:'normal',lineWidth:0.15,lineColor:[150,180,150]},
      columnStyles,
      didDrawPage: () => {
        doc.setFont('NotoSans','normal');doc.setTextColor(33,77,54);
        doc.setFontSize(9);doc.text(data.companyName?.trim() || 'Payroll Generator',margin,10);
        doc.setFontSize(13);doc.text(reportType + ' Payroll Report',margin,17);
        doc.setFontSize(8);doc.setTextColor(85,100,90);
        doc.text(`Payroll Month: ${month}`,margin,24);
        doc.text(`Generated: ${date}`,width-margin,10,{align:'right'});
        doc.text(`All amounts ${reportType === 'Annual' ? 'annual' : 'monthly'} (INR) | Employees: ${report.totalEmployees}`,width-margin,24,{align:'right'});
      },
    });
    for (let page=1;page<=doc.getNumberOfPages();page++) {
      doc.setPage(page);doc.setFontSize(7);doc.setTextColor(85,100,90);
      doc.text(`Page ${page} of ${doc.getNumberOfPages()}`,width-margin,height-4,{align:'right'});
    }
    return {doc,filename:reportType === 'Annual' ? `Payroll_Report_${monthName}_${period.year}.pdf` : `Monthly_Payroll_Report_${monthName}_${period.year}.pdf`,report};
  }
  async download(periodValue: string, reportType: 'Annual' | 'Monthly' = 'Annual') {
    const result = await this.create(periodValue, new Date(), reportType);
    await result.doc.save(result.filename,{returnPromise:true});
    return result.filename;
  }
}
