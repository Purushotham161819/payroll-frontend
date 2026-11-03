import { booleanAttribute, Component, Directive, input } from '@angular/core';

@Directive({ selector: 'a[psNavItem],button[psNavItem]', standalone: true,
  host: { '[class.ps-nav-item]': 'true', '[class.ps-nav-active]': 'active()', '[attr.aria-current]': 'active() ? "page" : null' },
})
export class PsNavItem { readonly active = input(false, { transform: booleanAttribute }); }

@Component({
  selector: 'ps-sidebar-nav', standalone: true,
  template: '<ng-content select="[navBrand]" /><nav [attr.aria-label]="label()"><ng-content /></nav>',
  styleUrl: './ps-sidebar-nav.scss',
})
export class PsSidebarNav { readonly label = input('Main navigation'); }
