import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { OrganizationSettings } from './organization-settings';
import { Settings, SalaryComponentService } from './settings';
import { Auth, administrator } from '../auth/auth';
import { routes } from '../app.config';
import { COUNTRIES } from './countries';
const url = 'http://localhost:3000/settings/organization-profile';
const empty = { addressLine1: '', addressLine2: '', city: '', state: '', country: '', zipCode: '' };
const address = {
  addressLine1: '123 Main St., #4',
  addressLine2: '',
  city: 'Boston',
  state: 'MA',
  country: 'United States',
  zipCode: '00123',
};
const profile = (version = 0) => ({
  organizationName: 'Name from Super Admin',
  addressVersion: version,
  address: version ? { ...address } : { ...empty },
});
describe('Organization Settings address editor', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  async function setup(version = 0) {
    TestBed.configureTestingModule({
      imports: [OrganizationSettings],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(OrganizationSettings),
      http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(url).flush(profile(version));
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http };
  }
  it('loads the authoritative readonly name and initially empty address with a complete country selector', async () => {
    const { fixture, page } = await setup();
    expect(fixture.nativeElement.textContent).toContain('Name from Super Admin');
    expect(fixture.nativeElement.querySelector('[name=organizationName]')).toBeNull();
    expect(page.draft).toEqual(empty);
    expect(page.editing()).toBe(true);
    expect(COUNTRIES.length).toBe(249);
    expect(fixture.nativeElement.querySelectorAll('#country option').length).toBe(250);
    expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('#zipCode').type).toBe('text');
  });
  it('saves only address fields once, preserves postal strings, reloads and supports Edit/Cancel', async () => {
    const { fixture, page, http } = await setup();
    for (const [key, value] of Object.entries(address)) {
      const control = fixture.nativeElement.querySelector('#' + key);
      control.value = value;
      control.dispatchEvent(new Event(key === 'country' ? 'change' : 'input', { bubbles: true }));
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBe(false);
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    void page.save();
    const req = http.expectOne(url + '/address');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ ...address, version: 0 });
    req.flush(profile(1));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.editing()).toBe(false);
    expect(page.success()).toContain('saved');
    expect(fixture.nativeElement.querySelector('#addressLine1').readOnly).toBe(true);
    const reload = page.load();
    http.expectOne(url).flush(profile(1));
    await reload;
    expect(page.draft.zipCode).toBe('00123');
    page.edit();
    page.draft.city = 'Changed';
    page.cancel();
    expect(page.draft.city).toBe('Boston');
    expect(page.editing()).toBe(false);
  });
  it('keeps entered values and edit mode after API validation failure', async () => {
    const { page, http } = await setup(1);
    page.edit();
    page.draft.city = 'My entered city';
    const saving = page.save();
    http
      .expectOne(url + '/address')
      .flush({ message: 'Review address details' }, { status: 400, statusText: 'Bad Request' });
    await saving;
    expect(page.draft.city).toBe('My entered city');
    expect(page.editing()).toBe(true);
    expect(page.error()).toBe('Review address details');
    expect(page.saving()).toBe(false);
    page.draft.city = ' ';
    await page.save();
    http.expectNone(url + '/address');
    expect(page.error()).toContain('required');
  });
});
describe('Organization Settings navigation authorization', () => {
  it.each(['admin', 'user', 'super_admin'])(
    'enforces the existing administrator guard for %s',
    async (role) => {
      const auth = { user: signal({ role }), check: vi.fn(async () => true) };
      TestBed.configureTestingModule({
        providers: [provideRouter([]), { provide: Auth, useValue: auth }],
      });
      const result = await TestBed.runInInjectionContext(() =>
        administrator({} as any, { url: '/settings/organization' } as any),
      );
      expect(result === true).toBe(role === 'admin');
      const route = routes
        .find((r) => r.path === '')!
        .children!.find((r) => r.path === 'settings/organization');
      expect(route?.canActivate).toContain(administrator);
    },
  );
  it.each(['admin', 'user'])(
    'shows the Settings link only to admin, current role %s',
    async (role) => {
      TestBed.configureTestingModule({
        imports: [Settings],
        providers: [
          provideRouter([]),
          { provide: Auth, useValue: { user: signal({ role }) } },
          { provide: SalaryComponentService, useValue: { list: () => of([]) } },
        ],
      });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(!!fixture.nativeElement.querySelector('a[href="/settings/organization"]')).toBe(
        role === 'admin',
      );
    },
  );
});
