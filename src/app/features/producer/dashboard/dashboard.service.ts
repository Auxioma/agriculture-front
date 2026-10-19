import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ProducerDashboard } from './dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getDashboard() {
    return this.http.get<ProducerDashboard>(`${this.apiUrl}/producer/dashboard`);
  }
}
