# Account Pro — Mobile (React Native / Expo)

A native Android (and iOS) client for the **Account Pro** accounting suite, built
with [Expo](https://expo.dev) + [expo-router](https://docs.expo.dev/router/introduction/).
It talks to the same .NET Accounts API as the Angular web app and mirrors its
features: authentication with token refresh, permission-gated navigation, master
data, double-entry vouchers, and the full set of financial reports (with
print / PDF export).

## Feature parity with the web app

| Area | Screens |
| --- | --- |
| Auth | Login (JWT + refresh token, secure token storage) |
| Dashboard | KPIs, account-nature donut, income/expense & cash-flow bars, entity counts |
| Master data | Chart of Account, Ledger, Cost Center, Fixed Assets (with depreciation & disposal), Users (with permission tree), Menus |
| Vouchers | List with filters, type-driven entry grid (CR/CP/BR/BP/CV/JV), balanced-entry validation, voucher print with barcode |
| Reports | Day Book, Cash Book, Bank Book, Receipt & Payment, General Ledger, Trial Balance, Balance Sheet, Profit & Loss |

Every report and the voucher offer **Print** and **Share PDF** via `expo-print`.
Navigation is a drawer whose items are filtered by the signed-in user's
permissions (`view` on each menu), exactly like the web sidebar.

## Prerequisites

- Node.js 18+
- The Account Pro API running and reachable from the device/emulator
- For Android: Android Studio + an emulator, or a physical device with
  [Expo Go](https://expo.dev/go)

## Getting started

```bash
cd mobile
npm install
npm run start        # then press "a" for Android, or scan the QR with Expo Go
# or directly:
npm run android
```

## Configuring the API URL

The API base URL and company settings live under `expo.extra` in
[`app.json`](./app.json):

```json
"extra": {
  "companyName": "Account Pro",
  "companyAddress": "Dhaka, Bangladesh",
  "companyCode": 1,
  "apiUrl": "http://10.0.2.2:1000/p"
}
```

**Choosing `apiUrl`:**

- **Android emulator** → `http://10.0.2.2:1000/p` (10.0.2.2 is the host machine
  from inside the emulator; `localhost` would be the emulator itself).
- **Physical device** → your computer's LAN IP, e.g. `http://192.168.0.10:1000/p`
  (device and computer on the same network).
- **Production** → your HTTPS API URL.

Cleartext HTTP is enabled for Android (`usesCleartextTraffic`) so the local dev
API works; switch to HTTPS for production.

## Building an APK / AAB

Uses [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview   # installable APK
```

(The `preview` profile is referenced by `npm run build:android`; add an
[`eas.json`](https://docs.expo.dev/build/eas-json/) to customise profiles.)

## Project structure

```
mobile/
├─ app/                       # expo-router routes
│  ├─ _layout.tsx             # providers + root Stack
│  ├─ index.tsx              # session restore + redirect
│  ├─ login.tsx
│  ├─ voucher-entry.tsx       # full-screen voucher form (create/edit)
│  ├─ voucher-print.tsx       # printable voucher + barcode
│  └─ (app)/                  # authenticated drawer group
│     ├─ _layout.tsx          # permission-gated drawer
│     ├─ dashboard.tsx
│     ├─ chart-of-account.tsx · ledger.tsx · cost-center.tsx · asset.tsx
│     ├─ voucher.tsx
│     ├─ day-book.tsx · cash-book.tsx · bank-book.tsx · receipt-payment-statement.tsx
│     ├─ general-ledger.tsx · trial-balance.tsx · balance-sheet.tsx · profit-loss.tsx
│     └─ user-list.tsx · menu-list.tsx
└─ src/
   ├─ api/client.ts           # fetch wrapper: Bearer token + single-flight 401 refresh
   ├─ config/                 # env, theme tokens, nav/menu map
   ├─ context/                # AuthContext, ThemeContext
   ├─ hooks/                  # usePermissions, useAsync
   ├─ lib/                    # storage, format, print, alerts, permission tree
   ├─ models/                 # TypeScript models (ported 1:1 from the Angular app)
   ├─ services/               # API services (ported from the Angular services)
   └─ components/             # UI kit, charts, barcode, report primitives
```

## How it maps to the Angular app

- **Services** (`src/services/*`) are 1:1 ports of the Angular `*-service.ts`
  files — same endpoints, same request/response shapes, including the loosely-typed
  report normalisation in `report.ts`.
- **Auth** replicates `AuthService` + `authInterceptor`: the JWT is attached to
  every API call and a 401 triggers a single shared refresh + retry. Tokens are
  kept in the OS secure store (`expo-secure-store`) instead of cookies.
- **Permissions** replicate `PermissionService`: `usePermissions()` reads the
  flat `userMenu` and gates the drawer and every create/edit/delete action.
- **Printing**: the web app prints via the browser; here reports and vouchers
  build the same HTML and hand it to `expo-print` for native print / PDF share.

## Notes & limitations

- The barcode on the voucher print is a decorative, deterministic graphic (as in
  the web app), not a scan-accurate Code128 symbol.
- Icons are drawn from the same SVG path data as the web sidebar via
  `react-native-svg`, so no icon font is bundled.
- `Intl.NumberFormat` is used for money formatting (available in Hermes).
