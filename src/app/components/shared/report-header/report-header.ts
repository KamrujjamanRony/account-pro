import { Component, computed, inject, input } from '@angular/core';
import { CompanyProfileService } from '../../../services/company-profile-service';

/**
 * Professional letterhead shared by every printed accounts report. Renders a
 * monogram badge, the company name (display font) / address / contact from the
 * active {@link CompanyProfileService} profile, the report {@link title}, and a
 * projected meta line (date range, cost center, etc.). The profile's `marginTop`
 * (in mm) is applied as the top margin of the sheet so spacing is consistent on
 * screen and in print.
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
  templateUrl: './report-header.html',
  styleUrl: './report-header.css',
})
export class ReportHeader {
  private readonly profileService = inject(CompanyProfileService);

  /** Report title shown under the company details, e.g. "Trial Balance". */
  readonly title = input('');

  /** Active letterhead profile (company name / address / contact). */
  protected readonly profile = this.profileService.profile;

  /** Top margin of the sheet, in millimetres, from the active profile. */
  protected readonly marginTop = this.profileService.marginTop;

  /** Up to two uppercase initials taken from the company name for the badge. */
  protected readonly monogram = computed(() => {
    const words = this.profile().name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
    return letters.toUpperCase();
  });
}
