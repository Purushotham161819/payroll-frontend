import { Component, input } from '@angular/core';
@Component({
  selector: 'app-profile-card',
  template: `<section [attr.aria-label]="heading()">
    <h2>{{ heading() }}</h2>
    <ng-content />
  </section>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        height: 100%;
        background: white;
        border: 1px solid #dce6df;
        border-radius: 12px;
        box-shadow: 0 2px 8px #1c3b2910;
      }
      section {
        padding: 22px;
      }
      h2 {
        font-size: 15px;
        font-weight: 650;
        margin: 0 0 20px;
        color: #294d3b;
      }
    `,
  ],
})
export class ProfileCard {
  readonly heading = input.required<string>();
}
