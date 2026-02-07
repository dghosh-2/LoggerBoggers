'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

// Dynamically import Globe to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

interface PurchaseLocation {
  id: string;
  lat: number;
  lng: number;
  name: string;
  amount: number;
  date: string;
  category: string;
}

interface PurchaseGlobeProps {
  locations: PurchaseLocation[];
  isLoading?: boolean;
}

export function PurchaseGlobe({ locations, isLoading }: PurchaseGlobeProps) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<PurchaseLocation | null>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [globeReady, setGlobeReady] = useState(false);

  // Check WebGL support
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebGLSupported(!!gl);
    } catch (e) {
      setWebGLSupported(false);
    }
  }, []);

  // Set dimensions based on container
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width || containerRef.current.offsetWidth || 800;
        const height = rect.height || containerRef.current.offsetHeight || 600;
        setDimensions({ width, height });
      } else {
        // Fallback dimensions
        setDimensions({ width: 800, height: 600 });
      }
    };

    // Initial update
    updateDimensions();

    // Also update after a short delay in case layout isn't ready
    const timer = setTimeout(updateDimensions, 50);

    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Auto-rotate globe
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      globeRef.current.controls().enableZoom = true;
      globeRef.current.controls().enablePan = false;

      // Set initial position
      globeRef.current.pointOfView({ lat: 39.8, lng: -98.5, altitude: 2.5 }, 0);
    }
  }, [dimensions]);

  // Transform locations to globe points
  const pointsData = useMemo(() => {
    return locations.map(loc => ({
      ...loc,
      size: Math.min(0.8, 0.2 + (loc.amount / 500) * 0.3),
      color: getCategoryColor(loc.category),
    }));
  }, [locations]);

  // Generate arcs between consecutive purchases
  const arcsData = useMemo(() => {
    if (locations.length < 2) return [];

    const sortedLocs = [...locations].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const arcs = [];
    for (let i = 0; i < sortedLocs.length - 1; i++) {
      arcs.push({
        startLat: sortedLocs[i].lat,
        startLng: sortedLocs[i].lng,
        endLat: sortedLocs[i + 1].lat,
        endLng: sortedLocs[i + 1].lng,
        color: ['rgba(200, 30, 60, 0.6)', 'rgba(200, 30, 60, 0.1)'],
      });
    }
    return arcs;
  }, [locations]);

  if (!webGLSupported) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/90">
        <div className="text-center p-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center mb-4">
            <span className="text-2xl">🌍</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">WebGL Not Supported</h3>
          <p className="text-sm text-foreground-muted max-w-sm">
            Your browser doesn't support WebGL, which is required for the 3D globe.
            Try using Chrome, Firefox, or Safari with hardware acceleration enabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-black"
      style={{ minHeight: '500px', height: '100%' }}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={0.01}
          pointRadius="size"
          pointColor="color"
          pointLabel={(d: any) => `
            <div style="background: rgba(17, 17, 19, 0.95); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); font-family: system-ui;">
              <div style="font-weight: 600; margin-bottom: 4px;">${d.name}</div>
              <div style="color: #4ADE80; font-family: monospace;">$${d.amount.toFixed(2)}</div>
              <div style="color: #71717A; font-size: 11px; margin-top: 2px;">${d.category} • ${new Date(d.date).toLocaleDateString()}</div>
            </div>
          `}
          onPointHover={(point: any) => setHoveredPoint(point)}
          arcsData={arcsData}
          arcColor="color"
          arcStroke={0.5}
          arcDashLength={0.5}
          arcDashGap={0.2}
          arcDashAnimateTime={2000}
          atmosphereColor="#C41230"
          atmosphereAltitude={0.15}
          onGlobeReady={() => setGlobeReady(true)}
        />
      )}

      {/* Stats overlay */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4">
        <p className="text-xs text-foreground-muted mb-1">Total Locations</p>
        <p className="text-2xl font-semibold font-mono">{locations.length}</p>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3">
        <p className="text-xs text-foreground-muted mb-2">Categories</p>
        <div className="space-y-1.5">
          {[
            { name: 'Food', color: '#F97316' },
            { name: 'Shopping', color: '#8B5CF6' },
            { name: 'Transport', color: '#3B82F6' },
            { name: 'Entertainment', color: '#EC4899' },
            { name: 'Other', color: '#6B7280' },
          ].map(cat => (
            <div key={cat.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-xs text-foreground-muted">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Food & Dining': '#F97316',
    'Food': '#F97316',
    'Restaurants': '#F97316',
    'Groceries': '#F97316',
    'Shopping': '#8B5CF6',
    'Retail': '#8B5CF6',
    'Transport': '#3B82F6',
    'Transportation': '#3B82F6',
    'Travel': '#3B82F6',
    'Entertainment': '#EC4899',
    'Recreation': '#EC4899',
  };
  return colors[category] || '#6B7280';
}
