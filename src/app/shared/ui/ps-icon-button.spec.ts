import { TestBed } from '@angular/core/testing';
import { ACTION_ICONS, PsAction } from './action-icons';
import { PsIconButton } from './ps-icon-button';

describe('PsIconButton', () => {
  it.each(Object.keys(ACTION_ICONS) as PsAction[])('renders one approved %s glyph with accessible button label', async action => {
    await TestBed.configureTestingModule({ imports: [PsIconButton] }).compileComponents();
    const f = TestBed.createComponent(PsIconButton);
    f.componentRef.setInput('action', action); f.componentRef.setInput('label', action); f.changeDetectorRef.markForCheck(); f.detectChanges();
    const button = f.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.type).toBe('button'); expect(button.getAttribute('aria-label')).toBe(action);
    expect(button.querySelector('svg')?.children.length).toBe(ACTION_ICONS[action].length);
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); f.changeDetectorRef.markForCheck(); f.detectChanges();
    const tip = document.querySelector('[role=tooltip]');
    expect(tip?.textContent).toBe(action);
    expect(button.getAttribute('aria-describedby')).toContain(tip?.id);
    f.destroy(); expect(document.querySelector('[role=tooltip]')).toBeNull();
  });
  it('supports small rows and focusable disabled-tooltip wrapper without activation', async () => {
    const f = TestBed.createComponent(PsIconButton);
    f.componentRef.setInput('action', 'edit'); f.componentRef.setInput('label', 'Edit');
    f.componentRef.setInput('size', 'sm'); f.componentRef.setInput('disabled', true); f.changeDetectorRef.markForCheck(); f.detectChanges();
    const button = f.nativeElement.querySelector('button') as HTMLButtonElement;
    const clicked = vi.fn(); button.addEventListener('click', clicked); button.click();
    expect(clicked).not.toHaveBeenCalled(); expect(button.classList.contains('sm')).toBe(true);
    const wrapper = f.nativeElement.querySelector('span') as HTMLElement;
    expect(wrapper.tabIndex).toBe(0); wrapper.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(document.querySelector('[role=tooltip]')?.textContent).toBe('Edit');
  });
});
