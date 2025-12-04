# API Keys Setup Guide

This application requires several API keys to function. **NO MOCK DATA IS USED** - all data comes from real APIs.

## Required API Keys

### 1. Twelve Data API (Stock Prices & Fundamentals) ✅ CONFIGURED
- **Status**: Already configured in `.env`
- **Purpose**: Real-time stock prices, historical data, technical indicators
- **Free Tier**: 800 API calls/day
- **Get Key**: https://twelvedata.com/pricing

### 2. News API (Real News Data) ⚠️ REQUIRED
- **Status**: MUST BE CONFIGURED
- **Purpose**: Real-time news articles, headlines, sentiment analysis
- **Free Tier**: 100 requests/day, 1000 requests/month
- **Get Key**: https://newsapi.org/register
- **Add to `.env`**:
  ```
  NEWS_API_KEY=your_newsapi_key_here
  ```

### 3. Alpha Vantage API (Economic Indicators) ⚠️ REQUIRED
- **Status**: MUST BE CONFIGURED
- **Purpose**: GDP, Unemployment, CPI, Federal Funds Rate, Retail Sales
- **Free Tier**: 25 API calls/day (perfect for daily economic updates)
- **Get Key**: https://www.alphavantage.co/support/#api-key
- **Add to `.env`**:
  ```
  ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
  ```

### 4. Reddit API (Social Sentiment) ✅ NO KEY NEEDED
- **Status**: Works without authentication
- **Purpose**: Track stock mentions on r/wallstreetbets, r/stocks, r/investing
- **Method**: Uses Reddit's public JSON endpoint
- **No setup required!**

### 5. OpenAI API (AI Analysis Features) ✅ CONFIGURED
- **Status**: Already configured in `.env`
- **Purpose**: AI-powered trade journal analysis, earnings insights
- **Get Key**: https://platform.openai.com/api-keys

## Optional API Keys

### Gmail SMTP (Email Alerts)
- **Purpose**: Send email notifications for price alerts
- **Setup**: Use Gmail App Password (not regular password)
- **Add to `.env`**:
  ```
  GMAIL_USER=your_email@gmail.com
  GMAIL_APP_PASSWORD=your_16_char_app_password
  ```
- **Get App Password**: https://support.google.com/accounts/answer/185833

## Quick Setup Steps

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your API keys**:
   ```bash
   nano .env
   # or
   code .env
   ```

3. **Get Free API Keys**:
   - News API: https://newsapi.org/register (takes 2 minutes)
   - Alpha Vantage: https://www.alphavantage.co/support/#api-key (instant)

4. **Restart the server**:
   ```bash
   cd server
   npm run dev
   ```

## Testing Your Setup

### Test News API:
```bash
curl http://localhost:3001/api/news/AAPL
```

### Test Economic Indicators:
```bash
curl http://localhost:3001/api/economy/indicators
```

### Test Reddit Sentiment:
```bash
curl http://localhost:3001/api/news/social/TSLA
```

## API Limits & Recommendations

| API | Free Tier | Recommended Usage |
|-----|-----------|-------------------|
| Twelve Data | 800 calls/day | ✅ Sufficient for personal use |
| News API | 100 calls/day | ✅ Cache news for 1 hour |
| Alpha Vantage | 25 calls/day | ✅ Update economic data once daily |
| Reddit | Unlimited | ✅ No limits on public endpoints |
| OpenAI | Pay-as-you-go | 💰 Use sparingly for AI features |

## Error Messages

If you see these errors, you need to add the API key:

- **"NEWS_API_KEY not configured"** → Add News API key to `.env`
- **"ALPHA_VANTAGE_API_KEY not configured"** → Add Alpha Vantage key to `.env`
- **"Failed to fetch news"** → Check News API key is valid
- **"Failed to fetch GDP data"** → Check Alpha Vantage key is valid

## Production Deployment (Render)

Add these environment variables in Render dashboard:

1. Go to your service → Environment
2. Add each key as an environment variable:
   - `NEWS_API_KEY`
   - `ALPHA_VANTAGE_API_KEY`
   - `TWELVE_DATA_API_KEY` (already set)
   - `OPENAI_API_KEY` (already set)
3. Click "Save Changes" and redeploy

## Cost Estimate

**Monthly Cost for Free Tiers**: $0
- All APIs have generous free tiers
- Perfect for personal use and development

**If you exceed free tiers**:
- News API: $449/month (10,000 requests/day)
- Alpha Vantage: $49.99/month (unlimited)
- Twelve Data: $79/month (8,000 requests/day)
- OpenAI: Pay-as-you-go (~$5-20/month for moderate use)

**Recommendation**: Start with free tiers and monitor usage!
