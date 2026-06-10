import { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { authGuard } from './guards/auth-guard';

const companyName = environment.companyName;

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/main/main').then(m => m.Main),
    canActivate: [authGuard],
    data: { breadcrumb: '' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
        data: { breadcrumb: 'Dashboard' },
        title: `Dashboard | ${companyName}`,
      },
      {
        path: 'chart-of-account',
        loadComponent: () => import('./pages/chart-of-account/chart-of-account').then(m => m.ChartOfAccount),
        data: { breadcrumb: 'Chart of Account' },
        title: `Chart of Account | ${companyName}`,
      },
      {
        path: 'user-list',
        loadComponent: () => import('./pages/users/users').then(m => m.Users),
        data: { breadcrumb: 'User List' },
        title: `User List | ${companyName}`,
      },
      {
        path: 'menu-list',
        loadComponent: () => import('./pages/menus/menus').then(m => m.Menus),
        data: { breadcrumb: 'Menu List' },
        title: `Menu List | ${companyName}`,  
      }
    ]
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
    data: { breadcrumb: '' },
    title: `Login | ${companyName}`
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
