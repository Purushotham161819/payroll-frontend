import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { completionSignal } from '../shared/notification.service';
import { Component, DestroyRef, OnInit, inject, signal, viewChild, ElementRef } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { apiError } from '../employees/employee.service';
import { ContractorApi } from '../contractors/contractor-api';
import { EmployeeForm } from '../employees/employee-form';
import { Auth } from '../auth/auth';
import { ActionIcon } from '../shared/action-icon';
import { PsInrPipe, PsButton, PsIcon, PsPageHeader, PsCard, PsCardTitle, PsCardSubtitle } from '../shared/ui';

export function dashboardGreeting(date: Date): string {
  const hour = date.getHours();
  return hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 17 ? 'Good afternoon' : 'Good evening';
}

@Component({
  selector: 'app-dashboard',
  imports: [PsInrPipe, DecimalPipe, DatePipe, RouterLink, EmployeeForm, ActionIcon, PsButton, PsIcon, PsPageHeader, PsCard, PsCardTitle, PsCardSubtitle],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly contractors = inject(ContractorApi);
  private readonly destroy = inject(DestroyRef);
  readonly auth = inject(Auth);
  readonly now = signal(new Date());
  readonly employeeCount = signal<number | null>(null);
  readonly contractorCount = signal<number | null>(null);
  readonly employeeLoading = signal(false);
  readonly contractorLoading = signal(false);
  readonly employeeError = signal('');
  readonly contractorError = signal('');
  readonly employeeIds = signal('');
  readonly showEmployeeForm = signal(false);
  readonly success = completionSignal();
  private readonly addButton = viewChild('addButton', { read: ElementRef });
  readonly annualRunRate = signal<number | null>(null);
  readonly monthlyRunRate = signal<number | null>(null);
  get greeting() {
    const name = this.auth.user()?.firstName?.trim();
    return dashboardGreeting(this.now()) + (name ? ', ' + name + '!' : '');
  }

  ngOnInit() {
    const timer = setInterval(() => this.now.set(new Date()), 30_000);
    this.destroy.onDestroy(() => clearInterval(timer));
    this.loadEmployees();
    this.loadContractors();
  }
  loadEmployees() {
    if (this.employeeLoading()) return;
    this.employeeLoading.set(true); this.employeeError.set(''); this.employeeCount.set(null);
    this.annualRunRate.set(null); this.monthlyRunRate.set(null);
    this.http.get<{activeEmployees:number;annualRunRate:number;monthlyRunRate:number;activeEmployeeIds:string[]}>(environment.apiUrl + '/reports/dashboard').pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: rows => {
        this.employeeCount.set(rows.activeEmployees); this.employeeIds.set(rows.activeEmployeeIds.join(','));
        this.annualRunRate.set(rows.annualRunRate); this.monthlyRunRate.set(rows.monthlyRunRate);
        this.employeeLoading.set(false);
      },
      error: error => { this.employeeError.set(apiError(error)); this.employeeLoading.set(false); },
    });
  }
  loadContractors() {
    if (this.contractorLoading()) return;
    this.contractorLoading.set(true); this.contractorError.set(''); this.contractorCount.set(null);
    this.contractors.list().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: rows => { this.contractorCount.set(rows.filter(row => (row.status ?? 'Active') === 'Active').length); this.contractorLoading.set(false); },
      error: error => { this.contractorError.set(apiError(error)); this.contractorLoading.set(false); },
    });
  }
  closeEmployeeForm() {
    this.showEmployeeForm.set(false);
    this.addButton()?.nativeElement.focus();
  }
  employeeAdded() {
    this.closeEmployeeForm(); this.success.set('Employee added successfully.'); this.loadEmployees();
  }
}
