import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  LineData,
  MouseEventParams,
  LogicalRange,
} from 'lightweight-charts';
import { useQuery } from '@tanstack/react-query';
import { stocksApi } from '@/services/api';
import {
  TrendingUp,
  Plus,
  Minus,
  Save,
  Download,
  Settings,
  Maximize2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EnhancedChartProps {
  symbol: string;
  height?: number;
}

export type ChartType = 'candlestick' | 'line' | 'area' | 'bars';
export type Timeframe = '1day' | '1week' | '1month' | '3month' | '6month' | '1year' | '5year';
export type DrawingTool = 'none' | 'trendline' | 'horizontal' | 'fibonacci';

interface DrawingLine {
  id: string;
  type: DrawingTool;
  points: Array<{ time: number; price: number }>;
  color: string;
}

interface PatternDetection {
  type: string;
  confidence: number;
  description: string;
  startIndex: number;
  endIndex: number;
}

interface ChartTemplate {
  name: string;
  chartType: ChartType;
  indicators: Record<string, boolean>;
  timeframe: Timeframe;
  drawings: DrawingLine[];
}

const TIMEFRAME_MAP: Record<Timeframe, { interval: string; outputsize: number; label: string }> = {
  '1day': { interval: '1day', outputsize: 30, label: '1M' },
  '1week': { interval: '1day', outputsize: 90, label: '3M' },
  '1month': { interval: '1day', outputsize: 180, label: '6M' },
  '3month': { interval: '1day', outputsize: 250, label: '1Y' },
  '6month': { interval: '1week', outputsize: 250, label: '1Y' },
  '1year': { interval: '1week', outputsize: 365, label: '2Y' },
  '5year': { interval: '1month', outputsize: 1260, label: '5Y' },
};

export default function EnhancedChart({ symbol, height = 600 }: EnhancedChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const macdSeriesRef = useRef<any[]>([]);
  const rsiSeriesRef = useRef<any>(null);
  const stochSeriesRef = useRef<any[]>([]);

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('3month');
  const [showVolume, setShowVolume] = useState(true);
  const [showMACD, setShowMACD] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showStochastic, setShowStochastic] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawingTool>('none');
  const [drawings, setDrawings] = useState<DrawingLine[]>([]);
  const [patterns, setPatterns] = useState<PatternDetection[]>([]);
  const [templates, setTemplates] = useState<ChartTemplate[]>([]);

  const [indicators, setIndicators] = useState({
    sma20: false,
    sma50: false,
    sma200: true,
    ema: false,
    bb: false,
  });

  // Fetch time series data based on selected timeframe
  const { data: timeSeries, isLoading } = useQuery({
    queryKey: ['stock-timeseries', symbol, timeframe],
    queryFn: () => {
      const config = TIMEFRAME_MAP[timeframe];
      return stocksApi.getTimeSeries(symbol, config.interval, config.outputsize);
    },
    enabled: !!symbol,
  });

  // Format data functions
  const formatCandlestickData = useCallback((rawData: any[]): CandlestickData[] => {
    if (!rawData) return [];
    return rawData
      .map((item) => ({
        time: (new Date(item.datetime).getTime() / 1000) as Time,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));
  }, []);

  const formatLineData = useCallback((rawData: any[]): LineData[] => {
    if (!rawData) return [];
    return rawData
      .map((item) => ({
        time: (new Date(item.datetime).getTime() / 1000) as Time,
        value: parseFloat(item.close),
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));
  }, []);

  // Calculate indicators
  const calculateSMA = useCallback((data: any[], period: number): LineData[] => {
    const result: LineData[] = [];
    const prices = data.map((d) => parseFloat(d.close));

    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push({
        time: (new Date(data[i].datetime).getTime() / 1000) as Time,
        value: sum / period,
      });
    }
    return result;
  }, []);

  const calculateEMA = useCallback((data: any[], period: number): LineData[] => {
    const result: LineData[] = [];
    const prices = data.map((d) => parseFloat(d.close));
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
      result.push({
        time: (new Date(data[i].datetime).getTime() / 1000) as Time,
        value: ema,
      });
    }
    return result;
  }, []);

  const calculateBollingerBands = useCallback((data: any[], period = 20, stdDev = 2) => {
    const prices = data.map((d) => parseFloat(d.close));
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
  }, []);

  // Calculate MACD
  const calculateMACD = useCallback((data: any[]) => {
    const prices = data.map((d) => parseFloat(d.close));
    const ema12 = [];
    const ema26 = [];
    const macdLine: LineData[] = [];
    const signalLine: LineData[] = [];
    const histogram: any[] = [];

    // Calculate EMA12
    let ema = prices.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
    const mult12 = 2 / 13;
    for (let i = 12; i < prices.length; i++) {
      ema = (prices[i] - ema) * mult12 + ema;
      ema12.push(ema);
    }

    // Calculate EMA26
    ema = prices.slice(0, 26).reduce((a, b) => a + b, 0) / 26;
    const mult26 = 2 / 27;
    for (let i = 26; i < prices.length; i++) {
      ema = (prices[i] - ema) * mult26 + ema;
      ema26.push(ema);
    }

    // Calculate MACD line
    const offset = 26 - 12;
    for (let i = 0; i < ema26.length; i++) {
      const macdValue = ema12[i + offset] - ema26[i];
      const time = (new Date(data[i + 26].datetime).getTime() / 1000) as Time;
      macdLine.push({ time, value: macdValue });
    }

    // Calculate Signal line (9-day EMA of MACD)
    if (macdLine.length >= 9) {
      const macdValues = macdLine.map((d) => d.value);
      let signalEMA = macdValues.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
      const mult9 = 2 / 10;

      for (let i = 9; i < macdValues.length; i++) {
        signalEMA = (macdValues[i] - signalEMA) * mult9 + signalEMA;
        const time = macdLine[i].time;
        signalLine.push({ time, value: signalEMA });

        // Histogram
        const histValue = macdValues[i] - signalEMA;
        histogram.push({
          time,
          value: histValue,
          color: histValue >= 0 ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
        });
      }
    }

    return { macdLine, signalLine, histogram };
  }, []);

  // Calculate RSI
  const calculateRSI = useCallback((data: any[], period = 14) => {
    const prices = data.map((d) => parseFloat(d.close));
    const rsiData: LineData[] = [];
    const changes = [];

    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    for (let i = period; i < changes.length; i++) {
      const slice = changes.slice(i - period, i);
      const gains = slice.filter((c) => c > 0);
      const losses = slice.filter((c) => c < 0).map((c) => Math.abs(c));

      const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
      const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      rsiData.push({
        time: (new Date(data[i + 1].datetime).getTime() / 1000) as Time,
        value: rsi,
      });
    }

    return rsiData;
  }, []);

  // Calculate Stochastic
  const calculateStochastic = useCallback((data: any[], kPeriod = 14, dPeriod = 3) => {
    const kLine: LineData[] = [];
    const dLine: LineData[] = [];

    for (let i = kPeriod - 1; i < data.length; i++) {
      const slice = data.slice(i - kPeriod + 1, i + 1);
      const highs = slice.map((d: any) => parseFloat(d.high));
      const lows = slice.map((d: any) => parseFloat(d.low));
      const close = parseFloat(data[i].close);

      const highestHigh = Math.max(...highs);
      const lowestLow = Math.min(...lows);
      const k = ((close - lowestLow) / (highestHigh - lowestLow)) * 100;

      kLine.push({
        time: (new Date(data[i].datetime).getTime() / 1000) as Time,
        value: k,
      });
    }

    // Calculate %D (SMA of %K)
    for (let i = dPeriod - 1; i < kLine.length; i++) {
      const slice = kLine.slice(i - dPeriod + 1, i + 1);
      const avg = slice.reduce((sum, item) => sum + item.value, 0) / dPeriod;
      dLine.push({
        time: kLine[i].time,
        value: avg,
      });
    }

    return { kLine, dLine };
  }, []);

  // Pattern Detection
  const detectPatterns = useCallback((data: any[]): PatternDetection[] => {
    if (!data || data.length < 50) return [];

    const detected: PatternDetection[] = [];
    const prices = data.map((d) => parseFloat(d.close));

    // Detect Head and Shoulders
    for (let i = 20; i < prices.length - 20; i++) {
      const leftShoulder = prices[i - 15];
      const head = prices[i];
      const rightShoulder = prices[i + 15];

      if (
        head > leftShoulder &&
        head > rightShoulder &&
        Math.abs(leftShoulder - rightShoulder) / leftShoulder < 0.05
      ) {
        detected.push({
          type: 'Head and Shoulders',
          confidence: 75,
          description: 'Bearish reversal pattern detected',
          startIndex: i - 20,
          endIndex: i + 20,
        });
      }
    }

    // Detect Double Top
    for (let i = 15; i < prices.length - 15; i++) {
      const peak1 = prices[i];
      const peak2 = prices[i + 15];
      const valley = Math.min(...prices.slice(i, i + 15));

      if (
        Math.abs(peak1 - peak2) / peak1 < 0.02 &&
        (peak1 - valley) / peak1 > 0.03 &&
        peak1 > valley
      ) {
        detected.push({
          type: 'Double Top',
          confidence: 70,
          description: 'Bearish reversal pattern detected',
          startIndex: i - 5,
          endIndex: i + 20,
        });
      }
    }

    // Detect Ascending Triangle
    for (let i = 30; i < prices.length - 10; i++) {
      const highs = data.slice(i - 30, i).map((d: any) => parseFloat(d.high));
      const lows = data.slice(i - 30, i).map((d: any) => parseFloat(d.low));

      const resistanceLevel = Math.max(...highs);
      const lowTrend = lows.slice(-10).reduce((a, b) => a + b, 0) / 10;

      if (Math.abs(resistanceLevel - Math.max(...highs.slice(-10))) / resistanceLevel < 0.01) {
        detected.push({
          type: 'Ascending Triangle',
          confidence: 65,
          description: 'Bullish continuation pattern detected',
          startIndex: i - 30,
          endIndex: i,
        });
      }
    }

    return detected.slice(0, 3); // Return top 3 patterns
  }, []);

  // Save template
  const saveTemplate = useCallback(() => {
    const templateName = prompt('Enter template name:');
    if (!templateName) return;

    const template: ChartTemplate = {
      name: templateName,
      chartType,
      indicators,
      timeframe,
      drawings,
    };

    const saved = [...templates, template];
    setTemplates(saved);
    localStorage.setItem(`chart-templates-${symbol}`, JSON.stringify(saved));
    toast.success('Template saved!');
  }, [chartType, indicators, timeframe, drawings, templates, symbol]);

  // Load template
  const loadTemplate = useCallback(
    (template: ChartTemplate) => {
      setChartType(template.chartType);
      setIndicators(template.indicators);
      setTimeframe(template.timeframe);
      setDrawings(template.drawings);
      toast.success(`Loaded template: ${template.name}`);
    },
    []
  );

  // Load saved templates on mount
  useEffect(() => {
    const saved = localStorage.getItem(`chart-templates-${symbol}`);
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
  }, [symbol]);

  // Main chart rendering
  useEffect(() => {
    if (!chartContainerRef.current || !timeSeries?.values || timeSeries.values.length === 0)
      return;

    const data = timeSeries.values;

    // Detect patterns
    const detectedPatterns = detectPatterns(data);
    setPatterns(detectedPatterns);

    // Calculate chart height based on panels
    const mainHeight = showMACD || showRSI || showStochastic ? height * 0.6 : height;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: mainHeight,
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
        vertLine: { width: 1, color: '#9ca3af', style: 3 },
        horzLine: { width: 1, color: '#9ca3af', style: 3 },
      },
      rightPriceScale: { borderColor: '#4b5563' },
      timeScale: {
        borderColor: '#4b5563',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add main series
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
      mainSeries = chart.addLineSeries({ color: '#2962ff', lineWidth: 2 });
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
      });
      mainSeries.setData(formatCandlestickData(data));
    }

    mainSeriesRef.current = mainSeries;

    // Add volume
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      const volumeData = data
        .map((item: any, index: number) => {
          const prevClose = index > 0 ? parseFloat(data[index - 1].close) : parseFloat(item.close);
          const currentClose = parseFloat(item.close);
          return {
            time: (new Date(item.datetime).getTime() / 1000) as Time,
            value: parseFloat(item.volume),
            color: currentClose >= prevClose ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 82, 82, 0.5)',
          };
        })
        .sort((a: any, b: any) => a.time - b.time);

      volumeSeries.setData(volumeData);
      volumeSeriesRef.current = volumeSeries;
    }

    // Add indicators
    if (indicators.sma20) {
      const sma20 = chart.addLineSeries({ color: '#ff9800', lineWidth: 1 });
      sma20.setData(calculateSMA(data, 20));
    }
    if (indicators.sma50) {
      const sma50 = chart.addLineSeries({ color: '#2196f3', lineWidth: 1 });
      sma50.setData(calculateSMA(data, 50));
    }
    if (indicators.sma200) {
      const sma200 = chart.addLineSeries({ color: '#f44336', lineWidth: 2 });
      sma200.setData(calculateSMA(data, 200));
    }
    if (indicators.ema) {
      const ema20 = chart.addLineSeries({ color: '#9c27b0', lineWidth: 1 });
      ema20.setData(calculateEMA(data, 20));
    }
    if (indicators.bb) {
      const bb = calculateBollingerBands(data);
      chart.addLineSeries({ color: 'rgba(156, 39, 176, 0.5)', lineWidth: 1 }).setData(bb.upper);
      chart.addLineSeries({ color: 'rgba(156, 39, 176, 0.8)', lineWidth: 1 }).setData(bb.middle);
      chart.addLineSeries({ color: 'rgba(156, 39, 176, 0.5)', lineWidth: 1 }).setData(bb.lower);
    }

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [
    timeSeries,
    chartType,
    showVolume,
    indicators,
    height,
    showMACD,
    showRSI,
    showStochastic,
    formatCandlestickData,
    formatLineData,
    calculateSMA,
    calculateEMA,
    calculateBollingerBands,
    detectPatterns,
  ]);

  if (isLoading) {
    return (
      <div className="card p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <span className="ml-4">Loading chart data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Toolbar */}
      <div className="card p-4">
        <div className="space-y-4">
          {/* Row 1: Chart Type & Timeframe */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Type:</span>
              {(['candlestick', 'line', 'area', 'bars'] as ChartType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1 text-sm rounded ${
                    chartType === type ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 border-l pl-4 border-gray-300 dark:border-gray-600">
              <span className="text-sm font-medium">Timeframe:</span>
              {(Object.keys(TIMEFRAME_MAP) as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 text-sm rounded ${
                    timeframe === tf ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {TIMEFRAME_MAP[tf].label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Indicators & Tools */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVolume}
                  onChange={(e) => setShowVolume(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Volume</span>
              </label>
            </div>

            {Object.entries(indicators).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setIndicators((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                className={`px-2 py-1 text-xs rounded ${
                  value ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {key.toUpperCase()}
              </button>
            ))}

            <div className="border-l pl-4 border-gray-300 dark:border-gray-600 flex gap-2">
              <button
                onClick={() => setShowMACD(!showMACD)}
                className={`px-3 py-1 text-sm rounded ${
                  showMACD ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                MACD
              </button>
              <button
                onClick={() => setShowRSI(!showRSI)}
                className={`px-3 py-1 text-sm rounded ${
                  showRSI ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                RSI
              </button>
              <button
                onClick={() => setShowStochastic(!showStochastic)}
                className={`px-3 py-1 text-sm rounded ${
                  showStochastic ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Stochastic
              </button>
            </div>

            <div className="border-l pl-4 border-gray-300 dark:border-gray-600 flex gap-2">
              <button
                onClick={saveTemplate}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="card p-4">
        <div className="mb-2 flex justify-between items-center">
          <h3 className="text-lg font-bold">{symbol}</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {TIMEFRAME_MAP[timeframe].label} • {chartType}
          </div>
        </div>
        <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />
      </div>

      {/* Pattern Detection */}
      {patterns.length > 0 && (
        <div className="card p-4 border-l-4 border-purple-500">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-purple-500" />
            Patterns Detected
          </h3>
          <div className="space-y-2">
            {patterns.map((pattern, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <div>
                  <div className="font-semibold">{pattern.type}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{pattern.description}</div>
                </div>
                <div className="text-sm font-semibold">{pattern.confidence}% confident</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Templates */}
      {templates.length > 0 && (
        <div className="card p-4">
          <h3 className="font-bold mb-2">Saved Templates</h3>
          <div className="flex gap-2 flex-wrap">
            {templates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => loadTemplate(template)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
