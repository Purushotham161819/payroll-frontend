import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { EmployeeProfile } from './employee-profile';
import { EmployeeService } from './employee.service';

const original = {
  _id: 'a',
  employeeId: 'EMP001',
  firstName: 'Ada',
  lastName: 'Example',
  email: 'ada@example.test',
  dateOfBirth: '1990-01-01',
  hireDate: '2020-01-01',
  annualCtc: 120000,
  payFrequency: 'Monthly',
};
async function setup() {
  const responses: Subject<any>[] = [];
  const update = vi.fn((_id: string, _payload: unknown) => {
    const response = new Subject<any>();
    responses.push(response);
    return response;
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ id: 'a' }),
            queryParamMap: convertToParamMap({}),
          },
        },
      },
      { provide: EmployeeService, useValue: { getAll: () => of([{ ...original }]), update } },
    ],
  });
  const fixture = TestBed.createComponent(EmployeeProfile);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, page: fixture.componentInstance, update, responses };
}
describe('Independent employee information cards', () => {
  it.each(['', '+91 (98765) 43210', '(020) 1234-5678', '+1 212 555 0100 ext. 123'])(
    'accepts optional international/local contact notation: %s',
    async (number) => {
      const { page } = await setup();
      page.editPersonal();
      page.personalForm.controls.contactNumber.setValue(number);
      expect(page.personalForm.controls.contactNumber.valid).toBe(true);
    },
  );
  it.each(['not a phone', '+', '1'.repeat(41)])(
    'rejects invalid contact notation: %s',
    async (number) => {
      const { page, update } = await setup();
      page.editPersonal();
      page.personalForm.controls.contactNumber.setValue(number);
      await page.saveCard('personal');
      expect(update).not.toHaveBeenCalled();
      expect(page.personalForm.controls.contactNumber.invalid).toBe(true);
    },
  );
  it('starts readonly with the exact field order and empty optional profile fields', async () => {
    const { fixture, page } = await setup();
    const cards = fixture.nativeElement.querySelectorAll('app-profile-card');
    expect([...cards[0].querySelectorAll('dt')].map((x: any) => x.textContent.trim())).toEqual([
      'Employee ID',
      'Employment Status',
      'Hiring Date',
      'Designation',
      'Pay Frequency',
      'Annual CTC',
      'Organization Name',
    ]);
    expect([...cards[1].querySelectorAll('dt')].map((x: any) => x.textContent.trim())).toEqual([
      'Email',
      'Contact Number',
      'Date of Birth',
      'Address Line 1',
      'Address Line 2',
      'City',
      'State',
      'Zip Code',
      'Country',
    ]);
    expect(fixture.nativeElement.querySelectorAll('app-profile-card input')).toHaveLength(0);
    page.editEmployment();
    page.editPersonal();
    expect(page.employmentForm.controls.designation.value).toBe('');
    expect(page.personalForm.controls.country.value).toBe('');
    expect(page.personalForm.controls.contactNumber.value).toBe('');
    expect(page.personalForm.controls.addressLine1.value).toBe('');
  });
  it('sends only the saved card and preserves another draft and out-of-order responses', async () => {
    const { page, update, responses } = await setup();
    page.editEmployment();
    page.editPersonal();
    page.employmentForm.controls.designation.setValue('Engineer');
    page.personalForm.controls.city.setValue('Own City');
    const employment = page.saveCard('employment');
    expect(update).toHaveBeenNthCalledWith(1, 'a', { designation: 'Engineer' });
    const personal = page.saveCard('personal');
    expect(update.mock.calls[1][1]).not.toHaveProperty('designation');
    responses[1].next({
      ...original,
      city: 'Own City',
      addressLine1: '',
      addressLine2: '',
      state: '',
      zipCode: '',
      country: '',
    });
    responses[1].complete();
    await personal;
    responses[0].next({ ...original, designation: 'Engineer' });
    responses[0].complete();
    await employment;
    expect(page.employee()?.city).toBe('Own City');
    expect(page.employee()?.designation).toBe('Engineer');
    expect(page.personalEditing()).toBe(false);
    expect(page.employmentEditing()).toBe(false);
  });
  it('keeps failed data editable, blocks duplicate submits and validates existing personal fields', async () => {
    const { page, update, responses } = await setup();
    page.editEmployment();
    page.employmentForm.controls.designation.setValue('Engineer');
    const request = page.saveCard('employment');
    await page.saveCard('employment');
    expect(update).toHaveBeenCalledTimes(1);
    expect(page.canLeave()).toBe(false);
    responses[0].error(new HttpErrorResponse({ status: 409, error: { message: 'Try again' } }));
    await request;
    expect(page.employmentEditing()).toBe(true);
    expect(page.employmentForm.controls.designation.value).toBe('Engineer');
    expect(page.employmentError()).toBe('Try again');
    page.editPersonal();
    page.personalForm.controls.email.setValue('bad');
    page.personalForm.controls.dateOfBirth.setValue('2026-02-30');
    await page.saveCard('personal');
    expect(update).toHaveBeenCalledTimes(1);
    expect(page.personalForm.controls.email.invalid).toBe(true);
    expect(page.personalForm.controls.dateOfBirth.invalid).toBe(true);
    page.personalForm.controls.zipCode.setValue('x'.repeat(33));
    expect(page.personalForm.controls.zipCode.invalid).toBe(true);
  });
  it('protects route departure, browser refresh and card cancellation without losing the other draft', async () => {
    const { page } = await setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    page.editEmployment();
    page.editPersonal();
    page.employmentForm.controls.designation.setValue('Draft');
    page.personalForm.controls.city.setValue('Draft City');
    expect(page.canLeave()).toBe(false);
    const event = new Event('beforeunload', { cancelable: true });
    page.beforeUnload(event as BeforeUnloadEvent);
    expect(event.defaultPrevented).toBe(true);
    page.cancelCard('employment');
    expect(page.employmentEditing()).toBe(true);
    confirm.mockReturnValue(true);
    page.cancelCard('employment');
    expect(page.employmentEditing()).toBe(false);
    expect(page.personalForm.controls.city.value).toBe('Draft City');
    expect(page.canLeave()).toBe(true);
    confirm.mockRestore();
  });
});
