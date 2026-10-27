import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { App } from './app';
describe('Employee workspace', () => {
  it('loads employees and displays the empty state', async () => {
    await TestBed.configureTestingModule({ imports: [App], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:3000/employees').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No employees found.');
    expect(fixture.nativeElement.textContent).toContain('Generator');
    http.verify();
  });
});