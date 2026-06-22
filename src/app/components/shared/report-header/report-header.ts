import { Component, inject, input } from '@angular/core';
import { CompanyProfileService } from '../../../services/company-profile-service';

/**
 * Professional letterhead shared by every printed accounts report. Renders the
 * company name (display font) / address / contact from the active
 * {@link CompanyProfileService} profile followed by a full-width bold rule, the
 * report {@link title}, and a projected meta line (date range, cost center,
 * etc.). The company block is omitted entirely when the profile `name` is empty
 * (e.g. printing onto pre-printed letterhead paper). The profile's `marginTop`
 * (in mm) is applied as the top margin of the sheet — the only source of top
 * spacing — so it is consistent on screen and in print.
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
}
