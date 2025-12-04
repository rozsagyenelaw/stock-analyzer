import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  CandlestickData,
  Time,
  LineData,
} from 'lightweight-charts';
import { useQuery } from '@tanstack/react-query';
import { stocksApi } from '@/services/api';
import {
  Save,
  AlertTriangle,
  Download,
  Maximize2,
  Minimize2,
  Palette,
  Grid3x3,
  Plus as PlusIcon,
  TrendingUp,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import IndicatorSelector, { SelectedIndicator, AVAILABLE_INDICATORS } from './IndicatorSelector';
import { useChartIndicators } from '@/hooks/useChartIndicators';

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
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const stochasticContainerRef = useRef<HTMLDivElement>(null);

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('3month');
  const [showVolume, setShowVolume] = useState(true);
  const [showMACD, setShowMACD] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showStochastic, setShowStochastic] = useState(false);
  const [drawings] = useState<DrawingLine[]>([]);
  const [patterns, setPatterns] = useState<PatternDetection[]>([]);
  const [templates, setTemplates] = useState<ChartTemplate[]>([]);

  // New advanced features state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawingTool>('none');
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showGrid, setShowGrid] = useState(true);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ time: number; price: number }>>([]);
  const [drawnLines, setDrawnLines] = useState<DrawingLine[]>([]);

  // Indicator selector state
  const [showIndicatorSelector, setShowIndicatorSelector] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState<SelectedIndicator[]>([]);
  const [indicatorPanelRefs, setIndicatorPanelRefs] = useState<Record<string, React.RefObject<HTMLDivElement>>>({});

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

  // Fetch comparison symbols data
  const comparisonQueries = compareSymbols.map(sym => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useQuery({
      queryKey: ['stock-timeseries', sym, timeframe],
      queryFn: () => {
        const config = TIMEFRAME_MAP[timeframe];
        return stocksApi.getTimeSeries(sym, config.interval, config.outputsize);
      },
      enabled: !!sym,
    });
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
    const ema12: number[] = [];
    const ema26: number[] = [];
    const macdLine: LineData[] = [];
    const signalLine: LineData[] = [];
    const histogram: any[] = [];

    // Calculate EMA 12
    let ema = prices.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
    for (let i = 0; i < prices.length; i++) {
      if (i >= 12) {
        ema = (prices[i] - ema) * (2 / 13) + ema;
      }
      ema12.push(ema);
    }

    // Calculate EMA 26
    ema = prices.slice(0, 26).reduce((a, b) => a + b, 0) / 26;
    for (let i = 0; i < prices.length; i++) {
      if (i >= 26) {
        ema = (prices[i] - ema) * (2 / 27) + ema;
      }
      ema26.push(ema);
    }

    // Calculate MACD line
    const macdValues: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      const macdVal = ema12[i] - ema26[i];
      macdValues.push(macdVal);
      macdLine.push({
        time: (new Date(data[i].datetime).getTime() / 1000) as Time,
        value: macdVal,
      });
    }

    // Calculate Signal line (EMA 9 of MACD)
    ema = macdValues.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
    for (let i = 0; i < macdValues.length; i++) {
      if (i >= 9) {
        ema = (macdValues[i] - ema) * (2 / 10) + ema;
      }
      signalLine.push({
        time: (new Date(data[i].datetime).getTime() / 1000) as Time,
        value: ema,
      });
      histogram.push({
        time: (new Date(data[i].datetime).getTime() / 1000) as Time,
        value: macdValues[i] - ema,
        color: macdValues[i] - ema >= 0 ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 82, 82, 0.5)',
      });
    }

    return { macdLine, signalLine, histogram };
  }, []);

  // Calculate RSI
  const calculateRSI = useCallback((data: any[], period = 14): LineData[] => {
    const prices = data.map((d) => parseFloat(d.close));
    const rsi: LineData[] = [];

    for (let i = period; i < prices.length; i++) {
      let gains = 0;
      let losses = 0;

      for (let j = i - period; j < i; j++) {
        const change = prices[j + 1] - prices[j];
        if (change > 0) gains += change;
        else losses -= change;
      }

      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgGain / avgLoss;
      const rsiValue = 100 - 100 / (1 + rs);

      rsi.push({
        time: (new Date(data[i].datetime).getTime() / 1000) as Time,
        value: rsiValue,
      });
    }

    return rsi;
  }, []);

  // Calculate Stochastic
  const calculateStochastic = useCallback((data: any[], period = 14) => {
    const kLine: LineData[] = [];
    const dLine: LineData[] = [];

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
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

    // Calculate D line (3-period SMA of K)
    for (let i = 2; i < kLine.length; i++) {
      const dValue = (kLine[i - 2].value + kLine[i - 1].value + kLine[i].value) / 3;
      dLine.push({
        time: kLine[i].time,
        value: dValue,
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

      const resistanceLevel = Math.max(...highs);

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
      setIndicators({
        sma20: template.indicators.sma20 ?? false,
        sma50: template.indicators.sma50 ?? false,
        sma200: template.indicators.sma200 ?? false,
        ema: template.indicators.ema ?? false,
        bb: template.indicators.bb ?? false,
      });
      setTimeframe(template.timeframe);
      toast.success(`Loaded template: ${template.name}`);
    },
    []
  );

  // Screenshot/Export functionality
  const handleExportChart = useCallback(async () => {
    if (!chartContainerRef.current) return;

    try {
      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `${symbol}-chart-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast.success('Chart exported successfully!');
    } catch (error) {
      toast.error('Failed to export chart');
      console.error(error);
    }
  }, [symbol, theme]);

  // Fullscreen functionality
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    toast.success(isFullscreen ? 'Exited fullscreen' : 'Entered fullscreen');
  }, [isFullscreen]);

  // Add comparison symbol
  const addCompareSymbol = useCallback(() => {
    const newSymbol = prompt('Enter symbol to compare:');
    if (newSymbol && !compareSymbols.includes(newSymbol.toUpperCase())) {
      setCompareSymbols([...compareSymbols, newSymbol.toUpperCase()]);
      toast.success(`Added ${newSymbol.toUpperCase()} for comparison`);
    }
  }, [compareSymbols]);

  // Remove comparison symbol
  const removeCompareSymbol = useCallback((symbolToRemove: string) => {
    setCompareSymbols(compareSymbols.filter(s => s !== symbolToRemove));
    toast.success(`Removed ${symbolToRemove} from comparison`);
  }, [compareSymbols]);

  // Drawing tool handler
  const handleDrawingToolClick = useCallback((tool: DrawingTool) => {
    setActiveTool(tool);
    setDrawingPoints([]);
    if (tool !== 'none') {
      toast(`${tool} drawing mode activated. Click on chart to draw.`, {
        icon: '✏️',
      });
    }
  }, []);

  // Handle chart click for drawing
  const handleChartClick = useCallback((param: any) => {
    if (activeTool === 'none' || !param.point || !param.time) return;

    const price = param.seriesData?.get(mainSeriesRef.current);
    if (!price) return;

    const priceValue = typeof price === 'object' && 'close' in price ? price.close : price.value;
    const newPoint = { time: param.time as number, price: priceValue };

    if (activeTool === 'horizontal') {
      // Horizontal line only needs one point
      const line: DrawingLine = {
        id: `${activeTool}-${Date.now()}`,
        type: activeTool,
        points: [newPoint],
        color: '#2962ff',
      };
      setDrawnLines(prev => [...prev, line]);
      setActiveTool('none');
      toast.success('Horizontal line added');
    } else if (activeTool === 'trendline') {
      // Trendline needs two points
      if (drawingPoints.length === 0) {
        setDrawingPoints([newPoint]);
        toast('Click again to complete trendline', { icon: '📍' });
      } else {
        const line: DrawingLine = {
          id: `${activeTool}-${Date.now()}`,
          type: activeTool,
          points: [drawingPoints[0], newPoint],
          color: '#f44336',
        };
        setDrawnLines(prev => [...prev, line]);
        setDrawingPoints([]);
        setActiveTool('none');
        toast.success('Trendline added');
      }
    } else if (activeTool === 'fibonacci') {
      // Fibonacci needs two points
      if (drawingPoints.length === 0) {
        setDrawingPoints([newPoint]);
        toast('Click again to complete Fibonacci levels', { icon: '📍' });
      } else {
        const line: DrawingLine = {
          id: `${activeTool}-${Date.now()}`,
          type: activeTool,
          points: [drawingPoints[0], newPoint],
          color: '#9c27b0',
        };
        setDrawnLines(prev => [...prev, line]);
        setDrawingPoints([]);
        setActiveTool('none');
        toast.success('Fibonacci levels added');
      }
    }
  }, [activeTool, drawingPoints, mainSeriesRef]);

  // Indicator selector handlers
  const handleToggleIndicator = useCallback((indicatorId: string, params?: Record<string, number>) => {
    setSelectedIndicators(prev => {
      const exists = prev.find(ind => ind.id === indicatorId);
      if (exists) {
        // Remove indicator
        return prev.filter(ind => ind.id !== indicatorId);
      } else {
        // Add indicator
        const indicator = AVAILABLE_INDICATORS.find(ind => ind.id === indicatorId);
        return [...prev, { id: indicatorId, params: params || {}, panel: indicator?.hasPanel }];
      }
    });
  }, []);

  const handleUpdateIndicatorParams = useCallback((indicatorId: string, params: Record<string, number>) => {
    setSelectedIndicators(prev =>
      prev.map(ind => ind.id === indicatorId ? { ...ind, params } : ind)
    );
  }, []);

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

  // Detect patterns separately to avoid infinite loop
  useEffect(() => {
    if (!timeSeries?.values || timeSeries.values.length === 0) return;

    // Sort data in ascending order by datetime
    const data = [...timeSeries.values].sort((a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    // Detect patterns
    const detectedPatterns = detectPatterns(data);
    setPatterns(detectedPatterns);
  }, [timeSeries, detectPatterns]);

  // Main chart rendering
  useEffect(() => {
    if (!chartContainerRef.current || !timeSeries?.values || timeSeries.values.length === 0)
      return;

    // Sort data in ascending order by datetime
    const data = [...timeSeries.values].sort((a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    // Calculate chart height based on panels
    const mainHeight = showMACD || showRSI || showStochastic ? height * 0.6 : height;

    const isDark = theme === 'dark';
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: mainHeight,
      layout: {
        background: { color: isDark ? '#1f2937' : '#ffffff' },
        textColor: isDark ? '#d1d5db' : '#374151',
      },
      grid: {
        vertLines: { color: showGrid ? (isDark ? '#374151' : '#e5e7eb') : 'transparent' },
        horzLines: { color: showGrid ? (isDark ? '#374151' : '#e5e7eb') : 'transparent' },
      },
      crosshair: {
        mode: 1,
        vertLine: { width: 1, color: isDark ? '#9ca3af' : '#6b7280', style: 3 },
        horzLine: { width: 1, color: isDark ? '#9ca3af' : '#6b7280', style: 3 },
      },
      rightPriceScale: { borderColor: isDark ? '#4b5563' : '#d1d5db' },
      timeScale: {
        borderColor: isDark ? '#4b5563' : '#d1d5db',
        timeVisible: true,
        secondsVisible: false,
      },
      // Mobile optimizations
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
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

    // Render selected indicators from the new selector
    const overlayIndicators = selectedIndicators.filter(ind => {
      const config = AVAILABLE_INDICATORS.find(a => a.id === ind.id);
      return config && !config.hasPanel;
    });

    overlayIndicators.forEach(indicator => {
      try {
        const indicatorModule = require('@/utils/technicalIndicators');
        const params = indicator.params;

        switch (indicator.id) {
          case 'sma': {
            const result = indicatorModule.calculateSMA(data, params.period || 20);
            chart.addLineSeries({ color: '#2196F3', lineWidth: 2, title: `SMA(${params.period || 20})` }).setData(result);
            break;
          }
          case 'ema': {
            const result = indicatorModule.calculateEMA(data, params.period || 20);
            chart.addLineSeries({ color: '#FF9800', lineWidth: 2, title: `EMA(${params.period || 20})` }).setData(result);
            break;
          }
          case 'wma': {
            const result = indicatorModule.calculateWMA(data, params.period || 20);
            chart.addLineSeries({ color: '#9C27B0', lineWidth: 2, title: `WMA(${params.period || 20})` }).setData(result);
            break;
          }
          case 'dema': {
            const result = indicatorModule.calculateDEMA(data, params.period || 20);
            chart.addLineSeries({ color: '#E91E63', lineWidth: 2, title: `DEMA(${params.period || 20})` }).setData(result);
            break;
          }
          case 'tema': {
            const result = indicatorModule.calculateTEMA(data, params.period || 20);
            chart.addLineSeries({ color: '#00BCD4', lineWidth: 2, title: `TEMA(${params.period || 20})` }).setData(result);
            break;
          }
          case 'hma': {
            const result = indicatorModule.calculateHMA(data, params.period || 20);
            chart.addLineSeries({ color: '#CDDC39', lineWidth: 2, title: `HMA(${params.period || 20})` }).setData(result);
            break;
          }
          case 'kama': {
            const result = indicatorModule.calculateKAMA(data, params.period || 10, params.fast || 2, params.slow || 30);
            chart.addLineSeries({ color: '#FF5722', lineWidth: 2, title: `KAMA(${params.period || 10})` }).setData(result);
            break;
          }
          case 'zlema': {
            const result = indicatorModule.calculateZLEMA(data, params.period || 20);
            chart.addLineSeries({ color: '#795548', lineWidth: 2, title: `ZLEMA(${params.period || 20})` }).setData(result);
            break;
          }
          case 'bollinger': {
            const result = indicatorModule.calculateBollingerBands(data, params.period || 20, params.stdDev || 2);
            chart.addLineSeries({ color: 'rgba(33, 150, 243, 0.5)', lineWidth: 1, title: 'BB Upper' }).setData(result.upper);
            chart.addLineSeries({ color: '#2196F3', lineWidth: 1, title: 'BB Middle' }).setData(result.middle);
            chart.addLineSeries({ color: 'rgba(33, 150, 243, 0.5)', lineWidth: 1, title: 'BB Lower' }).setData(result.lower);
            break;
          }
          case 'keltner': {
            const result = indicatorModule.calculateKeltner(data, params.period || 20, params.multiplier || 2);
            chart.addLineSeries({ color: 'rgba(255, 152, 0, 0.5)', lineWidth: 1, title: 'Keltner Upper' }).setData(result.upper);
            chart.addLineSeries({ color: '#FF9800', lineWidth: 1, title: 'Keltner Middle' }).setData(result.middle);
            chart.addLineSeries({ color: 'rgba(255, 152, 0, 0.5)', lineWidth: 1, title: 'Keltner Lower' }).setData(result.lower);
            break;
          }
          case 'donchian': {
            const result = indicatorModule.calculateDonchian(data, params.period || 20);
            chart.addLineSeries({ color: 'rgba(76, 175, 80, 0.5)', lineWidth: 1, title: 'Donchian Upper' }).setData(result.upper);
            chart.addLineSeries({ color: '#4CAF50', lineWidth: 1, title: 'Donchian Middle' }).setData(result.middle);
            chart.addLineSeries({ color: 'rgba(76, 175, 80, 0.5)', lineWidth: 1, title: 'Donchian Lower' }).setData(result.lower);
            break;
          }
          case 'envelopes': {
            const result = indicatorModule.calculateEnvelopes(data, params.period || 20, params.percent || 2.5);
            chart.addLineSeries({ color: 'rgba(156, 39, 176, 0.5)', lineWidth: 1, title: 'Envelope Upper' }).setData(result.upper);
            chart.addLineSeries({ color: '#9C27B0', lineWidth: 1, title: 'Envelope Middle' }).setData(result.middle);
            chart.addLineSeries({ color: 'rgba(156, 39, 176, 0.5)', lineWidth: 1, title: 'Envelope Lower' }).setData(result.lower);
            break;
          }
          case 'sar': {
            const result = indicatorModule.calculateParabolicSAR(data, params.acceleration || 0.02, params.maximum || 0.2);
            chart.addLineSeries({ color: '#F44336', lineWidth: 1, lineStyle: 3, title: 'SAR' }).setData(result);
            break;
          }
          case 'vwap': {
            const result = indicatorModule.calculateVWAP(data);
            chart.addLineSeries({ color: '#673AB7', lineWidth: 2, title: 'VWAP' }).setData(result);
            break;
          }
        }
      } catch (error) {
        console.error(`Error rendering indicator ${indicator.id}:`, error);
      }
    });

    // Add comparison symbols
    const comparisonColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd'];
    comparisonQueries.forEach((query, index) => {
      if (query.data?.values && query.data.values.length > 0) {
        const comparisonSeries = chart.addLineSeries({
          color: comparisonColors[index % comparisonColors.length],
          lineWidth: 2,
        });
        comparisonSeries.setData(formatLineData(query.data.values));
      }
    });

    // Render drawn lines
    drawnLines.forEach(line => {
      if (line.type === 'horizontal' && line.points.length > 0) {
        // Horizontal line
        const horizontalLine = chart.addLineSeries({
          color: line.color,
          lineWidth: 2,
          lineStyle: 2, // Dashed
        });
        const minTime = (data[0] ? new Date(data[0].datetime).getTime() / 1000 : 0) as Time;
        const maxTime = (data[data.length - 1] ? new Date(data[data.length - 1].datetime).getTime() / 1000 : 0) as Time;
        horizontalLine.setData([
          { time: minTime, value: line.points[0].price },
          { time: maxTime, value: line.points[0].price },
        ]);
      } else if (line.type === 'trendline' && line.points.length === 2) {
        // Trendline
        const trendLine = chart.addLineSeries({
          color: line.color,
          lineWidth: 2,
        });
        trendLine.setData([
          { time: line.points[0].time as Time, value: line.points[0].price },
          { time: line.points[1].time as Time, value: line.points[1].price },
        ]);
      } else if (line.type === 'fibonacci' && line.points.length === 2) {
        // Fibonacci retracement levels
        const startPrice = line.points[0].price;
        const endPrice = line.points[1].price;
        const diff = endPrice - startPrice;
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const minTime = Math.min(line.points[0].time, line.points[1].time) as Time;
        const maxTime = Math.max(line.points[0].time, line.points[1].time) as Time;

        levels.forEach((level) => {
          const price = startPrice + diff * level;
          const fibLine = chart.addLineSeries({
            color: line.color,
            lineWidth: 1,
            lineStyle: 2,
          });
          fibLine.setData([
            { time: minTime, value: price },
            { time: maxTime, value: price },
          ]);
        });
      }
    });

    // Subscribe to click events for drawing
    chart.subscribeClick(handleChartClick);

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
    theme,
    showGrid,
    drawnLines,
    comparisonQueries,
    selectedIndicators,
    handleChartClick,
    formatCandlestickData,
    formatLineData,
    calculateSMA,
    calculateEMA,
    calculateBollingerBands,
  ]);

  // Render MACD, RSI, Stochastic panels
  useEffect(() => {
    if (!timeSeries?.values || timeSeries.values.length === 0) return;

    // Sort data in ascending order by datetime
    const data = [...timeSeries.values].sort((a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
    const panelHeight = 150;

    // Render MACD panel
    if (showMACD && macdContainerRef.current) {
      const macdChart = createChart(macdContainerRef.current, {
        width: macdContainerRef.current.clientWidth,
        height: panelHeight,
        layout: {
          background: { color: theme === 'dark' ? '#1f2937' : '#ffffff' },
          textColor: theme === 'dark' ? '#d1d5db' : '#374151',
        },
        grid: {
          vertLines: { color: showGrid ? (theme === 'dark' ? '#374151' : '#e5e7eb') : 'transparent' },
          horzLines: { color: showGrid ? (theme === 'dark' ? '#374151' : '#e5e7eb') : 'transparent' },
        },
        timeScale: {
          borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
          timeVisible: true,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      const { macdLine, signalLine, histogram } = calculateMACD(data);
      const macdSeries = macdChart.addLineSeries({ color: '#2196f3', lineWidth: 2 });
      macdSeries.setData(macdLine);
      const signalSeries = macdChart.addLineSeries({ color: '#ff9800', lineWidth: 2 });
      signalSeries.setData(signalLine);
      const histogramSeries = macdChart.addHistogramSeries({ priceFormat: { type: 'price' } });
      histogramSeries.setData(histogram);

      macdChart.timeScale().fitContent();

      return () => macdChart.remove();
    }
  }, [timeSeries, showMACD, theme, showGrid, calculateMACD]);

  useEffect(() => {
    if (!timeSeries?.values || timeSeries.values.length === 0) return;

    // Sort data in ascending order by datetime
    const data = [...timeSeries.values].sort((a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
    const panelHeight = 150;

    // Render RSI panel
    if (showRSI && rsiContainerRef.current) {
      const rsiChart = createChart(rsiContainerRef.current, {
        width: rsiContainerRef.current.clientWidth,
        height: panelHeight,
        layout: {
          background: { color: theme === 'dark' ? '#1f2937' : '#ffffff' },
          textColor: theme === 'dark' ? '#d1d5db' : '#374151',
        },
        grid: {
          vertLines: { color: showGrid ? (theme === 'dark' ? '#374151' : '#e5e7eb') : 'transparent' },
          horzLines: { color: showGrid ? (theme === 'dark' ? '#374151' : '#e5e7eb') : 'transparent' },
        },
        timeScale: {
          borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
          timeVisible: true,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      const rsiData = calculateRSI(data);
      const rsiSeries = rsiChart.addLineSeries({ color: '#9c27b0', lineWidth: 2 });
      rsiSeries.setData(rsiData);

      // Add overbought/oversold lines
      const overboughtLine = rsiChart.addLineSeries({ color: 'rgba(255, 82, 82, 0.5)', lineWidth: 1, lineStyle: 2 });
      const oversoldLine = rsiChart.addLineSeries({ color: 'rgba(76, 175, 80, 0.5)', lineWidth: 1, lineStyle: 2 });
      overboughtLine.setData(rsiData.map(d => ({ time: d.time, value: 70 })));
      oversoldLine.setData(rsiData.map(d => ({ time: d.time, value: 30 })));

      rsiChart.timeScale().fitContent();

      return () => rsiChart.remove();
    }
  }, [timeSeries, showRSI, theme, showGrid, calculateRSI]);

  useEffect(() => {
    if (!timeSeries?.values || timeSeries.values.length === 0) return;

    // Sort data in ascending order by datetime
    const data = [...timeSeries.values].sort((a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
    const panelHeight = 150;

    // Render Stochastic panel
    if (showStochastic && stochasticContainerRef.current) {
      const stochChart = createChart(stochasticContainerRef.current, {
        width: stochasticContainerRef.current.clientWidth,
        height: panelHeight,
        layout: {
          background: { color: theme === 'dark' ? '#1f2937' : '#ffffff' },
          textColor: theme === 'dark' ? '#d1d5db' : '#374151',
        },
        grid: {
          vertLines: { color: showGrid ? (theme === 'dark' ? '#374151' : '#e5e7eb') : 'transparent' },
          horzLines: { color: showGrid ? (theme === 'dark' ? '#374151' : '#e5e7eb') : 'transparent' },
        },
        timeScale: {
          borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
          timeVisible: true,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      const { kLine, dLine } = calculateStochastic(data);
      const kSeries = stochChart.addLineSeries({ color: '#2196f3', lineWidth: 2 });
      kSeries.setData(kLine);
      const dSeries = stochChart.addLineSeries({ color: '#ff9800', lineWidth: 2 });
      dSeries.setData(dLine);

      stochChart.timeScale().fitContent();

      return () => stochChart.remove();
    }
  }, [timeSeries, showStochastic, theme, showGrid, calculateStochastic]);

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
                onClick={() => setShowIndicatorSelector(true)}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                <TrendingUp className="w-4 h-4" />
                Indicators ({selectedIndicators.length})
              </button>
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

          {/* Row 3: Advanced Features */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-300 dark:border-gray-600">
            {/* Drawing Tools */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Draw:</span>
              {(['none', 'trendline', 'horizontal', 'fibonacci'] as DrawingTool[]).map((tool) => (
                <button
                  key={tool}
                  onClick={() => handleDrawingToolClick(tool)}
                  className={`px-2 py-1 text-xs rounded ${
                    activeTool === tool ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {tool === 'none' ? 'None' : tool.charAt(0).toUpperCase() + tool.slice(1)}
                </button>
              ))}
            </div>

            {/* Compare Stocks */}
            <div className="border-l pl-4 border-gray-300 dark:border-gray-600 flex gap-2 items-center">
              <button
                onClick={addCompareSymbol}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4" />
                Compare
              </button>
              {compareSymbols.map(sym => (
                <span key={sym} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs flex items-center gap-1">
                  {sym}
                  <button onClick={() => removeCompareSymbol(sym)} className="ml-1 hover:text-red-600">×</button>
                </span>
              ))}
            </div>

            {/* Theme & Customization */}
            <div className="border-l pl-4 border-gray-300 dark:border-gray-600 flex gap-2">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                <Palette className="w-4 h-4" />
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`flex items-center gap-1 px-3 py-1 text-sm rounded ${
                  showGrid ? 'bg-gray-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
                Grid
              </button>
            </div>

            {/* Export & Fullscreen */}
            <div className="border-l pl-4 border-gray-300 dark:border-gray-600 flex gap-2">
              <button
                onClick={handleExportChart}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                {isFullscreen ? 'Exit' : 'Fullscreen'}
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

        {/* Indicator Panels */}
        {showMACD && (
          <div className="mt-2">
            <div className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">MACD</div>
            <div ref={macdContainerRef} className="rounded-lg overflow-hidden" />
          </div>
        )}

        {showRSI && (
          <div className="mt-2">
            <div className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">RSI (14)</div>
            <div ref={rsiContainerRef} className="rounded-lg overflow-hidden" />
          </div>
        )}

        {showStochastic && (
          <div className="mt-2">
            <div className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Stochastic (14)</div>
            <div ref={stochasticContainerRef} className="rounded-lg overflow-hidden" />
          </div>
        )}
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

      {/* Indicator Selector Modal */}
      {showIndicatorSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold">Technical Indicators</h2>
              <button
                onClick={() => setShowIndicatorSelector(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <IndicatorSelector
                selectedIndicators={selectedIndicators}
                onToggleIndicator={handleToggleIndicator}
                onUpdateParams={handleUpdateIndicatorParams}
              />
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowIndicatorSelector(false)}
                className="btn btn-primary w-full"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
