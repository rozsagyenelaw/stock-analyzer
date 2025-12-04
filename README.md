# Stock Analyzer - Professional Trading Decision Support

A comprehensive stock analysis and trading decision-support application built with React, TypeScript, Node.js, and the Twelve Data API. This application provides real-time technical analysis, fundamental data overlay, custom alerts with email notifications, and a complete trade journal to help you make informed trading decisions.

## Features

### Core Analysis Engine
- **Technical Indicators**: RSI, MACD, Moving Averages (20/50/200), Bollinger Bands, Stochastic, OBV, ATR, Volume Analysis
- **Composite Scoring System**: Weighted algorithm combining technical and fundamental analysis (-10 to +10 scale)
- **Signal Generation**: STRONG BUY / BUY / HOLD / SELL / STRONG SELL with confidence percentage
- **Price Targets**: Automated entry, stop-loss, and take-profit calculations using ATR
- **Risk Management**: Position sizing calculator with customizable risk tolerance

### Real-Time Features
- **Live Stock Search**: Search and analyze any stock with real-time data
- **Watchlist**: Track multiple stocks with live price updates and daily changes
- **Custom Alerts**: Set price, RSI, MACD, volume, and moving average alerts
- **Email Notifications**: Gmail SMTP integration for alert delivery

### Trading Tools
- **Trade Journal**: Log and analyze your trades with performance metrics
- **Performance Analytics**: Win rate, profit factor, average win/loss, equity curve
- **Market Context**: Track S&P 500, Nasdaq, and VIX levels

### Technical Architecture
- **Backend**: Node.js/Express with TypeScript
- **Frontend**: React 18 with TypeScript, TailwindCSS
- **State Management**: Zustand + React Query for efficient data fetching
- **Database**: SQLite (easily switchable to PostgreSQL)
- **Caching**: Smart TTL-based caching (1min for prices, 5min for indicators, 24h for fundamentals)
- **API**: Twelve Data API with rate limiting and request queuing

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- npm or yarn package manager
- A Twelve Data API key (free tier available at https://twelvedata.com/)
- (Optional) Gmail account with App Password for email alerts

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository (or download the files)
cd stock-analyzer

# Install all dependencies (root, server, and client)
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
# Twelve Data API (REQUIRED)
TWELVE_DATA_API_KEY=your_twelve_data_api_key_here

# Gmail SMTP for Email Alerts (OPTIONAL)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173

# Database
DATABASE_URL=./database/stockanalyzer.db
```

### 3. Get Your Twelve Data API Key

1. Go to https://twelvedata.com/
2. Sign up for a free account
3. Navigate to your dashboard
4. Copy your API key
5. Paste it into your `.env` file as `TWELVE_DATA_API_KEY`

### 4. (Optional) Set Up Gmail for Email Alerts

If you want to receive email alerts:

1. **Enable 2-Factor Authentication** on your Google account:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Create an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other" as the device (name it "Stock Analyzer")
   - Copy the 16-character password (ignore spaces)

3. **Add to `.env` file**:
   ```env
   GMAIL_USER=your_email@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop  # Remove spaces from the app password
   ```

**Note**: Gmail has a sending limit of 500 emails/day for regular accounts. The app implements a queue to manage this.

### 5. Initialize the Database

The database will be automatically initialized on first run. To manually initialize:

```bash
cd server
npm run dev
# The database will be created at database/stockanalyzer.db
```

### 6. Start the Application

From the root directory:

```bash
# Start both server and client concurrently
npm run dev
```

Or start them separately:

```bash
# Terminal 1 - Start the backend server
cd server
npm run dev

# Terminal 2 - Start the frontend client
cd client
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

## Usage Guide

### Dashboard
1. **Search for Stocks**: Use the search bar to find stocks by symbol or name
2. **Click on Results**: Click any search result to view detailed analysis
3. **Add to Watchlist**: Click "Add to Watchlist" on any stock detail page
4. **Track Performance**: Your watchlist shows real-time prices and daily changes

### Stock Analysis Page
- **Current Price & Change**: See live price with daily change percentage
- **Composite Signal**: Overall trading signal (STRONG BUY to STRONG SELL)
- **Signal Confidence**: How much indicators agree (0-100%)
- **Technical Indicators**: All 9 indicators with plain-English explanations
- **Price Targets**: Entry, stop-loss, and take-profit levels
- **Warnings**: Important alerts about volatility, earnings, etc.

### Setting Up Alerts
1. Navigate to the Alerts page
2. Click "Create Alert"
3. Select stock symbol
4. Choose condition:
   - Price Above/Below threshold
   - RSI Oversold/Overbought
   - MACD Crossover
   - Golden/Death Cross
   - Volume Spike
5. Choose delivery method (Push, Email, or Both)
6. Save alert

**Alert Processing**: Alerts are checked every 5 minutes during market hours (9:30 AM - 4:00 PM ET, Mon-Fri). In development mode, they're checked every minute for testing.

### Trade Journal
1. Log trades manually with entry/exit prices
2. Track open positions
3. View closed trades with P&L
4. Analyze performance metrics:
   - Win rate
   - Average win vs average loss
   - Profit factor
   - Largest win/loss
   - Total P&L

### Settings
- Configure default email for alerts
- Set default alert delivery method
- Adjust default risk percentage for position sizing
- Customize indicator weights for scoring algorithm
- Test email configuration

## API Endpoints

### Stocks
- `GET /api/stocks/search?q=AAPL` - Search stocks
- `GET /api/stocks/:symbol/quote` - Get current quote
- `GET /api/stocks/:symbol/timeseries` - Get historical data
- `GET /api/stocks/:symbol/indicators` - Get all technical indicators
- `GET /api/stocks/:symbol/analysis` - Get complete analysis with signals
- `GET /api/stocks/:symbol/profile` - Get company profile

### Watchlist
- `GET /api/watchlist` - Get all watchlist items
- `GET /api/watchlist/with-prices` - Get watchlist with live prices
- `POST /api/watchlist` - Add stock to watchlist
- `DELETE /api/watchlist/:symbol` - Remove from watchlist
- `PUT /api/watchlist/order` - Update watchlist order

### Journal
- `GET /api/journal` - Get all trades
- `GET /api/journal/stats/summary` - Get performance statistics
- `POST /api/journal` - Create new trade
- `PUT /api/journal/:id` - Update/close trade
- `DELETE /api/journal/:id` - Delete trade

### Alerts
- `GET /api/alerts` - Get all alerts
- `GET /api/alerts/active` - Get active alerts only
- `POST /api/alerts` - Create new alert
- `PATCH /api/alerts/:id/toggle` - Enable/disable alert
- `PATCH /api/alerts/:id/reset` - Reset triggered alert
- `DELETE /api/alerts/:id` - Delete alert

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/test-email` - Send test email

## Technical Indicators Explained

### RSI (Relative Strength Index)
- **Range**: 0-100
- **Oversold**: < 30 (potential buy signal)
- **Overbought**: > 70 (potential sell signal)
- **What it measures**: Price momentum and potential reversals

### MACD (Moving Average Convergence Divergence)
- **Components**: MACD line, Signal line, Histogram
- **Bullish**: MACD crosses above signal line
- **Bearish**: MACD crosses below signal line
- **What it measures**: Trend strength and direction changes

### Moving Averages (20, 50, 200 SMA)
- **Golden Cross**: 50 MA crosses above 200 MA (bullish)
- **Death Cross**: 50 MA crosses below 200 MA (bearish)
- **What it measures**: Long-term price trends

### Bollinger Bands
- **Components**: Upper, Middle, Lower bands
- **Oversold**: Price at/below lower band
- **Overbought**: Price at/above upper band
- **What it measures**: Volatility and overbought/oversold conditions

### Stochastic Oscillator
- **Range**: 0-100
- **Oversold**: < 20
- **Overbought**: > 80
- **What it measures**: Current price relative to range over time

### OBV (On-Balance Volume)
- **What it measures**: Cumulative money flow (buying/selling pressure)
- **Bullish**: Rising OBV with price
- **Bearish**: Falling OBV with price

### ATR (Average True Range)
- **What it measures**: Volatility (used for stop-loss calculations)
- **Higher ATR**: More volatile, wider stops needed
- **Lower ATR**: Less volatile, tighter stops acceptable

### Volume Analysis
- **What it measures**: Trading activity relative to average
- **High volume**: Strong conviction in move
- **Low volume**: Weak conviction, potential reversal

### 52-Week High/Low
- **What it measures**: Current price position in yearly range
- **Near high**: Potential resistance
- **Near low**: Potential support or weakness

## Scoring Algorithm

The composite score combines technical and fundamental analysis:

### Technical Score (-10 to +10)
Each indicator contributes -2 to +2 based on signal strength:
- Weighted average of all technical indicators
- User-customizable weights in Settings

### Fundamental Score (-10 to +10)
Based on:
- P/E Ratio (value assessment)
- EPS Growth (earnings momentum)
- Revenue Growth (business expansion)
- Profit Margin (profitability)
- Debt to Equity (financial health)
- PEG Ratio (growth-adjusted value)

### Composite Score
- 60% Technical Score + 40% Fundamental Score
- Final range: -10 (STRONG SELL) to +10 (STRONG BUY)

### Signal Thresholds
- **STRONG BUY**: Score ≥ 6
- **BUY**: Score ≥ 3
- **HOLD**: Score ≥ -2
- **SELL**: Score ≥ -5
- **STRONG SELL**: Score < -5

## Production Deployment

This application is designed to be deployed on Render with the backend as a Web Service and the frontend as a Static Site.

### Prerequisites
- Render account (https://render.com - free tier available)
- GitHub repository connected to Render
- TwelveData API key

### Deploy Backend (Web Service)

1. **Create New Web Service** on Render
2. **Connect GitHub Repository**
3. **Configure Service**:
   - **Name**: `stock-analyzer-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid for better performance)

4. **Add Environment Variables**:
   ```
   NODE_ENV=production
   TWELVE_DATA_API_KEY=your_api_key_here
   CLIENT_URL=https://your-frontend-url.onrender.com
   PORT=3001
   ```

   Optional (for email alerts):
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your_16_character_app_password
   ```

5. **Deploy**: Render will automatically build and deploy your backend
6. **Copy Backend URL**: Save your backend URL (e.g., `https://stock-analyzer-api.onrender.com`)

### Deploy Frontend (Static Site)

1. **Create New Static Site** on Render
2. **Connect Same GitHub Repository**
3. **Configure Site**:
   - **Name**: `stock-analyzer`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. **Add Environment Variable**:
   ```
   VITE_API_URL=https://stock-analyzer-api.onrender.com
   ```
   (Use the backend URL from step 1)

5. **Deploy**: Render will build and deploy your frontend

### Local Development Setup

1. **Backend Environment** - Copy `server/.env.example` to `server/.env`:
   ```bash
   cd server
   cp .env.example .env
   ```

   Edit `server/.env`:
   ```env
   TWELVE_DATA_API_KEY=your_api_key_here
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your_app_password
   PORT=3001
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   ```

2. **Frontend Environment** - Copy `client/.env.example` to `client/.env`:
   ```bash
   cd client
   cp .env.example .env
   ```

   For local development, leave `VITE_API_URL` empty (defaults to localhost:3001)

3. **Run Development Servers**:
   ```bash
   # From project root
   npm run dev
   ```

### Render Free Tier Notes

- **Backend**: Free tier web services spin down after 15 minutes of inactivity
- **First Request**: May take 30-60 seconds as the service spins up
- **Upgrade**: Consider paid tier for production use to avoid spin-down delays

### Alternative Deployment (Netlify + Render)

If your frontend is already on Netlify:

1. **Keep Frontend on Netlify**
2. **Deploy Backend on Render** (follow backend steps above)
3. **Set Netlify Environment Variable**:
   - Go to Site Settings → Environment Variables
   - Add `VITE_API_URL` with your Render backend URL
4. **Redeploy Netlify Site** to pick up new environment variable

### Database Migration (SQLite to PostgreSQL)

The app uses SQLite by default. For production with PostgreSQL:

1. Install PostgreSQL on Render (or use managed service)
2. Create a database
3. Update `DATABASE_URL` in environment variables
4. Modify `server/services/database.ts` to use `pg` instead of `better-sqlite3`

## Troubleshooting

### API Rate Limits
- Twelve Data free tier: 800 requests/day
- The app implements caching to minimize API calls
- Upgrade to paid plan if needed

### Email Not Sending
1. Verify Gmail App Password is correct (no spaces)
2. Check 2FA is enabled on Google account
3. Test with `/api/settings/test-email` endpoint
4. Check server logs for errors

### Database Issues
- Delete `database/stockanalyzer.db` and restart server to recreate
- Check file permissions in `database/` folder

### CORS Errors
- Verify `CLIENT_URL` in `.env` matches your frontend URL
- Check server is running on correct port

## Project Structure

```
stock-analyzer/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── types/         # TypeScript definitions
│   │   └── App.tsx        # Main app component
│   └── package.json
├── server/                # Express backend
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic
│   │   ├── twelveData.ts # API client
│   │   ├── indicators.ts # Technical analysis
│   │   ├── scoring.ts    # Signal generation
│   │   ├── cache.ts      # Caching layer
│   │   ├── email.ts      # Email notifications
│   │   ├── database.ts   # Database queries
│   │   └── alertProcessor.ts # Cron jobs
│   ├── middleware/       # Express middleware
│   ├── server.ts         # Server entry point
│   └── package.json
├── database/
│   └── schema.sql        # Database schema
├── .env.example          # Environment template
├── package.json          # Root package (workspace)
└── README.md            # This file
```

## Disclaimer

**IMPORTANT**: This tool is for informational purposes only and does not constitute financial advice. Always do your own research before making investment decisions. The creators of this application are not responsible for any financial losses incurred from using this tool.

Stock trading involves substantial risk of loss and is not suitable for every investor. Past performance is not indicative of future results.

## License

This project is provided as-is for educational and informational purposes.

## Support

For issues, questions, or feature requests:
1. Check the Troubleshooting section above
2. Review the Twelve Data API documentation
3. Check server logs for errors
4. Verify all environment variables are set correctly

## Future Enhancements

Planned features:
- Interactive TradingView-style charts with drawing tools
- Stock screener with pre-built scans
- Backtesting functionality
- News sentiment analysis
- Insider trading tracking
- Correlation analysis
- Economic calendar integration
- Mobile responsive improvements
- Dark mode improvements
- Multi-user support with authentication
- Portfolio tracking with automatic P&L calculation

---

**Happy Trading! Remember: Never risk more than you can afford to lose.**
