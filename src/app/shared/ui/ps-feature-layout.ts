import { Component } from '@angular/core';
/** Shared responsive spacing for form/card compositions; opt-in only. */
@Component({
  selector: 'ps-feature-layout',
  template: '<ng-content />',
  styleUrl: './ps-feature-layout.scss',
})
export class PsFeatureLayout {}
