import cron from 'node-cron';
import { getActiveStockUniverse, updateLastScanned } from './stockUniverse';
import {
  saveRecommendation,
  checkPendingTrades,
  getPerformanceStats,
  getRecentRecommendations
} from './performanceTracking';
import { getQuote } from './twelveData';
import { sendDailyDigest } from './emailDigest';
import { generateDailyRecommendations } from './dailyRecommendations';

let isScanning = false;

/**
 * Morning scan: 8:30 AM ET (before market open at 9:30 AM)
 * Scans stock universe and generates fresh recommendations
 */
export function scheduleMorningScan(): void {
  // 8:30 AM ET = 13:30 UTC (Mon-Fri)
  cron.schedule('30 13 * * 1-5', async () => {
    console.log('🌅 Running morning stock universe scan...');
    await scanUniverseAndGenerateRecommendations();
  }, {
    timezone: 'America/New_York'
  });

  console.log('✓ Morning scan scheduled for 8:30 AM ET (Mon-Fri)');
}

/**
 * Midday scan: 12:00 PM ET (market hours)
 * Updates existing recommendations and checks for new opportunities
 */
export function scheduleMiddayScan(): void {
  // 12:00 PM ET = 17:00 UTC (Mon-Fri)
  cron.schedule('0 17 * * 1-5', async () => {
    console.log('☀️ Running midday market scan...');
    await checkPendingTrades(getQuote);
    await scanUniverseAndGenerateRecommendations();
  }, {
    timezone: 'America/New_York'
  });

  console.log('✓ Midday scan scheduled for 12:00 PM ET (Mon-Fri)');
}

/**
 * Morning email digest: 8:45 AM ET (15 minutes after morning scan)
 * Sends top picks to subscribed users
 */
export function scheduleMorningEmail(): void {
  // 8:45 AM ET = 13:45 UTC (Mon-Fri)
  cron.schedule('45 13 * * 1-5', async () => {
    console.log('📧 Sending morning digest emails...');
    await sendMorningDigestToUsers();
  }, {
    timezone: 'America/New_York'
  });

  console.log('✓ Morning email scheduled for 8:45 AM ET (Mon-Fri)');
}

/**
 * Weekly universe update: Sunday 8:00 PM ET
 * Reviews stock universe performance and updates active stocks
 */
export function scheduleWeeklyUniverseUpdate(): void {
  // Sunday 8:00 PM ET = Monday 01:00 UTC
  cron.schedule('0 1 * * 1', async () => {
    console.log('📊 Running weekly universe performance review...');
    await reviewUniversePerformance();
  }, {
    timezone: 'America/New_York'
  });

  console.log('✓ Weekly universe review scheduled for Sunday 8:00 PM ET');
}

/**
 * Pending trades check: Every hour during market hours
 * Checks if any pending trades hit their targets or stops
 */
export function schedulePendingTradesCheck(): void {
  // Every hour from 9 AM to 4 PM ET (14:00-21:00 UTC, Mon-Fri)
  cron.schedule('0 14-21 * * 1-5', async () => {
    console.log('🔍 Checking pending trades for targets/stops...');
    await checkPendingTrades(getQuote);
  }, {
    timezone: 'America/New_York'
  });

  console.log('✓ Pending trades check scheduled hourly during market hours');
}

/**
 * Development mode: More frequent scans for testing
 */
export function scheduleDevelopmentMode(): void {
  if (process.env.NODE_ENV === 'development') {
    // Every 5 minutes in development
    cron.schedule('*/5 * * * *', async () => {
      console.log('🧪 [DEV] Running test scan...');
      await checkPendingTrades(getQuote);
    });

    console.log('✓ Development mode: scanning every 5 minutes');
  }
}

/**
 * Main function to scan universe and generate recommendations
 */
async function scanUniverseAndGenerateRecommendations(): Promise<void> {
  if (isScanning) {
    console.log('⏭️  Scan already in progress, skipping...');
    return;
  }

  isScanning = true;

  try {
    const universe = getActiveStockUniverse();
    console.log(`Scanning ${universe.length} stocks in universe...`);

    // Generate recommendations using existing service
    const recommendations = await generateDailyRecommendations({
      accountSize: 10000,
      riskLevel: 'moderate',
      minScore: 60
    });

    // Save top picks to performance tracking
    if (recommendations.topPicks && recommendations.topPicks.length > 0) {
      const today = new Date().toISOString().split('T')[0];

      for (const pick of recommendations.topPicks.slice(0, 10)) {
        try {
          saveRecommendation({
            symbol: pick.symbol,
            entryPrice: pick.currentPrice,
            targetPrice: pick.targetPrice,
            stopPrice: pick.stopLoss,
            aiScore: pick.aiScore,
            strategyType: pick.strategyType,
            category: pick.category,
            recommendedDate: today,
            status: 'pending'
          });

          // Update last scanned time for this symbol
          updateLastScanned(pick.symbol);
        } catch (error) {
          console.error(`Error saving recommendation for ${pick.symbol}:`, error);
        }
      }

      console.log(`✓ Saved ${recommendations.topPicks.slice(0, 10).length} recommendations`);
    }
  } catch (error) {
    console.error('Error in scan:', error);
  } finally {
    isScanning = false;
  }
}

/**
 * Send morning digest emails to users
 */
async function sendMorningDigestToUsers(): Promise<void> {
  try {
    // Get performance stats
    const stats = getPerformanceStats(30);

    // Get recent recommendations
    const recentRecs = getRecentRecommendations(1); // Today's picks

    if (recentRecs.length === 0) {
      console.log('No recommendations to send in digest');
      return;
    }

    // Get user emails from environment or database
    const userEmail = process.env.USER_EMAIL;

    if (!userEmail) {
      console.log('No user email configured for digest');
      return;
    }

    await sendDailyDigest(userEmail, recentRecs.slice(0, 5), stats);
    console.log(`✓ Sent morning digest to ${userEmail}`);
  } catch (error) {
    console.error('Error sending morning digest:', error);
  }
}

/**
 * Review universe performance and potentially adjust stocks
 */
async function reviewUniversePerformance(): Promise<void> {
  try {
    const stats = getPerformanceStats(30);

    console.log('📊 Universe Performance (Last 30 days):');
    console.log(`   Win Rate: ${stats.winRate}%`);
    console.log(`   Total Trades: ${stats.totalTrades}`);
    console.log(`   Winners: ${stats.winners}`);
    console.log(`   Losers: ${stats.losers}`);
    console.log(`   Pending: ${stats.pending}`);
    console.log(`   Avg Gain: ${stats.avgGain.toFixed(2)}%`);
    console.log(`   Avg Loss: ${stats.avgLoss.toFixed(2)}%`);

    // Future enhancement: automatically add/remove stocks based on performance
    // For now, just log the stats
  } catch (error) {
    console.error('Error reviewing universe:', error);
  }
}

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduler(): void {
  console.log('🕐 Initializing scheduled jobs...');

  scheduleMorningScan();
  scheduleMiddayScan();
  scheduleMorningEmail();
  scheduleWeeklyUniverseUpdate();
  schedulePendingTradesCheck();
  scheduleDevelopmentMode();

  console.log('✓ All scheduled jobs initialized');
}

/**
 * Manual trigger functions for testing
 */
export async function triggerMorningScan(): Promise<void> {
  console.log('🔧 Manually triggering morning scan...');
  await scanUniverseAndGenerateRecommendations();
}

export async function triggerPendingTradesCheck(): Promise<void> {
  console.log('🔧 Manually triggering pending trades check...');
  await checkPendingTrades(getQuote);
}

export async function triggerMorningDigest(): Promise<void> {
  console.log('🔧 Manually triggering morning digest...');
  await sendMorningDigestToUsers();
}
