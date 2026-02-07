import { NextResponse } from 'next/server';
import { getConciseFinancialContext } from '@/lib/financial-context';

/**
 * API endpoint to fetch user's financial context for voice conversations
 */
export async function GET() {
    try {
        const context = await getConciseFinancialContext();

        return NextResponse.json({
            context,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error fetching financial context:', error);
        return NextResponse.json(
            { error: 'Failed to fetch financial context', context: '' },
            { status: 500 }
        );
    }
}
