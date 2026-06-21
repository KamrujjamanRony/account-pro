# Account Pro — Project Notes

A double-entry **accounting / bookkeeping** web application built with Angular 22.
The frontend is a single-page app that talks to a separate **Accounts API** backend
over HTTP, with JWT authentication, fine-grained per-menu permissions, and a full
suite of accounting reports (Cash Book, Bank Book, Trial Balance, General Ledger,
Balance Sheet, and a Receipt & Payment Statement).

> This document is a living engineering reference for the codebase. It describes the
> architecture, conventions, domain model, and the moving parts a new contributor
> needs to be productive.

---

## 1. At a Glance

| Aspect | Detail |
| --- | --- |
| **Framework** | Angular 22 (standalone components, signals, zoneless change detection) |
| **Language** | TypeScript ~6.0 (strict) |
| **Styling** | Tailwind CSS v4 (via `@tailwindcss/postcss`), dark mode through the `.dark` class |
| **State** | Angular signals + `computed()`; no external store |
| **HTTP** | `provideHttpClient` with a functional auth interceptor |
| **Routing** | Lazy-loaded standalone components, guarded by auth + permission guards |
| **Dialogs/Toasts** | SweetAlert2 (`sweetalert2`) wrapped by `AlertService` |
| **Excel export** | Custom dependency-free `.xlsx` writer (`ExcelExportService`) |
| **Testing** | Vitest + jsdom (`ng test`) |
| **Tooling** | Angular CLI 22, Prettier 3, PostCSS |
| **Package manager** | npm 11.7.0 |

The backend is **not** part of this repo. The app integrates with it through the
`environment.apiUrl` base URL and a standard response envelope (see §6).

---

## 2. Getting Started

```bash
npm install        # install dependencies
ng serve           # dev server at http://localhost:4200
ng build           # production build into dist/
ng test            # run Vitest unit tests
npm run watch      # rebuild on change (development configuration)
```

**Local API expectation:** the development environment points at
`http://localhost:1000/p` (see `src/environments/environment.ts`). The production
build points at the relative path `/api`, so the API is expected to be reverse-proxied
on the same origin in production.

---

## 3. Project Structure

```
src/
├── main.ts                       # bootstrapApplication entry
├── environments/
│   ├── environment.ts            # dev config (apiUrl, companyName, companyCode…)
│   └── environment.production.ts # prod config (apiUrl: '/api')
└── app/
    ├── app.ts                    # root <app-root> shell
    ├── app.config.ts             # ApplicationConfig: providers, API warm-up
    ├── app.routes.ts             # route table (lazy, guarded)
    │
    ├── layouts/
    │   └── main/                 # authenticated shell: Topbar + Sidebar + <router-outlet>
    │
    ├── components/shared/
    │   ├── sidebar/              # permission-filtered, accordion navigation
    │   ├── topbar/               # header (theme toggle, user, breadcrumb)
    │   └── count-up/             # animated number component (dashboard cards)
    │
    ├── pages/                    # one folder per routed feature page
    │   ├── login/
    │   ├── dashboard/
    │   ├── chart-of-account/
    │   ├── ledger/
    │   ├── voucher/
    │   ├── cash-bank-book/       # serves both Cash Book and Bank Book routes
    │   ├── receipt-payment-statement/
    │   ├── general-ledger/
    │   ├── trial-balance/
    │   ├── balance-sheet/
    │   ├── users/
    │   └── menus/
    │
    ├── services/                 # singleton (root) services — API + app concerns
    │   ├── auth-service.ts
    │   ├── permission-service.ts
    │   ├── chart-of-account-service.ts
    │   ├── ledger-service.ts
    │   ├── voucher-service.ts
    │   ├── report-service.ts
    │   ├── menu-service.ts
    │   ├── user-service.ts
    │   ├── theme-service.ts
    │   ├── alert-service.ts
    │   └── excel-export-service.ts
    │
    ├── models/                   # TypeScript interfaces for the domain + API
    │   ├── api-response.model.ts
    │   ├── user.model.ts
    │   ├── menu.model.ts
    │   ├── chart-of-account.model.ts
    │   ├── ledger.model.ts
    │   ├── voucher.model.ts
    │   └── report.model.ts
    │
    ├── guards/
    │   ├── auth-guard.ts          # blocks unauthenticated access
    │   └── permission-guard.ts    # blocks pages the user can't `view`
    │
    ├── interceptors/
    │   └── auth-interceptor.ts    # attaches Bearer token, refreshes on 401
    │
    ├── directives/
    │   └── can.directive.ts       # *appCan structural directive (UI permission gating)
    │
    └── utils/
        ├── tree.ts                # menu-permission tree builders/transformers
        └── breadcrumb/            # breadcrumb model + service + component
```

**Naming convention:** files and classes use the modern Angular style — components are
named by their feature (e.g. `dashboard.ts` → `class Dashboard`), without `.component`
suffixes. Services live under `services/` and are tree-shakeable singletons.

---

## 4. Architecture & Conventions

These mirror the rules in `.claude/CLAUDE.md` and are followed consistently across the
codebase:

- **Standalone components only** — no NgModules. `standalone: true` is omitted (it's the
  default in Angular v20+).
- **Signals for state** — local component state is held in `signal()`, derived state in
  `computed()`, side effects in `effect()`. No NgRx / RxJS store.
- **Zoneless change detection** — configured via `provideZonelessChangeDetection()` in
  `app.config.ts`. The app does not depend on `zone.js` for change detection, which makes
  signals the canonical way to trigger view updates.
- **`inject()` over constructor injection** — services and tokens are obtained with the
  `inject()` function throughout.
- **`input()` / `output()` functions** instead of `@Input` / `@Output` decorators.
- **Native control flow** (`@if`, `@for`, `@switch`) instead of the structural directives.
- **Lazy loading** — every routed page uses `loadComponent: () => import(...)`.
- **Class & style bindings** rather than `ngClass` / `ngStyle`.
- **Strict TypeScript** — `noImplicitOverride`, `noPropertyAccessFromIndexSignature`,
  `noImplicitReturns`, `noFallthroughCasesInSwitch`, plus Angular's strict injection and
  input-access modes.

> **Note on the `@Service()` decorator:** several services use `@Service()` /
> `import { Service } from '@angular/core'` (e.g. `AuthService`, `PermissionService`,
> `VoucherService`, `ReportService`, `ExcelExportService`), while others use the classic
> `@Injectable({ providedIn: 'root' })` (e.g. `ThemeService`, `AlertService`). Both
> register a root-scoped singleton; the codebase mixes the two spellings. When adding a
> new service, prefer matching the surrounding file's style.

### Application bootstrap (`app.config.ts`)

Providers wired at startup:

- `provideBrowserGlobalErrorListeners()` — surfaces uncaught errors.
- `provideZonelessChangeDetection()` — signal-driven CD.
- `provideRouter(routes)` — the route table.
- `provideHttpClient(withInterceptors([authInterceptor]))` — HTTP with auth handling.
- `provideAppInitializer(() => warmUpApi())` — a **fire-and-forget** `fetch` to the API
  root during bootstrap so a cold backend app-pool starts warming while the login screen
  renders. The response is intentionally ignored (even a 401/404 warms the pipeline) and
  bootstrap never blocks on it.

---

## 5. Authentication & Authorization

This is the most security-sensitive part of the app and has three cooperating layers.

### 5.1 `AuthService` (`services/auth-service.ts`)

- Authenticates against `…/Authentication/Login`, returning an `AuthResult`
  (`token`, `refreshToken`, expirations, and the user's flat `userMenu` permissions).
- **Token storage:** the access token and refresh token are stored as **cookies**
  (`auth_token`, `refresh_token`) scoped to their server-provided lifetimes, with
  `SameSite=Strict` and `Secure` on HTTPS.
- **User state:** the signed-in `User` is held in a `currentUser` signal and additionally
  backed up to `localStorage` (base64 of URI-encoded JSON, under an obfuscated key) so a
  page reload restores the session. The backup is also re-written on `beforeunload`.
- **Single-flight refresh:** `refreshToken()` shares one in-flight `Observable`
  (`shareReplay`) so multiple concurrent 401s trigger exactly one refresh call. On failure
  it logs the user out.
- `logout()` clears the signal, the localStorage backup, and both cookies, then routes to
  `/login`.

### 5.2 `authInterceptor` (`interceptors/auth-interceptor.ts`)

- Attaches `Authorization: Bearer <token>` to every call to our own API — but **never** to
  the login or refresh endpoints themselves.
- On a `401`, transparently calls `AuthService.refreshToken()`, then retries the original
  request **once** with the fresh token. If refresh fails, the user is signed out (handled
  inside the service).

### 5.3 Permission model

Permissions are **menu + action** pairs. Actions are a fixed set:

```ts
type PermissionAction = 'view' | 'create' | 'edit' | 'delete';
```

The signed-in user carries a flat `userMenu: { menuName, permissions[] }[]` list (from the
login payload). `PermissionService` indexes this reactively (`computed` over
`currentUser()`) into a `Map<menuName, Set<action>>` and answers:

- `can(menu, action)`, plus `canView/canCreate/canEdit/canDelete` shortcuts.
- `viewableMenus()` — the canonical menu→route list filtered to what the user may view
  (drives the sidebar).
- `firstAllowedPath()` — used to redirect away from denied pages.

**Policy: deny by default.** A menu/action is granted only when the user's tree explicitly
selects it; a user with no grants can see and do nothing.

Three enforcement points consume this:

1. **`permissionGuard`** — route-level. Reads `route.data.menu`; if the user can't `view`
   it, redirects to `firstAllowedPath()`. Routes with no `menu` are always allowed.
2. **`*appCan` directive** (`can.directive.ts`) — element-level. `*appCan="'Ledger:create'"`
   (or just `'Ledger'`, defaulting to the `view` action) renders its element only when the
   permission is held, and reactively adds/removes it when the user changes.
3. **Sidebar filtering** — `Sidebar.visibleNavItems` hides nav entries (and empty groups)
   the user can't view.

The **canonical menu→route map** lives in `MENU_ROUTES` (`permission-service.ts`). The
`menu` strings there must match the `menuName` values in the permission tree **and** the
`data.menu` on each route **and** the sidebar `label`s. Keep all three in sync when adding
a page.

---

## 6. API Integration

All services share one response envelope:

```ts
interface ApiResponse<T> { success: boolean; message: string; data: T; }
interface PagedResult<T>  { items: T[]; totalCount?: number; pageNumber?: number; pageSize?: number; }
```

Services build their base URL from `environment.apiUrl` and typically `.pipe(map(res => res.data))`
to unwrap the envelope. Search endpoints tolerate both bare arrays and `{ items, count }`
shapes (see `VoucherService.search`).

**Defensive normalization in `ReportService`:** the report endpoints are loosely specified,
so `ReportService` reads each field through a list of likely aliases (`pick(row, [...])`),
tolerates flat-array vs. nested-object payloads, and **computes totals client-side as a
fallback**. It also parses running balances from numbers, `"1,060.00 Dr"` strings, or
`{ amount, side }` objects (`toBalance`). This makes the reports resilient to backend
shape drift — when extending a report, follow the same alias-and-fallback pattern rather
than assuming a single field name.

Known endpoint groups: `Authentication/*`, `Voucher/*`, `Report/*` (`CashBook`, `BankBook`,
`ReceiptPaymentStatement`, `TrialBalance-2`, `GeneralLedger`, `BalanceSheet`,
`CashBankBalance`), plus chart-of-account, ledger, menu, and user CRUD.

---

## 7. Domain Model (Accounting)

The app implements standard double-entry bookkeeping:

- **Chart of Account** (`chart-of-account.model.ts`) — a hierarchical account tree
  (`parentId`/`children`). Root accounts carry a `nature`: `Asset`, `Liability`, `Equity`,
  `Income`, or `Expense`.
- **Ledger** — the postable accounts (see `ledger.model.ts` / `LedgerService`).
- **Voucher** (`voucher.model.ts`) — a double-entry transaction with debit/credit
  `details[]` lines. Supported types:

  | Code | Type |
  | --- | --- |
  | CR | Cash Receipt |
  | CP | Cash Payment |
  | BR | Bank Receipt |
  | BP | Bank Payment |
  | CV | Contra Voucher |
  | JV | Journal Voucher |

  Each type has a **behavior profile** (`VOUCHER_TYPE_BEHAVIOR`) describing how the entry
  grid acts: whether row 1 is auto-filled from the cash/bank balance and locked, which
  section sources it (`Cash-in-Hand` / `Cash-at-Bank`), whether all rows are limited to
  cash & bank ledgers (Contra), and which side (debit/credit) the locked cash/bank line
  sits on. Receipts lock the debit side and sum the credits into row 1; payments do the
  inverse. This encodes the bookkeeping rules directly into the UI.

### Reports (`report.model.ts` + `ReportService`)

Each report is normalized into a structure that mirrors its **printed layout**:

- **Cash Book / Bank Book** — `A. Opening → B. Receipt & Payment (+ Sub Total) → C. Closing
  → Grand Total`. One page component (`cash-bank-book`) serves both routes, switched by the
  route's `data.kind` (`'cash'` | `'bank'`).
- **Receipt & Payment Statement** — opening / receipt & payment / closing cash & bank,
  grouped by ledger group.
- **Trial Balance** — every ledger's Opening / Current / Closing debit-credit balances,
  grouped by nature → group, with sub-totals and a grand total.
- **General Ledger** — every posting per ledger, grouped by ledger group, with per-ledger
  sub-totals and per-group summaries plus closing balances.
- **Balance Sheet** — Assets vs. Liabilities (+ Equity folded in) snapshot as of a date,
  with a balanced check (`isBalanced`, `difference`).

---

## 8. UI & UX

- **Layout:** `layouts/main` is the authenticated shell (`Topbar` + `Sidebar` +
  `<router-outlet>`). The login page renders outside this shell.
- **Sidebar:** permission-filtered, **accordion** navigation — only one group can be open
  at a time, and the group owning the active route auto-expands on navigation. Reports are
  grouped under a collapsible "Report" parent.
- **Theme:** `ThemeService` owns light/dark/`system` preference, persists it to
  localStorage, reflects the resolved theme onto the `.dark` class of `<html>` (driving all
  Tailwind `dark:` variants), and reacts live to OS changes in `system` mode.
- **Breadcrumbs:** driven by `route.data.breadcrumb` via the `breadcrumb` util/service.
- **Page titles:** each route sets a `title` of `"<Page> | <companyName>"`.
- **Dialogs & toasts:** `AlertService` wraps SweetAlert2 for consistent delete
  confirmations and non-blocking success/error toasts (with HTML-escaping of interpolated
  names).
- **Animated counters:** the `count-up` shared component animates dashboard metric cards.

---

## 9. Notable Custom Implementations

- **Dependency-free Excel export (`ExcelExportService`).** Builds a genuine `.xlsx`
  (Office Open XML) workbook entirely in the browser with **no third-party library**: it
  assembles the minimal OOXML parts, computes CRC-32s, and writes a **store-only
  (uncompressed) ZIP** by hand, then triggers a download. Numbers become numeric cells,
  everything else becomes inline strings; sheet names are sanitized to Excel's rules. Used
  across the report pages for "Export to Excel".
- **Menu-permission tree utilities (`utils/tree.ts`).** Pure functions to build a
  permission tree from the flat menu list, deep-clone it, select/clear all, flatten it for
  rendering with depth, and toggle nodes/permissions with cascading selection. Used by the
  user editor to assign per-menu permissions.
- **API warm-up on bootstrap.** See §4 — a deliberate cold-start mitigation.

---

## 10. Configuration Reference

`src/environments/environment.ts` (dev) and `environment.production.ts` (prod):

| Key | Dev value | Prod value | Purpose |
| --- | --- | --- | --- |
| `production` | `false` | `true` | Build flag |
| `companyName` | `Account Pro` | `Account Pro` | Letterhead / titles |
| `companyCode` | `1` | `1` | Sent as `companyID` on login/search |
| `apiUrl` | `http://localhost:1000/p` | `/api` | API base URL |
| `ImageApi` | `…/uploads/` | same | Uploaded-image base |
| `emptyImg` | placeholder URL | same | Fallback image |

---

## 11. Conventions for Contributors

When adding a **new feature page**, you typically touch all of:

1. `models/…` — the domain interfaces.
2. `services/…` — a root service that wraps the API endpoints (unwrap `ApiResponse`).
3. `pages/<feature>/` — the standalone page component (signals + `inject()`).
4. `app.routes.ts` — a lazy `loadComponent` route with `data.menu`, `data.breadcrumb`,
   `title`, and the `permissionGuard`.
5. `MENU_ROUTES` in `permission-service.ts` — add the `menu → path` mapping.
6. `Sidebar.navItems` — add the nav entry (label must equal the menu name).

Keep components small and single-responsibility, prefer inline templates for small
components, use Reactive Forms over template-driven, and ensure accessibility (the project
targets WCAG AA and passing AXE checks).

---

## 12. Testing

- Runner: **Vitest** with **jsdom** (`ng test`).
- Spec files live next to their subjects (`*.spec.ts`) — present for `app`, `main`,
  `sidebar`, `dashboard`, `login`, `users`, `menus`, `ledger`, `chart-of-account`,
  `auth-guard`, `auth-service`, and the breadcrumb utilities.
- No e2e framework is configured by default.

---

## 13. Known Caveats / Watch-outs

- **Cookie + localStorage tokens:** access/refresh tokens live in non-`HttpOnly` cookies
  and the user object is mirrored to `localStorage`. This is a deliberate SPA trade-off for
  refresh-on-reload; be mindful of XSS exposure when adding third-party scripts.
- **Loosely-typed report payloads:** never assume a single field name in `ReportService` —
  extend the alias lists and keep the client-side total fallbacks intact.
- **Three-way menu-name coupling:** `MENU_ROUTES`, route `data.menu`, and sidebar `label`s
  must all use the same `menuName` strings as the backend permission tree.
- **Mixed service decorator styles** (`@Service()` vs. `@Injectable()`) — match the local
  file when editing.
- **Dual-purpose route component:** `cash-bank-book` renders differently based on
  `route.data.kind`; check both `/cash-book` and `/bank-book` when changing it.

---

*Generated as an engineering reference for the Account Pro Angular frontend. Update this
file as the architecture evolves.*
