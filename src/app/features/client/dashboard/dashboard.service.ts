import { Injectable, inject } from '@angular/core';
import { DashboardSummary } from './dashboard.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClientDashboardService {
  private readonly http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getSummary() {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/client/dashboard`);
  }
}
