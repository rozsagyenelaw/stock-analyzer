import { useEffect, useRef } from 'react';
import { calculateVolumeProfile, CandleData } from '@/utils/technicalIndicators';

interface VolumeProfileProps {
  data: CandleData[];
  height: number;
  width?: number;
}

export default function VolumeProfile({ data, height, width = 200 }: VolumeProfileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate volume profile
    const profile = calculateVolumeProfile(data, 24);
    if (profile.length === 0) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find price range
    const prices = profile.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Find max volume for scaling
    const maxVolume = Math.max(...profile.map(p => p.volume));

    // Draw volume bars
    const barHeight = height / profile.length;

    profile.forEach((level, index) => {
      const y = height - (index + 1) * barHeight;
      const barWidth = (level.volume / maxVolume) * (width * 0.9);

      // Draw bar
      ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'; // Blue with transparency
      ctx.fillRect(0, y, barWidth, barHeight - 1);

      // Draw price label (every 4th level)
      if (index % 4 === 0) {
        ctx.fillStyle = '#9ca3af'; // Gray text
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(level.price.toFixed(2), width - 5, y + barHeight / 2 + 3);
      }
    });

    // Draw POC (Point of Control - highest volume level)
    const pocIndex = profile.findIndex(p => p.volume === maxVolume);
    if (pocIndex >= 0) {
      const pocY = height - (pocIndex + 1) * barHeight + barHeight / 2;
      ctx.strokeStyle = '#ef4444'; // Red
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, pocY);
      ctx.lineTo(width, pocY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw value area (70% of volume)
    let cumulativeVolume = 0;
    const totalVolume = profile.reduce((sum, p) => sum + p.volume, 0);
    const sortedProfile = [...profile].sort((a, b) => b.volume - a.volume);

    const valueAreaLevels: number[] = [];
    for (const level of sortedProfile) {
      cumulativeVolume += level.volume;
      valueAreaLevels.push(level.price);
      if (cumulativeVolume >= totalVolume * 0.7) break;
    }

    const valueAreaHigh = Math.max(...valueAreaLevels);
    const valueAreaLow = Math.min(...valueAreaLevels);

    // Highlight value area
    const vahIndex = profile.findIndex(p => Math.abs(p.price - valueAreaHigh) < priceRange / profile.length);
    const valIndex = profile.findIndex(p => Math.abs(p.price - valueAreaLow) < priceRange / profile.length);

    if (vahIndex >= 0 && valIndex >= 0) {
      const vahY = height - (vahIndex + 1) * barHeight;
      const valY = height - (valIndex + 1) * barHeight + barHeight;

      ctx.fillStyle = 'rgba(34, 197, 94, 0.1)'; // Green overlay
      ctx.fillRect(0, vahY, width, valY - vahY);
    }

  }, [data, height, width]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="border-l border-gray-300 dark:border-gray-600" />
      <div className="absolute top-2 left-2 text-xs">
        <div className="bg-gray-800 bg-opacity-90 text-white px-2 py-1 rounded space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500"></div>
            <span>POC</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 bg-opacity-20 border border-green-500"></div>
            <span>Value Area</span>
          </div>
        </div>
      </div>
    </div>
  );
}
