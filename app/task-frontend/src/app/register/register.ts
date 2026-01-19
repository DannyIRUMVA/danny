import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="register-root">
      <mat-card class="register-card">
        <h2>Create account</h2>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
          <mat-form-field appearance="outline">
            <mat-label>Full name</mat-label>
            <input matInput formControlName="name" placeholder="Jane Doe" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" placeholder="you@domain.com" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Confirm Password</mat-label>
            <input matInput type="password" formControlName="confirmPassword" />
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" [disabled]="registerForm.invalid || isLoading()">Create account</button>
        </form>

        <p class="small">Already have an account? <a routerLink="/login">Sign in</a></p>
      </mat-card>
    </div>
  `,
  styles: [`.register-root { display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f8fafc }
  .register-card{ width:420px; padding:24px }
  .register-form{ display:flex; flex-direction:column; gap:12px }`]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);

  registerForm = this.fb.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  async onSubmit() {
    if (this.registerForm.invalid) return this.registerForm.markAllAsTouched();
    const { name, email, password, confirmPassword } = this.registerForm.getRawValue();
    if (password !== confirmPassword) return this.snackBar.open('Passwords do not match', 'Close', { duration: 3000 });

    this.isLoading.set(true);
    try {
      await this.http.post('http://localhost:3000/auth/register', { name, email, password }).toPromise();
      // Auto-login
      const res: any = await this.http.post('http://localhost:3000/auth/login', { email, password }).toPromise();
      localStorage.setItem('token', res.token);
      this.snackBar.open('Account created', 'Close', { duration: 2500 });
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.snackBar.open(err?.error?.message || 'Failed to create account', 'Close', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }
}

