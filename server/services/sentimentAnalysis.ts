/**
 * Simple sentiment analysis using keyword-based approach
 * For production, consider using ML models like VADER, TextBlob, or Anthropic's Claude API
 */

interface SentimentResult {
  score: number; // -1 to 1
  label: 'BEARISH' | 'NEUTRAL' | 'BULLISH';
  magnitude: number; // 0 to 1 (confidence)
}

const POSITIVE_WORDS = new Set([
  'surge', 'soar', 'rally', 'gain', 'rise', 'jump', 'climb', 'advance', 'outperform',
  'beat', 'exceed', 'strong', 'robust', 'bullish', 'optimistic', 'positive', 'upgrade',
  'growth', 'profit', 'revenue', 'earnings', 'success', 'innovation', 'breakthrough',
  'record', 'high', 'best', 'improved', 'better', 'opportunity', 'momentum', 'expansion',
]);

const NEGATIVE_WORDS = new Set([
  'plunge', 'plummet', 'drop', 'fall', 'decline', 'slide', 'tumble', 'crash', 'slump',
  'miss', 'disappoint', 'weak', 'bearish', 'pessimistic', 'negative', 'downgrade',
  'loss', 'deficit', 'concern', 'worry', 'risk', 'threat', 'challenge', 'problem',
  'low', 'worst', 'cut', 'reduce', 'lower', 'struggle', 'fail', 'lawsuit', 'investigation',
]);

const INTENSIFIERS = new Set([
  'very', 'extremely', 'highly', 'significantly', 'substantially', 'considerably',
  'remarkably', 'exceptionally', 'dramatically', 'sharply', 'heavily', 'massively',
]);

const NEGATIONS = new Set([
  'not', 'no', 'never', 'none', 'nothing', 'neither', 'nobody', 'nowhere',
  'barely', 'hardly', 'scarcely', 'seldom', 'rarely',
]);

/**
 * Analyze sentiment of text
 */
export function analyzeSentiment(text: string): SentimentResult {
  const words = tokenize(text);
  let score = 0;
  let wordCount = 0;
  let intensifierMultiplier = 1;
  let negationActive = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Check for negation
    if (NEGATIONS.has(word)) {
      negationActive = true;
      continue;
    }

    // Check for intensifiers
    if (INTENSIFIERS.has(word)) {
      intensifierMultiplier = 1.5;
      continue;
    }

    // Calculate sentiment for this word
    let wordScore = 0;
    if (POSITIVE_WORDS.has(word)) {
      wordScore = 1;
    } else if (NEGATIVE_WORDS.has(word)) {
      wordScore = -1;
    }

    if (wordScore !== 0) {
      // Apply intensifier
      wordScore *= intensifierMultiplier;

      // Apply negation (flip sentiment)
      if (negationActive) {
        wordScore *= -1;
        negationActive = false;
      }

      score += wordScore;
      wordCount++;
      intensifierMultiplier = 1; // Reset
    } else {
      // Reset negation if no sentiment word follows
      negationActive = false;
    }
  }

  // Normalize score
  const normalizedScore = wordCount > 0 ? score / wordCount : 0;

  // Clamp to -1 to 1 range
  const clampedScore = Math.max(-1, Math.min(1, normalizedScore));

  // Calculate magnitude (confidence) based on number of sentiment words
  const magnitude = Math.min(1, wordCount / 10); // More sentiment words = higher confidence

  // Determine label
  let label: 'BEARISH' | 'NEUTRAL' | 'BULLISH' = 'NEUTRAL';
  if (clampedScore > 0.2) {
    label = 'BULLISH';
  } else if (clampedScore < -0.2) {
    label = 'BEARISH';
  }

  return {
    score: clampedScore,
    label,
    magnitude,
  };
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Analyze sentiment with context-aware rules
 */
export function analyzeFinancialSentiment(text: string, priceChange?: number): SentimentResult {
  const baseSentiment = analyzeSentiment(text);

  // If we have price change data, factor it in
  if (priceChange !== undefined) {
    const priceScore = Math.max(-1, Math.min(1, priceChange / 10)); // Normalize price change
    const combinedScore = (baseSentiment.score * 0.7) + (priceScore * 0.3);

    let label: 'BEARISH' | 'NEUTRAL' | 'BULLISH' = 'NEUTRAL';
    if (combinedScore > 0.2) {
      label = 'BULLISH';
    } else if (combinedScore < -0.2) {
      label = 'BEARISH';
    }

    return {
      score: combinedScore,
      label,
      magnitude: baseSentiment.magnitude,
    };
  }

  return baseSentiment;
}

/**
 * Aggregate sentiment from multiple sources
 */
export function aggregateSentiment(sentiments: SentimentResult[]): SentimentResult {
  if (sentiments.length === 0) {
    return { score: 0, label: 'NEUTRAL', magnitude: 0 };
  }

  // Weighted average by magnitude
  let totalScore = 0;
  let totalWeight = 0;

  sentiments.forEach(sentiment => {
    const weight = sentiment.magnitude;
    totalScore += sentiment.score * weight;
    totalWeight += weight;
  });

  const avgScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  const avgMagnitude = sentiments.reduce((sum, s) => sum + s.magnitude, 0) / sentiments.length;

  let label: 'BEARISH' | 'NEUTRAL' | 'BULLISH' = 'NEUTRAL';
  if (avgScore > 0.2) {
    label = 'BULLISH';
  } else if (avgScore < -0.2) {
    label = 'BEARISH';
  }

  return {
    score: avgScore,
    label,
    magnitude: avgMagnitude,
  };
}

/**
 * Calculate sentiment trend (increasing, decreasing, stable)
 */
export function calculateSentimentTrend(
  sentiments: Array<{ date: string; score: number }>
): 'INCREASING' | 'DECREASING' | 'STABLE' {
  if (sentiments.length < 2) {
    return 'STABLE';
  }

  // Sort by date
  const sorted = sentiments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate linear regression slope
  const n = sorted.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  sorted.forEach((point, i) => {
    const x = i;
    const y = point.score;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Determine trend based on slope
  if (slope > 0.05) {
    return 'INCREASING';
  } else if (slope < -0.05) {
    return 'DECREASING';
  } else {
    return 'STABLE';
  }
}
