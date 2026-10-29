import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Organization } from './organization';
import { PRODUCT_BRAND } from './branding';
import { WorkspaceLayout } from './app';
import { Auth } from './auth/auth';

describe('Organization identity and product branding',()=>{
 let http:HttpTestingController;
 const logout=vi.fn().mockResolvedValue(undefined);
 beforeEach(()=>{
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([]),{provide:Auth,useValue:{user:signal({id:'admin',role:'admin'}),logout}}]});
  http=TestBed.inject(HttpTestingController);logout.mockClear();
 });
 afterEach(()=>http.verify());
 it('uses the default identity then loads customer configuration dynamically',async()=>{
  const organization=TestBed.inject(Organization);expect(organization.displayName()).toBe(PRODUCT_BRAND);
  const first=organization.load();http.expectOne('http://localhost:3000/settings/organization').flush({displayName:'Example Customer'});await first;expect(organization.displayName()).toBe('Example Customer');
  const second=organization.load();http.expectOne('http://localhost:3000/settings/organization').flush({displayName:'Changed Customer'});await second;expect(organization.displayName()).toBe('Changed Customer');
 });
 it('keeps a safe product fallback when configuration is unavailable',async()=>{
  const organization=TestBed.inject(Organization),result=organization.load();
  http.expectOne('http://localhost:3000/settings/organization').flush({}, {status:503,statusText:'Unavailable'});await result;expect(organization.displayName()).toBe(PRODUCT_BRAND);
 });
 it('shows the organization beside one sign-out control and preserves logout',async()=>{
  const fixture=TestBed.createComponent(WorkspaceLayout);fixture.detectChanges();
  const longName='A long customer organization name '.repeat(10);
  http.expectOne('http://localhost:3000/settings/organization').flush({displayName:longName.trim()});await fixture.whenStable();fixture.detectChanges();
  const header=fixture.nativeElement.querySelector('.topbar');
  expect(header.querySelector('.organization-name').textContent).toBe(longName.trim());expect(header.querySelector('.organization-name').title).toBe(longName.trim());
  expect(header.querySelectorAll('button').length).toBe(1);header.querySelector('button').click();await fixture.whenStable();expect(logout).toHaveBeenCalledTimes(1);
  expect(fixture.nativeElement.querySelector('.brand').getAttribute('aria-label')).toBe(PRODUCT_BRAND+' home');
 });
});

it('keeps platform navigation and header labels separate from the previous customer',()=>{
 TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([]),{provide:Auth,useValue:{user:signal({id:'s',role:'super_admin'}),logout:vi.fn()}}]});
 const http=TestBed.inject(HttpTestingController);TestBed.inject(Organization).displayName.set('Previous customer');
 const fixture=TestBed.createComponent(WorkspaceLayout);fixture.detectChanges();
 const header=fixture.nativeElement.querySelector('.organization-name');expect(header.textContent).toBe(PRODUCT_BRAND);expect(header.title).toBe(PRODUCT_BRAND);
 expect(fixture.nativeElement.querySelector('a[href="/super-admin"]')).toBeTruthy();expect(fixture.nativeElement.querySelector('a[href="/settings"]')).toBeNull();http.verify();
});
