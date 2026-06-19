import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth-service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected readonly companyName = environment.companyName;
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  protected readonly form = this.fb.nonNullable.group({
    userName: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { userName, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');

    this.auth
      .login({ username: userName, password, companyID: environment.companyCode })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 0) {
            this.fail('Unable to reach the server. Please try again.');
          } else if (err.status === 401 || err.status === 400) {
            this.fail('Invalid username or password.');
          } else {
            this.fail('Sign in failed. Please try again.');
          }
        },
      });
  }

  private fail(message: string) {
    this.loading.set(false);
    this.error.set(message);
  }
}
