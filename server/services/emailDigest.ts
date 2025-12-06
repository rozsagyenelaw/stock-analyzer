import nodemailer from 'nodemailer';
import { TradeRecommendation, PerformanceStats } from './performanceTracking';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

function formatPercent(percent: number): string {
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
}

function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    'Tech': '💻',
    'Finance': '💰',
    'Healthcare': '⚕️',
    'Energy': '⚡',
    'Consumer': '🛍️',
    'Industrial': '🏭',
    'Communication': '📡',
    'ETF': '📊',
    'Crypto': '₿',
  };
  return emojiMap[category] || '📈';
}

function generateDigestHTML(
  picks: TradeRecommendation[],
  stats: PerformanceStats
): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const picksHTML = picks.map(pick => {
    const upside = ((pick.targetPrice - pick.entryPrice) / pick.entryPrice) * 100;
    const riskReward = upside / Math.abs(((pick.stopPrice - pick.entryPrice) / pick.entryPrice) * 100);

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 16px 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">${getCategoryEmoji(pick.category)}</span>
            <div>
              <div style="font-weight: 600; font-size: 16px; color: #111827;">${pick.symbol}</div>
              <div style="font-size: 12px; color: #6b7280;">${pick.category}</div>
            </div>
          </div>
        </td>
        <td style="padding: 16px 12px;">
          <div style="font-weight: 600; color: #111827;">${formatPrice(pick.entryPrice)}</div>
          <div style="font-size: 12px; color: #6b7280;">Entry</div>
        </td>
        <td style="padding: 16px 12px;">
          <div style="font-weight: 600; color: #10b981;">${formatPrice(pick.targetPrice)}</div>
          <div style="font-size: 12px; color: #6b7280;">Target</div>
        </td>
        <td style="padding: 16px 12px;">
          <div style="font-weight: 600; color: #ef4444;">${formatPrice(pick.stopPrice)}</div>
          <div style="font-size: 12px; color: #6b7280;">Stop</div>
        </td>
        <td style="padding: 16px 12px;">
          <div style="font-weight: 600; color: #10b981;">${formatPercent(upside)}</div>
          <div style="font-size: 12px; color: #6b7280;">Upside</div>
        </td>
        <td style="padding: 16px 12px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 14px;">
            ${pick.aiScore}
          </div>
        </td>
      </tr>
      <tr>
        <td colspan="6" style="padding: 0 12px 16px 12px;">
          <div style="background: #f3f4f6; border-radius: 8px; padding: 12px; margin-left: 44px;">
            <div style="font-size: 13px; color: #374151; margin-bottom: 4px;">
              <strong>Strategy:</strong> ${pick.strategyType}
            </div>
            <div style="font-size: 13px; color: #374151;">
              <strong>Risk/Reward:</strong> 1:${riskReward.toFixed(2)}
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Stock Picks</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 800px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                ✨ Daily Stock Picks
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                ${today}
              </p>
            </td>
          </tr>

          <!-- Performance Stats -->
          <tr>
            <td style="padding: 24px 32px;">
              <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 18px; font-weight: 600;">
                  📊 Performance (Last 30 Days)
                </h2>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                  <div style="text-align: center;">
                    <div style="font-size: 28px; font-weight: 700; color: #ffffff;">${stats.winRate}%</div>
                    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.9); margin-top: 4px;">Win Rate</div>
                  </div>
                  <div style="text-align: center;">
                    <div style="font-size: 28px; font-weight: 700; color: #ffffff;">${stats.winners}/${stats.totalTrades}</div>
                    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.9); margin-top: 4px;">Winners</div>
                  </div>
                  <div style="text-align: center;">
                    <div style="font-size: 28px; font-weight: 700; color: #ffffff;">${formatPercent(stats.avgGain)}</div>
                    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.9); margin-top: 4px;">Avg Gain</div>
                  </div>
                </div>
              </div>

              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
                🎯 Today's Top ${picks.length} Picks
              </h2>
              <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">
                AI-powered trade recommendations based on technical analysis, patterns, and sentiment scoring.
              </p>
            </td>
          </tr>

          <!-- Picks Table -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                    <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Stock</th>
                    <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Entry</th>
                    <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Target</th>
                    <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Stop</th>
                    <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Upside</th>
                    <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">AI Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${picksHTML}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f9fafb; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; text-align: center;">
                <strong>⚠️ Risk Disclaimer:</strong> These are AI-generated trade ideas for educational purposes only. Always do your own research and never risk more than you can afford to lose.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Generated by Stock Analyzer AI • ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendDailyDigest(
  to: string,
  picks: TradeRecommendation[],
  stats: PerformanceStats
): Promise<void> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('Email credentials not configured, skipping digest send');
      return;
    }

    const html = generateDigestHTML(picks, stats);

    await transporter.sendMail({
      from: `"Stock Analyzer AI" <${process.env.SMTP_USER}>`,
      to,
      subject: `📈 Daily Stock Picks - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      html,
    });

    console.log(`✓ Daily digest sent to ${to}`);
  } catch (error) {
    console.error('Error sending daily digest:', error);
    throw error;
  }
}

export async function sendTestDigest(to: string): Promise<void> {
  const testPicks: TradeRecommendation[] = [
    {
      symbol: 'AAPL',
      entryPrice: 175.50,
      targetPrice: 185.00,
      stopPrice: 172.00,
      aiScore: 87,
      strategyType: 'Momentum Breakout',
      category: 'Tech',
      recommendedDate: new Date().toISOString().split('T')[0],
      status: 'pending'
    },
    {
      symbol: 'MSFT',
      entryPrice: 380.25,
      targetPrice: 395.00,
      stopPrice: 375.00,
      aiScore: 82,
      strategyType: 'Pullback Entry',
      category: 'Tech',
      recommendedDate: new Date().toISOString().split('T')[0],
      status: 'pending'
    },
    {
      symbol: 'JPM',
      entryPrice: 156.75,
      targetPrice: 165.00,
      stopPrice: 153.50,
      aiScore: 78,
      strategyType: 'MACD Crossover',
      category: 'Finance',
      recommendedDate: new Date().toISOString().split('T')[0],
      status: 'pending'
    }
  ];

  const testStats: PerformanceStats = {
    winRate: 67,
    avgGain: 8.5,
    avgLoss: -3.2,
    totalTrades: 24,
    winners: 16,
    losers: 8,
    pending: 5
  };

  await sendDailyDigest(to, testPicks, testStats);
}
