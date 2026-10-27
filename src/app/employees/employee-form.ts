import { AfterViewInit, Component, ElementRef, inject, OnDestroy, output, signal, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeeService, apiError } from './employee.service';
function realDate(control: AbstractControl) {
  if (!control.value) return null;
  const value = String(control.value);
  const date = new Date(value + 'T00:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value ? null : { date: true };
}
@Component({ selector: 'app-employee-form', imports: [ReactiveFormsModule], templateUrl: './employee-form.html', styleUrl: './employee-form.css' })
export class EmployeeForm implements AfterViewInit, OnDestroy {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('employeeDialog');
  private readonly document = inject(DOCUMENT);
  private previousOverflow = '';
  private returnFocus: HTMLElement | null = null;
  ngAfterViewInit() {
    this.returnFocus = this.document.activeElement as HTMLElement | null;
    this.previousOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    this.dialog().nativeElement.showModal();
  }
  ngOnDestroy() {
    this.dialog().nativeElement.close();
    this.document.body.style.overflow = this.previousOverflow;
    const target = this.returnFocus;
    queueMicrotask(() => { if (target?.isConnected) target.focus(); });
  }
  cancel(event?: Event) {
    event?.preventDefault();
    if (!this.saving()) this.cancelled.emit();
  }
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(EmployeeService);
  readonly saved = output<void>();
  readonly cancelled = output<void>();
  readonly saving = signal(false);
  readonly error = signal('');
  readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.pattern(/\S/)]],
    lastName: ['', [Validators.required, Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    dateOfBirth: ['', [Validators.required, realDate]],
    hireDate: ['', [Validators.required, realDate]],
    annualCtc: this.fb.control<number | null>(null, [Validators.required, Validators.min(0), control => control.value === null || (typeof control.value === 'number' && Number.isFinite(control.value)) ? null : { number: true }]),
  });
  invalid(field: keyof typeof this.form.controls) { const control = this.form.controls[field]; return control.touched && control.invalid; }
  normalizeEmail() { this.form.controls.email.setValue((this.form.controls.email.value ?? '').trim().toLowerCase()); }
  submit() {
    if (this.saving()) return;
    const controls = this.form.controls;
    controls.firstName.setValue((controls.firstName.value ?? '').trim());
    controls.lastName.setValue((controls.lastName.value ?? '').trim());
    this.normalizeEmail(); this.form.markAllAsTouched(); this.error.set('');
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.service.create({ firstName: value.firstName!, lastName: value.lastName!, email: value.email!, dateOfBirth: value.dateOfBirth!, hireDate: value.hireDate!, annualCtc: value.annualCtc! }).subscribe({
      next: () => { this.saving.set(false); this.saved.emit(); },
      error: error => { this.saving.set(false); this.error.set(apiError(error)); }
    });
  }
}
