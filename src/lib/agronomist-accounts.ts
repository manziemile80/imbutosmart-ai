// The shared reviewer account for the agronomist dashboard.
//
// The address and the password are printed under the sign-in form on purpose:
// the account exists so a reviewer can open the workspace without waiting for
// an invitation, and it must never hold a farmer's private records. It is the
// only account treated this way — every other account still needs the
// agronomist role in app_metadata.
//
// The same address is listed in public.agronomist_allowlist by the migration
// supabase/migrations/20261026010000_agronomist_allowlist.sql, so the database
// agrees with this list. Add an address in both places, or neither.

export const DEMO_AGRONOMIST = {
  email: "manziemile1@gmail.com",
  password: "Manzi12345",
} as const;

// When the deployment's cloud sign-in cannot serve the shared account, the same
// printed credentials unlock a reviewer session that lives only in this browser.
// The password is still checked against the constant above; no other address is
// ever given a device session, and the record store stays on this device.
export const DEVICE_SESSION = {
  userId: "device-reviewer",
  name: "Shared reviewer account",
} as const;

/** The addresses that hold dashboard rights without an app_metadata role. */
export const AGRONOMIST_EMAILS: readonly string[] = [DEMO_AGRONOMIST.email];

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** True for an address listed here, whatever its app_metadata says. */
export function isAgronomistEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return AGRONOMIST_EMAILS.some((item) => normalizeEmail(item) === normalized);
}

/** True only for the shared account that the page prints. */
export function isDemoAgronomist(email: string | null | undefined): boolean {
  return normalizeEmail(email) === normalizeEmail(DEMO_AGRONOMIST.email);
}
