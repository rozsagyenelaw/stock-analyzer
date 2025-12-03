import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, LineData } from 'lightweight-charts';
import { TimeSeriesData } from '@/types';

interface AdvancedChartProps {
  symbol: string;
  data: TimeSeriesData[];
  height?: number;
}

export type ChartType = 'candlestick' | 'line' | 'area' | 'bars';

export default function AdvancedChart({ symbol, data, height = 500 }: AdvancedChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | ISeriesApi<'Bar'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [showVolume, setShowVolume] = useState(true);
  const [indicators, setIndicators] = useState<{
    sma20: boolean;
    sma50: boolean;
    sma200: boolean;
    ema: boolean;
    bb: boolean;
  }>({
    sma20: false,
    sma50: false,
    sma200: false,
    ema: false,
    bb: false,
  });

  // Format data for lightweight-charts
  const formatCandlestickData = (rawData: TimeSeriesData[]): CandlestickData[] => {
    return rawData
      .map((item) => ({
        time: (new Date(item.datetime).getTime() / 1000) as Time,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));
  };

  const formatLineData = (rawData: TimeSeriesData[]): LineData[] => {
    return rawData
      .map((item) => ({
        time: (new Date(item.datetime).getTime() / 1000) as Time,
        value: parseFloat(item.close),
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));
  };

  const formatVolumeData = (rawData: TimeSeriesData[]) => {
    return rawData
      .map((item, index) => {
        const prevClose = index > 0 ? parseFloat(rawData[index - 1].close) : parseFloat(item.close);
        const currentClose = parseFloat(item.close);

        return {
          time: (new Date(item.datetime).getTime() / 1000) as Time,
          value: parseFloat(item.volume),
          color: currentClose >= prevClose ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 82, 82, 0.5)',
        };
      })
      .sort((a, b) => (a.time as number) - (b.time as number));
  };

  // Calculate Simple Moving Average
  const calculateSMA = (data: TimeSeriesData[], period: number): LineData[] => {
    const result: LineData[] = [];
    const prices = data.map(d => parseFloat(d.close));

    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      const avg = sum / period;

      result.push({
        time: (new Date(data[i].datetime).getTime() / 1000) as Time,
        value: avg,
      });
    }

    return result.sort((a, b) => (a.time as number) - (b.time as number));
  };

  // Calculate Exponential Moving Average
  const calculateEMA = (data: TimeSeriesData[], period: number): LineData[] => {
    const result: LineData[] = [];
    const prices = data.map(d => parseFloat(d.close));
    const multiplier = 2 / (period + 1);

    // Start with SMA
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
      result.push({
        time: (new Date(data[i].datetime).getTime() / 1000) as Time,
        value: ema,
      });
    }

    return result.sort((a, b) => (a.time as number) - (b.time as number));
  };

  // Calculate Bollinger Bands
  const calculateBollingerBands = (data: TimeSeriesData[], period: number = 20, stdDev: number = 2) => {
    const prices = data.map(d => parseFloat(d.close));
    const upper: LineData[] = [];
    const middle: LineData[] = [];
    const lower: LineData[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const sma = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
      const std = Math.sqrt(variance);

      const time = (new Date(data[i].datetime).getTime() / 1000) as Time;

      middle.push({ time, value: sma });
      upper.push({ time, value: sma + std * stdDev });
      lower.push({ time, value: sma - std * stdDev });
    }

    return { upper, middle, lower };
  };

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

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
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#9ca3af',
          style: 3,
        },
        horzLine: {
          width: 1,
          color: '#9ca3af',
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: '#4b5563',
      },
      timeScale: {
        borderColor: '#4b5563',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add main series based on chart type
    let mainSeries: any;

    if (chartType === 'candlestick') {
      mainSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
      mainSeries.setData(formatCandlestickData(data));
    } else if (chartType === 'line') {
      mainSeries = chart.addLineSeries({
        color: '#2962ff',
        lineWidth: 2,
      });
      mainSeries.setData(formatLineData(data));
    } else if (chartType === 'area') {
      mainSeries = chart.addAreaSeries({
        topColor: 'rgba(41, 98, 255, 0.4)',
        bottomColor: 'rgba(41, 98, 255, 0.0)',
        lineColor: '#2962ff',
        lineWidth: 2,
      });
      mainSeries.setData(formatLineData(data));
    } else if (chartType === 'bars') {
      mainSeries = chart.addBarSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        thinBars: false,
      });
      mainSeries.setData(formatCandlestickData(data));
    }

    seriesRef.current = mainSeries;

    // Add volume histogram if enabled
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      volumeSeries.setData(formatVolumeData(data));
      volumeSeriesRef.current = volumeSeries;
    }

    // Add indicator overlays
    if (indicators.sma20) {
      const sma20 = chart.addLineSeries({
        color: '#ff9800',
        lineWidth: 1,
        title: 'SMA 20',
      });
      sma20.setData(calculateSMA(data, 20));
    }

    if (indicators.sma50) {
      const sma50 = chart.addLineSeries({
        color: '#2196f3',
        lineWidth: 1,
        title: 'SMA 50',
      });
      sma50.setData(calculateSMA(data, 50));
    }

    if (indicators.sma200) {
      const sma200 = chart.addLineSeries({
        color: '#f44336',
        lineWidth: 2,
        title: 'SMA 200',
      });
      sma200.setData(calculateSMA(data, 200));
    }

    if (indicators.ema) {
      const ema20 = chart.addLineSeries({
        color: '#9c27b0',
        lineWidth: 1,
        title: 'EMA 20',
      });
      ema20.setData(calculateEMA(data, 20));
    }

    if (indicators.bb) {
      const bb = calculateBollingerBands(data);

      const upperBand = chart.addLineSeries({
        color: 'rgba(156, 39, 176, 0.5)',
        lineWidth: 1,
        title: 'BB Upper',
      });
      upperBand.setData(bb.upper);

      const middleBand = chart.addLineSeries({
        color: 'rgba(156, 39, 176, 0.8)',
        lineWidth: 1,
        title: 'BB Middle',
      });
      middleBand.setData(bb.middle);

      const lowerBand = chart.addLineSeries({
        color: 'rgba(156, 39, 176, 0.5)',
        lineWidth: 1,
        title: 'BB Lower',
      });
      lowerBand.setData(bb.lower);
    }

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

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, chartType, showVolume, indicators, height]);

  const toggleIndicator = (indicator: keyof typeof indicators) => {
    setIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator],
    }));
  };

  return (
    <div className="space-y-4">
      {/* Chart Toolbar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Chart Type Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Chart Type:</span>
            <div className="flex gap-1">
              {(['candlestick', 'line', 'area', 'bars'] as ChartType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1 text-sm rounded ${
                    chartType === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Volume Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showVolume}
                onChange={(e) => setShowVolume(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Volume</span>
            </label>
          </div>

          {/* Indicator Toggles */}
          <div className="flex items-center gap-2 border-l pl-4 border-gray-300 dark:border-gray-600">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Indicators:</span>
            {Object.entries(indicators).map(([key, value]) => (
              <button
                key={key}
                onClick={() => toggleIndicator(key as keyof typeof indicators)}
                className={`px-2 py-1 text-xs rounded ${
                  value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="card p-4">
        <div className="mb-2">
          <h3 className="text-lg font-bold">{symbol}</h3>
        </div>
        <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />
      </div>

      {/* Chart Legend/Info */}
      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600 dark:text-gray-400">Data Points</div>
            <div className="font-semibold">{data.length}</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Chart Type</div>
            <div className="font-semibold capitalize">{chartType}</div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Active Indicators</div>
            <div className="font-semibold">
              {Object.values(indicators).filter(Boolean).length}
            </div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Volume Display</div>
            <div className="font-semibold">{showVolume ? 'On' : 'Off'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
