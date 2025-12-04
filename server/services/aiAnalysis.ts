/**
 * AI Analysis Service using OpenAI
 * Provides intelligent insights for trading opportunities
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate AI analysis for any prompt
 */
export async function generateAIAnalysis(prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional stock market analyst providing concise, actionable insights. Be specific and data-driven.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || 'Analysis not available';
  } catch (error: any) {
    console.error('OpenAI API error:', error.message);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

/**
 * Analyze a trading opportunity
 */
export async function analyzeOpportunity(
  symbol: string,
  scanName: string,
  metrics: any
): Promise<{
  summary: string;
  risks: string[];
  entryExit: string;
}> {
  const prompt = `Analyze this stock trading opportunity:

**Symbol**: ${symbol}
**Scan**: ${scanName}
**Metrics**:
- Price: $${metrics.price?.toFixed(2)}
- RSI: ${metrics.rsi?.toFixed(1)}
- P/E Ratio: ${metrics.pe?.toFixed(1) || 'N/A'}
- 52-Week High: $${metrics.high52Week?.toFixed(2)}
- Distance from High: ${metrics.percentFromHigh?.toFixed(1)}%
- Volume: ${metrics.volume > metrics.avgVolume ? 'Above average' : 'Normal'}

Provide:
1. **Summary** (2-3 sentences): Why is this interesting right now?
2. **Risks** (bullet points): What could go wrong?
3. **Entry/Exit** (specific levels): Where to buy and where to sell?

Be specific with price levels and percentages.`;

  const response = await generateAIAnalysis(prompt);

  // Parse the response
  const sections = response.split('\n\n');
  const summary = sections.find(s => s.includes('Summary'))?.replace(/.*Summary.*:/, '').trim() || 'No summary available';
  const risks = sections.find(s => s.includes('Risks'))?.split('\n').filter(l => l.trim().startsWith('-')) || ['Market risk', 'Volatility risk'];
  const entryExit = sections.find(s => s.includes('Entry') || s.includes('Exit'))?.replace(/.*Entry.*:/, '').trim() || 'Monitor for entry';

  return {
    summary,
    risks,
    entryExit,
  };
}
