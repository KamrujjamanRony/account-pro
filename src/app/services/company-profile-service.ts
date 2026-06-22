import { Service, computed, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { CompanyProfile } from '../models/company-profile.model';

/**
 * Holds the {@link CompanyProfile} used in the letterhead of every printed
 * accounts report. Seeded with a sensible default (falling back to the
 * configured company) and exposed as a signal so the profile can be swapped at
 * runtime — e.g. once a company's settings are fetched from the API — and every
 * report header updates reactively.
 */
@Service()
export class CompanyProfileService {
  private readonly _profile = signal<CompanyProfile>({
    name: 'Mawna Diabetic Association',
    address: 'Easy Life Bhaban, Mawna Bazar Road Mawna Chowrasta, 1740',
    contact: '0171-0000000, 01711-000000',
    marginTop: 0,
  });

  /** The active letterhead profile. */
  readonly profile = this._profile.asReadonly();

  /** Top margin of the report sheet, in millimetres. */
  readonly marginTop = computed(() => this._profile().marginTop);

  /** Replace the whole profile (e.g. after loading company settings). */
  setProfile(profile: CompanyProfile): void {
    this._profile.set(profile);
  }

  /** Patch one or more fields of the active profile. */
  patchProfile(patch: Partial<CompanyProfile>): void {
    this._profile.update(current => ({ ...current, ...patch }));
  }
}
