import { Component, OnDestroy, effect, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/**
 * Animates a number from its previous value up to {@link value} using an
 * ease-out curve. Honours `prefers-reduced-motion` (snaps instantly) and
 * formats the output with {@link DecimalPipe} via {@link format}.
 */
@Component({
  selector: 'app-count-up',
  imports: [DecimalPipe],
  template: `<span>{{ display() | number: format() }}</span>`,
})
export class CountUp implements OnDestroy {
  /** Target value to animate towards. */
  readonly value = input(0);
  /** Animation length in milliseconds. */
  readonly duration = input(200);
  /** DecimalPipe digits format, e.g. "1.0-0". */
  readonly format = input('1.0-0');

  protected readonly display = signal(0);
  private frame = 0;

  constructor() {
    effect(() => this.animateTo(this.value()));
  }

  private animateTo(target: number): void {
    if (typeof requestAnimationFrame === 'undefined' || this.prefersReducedMotion()) {
      this.display.set(target);
      return;
    }
    cancelAnimationFrame(this.frame);
    const start = this.display();
    const startTime = performance.now();
    const span = target - start;
    const duration = this.duration();

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      this.display.set(start + span * eased);
      if (t < 1) this.frame = requestAnimationFrame(step);
      else this.display.set(target);
    };
    this.frame = requestAnimationFrame(step);
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  ngOnDestroy(): void {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.frame);
  }
}
