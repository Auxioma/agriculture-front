import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FaqArticle } from './faq.model';

@Injectable({ providedIn: 'root' })
export class FaqService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getAll() {
    return this.http.get<FaqArticle[]>(`${this.apiUrl}/faq`);
  }
}
