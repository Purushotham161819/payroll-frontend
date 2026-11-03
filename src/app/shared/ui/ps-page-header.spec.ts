import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PsPageHeader } from './ps-page-header';

@Component({ changeDetection: ChangeDetectionStrategy.Default, imports: [PsPageHeader], template: '<ps-page-header title="Employees" eyebrow="People Management" subtitle="Directory"><a breadcrumbs href="/">Home</a><div pageActions><button (click)="calls = calls + 1">Add Employee</button></div></ps-page-header>' })
class Host { calls = 0; }
describe('PsPageHeader', () => {
  it('renders hierarchy and projects unchanged breadcrumb/actions', () => {
    const f = TestBed.createComponent(Host); f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.nativeElement.querySelector('h1').textContent).toBe('Employees');
    expect(f.nativeElement.querySelector('.eyebrow').textContent).toBe('People Management');
    expect(f.nativeElement.querySelector('.subtitle').textContent).toBe('Directory');
    expect(f.nativeElement.querySelector('a').getAttribute('href')).toBe('/');
    f.nativeElement.querySelector('button').click(); expect(f.componentInstance.calls).toBe(1);
  });
  it('omits absent optional labels without creating actions or routes', () => {
    const f = TestBed.createComponent(PsPageHeader); f.componentRef.setInput('title', 'Details'); f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.nativeElement.querySelector('.eyebrow')).toBeNull();
    expect(f.nativeElement.querySelector('.subtitle')).toBeNull();
    expect(f.nativeElement.querySelector('button,a')).toBeNull();
  });
});
