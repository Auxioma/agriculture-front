import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  RegisterClientRequest,
  RegisterProducerRequest,
  AuthResponse,
  CurrentUser,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from './auth.models';
import { tap, Observable, of, shareReplay, catchError, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiURL;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _currentUser = signal<CurrentUser | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login(payload: LoginRequest) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, payload)
      .pipe(tap((res) => this.storeToken(res.token)));
  }

  registerClient(payload: RegisterClientRequest) {
    return this.http.post<{ id: string }>(`${this.apiUrl}/auth/register-client`, payload);
  }

  registerProducer(payload: RegisterProducerRequest) {
    return this.http.post<{ id: string }>(`${this.apiUrl}/auth/register-producer`, payload);
  }

  forgotPassword(payload: ForgotPasswordRequest) {
    return this.http.post<void>(`${this.apiUrl}/auth/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordRequest) {
    return this.http.post<void>(`${this.apiUrl}/auth/reset-password`, payload);
  }

  fetchCurrentUser() {
    return this.http
      .get<CurrentUser>(`${this.apiUrl}/me`)
      .pipe(tap((user) => this._currentUser.set(user)));
  }

  logout(redirect = true) {
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe();
    this.clearToken();
    this._currentUser.set(null);
    if (redirect) {
      this.router.navigate(['/auth/login']);
    }
  }

  private storeToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem('access_token', token);
    }
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('access_token') : null;
  }

  private clearToken(): void {
    if (this.isBrowser) {
      localStorage.removeItem('access_token');
    }
  }

  private authCheck$: Observable<void> | null = null;

  initAuthState(): Observable<void> {
    if (!this.authCheck$) {
      const token = this.getToken();

      this.authCheck$ = !token
        ? of(void 0)
        : this.fetchCurrentUser().pipe(
            map(() => void 0),
            catchError(() => {
              this.logout(false);
              return of(void 0);
            }),
            shareReplay(1),
          );
    }
    return this.authCheck$;
  }
}
