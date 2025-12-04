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

export default router;
