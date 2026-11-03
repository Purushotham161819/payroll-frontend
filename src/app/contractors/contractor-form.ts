import { Component, OnInit, input, output, signal, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Contractor, ContractorApi } from './contractor-api';
import { apiError } from '../employees/employee.service';
import { PsButton, PsFormField, PsFieldControl } from '../shared/ui';
import { PsDialog } from '../shared/ui/ps-dialog';
@Component({
  selector: 'app-contractor-form',
  imports: [FormsModule, PsButton, PsFormField, PsFieldControl, PsDialog],
  template: `<ps-dialog
    [title]="contractor() ? 'Edit Contractor' : 'Add Contractor'"
    [busy]="busy()"
    (closed)="cancelled.emit()"
    ><form #form="ngForm" (ngSubmit)="save(form)">
      @if (error()) {
        <p class="notice error" role="alert">{{ error() }}</p>
      }
      <fieldset [disabled]="busy()">
        <div class="ps-grid">
          <ps-form-field label="First Name" required errorText="Enter a first name."
            ><input
              psFieldControl
              name="firstName"
              [(ngModel)]="draft.firstName"
              required
              maxlength="80"
              pattern=".*\\S.*" /></ps-form-field
          ><ps-form-field label="Last Name" required errorText="Enter a last name."
            ><input
              psFieldControl
              name="lastName"
              [(ngModel)]="draft.lastName"
              required
              maxlength="80"
              pattern=".*\\S.*" /></ps-form-field
          ><ps-form-field label="Email" required errorText="Enter a valid email address."
            ><input
              psFieldControl
              name="email"
              type="email"
              [(ngModel)]="draft.email"
              required
              email
              maxlength="254"
          /></ps-form-field>
        </div>
      </fieldset>
      <footer class="ps-form-actions">
        <button psButton variant="secondary" (click)="cancelled.emit()" [disabled]="busy()">
          Cancel</button
        ><button psButton type="submit" [loading]="busy()" [disabled]="busy()">
          Save Contractor
        </button>
      </footer>
    </form></ps-dialog
  >`,
})
export class ContractorForm implements OnInit {
  readonly contractor = input<Contractor | null>(null);
  readonly saved = output<Contractor>();
  readonly cancelled = output<void>();
  readonly busy = signal(false);
  readonly error = signal('');
  private readonly api = inject(ContractorApi);
  draft = { firstName: '', lastName: '', email: '' };
  ngOnInit() {
    const c = this.contractor();
    if (c) this.draft = { firstName: c.firstName, lastName: c.lastName, email: c.email };
  }
  async save(form: NgForm) {
    if (this.busy()) return;
    form.form.markAllAsTouched();
    if (form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const c = this.contractor();
      const dto = {
        firstName: this.draft.firstName.trim(),
        lastName: this.draft.lastName.trim(),
        email: this.draft.email.trim().toLowerCase(),
      };
      this.saved.emit(
        await firstValueFrom(
          c ? this.api.update(c._id, { ...dto, version: c.version }) : this.api.create(dto),
        ),
      );
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
