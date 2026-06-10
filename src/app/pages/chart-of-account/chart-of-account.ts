import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChartOfAccountService } from '../../services/chart-of-account-service';
import {
  ACCOUNT_NATURES,
  ChartOfAccount as Account,
  ChartTreeNode,
} from '../../models/chart-of-account.model';
import { FlatNode } from '../../utils/tree';

interface FlatTreeRow extends FlatNode<ChartTreeNode> {
  hasChildren: boolean;
  expanded: boolean;
}

@Component({
  selector: 'app-chart-of-account',
  imports: [ReactiveFormsModule],
  templateUrl: './chart-of-account.html',
  styleUrl: './chart-of-account.css',
})
export class ChartOfAccount {
  private fb = inject(FormBuilder);
  private service = inject(ChartOfAccountService);

  protected readonly natures = ACCOUNT_NATURES;

  protected readonly tab = signal<'tree' | 'data'>('tree');
  protected readonly tree = signal<ChartTreeNode[]>([]);
  protected readonly accounts = signal<Account[]>([]);
  protected readonly expanded = signal<Set<number>>(new Set());
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly search = signal('');

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly formParentId = signal<number | null>(null);
  protected readonly formParentName = signal<string>('');
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    nature: ['Asset'],
    isActive: [true],
  });

  /** Whether the account being added/edited is a root (level-1) account. */
  protected readonly isRoot = computed(() => this.formParentId() === null);

  /** Tree flattened to visible rows, respecting expand/collapse state. */
  protected readonly visibleRows = computed<FlatTreeRow[]>(() => {
    const expanded = this.expanded();
    const out: FlatTreeRow[] = [];
    const walk = (nodes: ChartTreeNode[], level: number) => {
      for (const node of nodes) {
        const hasChildren = (node.children?.length ?? 0) > 0;
        const isOpen = expanded.has(node.id);
        out.push({ node, level, hasChildren, expanded: isOpen });
        if (hasChildren && isOpen) walk(node.children, level + 1);
      }
    };
    walk(this.tree(), 0);
    return out;
  });

  protected readonly filteredAccounts = computed(() => {
    const term = this.search().trim().toLowerCase();
    const list = this.accounts();
    if (!term) return list;
    return list.filter(a => a.name.toLowerCase().includes(term));
  });

  private readonly nameById = computed(() => {
    const map = new Map<number, string>();
    for (const a of this.accounts()) if (a.id != null) map.set(a.id, a.name);
    return map;
  });

  constructor() {
    this.loadTree();
    this.loadAccounts();
  }

  setTab(tab: 'tree' | 'data') {
    this.tab.set(tab);
  }

  parentName(id: number | null): string {
    if (id == null) return '—';
    return this.nameById().get(id) ?? `#${id}`;
  }

  loadTree() {
    this.loading.set(true);
    this.error.set('');
    this.service.getTree().subscribe({
      next: data => {
        const tree = data ?? [];
        this.tree.set(tree);
        // Expand the first level by default for visibility.
        this.expanded.set(new Set(tree.map(n => n.id)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load the account tree.');
        this.loading.set(false);
      },
    });
  }

  loadAccounts() {
    this.service.search({}).subscribe({
      next: data => this.accounts.set(data ?? []),
      error: () => {},
    });
  }

  toggleExpand(id: number) {
    this.expanded.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ---- form lifecycle ----
  openCreateRoot() {
    this.editingId.set(null);
    this.formParentId.set(null);
    this.formParentName.set('');
    this.formError.set('');
    this.form.reset({ name: '', nature: 'Asset', isActive: true });
    this.showForm.set(true);
  }

  openCreateChild(parent: Account | ChartTreeNode) {
    this.editingId.set(null);
    this.formParentId.set(parent.id ?? null);
    this.formParentName.set(parent.name);
    this.formError.set('');
    this.form.reset({ name: '', nature: 'Asset', isActive: true });
    this.showForm.set(true);
  }

  openEdit(account: Account | ChartTreeNode) {
    this.editingId.set(account.id ?? null);
    this.formParentId.set(account.parentId ?? null);
    this.formParentName.set(account.parentId != null ? this.parentName(account.parentId) : '');
    this.formError.set('');
    this.form.reset({
      name: account.name,
      nature: account.nature ?? 'Asset',
      isActive: account.isActive,
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
    const parentId = this.formParentId();
    const payload: Account = {
      parentId,
      name: v.name.trim(),
      isActive: v.isActive,
      // Nature only applies to root accounts.
      nature: parentId === null ? v.nature : null,
    };
    const id = this.editingId();

    this.saving.set(true);
    this.formError.set('');
    const request = id == null ? this.service.add(payload) : this.service.update(id, payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.refresh();
      },
      error: () => {
        this.saving.set(false);
        this.formError.set('Failed to save the account.');
      },
    });
  }

  remove(account: Account | ChartTreeNode) {
    if (account.id == null) return;
    if (!confirm(`Delete account "${account.name}" and its sub-accounts?`)) return;
    this.service.delete(account.id).subscribe({
      next: () => this.refresh(),
      error: () => this.error.set('Failed to delete the account.'),
    });
  }

  seed() {
    if (!confirm('Seed the default chart of accounts?')) return;
    this.loading.set(true);
    this.service.seed().subscribe({
      next: () => this.refresh(),
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to seed accounts.');
      },
    });
  }

  private refresh() {
    this.loadTree();
    this.loadAccounts();
  }
}
