import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmployeeTax } from '../features/tax-management/employee-tax';
import { Auth } from '../auth/auth';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { NavigationContext } from '../shared/navigation-context';
import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EmployeeService, apiError } from './employee.service';
import { Employee } from './employee';
import { EmployeeForm } from './employee-form';
import { PayChecks } from './pay-checks';
import { ProfileTabs, ProfileTab } from './profile-tabs';
import { ProfileCard } from './profile-card';
import { EmploymentHistory } from './employment-history';
import { Organization } from '../organization';
@Component({
  selector: 'app-employee-profile',
  imports: [
    RouterLink,
    DatePipe,
    CurrencyPipe,
    EmployeeForm,
    PayChecks,
    ProfileTabs,
    ProfileCard,
    EmploymentHistory,
    EmployeeTax,
  ],
  templateUrl: './employee-profile.html',
  styleUrl: './employee-profile.css',
})
export class EmployeeProfile implements OnInit {
  readonly taxAuth = inject(Auth);
  private readonly service = inject(EmployeeService);
  private readonly route = inject(ActivatedRoute);
  readonly organization = inject(Organization);
  readonly employee = signal<Employee | null>(null);
  readonly tab = signal<ProfileTab>('details');
  readonly taxOpened = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  readonly editing = signal(false);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly returnStatus = ['Active', 'Terminated', 'All'].includes(
    this.route.snapshot.queryParamMap.get('returnStatus') ?? '',
  )
    ? this.route.snapshot.queryParamMap.get('returnStatus')!
    : 'Active';
  private readonly navigation = inject(NavigationContext);
  private readonly router = inject(Router);
  private readonly origin = this.navigation.origin(inject(Location).getState());
  readonly backLabel =
    this.origin?.kind === 'payroll' ? 'Back to Run Payroll' : 'Back to Employees';
  readonly backUrl = this.router.parseUrl(this.origin?.url ?? '/?status=' + this.returnStatus);
  readonly backState = this.origin ? this.navigation.backState(this.origin) : {};
  private selectTab(value: string | null) {
    const tab: ProfileTab =
      value === 'history' ||
      value === 'checks' ||
      (value === 'tax' && this.taxAuth.user()?.role === 'admin')
        ? (value as ProfileTab)
        : 'details';
    this.tab.set(tab);
    if (tab === 'tax') this.taxOpened.set(true);
  }
  changeTab(tab: ProfileTab) {
    this.selectTab(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'details' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  ngOnInit() {
    this.selectTab(this.route.snapshot.queryParamMap.get('tab'));
    this.route.queryParamMap
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.selectTab(params.get('tab')));
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const person = (await firstValueFrom(this.service.getAll())).find(
        (e) => e._id === this.route.snapshot.paramMap.get('id'),
      );
      if (!person) this.error.set('Employee not found.');
      this.employee.set(person ?? null);
    } catch (error) {
      this.error.set(apiError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
