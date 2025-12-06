import cron from 'node-cron';
import { alertQueries } from './database';
import { sendStockAlert } from './email';
import { getQuote, getTimeSeries } from './twelveData';
import { getAllIndicators } from './indicators';
import { generateAlertReasoning, isOpenAIConfigured } from './ai/openai';
import { detectAllPatterns } from './ai/patternRecognition';
import { calculateTechnicalSentiment } from './ai/sentimentScoring';
import { generatePricePrediction } from './ai/predictions';

// Run every 5 minutes during market hours (9:30 AM - 4:00 PM ET, Mon-Fri)
cron.schedule(
  '*/5 9-16 * * 1-5',
  async () => {
    await processAlerts();
  },
  {
    timezone: 'America/New_York',
  }
);

// Also run every minute for testing outside market hours
if (process.env.NODE_ENV === 'development') {
  cron.schedule('* * * * *', async () => {
    await processAlerts();
  });
}

async function processAlerts(): Promise<void> {
  try {
    const activeAlerts = alertQueries.getActive.all() as any[];

    console.log(`Processing ${activeAlerts.length} active alerts...`);

    for (const alert of activeAlerts) {
      try {
        const triggered = await checkAlertCondition(alert);

        if (triggered) {
          console.log(`Alert triggered: ${alert.symbol} - ${alert.condition}`);

          // Mark as triggered in database
          alertQueries.markTriggered.run(alert.id);

          // Get current value for the alert
          const currentValue = await getCurrentValue(alert);

          // Generate AI reasoning for the alert
          let aiReasoning = '';
          try {
            aiReasoning = await generateAIAlertReasoning(alert, currentValue);
            if (aiReasoning) {
              alertQueries.updateAIReasoning.run(aiReasoning, alert.id);
            }
          } catch (error) {
            console.error('Error generating AI reasoning:', error);
            aiReasoning = 'AI reasoning unavailable';
          }

          // Send notifications based on delivery method
          if (alert.delivery_method === 'EMAIL' || alert.delivery_method === 'BOTH') {
            if (alert.user_email) {
              await sendStockAlert(
                alert.user_email,
                alert.symbol,
                formatCondition(alert.condition),
                currentValue,
                aiReasoning
              );
            }
          }

          if (alert.delivery_method === 'PUSH' || alert.delivery_method === 'BOTH') {
            // Web push notification would go here
            console.log(`Push notification would be sent for ${alert.symbol}`);
          }
        }
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in alert processor:', error);
  }
}

async function checkAlertCondition(alert: any): Promise<boolean> {
  try {
    const quote = await getQuote(alert.symbol);
    const price = parseFloat(quote.close);

    switch (alert.condition) {
      case 'PRICE_ABOVE':
        return alert.threshold && price >= alert.threshold;

      case 'PRICE_BELOW':
        return alert.threshold && price <= alert.threshold;

      case 'RSI_OVERSOLD': {
        const indicators = await getAllIndicators(alert.symbol);
        return (indicators.rsi.value as number) <= 30;
      }

      case 'RSI_OVERBOUGHT': {
        const indicators = await getAllIndicators(alert.symbol);
        return (indicators.rsi.value as number) >= 70;
      }

      case 'MACD_BULLISH_CROSS': {
        const indicators = await getAllIndicators(alert.symbol);
        const macd = indicators.macd.value as any;
        // Signal is already calculated in indicators service
        return indicators.macd.signal === 2;
      }

      case 'MACD_BEARISH_CROSS': {
        const indicators = await getAllIndicators(alert.symbol);
        return indicators.macd.signal === -2;
      }

      case 'GOLDEN_CROSS': {
        const indicators = await getAllIndicators(alert.symbol);
        const ma = indicators.movingAverages.value as any;
        // Check if interpretation includes "Golden Cross"
        return indicators.movingAverages.interpretation.includes('Golden Cross');
      }

      case 'DEATH_CROSS': {
        const indicators = await getAllIndicators(alert.symbol);
        return indicators.movingAverages.interpretation.includes('Death Cross');
      }

      case 'VOLUME_SPIKE': {
        const volume = parseFloat(quote.volume);
        const avgVolume = parseFloat(quote.average_volume);
        return volume >= avgVolume * 2; // 200% of average
      }

      case 'EARNINGS_APPROACHING': {
        // Would need earnings date from API
        // For now, return false
        return false;
      }

      default:
        console.warn(`Unknown alert condition: ${alert.condition}`);
        return false;
    }
  } catch (error) {
    console.error(`Error checking condition for ${alert.symbol}:`, error);
    return false;
  }
}

async function getCurrentValue(alert: any): Promise<string> {
  try {
    const quote = await getQuote(alert.symbol);
    const price = parseFloat(quote.close);

    switch (alert.condition) {
      case 'PRICE_ABOVE':
      case 'PRICE_BELOW':
        return `$${price.toFixed(2)}`;

      case 'RSI_OVERSOLD':
      case 'RSI_OVERBOUGHT': {
        const indicators = await getAllIndicators(alert.symbol);
        return `RSI: ${(indicators.rsi.value as number).toFixed(2)}`;
      }

      case 'MACD_BULLISH_CROSS':
      case 'MACD_BEARISH_CROSS': {
        const indicators = await getAllIndicators(alert.symbol);
        const macd = indicators.macd.value as any;
        return `MACD: ${macd.macd.toFixed(2)}, Signal: ${macd.signal.toFixed(2)}`;
      }

      case 'GOLDEN_CROSS':
      case 'DEATH_CROSS': {
        const indicators = await getAllIndicators(alert.symbol);
        const ma = indicators.movingAverages.value as any;
        return `50 MA: $${ma.ma50.toFixed(2)}, 200 MA: $${ma.ma200.toFixed(2)}`;
      }

      case 'VOLUME_SPIKE': {
        const volume = parseInt(quote.volume);
        const avgVolume = parseInt(quote.average_volume);
        const ratio = ((volume / avgVolume) * 100).toFixed(0);
        return `Volume: ${volume.toLocaleString()} (${ratio}% of average)`;
      }

      default:
        return `Price: $${price.toFixed(2)}`;
    }
  } catch (error) {
    console.error('Error getting current value:', error);
    return 'N/A';
  }
}

function formatCondition(condition: string): string {
  const conditionMap: Record<string, string> = {
    PRICE_ABOVE: 'Price Above Target',
    PRICE_BELOW: 'Price Below Target',
    RSI_OVERSOLD: 'RSI Oversold',
    RSI_OVERBOUGHT: 'RSI Overbought',
    MACD_BULLISH_CROSS: 'MACD Bullish Crossover',
    MACD_BEARISH_CROSS: 'MACD Bearish Crossover',
    GOLDEN_CROSS: 'Golden Cross',
    DEATH_CROSS: 'Death Cross',
    VOLUME_SPIKE: 'Volume Spike',
    EARNINGS_APPROACHING: 'Earnings Approaching',
    PATTERN_DETECTED: 'Chart Pattern Detected',
    SENTIMENT_VERY_BULLISH: 'Very Bullish Sentiment',
    SENTIMENT_VERY_BEARISH: 'Very Bearish Sentiment',
  };

  return conditionMap[condition] || condition;
}

/**
 * Generate comprehensive AI reasoning for triggered alerts
 * Combines pattern detection, sentiment analysis, and predictions
 */
async function generateAIAlertReasoning(alert: any, currentValue: string): Promise<string> {
  try {
    // Get time series data for AI analysis
    const timeSeriesResponse = await getTimeSeries(alert.symbol, '1day', 100);

    if (!timeSeriesResponse || !timeSeriesResponse.values || timeSeriesResponse.values.length === 0) {
      return 'Insufficient data for AI analysis';
    }

    const timeSeries = timeSeriesResponse.values.map(v => ({
      ...v,
      symbol: timeSeriesResponse.meta.symbol
    }));

    // Run AI analyses in parallel
    const [patterns, sentiment, prediction] = await Promise.all([
      Promise.resolve(detectAllPatterns(timeSeries)).catch(() => []),
      Promise.resolve(calculateTechnicalSentiment(timeSeries)).catch(() => null),
      generatePricePrediction(timeSeries).catch(() => null),
    ]);

    // Build AI reasoning message
    let reasoning = `🤖 AI Analysis for ${alert.symbol}:\n\n`;

    // Add alert context
    reasoning += `Alert: ${formatCondition(alert.condition)}\n`;
    reasoning += `Current: ${currentValue}\n\n`;

    // Add sentiment analysis
    if (sentiment) {
      reasoning += `📊 Technical Sentiment: ${sentiment.sentiment.replace('_', ' ').toUpperCase()}\n`;
      reasoning += `Score: ${sentiment.overall}/100 (${sentiment.confidence}% confidence)\n`;
      reasoning += `Recommendation: ${sentiment.recommendation.replace('_', ' ').toUpperCase()}\n\n`;

      // Add top signals
      if (sentiment.signals.length > 0) {
        reasoning += `Key Signals:\n`;
        sentiment.signals.slice(0, 3).forEach(signal => {
          reasoning += `  • ${signal}\n`;
        });
        reasoning += `\n`;
      }
    }

    // Add pattern detection
    if (patterns.length > 0) {
      reasoning += `📈 Detected Patterns:\n`;
      patterns.slice(0, 3).forEach(pattern => {
        reasoning += `  • ${pattern.name} (${pattern.category}, ${pattern.confidence}% confidence)\n`;
        if (pattern.targetPrice) {
          reasoning += `    Target: $${pattern.targetPrice.toFixed(2)}`;
          if (pattern.stopLoss) {
            reasoning += `, Stop: $${pattern.stopLoss.toFixed(2)}`;
          }
          reasoning += `\n`;
        }
      });
      reasoning += `\n`;
    }

    // Add price predictions
    if (prediction) {
      const pred1Week = prediction.predictions['1week'];
      reasoning += `🎯 Price Forecast (1 Week):\n`;
      reasoning += `  Predicted: $${pred1Week.price.toFixed(2)} (${pred1Week.change > 0 ? '+' : ''}${pred1Week.change.toFixed(2)}%)\n`;
      reasoning += `  Range: $${pred1Week.confidenceInterval.lower.toFixed(2)} - $${pred1Week.confidenceInterval.upper.toFixed(2)}\n`;
      reasoning += `  Confidence: ${pred1Week.confidence}%\n`;
      reasoning += `  Trend: ${prediction.trend.toUpperCase()}\n\n`;
    }

    // Use OpenAI for advanced reasoning if available
    if (isOpenAIConfigured()) {
      try {
        const quote = await getQuote(alert.symbol);
        const aiContext = await generateAlertReasoning(
          alert.symbol,
          alert.condition,
          alert.threshold || parseFloat(quote.close),
          {
            currentValue,
            patterns: patterns.slice(0, 3),
            sentiment: sentiment ? {
              score: sentiment.overall,
              sentiment: sentiment.sentiment,
              recommendation: sentiment.recommendation
            } : null,
            prediction: prediction ? {
              oneWeek: pred1Week.price,
              trend: prediction.trend
            } : null
          }
        );

        reasoning += `💡 AI Insights:\n${aiContext}\n`;
      } catch (error) {
        console.error('OpenAI reasoning error:', error);
      }
    }

    return reasoning.trim();
  } catch (error) {
    console.error('Error generating comprehensive AI reasoning:', error);

    // Fallback to basic OpenAI reasoning if available
    if (isOpenAIConfigured()) {
      try {
        const quote = await getQuote(alert.symbol);
        return await generateAlertReasoning(
          alert.symbol,
          alert.condition,
          alert.threshold || parseFloat(quote.close),
          { currentValue }
        );
      } catch (fallbackError) {
        console.error('Fallback reasoning error:', fallbackError);
      }
    }

    return `Alert triggered for ${alert.symbol}. ${currentValue}`;
  }
}

console.log('Alert processor initialized with AI-powered reasoning');

export { processAlerts, checkAlertCondition };
