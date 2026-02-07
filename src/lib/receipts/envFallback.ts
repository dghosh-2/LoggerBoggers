let cached: Record<string, string> | null = null;

function parseDotenv(content: string) {
    const out: Record<string, string> = {};
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq <= 0) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (key) out[key] = value;
    }
    return out;
}

async function loadRootEnvFile() {
    if (cached) return cached;
    try {
        const { readFile } = await import('node:fs/promises');
        const path = await import('node:path');
        // Try a few likely locations depending on where Next is started from.
        const candidates = [
            path.resolve(process.cwd(), '.env'),
            path.resolve(process.cwd(), '../.env'),
            path.resolve(process.cwd(), '../../.env'),
        ];
        for (const envPath of candidates) {
            try {
                const content = await readFile(envPath, 'utf8');
                cached = parseDotenv(content);
                break;
            } catch {
                // continue
            }
        }
        if (!cached) cached = {};
    } catch {
        cached = {};
    }
    return cached;
}

export async function getEnvFallback(key: string): Promise<string | undefined> {
    if (process.env[key] !== undefined) return process.env[key];
    const fileEnv = await loadRootEnvFile();
    return fileEnv[key];
}
