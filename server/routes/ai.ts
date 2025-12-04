/**
 * AI & Machine Learning Routes
 *
 * Endpoints for:
 * - Pattern recognition
 * - Price predictions
 * - Technical sentiment scoring
 * - OpenAI-powered features (sentiment, recommendations, Q&A)
 */

import { Router } from 'express';
import { getTimeSeries } from '../services/twelveData';
import { detectAllPatterns, detectSupportResistance } from '../services/ai/patternRecognition';
import {
  generatePricePrediction,
  predictWithLinearRegression,
  predictWithARIMA,
  backtestModel,
} from '../services/ai/predictions';
import { calculateTechnicalSentiment } from '../services/ai/sentimentScoring';
import {
  analyzeNewsSentiment,
  getAITradingRecommendation,
  answerTradingQuestion,
  explainPattern,
  generateMarketCommentary,
  generateAlertReasoning,
  analyzeEarningsCall,
  isOpenAIConfigured,
} from '../services/ai/openai';
import { getOptionsStrategyRecommendation } from '../services/ai/optionsStrategy';
import { getEntryExitTiming } from '../services/ai/entryExitTiming';
import { getRiskAssessment } from '../services/ai/riskAssessment';
import { analyzeTradeHistory, getTradeRecommendation, Trade } from '../services/ai/tradeJournal';
import { analyzeEarningsEvent, predictEarningsSurprise } from '../services/ai/earningsAnalyzer';
import { analyzeGreeks, generateGreeksAlerts } from '../services/ai/greeksMonitor';
import { tradeQueries } from '../services/database';

const router = Router();

/**
 * GET /api/ai/status
 * Check if AI features are configured
 */
router.get('/status', (req, res) => {
  res.json({
    openAIConfigured: isOpenAIConfigured(),
    features: {
      patternRecognition: true, // Always available (local)
      pricePredictions: true, // Always available (local)
      technicalSentiment: true, // Always available (local)
      aiAnalysis: isOpenAIConfigured(), // Requires OpenAI
      tradingAssistant: isOpenAIConfigured(), // Requires OpenAI
      marketCommentary: isOpenAIConfigured(), // Requires OpenAI
      optionsStrategy: isOpenAIConfigured(), // Requires OpenAI
      entryExitTiming: isOpenAIConfigured(), // Requires OpenAI
      riskAssessment: isOpenAIConfigured(), // Requires OpenAI
      tradeJournal: isOpenAIConfigured(), // Requires OpenAI
      earningsAnalyzer: isOpenAIConfigured(), // Requires OpenAI
      greeksMonitor: isOpenAIConfigured(), // Requires OpenAI
    },
  });
});

/**
 * GET /api/ai/:symbol/patterns
 * Detect chart and candlestick patterns
 */
router.get('/:symbol/patterns', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1day' } = req.query;

    // Get time series data
    const timeSeriesResponse = await getTimeSeries(symbol.toUpperCase(), interval as string, 100);

    if (!timeSeriesResponse || !timeSeriesResponse.values || timeSeriesResponse.values.length === 0) {
      return res.status(404).json({ error: 'No data found for symbol' });
    }

    // Add symbol to each data point
    const timeSeries = timeSeriesResponse.values.map(v => ({ ...v, symbol: timeSeriesResponse.meta.symbol }));

    // Detect patterns
    const patterns = detectAllPatterns(timeSeries);
    const supportResistance = detectSupportResistance(timeSeries);

    res.json({
      symbol: symbol.toUpperCase(),
      patterns,
      supportResistance,
      detectedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Pattern detection error:', error);
    res.status(500).json({ error: 'Failed to detect patterns', message: error.message });
  }
});

/**
 * GET /api/ai/:symbol/predictions
 * Generate price predictions
 */
router.get('/:symbol/predictions', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { model, interval = '1day' } = req.query;

    // Get time series data
    const timeSeriesResponse = await getTimeSeries(symbol.toUpperCase(), interval as string, 200);

    if (!timeSeriesResponse || !timeSeriesResponse.values || timeSeriesResponse.values.length === 0) {
      return res.status(404).json({ error: 'No data found for symbol' });
    }

    // Add symbol to each data point
    const timeSeries = timeSeriesResponse.values.map(v => ({ ...v, symbol: timeSeriesResponse.meta.symbol }));

    // Generate prediction
    let prediction;
    if (model === 'linear') {
      prediction = predictWithLinearRegression(timeSeries);
    } else if (model === 'arima') {
      prediction = predictWithARIMA(timeSeries);
    } else {
      // Auto-select best model
      prediction = generatePricePrediction(timeSeries);
    }

    res.json(prediction);
  } catch (error: any) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Failed to generate prediction', message: error.message });
  }
});

/**
 * GET /api/ai/:symbol/backtest
 * Backtest prediction model
 */
router.get('/:symbol/backtest', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { model = 'linear_regression', period = '30', interval = '1day' } = req.query;

    // Get time series data (need extra data for backtesting)
    const timeSeriesResponse = await getTimeSeries(
      symbol.toUpperCase(),
      interval as string,
      200 + parseInt(period as string)
    );

    if (!timeSeriesResponse || !timeSeriesResponse.values || timeSeriesResponse.values.length === 0) {
      return res.status(404).json({ error: 'No data found for symbol' });
    }

    // Add symbol to each data point
    const timeSeries = timeSeriesResponse.values.map(v => ({ ...v, symbol: timeSeriesResponse.meta.symbol }));

    // Run backtest
    const result = backtestModel(
      timeSeries,
      model as 'linear_regression' | 'arima',
      parseInt(period as string)
    );

    res.json({
      symbol: symbol.toUpperCase(),
      model,
      testPeriod: parseInt(period as string),
      ...result,
    });
  } catch (error: any) {
    console.error('Backtest error:', error);
    res.status(500).json({ error: 'Failed to run backtest', message: error.message });
  }
});

/**
 * POST /api/ai/:symbol/sentiment
 * Calculate technical sentiment score
 */
router.post('/:symbol/sentiment', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1day', optionsData, patterns } = req.body;

    // Get time series data
    const timeSeriesResponse = await getTimeSeries(symbol.toUpperCase(), interval as string, 100);

    if (!timeSeriesResponse || !timeSeriesResponse.values || timeSeriesResponse.values.length === 0) {
      return res.status(404).json({ error: 'No data found for symbol' });
    }

    // Add symbol to each data point
    const timeSeries = timeSeriesResponse.values.map(v => ({ ...v, symbol: timeSeriesResponse.meta.symbol }));

    // Calculate sentiment
    const sentiment = calculateTechnicalSentiment(timeSeries, patterns, optionsData);

    res.json({
      symbol: symbol.toUpperCase(),
      ...sentiment,
    });
  } catch (error: any) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment', message: error.message });
  }
});

/**
 * POST /api/ai/:symbol/analyze-news
 * Analyze news sentiment with GPT-4 (requires OpenAI)
 */
router.post('/:symbol/analyze-news', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const { symbol } = req.params;
    const { headlines } = req.body;

    if (!headlines || !Array.isArray(headlines) || headlines.length === 0) {
      return res.status(400).json({ error: 'Headlines array is required' });
    }

    const analysis = await analyzeNewsSentiment(symbol.toUpperCase(), headlines);

    res.json({
      symbol: symbol.toUpperCase(),
      ...analysis,
    });
  } catch (error: any) {
    console.error('News sentiment error:', error);
    res.status(500).json({ error: 'Failed to analyze news sentiment', message: error.message });
  }
});

/**
 * POST /api/ai/:symbol/recommendation
 * Get AI trading recommendation (requires OpenAI)
 */
router.post('/:symbol/recommendation', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const { symbol } = req.params;
    const { price, technicalAnalysis, fundamentals, optionsFlow, patterns } = req.body;

    if (!price || !technicalAnalysis) {
      return res.status(400).json({ error: 'Price and technical analysis are required' });
    }

    const recommendation = await getAITradingRecommendation(symbol.toUpperCase(), {
      price,
      technicalAnalysis,
      fundamentals,
      optionsFlow,
      patterns,
    });

    res.json({
      symbol: symbol.toUpperCase(),
      ...recommendation,
    });
  } catch (error: any) {
    console.error('AI recommendation error:', error);
    res.status(500).json({ error: 'Failed to get AI recommendation', message: error.message });
  }
});

/**
 * POST /api/ai/ask
 * Ask the AI trading assistant a question (requires OpenAI)
 */
router.post('/ask', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const { question, symbol, marketData } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    const answer = await answerTradingQuestion(question, {
      symbol,
      marketData,
    });

    res.json({
      question,
      answer,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('AI assistant error:', error);
    res.status(500).json({ error: 'Failed to answer question', message: error.message });
  }
});

/**
 * POST /api/ai/explain-pattern
 * Get plain English explanation of a pattern (requires OpenAI)
 */
router.post('/explain-pattern', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const { patternName, symbol, patternDetails } = req.body;

    if (!patternName || !symbol) {
      return res.status(400).json({ error: 'Pattern name and symbol are required' });
    }

    const explanation = await explainPattern(patternName, symbol.toUpperCase(), patternDetails);

    res.json({
      pattern: patternName,
      symbol: symbol.toUpperCase(),
      explanation,
    });
  } catch (error: any) {
    console.error('Pattern explanation error:', error);
    res.status(500).json({ error: 'Failed to explain pattern', message: error.message });
  }
});

/**
 * POST /api/ai/market-commentary
 * Generate AI market commentary (requires OpenAI)
 */
router.post('/market-commentary', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const { topGainers, topLosers, sectorPerformance, marketSentiment } = req.body;

    if (!topGainers || !topLosers || !marketSentiment) {
      return res.status(400).json({
        error: 'Top gainers, top losers, and market sentiment are required'
      });
    }

    const commentary = await generateMarketCommentary({
      topGainers,
      topLosers,
      sectorPerformance: sectorPerformance || {},
      marketSentiment,
    });

    res.json({
      ...commentary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Market commentary error:', error);
    res.status(500).json({ error: 'Failed to generate commentary', message: error.message });
  }
});

/**
 * POST /api/ai/alert-reasoning
 * Generate AI reasoning for an alert (requires OpenAI)
 */
router.post('/alert-reasoning', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const { symbol, alertType, triggerValue, currentData } = req.body;

    if (!symbol || !alertType || triggerValue === undefined) {
      return res.status(400).json({
        error: 'Symbol, alert type, and trigger value are required'
      });
    }

    const reasoning = await generateAlertReasoning(
      symbol.toUpperCase(),
      alertType,
      triggerValue,
      currentData || {}
    );

    res.json({
      symbol: symbol.toUpperCase(),
      alertType,
      reasoning,
    });
  } catch (error: any) {
    console.error('Alert reasoning error:', error);
    res.status(500).json({ error: 'Failed to generate alert reasoning', message: error.message });
  }
});

/**
 * POST /api/ai/:symbol/earnings-analysis
 * Analyze earnings call transcript (requires OpenAI)
 */
router.post('/:symbol/earnings-analysis', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const { symbol } = req.params;
    const { transcript } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Earnings transcript is required' });
    }

    const analysis = await analyzeEarningsCall(symbol.toUpperCase(), transcript);

    res.json({
      symbol: symbol.toUpperCase(),
      ...analysis,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Earnings analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze earnings call', message: error.message });
  }
});

/**
 * GET /api/ai/:symbol/comprehensive
 * Get comprehensive AI analysis (combines multiple features)
 */
router.get('/:symbol/comprehensive', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1day' } = req.query;

    // Get time series data
    const timeSeriesResponse = await getTimeSeries(symbol.toUpperCase(), interval as string, 200);

    if (!timeSeriesResponse || !timeSeriesResponse.values || timeSeriesResponse.values.length === 0) {
      return res.status(404).json({ error: 'No data found for symbol' });
    }

    // Add symbol to each data point
    const timeSeries = timeSeriesResponse.values.map(v => ({ ...v, symbol: timeSeriesResponse.meta.symbol }));

    // Run all local analyses in parallel
    const [patterns, supportResistance, prediction, sentiment] = await Promise.all([
      Promise.resolve(detectAllPatterns(timeSeries)),
      Promise.resolve(detectSupportResistance(timeSeries)),
      Promise.resolve(generatePricePrediction(timeSeries)),
      Promise.resolve(calculateTechnicalSentiment(timeSeries)),
    ]);

    res.json({
      symbol: symbol.toUpperCase(),
      patterns,
      supportResistance,
      prediction,
      sentiment,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Comprehensive analysis error:', error);
    res.status(500).json({ error: 'Failed to generate comprehensive analysis', message: error.message });
  }
});

/**
 * POST /api/ai/:symbol/options-strategy
 * Get AI options strategy recommendation (requires OpenAI)
 */
router.post('/:symbol/options-strategy', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const { symbol } = req.params;
    const {
      currentPrice,
      outlook,
      ivRank,
      ivPercentile,
      technicalAnalysis,
      daysToEarnings,
      timeHorizon,
      riskTolerance,
    } = req.body;

    if (!currentPrice || !outlook || !technicalAnalysis || !timeHorizon || !riskTolerance) {
      return res.status(400).json({
        error: 'currentPrice, outlook, technicalAnalysis, timeHorizon, and riskTolerance are required'
      });
    }

    const recommendation = await getOptionsStrategyRecommendation({
      symbol: symbol.toUpperCase(),
      currentPrice,
      outlook,
      ivRank,
      ivPercentile,
      technicalAnalysis,
      daysToEarnings,
      timeHorizon,
      riskTolerance,
    });

    res.json({
      symbol: symbol.toUpperCase(),
      ...recommendation,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Options strategy error:', error);
    res.status(500).json({ error: 'Failed to get options strategy recommendation', message: error.message });
  }
});

/**
 * POST /api/ai/:symbol/entry-exit-timing
 * Get AI entry/exit timing recommendation (requires OpenAI)
 */
router.post('/:symbol/entry-exit-timing', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const { symbol } = req.params;
    const {
      currentPrice,
      technicalAnalysis,
      sentiment,
      position,
      entryPrice,
      timeframe,
    } = req.body;

    if (!currentPrice || !technicalAnalysis || !timeframe) {
      return res.status(400).json({
        error: 'currentPrice, technicalAnalysis, and timeframe are required'
      });
    }

    const recommendation = await getEntryExitTiming({
      symbol: symbol.toUpperCase(),
      currentPrice,
      technicalAnalysis,
      sentiment,
      position: position || 'none',
      entryPrice,
      timeframe,
    });

    res.json({
      symbol: symbol.toUpperCase(),
      ...recommendation,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Entry/exit timing error:', error);
    res.status(500).json({ error: 'Failed to get entry/exit timing recommendation', message: error.message });
  }
});

/**
 * POST /api/ai/:symbol/risk-assessment
 * Get AI risk assessment and position sizing (requires OpenAI)
 */
router.post('/:symbol/risk-assessment', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const { symbol } = req.params;
    const {
      currentPrice,
      stopLoss,
      portfolioValue,
      riskPerTrade,
      technicalAnalysis,
      existingPositions,
      cashAvailable,
    } = req.body;

    if (!currentPrice || !stopLoss || !portfolioValue || !riskPerTrade || !technicalAnalysis || cashAvailable === undefined) {
      return res.status(400).json({
        error: 'currentPrice, stopLoss, portfolioValue, riskPerTrade, technicalAnalysis, and cashAvailable are required'
      });
    }

    const assessment = await getRiskAssessment({
      symbol: symbol.toUpperCase(),
      currentPrice,
      stopLoss,
      portfolioValue,
      riskPerTrade,
      technicalAnalysis,
      existingPositions: existingPositions || [],
      cashAvailable,
    });

    res.json({
      symbol: symbol.toUpperCase(),
      ...assessment,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Risk assessment error:', error);
    res.status(500).json({ error: 'Failed to get risk assessment', message: error.message });
  }
});

/**
 * GET /api/ai/trade-journal/analysis
 * Analyze trade history and identify patterns
 */
router.get('/trade-journal/analysis', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    // Get all trades from database
    const trades = tradeQueries.getAll.all();

    if (trades.length === 0) {
      return res.json({
        message: 'No trades found. Start logging trades to get AI analysis.',
        summary: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          averageWin: 0,
          averageLoss: 0,
          profitFactor: 0,
          totalProfitLoss: 0,
          largestWin: 0,
          largestLoss: 0,
        },
      });
    }

    const analysis = await analyzeTradeHistory(trades as Trade[]);

    res.json({
      ...analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Trade journal analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze trade history', message: error.message });
  }
});

/**
 * POST /api/ai/trade-journal/recommend
 * Get recommendation for a proposed trade based on history
 */
router.post('/trade-journal/recommend', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const { symbol, direction, entryPrice, strategyTag } = req.body;

    if (!symbol || !direction || !entryPrice) {
      return res.status(400).json({
        error: 'symbol, direction, and entryPrice are required'
      });
    }

    const trades = tradeQueries.getAll.all();
    const recommendation = await getTradeRecommendation(
      { symbol: symbol.toUpperCase(), direction, entryPrice, strategyTag },
      trades as Trade[]
    );

    res.json({
      symbol: symbol.toUpperCase(),
      ...recommendation,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Trade recommendation error:', error);
    res.status(500).json({ error: 'Failed to get trade recommendation', message: error.message });
  }
});

/**
 * POST /api/ai/:symbol/earnings-analysis
 * Analyze earnings event for trading opportunities
 */
router.post('/:symbol/earnings-analysis', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const { symbol } = req.params;
    const {
      currentPrice,
      earningsDate,
      daysUntilEarnings,
      currentIV,
      historicalMoves,
      optionsData,
    } = req.body;

    if (!currentPrice || !earningsDate || daysUntilEarnings === undefined || !currentIV) {
      return res.status(400).json({
        error: 'currentPrice, earningsDate, daysUntilEarnings, and currentIV are required'
      });
    }

    const analysis = await analyzeEarningsEvent({
      symbol: symbol.toUpperCase(),
      currentPrice,
      earningsDate,
      daysUntilEarnings,
      currentIV,
      historicalMoves: historicalMoves || [],
      optionsData,
    });

    res.json({
      symbol: symbol.toUpperCase(),
      ...analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Earnings analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze earnings event', message: error.message });
  }
});

/**
 * POST /api/ai/:symbol/earnings-surprise
 * Predict earnings surprise probability
 */
router.post('/:symbol/earnings-surprise', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const { symbol } = req.params;
    const { revenueGrowth, earnings, guidance } = req.body;

    if (revenueGrowth === undefined || earnings === undefined) {
      return res.status(400).json({
        error: 'revenueGrowth and earnings are required'
      });
    }

    const prediction = await predictEarningsSurprise(
      symbol.toUpperCase(),
      { revenueGrowth, earnings, guidance }
    );

    res.json({
      symbol: symbol.toUpperCase(),
      ...prediction,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Earnings surprise prediction error:', error);
    res.status(500).json({ error: 'Failed to predict earnings surprise', message: error.message });
  }
});

/**
 * POST /api/ai/greeks-analysis
 * Analyze options Greeks and provide plain English explanation
 */
router.post('/greeks-analysis', async (req, res) => {
  try {
    if (!isOpenAIConfigured()) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    const {
      position,
      greeks,
      underlyingPrice,
      daysToExpiration,
      impliedVolatility,
    } = req.body;

    if (!position || !greeks || !underlyingPrice || daysToExpiration === undefined || !impliedVolatility) {
      return res.status(400).json({
        error: 'position, greeks, underlyingPrice, daysToExpiration, and impliedVolatility are required'
      });
    }

    const analysis = await analyzeGreeks({
      position,
      greeks,
      underlyingPrice,
      daysToExpiration,
      impliedVolatility,
    });

    res.json({
      ...analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Greeks analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze Greeks', message: error.message });
  }
});

/**
 * POST /api/ai/greeks-alerts
 * Generate alerts for options position Greeks
 */
router.post('/greeks-alerts', async (req, res) => {
  try {
    const {
      position,
      greeks,
      underlyingPrice,
      daysToExpiration,
      impliedVolatility,
    } = req.body;

    if (!position || !greeks || daysToExpiration === undefined || !impliedVolatility) {
      return res.status(400).json({
        error: 'position, greeks, daysToExpiration, and impliedVolatility are required'
      });
    }

    const alerts = generateGreeksAlerts({
      position,
      greeks,
      underlyingPrice,
      daysToExpiration,
      impliedVolatility,
    });

    res.json({
      alerts,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Greeks alerts error:', error);
    res.status(500).json({ error: 'Failed to generate Greeks alerts', message: error.message });
  }
});

export default router;
