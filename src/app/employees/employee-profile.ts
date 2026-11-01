import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmployeeTax } from '../features/tax-management/employee-tax';
import { Auth } from '../auth/auth';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { NavigationContext } from '../shared/navigation-context';
import {
  Component,
  OnInit,
  inject,
  signal,
  DestroyRef,
  HostListener,
  viewChild,
} from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EmployeeService, apiError } from './employee.service';
import { Employee, contactNumberPattern } from './employee';
import { realDate } from './employee-form';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActionIcon } from '../shared/action-icon';
import { COUNTRIES } from '../settings/countries';
import { PayChecks } from './pay-checks';
import { ProfileTabs, ProfileTab } from './profile-tabs';
import { ProfileCard } from './profile-card';
import { EmploymentHistory } from './employment-history';
import { Organization } from '../organization';
@Component({
  selector: 'app-employee-profile',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ActionIcon,
    DatePipe,
    CurrencyPipe,
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
  private readonly taxPanel = viewChild(EmployeeTax);
  private readonly destroyRef = inject(DestroyRef);
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
      value === 'checks' || (value === 'tax' && this.taxAuth.user()?.role === 'admin')
        ? (value as ProfileTab)
        : 'details';
    this.tab.set(tab);
    if (tab === 'tax') this.taxOpened.set(true);
  }
  changeTab(tab: ProfileTab) {
    this.selectTab(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: this.tab() === 'details' ? null : this.tab() },
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

  private readonly fb = inject(FormBuilder);
  readonly countries = COUNTRIES;
  readonly employmentEditing = signal(false);
  readonly personalEditing = signal(false);
  readonly employmentSaving = signal(false);
  readonly personalSaving = signal(false);
  readonly employmentError = signal('');
  readonly personalError = signal('');
  readonly employmentSuccess = signal('');
  readonly personalSuccess = signal('');
  private text(max: number) {
    return this.fb.nonNullable.control('', [
      Validators.maxLength(max),
      Validators.pattern(/^[^\u0000-\u001f\u007f]*$/u),
    ]);
  }
  readonly employmentForm = this.fb.nonNullable.group({ designation: this.text(120) });
  readonly personalForm = this.fb.nonNullable.group({
    contactNumber: ['', [Validators.maxLength(40), Validators.pattern(contactNumberPattern)]],
    email: ['', [Validators.required, Validators.email]],
    dateOfBirth: ['', [Validators.required, realDate]],
    addressLine1: this.text(250),
    addressLine2: this.text(250),
    city: this.text(120),
    state: this.text(120),
    zipCode: this.text(32),
    country: this.text(120),
  });
  readonly addressFields = [
    {
      key: 'addressLine1',
      label: 'Address Line 1',
      max: 250,
      autocomplete: 'address-line1',
      wide: true,
    },
    {
      key: 'addressLine2',
      label: 'Address Line 2',
      max: 250,
      autocomplete: 'address-line2',
      wide: true,
    },
    { key: 'city', label: 'City', max: 120, autocomplete: 'address-level2', wide: false },
    { key: 'state', label: 'State', max: 120, autocomplete: 'address-level1', wide: false },
    { key: 'zipCode', label: 'Zip Code', max: 32, autocomplete: 'postal-code', wide: false },
  ] as const;
  private employmentBaseline = '';
  private personalBaseline = '';
  private resetEmployment() {
    this.employmentForm.reset({ designation: this.employee()?.designation ?? '' });
    this.employmentBaseline = JSON.stringify(this.employmentForm.getRawValue());
  }
  private resetPersonal() {
    const person = this.employee();
    this.personalForm.reset({
      email: person?.email ?? '',
      contactNumber: person?.contactNumber ?? '',
      dateOfBirth: person?.dateOfBirth.slice(0, 10) ?? '',
      addressLine1: person?.addressLine1 ?? '',
      addressLine2: person?.addressLine2 ?? '',
      city: person?.city ?? '',
      state: person?.state ?? '',
      zipCode: person?.zipCode ?? '',
      country: person?.country ?? '',
    });
    this.personalBaseline = JSON.stringify(this.personalForm.getRawValue());
  }
  editEmployment() {
    this.resetEmployment();
    this.employmentError.set('');
    this.employmentSuccess.set('');
    this.employmentEditing.set(true);
  }
  editPersonal() {
    this.resetPersonal();
    this.personalError.set('');
    this.personalSuccess.set('');
    this.personalEditing.set(true);
  }
  hasUnsavedChanges() {
    return (
      (this.employmentEditing() &&
        JSON.stringify(this.employmentForm.getRawValue()) !== this.employmentBaseline) ||
      (this.personalEditing() &&
        JSON.stringify(this.personalForm.getRawValue()) !== this.personalBaseline) ||
      !!this.taxPanel()?.hasUnsavedChanges()
    );
  }
  canLeave() {
    if (this.employmentSaving() || this.personalSaving()) return false;
    return !this.hasUnsavedChanges() || window.confirm('Leave this employee with unsaved changes?');
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedChanges() || this.employmentSaving() || this.personalSaving()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  cancelCard(card: 'employment' | 'personal') {
    const employment = card === 'employment';
    if ((employment ? this.employmentSaving : this.personalSaving)()) return;
    const form = employment ? this.employmentForm : this.personalForm;
    const baseline = employment ? this.employmentBaseline : this.personalBaseline;
    if (
      JSON.stringify(form.getRawValue()) !== baseline &&
      !window.confirm('Discard unsaved changes to this card?')
    )
      return;
    if (employment) {
      this.resetEmployment();
      this.employmentEditing.set(false);
      this.employmentError.set('');
    } else {
      this.resetPersonal();
      this.personalEditing.set(false);
      this.personalError.set('');
    }
  }
  async saveCard(card: 'employment' | 'personal') {
    const employment = card === 'employment';
    const saving = employment ? this.employmentSaving : this.personalSaving;
    const editing = employment ? this.employmentEditing : this.personalEditing;
    const error = employment ? this.employmentError : this.personalError;
    const success = employment ? this.employmentSuccess : this.personalSuccess;
    const form = employment ? this.employmentForm : this.personalForm;
    const person = this.employee();
    if (!person || saving() || !editing()) return;
    error.set('');
    success.set('');
    if (!employment)
      this.personalForm.controls.email.setValue(
        this.personalForm.controls.email.value.trim().toLowerCase(),
      );
    form.markAllAsTouched();
    if (form.invalid) {
      error.set('Check the highlighted fields before saving.');
      return;
    }
    const payload = Object.fromEntries(
      Object.entries(form.getRawValue()).map(([key, value]) => [key, value.trim()]),
    );
    saving.set(true);
    try {
      const saved = await firstValueFrom(this.service.update(person._id, payload));
      // Merge only this card's fields: a concurrent response must not overwrite another card.
      this.employee.update((current) =>
        current
          ? {
              ...current,
              ...Object.fromEntries(
                Object.keys(payload).map((key) => [key, saved[key as keyof Employee]]),
              ),
              updatedAt: saved.updatedAt,
            }
          : current,
      );
      if (employment) this.resetEmployment();
      else this.resetPersonal();
      editing.set(false);
      success.set((employment ? 'Employment' : 'Personal') + ' information saved.');
    } catch (failure) {
      error.set(apiError(failure));
    } finally {
      saving.set(false);
    }
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
