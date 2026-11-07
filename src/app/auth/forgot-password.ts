import { completionSignal } from '../shared/notification.service';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { PRODUCT_BRAND } from '../branding';
import { PsButton, PsPageHeader, PsFormField, PsFieldControl } from '../shared/ui';
@Component({selector:'app-forgot-password',imports:[FormsModule,RouterLink,PsButton,PsPageHeader,PsFormField,PsFieldControl],styleUrl:'./auth.css',template:
`<section class="auth-page"><form class="auth-card" #form="ngForm" (ngSubmit)="submit()" [attr.aria-busy]="busy()">
<div class="brand"><span class="brand-mark" aria-hidden="true">P</span><p>{{brand}}</p></div>
<ps-page-header title="Forgot password" subtitle="Request a secure password reset link." />
<ps-form-field label="Email" errorText="Enter a valid email address."><input psFieldControl name="email" type="email" autocomplete="email" [(ngModel)]="email" required email maxlength="254" [disabled]="busy()" /></ps-form-field>

@if(error()){<p class="notice error" role="alert">{{error()}}</p>}
<button psButton class="sign-in" type="submit" [disabled]="busy() || form.invalid">{{busy() ? 'Requesting...' : 'Request Reset Link'}}</button>
<p class="help"><a psButton variant="ghost" routerLink="/login">Back to Sign In</a></p></form></section>`})
export class ForgotPassword {
 readonly brand=PRODUCT_BRAND;private readonly http=inject(HttpClient);email='';readonly busy=signal(false);readonly message=completionSignal();readonly error=signal('');
 async submit(){if(this.busy())return;this.busy.set(true);this.error.set('');this.message.set('');
 try{const result=await firstValueFrom(this.http.post<{message:string}>(environment.apiUrl+'/auth/forgot-password',{email:this.email.trim().toLowerCase()}));this.message.set(result.message);}
 catch(e){this.error.set(e instanceof HttpErrorResponse && e.status===429?'Too many attempts. Please try again later.':'Unable to request a reset. Please try again.');}finally{this.busy.set(false);}}
}
