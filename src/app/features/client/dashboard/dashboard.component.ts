import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClientDashboardService } from './dashboard.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientDashboardComponent {
  private readonly auth = inject(AuthService);
  readonly summary = toSignal(inject(ClientDashboardService).getSummary());

  readonly firstName = computed(() => this.auth.currentUser()?.firstName ?? '');
}
