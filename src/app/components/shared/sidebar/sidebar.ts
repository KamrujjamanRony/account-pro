import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth-service';
import { environment } from '../../../../environments/environment';

interface NavItem {
  label: string;
  path: string;
  /** SVG path data for the item icon. */
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private auth = inject(AuthService);

  protected readonly companyName = environment.companyName;
  protected readonly user = this.auth.currentUser;

  protected readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'M4 13h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1Zm10 0h6a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1Zm0 8h6a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1Zm-10 0h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1Z',
    },
    {
      label: 'Chart of Account',
      path: '/chart-of-account',
      icon: 'M3 3v18h18M8 17V9m4 8V5m4 12v-6',
    },
    {
      label: 'Ledger',
      path: '/ledger',
      icon: 'M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm4 0v14M8 9h8M8 13h8M8 17h5',
    },
    {
      label: 'Voucher',
      path: '/voucher',
      icon: 'M9 2h6a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-3 2V4a2 2 0 0 1 2-2Zm0 6h6M9 12h6',
    },
    {
      label: 'Users',
      path: '/user-list',
      icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    },
    {
      label: 'Menus',
      path: '/menu-list',
      icon: 'M4 6h16M4 12h16M4 18h16',
    },
  ];

  logout() {
    this.auth.logout();
  }
}
