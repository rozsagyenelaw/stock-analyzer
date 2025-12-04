/**
 * Price Prediction Models
 *
 * Local ML models for price forecasting:
 * - Linear Regression (trend-based)
 * - ARIMA (time series)
 * - Confidence intervals
 * - Backtesting
 */

// @ts-ignore - regression module doesn't have types
import regression from 'regression';
import { TimeSeriesData } from '../../types';

export interface PricePrediction {
  symbol: string;
  currentPrice: number;
  predictions: {
    '1day': PredictionPoint;
    '1week': PredictionPoint;
    '1month': PredictionPoint;
  };
  trend: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  model: 'linear_regression' | 'arima';
  generatedAt: string;
}

export interface PredictionPoint {
  price: number;
  change: number; // percentage
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  confidence: number; // 0-100
}

export interface BacktestResult {
  accuracy: number; // percentage of predictions within confidence interval
  avgError: number; // MAPE (Mean Absolute Percentage Error)
  sharpeRatio: number;
  predictions: Array<{
    date: string;
    predicted: number;
    actual: number;
    error: number;
  }>;
}

/**
 * Linear Regression Price Prediction
 * Best for trending markets
 */
export function predictWithLinearRegression(
  candles: TimeSeriesData[],
  horizonDays: number = 30
): PricePrediction {
  if (candles.length < 30) {
    throw new Error('Insufficient data for prediction (minimum 30 data points)');
  }

  // Prepare data: convert to [x, y] pairs (day index, closing price)
  const data = candles
    .slice(0, horizonDays)
    .map((candle, index) => [index, parseFloat(candle.close)] as [number, number])
    .reverse(); // Oldest to newest

  // Calculate linear regression
  const result = regression.linear(data);
  const slope = result.equation[0];
  const intercept = result.equation[1];

  // Calculate prediction error (standard deviation of residuals)
  const residuals = data.map(([x, actual]) => {
    const predicted = slope * x + intercept;
    return actual - predicted;
  });
  const stdDev = calculateStdDev(residuals);

  const currentPrice = parseFloat(candles[0].close);
  const lastIndex = data.length - 1;

  // Predict future prices
  const predict1Day = slope * (lastIndex + 1) + intercept;
  const predict1Week = slope * (lastIndex + 7) + intercept;
  const predict1Month = slope * (lastIndex + 30) + intercept;

  // Calculate confidence intervals (95% confidence = 1.96 * std dev)
  const confidenceMultiplier = 1.96;

  return {
    symbol: candles[0].symbol || 'UNKNOWN',
    currentPrice,
    predictions: {
      '1day': {
        price: predict1Day,
        change: ((predict1Day - currentPrice) / currentPrice) * 100,
        confidenceInterval: {
          lower: predict1Day - confidenceMultiplier * stdDev,
          upper: predict1Day + confidenceMultiplier * stdDev,
        },
        confidence: calculateConfidence(stdDev, currentPrice),
      },
      '1week': {
        price: predict1Week,
        change: ((predict1Week - currentPrice) / currentPrice) * 100,
        confidenceInterval: {
          lower: predict1Week - confidenceMultiplier * stdDev * Math.sqrt(7),
          upper: predict1Week + confidenceMultiplier * stdDev * Math.sqrt(7),
        },
        confidence: calculateConfidence(stdDev * Math.sqrt(7), currentPrice),
      },
      '1month': {
        price: predict1Month,
        change: ((predict1Month - currentPrice) / currentPrice) * 100,
        confidenceInterval: {
          lower: predict1Month - confidenceMultiplier * stdDev * Math.sqrt(30),
          upper: predict1Month + confidenceMultiplier * stdDev * Math.sqrt(30),
        },
        confidence: calculateConfidence(stdDev * Math.sqrt(30), currentPrice),
      },
    },
    trend: slope > 0.05 ? 'bullish' : slope < -0.05 ? 'bearish' : 'neutral',
    confidence: calculateConfidence(stdDev, currentPrice),
    model: 'linear_regression',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Simple ARIMA implementation (AR component only for simplicity)
 * Uses autoregressive model to predict based on past values
 */
export function predictWithARIMA(
  candles: TimeSeriesData[],
  order: { p: number; d: number; q: number } = { p: 5, d: 1, q: 0 }
): PricePrediction {
  if (candles.length < 60) {
    throw new Error('Insufficient data for ARIMA (minimum 60 data points)');
  }

  const prices = candles.map(c => parseFloat(c.close)).reverse(); // Oldest to newest
  const currentPrice = prices[prices.length - 1];

  // Differencing (d parameter)
  let diffPrices = prices;
  for (let i = 0; i < order.d; i++) {
    diffPrices = difference(diffPrices);
  }

  // Autoregressive component (p parameter)
  const arCoefficients = calculateARCoefficients(diffPrices, order.p);

  // Forecast
  const forecast1Day = forecastAR(diffPrices, arCoefficients, 1);
  const forecast1Week = forecastAR(diffPrices, arCoefficients, 7);
  const forecast1Month = forecastAR(diffPrices, arCoefficients, 30);

  // Inverse differencing to get actual prices
  const predict1Day = inverseDifference(prices, forecast1Day, order.d);
  const predict1Week = inverseDifference(prices, forecast1Week, order.d);
  const predict1Month = inverseDifference(prices, forecast1Month, order.d);

  // Calculate prediction error
  const errors = calculateARErrors(diffPrices, arCoefficients);
  const stdDev = calculateStdDev(errors);
  const confidenceMultiplier = 1.96;

  return {
    symbol: candles[0].symbol || 'UNKNOWN',
    currentPrice,
    predictions: {
      '1day': {
        price: predict1Day[predict1Day.length - 1],
        change: ((predict1Day[predict1Day.length - 1] - currentPrice) / currentPrice) * 100,
        confidenceInterval: {
          lower: predict1Day[predict1Day.length - 1] - confidenceMultiplier * stdDev,
          upper: predict1Day[predict1Day.length - 1] + confidenceMultiplier * stdDev,
        },
        confidence: calculateConfidence(stdDev, currentPrice),
      },
      '1week': {
        price: predict1Week[predict1Week.length - 1],
        change: ((predict1Week[predict1Week.length - 1] - currentPrice) / currentPrice) * 100,
        confidenceInterval: {
          lower: predict1Week[predict1Week.length - 1] - confidenceMultiplier * stdDev * Math.sqrt(7),
          upper: predict1Week[predict1Week.length - 1] + confidenceMultiplier * stdDev * Math.sqrt(7),
        },
        confidence: calculateConfidence(stdDev * Math.sqrt(7), currentPrice),
      },
      '1month': {
        price: predict1Month[predict1Month.length - 1],
        change: ((predict1Month[predict1Month.length - 1] - currentPrice) / currentPrice) * 100,
        confidenceInterval: {
          lower: predict1Month[predict1Month.length - 1] - confidenceMultiplier * stdDev * Math.sqrt(30),
          upper: predict1Month[predict1Month.length - 1] + confidenceMultiplier * stdDev * Math.sqrt(30),
        },
        confidence: calculateConfidence(stdDev * Math.sqrt(30), currentPrice),
      },
    },
    trend: determineTrend(predict1Month[predict1Month.length - 1], currentPrice),
    confidence: calculateConfidence(stdDev, currentPrice),
    model: 'arima',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Backtest prediction model against historical data
 */
export function backtestModel(
  candles: TimeSeriesData[],
  model: 'linear_regression' | 'arima',
  testPeriod: number = 30
): BacktestResult {
  if (candles.length < testPeriod + 60) {
    throw new Error('Insufficient data for backtesting');
  }

  const predictions: Array<{
    date: string;
    predicted: number;
    actual: number;
    error: number;
  }> = [];

  let totalError = 0;
  let correctPredictions = 0;

  // Test predictions for each day in test period
  for (let i = testPeriod; i > 0; i--) {
    const trainingData = candles.slice(i);
    const actualCandle = candles[i - 1];
    const actualPrice = parseFloat(actualCandle.close);

    try {
      let prediction: PricePrediction;

      if (model === 'linear_regression') {
        prediction = predictWithLinearRegression(trainingData, 30);
      } else {
        prediction = predictWithARIMA(trainingData);
      }

      const predictedPrice = prediction.predictions['1day'].price;
      const error = Math.abs((predictedPrice - actualPrice) / actualPrice) * 100;

      predictions.push({
        date: actualCandle.datetime,
        predicted: predictedPrice,
        actual: actualPrice,
        error,
      });

      totalError += error;

      // Check if actual price was within confidence interval
      const ci = prediction.predictions['1day'].confidenceInterval;
      if (actualPrice >= ci.lower && actualPrice <= ci.upper) {
        correctPredictions++;
      }
    } catch (err) {
      console.error(`Backtest error at index ${i}:`, err);
    }
  }

  const accuracy = (correctPredictions / predictions.length) * 100;
  const avgError = totalError / predictions.length; // MAPE

  // Calculate Sharpe Ratio
  const returns = predictions.map((p, i) => {
    if (i === 0) return 0;
    const predictedReturn = (p.predicted - predictions[i - 1].actual) / predictions[i - 1].actual;
    return predictedReturn;
  });
  const sharpeRatio = calculateSharpeRatio(returns);

  return {
    accuracy,
    avgError,
    sharpeRatio,
    predictions,
  };
}

/**
 * Helper: Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Helper: Calculate confidence score (0-100)
 * Lower error = higher confidence
 */
function calculateConfidence(stdDev: number, price: number): number {
  const errorPercent = (stdDev / price) * 100;
  const confidence = Math.max(0, Math.min(100, 100 - errorPercent * 2));
  return Math.round(confidence);
}

/**
 * Helper: Calculate first difference of series
 */
function difference(series: number[]): number[] {
  const diff: number[] = [];
  for (let i = 1; i < series.length; i++) {
    diff.push(series[i] - series[i - 1]);
  }
  return diff;
}

/**
 * Helper: Calculate AR coefficients using OLS
 */
function calculateARCoefficients(series: number[], order: number): number[] {
  const n = series.length;
  if (n <= order) {
    throw new Error('Series too short for AR order');
  }

  // Prepare X (lagged values) and y (current values)
  const X: number[][] = [];
  const y: number[] = [];

  for (let i = order; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < order; j++) {
      row.push(series[i - j - 1]);
    }
    X.push(row);
    y.push(series[i]);
  }

  // Simple least squares estimation
  // For simplicity, use equal weights (could implement proper OLS)
  const coefficients: number[] = new Array(order).fill(0);

  for (let j = 0; j < order; j++) {
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < X.length; i++) {
      sumXY += X[i][j] * y[i];
      sumXX += X[i][j] * X[i][j];
    }
    coefficients[j] = sumXX !== 0 ? sumXY / sumXX : 0;
  }

  return coefficients;
}

/**
 * Helper: Forecast using AR coefficients
 */
function forecastAR(series: number[], coefficients: number[], steps: number): number[] {
  const forecast = [...series];

  for (let step = 0; step < steps; step++) {
    let nextValue = 0;
    for (let i = 0; i < coefficients.length; i++) {
      nextValue += coefficients[i] * forecast[forecast.length - i - 1];
    }
    forecast.push(nextValue);
  }

  return forecast;
}

/**
 * Helper: Inverse differencing
 */
function inverseDifference(original: number[], differenced: number[], order: number): number[] {
  let result = [...differenced];

  for (let d = 0; d < order; d++) {
    const integrated: number[] = [original[original.length - order + d]];
    for (let i = 0; i < result.length; i++) {
      integrated.push(integrated[i] + result[i]);
    }
    result = integrated.slice(1);
  }

  return result;
}

/**
 * Helper: Calculate AR model errors
 */
function calculateARErrors(series: number[], coefficients: number[]): number[] {
  const errors: number[] = [];
  const order = coefficients.length;

  for (let i = order; i < series.length; i++) {
    let predicted = 0;
    for (let j = 0; j < order; j++) {
      predicted += coefficients[j] * series[i - j - 1];
    }
    errors.push(series[i] - predicted);
  }

  return errors;
}

/**
 * Helper: Determine trend from prediction
 */
function determineTrend(predictedPrice: number, currentPrice: number): 'bullish' | 'bearish' | 'neutral' {
  const change = ((predictedPrice - currentPrice) / currentPrice) * 100;
  if (change > 2) return 'bullish';
  if (change < -2) return 'bearish';
  return 'neutral';
}

/**
 * Helper: Calculate Sharpe Ratio
 */
function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = calculateStdDev(returns);

  if (stdDev === 0) return 0;

  // Annualized Sharpe Ratio
  const dailyRiskFreeRate = riskFreeRate / 252; // 252 trading days
  const sharpe = ((avgReturn - dailyRiskFreeRate) / stdDev) * Math.sqrt(252);

  return sharpe;
}

/**
 * Main prediction function - chooses best model based on data characteristics
 */
export function generatePricePrediction(
  candles: TimeSeriesData[],
  preferredModel?: 'linear_regression' | 'arima'
): PricePrediction {
  if (preferredModel === 'arima') {
    return predictWithARIMA(candles);
  } else if (preferredModel === 'linear_regression') {
    return predictWithLinearRegression(candles);
  }

  // Auto-select model based on trend strength
  const recentCandles = candles.slice(0, 30);
  const prices = recentCandles.map(c => parseFloat(c.close));
  const firstPrice = prices[prices.length - 1];
  const lastPrice = prices[0];
  const trendStrength = Math.abs((lastPrice - firstPrice) / firstPrice);

  // Use linear regression for strong trends, ARIMA for mean-reverting
  if (trendStrength > 0.1) {
    return predictWithLinearRegression(candles);
  } else {
    return predictWithARIMA(candles);
  }
}
