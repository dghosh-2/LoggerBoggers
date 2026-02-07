import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/openai';

// Helper to clean markdown formatting from text
function cleanMarkdown(text: string): string {
    return text
        // Remove bold markers
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        // Remove italic markers
        .replace(/\*([^*]+)\*/g, '$1')
        // Remove underscores for bold/italic
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
        // Clean up line breaks with asterisks
        .replace(/\n\s*\*\*\s*/g, '\n')
        .trim();
}

export async function POST(request: NextRequest) {
    try {
        const { query, stocks, extractedQuestions = [], dedalusContext = '' } = await request.json();

        if (!query || !stocks) {
            return NextResponse.json(
                { error: 'Query and stocks data are required' },
                { status: 400 }
            );
        }

        const userContext = 'No user profile available.';

        // Build stock summary
        const stockSummary = stocks.map((stock: any) => {
            const latestPrice = stock.data[stock.data.length - 1]?.close || 0;
            const oldestPrice = stock.data[0]?.close || 0;
            const change = ((latestPrice - oldestPrice) / oldestPrice) * 100;

            return `${stock.symbol} (${stock.name}): Current $${latestPrice.toFixed(2)}, ${change > 0 ? '+' : ''}${change.toFixed(2)}% over period`;
        }).join('\n');

        // Build questions section if there are extracted questions
        const questionsSection = extractedQuestions.length > 0 
            ? `\n\nUser's Specific Questions to Answer:\n${extractedQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}\n\nPlease provide direct answers to each question above.`
            : '';

        // Build Dedalus research context section
        const dedalusSection = dedalusContext 
            ? `\n\n=== Real-Time Research from Dedalus ===\n${dedalusContext}\n=== End Research ===\n\nUse the above real-time research to enhance your recommendations with current news, analyst opinions, and market sentiment.`
            : '';

        // Generate personalized recommendations
        const recommendationPrompt = `
${userContext}

Query: ${query}

Stock Performance Summary:
${stockSummary}
${dedalusSection}
${questionsSection}

Based on the user's profile (age, risk tolerance, financial situation), the stocks they're viewing, and any real-time research provided, provide:
1. A clear summary recommendation (2-3 sentences)
2. 3-4 specific insights about these stocks relevant to this user
3. Contextual advice tailored to their risk tolerance and life stage
4. How this aligns with their stated risk tolerance
${extractedQuestions.length > 0 ? '5. Direct answers to each of the user\'s specific questions' : ''}
${dedalusContext ? '6. Incorporate any relevant news or analyst opinions from the research' : ''}

Be specific, actionable, and personalized. Consider their age, risk tolerance, debt, and income status.
Do NOT use markdown formatting like **bold** or *italic*. Use plain text only.
`;

        const rawResponse = await generateText(
            'You are a certified financial advisor providing personalized investment insights. Always respond in plain text without markdown formatting.',
            recommendationPrompt
        );
        
        // Clean any markdown that might still be in the response
        const response = cleanMarkdown(rawResponse);

        // Parse the response into structured format
        const sections = response.split('\n\n').filter(s => s.trim());
        
        // Get summary - first paragraph or first 2-3 sentences
        let summary = sections[0] || '';
        // Limit summary to ~300 chars
        if (summary.length > 350) {
            const sentences = summary.match(/[^.!?]+[.!?]+/g) || [summary];
            summary = sentences.slice(0, 2).join(' ').trim();
            if (summary.length > 350) {
                summary = summary.substring(0, 347) + '...';
            }
        }

        // Extract insights (look for numbered or bulleted lists)
        const insights: { title: string; description: string; relevance: string }[] = [];
        for (const section of sections.slice(1)) { // Skip first section (summary)
            // Check for numbered items like "1." or "2."
            const lines = section.split('\n');
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.match(/^\d+\.\s+/) || trimmedLine.match(/^[-•]\s+/)) {
                    const text = trimmedLine.replace(/^\d+\.\s*|^-\s*|^•\s*/, '').trim();
                    if (text && text.length > 10) {
                        // Try to extract title:description format
                        const colonIndex = text.indexOf(':');
                        if (colonIndex > 0 && colonIndex < 50) {
                            insights.push({
                                title: text.substring(0, colonIndex).trim(),
                                description: text.substring(colonIndex + 1).trim(),
                                relevance: 'Based on your profile',
                            });
                        } else {
                            // Use first few words as title
                            const words = text.split(' ');
                            insights.push({
                                title: words.slice(0, 3).join(' '),
                                description: text,
                                relevance: 'Based on your profile',
                            });
                        }
                    }
                }
            }
        }

        // Limit to 4 insights max
        const limitedInsights = insights.slice(0, 4);

        // Extract question answers if there were extracted questions
        const questionAnswers: { question: string; answer: string }[] = [];
        if (extractedQuestions.length > 0) {
            for (const question of extractedQuestions) {
                // Try to find an answer in the response
                const answerMatch = response.match(new RegExp(`${question.replace(/[?]/g, '\\?')}[:\\s]*([^\\n]+)`, 'i'));
                if (answerMatch) {
                    questionAnswers.push({ question, answer: answerMatch[1].trim() });
                } else {
                    // Generate a generic answer based on the summary
                    questionAnswers.push({ question, answer: summary || 'Based on the analysis, please see the insights above.' });
                }
            }
        }

        const recommendation = {
            summary,
            insights: limitedInsights,
            contextualAdvice: sections.find(s => s.toLowerCase().includes('advice') || s.toLowerCase().includes('consider'))?.substring(0, 300) || '',
            riskAlignment: sections.find(s => s.toLowerCase().includes('risk'))?.substring(0, 300) || '',
            questionAnswers,
        };

        return NextResponse.json(recommendation);
    } catch (error: any) {
        console.error('Recommendations error:', error);
        return NextResponse.json(
            { error: 'Failed to generate recommendations', details: error.message },
            { status: 500 }
        );
    }
}
