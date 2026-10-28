import { PayrollGenerator } from '../payroll/payroll-generator';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { EmployeeService, apiError } from './employee.service';
import { Employee } from './employee';
import { EmployeeForm } from './employee-form';
@Component({
  selector: 'app-employee-list',
  imports: [DatePipe, DecimalPipe, EmployeeForm, PayrollGenerator],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css',
})
export class EmployeeList implements OnInit {
  private readonly service = inject(EmployeeService);
  readonly employees = signal<Employee[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
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
    () => this.employees().length > 0 && this.selectedCount() === this.employees().length,
  );
  readonly someSelected = computed(() => this.selectedCount() > 0 && !this.allSelected());
  toggleEmployee(id: string, selected: boolean) {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  toggleAll(selected: boolean) {
    this.selectedIds.set(new Set(selected ? this.employees().map((employee) => employee._id) : []));
  }
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.service.getAll().subscribe({
      next: (employees) => {
        this.employees.set(employees);
        const availableIds = new Set(employees.map((employee) => employee._id));
        this.selectedIds.update(
          (current) => new Set([...current].filter((id) => availableIds.has(id))),
        );
        this.loading.set(false);
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
