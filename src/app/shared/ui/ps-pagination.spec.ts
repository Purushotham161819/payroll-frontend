import { TestBed } from '@angular/core/testing';
import { PsPagination } from './ps-pagination';
describe('Reusable pagination', () => {
  function setup(total = 125) {
    const fixture = TestBed.createComponent(PsPagination);
    fixture.componentRef.setInput('totalRecords', total);
    fixture.componentRef.setInput('recordLabel', 'items');
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance };
  }
  it('shows ranges, total and selected page and disables first/last navigation', () => {
    const { fixture, page } = setup();
    expect(fixture.nativeElement.textContent).toContain('Showing 1');
    expect(fixture.nativeElement.textContent).toContain('of 125 items');
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[aria-current=page]').textContent.trim()).toBe('1');
    fixture.componentRef.setInput('currentPage', 13);
    fixture.detectChanges();
    expect(page.first()).toBe(121);
    expect(page.last()).toBe(125);
    expect([...fixture.nativeElement.querySelectorAll('button')].at(-1).disabled).toBe(true);
  });
  it('emits independent page and size changes without fetching records', () => {
    const { page, fixture } = setup();
    const change = vi.fn(),
      resize = vi.fn();
    page.pageChange.subscribe(change);
    page.pageSizeChange.subscribe(resize);
    page.go(2);
    expect(change).toHaveBeenCalledWith(2);
    page.resize('25');
    expect(resize).toHaveBeenCalledWith(25);
    page.go('...');
    page.go(0);
    expect(change).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    page.go(3);
    page.resize('50');
    expect(change).toHaveBeenCalledTimes(1);
    expect(resize).toHaveBeenCalledTimes(1);
  });
  it('handles empty datasets and configurable page sizes', () => {
    const { fixture, page } = setup(0);
    fixture.componentRef.setInput('pageSizeOptions', [5, 20]);
    fixture.componentRef.setInput('pageSize', 5);
    fixture.detectChanges();
    expect(page.first()).toBe(0);
    expect(page.last()).toBe(0);
    expect(page.pageCount()).toBe(1);
    expect(page.sizes().map((v) => v.value)).toEqual(['5', '20']);
  });
});
