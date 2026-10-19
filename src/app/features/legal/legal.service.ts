import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LegalPage } from './legal.model';

@Injectable({ providedIn: 'root' })
export class LegalService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getPage(code: string) {
    return this.http.get<LegalPage>(`${this.apiUrl}/legal/${code}`);
  }
}
