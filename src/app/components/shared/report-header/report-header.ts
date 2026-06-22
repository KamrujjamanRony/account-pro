import { Component, inject, input } from '@angular/core';
import { CompanyProfileService } from '../../../services/company-profile-service';

/**
 * Professional letterhead shared by every printed accounts report. Renders the
 * company name / address / contact from the active {@link CompanyProfileService}
 * profile, the report {@link title}, and a projected meta line (date range,
 * cost center, etc.). The profile's `marginTop` (in mm) is applied as the top
 * margin of the sheet so spacing is consistent on screen and in print.
 *
 * Usage:
 * ```html
 * <app-report-header [title]="r.title">
 *   Date: {{ fmtDate(r.fromDate) }} to {{ fmtDate(r.toDate) }}
 * </app-report-header>
 * ```
 */
@Component({
  selector: 'app-report-header',
  template: `
    <header class="report-letterhead mb-6 text-center" [style.marginTop.mm]="marginTop()">
      <h2 class="text-2xl font-bold tracking-tight text-neutral-900">{{ profile().name }}</h2>
      @if (profile().address) {
        <p class="mt-0.5 text-xs text-neutral-600">{{ profile().address }}</p>
      }
      @if (profile().contact) {
        <p class="text-xs text-neutral-600">Contact: {{ profile().contact }}</p>
      }
      <p class="mt-2 text-base font-semibold text-neutral-800">{{ title() }}</p>
      <p class="mt-0.5 text-sm font-medium text-neutral-600">
        <ng-content />
      </p>
    </header>
  `,
})
export class ReportHeader {
  private readonly profileService = inject(CompanyProfileService);

  /** Report title shown under the company details, e.g. "Trial Balance". */
  readonly title = input('');

  /** Active letterhead profile (company name / address / contact). */
  protected readonly profile = this.profileService.profile;

  /** Top margin of the sheet, in millimetres, from the active profile. */
  protected readonly marginTop = this.profileService.marginTop;
}
