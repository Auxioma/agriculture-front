import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthRoleService } from '../auth-role.service';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './auth-layout.component.html',
})
export class AuthLayoutComponent {
  authRole = inject(AuthRoleService);
}
