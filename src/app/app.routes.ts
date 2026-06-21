import { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { authGuard } from './guards/auth-guard';
import { permissionGuard } from './guards/permission-guard';

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
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Dashboard', menu: 'Dashboard' },
        title: `Dashboard | ${companyName}`,
      },
      {
        path: 'chart-of-account',
        loadComponent: () => import('./pages/chart-of-account/chart-of-account').then(m => m.ChartOfAccount),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Chart of Account', menu: 'Chart of Account' },
        title: `Chart of Account | ${companyName}`,
      },
      {
        path: 'ledger',
        loadComponent: () => import('./pages/ledger/ledger').then(m => m.Ledger),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Ledger', menu: 'Ledger' },
        title: `Ledger | ${companyName}`,
      },
      {
        path: 'voucher',
        loadComponent: () => import('./pages/voucher/voucher').then(m => m.Voucher),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Voucher', menu: 'Voucher' },
        title: `Voucher | ${companyName}`,
      },
      {
        path: 'cost-center',
        loadComponent: () => import('./pages/cost-centers/cost-centers').then(m => m.CostCenters),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Cost Centers', menu: 'Cost Center' },
        title: `Cost Centers | ${companyName}`,
      },
      {
        path: 'cash-book',
        loadComponent: () => import('./pages/cash-bank-book/cash-bank-book').then(m => m.CashBankBook),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Cash Book', kind: 'cash', menu: 'Cash Book' },
        title: `Cash Book | ${companyName}`,
      },
      {
        path: 'bank-book',
        loadComponent: () => import('./pages/cash-bank-book/cash-bank-book').then(m => m.CashBankBook),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Bank Book', kind: 'bank', menu: 'Bank Book' },
        title: `Bank Book | ${companyName}`,
      },
      {
        path: 'receipt-payment-statement',
        loadComponent: () =>
          import('./pages/receipt-payment-statement/receipt-payment-statement').then(
            m => m.ReceiptPaymentStatementPage,
          ),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Receipt & Payment Statement', menu: 'Receipt & Payment' },
        title: `Receipt & Payment Statement | ${companyName}`,
      },
      {
        path: 'day-book',
        loadComponent: () => import('./pages/day-book/day-book').then(m => m.DayBook),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Day Book', menu: 'Day Book' },
        title: `Day Book | ${companyName}`,
      },
      {
        path: 'general-ledger',
        loadComponent: () => import('./pages/general-ledger/general-ledger').then(m => m.GeneralLedger),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'General Ledger', menu: 'General Ledger' },
        title: `General Ledger | ${companyName}`,
      },
      {
        path: 'trial-balance',
        loadComponent: () => import('./pages/trial-balance/trial-balance').then(m => m.TrialBalance),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Trial Balance', menu: 'Trial Balance' },
        title: `Trial Balance | ${companyName}`,
      },
      {
        path: 'balance-sheet',
        loadComponent: () => import('./pages/balance-sheet/balance-sheet').then(m => m.BalanceSheet),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Balance Sheet', menu: 'Balance Sheet' },
        title: `Balance Sheet | ${companyName}`,
      },
      {
        path: 'profit-loss',
        loadComponent: () => import('./pages/profit-loss/profit-loss').then(m => m.ProfitLoss),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Profit & Loss Account', menu: 'Profit & Loss' },
        title: `Profit & Loss Account | ${companyName}`,
      },
      {
        path: 'user-list',
        loadComponent: () => import('./pages/users/users').then(m => m.Users),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'User List', menu: 'User' },
        title: `User List | ${companyName}`,
      },
      {
        path: 'menu-list',
        loadComponent: () => import('./pages/menus/menus').then(m => m.Menus),
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Menu List', menu: 'Menu' },
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
