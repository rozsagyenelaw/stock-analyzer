# Deployment Guide - Render

## Quick Deployment Steps

### 1. Deploy Backend API (Render Web Service)

1. Go to https://render.com and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `stock-analyzer-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

5. Add Environment Variables:
   ```
   NODE_ENV=production
   TWELVE_DATA_API_KEY=your_twelve_data_api_key
   CLIENT_URL=https://your-frontend-url.onrender.com
   PORT=3001
   ```

6. Click "Create Web Service"
7. **Copy the backend URL** (e.g., `https://stock-analyzer-api.onrender.com`)

### 2. Deploy Frontend (Render Static Site OR Netlify)

#### Option A: Render Static Site

1. Go to Render Dashboard
2. Click "New +" → "Static Site"
3. Connect same GitHub repository
4. Configure:
   - **Name**: `stock-analyzer`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

5. Add Environment Variable:
   ```
   VITE_API_URL=https://stock-analyzer-api.onrender.com
   ```
   (Use the backend URL from step 1)

6. Click "Create Static Site"

#### Option B: Keep Netlify (Current Setup)

1. Go to your Netlify site settings
2. Navigate to: Site Settings → Environment Variables
3. Add new variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://stock-analyzer-api.onrender.com` (your Render backend URL)
4. Go to Deploys → Trigger Deploy → Deploy Site

## Environment Variables Reference

### Backend (.env in server/)
```env
NODE_ENV=production
TWELVE_DATA_API_KEY=your_api_key_here
CLIENT_URL=https://your-frontend-url.onrender.com
PORT=3001

# Optional - for email alerts
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
```

### Frontend (.env in client/)
```env
VITE_API_URL=https://stock-analyzer-api.onrender.com
```

## Testing Deployment

1. **Backend Health Check**:
   Visit `https://stock-analyzer-api.onrender.com/health`
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend Access**:
   Visit your frontend URL

3. **API Connection Test**:
   - Search for a stock (e.g., "AAPL")
   - Should see search results if API is connected

## Free Tier Limitations

### Render Free Tier
- Web services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- 750 hours/month (enough for 1 service running 24/7)
- Consider upgrading to paid tier for production

### TwelveData Free Tier
- 800 API requests per day
- 8 requests per minute
- App has built-in caching to minimize requests

## Troubleshooting

### Backend Not Responding
1. Check Render logs: Dashboard → Service → Logs
2. Verify all environment variables are set
3. Check build succeeded (no TypeScript errors)
4. Try manual deploy from Render dashboard

### Frontend Can't Connect to Backend
1. Verify `VITE_API_URL` is set correctly
2. Check CORS: Backend `CLIENT_URL` should match frontend URL
3. Open browser console to see actual API errors
4. Test backend health endpoint directly

### CORS Errors
- Backend `CLIENT_URL` must match frontend URL exactly
- Include protocol (https://) in URLs
- Redeploy backend after changing `CLIENT_URL`

### Database Issues
- SQLite database is created automatically on first run
- Files persist on Render's disk (lost on redeploy)
- For production, consider upgrading to PostgreSQL

## Updating Deployment

### Code Changes
1. Push to GitHub main branch
2. Render auto-deploys on push (if enabled)
3. Or manually trigger deploy from Render dashboard

### Environment Variable Changes
1. Update in Render dashboard
2. Manually redeploy service to pick up changes

## Cost Estimate (Paid Tiers)

### Render
- **Starter ($7/month)**: No spin-down, better for production
- **Standard ($25/month)**: More resources, faster performance

### TwelveData
- **Basic ($9.99/month)**: 5000 requests/day, 55 requests/minute
- **Pro ($29.99/month)**: 15000 requests/day, unlimited per minute

## Security Notes

- Never commit `.env` files to git
- Use Render's environment variable UI for secrets
- Keep `.env.example` files updated for reference
- Rotate API keys periodically
- Enable 2FA on Render and GitHub accounts
