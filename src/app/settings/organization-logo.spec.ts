import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OrganizationSettings } from './organization-settings';
import { NotificationService } from '../shared/notification.service';
const url = 'http://localhost:3000/settings/organization-profile';
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XkAAAAASUVORK5CYII=';
describe('Organization logo controls', () => {
 afterEach(() => TestBed.inject(HttpTestingController).verify());
 async function setup(logo: string | null = png) {
  TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]});
  const fixture = TestBed.createComponent(OrganizationSettings), http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne(url).flush({organizationName:'A',addressVersion:0,address:{},logo});
  await fixture.whenStable(); fixture.detectChanges();
  return {fixture,http,page:fixture.componentInstance};
 }
 it('previews the saved logo, removes it and retains removal after reload', async () => {
  const {fixture,http,page} = await setup();
  expect(fixture.nativeElement.querySelector('img').src).toBe(png);
  const remove = page.removeLogo();
  const request = http.expectOne(url+'/logo');
  expect(request.request.body).toEqual({dataUrl:''});
  request.flush({logo:null}); await remove; fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('img')).toBeNull();
  const reload = page.load(); http.expectOne(url).flush({organizationName:'A',addressVersion:0,address:{},logo:null});
  await reload; fixture.detectChanges(); expect(fixture.nativeElement.querySelector('img')).toBeNull();
 });
 it('rejects unsupported and oversized files before upload', async () => {
  const {page,http} = await setup();
  for (const file of [new File(['abc'],'a.svg',{type:'image/svg+xml'}),new File([new Uint8Array(2097153)],'big.png',{type:'image/png'})]) {
   await page.selectLogo({target:{files:[file],value:'file'}} as any);
   expect(TestBed.inject(NotificationService).current()?.kind).toBe('warning');
   http.expectNone(url+'/logo');
  }
 });
 it('uploads and replaces a logo, showing a preview while saving', async () => {
  const {page,http,fixture} = await setup();
  for (let i=0;i<2;i++) {
   const save = page.selectLogo({target:{files:[new File(['png'],'logo.png',{type:'image/png'})],value:'file'}} as any);
   await vi.waitFor(() => expect(page.logoPreview()).toBeTruthy());
   fixture.detectChanges(); expect(fixture.nativeElement.querySelector('img')).not.toBeNull();
   const request = http.expectOne(url+'/logo'); expect(request.request.method).toBe('PATCH');
   request.flush({logo:png}); await save;
   expect(page.organization()?.logo).toBe(png);
  }
 });
 it('opens the hidden selector from Browse Files and hides the drop zone for saved logos', async () => {
  const {fixture} = await setup(null);
  const input = fixture.nativeElement.querySelector('input[type=file]') as HTMLInputElement;
  expect(input.hidden).toBe(true);
  expect(fixture.nativeElement.querySelector('.logo-formats').textContent).toContain('PNG or JPG/JPEG ' + String.fromCharCode(183) + ' Maximum 2 MB ' + String.fromCharCode(183) + ' 16 megapixels');
  const click = vi.spyOn(input, 'click');
  const browse = [...fixture.nativeElement.querySelectorAll('button')].find((b:any) => b.textContent.trim() === 'Browse Files') as HTMLButtonElement;
  browse.click(); expect(click).toHaveBeenCalledOnce();
  expect(fixture.nativeElement.querySelector('.logo-drop-zone')).not.toBeNull();
 });
 it('highlights file drags and sends dropped files through existing upload validation and API', async () => {
  const {fixture,page,http} = await setup(null);
  const event = {preventDefault:vi.fn(),dataTransfer:{types:['Files'],files:[new File(['png'],'company.png',{type:'image/png'})]}} as any;
  page.logoDragEnter(event); fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.logo-drop-zone').classList.contains('dragging')).toBe(true);
  page.logoDragLeave(event); expect(page.logoDragging()).toBe(false);
  const save = page.dropLogo(event);
  await vi.waitFor(() => expect(page.logoPreview()).toBeTruthy()); fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('company.png');
  expect(fixture.nativeElement.textContent).toContain('1 KB');
  expect(fixture.nativeElement.querySelector('.logo-drop-zone')).toBeNull();
  expect(fixture.nativeElement.querySelector('[aria-label="Replace organization logo"]').disabled).toBe(true);
  http.expectOne(url+'/logo').flush({logo:page.logoPreview()}); await save; fixture.detectChanges();
  expect(page.logoDragging()).toBe(false);
  expect(fixture.nativeElement.querySelector('[aria-label="Replace organization logo"]').disabled).toBe(false);
 });
 it('keeps the saved preview and metadata if replacement fails and rejects invalid drops', async () => {
  const {page,http} = await setup();
  await page.dropLogo({preventDefault:vi.fn(),dataTransfer:{files:[new File(['bad'],'bad.svg',{type:'image/svg+xml'})]}} as any);
  http.expectNone(url+'/logo');
  const save = page.selectLogo({target:{files:[new File(['png'],'new.png',{type:'image/png'})],value:''}} as any);
  await vi.waitFor(() => expect(page.logoPreview()).toBeTruthy());
  http.expectOne(url+'/logo').flush({message:'Invalid image'},{status:400,statusText:'Bad Request'}); await save;
  expect(page.organization()?.logo).toBe(png);
  expect(page.logoFile()).toBeNull();
 });

});
