import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
interface Organization {
  organizationId: string;
  name: string;
  status: string;
  createdAt: string;
  admins?: number;
  users?: number;
}
interface Account {
  id: string;
  email: string;
  role: 'admin' | 'user';
  active: boolean;
  createdAt: string;
}
interface Page<T> {
  items: T[];
  total: number;
}
@Component({
  selector: 'app-platform',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './platform.html',
  styleUrl: './platform.css',
})
export class PlatformPortal {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  readonly orgId = this.route.snapshot.paramMap.get('org');
  readonly dashboard = !this.orgId && this.route.snapshot.url.length === 0;
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly totals = signal<{
    organizations: number;
    activeOrganizations: number;
    admins: number;
    users: number;
  } | null>(null);
  readonly organizations = signal<Organization[]>([]);
  readonly organization = signal<Organization | null>(null);
  readonly accounts = signal<Account[]>([]);
  readonly total = signal(0);
  readonly events = signal<{ action: string; actorId: string; accountId?: string; at: string }[]>(
    [],
  );
  readonly editor = viewChild.required<ElementRef<HTMLDialogElement>>('editor');
  readonly confirm = viewChild.required<ElementRef<HTMLDialogElement>>('confirm');
  page = 1;
  readonly limit = 20;
  tab: 'details' | 'admin' | 'user' = 'details';
  mode: 'customer' | 'create' | 'edit' | 'password' = 'customer';
  selected: Account | null = null;
  name = '';
  email = '';
  password = '';
  confirmation = '';
  role: 'admin' | 'user' = 'user';
  active = true;
  pending: 'organization' | 'status' | 'password' | null = null;
  constructor() {
    void this.load();
  }
  private base() {
    return environment.apiUrl + '/super-admin';
  }
  private orgPath() {
    return this.base() + '/organizations/' + this.orgId;
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      if (this.dashboard)
        this.totals.set(await firstValueFrom(this.http.get<any>(this.base() + '/dashboard')));
      else if (this.orgId) {
        this.organization.set(await firstValueFrom(this.http.get<Organization>(this.orgPath())));
        if (this.tab === 'details') {
          const data = await firstValueFrom(
            this.http.get<Page<any>>(
              this.orgPath() + '/audit?page=' + this.page + '&limit=' + this.limit,
            ),
          );
          this.events.set(data.items);
          this.total.set(data.total);
        } else {
          const data = await firstValueFrom(
            this.http.get<Page<Account>>(
              this.orgPath() +
                '/accounts?page=' +
                this.page +
                '&limit=' +
                this.limit +
                '&role=' +
                this.tab,
            ),
          );
          this.accounts.set(data.items);
          this.total.set(data.total);
        }
      } else {
        const data = await firstValueFrom(
          this.http.get<Page<Organization>>(
            this.base() + '/organizations?page=' + this.page + '&limit=' + this.limit,
          ),
        );
        this.organizations.set(data.items);
        this.total.set(data.total);
      }
    } catch (e) {
      this.error.set(this.message(e));
    } finally {
      this.loading.set(false);
    }
  }
  switchTab(tab: 'details' | 'admin' | 'user') {
    this.tab = tab;
    this.page = 1;
    void this.load();
  }
  move(delta: number) {
    this.page += delta;
    void this.load();
  }
  open(mode: typeof this.mode, account: Account | null = null) {
    this.mode = mode;
    this.selected = account;
    this.name = '';
    this.email = account?.email ?? '';
    this.role = account?.role ?? (this.tab === 'admin' ? 'admin' : 'user');
    this.active = true;
    this.password = this.confirmation = '';
    this.error.set('');
    this.pending = null;
    this.editor().nativeElement.showModal();
  }
  close(event?: Event) {
    event?.preventDefault();
    if (this.busy()) return;
    this.editor().nativeElement.close();
    this.password = this.confirmation = '';
  }
  request(action: 'organization' | 'status' | 'password', account: Account | null = null) {
    this.pending = action;
    if (account) this.selected = account;
    this.confirm().nativeElement.showModal();
  }
  cancelConfirmation(event?: Event) {
    event?.preventDefault();
    if (!this.busy()) {
      this.confirm().nativeElement.close();
      this.pending = null;
    }
  }
  async submit() {
    if (this.busy()) return;
    if (
      this.mode !== 'edit' &&
      (this.password.length < 8 ||
        this.password.length > 128 ||
        this.password !== this.confirmation)
    ) {
      this.error.set('Passwords must match. Password must be at least 8 characters long.');
      return;
    }
    if (this.mode === 'password') {
      this.request('password');
      return;
    }
    await this.save();
  }
  async save() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.pending === 'organization')
        await firstValueFrom(
          this.http.patch(this.orgPath() + '/status', {
            active: this.organization()?.status !== 'active',
          }),
        );
      else if (this.pending === 'status' && this.selected)
        await firstValueFrom(
          this.http.patch(this.orgPath() + '/accounts/' + this.selected.id + '/status', {
            active: !this.selected.active,
          }),
        );
      else if (this.pending === 'password' && this.selected)
        await firstValueFrom(
          this.http.patch(this.orgPath() + '/accounts/' + this.selected.id + '/password', {
            password: this.password,
          }),
        );
      else if (this.mode === 'customer') {
        const result = await firstValueFrom(
          this.http.post<{ organizationId: string }>(this.base() + '/organizations', {
            name: this.name.trim(),
            email: this.email.trim().toLowerCase(),
            password: this.password,
            role: 'admin',
            active: true,
          }),
        );
        this.notice.set(
          'Customer created: ' +
            result.organizationId +
            '. Deliver the temporary password privately. The administrator must change it at sign-in.',
        );
      } else if (this.mode === 'create')
        await firstValueFrom(
          this.http.post(this.orgPath() + '/accounts', {
            email: this.email.trim().toLowerCase(),
            password: this.password,
            role: this.role,
            active: this.active,
          }),
        );
      else if (this.mode === 'edit' && this.selected)
        await firstValueFrom(
          this.http.patch(this.orgPath() + '/accounts/' + this.selected.id, {
            email: this.email.trim().toLowerCase(),
            role: this.role,
          }),
        );
      if (this.mode !== 'customer' || this.pending)
        this.notice.set(
          this.pending === 'password'
            ? 'Temporary password set. Existing sessions are invalidated; the account must choose a new password at sign-in.'
            : 'Changes saved.',
        );
      this.editor().nativeElement.close();
      this.confirm().nativeElement.close();
      this.password = this.confirmation = '';
      this.pending = null;
      await this.load();
    } catch (e) {
      this.error.set(this.message(e));
    } finally {
      this.busy.set(false);
    }
  }
  private message(e: unknown) {
    if (
      e instanceof HttpErrorResponse &&
      typeof e.error?.message === 'string' &&
      [400, 403, 404, 409].includes(e.status)
    )
      return e.error.message;
    return 'Unable to complete the request. Please try again.';
  }
}
