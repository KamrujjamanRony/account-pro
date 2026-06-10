import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuService } from '../../services/menu-service';
import { UserService } from '../../services/user-service';
import { ChartOfAccountService } from '../../services/chart-of-account-service';
import { AuthService } from '../../services/auth-service';
import { environment } from '../../../environments/environment';

interface StatCard {
  label: string;
  value: number | null;
  link: string;
  icon: string;
  accent: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private menuService = inject(MenuService);
  private userService = inject(UserService);
  private accountService = inject(ChartOfAccountService);
  private auth = inject(AuthService);

  protected readonly user = this.auth.currentUser;

  protected readonly menuCount = signal<number | null>(null);
  protected readonly userCount = signal<number | null>(null);
  protected readonly accountCount = signal<number | null>(null);

  protected readonly cards = signal<StatCard[]>([]);

  constructor() {
    this.menuService.search({}).subscribe({
      next: data => this.menuCount.set(data?.length ?? 0),
      error: () => this.menuCount.set(0),
    });
    this.userService.search({ companyID: environment.companyCode }).subscribe({
      next: data => this.userCount.set(data?.length ?? 0),
      error: () => this.userCount.set(0),
    });
    this.accountService.search({}).subscribe({
      next: data => this.accountCount.set(data?.length ?? 0),
      error: () => this.accountCount.set(0),
    });
  }

  protected cardData(): StatCard[] {
    return [
      {
        label: 'Chart of Accounts',
        value: this.accountCount(),
        link: '/chart-of-account',
        accent: 'bg-blue-500',
        icon: 'M3 3v18h18M8 17V9m4 8V5m4 12v-6',
      },
      {
        label: 'Users',
        value: this.userCount(),
        link: '/user-list',
        accent: 'bg-emerald-500',
        icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
      },
      {
        label: 'Menus',
        value: this.menuCount(),
        link: '/menu-list',
        accent: 'bg-violet-500',
        icon: 'M4 6h16M4 12h16M4 18h16',
      },
    ];
  }
}
