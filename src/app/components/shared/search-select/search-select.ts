import { Component, computed, ElementRef, inject, input, model, signal } from '@angular/core';

/** One selectable entry. `value` is what the parent stores; `label` is shown. */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * A searchable dropdown that supports both single- and multi-selection.
 * The selected `value` is a string array in both modes (single mode keeps at
 * most one entry), so parents bind it uniformly with `[(value)]`.
 */
@Component({
  selector: 'app-search-select',
  templateUrl: './search-select.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class SearchSelect {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly options = input<SelectOption[]>([]);
  readonly placeholder = input('Select…');
  readonly multiple = input(true);
  /** Id applied to the trigger so an external <label for> can target it. */
  readonly inputId = input('');

  /** Two-way bound selection (always an array; single mode holds 0–1 items). */
  readonly value = model<string[]>([]);

  protected readonly open = signal(false);
  protected readonly search = signal('');

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const list = this.options();
    if (!term) return list;
    return list.filter(o => o.label.toLowerCase().includes(term));
  });

  private readonly selectedSet = computed(() => new Set(this.value()));

  /** Trigger text: placeholder, the single label, or an "N selected" summary. */
  protected readonly triggerLabel = computed(() => {
    const selected = this.value();
    if (!selected.length) return this.placeholder();
    const options = this.options();
    const labelFor = (v: string) => options.find(o => o.value === v)?.label ?? v;
    if (!this.multiple() || selected.length === 1) return labelFor(selected[0]);
    return `${selected.length} selected`;
  });

  protected toggleOpen(event: Event) {
    event.stopPropagation();
    this.open.update(o => !o);
    if (this.open()) this.search.set('');
  }

  protected onDocumentClick(event: Event) {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  protected isSelected(value: string): boolean {
    return this.selectedSet().has(value);
  }

  protected toggleOption(option: SelectOption) {
    if (this.multiple()) {
      const set = new Set(this.value());
      if (set.has(option.value)) set.delete(option.value);
      else set.add(option.value);
      this.value.set([...set]);
    } else {
      this.value.set([option.value]);
      this.open.set(false);
    }
  }

  protected clear(event: Event) {
    event.stopPropagation();
    this.value.set([]);
  }
}
