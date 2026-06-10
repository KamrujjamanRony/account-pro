import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MenuService } from '../../services/menu-service';
import { AuthService } from '../../services/auth-service';
import { environment } from '../../../environments/environment';
import { Menu, PERMISSION_ACTIONS, PermissionAction } from '../../models/menu.model';

interface DefaultMenu {
  menuName: string;
  url: string;
  icon: string;
}

@Component({
  selector: 'app-menus',
  imports: [ReactiveFormsModule],
  templateUrl: './menus.html',
  styleUrl: './menus.css',
})
export class Menus {
  private fb = inject(FormBuilder);
  private menuService = inject(MenuService);
  private auth = inject(AuthService);

  protected readonly actions = PERMISSION_ACTIONS;

  protected readonly menus = signal<Menu[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly search = signal('');

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    menuName: ['', Validators.required],
    url: [''],
    parentMenuId: [null as number | null],
    icon: [''],
    isActive: [true],
    permissions: this.fb.nonNullable.group({
      view: [false],
      create: [false],
      edit: [false],
      delete: [false],
    }),
  });

  /** Menus filtered by the search box. */
  protected readonly filteredMenus = computed(() => {
    const term = this.search().trim().toLowerCase();
    const list = this.menus();
    if (!term) return list;
    return list.filter(
      m =>
        m.menuName.toLowerCase().includes(term) || (m.url ?? '').toLowerCase().includes(term),
    );
  });

  /** Candidate parent menus (excludes the menu currently being edited). */
  protected readonly parentOptions = computed(() =>
    this.menus().filter(m => m.id !== this.editingId()),
  );

  private readonly nameById = computed(() => {
    const map = new Map<number, string>();
    for (const m of this.menus()) if (m.id != null) map.set(m.id, m.menuName);
    return map;
  });

  constructor() {
    this.load();
  }

  parentName(id: number | null): string {
    if (id == null) return '—';
    return this.nameById().get(id) ?? `#${id}`;
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.menuService.search({}).subscribe({
      next: data => {
        this.menus.set(data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load menus.');
        this.loading.set(false);
      },
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({
      menuName: '',
      url: '',
      parentMenuId: null,
      icon: '',
      isActive: true,
      permissions: { view: true, create: false, edit: false, delete: false },
    });
    this.showForm.set(true);
  }

  openEdit(menu: Menu) {
    this.editingId.set(menu.id ?? null);
    this.formError.set('');
    const keys = menu.permissionsKey ?? [];
    this.form.reset({
      menuName: menu.menuName,
      url: menu.url ?? '',
      parentMenuId: menu.parentMenuId ?? null,
      icon: menu.icon ?? '',
      isActive: menu.isActive,
      permissions: {
        view: keys.includes('view'),
        create: keys.includes('create'),
        edit: keys.includes('edit'),
        delete: keys.includes('delete'),
      },
    });
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const permissionsKey = this.actions.filter(a => v.permissions[a]);
    const id = this.editingId();
    const base: Menu = {
      companyID: environment.companyCode,
      menuName: v.menuName.trim(),
      url: v.url.trim(),
      parentMenuId: v.parentMenuId ?? null,
      icon: v.icon.trim(),
      isActive: v.isActive,
      permissionsKey,
    };

    this.saving.set(true);
    this.formError.set('');
    const user = this.auth.getUser();
    const request =
      id == null
        ? this.menuService.add({ ...base, postBy: user?.userName ?? user?.username ?? 'admin' })
        : this.menuService.update(id, { ...base, updateBy: user?.userName ?? 'admin' });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.formError.set('Failed to save the menu.');
      },
    });
  }

  remove(menu: Menu) {
    if (menu.id == null) return;
    if (!confirm(`Delete menu "${menu.menuName}"?`)) return;
    this.menuService.delete(menu.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Failed to delete the menu.'),
    });
  }

  /** Create the four standard application menus in one go. */
  seedDefaults() {
    const existing = new Set(this.menus().map(m => m.menuName.toLowerCase()));
    const defaults: DefaultMenu[] = [
      { menuName: 'Dashboard', url: '/dashboard', icon: 'dashboard' },
      { menuName: 'Chart of Account', url: '/chart-of-account', icon: 'chart' },
      { menuName: 'User', url: '/user-list', icon: 'users' },
      { menuName: 'Menu', url: '/menu-list', icon: 'menu' },
    ];
    const toCreate = defaults.filter(d => !existing.has(d.menuName.toLowerCase()));
    if (toCreate.length === 0) {
      this.error.set('Default menus already exist.');
      return;
    }
    const user = this.auth.getUser();
    const postBy = user?.userName ?? user?.username ?? 'admin';
    this.loading.set(true);
    forkJoin(
      toCreate.map(d =>
        this.menuService.add({
          companyID: environment.companyCode,
          menuName: d.menuName,
          url: d.url,
          parentMenuId: null,
          icon: d.icon,
          isActive: true,
          permissionsKey: [...PERMISSION_ACTIONS],
          postBy,
        }),
      ),
    ).subscribe({
      next: () => this.load(),
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to seed default menus.');
      },
    });
  }

  permissionLabel(action: PermissionAction): string {
    return action.charAt(0).toUpperCase() + action.slice(1);
  }
}
