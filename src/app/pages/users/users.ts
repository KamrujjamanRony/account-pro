import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenuService } from '../../services/menu-service';
import { UserService } from '../../services/user-service';
import { AuthService } from '../../services/auth-service';
import { AlertService } from '../../services/alert-service';
import { environment } from '../../../environments/environment';
import { Menu } from '../../models/menu.model';
import { MenuPermissionNode, User } from '../../models/user.model';
import {
  buildMenuPermissionTree,
  clonePermissionTree,
  flattenPermissionTree,
  setAllSelected,
  toggleNodeSelection,
  togglePermission,
} from '../../utils/tree';

@Component({
  selector: 'app-users',
  imports: [ReactiveFormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private menuService = inject(MenuService);
  private auth = inject(AuthService);
  private alert = inject(AlertService);

  protected readonly users = signal<User[]>([]);
  protected readonly menus = signal<Menu[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly search = signal('');

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  /** Source of truth for the permission tree shown in the form. */
  private readonly tree = signal<MenuPermissionNode[]>([]);
  protected readonly flatNodes = computed(() => flattenPermissionTree(this.tree()));

  protected readonly form = this.fb.nonNullable.group({
    userName: ['', Validators.required],
    password: [''],
    isActive: [true],
  });

  protected readonly filteredUsers = computed(() => {
    const term = this.search().trim().toLowerCase();
    const list = this.users();
    if (!term) return list;
    return list.filter(u => (u.userName ?? u.username ?? '').toLowerCase().includes(term));
  });

  constructor() {
    this.loadUsers();
    this.loadMenus();
  }

  loadUsers() {
    this.loading.set(true);
    this.error.set('');
    this.userService.search({ companyID: environment.companyCode }).subscribe({
      next: data => {
        this.users.set(data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load users.');
        this.loading.set(false);
      },
    });
  }

  private loadMenus() {
    this.menuService.search({}).subscribe({
      next: data => this.menus.set(data ?? []),
      error: () => {},
    });
  }

  // ---- permission tree interactions ----
  onToggleNode(id: number, value: boolean) {
    this.tree.update(t => toggleNodeSelection(t, id, value));
  }

  onTogglePermission(id: number, permission: string, value: boolean) {
    this.tree.update(t => togglePermission(t, id, permission, value));
  }

  selectAll() {
    this.tree.update(t => setAllSelected(t, true));
  }

  clearAll() {
    this.tree.update(t => setAllSelected(t, false));
  }

  // ---- form lifecycle ----
  openCreate() {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({ userName: '', password: '', isActive: true });
    this.form.controls.password.addValidators(Validators.required);
    this.form.controls.password.updateValueAndValidity();
    this.tree.set(buildMenuPermissionTree(this.menus(), false));
    this.showForm.set(true);
  }

  openEdit(user: User) {
    this.editingId.set(user.id ?? null);
    this.formError.set('');
    this.form.reset({
      userName: user.userName ?? user.username ?? '',
      password: '',
      isActive: user.isActive,
    });
    // Password optional on edit (blank = keep existing).
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.showForm.set(true);

    // Pull the user's saved permission tree from GenerateTreeData.
    if (user.id != null) {
      this.menuService.generateTree(user.id).subscribe({
        next: tree => this.applyTree(tree as MenuPermissionNode[]),
        error: () => this.applyTree(user.menuPermissions),
      });
    } else {
      this.applyTree(user.menuPermissions);
    }
  }

  private applyTree(saved: MenuPermissionNode[] | undefined) {
    if (saved && saved.length > 0) {
      this.tree.set(clonePermissionTree(saved));
    } else {
      this.tree.set(buildMenuPermissionTree(this.menus(), false));
    }
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
    const id = this.editingId();
    const postBy = this.actor();
    this.saving.set(true);
    this.formError.set('');

    if (id == null) {
      const payload: User = {
        username: v.userName.trim(),
        password: v.password,
        companyID: environment.companyCode,
        isActive: v.isActive,
        postBy,
        menuPermissions: this.tree(),
      };
      this.userService.add(payload).subscribe({
        next: () => this.onSaved('created'),
        error: () => this.onSaveError(),
      });
    } else {
      const payload: User = {
        id: id,
        userName: v.userName.trim(),
        isActive: v.isActive,
        postBy,
        updateBy: postBy,
        menuPermissions: this.tree(),
      };
      if (v.password) payload.password = v.password;
      this.userService.update(id, payload).subscribe({
        next: () => this.onSaved('updated'),
        error: () => this.onSaveError(),
      });
    }
  }

  private onSaved(action: 'created' | 'updated') {
    this.saving.set(false);
    this.showForm.set(false);
    this.alert.success(`User ${action} successfully.`);
    this.loadUsers();
  }

  private onSaveError() {
    this.saving.set(false);
    this.formError.set('Failed to save the user.');
    this.alert.error('Failed to save the user.');
  }

  async remove(user: User) {
    console.log('Attempting to delete user:', user);
    if (user.id == null) return;
    if (!(await this.alert.confirmDelete(`user "${user.userName ?? user.username}"`))) return;
    this.userService.delete(user.id).subscribe({
      next: () => {
        this.alert.success('User deleted successfully.');
        this.loadUsers();
      },
      error: () => {
        this.error.set('Failed to delete the user.');
        this.alert.error('Failed to delete the user.');
      },
    });
  }

  private actor(): string {
    const user = this.auth.getUser();
    return user?.userName ?? user?.username ?? 'admin';
  }
}
