'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe as GlobeIcon, Calendar, MapPin, DollarSign } from 'lucide-react';
import { PageTransition } from '@/components/layout/page-transition';
import { GlassCard } from '@/components/ui/glass-card';
import { PurchaseGlobe } from '@/components/globe/purchase-globe';

interface PurchaseLocation {
  id: string;
  lat: number;
  lng: number;
  name: string;
  amount: number;
  date: string;
  category: string;
}

type TimeFrame = '7d' | '30d' | '90d' | '1y' | 'all';

const TIME_FRAMES: { value: TimeFrame; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All Time' },
];

export default function GlobePage() {
  const [locations, setLocations] = useState<PurchaseLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('30d');
  const [stats, setStats] = useState({ totalSpent: 0, uniqueLocations: 0, topCategory: '' });
  const [cacheTableMissing, setCacheTableMissing] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, [timeFrame]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data/locations?timeframe=${timeFrame}`);
      const data = await response.json().catch(() => ({} as any));

      if (!response.ok) {
        console.error('Locations API returned non-OK:', response.status, data);
        setLocations([]);
        setCacheTableMissing(data?.cache_table_missing === true);
        return;
      }

      if (data.locations) {
        setLocations(data.locations);
        setCacheTableMissing(data.cache_table_missing === true);

        // Calculate stats
        const totalSpent = data.locations.reduce((sum: number, loc: PurchaseLocation) => sum + loc.amount, 0);
        const uniqueLocations = new Set(data.locations.map((loc: PurchaseLocation) => `${loc.lat},${loc.lng}`)).size;

        // Find top category
        const categoryCounts: Record<string, number> = {};
        data.locations.forEach((loc: PurchaseLocation) => {
          categoryCounts[loc.category] = (categoryCounts[loc.category] || 0) + 1;
        });
        const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

        setStats({ totalSpent, uniqueLocations, topCategory });
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <GlobeIcon className="w-6 h-6" />
              Purchase Globe
            </h1>
            <p className="text-foreground-muted text-sm mt-1">
              Visualize where you spend your money around the world
            </p>
          </div>

          {/* Time Frame Selector */}
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
            {TIME_FRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeFrame(tf.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  timeFrame === tf.value
                    ? 'bg-foreground text-background'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Total Spent</p>
                <p className="text-xl font-semibold font-mono">${stats.totalSpent.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-4 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Unique Locations</p>
                <p className="text-xl font-semibold font-mono">{stats.uniqueLocations}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Calendar className="w-5 h-5 text-foreground-muted" />
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Top Category</p>
                <p className="text-xl font-semibold">{stats.topCategory}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Globe - Always show the 3D globe */}
        <div className="rounded-xl bg-card border border-border overflow-hidden relative" style={{ height: '600px' }}>
          <PurchaseGlobe locations={locations} isLoading={loading} />
          {!loading && cacheTableMissing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="max-w-md text-center p-6 bg-card/85 backdrop-blur-sm border border-border rounded-xl">
                <p className="text-sm font-semibold">Missing Supabase table: purchase_locations</p>
                <p className="text-xs text-foreground-muted mt-2">
                  Create it by running `supabase/purchase_locations_schema.sql` in your Supabase SQL editor, then reload.
                </p>
              </div>
            </div>
          )}
          {!loading && locations.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="max-w-md text-center p-6 bg-card/85 backdrop-blur-sm border border-border rounded-xl">
                <p className="text-sm font-semibold">No locations to show yet</p>
                <p className="text-xs text-foreground-muted mt-2">
                  The globe needs an address for each transaction (for example, a Plaid location or a receipt address) so it
                  can geocode it into latitude/longitude.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Purchases List */}
        {locations.length > 0 && (
          <GlassCard delay={200}>
            <h2 className="text-sm font-semibold mb-4">Recent Purchases by Location</h2>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {locations.slice(0, 10).map((loc) => (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-foreground-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{loc.name}</p>
                      <p className="text-xs text-foreground-muted">{loc.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-mono">${loc.amount.toFixed(2)}</p>
                    <p className="text-xs text-foreground-muted">
                      {new Date(loc.date).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        )}

      </div>
    </PageTransition>
  );
}
