import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PsNavItem, PsSidebarNav } from './ps-sidebar-nav';
import { PsIcon } from './ps-icon';

@Component({ changeDetection: ChangeDetectionStrategy.Default, imports: [PsSidebarNav, PsNavItem, PsIcon], template: '<ps-sidebar-nav label="Workspace"><div navBrand>PayStream</div><div navGroup><span navGroupLabel>People</span><a psNavItem href="/" [active]="active"><ps-icon action="view" /><span navLabel>Employees</span></a><button psNavItem [disabled]="true" (click)="calls = calls + 1">Unavailable</button></div></ps-sidebar-nav>' })
class Host { active = true; calls = 0; }
describe('PsSidebarNav', () => {
  it('projects only caller-provided links/groups and exposes active state accessibly', () => {
    const f = TestBed.createComponent(Host); f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.nativeElement.querySelector('nav').getAttribute('aria-label')).toBe('Workspace');
    const link = f.nativeElement.querySelector('a'); expect(link.getAttribute('href')).toBe('/');
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(f.nativeElement.querySelectorAll('a').length).toBe(1);
    f.componentInstance.active = false; f.changeDetectorRef.markForCheck(); f.detectChanges(); expect(link.hasAttribute('aria-current')).toBe(false);
  });
  it('preserves native disabled controls without permissions/menu logic', () => {
    const f = TestBed.createComponent(Host); f.changeDetectorRef.markForCheck(); f.detectChanges();
    f.nativeElement.querySelector('button').click(); expect(f.componentInstance.calls).toBe(0);
    expect(f.nativeElement.querySelector('[navBrand]').textContent).toBe('PayStream');
  });
});
