import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { PermissionService } from '../services/permission-service';
import { PermissionAction } from '../models/menu.model';

/**
 * Structural directive that renders its element only when the signed-in user
 * holds the given permission. Spec is `"Menu"` (defaults to the `view` action)
 * or `"Menu:action"`, e.g.
 *
 * ```html
 * <button *appCan="'Ledger:create'">Add ledger</button>
 * <a *appCan="'Trial Balance'">…</a>
 * ```
 *
 * Reactive: the view is added/removed automatically when the user (and thus
 * their permissions) changes.
 */
@Directive({
  selector: '[appCan]',
})
export class CanDirective {
  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);
  private permissions = inject(PermissionService);

  /** Permission spec: `"Menu"` or `"Menu:action"`. */
  readonly appCan = input.required<string>();

  private visible = false;

  constructor() {
    effect(() => {
      const spec = this.appCan();
      const sep = spec.indexOf(':');
      const menu = (sep === -1 ? spec : spec.slice(0, sep)).trim();
      const action = (sep === -1 ? 'view' : spec.slice(sep + 1).trim()) as PermissionAction;
      this.render(this.permissions.can(menu, action));
    });
  }

  private render(allowed: boolean): void {
    if (allowed && !this.visible) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.visible = true;
    } else if (!allowed && this.visible) {
      this.viewContainer.clear();
      this.visible = false;
    }
  }
}
