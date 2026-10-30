import { NavigationContext } from '../shared/navigation-context';
import { Router, ActivatedRoute } from '@angular/router';
import { CdkMenuModule } from '@angular/cdk/menu';
import { LifecycleDialog } from './lifecycle-dialog';
import { DeleteConfirmation } from '../shared/delete-confirmation';
﻿import { PayrollGenerator } from '../payroll/payroll-generator';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { EmployeeService, apiError } from './employee.service';
import { Employee } from './employee';
import { EmployeeForm } from './employee-form';
@Component({
  selector: 'app-employee-list',
  imports: [CdkMenuModule, LifecycleDialog, DatePipe, DecimalPipe, EmployeeForm, PayrollGenerator, DeleteConfirmation],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css',
})
export class EmployeeList implements OnInit {
  private readonly navigation = inject(NavigationContext);
  private restoreScroll = 0;
  openProfile(event: MouseEvent, id: string) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !this.router) return;
    event.preventDefault(); const origin = this.navigation.listOrigin(this.statusFilter(), window.scrollY);
    void this.router.navigate(['/employees', id], { queryParams: { returnStatus: this.statusFilter() }, state: origin ? { employeeOrigin: origin } : {} });
  }
  private readonly router = inject(Router, { optional: true });
  private readonly route = inject(ActivatedRoute, { optional: true });
  profileUrl(id: string) { return '/employees/' + encodeURIComponent(id) + '?returnStatus=' + encodeURIComponent(this.statusFilter()); }
  runPayroll() { if (this.selectedCount()) void this.router?.navigate(['/payroll/run'], { queryParams: { employees: [...this.selectedIds()].join(','), returnStatus: this.statusFilter() } }); }
  readonly eligibleEmployees = computed(() => this.employees().filter(e => (e.status ?? 'Active') === 'Active'));
  private readonly service = inject(EmployeeService);
  readonly allEmployees = signal<Employee[]>([]);
  readonly statusFilter = signal('Active');
  readonly employees = computed(() => this.allEmployees().filter(employee => this.statusFilter() === 'All' || (employee.status ?? 'Active') === this.statusFilter()));
  changeFilter(value: string) { this.statusFilter.set(value); this.selectedIds.set(new Set()); void this.router?.navigate([], { queryParams: { status: value }, queryParamsHandling: 'merge', replaceUrl: true }); }
  readonly lifecycle = signal<{employee: Employee; action: 'Terminate' | 'Rehire' | 'History'} | null>(null);
  lifecycleSaved() { this.success.set('Employee '+(this.lifecycle()?.action === 'Terminate' ? 'terminated' : 'rehired')+' successfully.'); this.lifecycle.set(null); this.load(); }
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
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
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly allSelected = computed(
    () => this.eligibleEmployees().length > 0 && this.selectedCount() === this.eligibleEmployees().length,
  );
  readonly someSelected = computed(() => this.selectedCount() > 0 && !this.allSelected());
  toggleEmployee(id: string, selected: boolean) {
    if (selected && !this.eligibleEmployees().some(e => e._id === id)) return;
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  toggleAll(selected: boolean) {
    this.selectedIds.set(new Set(selected ? this.eligibleEmployees().map((employee) => employee._id) : []));
  }
  ngOnInit() {
    this.restoreScroll = this.navigation.listScroll(window.history.state);
    const filter = this.route?.snapshot.queryParamMap.get('status');
    if (filter && ['Active', 'Terminated', 'All'].includes(filter)) this.statusFilter.set(filter);
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.service.getAll().subscribe({
      next: (employees) => {
        this.allEmployees.set(employees);
        const availableIds = new Set(this.eligibleEmployees().map((employee) => employee._id));
        this.selectedIds.update(
          (current) => new Set([...current].filter((id) => availableIds.has(id))),
        );
        this.loading.set(false);
        if (this.restoreScroll > 0) { const y = this.restoreScroll; this.restoreScroll = 0; requestAnimationFrame(() => window.scrollTo(0, y)); }
      },
      error: (error) => {
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
