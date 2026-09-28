'use client';

import dynamic from 'next/dynamic';

const HeatmapLayer = dynamic(() => import('./HeatmapLayer'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-100 animate-pulse rounded-xl flex items-center justify-center">
      <p className="text-gray-400 text-sm font-medium">Loading map…</p>
    </div>
  ),
});

export default HeatmapLayer;
