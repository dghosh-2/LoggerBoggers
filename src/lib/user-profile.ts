import { UserProfile } from "./schemas";

/**
 * Previously: read and parse a user profile persisted in `src/app/onboarding/data.md`.
 * Now: the app does not persist onboarding/profile data to disk.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  return null;
}

/**
 * Get context string for AI agents
 */
export async function getUserContext(): Promise<string> {
  const profile = await getUserProfile();
  if (!profile) return "No user profile available.";

  // Should be unreachable until a non-disk storage is implemented.
  return `User Profile:
- Age: ${profile.age}
- Location: ${profile.location}
- Risk Tolerance: ${profile.riskTolerance}
- Debt Profile: ${profile.debtProfile}
- Income Status: ${profile.incomeStatus}
${profile.customRequest ? `- Additional Info: ${profile.customRequest}` : ""}`;
}
