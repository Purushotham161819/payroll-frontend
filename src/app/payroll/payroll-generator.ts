import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PayrollReportService } from './payroll-report.service';
import { ReportComponent } from './annual-payroll-report';
import { payrollMonths } from './payroll-calculation';

@Component({selector:'app-payroll-generator',imports:[FormsModule, DragDropModule],templateUrl:'./payroll-generator.html',styleUrl:'./payroll-generator.css'})
export class PayrollGenerator {
  private service = inject(PayrollReportService);
  private dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private opener = viewChild<ElementRef<HTMLButtonElement>>('opener');
  open = signal(false); busy = signal(false); error = signal(''); success = signal('');
  reportType: 'Annual' | 'Monthly' = 'Annual';
  months = payrollMonths(); selected = '';
  components = signal<ReportComponent[]>([]); loading = signal(false); selection = signal<string[]>([]);
  orderMessage = signal('');
  drop(event: CdkDragDrop<ReportComponent[]>) { this.move(event.previousIndex,event.currentIndex); }
  move(from: number, to: number) {
    if(this.busy() || from===to || to<0 || to>=this.components().length) return;
    const items=[...this.components()]; moveItemInArray(items,from,to); this.components.set(items);
    this.orderMessage.set(items[to].name+' moved to position '+(to+1)+'.');
  }
  selectAll() { this.selection.set(this.components().filter(c=>!c.mandatory).map(c=>c.componentId)); }
  deselectAll() { this.selection.set([]); }
  toggle(id: string, checked: boolean) { this.selection.update(ids=>checked ? [...new Set([...ids,id])] : ids.filter(value=>value!==id)); }
  async loadComponents() {
    this.loading.set(true); this.components.set([]); this.selection.set([]);
    try { this.components.set(await this.service.components()); this.selectAll(); }
    catch { this.error.set('Unable to load salary components. Close and try again.'); }
    finally { this.loading.set(false); }
  }
  show() { void this.loadComponents(); this.months = payrollMonths(); this.selected = ''; this.error.set(''); this.success.set(''); this.open.set(true); setTimeout(()=>this.dialog()?.nativeElement.showModal()); }
  close() { if (!this.busy()) { this.dialog()?.nativeElement.close(); this.open.set(false); this.opener()?.nativeElement.focus(); } }
  async generate() {
    if (this.busy() || this.loading() || !this.components().length) return;
    if (!this.selected) { this.error.set('Select a payroll month before generating the report.'); return; }
    this.busy.set(true); this.error.set(''); this.success.set('');
    try {
      const filename = await this.service.download(this.selected, this.reportType, this.selection(), this.components().map(c=>c.componentId));
      this.busy.set(false); this.close(); this.success.set(`Payroll PDF downloaded: ${filename}`);
    } catch (error) {
      this.busy.set(false);
      this.error.set(error instanceof HttpErrorResponse ? (typeof error.error?.message === 'string' ? error.error.message : 'Unable to retrieve saved payroll data. Check that the backend is running and try again.') : error instanceof Error ? error.message : 'Unable to generate the PDF. Please try again.');
    }
  }
}

