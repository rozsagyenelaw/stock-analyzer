/**
 * Comprehensive Technical Indicators Library
 * 50+ Professional-grade indicators for stock analysis
 */

export interface CandleData {
  datetime: string;
  open: string | number;
  high: string | number;
  low: string | number;
  close: string | number;
  volume: string | number;
}

export interface IndicatorResult {
  time: number;
  value: number;
}

// ==================== TREND INDICATORS ====================

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(data: CandleData[], period: number): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const prices = data.map(d => parseFloat(String(d.close)));

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / period;
    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: avg,
    });
  }
  return result;
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(data: CandleData[], period: number): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const prices = data.map(d => parseFloat(String(d.close)));
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: ema,
    });
  }
  return result;
}

/**
 * Weighted Moving Average (WMA)
 */
export function calculateWMA(data: CandleData[], period: number): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const prices = data.map(d => parseFloat(String(d.close)));
  const weights = Array.from({ length: period }, (_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const wma = slice.reduce((sum, price, idx) => sum + price * weights[idx], 0) / weightSum;
    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: wma,
    });
  }
  return result;
}

/**
 * Double Exponential Moving Average (DEMA)
 */
export function calculateDEMA(data: CandleData[], period: number): IndicatorResult[] {
  const ema1 = calculateEMA(data, period);
  const ema2Data = ema1.map((e, i) => ({
    ...data[i + (data.length - ema1.length)],
    close: e.value,
  }));
  const ema2 = calculateEMA(ema2Data, period);

  return ema1.slice(ema1.length - ema2.length).map((e1, i) => ({
    time: e1.time,
    value: 2 * e1.value - ema2[i].value,
  }));
}

/**
 * Triple Exponential Moving Average (TEMA)
 */
export function calculateTEMA(data: CandleData[], period: number): IndicatorResult[] {
  const ema1 = calculateEMA(data, period);
  const ema2Data = ema1.map((e, i) => ({
    ...data[i + (data.length - ema1.length)],
    close: e.value,
  }));
  const ema2 = calculateEMA(ema2Data, period);
  const ema3Data = ema2.map((e, i) => ({
    ...ema2Data[i + (ema2Data.length - ema2.length)],
    close: e.value,
  }));
  const ema3 = calculateEMA(ema3Data, period);

  return ema1.slice(ema1.length - ema3.length).map((e1, i) => ({
    time: e1.time,
    value: 3 * e1.value - 3 * ema2[i + (ema2.length - ema3.length)].value + ema3[i].value,
  }));
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(data: CandleData[], period = 20, stdDev = 2) {
  const prices = data.map(d => parseFloat(String(d.close)));
  const upper: IndicatorResult[] = [];
  const middle: IndicatorResult[] = [];
  const lower: IndicatorResult[] = [];

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    const time = new Date(data[i].datetime).getTime() / 1000;

    middle.push({ time, value: sma });
    upper.push({ time, value: sma + std * stdDev });
    lower.push({ time, value: sma - std * stdDev });
  }
  return { upper, middle, lower };
}

/**
 * Average Directional Index (ADX)
 */
export function calculateADX(data: CandleData[], period = 14): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const high = parseFloat(String(data[i].high));
    const low = parseFloat(String(data[i].low));
    const close = parseFloat(String(data[i].close));
    const prevHigh = parseFloat(String(data[i - 1].high));
    const prevLow = parseFloat(String(data[i - 1].low));
    const prevClose = parseFloat(String(data[i - 1].close));

    const trueRange = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    tr.push(trueRange);

    const highDiff = high - prevHigh;
    const lowDiff = prevLow - low;
    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
  }

  if (tr.length < period) return result;

  let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let plusDI = plusDM.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let minusDI = minusDM.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < tr.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    plusDI = (plusDI * (period - 1) + plusDM[i]) / period;
    minusDI = (minusDI * (period - 1) + minusDM[i]) / period;

    const plusDIValue = (plusDI / atr) * 100;
    const minusDIValue = (minusDI / atr) * 100;
    const dx = (Math.abs(plusDIValue - minusDIValue) / (plusDIValue + minusDIValue)) * 100;

    if (i === period) {
      result.push({
        time: new Date(data[i + 1].datetime).getTime() / 1000,
        value: dx,
      });
    } else {
      const prevADX = result[result.length - 1].value;
      const adx = ((prevADX * (period - 1)) + dx) / period;
      result.push({
        time: new Date(data[i + 1].datetime).getTime() / 1000,
        value: adx,
      });
    }
  }
  return result;
}

/**
 * Parabolic SAR
 */
export function calculateParabolicSAR(data: CandleData[], acceleration = 0.02, maximum = 0.2): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  if (data.length < 2) return result;

  let sar = parseFloat(String(data[0].low));
  let ep = parseFloat(String(data[0].high));
  let af = acceleration;
  let isUptrend = true;

  for (let i = 1; i < data.length; i++) {
    const high = parseFloat(String(data[i].high));
    const low = parseFloat(String(data[i].low));

    sar = sar + af * (ep - sar);

    if (isUptrend) {
      if (low < sar) {
        isUptrend = false;
        sar = ep;
        ep = low;
        af = acceleration;
      } else {
        if (high > ep) {
          ep = high;
          af = Math.min(af + acceleration, maximum);
        }
      }
    } else {
      if (high > sar) {
        isUptrend = true;
        sar = ep;
        ep = high;
        af = acceleration;
      } else {
        if (low < ep) {
          ep = low;
          af = Math.min(af + acceleration, maximum);
        }
      }
    }

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: sar,
    });
  }
  return result;
}

// ==================== MOMENTUM INDICATORS ====================

/**
 * Relative Strength Index (RSI)
 */
export function calculateRSI(data: CandleData[], period = 14): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const prices = data.map(d => parseFloat(String(d.close)));

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
    const rsi = 100 - (100 / (1 + rs));

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: rsi,
    });
  }
  return result;
}

/**
 * Stochastic Oscillator
 */
export function calculateStochastic(data: CandleData[], period = 14, smoothK = 3, smoothD = 3) {
  const kLine: IndicatorResult[] = [];
  const dLine: IndicatorResult[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const highs = slice.map(d => parseFloat(String(d.high)));
    const lows = slice.map(d => parseFloat(String(d.low)));
    const close = parseFloat(String(data[i].close));

    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    const k = ((close - lowestLow) / (highestHigh - lowestLow)) * 100;

    kLine.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: k,
    });
  }

  // Smooth K line
  const smoothedK: IndicatorResult[] = [];
  for (let i = smoothK - 1; i < kLine.length; i++) {
    const slice = kLine.slice(i - smoothK + 1, i + 1);
    const avg = slice.reduce((sum, item) => sum + item.value, 0) / smoothK;
    smoothedK.push({
      time: kLine[i].time,
      value: avg,
    });
  }

  // Calculate D line (SMA of smoothed K)
  for (let i = smoothD - 1; i < smoothedK.length; i++) {
    const slice = smoothedK.slice(i - smoothD + 1, i + 1);
    const avg = slice.reduce((sum, item) => sum + item.value, 0) / smoothD;
    dLine.push({
      time: smoothedK[i].time,
      value: avg,
    });
  }

  return { kLine: smoothedK, dLine };
}

/**
 * Commodity Channel Index (CCI)
 */
export function calculateCCI(data: CandleData[], period = 20): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const typicalPrices = data.map(d =>
    (parseFloat(String(d.high)) + parseFloat(String(d.low)) + parseFloat(String(d.close))) / 3
  );

  for (let i = period - 1; i < typicalPrices.length; i++) {
    const slice = typicalPrices.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const meanDeviation = slice.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
    const cci = (typicalPrices[i] - sma) / (0.015 * meanDeviation);

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: cci,
    });
  }
  return result;
}

/**
 * Williams %R
 */
export function calculateWilliamsR(data: CandleData[], period = 14): IndicatorResult[] {
  const result: IndicatorResult[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const highs = slice.map(d => parseFloat(String(d.high)));
    const lows = slice.map(d => parseFloat(String(d.low)));
    const close = parseFloat(String(data[i].close));

    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    const williamsR = ((highestHigh - close) / (highestHigh - lowestLow)) * -100;

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: williamsR,
    });
  }
  return result;
}

/**
 * Rate of Change (ROC)
 */
export function calculateROC(data: CandleData[], period = 12): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const prices = data.map(d => parseFloat(String(d.close)));

  for (let i = period; i < prices.length; i++) {
    const roc = ((prices[i] - prices[i - period]) / prices[i - period]) * 100;
    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: roc,
    });
  }
  return result;
}

/**
 * Momentum
 */
export function calculateMomentum(data: CandleData[], period = 10): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const prices = data.map(d => parseFloat(String(d.close)));

  for (let i = period; i < prices.length; i++) {
    const momentum = prices[i] - prices[i - period];
    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: momentum,
    });
  }
  return result;
}

// ==================== VOLATILITY INDICATORS ====================

/**
 * Average True Range (ATR)
 */
export function calculateATR(data: CandleData[], period = 14): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const tr: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const high = parseFloat(String(data[i].high));
    const low = parseFloat(String(data[i].low));
    const prevClose = parseFloat(String(data[i - 1].close));

    const trueRange = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    tr.push(trueRange);
  }

  let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push({
    time: new Date(data[period].datetime).getTime() / 1000,
    value: atr,
  });

  for (let i = period; i < tr.length; i++) {
    atr = ((atr * (period - 1)) + tr[i]) / period;
    result.push({
      time: new Date(data[i + 1].datetime).getTime() / 1000,
      value: atr,
    });
  }
  return result;
}

/**
 * Bollinger Bands Width
 */
export function calculateBBWidth(data: CandleData[], period = 20, stdDev = 2): IndicatorResult[] {
  const bb = calculateBollingerBands(data, period, stdDev);
  return bb.upper.map((u, i) => ({
    time: u.time,
    value: ((u.value - bb.lower[i].value) / bb.middle[i].value) * 100,
  }));
}

/**
 * Bollinger %B
 */
export function calculateBBPercent(data: CandleData[], period = 20, stdDev = 2): IndicatorResult[] {
  const bb = calculateBollingerBands(data, period, stdDev);
  const prices = data.slice(data.length - bb.upper.length);

  return bb.upper.map((u, i) => ({
    time: u.time,
    value: ((parseFloat(String(prices[i].close)) - bb.lower[i].value) / (u.value - bb.lower[i].value)) * 100,
  }));
}

/**
 * Keltner Channels
 */
export function calculateKeltner(data: CandleData[], period = 20, multiplier = 2) {
  const ema = calculateEMA(data, period);
  const atr = calculateATR(data, period);

  const middle: IndicatorResult[] = [];
  const upper: IndicatorResult[] = [];
  const lower: IndicatorResult[] = [];

  const startIdx = data.length - Math.min(ema.length, atr.length);
  const emaSlice = ema.slice(ema.length - Math.min(ema.length, atr.length));
  const atrSlice = atr.slice(atr.length - Math.min(ema.length, atr.length));

  emaSlice.forEach((e, i) => {
    middle.push(e);
    upper.push({ time: e.time, value: e.value + multiplier * atrSlice[i].value });
    lower.push({ time: e.time, value: e.value - multiplier * atrSlice[i].value });
  });

  return { upper, middle, lower };
}

// ==================== VOLUME INDICATORS ====================

/**
 * On-Balance Volume (OBV)
 */
export function calculateOBV(data: CandleData[]): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  let obv = 0;

  for (let i = 1; i < data.length; i++) {
    const close = parseFloat(String(data[i].close));
    const prevClose = parseFloat(String(data[i - 1].close));
    const volume = parseFloat(String(data[i].volume));

    if (close > prevClose) {
      obv += volume;
    } else if (close < prevClose) {
      obv -= volume;
    }

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: obv,
    });
  }
  return result;
}

/**
 * Money Flow Index (MFI)
 */
export function calculateMFI(data: CandleData[], period = 14): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const typicalPrices: number[] = [];
  const rawMoneyFlows: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const tp = (parseFloat(String(data[i].high)) + parseFloat(String(data[i].low)) + parseFloat(String(data[i].close))) / 3;
    typicalPrices.push(tp);
    rawMoneyFlows.push(tp * parseFloat(String(data[i].volume)));
  }

  for (let i = period; i < data.length; i++) {
    let positiveFlow = 0;
    let negativeFlow = 0;

    for (let j = i - period + 1; j <= i; j++) {
      if (typicalPrices[j] > typicalPrices[j - 1]) {
        positiveFlow += rawMoneyFlows[j];
      } else if (typicalPrices[j] < typicalPrices[j - 1]) {
        negativeFlow += rawMoneyFlows[j];
      }
    }

    const moneyRatio = positiveFlow / negativeFlow;
    const mfi = 100 - (100 / (1 + moneyRatio));

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: mfi,
    });
  }
  return result;
}

/**
 * Volume Weighted Average Price (VWAP)
 */
export function calculateVWAP(data: CandleData[]): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < data.length; i++) {
    const tp = (parseFloat(String(data[i].high)) + parseFloat(String(data[i].low)) + parseFloat(String(data[i].close))) / 3;
    const volume = parseFloat(String(data[i].volume));

    cumulativeTPV += tp * volume;
    cumulativeVolume += volume;

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: cumulativeTPV / cumulativeVolume,
    });
  }
  return result;
}

/**
 * Accumulation/Distribution Line (A/D Line)
 */
export function calculateAD(data: CandleData[]): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  let ad = 0;

  for (let i = 0; i < data.length; i++) {
    const high = parseFloat(String(data[i].high));
    const low = parseFloat(String(data[i].low));
    const close = parseFloat(String(data[i].close));
    const volume = parseFloat(String(data[i].volume));

    const mfm = ((close - low) - (high - close)) / (high - low);
    const mfv = mfm * volume;
    ad += mfv;

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: ad,
    });
  }
  return result;
}

/**
 * Chaikin Money Flow (CMF)
 */
export function calculateCMF(data: CandleData[], period = 20): IndicatorResult[] {
  const result: IndicatorResult[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let sumMFV = 0;
    let sumVolume = 0;

    for (let j = i - period + 1; j <= i; j++) {
      const high = parseFloat(String(data[j].high));
      const low = parseFloat(String(data[j].low));
      const close = parseFloat(String(data[j].close));
      const volume = parseFloat(String(data[j].volume));

      const mfm = ((close - low) - (high - close)) / (high - low);
      const mfv = mfm * volume;

      sumMFV += mfv;
      sumVolume += volume;
    }

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: sumMFV / sumVolume,
    });
  }
  return result;
}

// ==================== MACD ====================

/**
 * Moving Average Convergence Divergence (MACD)
 */
export function calculateMACD(data: CandleData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const prices = data.map(d => parseFloat(String(d.close)));
  const ema12: number[] = [];
  const ema26: number[] = [];
  const macdLine: IndicatorResult[] = [];
  const signalLine: IndicatorResult[] = [];
  const histogram: any[] = [];

  // Calculate EMA 12
  let ema = prices.slice(0, fastPeriod).reduce((a, b) => a + b, 0) / fastPeriod;
  for (let i = 0; i < prices.length; i++) {
    if (i >= fastPeriod) {
      ema = (prices[i] - ema) * (2 / (fastPeriod + 1)) + ema;
    }
    ema12.push(ema);
  }

  // Calculate EMA 26
  ema = prices.slice(0, slowPeriod).reduce((a, b) => a + b, 0) / slowPeriod;
  for (let i = 0; i < prices.length; i++) {
    if (i >= slowPeriod) {
      ema = (prices[i] - ema) * (2 / (slowPeriod + 1)) + ema;
    }
    ema26.push(ema);
  }

  // Calculate MACD line
  const macdValues: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    const macdVal = ema12[i] - ema26[i];
    macdValues.push(macdVal);
    macdLine.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: macdVal,
    });
  }

  // Calculate Signal line (EMA 9 of MACD)
  ema = macdValues.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
  for (let i = 0; i < macdValues.length; i++) {
    if (i >= signalPeriod) {
      ema = (macdValues[i] - ema) * (2 / (signalPeriod + 1)) + ema;
    }
    signalLine.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: ema,
    });
    histogram.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: macdValues[i] - ema,
      color: macdValues[i] - ema >= 0 ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 82, 82, 0.5)',
    });
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Ichimoku Cloud
 */
export function calculateIchimoku(data: CandleData[], tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52) {
  const result = {
    tenkanSen: [] as IndicatorResult[],
    kijunSen: [] as IndicatorResult[],
    senkouSpanA: [] as IndicatorResult[],
    senkouSpanB: [] as IndicatorResult[],
    chikouSpan: [] as IndicatorResult[],
  };

  const getHL = (start: number, end: number) => {
    const slice = data.slice(start, end);
    const highs = slice.map(d => parseFloat(String(d.high)));
    const lows = slice.map(d => parseFloat(String(d.low)));
    return (Math.max(...highs) + Math.min(...lows)) / 2;
  };

  for (let i = Math.max(tenkanPeriod, kijunPeriod, senkouBPeriod) - 1; i < data.length; i++) {
    const time = new Date(data[i].datetime).getTime() / 1000;

    // Tenkan-sen (Conversion Line)
    const tenkan = getHL(i - tenkanPeriod + 1, i + 1);
    result.tenkanSen.push({ time, value: tenkan });

    // Kijun-sen (Base Line)
    const kijun = getHL(i - kijunPeriod + 1, i + 1);
    result.kijunSen.push({ time, value: kijun });

    // Senkou Span A (Leading Span A) - shifted forward
    const spanA = (tenkan + kijun) / 2;
    result.senkouSpanA.push({ time, value: spanA });

    // Senkou Span B (Leading Span B) - shifted forward
    const spanB = getHL(i - senkouBPeriod + 1, i + 1);
    result.senkouSpanB.push({ time, value: spanB });

    // Chikou Span (Lagging Span) - current close shifted backward
    const chikou = parseFloat(String(data[i].close));
    result.chikouSpan.push({ time, value: chikou });
  }

  return result;
}

// ==================== ADDITIONAL TREND INDICATORS ====================

/**
 * Aroon Indicator
 */
export function calculateAroon(data: CandleData[], period = 25) {
  const aroonUp: IndicatorResult[] = [];
  const aroonDown: IndicatorResult[] = [];
  const aroonOscillator: IndicatorResult[] = [];

  for (let i = period; i < data.length; i++) {
    const slice = data.slice(i - period, i + 1);
    const highs = slice.map(d => parseFloat(String(d.high)));
    const lows = slice.map(d => parseFloat(String(d.low)));

    const highestHighIdx = highs.indexOf(Math.max(...highs));
    const lowestLowIdx = lows.indexOf(Math.min(...lows));

    const aroonUpValue = ((period - (period - highestHighIdx)) / period) * 100;
    const aroonDownValue = ((period - (period - lowestLowIdx)) / period) * 100;
    const time = new Date(data[i].datetime).getTime() / 1000;

    aroonUp.push({ time, value: aroonUpValue });
    aroonDown.push({ time, value: aroonDownValue });
    aroonOscillator.push({ time, value: aroonUpValue - aroonDownValue });
  }

  return { aroonUp, aroonDown, aroonOscillator };
}

/**
 * Donchian Channels
 */
export function calculateDonchian(data: CandleData[], period = 20) {
  const upper: IndicatorResult[] = [];
  const middle: IndicatorResult[] = [];
  const lower: IndicatorResult[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const highs = slice.map(d => parseFloat(String(d.high)));
    const lows = slice.map(d => parseFloat(String(d.low)));

    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    const time = new Date(data[i].datetime).getTime() / 1000;

    upper.push({ time, value: highestHigh });
    lower.push({ time, value: lowestLow });
    middle.push({ time, value: (highestHigh + lowestLow) / 2 });
  }

  return { upper, middle, lower };
}

/**
 * Moving Average Envelopes
 */
export function calculateEnvelopes(data: CandleData[], period = 20, percent = 2.5) {
  const sma = calculateSMA(data, period);
  const upper: IndicatorResult[] = [];
  const lower: IndicatorResult[] = [];

  sma.forEach(s => {
    upper.push({ time: s.time, value: s.value * (1 + percent / 100) });
    lower.push({ time: s.time, value: s.value * (1 - percent / 100) });
  });

  return { upper, middle: sma, lower };
}

/**
 * Hull Moving Average (HMA)
 */
export function calculateHMA(data: CandleData[], period: number): IndicatorResult[] {
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));

  const wma1 = calculateWMA(data, halfPeriod);
  const wma2 = calculateWMA(data, period);

  // 2 * WMA(n/2) - WMA(n)
  const rawHMA: CandleData[] = [];
  const minLength = Math.min(wma1.length, wma2.length);
  for (let i = 0; i < minLength; i++) {
    const idx = data.length - minLength + i;
    rawHMA.push({
      ...data[idx],
      close: 2 * wma1[wma1.length - minLength + i].value - wma2[wma2.length - minLength + i].value,
    });
  }

  return calculateWMA(rawHMA, sqrtPeriod);
}

/**
 * Kaufman's Adaptive Moving Average (KAMA)
 */
export function calculateKAMA(data: CandleData[], period = 10, fast = 2, slow = 30): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const prices = data.map(d => parseFloat(String(d.close)));

  const fastSC = 2 / (fast + 1);
  const slowSC = 2 / (slow + 1);

  let kama = prices[period - 1];

  for (let i = period; i < prices.length; i++) {
    const change = Math.abs(prices[i] - prices[i - period]);
    let volatility = 0;

    for (let j = i - period; j < i; j++) {
      volatility += Math.abs(prices[j + 1] - prices[j]);
    }

    const er = volatility !== 0 ? change / volatility : 0;
    const sc = Math.pow(er * (fastSC - slowSC) + slowSC, 2);

    kama = kama + sc * (prices[i] - kama);

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: kama,
    });
  }

  return result;
}

/**
 * Zero Lag Exponential Moving Average (ZLEMA)
 */
export function calculateZLEMA(data: CandleData[], period: number): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const prices = data.map(d => parseFloat(String(d.close)));
  const lag = Math.floor((period - 1) / 2);
  const multiplier = 2 / (period + 1);

  const adjustedPrices = prices.map((price, i) => {
    if (i < lag) return price;
    return price + (price - prices[i - lag]);
  });

  let zlema = adjustedPrices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < adjustedPrices.length; i++) {
    zlema = (adjustedPrices[i] - zlema) * multiplier + zlema;
    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: zlema,
    });
  }

  return result;
}

// ==================== ADDITIONAL MOMENTUM INDICATORS ====================

/**
 * Awesome Oscillator (AO)
 */
export function calculateAO(data: CandleData[]): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const medianPrices = data.map(d => (parseFloat(String(d.high)) + parseFloat(String(d.low))) / 2);

  const sma5: number[] = [];
  const sma34: number[] = [];

  for (let i = 4; i < medianPrices.length; i++) {
    const slice5 = medianPrices.slice(i - 4, i + 1);
    sma5.push(slice5.reduce((a, b) => a + b, 0) / 5);
  }

  for (let i = 33; i < medianPrices.length; i++) {
    const slice34 = medianPrices.slice(i - 33, i + 1);
    sma34.push(slice34.reduce((a, b) => a + b, 0) / 34);
  }

  const minLength = Math.min(sma5.length, sma34.length);
  for (let i = 0; i < minLength; i++) {
    const idx = data.length - minLength + i;
    result.push({
      time: new Date(data[idx].datetime).getTime() / 1000,
      value: sma5[sma5.length - minLength + i] - sma34[i],
    });
  }

  return result;
}

/**
 * Ultimate Oscillator
 */
export function calculateUltimateOscillator(data: CandleData[], period1 = 7, period2 = 14, period3 = 28): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const bp: number[] = [];
  const tr: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const high = parseFloat(String(data[i].high));
    const low = parseFloat(String(data[i].low));
    const close = parseFloat(String(data[i].close));
    const prevClose = parseFloat(String(data[i - 1].close));

    bp.push(close - Math.min(low, prevClose));
    tr.push(Math.max(high, prevClose) - Math.min(low, prevClose));
  }

  for (let i = period3 - 1; i < bp.length; i++) {
    const avg1 = bp.slice(i - period1 + 1, i + 1).reduce((a, b) => a + b, 0) /
                 tr.slice(i - period1 + 1, i + 1).reduce((a, b) => a + b, 0);
    const avg2 = bp.slice(i - period2 + 1, i + 1).reduce((a, b) => a + b, 0) /
                 tr.slice(i - period2 + 1, i + 1).reduce((a, b) => a + b, 0);
    const avg3 = bp.slice(i - period3 + 1, i + 1).reduce((a, b) => a + b, 0) /
                 tr.slice(i - period3 + 1, i + 1).reduce((a, b) => a + b, 0);

    const uo = ((4 * avg1) + (2 * avg2) + avg3) / 7 * 100;

    result.push({
      time: new Date(data[i + 1].datetime).getTime() / 1000,
      value: uo,
    });
  }

  return result;
}

/**
 * Percentage Price Oscillator (PPO)
 */
export function calculatePPO(data: CandleData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);

  const ppoLine: IndicatorResult[] = [];
  const minLength = Math.min(emaFast.length, emaSlow.length);

  for (let i = 0; i < minLength; i++) {
    const fastIdx = emaFast.length - minLength + i;
    const slowIdx = emaSlow.length - minLength + i;
    const ppo = ((emaFast[fastIdx].value - emaSlow[slowIdx].value) / emaSlow[slowIdx].value) * 100;

    ppoLine.push({
      time: emaFast[fastIdx].time,
      value: ppo,
    });
  }

  // Calculate signal line
  const ppoValues = ppoLine.map((p, i) => ({
    ...data[data.length - ppoLine.length + i],
    close: p.value,
  }));
  const signalLine = calculateEMA(ppoValues, signalPeriod);

  const histogram: IndicatorResult[] = [];
  const minLen = Math.min(ppoLine.length, signalLine.length);
  for (let i = 0; i < minLen; i++) {
    const ppoIdx = ppoLine.length - minLen + i;
    histogram.push({
      time: ppoLine[ppoIdx].time,
      value: ppoLine[ppoIdx].value - signalLine[i].value,
    });
  }

  return { ppoLine, signalLine, histogram };
}

/**
 * True Strength Index (TSI)
 */
export function calculateTSI(data: CandleData[], longPeriod = 25, shortPeriod = 13, signalPeriod = 7) {
  const result: IndicatorResult[] = [];
  const prices = data.map(d => parseFloat(String(d.close)));
  const momentum: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    momentum.push(prices[i] - prices[i - 1]);
  }

  // Double smooth momentum
  const momentumData = momentum.map((m, i) => ({
    ...data[i + 1],
    close: m,
  }));
  const ema1 = calculateEMA(momentumData, longPeriod);
  const ema1Data = ema1.map((e, i) => ({
    ...data[data.length - ema1.length + i],
    close: e.value,
  }));
  const ema2 = calculateEMA(ema1Data, shortPeriod);

  // Double smooth absolute momentum
  const absMomentumData = momentum.map((m, i) => ({
    ...data[i + 1],
    close: Math.abs(m),
  }));
  const absEma1 = calculateEMA(absMomentumData, longPeriod);
  const absEma1Data = absEma1.map((e, i) => ({
    ...data[data.length - absEma1.length + i],
    close: e.value,
  }));
  const absEma2 = calculateEMA(absEma1Data, shortPeriod);

  const minLength = Math.min(ema2.length, absEma2.length);
  for (let i = 0; i < minLength; i++) {
    const tsi = (ema2[ema2.length - minLength + i].value / absEma2[absEma2.length - minLength + i].value) * 100;
    result.push({
      time: ema2[ema2.length - minLength + i].time,
      value: tsi,
    });
  }

  return result;
}

/**
 * Know Sure Thing (KST)
 */
export function calculateKST(data: CandleData[]): IndicatorResult[] {
  const roc1 = calculateROC(data, 10);
  const roc2 = calculateROC(data, 15);
  const roc3 = calculateROC(data, 20);
  const roc4 = calculateROC(data, 30);

  const rocData1 = roc1.map((r, i) => ({ ...data[data.length - roc1.length + i], close: r.value }));
  const rocData2 = roc2.map((r, i) => ({ ...data[data.length - roc2.length + i], close: r.value }));
  const rocData3 = roc3.map((r, i) => ({ ...data[data.length - roc3.length + i], close: r.value }));
  const rocData4 = roc4.map((r, i) => ({ ...data[data.length - roc4.length + i], close: r.value }));

  const sma1 = calculateSMA(rocData1, 10);
  const sma2 = calculateSMA(rocData2, 10);
  const sma3 = calculateSMA(rocData3, 10);
  const sma4 = calculateSMA(rocData4, 15);

  const result: IndicatorResult[] = [];
  const minLength = Math.min(sma1.length, sma2.length, sma3.length, sma4.length);

  for (let i = 0; i < minLength; i++) {
    const kst =
      sma1[sma1.length - minLength + i].value * 1 +
      sma2[sma2.length - minLength + i].value * 2 +
      sma3[sma3.length - minLength + i].value * 3 +
      sma4[sma4.length - minLength + i].value * 4;

    result.push({
      time: sma1[sma1.length - minLength + i].time,
      value: kst,
    });
  }

  return result;
}

// ==================== ADDITIONAL VOLATILITY INDICATORS ====================

/**
 * Standard Deviation
 */
export function calculateStdDev(data: CandleData[], period = 20): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const prices = data.map(d => parseFloat(String(d.close)));

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: stdDev,
    });
  }

  return result;
}

/**
 * Historical Volatility
 */
export function calculateHistoricalVolatility(data: CandleData[], period = 20): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const returns: number[] = [];
  const prices = data.map(d => parseFloat(String(d.close)));

  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }

  for (let i = period - 1; i < returns.length; i++) {
    const slice = returns.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / period;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized

    result.push({
      time: new Date(data[i + 1].datetime).getTime() / 1000,
      value: volatility,
    });
  }

  return result;
}

/**
 * Chaikin Volatility
 */
export function calculateChaikinVolatility(data: CandleData[], period = 10, rocPeriod = 10): IndicatorResult[] {
  const hlSpread: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const spread = parseFloat(String(data[i].high)) - parseFloat(String(data[i].low));
    hlSpread.push(spread);
  }

  const emaSpread: number[] = [];
  const multiplier = 2 / (period + 1);
  let ema = hlSpread.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < hlSpread.length; i++) {
    ema = (hlSpread[i] - ema) * multiplier + ema;
    emaSpread.push(ema);
  }

  const result: IndicatorResult[] = [];
  for (let i = rocPeriod; i < emaSpread.length; i++) {
    const cv = ((emaSpread[i] - emaSpread[i - rocPeriod]) / emaSpread[i - rocPeriod]) * 100;
    result.push({
      time: new Date(data[i + period].datetime).getTime() / 1000,
      value: cv,
    });
  }

  return result;
}

/**
 * Mass Index
 */
export function calculateMassIndex(data: CandleData[], emaPeriod = 9, sumPeriod = 25): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const hlRange: number[] = [];

  for (let i = 0; i < data.length; i++) {
    hlRange.push(parseFloat(String(data[i].high)) - parseFloat(String(data[i].low)));
  }

  // First EMA
  const ema1: number[] = [];
  let ema = hlRange.slice(0, emaPeriod).reduce((a, b) => a + b, 0) / emaPeriod;
  const multiplier = 2 / (emaPeriod + 1);

  for (let i = emaPeriod; i < hlRange.length; i++) {
    ema = (hlRange[i] - ema) * multiplier + ema;
    ema1.push(ema);
  }

  // Second EMA (EMA of EMA)
  const ema2: number[] = [];
  ema = ema1.slice(0, emaPeriod).reduce((a, b) => a + b, 0) / emaPeriod;

  for (let i = emaPeriod; i < ema1.length; i++) {
    ema = (ema1[i] - ema) * multiplier + ema;
    ema2.push(ema);
  }

  // Calculate Mass Index
  const emaRatio: number[] = [];
  for (let i = 0; i < ema2.length; i++) {
    const idx = ema1.length - ema2.length + i;
    emaRatio.push(ema1[idx] / ema2[i]);
  }

  for (let i = sumPeriod - 1; i < emaRatio.length; i++) {
    const sum = emaRatio.slice(i - sumPeriod + 1, i + 1).reduce((a, b) => a + b, 0);
    const dataIdx = data.length - emaRatio.length + i;
    result.push({
      time: new Date(data[dataIdx].datetime).getTime() / 1000,
      value: sum,
    });
  }

  return result;
}

// ==================== ADDITIONAL VOLUME INDICATORS ====================

/**
 * Ease of Movement (EMV)
 */
export function calculateEMV(data: CandleData[], period = 14): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const emv: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const high = parseFloat(String(data[i].high));
    const low = parseFloat(String(data[i].low));
    const prevHigh = parseFloat(String(data[i - 1].high));
    const prevLow = parseFloat(String(data[i - 1].low));
    const volume = parseFloat(String(data[i].volume));

    const distanceMoved = ((high + low) / 2) - ((prevHigh + prevLow) / 2);
    const boxRatio = (volume / 100000000) / (high - low);
    const emvValue = distanceMoved / boxRatio;

    emv.push(emvValue);
  }

  for (let i = period - 1; i < emv.length; i++) {
    const slice = emv.slice(i - period + 1, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / period;

    result.push({
      time: new Date(data[i + 1].datetime).getTime() / 1000,
      value: avg,
    });
  }

  return result;
}

/**
 * Force Index
 */
export function calculateForceIndex(data: CandleData[], period = 13): IndicatorResult[] {
  const forceValues: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const close = parseFloat(String(data[i].close));
    const prevClose = parseFloat(String(data[i - 1].close));
    const volume = parseFloat(String(data[i].volume));

    forceValues.push((close - prevClose) * volume);
  }

  const forceData = forceValues.map((f, i) => ({
    ...data[i + 1],
    close: f,
  }));

  return calculateEMA(forceData, period);
}

/**
 * Negative Volume Index (NVI)
 */
export function calculateNVI(data: CandleData[]): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  let nvi = 1000;

  for (let i = 1; i < data.length; i++) {
    const volume = parseFloat(String(data[i].volume));
    const prevVolume = parseFloat(String(data[i - 1].volume));
    const close = parseFloat(String(data[i].close));
    const prevClose = parseFloat(String(data[i - 1].close));

    if (volume < prevVolume) {
      const roc = (close - prevClose) / prevClose;
      nvi = nvi * (1 + roc);
    }

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: nvi,
    });
  }

  return result;
}

/**
 * Positive Volume Index (PVI)
 */
export function calculatePVI(data: CandleData[]): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  let pvi = 1000;

  for (let i = 1; i < data.length; i++) {
    const volume = parseFloat(String(data[i].volume));
    const prevVolume = parseFloat(String(data[i - 1].volume));
    const close = parseFloat(String(data[i].close));
    const prevClose = parseFloat(String(data[i - 1].close));

    if (volume > prevVolume) {
      const roc = (close - prevClose) / prevClose;
      pvi = pvi * (1 + roc);
    }

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: pvi,
    });
  }

  return result;
}

/**
 * Volume Rate of Change (VROC)
 */
export function calculateVROC(data: CandleData[], period = 14): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const volumes = data.map(d => parseFloat(String(d.volume)));

  for (let i = period; i < volumes.length; i++) {
    const vroc = ((volumes[i] - volumes[i - period]) / volumes[i - period]) * 100;

    result.push({
      time: new Date(data[i].datetime).getTime() / 1000,
      value: vroc,
    });
  }

  return result;
}

/**
 * Volume Oscillator
 */
export function calculateVolumeOscillator(data: CandleData[], shortPeriod = 5, longPeriod = 10): IndicatorResult[] {
  const volumeData = data.map(d => ({ ...d, close: String(d.volume) }));
  const shortEMA = calculateEMA(volumeData, shortPeriod);
  const longEMA = calculateEMA(volumeData, longPeriod);

  const result: IndicatorResult[] = [];
  const minLength = Math.min(shortEMA.length, longEMA.length);

  for (let i = 0; i < minLength; i++) {
    const shortIdx = shortEMA.length - minLength + i;
    const longIdx = longEMA.length - minLength + i;
    const vo = ((shortEMA[shortIdx].value - longEMA[longIdx].value) / longEMA[longIdx].value) * 100;

    result.push({
      time: shortEMA[shortIdx].time,
      value: vo,
    });
  }

  return result;
}

// ==================== PIVOT POINTS & SUPPORT/RESISTANCE ====================

/**
 * Pivot Points (Standard)
 */
export function calculatePivotPoints(data: CandleData[]) {
  const result: { pivot: IndicatorResult[]; r1: IndicatorResult[]; r2: IndicatorResult[]; r3: IndicatorResult[]; s1: IndicatorResult[]; s2: IndicatorResult[]; s3: IndicatorResult[] } = {
    pivot: [], r1: [], r2: [], r3: [], s1: [], s2: [], s3: []
  };

  for (let i = 1; i < data.length; i++) {
    const high = parseFloat(String(data[i - 1].high));
    const low = parseFloat(String(data[i - 1].low));
    const close = parseFloat(String(data[i - 1].close));
    const time = new Date(data[i].datetime).getTime() / 1000;

    const pivot = (high + low + close) / 3;
    const r1 = 2 * pivot - low;
    const r2 = pivot + (high - low);
    const r3 = high + 2 * (pivot - low);
    const s1 = 2 * pivot - high;
    const s2 = pivot - (high - low);
    const s3 = low - 2 * (high - pivot);

    result.pivot.push({ time, value: pivot });
    result.r1.push({ time, value: r1 });
    result.r2.push({ time, value: r2 });
    result.r3.push({ time, value: r3 });
    result.s1.push({ time, value: s1 });
    result.s2.push({ time, value: s2 });
    result.s3.push({ time, value: s3 });
  }

  return result;
}

/**
 * Fibonacci Retracement Levels
 */
export function calculateFibonacci(data: CandleData[], lookback = 100) {
  const slice = data.slice(-lookback);
  const highs = slice.map(d => parseFloat(String(d.high)));
  const lows = slice.map(d => parseFloat(String(d.low)));

  const high = Math.max(...highs);
  const low = Math.min(...lows);
  const diff = high - low;

  return {
    level_0: low,
    level_236: low + diff * 0.236,
    level_382: low + diff * 0.382,
    level_500: low + diff * 0.5,
    level_618: low + diff * 0.618,
    level_786: low + diff * 0.786,
    level_100: high,
  };
}

// ==================== PATTERN RECOGNITION INDICATORS ====================

/**
 * Detrended Price Oscillator (DPO)
 */
export function calculateDPO(data: CandleData[], period = 20): IndicatorResult[] {
  const result: IndicatorResult[] = [];
  const displacement = Math.floor(period / 2) + 1;
  const sma = calculateSMA(data, period);

  for (let i = 0; i < sma.length; i++) {
    const dataIdx = data.length - sma.length + i;
    const lookbackIdx = dataIdx - displacement;

    if (lookbackIdx >= 0) {
      const price = parseFloat(String(data[lookbackIdx].close));
      const dpo = price - sma[i].value;

      result.push({
        time: new Date(data[dataIdx].datetime).getTime() / 1000,
        value: dpo,
      });
    }
  }

  return result;
}

/**
 * Coppock Curve
 */
export function calculateCoppock(data: CandleData[], rocPeriod1 = 14, rocPeriod2 = 11, wmaPeriod = 10): IndicatorResult[] {
  const roc1 = calculateROC(data, rocPeriod1);
  const roc2 = calculateROC(data, rocPeriod2);

  const combinedROC: CandleData[] = [];
  const minLength = Math.min(roc1.length, roc2.length);

  for (let i = 0; i < minLength; i++) {
    const idx = data.length - minLength + i;
    const rocSum = roc1[roc1.length - minLength + i].value + roc2[roc2.length - minLength + i].value;
    combinedROC.push({ ...data[idx], close: rocSum });
  }

  return calculateWMA(combinedROC, wmaPeriod);
}

/**
 * Vortex Indicator
 */
export function calculateVortex(data: CandleData[], period = 14) {
  const viPlus: IndicatorResult[] = [];
  const viMinus: IndicatorResult[] = [];
  const plusVM: number[] = [];
  const minusVM: number[] = [];
  const tr: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const high = parseFloat(String(data[i].high));
    const low = parseFloat(String(data[i].low));
    const close = parseFloat(String(data[i].close));
    const prevHigh = parseFloat(String(data[i - 1].high));
    const prevLow = parseFloat(String(data[i - 1].low));
    const prevClose = parseFloat(String(data[i - 1].close));

    plusVM.push(Math.abs(high - prevLow));
    minusVM.push(Math.abs(low - prevHigh));
    tr.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }

  for (let i = period - 1; i < plusVM.length; i++) {
    const sumPlusVM = plusVM.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumMinusVM = minusVM.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumTR = tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const time = new Date(data[i + 1].datetime).getTime() / 1000;

    viPlus.push({ time, value: sumPlusVM / sumTR });
    viMinus.push({ time, value: sumMinusVM / sumTR });
  }

  return { viPlus, viMinus };
}
