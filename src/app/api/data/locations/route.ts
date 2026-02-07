import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ locations: [] });
    }

    // Get timeframe from query params
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30d';

    // Calculate date range
    let startDate = new Date();
    switch (timeframe) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date('2000-01-01');
        break;
    }

    // Fetch purchase locations from database
    const { data: locations, error } = await supabase
      .from('purchase_locations')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching locations:', error);
      return NextResponse.json({ locations: [] });
    }

    // Transform data for the globe
    const transformedLocations = (locations || []).map(loc => ({
      id: loc.id,
      lat: loc.latitude,
      lng: loc.longitude,
      name: loc.merchant_name || loc.address,
      amount: loc.amount,
      date: loc.date,
      category: loc.category || 'Other',
    }));

    return NextResponse.json({ locations: transformedLocations });
  } catch (error) {
    console.error('Error in locations API:', error);
    return NextResponse.json({ locations: [] }, { status: 500 });
  }
}
