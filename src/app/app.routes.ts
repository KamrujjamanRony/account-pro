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
        path: 'ledger',
        loadComponent: () => import('./pages/ledger/ledger').then(m => m.Ledger),
        data: { breadcrumb: 'Ledger' },
        title: `Ledger | ${companyName}`,
      },
      {
        path: 'voucher',
        loadComponent: () => import('./pages/voucher/voucher').then(m => m.Voucher),
        data: { breadcrumb: 'Voucher' },
        title: `Voucher | ${companyName}`,
      },
      {
        path: 'cash-book',
        loadComponent: () => import('./pages/cash-bank-book/cash-bank-book').then(m => m.CashBankBook),
        data: { breadcrumb: 'Cash Book', kind: 'cash' },
        title: `Cash Book | ${companyName}`,
      },
      {
        path: 'bank-book',
        loadComponent: () => import('./pages/cash-bank-book/cash-bank-book').then(m => m.CashBankBook),
        data: { breadcrumb: 'Bank Book', kind: 'bank' },
        title: `Bank Book | ${companyName}`,
      },
      {
        path: 'receipt-payment-statement',
        loadComponent: () =>
          import('./pages/receipt-payment-statement/receipt-payment-statement').then(
            m => m.ReceiptPaymentStatementPage,
          ),
        data: { breadcrumb: 'Receipt & Payment Statement' },
        title: `Receipt & Payment Statement | ${companyName}`,
      },
      {
        path: 'general-ledger',
        loadComponent: () => import('./pages/general-ledger/general-ledger').then(m => m.GeneralLedger),
        data: { breadcrumb: 'General Ledger' },
        title: `General Ledger | ${companyName}`,
      },
      {
        path: 'trial-balance',
        loadComponent: () => import('./pages/trial-balance/trial-balance').then(m => m.TrialBalance),
        data: { breadcrumb: 'Trial Balance' },
        title: `Trial Balance | ${companyName}`,
      },
      {
        path: 'balance-sheet',
        loadComponent: () => import('./pages/balance-sheet/balance-sheet').then(m => m.BalanceSheet),
        data: { breadcrumb: 'Balance Sheet' },
        title: `Balance Sheet | ${companyName}`,
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
