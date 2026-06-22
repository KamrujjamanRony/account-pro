/**
 * Letterhead profile shared by every printed accounts report. Drives the
 * company name / address / contact lines and the top margin of the report
 * sheet so the printed document looks consistent across all reports.
 */
export interface CompanyProfile {
  /** Organisation name, shown as the bold first line of the letterhead. */
  name: string;
  /** Full postal address, shown under the name. */
  address: string;
  /** Contact numbers / email, shown under the address. */
  contact: string;
  /** Top margin of the report sheet, in millimetres (applied on screen & print). */
  marginTop: number;
}
