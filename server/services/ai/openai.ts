/**
 * OpenAI Service - GPT-4 Integration
 *
 * Provides AI-powered analysis using OpenAI's GPT models
 * Uses GPT-4 for complex analysis, GPT-3.5-turbo for simpler tasks
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Check if OpenAI is configured
export const isOpenAIConfigured = (): boolean => {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-');
};

/**
 * Analyze news sentiment using GPT-4
 */
export async function analyzeNewsSentiment(
  symbol: string,
  headlines: string[]
): Promise<{
  sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number; // -100 to +100
  summary: string;
  keyPoints: string[];
}> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Analyze the following news headlines for ${symbol} and provide a sentiment analysis:

Headlines:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Provide your analysis in the following JSON format:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "score": number between -100 (very bearish) and +100 (very bullish),
  "summary": "2-3 sentence summary of overall sentiment",
  "keyPoints": ["3-5 key takeaways from the news"]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a professional financial analyst specializing in sentiment analysis of market news.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');
  return result;
}

/**
 * Get AI trading recommendation
 */
export async function getAITradingRecommendation(
  symbol: string,
  context: {
    price: number;
    technicalAnalysis: any;
    fundamentals?: any;
    optionsFlow?: any;
    patterns?: any[];
  }
): Promise<{
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number; // 0-100
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  keyFactors: string[];
  suggestedAction: string;
}> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `As an expert trading analyst, analyze ${symbol} and provide a trading recommendation.

Current Data:
- Price: $${context.price}
- Technical Score: ${context.technicalAnalysis?.technicalScore || 'N/A'}/10
- Signal: ${context.technicalAnalysis?.composite?.signal || 'N/A'}
${context.fundamentals ? `- P/E Ratio: ${context.fundamentals.ratios?.peRatio || 'N/A'}` : ''}
${context.fundamentals ? `- DCF Upside: ${context.fundamentals.dcf?.upside || 'N/A'}%` : ''}
${context.optionsFlow ? `- Options Sentiment: ${context.optionsFlow.sentiment}` : ''}
${context.optionsFlow ? `- Put/Call Ratio: ${context.optionsFlow.putCallRatio}` : ''}
${context.patterns ? `- Detected Patterns: ${context.patterns.map(p => p.name).join(', ')}` : ''}

Provide a comprehensive analysis in JSON format:
{
  "recommendation": "strong_buy" | "buy" | "hold" | "sell" | "strong_sell",
  "confidence": number 0-100,
  "reasoning": "detailed explanation of your recommendation",
  "riskLevel": "low" | "medium" | "high",
  "keyFactors": ["3-5 most important factors influencing this recommendation"],
  "suggestedAction": "specific actionable advice (entry/exit points, position sizing, etc.)"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a veteran Wall Street trader with 20 years of experience in technical and fundamental analysis. Provide actionable, risk-aware trading advice.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');
  return result;
}

/**
 * Answer natural language trading questions
 */
export async function answerTradingQuestion(
  question: string,
  context?: {
    symbol?: string;
    marketData?: any;
  }
): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured');
  }

  const systemPrompt = `You are an AI trading assistant. Answer trading questions clearly and professionally.
${context?.symbol ? `The user is asking about ${context.symbol}.` : ''}
${context?.marketData ? `Current market data: ${JSON.stringify(context.marketData)}` : ''}
Provide practical, actionable advice. Always include risk warnings where appropriate.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo', // Use cheaper model for Q&A
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return completion.choices[0].message.content || 'Unable to generate response';
}

/**
 * Explain a pattern in plain English
 */
export async function explainPattern(
  patternName: string,
  symbol: string,
  patternDetails: any
): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Explain the "${patternName}" pattern detected on ${symbol} in plain English for retail traders.

Pattern Details:
${JSON.stringify(patternDetails, null, 2)}

Provide a clear, 2-3 sentence explanation that covers:
1. What this pattern means
2. What it typically signals
3. How traders should interpret it`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are a trading educator. Explain technical patterns in simple, clear language.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 200,
  });

  return completion.choices[0].message.content || 'Unable to explain pattern';
}

/**
 * Generate AI-powered market commentary
 */
export async function generateMarketCommentary(
  marketData: {
    topGainers: Array<{ symbol: string; change: number }>;
    topLosers: Array<{ symbol: string; change: number }>;
    sectorPerformance: Record<string, number>;
    marketSentiment: 'bullish' | 'bearish' | 'neutral';
  }
): Promise<{
  summary: string;
  keyTrends: string[];
  tradingOpportunities: string[];
}> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Generate a market commentary based on today's market data:

Top Gainers: ${marketData.topGainers.map(g => `${g.symbol} (+${g.change}%)`).join(', ')}
Top Losers: ${marketData.topLosers.map(l => `${l.symbol} (${l.change}%)`).join(', ')}
Overall Sentiment: ${marketData.marketSentiment}

Provide analysis in JSON format:
{
  "summary": "2-3 paragraph market summary",
  "keyTrends": ["3-5 key market trends today"],
  "tradingOpportunities": ["2-3 potential trading opportunities or sectors to watch"]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a CNBC market analyst providing daily market commentary.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.6,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');
  return result;
}

/**
 * Generate AI reasoning for an alert
 */
export async function generateAlertReasoning(
  symbol: string,
  alertType: string,
  triggerValue: number,
  currentData: any
): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `An alert was triggered for ${symbol}:
Alert Type: ${alertType}
Trigger Value: ${triggerValue}
Current Data: ${JSON.stringify(currentData)}

Provide a brief (2-3 sentences) explanation of why this alert triggered and what it means for traders.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are a trading alert assistant. Explain alerts clearly and concisely.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
    max_tokens: 150,
  });

  return completion.choices[0].message.content || 'Alert triggered';
}

/**
 * Analyze earnings call transcript
 */
export async function analyzeEarningsCall(
  symbol: string,
  transcript: string
): Promise<{
  sentiment: 'bullish' | 'bearish' | 'neutral';
  keyTakeaways: string[];
  concernFlags: string[];
  managementTone: string;
  recommendation: string;
}> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key not configured');
  }

  // Truncate transcript if too long (GPT-4 has token limits)
  const maxLength = 8000;
  const truncatedTranscript = transcript.length > maxLength
    ? transcript.substring(0, maxLength) + '...[truncated]'
    : transcript;

  const prompt = `Analyze this earnings call transcript for ${symbol}:

${truncatedTranscript}

Provide analysis in JSON format:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "keyTakeaways": ["5-7 most important points from the call"],
  "concernFlags": ["any concerns or red flags mentioned"],
  "managementTone": "brief description of management's tone and confidence",
  "recommendation": "how this earnings call should influence trading decisions"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a fundamental analyst specializing in earnings call analysis.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');
  return result;
}
