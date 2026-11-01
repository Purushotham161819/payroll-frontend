import { ActionIcon } from '../shared/action-icon';
import { SettingsTabs } from '../shared/settings-tabs';
import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { apiError } from '../employees/employee.service';
import { COUNTRIES } from './countries';
export interface OrganizationAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}
interface OrganizationProfile {
  organizationName: string;
  addressVersion: number;
  address: OrganizationAddress;
}
const emptyAddress = (): OrganizationAddress => ({
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: '',
  zipCode: '',
});
@Component({
  selector: 'app-organization-settings',
  imports: [ActionIcon, SettingsTabs, FormsModule],
  templateUrl: './organization-settings.html',
  styleUrl: './organization-settings.css',
})
export class OrganizationSettings implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/settings/organization-profile';
  readonly organization = signal<OrganizationProfile | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly countries = COUNTRIES;
  draft = emptyAddress();
  readonly fields = [
    {
      key: 'addressLine1',
      label: 'Address Line 1',
      autocomplete: 'address-line1',
      max: 250,
      required: true,
      placeholder: 'Street address',
    },
    {
      key: 'addressLine2',
      label: 'Address Line 2',
      autocomplete: 'address-line2',
      max: 250,
      required: false,
      placeholder: 'Suite, floor or building (optional)',
    },
    {
      key: 'city',
      label: 'City',
      autocomplete: 'address-level2',
      max: 120,
      required: true,
      placeholder: 'City or locality',
    },
    {
      key: 'state',
      label: 'State',
      autocomplete: 'address-level1',
      max: 120,
      required: true,
      placeholder: 'State, province or region',
    },
    {
      key: 'zipCode',
      label: 'Zip Code',
      autocomplete: 'postal-code',
      max: 32,
      required: true,
      placeholder: 'Postal or ZIP code',
    },
  ] as const;
  canLeave() {
    return (
      !this.saving() &&
      (!this.editing() ||
        !this.hasChanges() ||
        window.confirm('Leave organization settings with unsaved changes?'))
    );
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.saving() || (this.editing() && this.hasChanges())) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  ngOnInit() {
    void this.load();
  }
  async load() {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const value = await firstValueFrom(this.http.get<OrganizationProfile>(this.url));
      this.organization.set(value);
      this.draft = { ...emptyAddress(), ...value.address };
      this.editing.set(false);
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.loading.set(false);
    }
  }
  edit() {
    if (this.saving()) return;
    this.error.set('');
    this.success.set('');
    this.editing.set(true);
  }
  cancel() {
    if (this.saving()) return;
    this.draft = { ...emptyAddress(), ...this.organization()?.address };
    this.editing.set(false);
    this.error.set('');
  }
  hasChanges() {
    return (
      this.organization()?.addressVersion === 0 ||
      JSON.stringify(this.normalized()) !== JSON.stringify(this.organization()?.address)
    );
  }
  normalized() {
    return Object.fromEntries(
      Object.entries(this.draft).map(([key, value]) => [key, value.trim()]),
    ) as unknown as OrganizationAddress;
  }
  valid() {
    const value = this.normalized();
    return (
      this.fields.every(
        (field) =>
          (!field.required || !!value[field.key]) &&
          value[field.key].length <= field.max &&
          !/[\u0000-\u001f\u007f]/u.test(value[field.key]),
      ) &&
      !!value.country &&
      value.country.length <= 120
    );
  }
  async save(form?: NgForm) {
    if (this.saving() || !this.organization() || !this.editing()) return;
    form?.form.markAllAsTouched();
    this.error.set('');
    this.success.set('');
    if (form?.invalid || !this.valid()) {
      this.error.set('Complete all required address fields. Address Line 2 is optional.');
      return;
    }
    if (!this.hasChanges()) return;
    this.saving.set(true);
    try {
      const value = await firstValueFrom(
        this.http.patch<OrganizationProfile>(this.url + '/address', {
          ...this.normalized(),
          version: this.organization()!.addressVersion,
        }),
      );
      this.organization.set(value);
      this.draft = { ...value.address };
      this.editing.set(false);
      this.success.set('Organization address saved.');
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.saving.set(false);
    }
  }
}
