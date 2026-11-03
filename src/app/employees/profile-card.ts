import { Component, contentChild, input } from '@angular/core';
import { PsCard, PsCardTitle, PsCardActions, PsCardFooter } from '../shared/ui';

// Compatibility adapter: existing profile consumers use the single shared Card.
@Component({
  selector: 'app-profile-card',
  imports: [PsCard, PsCardTitle, PsCardActions, PsCardFooter],
  template: `<ps-card role="region" [attr.aria-label]="heading()">
    <span cardTitle>{{ heading() }}</span>
    <div cardActions><ng-content select="[card-actions]" /></div>
    <ng-content />
    @if (footer()) {
      <div cardFooter><ng-content select="[cardFooter]" /></div>
    }
  </ps-card>`,
  styles: [':host{display:flex;min-width:0}ps-card{flex:1;min-width:0}'],
})
export class ProfileCard {
  readonly heading = input.required<string>();
  readonly compact = input(false);
  readonly footer = contentChild(PsCardFooter);
}
