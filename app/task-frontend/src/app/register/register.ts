import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  template: `
    <div class="register-container">
      <!-- Decorative Background -->
      <div class="bg-shape"></div>

      <mat-card class="register-card">
        
        <!-- Loading Indicator -->
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
            <h1>Create Account</h1>
            <p>Join us to start managing your tasks</p>
          </div>
        </div>

        <div class="card-body">
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
            
            <!-- Name Field -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Full Name</mat-label>
              <input matInput type="text" formControlName="name" placeholder="John Doe">
              <mat-icon matPrefix class="text-secondary">person_outline</mat-icon>
              @if (registerForm.get('name')?.hasError('required') && registerForm.get('name')?.touched) {
                <mat-error>Name is required</mat-error>
              }
            </mat-form-field>

            <!-- Email Field -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Email Address</mat-label>
              <input matInput type="email" formControlName="email" placeholder="you@company.com">
              <mat-icon matPrefix class="text-secondary">mail_outline</mat-icon>
              @if (registerForm.get('email')?.hasError('email') && registerForm.get('email')?.touched) {
                <mat-error>Please enter a valid email address</mat-error>
              }
              @if (registerForm.get('email')?.hasError('required') && registerForm.get('email')?.touched) {
                <mat-error>Email is required</mat-error>
              }
            </mat-form-field>

            <!-- Password Field -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Password</mat-label>
              <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password">
              <mat-icon matPrefix class="text-secondary">lock_outline</mat-icon>
              <button type="button" mat-icon-button matSuffix (click)="togglePasswordVisibility()">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (registerForm.get('password')?.hasError('required') && registerForm.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
              @if (registerForm.get('password')?.hasError('minlength') && registerForm.get('password')?.touched) {
                <mat-error>Password must be at least 6 characters</mat-error>
              }
            </mat-form-field>

            <!-- Global Error Banner -->
            @if (errorMessage()) {
              <div class="error-banner" role="alert">
                <mat-icon>error_outline</mat-icon>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <!-- Submit Button -->
            <button mat-flat-button color="primary" class="submit-btn" type="submit" 
                    [disabled]="registerForm.invalid || isLoading()">
              <ng-container *ngIf="isLoading(); else notLoading">
                <span>Creating account...</span>
              </ng-container>
              <ng-template #notLoading>
                <span>Sign Up</span>
                <mat-icon iconPositionEnd>person_add</mat-icon>
              </ng-template>
            </button>
          </form>

          <div class="card-footer">
            <p>Already have an account? <a routerLink="/login">Sign in</a></p>
          </div>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    /* Layout & Background (Matching Login) */
    .register-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background-color: #f1f5f9;
      overflow: hidden;
      font-family: 'Roboto', sans-serif;
    }

    .bg-shape {
      position: absolute;
      bottom: -10%;
      left: -5%; /* Positioned differently than login for variety */
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, rgba(255,255,255,0) 70%);
      border-radius: 50%;
      z-index: 0;
      animation: float 10s infinite ease-in-out;
    }

    /* Card Styling */
    .register-card {
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

    .logo-container { margin-bottom: 16px; }

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
    .card-body { padding: 24px 32px 40px; }

    .register-form { display: flex; flex-direction: column; gap: 16px; }

    .w-full { width: 100%; }
    .text-secondary { color: #94a3b8; margin-right: 8px; }

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
      padding: 24px 0;
      font-size: 16px;
      letter-spacing: 0.5px;
      border-radius: 8px;
      transition: transform 0.1s;
    }
    .submit-btn:active:not([disabled]) { transform: scale(0.98); }

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
      transition: color 0.2s;
    }
    .card-footer a:hover { color: #4338ca; }

    /* Animations */
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(-20px, -20px); }
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  errorMessage = signal('');
  hidePassword = signal(true);

  // Matches the fields required by your cURL command
  registerForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  togglePasswordVisibility() {
    this.hidePassword.update(value => !value);
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.registerForm.disable();

    const payload = this.registerForm.getRawValue();

    // Matches your requested POST endpoint and payload structure
    this.http.post<any>('http://localhost:3000/auth/register', payload)
      .subscribe({
        next: () => {
          this.snackBar.open('Account created! Please sign in.', 'Close', { 
            duration: 5000,
            panelClass: ['success-snackbar'] 
          });
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.registerForm.enable();
          // Extract message from backend or use default
          const msg = err.error?.message || 'Registration failed. Please try again.';
          this.errorMessage.set(msg);
        },
        complete: () => {
          this.isLoading.set(false);
          this.registerForm.enable();
        }
      });
  }
}
