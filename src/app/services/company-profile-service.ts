import { Service, computed, signal } from '@angular/core';
import { CompanyProfile } from '../models/company-profile.model';

/** URL of the runtime-editable profile served from the `public/` folder. */
const PROFILE_URL = 'company-profile.json';

/** Used when the JSON is missing or fails to load, so reports still render. */
const DEFAULT_PROFILE: CompanyProfile = {
  name: 'Account Pro',
  address: '',
  contact: '',
  marginTop: 10,
};

/**
 * Holds the {@link CompanyProfile} used in the letterhead of every printed
 * accounts report. The profile is loaded at app startup from
 * `public/company-profile.json` — editing that file and reloading the page
 * updates every report **without a rebuild**. Exposed as a signal so the
 * letterhead updates reactively wherever it is shown.
 */
@Service()
export class CompanyProfileService {
  private readonly _profile = signal<CompanyProfile>(DEFAULT_PROFILE);

  /** The active letterhead profile. */
  readonly profile = this._profile.asReadonly();

  /** Top margin of the report sheet, in millimetres. */
  readonly marginTop = computed(() => this._profile().marginTop);

  /**
   * Fetch the profile JSON from the `public/` folder. Cache-busted so edits to
   * the file are picked up on the next page load without a rebuild. Falls back
   * to the existing profile on any error. Called once from an app initializer.
   */
  async load(): Promise<void> {
    try {
      const res = await fetch(`${PROFILE_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<CompanyProfile>;
      this._profile.set({
        name: String(data.name ?? DEFAULT_PROFILE.name),
        address: String(data.address ?? ''),
        contact: String(data.contact ?? ''),
        marginTop: Number.isFinite(Number(data.marginTop))
          ? Number(data.marginTop)
          : DEFAULT_PROFILE.marginTop,
      });
    } catch {
      // Keep the default profile if the file is unreachable or malformed.
    }
  }

  /** Replace the whole profile (e.g. after loading company settings). */
  setProfile(profile: CompanyProfile): void {
    this._profile.set(profile);
  }

  /** Patch one or more fields of the active profile. */
  patchProfile(patch: Partial<CompanyProfile>): void {
    this._profile.update(current => ({ ...current, ...patch }));
  }
}
