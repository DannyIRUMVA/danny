import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  template: `
    <div class="login-container">
      <div class="bg-shape"></div>

      <mat-card class="login-card">
        
        @if (isLoading()) {
          <mat-progress-bar mode="indeterminate" class="absolute-loader"></mat-progress-bar>
        }

        <div class="card-header">
          <div class="logo-container">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="8" fill="#4F46E5" />
              <path d="M7 13l3 3 7-8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="header-text">
            <h1>Welcome Back</h1>
            <p>Enter your details to access your workspace</p>
          </div>
        </div>

        <div class="card-body">
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
            
            
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Email Address</mat-label>
              <input matInput type="email" formControlName="email" placeholder="you@company.com">
              <mat-icon matPrefix class="text-secondary">mail_outline</mat-icon>
              @if (loginForm.get('email')?.hasError('email') && loginForm.get('email')?.touched) {
                <mat-error>Please enter a valid email address</mat-error>
              }
              @if (loginForm.get('email')?.hasError('required') && loginForm.get('email')?.touched) {
                <mat-error>Email is required</mat-error>
              }
            </mat-form-field>

            
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Password</mat-label>
              <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password">
              <mat-icon matPrefix class="text-secondary">lock_outline</mat-icon>
              <button type="button" mat-icon-button matSuffix (click)="togglePasswordVisibility()">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>

            
            <div class="form-options">
              <mat-checkbox color="primary" formControlName="rememberMe">Remember me</mat-checkbox>
              <a class="forgot-link" href="#">Forgot password?</a>
            </div>

            
            @if (errorMessage()) {
              <div class="error-banner" role="alert">
                <mat-icon>error_outline</mat-icon>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            
            <button mat-flat-button color="primary" class="submit-btn" type="submit"
                    [disabled]="loginForm.invalid || isLoading()">
              <span *ngIf="isLoading()">Signing in...</span>
              <span *ngIf="!isLoading()">Sign In</span>
              <mat-icon *ngIf="!isLoading()" iconPositionEnd>arrow_forward</mat-icon>
            </button>
          </form>

          <div class="card-footer">
            <p>Don't have an account? <a routerLink="/register">Create account</a></p>
          </div>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    /* Layout & Background */
    .login-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background-color: #f1f5f9; /* Slate 100 */
      overflow: hidden;
      font-family: 'Roboto', sans-serif; /* Ensure you have Roboto loaded */
    }

    /* Abstract background shape */
    .bg-shape {
      position: absolute;
      top: -10%;
      right: -5%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, rgba(255,255,255,0) 70%);
      border-radius: 50%;
      z-index: 0;
      animation: float 10s infinite ease-in-out;
    }

    /* Card Styling */
    .login-card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 440px;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      overflow: hidden;
      animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .absolute-loader {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 10;
    }

    /* Header */
    .card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 40px 32px 10px;
      background: #fff;
    }

    .logo-container {
      margin-bottom: 16px;
    }

    .header-text h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 8px;
    }

    .header-text p {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }

    /* Body & Form */
    .card-body {
      padding: 24px 32px 40px;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .w-full {
      width: 100%;
    }

    .text-secondary {
      color: #94a3b8;
      margin-right: 8px;
    }

    /* Options Row */
    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: -8px;
      font-size: 14px;
    }

    .forgot-link {
      color: #4F46E5;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }
    .forgot-link:hover {
      color: #4338ca;
      text-decoration: underline;
    }

    /* Error Banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background-color: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: 8px;
      color: #ef4444;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    /* Submit Button */
    .submit-btn {
      margin-top: 8px;
      padding: 24px 0; /* Makes button taller */
      font-size: 16px;
      letter-spacing: 0.5px;
      border-radius: 8px;
      transition: transform 0.1s;
    }
    
    .submit-btn:active:not([disabled]) {
      transform: scale(0.98);
    }

    /* Footer */
    .card-footer {
      margin-top: 24px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
    }
    .card-footer a {
      color: #4F46E5;
      text-decoration: none;
      font-weight: 600;
    }

    /* Animations */
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(20px, -20px); }
    }
    
    /* Material Override adjustments */
    :host ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      /* Keep standard spacing for error messages, adjust if necessary */
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  errorMessage = signal('');
  hidePassword = signal(true);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  togglePasswordVisibility() {
    this.hidePassword.update(value => !value);
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue();

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.loginForm.disable();

    this.http.post<any>('http://localhost:3000/auth/login', { email, password })
      .subscribe({
        next: (res) => {
          localStorage.setItem('token', res.token);
          this.snackBar.open('Login Successful!', 'Close', { duration: 3000 });
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.loginForm.enable();
          const msg = err.error?.message || 'Invalid credentials. Please try again.';
          this.errorMessage.set(msg);
        },
        complete: () => {
          this.isLoading.set(false);
          this.loginForm.enable();
        }
      });
  }
}
