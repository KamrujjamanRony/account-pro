import { Service, signal, inject } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { BreadcrumbModel } from './breadcrumb-model';

@Service()
export class BreadcrumbService {
  readonly breadcrumbs = signal<BreadcrumbModel[]>([]);
  private router = inject(Router);

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const root = this.router.routerState.snapshot.root;
        this.breadcrumbs.set(this.build(root));
      });
  }

  /** Append a dynamic breadcrumb after the route-based ones */
  appendCrumb(label: string, url?: string) {
    const current = this.breadcrumbs();
    this.breadcrumbs.set([...current, { label, url: url || '' }]);
  }

  private build(
    route: ActivatedRouteSnapshot,
    url: string = '',
    acc: BreadcrumbModel[] = []
  ): BreadcrumbModel[] {
    const routeUrl = route.url.map(s => s.path).join('/');
    if (routeUrl) {
      url += `/${routeUrl}`;
    }

    // Use explicit breadcrumb data if set; skip if empty string
    const breadcrumbData = route.data['breadcrumb'];
    if (breadcrumbData) {
      acc.push({ label: breadcrumbData, url });
    }

    for (const child of route.children) {
      this.build(child, url, acc);
    }

    return acc;
  }
}
