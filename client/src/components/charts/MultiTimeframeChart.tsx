import { useEffect, useRef } from 'react';
import { createChart, IChartApi, CandlestickData, Time } from 'lightweight-charts';
import { CandleData } from '@/utils/technicalIndicators';

interface MultiTimeframeChartProps {
  symbol: string;
  data: CandleData[];
  timeframe: string;
  height?: number;
}

export default function MultiTimeframeChart({
  symbol,
  data,
  timeframe,
  height = 300,
}: MultiTimeframeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: '#1f2937' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Format data
    const formattedData: CandlestickData[] = data
      .map((item) => ({
        time: (new Date(item.datetime).getTime() / 1000) as Time,
        open: parseFloat(String(item.open)),
        high: parseFloat(String(item.high)),
        low: parseFloat(String(item.low)),
        close: parseFloat(String(item.close)),
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    candlestickSeries.setData(formattedData);

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height]);

  return (
    <div className="border border-gray-700 rounded-lg p-2">
      <div className="text-sm font-semibold mb-2 text-gray-300">
        {symbol} - {timeframe}
      </div>
      <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />
    </div>
  );
}
