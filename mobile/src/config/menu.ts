/** A menu, the route it maps to, and its sidebar icon (SVG path data). */
export interface MenuRoute {
  menu: string;
  path: string;
  icon: string;
}

/** A sidebar entry: either a leaf route or a collapsible group of routes. */
export interface NavItem {
  label: string;
  path?: string;
  icon: string;
  children?: MenuRoute[];
}

/**
 * Canonical menu → route map. `menu` values match the `menuName` stored in each
 * user's permission tree (and the labels in the permission UI). Mirrors the
 * Angular `permission-service` MENU_ROUTES + sidebar nav.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'M4 13h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1Zm10 0h6a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1Zm0 8h6a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1Zm-10 0h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1Z',
  },
  { label: 'Chart of Account', path: '/chart-of-account', icon: 'M3 3v18h18M8 17V9m4 8V5m4 12v-6' },
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
  { label: 'Cost Center', path: '/cost-center', icon: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 4v6l4 2' },
  {
    label: 'Asset',
    path: '/asset',
    icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12',
  },
  {
    label: 'Report',
    icon: 'M9 17v-5m3 5v-8m3 8v-3M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
    children: [
      { menu: 'Day Book', path: '/day-book', icon: 'M8 7V3m8 4V3M4 11h16M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z' },
      { menu: 'Cash Book', path: '/cash-book', icon: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 4h18M7 15h4' },
      { menu: 'Bank Book', path: '/bank-book', icon: 'M3 21h18M5 21V10m4 11V10m6 11V10m4 11V10M2 10l10-6 10 6H2Z' },
      { menu: 'Receipt & Payment', path: '/receipt-payment-statement', icon: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 5h10M7 13h10M7 17h6' },
      { menu: 'General Ledger', path: '/general-ledger', icon: 'M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm4 0v14M8 9h8M8 13h6' },
      { menu: 'Trial Balance', path: '/trial-balance', icon: 'M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4M9 3v4h6V3M9 3h6M8 12h3m2 0h3M8 16h3m2 0h3' },
      { menu: 'Balance Sheet', path: '/balance-sheet', icon: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 6h16M12 10v10' },
      { menu: 'Profit & Loss', path: '/profit-loss', icon: 'M3 3v18h18M7 14l4-4 3 3 5-6' },
    ],
  },
  {
    label: 'User',
    path: '/user-list',
    icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  },
  { label: 'Menu', path: '/menu-list', icon: 'M4 6h16M4 12h16M4 18h16' },
];
