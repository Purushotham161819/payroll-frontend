import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { completionSignal } from '../shared/notification.service';
import { NavigationContext } from '../shared/navigation-context';
import { PsTabs, PEOPLE_TABS } from '../shared/ui/ps-tabs';
import { Router, ActivatedRoute } from '@angular/router';
import { CdkMenuModule } from '@angular/cdk/menu';
import { LifecycleDialog } from './lifecycle-dialog';
import { DeleteConfirmation } from '../shared/delete-confirmation';
﻿import { PayrollGenerator } from '../payroll/payroll-generator';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { PsPagination, PsButton, PsIconButton, PsIcon, PsPageHeader, PsCard, PsCardTitle, PsCardSubtitle, PsCardActions, PsDataTable, PsFormField, PsFieldControl, PsStatusBadge, PsInrPipe, PsDatePipe, PsTooltip } from '../shared/ui';
import { EmployeeService, apiError } from './employee.service';
import { Employee } from './employee';
import { EmployeeForm } from './employee-form';
@Component({
  selector: 'app-employee-list',
  imports: [PsPagination, PsTabs, CdkMenuModule, LifecycleDialog, EmployeeForm, PayrollGenerator, DeleteConfirmation, PsButton, PsIconButton, PsIcon, PsPageHeader, PsCard, PsCardTitle, PsCardSubtitle, PsCardActions, PsDataTable, PsFormField, PsFieldControl, PsStatusBadge, PsInrPipe, PsDatePipe, PsTooltip],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css',
})
export class EmployeeList implements OnInit {
  readonly peopleTabs = PEOPLE_TABS;
  private readonly navigation = inject(NavigationContext);
  private restoreScroll = 0;
  openProfile(event: MouseEvent, id: string) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !this.router) return;
    event.preventDefault(); const origin = this.navigation.listOrigin(this.statusFilter(), window.scrollY, this.searchTerm(), this.page(), this.pageSize());
    void this.router.navigate(['/employees', id], { queryParams: { returnStatus: this.statusFilter() }, state: origin ? { employeeOrigin: origin } : {} });
  }
  private readonly router = inject(Router, { optional: true });
  private readonly route = inject(ActivatedRoute, { optional: true });
  profileUrl(id: string) { return '/employees/' + encodeURIComponent(id) + '?returnStatus=' + encodeURIComponent(this.statusFilter()); }
  readonly payrollLoading=signal(false);
  private readonly destroy=inject(DestroyRef);
  runPayroll() {
    if(this.payrollLoading())return;
    this.payrollLoading.set(true);
    const status=this.statusFilter();
    this.service.activeIds().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next:ids=>{this.payrollLoading.set(false);void this.router?.navigate(['/payroll/run'],{queryParams:{employees:ids.join(','),returnStatus:status}});},
      error:error=>{this.payrollLoading.set(false);this.error.set(apiError(error));},
    });
  }
  private readonly service = inject(EmployeeService);
  readonly allEmployees = signal<Employee[]>([]);
  readonly statusFilter = signal('Active');
  readonly searchTerm = signal('');
  // Only the current server page is held in memory; legacy getAll callers are unchanged.
  readonly employees=this.allEmployees.asReadonly();
  readonly page=signal(1);
  readonly pageSize=signal(10);
  readonly total=signal(0);
  private searchTimer?:ReturnType<typeof setTimeout>;
  private request?:Subscription;
  private generation=0;
  changeSearch(value:string){
    this.searchTerm.set(value);this.page.set(1);clearTimeout(this.searchTimer);
    this.request?.unsubscribe();this.generation++;this.loading.set(true);
    this.searchTimer=setTimeout(()=>this.load(),250);
  }
  changeFilter(value:string){
    clearTimeout(this.searchTimer);this.statusFilter.set(value);this.page.set(1);
    void this.router?.navigate([],{queryParams:{status:value},queryParamsHandling:'merge',replaceUrl:true});this.load();
  }
  changePage(page:number){if(this.loading())return;this.page.set(page);this.load();}
  changePageSize(size:number){if(this.loading())return;this.pageSize.set(size);this.page.set(1);this.load();}
  readonly lifecycle = signal<{employee: Employee; action: 'Terminate' | 'Rehire' | 'History'} | null>(null);
  lifecycleSaved() { this.success.set('Employee '+(this.lifecycle()?.action === 'Terminate' ? 'terminated' : 'rehired')+' successfully.'); this.lifecycle.set(null); this.load(); }
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = completionSignal();
  readonly deleting=signal<Employee|null>(null);readonly deletingBusy=signal(false);readonly deleteError=signal('');
  requestDelete(employee:Employee){if(this.deletingBusy())return;this.success.set('');this.deleteError.set('');this.deleting.set(employee);}
  confirmDelete(){
    const employee=this.deleting();if(!employee||this.deletingBusy())return;
    this.deletingBusy.set(true);this.deleteError.set('');
    this.service.remove(employee._id).subscribe({next:()=>{this.deletingBusy.set(false);this.deleting.set(null);this.success.set('Employee deleted successfully.');this.load();},error:error=>{this.deletingBusy.set(false);this.deleteError.set(apiError(error));}});
  }
  readonly editing = signal<Employee | null>(null);
  edit(employee: Employee) {
    this.editing.set(employee);
    this.showForm.set(true);
  }
  add() {
    this.editing.set(null);
    this.showForm.set(true);
  }
  readonly showForm = signal(false);
  ngOnInit() {
    this.restoreScroll = this.navigation.listScroll(window.history.state);
    this.searchTerm.set(this.navigation.listSearch(window.history.state));
    const pagination=this.navigation.listPagination(window.history.state);this.page.set(pagination.page);this.pageSize.set(pagination.pageSize);
    this.destroy.onDestroy(()=>{clearTimeout(this.searchTimer);this.request?.unsubscribe();this.generation++;});
    const filter = this.route?.snapshot.queryParamMap.get('status');
    if (filter && ['Active', 'Terminated', 'All'].includes(filter)) this.statusFilter.set(filter);
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    clearTimeout(this.searchTimer);this.request?.unsubscribe();const generation=++this.generation;
    this.request=this.service.getPage(this.page(),this.pageSize(),this.statusFilter(),this.searchTerm()).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (result) => {
        if(generation!==this.generation)return;
        this.allEmployees.set(result.items);this.total.set(result.total);this.page.set(result.page);this.pageSize.set(result.pageSize);
        this.loading.set(false);
        if (this.restoreScroll > 0) { const y = this.restoreScroll; this.restoreScroll = 0; requestAnimationFrame(() => window.scrollTo(0, y)); }
      },
      error: (error) => {
        if(generation!==this.generation)return;
        this.error.set(apiError(error));
        this.loading.set(false);
      },
    });
  }
  added() {
    this.showForm.set(false);
    this.success.set(
      this.editing() ? 'Employee updated successfully.' : 'Employee added successfully.',
    );
    this.editing.set(null);
    this.load();
  }
}
