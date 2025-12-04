/**
 * AI Analysis Tab Component
 *
 * Comprehensive AI-powered analysis display including:
 * - Pattern recognition
 * - Price predictions
 * - Technical sentiment scoring
 * - AI recommendations
 */

import { useQuery } from '@tanstack/react-query';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Target, Activity } from 'lucide-react';
import { aiApi } from '@/services/api';

interface AIAnalysisTabProps {
  symbol: string;
}

export default function AIAnalysisTab({ symbol }: AIAnalysisTabProps) {
  // Fetch comprehensive AI analysis
  const { data: aiAnalysis, isLoading, error } = useQuery({
    queryKey: ['ai-comprehensive', symbol],
    queryFn: () => aiApi.getComprehensiveAnalysis(symbol),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check AI status
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => aiApi.getStatus(),
    staleTime: 60 * 1000, // 1 minute
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !aiAnalysis) {
    return (
      <div className="card p-6">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Unable to load AI analysis</p>
        </div>
      </div>
    );
  }

  const { patterns, supportResistance, prediction, sentiment } = aiAnalysis;

  return (
    <div className="space-y-6">
      {/* OpenAI Status Banner */}
      {!aiStatus?.openAIConfigured && (
        <div className="card p-4 bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-600">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            ℹ️ Local ML models active. Configure OpenAI API key for advanced AI features (GPT-4 sentiment, trading assistant).
          </p>
        </div>
      )}

      {/* Technical Sentiment Score */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">Technical Sentiment</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Overall Score */}
          <div className="col-span-1 md:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Sentiment</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSentimentColor(sentiment.sentiment)}`}>
                {sentiment.sentiment.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full transition-all ${getSentimentBarColor(sentiment.overall)}`}
                style={{ width: `${((sentiment.overall + 100) / 200) * 100}%` }}
              />
              <div className="absolute left-1/2 top-0 w-px h-full bg-gray-400" />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Very Bearish (-100)</span>
              <span>Neutral (0)</span>
              <span>Very Bullish (+100)</span>
            </div>
            <div className="text-center mt-2">
              <span className="text-3xl font-bold">{sentiment.overall}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                ({sentiment.confidence}% confidence)
              </span>
            </div>
          </div>
        </div>

        {/* Component Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <ScoreComponent label="Technical Indicators" score={sentiment.components.technical} />
          <ScoreComponent label="Volume Analysis" score={sentiment.components.volume} />
          <ScoreComponent label="Price Action" score={sentiment.components.priceAction} />
          <ScoreComponent label="Patterns" score={sentiment.components.patterns} />
        </div>

        {/* Recommendation */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Recommendation</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRecommendationColor(sentiment.recommendation)}`}>
            {sentiment.recommendation.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Signals */}
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Key Signals</h3>
          <div className="space-y-2">
            {sentiment.signals.slice(0, 8).map((signal: string, index: number) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <span className="text-primary-600">•</span>
                <span className="text-gray-700 dark:text-gray-300">{signal}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Price Predictions */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">Price Predictions</h2>
          <span className="text-sm text-gray-500">({prediction.model.replace('_', ' ')})</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PredictionCard
            label="1 Day"
            prediction={prediction.predictions['1day']}
            currentPrice={prediction.currentPrice}
          />
          <PredictionCard
            label="1 Week"
            prediction={prediction.predictions['1week']}
            currentPrice={prediction.currentPrice}
          />
          <PredictionCard
            label="1 Month"
            prediction={prediction.predictions['1month']}
            currentPrice={prediction.currentPrice}
          />
        </div>

        <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Trend:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              prediction.trend === 'bullish' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              prediction.trend === 'bearish' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>
              {prediction.trend.toUpperCase()}
            </span>
            <span className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              {prediction.confidence}% confidence
            </span>
          </div>
        </div>
      </div>

      {/* Detected Patterns */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold">Detected Patterns</h2>
        </div>

        {patterns.length > 0 ? (
          <div className="space-y-3">
            {patterns.map((pattern: any, index: number) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{pattern.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        pattern.category === 'bullish' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        pattern.category === 'bearish' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {pattern.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        pattern.type === 'candlestick' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      }`}>
                        {pattern.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{pattern.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Confidence: {pattern.confidence}%</span>
                      <span>Significance: {pattern.significance}</span>
                      {pattern.targetPrice && <span>Target: ${pattern.targetPrice.toFixed(2)}</span>}
                      {pattern.stopLoss && <span>Stop Loss: ${pattern.stopLoss.toFixed(2)}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-600 dark:text-gray-400 py-8">
            <p>No significant patterns detected</p>
          </div>
        )}
      </div>

      {/* Support & Resistance Levels */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">Support & Resistance Levels</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Support */}
          <div>
            <h3 className="font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Support Levels
            </h3>
            {supportResistance.filter((sr: any) => sr.type === 'support').length > 0 ? (
              <div className="space-y-2">
                {supportResistance
                  .filter((sr: any) => sr.type === 'support')
                  .sort((a: any, b: any) => b.price - a.price)
                  .map((level: any, index: number) => (
                    <div key={index} className="bg-green-50 dark:bg-green-900/20 rounded p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-semibold">${level.price.toFixed(2)}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Strength: {level.strength}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {level.touches} touches
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">No support levels detected</p>
            )}
          </div>

          {/* Resistance */}
          <div>
            <h3 className="font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Resistance Levels
            </h3>
            {supportResistance.filter((sr: any) => sr.type === 'resistance').length > 0 ? (
              <div className="space-y-2">
                {supportResistance
                  .filter((sr: any) => sr.type === 'resistance')
                  .sort((a: any, b: any) => a.price - b.price)
                  .map((level: any, index: number) => (
                    <div key={index} className="bg-red-50 dark:bg-red-900/20 rounded p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-semibold">${level.price.toFixed(2)}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Strength: {level.strength}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {level.touches} touches
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">No resistance levels detected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

interface ScoreComponentProps {
  label: string;
  score: {
    score: number;
    weight: number;
    signals: string[];
  };
}

function ScoreComponent({ label, score }: ScoreComponentProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{label}</div>
      <div className="text-2xl font-bold mb-1">{score.score > 0 ? '+' : ''}{score.score}</div>
      <div className="text-xs text-gray-500">Weight: {(score.weight * 100).toFixed(0)}%</div>
    </div>
  );
}

interface PredictionCardProps {
  label: string;
  prediction: {
    price: number;
    change: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
    confidence: number;
  };
  currentPrice: number;
}

function PredictionCard({ label, prediction }: PredictionCardProps) {
  const isPositive = prediction.change > 0;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{label}</div>
      <div className="text-2xl font-bold mb-1">${prediction.price.toFixed(2)}</div>
      <div className={`flex items-center gap-1 mb-3 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span className="font-semibold">{prediction.change > 0 ? '+' : ''}{prediction.change.toFixed(2)}%</span>
      </div>
      <div className="text-xs space-y-1">
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Range:</span>
          <span>${prediction.confidenceInterval.lower.toFixed(2)} - ${prediction.confidenceInterval.upper.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Confidence:</span>
          <span>{prediction.confidence}%</span>
        </div>
      </div>
    </div>
  );
}

// Helper Functions

function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'very_bullish':
      return 'bg-green-600 text-white';
    case 'bullish':
      return 'bg-green-500 text-white';
    case 'neutral':
      return 'bg-gray-500 text-white';
    case 'bearish':
      return 'bg-red-500 text-white';
    case 'very_bearish':
      return 'bg-red-600 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

function getSentimentBarColor(score: number): string {
  if (score >= 60) return 'bg-green-600';
  if (score >= 20) return 'bg-green-500';
  if (score > -20) return 'bg-gray-400';
  if (score > -60) return 'bg-red-500';
  return 'bg-red-600';
}

function getRecommendationColor(recommendation: string): string {
  switch (recommendation) {
    case 'strong_buy':
      return 'bg-green-600 text-white';
    case 'buy':
      return 'bg-green-500 text-white';
    case 'hold':
      return 'bg-yellow-500 text-white';
    case 'sell':
      return 'bg-red-500 text-white';
    case 'strong_sell':
      return 'bg-red-600 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}
