/**
 * AI Trade Journal Page
 *
 * Displays AI-powered trade journal with pattern recognition
 */

import TradeJournalCard from '@/components/ai/TradeJournalCard';

export default function AITradeJournal() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Trade Journal</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Analyze your trading performance with AI-powered pattern recognition and personalized recommendations
        </p>
      </div>

      <TradeJournalCard />
    </div>
  );
}
