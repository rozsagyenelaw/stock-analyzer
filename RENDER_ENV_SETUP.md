# Render Environment Variables Setup

## Add These to Your Render Dashboard

1. Go to: https://dashboard.render.com
2. Select your `stock-analyzer` service
3. Click on "Environment" in the left sidebar
4. Click "Add Environment Variable" for each:

### Required Variables:

**Add these two NEW variables:**

| Variable Name | Value |
|--------------|-------|
| `NEWS_API_KEY` | Copy from your `.env` file |
| `ALPHA_VANTAGE_API_KEY` | Copy from your `.env` file |

### Already Configured (verify they exist):

| Variable Name | Status |
|--------------|--------|
| `TWELVE_DATA_API_KEY` | ✅ Should already exist |
| `OPENAI_API_KEY` | ✅ Should already exist |

### Other Variables (should already be set):

```
NODE_ENV
production

DATABASE_URL
./database/stockanalyzer.db

PORT
3001

CLIENT_URL
https://stock-analyzer-1-j1wc.onrender.com
```

## After Adding Variables:

1. Click "Save Changes"
2. Service will automatically redeploy
3. Wait 2-3 minutes for deployment to complete
4. Test the APIs!

## Test Your APIs After Deployment:

### Test News API:
```bash
curl https://stock-analyzer-1-j1wc.onrender.com/api/news/AAPL
```

### Test Economic Indicators:
```bash
curl https://stock-analyzer-1-j1wc.onrender.com/api/economy/indicators
```

### Test Refresh Economic Data:
```bash
curl -X POST https://stock-analyzer-1-j1wc.onrender.com/api/economy/indicators/refresh
```

You should now have **100% REAL DATA** with no mocks!
