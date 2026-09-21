import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  RegisterClientRequest,
  RegisterProducerRequest,
  AuthResponse,
  CurrentUser,
} from './auth.models';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiURL;

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

  fetchCurrentUser() {
    return this.http
      .get<CurrentUser>(`${this.apiUrl}/me`)
      .pipe(tap((user) => this._currentUser.set(user)));
  }

  logout() {
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe();
    this.clearToken();
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private storeToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private clearToken(): void {
    localStorage.removeItem('access_token');
  }
}
