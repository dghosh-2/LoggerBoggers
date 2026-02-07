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

        // Get the base URL for the custom LLM endpoint
        const { searchParams } = new URL(req.url);
        const baseUrl = searchParams.get('baseUrl') ||
                       (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                        process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');

        const customLlmUrl = `${baseUrl}/api/hume/chat/completions`;

        // Create Basic auth header
        const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

        // Create EVI configuration with Hume's default model but custom prompt
        const useCustomLLM = searchParams.get('useCustomLLM') === 'true';

        const configData: any = {
            name: useCustomLLM ? 'ScotBot with Cerebras' : 'ScotBot Financial Assistant',
            version_description: useCustomLLM
                ? 'Financial assistant powered by Cerebras LLM'
                : 'Financial assistant with Hume default model',
            prompt: {
                text: `You are ScotBot, a personal financial assistant.

Your role:
- Help users with questions about their spending, investments, and financial planning
- Provide specific, actionable financial advice
- Keep responses concise and conversational for voice
- Be warm, friendly, and empathetic

Important: You are ONLY a financial assistant. Do not discuss topics outside of personal finance, budgeting, investments, or money management. If asked about non-financial topics, politely redirect to financial matters.

Keep responses to 2-3 sentences unless more detail is requested.`
            },
            voice: {
                provider: 'HUME_AI',
                name: 'ITO', // Warm, friendly voice
            },
            ellm_model: {
                allow_short_responses: true,
            },
        };

        // Only add custom LLM if explicitly requested and URL provided
        if (useCustomLLM && customLlmUrl) {
            configData.language_model = {
                model_provider: 'CUSTOM_LANGUAGE_MODEL',
                model_resource: customLlmUrl,
            };
        }

        // Create new config version
        const response = await fetch('https://api.hume.ai/v0/evi/configs', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
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

        const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

        // List all configs
        const response = await fetch('https://api.hume.ai/v0/evi/configs', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
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
