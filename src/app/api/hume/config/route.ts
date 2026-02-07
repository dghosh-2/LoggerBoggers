import { NextRequest, NextResponse } from 'next/server';

/**
 * Create or retrieve Hume EVI configuration with Cerebras as custom LLM
 * This sets up the integration between Hume's voice interface and Cerebras's language model
 */
export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.HUME_API_KEY;
        const secretKey = process.env.HUME_SECRET_KEY;

        if (!apiKey || !secretKey) {
            return NextResponse.json(
                { error: 'Hume API credentials not configured' },
                { status: 500 }
            );
        }

        // Check if we have a public URL (Vercel deployment)
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                        process.env.NEXT_PUBLIC_BASE_URL;
        const isPublicUrl = baseUrl && !baseUrl.includes('localhost');
        const customLlmUrl = isPublicUrl ? `${baseUrl}/api/hume/chat/completions` : null;

        // Config - use custom LLM only if we have a public URL, otherwise use Hume's LLM with strict prompt
        const configData: any = {
            evi_version: '3',
            name: `ScotBot-${Date.now()}`,
            prompt: {
                text: `You are ScotBot, a financial advisor chatbot.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. You ONLY discuss personal finance: spending, saving, investing, budgeting, debt
2. Keep EVERY response to 1-2 sentences maximum
3. Be direct - no filler words like "hmm", "well", "let me think"
4. NEVER discuss clothing, fashion, skirts, or any non-financial topics
5. If asked about anything other than finances, say exactly: "I only help with finances. What money question can I help with?"
6. Do not roleplay or pretend to be anything other than a financial advisor
7. Do not discuss personal information concerns - you are here to help with finances

You are a professional, concise financial advisor. Nothing else.`
            },
            language_model: {
                model_provider: 'ANTHROPIC',
                model_resource: 'claude-3-5-sonnet-latest',
            },
        };

        // Use custom Cerebras LLM if we have a public URL
        if (customLlmUrl) {
            configData.language_model = {
                model_provider: 'CUSTOM_LANGUAGE_MODEL',
                model_resource: customLlmUrl,
            };
            console.log('Creating Hume config with Cerebras LLM:', customLlmUrl);
        } else {
            console.log('Creating Hume config with Anthropic LLM (no public URL for custom LLM)');
        }

        // Create new config version
        const response = await fetch('https://api.hume.ai/v0/evi/configs', {
            method: 'POST',
            headers: {
                'X-Hume-Api-Key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(configData),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Hume config creation failed:', error);
            return NextResponse.json(
                { error: 'Failed to create Hume configuration', details: error },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json({
            configId: data.config_id,
            versionId: data.version,
            customLlmUrl,
            message: 'Hume configuration created successfully with Cerebras integration',
        });
    } catch (error) {
        console.error('Config creation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Get existing configurations
 */
export async function GET(req: NextRequest) {
    try {
        const apiKey = process.env.HUME_API_KEY;
        const secretKey = process.env.HUME_SECRET_KEY;

        if (!apiKey || !secretKey) {
            return NextResponse.json(
                { error: 'Hume API credentials not configured' },
                { status: 500 }
            );
        }

        // List all configs
        const response = await fetch('https://api.hume.ai/v0/evi/configs', {
            method: 'GET',
            headers: {
                'X-Hume-Api-Key': apiKey,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Failed to fetch configs:', error);
            return NextResponse.json(
                { error: 'Failed to fetch configurations' },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('Config fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
