# Quick Setup Guide

Follow these steps to get your Stock Analyzer up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

This will install all dependencies for both the server and client.

## Step 2: Get Your Twelve Data API Key

1. Visit https://twelvedata.com/
2. Click "Sign Up" (free tier available)
3. Verify your email
4. Go to your dashboard
5. Copy your API key

## Step 3: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Open `.env` in your text editor and add your API key:
```env
TWELVE_DATA_API_KEY=paste_your_api_key_here
```

**That's it for basic setup!** Email alerts are optional.

## Step 4: Start the Application

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173).

Wait for both servers to start, then open your browser to:
**http://localhost:5173**

## First Steps in the App

1. **Search for a Stock**: Try searching for "AAPL" or "TSLA"
2. **View Analysis**: Click on a search result to see full technical analysis
3. **Add to Watchlist**: Click "Add to Watchlist" on any stock page
4. **View Dashboard**: Return to the home page to see your watchlist with live prices

## Optional: Set Up Email Alerts

If you want email notifications for your alerts:

### A. Enable 2FA on Gmail
1. Go to https://myaccount.google.com/security
2. Turn on "2-Step Verification"

### B. Create App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Name it "Stock Analyzer"
4. Copy the 16-character password

### C. Add to .env
```env
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

### D. Restart the Server
```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

## Testing Email Alerts

1. Go to Settings page in the app
2. Enter your email address
3. Click "Send Test Email"
4. Check your inbox

## Troubleshooting

### "API key is not set" error
- Make sure you created the `.env` file in the root directory
- Verify your API key is correct (no extra spaces)
- Restart the server after adding the key

### Can't connect to server
- Make sure nothing else is using port 3001 or 5173
- Check that both servers started successfully
- Look for error messages in the terminal

### Email not working
- Verify you're using a Gmail account
- Make sure 2FA is enabled
- Check the app password has no spaces
- Try sending a test email from Settings page

### No data showing
- Verify your API key is valid
- Check Twelve Data dashboard for API usage limits (800 requests/day on free tier)
- Try searching for a different stock symbol

## Common Commands

```bash
# Start both servers
npm run dev

# Start server only
npm run dev:server

# Start client only
npm run dev:client

# Build for production
npm run build

# Start production server
npm start
```

## What's Next?

- **Create Alerts**: Set price alerts and get notified by email
- **Track Trades**: Use the Journal to log your trades and track performance
- **Analyze Stocks**: View technical indicators and trading signals
- **Build Watchlist**: Monitor multiple stocks in one place

## Need Help?

- Read the full [README.md](README.md) for detailed documentation
- Check the [API documentation](README.md#api-endpoints)
- Review [Technical Indicators Explained](README.md#technical-indicators-explained)

## Remember

This tool is for informational purposes only and does not constitute financial advice. Always do your own research before making investment decisions.

---

**Happy Trading!**
