import fs from 'fs';
import path from 'path';
import { UserProfile, UserProfileSchema } from './schemas';

/**
 * Read and parse user profile from data.md
 */
export async function getUserProfile(): Promise<UserProfile | null> {
    try {
        const dataPath = path.join(process.cwd(), 'src', 'app', 'onboarding', 'data.md');

        if (!fs.existsSync(dataPath)) {
            console.warn('User profile data.md not found');
            return null;
        }

        const content = fs.readFileSync(dataPath, 'utf-8');

        // Parse markdown format
        const profile = parseUserProfile(content);

        // Validate with schema
        return UserProfileSchema.parse(profile);
    } catch (error) {
        console.error('Error reading user profile:', error);
        return null;
    }
}

/**
 * Parse user profile from markdown content
 */
function parseUserProfile(content: string): Partial<UserProfile> {
    const profile: any = {};

    // Extract age
    const ageMatch = content.match(/\*\*Age\*\*:\s*(\d+)/);
    if (ageMatch) {
        profile.age = parseInt(ageMatch[1], 10);
    }

    // Extract location
    const locationMatch = content.match(/\*\*Location\*\*:\s*(.+)/);
    if (locationMatch) {
        profile.location = locationMatch[1].trim();
    }

    // Extract risk tolerance
    const riskMatch = content.match(/\*\*Risk Tolerance\*\*:\s*(Low|Medium|High|Aggressive)/);
    if (riskMatch) {
        profile.riskTolerance = riskMatch[1];
    }

    // Extract debt profile
    const debtMatch = content.match(/\*\*Debt Profile\*\*:\s*(.+)/);
    if (debtMatch) {
        profile.debtProfile = debtMatch[1].trim();
    }

    // Extract income status
    const incomeMatch = content.match(/\*\*Income Status\*\*:\s*(.+)/);
    if (incomeMatch) {
        profile.incomeStatus = incomeMatch[1].trim();
    }

    // Extract custom request
    const customMatch = content.match(/\*\*Additional Requests\*\*:\s*(.+)/);
    if (customMatch) {
        profile.customRequest = customMatch[1].trim();
    }

    return profile;
}

/**
 * Get context string for AI agents
 */
export async function getUserContext(): Promise<string> {
    const profile = await getUserProfile();

    if (!profile) {
        return 'No user profile available.';
    }

    return `User Profile:
- Age: ${profile.age}
- Location: ${profile.location}
- Risk Tolerance: ${profile.riskTolerance}
- Debt Profile: ${profile.debtProfile}
- Income Status: ${profile.incomeStatus}
${profile.customRequest ? `- Additional Info: ${profile.customRequest}` : ''}`;
}
