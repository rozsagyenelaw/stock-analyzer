import { getIndicator, getTimeSeries, getQuote } from './twelveData';

export interface IndicatorResult {
  value: number | object;
  signal: number; // -2 to +2
  interpretation: string;
}

export interface TechnicalIndicators {
  rsi: IndicatorResult;
  macd: IndicatorResult;
  movingAverages: IndicatorResult;
  bollingerBands: IndicatorResult;
  volume: IndicatorResult;
  stochastic: IndicatorResult;
  obv: IndicatorResult;
  atr: IndicatorResult;
  fiftyTwoWeek: IndicatorResult;
}

export async function calculateRSI(symbol: string): Promise<IndicatorResult> {
  try {
    const data = await getIndicator(symbol, 'rsi', { time_period: 14 });
    const latestValue = parseFloat(data.values[0].rsi);

    let signal = 0;
    let interpretation = '';

    if (latestValue >= 70) {
      signal = -2;
      interpretation = `Overbought (${latestValue.toFixed(2)}) - potential sell signal`;
    } else if (latestValue >= 60) {
      signal = -1;
      interpretation = `Approaching overbought (${latestValue.toFixed(2)}) - consider taking profits`;
    } else if (latestValue <= 30) {
      signal = 2;
      interpretation = `Oversold (${latestValue.toFixed(2)}) - potential buy signal`;
    } else if (latestValue <= 40) {
      signal = 1;
      interpretation = `Approaching oversold (${latestValue.toFixed(2)}) - potential buying opportunity`;
    } else {
      signal = 0;
      interpretation = `Neutral (${latestValue.toFixed(2)}) - no clear signal`;
    }

    return { value: latestValue, signal, interpretation };
  } catch (error: any) {
    console.error('Error calculating RSI:', error.message);
    throw error;
  }
}

export async function calculateMACD(symbol: string): Promise<IndicatorResult> {
  try {
    const data = await getIndicator(symbol, 'macd', {
      fast_period: 12,
      slow_period: 26,
      signal_period: 9,
    });

    const latest = data.values[0];
    const previous = data.values[1];

    const macdValue = parseFloat(latest.macd);
    const signalValue = parseFloat(latest.macd_signal);
    const histogram = parseFloat(latest.macd_hist);

    const prevMacdValue = parseFloat(previous.macd);
    const prevSignalValue = parseFloat(previous.macd_signal);

    let signal = 0;
    let interpretation = '';

    // Bullish crossover
    if (macdValue > signalValue && prevMacdValue <= prevSignalValue) {
      signal = 2;
      interpretation = 'Bullish crossover - strong buy signal';
    }
    // Bearish crossover
    else if (macdValue < signalValue && prevMacdValue >= prevSignalValue) {
      signal = -2;
      interpretation = 'Bearish crossover - strong sell signal';
    }
    // Positive MACD, increasing
    else if (macdValue > signalValue && histogram > 0) {
      signal = 1;
      interpretation = 'Positive momentum - bullish';
    }
    // Negative MACD, decreasing
    else if (macdValue < signalValue && histogram < 0) {
      signal = -1;
      interpretation = 'Negative momentum - bearish';
    } else {
      signal = 0;
      interpretation = 'Neutral - no clear trend';
    }

    return {
      value: {
        macd: macdValue,
        signal: signalValue,
        histogram,
      },
      signal,
      interpretation,
    };
  } catch (error: any) {
    console.error('Error calculating MACD:', error.message);
    throw error;
  }
}

export async function calculateMovingAverages(symbol: string): Promise<IndicatorResult> {
  try {
    const [sma20, sma50, sma200, quote] = await Promise.all([
      getIndicator(symbol, 'sma', { time_period: 20 }),
      getIndicator(symbol, 'sma', { time_period: 50 }),
      getIndicator(symbol, 'sma', { time_period: 200 }),
      getQuote(symbol),
    ]);

    const price = parseFloat(quote.close);
    const ma20 = parseFloat(sma20.values[0].sma);
    const ma50 = parseFloat(sma50.values[0].sma);
    const ma200 = parseFloat(sma200.values[0].sma);

    const prevMa50 = parseFloat(sma50.values[1].sma);
    const prevMa200 = parseFloat(sma200.values[1].sma);

    let signal = 0;
    let interpretation = '';

    // Golden cross (50 MA crosses above 200 MA)
    if (ma50 > ma200 && prevMa50 <= prevMa200) {
      signal = 2;
      interpretation = 'Golden Cross detected - strong bullish signal';
    }
    // Death cross (50 MA crosses below 200 MA)
    else if (ma50 < ma200 && prevMa50 >= prevMa200) {
      signal = -2;
      interpretation = 'Death Cross detected - strong bearish signal';
    }
    // Price above all MAs
    else if (price > ma20 && price > ma50 && price > ma200) {
      signal = 2;
      interpretation = 'Price above all moving averages - strong uptrend';
    }
    // Price below all MAs
    else if (price < ma20 && price < ma50 && price < ma200) {
      signal = -2;
      interpretation = 'Price below all moving averages - strong downtrend';
    }
    // Price above 50 and 200 MA
    else if (price > ma50 && price > ma200) {
      signal = 1;
      interpretation = 'Price above long-term averages - uptrend';
    }
    // Price below 50 and 200 MA
    else if (price < ma50 && price < ma200) {
      signal = -1;
      interpretation = 'Price below long-term averages - downtrend';
    } else {
      signal = 0;
      interpretation = 'Mixed moving average signals';
    }

    return {
      value: { ma20, ma50, ma200, price },
      signal,
      interpretation,
    };
  } catch (error: any) {
    console.error('Error calculating moving averages:', error.message);
    throw error;
  }
}

export async function calculateBollingerBands(symbol: string): Promise<IndicatorResult> {
  try {
    const [bbands, quote] = await Promise.all([
      getIndicator(symbol, 'bbands', { time_period: 20, sd: 2 }),
      getQuote(symbol),
    ]);

    const price = parseFloat(quote.close);
    const upper = parseFloat(bbands.values[0].upper_band);
    const middle = parseFloat(bbands.values[0].middle_band);
    const lower = parseFloat(bbands.values[0].lower_band);

    const bandWidth = upper - lower;
    const pricePosition = (price - lower) / bandWidth;

    let signal = 0;
    let interpretation = '';

    if (price <= lower) {
      signal = 2;
      interpretation = 'Price at or below lower band - oversold, potential buy';
    } else if (price >= upper) {
      signal = -2;
      interpretation = 'Price at or above upper band - overbought, potential sell';
    } else if (pricePosition < 0.2) {
      signal = 1;
      interpretation = 'Price near lower band - approaching oversold';
    } else if (pricePosition > 0.8) {
      signal = -1;
      interpretation = 'Price near upper band - approaching overbought';
    } else {
      signal = 0;
      interpretation = 'Price within normal range';
    }

    return {
      value: { upper, middle, lower, price, pricePosition },
      signal,
      interpretation,
    };
  } catch (error: any) {
    console.error('Error calculating Bollinger Bands:', error.message);
    throw error;
  }
}

export async function calculateVolume(symbol: string): Promise<IndicatorResult> {
  try {
    const quote = await getQuote(symbol);

    const currentVolume = parseFloat(quote.volume);
    const avgVolume = parseFloat(quote.average_volume);
    const volumeRatio = currentVolume / avgVolume;

    let signal = 0;
    let interpretation = '';

    if (volumeRatio >= 2.0) {
      signal = 2;
      interpretation = `Extremely high volume (${(volumeRatio * 100).toFixed(0)}% of average) - significant interest`;
    } else if (volumeRatio >= 1.5) {
      signal = 1;
      interpretation = `Above average volume (${(volumeRatio * 100).toFixed(0)}% of average) - increased activity`;
    } else if (volumeRatio <= 0.5) {
      signal = -1;
      interpretation = `Low volume (${(volumeRatio * 100).toFixed(0)}% of average) - weak conviction`;
    } else {
      signal = 0;
      interpretation = `Normal volume (${(volumeRatio * 100).toFixed(0)}% of average)`;
    }

    return {
      value: { current: currentVolume, average: avgVolume, ratio: volumeRatio },
      signal,
      interpretation,
    };
  } catch (error: any) {
    console.error('Error calculating volume:', error.message);
    throw error;
  }
}

export async function calculateStochastic(symbol: string): Promise<IndicatorResult> {
  try {
    const data = await getIndicator(symbol, 'stoch', {
      fast_k_period: 14,
      slow_k_period: 3,
      slow_d_period: 3,
    });

    const slowK = parseFloat(data.values[0].slow_k);
    const slowD = parseFloat(data.values[0].slow_d);

    let signal = 0;
    let interpretation = '';

    if (slowK <= 20 && slowD <= 20) {
      signal = 2;
      interpretation = `Oversold (K: ${slowK.toFixed(2)}, D: ${slowD.toFixed(2)}) - potential buy signal`;
    } else if (slowK >= 80 && slowD >= 80) {
      signal = -2;
      interpretation = `Overbought (K: ${slowK.toFixed(2)}, D: ${slowD.toFixed(2)}) - potential sell signal`;
    } else if (slowK <= 30) {
      signal = 1;
      interpretation = `Approaching oversold (K: ${slowK.toFixed(2)}, D: ${slowD.toFixed(2)})`;
    } else if (slowK >= 70) {
      signal = -1;
      interpretation = `Approaching overbought (K: ${slowK.toFixed(2)}, D: ${slowD.toFixed(2)})`;
    } else {
      signal = 0;
      interpretation = `Neutral (K: ${slowK.toFixed(2)}, D: ${slowD.toFixed(2)})`;
    }

    return {
      value: { slowK, slowD },
      signal,
      interpretation,
    };
  } catch (error: any) {
    console.error('Error calculating Stochastic:', error.message);
    throw error;
  }
}

export async function calculateOBV(symbol: string): Promise<IndicatorResult> {
  try {
    const data = await getIndicator(symbol, 'obv');

    const latestOBV = parseFloat(data.values[0].obv);
    const prevOBV = parseFloat(data.values[1].obv);
    const oldOBV = parseFloat(data.values[20].obv);

    const recentChange = ((latestOBV - prevOBV) / Math.abs(prevOBV)) * 100;
    const longTermChange = ((latestOBV - oldOBV) / Math.abs(oldOBV)) * 100;

    let signal = 0;
    let interpretation = '';

    if (longTermChange > 10) {
      signal = 2;
      interpretation = 'Strong money flow into stock - bullish';
    } else if (longTermChange > 5) {
      signal = 1;
      interpretation = 'Positive money flow - mildly bullish';
    } else if (longTermChange < -10) {
      signal = -2;
      interpretation = 'Strong money flow out of stock - bearish';
    } else if (longTermChange < -5) {
      signal = -1;
      interpretation = 'Negative money flow - mildly bearish';
    } else {
      signal = 0;
      interpretation = 'Neutral money flow';
    }

    return {
      value: { current: latestOBV, change: longTermChange },
      signal,
      interpretation,
    };
  } catch (error: any) {
    console.error('Error calculating OBV:', error.message);
    throw error;
  }
}

export async function calculateATR(symbol: string): Promise<IndicatorResult> {
  try {
    const [atrData, quote] = await Promise.all([
      getIndicator(symbol, 'atr', { time_period: 14 }),
      getQuote(symbol),
    ]);

    const atr = parseFloat(atrData.values[0].atr);
    const price = parseFloat(quote.close);
    const atrPercent = (atr / price) * 100;

    let signal = 0;
    let interpretation = '';

    if (atrPercent > 5) {
      signal = -1;
      interpretation = `High volatility (${atrPercent.toFixed(2)}%) - risky conditions`;
    } else if (atrPercent > 3) {
      signal = 0;
      interpretation = `Moderate volatility (${atrPercent.toFixed(2)}%)`;
    } else {
      signal = 1;
      interpretation = `Low volatility (${atrPercent.toFixed(2)}%) - stable conditions`;
    }

    return {
      value: { atr, atrPercent },
      signal,
      interpretation,
    };
  } catch (error: any) {
    console.error('Error calculating ATR:', error.message);
    throw error;
  }
}

export async function calculate52WeekRange(symbol: string): Promise<IndicatorResult> {
  try {
    const quote = await getQuote(symbol);

    const price = parseFloat(quote.close);
    const low52 = parseFloat(quote.fifty_two_week.low);
    const high52 = parseFloat(quote.fifty_two_week.high);

    const range = high52 - low52;
    const position = (price - low52) / range;

    let signal = 0;
    let interpretation = '';

    if (position <= 0.1) {
      signal = 2;
      interpretation = `Near 52-week low (${(position * 100).toFixed(1)}% of range) - potential value opportunity`;
    } else if (position <= 0.3) {
      signal = 1;
      interpretation = `In lower third of 52-week range (${(position * 100).toFixed(1)}%)`;
    } else if (position >= 0.9) {
      signal = -2;
      interpretation = `Near 52-week high (${(position * 100).toFixed(1)}% of range) - potentially overextended`;
    } else if (position >= 0.7) {
      signal = -1;
      interpretation = `In upper third of 52-week range (${(position * 100).toFixed(1)}%)`;
    } else {
      signal = 0;
      interpretation = `Mid-range (${(position * 100).toFixed(1)}% of 52-week range)`;
    }

    return {
      value: { price, low52, high52, position },
      signal,
      interpretation,
    };
  } catch (error: any) {
    console.error('Error calculating 52-week range:', error.message);
    throw error;
  }
}

export async function getAllIndicators(symbol: string): Promise<TechnicalIndicators> {
  try {
    const [rsi, macd, movingAverages, bollingerBands, volume, stochastic, obv, atr, fiftyTwoWeek] =
      await Promise.all([
        calculateRSI(symbol),
        calculateMACD(symbol),
        calculateMovingAverages(symbol),
        calculateBollingerBands(symbol),
        calculateVolume(symbol),
        calculateStochastic(symbol),
        calculateOBV(symbol),
        calculateATR(symbol),
        calculate52WeekRange(symbol),
      ]);

    return {
      rsi,
      macd,
      movingAverages,
      bollingerBands,
      volume,
      stochastic,
      obv,
      atr,
      fiftyTwoWeek,
    };
  } catch (error: any) {
    console.error('Error calculating all indicators:', error.message);
    throw error;
  }
}

export default {
  calculateRSI,
  calculateMACD,
  calculateMovingAverages,
  calculateBollingerBands,
  calculateVolume,
  calculateStochastic,
  calculateOBV,
  calculateATR,
  calculate52WeekRange,
  getAllIndicators,
};
