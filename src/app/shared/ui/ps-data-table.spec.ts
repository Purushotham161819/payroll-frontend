import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PsDataTable } from './ps-data-table';
import { PsDatePipe } from './pipes/ps-date.pipe';
import { PsInrPipe } from './pipes/ps-inr.pipe';
import { PsStatusBadge } from './ps-status-badge';

@Component({ changeDetection: ChangeDetectionStrategy.Default, imports: [PsDataTable, PsInrPipe, PsDatePipe, PsStatusBadge], template: '<ps-data-table label="Employee payroll" [loading]="loading" [empty]="empty" [naturalWidth]="naturalWidth"><div tableToolbar>Filters supplied by caller</div><table class="ps-table"><caption>Payroll</caption><thead><tr><th scope="col">Amount</th><th scope="col">Date</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody><tr><td class="num">{{75000 | psInr}}</td><td>{{"2026-09-15" | psDate}}</td><td><ps-status-badge status="Active" /></td><td class="act"><button (click)="calls = calls + 1">Details</button></td></tr></tbody></table><div tableFooter>Existing pager goes here</div></ps-data-table>' })
class Host { naturalWidth = false; loading = false; empty = false; calls = 0; }
describe('PsDataTable', () => {
  it('keeps caller semantics, formatting pipes, statuses, actions and optional footer', () => {
    const f = TestBed.createComponent(Host); f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.nativeElement.querySelector('caption').textContent).toBe('Payroll');
    expect(f.nativeElement.querySelectorAll('th[scope=col]').length).toBe(4);
    expect(f.nativeElement.querySelector('.num').textContent).toBe('₹75,000');
    expect(f.nativeElement.textContent).toContain('15 Sep 2026');
    expect(f.nativeElement.querySelector('[role=region]').tabIndex).toBe(0);
    const component = f.debugElement.query(By.directive(PsDataTable)).componentInstance as PsDataTable;
    expect(component.nativeElement).toBe(f.nativeElement.querySelector('.scroll'));
    expect(f.nativeElement.querySelector('ps-data-table').classList.contains('natural-width')).toBe(false);
    f.componentInstance.naturalWidth = true; f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.nativeElement.querySelector('ps-data-table').classList.contains('natural-width')).toBe(true);
    component.nativeElement.scrollLeft = 80;
    expect(f.nativeElement.querySelector('.scroll').scrollLeft).toBe(80);
    f.nativeElement.querySelector('button').click(); expect(f.componentInstance.calls).toBe(1);
    expect(f.nativeElement.querySelectorAll('input,select').length).toBe(0);
  });
  it('shows loading/empty state without fetching, sorting or destroying caller table', () => {
    const f = TestBed.createComponent(Host); f.changeDetectorRef.markForCheck(); f.detectChanges(); const table = f.nativeElement.querySelector('table');
    f.componentInstance.loading = true; f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.nativeElement.querySelector('[role=status]').textContent).toContain('Loading');
    expect(f.nativeElement.querySelectorAll('.skeleton-row').length).toBe(8);
    expect(f.nativeElement.querySelector('.scroll').hidden).toBe(true);
    f.componentInstance.loading = false; f.componentInstance.empty = true; f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.nativeElement.querySelector('[role=status]').textContent).toContain('No records');
    f.componentInstance.empty = false; f.changeDetectorRef.markForCheck(); f.detectChanges(); expect(f.nativeElement.querySelector('table')).toBe(table);
  });
});
