import { NotificationService } from '../shared/notification.service';
import { completionSignal } from '../shared/notification.service';
import { PsButton, PsIconButton, PsPageHeader, PsCard, PsCardTitle, PsCardSubtitle, PsCardActions, PsCardFooter, PsFormField, PsFieldControl } from '../shared/ui';
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
  logo?: string | null;
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
  imports: [SettingsTabs, FormsModule, PsButton, PsIconButton, PsPageHeader, PsCard, PsCardTitle, PsCardSubtitle, PsCardActions, PsCardFooter, PsFormField, PsFieldControl],
  templateUrl: './organization-settings.html',
  styleUrl: './organization-settings.css',
})
export class OrganizationSettings implements OnInit {
  private readonly notifications = inject(NotificationService);
  readonly logoSaving = signal(false);
  readonly failedLogo = signal<string | null>(null);
  readonly logoPreview = signal<string | null>(null);
  readonly logoFile = signal<{ dataUrl: string; name: string; size: number } | null>(null);
  readonly logoDragging = signal(false);
  private logoDragDepth = 0;
  logoDragEnter(event: DragEvent) {
    event.preventDefault();
    if (this.logoSaving() || !event.dataTransfer?.types.includes('Files')) return;
    this.logoDragDepth++;
    this.logoDragging.set(true);
  }
  logoDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = this.logoSaving() ? 'none' : 'copy';
  }
  logoDragLeave(event: DragEvent) {
    event.preventDefault();
    this.logoDragDepth = Math.max(0, this.logoDragDepth - 1);
    if (!this.logoDragDepth) this.logoDragging.set(false);
  }
  async dropLogo(event: DragEvent) {
    event.preventDefault();
    this.logoDragDepth = 0;
    this.logoDragging.set(false);
    await this.uploadLogo(event.dataTransfer?.files[0]);
  }
  logoFileSize(bytes: number) {
    return bytes < 1024 * 1024
      ? Math.max(1, Math.round(bytes / 1024)) + ' KB'
      : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  async selectLogo(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    await this.uploadLogo(file);
  }
  private async uploadLogo(file?: File) {
    if (!file || this.logoSaving()) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) { this.notifications.warning('Choose a PNG or JPG/JPEG image.'); return; }
    if (file.size > 2 * 1024 * 1024) { this.notifications.warning('Logo must be 2 MB or smaller.'); return; }
    this.logoSaving.set(true);
    const previousFile = this.logoFile();
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to read this image.'));
        reader.readAsDataURL(file);
      });
      this.logoFile.set({ dataUrl, name: file.name, size: file.size });
      this.logoPreview.set(dataUrl);
      await this.saveLogo(dataUrl);
    } catch (e) { this.logoFile.set(previousFile); this.notifications.error(apiError(e)); }
    finally { this.logoPreview.set(null); this.logoSaving.set(false); }
  }
  async removeLogo() {
    if (this.logoSaving()) return;
    this.logoSaving.set(true);
    try { await this.saveLogo(''); this.logoFile.set(null); }
    catch (e) { this.notifications.error(apiError(e)); }
    finally { this.logoSaving.set(false); }
  }
  private async saveLogo(dataUrl: string) {
    const value = await firstValueFrom(this.http.patch<OrganizationProfile>(this.url + '/logo', { dataUrl }));
    this.organization.update(current => current ? { ...current, logo: value.logo } : value);
    this.notifications.success(dataUrl ? 'Organization logo saved successfully.' : 'Organization logo removed successfully.');
  }
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/settings/organization-profile';
  readonly organization = signal<OrganizationProfile | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly error = signal('');
  readonly success = completionSignal();
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
