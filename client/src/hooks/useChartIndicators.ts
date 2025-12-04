import { useEffect, useState, useCallback } from 'react';
import { IChartApi, ISeriesApi, LineData, HistogramData } from 'lightweight-charts';
import * as indicators from '@/utils/technicalIndicators';
import { SelectedIndicator } from '@/components/charts/IndicatorSelector';

interface CandleData {
  datetime: string;
  open: string | number;
  high: string | number;
  low: string | number;
  close: string | number;
  volume: string | number;
}

interface UseChartIndicatorsProps {
  data: CandleData[];
  selectedIndicators: SelectedIndicator[];
  mainChart: IChartApi | null;
  panelCharts: Record<string, IChartApi | null>;
}

export function useChartIndicators({
  data,
  selectedIndicators,
  mainChart,
  panelCharts,
}: UseChartIndicatorsProps) {
  const [seriesRefs, setSeriesRefs] = useState<Record<string, ISeriesApi<any>>>({});

  const clearIndicator = useCallback((indicatorId: string) => {
    if (seriesRefs[indicatorId]) {
      try {
        // Remove the series from the chart
        const series = seriesRefs[indicatorId];
        if (mainChart && (series as any).chart?.() === mainChart) {
          mainChart.removeSeries(series);
        } else {
          // Check panel charts
          Object.values(panelCharts).forEach(panelChart => {
            if (panelChart && (series as any).chart?.() === panelChart) {
              panelChart.removeSeries(series);
            }
          });
        }
      } catch (e) {
        // Series might already be removed
      }

      const newRefs = { ...seriesRefs };
      delete newRefs[indicatorId];
      setSeriesRefs(newRefs);
    }
  }, [seriesRefs, mainChart, panelCharts]);

  const renderIndicator = useCallback((
    indicatorId: string,
    params: Record<string, number>,
    targetChart: IChartApi,
    isOverlay: boolean = true
  ) => {
    if (!data || data.length === 0 || !targetChart) return;

    // Clear existing series for this indicator
    if (seriesRefs[indicatorId]) {
      clearIndicator(indicatorId);
    }

    let indicatorData: any;
    let newSeries: Record<string, ISeriesApi<any>> = {};

    try {
      // Calculate indicator based on ID
      switch (indicatorId) {
        // Trend Indicators (Overlays)
        case 'sma':
          indicatorData = indicators.calculateSMA(data, params.period || 20);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#2196F3',
            lineWidth: 2,
            title: `SMA(${params.period || 20})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'ema':
          indicatorData = indicators.calculateEMA(data, params.period || 20);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#FF9800',
            lineWidth: 2,
            title: `EMA(${params.period || 20})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'wma':
          indicatorData = indicators.calculateWMA(data, params.period || 20);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#9C27B0',
            lineWidth: 2,
            title: `WMA(${params.period || 20})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'dema':
          indicatorData = indicators.calculateDEMA(data, params.period || 20);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#E91E63',
            lineWidth: 2,
            title: `DEMA(${params.period || 20})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'tema':
          indicatorData = indicators.calculateTEMA(data, params.period || 20);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#00BCD4',
            lineWidth: 2,
            title: `TEMA(${params.period || 20})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'hma':
          indicatorData = indicators.calculateHMA(data, params.period || 20);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#CDDC39',
            lineWidth: 2,
            title: `HMA(${params.period || 20})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'kama':
          indicatorData = indicators.calculateKAMA(data, params.period || 10, params.fast || 2, params.slow || 30);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#FF5722',
            lineWidth: 2,
            title: `KAMA(${params.period || 10})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'zlema':
          indicatorData = indicators.calculateZLEMA(data, params.period || 20);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#795548',
            lineWidth: 2,
            title: `ZLEMA(${params.period || 20})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'bollinger':
          indicatorData = indicators.calculateBollingerBands(data, params.period || 20, params.stdDev || 2);
          newSeries[`${indicatorId}_upper`] = targetChart.addLineSeries({
            color: 'rgba(33, 150, 243, 0.5)',
            lineWidth: 1,
            title: 'BB Upper',
          });
          newSeries[`${indicatorId}_middle`] = targetChart.addLineSeries({
            color: '#2196F3',
            lineWidth: 1,
            title: 'BB Middle',
          });
          newSeries[`${indicatorId}_lower`] = targetChart.addLineSeries({
            color: 'rgba(33, 150, 243, 0.5)',
            lineWidth: 1,
            title: 'BB Lower',
          });
          newSeries[`${indicatorId}_upper`].setData(indicatorData.upper as LineData[]);
          newSeries[`${indicatorId}_middle`].setData(indicatorData.middle as LineData[]);
          newSeries[`${indicatorId}_lower`].setData(indicatorData.lower as LineData[]);
          break;

        case 'keltner':
          indicatorData = indicators.calculateKeltner(data, params.period || 20, params.multiplier || 2);
          newSeries[`${indicatorId}_upper`] = targetChart.addLineSeries({
            color: 'rgba(255, 152, 0, 0.5)',
            lineWidth: 1,
            title: 'Keltner Upper',
          });
          newSeries[`${indicatorId}_middle`] = targetChart.addLineSeries({
            color: '#FF9800',
            lineWidth: 1,
            title: 'Keltner Middle',
          });
          newSeries[`${indicatorId}_lower`] = targetChart.addLineSeries({
            color: 'rgba(255, 152, 0, 0.5)',
            lineWidth: 1,
            title: 'Keltner Lower',
          });
          newSeries[`${indicatorId}_upper`].setData(indicatorData.upper as LineData[]);
          newSeries[`${indicatorId}_middle`].setData(indicatorData.middle as LineData[]);
          newSeries[`${indicatorId}_lower`].setData(indicatorData.lower as LineData[]);
          break;

        case 'donchian':
          indicatorData = indicators.calculateDonchian(data, params.period || 20);
          newSeries[`${indicatorId}_upper`] = targetChart.addLineSeries({
            color: 'rgba(76, 175, 80, 0.5)',
            lineWidth: 1,
            title: 'Donchian Upper',
          });
          newSeries[`${indicatorId}_middle`] = targetChart.addLineSeries({
            color: '#4CAF50',
            lineWidth: 1,
            title: 'Donchian Middle',
          });
          newSeries[`${indicatorId}_lower`] = targetChart.addLineSeries({
            color: 'rgba(76, 175, 80, 0.5)',
            lineWidth: 1,
            title: 'Donchian Lower',
          });
          newSeries[`${indicatorId}_upper`].setData(indicatorData.upper as LineData[]);
          newSeries[`${indicatorId}_middle`].setData(indicatorData.middle as LineData[]);
          newSeries[`${indicatorId}_lower`].setData(indicatorData.lower as LineData[]);
          break;

        case 'envelopes':
          indicatorData = indicators.calculateEnvelopes(data, params.period || 20, params.percent || 2.5);
          newSeries[`${indicatorId}_upper`] = targetChart.addLineSeries({
            color: 'rgba(156, 39, 176, 0.5)',
            lineWidth: 1,
            title: 'Envelope Upper',
          });
          newSeries[`${indicatorId}_middle`] = targetChart.addLineSeries({
            color: '#9C27B0',
            lineWidth: 1,
            title: 'Envelope Middle',
          });
          newSeries[`${indicatorId}_lower`] = targetChart.addLineSeries({
            color: 'rgba(156, 39, 176, 0.5)',
            lineWidth: 1,
            title: 'Envelope Lower',
          });
          newSeries[`${indicatorId}_upper`].setData(indicatorData.upper as LineData[]);
          newSeries[`${indicatorId}_middle`].setData(indicatorData.middle as LineData[]);
          newSeries[`${indicatorId}_lower`].setData(indicatorData.lower as LineData[]);
          break;

        case 'sar':
          indicatorData = indicators.calculateParabolicSAR(data, params.acceleration || 0.02, params.maximum || 0.2);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#F44336',
            lineWidth: 1,
            lineStyle: 3,
            title: 'SAR',
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'vwap':
          indicatorData = indicators.calculateVWAP(data);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#673AB7',
            lineWidth: 2,
            title: 'VWAP',
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        // Momentum Indicators (Panels)
        case 'rsi':
          indicatorData = indicators.calculateRSI(data, params.period || 14);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#2196F3',
            lineWidth: 2,
            title: `RSI(${params.period || 14})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'stochastic':
          indicatorData = indicators.calculateStochastic(data, params.period || 14, params.smoothK || 3, params.smoothD || 3);
          newSeries[`${indicatorId}_k`] = targetChart.addLineSeries({
            color: '#2196F3',
            lineWidth: 2,
            title: '%K',
          });
          newSeries[`${indicatorId}_d`] = targetChart.addLineSeries({
            color: '#FF9800',
            lineWidth: 2,
            title: '%D',
          });
          newSeries[`${indicatorId}_k`].setData(indicatorData.kLine as LineData[]);
          newSeries[`${indicatorId}_d`].setData(indicatorData.dLine as LineData[]);
          break;

        case 'macd':
          indicatorData = indicators.calculateMACD(data, params.fast || 12, params.slow || 26, params.signal || 9);
          newSeries[`${indicatorId}_macd`] = targetChart.addLineSeries({
            color: '#2196F3',
            lineWidth: 2,
            title: 'MACD',
          });
          newSeries[`${indicatorId}_signal`] = targetChart.addLineSeries({
            color: '#FF9800',
            lineWidth: 2,
            title: 'Signal',
          });
          newSeries[`${indicatorId}_histogram`] = targetChart.addHistogramSeries({
            color: '#26a69a',
            title: 'Histogram',
          });
          newSeries[`${indicatorId}_macd`].setData(indicatorData.macdLine as LineData[]);
          newSeries[`${indicatorId}_signal`].setData(indicatorData.signalLine as LineData[]);
          newSeries[`${indicatorId}_histogram`].setData(indicatorData.histogram as HistogramData[]);
          break;

        case 'cci':
          indicatorData = indicators.calculateCCI(data, params.period || 20);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#9C27B0',
            lineWidth: 2,
            title: `CCI(${params.period || 20})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'williams':
          indicatorData = indicators.calculateWilliamsR(data, params.period || 14);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#E91E63',
            lineWidth: 2,
            title: `Williams %R(${params.period || 14})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'roc':
          indicatorData = indicators.calculateROC(data, params.period || 12);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#00BCD4',
            lineWidth: 2,
            title: `ROC(${params.period || 12})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'momentum':
          indicatorData = indicators.calculateMomentum(data, params.period || 10);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#CDDC39',
            lineWidth: 2,
            title: `Momentum(${params.period || 10})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'ao':
          indicatorData = indicators.calculateAO(data);
          newSeries[indicatorId] = targetChart.addHistogramSeries({
            color: '#4CAF50',
            title: 'Awesome Oscillator',
          });
          newSeries[indicatorId].setData(indicatorData.map(d => ({ ...d, color: d.value >= 0 ? '#4CAF50' : '#F44336' })) as HistogramData[]);
          break;

        case 'uo':
          indicatorData = indicators.calculateUltimateOscillator(data, params.period1 || 7, params.period2 || 14, params.period3 || 28);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#FF5722',
            lineWidth: 2,
            title: 'Ultimate Oscillator',
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'ppo':
          indicatorData = indicators.calculatePPO(data, params.fast || 12, params.slow || 26, params.signal || 9);
          newSeries[`${indicatorId}_ppo`] = targetChart.addLineSeries({
            color: '#2196F3',
            lineWidth: 2,
            title: 'PPO',
          });
          newSeries[`${indicatorId}_signal`] = targetChart.addLineSeries({
            color: '#FF9800',
            lineWidth: 2,
            title: 'Signal',
          });
          newSeries[`${indicatorId}_histogram`] = targetChart.addHistogramSeries({
            color: '#26a69a',
            title: 'Histogram',
          });
          newSeries[`${indicatorId}_ppo`].setData(indicatorData.ppoLine as LineData[]);
          newSeries[`${indicatorId}_signal`].setData(indicatorData.signalLine as LineData[]);
          newSeries[`${indicatorId}_histogram`].setData(indicatorData.histogram as HistogramData[]);
          break;

        case 'tsi':
          indicatorData = indicators.calculateTSI(data, params.long || 25, params.short || 13, params.signal || 7);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#795548',
            lineWidth: 2,
            title: 'TSI',
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'kst':
          indicatorData = indicators.calculateKST(data);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#607D8B',
            lineWidth: 2,
            title: 'KST',
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        // Volume Indicators
        case 'obv':
          indicatorData = indicators.calculateOBV(data);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#2196F3',
            lineWidth: 2,
            title: 'OBV',
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'mfi':
          indicatorData = indicators.calculateMFI(data, params.period || 14);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#9C27B0',
            lineWidth: 2,
            title: `MFI(${params.period || 14})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'ad':
          indicatorData = indicators.calculateAD(data);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#00BCD4',
            lineWidth: 2,
            title: 'A/D Line',
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'cmf':
          indicatorData = indicators.calculateCMF(data, params.period || 20);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#4CAF50',
            lineWidth: 2,
            title: `CMF(${params.period || 20})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        // Volatility Indicators
        case 'atr':
          indicatorData = indicators.calculateATR(data, params.period || 14);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#F44336',
            lineWidth: 2,
            title: `ATR(${params.period || 14})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'bbwidth':
          indicatorData = indicators.calculateBBWidth(data, params.period || 20, params.stdDev || 2);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#2196F3',
            lineWidth: 2,
            title: 'BB Width',
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'bbpercent':
          indicatorData = indicators.calculateBBPercent(data, params.period || 20, params.stdDev || 2);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#FF9800',
            lineWidth: 2,
            title: 'BB %B',
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'stddev':
          indicatorData = indicators.calculateStdDev(data, params.period || 20);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#9C27B0',
            lineWidth: 2,
            title: `Std Dev(${params.period || 20})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        case 'adx':
          indicatorData = indicators.calculateADX(data, params.period || 14);
          newSeries[indicatorId] = targetChart.addLineSeries({
            color: '#E91E63',
            lineWidth: 2,
            title: `ADX(${params.period || 14})`,
          });
          newSeries[indicatorId].setData(indicatorData as LineData[]);
          break;

        default:
          console.warn(`Indicator ${indicatorId} not implemented yet`);
          return;
      }

      // Update series refs
      setSeriesRefs(prev => ({ ...prev, ...newSeries }));

    } catch (error) {
      console.error(`Error rendering indicator ${indicatorId}:`, error);
    }
  }, [data, seriesRefs, clearIndicator]);

  return {
    renderIndicator,
    clearIndicator,
    seriesRefs,
  };
}
