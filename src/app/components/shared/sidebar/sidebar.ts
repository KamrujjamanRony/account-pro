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
      label: 'Cash Book',
      path: '/cash-book',
      icon: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 4h18M7 15h4',
    },
    {
      label: 'Bank Book',
      path: '/bank-book',
      icon: 'M3 21h18M5 21V10m4 11V10m6 11V10m4 11V10M2 10l10-6 10 6H2Z',
    },
    {
      label: 'Receipt & Payment',
      path: '/receipt-payment-statement',
      icon: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 5h10M7 13h10M7 17h6',
    },
    {
      label: 'General Ledger',
      path: '/general-ledger',
      icon: 'M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm4 0v14M8 9h8M8 13h6',
    },
    {
      label: 'Trial Balance',
      path: '/trial-balance',
      icon: 'M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4M9 3v4h6V3M9 3h6M8 12h3m2 0h3M8 16h3m2 0h3',
    },
    {
      label: 'Balance Sheet',
      path: '/balance-sheet',
      icon: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 6h16M12 10v10',
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
