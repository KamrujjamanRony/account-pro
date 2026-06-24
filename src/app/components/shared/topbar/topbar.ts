import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Breadcrumb } from '../../../utils/breadcrumb/breadcrumb';
import { AuthService } from '../../../services/auth-service';
import { ThemeService } from '../../../services/theme-service';
import { LayoutService } from '../../../services/layout-service';

/** A day cell in the calendar grid. */
interface DayCell {
  date: Date;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

/**
 * Fixed application top bar: breadcrumb on the left; live clock, a calendar
 * popover and the signed-in user on the right.
 */
@Component({
  selector: 'app-topbar',
  imports: [Breadcrumb],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
  host: {
    // Close the calendar when clicking anywhere outside it.
    '(document:click)': 'closeCalendar()',
  },
})
export class Topbar implements OnDestroy {
  private auth = inject(AuthService);
  private theme = inject(ThemeService);
  protected readonly layout = inject(LayoutService);

  /** True when the dark theme is active — drives the toggle button UI. */
  protected readonly isDark = this.theme.isDark;

  protected readonly user = this.auth.currentUser;
  protected readonly userName = computed(() => {
    const u = this.user();
    return u?.userName || u?.username || 'User';
  });
  protected readonly initial = computed(() => this.userName().charAt(0).toUpperCase());

  /** Ticks every second to drive the live clock. */
  private readonly now = signal(new Date());
  private timer = setInterval(() => this.now.set(new Date()), 1000);

  protected readonly time = computed(() =>
    new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(this.now()),
  );

  protected readonly dateLabel = computed(() =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(this.now()),
  );

  // ---- Calendar -----------------------------------------------------------
  protected readonly calendarOpen = signal(false);
  private readonly viewYear = signal(new Date().getFullYear());
  private readonly viewMonth = signal(new Date().getMonth());

  protected readonly weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
      new Date(this.viewYear(), this.viewMonth(), 1),
    ),
  );

  /** 6×7 day grid for the viewed month, padded with adjacent-month days. */
  protected readonly days = computed<DayCell[]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    const today = new Date();

    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return {
        date,
        day: date.getDate(),
        inMonth: date.getMonth() === month,
        isToday: this.isSameDay(date, today),
      };
    });
  });

  /** Switch between light and dark themes. */
  toggleTheme() {
    this.theme.toggle();
  }

  toggleCalendar(event: Event) {
    event.stopPropagation();
    this.calendarOpen.update(v => !v);
  }

  closeCalendar() {
    this.calendarOpen.set(false);
  }

  prevMonth() {
    this.shiftMonth(-1);
  }

  nextMonth() {
    this.shiftMonth(1);
  }

  goToday() {
    const today = new Date();
    this.viewYear.set(today.getFullYear());
    this.viewMonth.set(today.getMonth());
  }

  private shiftMonth(delta: number) {
    const date = new Date(this.viewYear(), this.viewMonth() + delta, 1);
    this.viewYear.set(date.getFullYear());
    this.viewMonth.set(date.getMonth());
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
